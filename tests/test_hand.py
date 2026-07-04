from blackjack.cards import Card, Rank, Suit
from blackjack.hand import Hand


def c(rank: Rank, suit: Suit = Suit.SPADES) -> Card:
    return Card(rank, suit)


def test_hard_total() -> None:
    hand = Hand(cards=[c(Rank.TEN), c(Rank.SEVEN)])
    assert hand.value == 17
    assert not hand.is_soft


def test_soft_ace() -> None:
    hand = Hand(cards=[c(Rank.ACE), c(Rank.SIX)])
    assert hand.value == 17
    assert hand.is_soft


def test_ace_adjusts_on_bust() -> None:
    hand = Hand(cards=[c(Rank.ACE), c(Rank.NINE), c(Rank.FIVE)])
    assert hand.value == 15


def test_blackjack() -> None:
    hand = Hand(cards=[c(Rank.ACE), c(Rank.KING)])
    assert hand.is_blackjack
    assert hand.value == 21


def test_split_blackjack_not_natural() -> None:
    hand = Hand(cards=[c(Rank.ACE), c(Rank.KING)], split_count=1)
    assert hand.value == 21
    assert not hand.is_blackjack


def test_bust() -> None:
    hand = Hand(cards=[c(Rank.KING), c(Rank.NINE), c(Rank.FIVE)])
    assert hand.is_bust


def test_pair_detection() -> None:
    hand = Hand(cards=[c(Rank.EIGHT), c(Rank.EIGHT, Suit.HEARTS)])
    assert hand.is_pair


def test_ten_pair() -> None:
    hand = Hand(cards=[c(Rank.KING), c(Rank.QUEEN)])
    assert hand.is_pair
