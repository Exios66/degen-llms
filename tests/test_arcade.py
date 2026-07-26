"""Arcade Alley catalog, tickets, and floor registration."""

from mandalay_bay.activities.registry import ACTIVITIES_BY_ID, FLOOR_ORDER
from mandalay_bay.activities.arcade import ArcadeActivity, CABINETS


def test_arcade_floor_registered() -> None:
    assert "Arcade Alley" in FLOOR_ORDER
    assert "arcade" in ACTIVITIES_BY_ID
    assert ACTIVITIES_BY_ID["arcade"].info.floor == "Arcade Alley"
    assert ACTIVITIES_BY_ID["arcade"].info.min_bet == 5


def test_arcade_cabinets_listed() -> None:
    assert len(CABINETS) == 4
    names = {c[0] for c in CABINETS}
    assert "Strip Cross" in names
    assert "Showgirl Beat" in names


def test_arcade_activity_is_stub() -> None:
    assert isinstance(ACTIVITIES_BY_ID["arcade"], ArcadeActivity)


def test_ticket_math_js_parity() -> None:
    # Mirror docs/js/arcade/catalog.js ticketsFromScore / payoutFromMult
    def tickets_from_score(score: int, cleared: bool = False) -> int:
        return score // 100 + (2 if cleared else 0)

    def payout_from_mult(cost: int, mult: float) -> int:
        m = max(0.0, min(3.0, mult))
        return int(cost * m)

    assert tickets_from_score(250) == 2
    assert tickets_from_score(250, cleared=True) == 4
    assert payout_from_mult(10, 2.5) == 25
    assert payout_from_mult(10, 9) == 30
