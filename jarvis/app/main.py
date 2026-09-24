from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app import brain, stt

app = FastAPI(title="Jarvis", version="0.1")

WEB_DIR = Path(__file__).resolve().parent.parent / "web"


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


class VoiceResponse(BaseModel):
    transcript: str
    reply: str


@app.get("/api/status")
def status():
    return {"status": "online", "name": "Jarvis", "version": "0.1"}


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    return ChatResponse(reply=brain.process(req.message))


@app.post("/api/voice", response_model=VoiceResponse)
async def voice(audio: UploadFile):
    wav_bytes = await audio.read()
    try:
        transcript = stt.transcribe(wav_bytes)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    reply = brain.process(transcript) if transcript else "I didn't catch that."
    return VoiceResponse(transcript=transcript, reply=reply)


# Static UI is mounted last so the /api/* routes above always take priority.
app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="web")
