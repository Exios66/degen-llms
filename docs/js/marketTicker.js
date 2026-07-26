/**
 * Live underlying price tape + sparkline for the Trading Floor.
 * Spots are derived from futures marks in the trading catalog and random-walked.
 */

import { secureRandomInt } from "./core.js";

const HISTORY_LEN = 48;
const TICK_MS = 700;
const CHART_ROTATE_MS = 4500;

/** Prefer futures marks as the spot for each symbol. */
export function underlyingsFromCatalog(catalog) {
  const map = new Map();
  for (const c of catalog?.contracts ?? []) {
    if (c.instrument !== "future") continue;
    const prev = map.get(c.symbol);
    // Prefer the largest mark (full notional vs tiny residuals in the book).
    if (!prev || Number(c.markPrice) > prev.baseSpot) {
      map.set(c.symbol, {
        symbol: c.symbol,
        underlying: c.underlying,
        assetClass: c.assetClass,
        baseSpot: Number(c.markPrice),
        spot: Number(c.markPrice),
        prevSpot: Number(c.markPrice),
        changePct: 0,
        history: [Number(c.markPrice)],
      });
    }
  }
  return [...map.values()].sort((a, b) => {
    if (a.assetClass !== b.assetClass) return a.assetClass.localeCompare(b.assetClass);
    return a.symbol.localeCompare(b.symbol);
  });
}

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
  quote.history.push(quote.spot);
  if (quote.history.length > HISTORY_LEN) quote.history.shift();
}

function drawSparkline(canvas, quote) {
  if (!canvas || !quote?.history?.length) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 280;
  const h = canvas.clientHeight || 72;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const hist = quote.history;
  const min = Math.min(...hist);
  const max = Math.max(...hist);
  const pad = 6;
  const span = Math.max(1e-9, max - min);

  const up = quote.spot >= quote.baseSpot;
  const stroke = up ? "#3dcc8c" : "#ff6b6b";
  const fill = up ? "rgba(61, 204, 140, 0.18)" : "rgba(255, 107, 107, 0.16)";

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

  // Pulse tip
  ctx.beginPath();
  ctx.arc(lastX, lastY, 3.2, 0, Math.PI * 2);
  ctx.fillStyle = stroke;
  ctx.fill();
}

/**
 * Mount an animated ticker into `host`. Returns a controller with stop().
 */
export function mountMarketTicker(host, catalog, { el } = {}) {
  if (!host || !catalog) return { stop() {} };

  const quotes = underlyingsFromCatalog(catalog);
  if (!quotes.length) {
    host.textContent = "";
    return { stop() {} };
  }

  let chartIndex = 0;
  let tickTimer = null;
  let rotateTimer = null;
  let stopped = false;

  const make = el || ((tag, attrs = {}, kids = []) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "className") node.className = v;
      else if (k === "textContent") node.textContent = v;
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v != null) node.setAttribute(k, String(v));
    }
    for (const kid of kids) {
      if (kid == null || kid === false) continue;
      node.appendChild(typeof kid === "string" ? document.createTextNode(kid) : kid);
    }
    return node;
  });

  host.replaceChildren();
  host.className = "market-ticker";

  const header = make("div", { className: "market-ticker__header" }, [
    make("span", { className: "market-ticker__live", textContent: "LIVE" }),
    make("span", { className: "market-ticker__title", textContent: "Mandalay Markets · Underlying tape" }),
  ]);

  const tapeWrap = make("div", { className: "market-ticker__tape" });
  const track = make("div", { className: "market-ticker__track" });
  tapeWrap.appendChild(track);

  const chartPanel = make("div", { className: "market-ticker__chart-panel" });
  const chartMeta = make("div", { className: "market-ticker__chart-meta" });
  const canvas = make("canvas", { className: "market-ticker__canvas" });
  chartPanel.append(chartMeta, canvas);

  host.append(header, tapeWrap, chartPanel);

  function renderTape() {
    const items = quotes.map((q) => {
      const up = q.spot >= q.prevSpot;
      const dayUp = q.changePct >= 0;
      return make("span", {
        className: `market-ticker__item${up ? " market-ticker__item--up" : " market-ticker__item--down"}`,
      }, [
        make("span", { className: "market-ticker__sym", textContent: q.symbol }),
        make("span", { className: "market-ticker__px", textContent: formatSpot(q.spot) }),
        make("span", {
          className: `market-ticker__chg${dayUp ? " is-up" : " is-down"}`,
          textContent: `${dayUp ? "+" : ""}${q.changePct.toFixed(2)}%`,
        }),
      ]);
    });
    // Duplicate for seamless scroll
    track.replaceChildren(...items, ...items.map((n) => n.cloneNode(true)));
  }

  function renderChart() {
    const q = quotes[chartIndex % quotes.length];
    const dayUp = q.changePct >= 0;
    chartMeta.replaceChildren(
      make("strong", { textContent: `${q.symbol}` }),
      make("span", { className: "dim", textContent: ` ${q.underlying}` }),
      make("span", {
        className: `market-ticker__chart-px${dayUp ? " is-up" : " is-down"}`,
        textContent: `  ${formatSpot(q.spot)} (${dayUp ? "+" : ""}${q.changePct.toFixed(2)}%)`,
      }),
    );
    drawSparkline(canvas, q);
  }

  function onTick() {
    if (stopped) return;
    for (const q of quotes) tickQuote(q);
    renderTape();
    renderChart();
  }

  renderTape();
  renderChart();
  // Seed a short history so the first chart isn’t flat
  for (let i = 0; i < 12; i += 1) {
    for (const q of quotes) tickQuote(q);
  }
  renderTape();
  renderChart();

  tickTimer = window.setInterval(onTick, TICK_MS);
  rotateTimer = window.setInterval(() => {
    if (stopped) return;
    chartIndex = (chartIndex + 1) % quotes.length;
    renderChart();
  }, CHART_ROTATE_MS);

  const onResize = () => renderChart();
  window.addEventListener("resize", onResize);

  return {
    quotes,
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
