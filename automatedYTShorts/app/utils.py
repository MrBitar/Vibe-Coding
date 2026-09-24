"""Shared paths and helpers used by multiple pipeline stages."""

import glob
import json
import os
import shutil
import subprocess
import tempfile
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
WORK_DIR = PROJECT_ROOT / "work"
OUTPUT_DIR = PROJECT_ROOT / "output"
LOGS_DIR = PROJECT_ROOT / "logs"

# winget-installed ffmpeg/ffprobe are not always on PATH in every shell
# session; fall back to the known winget install location if not resolvable.
_WINGET_BIN_PATTERN = str(
    Path.home()
    / "AppData/Local/Microsoft/WinGet/Packages"
    / "Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-*/bin"
)


def find_executable(name: str) -> str:
    """Return a runnable path/name for an ffmpeg-suite executable."""
    on_path = shutil.which(name)
    if on_path:
        return on_path
    matches = sorted(glob.glob(_WINGET_BIN_PATTERN))
    if matches:
        candidate = Path(matches[-1]) / f"{name}.exe"
        if candidate.exists():
            return str(candidate)
    raise FileNotFoundError(f"Could not locate '{name}' on PATH or in the winget install location")


def run_ffmpeg(cmd: list, cwd=None) -> None:
    """Run an ffmpeg/ffprobe subprocess, raising a clear error with the
    actual stderr on failure instead of a bare CalledProcessError (whose
    default message doesn't include *why* ffmpeg failed)."""
    proc = subprocess.run(cmd, capture_output=True, text=True, cwd=cwd)
    if proc.returncode != 0:
        raise RuntimeError(f"Command failed ({cmd[0]}): {proc.stderr.strip()[-2000:]}")


def check_free_disk_space(path, min_gb: float = 1.0) -> None:
    """Raise a clear error if the drive containing `path` doesn't have at
    least min_gb free, instead of letting ffmpeg/yt-dlp fail cryptically
    mid-write when the disk actually fills up."""
    free_bytes = shutil.disk_usage(Path(path).anchor or ".").free
    free_gb = free_bytes / (1024 ** 3)
    if free_gb < min_gb:
        raise RuntimeError(f"Only {free_gb:.2f}GB free at {path} - need at least {min_gb}GB to continue safely.")


def write_json_atomic(path, data, **json_kwargs) -> None:
    """Write JSON to `path` without ever leaving a truncated/corrupt file
    there if the process dies mid-write (killed, power loss, disk full).
    Writes to a temp file in the same directory, then atomically replaces
    the destination - so a resumed run either sees the old complete file or
    the new complete file, never a half-written one. This matters most for
    the shared, append-only history files (upload queue, duplicate-segment
    history, hash registry) where a corrupt file would break every video,
    not just the one being processed when the crash happened."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, **json_kwargs)
        os.replace(tmp_path, path)
    except BaseException:
        Path(tmp_path).unlink(missing_ok=True)
        raise


@contextmanager
def atomic_output(final_path):
    """Yield a temp path next to `final_path` for a subprocess (ffmpeg) to
    write its output to. On success, atomically replaces `final_path` with
    it; on failure, deletes the temp file and re-raises. Without this, a
    killed/crashed ffmpeg process (or a disk that fills up mid-encode) would
    leave a truncated file sitting at `final_path` - and every stage's
    resume logic treats "the output file exists" as "this stage is done",
    so a resumed run would silently trust corrupt output forever."""
    final_path = Path(final_path)
    # Keep the real suffix last (".part.mp4", not ".mp4.part") - ffmpeg picks
    # its output muxer from the filename extension, and a trailing ".part"
    # makes it fail with "Unable to choose an output format".
    tmp_path = final_path.with_name(f".{final_path.stem}.part{final_path.suffix}")
    try:
        yield tmp_path
    except BaseException:
        tmp_path.unlink(missing_ok=True)
        raise
    else:
        os.replace(tmp_path, final_path)


# ffmpeg subprocess calls block their own thread waiting on the OS process
# rather than holding Python's GIL, so a small thread pool gives real
# wall-clock speedup for independent per-clip encodes without needing
# multiprocessing. Capped modestly since ffmpeg itself already uses
# multiple cores per encode - running too many at once just causes
# contention rather than more throughput.
MAX_PARALLEL_CLIPS = min(4, os.cpu_count() or 1)


def run_in_parallel(items: list, worker) -> list:
    """Run worker(item) for each item concurrently, returning results in the
    same order as `items` with any None results (a worker's way of
    signalling "skip this one") dropped."""
    with ThreadPoolExecutor(max_workers=MAX_PARALLEL_CLIPS) as executor:
        outcomes = list(executor.map(worker, items))
    return [r for r in outcomes if r is not None]
