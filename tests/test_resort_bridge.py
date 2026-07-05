"""Tests for cross-resort bridge and new room events."""

from __future__ import annotations

from mandalay_bay.casino_amenities import ensure_amenities
from mandalay_bay.chips import ChipWallet
from mandalay_bay.hotel import ensure_hotel
from mandalay_bay.pool_complex import ensure_pool_complex
from mandalay_bay.resort_bridge import get_session_tier_index, resort_requirements_met
from mandalay_bay.room_amenities import (
    make_phone_call,
    make_room_decision,
    purchase_minibar_item,
    tune_tv_channel,
)
from mandalay_bay.session import PlayerSession


def _session(balance: int = 5000) -> PlayerSession:
    session = PlayerSession(wallet=ChipWallet(balance=balance))
    hotel = ensure_hotel(session)
    hotel.reached_room = True
    hotel.room_type = "suite"
    return session


def test_pool_party_vip_requires_pool_zone() -> None:
    session = _session()
    purchase_minibar_item(session, "champagne_split")
    make_phone_call(session, "concierge")
    ra = ensure_hotel(session).room_amenities
    assert ra is not None
    assert "pool_party_vip" not in ra.unlocked_events

    pc = ensure_pool_complex(session)
    pc.visited_zones.append("beach_rave")
    tune_tv_channel(session, "aquarium")
    assert "pool_party_vip" in ra.unlocked_events


def test_sky_bridge_haul_requires_shopping() -> None:
    session = _session()
    make_room_decision(session, "sky_bridge_walk")
    make_room_decision(session, "balcony")
    ra = ensure_hotel(session).room_amenities
    assert ra is not None
    assert "sky_bridge_haul" not in ra.unlocked_events

    amenities = ensure_amenities(session)
    amenities.purchased_items.append("lush_bath_bomb")
    make_room_decision(session, "balcony")
    assert "sky_bridge_haul" in ra.unlocked_events


def test_fight_night_suite_unlock() -> None:
    session = _session()
    tune_tv_channel(session, "arena_boxing")
    make_phone_call(session, "bookie")
    ra = ensure_hotel(session).room_amenities
    assert ra is not None
    assert "fight_night_suite" in ra.unlocked_events


def test_chapel_wrong_turn_unlock() -> None:
    session = _session()
    make_phone_call(session, "random_foreign")
    make_room_decision(session, "wedding_chapel")
    ra = ensure_hotel(session).room_amenities
    assert ra is not None
    assert "chapel_wrong_turn" in ra.unlocked_events


def test_resort_requirements_met_tier() -> None:
    session = _session()
    assert get_session_tier_index(session) == 0
    assert not resort_requirements_met(session, {"min_tier_index": 2})
