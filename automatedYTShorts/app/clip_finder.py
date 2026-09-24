"""Milestone 5: rule-based selection of candidate clips from a transcript.

Each transcript segment's start/end is treated as a valid clip breakpoint.
Candidate windows are built by extending forward from each segment until
the accumulated duration falls within [min_seconds, max_seconds], without
crossing a real silence (a gap between segments longer than
MAX_INTERNAL_GAP_SECONDS) — so clips land on natural speech breaks rather
than mid-sentence or across long pauses.
"""

import json
import re
import sys

from config import load_config
from duplicate_protection import filter_new_candidates, segments_overlap
from silence_removal import compute_kept_ranges, total_kept_duration
from utils import WORK_DIR, write_json_atomic

# A candidate clip won't span an internal silence longer than this.
MAX_INTERNAL_GAP_SECONDS = 3.0
# Candidates overlapping an already-selected clip by more than this
# fraction (of the shorter clip's duration) are dropped.
MAX_OVERLAP_RATIO = 0.2

# Filler words that pad out speech without adding content - a candidate
# heavy on these tends to feel rambly rather than punchy.
FILLER_WORDS = {
    "um", "umm", "uh", "uhh", "hmm", "like", "actually", "basically",
    "literally", "kinda", "sorta",
}
# A natural spoken pace for short-form content - too slow feels sluggish,
# too fast is hard to read as burned-in captions.
TARGET_WORDS_PER_SECOND = 2.8
HOOK_WORD_COUNT = 10


def generate_candidates(segments: list, min_seconds: float, max_seconds: float) -> list:
    """For each segment, extend forward to the first natural stopping point
    that falls within [min_seconds, max_seconds], without crossing a long
    internal silence."""
    candidates = []
    n = len(segments)
    for i in range(n):
        start = segments[i]["start"]
        end = None
        text_parts = []
        for j in range(i, n):
            if end is not None and segments[j]["start"] - end > MAX_INTERNAL_GAP_SECONDS:
                break
            end = segments[j]["end"]
            text_parts.append(segments[j]["text"])
            duration = end - start
            if duration > max_seconds:
                break
            if duration >= min_seconds:
                candidates.append({
                    "start": start,
                    "end": end,
                    "duration": duration,
                    "text": " ".join(text_parts),
                })
                break
    return candidates


def _filler_ratio(text: str) -> float:
    words = re.findall(r"[a-z']+", text.lower())
    if not words:
        return 0.0
    return sum(1 for w in words if w in FILLER_WORDS) / len(words)


def _hook_strength(hook_text: str) -> float:
    """Cheap lexical signals correlated with a stronger opening line - a
    question, an exclamation, a number/statistic, or a superlative - rather
    than an LLM call judging "is this a good hook" (that's a separate,
    later, optional improvement per the roadmap; this stays rule-based,
    consistent with the rest of clip_finder.py's candidate selection)."""
    score = 0.0
    if "?" in hook_text:
        score += 1.0
    if "!" in hook_text:
        score += 0.5
    if re.search(r"\d", hook_text):
        score += 0.5
    if re.search(r"\b(best|worst|fastest|biggest|craziest|insane|never|always|secret|shocking)\b", hook_text.lower()):
        score += 0.5
    return score


def score_candidate(candidate: dict, min_seconds: float, max_seconds: float) -> dict:
    """Score a candidate on several independent, rule-based signals rather
    than just duration+word count: closeness to the target duration (using
    the SILENCE-TRIMMED duration, since that's what actually gets rendered -
    a candidate that needed heavy trimming is implicitly penalized here
    without a separate, redundant "silence density" term), natural speaking
    pace, hook strength, and filler-word density. Returns a breakdown dict
    (not just one number) so a human reviewing candidates.json can see WHY a
    clip ranked where it did - select_top() only needs breakdown["total"]."""
    target = (min_seconds + max_seconds) / 2
    duration = candidate["trimmed_duration"]
    words = candidate["text"].split()
    word_count = len(words)
    hook_text = " ".join(words[:HOOK_WORD_COUNT])

    words_per_second = word_count / duration if duration > 0 else 0.0

    breakdown = {
        "duration_closeness": round(-abs(duration - target) * 0.2, 2),
        "pace": round(-abs(words_per_second - TARGET_WORDS_PER_SECOND) * 1.0, 2),
        "hook_strength": round(_hook_strength(hook_text), 2),
        "filler_penalty": round(-_filler_ratio(candidate["text"]) * 5.0, 2),
    }
    breakdown["total"] = round(sum(breakdown.values()), 2)
    return breakdown


