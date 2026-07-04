import {
  CASINO_NAME, ACTIVITIES, FLOOR_ORDER, fmtChips, signedChips,
  saveSlot, loadSlot, createSlot, deleteSlot, listSlots, recentSlots, formatSaveTime,
  PlayerSession,
} from "./core.js";
import { MACHINES, spinReels, displaySymbol, calculatePayout, PAYTABLE_TEXT } from "./slots.js";
import { SportsbookState, fmtOdds } from "./sportsbook.js";
import { BlackjackGame, defaultConfig, Action } from "./blackjack/game.js";

const app = document.getElementById("app");

let session = new PlayerSession();
let sportsbook = new SportsbookState();
let blackjackGame = null;
let blackjackSessionNet = 0;
let slotsState = { machine: null, sessionNet: 0, spins: 0 };
let viewStack = [];

function persist() {
  if (session.slotId != null) saveSlot(session);
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "className") node.className = v;
    else if (k === "textContent") node.textContent = v;
    else if (k === "innerHTML") node.innerHTML = v;
    else if (k.startsWith("on")) node[k.toLowerCase()] = v;
    else node.setAttribute(k, v);
  }
  for (const child of children) {
    if (typeof child === "string") node.appendChild(document.createTextNode(child));
    else if (child) node.appendChild(child);
  }
  return node;
}

function banner(title) {
  return el("div", { className: "banner" }, [el("h1", { textContent: title })]);
}

function chipLine() {
  return el("p", { className: "chip-line", textContent: `Chips: ${fmtChips(session.wallet.balance)}` });
}

function menu(options, title, onSelect) {
  const items = options.map((opt, i) =>
    el("li", {}, [
      el("button", {
        className: "menu-btn",
        innerHTML: `<span class="num">${i + 1})</span> ${opt}`,
        onclick: () => onSelect(i + 1),
      }),
    ])
  );
  items.push(el("li", {}, [
    el("button", {
      className: "menu-btn back",
      innerHTML: '<span class="num">0)</span> Back',
      onclick: () => onSelect(0),
    }),
  ]));
  const frag = [banner(CASINO_NAME)];
  if (title) frag.push(el("p", { className: "subtitle", textContent: title }));
  frag.push(el("ul", { className: "menu-list" }, items));
  return el("div", { className: "panel" }, frag);
}

function settingsBar() {
  const saveLabel = session.slotId != null
    ? (session.slotLabel || `Slot ${session.slotId}`)
    : "No save";
  return el("div", { className: "settings-bar" }, [
    el("span", { className: "dim", textContent: `Save: ${saveLabel}` }),
    el("label", {}, [
      el("input", {
        type: "checkbox",
        checked: session.useColor,
        onchange: (e) => { session.useColor = e.target.checked; persist(); render(); },
      }),
      "Colors",
    ]),
    el("label", {}, [
      el("input", {
        type: "checkbox",
        checked: session.useUnicode,
        onchange: (e) => { session.useUnicode = e.target.checked; persist(); render(); },
      }),
      "Unicode symbols",
    ]),
    el("button", {
      className: "btn",
      textContent: "Change save",
      onclick: () => {
        persist();
        sportsbook = new SportsbookState();
        blackjackGame = null;
        viewStack = [{ name: "save-picker", data: {} }];
        render();
      },
    }),
  ]);
}

function formatCardLabel(card) {
  if (!card) return session.useUnicode ? "[?]" : "[??]";
  const label = card.label(session.useUnicode);
  if (session.useColor && card.isRed()) return `<span class="card-red">${label}</span>`;
  return label;
}

function renderTable(snapshot) {
  const container = el("div", { className: "table-display" });
  for (const row of snapshot.rows) {
    const cards = row.cards.map((c) => formatCardLabel(c)).join(" ");
    let suffix = "";
    if (row.surrendered) suffix = " [surrendered]";
    else if (row.bust) suffix = " [BUST]";
    else if (row.blackjack) suffix = " [BLACKJACK]";
    const cls = row.highlight ? "seat-line highlight" : "seat-line";
    container.appendChild(el("div", {
      className: cls,
      innerHTML: `Seat ${row.seat} ${row.label} (${fmtChips(row.bankroll)}): bet ${fmtChips(row.bet)} — ${cards} (${row.value})${suffix}`,
    }));
  }
  if (snapshot.dealer) {
    const d = snapshot.dealer;
    const cards = d.cards.map((c) => formatCardLabel(c)).join(" ");
    container.appendChild(el("div", {
      className: "dealer-line",
      innerHTML: `Dealer: ${cards} (${d.value})`,
    }));
  }
  return container;
}

