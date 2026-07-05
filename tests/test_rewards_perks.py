"""Tests for MGM Rewards tier experience perks and timing."""

from __future__ import annotations

from mandalay_bay.rewards_perks import (
    RESORT_OFFERS,
    TIER_EXPERIENCE,
    activity_timing,
    get_tier_experience,
    maybe_pit_boss_topup,
    scale_delay,
)


def test_tier_speed_increases_with_rank() -> None:
    multipliers = [TIER_EXPERIENCE[t.id].speed_multiplier for t in (
        __import__("mandalay_bay.rewards", fromlist=["TIERS"]).TIERS
    )]
    assert multipliers == sorted(multipliers, reverse=True)


def test_chairman_fastest_timing() -> None:
    sapphire = activity_timing("sapphire")
    chairman = activity_timing("chairman")
    assert chairman["slots_reel_3"] < sapphire["slots_reel_3"]
    assert chairman["roulette_spin"] < sapphire["roulette_spin"]


def test_scale_delay_respects_floor() -> None:
    assert scale_delay(350, "chairman") >= 80


def test_chairman_has_premium_perks() -> None:
    exp = get_tier_experience("chairman")
    joined = " ".join(exp.perks).lower()
    assert "driver" in joined
    assert "chef" in joined
    assert "bottle service" in joined
    assert "herb" in joined


def test_sapphire_no_pit_topups() -> None:
    assert maybe_pit_boss_topup("sapphire", 100, 0.0) is None


def test_chairman_pit_topup_on_low_roll() -> None:
    amount = maybe_pit_boss_topup("chairman", 1000, 0.01)
    assert amount is not None
    assert 500 <= amount <= 5000


def test_resort_offers_tier_gates() -> None:
    assert RESORT_OFFERS[0]["min_tier_index"] == 1
    assert RESORT_OFFERS[-1]["min_tier_index"] == 5
