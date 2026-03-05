# ZuriNews Live (Free AI News Channel)

A CNN-style, real-time browser news channel featuring **Neko Airi**, a cute AI cat reporter persona.

## What it does

- Pulls real-time headlines from online sources using keyless/free endpoints (RSS2JSON + Spaceflight News API).
- Uses **Pollinations text API** (free, keyless) to generate a concise AI anchor line for each top story.
- Continuously updates ticker + top story.
- Broadcast narration with a **female voice preference** using Web Speech API.
- Includes a free in-browser "video generation" tool that records the live canvas broadcast to WebM.
- Displays the provided `Zuri.png` in a CNN-style reporter frame/background.

## Run

```bash
python3 -m http.server 4173
```

Open: `http://localhost:4173`

> Note: Voice and recording require a modern browser (Chrome/Edge/Firefox). Some browsers/devices may offer different available voices.
