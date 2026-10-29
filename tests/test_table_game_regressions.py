"""Deterministic regressions for money movement and table-rule edge cases."""

import pytest

from blackjack.cards import Card, Rank, Shoe, Suit
from blackjack.config import GameConfig
from blackjack.hand import Hand
from blackjack.player import HumanPlayer, PlayerHandState, SimulatedPlayer
from blackjack.rules import Action, TableState, dealer_should_hit, legal_actions
from blackjack.table import Table
from mandalay_bay.craps import CrapsTable, DiceRoll
from poker.hand_eval import compare_scores, evaluate_five_uci
from poker.holdem import BettingAction, HoldemPlayer, HoldemTable, Street


def card(rank, suit=Suit.SPADES):
    return Card(Rank(rank), suit)


@pytest.mark.parametrize("low,high", [
    ([13, 13, 9, 7, 3], [1, 1, 9, 7, 3]),
    ([13, 12, 9, 7, 3], [1, 12, 9, 7, 3]),
    ([7, 7, 13, 9, 3], [7, 7, 1, 9, 3]),
    ([13, 13, 13, 9, 3], [1, 1, 1, 9, 3]),
    ([13, 13, 13, 13, 3], [1, 1, 1, 1, 3]),
])
def test_ace_ranks_high_in_poker_tiebreaks(low, high):
    suits = [1, 2, 3, 4, 1]
    assert compare_scores(evaluate_five_uci(suits, high), evaluate_five_uci(suits, low)) > 0


def test_multi_ace_soft_seventeen_is_hit():
    hand = Hand(cards=[card("A"), card("A"), card("5")])
    assert hand.value == 17 and hand.is_soft
    assert dealer_should_hit(hand, GameConfig(dealer_hits_soft_17=True))


def test_cut_card_waits_until_round_finishes():
    shoe = Shoe(1)
    shoe._cards = shoe._cards[:15]
    shoe.begin_round()
    shuffles = shoe.shuffle_count
    dealt = [shoe.deal() for _ in range(5)]
    assert len(set(dealt)) == 5
    assert shoe.shuffle_count == shuffles
    shoe.finish_round()
    shoe.begin_round()
    assert shoe.shuffle_count == shuffles + 1


class QuietDisplay:
    def __getattr__(self, name):
        return lambda *args, **kwargs: None


def human(bankroll=500, bet=100):
    return HumanPlayer("You", 1, bankroll, prompt_bet=lambda *_: bet,
                       prompt_insurance=lambda *_: True,
                       prompt_action=lambda *_: Action.STAND)


def test_insurance_is_offered_before_winning_dealer_peek():
    player = human()
    shoe = Shoe(1)
    shoe._cards = list(reversed([card("10"), card("A"), card("8"), card("K")]))
    shoe._cut_index = 0
    table = Table(GameConfig(), [player], shoe, QuietDisplay())
    outcome = table.play_round()
    assert player.round_state.insurance_bet == 50
    assert player.bankroll == 500
    assert outcome.human_net == 0


def test_insurance_cannot_overdraw_remaining_bankroll():
    player = human(bankroll=110)
    shoe = Shoe(1)
    shoe._cards = list(reversed([card("10"), card("A"), card("8"), card("8")]))
    shoe._cut_index = 0
    table = Table(GameConfig(), [player], shoe, QuietDisplay())
    table.play_round()
    assert player.round_state.insurance_bet == 10
    assert player.bankroll == 0


def test_both_split_hands_lose_natural_blackjack_status():
    player = human()
    hand = Hand(cards=[card("10"), card("K")], bet=10)
    player.round_state = PlayerHandState(hands=[hand])
    shoe = Shoe(1)
    shoe._cards = [card("A"), card("A")]
    shoe._cut_index = 0
    table = Table(GameConfig(), [player], shoe, QuietDisplay())
    table._apply_action(player, hand, Action.SPLIT, TableState(card("6")))
    assert all(h.value == 21 and not h.is_blackjack for h in player.round_state.hands)
    assert all(h.split_count == 1 for h in player.round_state.hands)


def test_split_limit_surrender_and_double_after_split_rules():
    hand = Hand(cards=[card("8"), card("8")], bet=10, split_count=1)
    state = TableState(card("6"), allow_double_after_split=False)
    actions = legal_actions(hand, state, GameConfig(), is_first_action=True,
                            player_bankroll=100, num_active_hands=4)
    assert actions == {Action.HIT, Action.STAND}


