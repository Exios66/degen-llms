from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from enum import Enum

from blackjack.rng import SECURE_RANDOM, RandomSource, fisher_yates_shuffle, shoe_fingerprint


class Suit(str, Enum):
    SPADES = "spades"
    HEARTS = "hearts"
    DIAMONDS = "diamonds"
    CLUBS = "clubs"


class Rank(str, Enum):
    ACE = "A"
    TWO = "2"
    THREE = "3"
    FOUR = "4"
    FIVE = "5"
    SIX = "6"
    SEVEN = "7"
    EIGHT = "8"
    NINE = "9"
    TEN = "10"
    JACK = "J"
    QUEEN = "Q"
    KING = "K"


RANK_VALUES: dict[Rank, int] = {
    Rank.ACE: 11,
    Rank.TWO: 2,
    Rank.THREE: 3,
    Rank.FOUR: 4,
    Rank.FIVE: 5,
    Rank.SIX: 6,
    Rank.SEVEN: 7,
    Rank.EIGHT: 8,
    Rank.NINE: 9,
    Rank.TEN: 10,
    Rank.JACK: 10,
    Rank.QUEEN: 10,
    Rank.KING: 10,
}

SUIT_SYMBOLS = {
    Suit.SPADES: "♠",
    Suit.HEARTS: "♥",
    Suit.DIAMONDS: "♦",
    Suit.CLUBS: "♣",
}

SUIT_ASCII = {
    Suit.SPADES: "S",
    Suit.HEARTS: "H",
    Suit.DIAMONDS: "D",
    Suit.CLUBS: "C",
}


@dataclass(frozen=True, slots=True)
class Card:
    rank: Rank
    suit: Suit

    @property
    def value(self) -> int:
        return RANK_VALUES[self.rank]

    @property
    def is_ace(self) -> bool:
        return self.rank == Rank.ACE

    @property
    def is_ten_value(self) -> bool:
        return self.value == 10

    def label(self, unicode: bool = True) -> str:
        symbol = SUIT_SYMBOLS[self.suit] if unicode else SUIT_ASCII[self.suit]
        return f"{self.rank.value}{symbol}"

    def key(self) -> str:
        return f"{self.rank.value}{self.suit.value}"


def make_single_deck() -> list[Card]:
    return [Card(rank, suit) for suit in Suit for rank in Rank]


class Shoe:
    """Multi-deck shoe with cut-card reshuffle."""

    CUT_CARD_FRACTION = 0.25

    def __init__(
        self,
        num_decks: int = 6,
        rng: RandomSource | None = None,
        verbose_shuffle: bool = False,
    ) -> None:
        if not 1 <= num_decks <= 8:
            raise ValueError("num_decks must be between 1 and 8")
        self.num_decks = num_decks
        self._rng = rng or SECURE_RANDOM
        self.verbose_shuffle = verbose_shuffle
        self._cards: list[Card] = []
        self._initial_size = num_decks * 52
        self._cut_index = int(self._initial_size * self.CUT_CARD_FRACTION)
        self.last_shuffle_id: str | None = None
        self.shuffle_count = 0
        self._round_active = False
        self._round_dealt: Counter[str] = Counter()
        self.reshuffle()

    def reshuffle(self) -> None:
        self._cards = make_single_deck() * self.num_decks
        fisher_yates_shuffle(self._cards, self._rng)
        self.shuffle_count += 1
        self.last_shuffle_id = shoe_fingerprint([c.key() for c in self._cards])

    def _maybe_reshuffle(self) -> None:
        if len(self._cards) <= self._cut_index:
            self.reshuffle()

    def _refill_round_shoe(self) -> None:
        """Refill from cards not already seen in the live round.

        A cut-card shuffle is deferred until the next round, but a short shoe
        can still run dry mid-round. Rebuilding from the complement keeps every
        card in the round unique; if all 52 are already on the table there is
        nothing left to deal and the caller gets a clear error.
        """
        counts = Counter(c.key() for c in make_single_deck() * self.num_decks)
        counts.subtract(self._round_dealt)
        self._cards = []
        for card in make_single_deck() * self.num_decks:
            key = card.key()
            if counts[key] > 0:
                self._cards.append(card)
                counts[key] -= 1
        if not self._cards:
            return
        fisher_yates_shuffle(self._cards, self._rng)
        self.shuffle_count += 1
        self.last_shuffle_id = shoe_fingerprint([c.key() for c in self._cards])

    def deal(self) -> Card:
        if not self._round_active:
            self._maybe_reshuffle()
        if not self._cards and self._round_active:
            self._refill_round_shoe()
        if not self._cards:
            raise RuntimeError("Shoe is empty after reshuffle")
        card = self._cards.pop()
        if self._round_active:
            self._round_dealt[card.key()] += 1
        return card

    def begin_round(self) -> None:
        """Honor the cut card between rounds, keeping live cards out of a reshuffle."""
        self._maybe_reshuffle()
        self._round_dealt = Counter()
        self._round_active = True

    def finish_round(self) -> None:
        self._round_active = False
        self._round_dealt = Counter()

    @property
    def remaining(self) -> int:
        return len(self._cards)

    @property
    def initial_size(self) -> int:
        return self._initial_size

    def composition(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for card in self._cards:
            key = card.key()
            counts[key] = counts.get(key, 0) + 1
        return counts
