"""Ctrl+C must return unpersisted stakes before the main handler saves the wallet."""
from __future__ import annotations

from types import SimpleNamespace

import pytest

from mandalay_bay.chips import ChipWallet, TransactionKind
from mandalay_bay.session import PlayerSession


@pytest.mark.parametrize("error", [KeyboardInterrupt, EOFError])
@pytest.mark.parametrize("when,expected", [("action", 1000), ("results", 1010)])
def test_blackjack_interrupted_round_preserves_only_settled_result(monkeypatch, error, when, expected):
    from blackjack.cards import Card, Rank, Shoe, Suit
    from blackjack.config import GameConfig
    from blackjack.display import Display
    from blackjack.rules import Action
    from blackjack.runner import run_casino_blackjack

    shoe = Shoe(num_decks=1)
    cards = [Rank.TEN, Rank.NINE, Rank.TEN, Rank.SIX, Rank.KING]
    shoe._cards = [Card(rank, Suit.SPADES) for rank in reversed(cards)]
    shoe._cut_index = 0
    monkeypatch.setattr("blackjack.runner.Shoe", lambda **kwargs: shoe)
    monkeypatch.setattr(Display, "prompt_bet", lambda *args: 10)

    def prompt_action(*args):
        if when == "action":
            raise error()
        return Action.STAND

    def show_results(*args):
        if when == "results":
            raise error()

    monkeypatch.setattr(Display, "prompt_action", prompt_action)
    monkeypatch.setattr(Display, "show_round_results", show_results)
    wallet = ChipWallet(1000)
    with pytest.raises(error):
        run_casino_blackjack(GameConfig(num_decks=1, use_color=False), wallet)
    assert wallet.balance == expected


def test_blackjack_activity_records_settled_stats_after_interrupt(monkeypatch):
    import mandalay_bay.activities.blackjack as module

    session = PlayerSession()

    def interrupted_table(config, wallet, *, activity_id="blackjack", max_rounds=None, round_counter=None):
        # One settled hand reached the shared wallet inside the runner's own
        # finally; the result print then interrupted the session.
        if round_counter is not None:
            round_counter[0] += 1
        wallet.credit(10, activity_id, "Settled hand")
        raise KeyboardInterrupt

    monkeypatch.setattr(module, "pick_stake_tier", lambda *args, **kwargs: SimpleNamespace(description="test"))
    monkeypatch.setattr(module, "effective_table_stakes", lambda *args, **kwargs: (10, 1000))
    monkeypatch.setattr("blackjack.runner.run_casino_blackjack", interrupted_table)

    with pytest.raises(KeyboardInterrupt):
        module.BlackjackActivity().run(session, QuickHandUI())
    # The settled hand reached both the wallet and the stats ledger exactly once.
    assert session.wallet.balance == 1010
    stats = session.activity_stats["blackjack"]
    assert stats.net_winnings == 10 and stats.hands_or_bets == 1


class QuickHandUI:
    def banner(self, *_a, **_k): pass
    def dim(self, *_args, **_k): pass
    def error(self, message, **_k): assert False, message
    def success(self, *_a, **_k): pass
    def chip_line(self, *_a, **_k): pass
    def pause(self, *_a, **_k): pass
    def menu_choice(self, *_a, **_k): return 1


def test_blackjack_interrupt_before_any_hand_records_no_stats(monkeypatch):
    import mandalay_bay.activities.blackjack as module

    session = PlayerSession()

    def interrupted_at_bet(config, wallet, *, activity_id="blackjack", max_rounds=None, round_counter=None):
        raise KeyboardInterrupt

    monkeypatch.setattr(module, "pick_stake_tier", lambda *args, **kwargs: SimpleNamespace(description="test"))
    monkeypatch.setattr(module, "effective_table_stakes", lambda *args, **kwargs: (10, 1000))
    monkeypatch.setattr("blackjack.runner.run_casino_blackjack", interrupted_at_bet)

    with pytest.raises(KeyboardInterrupt):
        module.BlackjackActivity().run(session, QuickHandUI())
    # Visited, but no phantom hand: zero settled hands means zero stats rows.
    stats = session.activity_stats["blackjack"]
    assert stats.visits == 1 and stats.hands_or_bets == 0 and stats.net_winnings == 0

