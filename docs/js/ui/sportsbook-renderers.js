// Extracted from app.js — shared by the web terminal and the pixel RPG.
import { ACTIVITIES } from "../core.js";
import { categoryLabel, predictionPayout } from "../predictionMarkets.js";
import { fmtOdds, formatEventScore, oddsForSelection } from "../sportsbook.js";
import { effectiveTableStakes, formatStakeRange } from "../stakes.js";

export function buildSportsbookRenderers(ctx) {
  const { el, banner, chipLine, showStatus, menu, pushView, popView, goBack, render, persist, recordActivityVisit, recordActivityResult } = ctx;
  const runtime = ctx.runtime;

  function renderSportsbook() {
    const act = ACTIVITIES.sportsbook;
    const openCount = runtime.sportsbook.getOpenPositionCount();
    if (ctx.session.wallet.balance < act.minBet && openCount === 0) {
      return el("div", { className: "panel" }, [
        banner("Sports Book"),
        el("p", { className: "error", textContent: `You need at least ${act.minBet} chips to wager.` }),
        el("div", { className: "action-bar" }, [
          el("button", { className: "btn", textContent: "Back", onclick: () => { popView(); render(); } }),
        ]),
      ]);
    }
    recordActivityVisit("runtime.sportsbook");
    persist();

    if (!runtime.sportsbook.events.length) {
      runtime.sportsbook.refreshBoardAsync(false).then(() => render());
      return el("div", { className: "panel" }, [
        banner("Sports Book — Mandalay Sports Book"),
        chipLine(),
        el("p", { className: "dim", textContent: "Loading today's board…" }),
        el("div", { className: "action-bar" }, [
          el("button", { className: "btn", textContent: "Back", onclick: () => { popView(); render(); } }),
        ]),
      ]);
    }

    runtime.sportsbook.predictions.syncMarkets(runtime.sportsbook.events);

    const tier = runtime.stakeTier;
    const wagerStakes = tier
      ? effectiveTableStakes(tier, ctx.session.wallet.balance, act.minBet)
      : { minBet: act.minBet, maxBet: ctx.session.wallet.balance };

    const tabSports = el("button", {
      className: `runtime.sportsbook-tab${runtime.sportsbook.activeTab === "sports" ? " active" : ""}`,
      textContent: "Sports board",
      onclick: () => { runtime.sportsbook.activeTab = "sports"; render(); },
    });
    const tabPredictions = el("button", {
      className: `runtime.sportsbook-tab${runtime.sportsbook.activeTab === "predictions" ? " active" : ""}`,
      textContent: "Prediction markets",
      onclick: () => { runtime.sportsbook.activeTab = "predictions"; render(); },
    });

    const board = runtime.sportsbook.activeTab === "sports"
      ? el("div", {}, runtime.sportsbook.events.map((event, i) =>
        el("div", { className: "event-card" }, [
          el("div", { className: "sport", textContent: event.sport }),
          el("div", { innerHTML: `<strong>${i + 1}) ${event.label}</strong>` }),
          event.eventType === "outright"
            ? el("div", { className: "dim", textContent: `Outright: ${(event.field ?? []).join(" · ")}` })
            : el("div", { className: "dim", innerHTML: `ML: ${event.away} ${fmtOdds(event.awayOdds)} | ${event.home} ${fmtOdds(event.homeOdds)}` }),
          event.eventType === "game"
            ? el("div", { className: "dim", innerHTML: `Spread: ${event.home} ${event.spread >= 0 ? "+" : ""}${event.spread} | Total: ${event.total}` })
            : null,
        ])
      ))
      : el("div", {}, runtime.sportsbook.predictions.markets.map((market, i) =>
        el("div", { className: "event-card prediction-card" }, [
          el("div", { className: "sport", textContent: categoryLabel(market.category) }),
          el("div", { innerHTML: `<strong>${i + 1}) ${market.question}</strong>` }),
          el("div", { className: "dim", textContent: `YES ${market.yesPrice}¢ · NO ${market.noPrice}¢ · Vol ${market.volume.toLocaleString()}` }),
        ])
      ));

    const pendingEl = el("div", { className: "pending-tickets" });
    if (runtime.sportsbook.pending.length || runtime.sportsbook.predictions.positions.length) {
      pendingEl.appendChild(el("p", { className: "subtitle", textContent: "Open positions:" }));
      for (const slip of runtime.sportsbook.pending) {
        pendingEl.appendChild(el("div", {
          className: "ticket",
          textContent: `${slip.amount.toLocaleString()} chips on ${slip.pick} (${slip.betType}, ${fmtOdds(slip.odds)}) — ${slip.event.label}`,
        }));
      }
      for (const pos of runtime.sportsbook.predictions.positions) {
        pendingEl.appendChild(el("div", {
          className: "ticket",
          textContent: `${pos.amount.toLocaleString()} chips ${pos.side.toUpperCase()} @ ${pos.priceCents}¢ — ${pos.question}`,
        }));
      }
    }

    const menuItems = runtime.sportsbook.activeTab === "sports"
      ? ["Place sports wager", "Settle all open positions", "Refresh lines & markets"]
      : ["Place prediction contract", "Refresh market prices", "Settle all open positions"];

    return el("div", { className: "panel" }, [
      banner("Sports Book — Mandalay Sports Book"),
      chipLine(),
      tier ? el("p", { className: "dim", textContent: `${tier.name}: ${formatStakeRange(wagerStakes.minBet, wagerStakes.maxBet, { noCap: tier.maxBet == null })}` }) : null,
      el("div", { className: "runtime.sportsbook-tabs" }, [tabSports, tabPredictions]),
      el("p", { className: "subtitle", textContent: runtime.sportsbook.activeTab === "sports" ? "Today's Board" : "Prediction Markets" }),
      board,
      pendingEl,
      menu(menuItems, "Sports Book:", (choice) => {
        if (choice === 0) { goBack(); return; }
        if (runtime.sportsbook.activeTab === "sports") {
          if (choice === 1) pushView("runtime.sportsbook-wager");
          else if (choice === 2) pushView("runtime.sportsbook-settle");
          else if (choice === 3) { runtime.sportsbook.refreshBoard(true); persist(); render(); }
        } else {
          if (choice === 1) pushView("runtime.sportsbook-prediction");
          else if (choice === 2) { runtime.sportsbook.predictions.refreshPrices(); persist(); render(); }
          else if (choice === 3) pushView("runtime.sportsbook-settle");
        }
      }),
    ]);
  }

  function renderSportsbookWager() {
    if (!runtime.sportsbook.events.length) {
      return el("div", { className: "panel" }, [
        banner("Place Wager"),
        el("p", { className: "error", textContent: "No events on the board. Go back and refresh lines." }),
        el("div", { className: "action-bar" }, [
          el("button", { className: "btn", textContent: "Back", onclick: () => { popView(); render(); } }),
        ]),
      ]);
    }
    const act = ACTIVITIES.sportsbook;
    const tier = runtime.stakeTier;
    const wagerStakes = tier
      ? effectiveTableStakes(tier, ctx.session.wallet.balance, act.minBet)
      : { minBet: act.minBet, maxBet: ctx.session.wallet.balance };
    const eventSelect = el("select", {}, runtime.sportsbook.events.map((e, i) =>
      el("option", { value: String(i), textContent: `${i + 1}) ${e.label}` })
    ));
    const betTypeSelect = el("select", {}, [
      el("option", { value: "moneyline", textContent: "Moneyline" }),
      el("option", { value: "spread", textContent: "Spread" }),
      el("option", { value: "total", textContent: "Total (over/under)" }),
      el("option", { value: "prop", textContent: "Prop" }),
      el("option", { value: "outright", textContent: "Outright / futures" }),
    ]);
    const pickSelect = el("select");
    const propRow = el("div", { className: "form-row", style: "display:none;" }, [
      el("label", { textContent: "Prop" }),
      el("select", { id: "prop-select" }),
    ]);
    const propSelect = propRow.querySelector("select");
    const amountInput = el("input", {
      type: "number", min: String(wagerStakes.minBet), max: String(wagerStakes.maxBet), value: String(wagerStakes.minBet),
    });

    function updatePicks() {
      const event = runtime.sportsbook.events[parseInt(eventSelect.value, 10)];
      const betType = betTypeSelect.value;
      pickSelect.innerHTML = "";
      propRow.style.display = "none";

      if (event.eventType === "outright") {
        betTypeSelect.value = "outright";
        betTypeSelect.disabled = true;
        for (const name of event.field ?? [event.home, event.away]) {
          pickSelect.appendChild(el("option", { value: name, textContent: `${name} (${fmtOdds(event.outrightOdds?.[name] ?? -110)})` }));
        }
        return;
      }
      betTypeSelect.disabled = false;

      if (betType === "moneyline") {
        pickSelect.appendChild(el("option", { value: event.away, textContent: event.away }));
        pickSelect.appendChild(el("option", { value: event.home, textContent: event.home }));
      } else if (betType === "spread") {
        pickSelect.appendChild(el("option", {
          value: event.home,
          textContent: `${event.home} ${event.spread >= 0 ? "+" : ""}${event.spread}`,
        }));
        pickSelect.appendChild(el("option", {
          value: event.away,
          textContent: `${event.away} ${(-event.spread) >= 0 ? "+" : ""}${-event.spread}`,
        }));
      } else if (betType === "total") {
        pickSelect.appendChild(el("option", { value: "over", textContent: `Over ${event.total}` }));
        pickSelect.appendChild(el("option", { value: "under", textContent: `Under ${event.total}` }));
      } else if (betType === "prop") {
        propRow.style.display = "";
        propSelect.innerHTML = "";
        for (const prop of event.props ?? []) {
          propSelect.appendChild(el("option", { value: prop.id, textContent: prop.label }));
        }
        pickSelect.appendChild(el("option", { value: "yes", textContent: "Yes" }));
        pickSelect.appendChild(el("option", { value: "no", textContent: "No" }));
      } else if (betType === "outright") {
        for (const name of event.field ?? [event.home, event.away]) {
          pickSelect.appendChild(el("option", { value: name, textContent: name }));
        }
      }
    }
    eventSelect.onchange = updatePicks;
    betTypeSelect.onchange = updatePicks;
    updatePicks();

    return el("div", { className: "panel" }, [
      banner("Place Wager"),
      chipLine(),
      el("div", { className: "form-row" }, [el("label", { textContent: "Event" }), eventSelect]),
      el("div", { className: "form-row" }, [el("label", { textContent: "Bet type" }), betTypeSelect]),
      propRow,
      el("div", { className: "form-row" }, [el("label", { textContent: "Pick" }), pickSelect]),
      el("div", { className: "form-row" }, [el("label", { textContent: "Wager amount" }), amountInput]),
      el("div", { className: "action-bar" }, [
        el("button", {
          className: "btn primary",
          textContent: "Place ticket",
          onclick: () => {
            const event = runtime.sportsbook.events[parseInt(eventSelect.value, 10)];
            const betType = betTypeSelect.value;
            const pick = pickSelect.value;
            const amount = parseInt(amountInput.value, 10);
            if (amount < wagerStakes.minBet) { alert(`Minimum wager is ${wagerStakes.minBet} chips.`); return; }
            if (amount > wagerStakes.maxBet) { alert(`Maximum wager is ${wagerStakes.maxBet} chips.`); return; }
            let propId = null;
            let propLabel = null;
            if (betType === "prop") {
              propId = propSelect.value;
              propLabel = event.props?.find((p) => p.id === propId)?.label ?? propId;
            }
            const odds = oddsForSelection(event, betType, pick, propId);
            if (!ctx.session.wallet.debit(amount, "runtime.sportsbook", `${betType} on ${pick}`)) {
              alert("Insufficient chips."); return;
            }
            runtime.sportsbook.addTicket({ event, betType, pick, amount, odds, propId, propLabel });
            persist();
            showStatus(`Ticket placed: ${amount.toLocaleString()} chips on ${pick}. Settle when ready.`);
            popView();
            render();
          },
        }),
        el("button", { className: "btn", textContent: "Back", onclick: () => { popView(); render(); } }),
      ]),
    ]);
  }

  function renderSportsbookPrediction() {
    if (!runtime.sportsbook.predictions.markets.length) {
      runtime.sportsbook.predictions.syncMarkets(runtime.sportsbook.events);
    }
    const act = ACTIVITIES.sportsbook;
    const tier = runtime.stakeTier;
    const wagerStakes = tier
      ? effectiveTableStakes(tier, ctx.session.wallet.balance, act.minBet)
      : { minBet: act.minBet, maxBet: ctx.session.wallet.balance };

    const marketSelect = el("select", {}, runtime.sportsbook.predictions.markets.map((m, i) =>
      el("option", { value: String(i), textContent: `${i + 1}) ${m.question}` })
    ));
    const sideSelect = el("select", {}, [
      el("option", { value: "yes", textContent: "YES" }),
      el("option", { value: "no", textContent: "NO" }),
    ]);
    const priceHint = el("p", { className: "dim", textContent: "" });
    const amountInput = el("input", {
      type: "number", min: String(wagerStakes.minBet), max: String(wagerStakes.maxBet), value: String(wagerStakes.minBet),
    });

    function refreshPrice() {
      const market = runtime.sportsbook.predictions.markets[parseInt(marketSelect.value, 10)];
      if (!market) return;
      const side = sideSelect.value;
      const price = side === "yes" ? market.yesPrice : market.noPrice;
      const amt = parseInt(amountInput.value, 10) || wagerStakes.minBet;
      priceHint.textContent = `${side.toUpperCase()} @ ${price}¢ — max payout ${predictionPayout(amt, price).toLocaleString()} chips`;
    }
    marketSelect.onchange = refreshPrice;
    sideSelect.onchange = refreshPrice;
    amountInput.oninput = refreshPrice;
    refreshPrice();

    return el("div", { className: "panel" }, [
      banner("Prediction Contract"),
      chipLine(),
      el("p", { className: "dim", textContent: "High-volatility YES/NO contracts — prices in cents (0–100)." }),
      el("div", { className: "form-row" }, [el("label", { textContent: "Market" }), marketSelect]),
      el("div", { className: "form-row" }, [el("label", { textContent: "Side" }), sideSelect]),
      el("div", { className: "form-row" }, [el("label", { textContent: "Stake" }), amountInput]),
      priceHint,
      el("div", { className: "action-bar" }, [
        el("button", {
          className: "btn primary",
          textContent: "Buy contract",
          onclick: () => {
            const market = runtime.sportsbook.predictions.markets[parseInt(marketSelect.value, 10)];
            const side = sideSelect.value;
            const amount = parseInt(amountInput.value, 10);
            const priceCents = side === "yes" ? market.yesPrice : market.noPrice;
            if (amount < wagerStakes.minBet) { alert(`Minimum stake is ${wagerStakes.minBet} chips.`); return; }
            if (amount > wagerStakes.maxBet) { alert(`Maximum stake is ${wagerStakes.maxBet} chips.`); return; }
            if (!ctx.session.wallet.debit(amount, "runtime.sportsbook", `Prediction ${side} @ ${priceCents}¢`)) {
              alert("Insufficient chips."); return;
            }
            runtime.sportsbook.predictions.addPosition({
              marketId: market.marketId,
              question: market.question,
              side,
              amount,
              priceCents,
            });
            persist();
            showStatus(`Contract placed: ${side.toUpperCase()} on "${market.question}".`);
            popView();
            render();
          },
        }),
        el("button", { className: "btn", textContent: "Back", onclick: () => { popView(); render(); } }),
      ]),
    ]);
  }

  function renderSportsbookSettle() {
    const log = el("div", { className: "log-area" });
    let sessionNet = 0;
    let count = 0;

    if (!runtime.sportsbook.pending.length && !runtime.sportsbook.predictions.positions.length) {
      log.appendChild(el("p", { className: "error", textContent: "No open positions. Place a wager first." }));
    } else {
      if (runtime.sportsbook.pending.length) {
        const sportsResult = runtime.sportsbook.settleAll();
        log.appendChild(el("p", { className: "subtitle", textContent: "SPORTS RESULTS" }));
        for (const r of sportsResult.results) {
          log.appendChild(el("div", { className: "line", innerHTML: `<strong>${r.event.label}:</strong> ${formatEventScore(r.event)}` }));
          if (r.won) {
            ctx.session.wallet.credit(r.payout, "runtime.sportsbook", r.reason);
            sessionNet += r.payout - r.slip.amount;
            log.appendChild(el("div", { className: "line success", textContent: `  WIN: ${r.reason} (+${(r.payout - r.slip.amount).toLocaleString()} chips)` }));
          } else {
            sessionNet -= r.slip.amount;
            log.appendChild(el("div", { className: "line error", textContent: `  LOSE: ${r.reason} (-${r.slip.amount.toLocaleString()} chips)` }));
          }
        }
        count += sportsResult.count;
      }

      if (runtime.sportsbook.predictions.positions.length) {
        const predResult = runtime.sportsbook.settlePredictions();
        log.appendChild(el("p", { className: "subtitle", textContent: "PREDICTION MARKETS" }));
        for (const r of predResult.results) {
          log.appendChild(el("div", { className: "line", innerHTML: `<strong>${r.market.question}</strong> → ${r.resolution.toUpperCase()}` }));
          if (r.won) {
            ctx.session.wallet.credit(r.payout, "runtime.sportsbook", r.reason);
            sessionNet += r.payout - r.position.amount;
            log.appendChild(el("div", { className: "line success", textContent: `  WIN: ${r.reason}` }));
          } else {
            sessionNet -= r.position.amount;
            log.appendChild(el("div", { className: "line error", textContent: `  LOSE: ${r.reason} (-${r.position.amount.toLocaleString()} chips)` }));
          }
        }
        count += predResult.count;
      }

      recordActivityResult("runtime.sportsbook", sessionNet, count);
      persist();
    }

    return el("div", { className: "panel" }, [
      banner("Settle Bets"),
      chipLine(),
      log,
      el("div", { className: "action-bar" }, [
        el("button", { className: "btn", textContent: "Back", onclick: () => { popView(); render(); } }),
      ]),
    ]);
  }

  return {
    sportsbook: renderSportsbook,
    "sportsbook-wager": renderSportsbookWager,
    "sportsbook-prediction": renderSportsbookPrediction,
    "sportsbook-settle": renderSportsbookSettle,
  };
}
