"""Milestone 19: trim dead air within a clip rather than only avoiding long
silences at clip-selection time. clip_finder.py already refuses to build a
candidate that crosses an internal gap longer than MAX_INTERNAL_GAP_SECONDS
(3s), but a clip can still accumulate several shorter pauses (e.g. four
1.5s pauses across a 40s clip) that add up to real dead air and hurt
short-form pacing. Any inter-segment gap longer than MAX_GAP_KEPT is
shortened to exactly MAX_GAP_KEPT rather than removed outright - some
breathing room between sentences still sounds natural; zero gap does not.

Trimming changes the clip's own timeline, so anything that positions
content within the clip (captions.py's caption timestamps) must map through
map_original_to_trimmed() instead of a flat "time minus clip start".
"""

MAX_GAP_KEPT = 0.4  # seconds of pause kept at any single internal gap


def compute_kept_ranges(segments: list, clip_start: float, clip_end: float, max_gap_kept: float = MAX_GAP_KEPT) -> list:
    """Return the [start, end] ranges (in the source video's absolute
    timebase) to keep from [clip_start, clip_end], with every internal gap
    between segments longer than max_gap_kept shortened to max_gap_kept.
    Concatenating these ranges in order produces the trimmed clip's content.
    With no segment gaps worth trimming, this returns the single unchanged
    [clip_start, clip_end] range - the same thing clipper.py already cut."""
    relevant = [s for s in segments if s["end"] > clip_start and s["start"] < clip_end]
    if not relevant:
        return [[clip_start, clip_end]]

    ranges = [[clip_start, min(relevant[0]["end"], clip_end)]]
    prev_end = ranges[0][1]

    for seg in relevant[1:]:
        seg_start = max(seg["start"], clip_start)
        seg_end = min(seg["end"], clip_end)
        gap = seg_start - prev_end
        if gap > max_gap_kept:
            ranges[-1][1] = prev_end + max_gap_kept
            ranges.append([seg_start, seg_end])
        else:
            ranges[-1][1] = seg_end
        prev_end = seg_end

    ranges[-1][1] = min(ranges[-1][1], clip_end)
    return ranges


def total_kept_duration(kept_ranges: list) -> float:
    return sum(end - start for start, end in kept_ranges)


def build_trim_concat_filter(kept_ranges: list, time_offset: float = 0.0) -> str:
    """Build an ffmpeg filter_complex string that trims [0:v]/[0:a] to each
    range in kept_ranges (each shifted by -time_offset, for use after an
    input-level seek) and concatenates them in order into [outv]/[outa]. A
    single range degenerates to one trim - the same cut clipper.py always
    did before silence removal existed."""
    parts = []
    labels = []
    for i, (start, end) in enumerate(kept_ranges):
        s, e = start - time_offset, end - time_offset
        parts.append(f"[0:v]trim=start={s:.3f}:end={e:.3f},setpts=PTS-STARTPTS[v{i}]")
        parts.append(f"[0:a]atrim=start={s:.3f}:end={e:.3f},asetpts=PTS-STARTPTS[a{i}]")
        labels.append(f"[v{i}][a{i}]")
    parts.append(f"{''.join(labels)}concat=n={len(kept_ranges)}:v=1:a=1[outv][outa]")
    return ";".join(parts)


def map_original_to_trimmed(t: float, kept_ranges: list) -> float:
    """Map a timestamp from the ORIGINAL (untrimmed) clip timebase to its
    position in the trimmed output, by summing the kept duration before t.
    A timestamp that falls inside a removed gap is clamped to the end of the
    kept range just before it - captions.py needs this since a caption
    chunk's start/end can straddle a gap that got shortened."""
    elapsed = 0.0
    for start, end in kept_ranges:
        if t <= start:
            return elapsed
        if t <= end:
            return elapsed + (t - start)
        elapsed += end - start
    return elapsed