@pytest.mark.parametrize("error", [KeyboardInterrupt, EOFError])
@pytest.mark.parametrize("ranks,expected", [
    # Dealer draws out to a bust: the player's win must be banked before the reveal.
    (["TEN", "NINE", "TEN", "SIX", "KING"], 1010),
    # Dealer blackjack: the announced loss must be banked before the reveal.
    (["TEN", "ACE", "NINE", "KING"], 990),
])
def test_blackjack_interrupt_at_dealer_reveal_still_settles(monkeypatch, error, ranks, expected):
    """Ctrl+C when the dealer's final hand appears must not void a determined hand."""
    from blackjack.cards import Card, Rank, Shoe, Suit
    from blackjack.config import GameConfig
    from blackjack.display import Display
    from blackjack.rules import Action
    from blackjack.runner import run_casino_blackjack

    shoe = Shoe(num_decks=1)
    shoe._cards = [Card(Rank[rank], Suit.SPADES) for rank in reversed(ranks)]
    shoe._cut_index = 0
    monkeypatch.setattr("blackjack.runner.Shoe", lambda **kwargs: shoe)
    monkeypatch.setattr(Display, "prompt_bet", lambda *args: 10)
    monkeypatch.setattr(Display, "prompt_insurance", lambda *args: False)
    monkeypatch.setattr(Display, "prompt_action", lambda *args: Action.STAND)
    monkeypatch.setattr(Display, "prompt_continue", lambda *args: False)
    monkeypatch.setattr(Display, "show_round_results", lambda *args: None)

    def show_table(*args, **kwargs):
        if kwargs.get("reveal_dealer"):
            raise error()

    monkeypatch.setattr(Display, "show_table", show_table)
    wallet = ChipWallet(1000)
    with pytest.raises(error):
        run_casino_blackjack(GameConfig(num_decks=1, use_color=False), wallet)
    assert wallet.balance == expected


class InterruptUI:
    def __init__(self, choices, interrupt_prefix):
        self.choices = iter(choices)
        self.interrupt_prefix = interrupt_prefix
        self.interrupted = False

    def menu_choice(self, *args, **kwargs):
        return next(self.choices)

    def prompt_int(self, label, minimum, maximum, **kwargs):
        return minimum

    def _output(self, message="", *args, **kwargs):
        if not self.interrupted and str(message).lstrip().startswith(self.interrupt_prefix):
            self.interrupted = True
            raise KeyboardInterrupt

    def __getattr__(self, name):
        return self._output


def _set_stakes(monkeypatch, module):
    monkeypatch.setattr(module, "pick_stake_tier", lambda *args, **kwargs: SimpleNamespace(description="test"))
    monkeypatch.setattr(module, "effective_table_stakes", lambda *args, **kwargs: (10, 100))


@pytest.mark.parametrize("kind,choices,prefix", [
    ("sports", [1, 1, 1, 1], "Ticket placed:"),
    ("predictions", [2, 1, 1], "Contract placed:"),
])
def test_sportsbook_interrupt_refunds_open_stakes(monkeypatch, kind, choices, prefix):
    import mandalay_bay.activities.sportsbook as module
    _set_stakes(monkeypatch, module)
    activity = module.SportsbookActivity()
    session = PlayerSession()
    ui = InterruptUI(choices, prefix)
    with pytest.raises(KeyboardInterrupt):
        activity.run(session, ui)
    assert ui.interrupted
    assert session.wallet.balance == 1000
    assert session.wallet.transactions[-1].kind == TransactionKind.REFUND
    assert not activity._pending
    assert not activity._predictions.positions


def test_trading_interrupt_refunds_open_position(monkeypatch):
    import mandalay_bay.activities.trading_desk as module
    session = PlayerSession(wallet=ChipWallet(1_000_000))
    ui = InterruptUI([1, 1], "Opened ")
    with pytest.raises(KeyboardInterrupt):
        module.TradingDeskActivity().run(session, ui)
    assert ui.interrupted
    assert session.wallet.balance == 1_000_000
    assert session.wallet.transactions[-1].kind == TransactionKind.REFUND


@pytest.mark.parametrize("module_name,class_name", [
    ("horse_racing", "HorseRacingActivity"),
    ("equestrian", "DressageActivity"),
    ("equestrian", "JumperActivity"),
])
def test_racing_interrupt_refunds_open_ticket(monkeypatch, module_name, class_name):
    import importlib
    module = importlib.import_module(f"mandalay_bay.activities.{module_name}")
    _set_stakes(monkeypatch, module)
    session = PlayerSession()
    ui = InterruptUI([1, 1, 1], "Ticket placed:")
    with pytest.raises(KeyboardInterrupt):
        getattr(module, class_name)().run(session, ui)
    assert ui.interrupted
    assert session.wallet.balance == 1000
    assert session.wallet.transactions[-1].kind == TransactionKind.REFUND


