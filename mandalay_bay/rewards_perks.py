"""MGM Rewards tier experience — speed, satirical perks, pit-boss hospitality."""

from __future__ import annotations

from dataclasses import dataclass

from mandalay_bay.rewards import TIERS, tier_for_wagered


@dataclass(frozen=True, slots=True)
class TierExperience:
    id: str
    label: str
    speed_multiplier: float
    tagline: str
    monthly_amortized_cost: str
    perks: tuple[str, ...]
    pit_boss_line: str
    pit_topup_chance: float
    pit_topup_min: int
    pit_topup_max: int


TIER_EXPERIENCE: dict[str, TierExperience] = {
    "sapphire": TierExperience(
        id="sapphire",
        label="Sapphire",
        speed_multiplier=1.0,
        tagline="Standard digital Vegas — walking shoes required.",
        monthly_amortized_cost="$0 (you are the product)",
        perks=(
            "Public casino floor access",
            "Standard buffet line (45–90 min)",
            "Generic dealer small talk",
            "Pit bosses nod politely and forget your face",
        ),
        pit_boss_line="Pit bosses nod politely and forget your face.",
        pit_topup_chance=0.0,
        pit_topup_min=0,
        pit_topup_max=0,
    ),
    "pearl": TierExperience(
        id="pearl",
        label="Pearl",
        speed_multiplier=0.82,
        tagline="Express lanes unlock — still satirically overpriced.",
        monthly_amortized_cost="$1,847/mo (waived with $500 lifetime handle)",
        perks=(
            "Pool cabana — 20% off ($890/day → $712/day)",
            "Priority slot-aisle foot traffic",
            "Betty's Bar remembers your usual (it's water)",
            "Pit bosses say \"hey\" twice per visit",
        ),
        pit_boss_line="Pit bosses say \"hey\" and slide you a $25 voucher if you look sad.",
        pit_topup_chance=0.04,
        pit_topup_min=25,
        pit_topup_max=75,
    ),
    "gold": TierExperience(
        id="gold",
        label="Gold",
        speed_multiplier=0.68,
        tagline="VIP elevator energy — the line moves when you're comped.",
        monthly_amortized_cost="$8,400/mo (comped with buffet loyalty)",
        perks=(
            "House of Blues — priority line for Gold+",
            "Buffet comp — host seats you near the crab legs",
            "Dedicated cocktail server (shared with 40 tables)",
            "Pit bosses know your game and your zodiac sign",
        ),
        pit_boss_line="Pit bosses comp your drink and ask if you're \"heating up.\"",
        pit_topup_chance=0.08,
        pit_topup_min=50,
        pit_topup_max=150,
    ),
    "platinum": TierExperience(
        id="platinum",
        label="Platinum",
        speed_multiplier=0.52,
        tagline="Limo from parking — because your time is worth $890/hour.",
        monthly_amortized_cost="$34,000/mo (narratively comped)",
        perks=(
            "Spa day — comped upgrade for Platinum+",
            "Chauffeured fleet from valet to slot machine",
            "Room night comp — hallway puzzle optional",
            "Pit bosses greet you by first name",
        ),
        pit_boss_line="Pit bosses greet you by name and bump your table limit \"just this once.\"",
        pit_topup_chance=0.14,
        pit_topup_min=100,
        pit_topup_max=400,
    ),
    "noir": TierExperience(
        id="noir",
        label="Noir",
        speed_multiplier=0.36,
        tagline="Foundation Room access — darkness has a cover charge.",
        monthly_amortized_cost="$142,000/mo (invisible on the folio)",
        perks=(
            "Foundation Room — Noir members only",
            "Personal driver on retainer (shared Tesla, exclusive attitude)",
            "Private salon tables when the floor is slow",
            "Recreational herb concierge — \"farm-to-lounge\"",
            "Pit bosses text you good luck emojis",
        ),
        pit_boss_line="Pit bosses text you before bad beats and comp the aftermath.",
        pit_topup_chance=0.22,
        pit_topup_min=250,
        pit_topup_max=1200,
    ),
    "chairman": TierExperience(
        id="chairman",
        label="Chairman",
        speed_multiplier=0.18,
        tagline="The utmost premium digital Las Vegas experience.",
        monthly_amortized_cost="$847,000/mo (fully comped, spiritually)",
        perks=(
            "24/7 chauffeured fleet — driver knows your playlist",
            "Personal chef — tasting menu between spins",
            "Private high-limit games — just you and the house",
            "Companionship concierge — hottest baddies, NDAs included",
            "State-sanctioned recreational herb sommelier",
            "Full bottle service at every pixel",
            "Pit bosses fist-bump, comp losses, ask about your portfolio",
        ),
        pit_boss_line="Pit bosses fist-bump you, comp your losses, and ask about your portfolio.",
        pit_topup_chance=0.38,
        pit_topup_min=500,
        pit_topup_max=5000,
    ),
}


RESORT_OFFERS: tuple[dict[str, str | int], ...] = (
    {
        "title": "Pool cabana — 20% off",
        "detail": "Pearl+ — still $712/day. Infinity edge, finite patience.",
        "min_tier_index": 1,
    },
    {
        "title": "House of Blues — priority line",
        "detail": "Gold+ — skip 200 people who also paid for priority.",
        "min_tier_index": 2,
    },
    {
        "title": "Spa day — comped upgrade",
        "detail": "Platinum+ — hot stone, cold invoice (waived).",
        "min_tier_index": 3,
    },
    {
        "title": "Foundation Room — members only",
        "detail": "Noir+ — velvet rope, recreational herb menu, no photos.",
        "min_tier_index": 4,
    },
    {
        "title": "Chairman fantasy package",
        "detail": "Drivers, chefs, private games, bottle service, pit-boss love.",
        "min_tier_index": 5,
    },
)


def get_tier_experience(tier_id: str) -> TierExperience:
    return TIER_EXPERIENCE.get(tier_id, TIER_EXPERIENCE["sapphire"])


def get_tier_experience_for_wagered(lifetime_wagered: int) -> TierExperience:
    return get_tier_experience(tier_for_wagered(lifetime_wagered).id)


def scale_delay(base_ms: int, tier_id: str) -> int:
    exp = get_tier_experience(tier_id)
    return max(80, round(base_ms * exp.speed_multiplier))


def activity_timing(tier_id: str) -> dict[str, int]:
    """Standard animation delays scaled by tier (lower ms = faster VIP)."""
    mult = get_tier_experience(tier_id).speed_multiplier
    return {
        "speed_multiplier": mult,
        "slots_reel_1": max(80, round(350 * mult)),
        "slots_reel_2": max(160, round(700 * mult)),
        "slots_reel_3": max(240, round(1050 * mult)),
        "roulette_spin": max(200, round(1200 * mult)),
    }


def tier_index(tier_id: str) -> int:
    for idx, tier in enumerate(TIERS):
        if tier.id == tier_id:
            return idx
    return 0


def maybe_pit_boss_topup(tier_id: str, loss_amount: int, roll: float) -> int | None:
    """Return free-play chip amount if pit boss comps the loss (roll in 0..1)."""
    if loss_amount <= 0:
        return None
    exp = get_tier_experience(tier_id)
    if exp.pit_topup_chance <= 0 or roll >= exp.pit_topup_chance:
        return None
    if exp.pit_topup_max <= 0:
        return None
    span = exp.pit_topup_max - exp.pit_topup_min
    amount_roll = min(0.999999, roll / exp.pit_topup_chance)
    return exp.pit_topup_min + int(amount_roll * (span + 1))
