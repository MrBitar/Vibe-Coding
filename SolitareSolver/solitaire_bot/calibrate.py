"""Optional, manual overrides - NOT required to run the bot.

`main.py run` auto-detects pile positions and recognizes cards with a
bundled synthetic template set on its own; you don't need to run anything
here first. These tools exist for the cases where that isn't good enough:

  python -m solitaire_bot.calibrate regions     # hand-fix pile positions if
                                                 # auto-detection got a
                                                 # layout wrong
  python -m solitaire_bot.calibrate templates   # capture real card corner
                                                 # images from this specific
                                                 # game for more reliable
                                                 # recognition than the
                                                 # synthetic default

Both write into layouts/layout.json and templates/*.png, which `run` then
uses against that specific game.
"""
from __future__ import annotations

import argparse
from pathlib import Path

import cv2

from .capture import ScreenCapturer
from .config import Config
from .layout import Layout, PileRegion


class _RegionPicker:
    def __init__(self):
        self.drawing = False
        self.start = None
        self.current = None
        self.ready = False

    def callback(self, event, x, y, flags, param):  # noqa: D102
        if event == cv2.EVENT_LBUTTONDOWN:
            self.drawing = True
            self.start = (x, y)
            self.current = (x, y)
            self.ready = False
        elif event == cv2.EVENT_MOUSEMOVE and self.drawing:
            self.current = (x, y)
        elif event == cv2.EVENT_LBUTTONUP:
            self.drawing = False
            self.current = (x, y)
            self.ready = True


def pick_regions(image) -> dict:
    """Two phases, deliberately not interleaved:

    1. Draw every rectangle in the image window. This loop only ever calls
       cv2.imshow/waitKey - never a blocking input() - so the window's
       message pump stays serviced and it never freezes.
    2. Once you press 'q' the window closes, and *then* we ask about each
       rectangle purely in the terminal, no window involved.

    (An earlier version asked for the pile name via input() from inside the
    draw loop. That blocks the main thread while the window is still open,
    so Windows stops servicing its message queue and marks it "Not
    Responding" as soon as you finish the first rectangle.)
    """
    picker = _RegionPicker()
    window = "Draw a rectangle per pile - 'q' when you've drawn them ALL"
    cv2.namedWindow(window)
    cv2.setMouseCallback(window, picker.callback)

    rects = []  # [(x, y, w, h), ...] in the order they were drawn

    print(
        "Drag a rectangle around each pile (each tableau column, stock, "
        "waste, each foundation). Draw ALL of them first - you'll name them "
        "afterwards in this terminal, so the window stays responsive while "
        "you draw. Press 'q' in the image window once every pile is boxed."
    )

    while True:
        canvas = image.copy()
        for i, (x, y, w, h) in enumerate(rects, start=1):
            cv2.rectangle(canvas, (x, y), (x + w, y + h), (0, 200, 0), 2)
            cv2.putText(canvas, str(i), (x, max(y - 6, 10)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 200, 0), 1, cv2.LINE_AA)
        if picker.drawing and picker.start and picker.current:
            cv2.rectangle(canvas, picker.start, picker.current, (0, 0, 255), 2)
        cv2.imshow(window, canvas)
        key = cv2.waitKey(20) & 0xFF
        if key == ord("q"):
            break

        if picker.ready:
            picker.ready = False
            x0, y0 = picker.start
            x1, y1 = picker.current
            x, y = min(x0, x1), min(y0, y1)
            w, h = abs(x1 - x0), abs(y1 - y0)
            if w >= 5 and h >= 5:
                rects.append((x, y, w, h))

    cv2.destroyWindow(window)
    cv2.waitKey(1)  # let the close message actually get processed

    piles = {}
    print(f"\nDrew {len(rects)} rectangle(s). Now name each one (terminal only - the window is closed):")
    for i, (x, y, w, h) in enumerate(rects, start=1):
        print(f"\nRectangle {i}: x={x} y={y} w={w} h={h}")
        name = input("  Pile name (e.g. tableau-1, stock, waste, foundation-S), blank to skip: ").strip()
        if not name:
            continue
        kind = input("  Kind [stock/waste/foundation/tableau/freecell]: ").strip().lower()
        offset_str = input("  Stack offset in px between cards (0 if not stacked) [0]: ").strip()
        offset = int(offset_str) if offset_str else 0
        piles[name] = PileRegion(kind=kind, x=x, y=y, w=w, h=h, stack_offset=offset)

    return piles