@pytest.mark.parametrize("kind,choices", [
    ("sports", [1, 1, 1, 1, 3, 3]),
    ("predictions", [2, 1, 1, 5, 3]),
])
def test_sportsbook_interrupt_after_settlement_does_not_refund_paid_stake(monkeypatch, kind, choices):
    import mandalay_bay.activities.sportsbook as module
    _set_stakes(monkeypatch, module)
    activity = module.SportsbookActivity()
    if kind == "sports":
        activity._events = [dict(eventId="test", eventType="game", home="H", away="A", homeOdds=100,
                                 awayOdds=100, spread=0, spreadHomeOdds=100, spreadAwayOdds=100,
                                 total=40, totalOverOdds=100, totalUnderOdds=100, label="A at H", sport="test")]
        def simulate(catalog, event):
            event.update(settled=True, homeScore=10, awayScore=20)
        monkeypatch.setattr(module, "simulate_event_outcome", simulate)
    else:
        activity._predictions.markets = [dict(marketId="m", question="A certain thing?", yesPrice=50,
            noPrice=50, category="history", volume=100, fixedResolution="yes", resolution=None)]
    session = PlayerSession()
    ui = InterruptUI(choices, "WIN:")
    with pytest.raises(KeyboardInterrupt):
        activity.run(session, ui)
    assert ui.interrupted
    assert session.wallet.balance == 1010
    assert not any(tx.kind == TransactionKind.REFUND for tx in session.wallet.transactions)
    assert not activity._pending
    assert not activity._predictions.positions


def test_trading_interrupt_after_settlement_does_not_refund_paid_position(monkeypatch):
    import mandalay_bay.activities.trading_desk as module
    monkeypatch.setattr(module, "settle_position", lambda *args: {"payout": 125, "pnl": 100, "reason": "settled"})
    contract = dict(instrument="future", symbol="X", markPrice=10, ask=10, multiplier=1, expiry="soon", underlying="X", assetClass="nyse")
    monkeypatch.setattr(module, "load_catalog", lambda: {"contracts": [contract]})
    monkeypatch.setattr(module, "underlyings_from_catalog", lambda *args, **kwargs: [])
    session = PlayerSession()
    ui = InterruptUI([1, 1, 2], "X:")
    with pytest.raises(KeyboardInterrupt):
        module.TradingDeskActivity().run(session, ui)
    assert ui.interrupted
    assert session.wallet.balance == 1100
    assert not any(tx.kind == TransactionKind.REFUND for tx in session.wallet.transactions)


@pytest.mark.parametrize("module_name,class_name", [
    ("horse_racing", "HorseRacingActivity"),
    ("equestrian", "DressageActivity"),
    ("equestrian", "JumperActivity"),
])
def test_racing_interrupt_during_output_does_not_refund_simulated_results(monkeypatch, module_name, class_name):
    """The standings output is interruptible; the tickets before it are not."""
    import importlib
    module = importlib.import_module(f"mandalay_bay.activities.{module_name}")
    stat_id = {"HorseRacingActivity": "horse_racing", "DressageActivity": "dressage", "JumperActivity": "jumper"}[class_name]
    _set_stakes(monkeypatch, module)
    monkeypatch.setattr(module, "animate_countdown", lambda *args, **kwargs: None)
    session = PlayerSession()
    # Place two tickets and interrupt inside the finish-order output, after
    # the simulated race has settled every one of them.
    ui = InterruptUI([1, 1, 1, 1, 1, 1, 2], ("WIN #", "LOSE #"))
    with pytest.raises(KeyboardInterrupt):
        getattr(module, class_name)().run(session, ui)
    assert ui.interrupted
    refunds = [tx.amount for tx in session.wallet.transactions if tx.kind == TransactionKind.REFUND]
    assert refunds == []  # a simulated outcome must never refund as an unsettled stake
    payout = sum(tx.amount for tx in session.wallet.transactions if tx.kind == TransactionKind.WIN)
    assert session.wallet.balance == 980 + payout
    assert session.activity_stats[stat_id].hands_or_bets == 1


