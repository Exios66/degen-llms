from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from blackjack.rng import SECURE_RANDOM

MARKET_CATEGORIES = [
    {"id": "sports-pulse", "label": "Sports Pulse"},
    {"id": "history", "label": "History Desk"},
    {"id": "headlines", "label": "Headlines & Buzz"},
    {"id": "vegas", "label": "Vegas & Resort"},
    {"id": "sentiment", "label": "Public Sentiment"},
    {"id": "easter-eggs", "label": "Easter Eggs"},
]

# Deterministic history markets — settle to known outcomes (knowledge edge).
HISTORY_MARKETS = [
    {
        "question": "Did Apollo 11 land humans on the Moon in July 1969?",
        "resolution": "yes",
        "yesPrice": 88,
        "blurb": "Neil Armstrong & Buzz Aldrin — Sea of Tranquility.",
    },
    {
        "question": "Did the Berlin Wall fall in 1989?",
        "resolution": "yes",
        "yesPrice": 86,
        "blurb": "November 9, 1989 — checkpoints opened overnight.",
    },
    {
        "question": "Did the 'Miracle on Ice' (USA over USSR) happen at Lake Placid 1980?",
        "resolution": "yes",
        "yesPrice": 84,
        "blurb": "Feb 22, 1980 — amateur US hockey shocked the Soviets.",
    },
    {
        "question": "Was the Titanic's maiden voyage completed successfully in 1912?",
        "resolution": "no",
        "yesPrice": 12,
        "blurb": "Struck an iceberg April 14–15, 1912; ship did not finish the crossing.",
    },
    {
        "question": "Did the Wright brothers achieve powered flight at Kitty Hawk in 1903?",
        "resolution": "yes",
        "yesPrice": 90,
        "blurb": "December 17, 1903 — first controlled powered airplane flight.",
    },
    {
        "question": "Did the Cuban Missile Crisis end with a US invasion of Cuba?",
        "resolution": "no",
        "yesPrice": 18,
        "blurb": "Resolved via naval quarantine and Soviet missile withdrawal (1962).",
    },
    {
        "question": "Was Shakespeare historically proven to be a woman writing under a pen name?",
        "resolution": "no",
        "yesPrice": 8,
        "blurb": "Authorship debates persist; mainstream history attributes the works to William Shakespeare.",
    },
    {
        "question": "Did Napoleon win the Battle of Waterloo (1815)?",
        "resolution": "no",
        "yesPrice": 15,
        "blurb": "Defeated by Wellington and Blücher — ended the Hundred Days.",
    },
    {
        "question": "Did the US formally enter WWII after Pearl Harbor (Dec 1941)?",
        "resolution": "yes",
        "yesPrice": 92,
        "blurb": "Congress declared war on Japan December 8, 1941.",
    },
    {
        "question": "Was the original Woodstock festival held in 1999?",
        "resolution": "no",
        "yesPrice": 10,
        "blurb": "Woodstock '69 — Bethel, New York. 1999 was a later revival.",
    },
    {
        "question": "Did the first Super Bowl take place before 1970?",
        "resolution": "yes",
        "yesPrice": 78,
        "blurb": "Super Bowl I — January 15, 1967 (Packers over Chiefs).",
    },
    {
        "question": "Did Prohibition in the United States end with the 21st Amendment?",
        "resolution": "yes",
        "yesPrice": 85,
        "blurb": "Ratified December 5, 1933 — repealed the 18th Amendment.",
    },
]

HEADLINE_TEMPLATES = [
    "Major award show produces a surprise winner tonight?",
    "Viral celebrity story breaks before midnight?",
    "Streaming platform hits #1 trending globally?",
    "Late-night monologue sparks national backlash?",
    "A tech keynote announces a product nobody expected?",
]

VEGAS_TEMPLATES = [
    "Strip foot traffic exceeds weekend forecast?",
    "Pool party attendance breaks venue record?",
    "High-roller salon fills every seat tonight?",
    "Fountain show crowd exceeds 10,000 viewers?",
    "A wedding party books the entire shark-reef overlook?",
]

SENTIMENT_TEMPLATES = [
    "Public poll swings toward the underdog?",
    "Social buzz peaks for the away side?",
    "Crowd favors the under on the main event?",
    "National sentiment shifts before kickoff?",
]

