"""Central configuration for the bot. Values here are safe defaults;
most are overridable from the CLI (see main.py --help)."""
from dataclasses import dataclass
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent


@dataclass
class Config:
    layout_path: Path = PROJECT_ROOT / "layouts" / "layout.json"
    templates_dir: Path = PROJECT_ROOT / "templates"

    # --- speed (user-controlled; see controller.SpeedController) ---
    move_delay: float = 0.6          # seconds paused between moves
    drag_duration: float = 0.25      # seconds for the mouse drag motion itself

    # --- perception ---
    match_threshold: float = 0.82    # min template-match confidence to accept a card ID
    settle_delay: float = 0.35       # wait after a move before re-capturing (let animations finish)

    # --- solver ---
    node_budget: int = 200_000       # search budget before returning the best partial plan
    draw_count: int = 1              # klondike: 1 (draw-1) or 3 (draw-3)

    # --- execution ---
    dry_run: bool = False            # if True, never actually move the mouse
    show_overlay: bool = True        # live annotated CV window