def test_trading_missing_underlying_quote_does_not_debit(monkeypatch):
    import mandalay_bay.activities.trading_desk as module
    contract = dict(instrument="call", symbol="X", markPrice=10, ask=10, multiplier=1, expiry="soon", underlying="X", assetClass="nyse")
    monkeypatch.setattr(module, "load_catalog", lambda: {"contracts": [contract]})
    monkeypatch.setattr(module, "underlyings_from_catalog", lambda *args, **kwargs: [])
    session = PlayerSession()
    with pytest.raises(ValueError, match="No underlying quote"):
        module.TradingDeskActivity().run(session, InterruptUI([1, 1], "unused"))
    assert session.wallet.balance == 1000
    assert not session.wallet.transactions


def test_holdem_interrupt_returns_table_stack(monkeypatch):
    """Ctrl+C mid-session must cash out the chips still on the Hold'em table."""
    import mandalay_bay.activities.holdem as module

    class HoldemUI(InterruptUI):
        def prompt_int(self, label, minimum, maximum, **kwargs):
            return min(100, max(minimum, 10))

    _set_stakes(monkeypatch, module)
    session = PlayerSession()
    ui = HoldemUI([], "No-limit Hold'em")
    with pytest.raises(KeyboardInterrupt):
        module.HoldemActivity().run(session, ui)
    assert ui.interrupted
    assert session.wallet.balance == 1000
    assert session.wallet.transactions[-1].description == "Hold'em interrupted — table stack returned"


def test_holdem_interrupt_returns_unresolved_blind(monkeypatch):
    import mandalay_bay.activities.holdem as module

    _set_stakes(monkeypatch, module)
    original = module.HoldemTable.quick_table

    def table_with_human_big_blind(*args, **kwargs):
        table = original(*args, **kwargs)
        table.dealer_index = 3
        return table

    monkeypatch.setattr(module.HoldemTable, "quick_table", table_with_human_big_blind)
    session = PlayerSession()
    ui = InterruptUI([], "Street:")
    ui.prompt_int = lambda *args, **kwargs: 100
    with pytest.raises(KeyboardInterrupt):
        module.HoldemActivity().run(session, ui)
    assert ui.interrupted
    assert session.wallet.balance == 1000
    assert session.activity_stats["holdem"].net_winnings == 0


def test_holdem_table_creation_failure_does_not_debit(monkeypatch):
    import mandalay_bay.activities.holdem as module

    _set_stakes(monkeypatch, module)
    monkeypatch.setattr(module.HoldemTable, "quick_table", lambda *args, **kwargs: (_ for _ in ()).throw(ValueError("shoe")))
    session = PlayerSession()
    ui = InterruptUI([], "never")
    ui.prompt_int = lambda *args, **kwargs: 100
    with pytest.raises(ValueError, match="shoe"):
        module.HoldemActivity().run(session, ui)
    assert session.wallet.balance == 1000
    assert not session.wallet.transactions


class CrapsInterruptUI(InterruptUI):
    """Places craps wagers, then Ctrl+C while later wagers are pending."""

    def __init__(self, *, place_side=False, interrupt_side_prompt=None, interrupt_hardway_prompt=None):
        super().__init__([1], "never-matches")
        self.place_side = place_side
        self.side_prompts = 0
        self.hardway_prompts = 0
        self.interrupt_side_prompt = interrupt_side_prompt
        self.interrupt_hardway_prompt = interrupt_hardway_prompt

    def menu_choice(self, *args, **kwargs):
        return 1  # Pass Line

    def prompt_int(self, label, minimum, maximum, **kwargs):
        if "Pass Line amount" in label:
            return 10
        if label.startswith("Field") or "Hard 4" in label:
            return 10
        return 0

    def prompt_yes_no(self, prompt, default=True):
        if "one-roll side bets" in prompt:
            self.side_prompts += 1
            if self.side_prompts == self.interrupt_side_prompt:
                raise KeyboardInterrupt
            return self.place_side
        if "hardways" in prompt:
            self.hardway_prompts += 1
            if self.hardway_prompts == self.interrupt_hardway_prompt:
                raise KeyboardInterrupt
            return True
        return default


