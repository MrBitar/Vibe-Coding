"""Klondike solver: move generation + a best-first search.

Full Klondike is NP-hard-ish and not always winnable, so instead of an exact
solver we run a greedy best-first search (like A*) over the move graph,
de-duplicating visited states, bounded by a node budget. If it finds a state
where all foundations are complete, that's a full win. If the budget runs out
first, we fall back to the best (highest-heuristic) partial plan found -
still useful as a "play what progress you can" bot.
"""
from __future__ import annotations

import heapq
import itertools
import random
from typing import Dict, Iterator, List, Optional, Tuple

from ..models import Card, GameState, Pile, PileType, Suit, standard_deck
from .base import Move, Solver

FOUNDATION_NAMES = {s: f"foundation-{s.value}" for s in Suit}
TABLEAU_NAMES = [f"tableau-{i}" for i in range(1, 8)]
STOCK_NAME = "stock"
WASTE_NAME = "waste"


def new_game(draw_count: int = 1, seed: Optional[int] = None) -> GameState:
    """Deal a fresh, shuffled Klondike game (used by `main.py demo` and tests)."""
    rng = random.Random(seed)
    deck = standard_deck()
    rng.shuffle(deck)

    piles: Dict[str, Pile] = {}
    for suit in Suit:
        piles[FOUNDATION_NAMES[suit]] = Pile(FOUNDATION_NAMES[suit], PileType.FOUNDATION)
    for i, name in enumerate(TABLEAU_NAMES, start=1):
        cards = [deck.pop() for _ in range(i)]
        cards[-1] = cards[-1].flipped(True)  # only the top card is dealt face up
        piles[name] = Pile(name, PileType.TABLEAU, cards)
    piles[STOCK_NAME] = Pile(STOCK_NAME, PileType.STOCK, deck)  # remaining cards stay face down
    piles[WASTE_NAME] = Pile(WASTE_NAME, PileType.WASTE)
    return GameState(piles)


def movable_sequence(pile: Pile) -> List[Card]:
    """Longest face-up, properly-ordered (descending, alternating color) run at the top."""
    cards = pile.cards
    if not cards or not cards[-1].face_up:
        return []
    seq = [cards[-1]]
    i = len(cards) - 2
    while i >= 0:
        c = cards[i]
        nxt = seq[0]
        if not c.face_up or c.value != nxt.value + 1 or c.is_red == nxt.is_red:
            break
        seq.insert(0, c)
        i -= 1
    return seq


def _can_stack_tableau(card: Card, dest: Pile) -> bool:
    if dest.is_empty():
        return card.rank == "K"
    top = dest.top()
    return top.face_up and card.value == top.value - 1 and card.is_red != top.is_red


def _can_stack_foundation(card: Card, dest: Pile) -> bool:
    if dest.is_empty():
        return card.rank == "A"
    top = dest.top()
    return top.suit == card.suit and card.value == top.value + 1


