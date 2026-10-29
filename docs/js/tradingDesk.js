import { secureRandomInt } from "./core.js";

const CATALOG_PATH = new URL("../data/trading_catalog.json", import.meta.url).href;
let catalogCache = null;

export const ASSET_CLASSES = [
  { id: "nyse", label: "NYSE / Equities" },
  { id: "commodities", label: "Commodities" },
  { id: "crypto", label: "Crypto" },
];

export const INSTRUMENTS = [
  { id: "future", label: "Futures" },
  { id: "call", label: "Call options" },
  { id: "put", label: "Put options" },
];

export async function loadTradingCatalog() {
  if (catalogCache) return catalogCache;
  const res = await fetch(CATALOG_PATH);
  if (!res.ok) throw new Error(`Failed to load trading catalog: ${res.status}`);
  catalogCache = await res.json();
  return catalogCache;
}

export function loadTradingCatalogSync(data) {
  catalogCache = data;
  return data;
}

export function filterContracts(contracts, { assetClass = "all", instrument = "all" } = {}) {
  return contracts.filter((c) => {
    if (assetClass !== "all" && c.assetClass !== assetClass) return false;
    if (instrument !== "all" && c.instrument !== instrument) return false;
    return true;
  });
}

/** Chip cost to open a long position (1 unit). */
export function entryCostChips(contract, qty = 1) {
  if (!Number.isSafeInteger(qty) || qty < 1) throw new Error("Quantity must be a positive integer.");
  const px = contract.ask ?? contract.markPrice;
  const mult = contract.multiplier ?? 1;
  if (contract.instrument === "future") {
    // Futures margin stub: 10% of notional, min 25 chips
    return Math.max(25, Math.floor(px * mult * 0.1 * qty));
  }
  // Options: pay premium × multiplier
  return Math.max(1, Math.floor(px * mult * qty));
}

export function underlyingSpot(contract, catalog = catalogCache) {
  if (contract.instrument === "future") return contract.markPrice;
  const futures = (catalog?.contracts ?? []).filter((c) => c.instrument === "future" && c.symbol === contract.symbol);
  const quote = futures.find((c) => c.expiry === contract.expiry) ?? futures[0];
  if (!quote) throw new Error(`No underlying quote for ${contract.symbol}`);
  return quote.markPrice;
}

export function driftSpot(mark, instrument) {
  const pct = instrument === "future"
    ? (secureRandomInt(-40, 40) / 1000)
    : (secureRandomInt(-60, 60) / 1000);
  return Math.max(0.0001, +(mark * (1 + pct)).toFixed(4));
}

export function settlePosition(position, exitSpot) {
  const { contract, qty, entryPrice, cost } = position;
  const mult = contract.multiplier ?? 1;
  let pnl = 0;
  let reason = "";

  if (contract.instrument === "future") {
    pnl = Math.trunc((exitSpot - entryPrice) * mult * qty);
    reason = `Future ${contract.symbol} ${exitSpot >= entryPrice ? "rallied" : "sold off"} (${entryPrice} → ${exitSpot})`;
  } else if (contract.instrument === "call") {
    const intrinsic = Math.max(0, exitSpot - (contract.strike ?? 0));
    const proceeds = Math.floor(intrinsic * mult * qty);
    pnl = proceeds - cost;
    reason = `Call ${contract.symbol} ${contract.strike} expires — intrinsic ${intrinsic}`;
  } else if (contract.instrument === "put") {
    const intrinsic = Math.max(0, (contract.strike ?? 0) - exitSpot);
    const proceeds = Math.floor(intrinsic * mult * qty);
    pnl = proceeds - cost;
    reason = `Put ${contract.symbol} ${contract.strike} expires — intrinsic ${intrinsic}`;
  } else {
    throw new Error(`Unknown instrument: ${contract.instrument}`);
  }

  const payout = Math.max(0, cost + pnl);
  pnl = payout - cost;
  return {
    won: pnl >= 0,
    pnl,
    payout,
    exitSpot,
    reason,
  };
}

export class TradingDeskState {
  constructor(data = null) {
    this.catalog = null;
    this.positions = [];
    this.assetFilter = "all";
    this.instrumentFilter = "all";
    this.pageCursor = 0;
    if (data) {
      this.positions = data.positions ?? [];
      this.assetFilter = data.assetFilter ?? "all";
      this.instrumentFilter = data.instrumentFilter ?? "all";
      this.pageCursor = data.pageCursor ?? 0;
    }
  }

  async ensureCatalog() {
    if (!this.catalog) this.catalog = await loadTradingCatalog();
    return this.catalog;
  }

  visibleContracts(pageSize = 20) {
    const all = filterContracts(this.catalog?.contracts ?? [], {
      assetClass: this.assetFilter,
      instrument: this.instrumentFilter,
    });
    if (!all.length) return [];
    const start = ((this.pageCursor % all.length) + all.length) % all.length;
    const page = [];
    for (let i = 0; i < Math.min(pageSize, all.length); i += 1) {
      page.push(all[(start + i) % all.length]);
    }
    return page;
  }

  nextPage() {
    const all = filterContracts(this.catalog?.contracts ?? [], {
      assetClass: this.assetFilter,
      instrument: this.instrumentFilter,
    });
    const size = this.catalog?.pageSize ?? 20;
    this.pageCursor = (this.pageCursor + size) % Math.max(1, all.length);
  }

  openPosition(contract, qty = 1) {
    const cost = entryCostChips(contract, qty);
    const entryPrice = contract.ask ?? contract.markPrice;
    const position = {
      positionId: `td-${secureRandomInt(10000, 99999)}`,
      contract: { ...contract },
      qty,
      entryPrice,
      entrySpot: underlyingSpot(contract, this.catalog ?? catalogCache),
      cost,
      openedAt: Date.now(),
    };
    this.positions.push(position);
    return position;
  }

  settleAll() {
    const results = [];
    for (const position of this.positions) {
      const spot = position.entrySpot ?? underlyingSpot(position.contract, this.catalog ?? catalogCache);
      const exitSpot = driftSpot(spot, position.contract.instrument);
      const resolved = settlePosition(position, exitSpot);
      results.push({ position, ...resolved });
    }
    const count = this.positions.length;
    this.positions = [];
    return { results, count };
  }

  toJSON() {
    return {
      positions: this.positions,
      assetFilter: this.assetFilter,
      instrumentFilter: this.instrumentFilter,
      pageCursor: this.pageCursor,
    };
  }

  static fromJSON(data) {
    if (!data) return new TradingDeskState();
    return new TradingDeskState(data);
  }
}
