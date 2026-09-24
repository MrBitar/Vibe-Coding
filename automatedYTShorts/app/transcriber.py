"""Milestone 4: transcribe work/<id>/audio.wav into a timestamped transcript."""

import json
import sys

from faster_whisper import WhisperModel

from utils import WORK_DIR, write_json_atomic


def _build_transcript(model, audio_path: str) -> list:
    # word_timestamps=True gives per-word start/end times (not just
    # per-segment) - captions.py's animated caption mode (Milestone 19)
    # needs real word timing rather than approximating it by splitting a
    # segment's duration evenly across its words.
    segments, _info = model.transcribe(audio_path, word_timestamps=True)
    return [
        {
            "start": segment.start,
            "end": segment.end,
            "text": segment.text.strip(),
            "words": [
                {"start": w.start, "end": w.end, "word": w.word.strip()}
                for w in (segment.words or [])
            ],
        }
        for segment in segments
    ]


def _transcribe_audio(audio_path: str, model_size: str) -> list:
    """Use GPU (CUDA) acceleration when it actually works, since it's
    dramatically faster than CPU for this model size. ctranslate2's device
    count can report a CUDA GPU as "available" while inference still fails
    (e.g. a missing cuBLAS/cuDNN DLL because only the driver, not the full
    CUDA toolkit, is installed) - detection alone isn't enough, so this
    falls back to CPU on ANY GPU failure rather than crashing the whole
    transcription stage over a broken GPU path."""
    try:
        import ctranslate2
        gpu_available = ctranslate2.get_cuda_device_count() > 0
    except Exception:
        gpu_available = False

    if gpu_available:
        try:
            model = WhisperModel(model_size, device="cuda", compute_type="float16")
            return _build_transcript(model, audio_path)
        except Exception as e:
            print(f"  GPU transcription unavailable ({e}); falling back to CPU.")

    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    return _build_transcript(model, audio_path)


def transcribe(video_id: str, model_size: str = "base") -> list:
    """Transcribe work/<id>/audio.wav, writing transcript.json and
    transcript.txt. Skips re-transcribing (the slowest pipeline stage) if
    transcript.json already exists - this is what makes resuming a failed
    job after this point cheap instead of redoing the whole pipeline."""
    video_dir = WORK_DIR / video_id
    audio_path = video_dir / "audio.wav"
    transcript_path = video_dir / "transcript.json"

    if transcript_path.exists():
        with open(transcript_path, encoding="utf-8") as f:
            return json.load(f)

    if not audio_path.exists():
        raise FileNotFoundError(f"No audio file found at {audio_path}")

    transcript = _transcribe_audio(str(audio_path), model_size)

    write_json_atomic(video_dir / "transcript.json", transcript, indent=2, ensure_ascii=False)

    with open(video_dir / "transcript.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(seg["text"] for seg in transcript))

    return transcript


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python app/transcriber.py <video_id> [model_size]")
        sys.exit(1)

    result = transcribe(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "base")
    print(json.dumps(result[:3], indent=2, ensure_ascii=False))
    print(f"... {len(result)} segments total")
