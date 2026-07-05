from mandalay_bay.prediction_markets import prediction_payout, resolve_position
from mandalay_bay.sport_simulator import generate_board, load_catalog, simulate_event_outcome


def test_nba_scores_differ_from_nfl_ranges() -> None:
    catalog = load_catalog()
    from mandalay_bay.sport_simulator import generate_event

    nfl = generate_event(catalog, "NFL")
    nba = generate_event(catalog, "NBA")
    simulate_event_outcome(catalog, nfl)
    simulate_event_outcome(catalog, nba)
    assert nfl["homeScore"] <= 45
    assert nba["homeScore"] >= 85


def test_total_resolution_from_shared_score() -> None:
    from mandalay_bay.activities.sportsbook import BetSlip, SportsbookActivity
    from mandalay_bay.sport_simulator import generate_event

    catalog = load_catalog()
    event = generate_event(catalog, "NBA")
    event["homeScore"] = 110
    event["awayScore"] = 108
    event["total"] = 215.0
    activity = SportsbookActivity()
    slip = BetSlip(event=event, bet_type="total", pick="over", amount=100, odds=-110)
    won, payout, _ = activity._resolve_slip(slip)
    assert won is True
    assert payout > 100


def test_board_has_multiple_sports() -> None:
    catalog = load_catalog()
    board = generate_board(catalog, 10)
    sports = {e["sport"] for e in board}
    assert len(board) == 10
    assert len(sports) >= 3