def showdown_table(contributions=(20, 100, 100)):
    players = [HoldemPlayer(str(i), i == 0, stack=0, total_in_hand=n, all_in=True)
               for i, n in enumerate(contributions)]
    players[0].hole = [card("A"), card("A", Suit.HEARTS)]
    players[1].hole = [card("K"), card("K", Suit.HEARTS)]
    players[2].hole = [card("Q"), card("Q", Suit.HEARTS)]
    table = HoldemTable(players, 5, 10)
    table.community = [card("2", Suit.CLUBS), card("4", Suit.DIAMONDS),
                       card("7", Suit.HEARTS), card("9", Suit.CLUBS), card("J", Suit.DIAMONDS)]
    table.pot = sum(contributions)
    return table


def test_short_all_in_winner_cannot_take_side_pot():
    table = showdown_table()
    table._showdown()
    assert [p.stack for p in table.players] == [60, 160, 0]
    assert set(table.winners) == {"0", "1"}
    assert table.pot == 0 and table.hand_over


def test_uncalled_excess_is_returned_to_its_contributor():
    table = showdown_table((20, 100, 150))
    table._showdown()
    assert [p.stack for p in table.players] == [60, 160, 50]
    assert sum(p.stack for p in table.players) == 270


def test_folded_contributions_remain_in_the_pot():
    table = showdown_table()
    table.players[1].folded = True
    table._showdown()
    assert [p.stack for p in table.players] == [60, 0, 160]


def test_all_in_blinds_automatically_run_out_board():
    table = HoldemTable([HoldemPlayer("You", True, stack=5),
                         HoldemPlayer("Bot", False, stack=10)], 5, 10)
    table.start_hand()
    assert table.hand_over and table.street == Street.SHOWDOWN
    assert len(table.community) == 5
    assert sum(p.stack for p in table.players) == 15


def test_out_of_turn_action_is_rejected_without_spending():
    table = HoldemTable.quick_table(500)
    table.start_hand()
    before = table.human.stack
    with pytest.raises(ValueError, match="turn"):
        table.apply_action(table.human, BettingAction.CALL)
    assert table.human.stack == before


def test_short_all_in_raise_requires_response_without_reopening():
    table = HoldemTable.quick_table(500, 2)
    table.start_hand()
    a, b, c = table.players
    for p in table.players:
        p.bet_this_street = p.total_in_hand = 100
        p.has_acted = True
        p.last_action_bet = 100
    b.has_acted = False
    b.last_action_bet = None
    b.stack = 50
    table.current_bet = table.min_raise = 100
    table.pot = 300
    table.action_index = 1
    table.apply_action(b, BettingAction.RAISE, 150)
    assert BettingAction.CALL in table.legal_actions(c)
    assert BettingAction.RAISE not in table.legal_actions(c)
    table.apply_action(c, BettingAction.CALL)
    assert not table.hand_over and table.street == Street.PREFLOP
    assert table.players[table.action_index] is a


def test_dont_pass_tracks_point_and_seven_out():
    table = CrapsTable()
    assert table.resolve_dont_pass(10, DiceRoll(2, 4), None).working
    assert table.point == 6
    result = table.resolve_dont_pass(10, DiceRoll(3, 4), table.point)
    assert result.payout == 20 and not result.working
    assert table.point is None


def test_dont_pass_loses_when_established_point_repeats():
    table = CrapsTable()
    table.resolve_dont_pass(10, DiceRoll(3, 5), None)
    result = table.resolve_dont_pass(10, DiceRoll(4, 4), table.point)
    assert result.payout == 0 and not result.working
    assert table.point is None


def test_cancelled_betting_restores_earlier_seat_bets():
    player = human(bet=0)
    player.seat = 2
    bot = SimulatedPlayer("Bot", 1, 500)
    table = Table(GameConfig(num_bots=1, human_seat=2), [bot, player], Shoe(1), QuietDisplay())
    assert table.play_round().round_over_early
    assert bot.bankroll == 500 and player.bankroll == 500
    assert not bot.round_state.hands


def test_cli_arguments_are_validated_after_overrides():
    from blackjack.main import apply_args, build_parser

    args = build_parser().parse_args(["--bots", "2", "--seat", "7"])
    with pytest.raises(ValueError, match="human_seat"):
        apply_args(GameConfig(), args)


def test_short_big_blind_still_requires_full_blind_from_active_players():
    table = HoldemTable([HoldemPlayer("You", True, stack=100),
                         HoldemPlayer("SB", False, stack=100),
                         HoldemPlayer("BB", False, stack=2)], 5, 10)
    table.start_hand()
    assert table.current_bet == 10
    table.apply_action(table.human, BettingAction.CALL)
    assert table.human.bet_this_street == 10


def test_fractional_raise_is_rejected_without_spending():
    table = HoldemTable.quick_table(500)
    table.start_hand()
    actor = table.players[table.action_index]
    before = actor.stack
    with pytest.raises(ValueError, match="integer"):
        table.apply_action(actor, BettingAction.RAISE, 100.5)
    assert actor.stack == before
