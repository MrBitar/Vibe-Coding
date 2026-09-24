"""Zero-input pile-region detection: this is what lets `run` work without a
calibration step. It finds card-shaped rectangles by their border stroke
(Canny edges, not color - works whether a border is solid black or a faint
placeholder gray), groups them into piles, and classifies each pile's role
(stock/waste/foundation/tableau) purely from its position on screen.

This is a heuristic built around the overwhelmingly common Klondike layout
convention: stock+waste in the upper-left, foundations upper-right, tableau
columns fanned downward below. Unusual/mirrored layouts may get misclassified
- calibrate.py remains available to hand-fix a layout.json if so.
"""
from __future__ import annotations

from typing import List, Optional, Tuple

import cv2
import numpy as np

from .layout import Layout, PileRegion

CARD_ASPECT_RANGE = (0.5, 0.85)
MIN_CARD_AREA = 2500
MIN_CARD_W = 35
MIN_CARD_H = 55
IOU_DEDUP_THRESHOLD = 0.88  # only collapse near-identical boxes (multiple contours on the
                            # same stroke) - genuinely distinct fanned/overlapping cards
                            # can still have high IoU and must survive this step
BORDER_ROW_FRACTION = 0.85  # a row counts as a card-boundary line if this much of the column width is dark/edge


def _detect_card_boxes(edges: np.ndarray) -> List[Tuple[int, int, int, int]]:
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    boxes = []
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        if w * h < MIN_CARD_AREA or w < MIN_CARD_W or h < MIN_CARD_H:
            continue
        ar = w / float(h)
        if CARD_ASPECT_RANGE[0] < ar < CARD_ASPECT_RANGE[1]:
            boxes.append((x, y, w, h))
    return boxes


def _iou(a, b) -> float:
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    ix1, iy1 = max(ax, bx), max(ay, by)
    ix2, iy2 = min(ax + aw, bx + bw), min(ay + ah, by + bh)
    if ix2 <= ix1 or iy2 <= iy1:
        return 0.0
    inter = (ix2 - ix1) * (iy2 - iy1)
    union = aw * ah + bw * bh - inter
    return inter / union if union else 0.0


def _dedup_boxes(boxes: List[Tuple[int, int, int, int]]) -> List[Tuple[int, int, int, int]]:
    kept: List[Tuple[int, int, int, int]] = []
    for box in sorted(boxes, key=lambda b: -(b[2] * b[3])):
        if all(_iou(box, other) < IOU_DEDUP_THRESHOLD for other in kept):
            kept.append(box)
    return kept


def _group_by_x_overlap(boxes: List[Tuple[int, int, int, int]]) -> List[List[Tuple[int, int, int, int]]]:
    """Merges boxes whose x-ranges substantially overlap. Only meant to be
    called within a single row (see detect_layout) - a tableau column and
    the stock/foundation slot directly above it can share an x-range too,
    so mixing rows here would wrongly merge unrelated piles."""
    groups: List[List[Tuple[int, int, int, int]]] = []
    for box in sorted(boxes, key=lambda b: b[0]):
        x, y, w, h = box
        placed = False
        for group in groups:
            gx, gy, gw, gh = group[0]
            overlap = min(x + w, gx + gw) - max(x, gx)
            if overlap > 0.5 * min(w, gw):
                group.append(box)
                placed = True
                break
        if not placed:
            groups.append([box])
    return groups


def _rows_above_threshold(edges: np.ndarray, x0: int, x1: int, y_lo: int, y_hi: int) -> List[int]:
    """y-positions within [y_lo, y_hi] (inclusive) where a full-width
    horizontal edge line crosses the column - i.e. a card border stroke."""
    y_lo, y_hi = max(0, y_lo), max(0, y_hi + 1)
    if y_hi <= y_lo:
        return []
    width = x1 - x0
    strip = edges[y_lo:y_hi, x0:x1]
    if strip.size == 0:
        return []
    frac = strip.sum(axis=1) / 255.0 / width
    rows = [i + y_lo for i, f in enumerate(frac) if f > BORDER_ROW_FRACTION]
    merged: List[int] = []
    for r in rows:
        if merged and r - merged[-1] <= 3:
            continue
        merged.append(r)
    return merged


def _scan_pile_upward(
    edges: np.ndarray, x: int, w: int, bottom_y: int, card_h: int, floor_y: int = 0
) -> Tuple[int, int]:
    """Walks upward from the fully-exposed bottom card one card at a time,
    only ever looking within a plausible offset distance of the last found
    border line. Bounding each step like this (instead of one big scan up
    to some arbitrary height) is what keeps it from wandering into unrelated
    UI chrome above the pile and corrupting the offset estimate - it simply
    stops as soon as the next expected line isn't there.

    `floor_y` is a hard stop: a tableau column commonly shares its x-range
    with whatever sits in the top row above it (stock, a foundation slot),
    so without a floor the walk can cross into that pile's own bottom
    border and mistake it for one more stacked card.

    Returns (top_y, stack_offset)."""
    min_off, max_off = max(3, int(card_h * 0.06)), int(card_h * 0.65)
    rows = [bottom_y]
    cur = bottom_y
    est_offset: Optional[float] = None
    while True:
        if est_offset is None:
            lo, hi = cur - max_off, cur - min_off
        else:
            # once a rhythm is established, only accept the next line if it
            # actually fits that rhythm - this is what stops the walk right
            # at the true top of the pile instead of drifting onto some
            # unrelated line further up the screen.
            lo, hi = cur - int(est_offset * 1.3), cur - int(est_offset * 0.65)
        lo = max(lo, floor_y)
        candidates = _rows_above_threshold(edges, x, x + w, lo, hi)
        if not candidates:
            break
        nxt = max(candidates)  # nearest qualifying line above `cur`
        rows.append(nxt)
        step = cur - nxt
        cur = nxt
        recent = [rows[i] - rows[i + 1] for i in range(len(rows) - 1)]
        est_offset = float(np.median(recent)) if len(recent) >= 2 else float(step)

    if len(rows) < 2:
        return bottom_y, card_h
    offsets = [rows[i] - rows[i + 1] for i in range(len(rows) - 1)]
    return rows[-1], int(np.median(offsets))


