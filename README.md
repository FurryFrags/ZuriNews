# ZuriNews Live (Free AI News Channel)

A CNN-style, real-time browser news channel featuring **Neko Airi**, a cute AI cat reporter persona.

## What it does

- Pulls real-time headlines from free RSS sources (Reuters, NYTimes, BBC) via a free CORS proxy.
- Builds an AI-style summary locally in the browser (no paid model APIs).
- Continuously updates ticker + top story.
- Broadcast narration with a **female voice preference** using Web Speech API.
- Includes a free in-browser "video generation" tool that records the live canvas broadcast to WebM.

## Run

```bash
python3 -m http.server 4173
```

Open: `http://localhost:4173`

> Note: Voice and recording require a modern browser (Chrome/Edge/Firefox). Some browsers/devices may offer different available voices.
