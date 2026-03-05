const statusEl = document.getElementById("status");
const currentStoryEl = document.getElementById("currentStory");
const summaryEl = document.getElementById("summary");
const feedListEl = document.getElementById("feedList");
const tickerEl = document.getElementById("ticker");
const reporterFrame = document.getElementById("reporterFrame");
const toggleVoiceBtn = document.getElementById("toggleVoice");

const startRecBtn = document.getElementById("startRec");
const stopRecBtn = document.getElementById("stopRec");
const downloadLink = document.getElementById("downloadLink");
const canvas = document.getElementById("studioCanvas");
const ctx = canvas.getContext("2d");

const FEEDS = [
  "https://feeds.reuters.com/reuters/worldNews",
  "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
  "https://feeds.bbci.co.uk/news/world/rss.xml"
];

let stories = [];
let tickerIndex = 0;
let voiceEnabled = true;
let mediaRecorder;
let recordedChunks = [];
let drawLoopId;

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

async function fetchFeed(url) {
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const response = await fetch(proxyUrl);
  const xml = await response.text();
  const doc = new DOMParser().parseFromString(xml, "text/xml");

  return [...doc.querySelectorAll("item")].slice(0, 5).map((item) => ({
    title: item.querySelector("title")?.textContent?.trim() || "Untitled",
    description: item.querySelector("description")?.textContent?.trim() || "",
    link: item.querySelector("link")?.textContent?.trim() || ""
  }));
}

async function refreshNews() {
  statusEl.textContent = "Fetching latest headlines from free feeds…";
  try {
    const all = await Promise.all(FEEDS.map((f) => fetchFeed(f)));
    stories = all.flat().filter((s) => s.title).slice(0, 20);
    if (!stories.length) throw new Error("No stories returned.");

    renderStories();
    announceStory(stories[0]);
    statusEl.textContent = `Live: ${new Date().toLocaleTimeString()} · ${stories.length} stories loaded`;
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Feed fetch issue. Retrying automatically…";
  }
}

function renderStories() {
  const [top] = stories;
  if (!top) return;

  currentStoryEl.textContent = top.title;
  summaryEl.textContent = summarize(`${top.title}. ${top.description}`);

  feedListEl.innerHTML = "";
  stories.slice(0, 10).forEach((story) => {
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.href = story.link;
    link.textContent = story.title;
    link.target = "_blank";
    link.rel = "noreferrer noopener";
    link.style.color = "#9cd1ff";
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
  utterance.pitch = 1.2;
  utterance.rate = 1.02;

  utterance.onstart = () => reporterFrame.classList.add("talking");
  utterance.onend = () => reporterFrame.classList.remove("talking");
  speechSynthesis.speak(utterance);
}

function announceStory(story) {
  const narration = `This is Neko Airi with a live update. ${story.title}. ${summarize(story.description || story.title)}`;
  speak(narration);
}

function rotateTicker() {
  if (!stories.length) return;
  tickerEl.textContent = stories[tickerIndex % stories.length].title;
  tickerIndex += 1;
}

function drawStudioFrame() {
  const top = stories[0]?.title || "Waiting for top story...";
  const sub = summaryEl.textContent || "Summarizing live input";
  const now = new Date().toLocaleTimeString();

  ctx.fillStyle = "#050a20";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ff2d6f";
  ctx.fillRect(0, 0, canvas.width, 68);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 34px sans-serif";
  ctx.fillText("ZuriNews LIVE", 28, 44);

  ctx.fillStyle = "#f4f7ff";
  ctx.font = "bold 29px sans-serif";
  ctx.fillText("Neko Airi Reporting", 28, 118);

  ctx.font = "bold 24px sans-serif";
  wrapText(top, 28, 170, 900, 34);

  ctx.fillStyle = "#cfe0ff";
  ctx.font = "20px sans-serif";
  wrapText(sub, 28, 280, 900, 30);

  ctx.fillStyle = "#1e295f";
  ctx.fillRect(0, 490, canvas.width, 50);
  ctx.fillStyle = "#8bf0ce";
  ctx.font = "bold 22px monospace";
  ctx.fillText(`Broadcast Time: ${now}`, 28, 523);

  drawLoopId = requestAnimationFrame(drawStudioFrame);
}

function wrapText(text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const word of words) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > maxWidth) {
      ctx.fillText(line, x, yy);
      line = word + " ";
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, yy);
}

function startRecording() {
  const stream = canvas.captureStream(30);
  recordedChunks = [];
  mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) recordedChunks.push(event.data);
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    downloadLink.href = url;
    downloadLink.download = `zurinews-${Date.now()}.webm`;
    downloadLink.hidden = false;
    downloadLink.textContent = "Download generated news clip";
  };

  mediaRecorder.start();
  startRecBtn.disabled = true;
  stopRecBtn.disabled = false;
}

function stopRecording() {
  mediaRecorder?.stop();
  startRecBtn.disabled = false;
  stopRecBtn.disabled = true;
}

toggleVoiceBtn.addEventListener("click", () => {
  voiceEnabled = !voiceEnabled;
  toggleVoiceBtn.textContent = `Voice: ${voiceEnabled ? "On" : "Off"}`;
  if (!voiceEnabled) speechSynthesis.cancel();
});

startRecBtn.addEventListener("click", startRecording);
stopRecBtn.addEventListener("click", stopRecording);

if ("speechSynthesis" in window) {
  speechSynthesis.onvoiceschanged = () => pickFemaleVoice();
}

refreshNews();
setInterval(refreshNews, 120000);
setInterval(rotateTicker, 8000);
rotateTicker();
drawStudioFrame();
