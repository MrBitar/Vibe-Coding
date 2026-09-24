"""Generic solitaire data model.

Deliberately game-agnostic at this layer: Card/Pile/GameState make no
assumptions about which variant is being played. Variant rules live in
solver/*.py.
"""
from __future__ import annotations

import copy
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional

RANK_ORDER = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]


class Suit(Enum):
    CLUBS = "C"
    DIAMONDS = "D"
    HEARTS = "H"
    SPADES = "S"

    @property
    def is_red(self) -> bool:
        return self in (Suit.DIAMONDS, Suit.HEARTS)


@dataclass(frozen=True)
class Card:
    rank: str  # one of RANK_ORDER
    suit: Suit
    face_up: bool = True

    @property
    def value(self) -> int:
        """1 (Ace) .. 13 (King)."""
        return RANK_ORDER.index(self.rank) + 1

    @property
    def is_red(self) -> bool:
        return self.suit.is_red

    def flipped(self, face_up: bool) -> "Card":
        return Card(self.rank, self.suit, face_up)

    @property
    def name(self) -> str:
        return f"{self.rank}{self.suit.value}"

    def __str__(self) -> str:  # noqa: D105
        return self.name if self.face_up else "??"


class PileType(Enum):
    STOCK = "stock"
    WASTE = "waste"
    FOUNDATION = "foundation"
    TABLEAU = "tableau"
    FREECELL = "freecell"


@dataclass
class Pile:
    name: str
    kind: PileType
    cards: List[Card] = field(default_factory=list)

    def top(self) -> Optional[Card]:
        return self.cards[-1] if self.cards else None

    def is_empty(self) -> bool:
        return not self.cards

    def __len__(self) -> int:  # noqa: D105
        return len(self.cards)


@dataclass
class GameState:
    piles: Dict[str, Pile]

    def clone(self) -> "GameState":
        return copy.deepcopy(self)

    def piles_of(self, kind: PileType) -> List[Pile]:
        return [p for p in self.piles.values() if p.kind == kind]

    def is_won(self) -> bool:
        foundations = self.piles_of(PileType.FOUNDATION)
        return bool(foundations) and all(len(p) == 13 for p in foundations)

    def canonical(self):
        """Deterministic, hashable snapshot used for search de-duplication."""
        return tuple(
            (name, tuple((c.rank, c.suit.value, c.face_up) for c in pile.cards))
            for name, pile in sorted(self.piles.items())
        )

    def __str__(self) -> str:  # noqa: D105
        lines = []
        for name in sorted(self.piles):
            pile = self.piles[name]
            cards = " ".join(str(c) for c in pile.cards)
            lines.append(f"{name:14} | {cards}")
        return "\n".join(lines)


def standard_deck() -> List[Card]:
    return [Card(rank, suit, face_up=False) for suit in Suit for rank in RANK_ORDER]
