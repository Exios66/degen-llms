"""Tests for Mandalay Bay Hotel Experience logic."""

from __future__ import annotations

from mandalay_bay.chips import ChipWallet
from mandalay_bay.hotel import (
    ensure_hotel,
    extend_stay,
    find_reservation,
    hallway_choice,
    is_net_positive,
    reset_hallway,
    upgrade_room,
    use_room_key_to_door,
)
from mandalay_bay.world_cycle import grant_room_key_if_reservation_ready
from mandalay_bay.saves import session_from_dict, session_to_dict
from mandalay_bay.session import PlayerSession


def _session_with_net(net: int, balance: int = 5000) -> PlayerSession:
    session = PlayerSession(wallet=ChipWallet(balance=balance))
    if net > 0:
        session.wallet.credit(net, "blackjack", "win")
    elif net < 0:
        session.wallet.debit(-net, "blackjack", "loss")
    return session


def test_default_hotel_state_on_session() -> None:
    session = PlayerSession()
    hotel = ensure_hotel(session)
    assert hotel.property_id == "mandalay_bay"
    assert hotel.room_type == "standard"
    assert hotel.nights_remaining >= 1
    assert hotel.reservation_code.startswith("MB-")


def test_find_reservation_reveals_hint() -> None:
    session = PlayerSession()
    first = find_reservation(session)
    assert first.already is False
    assert first.clue is not None
    assert "tower" in first.clue.lower()

    second = find_reservation(session)
    assert second.already is True
    assert ensure_hotel(session).found_reservation is True


def test_hallway_requires_reservation() -> None:
    session = PlayerSession()
    result = hallway_choice(session, 0)
    assert result.success is False
    assert "reservation" in (result.quip or "").lower()


def test_locate_activates_key_without_skipping_hallway() -> None:
    session = PlayerSession()
    find_reservation(session)
    hotel = ensure_hotel(session)
    assert hotel.found_reservation is True
    assert hotel.room_key_active is True
    assert hotel.reached_room is False


def test_hallway_correct_path_reaches_room() -> None:
    session = PlayerSession()
    find_reservation(session)
    hotel = ensure_hotel(session)
    correct_indices = [1, 0, 0]
    for idx in correct_indices:
        result = hallway_choice(session, idx)
        assert result.success is True
    assert hotel.reached_room is True


def test_use_room_key_skips_hallway_to_door() -> None:
    session = PlayerSession()
    find_reservation(session)
    hotel = ensure_hotel(session)
    assert hotel.reached_room is False
    res = use_room_key_to_door(session)
    assert res.ok is True
    assert hotel.reached_room is True
    assert hotel.room_key_active is True


def test_suite_upgrade_resets_key_and_hallway() -> None:
    session = _session_with_net(800)
    find_reservation(session)
    use_room_key_to_door(session)
    hotel = ensure_hotel(session)
    old_number = hotel.room_number
    res = upgrade_room(session, "suite")
    assert res.ok is True
    assert hotel.room_type == "suite"
    assert hotel.room_number != old_number
    assert hotel.found_reservation is False
    assert hotel.room_key_active is False
    assert hotel.reached_room is False
    find_reservation(session)
    grant_room_key_if_reservation_ready(session)
    assert hotel.room_key_active is True
    assert hotel.reached_room is False


def test_upgrade_suite_when_net_positive() -> None:
    session = _session_with_net(800)
    assert is_net_positive(session)
    res = upgrade_room(session, "suite")
    assert res.ok is True
    assert ensure_hotel(session).room_type == "suite"


def test_extend_stay_when_net_positive() -> None:
    session = _session_with_net(300)
    hotel = ensure_hotel(session)
    before = hotel.nights_remaining
    res = extend_stay(session, 1)
    assert res.ok is True
    assert hotel.nights_remaining == before + 1


def test_reset_hallway_clears_progress() -> None:
    session = PlayerSession()
    find_reservation(session)
    hallway_choice(session, 1)
    reset_hallway(session)
    hotel = ensure_hotel(session)
    assert hotel.hallway_progress == 0
    assert hotel.reached_room is False
    assert hotel.hallway_log == []


def test_hotel_save_roundtrip() -> None:
    session = PlayerSession(
        player_name="Guest",
        wallet=ChipWallet(balance=1000),
        slot_id=1,
        slot_label="Test",
    )
    find_reservation(session)
    data = session_to_dict(session)
    assert "hotel" in data
    assert data["hotel"]["found_reservation"] is True

    loaded = session_from_dict(data)
    assert ensure_hotel(loaded).found_reservation is True
    assert loaded.player_name == "Guest"