def select_top(candidates: list, number_to_generate: int) -> list:
    ranked = sorted(candidates, key=lambda c: c["score"], reverse=True)
    selected = []
    for c in ranked:
        if len(selected) >= number_to_generate:
            break
        overlap_too_much = False
        for s in selected:
            overlap = max(0, min(c["end"], s["end"]) - max(c["start"], s["start"]))
            shorter = min(c["duration"], s["duration"])
            if shorter > 0 and overlap / shorter > MAX_OVERLAP_RATIO:
                overlap_too_much = True
                break
        if not overlap_too_much:
            selected.append(c)
    selected.sort(key=lambda c: c["start"])
    return selected


def _migrate_approval(video_dir, old_candidates: list, new_candidates: list) -> None:
    """Clip indices are positional, not content-stable - if this video was
    already reviewed (approved/rejected/scheduled/uploaded) and clip_finder
    runs again (e.g. after a re-transcription with slightly different
    segment timing), a plain overwrite would silently detach those
    decisions from the content they were actually made about, since
    "clip_03" might now refer to a completely different time range.
    Carries each decision forward by matching old segments to new ones by
    time overlap instead of by index, and drops decisions whose segment no
    longer appears in the new candidate list."""
    approval_path = video_dir / "approval.json"
    if not approval_path.exists() or not old_candidates:
        return

    with open(approval_path, encoding="utf-8") as f:
        approval = json.load(f)

    old_by_index = {f"{i:02d}": c for i, c in enumerate(old_candidates, start=1)}
    migrated = {}
    for i, new_c in enumerate(new_candidates, start=1):
        for old_index, old_c in old_by_index.items():
            status = approval.get(old_index)
            if not status or status == "pending":
                continue
            if segments_overlap(new_c["start"], new_c["end"], old_c["start"], old_c["end"]):
                migrated[f"{i:02d}"] = status
                break

    write_json_atomic(approval_path, migrated, indent=2)


def find_clips(video_id: str) -> list:
    """Select candidate clips for work/<id>/transcript.json, writing candidates.json."""
    clip_cfg = load_config().get("clip", {})
    min_seconds = clip_cfg.get("min_seconds", 20)
    max_seconds = clip_cfg.get("max_seconds", 60)
    number_to_generate = clip_cfg.get("number_to_generate", 5)

    video_dir = WORK_DIR / video_id
    transcript_path = video_dir / "transcript.json"
    if not transcript_path.exists():
        raise FileNotFoundError(f"No transcript found at {transcript_path}")

    with open(transcript_path, encoding="utf-8") as f:
        segments = json.load(f)

    candidates = generate_candidates(segments, min_seconds, max_seconds)
    candidates = filter_new_candidates(video_id, candidates)

    silence_cfg = load_config().get("silence_removal", {})
    silence_removal_enabled = silence_cfg.get("enabled", True)
    max_gap_kept = silence_cfg.get("max_gap_kept_seconds", 0.4)

    for c in candidates:
        if silence_removal_enabled:
            c["kept_ranges"] = compute_kept_ranges(segments, c["start"], c["end"], max_gap_kept)
        else:
            c["kept_ranges"] = [[c["start"], c["end"]]]
        c["trimmed_duration"] = total_kept_duration(c["kept_ranges"])

    # A candidate that fits [min_seconds, max_seconds] before trimming can
    # still end up shorter than min_seconds once its internal dead air is
    # removed - scoring (and QC downstream) should judge the clip that
    # actually gets rendered, not the wider pre-trim span, so drop it here
    # rather than ever selecting something QC would reject anyway.
    candidates = [c for c in candidates if c["trimmed_duration"] >= min_seconds]

    for c in candidates:
        c["score_breakdown"] = score_candidate(c, min_seconds, max_seconds)
        c["score"] = c["score_breakdown"]["total"]

    selected = select_top(candidates, number_to_generate)

    results = []
    for c in selected:
        words = c["text"].split()
        results.append({
            "start": round(c["start"], 2),
            "end": round(c["end"], 2),
            "score": round(c["score"], 2),
            "score_breakdown": c["score_breakdown"],
            "reason": f"Rule-based candidate ({round(c['trimmed_duration'], 1)}s after silence removal, {len(words)} words)",
            "hook": " ".join(words[:10]),
            "text": c["text"],
            "kept_ranges": [[round(s, 2), round(e, 2)] for s, e in c["kept_ranges"]],
        })

    old_candidates_path = video_dir / "candidates.json"
    old_candidates = []
    if old_candidates_path.exists():
        with open(old_candidates_path, encoding="utf-8") as f:
            old_candidates = json.load(f)

    _migrate_approval(video_dir, old_candidates, results)

    write_json_atomic(old_candidates_path, results, indent=2, ensure_ascii=False)

    return results


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python app/clip_finder.py <video_id>")
        sys.exit(1)

    result = find_clips(sys.argv[1])
    print(json.dumps(result, indent=2, ensure_ascii=False))
    print(f"{len(result)} candidate clip(s) selected")
