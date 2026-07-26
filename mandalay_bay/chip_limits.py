"""Cashier / offshore bank transaction ceilings. Keep in sync with docs/js/chip-limits.js."""

from __future__ import annotations

from typing import TYPE_CHECKING

from mandalay_bay.rewards import tier_for_wagered

if TYPE_CHECKING:
    from mandalay_bay.session import PlayerSession

# Max chips purchased from the cashier in one transaction.
BUY_CHIPS_MAX = 1_000_000

# Max chips cashed out to the private offshore account in one transaction.
CASHOUT_TO_BANK_MAX = 1_000_000_000

# Per-transaction withdraw / expense ceiling from the offshore account by MGM tier.
TIER_BANK_WITHDRAW_MAX: dict[str, int] = {
    "sapphire": 1_000_000,
    "pearl": 5_000_000,
    "gold": 25_000_000,
    "platinum": 100_000_000,
    "noir": 250_000_000,
    "chairman": 1_000_000_000,
}


def rewards_tier_id_for_session(session: PlayerSession) -> str:
    rewards = getattr(session, "rewards", None)
    wagered = getattr(rewards, "lifetime_wagered", 0) or 0
    return tier_for_wagered(wagered).id


def bank_withdraw_max_for_session(session: PlayerSession) -> int:
    return TIER_BANK_WITHDRAW_MAX.get(
        rewards_tier_id_for_session(session),
        TIER_BANK_WITHDRAW_MAX["sapphire"],
    )


def cash_out_max_for_session(session: PlayerSession) -> int:
    return min(CASHOUT_TO_BANK_MAX, session.wallet.balance)
