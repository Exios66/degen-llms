import random

import pytest

from blackjack.cards import Card, Rank, Shoe, Suit, make_single_deck
from blackjack.rng import fisher_yates_shuffle


class SeededRandom:
    """Deterministic RNG for tests only."""

    def __init__(self, seed: int) -> None:
        self._rng = random.Random(seed)

    def randrange(self, start: int, stop: int) -> int:
        return self._rng.randrange(start, stop)


def test_single_deck_has_52_unique_cards() -> None:
    deck = make_single_deck()
    assert len(deck) == 52
    assert len({c.key() for c in deck}) == 52


def test_shoe_size_for_six_decks() -> None:
    shoe = Shoe(num_decks=6, rng=SeededRandom(1))
    assert shoe.initial_size == 312
    assert shoe.remaining == 312


def test_deal_reduces_shoe() -> None:
    shoe = Shoe(num_decks=1, rng=SeededRandom(42))
    before = shoe.remaining
    shoe.deal()
    assert shoe.remaining == before - 1


def test_reshuffle_at_cut_card() -> None:
    shoe = Shoe(num_decks=1, rng=SeededRandom(99))
    initial_shuffles = shoe.shuffle_count
    deals_to_cut = shoe.initial_size - shoe._cut_index
    for _ in range(deals_to_cut):
        shoe.deal()
    assert shoe.remaining == shoe._cut_index
    shoe.deal()
    assert shoe.shuffle_count == initial_shuffles + 1
    assert shoe.remaining == shoe.initial_size - 1


def test_fisher_yates_is_deterministic_with_seed() -> None:
    a = make_single_deck()
    b = make_single_deck()
    fisher_yates_shuffle(a, SeededRandom(7))
    fisher_yates_shuffle(b, SeededRandom(7))
    assert [c.key() for c in a] == [c.key() for c in b]


def test_composition_counts() -> None:
    shoe = Shoe(num_decks=2, rng=SeededRandom(3))
    comp = shoe.composition()
    assert sum(comp.values()) == 104
    assert comp[f"{Rank.ACE.value}{Suit.SPADES.value}"] == 2
