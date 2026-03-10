const statusEl = document.getElementById("status");
const currentStoryEl = document.getElementById("currentStory");
const summaryEl = document.getElementById("summary");
const feedListEl = document.getElementById("feedList");
const reporterFrame = document.getElementById("reporterFrame");
const toggleVoiceBtn = document.getElementById("toggleVoice");

const NEWS_SOURCES = [
  {
    name: "BBC World",
    url: "https://api.rss2json.com/v1/api.json?rss_url=https://feeds.bbci.co.uk/news/world/rss.xml",
    parse: (data) => (data.items || []).map((item) => ({
      title: item.title,
      description: item.description || item.content || "",
      link: item.link || "",
      source: "BBC"
    }))
  },
  {
    name: "Reuters World",
    url: "https://api.rss2json.com/v1/api.json?rss_url=https://feeds.reuters.com/reuters/worldNews",
    parse: (data) => (data.items || []).map((item) => ({
      title: item.title,
      description: item.description || item.content || "",
      link: item.link || "",
      source: "Reuters"
    }))
  },
  {
    name: "Spaceflight News",
    url: "https://api.spaceflightnewsapi.net/v4/articles/?limit=8",
    parse: (data) => (data.results || []).map((item) => ({
      title: item.title,
      description: item.summary || "",
      link: item.url || "",
      source: "Spaceflight News"
    }))
  }
];

let stories = [];
let voiceEnabled = true;

function summarize(text) {
  const cleaned = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (!sentences.length) return "No details available yet.";

  const keywordBoost = ["breaking", "update", "official", "live", "global", "market", "conflict", "election"];
  const scored = sentences.map((sentence) => {
    const lower = sentence.toLowerCase();
    let score = Math.min(sentence.length / 140, 1.2);
    keywordBoost.forEach((k) => {
      if (lower.includes(k)) score += 0.4;
    });
    return { sentence, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((s) => s.sentence)
    .join(" ");
}

async function fetchJSON(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchSource(source) {
  const payload = await fetchJSON(source.url);
  return source.parse(payload).filter((story) => story?.title);
}

async function generateAISummary(story) {
  const baseSummary = summarize(`${story.title}. ${story.description}`);
  const prompt = [
    "You are Zuri, a polished live TV broadcaster.",
    "Return only one concise sentence under 35 words.",
    `Headline: ${story.title}`,
    `Context: ${story.description || baseSummary}`
  ].join("\n");

  try {
    const response = await fetch("https://enter.pollinations.ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        model: "openai"
      })
    });

    if (!response.ok) throw new Error("AI endpoint failed");

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const payload = await response.json();
      const aiText = (
        payload?.text ||
        payload?.output ||
        payload?.message ||
        payload?.choices?.[0]?.message?.content ||
        ""
      )
        .toString()
        .replace(/\s+/g, " ")
        .trim();
      return aiText || baseSummary;
    }

    const aiText = (await response.text()).replace(/\s+/g, " ").trim();
    return aiText || baseSummary;
  } catch (error) {
    console.warn("AI summary fallback:", error);
    return baseSummary;
  }
}

async function refreshNews() {
  statusEl.textContent = "Fetching latest online reports...";
  try {
    const loaded = await Promise.allSettled(NEWS_SOURCES.map((source) => fetchSource(source)));
    stories = loaded
      .filter((entry) => entry.status === "fulfilled")
      .flatMap((entry) => entry.value)
      .slice(0, 20);

    if (!stories.length) throw new Error("No stories returned from any source.");

    renderStories();
    await updateTopStory(stories[0]);
    announceStory(stories[0]);
    statusEl.textContent = `Live: ${new Date().toLocaleTimeString()} · ${stories.length} stories loaded`;
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Unable to reach live feeds right now. Retrying automatically...";
  }
}

async function updateTopStory(story) {
  currentStoryEl.textContent = story.title;
  summaryEl.textContent = "Generating Zuri's live line...";
  summaryEl.textContent = await generateAISummary(story);
}

function renderStories() {
  feedListEl.innerHTML = "";
  stories.slice(0, 12).forEach((story) => {
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.href = story.link;
    link.textContent = story.source ? `[${story.source}] ${story.title}` : story.title;
    link.target = "_blank";
    link.rel = "noreferrer noopener";
    li.appendChild(link);
    feedListEl.appendChild(li);
  });
}

function pickFemaleVoice() {
  const voices = speechSynthesis.getVoices();
  return voices.find((v) => /female|zira|samantha|aria|jenny|emma|google uk english female/i.test(v.name)) || voices[0];
}

function speak(text) {
  if (!voiceEnabled || !("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const selectedVoice = pickFemaleVoice();
  if (selectedVoice) utterance.voice = selectedVoice;
  utterance.pitch = 1.12;
  utterance.rate = 1;

  utterance.onstart = () => reporterFrame.classList.add("talking");
  utterance.onend = () => reporterFrame.classList.remove("talking");
  speechSynthesis.speak(utterance);
}

function announceStory(story) {
  const narration = `This is Zuri with a live update. ${story.title}. ${summaryEl.textContent}`;
  speak(narration);
}

toggleVoiceBtn.addEventListener("click", () => {
  voiceEnabled = !voiceEnabled;
  toggleVoiceBtn.textContent = `Voice: ${voiceEnabled ? "On" : "Off"}`;
  if (!voiceEnabled) speechSynthesis.cancel();
});

if ("speechSynthesis" in window) {
  speechSynthesis.onvoiceschanged = () => pickFemaleVoice();
}

refreshNews();
setInterval(refreshNews, 120000);
