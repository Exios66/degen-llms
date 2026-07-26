/**
 * Live underlying price tape + 1D/1W performance charts for the Trading Floor.
 * Symbol universe comes from market_symbols.json; spots random-walk from base marks.
 */

import { secureRandomInt } from "./core.js";
import {
  buildSymbolQuotes,
  filterQuotes,
  formatPerf,
  loadMarketSymbols,
  underlyingsFromCatalog,
} from "./marketSymbols.js";

const HISTORY_LEN = 48;
const ACTIVITY_LEN = 8;
const TICK_MS = 700;
const CHART_ROTATE_MS = 4500;

export { underlyingsFromCatalog, loadMarketSymbols, buildSymbolQuotes, filterQuotes };

export function formatSpot(spot) {
  if (spot >= 1000) return spot.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (spot >= 1) return spot.toFixed(2);
  if (spot >= 0.01) return spot.toFixed(4);
  return spot.toFixed(6);
}

function tickQuote(quote) {
  const vol = quote.assetClass === "crypto" ? 18 : quote.assetClass === "commodities" ? 10 : 6;
  const pct = secureRandomInt(-vol, vol) / 1000;
  quote.prevSpot = quote.spot;
  quote.spot = Math.max(0.0001, +(quote.spot * (1 + pct)).toFixed(6));
  quote.changePct = ((quote.spot - quote.baseSpot) / quote.baseSpot) * 100;
  // Live session drift layered on static 1d/1w catalog performance for display.
  quote.live1dPct = quote.perf1dPct + quote.changePct * 0.35;
  quote.live1wPct = quote.perf1wPct + quote.changePct * 0.15;
  quote.history.push(quote.spot);
  if (quote.history.length > HISTORY_LEN) quote.history.shift();
  const dir = quote.spot >= quote.prevSpot ? "up" : "down";
  quote.activity.unshift({
    t: Date.now(),
    spot: quote.spot,
    dir,
    deltaPct: ((quote.spot - quote.prevSpot) / quote.prevSpot) * 100,
  });
  if (quote.activity.length > ACTIVITY_LEN) quote.activity.length = ACTIVITY_LEN;
}

function seriesForTimeframe(quote, timeframe) {
  const base = timeframe === "1w" ? quote.series1w : quote.series1d;
  if (!base?.length) return quote.history.slice();
  // Append live spot so the tip tracks the tape.
  return [...base.slice(0, -1), quote.spot];
}

