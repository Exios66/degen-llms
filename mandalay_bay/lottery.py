"""Lottery ticket products — pick games + scratchers."""

from __future__ import annotations

from dataclasses import dataclass

from blackjack.rng import SECURE_RANDOM

TICKET_TYPES = {
    "pick3": {
        "id": "pick3",
        "name": "Strip Pick 3",
        "price": 2,
        "digits": 3,
        "description": "Match 3 digits in order — 500:1 straight.",
    },
    "pick4": {
        "id": "pick4",
        "name": "Neon Pick 4",
        "price": 2,
        "digits": 4,
        "description": "Match 4 digits in order — 5,000:1 straight.",
    },
    "mega": {
        "id": "mega",
        "name": "Mandalay Mega",
        "price": 5,
        "balls": 5,
        "ball_max": 45,
        "mega_max": 20,
        "description": "5 balls (1–45) + Mega (1–20).",
    },
    "scratch_gold": {
        "id": "scratch_gold",
        "name": "Gold Rush Scratcher",
        "price": 5,
        "description": "Instant reveal — prizes up to 1,000×.",
    },
    "scratch_wild": {
        "id": "scratch_wild",
        "name": "Wild Card Scratcher",
        "price": 10,
        "description": "Higher stakes instant ticket — prizes up to 2,500×.",
    },
}


@dataclass(frozen=True, slots=True)
class TicketResult:
    ticket_id: str
    name: str
    price: int
    player_picks: list[int]
    draw: list[int]
    win: int
    reason: str


def _draw_digits(n: int) -> list[int]:
    return [SECURE_RANDOM.randint(0, 9) for _ in range(n)]


def _parse_digits(raw: str, n: int) -> list[int] | None:
    cleaned = "".join(ch for ch in raw.strip() if ch.isdigit())
    if len(cleaned) != n:
        return None
    return [int(ch) for ch in cleaned]


def quick_pick_digits(n: int) -> list[int]:
    return _draw_digits(n)


def quick_pick_mega() -> tuple[list[int], int]:
    balls: list[int] = []
    while len(balls) < 5:
        n = SECURE_RANDOM.randint(1, 45)
        if n not in balls:
            balls.append(n)
    balls.sort()
    mega = SECURE_RANDOM.randint(1, 20)
    return balls, mega


def resolve_pick3(picks: list[int], price: int = 2) -> TicketResult:
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
    return TicketResult("pick3", TICKET_TYPES["pick3"]["name"], price, picks, draw, win, reason)


def resolve_pick4(picks: list[int], price: int = 2) -> TicketResult:
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
    return TicketResult("pick4", TICKET_TYPES["pick4"]["name"], price, picks, draw, win, reason)


def resolve_mega(balls: list[int], mega: int, price: int = 5) -> TicketResult:
    draw_balls, draw_mega = quick_pick_mega()
    matched = len(set(balls) & set(draw_balls))
    mega_hit = mega == draw_mega
    # Simplified prize table
    table = {
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
    win = table.get((matched, mega_hit), 0)
    picks = [*balls, mega]
    draw = [*draw_balls, draw_mega]
    if win:
        reason = f"{matched}/5 + mega {'hit' if mega_hit else 'miss'} — {win:,} chips!"
    else:
        reason = f"{matched}/5 + mega {'hit' if mega_hit else 'miss'} — no prize."
    return TicketResult("mega", TICKET_TYPES["mega"]["name"], price, picks, draw, win, reason)


_SCRATCH_TIERS_GOLD = [
    (0.55, 0),
    (0.25, 5),
    (0.12, 15),
    (0.05, 50),
    (0.025, 200),
    (0.004, 1000),
    (0.001, 5000),
]

_SCRATCH_TIERS_WILD = [
    (0.50, 0),
    (0.25, 10),
    (0.14, 40),
    (0.07, 150),
    (0.03, 750),
    (0.008, 5000),
    (0.002, 25000),
]


def _scratch_prize(tiers: list[tuple[float, int]]) -> int:
    roll = SECURE_RANDOM.random()
    acc = 0.0
    for weight, prize in tiers:
        acc += weight
        if roll <= acc:
            return prize
    return 0


def resolve_scratcher(ticket_id: str) -> TicketResult:
    meta = TICKET_TYPES[ticket_id]
    price = int(meta["price"])
    tiers = _SCRATCH_TIERS_GOLD if ticket_id == "scratch_gold" else _SCRATCH_TIERS_WILD
    prize = _scratch_prize(tiers)
    symbols = [SECURE_RANDOM.choice(["★", "7", "💎", "$", "🍀", "X"]) for _ in range(3)]
    if prize > 0:
        reason = f"Scratch [{' '.join(symbols)}] — win {prize:,} chips!"
    else:
        reason = f"Scratch [{' '.join(symbols)}] — no prize."
    return TicketResult(ticket_id, meta["name"], price, [], [], prize, reason)


def parse_pick_input(raw: str, digits: int) -> list[int] | None:
    return _parse_digits(raw, digits)
