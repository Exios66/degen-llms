import { secureRandomInt } from "./core.js";

export const MARKET_CATEGORIES = [
  { id: "sports-pulse", label: "Sports Pulse" },
  { id: "headlines", label: "Headlines & Buzz" },
  { id: "vegas", label: "Vegas & Resort" },
  { id: "sentiment", label: "Public Sentiment" },
];

const HEADLINE_TEMPLATES = [
  "Major award show produces a surprise winner tonight?",
  "Viral celebrity story breaks before midnight?",
  "Streaming platform hits #1 trending globally?",
  "Late-night monologue sparks national backlash?",
];

const VEGAS_TEMPLATES = [
  "Strip foot traffic exceeds weekend forecast?",
  "Pool party attendance breaks venue record?",
  "High-roller salon fills every seat tonight?",
  "Fountain show crowd exceeds 10,000 viewers?",
];

const SENTIMENT_TEMPLATES = [
  "Public poll swings toward the underdog?",
  "Social buzz peaks for the away side?",
  "Crowd favors the under on the main event?",
  "National sentiment shifts before kickoff?",
];

function clampPrice(n) {
  return Math.max(5, Math.min(95, n));
}

function driftPrice(price) {
  const delta = secureRandomInt(-5, 5);
  return clampPrice(price + delta);
}

function makeMarketId(prefix) {
  return `${prefix}-${secureRandomInt(10000, 99999)}`;
}

function sportsPulseMarkets(events) {
  const markets = [];
  for (const event of events.slice(0, 4)) {
    if (event.eventType !== "game") continue;
    const fav = event.homeOdds < event.awayOdds ? event.home : event.away;
    const coverSide = event.spread !== 0 ? `${event.home} ${event.spread >= 0 ? "+" : ""}${event.spread}` : fav;
    const yesBase = event.homeOdds <= -130 ? 58 : event.homeOdds >= 130 ? 42 : 50;
    markets.push({
      marketId: makeMarketId("sp"),
      category: "sports-pulse",
      question: `${coverSide} covers tonight?`,
      yesPrice: yesBase,
      noPrice: 100 - yesBase,
      volume: secureRandomInt(800, 12000),
      linkedEventId: event.eventId,
      resolution: null,
    });
    markets.push({
      marketId: makeMarketId("sp"),
      category: "sports-pulse",
      question: `Total goes over ${event.total} in ${event.label}?`,
      yesPrice: clampPrice(48 + secureRandomInt(-8, 8)),
      noPrice: 0,
      volume: secureRandomInt(500, 9000),
      linkedEventId: event.eventId,
      resolution: null,
    });
  }
  for (const m of markets) {
    m.noPrice = 100 - m.yesPrice;
  }
  return markets;
}

function templateMarkets(category, templates, prefix) {
  const picked = [];
  const pool = [...templates];
  while (pool.length && picked.length < 3) {
    const idx = secureRandomInt(0, pool.length - 1);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked.map((question) => {
    const yesPrice = clampPrice(35 + secureRandomInt(0, 30));
    return {
      marketId: makeMarketId(prefix),
      category,
      question,
      yesPrice,
      noPrice: 100 - yesPrice,
      volume: secureRandomInt(1200, 25000),
      linkedEventId: null,
      resolution: null,
    };
  });
}

export function generateMarkets(events = []) {
  const markets = [
    ...sportsPulseMarkets(events),
    ...templateMarkets("headlines", HEADLINE_TEMPLATES, "hb"),
    ...templateMarkets("vegas", VEGAS_TEMPLATES, "vg"),
    ...templateMarkets("sentiment", SENTIMENT_TEMPLATES, "ps"),
  ];
  return markets.slice(0, 14);
}

export function refreshMarketPrices(markets) {
  return markets.map((m) => {
    const yesPrice = driftPrice(m.yesPrice);
    return { ...m, yesPrice, noPrice: 100 - yesPrice };
  });
}

export function predictionPayout(amount, priceCents) {
  if (priceCents <= 0) return 0;
  return Math.floor((amount * 100) / priceCents);
}

export function resolveMarket(market, events = []) {
  if (market.resolution) return market.resolution;

  let yesProb = market.yesPrice / 100;

  if (market.linkedEventId) {
    const event = events.find((e) => e.eventId === market.linkedEventId);
    if (event?.settled) {
      if (market.question.includes("covers")) {
        const margin = event.homeScore - event.awayScore;
        const covered = margin + event.spread > 0;
        return covered ? "yes" : "no";
      }
      if (market.question.includes("over")) {
        const combined = event.homeScore + event.awayScore;
        return combined > event.total ? "yes" : combined === event.total ? "push" : "no";
      }
    }
  }

  const roll = secureRandomInt(1, 100);
  const threshold = Math.round(yesProb * 100);
  return roll <= threshold ? "yes" : "no";
}

export function resolvePosition(position, resolution) {
  if (resolution === "push") {
    return { won: true, payout: position.amount, reason: "Push — stake returned" };
  }
  const won = position.side === resolution;
  if (won) {
    const payout = predictionPayout(position.amount, position.priceCents);
    return {
      won: true,
      payout,
      reason: `${position.side.toUpperCase()} resolves — ${payout.toLocaleString()} chips`,
    };
  }
  return { won: false, payout: 0, reason: `${position.side.toUpperCase()} did not resolve` };
}

export class PredictionMarketsState {
  constructor(data = null) {
    this.markets = [];
    this.positions = [];
    this.categoryFilter = "all";
    if (data) {
      this.markets = data.markets ?? [];
      this.positions = data.positions ?? [];
      this.categoryFilter = data.categoryFilter ?? "all";
    }
  }

  syncMarkets(events, force = false) {
    if (!this.markets.length || force) {
      this.markets = generateMarkets(events);
    }
  }

  refreshPrices() {
    this.markets = refreshMarketPrices(this.markets);
  }

  addPosition(position) {
    this.positions.push(position);
  }

  settleAll(events = []) {
    const results = [];
    for (const position of this.positions) {
      const market = this.markets.find((m) => m.marketId === position.marketId);
      if (!market) continue;
      const resolution = resolveMarket(market, events);
      market.resolution = resolution;
      const resolved = resolvePosition(position, resolution);
      results.push({ position, market, resolution, ...resolved });
    }
    const count = this.positions.length;
    this.positions = [];
    return { results, count };
  }

  getOpenPositionCount() {
    return this.positions.length;
  }

  toJSON() {
    return {
      markets: this.markets,
      positions: this.positions,
      categoryFilter: this.categoryFilter,
    };
  }

  static fromJSON(data) {
    if (!data) return new PredictionMarketsState();
    return new PredictionMarketsState(data);
  }
}

export function filterMarkets(markets, categoryFilter) {
  if (!categoryFilter || categoryFilter === "all") return markets;
  return markets.filter((m) => m.category === categoryFilter);
}

export function categoryLabel(categoryId) {
  return MARKET_CATEGORIES.find((c) => c.id === categoryId)?.label ?? categoryId;
}