def _split_by_largest_gap(values: List[float]) -> Tuple[List[float], List[float]]:
    """Sorts values and splits at the single largest gap - used both to
    separate the top row (stock/waste/foundation) from the tableau row, and
    to separate stock+waste from the foundations within the top row."""
    ordered = sorted(values)
    if len(ordered) < 2:
        return ordered, []
    gaps = [ordered[i + 1] - ordered[i] for i in range(len(ordered) - 1)]
    split_at = max(range(len(gaps)), key=lambda i: gaps[i])
    return ordered[: split_at + 1], ordered[split_at + 1 :]


def detect_layout(frame: np.ndarray) -> Optional[Layout]:
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 30, 90)
    edges = cv2.dilate(edges, np.ones((2, 2), np.uint8), iterations=1)

    boxes = _dedup_boxes(_detect_card_boxes(edges))
    if not boxes:
        return None

    # Split into the top row (stock/waste/foundation) and the tableau row
    # *first*, purely by y. A stock or foundation slot commonly sits
    # directly above a tableau column (same x-range), so grouping by x
    # before separating rows would wrongly merge the two.
    all_tops = [b[1] for b in boxes]
    low_y, high_y = _split_by_largest_gap(all_tops)
    if not high_y:
        low_y, high_y = [], all_tops
    top_row_boxes = [b for b in boxes if b[1] in low_y]
    tableau_row_boxes = [b for b in boxes if b[1] in high_y]

    # Tableau: detection already gives exactly one (the fully-exposed,
    # bottom-most) box per column - scan upward from it to find the rest.
    # Never scan above the bottom of the top row, or the walk can mistake
    # e.g. the stock pile's own bottom border for one more stacked card.
    top_row_floor = max((b[1] + b[3] for b in top_row_boxes), default=0)
    tableau_row: List[Tuple[int, int, int, int, int]] = []
    for x, y, w, h in tableau_row_boxes:
        top_y, offset = _scan_pile_upward(edges, x, w, y, h, floor_y=top_row_floor)
        tableau_row.append((x, top_y, w, h, offset))

    # Top row: a horizontal fan (e.g. a multi-card waste display) produces
    # more than one box at the same x-cluster - collapse each such cluster
    # down to its rightmost (topmost/active) box.
    top_row: List[Tuple[int, int, int, int, int]] = []
    for group in _group_by_x_overlap(top_row_boxes):
        # the rightmost-*starting* box is the newest/active card in a
        # left-to-right fan - not necessarily the one with the largest
        # right edge, since a wider box merging both cards can win on that.
        x, y, w, h = max(group, key=lambda b: b[0])
        top_row.append((x, y, w, h, 0))

    piles = {}

    tableau_row.sort(key=lambda p: p[0])
    for i, (x, y, w, h, offset) in enumerate(tableau_row, start=1):
        piles[f"tableau-{i}"] = PileRegion(kind="tableau", x=x, y=y, w=w, h=h, stack_offset=offset or h)

    top_row.sort(key=lambda p: p[0])
    xs = [p[0] for p in top_row]
    left_group, right_group = _split_by_largest_gap(xs)
    left = sorted([p for p in top_row if p[0] in left_group], key=lambda p: p[0])
    right = sorted([p for p in top_row if p[0] in right_group], key=lambda p: p[0])

    if left:
        x, y, w, h, _ = left[0]
        piles["stock"] = PileRegion(kind="stock", x=x, y=y, w=w, h=h, stack_offset=0)
    if len(left) > 1:
        x, y, w, h, _ = left[1]
        piles["waste"] = PileRegion(kind="waste", x=x, y=y, w=w, h=h, stack_offset=0)
    for i, (x, y, w, h, _) in enumerate(right, start=1):
        piles[f"foundation-{i}"] = PileRegion(kind="foundation", x=x, y=y, w=w, h=h, stack_offset=0)

    if not piles:
        return None

    sample_w = tableau_row[0][2] if tableau_row else (top_row[0][2] if top_row else 60)
    sample_h = tableau_row[0][3] if tableau_row else (top_row[0][3] if top_row else 90)
    corner_crop = {
        "w": max(10, int(sample_w * 0.30)),
        "h": max(14, int(sample_h * 0.28)),
        "dx": max(1, int(sample_w * 0.05)),
        "dy": max(1, int(sample_h * 0.03)),
    }

    return Layout(piles=piles, capture_region=None, corner_crop=corner_crop, draw_count=1)
