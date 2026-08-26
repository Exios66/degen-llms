"""Arcade Alley catalog — keep in sync with docs/js/arcade/catalog.js."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ArcadeCabinet:
    id: str
    title: str
    classic: str
    blurb: str
    cost: int
    controls: str


@dataclass(frozen=True, slots=True)
class RedeemOffer:
    id: str
    label: str
    cost_tickets: int
    kind: str  # chips | flag
    amount: int = 0
    flag: str | None = None


ARCADE_GAMES: tuple[ArcadeCabinet, ...] = (
    ArcadeCabinet(
        "strip_cross",
        "Strip Cross",
        "Frogger",
        "Dash across Las Vegas Blvd — limos, taxis, and tour groups don't stop.",
        5,
        "W/A/S/D move · reach the neon marquee",
    ),
    ArcadeCabinet(
        "neon_invaders",
        "Neon Invaders",
        "Space Invaders",
        "Blast descending neon signs before they swamp the Strip.",
        10,
        "A/D move · F fire",
    ),
    ArcadeCabinet(
        "high_roller_breakout",
        "High-Roller Breakout",
        "Breakout",
        "Chip ball, felt paddle, card-suit bricks — clear the salon wall.",
        10,
        "A/D paddle · F launch",
    ),
    ArcadeCabinet(
        "showgirl_beat",
        "Showgirl Beat",
        "Rhythm",
        "Match the kick / snare / hat sequence under the show lights.",
        15,
        "1 kick · 2 snare · 3 hat",
    ),
)

REDEEM_OFFERS: tuple[RedeemOffer, ...] = (
    RedeemOffer("chips_50", "Chip pack (+50)", 8, "chips", amount=50),
    RedeemOffer("chips_150", "High-roller pack (+150)", 20, "chips", amount=150),
    RedeemOffer("slot_voucher", "Free-spin voucher", 12, "flag", flag="arcade_slot_voucher"),
    RedeemOffer("welcome_refill", "Welcome drink refill", 6, "flag", flag="arcade_drink_refill"),
)

CABINETS = tuple((g.title, g.cost, g.blurb) for g in ARCADE_GAMES)

GAME_BY_ID = {g.id: g for g in ARCADE_GAMES}
OFFER_BY_ID = {o.id: o for o in REDEEM_OFFERS}


def tickets_from_score(score: int, *, cleared: bool = False) -> int:
    base = max(0, score) // 100
    return base + (2 if cleared else 0)


def payout_from_mult(cost: int, mult: float) -> int:
    m = max(0.0, min(3.0, float(mult)))
    return int(cost * m)
