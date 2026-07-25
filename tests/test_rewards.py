"""Tests for MGM Rewards tier and comp tracking."""

from __future__ import annotations

from mandalay_bay.chips import ChipWallet
from mandalay_bay.rewards import (
    TIERS,
    default_rewards_state,
    tier_for_wagered,
    total_wagered_from_wallet,
)
from mandalay_bay.session import PlayerSession


def test_tier_for_wagered_thresholds() -> None:
    assert tier_for_wagered(0).id == "sapphire"
    assert tier_for_wagered(499).id == "sapphire"
    assert tier_for_wagered(500).id == "pearl"
    assert tier_for_wagered(2000).id == "gold"
    assert tier_for_wagered(25000).id == "chairman"


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
