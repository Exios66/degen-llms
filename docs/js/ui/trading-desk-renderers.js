import { ACTIVITIES } from "../core.js";
import { mountMarketTicker } from "../marketTicker.js";
import {
  ASSET_CLASSES, INSTRUMENTS, entryCostChips, filterContracts,
} from "../tradingDesk.js";
import { effectiveTableStakes, formatStakeRange } from "../stakes.js";

export function buildTradingDeskRenderers(ctx) {
  const {
    el, banner, chipLine, showStatus, menu, pushView, popView, goBack,
    render, persist, recordActivityVisit, recordActivityResult,
  } = ctx;
  const runtime = ctx.runtime;

  function stopTicker() {
    if (runtime.marketTicker?.stop) {
      runtime.marketTicker.stop();
      runtime.marketTicker = null;
    }
  }

  function renderTradingDesk() {
    const act = ACTIVITIES.trading_desk;
    const open = runtime.tradingDesk.positions.length;
    if (ctx.session.wallet.balance < act.minBet && open === 0) {
      stopTicker();
      return el("div", { className: "panel" }, [
        banner("Trading Floor"),
        el("p", { className: "error", textContent: `You need at least ${act.minBet} chips to trade.` }),
        el("div", { className: "action-bar" }, [
          el("button", { className: "btn", textContent: "Back", onclick: () => { stopTicker(); popView(); render(); } }),
        ]),
      ]);
    }
    recordActivityVisit("trading_desk");
    persist();

    if (!runtime.tradingDesk.catalog) {
      runtime.tradingDesk.ensureCatalog().then(() => render());
      return el("div", { className: "panel" }, [
        banner("Trading Floor — Mandalay Markets"),
        chipLine(),
        el("p", { className: "dim", textContent: "Loading contract book…" }),
      ]);
    }

    const tier = runtime.stakeTier;
    const stakes = tier
      ? effectiveTableStakes(tier, ctx.session.wallet.balance, act.minBet)
      : { minBet: act.minBet, maxBet: ctx.session.wallet.balance };

    const assetChips = el("div", { className: "prediction-filter-chips" }, [
      el("button", {
        className: `prediction-chip${runtime.tradingDesk.assetFilter === "all" ? " prediction-chip--active" : ""}`,
        textContent: "All assets",
        onclick: () => { runtime.tradingDesk.assetFilter = "all"; persist(); render(); },
      }),
      ...ASSET_CLASSES.map((a) => el("button", {
        className: `prediction-chip${runtime.tradingDesk.assetFilter === a.id ? " prediction-chip--active" : ""}`,
        textContent: a.label,
        onclick: () => { runtime.tradingDesk.assetFilter = a.id; persist(); render(); },
      })),
    ]);

    const instChips = el("div", { className: "prediction-filter-chips" }, [
      el("button", {
        className: `prediction-chip${runtime.tradingDesk.instrumentFilter === "all" ? " prediction-chip--active" : ""}`,
        textContent: "All instruments",
        onclick: () => { runtime.tradingDesk.instrumentFilter = "all"; persist(); render(); },
      }),
      ...INSTRUMENTS.map((i) => el("button", {
        className: `prediction-chip${runtime.tradingDesk.instrumentFilter === i.id ? " prediction-chip--active" : ""}`,
        textContent: i.label,
        onclick: () => { runtime.tradingDesk.instrumentFilter = i.id; persist(); render(); },
      })),
    ]);

    const page = runtime.tradingDesk.visibleContracts(20);
    const total = filterContracts(runtime.tradingDesk.catalog.contracts, {
      assetClass: runtime.tradingDesk.assetFilter,
      instrument: runtime.tradingDesk.instrumentFilter,
    }).length;

    // Live spot from ticker when available (symbol → current quote)
    const liveSpots = new Map(
      (runtime.marketTicker?.quotes ?? []).map((q) => [q.symbol, q]),
    );

    const board = el("div", {}, page.map((c, i) => {
      const live = liveSpots.get(c.symbol);
      const spotLine = live
        ? ` · live ${live.spot} (${live.changePct >= 0 ? "+" : ""}${live.changePct.toFixed(2)}%)`
        : "";
      return el("div", { className: "event-card" }, [
        el("div", { className: "sport", textContent: `${c.assetClass.toUpperCase()} · ${c.instrument.toUpperCase()}` }),
        el("div", { innerHTML: `<strong>${i + 1}) ${c.symbol} — ${c.underlying}</strong>` }),
        el("div", {
          className: "dim",
          textContent: c.instrument === "future"
            ? `Futures ${c.expiry} · mark ${c.markPrice} · bid ${c.bid} / ask ${c.ask} · mult ${c.multiplier}${spotLine}`
            : `${c.instrument.toUpperCase()} strike ${c.strike} · ${c.expiry} · prem ${c.markPrice} · und. mark ~${c.markPrice}${spotLine} · mult ${c.multiplier}`,
        }),
        el("div", { className: "dim", textContent: `Margin/premium ≈ ${entryCostChips(c).toLocaleString()} chips / unit` }),
      ]);
    }));

    const pending = el("div", { className: "pending-tickets" });
    if (runtime.tradingDesk.positions.length) {
      pending.appendChild(el("p", { className: "subtitle", textContent: "Open contracts:" }));
      for (const p of runtime.tradingDesk.positions) {
        pending.appendChild(el("div", {
          className: "ticket",
          textContent: `${p.qty}× ${p.contract.instrument.toUpperCase()} ${p.contract.symbol}${p.contract.strike != null ? ` ${p.contract.strike}` : ""} @ ${p.entryPrice} (cost ${p.cost.toLocaleString()} chips)`,
        }));
      }
    }

    const assetFilter = runtime.tradingDesk.assetFilter || "all";
    const tickerHost = el("div", { className: "market-ticker-host" });
    // Remount ticker after DOM attach so canvas has layout size.
    // Tape + chart isolate to the selected asset category (full book when All).
    queueMicrotask(() => {
      stopTicker();
      if (tickerHost.isConnected) {
        runtime.marketTicker = mountMarketTicker(tickerHost, runtime.tradingDesk.catalog, {
          el,
          assetClass: assetFilter,
        });
      }
    });

    const scopeHint = assetFilter === "all"
      ? "Tape scrolls the full symbol book — pick a category to isolate underlyings before you trade."
      : `Tape & charts isolated to ${assetFilter.toUpperCase()} underlyings — review 1D/1W activity, then buy.`;

    return el("div", { className: "panel" }, [
      banner("Trading Floor — Mandalay Markets"),
      chipLine(),
      assetChips,
      el("p", { className: "dim market-ticker-scope-hint", textContent: scopeHint }),
      tickerHost,
      tier ? el("p", { className: "dim", textContent: `${tier.name}: ${formatStakeRange(stakes.minBet, stakes.maxBet, { noCap: true })}` }) : null,
      el("p", { className: "dim", textContent: `NYSE · Commodities · Crypto — futures & call/put options · ${total} contracts in filter · ${runtime.tradingDesk.catalog.contracts.length} in book` }),
      instChips,
      el("p", { className: "subtitle", textContent: "Contract board" }),
      board,
      pending,
      menu(
        ["Buy contract", "Settle / expire positions", "Next contract page"],
        "Trading Floor:",
        (choice) => {
          if (choice === 0) { stopTicker(); goBack(); return; }
          if (choice === 1) { pushView("trading-buy"); }
          else if (choice === 2) { stopTicker(); pushView("trading-settle"); }
          else if (choice === 3) {
            runtime.tradingDesk.nextPage();
            persist();
            render();
          }
        },
      ),
    ]);
  }

  function renderTradingBuy() {
    if (!runtime.tradingDesk.catalog) {
      runtime.tradingDesk.ensureCatalog().then(() => render());
      return el("div", { className: "panel" }, [banner("Buy Contract"), el("p", { className: "dim", textContent: "Loading…" })]);
    }
    const act = ACTIVITIES.trading_desk;
    const tier = runtime.stakeTier;
    const stakes = tier
      ? effectiveTableStakes(tier, ctx.session.wallet.balance, act.minBet)
      : { minBet: act.minBet, maxBet: ctx.session.wallet.balance };
    const page = runtime.tradingDesk.visibleContracts(40);
    const assetFilter = runtime.tradingDesk.assetFilter || "all";
    const select = el("select", {}, page.map((c, i) =>
      el("option", {
        value: String(i),
        textContent: `${c.instrument.toUpperCase()} ${c.symbol}${c.strike != null ? ` ${c.strike}` : ""} ${c.expiry} — ${entryCostChips(c)} chips`,
      })
    ));
    const qtyInput = el("input", { type: "number", min: "1", max: "20", value: "1" });
    const hint = el("p", { className: "dim", textContent: "" });
    const tickerHost = el("div", { className: "market-ticker-host market-ticker-host--pretrade" });

    function selectedContract() {
      return page[parseInt(select.value, 10)] || null;
    }

    function remountFocusTicker() {
      const c = selectedContract();
      stopTicker();
      if (!tickerHost.isConnected || !c) return;
      runtime.marketTicker = mountMarketTicker(tickerHost, runtime.tradingDesk.catalog, {
        el,
        assetClass: assetFilter === "all" ? c.assetClass : assetFilter,
        focusSymbol: c.symbol,
        compact: true,
      });
    }

    function refresh() {
      const c = selectedContract();
      const qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);
      if (!c) return;
      hint.textContent = `Cost ${entryCostChips(c, qty).toLocaleString()} chips · mark ${c.markPrice} · ${c.underlying} · review tape before you send`;
      remountFocusTicker();
    }
    select.onchange = refresh;
    qtyInput.oninput = () => {
      const c = selectedContract();
      const qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);
      if (!c) return;
      hint.textContent = `Cost ${entryCostChips(c, qty).toLocaleString()} chips · mark ${c.markPrice} · ${c.underlying} · review tape before you send`;
    };

    queueMicrotask(() => {
      if (tickerHost.isConnected) refresh();
    });

    return el("div", { className: "panel" }, [
      banner("Buy Contract"),
      chipLine(),
      el("p", {
        className: "dim",
        textContent: "Long only — futures (margin) or call/put premium. No naked shorts. Live 1D/1W activity for the selected underlying stays on screen while you size the ticket.",
      }),
      tickerHost,
      el("div", { className: "form-row" }, [el("label", { textContent: "Contract" }), select]),
      el("div", { className: "form-row" }, [el("label", { textContent: "Quantity" }), qtyInput]),
      hint,
      el("div", { className: "action-bar" }, [
        el("button", {
          className: "btn primary",
          textContent: "Buy",
          onclick: () => {
            const c = selectedContract();
            const qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);
            const cost = entryCostChips(c, qty);
            if (cost > stakes.maxBet) { alert(`Cost exceeds stake max (${stakes.maxBet}).`); return; }
            if (!ctx.session.wallet.debit(cost, "trading_desk", `Buy ${c.instrument} ${c.symbol}`)) {
              alert("Insufficient chips."); return;
            }
            runtime.tradingDesk.openPosition(c, qty);
            persist();
            showStatus(`Opened ${qty}× ${c.instrument} ${c.symbol}.`);
            stopTicker();
            popView();
            render();
          },
        }),
        el("button", {
          className: "btn",
          textContent: "Back",
          onclick: () => { stopTicker(); popView(); render(); },
        }),
      ]),
    ]);
  }

  function renderTradingSettle() {
    const log = el("div", { className: "log-area" });
    let sessionNet = 0;
    if (!runtime.tradingDesk.positions.length) {
      log.appendChild(el("p", { className: "error", textContent: "No open contracts." }));
    } else {
      const { results, count } = runtime.tradingDesk.settleAll();
      for (const r of results) {
        log.appendChild(el("div", {
          className: "line",
          innerHTML: `<strong>${r.position.contract.symbol}</strong> → spot ${r.exitSpot}`,
        }));
        if (r.pnl >= 0) {
          ctx.session.wallet.credit(r.payout, "trading_desk", r.reason);
          sessionNet += r.pnl;
          log.appendChild(el("div", { className: "line success", textContent: `  ${r.reason} (+${r.pnl.toLocaleString()} chips)` }));
        } else {
          // Cost already debited; payout may be partial premium recovery
          if (r.payout > 0) ctx.session.wallet.credit(r.payout, "trading_desk", r.reason);
          sessionNet += r.pnl;
          log.appendChild(el("div", { className: "line error", textContent: `  ${r.reason} (${r.pnl.toLocaleString()} chips)` }));
        }
      }
      recordActivityResult("trading_desk", sessionNet, count);
      persist();
    }
    return el("div", { className: "panel" }, [
      banner("Settle / Expire"),
      chipLine(),
      log,
      el("div", { className: "action-bar" }, [
        el("button", { className: "btn", textContent: "Back", onclick: () => { popView(); render(); } }),
      ]),
    ]);
  }

  return {
    "trading-desk": renderTradingDesk,
    "trading-buy": renderTradingBuy,
    "trading-settle": renderTradingSettle,
  };
}