def capture_templates(image, templates_dir: Path, crop_w: int, crop_h: int) -> None:
    """Same two-phase structure as pick_regions, for the same reason: click
    everything first (window stays responsive), name everything after the
    window is closed (terminal only)."""
    templates_dir = Path(templates_dir)
    templates_dir.mkdir(parents=True, exist_ok=True)
    window = "Click each card corner you want to capture - 'q' when done"
    clicked = {"pt": None}

    def callback(event, x, y, flags, param):
        if event == cv2.EVENT_LBUTTONDOWN:
            clicked["pt"] = (x, y)

    cv2.namedWindow(window)
    cv2.setMouseCallback(window, callback)

    print(
        "Click directly on the rank/suit index in each card corner you "
        "want to capture. Click ALL of them first - you'll name them "
        "afterwards in this terminal, so the window stays responsive while "
        "you click. You won't see every card in one screenshot - re-run "
        "this as more cards get revealed during play to fill out the "
        "template set. Press 'q' in the image window when done clicking."
    )

    points = []
    while True:
        canvas = image.copy()
        for i, (x, y) in enumerate(points, start=1):
            cv2.circle(canvas, (x, y), 3, (0, 0, 255), -1)
            cv2.putText(canvas, str(i), (x + 4, y - 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 255), 1, cv2.LINE_AA)
        cv2.imshow(window, canvas)
        key = cv2.waitKey(20) & 0xFF
        if key == ord("q"):
            break

        if clicked["pt"]:
            points.append(clicked["pt"])
            clicked["pt"] = None

    cv2.destroyWindow(window)
    cv2.waitKey(1)  # let the close message actually get processed

    print(f"\nClicked {len(points)} point(s). Now name each one (terminal only - the window is closed):")
    for i, (x, y) in enumerate(points, start=1):
        name = input(f"  Point {i} - card name (e.g. AS, 10H, KC), blank to skip: ").strip().upper()
        if not name:
            continue
        x0, y0 = max(x - crop_w // 2, 0), max(y - crop_h // 2, 0)
        crop = image[y0 : y0 + crop_h, x0 : x0 + crop_w]
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        out_path = templates_dir / f"{name}.png"
        cv2.imwrite(str(out_path), gray)
        print(f"  saved {out_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Calibrate the bot for one specific solitaire game.")
    sub = parser.add_subparsers(dest="mode", required=True)
    sub.add_parser("regions", help="draw a rectangle around each pile")
    tmpl = sub.add_parser("templates", help="click card corners and name them")
    tmpl.add_argument("--crop-w", type=int, default=24)
    tmpl.add_argument("--crop-h", type=int, default=32)
    parser.add_argument("--layout", type=Path, default=Config.layout_path)
    parser.add_argument("--templates-dir", type=Path, default=Config.templates_dir)
    args = parser.parse_args()

    capturer = ScreenCapturer()
    frame = capturer.grab()

    layout = Layout.load(args.layout) if args.layout.exists() else Layout()

    if args.mode == "regions":
        piles = pick_regions(frame)
        layout.piles.update(piles)
        layout.save(args.layout)
        print(f"Saved {len(piles)} pile region(s) to {args.layout}")
    elif args.mode == "templates":
        layout.corner_crop = {"w": args.crop_w, "h": args.crop_h, "dx": 3, "dy": 3}
        layout.save(args.layout)
        capture_templates(frame, args.templates_dir, args.crop_w, args.crop_h)


if __name__ == "__main__":
    main()
