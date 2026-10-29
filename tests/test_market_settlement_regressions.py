from types import SimpleNamespace

import pytest

from mandalay_bay.activities.sportsbook import BetSlip, SportsbookActivity
from mandalay_bay.lottery import parse_pick_input, validate_mega_picks
from mandalay_bay.prediction_markets import PredictionMarketsState, resolve_market
from mandalay_bay.session import PlayerSession
from mandalay_bay.trading_desk import entry_cost_chips, settle_position, underlying_spot


def test_parlay_drops_pushed_leg_from_odds():
    event = {"home": "H", "away": "A", "homeScore": 10, "awayScore": 7, "total": 17}
    legs = [BetSlip(event, "total", "over", 0, 100), BetSlip(event, "moneyline", "H", 0, 150)]
    slip = BetSlip(event, "parlay", "2-leg", 100, 400, legs=legs)
    assert SportsbookActivity()._resolve_slip(slip)[:2] == (True, 250)


def test_all_pushed_parlay_returns_only_stake():
    event = {"homeScore": 10, "awayScore": 7, "total": 17}
    legs = [BetSlip(event, "total", side, 0, 100) for side in ("over", "under")]
    slip = BetSlip(event, "parlay", "2-leg", 100, 300, legs=legs)
    assert SportsbookActivity()._resolve_slip(slip)[:2] == (True, 100)


def test_prediction_slate_keeps_held_markets_and_advances():
    state = PredictionMarketsState()
    state.sync_markets([])
    market = state.markets[0]
    position = {"marketId": market["marketId"], "side": "yes", "amount": 100, "priceCents": 50}
    state.positions.append(position)
    cursor = state.scenario_cursor
    state.next_slate([])
    assert state.scenario_cursor != cursor
    assert market in state.markets
    results, count = state.settle_all([])
    assert count == len(results) == 1
    assert not state.positions


def test_missing_prediction_market_refunds_instead_of_losing_stake():
    state = PredictionMarketsState(positions=[{"marketId": "old", "side": "yes", "amount": 75, "priceCents": 50}])
    results, count = state.settle_all()
    assert count == 1
    assert results[0]["payout"] == 75
    assert results[0]["resolution"] == "push"


def test_sports_prediction_uses_retained_event_and_pushes_spread_ties():
    market = {"question": "H -3 covers tonight?", "yesPrice": 50, "linkedEventId": "old",
              "linkedEvent": {"settled": True, "homeScore": 20, "awayScore": 17, "spread": -3}}
    assert resolve_market(market, []) == "push"
    market["linkedEvent"]["homeScore"] = 21
    assert resolve_market(market, []) == "yes"


def test_missing_linked_event_is_voided_instead_of_randomized():
    assert resolve_market({"question": "Total goes over?", "yesPrice": 95, "linkedEventId": "gone"}) == "push"


class QuietUI:
    def __getattr__(self, name):
        return lambda *args, **kwargs: None


def test_prediction_only_settlement_simulates_linked_game(monkeypatch):
    activity = SportsbookActivity()
    event = {"eventId": "game", "settled": False, "spread": 0, "home": "H", "away": "A"}
    activity._events = [event]
    activity._predictions.markets = [{"marketId": "m", "linkedEventId": "game", "linkedEvent": event,
                                      "question": "H covers tonight?", "yesPrice": 50}]
    activity._predictions.positions = [{"marketId": "m", "question": "H covers tonight?", "side": "yes",
                                        "amount": 100, "priceCents": 50}]
    def simulate(catalog, game):
        game.update(settled=True, homeScore=20, awayScore=10)
    monkeypatch.setattr("mandalay_bay.activities.sportsbook.simulate_event_outcome", simulate)
    session = PlayerSession()
    session.wallet.debit(100, "sportsbook", "test")
    net, count = activity._settle_all(session, QuietUI())
    assert (net, count) == (100, 1)
    assert session.wallet.balance == 1100
    assert event["settled"]


def test_closed_sportsbook_wager_does_not_debit():
    activity = SportsbookActivity()
    activity._events = [{"settled": True}]
    session = PlayerSession()
    ui = QuietUI()
    ui.prompt_int = lambda *args, **kwargs: 1
    assert not activity._place_wager(session, ui, 10, 100)
    assert session.wallet.balance == 1000


def test_option_underlying_quote_is_not_option_premium():
    option = {"instrument": "call", "symbol": "X", "expiry": "later", "markPrice": 5}
    catalog = {"contracts": [
        {"instrument": "future", "symbol": "X", "expiry": "now", "markPrice": 100},
        {"instrument": "future", "symbol": "X", "expiry": "later", "markPrice": 120}, option]}
    assert underlying_spot(option, catalog) == 120


def test_futures_report_actual_loss_after_margin_exhausted():
    position = {"contract": {"instrument": "future", "symbol": "X", "multiplier": 100},
                "qty": 1, "entryPrice": 100, "cost": 1000}
    result = settle_position(position, 0)
    assert result["payout"] == 0
    assert result["pnl"] == -1000


@pytest.mark.parametrize("quantity", [0, -1, 1.5, True])
def test_invalid_trade_quantities_are_rejected(quantity):
    with pytest.raises(ValueError):
        entry_cost_chips({"instrument": "call", "ask": 5}, quantity)


def test_lottery_rejects_fractional_and_nonfinite_numbers():
    assert validate_mega_picks([1, 2, 3, 4, 5.5], 1)
    assert validate_mega_picks([1, 2, 3, 4, 5], float("nan"))
    assert parse_pick_input("²12", 3) is None


@pytest.mark.parametrize("module_name,generator", [
    ("horse_racing", "_generate_race"), ("equestrian", "_generate_dressage"), ("equestrian", "_generate_jumper")])
def test_racing_cannot_change_field_with_open_tickets(monkeypatch, module_name, generator):
    import importlib
    module = importlib.import_module(f"mandalay_bay.activities.{module_name}")
    cls = {"_generate_race": module.HorseRacingActivity if module_name == "horse_racing" else None,
           "_generate_dressage": getattr(module, "DressageActivity", None),
           "_generate_jumper": getattr(module, "JumperActivity", None)}[generator]
    original = getattr(module, generator)
    calls = []
    def generate():
        calls.append(True)
        return original()
    monkeypatch.setattr(module, generator, generate)
    monkeypatch.setattr(module, "pick_stake_tier", lambda *args, **kwargs: SimpleNamespace(description="test"))
    monkeypatch.setattr(module, "effective_table_stakes", lambda *args, **kwargs: (5, 100))
    choices = iter([1, 1, 1, 3, 0])  # Wager, runner, win, change field, leave.
    ui = QuietUI()
    ui.menu_choice = lambda *args, **kwargs: next(choices)
    ui.prompt_int = lambda *args, **kwargs: 5
    session = PlayerSession()
    cls().run(session, ui)
    assert len(calls) == 1
    assert session.wallet.balance == 1000  # Unsettled stake returned on leave.
