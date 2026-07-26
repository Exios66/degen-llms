"""Tests for MGM Rewards tier and comp tracking."""

from __future__ import annotations

from mandalay_bay.chips import ChipWallet
from mandalay_bay.rewards import (
    TIERS,
    default_rewards_state,
    tier_for_wagered,
    total_wagered_from_wallet,
)
def test_tier_for_wagered_thresholds() -> None:
    assert tier_for_wagered(0).id == "sapphire"
    assert tier_for_wagered(9_999).id == "sapphire"
    assert tier_for_wagered(10_000).id == "pearl"
    assert tier_for_wagered(49_999).id == "pearl"
    assert tier_for_wagered(50_000).id == "gold"
    assert tier_for_wagered(200_000).id == "platinum"
    assert tier_for_wagered(500_000).id == "noir"
    assert tier_for_wagered(999_999).id == "noir"
    assert tier_for_wagered(1_000_000).id == "chairman"


def test_documented_tier_thresholds() -> None:
    by_id = {t.id: t.min_wagered for t in TIERS}
    assert by_id == {
        "sapphire": 0,
        "pearl": 10_000,
        "gold": 50_000,
        "platinum": 200_000,
        "noir": 500_000,
        "chairman": 1_000_000,
    }


def test_total_wagered_from_wallet() -> None:
    wallet = ChipWallet(1000)
    wallet.debit(50, "blackjack", "bet")
    wallet.debit(25, "roulette", "spin")
    assert total_wagered_from_wallet(wallet) == 75


def test_default_rewards_has_welcome_comp() -> None:
    rewards = default_rewards_state()
    assert "welcome_drink" in rewards.unlocked_comps
    assert rewards.notifications


def test_tier_list_monotonic() -> None:
    mins = [t.min_wagered for t in TIERS]
    assert mins == sorted(mins)