def generate_moves(state: GameState, draw_count: int) -> Iterator[Tuple[Move, GameState]]:
    """Looks piles up by `kind`, not by fixed names - this is what lets the
    solver run against auto-detected layouts (which won't necessarily use
    the same names/count `new_game()` does) without any changes here."""
    stock = state.piles_of(PileType.STOCK)[0]
    waste = state.piles_of(PileType.WASTE)[0]
    tableaus = state.piles_of(PileType.TABLEAU)
    foundations = state.piles_of(PileType.FOUNDATION)

    # 1. Waste / tableau top card -> foundation. Any one matching/empty
    # foundation pile is as good as any other - first match wins, which
    # also prunes otherwise-symmetric branching in the search.
    for src in [waste, *tableaus]:
        card = src.top()
        if card and card.face_up:
            for dest in foundations:
                if _can_stack_foundation(card, dest):
                    ns = state.clone()
                    ns.piles[src.name].cards.pop()
                    ns.piles[dest.name].cards.append(card)
                    _reveal_top(ns.piles[src.name])
                    yield Move(src.name, dest.name, 1, f"{card.name} to foundation"), ns
                    break

    # 2. Waste top card -> tableau.
    card = waste.top()
    if card:
        for dest in tableaus:
            if _can_stack_tableau(card, dest):
                ns = state.clone()
                ns.piles[waste.name].cards.pop()
                ns.piles[dest.name].cards.append(card)
                yield Move(waste.name, dest.name, 1, f"{card.name} to {dest.name}"), ns

    # 3. Tableau run -> tableau (try every movable suffix length, longest first).
    for src in tableaus:
        seq = movable_sequence(src)
        for k in range(len(seq), 0, -1):
            group = seq[len(seq) - k:]
            head = group[0]
            for dest in tableaus:
                if dest.name == src.name:
                    continue
                if _can_stack_tableau(head, dest):
                    ns = state.clone()
                    moved = ns.piles[src.name].cards[-k:]
                    del ns.piles[src.name].cards[-k:]
                    ns.piles[dest.name].cards.extend(moved)
                    _reveal_top(ns.piles[src.name])
                    yield Move(src.name, dest.name, k, f"{head.name}+{k - 1} to {dest.name}"), ns

    # 4. Draw from stock (or recycle waste back into stock when stock is empty).
    if stock.cards:
        ns = state.clone()
        n = min(draw_count, len(ns.piles[stock.name].cards))
        drawn = [ns.piles[stock.name].cards.pop() for _ in range(n)]
        for c in reversed(drawn):
            ns.piles[waste.name].cards.append(c.flipped(True))
        yield Move(stock.name, waste.name, n, "draw"), ns
    elif waste.cards:
        ns = state.clone()
        recycled = [c.flipped(False) for c in reversed(ns.piles[waste.name].cards)]
        ns.piles[waste.name].cards.clear()
        ns.piles[stock.name].cards.extend(recycled)
        yield Move(waste.name, stock.name, len(recycled), "recycle waste"), ns


def apply_move(state: GameState, move: Move, draw_count: int) -> GameState:
    """Re-derive the resulting state for a Move already chosen by the
    solver (used by main.py to advance its model of the board as it plays)."""
    for candidate, nxt in generate_moves(state, draw_count):
        if candidate == move:
            return nxt
    raise ValueError(f"Move is no longer valid against this state: {move}")


def _reveal_top(pile: Pile) -> None:
    if pile.cards and not pile.cards[-1].face_up:
        pile.cards[-1] = pile.cards[-1].flipped(True)


def heuristic(state: GameState) -> float:
    score = 0.0
    for pile in state.piles.values():
        if pile.kind == PileType.FOUNDATION:
            score += len(pile) * 20
        elif pile.kind == PileType.TABLEAU:
            score -= sum(1 for c in pile.cards if not c.face_up) * 3
            if pile.is_empty():
                score += 8
        elif pile.kind == PileType.WASTE:
            score -= len(pile) * 0.5
    return score


class KlondikeSolver(Solver):
    def __init__(self, draw_count: int = 1, node_budget: int = 200_000):
        self.draw_count = draw_count
        self.node_budget = node_budget

    def solve(self, state: GameState) -> Optional[List[Move]]:
        counter = itertools.count()
        visited = {state.canonical()}
        frontier: List[tuple] = [(-heuristic(state), 0, next(counter), state, [])]
        best_moves: List[Move] = []
        best_score = heuristic(state)

        nodes = 0
        while frontier and nodes < self.node_budget:
            neg_h, depth, _, cur, path = heapq.heappop(frontier)
            nodes += 1

            if cur.is_won():
                return path

            if -neg_h > best_score or (not best_moves and path):
                best_score = -neg_h
                best_moves = path

            for move, nxt in generate_moves(cur, self.draw_count):
                key = nxt.canonical()
                if key in visited:
                    continue
                visited.add(key)
                heapq.heappush(
                    frontier, (-heuristic(nxt), depth + 1, next(counter), nxt, path + [move])
                )

        return best_moves or None
