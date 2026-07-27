// Extracted from app.js — shared by the web terminal and the pixel RPG.
import { ACTIVITIES } from "../core.js";
import { MARKET_CATEGORIES, categoryLabel, filterMarkets, predictionPayout } from "../predictionMarkets.js";
import {
  availableBetTypes, combineAmericanOdds, filterEvents, fmtOdds, formatEventScore,
  getUniqueSports, oddsForSelection,
} from "../sportsbook.js";
import { effectiveTableStakes, formatStakeRange } from "../stakes.js";
import { resolveActivityMin } from "../salon-exclusives.js";
import { getActivityBranding } from "../strip-destinations.js";

function eventCardLines(el, event, i) {
  const kids = [
    el("div", { className: "sport", textContent: `${event.sport}${event.eventType === "futures" ? " · FUTURES" : event.eventType === "outright" ? " · OUTRIGHT" : ""}` }),
    el("div", { innerHTML: `<strong>${i + 1}) ${event.label}</strong>` }),
  ];
  if (event.scenarioId) {
    kids.push(el("div", { className: "dim", textContent: `Scenario ${event.scenarioId}` }));
  }
  if (event.eventType === "outright" || event.eventType === "futures") {
    const field = event.field ?? [];
    kids.push(el("div", {
      className: "dim",
      textContent: field.map((n) => `${n} ${fmtOdds(event.outrightOdds?.[n] ?? -110)}`).join(" · "),
    }));
  } else {
    kids.push(el("div", {
      className: "dim",
      innerHTML: `ML: ${event.away} ${fmtOdds(event.awayOdds)} | ${event.home} ${fmtOdds(event.homeOdds)}`,
    }));
    kids.push(el("div", {
      className: "dim",
      innerHTML: `Spread: ${event.home} ${event.spread >= 0 ? "+" : ""}${event.spread} (${fmtOdds(event.spreadHomeOdds)}) · Total: ${event.total} (O ${fmtOdds(event.totalOverOdds)} / U ${fmtOdds(event.totalUnderOdds)})`,
    }));
    if (event.props?.length) {
      kids.push(el("div", {
        className: "dim",
        textContent: `Props: ${event.props.map((p) => `${p.label} Y${fmtOdds(p.yesOdds)}/N${fmtOdds(p.noOdds)}`).join(" · ")}`,
      }));
    }
  }
  return kids;
}

