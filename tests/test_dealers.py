"""Tests for charismatic dealer roster and rotation."""

from __future__ import annotations

import random

from mandalay_bay.dealers import (
    DEALER_ROSTER,
    dealers_for_game,
    get_dealer_by_id,
    get_on_duty_dealer,
    get_session_dealer,
    pick_quip,
)
from mandalay_bay.session import PlayerSession


def test_rotation_is_deterministic() -> None:
    a = get_on_duty_dealer("blackjack", seed=3)
    b = get_on_duty_dealer("blackjack", seed=3)
    assert a.id == b.id
    c = get_on_duty_dealer("blackjack", seed=4)
    assert a.id != c.id or len(dealers_for_game("blackjack")) == 1


def test_each_game_has_eligible_dealer() -> None:
    for game_id in ("blackjack", "holdem", "roulette", "horse_racing"):
        eligible = dealers_for_game(game_id)
        assert eligible, f"no dealers for {game_id}"


def test_steve_harvey_covers_roulette_and_racing() -> None:
    steve = get_dealer_by_id("steve_harvey")
    assert steve is not None
    assert "roulette" in steve.games
    assert "horse_racing" in steve.games
    roulette_ids = {d.id for d in dealers_for_game("roulette")}
    racing_ids = {d.id for d in dealers_for_game("horse_racing")}
    assert "steve_harvey" in roulette_ids
    assert "steve_harvey" in racing_ids


def test_quip_pools_non_empty() -> None:
    for dealer in DEALER_ROSTER:
        assert dealer.tagline
        for kind in ("greeting", "deal", "win", "lose", "idle"):
            assert pick_quip(dealer, kind)
        pool = dealer.quips.get("greeting")
        assert pool and len(pool) >= 1


def test_session_dealer_uses_visit_count() -> None:
    session = PlayerSession()
    session.record_visit("blackjack")
    d1 = get_session_dealer(session, "blackjack")
    session.record_visit("blackjack")
    d2 = get_session_dealer(session, "blackjack")
    eligible = dealers_for_game("blackjack")
    if len(eligible) > 1:
        assert d1.id != d2.id or get_on_duty_dealer("blackjack", 1).id == d2.id


def test_pick_quip_respects_rng() -> None:
    dealer = get_dealer_by_id("meryl_screech")
    assert dealer is not None
    rng = random.Random(0)
    line = pick_quip(dealer, "greeting", rng=rng)
    assert line in dealer.quips["greeting"]
