from mandalay_bay.activities.registry import ACTIVITIES_BY_ID, FLOOR_ORDER
from mandalay_bay.activities.roulette import (
    append_spin_history,
    resolve_bet,
    RouletteBet,
    BET_TYPES,
    wheel_color,
)


def test_new_games_registered() -> None:
    assert "holdem" in ACTIVITIES_BY_ID
    assert "roulette" in ACTIVITIES_BY_ID
    assert "craps" in ACTIVITIES_BY_ID
    assert "lottery" in ACTIVITIES_BY_ID
    assert "horse_racing" in ACTIVITIES_BY_ID
    assert "dressage" in ACTIVITIES_BY_ID
    assert "jumper" in ACTIVITIES_BY_ID
    assert "Lottery Counter" in FLOOR_ORDER
    assert "Racing Pavilion" in FLOOR_ORDER
    assert "Equestrian Arena" in FLOOR_ORDER
    assert ACTIVITIES_BY_ID["craps"].info.floor == "Table Games"
    assert ACTIVITIES_BY_ID["lottery"].info.floor == "Lottery Counter"


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


def test_roulette_spin_history_newest_first_and_capped() -> None:
    history: list[tuple[int, str]] = []
    history = append_spin_history(history, 0, limit=3)
    history = append_spin_history(history, 17, limit=3)
    history = append_spin_history(history, 32, limit=3)
    history = append_spin_history(history, 5, limit=3)
    assert history == [(5, "red"), (32, "red"), (17, "black")]
    assert wheel_color(0) == "green"
    assert len(history) == 3
