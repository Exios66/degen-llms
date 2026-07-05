from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from blackjack.rng import SECURE_RANDOM

MARKET_CATEGORIES = [
    {"id": "sports-pulse", "label": "Sports Pulse"},
    {"id": "headlines", "label": "Headlines & Buzz"},
    {"id": "vegas", "label": "Vegas & Resort"},
    {"id": "sentiment", "label": "Public Sentiment"},
]

HEADLINE_TEMPLATES = [
    "Major award show produces a surprise winner tonight?",
    "Viral celebrity story breaks before midnight?",
    "Streaming platform hits #1 trending globally?",
    "Late-night monologue sparks national backlash?",
]

VEGAS_TEMPLATES = [
    "Strip foot traffic exceeds weekend forecast?",
    "Pool party attendance breaks venue record?",
    "High-roller salon fills every seat tonight?",
    "Fountain show crowd exceeds 10,000 viewers?",
]

SENTIMENT_TEMPLATES = [
    "Public poll swings toward the underdog?",
    "Social buzz peaks for the away side?",
    "Crowd favors the under on the main event?",
    "National sentiment shifts before kickoff?",
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
        })
    return markets


def _template_markets(category: str, templates: list[str], prefix: str) -> list[dict[str, Any]]:
    pool = templates[:]
    picked: list[str] = []
    while pool and len(picked) < 3:
        idx = SECURE_RANDOM.randrange(0, len(pool))
        picked.append(pool.pop(idx))
    markets: list[dict[str, Any]] = []
    for question in picked:
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
        })
    return markets


def generate_markets(events: list[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
    events = events or []
    markets = [
        *_sports_pulse_markets(events),
        *_template_markets("headlines", HEADLINE_TEMPLATES, "hb"),
        *_template_markets("vegas", VEGAS_TEMPLATES, "vg"),
        *_template_markets("sentiment", SENTIMENT_TEMPLATES, "ps"),
    ]
    return markets[:14]


def refresh_market_prices(markets: list[dict[str, Any]]) -> list[dict[str, Any]]:
    refreshed: list[dict[str, Any]] = []
    for m in markets:
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
