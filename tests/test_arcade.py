"""Arcade Alley catalog, tickets, CLI play, and floor registration."""

from mandalay_bay.activities.registry import ACTIVITIES_BY_ID, FLOOR_ORDER
from mandalay_bay.activities.arcade import ArcadeActivity, CABINETS
from mandalay_bay.arcade_catalog import (
    ARCADE_GAMES,
    payout_from_mult,
    tickets_from_score,
)
from mandalay_bay.arcade_state import ArcadeState, ensure_arcade
from mandalay_bay.session import PlayerSession


def test_arcade_floor_registered() -> None:
    assert "Arcade Alley" in FLOOR_ORDER
    assert "arcade" in ACTIVITIES_BY_ID
    assert ACTIVITIES_BY_ID["arcade"].info.floor == "Arcade Alley"
    assert ACTIVITIES_BY_ID["arcade"].info.min_bet == 5


def test_arcade_cabinets_listed() -> None:
    assert len(CABINETS) == 4
    assert len(ARCADE_GAMES) == 4
    names = {c[0] for c in CABINETS}
    assert "Strip Cross" in names
    assert "Showgirl Beat" in names


def test_arcade_activity_is_playable() -> None:
    assert isinstance(ACTIVITIES_BY_ID["arcade"], ArcadeActivity)
    assert hasattr(ACTIVITIES_BY_ID["arcade"], "_play_loop")


def test_ticket_math_js_parity() -> None:
    assert tickets_from_score(250) == 2
    assert tickets_from_score(250, cleared=True) == 4
    assert payout_from_mult(10, 2.5) == 25
    assert payout_from_mult(10, 9) == 30


def test_cabinet_costs_within_plan_range() -> None:
    for _name, cost, _blurb in CABINETS:
        assert 5 <= cost <= 25


def test_arcade_state_round_trip() -> None:
    session = PlayerSession()
    state = ensure_arcade(session)
    state.record_play("strip_cross", 420, 4)
    state.flags["arcade_slot_voucher"] = True
    session.arcade = state
    restored = ArcadeState.from_dict(state.to_dict())
    assert restored.tickets == 4
    assert restored.high_scores["strip_cross"] == 420
    assert restored.flags["arcade_slot_voucher"] is True


def test_arcade_redeem_chips() -> None:
    state = ArcadeState(tickets=20)
    result = state.redeem("chips_50")
    assert result["ok"] is True
    assert result["chips"] == 50
    assert state.tickets == 12
