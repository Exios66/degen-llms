from __future__ import annotations

from dataclasses import dataclass, field

from mandalay_bay.chips import ChipWallet, TransactionKind

SAVE_VERSION_WITH_REWARDS = 3


@dataclass(frozen=True, slots=True)
class TierDef:
    id: str
    label: str
    min_wagered: int
    comp: str | None = None


TIERS: tuple[TierDef, ...] = (
    TierDef("sapphire", "Sapphire", 0),
    TierDef("pearl", "Pearl", 500, "slot_freeplay"),
    TierDef("gold", "Gold", 2000, "buffet_comp"),
    TierDef("platinum", "Platinum", 5000, "room_night"),
    TierDef("noir", "Noir", 10000, "suite_upgrade"),
    TierDef("chairman", "Chairman", 25000, "penthouse_fantasy"),
)


@dataclass
class RewardsState:
    member_id: str = "MB-000000"
    tier: str = "sapphire"
    lifetime_wagered: int = 0
    unlocked_comps: list[str] = field(default_factory=lambda: ["welcome_drink"])
    redeemed_comps: list[str] = field(default_factory=list)
    notifications: list[dict] = field(default_factory=list)


def default_rewards_state() -> RewardsState:
    return RewardsState(
        notifications=[{
            "id": "welcome_enroll",
            "title": "Welcome to MGM Rewards",
            "body": "Your Sapphire membership is active.",
            "read": False,
        }]
    )


def total_wagered_from_wallet(wallet: ChipWallet) -> int:
    return sum(
        abs(t.amount)
        for t in wallet.transactions
        if t.kind == TransactionKind.WAGER
    )


def tier_for_wagered(amount: int) -> TierDef:
    current = TIERS[0]
    for tier in TIERS:
        if amount >= tier.min_wagered:
            current = tier
    return current


def notify_tier_promotion(session_rewards: RewardsState, prev: int, new: int) -> list[str]:
    """Return titles of new tier notifications (CLI flavor)."""
    prev_tier = tier_for_wagered(prev)
    new_tier = tier_for_wagered(new)
    if new_tier.id == prev_tier.id:
        return []
    session_rewards.tier = new_tier.id
    if new_tier.comp and new_tier.comp not in session_rewards.unlocked_comps:
        session_rewards.unlocked_comps.append(new_tier.comp)
    title = f"{new_tier.label} Tier Unlocked!"
    session_rewards.notifications.insert(0, {"title": title, "read": False})
    return [title]
