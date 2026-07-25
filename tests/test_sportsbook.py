from mandalay_bay.activities.sportsbook import BetSlip, SportsbookActivity
from mandalay_bay.sport_simulator import generate_event, load_catalog


def test_american_odds_profit_positive() -> None:
    assert SportsbookActivity._profit(100, 150) == 150


def test_american_odds_profit_negative() -> None:
    assert SportsbookActivity._profit(110, -110) == 100


def test_prop_resolution() -> None:
    activity = SportsbookActivity()
    from mandalay_bay.activities.sportsbook import BetSlip

    event = {
        "home": "A",
        "away": "B",
        "homeScore": 2,
        "awayScore": 1,
        "propOutcomes": {"both-score": True},
    }
    slip = BetSlip(
        event=event,
        bet_type="prop",
        pick="yes",
        amount=50,
        odds=-110,
        prop_id="both-score",
        prop_label="Both teams score",
    )
    won, payout, reason = activity._resolve_slip(slip)
    assert won is True
    assert payout > 50
    assert "Both teams score" in reason


def test_spread_push_returns_stake() -> None:
    activity = SportsbookActivity()
    catalog = load_catalog()
    event = generate_event(catalog, "NFL")
    event["homeScore"] = 20
    event["awayScore"] = 17
    event["spread"] = -3.0
    slip = BetSlip(
        event=event,
        bet_type="spread",
        pick=event["home"],
        amount=100,
        odds=-110,
    )
    won, payout, reason = activity._resolve_slip(slip)
    assert won is True
    assert payout == 100
    assert "Push" in reason