function drawSparkline(canvas, quote, timeframe = "1d") {
  if (!canvas || !quote) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 280;
  const h = canvas.clientHeight || 88;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const hist = seriesForTimeframe(quote, timeframe);
  if (!hist.length) return;
  const min = Math.min(...hist);
  const max = Math.max(...hist);
  const pad = 6;
  const span = Math.max(1e-9, max - min);

  const perf = timeframe === "1w" ? (quote.live1wPct ?? quote.perf1wPct) : (quote.live1dPct ?? quote.perf1dPct);
  const up = perf >= 0;
  const stroke = up ? "#3dcc8c" : "#ff6b6b";
  const fill = up ? "rgba(61, 204, 140, 0.18)" : "rgba(255, 107, 107, 0.16)";

  // Zero / open reference line
  const open = hist[0];
  const openY = h - pad - ((open - min) / span) * (h - pad * 2);
  ctx.beginPath();
  ctx.moveTo(pad, openY);
  ctx.lineTo(w - pad, openY);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.setLineDash([3, 3]);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.beginPath();
  hist.forEach((v, i) => {
    const x = pad + (i / Math.max(1, hist.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.stroke();

  const lastX = pad + ((hist.length - 1) / Math.max(1, hist.length - 1)) * (w - pad * 2);
  const lastY = h - pad - ((hist[hist.length - 1] - min) / span) * (h - pad * 2);
  ctx.lineTo(lastX, h - pad);
  ctx.lineTo(pad, h - pad);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(lastX, lastY, 3.2, 0, Math.PI * 2);
  ctx.fillStyle = stroke;
  ctx.fill();
}

function classLabel(assetClass) {
  if (assetClass === "nyse") return "NYSE / Equities";
  if (assetClass === "commodities") return "Commodities";
  if (assetClass === "crypto") return "Crypto";
  return "All markets";
}

/**
 * Mount an animated ticker into `host`.
 * @param {HTMLElement} host
 * @param {object} catalog
 * @param {{ el?: Function, assetClass?: string, focusSymbol?: string|null,
 *           timeframe?: "1d"|"1w", symbolDb?: object|null, compact?: boolean }} opts
 */
export function mountMarketTicker(host, catalog, opts = {}) {
  if (!host || !catalog) return { stop() {} };

  const {
    el,
    assetClass = "all",
    focusSymbol = null,
    timeframe: initialTf = "1d",
    symbolDb = null,
    compact = false,
  } = opts;

  let chartIndex = 0;
  let timeframe = initialTf === "1w" ? "1w" : "1d";
  let tickTimer = null;
  let rotateTimer = null;
  let stopped = false;
  let quotes = [];
  let allQuotes = [];

  const make = el || ((tag, attrs = {}, kids = []) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "className") node.className = v;
      else if (k === "textContent") node.textContent = v;
      else if (k.startsWith("on") && typeof v === "function") {
        node.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (v != null) node.setAttribute(k, String(v));
    }
    for (const kid of kids) {
      if (kid == null || kid === false) continue;
      node.appendChild(typeof kid === "string" ? document.createTextNode(kid) : kid);
    }
    return node;
  });

  host.replaceChildren();
  host.className = `market-ticker${compact ? " market-ticker--compact" : ""}`;

  const scopeLabel = make("span", {
    className: "market-ticker__scope",
    textContent: focusSymbol
      ? `Focus ${focusSymbol}`
      : classLabel(assetClass),
  });

  const header = make("div", { className: "market-ticker__header" }, [
    make("span", { className: "market-ticker__live", textContent: "LIVE" }),
    make("span", { className: "market-ticker__title", textContent: "Mandalay Markets · Underlying tape" }),
    scopeLabel,
  ]);

  const tapeWrap = make("div", { className: "market-ticker__tape", "aria-label": "Scrolling market tape" });
  const track = make("div", { className: "market-ticker__track" });
  tapeWrap.appendChild(track);

  const chartPanel = make("div", { className: "market-ticker__chart-panel" });
  const chartMeta = make("div", { className: "market-ticker__chart-meta" });
  const tfBar = make("div", { className: "market-ticker__tf-bar" });
  const canvas = make("canvas", { className: "market-ticker__canvas" });
  const activity = make("div", { className: "market-ticker__activity", "aria-live": "polite" });
  chartPanel.append(chartMeta, tfBar, canvas, activity);

  host.append(header, tapeWrap, chartPanel);

  function visibleQuotes() {
    let list = filterQuotes(allQuotes, assetClass);
    if (focusSymbol) {
      const focused = list.filter((q) => q.symbol === focusSymbol);
      if (focused.length) list = focused;
    }
    return list;
  }

  function renderTfBar() {
    tfBar.replaceChildren(
      make("button", {
        type: "button",
        className: `market-ticker__tf${timeframe === "1d" ? " is-active" : ""}`,
        textContent: "1D",
        onclick: () => { timeframe = "1d"; renderChart(); renderTfBar(); },
      }),
      make("button", {
        type: "button",
        className: `market-ticker__tf${timeframe === "1w" ? " is-active" : ""}`,
        textContent: "1W",
        onclick: () => { timeframe = "1w"; renderChart(); renderTfBar(); },
      }),
      make("span", {
        className: "dim market-ticker__tf-hint",
        textContent: timeframe === "1w" ? "Week performance" : "Day performance",
      }),
    );
  }

  function renderTape() {
    quotes = visibleQuotes();
    if (!quotes.length) {
      track.replaceChildren(make("span", {
        className: "market-ticker__item dim",
        textContent: "No underlyings in this category",
      }));
      return;
    }
    const items = quotes.map((q) => {
      const up = q.spot >= q.prevSpot;
      const dayUp = (q.live1dPct ?? q.perf1dPct) >= 0;
      return make("span", {
        className: `market-ticker__item market-ticker__item--${q.assetClass}${up ? " market-ticker__item--up" : " market-ticker__item--down"}`,
        title: `${q.name} · 1D ${formatPerf(q.live1dPct ?? q.perf1dPct)} · 1W ${formatPerf(q.live1wPct ?? q.perf1wPct)}`,
      }, [
        make("span", { className: "market-ticker__class", textContent: q.assetClass.slice(0, 3).toUpperCase() }),
        make("span", { className: "market-ticker__sym", textContent: q.symbol }),
        make("span", { className: "market-ticker__px", textContent: formatSpot(q.spot) }),
        make("span", {
          className: `market-ticker__chg${dayUp ? " is-up" : " is-down"}`,
          textContent: `1D ${formatPerf(q.live1dPct ?? q.perf1dPct)}`,
        }),
        make("span", {
          className: `market-ticker__chg market-ticker__chg--week${(q.live1wPct ?? q.perf1wPct) >= 0 ? " is-up" : " is-down"}`,
          textContent: `1W ${formatPerf(q.live1wPct ?? q.perf1wPct)}`,
        }),
      ]);
    });
    // Duplicate for seamless scroll (need ≥2 items worth of width)
    const clones = items.map((n) => n.cloneNode(true));
    track.replaceChildren(...items, ...clones);
    // Speed scales lightly with universe size so full book stays readable
    const secs = Math.max(28, Math.min(75, 18 + quotes.length * 1.4));
    track.style.animationDuration = `${secs}s`;
  }

  function activeQuote() {
    quotes = visibleQuotes();
    if (!quotes.length) return null;
    if (focusSymbol) {
      return quotes.find((q) => q.symbol === focusSymbol) || quotes[0];
    }
    return quotes[chartIndex % quotes.length];
  }

  function renderActivity(q) {
    if (!q?.activity?.length) {
      activity.replaceChildren(make("span", {
        className: "dim",
        textContent: "Recent prints appear as the tape ticks…",
      }));
      return;
    }
    activity.replaceChildren(
      make("span", { className: "market-ticker__activity-label", textContent: "Recent activity" }),
      ...q.activity.slice(0, 5).map((a) => make("span", {
        className: `market-ticker__print market-ticker__print--${a.dir}`,
        textContent: `${formatSpot(a.spot)} (${a.deltaPct >= 0 ? "+" : ""}${a.deltaPct.toFixed(2)}%)`,
      })),
    );
  }

  function renderChart() {
    const q = activeQuote();
    if (!q) {
      chartMeta.textContent = "No chart for this filter.";
      activity.replaceChildren();
      return;
    }
    const perf = timeframe === "1w" ? (q.live1wPct ?? q.perf1wPct) : (q.live1dPct ?? q.perf1dPct);
    const dayUp = perf >= 0;
    chartMeta.replaceChildren(
      make("strong", { textContent: q.symbol }),
      make("span", { className: "dim", textContent: ` ${q.name}` }),
      make("span", {
        className: "market-ticker__badge",
        textContent: q.assetClass.toUpperCase(),
      }),
      make("span", {
        className: `market-ticker__chart-px${dayUp ? " is-up" : " is-down"}`,
        textContent: `  ${formatSpot(q.spot)} · ${timeframe.toUpperCase()} ${formatPerf(perf)}`,
      }),
    );
    drawSparkline(canvas, q, timeframe);
    renderActivity(q);
  }

  function onTick() {
    if (stopped) return;
    for (const q of allQuotes) tickQuote(q);
    renderTape();
    renderChart();
  }

  function applyDb(db) {
    allQuotes = buildSymbolQuotes(db || { symbols: [] }, catalog, { assetClass: "all" });
    // Initialize live perf mirrors
    for (const q of allQuotes) {
      q.live1dPct = q.perf1dPct;
      q.live1wPct = q.perf1wPct;
    }
    quotes = visibleQuotes();
    chartIndex = 0;
    scopeLabel.textContent = focusSymbol
      ? `Focus ${focusSymbol}`
      : `${classLabel(assetClass)} · ${quotes.length} symbols`;
    renderTfBar();
    renderTape();
    renderChart();
  }

  function startTimers() {
    if (tickTimer) window.clearInterval(tickTimer);
    if (rotateTimer) window.clearInterval(rotateTimer);
    tickTimer = window.setInterval(onTick, TICK_MS);
    rotateTimer = window.setInterval(() => {
      if (stopped || focusSymbol) return;
      const list = visibleQuotes();
      if (!list.length) return;
      chartIndex = (chartIndex + 1) % list.length;
      renderChart();
    }, CHART_ROTATE_MS);
  }

  if (symbolDb) {
    applyDb(symbolDb);
    // Warm history tip
    for (let i = 0; i < 4; i += 1) {
      for (const q of allQuotes) tickQuote(q);
    }
    renderTape();
    renderChart();
    startTimers();
  } else {
    host.appendChild(make("p", { className: "dim market-ticker__loading", textContent: "Loading symbol book…" }));
    loadMarketSymbols()
      .then((db) => {
        if (stopped) return;
        const loading = host.querySelector(".market-ticker__loading");
        loading?.remove();
        applyDb(db);
        for (let i = 0; i < 4; i += 1) {
          for (const q of allQuotes) tickQuote(q);
        }
        renderTape();
        renderChart();
        startTimers();
      })
      .catch(() => {
        if (stopped) return;
        // Fallback: catalog-only universe
        applyDb({ symbols: underlyingsFromCatalog(catalog).map((u) => ({
          ...u,
          name: u.underlying,
          perf1dPct: 0,
          perf1wPct: 0,
          series1d: [u.baseSpot],
          series1w: [u.baseSpot],
        })) });
        startTimers();
      });
  }

  const onResize = () => renderChart();
  window.addEventListener("resize", onResize);

  return {
    get quotes() { return visibleQuotes(); },
    get allQuotes() { return allQuotes; },
    setTimeframe(tf) {
      timeframe = tf === "1w" ? "1w" : "1d";
      renderTfBar();
      renderChart();
    },
    focus(symbol) {
      // External focus updates (buy screen) — remount preferred; this is a light path.
      if (!symbol) return;
      const idx = visibleQuotes().findIndex((q) => q.symbol === symbol);
      if (idx >= 0) {
        chartIndex = idx;
        renderChart();
      }
    },
    stop() {
      stopped = true;
      if (tickTimer) window.clearInterval(tickTimer);
      if (rotateTimer) window.clearInterval(rotateTimer);
      window.removeEventListener("resize", onResize);
      tickTimer = null;
      rotateTimer = null;
    },
  };
}