def _craps_activity(monkeypatch):
    import mandalay_bay.activities.craps as module
    from mandalay_bay.craps import DiceRoll

    _set_stakes(monkeypatch, module)
    # Come-out 6: the Pass Line point stays working and Hard 4 does not resolve.
    monkeypatch.setattr(module.CrapsTable, "roll", lambda self: DiceRoll(3, 3))
    monkeypatch.setattr(module, "animate_dice_roll", lambda *args, **kwargs: None)
    return module


def test_craps_interrupt_returns_working_line_and_hardways(monkeypatch):
    module = _craps_activity(monkeypatch)
    session = PlayerSession()
    ui = CrapsInterruptUI(interrupt_side_prompt=2)
    with pytest.raises(KeyboardInterrupt):
        module.CrapsActivity().run(session, ui)
    assert session.wallet.balance == 1000
    descriptions = [tx.description for tx in session.wallet.transactions]
    assert "Craps leave — line returned" in descriptions
    assert "Craps leave — hard_4 returned" in descriptions


def test_craps_interrupt_returns_unrolled_side_stakes(monkeypatch):
    module = _craps_activity(monkeypatch)
    session = PlayerSession()
    ui = CrapsInterruptUI(place_side=True, interrupt_hardway_prompt=1)
    with pytest.raises(KeyboardInterrupt):
        module.CrapsActivity().run(session, ui)
    assert session.wallet.balance == 1000
    descriptions = [tx.description for tx in session.wallet.transactions]
    assert "Craps leave — line returned" in descriptions
    assert "Craps leave — field returned" in descriptions


def test_craps_interrupt_during_output_records_settled_stats(monkeypatch):
    module = _craps_activity(monkeypatch)
    from mandalay_bay.craps import DiceRoll

    # (2,2): the Pass Line point stays working while Hard 4 has already paid,
    # then the animation output interrupts the run.
    monkeypatch.setattr(module.CrapsTable, "roll", lambda self: DiceRoll(2, 2))

    def dice_clatter(*args, **kwargs):
        raise KeyboardInterrupt

    monkeypatch.setattr(module, "animate_dice_roll", dice_clatter)
    session = PlayerSession()
    ui = CrapsInterruptUI(place_side=True)
    with pytest.raises(KeyboardInterrupt):
        module.CrapsActivity().run(session, ui)
    # The settled roll reaches activity stats even though the run was cut off.
    assert session.activity_stats["craps"].hands_or_bets == 1
    assert any("hard_4" in tx.description for tx in session.wallet.transactions)


def test_craps_leave_returns_working_hardways_without_interrupt(monkeypatch):
    module = _craps_activity(monkeypatch)
    session = PlayerSession()

    class LeaveUI(CrapsInterruptUI):
        def __init__(self):
            super().__init__()
            self._choices = 0

        def menu_choice(self, *args, **kwargs):
            self._choices += 1
            return 1 if self._choices == 1 else 4  # Pass Line, then leave

    module.CrapsActivity().run(session, LeaveUI())
    # 10 won on the Pass Line point plus the 10 back from the working hardway.
    assert session.wallet.balance == 1010
    descriptions = [tx.description for tx in session.wallet.transactions]
    assert "Craps leave — hard_4 returned" in descriptions
    assert session.activity_stats["craps"].hands_or_bets == 2


def test_craps_interrupt_during_animation_settles_all_rolled_bets(monkeypatch):
    module = _craps_activity(monkeypatch)
    from mandalay_bay.craps import DiceRoll

    monkeypatch.setattr(module.CrapsTable, "roll", lambda self: DiceRoll(3, 4))
    monkeypatch.setattr(module, "animate_dice_roll", lambda *args: (_ for _ in ()).throw(KeyboardInterrupt))
    session = PlayerSession()
    with pytest.raises(KeyboardInterrupt):
        module.CrapsActivity().run(session, CrapsInterruptUI(place_side=True))
    # Pass line wins, Field and Hard 4 lose on seven; none remain working.
    assert session.wallet.balance == 990
    assert not any("returned" in tx.description for tx in session.wallet.transactions)


def test_roulette_interrupt_during_animation_keeps_resolved_win(monkeypatch):
    """Ctrl+C during the wheel animation must not void a determined payout."""
    import mandalay_bay.activities.roulette as module

    class RouletteUI(InterruptUI):
        def menu_choice(self, *args, **kwargs):
            return 2  # Red (1:1)

        def prompt_int(self, label, minimum, maximum, **kwargs):
            return 10

    _set_stakes(monkeypatch, module)
    monkeypatch.setattr(module, "spin_wheel", lambda: 7)
    monkeypatch.setattr(module, "animate_countdown", lambda *args, **kwargs: (_ for _ in ()).throw(KeyboardInterrupt))
    session = PlayerSession()
    with pytest.raises(KeyboardInterrupt):
        module.RouletteActivity().run(session, RouletteUI([], "never"))
    assert session.wallet.balance == 1010


