"""Tests for in-room amenities and unlockable Vegas events."""

from __future__ import annotations

from mandalay_bay.chips import ChipWallet
from mandalay_bay.hotel import ensure_hotel
from mandalay_bay.room_amenities import (
    ensure_room_amenities,
    make_phone_call,
    make_room_decision,
    purchase_minibar_item,
    tune_tv_channel,
)
from mandalay_bay.saves import session_from_dict, session_to_dict
from mandalay_bay.session import PlayerSession


def _session(balance: int = 5000) -> PlayerSession:
    session = PlayerSession(wallet=ChipWallet(balance=balance))
    hotel = ensure_hotel(session)
    hotel.reached_room = True
    return session


def test_tune_aquarium_channel() -> None:
    session = _session()
    res = tune_tv_channel(session, "aquarium")
    assert res.ok is True
    ra = ensure_room_amenities(ensure_hotel(session))
    assert ra.tv_channel == "aquarium"
    assert "aquarium" in ra.channels_watched


def test_minibar_charges_wallet() -> None:
    session = _session()
    before = session.wallet.balance
    res = purchase_minibar_item(session, "mini_vodka")
    assert res.ok is True
    assert session.wallet.balance == before - 12
    ra = ensure_room_amenities(ensure_hotel(session))
    assert ra.minibar_tab == 12


def test_unlock_shark_whisperer() -> None:
    session = _session()
    tune_tv_channel(session, "aquarium")
    purchase_minibar_item(session, "salted_almonds")
    ra = ensure_room_amenities(ensure_hotel(session))
    assert "shark_whisperer" in ra.unlocked_events


def test_unlock_buckingham_moment() -> None:
    session = _session()
    res = make_phone_call(session, "random_foreign")
    assert res.ok is True
    ra = ensure_room_amenities(ensure_hotel(session))
    assert "buckingham_moment" in ra.unlocked_events


def test_unlock_what_happens_requires_combo() -> None:
    session = _session()
    purchase_minibar_item(session, "mini_vodka")
    purchase_minibar_item(session, "mini_vodka")
    make_phone_call(session, "ex")
    make_room_decision(session, "balcony")
    ra = ensure_room_amenities(ensure_hotel(session))
    assert "what_happens" in ra.unlocked_events
    assert "hangover_brunch" in ra.unlocked_events


def test_room_amenities_save_roundtrip() -> None:
    session = _session()
    tune_tv_channel(session, "aquarium")
    purchase_minibar_item(session, "champagne_split")
    data = session_to_dict(session)
    assert "room_amenities" in data["hotel"]
    loaded = session_from_dict(data)
    ra = ensure_room_amenities(ensure_hotel(loaded))
    assert ra.tv_channel == "aquarium"
    assert ra.minibar_tab == 45
