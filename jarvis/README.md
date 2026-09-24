# Jarvis

A personal, fully offline AI assistant built with Python and FastAPI, designed
to run from a USB stick or SD card on any machine you plug it into.

## Status

- **Brain**: rule-based intent matching for now (`app/brain.py`) — greetings,
  time/date, remembering and recalling your name, help. A local LLM will
  replace/extend this later without changing the rest of the app.
- **Memory**: simple JSON store at `data/memory.json` (gitignored — it's
  personal, per-machine state).
- **Voice**: fully offline. Speech-to-text via [Vosk](https://alphacephei.com/vosk)
  (small English model bundled in `data/models/`), text-to-speech via the
  browser's built-in `speechSynthesis` API. No audio ever leaves the machine.
- **UI**: a sci-fi HUD dashboard served at `/` — animated core, chat log, text
  input, and a hold-to-talk mic button.

## Running it

```
.venv\Scripts\activate
uvicorn app.main:app --reload
```

Then open http://127.0.0.1:8000 in a browser.

## Project layout

```
app/
  main.py     FastAPI app: /api/chat, /api/voice, serves web/ as static UI
  brain.py    rule-based responses (swap for an LLM later)
  memory.py   JSON-backed key/value store (data/memory.json)
  stt.py      offline speech-to-text via Vosk
  plugins/    future extensions
web/          HUD dashboard (index.html, style.css, script.js)
data/         local persistent storage + data/models/ (Vosk model)
```

## Notes for portability

- Everything the app needs (model included) lives under this project folder.
  `.venv/` itself is just the Python virtual environment and can be rebuilt
  anywhere with `python -m venv .venv && pip install -r requirements.txt`.
- If you copy this folder to a new machine without `.venv/`, recreate it and
  reinstall dependencies — the venv is not portable across OSes/Python
  versions, but everything else is.
