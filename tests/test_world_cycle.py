"""Tests for real-time world day/night cycle."""

from __future__ import annotations

import time

from mandalay_bay.chips import ChipWallet
from mandalay_bay.hotel import ensure_hotel, find_reservation, find_reservation_at_desk
from mandalay_bay.session import PlayerSession
from mandalay_bay.world_cycle import (
    MS_PER_GAME_DAY,
    ensure_world_cycle,
    get_daily_charge_total,
    settle_hotel_overdue,
    sync_world_cycle,
)


def _session(balance: int = 5000) -> PlayerSession:
    session = PlayerSession(wallet=ChipWallet(balance=balance))
    ensure_hotel(session)
    ensure_world_cycle(session)
    return session


def test_day_rollover_charges_and_resets_reservation() -> None:
    session = _session(5000)
    wc = ensure_world_cycle(session)
    wc.clock_anchor_ms = int(time.time() * 1000) - MS_PER_GAME_DAY - 5000
    wc.processed_day = 0
    hotel = session.hotel
    hotel.found_reservation = True
    hotel.reservation_confirmed_desk = True
    before = session.wallet.balance
    sync_world_cycle(session)
    assert wc.processed_day >= 1
    assert not hotel.found_reservation
    assert session.wallet.balance < before


def test_insufficient_funds_evicts_room() -> None:
    session = _session(10)
    wc = ensure_world_cycle(session)
    wc.clock_anchor_ms = int(time.time() * 1000) - MS_PER_GAME_DAY - 5000
    wc.processed_day = 0
    hotel = session.hotel
    hotel.reached_room = True
    sync_world_cycle(session)
    assert wc.room_evicted is True
    assert hotel.room_evicted is True
    assert not hotel.reached_room
    assert wc.overdue_balance > 0


def test_settle_overdue_restores_access() -> None:
    session = _session(500)
    wc = ensure_world_cycle(session)
    wc.overdue_balance = 200
    wc.room_evicted = True
    res = settle_hotel_overdue(session)
    assert res.ok is True
    assert wc.overdue_balance == 0
    assert wc.room_evicted is False


def test_reservation_requirement_desk_day() -> None:
    session = _session()
    wc = ensure_world_cycle(session)
    wc.clock_anchor_ms = int(time.time() * 1000) - MS_PER_GAME_DAY - 1000
    wc.processed_day = 0
    sync_world_cycle(session)
    from mandalay_bay.world_cycle import confirm_reservation_at_desk

    assert confirm_reservation_at_desk(session).ok is True


def test_daily_rates_scale_by_room_type() -> None:
    session = _session()
    hotel = ensure_hotel(session)
    std = get_daily_charge_total(hotel, 0)
    hotel.room_type = "penthouse"
    pent = get_daily_charge_total(hotel, 0)
    assert pent["total"] > std["total"]
