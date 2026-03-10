# ZuriNews Live (Free AI News Channel)

A fullscreen, live browser news feed with **Zuri** as an in-feed AI broadcaster.

## What it does

- Pulls real-time headlines from online sources using keyless/free endpoints (RSS2JSON + Spaceflight News API).
- Uses the new **Pollinations service** at `https://enter.pollinations.ai` to generate concise AI broadcaster lines.
- Presents the stream in a fullscreen feed layout with Zuri embedded directly in the hero story card.
- Broadcast narration with a **female voice preference** using Web Speech API.
- Displays the provided `Zuri.png` as the live on-screen broadcaster.

## Run

```bash
python3 -m http.server 4173
```

Open: `http://localhost:4173`

> Note: Voice requires a modern browser (Chrome/Edge/Firefox). Available voices vary by device/browser.