export function buildSportsbookRenderers(ctx) {
  const { el, banner, chipLine, showStatus, menu, pushView, popView, goBack, render, persist, recordActivityVisit, recordActivityResult } = ctx;
  const runtime = ctx.runtime;

  function sportsbookBannerTitle() {
    if (runtime.sportsbook.salonDesk) return "Salon Sports Desk — Whale Lines";
    const brand = getActivityBranding(ctx.session, "sportsbook", "Sports Book");
    return `Sports Book — ${brand.name}`;
  }

  function renderSportsbook() {
    const act = ACTIVITIES.sportsbook;
    const openCount = runtime.sportsbook.getOpenPositionCount();
    if (ctx.session.wallet.balance < act.minBet && openCount === 0) {
      return el("div", { className: "panel" }, [
        banner(sportsbookBannerTitle()),
        el("p", { className: "error", textContent: `You need at least ${act.minBet} chips to wager.` }),
        el("div", { className: "action-bar" }, [
          el("button", { className: "btn", textContent: "Back", onclick: () => { popView(); render(); } }),
        ]),
      ]);
    }
    recordActivityVisit("sportsbook");
    persist();

    if (!runtime.sportsbook.events.length) {
      runtime.sportsbook.refreshBoardAsync(false).then(() => render());
      return el("div", { className: "panel" }, [
        banner(sportsbookBannerTitle()),
        chipLine(),
        el("p", { className: "dim", textContent: "Loading scenario board…" }),
        el("div", { className: "action-bar" }, [
          el("button", { className: "btn", textContent: "Back", onclick: () => { popView(); render(); } }),
        ]),
      ]);
    }

    runtime.sportsbook.predictions.ensureCatalog?.().then(() => {
      runtime.sportsbook.predictions.syncMarkets(runtime.sportsbook.events);
    });
    runtime.sportsbook.predictions.syncMarkets(runtime.sportsbook.events);

    const tier = runtime.stakeTier;
    const activityMin = resolveActivityMin(runtime, act.minBet);
    const wagerStakes = tier
      ? effectiveTableStakes(tier, ctx.session.wallet.balance, activityMin)
      : { minBet: activityMin, maxBet: ctx.session.wallet.balance };
    const salonDesk = Boolean(runtime.sportsbook.salonDesk);

    const tabSports = el("button", {
      className: `sportsbook-tab${runtime.sportsbook.activeTab === "sports" ? " active" : ""}`,
      textContent: "Sports board",
      onclick: () => { runtime.sportsbook.activeTab = "sports"; render(); },
    });
    const tabPredictions = el("button", {
      className: `sportsbook-tab${runtime.sportsbook.activeTab === "predictions" ? " active" : ""}`,
      textContent: "Prediction markets",
      onclick: () => { runtime.sportsbook.activeTab = "predictions"; render(); },
    });

    const sports = getUniqueSports(runtime.sportsbook.events);
    const sportFilter = runtime.sportsbook.sportFilter || "all";
    const sportChips = el("div", { className: "prediction-filter-chips" }, [
      el("button", {
        className: `prediction-chip${sportFilter === "all" ? " prediction-chip--active" : ""}`,
        textContent: "All sports",
        onclick: () => { runtime.sportsbook.sportFilter = "all"; persist(); render(); },
      }),
      ...sports.map((sport) => el("button", {
        className: `prediction-chip${sportFilter === sport ? " prediction-chip--active" : ""}`,
        textContent: sport,
        onclick: () => { runtime.sportsbook.sportFilter = sport; persist(); render(); },
      })),
    ]);

    const visibleEvents = filterEvents(runtime.sportsbook.events, sportFilter);

    const predFilter = runtime.sportsbook.predictions.categoryFilter || "all";
    const filteredPredictions = filterMarkets(runtime.sportsbook.predictions.markets, predFilter);
    const categoryChips = el("div", { className: "prediction-filter-chips" }, [
      el("button", {
        className: `prediction-chip${predFilter === "all" ? " prediction-chip--active" : ""}`,
        textContent: "All",
        onclick: () => { runtime.sportsbook.predictions.categoryFilter = "all"; persist(); render(); },
      }),
      ...MARKET_CATEGORIES.map((cat) => el("button", {
        className: `prediction-chip${predFilter === cat.id ? " prediction-chip--active" : ""}`,
        textContent: cat.label,
        onclick: () => { runtime.sportsbook.predictions.categoryFilter = cat.id; persist(); render(); },
      })),
    ]);

    const board = runtime.sportsbook.activeTab === "sports"
      ? el("div", {}, [
        sportChips,
        el("p", {
          className: "dim",
          textContent: `Scenario slate · cursor ${runtime.sportsbook.scenarioCursor} · ${runtime.sportsbook.scenarioDb?.scenarios?.length ?? "…"} stored events`,
        }),
        ...visibleEvents.map((event, i) => el("div", { className: "event-card" }, eventCardLines(el, event, i))),
        visibleEvents.length ? null : el("p", { className: "dim", textContent: "No events for this sport filter." }),
      ])
      : el("div", {}, [
        el("p", {
          className: "dim",
          textContent: "History Desk settles to recorded truth. Cycle slates from the 125+ scenario database.",
        }),
        categoryChips,
        el("p", {
          className: "dim",
          textContent: `Prediction slate · cursor ${runtime.sportsbook.predictions.scenarioCursor} · ${runtime.sportsbook.predictions.scenarioDb?.scenarios?.length ?? "…"} stored markets`,
        }),
        ...filteredPredictions.map((market, i) =>
          el("div", {
            className: `event-card prediction-card prediction-card--${market.category}`,
          }, [
            el("div", { className: "sport", textContent: categoryLabel(market.category) }),
            el("div", { innerHTML: `<strong>${i + 1}) ${market.question}</strong>` }),
            market.scenarioId ? el("div", { className: "dim", textContent: `Scenario ${market.scenarioId}` }) : null,
            market.blurb ? el("div", { className: "prediction-blurb", textContent: market.blurb }) : null,
            el("div", {
              className: "dim",
              textContent: `YES ${market.yesPrice}¢ · NO ${market.noPrice}¢ · Vol ${market.volume.toLocaleString()}${market.fixedResolution ? " · History Desk" : ""}`,
            }),
          ])
        ),
        filteredPredictions.length ? null : el("p", { className: "dim", textContent: "No markets in this category — try All or next slate." }),
      ]);

    const pendingEl = el("div", { className: "pending-tickets" });
    if (runtime.sportsbook.pending.length || runtime.sportsbook.predictions.positions.length) {
      pendingEl.appendChild(el("p", { className: "subtitle", textContent: "Open positions:" }));
      for (const slip of runtime.sportsbook.pending) {
        const label = slip.betType === "parlay"
          ? `${slip.legs?.length ?? 0}-leg parlay @ ${fmtOdds(slip.odds)}`
          : `${slip.pick} (${slip.betType}, ${fmtOdds(slip.odds)}) — ${slip.event?.label ?? ""}`;
        pendingEl.appendChild(el("div", {
          className: "ticket",
          textContent: `${slip.amount.toLocaleString()} chips on ${label}`,
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
      ? ["Place sports wager", "Build parlay (2–4 legs)", "Settle all open positions", "Next scenario slate"]
      : ["Place prediction contract", "Refresh market prices", "Next prediction slate", "Settle all open positions"];

    return el("div", { className: "panel" }, [
      banner(sportsbookBannerTitle()),
      chipLine(),
      salonDesk
        ? el("p", {
          className: "success",
          textContent: "High Limit Salon exclusives — these tickets never hit the main floor board.",
        })
        : null,
      tier ? el("p", { className: "dim", textContent: `${tier.name}: ${formatStakeRange(wagerStakes.minBet, wagerStakes.maxBet, { noCap: tier.maxBet == null })}` }) : null,
      el("div", { className: "sportsbook-tabs" }, [tabSports, tabPredictions]),
      el("p", { className: "subtitle", textContent: runtime.sportsbook.activeTab === "sports" ? "Today's Board" : "Prediction Markets" }),
      board,
      pendingEl,
      menu(menuItems, "Sports Book:", (choice) => {
        if (choice === 0) { goBack(); return; }
        if (runtime.sportsbook.activeTab === "sports") {
          if (choice === 1) pushView("sportsbook-wager");
          else if (choice === 2) pushView("sportsbook-parlay");
          else if (choice === 3) pushView("sportsbook-settle");
          else if (choice === 4) {
            runtime.sportsbook.refreshBoard(true);
            persist();
            render();
          }
        } else {
          if (choice === 1) pushView("sportsbook-prediction");
          else if (choice === 2) { runtime.sportsbook.predictions.refreshPrices(); persist(); render(); }
          else if (choice === 3) {
            runtime.sportsbook.predictions.nextSlate(runtime.sportsbook.events);
            persist();
            render();
          } else if (choice === 4) pushView("sportsbook-settle");
        }
      }),
    ]);
  }

  function renderSportsbookWager() {
    if (!runtime.sportsbook.events.length) {
      return el("div", { className: "panel" }, [
        banner("Place Wager"),
        el("p", { className: "error", textContent: "No events on the board. Go back and load the next slate." }),
        el("div", { className: "action-bar" }, [
          el("button", { className: "btn", textContent: "Back", onclick: () => { popView(); render(); } }),
        ]),
      ]);
    }
    const act = ACTIVITIES.sportsbook;
    const tier = runtime.stakeTier;
    const wagerStakes = tier
      ? effectiveTableStakes(tier, ctx.session.wallet.balance, resolveActivityMin(runtime, act.minBet))
      : { minBet: resolveActivityMin(runtime, act.minBet), maxBet: ctx.session.wallet.balance };
    const visible = filterEvents(runtime.sportsbook.events, runtime.sportsbook.sportFilter);
    const eventPool = visible.length ? visible : runtime.sportsbook.events;
    const eventSelect = el("select", {}, eventPool.map((e, i) =>
      el("option", { value: String(i), textContent: `${i + 1}) ${e.label}` })
    ));
    const betTypeSelect = el("select");
    const pickSelect = el("select");
    const propRow = el("div", { className: "form-row", style: "display:none;" }, [
      el("label", { textContent: "Prop" }),
      el("select", { id: "prop-select" }),
    ]);
    const propSelect = propRow.querySelector("select");
    const amountInput = el("input", {
      type: "number", min: String(wagerStakes.minBet), max: String(wagerStakes.maxBet), value: String(wagerStakes.minBet),
    });

    function rebuildBetTypes() {
      const event = eventPool[parseInt(eventSelect.value, 10)];
      const types = availableBetTypes(event);
      betTypeSelect.innerHTML = "";
      const labels = {
        moneyline: "Moneyline",
        spread: "Spread",
        total: "Total (over/under)",
        prop: "Prop",
        outright: "Outright",
        futures: "Futures contract",
      };
      for (const t of types) {
        betTypeSelect.appendChild(el("option", { value: t, textContent: labels[t] ?? t }));
      }
      updatePicks();
    }

    function updatePicks() {
      const event = eventPool[parseInt(eventSelect.value, 10)];
      const betType = betTypeSelect.value;
      pickSelect.innerHTML = "";
      propRow.style.display = "none";
      if (!event) return;

      if (betType === "moneyline") {
        pickSelect.appendChild(el("option", { value: event.away, textContent: `${event.away} (${fmtOdds(event.awayOdds)})` }));
        pickSelect.appendChild(el("option", { value: event.home, textContent: `${event.home} (${fmtOdds(event.homeOdds)})` }));
      } else if (betType === "spread") {
        pickSelect.appendChild(el("option", {
          value: event.home,
          textContent: `${event.home} ${event.spread >= 0 ? "+" : ""}${event.spread} (${fmtOdds(event.spreadHomeOdds)})`,
        }));
        pickSelect.appendChild(el("option", {
          value: event.away,
          textContent: `${event.away} ${(-event.spread) >= 0 ? "+" : ""}${-event.spread} (${fmtOdds(event.spreadAwayOdds)})`,
        }));
      } else if (betType === "total") {
        pickSelect.appendChild(el("option", { value: "over", textContent: `Over ${event.total} (${fmtOdds(event.totalOverOdds)})` }));
        pickSelect.appendChild(el("option", { value: "under", textContent: `Under ${event.total} (${fmtOdds(event.totalUnderOdds)})` }));
      } else if (betType === "prop") {
        propRow.style.display = "";
        propSelect.innerHTML = "";
        for (const prop of event.props ?? []) {
          propSelect.appendChild(el("option", { value: prop.id, textContent: `${prop.label} (Y ${fmtOdds(prop.yesOdds)} / N ${fmtOdds(prop.noOdds)})` }));
        }
        pickSelect.appendChild(el("option", { value: "yes", textContent: "Yes" }));
        pickSelect.appendChild(el("option", { value: "no", textContent: "No" }));
      } else if (betType === "outright" || betType === "futures") {
        for (const name of event.field ?? [event.home, event.away]) {
          pickSelect.appendChild(el("option", {
            value: name,
            textContent: `${name} (${fmtOdds(event.outrightOdds?.[name] ?? -110)})`,
          }));
        }
      }
    }
    eventSelect.onchange = rebuildBetTypes;
    betTypeSelect.onchange = updatePicks;
    rebuildBetTypes();

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
            const event = eventPool[parseInt(eventSelect.value, 10)];
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
            showStatus(`Ticket placed: ${amount.toLocaleString()} chips on ${pick}.`);
            popView();
            render();
          },
        }),
        el("button", { className: "btn", textContent: "Back", onclick: () => { popView(); render(); } }),
      ]),
    ]);
  }

  function renderSportsbookParlay() {
    const games = runtime.sportsbook.events.filter((e) => e.eventType === "game");
    if (games.length < 2) {
      return el("div", { className: "panel" }, [
        banner("Parlay Desk"),
        el("p", { className: "error", textContent: "Need at least two game events on the board for a parlay." }),
        el("div", { className: "action-bar" }, [
          el("button", { className: "btn", textContent: "Back", onclick: () => { popView(); render(); } }),
        ]),
      ]);
    }
    const act = ACTIVITIES.sportsbook;
    const tier = runtime.stakeTier;
    const wagerStakes = tier
      ? effectiveTableStakes(tier, ctx.session.wallet.balance, resolveActivityMin(runtime, act.minBet))
      : { minBet: resolveActivityMin(runtime, act.minBet), maxBet: ctx.session.wallet.balance };

    const legCount = Math.min(4, games.length);
    const legSelects = [];
    for (let i = 0; i < legCount; i += 1) {
      const eventSelect = el("select", {}, games.map((e, idx) =>
        el("option", { value: String(idx), textContent: `${idx + 1}) ${e.label}` })
      ));
      eventSelect.selectedIndex = Math.min(i, games.length - 1);
      const sideSelect = el("select", {}, [
        el("option", { value: "home", textContent: "Home ML" }),
        el("option", { value: "away", textContent: "Away ML" }),
        el("option", { value: "over", textContent: "Over total" }),
        el("option", { value: "under", textContent: "Under total" }),
      ]);
      legSelects.push({ eventSelect, sideSelect });
    }
    const amountInput = el("input", {
      type: "number", min: String(wagerStakes.minBet), max: String(wagerStakes.maxBet), value: String(wagerStakes.minBet),
    });
    const oddsHint = el("p", { className: "dim", textContent: "" });

    function refreshOdds() {
      const legs = [];
      const used = new Set();
      for (const { eventSelect, sideSelect } of legSelects) {
        const event = games[parseInt(eventSelect.value, 10)];
        if (!event || used.has(event.eventId)) continue;
        used.add(event.eventId);
        const side = sideSelect.value;
        let betType = "moneyline";
        let pick = event.home;
        if (side === "away") pick = event.away;
        if (side === "over" || side === "under") {
          betType = "total";
          pick = side;
        }
        legs.push({ event, betType, pick, odds: oddsForSelection(event, betType, pick) });
      }
      if (legs.length < 2) {
        oddsHint.textContent = "Select at least two different events.";
        return legs;
      }
      const combined = combineAmericanOdds(legs.map((l) => l.odds));
      const amt = parseInt(amountInput.value, 10) || wagerStakes.minBet;
      const p = combined > 0
        ? Math.floor((amt * combined) / 100)
        : Math.floor((amt * 100) / Math.abs(combined));
      oddsHint.textContent = `${legs.length}-leg parlay @ ${fmtOdds(combined)} — to-win ${p.toLocaleString()} chips`;
      return legs;
    }
    for (const { eventSelect, sideSelect } of legSelects) {
      eventSelect.onchange = refreshOdds;
      sideSelect.onchange = refreshOdds;
    }
    amountInput.oninput = refreshOdds;
    refreshOdds();

    return el("div", { className: "panel" }, [
      banner("Parlay Desk"),
      chipLine(),
      el("p", { className: "dim", textContent: "2–4 legs · moneyline or totals · same event cannot be used twice." }),
      ...legSelects.flatMap(({ eventSelect, sideSelect }, i) => [
        el("p", { className: "subtitle", textContent: `Leg ${i + 1}` }),
        el("div", { className: "form-row" }, [el("label", { textContent: "Event" }), eventSelect]),
        el("div", { className: "form-row" }, [el("label", { textContent: "Pick" }), sideSelect]),
      ]),
      el("div", { className: "form-row" }, [el("label", { textContent: "Wager amount" }), amountInput]),
      oddsHint,
      el("div", { className: "action-bar" }, [
        el("button", {
          className: "btn primary",
          textContent: "Place parlay",
          onclick: () => {
            const legs = refreshOdds();
            if (legs.length < 2) { alert("Need at least two distinct legs."); return; }
            const amount = parseInt(amountInput.value, 10);
            if (amount < wagerStakes.minBet) { alert(`Minimum wager is ${wagerStakes.minBet} chips.`); return; }
            if (amount > wagerStakes.maxBet) { alert(`Maximum wager is ${wagerStakes.maxBet} chips.`); return; }
            const odds = combineAmericanOdds(legs.map((l) => l.odds));
            if (!ctx.session.wallet.debit(amount, "runtime.sportsbook", `${legs.length}-leg parlay`)) {
              alert("Insufficient chips."); return;
            }
            runtime.sportsbook.addTicket({
              betType: "parlay",
              pick: `${legs.length}-leg`,
              amount,
              odds,
              legs: legs.map((l) => ({
                event: l.event,
                betType: l.betType,
                pick: l.pick,
                amount: 0,
                odds: l.odds,
              })),
            });
            persist();
            showStatus(`Parlay placed: ${legs.length} legs @ ${fmtOdds(odds)}.`);
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
      ? effectiveTableStakes(tier, ctx.session.wallet.balance, resolveActivityMin(runtime, act.minBet))
      : { minBet: resolveActivityMin(runtime, act.minBet), maxBet: ctx.session.wallet.balance };

    const marketsForSelect = filterMarkets(
      runtime.sportsbook.predictions.markets,
      runtime.sportsbook.predictions.categoryFilter || "all",
    );
    const marketPool = marketsForSelect.length ? marketsForSelect : runtime.sportsbook.predictions.markets;
    const marketSelect = el("select", {}, marketPool.map((m, i) =>
      el("option", { value: String(i), textContent: `${i + 1}) [${categoryLabel(m.category)}] ${m.question}` })
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
      const market = marketPool[parseInt(marketSelect.value, 10)];
      if (!market) return;
      const side = sideSelect.value;
      const price = side === "yes" ? market.yesPrice : market.noPrice;
      const amt = parseInt(amountInput.value, 10) || wagerStakes.minBet;
      priceHint.textContent = `${side.toUpperCase()} @ ${price}¢ — max payout ${predictionPayout(amt, price).toLocaleString()} chips${market.scenarioId ? ` · ${market.scenarioId}` : ""}`;
    }
    marketSelect.onchange = refreshPrice;
    sideSelect.onchange = refreshPrice;
    amountInput.oninput = refreshPrice;
    refreshPrice();

    return el("div", { className: "panel" }, [
      banner("Prediction Contract"),
      chipLine(),
      el("p", { className: "dim", textContent: "YES/NO contracts from the stored scenario database — prices in cents." }),
      el("div", { className: "form-row" }, [el("label", { textContent: "Market" }), marketSelect]),
      el("div", { className: "form-row" }, [el("label", { textContent: "Side" }), sideSelect]),
      el("div", { className: "form-row" }, [el("label", { textContent: "Stake" }), amountInput]),
      priceHint,
      el("div", { className: "action-bar" }, [
        el("button", {
          className: "btn primary",
          textContent: "Buy contract",
          onclick: () => {
            const market = marketPool[parseInt(marketSelect.value, 10)];
            const side = sideSelect.value;
            const amount = parseInt(amountInput.value, 10);
            const priceCents = side === "yes" ? market.yesPrice : market.noPrice;
            if (amount < wagerStakes.minBet) { alert(`Minimum stake is ${wagerStakes.minBet} chips.`); return; }
            if (amount > wagerStakes.maxBet) { alert(`Maximum stake is ${wagerStakes.maxBet} chips.`); return; }
            if (!ctx.session.wallet.debit(amount, "sportsbook", `Prediction ${side} @ ${priceCents}¢`)) {
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
          const label = r.slip.betType === "parlay"
            ? `${r.slip.legs?.length ?? 0}-leg parlay`
            : (r.event?.label ?? "Ticket");
          log.appendChild(el("div", { className: "line", innerHTML: `<strong>${label}:</strong> ${r.slip.betType === "parlay" ? "" : formatEventScore(r.event)}` }));
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
    "sportsbook-parlay": renderSportsbookParlay,
    "sportsbook-prediction": renderSportsbookPrediction,
    "sportsbook-settle": renderSportsbookSettle,
  };
}
