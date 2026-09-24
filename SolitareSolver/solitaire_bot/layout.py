"""The calibration file that adapts the generic pipeline to one specific
solitaire app/skin. This is how "works with any solitaire game" is actually
achieved: not a universal recognizer, but a generic engine + a per-game
layout you build once with `calibrate.py`."""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Dict, Optional


@dataclass
class PileRegion:
    kind: str          # "stock" | "waste" | "foundation" | "tableau" | "freecell"
    x: int
    y: int
    w: int
    h: int
    stack_offset: int = 0  # vertical pixels between successive stacked cards


@dataclass
class Layout:
    piles: Dict[str, PileRegion] = field(default_factory=dict)
    capture_region: Optional[dict] = None  # {"left","top","width","height"} or None = primary monitor
    corner_crop: dict = field(default_factory=lambda: {"w": 24, "h": 32, "dx": 3, "dy": 3})
    draw_count: int = 1

    @staticmethod
    def load(path: Path) -> "Layout":
        data = json.loads(Path(path).read_text())
        piles = {name: PileRegion(**region) for name, region in data["piles"].items()}
        return Layout(
            piles=piles,
            capture_region=data.get("capture_region"),
            corner_crop=data.get("corner_crop", {"w": 24, "h": 32, "dx": 3, "dy": 3}),
            draw_count=data.get("draw_count", 1),
        )

    def save(self, path: Path) -> None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "piles": {name: asdict(region) for name, region in self.piles.items()},
            "capture_region": self.capture_region,
            "corner_crop": self.corner_crop,
            "draw_count": self.draw_count,
        }
        path.write_text(json.dumps(data, indent=2))
