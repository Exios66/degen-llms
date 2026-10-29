"""Ctrl+C must return unpersisted stakes before the main handler saves the wallet."""
from __future__ import annotations

from types import SimpleNamespace

import pytest

from mandalay_bay.chips import ChipWallet, TransactionKind
from mandalay_bay.session import PlayerSession


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
def test_racing_interrupt_during_settlement_refunds_only_remaining_ticket(monkeypatch, module_name, class_name):
    import importlib
    module = importlib.import_module(f"mandalay_bay.activities.{module_name}")
    _set_stakes(monkeypatch, module)
    monkeypatch.setattr(module, "animate_countdown", lambda *args, **kwargs: None)
    session = PlayerSession()
    # Place two tickets, then interrupt after the first payout/loss is committed.
    ui = InterruptUI([1, 1, 1, 1, 1, 1, 2], ("WIN #", "LOSE #"))
    with pytest.raises(KeyboardInterrupt):
        getattr(module, class_name)().run(session, ui)
    assert ui.interrupted
    refunds = [tx.amount for tx in session.wallet.transactions if tx.kind == TransactionKind.REFUND]
    assert refunds == [10]
    payout = sum(tx.amount for tx in session.wallet.transactions if tx.kind == TransactionKind.WIN)
    assert session.wallet.balance == 990 + payout


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
