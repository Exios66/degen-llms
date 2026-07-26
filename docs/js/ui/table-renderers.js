// Extracted from app.js — shared by the web terminal and the pixel RPG.
import { Action, BlackjackGame, defaultConfig } from "../blackjack/game.js";
import { ACTIVITIES, fmtChips, signedChips } from "../core.js";
import { getSessionDealer, pickQuip } from "../dealers.js";
import { BettingAction, HoldemTable } from "../holdem/game.js";
import { HAND_CLASS_NAMES } from "../holdem/hand_eval.js";
import { applyTierSpeedCss, getActivityTiming } from "../rewards-perks.js";
import { BET_TYPES, RED_NUMBERS, appendSpinHistory, resolveBet, spinWheel, wheelColor } from "../roulette.js";
import { effectiveTableStakes, formatStakeRange } from "../stakes.js";

export function buildTableRenderers(ctx) {
  const { el, statusBanner, showStatus, menu, dealerPanel, videoMachine, cardRow, machineLog, pushView, popView, goBack, popToView, render, persist, recordActivityVisit, recordActivityResult } = ctx;
  const runtime = ctx.runtime;

  function renderTable(snapshot) {
    const container = el("div", { className: "felt-table bj-table-layout" });

    if (snapshot.dealer) {
      const d = snapshot.dealer;
      const dealerRow = el("div", { className: "bj-dealer-row" }, [
        el("span", { className: "bj-role-label", textContent: runtime.activeTableDealer?.name ?? "Dealer" }),
        cardRow(d.cards, { rowId: "bj-dealer" }),
        el("span", { className: "bj-hand-value", textContent: `(${d.value})` }),
      ]);
      container.appendChild(dealerRow);
    }

    const seatsEl = el("div", { className: "bj-seats" });
    for (const row of snapshot.rows) {
      const badges = [];
      if (row.surrendered) badges.push(el("span", { className: "bj-seat-badge bj-seat-badge--surrender", textContent: "SURR" }));
      else if (row.bust) badges.push(el("span", { className: "bj-seat-badge bj-seat-badge--bust", textContent: "BUST" }));
      else if (row.blackjack) badges.push(el("span", { className: "bj-seat-badge bj-seat-badge--bj", textContent: "BJ" }));

      const seatEl = el("div", { className: row.highlight ? "bj-seat bj-seat--active" : "bj-seat" }, [
        el("div", { className: "bj-seat-info" }, [
          el("div", { className: "bj-seat-name", textContent: `Seat ${row.seat} ${row.label}` }),
          el("div", {
            className: "bj-seat-meta",
            textContent: `${fmtChips(row.bankroll)} · bet ${fmtChips(row.bet)}`,
          }),
        ]),
        cardRow(row.cards, { rowId: `bj-seat-${row.seat}-${row.label}` }),
        el("span", { className: "bj-hand-value", textContent: `(${row.value})` }),
        ...badges,
      ]);
      seatsEl.appendChild(seatEl);
    }
    container.appendChild(seatsEl);
    return container;
  }

  function renderHoldemTable(table) {
    const felt = el("div", { className: "felt-table holdem-table-layout" });
    felt.appendChild(el("div", { className: "holdem-pot", textContent: `Pot ${fmtChips(table.pot)}` }));
    felt.appendChild(el("div", { className: "holdem-street", textContent: table.street }));

    const boardCards = [];
    for (let i = 0; i < 5; i++) boardCards.push(table.community[i] ?? null);
    felt.appendChild(cardRow(boardCards, { slots: 5, rowId: "holdem-board" }));

    const playersEl = el("div", { className: "holdem-players" });
    for (const p of table.players) {
      const isActive = !table.handOver && table.players[table.actionIndex] === p;
      const holeCards = p.isHuman || table.handOver
        ? p.hole
        : p.hole.map(() => null);
      const seat = el("div", {
        className: [
          "holdem-seat",
          p.isHuman ? "holdem-seat--you" : "",
          p.folded ? "holdem-seat--folded" : "",
          isActive ? "holdem-seat--active" : "",
        ].filter(Boolean).join(" "),
      }, [
        el("div", { className: "holdem-seat-name", textContent: p.name }),
        el("div", { className: "holdem-seat-stack", textContent: `${fmtChips(p.stack)}${p.folded ? " · folded" : ""}${p.allIn ? " · all-in" : ""}` }),
        el("div", { className: "holdem-hole-cards" }, [
          cardRow(holeCards, {
            hiddenMask: (_, c) => !c,
            rowId: `holdem-hole-${p.name}`,
          }),
        ]),
      ]);
      playersEl.appendChild(seat);
    }
    felt.appendChild(playersEl);
    return felt;
  }

  function renderRouletteWheel(lastNumber = null, spinning = false) {
    const wheel = el("div", { className: `roulette-wheel${spinning ? " roulette-wheel--spinning" : ""}` });
    const wrap = el("div", { className: "roulette-wheel-panel" }, [
      el("div", { className: "roulette-wheel-wrap" }, [
        el("div", { className: "roulette-wheel-pointer" }),
        wheel,
        lastNumber != null
          ? el("div", {
            className: `roulette-result-ball roulette-result-ball--${wheelColor(lastNumber)}`,
            textContent: String(lastNumber),
          })
          : null,
      ]),
      el("p", {
        className: "roulette-result-label",
        textContent: lastNumber != null ? `Ball on ${lastNumber} (${wheelColor(lastNumber)})` : "Place your bets",
      }),
    ]);
    return wrap;
  }

  /** Animated recent-spin strip — newest result on the left. */
  function renderRouletteHistory(history = [], { pulseNewest = false } = {}) {
    const strip = el("div", {
      className: `roulette-history${pulseNewest ? " roulette-history--pulse" : ""}`,
      "aria-label": "Roulette spin history",
    });
    strip.appendChild(el("div", { className: "roulette-history-label", textContent: "Spin history" }));
    const track = el("div", { className: "roulette-history-track" });
    if (!history.length) {
      track.appendChild(el("span", {
        className: "roulette-history-empty",
        textContent: "Results appear here as the wheel spins",
      }));
    } else {
      history.forEach((entry, i) => {
        track.appendChild(el("div", {
          className: [
            "roulette-history-chip",
            `roulette-history-chip--${entry.color}`,
            i === 0 && pulseNewest ? "roulette-history-chip--enter" : "",
          ].filter(Boolean).join(" "),
          textContent: String(entry.number),
          title: `${entry.number} · ${entry.color}`,
          "aria-label": `${entry.number} ${entry.color}`,
        }));
      });
    }
    strip.appendChild(track);
    return strip;
  }

  function pushRouletteHistory(number) {
    runtime.roulette.history = appendSpinHistory(runtime.roulette.history || [], number, { limit: 18 });
    runtime.roulette.historyPulse = true;
  }

  function renderRouletteBetMat(straightInput, onPick) {
    const mat = el("div", { className: "roulette-bet-mat" });
    const zeroBtn = el("button", { type: "button", textContent: "0" });
    zeroBtn.onclick = () => { straightInput.value = "0"; if (onPick) onPick(0); };
    mat.appendChild(el("div", { className: "roulette-mat-zero" }, [zeroBtn]));

    const grid = el("div", { className: "roulette-mat-grid" });
    for (let n = 1; n <= 36; n++) {
      const isRed = RED_NUMBERS.has(n);
      const btn = el("button", { type: "button", textContent: String(n) });
      btn.onclick = () => { straightInput.value = String(n); if (onPick) onPick(n); };
      grid.appendChild(el("div", {
        className: `roulette-mat-cell roulette-mat-cell--${isRed ? "red" : "black"}`,
      }, [btn]));
    }
    mat.appendChild(grid);
    return mat;
  }


  function renderBlackjackMenu() {
    const act = ACTIVITIES.blackjack;
    if (ctx.session.wallet.balance < act.minBet) {
      return videoMachine("blackjack", {
        title: "BLACKJACK",
        screenChildren: [
          el("p", { className: "error", textContent: `You need at least ${act.minBet} chips to sit down.` }),
        ],
        controls: el("div", { className: "action-bar" }, [
          el("button", { className: "btn", textContent: "Back", onclick: () => { popView(); render(); } }),
        ]),
      });
    }
    recordActivityVisit("blackjack");
    persist();
    const tier = runtime.stakeTier;
    const tableStakes = tier
      ? effectiveTableStakes(tier, ctx.session.wallet.balance, act.minBet)
      : { minBet: act.minBet, maxBet: ctx.session.wallet.balance };
    return videoMachine("blackjack", {
      title: "BLACKJACK",
      screenChildren: [
        statusBanner(),
        dealerPanel("blackjack"),
        tier ? el("p", { className: "dim", textContent: `${tier.name}: ${formatStakeRange(tableStakes.minBet, tableStakes.maxBet, { noCap: tier.maxBet == null })}` }) : null,
        el("p", { className: "machine-screen-label", textContent: "Select table" }),
        menu(["Quick hand (solo, table minimums)", "Custom table setup"], null, (choice) => {
          if (choice === 0) { goBack(); return; }
          if (choice === 1) {
            startBlackjack(defaultConfig(ctx.session.wallet.balance));
          } else {
            pushView("blackjack-custom");
          }
        }, { showCasinoBanner: false }),
      ],
    });
  }

  function renderBlackjackCustom() {
    const tier = runtime.stakeTier;
    const tableStakes = tier ? effectiveTableStakes(tier, ctx.session.wallet.balance, 10) : { minBet: 10, maxBet: Math.min(100, ctx.session.wallet.balance) };
    const modeSelect = el("select", {}, [
      el("option", { value: "solo", textContent: "Solo" }),
      el("option", { value: "bots", textContent: "Table with bots" }),
    ]);
    const minBet = el("input", { type: "number", value: String(tableStakes.minBet), min: "1" });
    const maxBet = el("input", { type: "number", value: String(tableStakes.maxBet), min: "1" });
    const decks = el("input", { type: "number", value: "6", min: "1", max: "8" });
    const bots = el("input", { type: "number", value: "2", min: "1", max: "6" });
    const seat = el("input", { type: "number", value: "2", min: "1", max: "7" });
    const dealerRule = el("select", {}, [
      el("option", { value: "h17", textContent: "H17 (dealer hits soft 17)" }),
      el("option", { value: "s17", textContent: "S17 (dealer stands on soft 17)" }),
    ]);

    const botsRow = el("div", { className: "form-row" }, [el("label", { textContent: "Simulated players (1-6)" }), bots]);
    const seatRow = el("div", { className: "form-row" }, [el("label", { textContent: "Your seat" }), seat]);

    function toggleBotFields() {
      const show = modeSelect.value === "bots";
      botsRow.style.display = show ? "" : "none";
      seatRow.style.display = show ? "" : "none";
    }
    modeSelect.onchange = toggleBotFields;
    toggleBotFields();

    return videoMachine("blackjack", {
      title: "TABLE SETUP",
      screenChildren: [
        el("p", { className: "machine-screen-label", textContent: "Custom blackjack table" }),
        el("div", { className: "form-row" }, [el("label", { textContent: "Mode" }), modeSelect]),
        el("div", { className: "form-row" }, [el("label", { textContent: "Minimum bet" }), minBet]),
        el("div", { className: "form-row" }, [el("label", { textContent: "Maximum bet" }), maxBet]),
        el("div", { className: "form-row" }, [el("label", { textContent: "Decks in shoe (1-8)" }), decks]),
        botsRow,
        seatRow,
        el("div", { className: "form-row" }, [el("label", { textContent: "Dealer rule" }), dealerRule]),
      ],
      controls: el("div", { className: "action-bar" }, [
        el("button", {
          className: "btn primary",
          textContent: "Sit down",
          onclick: () => {
            const balance = ctx.session.wallet.balance;
            const cfg = {
              startingBankroll: balance,
              minBet: parseInt(minBet.value, 10),
              maxBet: parseInt(maxBet.value, 10),
              numDecks: parseInt(decks.value, 10),
              dealerHitsSoft17: dealerRule.value === "h17",
              numBots: modeSelect.value === "bots" ? parseInt(bots.value, 10) : 0,
              humanSeat: modeSelect.value === "bots" ? parseInt(seat.value, 10) : 1,
            };
            if (cfg.minBet <= 0 || cfg.maxBet < cfg.minBet) { alert("Invalid bet limits."); return; }
            startBlackjack(cfg);
          },
        }),
        el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
      ]),
    });
  }
  function renderHoldemMenu() {
    const act = ACTIVITIES.holdem;
    if (ctx.session.wallet.balance < act.minBet) {
      return videoMachine("holdem", {
        title: "TEXAS HOLD'EM",
        screenChildren: [
          el("p", { className: "error", textContent: `You need at least ${act.minBet} chips to sit down.` }),
        ],
        controls: el("div", { className: "action-bar" }, [
          el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
        ]),
      });
    }
    recordActivityVisit("holdem");
    persist();
    const tier = runtime.stakeTier;
    const buyInStakes = tier
      ? effectiveTableStakes(tier, ctx.session.wallet.balance, act.minBet)
      : { minBet: act.minBet, maxBet: ctx.session.wallet.balance };
    const buyInInput = el("input", {
      type: "number",
      min: String(buyInStakes.minBet),
      max: String(buyInStakes.maxBet),
      value: String(Math.min(200, buyInStakes.maxBet)),
    });
    const ranksEl = el("div", {
      className: "holdem-rank-ref dim",
      textContent: HAND_CLASS_NAMES.map((n, i) => `${i}: ${n}`).join(" · "),
    });
    return videoMachine("holdem", {
      title: "TEXAS HOLD'EM",
      screenChildren: [
        dealerPanel("holdem"),
        el("p", {
          className: "dim",
          textContent: "No-limit Hold'em · 5-handed (you + 4 bots) · Preflop → Flop → Turn → River. Buy-in stays on the table across hands.",
        }),
        el("p", { className: "machine-screen-label", textContent: "Hand rankings" }),
        ranksEl,
        el("div", { className: "form-row" }, [
          el("label", { textContent: `Buy-in (${buyInStakes.minBet}–${buyInStakes.maxBet})` }),
          buyInInput,
        ]),
      ],
      controls: el("div", { className: "action-bar" }, [
        el("button", {
          className: "btn primary",
          textContent: "Sit down",
          onclick: () => {
            const buyIn = parseInt(buyInInput.value, 10);
            if (buyIn < buyInStakes.minBet) { alert(`Minimum buy-in is ${buyInStakes.minBet}.`); return; }
            if (buyIn > buyInStakes.maxBet) { alert(`Maximum buy-in is ${buyInStakes.maxBet}.`); return; }
            if (!ctx.session.wallet.debit(buyIn, "holdem", `Hold'em buy-in ${fmtChips(buyIn)}`)) {
              alert("Insufficient chips."); return;
            }
            persist();
            runtime.holdem = {
              table: HoldemTable.quickTable(buyIn, 4),
              buyIn,
              sessionNet: 0,
              hands: 0,
              log: [],
            };
            runtime.holdem.table.startHand();
            processHoldemBots();
            pushView("holdem-play");
          },
        }),
        el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
      ]),
    });
  }
  function processHoldemBots() {
    if (!runtime.holdem || runtime.holdem.table.handOver) return;
    const table = runtime.holdem.table;
    let guard = 0;
    while (!table.handOver && guard < 80) {
      guard += 1;
      const player = table.players[table.actionIndex];
      if (!player || player.folded || player.allIn) {
        table.actionIndex = (table.actionIndex + 1) % table.players.length;
        table._seekActor();
        continue;
      }
      if (player.isHuman) break;
      const decision = table.botAction(player);
      const msg = table.applyAction(player, decision.action, decision.raiseTo);
      runtime.holdem.log.push(msg);
    }
  }
  function renderHoldemPlay() {
    if (!runtime.holdem) return el("div", { className: "panel" }, [
      el("p", { className: "error", textContent: "No active Hold'em table." }),
      el("div", { className: "action-bar" }, [
        el("button", { className: "btn", textContent: "Back to Hold'em", onclick: () => { popView(); render(); } }),
      ]),
    ]);
    const table = runtime.holdem.table;

    // Keep the action log in sync with engine street / bot messages.
    if (table.actionLog?.length) {
      runtime.holdem.log = [...table.actionLog];
    }
    const logLines = [...runtime.holdem.log];

    if (table.handOver) {
      if (table.showdownScores.length) {
        for (const { name, score } of table.showdownScores) {
          logLines.push({ text: `${name}: ${score.name}`, type: "" });
        }
      }
      if (table.lastMessage) logLines.push({ text: table.lastMessage, type: "success" });
    }

    const sessionDelta = table.human.stack - runtime.holdem.buyIn;
    const actionBar = el("div", { className: "action-bar holdem-action-bar" });

    if (table.handOver) {
      if (table.human.stack >= table.bigBlind) {
        actionBar.appendChild(el("button", {
          className: "btn primary",
          textContent: "Next hand",
          onclick: () => {
            runtime.holdem.hands += 1;
            runtime.holdem.log = [];
            table.startHand();
            processHoldemBots();
            render();
          },
        }));
      }
      actionBar.appendChild(el("button", {
        className: "btn",
        textContent: "Leave table",
        onclick: () => finishHoldem(),
      }));
    } else {
      const player = table.players[table.actionIndex];
      if (player?.isHuman) {
        const legal = table.legalActions(player);
        const toCall = Math.max(0, table.currentBet - player.betThisStreet);
        if (legal.has(BettingAction.CHECK)) {
          actionBar.appendChild(el("button", {
            className: "btn primary",
            textContent: "Check",
            onclick: () => {
              table.applyAction(player, BettingAction.CHECK);
              processHoldemBots();
              render();
            },
          }));
        }
        if (legal.has(BettingAction.CALL)) {
          actionBar.appendChild(el("button", {
            className: "btn primary",
            textContent: toCall >= player.stack ? `All-in ${fmtChips(player.stack)}` : `Call ${fmtChips(toCall)}`,
            onclick: () => {
              table.applyAction(player, BettingAction.CALL);
              processHoldemBots();
              render();
            },
          }));
        }
        if (legal.has(BettingAction.RAISE)) {
          const minTo = table.minRaiseTo(player);
          const maxTo = table.maxRaiseTo(player);
          const raiseWrap = el("div", { className: "holdem-raise-controls" });
          const raiseInput = el("input", {
            type: "number",
            className: "holdem-raise-input",
            min: String(minTo),
            max: String(maxTo),
            value: String(minTo),
            title: `Raise to between ${minTo} and ${maxTo}`,
          });
          raiseWrap.appendChild(el("label", {
            className: "holdem-raise-label",
            textContent: toCall > 0 ? "Raise to" : "Bet",
          }));
          raiseWrap.appendChild(raiseInput);
          raiseWrap.appendChild(el("button", {
            className: "btn primary",
            textContent: maxTo <= minTo ? `All-in ${fmtChips(maxTo)}` : (toCall > 0 ? "Raise" : "Bet"),
            onclick: () => {
              let raiseTo = parseInt(raiseInput.value, 10);
              if (!Number.isFinite(raiseTo)) raiseTo = minTo;
              if (raiseTo < minTo && raiseTo < maxTo) {
                alert(`Raise must be at least ${fmtChips(minTo)}, or go all-in for ${fmtChips(maxTo)}.`);
                return;
              }
              raiseTo = Math.min(Math.max(raiseTo, Math.min(minTo, maxTo)), maxTo);
              try {
                table.applyAction(player, BettingAction.RAISE, raiseTo);
              } catch (err) {
                alert(err.message || String(err));
                return;
              }
              processHoldemBots();
              render();
            },
          }));
          raiseWrap.appendChild(el("button", {
            className: "btn",
            textContent: "All-in",
            onclick: () => {
              try {
                table.applyAction(player, BettingAction.RAISE, maxTo);
              } catch (err) {
                alert(err.message || String(err));
                return;
              }
              processHoldemBots();
              render();
            },
          }));
          actionBar.appendChild(raiseWrap);
        }
        if (legal.has(BettingAction.FOLD)) {
          actionBar.appendChild(el("button", {
            className: "btn",
            textContent: "Fold",
            onclick: () => {
              table.applyAction(player, BettingAction.FOLD);
              processHoldemBots();
              render();
            },
          }));
        }
      } else {
        actionBar.appendChild(el("p", { className: "dim", textContent: "Bots acting…" }));
        queueMicrotask(() => {
          processHoldemBots();
          render();
        });
      }
      actionBar.appendChild(el("button", {
        className: "btn",
        textContent: "Leave table",
        onclick: () => finishHoldem(),
      }));
    }

    return videoMachine("holdem", {
      title: "TEXAS HOLD'EM",
      screenChildren: [
        el("p", {
          className: "machine-status",
          textContent: `Stack ${fmtChips(table.human.stack)} · Buy-in ${fmtChips(runtime.holdem.buyIn)} · Session ${signedChips(sessionDelta)} · Blinds ${fmtChips(table.smallBlind)}/${fmtChips(table.bigBlind)} · ${table.players.length} players`,
        }),
        renderHoldemTable(table),
        machineLog(logLines, { max: 16 }),
      ],
      controls: actionBar,
      footerExtra: el("span", {
        className: "machine-led",
        textContent: `HAND ${runtime.holdem.hands + 1} · ${String(table.street).toUpperCase()}`,
      }),
    });
  }

  function finishHoldem(silent = false) {
    if (runtime.holdem) {
      const cash = runtime.holdem.table.human.stack;
      ctx.session.wallet.credit(cash, "holdem", "Cash out from Hold'em table");
      runtime.holdem.sessionNet = cash - runtime.holdem.buyIn;
      recordActivityResult("holdem", runtime.holdem.sessionNet, runtime.holdem.hands);
      persist();
      if (!silent) {
        showStatus(`Left Hold'em table. Session net: ${signedChips(runtime.holdem.sessionNet)}`);
      }
      runtime.holdem = null;
    }
    popToView("floor");
    render();
  }
  function renderRoulette() {
    const act = ACTIVITIES.roulette;
    if (ctx.session.wallet.balance < act.minBet) {
      return videoMachine("roulette", {
        title: "ROULETTE",
        screenChildren: [
          el("p", { className: "error", textContent: `You need at least ${act.minBet} chips to play.` }),
        ],
        controls: el("div", { className: "action-bar" }, [
          el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
        ]),
      });
    }
    recordActivityVisit("roulette");
    persist();

    const tier = runtime.roulette.tier ?? runtime.stakeTier;
    if (tier) applyTierSpeedCss(tier.id);
    const spinMs = tier ? getActivityTiming(tier.id).rouletteSpin : 1200;
    const wagerStakes = tier
      ? effectiveTableStakes(tier, ctx.session.wallet.balance, act.minBet)
      : { minBet: act.minBet, maxBet: ctx.session.wallet.balance };

    const betSelect = el("select", {}, BET_TYPES.map((b, i) =>
      el("option", { value: String(i), textContent: b.label })
    ));
    const straightInput = el("input", { type: "number", min: "0", max: "36", value: "7" });
    const straightRow = el("div", { className: "form-row" }, [
      el("label", { textContent: "Straight number (0–36)" }), straightInput,
    ]);
    straightRow.style.display = BET_TYPES[0].kind === "straight" ? "" : "none";
    betSelect.onchange = () => {
      straightRow.style.display = BET_TYPES[betSelect.value].kind === "straight" ? "" : "none";
    };

    const rememberedWager = Number.isFinite(runtime.roulette.lastWager)
      ? Math.min(wagerStakes.maxBet, Math.max(wagerStakes.minBet, runtime.roulette.lastWager))
      : wagerStakes.minBet;
    const amountInput = el("input", {
      type: "number",
      min: String(wagerStakes.minBet),
      max: String(wagerStakes.maxBet),
      value: String(rememberedWager),
    });
    amountInput.oninput = () => {
      const typed = parseInt(amountInput.value, 10);
      if (Number.isFinite(typed) && typed > 0) runtime.roulette.lastWager = typed;
    };
    const resultEl = el("p", {
      className: "dim",
      textContent: runtime.roulette.lastNumber != null
        ? `Last spin: ${runtime.roulette.lastNumber} (${wheelColor(runtime.roulette.lastNumber)})`
        : "European wheel (0–36). Place a bet and spin.",
    });
    const summaryEl = el("p", {
      className: "roulette-session",
      textContent: runtime.roulette.spins
        ? `Session: ${signedChips(runtime.roulette.sessionNet)} over ${runtime.roulette.spins} spin(s)`
        : "",
    });
    const pulseNewest = Boolean(runtime.roulette.historyPulse);
    if (runtime.roulette.historyPulse) {
      // Consume the pulse flag so only the newly landed number animates in.
      runtime.roulette.historyPulse = false;
    }
    const historyEl = renderRouletteHistory(runtime.roulette.history || [], { pulseNewest });

    const onMatPick = (n) => {
      betSelect.value = "0";
      straightRow.style.display = "";
      straightInput.value = String(n);
    };

    const rouletteDisplay = el("div", { className: "roulette-display" }, [
      renderRouletteWheel(runtime.roulette.lastNumber, runtime.roulette.spinning),
      renderRouletteBetMat(straightInput, onMatPick),
    ]);

    function doSpin() {
      const bet = BET_TYPES[parseInt(betSelect.value, 10)];
      const amount = parseInt(amountInput.value, 10);
      if (amount < act.minBet) {
        resultEl.className = "error";
        resultEl.textContent = `Minimum bet is ${act.minBet}.`;
        return;
      }
      if (!ctx.session.wallet.debit(amount, "roulette", `Roulette ${bet.kind}`)) {
        resultEl.className = "error";
        resultEl.textContent = "Insufficient chips.";
        return;
      }
      runtime.roulette.lastWager = amount;
      const dealer = runtime.activeTableDealer ?? getSessionDealer(ctx.session, "roulette");
      resultEl.className = "dim";
      resultEl.textContent = `${dealer.name}: "${pickQuip(dealer, "deal")}"`;
      runtime.roulette.spinning = true;
      render();

      setTimeout(() => {
        const number = spinWheel();
        const straightPick = bet.kind === "straight" ? parseInt(straightInput.value, 10) : null;
        const { win, reason } = resolveBet(bet, amount, number, straightPick);
        runtime.roulette.spins += 1;
        runtime.roulette.lastNumber = number;
        runtime.roulette.spinning = false;
        pushRouletteHistory(number);
        resultEl.className = win > 0 ? "success" : "dim";
        const quip = pickQuip(dealer, win > 0 ? "win" : "lose");
        resultEl.textContent = `Ball lands on ${number} (${wheelColor(number)}) — ${reason}. ${dealer.name}: "${quip}"`;
        if (win > 0) {
          ctx.session.wallet.credit(win, "roulette", reason);
          runtime.roulette.sessionNet += win - amount;
        } else {
          runtime.roulette.sessionNet -= amount;
        }
        summaryEl.textContent = `Session: ${signedChips(runtime.roulette.sessionNet)} over ${runtime.roulette.spins} spin(s)`;
        persist();
        render();
      }, spinMs);
    }

    return videoMachine("roulette", {
      title: "ROULETTE",
      screenChildren: [
        dealerPanel("roulette"),
        historyEl,
        rouletteDisplay,
        el("div", { className: "roulette-outside-bets" }, [
          el("div", { className: "form-row" }, [el("label", { textContent: "Bet type" }), betSelect]),
          el("div", { className: "form-row" }, [el("label", { textContent: "Wager" }), amountInput]),
        ]),
        straightRow,
        resultEl,
        summaryEl,
      ],
      controls: el("div", { className: "action-bar" }, [
        el("button", {
          className: "btn primary",
          textContent: "Spin",
          onclick: doSpin,
          disabled: runtime.roulette.spinning,
        }),
        el("button", {
          className: "btn",
          textContent: "Leave table",
          onclick: () => {
            recordActivityResult("roulette", runtime.roulette.sessionNet, runtime.roulette.spins);
            persist();
            goBack();
          },
        }),
      ]),
      footerExtra: el("span", {
        className: "machine-led",
        textContent: runtime.roulette.spins ? `SPIN ${runtime.roulette.spins}` : "READY",
      }),
    });
  }

  // ── Horse Stables ──────────────────────────────────────────────────────────
  const STABLE_HORSE_DATA = [
    { id: "black",       name: "Midnight",    stall: 1, note: "Calm at dawn, electric at the gate." },
    { id: "tan",         name: "Biscuit",     stall: 2, note: "Loves apples. Will follow you anywhere." },
    { id: "grey",        name: "Sterling",    stall: 3, note: "Three-time distance champion. Retired hero." },
    { id: "chestnut",    name: "Ember",       stall: 4, note: "Fastest quarter-mile in Mandalay history." },
    { id: "light_brown", name: "Hazel",       stall: 5, note: "Gentle giant. Prefers morning workouts." },
    { id: "dark_brown",  name: "Cacao",       stall: 6, note: "Suspicious of hats. Loves carrots." },
    { id: "bay",         name: "Sovereign",   stall: 7, note: "Racing royalty. Eleven wins this season." },
    { id: "dapple",      name: "Cloudberry",  stall: 8, note: "Newest arrival. Still learning the track." },
  ];


  function startBlackjack(config) {
    const chipsBefore = ctx.session.wallet.balance;
    config.startingBankroll = chipsBefore;
    config.maxBet = Math.min(config.maxBet, chipsBefore);
    runtime.blackjackSessionNet = 0;

    runtime.blackjackGame = new BlackjackGame(
      {
        startingBankroll: config.startingBankroll,
        minBet: config.minBet ?? 10,
        maxBet: config.maxBet ?? Math.min(100, chipsBefore),
        numDecks: config.numDecks ?? 6,
        dealerHitsSoft17: config.dealerHitsSoft17 ?? true,
        numBots: config.numBots ?? 0,
        humanSeat: config.humanSeat ?? 1,
      },
      (newBalance) => {
        ctx.session.wallet.syncBalance(newBalance, "blackjack", "Table balance sync");
        persist();
      }
    );
    runtime.blackjackGame.beginRound();
    if (runtime.activeTableDealer) {
      runtime.blackjackGame.messages.push({
        type: "dim",
        text: `${runtime.activeTableDealer.name}: "${pickQuip(runtime.activeTableDealer, "deal")}"`,
      });
    }
    pushView("blackjack-play");
  }

  function renderBlackjackPlay() {
    if (!runtime.blackjackGame) return el("div", { className: "panel" }, [
      el("p", { className: "error", textContent: "No active blackjack game." }),
      el("div", { className: "action-bar" }, [
        el("button", { className: "btn", textContent: "Back to Blackjack", onclick: () => { popView(); render(); } }),
      ]),
    ]);

    const game = runtime.blackjackGame;
    const reveal = game.phase === "settlement" || game.phase === "complete" || game.dealer.holeRevealed;
    const highlight = game.pendingAction?.player?.seat ?? game.human()?.seat;
    const snapshot = game.getTableSnapshot(reveal, highlight);
    const tableEl = renderTable(snapshot);
    const actionBar = el("div", { className: "action-bar" });

    if (game.phase === "betting" && game.pendingBet) {
      const betInput = el("input", {
        type: "number",
        min: String(game.config.minBet),
        max: String(Math.min(game.config.maxBet, game.human().bankroll)),
        value: String(game.config.minBet),
      });
      actionBar.appendChild(el("div", { className: "form-row" }, [
        el("label", { textContent: `Place bet ($${game.config.minBet}-$${game.config.maxBet}, 0 to leave)` }),
        betInput,
      ]));
      actionBar.appendChild(el("button", {
        className: "btn primary",
        textContent: "Deal",
        onclick: () => {
          const amount = parseInt(betInput.value, 10);
          if (amount === 0) {
            finishBlackjack(true);
            return;
          }
          if (!game.placeHumanBet(amount)) {
            showStatus(`Enter a bet between ${game.config.minBet} and ${Math.min(game.config.maxBet, game.human().bankroll)}.`, "error");
            return;
          }
          if (game.roundOverEarly) {
            finishBlackjack(true);
            return;
          }
          render();
        },
      }));
    }

    if (game.pendingInsurance) {
      actionBar.appendChild(el("button", {
        className: "btn primary", textContent: "Take insurance",
        onclick: () => { game.takeInsurance(true); render(); },
      }));
      actionBar.appendChild(el("button", {
        className: "btn", textContent: "Decline",
        onclick: () => { game.takeInsurance(false); render(); },
      }));
    }

    if (game.pendingAction) {
      const legal = game.getCurrentLegalActions();
      const shortcuts = [
        [Action.HIT, "Hit (H)"], [Action.STAND, "Stand (S)"], [Action.DOUBLE, "Double (D)"],
        [Action.SPLIT, "Split (P)"], [Action.SURRENDER, "Surrender (U)"],
      ];
      for (const [act, label] of shortcuts) {
        if (legal.has(act)) {
          actionBar.appendChild(el("button", {
            className: "btn primary",
            textContent: label,
            onclick: () => { game.playerAction(act); render(); },
          }));
        }
      }
    }

    if (game.phase === "complete" && !game.roundOverEarly) {
      if (game.canPlayAnother()) {
        actionBar.appendChild(el("button", {
          className: "btn primary",
          textContent: "Play another hand",
          onclick: () => {
            runtime.blackjackSessionNet += game.humanNet;
            game.beginRound();
            render();
          },
        }));
      }
      actionBar.appendChild(el("button", {
        className: "btn",
        textContent: "Leave table",
        onclick: () => finishBlackjack(),
      }));
    }

    if (game.roundOverEarly && game.phase === "complete") {
      actionBar.appendChild(el("button", {
        className: "btn",
        textContent: "Leave table",
        onclick: () => finishBlackjack(),
      }));
    }

    return videoMachine("blackjack", {
      title: runtime.activeTableDealer ? runtime.activeTableDealer.name.toUpperCase() : "BLACKJACK",
      screenChildren: [
        runtime.activeTableDealer
          ? el("p", { className: "machine-status", textContent: runtime.activeTableDealer.tagline })
          : null,
        el("p", { className: "machine-status", textContent: game.statusLine() }),
        tableEl,
        machineLog(game.messages),
        game.phase === "complete" && !game.roundOverEarly
          ? machineLog(game.resultLines.map((line) => ({
            text: line,
            type: line.includes("+") ? "success" : line.includes("-") ? "error" : "",
          })), { max: 8 })
          : null,
      ],
      controls: actionBar,
      footerExtra: el("span", {
        className: "machine-led",
        textContent: game.phase === "betting" ? "PLACE BET" : game.phase.toUpperCase(),
      }),
    });
  }

  function finishBlackjack(silent = false) {
    if (runtime.blackjackGame) {
      if (runtime.blackjackGame.phase === "complete" && !runtime.blackjackGame.roundOverEarly) {
        runtime.blackjackSessionNet += runtime.blackjackGame.humanNet;
      }
      recordActivityResult("blackjack", runtime.blackjackSessionNet);
      persist();
      if (!silent) {
        showStatus(`Leaving table. Session net: ${runtime.blackjackSessionNet >= 0 ? "+" : ""}${runtime.blackjackSessionNet.toLocaleString()} chips`);
      }
      runtime.blackjackGame = null;
      runtime.blackjackSessionNet = 0;
    }
    popToView("hub");
    render();
  }

  return {
    "blackjack-menu": renderBlackjackMenu,
    "blackjack-custom": renderBlackjackCustom,
    "blackjack-play": renderBlackjackPlay,
    "holdem-menu": renderHoldemMenu,
    "holdem-play": renderHoldemPlay,
    roulette: renderRoulette,
    finishBlackjack,
    finishHoldem,
    startBlackjack,
  };
}
