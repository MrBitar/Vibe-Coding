"""Shared move representation + the interface every variant solver implements.

Adding a new variant (Spider, FreeCell, ...) means writing a new module in
this package that exposes a `Solver` subclass; nothing outside solver/ needs
to change.
"""
from dataclasses import dataclass
from typing import List, Optional

from ..models import GameState


@dataclass(frozen=True)
class Move:
    source: str          # pile name
    dest: str             # pile name
    count: int = 1        # cards moved as a unit (tableau runs, or stock draw count)
    description: str = ""

    def __str__(self) -> str:  # noqa: D105
        label = self.description or f"{self.source} -> {self.dest}"
        return f"{label} ({self.count} card{'s' if self.count != 1 else ''})"


class Solver:
    """Interface every variant solver implements."""

    def solve(self, state: GameState) -> Optional[List[Move]]:
        """Return a list of Moves to play, or None if no progress could be made.

        A best-effort solver may return a partial plan (one that doesn't
        fully win the game) if it exhausted its search budget without
        finding a full solution but made some progress.
        """
        raise NotImplementedError