function renderSavePicker() {
  const recent = recentSlots();
  const allSlots = listSlots();
  const container = el("div", { className: "panel" }, [
    banner("Save Library"),
    el("p", { className: "subtitle", textContent: "Select a save slot to continue, or create a new visit:" }),
  ]);

  if (recent.length) {
    container.appendChild(el("p", { className: "subtitle", textContent: "Recent Saves" }));
    const recentList = el("div", { className: "stats-grid" });
    for (const slot of recent) {
      recentList.appendChild(el("div", {
        className: "stat-row dim",
        textContent: `Slot ${slot.slotId}: ${slot.label} — ${slot.playerName} — ${fmtChips(slot.balance)} (last: ${formatSaveTime(slot.updatedAt)})`,
      }));
    }
    container.appendChild(recentList);
  }

  const menuList = el("ul", { className: "menu-list" });
  allSlots.forEach((slot, i) => {
    const label = slot.occupied
      ? `Load Slot ${slot.slotId} — ${slot.playerName} (${fmtChips(slot.balance)})`
      : `New save in Slot ${slot.slotId} (empty)`;
    menuList.appendChild(el("li", {}, [
      el("button", {
        className: "menu-btn",
        innerHTML: `<span class="num">${i + 1})</span> ${label}`,
        onclick: () => handleSlotChoice(slot),
      }),
    ]));
  });

  const deleteIdx = allSlots.length;
  menuList.appendChild(el("li", {}, [
    el("button", {
      className: "menu-btn",
      innerHTML: `<span class="num">${deleteIdx + 1})</span> Delete a save`,
      onclick: () => pushView("save-delete"),
    }),
  ]));

  container.appendChild(el("p", { className: "subtitle", textContent: "Save slots:" }));
  container.appendChild(menuList);
  container.appendChild(el("p", { className: "footer-note", textContent: "Your most recent saves appear at the top of the library." }));
  return container;

  function handleSlotChoice(slot) {
    if (slot.occupied) {
      const loaded = loadSlot(slot.slotId);
      if (!loaded) { alert(`Could not load Slot ${slot.slotId}.`); return; }
      session = loaded;
      sportsbook = new SportsbookState();
      blackjackGame = null;
      viewStack = [{ name: "hub", data: {} }];
      render();
      return;
    }
    pushView("save-create", { slotId: slot.slotId });
  }
}

function renderSaveCreate({ slotId }) {
  const nameInput = el("input", { type: "text", value: "Guest" });
  const labelInput = el("input", { type: "text", value: `Slot ${slotId}` });
  const chipsInput = el("input", { type: "number", min: "100", max: "1000000", value: "1000" });

  return el("div", { className: "panel" }, [
    banner(`New Save — Slot ${slotId}`),
    el("div", { className: "form-row" }, [el("label", { textContent: "Player name" }), nameInput]),
    el("div", { className: "form-row" }, [el("label", { textContent: "Save label" }), labelInput]),
    el("div", { className: "form-row" }, [el("label", { textContent: "Starting chips" }), chipsInput]),
    el("div", { className: "action-bar" }, [
      el("button", {
        className: "btn primary",
        textContent: "Create & enter casino",
        onclick: () => {
          session = createSlot(slotId, {
            playerName: nameInput.value.trim() || "Guest",
            label: labelInput.value.trim() || `Slot ${slotId}`,
            chips: parseInt(chipsInput.value, 10) || 1000,
            useColor: session.useColor,
            useUnicode: session.useUnicode,
          });
          sportsbook = new SportsbookState();
          blackjackGame = null;
          viewStack = [{ name: "hub", data: {} }];
          render();
        },
      }),
      el("button", {
        className: "btn",
        textContent: "Back",
        onclick: () => { viewStack = [{ name: "save-picker", data: {} }]; render(); },
      }),
    ]),
  ]);
}

