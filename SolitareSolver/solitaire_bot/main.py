"""CLI entry point.

  python -m solitaire_bot.main demo   # solves + "plays" a synthetic shuffled
                                       # deal in the console, no screen/game
                                       # needed - proves the solver works.

  python -m solitaire_bot.main run    # auto-detects the game on screen and
                                       # plays it for real - no setup needed.

`run` auto-detects pile positions the first time it's pointed at a game and
saves the result, so there's nothing to do by hand. `calibrate.py` remains
available if you want to hand-fix a layout or capture real card templates
for better recognition accuracy on a specific game - see README.md.
"""
from __future__ import annotations

import argparse
import time
from pathlib import Path

from .autolayout import detect_layout
from .capture import ScreenCapturer
from .config import Config
from .controller import SpeedController
from .executor import Executor
from .layout import Layout
from .perception import load_templates, recognize
from .solver.klondike import KlondikeSolver, apply_move, new_game
from .visualizer import OverlayWindow, print_plan, print_progress, print_state


def run_demo(args: argparse.Namespace) -> None:
    state = new_game(draw_count=args.draw_count, seed=args.seed)
    print("Dealt a new game:")
    print_state(state)

    solver = KlondikeSolver(draw_count=args.draw_count, node_budget=args.node_budget)
    print("\nSolving...")
    moves = solver.solve(state)
    print_plan(moves)
    if not moves:
        return

    speed = SpeedController(initial_delay=args.delay)
    cur = state
    for i, move in enumerate(moves, 1):
        speed.wait_if_paused()
        print_progress(i, len(moves), move)
        cur = apply_move(cur, move, args.draw_count)
        time.sleep(speed.delay())

    print("\nFinal state:")
    print_state(cur)
    print("WON" if cur.is_won() else "Ran out of moves without a full win.")


def run_live(args: argparse.Namespace) -> None:
    if args.layout.exists() and not args.redetect:
        layout = Layout.load(args.layout)
        print(f"Using saved layout from {args.layout}")
        capturer = ScreenCapturer(region=layout.capture_region)
        frame = capturer.grab()
    else:
        print("No saved layout - auto-detecting pile positions from the screen...")
        capturer = ScreenCapturer(region=None)
        frame = capturer.grab()
        layout = detect_layout(frame)
        if layout is None:
            raise SystemExit(
                "Couldn't find any card-shaped regions on screen. Make sure "
                "the game is visible and unobstructed, or run "
                "`python -m solitaire_bot.calibrate regions` to set it up by hand."
            )
        layout.save(args.layout)
        print(f"Detected {len(layout.piles)} piles, saved layout to {args.layout} "
              f"(delete that file, or pass --redetect, to re-detect next time)")

    templates = load_templates(args.templates_dir if args.templates_dir.exists() else None)
    state = recognize(frame, layout, templates, threshold=args.match_threshold)
    print("Recognized board:")
    print_state(state)

    solver = KlondikeSolver(draw_count=layout.draw_count, node_budget=args.node_budget)
    print("\nSolving...")
    moves = solver.solve(state)
    print_plan(moves)
    if not moves:
        return

    speed = SpeedController(initial_delay=args.delay)
    executor = Executor(layout, speed, dry_run=args.dry_run)
    overlay = OverlayWindow(enabled=not args.no_overlay)

    cur = state
    try:
        for i, move in enumerate(moves, 1):
            speed.wait_if_paused()
            print_progress(i, len(moves), move)
            overlay.show(frame, layout, cur, next_move=move)
            executor.perform(move, cur)
            cur = apply_move(cur, move, layout.draw_count)
            time.sleep(args.settle_delay)
            frame = capturer.grab()
    finally:
        overlay.close()

    print("WON" if cur.is_won() else "Plan exhausted without a full win.")


def build_parser() -> argparse.ArgumentParser:
    defaults = Config()
    parser = argparse.ArgumentParser(description="Offline solitaire-solving bot.")
    sub = parser.add_subparsers(dest="command", required=True)

    demo = sub.add_parser("demo", help="solve + play a synthetic shuffled deal (no screen needed)")
    demo.add_argument("--draw-count", type=int, default=1, choices=[1, 3])
    demo.add_argument("--seed", type=int, default=None)
    demo.add_argument("--delay", type=float, default=defaults.move_delay)
    demo.add_argument("--node-budget", type=int, default=defaults.node_budget)
    demo.set_defaults(func=run_demo)

    run = sub.add_parser("run", help="capture the real game on screen and play it")
    run.add_argument("--layout", type=Path, default=defaults.layout_path)
    run.add_argument("--redetect", action="store_true",
                      help="ignore any saved layout and auto-detect pile positions again")
    run.add_argument("--templates-dir", type=Path, default=defaults.templates_dir)
    run.add_argument("--delay", type=float, default=defaults.move_delay)
    run.add_argument("--settle-delay", type=float, default=defaults.settle_delay)
    run.add_argument("--match-threshold", type=float, default=defaults.match_threshold)
    run.add_argument("--node-budget", type=int, default=defaults.node_budget)
    run.add_argument("--dry-run", action="store_true", help="print/show moves but never touch the mouse")
    run.add_argument("--no-overlay", action="store_true", help="disable the live annotated CV window")
    run.set_defaults(func=run_live)

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
