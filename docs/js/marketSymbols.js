/**
 * Mandalay Markets symbol database — NYSE / commodities / crypto underlyings
 * with synthetic 1d & 1w performance series for the Trading Floor ticker.
 */

const SYMBOLS_PATH = new URL("../data/market_symbols.json", import.meta.url).href;

let symbolsCache = null;

export async function loadMarketSymbols() {
  if (symbolsCache) return symbolsCache;
  const res = await fetch(SYMBOLS_PATH);
  if (!res.ok) throw new Error(`Failed to load market symbols: ${res.status}`);
  symbolsCache = await res.json();
  return symbolsCache;
}

export function loadMarketSymbolsSync(data) {
  symbolsCache = data;
  return data;
}

/** Unique underlyings from the trading catalog (futures marks). */
export function underlyingsFromCatalog(catalog) {
  const map = new Map();
  for (const c of catalog?.contracts ?? []) {
    if (c.instrument !== "future") continue;
    const prev = map.get(c.symbol);
    if (!prev || Number(c.markPrice) > prev.baseSpot) {
      map.set(c.symbol, {
        symbol: c.symbol,
        name: c.underlying,
        underlying: c.underlying,
        assetClass: c.assetClass,
        baseSpot: Number(c.markPrice),
      });
    }
  }
  return [...map.values()].sort((a, b) => {
    if (a.assetClass !== b.assetClass) return a.assetClass.localeCompare(b.assetClass);
    return a.symbol.localeCompare(b.symbol);
  });
}

/**
 * Build the live quote book from the symbol DB (preferred) merged with catalog marks.
 * @param {object} symbolDb
 * @param {object} [catalog]
 * @param {{ assetClass?: string }} [opts]
 */
export function buildSymbolQuotes(symbolDb, catalog = null, { assetClass = "all" } = {}) {
  const catalogMap = new Map(underlyingsFromCatalog(catalog).map((u) => [u.symbol, u]));
  const rows = symbolDb?.symbols ?? [];
  const quotes = [];

  for (const row of rows) {
    if (assetClass !== "all" && row.assetClass !== assetClass) continue;
    const fromCatalog = catalogMap.get(row.symbol);
    const baseSpot = Number(fromCatalog?.baseSpot ?? row.baseSpot);
    const series1d = Array.isArray(row.series1d) && row.series1d.length
      ? row.series1d.map(Number)
      : [baseSpot];
    const series1w = Array.isArray(row.series1w) && row.series1w.length
      ? row.series1w.map(Number)
      : [baseSpot];
    quotes.push({
      symbol: row.symbol,
      name: row.name || row.underlying || row.symbol,
      underlying: row.name || row.underlying || row.symbol,
      assetClass: row.assetClass,
      sector: row.sector || row.assetClass,
      unit: row.unit || "unit",
      currency: row.currency || "USD",
      baseSpot,
      spot: baseSpot,
      prevSpot: baseSpot,
      changePct: 0,
      perf1dPct: Number(row.perf1dPct) || 0,
      perf1wPct: Number(row.perf1wPct) || 0,
      series1d,
      series1w,
      history: [...series1d.slice(-12)],
      activity: [],
    });
  }

  // If DB missing symbols still in catalog, append them.
  if (catalog) {
    const known = new Set(quotes.map((q) => q.symbol));
    for (const u of underlyingsFromCatalog(catalog)) {
      if (known.has(u.symbol)) continue;
      if (assetClass !== "all" && u.assetClass !== assetClass) continue;
      quotes.push({
        symbol: u.symbol,
        name: u.name || u.underlying,
        underlying: u.underlying,
        assetClass: u.assetClass,
        sector: u.assetClass,
        unit: "unit",
        currency: "USD",
        baseSpot: u.baseSpot,
        spot: u.baseSpot,
        prevSpot: u.baseSpot,
        changePct: 0,
        perf1dPct: 0,
        perf1wPct: 0,
        series1d: [u.baseSpot],
        series1w: [u.baseSpot],
        history: [u.baseSpot],
        activity: [],
      });
    }
  }

  return quotes.sort((a, b) => {
    if (a.assetClass !== b.assetClass) return a.assetClass.localeCompare(b.assetClass);
    return a.symbol.localeCompare(b.symbol);
  });
}

export function filterQuotes(quotes, assetClass = "all") {
  if (!assetClass || assetClass === "all") return quotes;
  return quotes.filter((q) => q.assetClass === assetClass);
}

export function formatPerf(pct) {
  const n = Number(pct) || 0;
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}