function renderSaveDelete() {
  const occupied = listSlots().filter((s) => s.occupied);
  if (!occupied.length) {
    return el("div", { className: "panel" }, [
      banner("Delete Save"),
      el("p", { className: "error", textContent: "No saves to delete." }),
      el("div", { className: "action-bar" }, [
        el("button", { className: "btn", textContent: "Back", onclick: () => { popView(); render(); } }),
      ]),
    ]);
  }

  const menuList = el("ul", { className: "menu-list" });
  occupied.forEach((slot, i) => {
    menuList.appendChild(el("li", {}, [
      el("button", {
        className: "menu-btn",
        innerHTML: `<span class="num">${i + 1})</span> Slot ${slot.slotId} — ${slot.playerName} (${fmtChips(slot.balance)})`,
        onclick: () => {
          if (confirm(`Delete Slot ${slot.slotId}? This cannot be undone.`)) {
            deleteSlot(slot.slotId);
            if (session.slotId === slot.slotId) session = new PlayerSession();
            render();
          }
        },
      }),
    ]);
  });

  return el("div", { className: "panel" }, [
    banner("Delete Save"),
    el("p", { className: "subtitle", textContent: "Choose a save to delete:" }),
    menuList,
    el("div", { className: "action-bar" }, [
      el("button", { className: "btn", textContent: "Back", onclick: () => { popView(); render(); } }),
    ]),
  ]);
}

function renderHub() {
  const floors = [...FLOOR_ORDER, "Cashier", "Player Stats", "Save Game", "Leave Casino"];
  const options = floors.map((f) => (FLOOR_ORDER.includes(f) ? `Explore ${f}` : f));

  const wrap = el("div", {}, [
    settingsBar(),
    banner(CASINO_NAME),
    session.slotId != null
      ? el("p", { className: "dim", textContent: `Save: ${session.slotLabel || `Slot ${session.slotId}`}` })
      : null,
    el("p", { className: "welcome-line", textContent: `Welcome, ${session.playerName}` }),
    chipLine(),
    el("div", { className: "panel" }, [
      el("p", { className: "subtitle", textContent: "Choose your adventure:" }),
      el("ul", { className: "menu-list" }, [
        ...options.map((opt, i) => el("li", {}, [
          el("button", {
            className: "menu-btn",
            innerHTML: `<span class="num">${i + 1})</span> ${opt}`,
            onclick: () => handleChoice(i + 1),
          }),
        ])),
        el("li", {}, [
          el("button", {
            className: "menu-btn back",
            innerHTML: '<span class="num">0)</span> Back',
            onclick: () => handleChoice(0),
          }),
        ]),
      ]),
    ]),
    el("p", { className: "footer-note", textContent: "Play in your browser — session saved locally" }),
  ]);
  return wrap;

  function handleChoice(choice) {
    if (choice === 0) return;
    if (choice <= FLOOR_ORDER.length) {
      pushView("floor", { floor: FLOOR_ORDER[choice - 1] });
    } else if (choice === FLOOR_ORDER.length + 1) {
      pushView("cashier");
    } else if (choice === FLOOR_ORDER.length + 2) {
      pushView("stats");
    } else if (choice === FLOOR_ORDER.length + 3) {
      if (session.slotId != null) {
        persist();
        alert(`Game saved to ${session.slotLabel || `Slot ${session.slotId}`}.`);
      } else {
        alert("No save slot active.");
      }
    } else {
      pushView("leave");
    }
  }
}

function renderFloor({ floor }) {
  const activities = Object.values(ACTIVITIES).filter((a) => a.floor === floor);
  const options = activities.map((a) => `${a.name} — min ${a.minBet} chips`);

  return el("div", {}, [
    banner(`${floor}`),
    chipLine(),
    menu(options, `${floor}:`, (choice) => {
      if (choice === 0) { popView(); return; }
      const act = activities[choice - 1];
      if (act.id === "blackjack") pushView("blackjack-menu");
      else if (act.id === "slots") pushView("slots-menu");
      else if (act.id === "sportsbook") pushView("sportsbook");
    }),
  ]);
}

function renderCashier() {
  const content = el("div", {}, [
    banner("Cashier"),
    chipLine(),
  ]);

  const panel = menu(
    ["Buy chips ($500 bundle)", "Buy custom amount", "Cash out chips", "View transaction ledger"],
    "Chip window:",
    (choice) => {
      if (choice === 0) { popView(); return; }
      if (choice === 1) {
        session.wallet.buyIn(500);
        persist();
        alert(`Purchased ${fmtChips(500)}. Balance: ${fmtChips(session.wallet.balance)}`);
        render();
      } else if (choice === 2) {
        pushView("cashier-buy");
      } else if (choice === 3) {
        pushView("cashier-cashout");
      } else if (choice === 4) {
        pushView("cashier-ledger");
      }
    }
  );
  content.appendChild(panel);
  return content;
}

function renderCashierBuy() {
  const input = el("input", { type: "number", min: "50", max: "100000", value: "500" });
  return el("div", { className: "panel" }, [
    banner("Buy Chips"),
    chipLine(),
    el("div", { className: "form-row" }, [el("label", { textContent: "Amount ($50–$100,000)" }), input]),
    el("div", { className: "action-bar" }, [
      el("button", {
        className: "btn primary",
        textContent: "Purchase",
        onclick: () => {
          const amount = parseInt(input.value, 10);
          if (amount < 50 || amount > 100000) { alert("Enter $50–$100,000"); return; }
          session.wallet.buyIn(amount);
          persist();
          alert(`Purchased ${fmtChips(amount)}. Balance: ${fmtChips(session.wallet.balance)}`);
          popView();
          render();
        },
      }),
      el("button", { className: "btn", textContent: "Back", onclick: () => { popView(); render(); } }),
    ]),
  ]);
}

function renderCashierCashout() {
  const input = el("input", {
    type: "number", min: "1", max: String(session.wallet.balance), value: String(session.wallet.balance),
  });
  return el("div", { className: "panel" }, [
    banner("Cash Out"),
    chipLine(),
    el("div", { className: "form-row" }, [el("label", { textContent: "Amount to cash out" }), input]),
    el("div", { className: "action-bar" }, [
      el("button", {
        className: "btn primary",
        textContent: "Cash out",
        onclick: () => {
          const amount = parseInt(input.value, 10);
          if (session.wallet.cashOut(amount)) {
            persist();
            alert(`Cashed out ${fmtChips(amount)}. Balance: ${fmtChips(session.wallet.balance)}`);
            popView();
            render();
          } else alert("Cash out failed.");
        },
      }),
      el("button", { className: "btn", textContent: "Back", onclick: () => { popView(); render(); } }),
    ]),
  ]);
}

function renderCashierLedger() {
  const txs = session.wallet.recentTransactions(20);
  const table = el("table", { className: "ledger-table" }, [
    el("thead", {}, [el("tr", {}, [
      el("th", { textContent: "Time" }),
      el("th", { textContent: "Activity" }),
      el("th", { textContent: "Amount" }),
      el("th", { textContent: "Balance" }),
      el("th", { textContent: "Description" }),
    ])]),
    el("tbody", {}, txs.length ? [...txs].reverse().map((tx) => {
      const d = new Date(tx.timestamp);
      const sign = tx.amount >= 0 ? "+" : "";
      return el("tr", {}, [
        el("td", { textContent: d.toLocaleTimeString() }),
        el("td", { textContent: tx.activity }),
        el("td", { textContent: `${sign}${tx.amount.toLocaleString()}` }),
        el("td", { textContent: tx.balanceAfter.toLocaleString() }),
        el("td", { textContent: tx.description }),
      ]);
    }) : [el("tr", {}, [el("td", { colSpan: "5", className: "dim", textContent: "No transactions yet." })])]),
  ]);

  return el("div", { className: "panel" }, [
    banner("Transaction Ledger"),
    table,
    el("div", { className: "action-bar" }, [
      el("button", { className: "btn", textContent: "Back", onclick: () => { popView(); render(); } }),
    ]),
  ]);
}

function renderStats() {
  const stats = session.activityStats;
  const rows = Object.entries(stats).map(([id, s]) => {
    const info = Object.values(ACTIVITIES).find((a) => a.id === id);
    const name = info?.name ?? id;
    return el("div", {
      className: "stat-row",
      textContent: `${name}: ${s.visits} visit(s), ${s.handsOrBets} bet(s), net ${s.netWinnings >= 0 ? "+" : ""}${s.netWinnings.toLocaleString()} chips`,
    });
  });

  return el("div", { className: "panel" }, [
    banner("Player Stats"),
    el("p", { textContent: `Player: ${session.playerName}` }),
    chipLine(),
    el("p", { textContent: `Session net (excl. buy-ins): ${session.wallet.netSession >= 0 ? "+" : ""}${session.wallet.netSession.toLocaleString()} chips` }),
    rows.length ? el("div", { className: "stats-grid" }, rows) : el("p", { className: "dim", textContent: "No activity history yet." }),
    el("div", { className: "action-bar" }, [
      el("button", { className: "btn", textContent: "Back", onclick: () => { popView(); render(); } }),
    ]),
  ]);
}

function renderLeave() {
  return el("div", { className: "panel" }, [
    banner("Leave Casino"),
    el("p", { textContent: "Are you sure you want to leave The Mandalay Bay?" }),
    chipLine(),
    el("div", { className: "action-bar" }, [
      el("button", {
        className: "btn danger",
        textContent: "Leave",
        onclick: () => {
          persist();
          alert(`Thanks for visiting ${CASINO_NAME}. Final balance: ${fmtChips(session.wallet.balance)}`);
          viewStack = [{ name: "save-picker", data: {} }];
          render();
        },
      }),
      el("button", { className: "btn", textContent: "Stay", onclick: () => { popView(); render(); } }),
    ]),
  ]);
}

function renderSlotsMenu() {
  session.recordVisit("slots");
  persist();
  const options = MACHINES.map((m) => m.name);
  return el("div", {}, [
    banner("Slot Machines — Mandalay Fortune Slots"),
    chipLine(),
    menu(options, "Pick a machine:", (choice) => {
      if (choice === 0) { popView(); return; }
      slotsState = { machine: MACHINES[choice - 1], sessionNet: 0, spins: 0 };
      pushView("slots-play");
    }),
  ]);
}

function renderSlotsPlay() {
  const machine = slotsState.machine;
  const maxBet = Math.min(machine.maxBet, session.wallet.balance);
  const betInput = el("input", {
    type: "number", min: String(machine.minBet), max: String(maxBet), value: String(machine.minBet),
  });
  const reelsEl = el("div", { className: "reels", textContent: "— — —" });
  const msgEl = el("p", { className: "dim", textContent: "Place your bet and spin." });
  const summaryEl = el("p", { textContent: "" });

  function doSpin() {
    const bet = parseInt(betInput.value, 10);
    if (bet === 0) {
      session.recordResult("slots", slotsState.sessionNet, slotsState.spins);
      persist();
      summaryEl.textContent = `Slots session: ${slotsState.sessionNet >= 0 ? "+" : ""}${slotsState.sessionNet.toLocaleString()} chips over ${slotsState.spins} spin(s)`;
      popView();
      render();
      return;
    }
    if (bet < machine.minBet) { msgEl.className = "error"; msgEl.textContent = `Minimum spin is ${machine.minBet}.`; return; }
    if (!session.wallet.debit(bet, "slots", `Slot spin ${fmtChips(bet)}`)) {
      msgEl.className = "error"; msgEl.textContent = "Insufficient chips."; return;
    }
    const reels = spinReels();
    const shown = reels.map((r) => displaySymbol(r, session.useUnicode)).join(" | ");
    reelsEl.textContent = shown;
    const { win, reason } = calculatePayout(reels, bet);
    slotsState.spins += 1;
    if (win > 0) {
      session.wallet.credit(win, "slots", reason);
      slotsState.sessionNet += win - bet;
      msgEl.className = "success";
      msgEl.textContent = `${reason} — Won ${win.toLocaleString()} chips!`;
    } else {
      slotsState.sessionNet -= bet;
      msgEl.className = "dim";
      msgEl.textContent = "No win this spin.";
    }
    persist();
    chipDisplay.textContent = `Chips: ${fmtChips(session.wallet.balance)}`;
  }

  const chipDisplay = el("p", { className: "chip-line", textContent: `Chips: ${fmtChips(session.wallet.balance)}` });

  return el("div", { className: "panel" }, [
    banner(`Slot Machines — ${machine.name}`),
    chipDisplay,
    el("p", { className: "dim", textContent: PAYTABLE_TEXT }),
    reelsEl,
    msgEl,
    el("div", { className: "form-row" }, [
      el("label", { textContent: `Spin amount (${machine.minBet}-${maxBet}, 0 to leave)` }),
      betInput,
    ]),
    el("div", { className: "action-bar" }, [
      el("button", { className: "btn primary", textContent: "Spin", onclick: doSpin }),
      el("button", {
        className: "btn",
        textContent: "Leave machine",
        onclick: () => {
          session.recordResult("slots", slotsState.sessionNet, slotsState.spins);
          persist();
          popView();
          render();
        },
      }),
    ]),
    summaryEl,
  ]);
}

function renderSportsbook() {
  session.recordVisit("sportsbook");
  persist();

  const board = el("div", {}, sportsbook.events.map((event, i) =>
    el("div", { className: "event-card" }, [
      el("div", { className: "sport", textContent: event.sport }),
      el("div", { innerHTML: `<strong>${i + 1}) ${event.label}</strong>` }),
      el("div", { className: "dim", innerHTML: `ML: ${event.away} ${fmtOdds(event.awayOdds)} | ${event.home} ${fmtOdds(event.homeOdds)}` }),
      el("div", { className: "dim", innerHTML: `Spread: ${event.home} ${event.spread >= 0 ? "+" : ""}${event.spread} (${fmtOdds(event.spreadHomeOdds)}) | ${event.away} ${(-event.spread) >= 0 ? "+" : ""}${-event.spread} (${fmtOdds(event.spreadAwayOdds)})` }),
    ])
  ));

  const pendingEl = el("div", { className: "pending-tickets" });
  if (sportsbook.pending.length) {
    pendingEl.appendChild(el("p", { className: "subtitle", textContent: "Open tickets:" }));
    for (const slip of sportsbook.pending) {
      pendingEl.appendChild(el("div", {
        className: "ticket",
        textContent: `${slip.amount.toLocaleString()} chips on ${slip.pick} (${slip.betType}, ${fmtOdds(slip.odds)}) — ${slip.event.label}`,
      }));
    }
  }

  return el("div", { className: "panel" }, [
    banner("Sports Book — Mandalay Sports Book"),
    chipLine(),
    el("p", { className: "subtitle", textContent: "Today's Board" }),
    board,
    pendingEl,
    menu(["Place a wager", "Settle all open bets (simulate results)", "Refresh lines"], "Sports Book:", (choice) => {
      if (choice === 0) { popView(); return; }
      if (choice === 1) pushView("sportsbook-wager");
      else if (choice === 2) pushView("sportsbook-settle");
      else if (choice === 3) { sportsbook.refreshBoard(true); render(); }
    }),
  ]);
}

function renderSportsbookWager() {
  const eventSelect = el("select", {}, sportsbook.events.map((e, i) =>
    el("option", { value: String(i), textContent: `${i + 1}) ${e.label}` })
  ));
  const betTypeSelect = el("select", {}, [
    el("option", { value: "moneyline", textContent: "Moneyline" }),
    el("option", { value: "spread", textContent: "Spread" }),
  ]);
  const pickSelect = el("select");
  const amountInput = el("input", {
    type: "number", min: "10", max: String(session.wallet.balance), value: "10",
  });

  function updatePicks() {
    const event = sportsbook.events[parseInt(eventSelect.value, 10)];
    pickSelect.innerHTML = "";
    if (betTypeSelect.value === "moneyline") {
      pickSelect.appendChild(el("option", { value: event.away, textContent: event.away }));
      pickSelect.appendChild(el("option", { value: event.home, textContent: event.home }));
    } else {
      pickSelect.appendChild(el("option", {
        value: event.home,
        textContent: `${event.home} ${event.spread >= 0 ? "+" : ""}${event.spread}`,
      }));
      pickSelect.appendChild(el("option", {
        value: event.away,
        textContent: `${event.away} ${(-event.spread) >= 0 ? "+" : ""}${-event.spread}`,
      }));
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
    el("div", { className: "form-row" }, [el("label", { textContent: "Pick" }), pickSelect]),
    el("div", { className: "form-row" }, [el("label", { textContent: "Wager amount" }), amountInput]),
    el("div", { className: "action-bar" }, [
      el("button", {
        className: "btn primary",
        textContent: "Place ticket",
        onclick: () => {
          const event = sportsbook.events[parseInt(eventSelect.value, 10)];
          const betType = betTypeSelect.value;
          const pick = pickSelect.value;
          const amount = parseInt(amountInput.value, 10);
          if (amount < 10) { alert("Minimum wager is 10 chips."); return; }
          let odds;
          if (betType === "moneyline") {
            odds = pick === event.away ? event.awayOdds : event.homeOdds;
          } else {
            odds = pick === event.home ? event.spreadHomeOdds : event.spreadAwayOdds;
          }
          if (!session.wallet.debit(amount, "sportsbook", `${betType} on ${pick}`)) {
            alert("Insufficient chips."); return;
          }
          sportsbook.addTicket({ event, betType, pick, amount, odds });
          persist();
          alert(`Ticket placed: ${amount.toLocaleString()} chips on ${pick}. Select 'Settle all open bets' when ready.`);
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

  if (!sportsbook.pending.length) {
    log.appendChild(el("p", { className: "error", textContent: "No open tickets. Place a wager first." }));
  } else {
    const { results, count } = sportsbook.settleAll();
    log.appendChild(el("p", { className: "subtitle", textContent: "FINAL SCORES" }));
    for (const r of results) {
      log.appendChild(el("div", { className: "line", innerHTML: `<strong>${r.event.label}:</strong> ${r.event.away} ${r.event.awayScore} — ${r.event.home} ${r.event.homeScore}` }));
      if (r.won) {
        session.wallet.credit(r.payout, "sportsbook", r.reason);
        sessionNet += r.payout - r.slip.amount;
        log.appendChild(el("div", { className: "line success", textContent: `  WIN: ${r.reason} (+${(r.payout - r.slip.amount).toLocaleString()} chips)` }));
      } else {
        sessionNet -= r.slip.amount;
        log.appendChild(el("div", { className: "line error", textContent: `  LOSE: ${r.reason} (-${r.slip.amount.toLocaleString()} chips)` }));
      }
    }
    session.recordResult("sportsbook", sessionNet, count);
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

function renderBlackjackMenu() {
  session.recordVisit("blackjack");
  persist();
  return el("div", {}, [
    banner("Table Games — Blackjack"),
    chipLine(),
    menu(["Quick hand (solo, table minimums)", "Custom table setup"], "Choose your table:", (choice) => {
      if (choice === 0) { popView(); return; }
      if (choice === 1) {
        startBlackjack(defaultConfig(session.wallet.balance));
      } else {
        pushView("blackjack-custom");
      }
    }),
  ]);
}

function renderBlackjackCustom() {
  const modeSelect = el("select", {}, [
    el("option", { value: "solo", textContent: "Solo" }),
    el("option", { value: "bots", textContent: "Table with bots" }),
  ]);
  const minBet = el("input", { type: "number", value: "10", min: "1" });
  const maxBet = el("input", { type: "number", value: String(Math.min(100, session.wallet.balance)), min: "1" });
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

  return el("div", { className: "panel" }, [
    banner("Custom Table Setup"),
    chipLine(),
    el("div", { className: "form-row" }, [el("label", { textContent: "Mode" }), modeSelect]),
    el("div", { className: "form-row" }, [el("label", { textContent: "Minimum bet" }), minBet]),
    el("div", { className: "form-row" }, [el("label", { textContent: "Maximum bet" }), maxBet]),
    el("div", { className: "form-row" }, [el("label", { textContent: "Decks in shoe (1-8)" }), decks]),
    botsRow,
    seatRow,
    el("div", { className: "form-row" }, [el("label", { textContent: "Dealer rule" }), dealerRule]),
    el("div", { className: "action-bar" }, [
      el("button", {
        className: "btn primary",
        textContent: "Sit down",
        onclick: () => {
          const balance = session.wallet.balance;
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
      el("button", { className: "btn", textContent: "Back", onclick: () => { popView(); render(); } }),
    ]),
  ]);
}

function startBlackjack(config) {
  const chipsBefore = session.wallet.balance;
  config.startingBankroll = chipsBefore;
  config.maxBet = Math.min(config.maxBet, chipsBefore);
  blackjackSessionNet = 0;

  blackjackGame = new BlackjackGame(
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
      session.wallet.syncBalance(newBalance, "blackjack", "Table balance sync");
      persist();
    }
  );
  blackjackGame.beginRound();
  pushView("blackjack-play");
}

function renderBlackjackPlay() {
  if (!blackjackGame) return el("div", { textContent: "No active game." });

  const game = blackjackGame;
  const log = el("div", { className: "log-area" });
  for (const m of game.messages) {
    log.appendChild(el("div", { className: `line ${m.type}`, textContent: m.text }));
  }

  const reveal = game.phase === "settlement" || game.phase === "complete" || game.dealer.holeRevealed;
  const highlight = game.pendingAction?.player?.seat ?? game.human()?.seat;
  const snapshot = game.getTableSnapshot(reveal, highlight);
  const tableEl = renderTable(snapshot);

  const statusEl = el("p", { className: "dim", textContent: game.statusLine() });
  const chipEl = el("p", { className: "chip-line", textContent: `Chips: ${fmtChips(session.wallet.balance)}` });
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
        game.placeHumanBet(amount);
        if (game.roundOverEarly) {
          finishBlackjack();
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
    for (const line of game.resultLines) {
      const cls = line.includes("+") ? "success" : line.includes("-") ? "error" : "";
      log.appendChild(el("div", { className: `line ${cls}`, textContent: line }));
    }

    if (game.canPlayAnother()) {
      actionBar.appendChild(el("button", {
        className: "btn primary",
        textContent: "Play another hand",
        onclick: () => {
          blackjackSessionNet += game.humanNet;
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

  return el("div", { className: "panel" }, [
    banner("BLACKJACK"),
    chipEl,
    statusEl,
    tableEl,
    log,
    actionBar,
  ]);
}

function finishBlackjack() {
  if (blackjackGame) {
    if (blackjackGame.phase === "complete" && !blackjackGame.roundOverEarly) {
      blackjackSessionNet += blackjackGame.humanNet;
    }
    session.recordResult("blackjack", blackjackSessionNet);
    persist();
    alert(`Leaving table. Session net: ${blackjackSessionNet >= 0 ? "+" : ""}${blackjackSessionNet.toLocaleString()} chips`);
    blackjackGame = null;
    blackjackSessionNet = 0;
  }
  while (viewStack.length && viewStack[viewStack.length - 1] !== "hub") popView();
  render();
}

function pushView(name, data = {}) {
  viewStack.push({ name, data });
  render();
}

function popView() {
  if (viewStack.length > 1) viewStack.pop();
}

const RENDERERS = {
  "save-picker": renderSavePicker,
  "save-create": renderSaveCreate,
  "save-delete": renderSaveDelete,
  hub: renderHub,
  floor: renderFloor,
  cashier: renderCashier,
  "cashier-buy": renderCashierBuy,
  "cashier-cashout": renderCashierCashout,
  "cashier-ledger": renderCashierLedger,
  stats: renderStats,
  leave: renderLeave,
  "slots-menu": renderSlotsMenu,
  "slots-play": renderSlotsPlay,
  sportsbook: renderSportsbook,
  "sportsbook-wager": renderSportsbookWager,
  "sportsbook-settle": renderSportsbookSettle,
  "blackjack-menu": renderBlackjackMenu,
  "blackjack-custom": renderBlackjackCustom,
  "blackjack-play": renderBlackjackPlay,
};

function render() {
  const current = viewStack[viewStack.length - 1] ?? { name: "hub", data: {} };
  const fn = RENDERERS[current.name] ?? renderHub;
  app.innerHTML = "";
  app.appendChild(fn(current.data));
}

viewStack = [{ name: "save-picker", data: {} }];
render();

document.addEventListener("keydown", (e) => {
  if (!blackjackGame?.pendingAction) return;
  const map = { h: Action.HIT, s: Action.STAND, d: Action.DOUBLE, p: Action.SPLIT, u: Action.SURRENDER };
  const act = map[e.key.toLowerCase()];
  if (act && blackjackGame.getCurrentLegalActions().has(act)) {
    blackjackGame.playerAction(act);
    render();
  }
});
