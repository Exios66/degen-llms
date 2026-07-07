"""Sportsbook engine — totals, outrights, and prediction integration."""

from mandalay_bay.activities.sportsbook import BetSlip, SportsbookActivity
from mandalay_bay.prediction_markets import PredictionMarketsState, resolve_position


def test_total_over_hits() -> None:
    activity = SportsbookActivity()
    event = {
        "home": "A",
        "away": "B",
        "homeScore": 28,
        "awayScore": 24,
        "total": 48.5,
    }
    slip = BetSlip(event=event, bet_type="total", pick="over", amount=50, odds=-110)
    won, payout, reason = activity._resolve_slip(slip)
    assert won is True
    assert payout > 50
    assert "Over" in reason


def test_outright_winner_pays() -> None:
    activity = SportsbookActivity()
    event = {
        "home": "Team A",
        "away": "Team B",
        "winner": "Team A",
        "outrightOdds": {"Team A": 350, "Team B": 600},
    }
    slip = BetSlip(event=event, bet_type="outright", pick="Team A", amount=100, odds=350)
    won, payout, reason = activity._resolve_slip(slip)
    assert won is True
    assert payout > 100


def test_sportsbook_predictions_sync_with_events() -> None:
    activity = SportsbookActivity()
    preds = PredictionMarketsState()
    preds.sync_markets(activity._events)
    assert preds.markets
    position = {
        "side": "yes",
        "amount": 50,
        "priceCents": 40,
    }
    result = resolve_position(position, "yes")
    assert result["won"] is True
