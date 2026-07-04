from blackjack.bankroll import settle_hand, settle_insurance
from blackjack.cards import Card, Rank, Suit
from blackjack.config import GameConfig
from blackjack.hand import Hand
from blackjack.rules import Action, TableState, dealer_should_hit, dealer_should_peek, legal_actions


def c(rank: Rank, suit: Suit = Suit.SPADES) -> Card:
    return Card(rank, suit)


def test_dealer_peeks_on_ace_and_ten() -> None:
    assert dealer_should_peek(c(Rank.ACE))
    assert dealer_should_peek(c(Rank.KING))
    assert not dealer_should_peek(c(Rank.SEVEN))


def test_dealer_hits_soft_17_h17() -> None:
    config = GameConfig(dealer_hits_soft_17=True)
    hand = Hand(cards=[c(Rank.ACE), c(Rank.SIX)])
    assert dealer_should_hit(hand, config)


def test_dealer_stands_soft_17_s17() -> None:
    config = GameConfig(dealer_hits_soft_17=False)
    hand = Hand(cards=[c(Rank.ACE), c(Rank.SIX)])
    assert not dealer_should_hit(hand, config)


def test_legal_double_and_split() -> None:
    hand = Hand(cards=[c(Rank.EIGHT), c(Rank.EIGHT, Suit.HEARTS)], bet=10)
    state = TableState(dealer_up_card=c(Rank.SIX))
    actions = legal_actions(
        hand, state, GameConfig(), is_first_action=True, player_bankroll=100, num_active_hands=1
    )
    assert Action.DOUBLE in actions
    assert Action.SPLIT in actions
    assert Action.SURRENDER in actions


def test_split_aces_only_stand() -> None:
    hand = Hand(cards=[c(Rank.ACE), c(Rank.TEN)], bet=10, is_from_split_aces=True)
    state = TableState(dealer_up_card=c(Rank.SIX))
    actions = legal_actions(
        hand, state, GameConfig(), is_first_action=False, player_bankroll=100, num_active_hands=2
    )
    assert actions == {Action.STAND}


def test_settle_blackjack_pays_3_to_2() -> None:
    player = Hand(cards=[c(Rank.ACE), c(Rank.KING)], bet=100)
    dealer = Hand(cards=[c(Rank.NINE), c(Rank.SEVEN)])
    result = settle_hand(player, dealer, dealer_has_blackjack=False)
    assert result.net_change == 150
    assert result.description == "BLACKJACK"


def test_settle_surrender() -> None:
    player = Hand(cards=[c(Rank.TEN), c(Rank.SIX)], bet=100, is_surrendered=True)
    dealer = Hand(cards=[c(Rank.ACE), c(Rank.KING)])
    result = settle_hand(player, dealer, dealer_has_blackjack=True)
    assert result.net_change == -50


def test_insurance_win() -> None:
    assert settle_insurance(50, True) == 100


def test_insurance_loss() -> None:
    assert settle_insurance(50, False) == -50
