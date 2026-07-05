"""Tests for hotel stay lifecycle — folio, checkout, late checkout."""

from __future__ import annotations

from mandalay_bay.chips import ChipWallet
from mandalay_bay.hotel import (
    build_folio_lines,
    checkout_stay,
    ensure_hotel,
    late_checkout,
    review_folio,
)
from mandalay_bay.room_amenities import ensure_room_amenities, purchase_minibar_item
from mandalay_bay.session import PlayerSession


def _session() -> PlayerSession:
    session = PlayerSession(wallet=ChipWallet(balance=5000))
    ensure_hotel(session)
    ensure_room_amenities(ensure_hotel(session))
    return session


def test_review_folio_includes_minibar() -> None:
    session = _session()
    purchase_minibar_item(session, "mini_vodka")
    lines = build_folio_lines(session)
    assert any("Minibar" in line for line in lines)
    res = review_folio(session)
    assert res.ok
    assert ensure_hotel(session).folio_reviewed is True


def test_checkout_decrements_nights() -> None:
    session = _session()
    hotel = ensure_hotel(session)
    hotel.nights_remaining = 2
    res = checkout_stay(session)
    assert res.ok
    assert hotel.nights_remaining == 1


def test_late_checkout_charges_when_not_net_positive() -> None:
    session = _session()
    before = session.wallet.balance
    res = late_checkout(session)
    assert res.ok
    assert session.wallet.balance == before - 75
