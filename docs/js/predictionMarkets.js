import { secureRandomInt } from "./core.js";

export const MARKET_CATEGORIES = [
  { id: "sports-pulse", label: "Sports Pulse" },
  { id: "history", label: "History Desk" },
  { id: "headlines", label: "Headlines & Buzz" },
  { id: "vegas", label: "Vegas & Resort" },
  { id: "sentiment", label: "Public Sentiment" },
  { id: "easter-eggs", label: "Easter Eggs" },
];

const HISTORY_MARKETS = [
  {
    question: "Did Apollo 11 land humans on the Moon in July 1969?",
    resolution: "yes",
    yesPrice: 88,
    blurb: "Neil Armstrong & Buzz Aldrin — Sea of Tranquility.",
  },
  {
    question: "Did the Berlin Wall fall in 1989?",
    resolution: "yes",
    yesPrice: 86,
    blurb: "November 9, 1989 — checkpoints opened overnight.",
  },
  {
    question: "Did the 'Miracle on Ice' (USA over USSR) happen at Lake Placid 1980?",
    resolution: "yes",
    yesPrice: 84,
    blurb: "Feb 22, 1980 — amateur US hockey shocked the Soviets.",
  },
  {
    question: "Was the Titanic's maiden voyage completed successfully in 1912?",
    resolution: "no",
    yesPrice: 12,
    blurb: "Struck an iceberg April 14–15, 1912; ship did not finish the crossing.",
  },
  {
    question: "Did the Wright brothers achieve powered flight at Kitty Hawk in 1903?",
    resolution: "yes",
    yesPrice: 90,
    blurb: "December 17, 1903 — first controlled powered airplane flight.",
  },
  {
    question: "Did the Cuban Missile Crisis end with a US invasion of Cuba?",
    resolution: "no",
    yesPrice: 18,
    blurb: "Resolved via naval quarantine and Soviet missile withdrawal (1962).",
  },
  {
    question: "Was Shakespeare historically proven to be a woman writing under a pen name?",
    resolution: "no",
    yesPrice: 8,
    blurb: "Authorship debates persist; mainstream history attributes the works to William Shakespeare.",
  },
  {
    question: "Did Napoleon win the Battle of Waterloo (1815)?",
    resolution: "no",
    yesPrice: 15,
    blurb: "Defeated by Wellington and Blücher — ended the Hundred Days.",
  },
  {
    question: "Did the US formally enter WWII after Pearl Harbor (Dec 1941)?",
    resolution: "yes",
    yesPrice: 92,
    blurb: "Congress declared war on Japan December 8, 1941.",
  },
  {
    question: "Was the original Woodstock festival held in 1999?",
    resolution: "no",
    yesPrice: 10,
    blurb: "Woodstock '69 — Bethel, New York. 1999 was a later revival.",
  },
  {
    question: "Did the first Super Bowl take place before 1970?",
    resolution: "yes",
    yesPrice: 78,
    blurb: "Super Bowl I — January 15, 1967 (Packers over Chiefs).",
  },
  {
    question: "Did Prohibition in the United States end with the 21st Amendment?",
    resolution: "yes",
    yesPrice: 85,
    blurb: "Ratified December 5, 1933 — repealed the 18th Amendment.",
  },
];

const HEADLINE_TEMPLATES = [
  "Major award show produces a surprise winner tonight?",
  "Viral celebrity story breaks before midnight?",
  "Streaming platform hits #1 trending globally?",
  "Late-night monologue sparks national backlash?",
  "A tech keynote announces a product nobody expected?",
];

const VEGAS_TEMPLATES = [
  "Strip foot traffic exceeds weekend forecast?",
  "Pool party attendance breaks venue record?",
  "High-roller salon fills every seat tonight?",
  "Fountain show crowd exceeds 10,000 viewers?",
  "A wedding party books the entire shark-reef overlook?",
];

const SENTIMENT_TEMPLATES = [
  "Public poll swings toward the underdog?",
  "Social buzz peaks for the away side?",
  "Crowd favors the under on the main event?",
  "National sentiment shifts before kickoff?",
];

const EASTER_EGG_TEMPLATES = [
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
];

function clampPrice(n) {
  return Math.max(5, Math.min(95, n));
}

function driftPrice(price) {
  return clampPrice(price + secureRandomInt(-5, 5));
}

function makeMarketId(prefix) {
  return `${prefix}-${secureRandomInt(10000, 99999)}`;
}

function shuffleCopy(list) {
  const pool = [...list];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = secureRandomInt(0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
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

function historyMarkets(count = 4) {
  return shuffleCopy(HISTORY_MARKETS).slice(0, count).map((item) => {
    const yes = clampPrice(item.yesPrice + secureRandomInt(-4, 4));
    return {
      marketId: makeMarketId("hx"),
      category: "history",
      question: item.question,
      yesPrice: yes,
      noPrice: 100 - yes,
      volume: secureRandomInt(4000, 40000),
      linkedEventId: null,
      resolution: null,
      fixedResolution: item.resolution,
      blurb: item.blurb ?? null,
    };
  });
}

function templateMarkets(category, templates, prefix, count = 3) {
  const picked = [];
  const pool = [...templates];
  while (pool.length && picked.length < count) {
    const idx = secureRandomInt(0, pool.length - 1);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked.map((question) => {
    const yesPrice = category === "easter-eggs"
      ? clampPrice(8 + secureRandomInt(0, 22))
      : clampPrice(35 + secureRandomInt(0, 30));
    return {
      marketId: makeMarketId(prefix),
      category,
      question,
      yesPrice,
      noPrice: 100 - yesPrice,
      volume: secureRandomInt(1200, 25000),
      linkedEventId: null,
      resolution: null,
      fixedResolution: null,
      blurb: null,
    };
  });
}

export function generateMarkets(events = []) {
  const markets = [
    ...sportsPulseMarkets(events),
    ...historyMarkets(4),
    ...templateMarkets("headlines", HEADLINE_TEMPLATES, "hb", 2),
    ...templateMarkets("vegas", VEGAS_TEMPLATES, "vg", 2),
    ...templateMarkets("sentiment", SENTIMENT_TEMPLATES, "ps", 2),
    ...templateMarkets("easter-eggs", EASTER_EGG_TEMPLATES, "ee", 4),
  ];
  return markets.slice(0, 20);
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
