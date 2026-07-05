"""Tests for floor-wide stake tiers."""

from mandalay_bay.stakes import (
    STAKE_TIERS,
    TIER_ORDER,
    effective_max_bet,
    effective_slot_stakes,
    effective_table_stakes,
    get_tier,
)


def test_all_tiers_registered() -> None:
    assert len(TIER_ORDER) == 5
    assert set(TIER_ORDER) == set(STAKE_TIERS.keys())


def test_new_salon_tiers_present() -> None:
    tier_401k = get_tier("401k_contribution")
    no_limit = get_tier("no_limit")
    assert tier_401k.min_bet == 542
    assert tier_401k.max_bet == 6500
    assert "401K" in tier_401k.name
    assert no_limit.min_bet == 2500
    assert no_limit.max_bet is None
    assert "No Limit" in no_limit.name


def test_effective_table_stakes_no_limit() -> None:
    tier = get_tier("no_limit")
    min_bet, max_bet = effective_table_stakes(tier, balance=50_000, activity_min=10)
    assert min_bet == 2500
    assert max_bet == 50_000


def test_effective_slot_stakes_401k_on_penny_machine() -> None:
    tier = get_tier("401k_contribution")
    min_bet, max_bet = effective_slot_stakes(1, 3, tier, balance=10_000)
    assert min_bet == 542
    assert max_bet == 6500


def test_effective_slot_stakes_no_limit_ignores_machine_cap() -> None:
    tier = get_tier("no_limit")
    min_bet, max_bet = effective_slot_stakes(1, 25, tier, balance=100_000)
    assert min_bet == 2500
    assert max_bet == 100_000


def test_effective_max_bet_caps_at_balance() -> None:
    tier = get_tier("401k_contribution")
    assert effective_max_bet(tier, balance=1000) == 1000