EASTER_EGG_TEMPLATES = [
    "A pigeon steals a $25 chip from the high-limit salon tonight?",
    "The Mandalay Bay shark tank contains at least one shark thinking about blackjack?",
    "Steve Harvey's survey board correctly predicts a roulette spin?",
    "A guest tries to tip the dealer in casino points instead of chips?",
    "The sportsbook espresso machine gains sentience and fades the public?",
    "Someone asks if the horse-racing pavilion takes crypto pigeons?",
    "A slot machine pays a progressive in Monopoly money (it doesn't clear)?",
    "The volcano show apologizes to a tourist for being 'too lava'?",
    "A craps shooter names their dice after Supreme Court justices?",
    "An LLM writes a perfect parlay and then fades itself?",
    "The neon 'OPEN' sign winks in Morse code spelling '7-out'?",
    "A lottery scratcher reveals three identical philosophical questions?",
]


def _clamp_price(n: int) -> int:
    return max(5, min(95, n))


def _drift_price(price: int) -> int:
    return _clamp_price(price + SECURE_RANDOM.randint(-5, 5))


def _make_market_id(prefix: str) -> str:
    return f"{prefix}-{SECURE_RANDOM.randrange(10000, 99999)}"


def _sports_pulse_markets(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    markets: list[dict[str, Any]] = []
    for event in events[:4]:
        if event.get("eventType") != "game":
            continue
        fav = event["home"] if event["homeOdds"] < event["awayOdds"] else event["away"]
        cover_side = (
            f"{event['home']} {event['spread']:+.1f}" if event["spread"] != 0 else fav
        )
        yes_base = 58 if event["homeOdds"] <= -130 else 42 if event["homeOdds"] >= 130 else 50
        markets.append({
            "marketId": _make_market_id("sp"),
            "category": "sports-pulse",
            "question": f"{cover_side} covers tonight?",
            "yesPrice": yes_base,
            "noPrice": 100 - yes_base,
            "volume": SECURE_RANDOM.randint(800, 12000),
            "linkedEventId": event["eventId"],
            "resolution": None,
            "fixedResolution": None,
            "blurb": None,
        })
        yes = _clamp_price(48 + SECURE_RANDOM.randint(-8, 8))
        markets.append({
            "marketId": _make_market_id("sp"),
            "category": "sports-pulse",
            "question": f"Total goes over {event['total']} in {event['label']}?",
            "yesPrice": yes,
            "noPrice": 100 - yes,
            "volume": SECURE_RANDOM.randint(500, 9000),
            "linkedEventId": event["eventId"],
            "resolution": None,
            "fixedResolution": None,
            "blurb": None,
        })
    return markets


def _history_markets(count: int = 4) -> list[dict[str, Any]]:
    pool = HISTORY_MARKETS[:]
    SECURE_RANDOM.shuffle(pool)
    markets: list[dict[str, Any]] = []
    for item in pool[:count]:
        yes = _clamp_price(item["yesPrice"] + SECURE_RANDOM.randint(-4, 4))
        markets.append({
            "marketId": _make_market_id("hx"),
            "category": "history",
            "question": item["question"],
            "yesPrice": yes,
            "noPrice": 100 - yes,
            "volume": SECURE_RANDOM.randint(4000, 40000),
            "linkedEventId": None,
            "resolution": None,
            "fixedResolution": item["resolution"],
            "blurb": item.get("blurb"),
        })
    return markets


def _template_markets(
    category: str,
    templates: list[str],
    prefix: str,
    *,
    count: int = 3,
) -> list[dict[str, Any]]:
    pool = templates[:]
    picked: list[str] = []
    while pool and len(picked) < count:
        idx = SECURE_RANDOM.randrange(0, len(pool))
        picked.append(pool.pop(idx))
    markets: list[dict[str, Any]] = []
    for question in picked:
        # Easter eggs skew cheaper YES for comedy longshots
        if category == "easter-eggs":
            yes_price = _clamp_price(8 + SECURE_RANDOM.randint(0, 22))
        else:
            yes_price = _clamp_price(35 + SECURE_RANDOM.randint(0, 30))
        markets.append({
            "marketId": _make_market_id(prefix),
            "category": category,
            "question": question,
            "yesPrice": yes_price,
            "noPrice": 100 - yes_price,
            "volume": SECURE_RANDOM.randint(1200, 25000),
            "linkedEventId": None,
            "resolution": None,
            "fixedResolution": None,
            "blurb": None,
        })
    return markets


def generate_markets(events: list[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
    events = events or []
    markets = [
        *_sports_pulse_markets(events),
        *_history_markets(4),
        *_template_markets("headlines", HEADLINE_TEMPLATES, "hb", count=2),
        *_template_markets("vegas", VEGAS_TEMPLATES, "vg", count=2),
        *_template_markets("sentiment", SENTIMENT_TEMPLATES, "ps", count=2),
        *_template_markets("easter-eggs", EASTER_EGG_TEMPLATES, "ee", count=4),
    ]
    return markets[:20]


def refresh_market_prices(markets: list[dict[str, Any]]) -> list[dict[str, Any]]:
    refreshed: list[dict[str, Any]] = []
    for m in markets:
        # History desk prices drift less — "smart money" is sticky.
        if m.get("category") == "history":
            yes_price = _clamp_price(m["yesPrice"] + SECURE_RANDOM.randint(-2, 2))
        else:
            yes_price = _drift_price(m["yesPrice"])
        refreshed.append({**m, "yesPrice": yes_price, "noPrice": 100 - yes_price})
    return refreshed


def prediction_payout(amount: int, price_cents: int) -> int:
    if price_cents <= 0:
        return 0
    return (amount * 100) // price_cents


def resolve_market(market: dict[str, Any], events: list[dict[str, Any]] | None = None) -> str:
    if market.get("resolution"):
        return market["resolution"]

    # Historical markets resolve to the recorded truth.
    fixed = market.get("fixedResolution")
    if fixed in ("yes", "no", "push"):
        return fixed

    events = events or []
    yes_prob = market["yesPrice"] / 100

    if market.get("linkedEventId"):
        event = next((e for e in events if e["eventId"] == market["linkedEventId"]), None)
        if event and event.get("settled"):
            if "covers" in market["question"]:
                margin = event["homeScore"] - event["awayScore"]
                return "yes" if margin + event["spread"] > 0 else "no"
            if "over" in market["question"]:
                combined = event["homeScore"] + event["awayScore"]
                if combined > event["total"]:
                    return "yes"
                if combined == event["total"]:
                    return "push"
                return "no"

    threshold = round(yes_prob * 100)
    roll = SECURE_RANDOM.randint(1, 100)
    return "yes" if roll <= threshold else "no"


def resolve_position(position: dict[str, Any], resolution: str) -> dict[str, Any]:
    if resolution == "push":
        return {"won": True, "payout": position["amount"], "reason": "Push — stake returned"}
    won = position["side"] == resolution
    if won:
        payout = prediction_payout(position["amount"], position["priceCents"])
        return {
            "won": True,
            "payout": payout,
            "reason": f"{position['side'].upper()} resolves — {payout:,} chips",
        }
    return {"won": False, "payout": 0, "reason": f"{position['side'].upper()} did not resolve"}


def category_label(category_id: str) -> str:
    for cat in MARKET_CATEGORIES:
        if cat["id"] == category_id:
            return cat["label"]
    return category_id


def filter_markets(markets: list[dict[str, Any]], category_filter: str) -> list[dict[str, Any]]:
    if not category_filter or category_filter == "all":
        return markets
    return [m for m in markets if m["category"] == category_filter]


@dataclass
class PredictionMarketsState:
    markets: list[dict[str, Any]] = field(default_factory=list)
    positions: list[dict[str, Any]] = field(default_factory=list)
    category_filter: str = "all"

    def sync_markets(self, events: list[dict[str, Any]], force: bool = False) -> None:
        if not self.markets or force:
            self.markets = generate_markets(events)

    def settle_all(self, events: list[dict[str, Any]] | None = None) -> tuple[list[dict[str, Any]], int]:
        events = events or []
        results: list[dict[str, Any]] = []
        for position in self.positions:
            market = next((m for m in self.markets if m["marketId"] == position["marketId"]), None)
            if not market:
                continue
            resolution = resolve_market(market, events)
            market["resolution"] = resolution
            result = resolve_position(position, resolution)
            results.append({"position": position, "market": market, "resolution": resolution, **result})
        count = len(self.positions)
        self.positions = []
        return results, count
