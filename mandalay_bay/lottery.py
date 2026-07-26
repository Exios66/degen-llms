"""Lottery ticket products — pick games, Mega/Powerball draws, and scratchers."""

from __future__ import annotations

from dataclasses import dataclass

from blackjack.rng import SECURE_RANDOM
from mandalay_bay.stakes import get_tier_payout_boost

# Corrected Powerball-style ranges (docs / real lottery feel).
MEGA_BALLS = 5
MEGA_BALL_MAX = 70
MEGA_POWERBALL_MAX = 25

# Base Mega prize table at the retail $5 ticket price (prize_mult = 1).
_BASE_MEGA_TABLE = {
    (5, True): 250_000,
    (5, False): 25_000,
    (4, True): 2_500,
    (4, False): 500,
    (3, True): 150,
    (3, False): 25,
    (2, True): 20,
    (1, True): 10,
    (0, True): 5,
}

TICKET_TYPES = {
    "pick3": {
        "id": "pick3",
        "name": "Strip Pick 3",
        "price": 2,
        "kind": "pick",
        "digits": 3,
        "description": "Match 3 digits in order — 500:1 straight.",
    },
    "pick4": {
        "id": "pick4",
        "name": "Neon Pick 4",
        "price": 2,
        "kind": "pick",
        "digits": 4,
        "description": "Match 4 digits in order — 5,000:1 straight.",
    },
    "pick3_high": {
        "id": "pick3_high",
        "name": "High Limit Pick 3",
        "price": 25,
        "kind": "pick",
        "digits": 3,
        "description": "High-limit 3-digit draw — 500:1 straight on a $25 ticket.",
    },
    "pick4_high": {
        "id": "pick4_high",
        "name": "High Limit Pick 4",
        "price": 25,
        "kind": "pick",
        "digits": 4,
        "description": "High-limit 4-digit draw — 5,000:1 straight on a $25 ticket.",
    },
    "mega": {
        "id": "mega",
        "name": "Mandalay Mega",
        "price": 5,
        "kind": "mega",
        "balls": MEGA_BALLS,
        "ball_max": MEGA_BALL_MAX,
        "mega_max": MEGA_POWERBALL_MAX,
        "prize_mult": 1,
        "description": "5 lucky numbers (1–70) + Powerball (1–25).",
    },
    "mega_high": {
        "id": "mega_high",
        "name": "High Limit Mega",
        "price": 50,
        "kind": "mega",
        "balls": MEGA_BALLS,
        "ball_max": MEGA_BALL_MAX,
        "mega_max": MEGA_POWERBALL_MAX,
        "prize_mult": 10,
        "description": "High-limit Mega — 10× prize table, same 5+Powerball draw.",
    },
    "mega_salon": {
        "id": "mega_salon",
        "name": "Salon Powerball",
        "price": 500,
        "kind": "mega",
        "balls": MEGA_BALLS,
        "ball_max": MEGA_BALL_MAX,
        "mega_max": MEGA_POWERBALL_MAX,
        "prize_mult": 100,
        "description": "Salon Powerball — 100× prizes for high rollers.",
    },
    "scratch_gold": {
        "id": "scratch_gold",
        "name": "Gold Rush Scratcher",
        "price": 5,
        "kind": "scratch",
        "description": "Instant reveal — prizes up to 1,000×.",
    },
    "scratch_wild": {
        "id": "scratch_wild",
        "name": "Wild Card Scratcher",
        "price": 10,
        "kind": "scratch",
        "description": "Higher stakes instant ticket — prizes up to 2,500×.",
    },
    "scratch_platinum": {
        "id": "scratch_platinum",
        "name": "Platinum Scratcher",
        "price": 50,
        "kind": "scratch",
        "description": "Premium instant ticket — prizes up to 100,000 chips.",
    },
    "scratch_diamond": {
        "id": "scratch_diamond",
        "name": "Diamond Scratcher",
        "price": 250,
        "kind": "scratch",
        "description": "Salon scratcher — prizes up to 500,000 chips.",
    },
}

