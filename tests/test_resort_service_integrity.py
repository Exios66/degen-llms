"""Concrete regressions for paid resort services and encounter lifecycle."""
from __future__ import annotations

import pytest

from mandalay_bay.dining import DINING_VENUES, create_sitting, order_and_consume, resolve_encounter, settle_sitting
from mandalay_bay.gentlemans_club import CLUB_DRINKS, order_club_drink, play_bottle_memory
from mandalay_bay.hotel import ensure_hotel
from mandalay_bay.intoxication import CONSUMABLE_POTENCY, get_intoxication_level
from mandalay_bay.pool_complex import enter_beach_club, enter_zone, ensure_pool_complex, play_ring_toss
from mandalay_bay.resort_bridge import get_session_tier_index, resort_requirements_met
from mandalay_bay.room_amenities import make_phone_call, make_room_decision, purchase_minibar_item
from mandalay_bay.session import PlayerSession


@pytest.mark.parametrize("target", [-1, 3, 0.5, "0", None, True])
def test_invalid_ring_target_never_debits_wallet(target) -> None:
    session = PlayerSession()
    assert not play_ring_toss(session, 100, target).ok
    assert session.wallet.balance == 1000
    assert not session.wallet.transactions


@pytest.mark.parametrize("entry", [enter_beach_club, lambda session: enter_zone(session, "beach_club")])
def test_beach_club_visit_requires_successful_cover(entry) -> None:
    session = PlayerSession()
    session.wallet.balance = 0
    assert not entry(session).ok
    pool = ensure_pool_complex(session)
    assert "beach_club" not in pool.visited_zones
    assert "beach_club_initiate" not in pool.unlocked_events
    session.wallet.balance = 75
    assert entry(session).ok
    assert session.wallet.balance == 0
    assert "beach_club_initiate" in pool.unlocked_events
    assert entry(session).ok  # A paid pass is reusable.
    assert len(session.wallet.transactions) == 1


def test_two_vodka_recipe_requires_two_purchases() -> None:
    session = PlayerSession()
    hotel = ensure_hotel(session)
    hotel.reached_room = True
    purchase_minibar_item(session, "mini_vodka")
    make_phone_call(session, "ex")
    make_room_decision(session, "balcony")
    assert "what_happens" not in hotel.room_amenities.unlocked_events
    purchase_minibar_item(session, "mini_vodka")
    assert "what_happens" in hotel.room_amenities.unlocked_events


def test_missing_room_state_does_not_satisfy_room_event_requirement() -> None:
    assert not resort_requirements_met(PlayerSession(), {"room_events": ["what_happens"]})


def test_tier_gate_uses_wagers_before_rewards_sync() -> None:
    session = PlayerSession()
    session.wallet.buy_in(50_000)
    session.wallet.debit(50_000, "blackjack", "wager")
    assert get_session_tier_index(session) == 2


def test_dining_and_club_drinks_have_effective_potency() -> None:
    for venue in DINING_VENUES:
        for item in venue["menu"]:
            if item.get("potency_id"):
                assert CONSUMABLE_POTENCY[item["potency_id"]]["potency"] > 0
    for drink in CLUB_DRINKS:
        assert drink["id"] in CONSUMABLE_POTENCY
        if drink["id"] != "gc_club_soda":
            assert CONSUMABLE_POTENCY[drink["id"]]["potency"] > 0
    session = PlayerSession()
    sitting = create_sitting("aureole")
    assert order_and_consume(session, sitting, "aur_champagne", rng=lambda: 1.0).ok
    assert get_intoxication_level(session) == 2
    assert order_club_drink(session, "gc_old_fashioned")["ok"]
    assert get_intoxication_level(session) == 5


def test_pending_dining_encounter_cannot_be_replaced_or_resolved_after_closing() -> None:
    session = PlayerSession()
    sitting = create_sitting("aureole")
    assert order_and_consume(session, sitting, "aur_amuse", rng=lambda: 0.0).encounter
    original = sitting.pending_encounter
    before = session.wallet.balance
    assert not order_and_consume(session, sitting, "aur_amuse", rng=lambda: 0.0).ok
    assert session.wallet.balance == before
    assert sitting.pending_encounter is original
    assert not resolve_encounter(session, sitting, "nonexistent").ok
    assert session.wallet.balance == before
    assert sitting.pending_encounter is original
    assert settle_sitting(session, sitting, tip_percent=0).ok
    assert sitting.pending_encounter is None
    assert not resolve_encounter(session, sitting, original["choices"][0]["id"]).ok
    assert session.wallet.balance == before


def test_empty_bottle_memory_cannot_pay_out_or_charge() -> None:
    session = PlayerSession()
    assert not play_bottle_memory(session, [], [])["ok"]
    assert session.wallet.balance == 1000
    assert not session.wallet.transactions
