"""Poker hand evaluation using UCI / Kaggle poker-hands-dataset encoding.

Dataset reference: https://www.kaggle.com/datasets/joogollucci/poker-hands-dataset
(UCI Machine Learning Repository — poker hand)

Encoding
--------
Suits (S1–S5): 1=Hearts, 2=Spades, 3=Diamonds, 4=Clubs
Ranks (C1–C5): 1=Ace … 10=Ten, 11=Jack, 12=Queen, 13=King
CLASS (0–9): hand category from high card through royal flush.
"""

from __future__ import annotations

from dataclasses import dataclass
from itertools import combinations
from typing import Iterable, Sequence

from blackjack.cards import Card, Rank, Suit

# UCI/Kaggle CLASS labels (0–9)
HAND_CLASS_NAMES: tuple[str, ...] = (
    "Nothing in hand",
    "One pair",
    "Two pairs",
    "Three of a kind",
    "Straight",
    "Flush",
    "Full house",
    "Four of a kind",
    "Straight flush",
    "Royal flush",
)

_UCI_SUIT_TO_SUIT: dict[int, Suit] = {
    1: Suit.HEARTS,
    2: Suit.SPADES,
    3: Suit.DIAMONDS,
    4: Suit.CLUBS,
}

_UCI_RANK_TO_RANK: dict[int, Rank] = {
    1: Rank.ACE,
    2: Rank.TWO,
    3: Rank.THREE,
    4: Rank.FOUR,
    5: Rank.FIVE,
    6: Rank.SIX,
    7: Rank.SEVEN,
    8: Rank.EIGHT,
    9: Rank.NINE,
    10: Rank.TEN,
    11: Rank.JACK,
    12: Rank.QUEEN,
    13: Rank.KING,
}

_RANK_TO_UCI: dict[Rank, int] = {v: k for k, v in _UCI_RANK_TO_RANK.items()}
_SUIT_TO_UCI: dict[Suit, int] = {v: k for k, v in _UCI_SUIT_TO_SUIT.items()}


@dataclass(frozen=True, slots=True)
class HandScore:
    """Comparable score for a five-card poker hand."""

    hand_class: int
    tiebreak: tuple[int, ...]

    @property
    def name(self) -> str:
        return HAND_CLASS_NAMES[self.hand_class]

    def as_tuple(self) -> tuple[int, ...]:
        return (self.hand_class, *self.tiebreak)


def card_to_uci(card: Card) -> tuple[int, int]:
    return (_SUIT_TO_UCI[card.suit], _RANK_TO_UCI[card.rank])


def card_from_uci(suit: int, rank: int) -> Card:
    return Card(_UCI_RANK_TO_RANK[rank], _UCI_SUIT_TO_SUIT[suit])


def cards_from_uci_row(row: Sequence[int]) -> list[Card]:
    """Parse a 10- or 11-field UCI dataset row into five ``Card`` objects."""
    if len(row) < 10:
        raise ValueError("UCI poker row needs at least 10 fields (S1,C1,…,S5,C5)")
    cards: list[Card] = []
    for i in range(0, 10, 2):
        cards.append(card_from_uci(int(row[i]), int(row[i + 1])))
    return cards


def evaluate_five_uci(suits: Sequence[int], ranks: Sequence[int]) -> HandScore:
    cards = [card_from_uci(s, r) for s, r in zip(suits, ranks, strict=True)]
    return evaluate_five_cards(cards)


