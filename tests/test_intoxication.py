"""Tests for intoxication tracking across liquor, beer, and contraband."""

from datetime import datetime, timedelta, timezone

from mandalay_bay.casino_amenities import ensure_amenities, order_bar_drink
from mandalay_bay.chips import ChipWallet
from mandalay_bay.hotel import ensure_hotel
from mandalay_bay.intoxication import (
    CONSUMABLE_POTENCY,
    INTOXICATION_MAX,
    INTOX_MAX_SETTLE_SECONDS,
    attach_intoxication_to_session,
    get_intoxication_level,
    maybe_settle_max_intoxication,
    record_consumption,
    settle_intoxication,
)
from mandalay_bay.pool_complex import beach_club_action, book_cabana, cabana_service, ensure_pool_complex
from mandalay_bay.room_amenities import purchase_minibar_item
from mandalay_bay.session import PlayerSession


def _session(chips: int = 5000) -> PlayerSession:
    s = PlayerSession(player_name="Tester", wallet=ChipWallet(balance=chips))
    ensure_amenities(s)
    hotel = ensure_hotel(s)
    hotel.reached_room = True
    attach_intoxication_to_session(s, {})
    return s


def test_bar_drink_increases_intoxication() -> None:
    session = _session()
    res = order_bar_drink(session, "rr_craft_beer")
    assert res.ok
    assert get_intoxication_level(session) == CONSUMABLE_POTENCY["rr_craft_beer"]["potency"]


def test_minibar_liquor_increases_intoxication() -> None:
    session = _session()
    res = purchase_minibar_item(session, "mini_vodka")
    assert res.ok
    assert get_intoxication_level(session) == CONSUMABLE_POTENCY["mini_vodka"]["potency"]


def test_contraband_hits_harder_than_beer() -> None:
    session = _session()
    record_consumption(session, "rr_craft_beer", source="test")
    beer_level = get_intoxication_level(session)
    record_consumption(session, "noir_herb_preroll", source="test")
    assert get_intoxication_level(session) > beer_level


def test_pool_drinks_record_consumption() -> None:
    session = _session()
    ensure_pool_complex(session)
    book_cabana(session)
    cabana_service(session, "bottle")
    assert get_intoxication_level(session) == CONSUMABLE_POTENCY["pool_cabana_bottle"]["potency"]

    ensure_pool_complex(session).flags["beach_club_pass"] = True
    beach_club_action(session, "bar")
    expected = (
        CONSUMABLE_POTENCY["pool_cabana_bottle"]["potency"]
        + CONSUMABLE_POTENCY["pool_beach_club_bar"]["potency"]
    )
    assert get_intoxication_level(session) == expected


def test_intoxication_caps_at_max() -> None:
    session = _session()
    for _ in range(30):
        record_consumption(session, "foundation_edible", source="test")
    assert get_intoxication_level(session) == INTOXICATION_MAX


def test_migrate_level_from_bar_history() -> None:
    session = _session()
    session.amenities.bar_orders.extend(["mini_vodka", "rr_craft_beer"])
    attach_intoxication_to_session(session, {})
    expected = CONSUMABLE_POTENCY["mini_vodka"]["potency"] + CONSUMABLE_POTENCY["rr_craft_beer"]["potency"]
    assert get_intoxication_level(session) == expected


def test_max_intoxication_settles_after_window() -> None:
    session = _session()
    for _ in range(30):
        record_consumption(session, "foundation_edible", source="test")
    assert get_intoxication_level(session) == INTOXICATION_MAX

    started = datetime.now(timezone.utc) - timedelta(seconds=INTOX_MAX_SETTLE_SECONDS + 5)
    session.intoxication.last_consumed_at = started.isoformat()
    assert maybe_settle_max_intoxication(session) is True
    assert get_intoxication_level(session) == 0


def test_max_intoxication_does_not_settle_early() -> None:
    session = _session()
    for _ in range(30):
        record_consumption(session, "foundation_edible", source="test")
    now = datetime.now(timezone.utc)
    session.intoxication.last_consumed_at = now.isoformat()
    assert maybe_settle_max_intoxication(session, now=now + timedelta(seconds=60)) is False
    assert get_intoxication_level(session) == INTOXICATION_MAX


def test_settle_intoxication_clears_level() -> None:
    session = _session()
    record_consumption(session, "mini_vodka", source="test")
    assert settle_intoxication(session) is True
    assert get_intoxication_level(session) == 0


def test_attach_settles_stale_max_intoxication() -> None:
    session = _session()
    stale = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
    attach_intoxication_to_session(
        session,
        {
            "intoxication": {
                "level": INTOXICATION_MAX,
                "total_doses": 20,
                "last_consumed_at": stale,
                "history": [],
            }
        },
    )
    assert get_intoxication_level(session) == 0
