"""Integration tests for MGM Rewards persistence and hotel comp upgrades."""

from __future__ import annotations

from mandalay_bay.chips import ChipWallet
from mandalay_bay.hotel import ensure_hotel, extend_stay, upgrade_room
from mandalay_bay.rewards import (
    RewardsState,
    ensure_rewards,
    sync_rewards_from_wallet,
    tier_for_wagered,
)
from mandalay_bay.saves import session_from_dict, session_to_dict
from mandalay_bay.session import PlayerSession


def _session_with_wagered(wagered: int, balance: int = 10_000) -> PlayerSession:
    session = PlayerSession(wallet=ChipWallet(balance=balance))
    ensure_rewards(session)
    ensure_hotel(session)
    if wagered > 0:
        session.wallet.debit(wagered, "blackjack", "test wager")
    sync_rewards_from_wallet(session)
    return session


def test_rewards_save_roundtrip() -> None:
    session = _session_with_wagered(600)
    session.slot_id = 1
    session.slot_label = "Slot 1"
    data = session_to_dict(session)
    assert data["version"] == 3
    assert "rewards" in data
    assert data["rewards"]["tier"] == "pearl"

    loaded = session_from_dict(data)
    assert loaded.rewards is not None
    assert loaded.rewards.tier == "pearl"
    assert loaded.rewards.lifetime_wagered == 600


def test_sync_rewards_unlocks_room_night_comp() -> None:
    session = _session_with_wagered(5000)
    rewards = ensure_rewards(session)
    assert tier_for_wagered(rewards.lifetime_wagered).id == "platinum"
    assert "room_night" in rewards.unlocked_comps


def test_comp_suite_upgrade() -> None:
    session = PlayerSession(wallet=ChipWallet(balance=1000))
    ensure_hotel(session)
    session.rewards = RewardsState(
        tier="noir",
        lifetime_wagered=10000,
        unlocked_comps=["welcome_drink", "suite_upgrade"],
        redeemed_comps=["welcome_drink"],
    )
    result = upgrade_room(session, "suite")
    assert result.ok is True
    assert "Comp applied" in result.message
    hotel = ensure_hotel(session)
    assert hotel.room_type == "suite"
    assert "suite_upgrade" in session.rewards.redeemed_comps


def test_comp_extend_stay() -> None:
    session = PlayerSession(wallet=ChipWallet(balance=1000))
    ensure_hotel(session)
    before = ensure_hotel(session).nights_remaining
    session.rewards = RewardsState(
        tier="platinum",
        lifetime_wagered=5000,
        unlocked_comps=["welcome_drink", "room_night"],
        redeemed_comps=["welcome_drink"],
    )
    result = extend_stay(session, 1)
    assert result.ok is True
    assert ensure_hotel(session).nights_remaining == before + 1
    assert "room_night" in session.rewards.redeemed_comps


def test_migrate_v1_save_gets_rewards() -> None:
    session = PlayerSession(wallet=ChipWallet(balance=5000))
    session.wallet.debit(2500, "slots", "spin")
    tx = session.wallet.transactions[0]
    data = {
        "version": 1,
        "player_name": "Guest",
        "wallet": {
            "balance": session.wallet.balance,
            "transactions": [
                {
                    "timestamp": tx.timestamp.isoformat(),
                    "kind": tx.kind.value,
                    "amount": tx.amount,
                    "activity": "slots",
                    "description": "spin",
                    "balance_after": tx.balance_after,
                }
            ],
        },
        "activity_stats": {},
        "progressive_pools": {},
    }
    loaded = session_from_dict(data)
    assert loaded.rewards is not None
    assert loaded.rewards.lifetime_wagered >= 2500
    assert loaded.rewards.tier == "gold"