def test_lottery_interrupt_during_draw_keeps_resolved_win(monkeypatch):
    """Ctrl+C while drawing balls must not void a winning ticket."""
    import mandalay_bay.activities.lottery as module
    from mandalay_bay.lottery import TicketResult

    class LotteryUI(InterruptUI):
        def menu_choice(self, *args, **kwargs):
            return 1  # Pick 3, then Quick Pick

    monkeypatch.setattr(
        module,
        "pick_stake_tier",
        lambda *args, **kwargs: SimpleNamespace(id="standard", name="Standard", description="test"),
    )
    monkeypatch.setattr(
        module,
        "resolve_pick3",
        lambda picks, price, ticket_id="pick3": TicketResult(
            "pick3", "Strip Pick 3", price, list(picks), [1, 2, 3], 1000, "Straight hit",
        ),
    )
    monkeypatch.setattr(module, "spin_pause", lambda *args, **kwargs: (_ for _ in ()).throw(KeyboardInterrupt))
    session = PlayerSession()
    with pytest.raises(KeyboardInterrupt):
        module.LotteryActivity().run(session, LotteryUI([], "never"))
    # Standard tier prices the $2 Pick 3 at $4; the winning credit is 1000.
    assert session.wallet.balance == 1996


def test_sportsbook_interrupt_at_settled_score_does_not_refund_losing_ticket(monkeypatch):
    """Ctrl+C on a final-score line must not return a determined losing stake."""
    import mandalay_bay.activities.sportsbook as module

    _set_stakes(monkeypatch, module)
    activity = module.SportsbookActivity()
    activity._events = [dict(eventId="test", eventType="game", home="H", away="A", homeOdds=100,
                             awayOdds=100, spread=0, spreadHomeOdds=100, spreadAwayOdds=100,
                             total=40, totalOverOdds=100, totalUnderOdds=100, label="A at H", sport="test")]

    def simulate(catalog, event):
        event.update(settled=True, homeScore=3, awayScore=10)

    monkeypatch.setattr(module, "simulate_event_outcome", simulate)
    session = PlayerSession()
    # Board -> place wager -> moneyline -> home (loses) -> back -> settle all.
    ui = InterruptUI([1, 1, 1, 2, 3, 3], "A at H:")
    with pytest.raises(KeyboardInterrupt):
        activity.run(session, ui)
    assert ui.interrupted
    assert session.wallet.balance == 990
    assert not any(tx.kind == TransactionKind.REFUND for tx in session.wallet.transactions)
    assert not activity._pending


def test_sportsbook_interrupt_at_prediction_reveal_does_not_refund_losing_contract(monkeypatch):
    """Ctrl+C on a resolved market line must not return a determined losing stake."""
    import mandalay_bay.activities.sportsbook as module

    _set_stakes(monkeypatch, module)
    activity = module.SportsbookActivity()
    activity._predictions.markets = [
        dict(marketId="win", question="Win market?", yesPrice=50, noPrice=50, category="history",
             volume=1, fixedResolution="yes", resolution=None),
        dict(marketId="lose", question="Lose market?", yesPrice=50, noPrice=50, category="history",
             volume=1, fixedResolution="yes", resolution=None),
    ]

    class PredictionUI(InterruptUI):
        def __init__(self):
            super().__init__([2, 1, 1, 1, 2, 5, 3], "Lose market?")
            self._markets = iter([1, 2])

        def prompt_int(self, label, minimum, maximum, **kwargs):
            if label.startswith("Market number"):
                return next(self._markets)
            return minimum

    session = PlayerSession()
    ui = PredictionUI()
    with pytest.raises(KeyboardInterrupt):
        activity.run(session, ui)
    assert ui.interrupted
    # YES on the win market pays 20; the NO contract on the lose market forfeits 10.
    assert session.wallet.balance == 1000
    assert not any(tx.kind == TransactionKind.REFUND for tx in session.wallet.transactions)
    assert not activity._predictions.positions
