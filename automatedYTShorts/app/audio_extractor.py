"""Milestone 3: extract transcription-friendly audio from work/<id>/source.mp4."""

import sys

from utils import WORK_DIR, atomic_output, find_executable, run_ffmpeg


def extract_audio(video_id: str) -> str:
    """Extract mono 16kHz WAV audio to work/<id>/audio.wav and return its
    path. Skips the work if audio.wav already exists (resumability)."""
    video_dir = WORK_DIR / video_id
    source_path = video_dir / "source.mp4"
    audio_path = video_dir / "audio.wav"

    if audio_path.exists():
        return str(audio_path)

    if not source_path.exists():
        raise FileNotFoundError(f"No source video found at {source_path}")

    ffmpeg = find_executable("ffmpeg")
    with atomic_output(audio_path) as tmp_path:
        cmd = [
            ffmpeg,
            "-y",
            "-i", str(source_path),
            "-vn",
            "-ac", "1",
            "-ar", "16000",
            str(tmp_path),
        ]
        run_ffmpeg(cmd)

    return str(audio_path)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python app/audio_extractor.py <video_id>")
        sys.exit(1)

    result = extract_audio(sys.argv[1])
    print(result)
