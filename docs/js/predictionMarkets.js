import { secureRandomInt } from "./core.js";

export const MARKET_CATEGORIES = [
  { id: "sports-pulse", label: "Sports Pulse" },
  { id: "history", label: "History Desk" },
  { id: "headlines", label: "Headlines & Buzz" },
  { id: "vegas", label: "Vegas & Resort" },
  { id: "sentiment", label: "Public Sentiment" },
  { id: "easter-eggs", label: "Easter Eggs" },
];

const SCENARIOS_PATH = new URL("../data/prediction_scenarios.json", import.meta.url).href;
let scenarioDbCache = null;

export async function loadPredictionScenarios() {
  if (scenarioDbCache) return scenarioDbCache;
  const res = await fetch(SCENARIOS_PATH);
  if (!res.ok) throw new Error(`Failed to load prediction scenarios: ${res.status}`);
  scenarioDbCache = await res.json();
  return scenarioDbCache;
}

export function loadPredictionScenariosSync(data) {
  scenarioDbCache = data;
  return data;
}

function clampPrice(n) {
  return Math.max(5, Math.min(95, n));
}

function driftPrice(price) {
  return clampPrice(price + secureRandomInt(-5, 5));
}

function makeMarketId(prefix) {
  return `${prefix}-${secureRandomInt(10000, 99999)}`;
}

function sportsPulseMarkets(events) {
  const markets = [];
  for (const event of events.slice(0, 4)) {
    if (event.eventType !== "game") continue;
    const fav = event.homeOdds < event.awayOdds ? event.home : event.away;
    const coverSide = event.spread !== 0
      ? `${event.home} ${event.spread >= 0 ? "+" : ""}${event.spread}`
      : fav;
    const yesBase = event.homeOdds <= -130 ? 58 : event.homeOdds >= 130 ? 42 : 50;
    markets.push({
      marketId: makeMarketId("sp"),
      scenarioId: null,
      category: "sports-pulse",
      question: `${coverSide} covers tonight?`,
      yesPrice: yesBase,
      noPrice: 100 - yesBase,
      volume: secureRandomInt(800, 12000),
      linkedEventId: event.eventId,
      resolution: null,
      fixedResolution: null,
      blurb: null,
    });
    const yes = clampPrice(48 + secureRandomInt(-8, 8));
    markets.push({
      marketId: makeMarketId("sp"),
      scenarioId: null,
      category: "sports-pulse",
      question: `Total goes over ${event.total} in ${event.label}?`,
      yesPrice: yes,
      noPrice: 100 - yes,
      volume: secureRandomInt(500, 9000),
      linkedEventId: event.eventId,
      resolution: null,
      fixedResolution: null,
      blurb: null,
    });
  }
  return markets;
}

/** Page through the stored prediction scenario DB. */
export function pageFromScenarios(scenarioDb, cursor = 0, pageSize = null, events = []) {
  const scenarios = scenarioDb?.scenarios ?? [];
  const size = pageSize ?? scenarioDb?.pageSize ?? 20;
  const pulse = sportsPulseMarkets(events);
  const staticCount = Math.max(0, size - pulse.length);
  if (!scenarios.length) {
    return { markets: pulse.slice(0, size), nextCursor: 0 };
  }
  const markets = [...pulse];
  let idx = ((cursor % scenarios.length) + scenarios.length) % scenarios.length;
  for (let i = 0; i < staticCount; i += 1) {
    const s = scenarios[idx];
    const yes = clampPrice(s.yesPrice + secureRandomInt(-2, 2));
    markets.push({
      marketId: makeMarketId(s.scenarioId ?? "sc"),
      scenarioId: s.scenarioId,
      category: s.category,
      question: s.question,
      yesPrice: yes,
      noPrice: 100 - yes,
      volume: s.volume ?? secureRandomInt(2000, 30000),
      linkedEventId: s.linkedEventId ?? null,
      resolution: null,
      fixedResolution: s.fixedResolution ?? null,
      blurb: s.blurb ?? null,
    });
    idx = (idx + 1) % scenarios.length;
  }
  return { markets: markets.slice(0, size), nextCursor: idx };
}

export function generateMarkets(events = [], scenarioDb = null, cursor = 0) {
  if (scenarioDb?.scenarios?.length) {
    return pageFromScenarios(scenarioDb, cursor, scenarioDb.pageSize ?? 20, events).markets;
  }
  return sportsPulseMarkets(events).slice(0, 20);
}

export function refreshMarketPrices(markets) {
  return markets.map((m) => {
    const yesPrice = m.category === "history"
      ? clampPrice(m.yesPrice + secureRandomInt(-2, 2))
      : driftPrice(m.yesPrice);
    return { ...m, yesPrice, noPrice: 100 - yesPrice };
  });
}

export function predictionPayout(amount, priceCents) {
  if (priceCents <= 0) return 0;
  return Math.floor((amount * 100) / priceCents);
}

export function resolveMarket(market, events = []) {
  if (market.resolution) return market.resolution;
  if (market.fixedResolution === "yes" || market.fixedResolution === "no" || market.fixedResolution === "push") {
    return market.fixedResolution;
  }

  const yesProb = market.yesPrice / 100;
  if (market.linkedEventId) {
    const event = events.find((e) => e.eventId === market.linkedEventId);
    if (event?.settled) {
      if (market.question.includes("covers")) {
        const margin = event.homeScore - event.awayScore;
        return margin + event.spread > 0 ? "yes" : "no";
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
    this.scenarioDb = null;
    this.scenarioCursor = 0;
    if (data) {
      this.markets = data.markets ?? [];
      this.positions = data.positions ?? [];
      this.categoryFilter = data.categoryFilter ?? "all";
      this.scenarioCursor = data.scenarioCursor ?? 0;
    }
  }

  async ensureCatalog() {
    if (!this.scenarioDb) {
      try {
        this.scenarioDb = await loadPredictionScenarios();
      } catch {
        this.scenarioDb = { pageSize: 20, scenarios: [] };
      }
    }
    return this.scenarioDb;
  }

  syncMarkets(events, force = false) {
    if (!this.markets.length || force) {
      if (this.scenarioDb?.scenarios?.length) {
        const { markets, nextCursor } = pageFromScenarios(
          this.scenarioDb, this.scenarioCursor, this.scenarioDb.pageSize ?? 20, events,
        );
        this.markets = markets;
        if (force) this.scenarioCursor = nextCursor;
      } else {
        this.markets = generateMarkets(events);
      }
    }
  }

  nextSlate(events = []) {
    if (!this.scenarioDb?.scenarios?.length) {
      this.markets = generateMarkets(events);
      return;
    }
    const { markets, nextCursor } = pageFromScenarios(
      this.scenarioDb, this.scenarioCursor, this.scenarioDb.pageSize ?? 20, events,
    );
    this.markets = markets;
    this.scenarioCursor = nextCursor;
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
      scenarioCursor: this.scenarioCursor,
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
