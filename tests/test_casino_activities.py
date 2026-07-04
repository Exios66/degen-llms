from mandalay_bay.activities.registry import ALL_ACTIVITIES, FLOOR_ORDER
from mandalay_bay.activities.slots import _payout, Symbol


def test_all_floors_have_activities() -> None:
    floors = {a.info.floor for a in ALL_ACTIVITIES}
    for floor in FLOOR_ORDER:
        assert floor in floors


def test_three_sevens_paytable() -> None:
    reels = [
        Symbol("seven", "7", 1),
        Symbol("seven", "7", 1),
        Symbol("seven", "7", 1),
    ]
    win, reason = _payout(reels, 10)
    assert win == 1000
    assert "100x" in reason


def test_no_win() -> None:
    reels = [
        Symbol("lemon", "L", 1),
        Symbol("bar", "B", 1),
        Symbol("cherry", "C", 1),
    ]
    win, _ = _payout(reels, 10)
    assert win == 0