TICKET_ORDER = [
    "pick3",
    "pick4",
    "mega",
    "scratch_gold",
    "scratch_wild",
    "pick3_high",
    "pick4_high",
    "mega_high",
    "scratch_platinum",
    "mega_salon",
    "scratch_diamond",
]


@dataclass(frozen=True, slots=True)
class TicketResult:
    ticket_id: str
    name: str
    price: int
    player_picks: list[int]
    draw: list[int]
    win: int
    reason: str
    symbols: list[str] | None = None


def lottery_tier_scale(tier_id: str | None) -> float:
    """Stake-tier multiplier applied to ticket price and fixed prize tables."""
    if not tier_id:
        return 1.0
    return float(get_tier_payout_boost(tier_id))


def scaled_ticket_price(base_price: int, tier_id: str | None = None) -> int:
    scale = lottery_tier_scale(tier_id)
    return max(1, int(round(base_price * scale)))


def scale_fixed_prize(prize: int, tier_id: str | None = None) -> int:
    if prize <= 0:
        return 0
    return max(0, int(round(prize * lottery_tier_scale(tier_id))))


def ticket_kind(ticket_id: str) -> str:
    return str(TICKET_TYPES[ticket_id]["kind"])


def _draw_digits(n: int) -> list[int]:
    return [SECURE_RANDOM.randint(0, 9) for _ in range(n)]


def _parse_digits(raw: str, n: int) -> list[int] | None:
    cleaned = "".join(ch for ch in raw.strip() if ch.isdigit())
    if len(cleaned) != n:
        return None
    return [int(ch) for ch in cleaned]


def quick_pick_digits(n: int) -> list[int]:
    return _draw_digits(n)


def quick_pick_mega(
    ball_max: int = MEGA_BALL_MAX,
    mega_max: int = MEGA_POWERBALL_MAX,
    balls: int = MEGA_BALLS,
) -> tuple[list[int], int]:
    chosen: list[int] = []
    while len(chosen) < balls:
        n = SECURE_RANDOM.randint(1, ball_max)
        if n not in chosen:
            chosen.append(n)
    chosen.sort()
    mega = SECURE_RANDOM.randint(1, mega_max)
    return chosen, mega


def validate_mega_picks(
    balls: list[int],
    powerball: int,
    *,
    ball_max: int = MEGA_BALL_MAX,
    mega_max: int = MEGA_POWERBALL_MAX,
    count: int = MEGA_BALLS,
) -> str | None:
    """Return an error message if picks are invalid, else None."""
    if len(balls) != count or len(set(balls)) != count:
        return f"Need exactly {count} unique lucky numbers from 1–{ball_max}."
    if any(b < 1 or b > ball_max for b in balls):
        return f"Lucky numbers must be between 1 and {ball_max}."
    if powerball < 1 or powerball > mega_max:
        return f"Powerball must be between 1 and {mega_max}."
    return None


def resolve_pick3(picks: list[int], price: int = 2, *, ticket_id: str = "pick3") -> TicketResult:
    meta = TICKET_TYPES[ticket_id]
    draw = _draw_digits(3)
    if picks == draw:
        win = price * 500
        reason = f"Straight hit {' '.join(map(str, draw))} — {win:,} chips!"
    elif sorted(picks) == sorted(draw):
        win = price * 80
        reason = f"Box hit {' '.join(map(str, draw))} — {win:,} chips!"
    else:
        win = 0
        reason = f"Draw {' '.join(map(str, draw))} — no match."
    return TicketResult(ticket_id, str(meta["name"]), price, picks, draw, win, reason)


def resolve_pick4(picks: list[int], price: int = 2, *, ticket_id: str = "pick4") -> TicketResult:
    meta = TICKET_TYPES[ticket_id]
    draw = _draw_digits(4)
    if picks == draw:
        win = price * 5000
        reason = f"Straight hit {' '.join(map(str, draw))} — {win:,} chips!"
    elif sorted(picks) == sorted(draw):
        win = price * 200
        reason = f"Box hit {' '.join(map(str, draw))} — {win:,} chips!"
    else:
        win = 0
        reason = f"Draw {' '.join(map(str, draw))} — no match."
    return TicketResult(ticket_id, str(meta["name"]), price, picks, draw, win, reason)


