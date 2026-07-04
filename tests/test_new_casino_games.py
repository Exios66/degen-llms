from mandalay_bay.activities.registry import ACTIVITIES_BY_ID, FLOOR_ORDER
from mandalay_bay.activities.roulette import resolve_bet, RouletteBet, BET_TYPES


def test_new_games_registered() -> None:
    assert "holdem" in ACTIVITIES_BY_ID
    assert "roulette" in ACTIVITIES_BY_ID
    assert "horse_racing" in ACTIVITIES_BY_ID
    assert "Racing Pavilion" in FLOOR_ORDER


def test_roulette_red_wins() -> None:
    red_bet = next(b for b in BET_TYPES if b.kind == "red")
    win, reason = resolve_bet(red_bet, 10, 1)
    assert win == 20
    assert "Winner" in reason


def test_roulette_zero_outside_loses() -> None:
    red_bet = next(b for b in BET_TYPES if b.kind == "red")
    win, _ = resolve_bet(red_bet, 10, 0)
    assert win == 0


def test_roulette_straight() -> None:
    straight = RouletteBet("straight", "Single", 35, frozenset())
    win, _ = resolve_bet(straight, 10, 7, straight_pick=7)
    assert win == 360
