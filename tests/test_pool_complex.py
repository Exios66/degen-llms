"""Tests for Mandalay Bay Pool Complex expansion."""

from __future__ import annotations

from mandalay_bay.chips import ChipWallet
from mandalay_bay.pool_complex import (
    POOL_EVENTS,
    book_cabana,
    ensure_pool_complex,
    enter_beach_club,
    enter_zone,
    photograph_shark,
    play_catch_wave,
    soak_hot_tub,
    start_rave_dance,
    submit_rave_move,
)
from mandalay_bay.saves import session_from_dict, session_to_dict
from mandalay_bay.session import PlayerSession


def _session(balance: int = 5000) -> PlayerSession:
    return PlayerSession(wallet=ChipWallet(balance=balance))


def test_enter_zone_tracks_visit() -> None:
    session = _session()
    res = enter_zone(session, "wave_pool")
    assert res.ok is True
    pc = ensure_pool_complex(session)
    assert "wave_pool" in pc.visited_zones
    assert "first_splash" in pc.unlocked_events


def test_shark_photo_quest() -> None:
    session = _session()
    for species_id in ("sand_tiger", "green_sea_turtle", "sawfish", "golden_ray", "jellyfish"):
        photograph_shark(session, species_id)
    pc = ensure_pool_complex(session)
    assert len(pc.shark_photos) == 5
    assert "reef_photographer" in pc.unlocked_events


def test_steve_reef_rumor_unlock() -> None:
    session = _session()
    enter_zone(session, "shark_reef")
    soak_hot_tub(session, "gossip")
    pc = ensure_pool_complex(session)
    assert "steve_at_the_reef" in pc.unlocked_events


def test_beach_club_cover_charge() -> None:
    session = _session()
    before = session.wallet.balance
    res = enter_beach_club(session)
    assert res.ok is True
    assert session.wallet.balance == before - 75
    pc = ensure_pool_complex(session)
    assert "beach_club_initiate" in pc.unlocked_events


def test_rave_dance_sequence() -> None:
    session = _session()
    start_rave_dance(session)
    pc = ensure_pool_complex(session)
    for move in pc.rave_moves:
        submit_rave_move(session, move)
    pc = ensure_pool_complex(session)
    assert pc.flags.get("rave_danced") is True
    assert "rave_til_dawn" in pc.unlocked_events


def test_cabana_booking() -> None:
    session = _session()
    res = book_cabana(session)
    assert res.ok is True
    assert ensure_pool_complex(session).flags.get("cabana_booked") is True


def test_pool_complex_save_roundtrip() -> None:
    session = _session()
    enter_zone(session, "wave_pool")
    play_catch_wave(session, 0)
    data = session_to_dict(session)
    assert "pool_complex" in data
    loaded = session_from_dict(data)
    pc = ensure_pool_complex(loaded)
    assert "wave_pool" in pc.visited_zones


def test_all_zones_unlock_eleven_acres() -> None:
    session = _session(10000)
    for zone_id in ("wave_pool", "hot_tubs", "cabanas", "shark_reef", "beach_club", "beach_rave"):
        enter_zone(session, zone_id)
    book_cabana(session)
    enter_beach_club(session)
    start_rave_dance(session)
    pc = ensure_pool_complex(session)
    for move in pc.rave_moves:
        submit_rave_move(session, move)
    pc = ensure_pool_complex(session)
    assert "eleven_acres" in pc.unlocked_events
    assert len(POOL_EVENTS) >= 8