def resolve_mega(
    balls: list[int],
    mega: int,
    price: int = 5,
    *,
    ticket_id: str = "mega",
    tier_id: str | None = None,
) -> TicketResult:
    meta = TICKET_TYPES[ticket_id]
    ball_max = int(meta.get("ball_max", MEGA_BALL_MAX))
    mega_max = int(meta.get("mega_max", MEGA_POWERBALL_MAX))
    prize_mult = int(meta.get("prize_mult", 1))
    draw_balls, draw_mega = quick_pick_mega(ball_max=ball_max, mega_max=mega_max)
    matched = len(set(balls) & set(draw_balls))
    mega_hit = mega == draw_mega
    base_win = _BASE_MEGA_TABLE.get((matched, mega_hit), 0)
    win = scale_fixed_prize(base_win * prize_mult, tier_id)
    picks = [*balls, mega]
    draw = [*draw_balls, draw_mega]
    pb_label = "Powerball"
    if win:
        reason = (
            f"{matched}/5 + {pb_label} {'hit' if mega_hit else 'miss'} — {win:,} chips!"
        )
    else:
        reason = (
            f"{matched}/5 + {pb_label} {'hit' if mega_hit else 'miss'} — no prize."
        )
    return TicketResult(ticket_id, str(meta["name"]), price, picks, draw, win, reason)


_SCRATCH_TIERS = {
    "scratch_gold": [
        (0.55, 0),
        (0.25, 5),
        (0.12, 15),
        (0.05, 50),
        (0.025, 200),
        (0.004, 1000),
        (0.001, 5000),
    ],
    "scratch_wild": [
        (0.50, 0),
        (0.25, 10),
        (0.14, 40),
        (0.07, 150),
        (0.03, 750),
        (0.008, 5000),
        (0.002, 25000),
    ],
    "scratch_platinum": [
        (0.48, 0),
        (0.24, 50),
        (0.15, 200),
        (0.08, 1000),
        (0.035, 5000),
        (0.012, 25000),
        (0.003, 100000),
    ],
    "scratch_diamond": [
        (0.45, 0),
        (0.25, 250),
        (0.16, 1000),
        (0.08, 5000),
        (0.04, 25000),
        (0.015, 100000),
        (0.005, 500000),
    ],
}


def _scratch_prize(tiers: list[tuple[float, int]]) -> int:
    roll = SECURE_RANDOM.random()
    acc = 0.0
    for weight, prize in tiers:
        acc += weight
        if roll <= acc:
            return prize
    return 0


def resolve_scratcher(
    ticket_id: str,
    *,
    tier_id: str | None = None,
    price: int | None = None,
) -> TicketResult:
    meta = TICKET_TYPES[ticket_id]
    charged = (
        price
        if price is not None
        else scaled_ticket_price(int(meta["price"]), tier_id)
    )
    tiers = _SCRATCH_TIERS[ticket_id]
    prize = scale_fixed_prize(_scratch_prize(tiers), tier_id)
    symbols = [SECURE_RANDOM.choice(["★", "7", "💎", "$", "🍀", "X"]) for _ in range(3)]
    if prize > 0:
        reason = f"Scratch [{' '.join(symbols)}] — win {prize:,} chips!"
    else:
        reason = f"Scratch [{' '.join(symbols)}] — no prize."
    return TicketResult(
        ticket_id, str(meta["name"]), charged, [], [], prize, reason, symbols=symbols
    )


def parse_pick_input(raw: str, digits: int) -> list[int] | None:
    return _parse_digits(raw, digits)


def classify_lottery_win(win: int, price: int) -> str | None:
    if win <= 0:
        return None
    if win >= price * 1000 or win >= 100_000:
        return "jackpot"
    if win >= price * 50 or win >= 1_000:
        return "big"
    return "small"
