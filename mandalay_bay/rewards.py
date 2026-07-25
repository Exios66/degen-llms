from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING

from mandalay_bay.chips import ChipWallet, TransactionKind

if TYPE_CHECKING:
    from mandalay_bay.session import PlayerSession

SAVE_VERSION_WITH_REWARDS = 3

COMP_CATALOG: dict[str, dict[str, str]] = {
    "welcome_drink": {
        "title": "Welcome Cocktail",
        "body": "Complimentary drink at Betty's Bar — enrollment perk.",
    },
    "slot_freeplay": {
        "title": "$10 Slot Free-Play",
        "body": "Pearl tier voucher — flavor credit for the slot aisle.",
    },
    "buffet_comp": {
        "title": "Buffet Comp",
        "body": "Gold tier — the line moves faster when you're comped.",
    },
    "room_night": {
        "title": "Standard Room Night",
        "body": "Platinum tier — one night on the house (narrative comp).",
    },
    "suite_upgrade": {
        "title": "Suite Upgrade",
        "body": "Noir tier — VIP lounge access flag unlocked.",
    },
    "penthouse_fantasy": {
        "title": "Penthouse Fantasy Comp",
        "body": "Chairman tier — the penthouse whispered your name.",
    },
}


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


def next_tier(current_tier_id: str) -> TierDef | None:
    for idx, tier in enumerate(TIERS):
        if tier.id == current_tier_id and idx < len(TIERS) - 1:
            return TIERS[idx + 1]
    return None


def ensure_rewards(session: PlayerSession) -> RewardsState:
    if not hasattr(session, "rewards") or session.rewards is None:
        session.rewards = default_rewards_state()
    return session.rewards


def has_unredeemed_comp(rewards: RewardsState, comp_id: str) -> bool:
    return comp_id in rewards.unlocked_comps and comp_id not in rewards.redeemed_comps


def redeem_comp(rewards: RewardsState, comp_id: str) -> bool:
    if not has_unredeemed_comp(rewards, comp_id):
        return False
    rewards.redeemed_comps.append(comp_id)
    meta = COMP_CATALOG.get(comp_id, {})
    rewards.notifications.insert(0, {
        "title": "Comp Redeemed",
        "body": f"{meta.get('title', comp_id)} — enjoy, member.",
        "read": False,
    })
    return True


def progress_to_next_tier(rewards: RewardsState) -> dict:
    nxt = next_tier(rewards.tier)
    if nxt is None:
        return {"pct": 100, "next": None, "remaining": 0}
    current = tier_for_wagered(rewards.lifetime_wagered)
    span = nxt.min_wagered - current.min_wagered
    into = rewards.lifetime_wagered - current.min_wagered
    pct = min(100, round((into / span) * 100)) if span > 0 else 100
    return {"pct": pct, "next": nxt, "remaining": max(0, nxt.min_wagered - rewards.lifetime_wagered)}


def notify_tier_promotion(session_rewards: RewardsState, prev: int, new: int) -> list[str]:
    """Return titles of new tier notifications (CLI flavor)."""
    prev_tier = tier_for_wagered(prev)
    new_tier = tier_for_wagered(new)
    if new_tier.id == prev_tier.id:
        return []
    session_rewards.tier = new_tier.id
    if new_tier.comp and new_tier.comp not in session_rewards.unlocked_comps:
        session_rewards.unlocked_comps.append(new_tier.comp)
    comp_label = COMP_CATALOG.get(new_tier.comp or "", {}).get("title", "exclusive offers")
    from mandalay_bay.rewards_perks import get_tier_experience

    exp = get_tier_experience(new_tier.id)
    title = f"{new_tier.label} Tier Unlocked!"
    body = f"You've reached {new_tier.label} status."
    if new_tier.comp:
        body += f" New comp: {comp_label}."
    body += f" {exp.tagline}"
    session_rewards.notifications.insert(0, {"title": title, "body": body, "read": False})
    return [title]


def sync_rewards_from_wallet(session: PlayerSession) -> list[str]:
    """Sync lifetime wagered and tier comps from wallet ledger. Returns new notification titles."""
    rewards = ensure_rewards(session)
    total = total_wagered_from_wallet(session.wallet)
    prev = rewards.lifetime_wagered
    if total <= prev:
        return []
    rewards.lifetime_wagered = total
    return notify_tier_promotion(rewards, prev, total)


def migrate_session_rewards(session: PlayerSession, data_version: int) -> None:
    ensure_rewards(session)
    total = total_wagered_from_wallet(session.wallet)
    rewards = session.rewards
    assert rewards is not None
    rewards.lifetime_wagered = max(rewards.lifetime_wagered, total)
    rewards.tier = tier_for_wagered(rewards.lifetime_wagered).id
    if data_version < SAVE_VERSION_WITH_REWARDS and not rewards.notifications:
        rewards.notifications.append({
            "id": "welcome_enroll",
            "title": "Welcome to MGM Rewards",
            "body": "Your Sapphire membership is active. Play to earn comps!",
            "read": False,
        })
