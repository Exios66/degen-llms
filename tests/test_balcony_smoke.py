"""Suite balcony POV smoke-break tests."""

from __future__ import annotations

from mandalay_bay.balcony_smoke import (
    BALCONY_HIT_MAX,
    can_enter_balcony_smoke,
    close_balcony_sitting,
    start_balcony_visit,
    take_balcony_hit,
)
from mandalay_bay.chips import ChipWallet
from mandalay_bay.hotel import ensure_hotel, find_reservation, use_room_key_to_door, upgrade_room
from mandalay_bay.session import PlayerSession


def _suite_session() -> PlayerSession:
    session = PlayerSession(wallet=ChipWallet(balance=5000))
    session.wallet.credit(800, "blackjack", "win")
    find_reservation(session)
    use_room_key_to_door(session)
    assert upgrade_room(session, "suite").ok
    find_reservation(session)
    use_room_key_to_door(session)
    return session


def test_balcony_smoke_requires_suite_and_door() -> None:
    session = PlayerSession()
    ensure_hotel(session)
    assert can_enter_balcony_smoke(session).ok is False
    find_reservation(session)
    use_room_key_to_door(session)
    assert can_enter_balcony_smoke(session).ok is False  # still standard room


def test_balcony_smoke_hits_and_close() -> None:
    session = _suite_session()
    assert can_enter_balcony_smoke(session).ok is True
    gate, sitting = start_balcony_visit(session)
    assert gate.ok and sitting is not None
    for _ in range(BALCONY_HIT_MAX):
        hit = take_balcony_hit(session, sitting)
        assert hit.ok
    assert sitting.hits == BALCONY_HIT_MAX
    done = take_balcony_hit(session, sitting)
    assert done.ok is False and done.done is True
    closed = close_balcony_sitting(session, sitting)
    assert closed.ok
    assert session.balcony_smoke.lifetime_hits >= BALCONY_HIT_MAX
    assert "high_roller_haze" in session.balcony_smoke.eggs
