"""Tests for Gentleman's Club — The Velvet Ledger."""

from __future__ import annotations

from mandalay_bay.chips import ChipWallet
from mandalay_bay.gentlemans_club import (
    can_enter_gentlemans_club,
    ensure_club,
    make_it_rain,
    order_club_drink,
    play_felt_flip,
    play_tip_cascade,
    run_club_encounter,
)
from mandalay_bay.hotel import ensure_hotel
from mandalay_bay.rewards import ensure_rewards
from mandalay_bay.room_amenities import ensure_room_amenities, make_phone_call
from mandalay_bay.saves import session_from_dict, session_to_dict
from mandalay_bay.session import PlayerSession


def _session(balance: int = 50_000, *, gold: bool = False, suite: bool = False) -> PlayerSession:
    session = PlayerSession(wallet=ChipWallet(balance=balance))
    ensure_rewards(session)
    hotel = ensure_hotel(session)
    if suite:
        hotel.room_type = "suite"
    if gold:
        session.rewards.lifetime_wagered = 50_000
    return session


def test_gate_requires_gold_suite_or_phone() -> None:
    session = _session()
    assert can_enter_gentlemans_club(session)["ok"] is False

    gold = _session(gold=True)
    assert can_enter_gentlemans_club(gold)["ok"] is True

    suite = _session(suite=True)
    assert can_enter_gentlemans_club(suite)["ok"] is True


def test_phone_line_opens_rope() -> None:
    session = _session(gold=True)
    hotel = ensure_hotel(session)
    hotel.reached_room = True
    res = make_phone_call(session, "gentlemans_club")
    assert res.ok is True
    # Fresh low-tier guest who already called still gets in
    locked = _session()
    locked_hotel = ensure_hotel(locked)
    locked_hotel.reached_room = True
    ra = ensure_room_amenities(locked_hotel)
    ra.phone_calls.append("gentlemans_club")
    assert can_enter_gentlemans_club(locked)["ok"] is True


def test_make_it_rain_and_bar() -> None:
    session = _session(gold=True)
    before = session.wallet.balance
    rain = make_it_rain(session, "shower")
    assert rain["ok"] is True
    assert session.wallet.balance <= before - 500
    club = ensure_club(session)
    assert club.rain_count == 1
    assert club.total_rained >= 500

    drink = order_club_drink(session, "gc_old_fashioned")
    assert drink["ok"] is True
    assert "gc_old_fashioned" in club.drinks


def test_encounter_and_minigame() -> None:
    session = _session(gold=True)
    make_it_rain(session, "drizzle")
    enc = run_club_encounter(session, "security_sasha", 0)
    assert enc["ok"] is True
    assert "egg_velvet_back_hall" in ensure_club(session).eggs

    tip = play_tip_cascade(session, 0.7)
    assert tip["ok"] is True
    felt = play_felt_flip(session, "high")
    assert felt["ok"] is True


def test_club_save_roundtrip() -> None:
    session = _session(gold=True)
    make_it_rain(session, "storm")
    order_club_drink(session, "gc_martini")
    data = session_to_dict(session)
    assert "gentlemans_club" in data
    loaded = session_from_dict(data)
    club = ensure_club(loaded)
    assert club.rain_count == 1
    assert "gc_martini" in club.drinks
