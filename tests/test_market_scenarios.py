"""Stored sports / prediction / trading scenario catalogs."""

from mandalay_bay.activities.sportsbook import BetSlip, SportsbookActivity, combine_american_odds
from mandalay_bay.prediction_markets import (
    PredictionMarketsState,
    load_prediction_scenarios,
    page_from_scenarios,
)
from mandalay_bay.sport_simulator import (
    board_from_scenarios,
    load_sports_scenarios,
    simulate_event_outcome,
    load_catalog,
)
from mandalay_bay.trading_desk import entry_cost_chips, load_catalog as load_trading_catalog, settle_position


def test_sports_scenario_db_size() -> None:
    db = load_sports_scenarios()
    assert len(db.get("scenarios") or []) >= 125


def test_prediction_scenario_db_size() -> None:
    db = load_prediction_scenarios()
    assert len(db.get("scenarios") or []) >= 125


def test_trading_catalog_size() -> None:
    catalog = load_trading_catalog()
    assert len(catalog.get("contracts") or []) >= 125


def test_sports_board_cycles_and_wraps() -> None:
    db = load_sports_scenarios()
    n = len(db["scenarios"])
    board_size = db.get("boardSize") or 10
    events, cursor = board_from_scenarios(db, 0, board_size)
    assert len(events) == board_size
    assert cursor == board_size % n
    # Advance near end and wrap
    events2, cursor2 = board_from_scenarios(db, n - 2, board_size)
    assert len(events2) == board_size
    assert cursor2 == (n - 2 + board_size) % n


def test_prediction_page_cycles() -> None:
    db = load_prediction_scenarios()
    markets, cursor = page_from_scenarios(db, 0, 10, [])
    assert markets
    assert cursor > 0
    state = PredictionMarketsState()
    state.sync_markets([])
    assert state.markets
    before = state.scenario_cursor
    state.next_slate([])
    assert state.scenario_cursor != before or len(db["scenarios"]) <= (db.get("pageSize") or 20)


def test_combine_american_odds_two_favorites() -> None:
    # Two -110 favorites multiply in decimal space → underdog-ish +264-ish
    combined = combine_american_odds([-110, -110])
    assert combined > 200
    assert combine_american_odds([150, 200]) > 400


def test_parlay_settlement_all_legs_win() -> None:
    activity = SportsbookActivity()
    e1 = {
        "eventId": "a",
        "home": "H1",
        "away": "A1",
        "homeScore": 21,
        "awayScore": 14,
        "label": "A1 @ H1",
    }
    e2 = {
        "eventId": "b",
        "home": "H2",
        "away": "A2",
        "homeScore": 10,
        "awayScore": 3,
        "total": 20.5,
        "label": "A2 @ H2",
    }
    legs = [
        BetSlip(event=e1, bet_type="moneyline", pick="H1", amount=0, odds=-110),
        BetSlip(event=e2, bet_type="total", pick="under", amount=0, odds=-110),
    ]
    odds = combine_american_odds([leg.odds for leg in legs])
    slip = BetSlip(
        event=e1, bet_type="parlay", pick="2-leg", amount=100, odds=odds, legs=legs,
    )
    won, payout, reason = activity._resolve_slip(slip)
    assert won is True
    assert payout > 100
    assert "Parlay" in reason


def test_futures_simulation_sets_winner() -> None:
    catalog = load_catalog()
    db = load_sports_scenarios()
    futures = next(s for s in db["scenarios"] if s.get("eventType") == "futures")
    from mandalay_bay.sport_simulator import event_from_scenario

    event = event_from_scenario(futures)
    simulate_event_outcome(catalog, event)
    assert event.get("settled") is True
    assert event.get("winner") in (event.get("field") or [event["home"], event["away"]])


def test_call_option_payoff_in_the_money() -> None:
    contract = {
        "instrument": "call",
        "symbol": "TEST",
        "strike": 100,
        "multiplier": 1,
        "markPrice": 5,
    }
    position = {"contract": contract, "qty": 2, "entryPrice": 5.0, "cost": 10}
    result = settle_position(position, exit_spot=120.0)
    assert result["payout"] == 40  # intrinsic 20 * 2
    assert result["pnl"] == 30


def test_put_option_expires_worthless() -> None:
    contract = {
        "instrument": "put",
        "symbol": "TEST",
        "strike": 100,
        "multiplier": 1,
        "markPrice": 5,
    }
    position = {"contract": contract, "qty": 1, "entryPrice": 5.0, "cost": 5}
    result = settle_position(position, exit_spot=120.0)
    assert result["payout"] == 0
    assert result["pnl"] == -5


def test_future_entry_cost_uses_margin() -> None:
    contract = {
        "instrument": "future",
        "symbol": "ES",
        "markPrice": 5000,
        "ask": 5000,
        "multiplier": 1,
    }
    cost = entry_cost_chips(contract, 1)
    assert cost == max(25, int(5000 * 0.1))


def test_sportsbook_loads_from_scenario_db() -> None:
    activity = SportsbookActivity()
    assert len(activity._events) >= 1
    assert any(e.get("scenarioId") or e.get("eventId") for e in activity._events)