def evaluate_five_cards(cards: Sequence[Card]) -> HandScore:
    if len(cards) != 5:
        raise ValueError("evaluate_five_cards expects exactly five cards")
    suits = [card_to_uci(c)[0] for c in cards]
    ranks = sorted((card_to_uci(c)[1] for c in cards), reverse=True)

    is_flush = len(set(suits)) == 1
    straight_high = _straight_high(ranks)
    is_straight = straight_high is not None

    counts: dict[int, int] = {}
    for r in ranks:
        counts[r] = counts.get(r, 0) + 1
    by_count = sorted(((cnt, r) for r, cnt in counts.items()), reverse=True)

    if is_straight and is_flush:
        if set(ranks) == {1, 10, 11, 12, 13}:
            return HandScore(9, (14,))
        return HandScore(8, (straight_high,))

    if by_count[0][0] == 4:
        quad_rank = by_count[0][1]
        kicker = max(r for r in ranks if r != quad_rank)
        return HandScore(7, (quad_rank, kicker))

    if by_count[0][0] == 3 and by_count[1][0] == 2:
        return HandScore(6, (by_count[0][1], by_count[1][1]))

    if is_flush:
        return HandScore(5, tuple(ranks))

    if is_straight:
        return HandScore(4, (straight_high,))

    if by_count[0][0] == 3:
        trips = by_count[0][1]
        kickers = sorted((r for r in ranks if r != trips), reverse=True)
        return HandScore(3, (trips, *kickers))

    if by_count[0][0] == 2 and by_count[1][0] == 2:
        high_pair, low_pair = sorted((by_count[0][1], by_count[1][1]), reverse=True)
        kicker = max(r for r in ranks if r not in (high_pair, low_pair))
        return HandScore(2, (high_pair, low_pair, kicker))

    if by_count[0][0] == 2:
        pair = by_count[0][1]
        kickers = sorted((r for r in ranks if r != pair), reverse=True)
        return HandScore(1, (pair, *kickers))

    return HandScore(0, tuple(ranks))


def _rank_values_for_straight(ranks: Sequence[int]) -> list[int]:
    """UCI ranks with Ace treated as 14 when forming broadway / high straights."""
    values = list(ranks)
    if 1 in values:
        values.append(14)
    return values


def _straight_high(ranks: Sequence[int]) -> int | None:
    expanded = _rank_values_for_straight(ranks)
    unique = sorted(set(expanded), reverse=True)
    if len(set(ranks)) != 5:
        return None
    # Broadway: A-K-Q-J-10 encoded as 1,13,12,11,10
    if set(ranks) == {1, 10, 11, 12, 13}:
        return 14
    # Wheel: A-2-3-4-5 encoded as 1,2,3,4,5
    if set(ranks) == {1, 2, 3, 4, 5}:
        return 5
    if len(unique) >= 5:
        top5 = sorted(set(ranks), reverse=True)
        if len(top5) == 5 and top5[0] - top5[4] == 4:
            return top5[0]
    return None


def best_hand_from_cards(cards: Sequence[Card]) -> tuple[HandScore, list[Card]]:
    """Return the best five-card score from up to seven hole + community cards."""
    if len(cards) < 5:
        raise ValueError("Need at least five cards")
    best_score: HandScore | None = None
    best_combo: list[Card] | None = None
    for combo in combinations(cards, 5):
        score = evaluate_five_cards(list(combo))
        if best_score is None or compare_scores(score, best_score) > 0:
            best_score = score
            best_combo = list(combo)
    assert best_score is not None and best_combo is not None
    return best_score, best_combo


def compare_scores(a: HandScore, b: HandScore) -> int:
    """Return positive if *a* beats *b*, negative if *b* beats *a*, else 0."""
    ta, tb = a.as_tuple(), b.as_tuple()
    if ta > tb:
        return 1
    if ta < tb:
        return -1
    return 0


def validate_against_dataset_class(cards: Sequence[Card], expected_class: int) -> bool:
    """Check that five cards match the dataset CLASS label (for tests)."""
    return evaluate_five_cards(list(cards)).hand_class == expected_class


# Sample rows from poker-hand-testing.data (UCI/Kaggle dataset)
DATASET_FIXTURES: tuple[tuple[tuple[int, ...], int], ...] = (
    ((1, 1, 1, 13, 2, 4, 2, 3, 1, 12), 0),
    ((3, 12, 3, 2, 3, 11, 4, 5, 2, 5), 1),
    ((4, 8, 1, 3, 2, 3, 2, 2, 2, 8), 2),
    ((1, 9, 1, 6, 4, 5, 3, 5, 1, 5), 3),
    ((1, 11, 1, 10, 1, 12, 3, 8, 1, 9), 4),
    ((1, 1, 1, 7, 1, 2, 1, 6, 1, 5), 5),
    ((4, 5, 1, 9, 3, 5, 4, 9, 2, 9), 6),
    ((1, 2, 3, 2, 4, 2, 2, 2, 1, 8), 7),
    ((4, 5, 4, 4, 4, 8, 4, 6, 4, 7), 8),
    ((4, 12, 4, 1, 4, 13, 4, 11, 4, 10), 9),
)
