"""Floor-wide stake tiers for slots and table games."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class StakeTier:
    id: str
    name: str
    description: str
    min_bet: int
    max_bet: int | None  # None = no table cap (wallet only)


# Average U.S. 401(k) employee deferral ≈ $542/month (~$6,500/year).
_401K_MIN = 542
_401K_MAX = 6_500
_NO_LIMIT_MIN = 2_500


STAKE_TIERS: dict[str, StakeTier] = {
    "penny": StakeTier(
        id="penny",
        name="Penny & Low Limit",
        description="Micro stakes — $1–$25 per wager.",
        min_bet=1,
        max_bet=25,
    ),
    "standard": StakeTier(
        id="standard",
        name="Standard",
        description="Main floor limits — $5–$100 per wager.",
        min_bet=5,
        max_bet=100,
    ),
    "high_limit": StakeTier(
        id="high_limit",
        name="High Limit",
        description="High-limit room — $25–$500 per wager.",
        min_bet=25,
        max_bet=500,
    ),
    "401k_contribution": StakeTier(
        id="401k_contribution",
        name="401K Contribution",
        description=f"Average employee deferral — ${_401K_MIN:,}/mo style (${_401K_MAX:,}/yr cap).",
        min_bet=_401K_MIN,
        max_bet=_401K_MAX,
    ),
    "no_limit": StakeTier(
        id="no_limit",
        name="High Roller / No Limit",
        description="Salon stakes — minimum table bet, no maximum (bankroll only).",
        min_bet=_NO_LIMIT_MIN,
        max_bet=None,
    ),
}

TIER_ORDER = [
    "penny",
    "standard",
    "high_limit",
    "401k_contribution",
    "no_limit",
]


def get_tier(tier_id: str) -> StakeTier:
    return STAKE_TIERS[tier_id]


# Payout multiplier applied on top of machine paytables for each tier.
# Higher-intensity tiers earn significantly larger returns per winning spin.
TIER_PAYOUT_BOOST: dict[str, float] = {
    "penny":              1.0,   # baseline
    "standard":           2.0,   # 2× base multipliers
    "high_limit":         4.0,   # 4× base multipliers
    "401k_contribution":  8.0,   # 8× base multipliers
    "no_limit":          15.0,   # 15× base multipliers — salon scale
}


def get_tier_payout_boost(tier_id: str) -> float:
    """Payout multiplier for the given tier (1.0 if tier is unknown)."""
    return TIER_PAYOUT_BOOST.get(tier_id, 1.0)


def tier_uses_salon_limits(tier: StakeTier) -> bool:
    """Salon tiers ignore per-machine max caps."""
    return tier.id in ("401k_contribution", "no_limit")


def effective_max_bet(tier: StakeTier, balance: int) -> int:
    if tier.max_bet is None:
        return balance
    return min(tier.max_bet, balance)


def effective_table_stakes(tier: StakeTier, balance: int, *, activity_min: int = 1) -> tuple[int, int]:
    """Min/max for table games and sports wagers at a stake tier."""
    min_bet = max(activity_min, tier.min_bet)
    max_bet = effective_max_bet(tier, balance)
    return min_bet, max(min_bet, max_bet)


def effective_slot_stakes(
    machine_min: int,
    machine_max: int,
    tier: StakeTier,
    balance: int,
) -> tuple[int, int]:
    """Min/max spin for a slot machine at a stake tier."""
    min_bet = max(machine_min, tier.min_bet)
    if tier.max_bet is None:
        max_bet = balance
    elif tier_uses_salon_limits(tier):
        max_bet = min(tier.max_bet, balance)
    else:
        max_bet = min(machine_max, tier.max_bet, balance)
    return min_bet, max(min_bet, max_bet)


def format_stake_range(min_bet: int, max_bet: int, *, no_cap: bool = False) -> str:
    if no_cap or max_bet >= 1_000_000:
        return f"{min_bet:,}+ chips (no limit)"
    if min_bet == max_bet:
        return f"{min_bet:,} chips"
    return f"{min_bet:,}-{max_bet:,} chips"


def format_tier_label(tier: StakeTier, balance: int) -> str:
    max_bet = effective_max_bet(tier, balance)
    no_cap = tier.max_bet is None
    stake = format_stake_range(tier.min_bet, max_bet, no_cap=no_cap)
    return f"{tier.name} ({stake})"


def pick_stake_tier(session, ui, *, title: str = "Choose stake tier:") -> StakeTier | None:
    """Prompt for a stake tier; returns None if the player backs out."""
    balance = session.wallet.balance
    labels = []
    for tid in TIER_ORDER:
        tier = STAKE_TIERS[tid]
        if balance < tier.min_bet:
            labels.append(f"{tier.name} — requires {tier.min_bet:,} chips")
        else:
            labels.append(format_tier_label(tier, balance))
    choice = ui.menu_choice(labels, title=title)
    if choice == 0:
        return None
    tier = STAKE_TIERS[TIER_ORDER[choice - 1]]
    if balance < tier.min_bet:
        ui.error(f"You need at least {tier.min_bet:,} chips for {tier.name}.")
        ui.pause()
        return None
    return tier
