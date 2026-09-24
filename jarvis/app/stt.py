"""
Jarvis Speech-to-Text
Fully offline transcription using Vosk (data/models/vosk-model-small-en-us-0.15).
No audio ever leaves the machine.
"""

import io
import json
import wave
from pathlib import Path
from threading import Lock

from vosk import KaldiRecognizer, Model, SetLogLevel

SetLogLevel(-1)  # silence vosk's own logging

MODEL_DIR = Path(__file__).resolve().parent.parent / "data" / "models" / "vosk-model-small-en-us-0.15"

_model = None
_lock = Lock()


def _get_model() -> Model:
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                if not MODEL_DIR.exists():
                    raise FileNotFoundError(
                        f"Vosk model not found at {MODEL_DIR}. "
                        "Download it from https://alphacephei.com/vosk/models "
                        "and unzip it into data/models/."
                    )
                _model = Model(str(MODEL_DIR))
    return _model


def transcribe(wav_bytes: bytes) -> str:
    """Transcribe mono 16-bit PCM WAV audio bytes into text."""
    wf = wave.open(io.BytesIO(wav_bytes), "rb")
    if wf.getsampwidth() != 2:
        raise ValueError("Audio must be 16-bit PCM WAV.")

    recognizer = KaldiRecognizer(_get_model(), wf.getframerate())
    recognizer.SetWords(False)

    parts = []
    while True:
        data = wf.readframes(4000)
        if not data:
            break
        if recognizer.AcceptWaveform(data):
            parts.append(json.loads(recognizer.Result()).get("text", ""))

    parts.append(json.loads(recognizer.FinalResult()).get("text", ""))
    return " ".join(p for p in parts if p).strip()
