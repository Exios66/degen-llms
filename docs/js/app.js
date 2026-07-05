import {
  CASINO_NAME, ACTIVITIES, FLOOR_ORDER, fmtChips, signedChips,
  saveSlot, loadSlot, createSlot, deleteSlot, listSlots, recentSlots, formatSaveTime,
  createGuestSession, PlayerSession, loadActiveProfile,
} from "./core.js";
import {
  MACHINES,
  spinReels,
  displaySymbol,
  calculatePayout,
  contributeToProgressive,
  tryJackpot,
  progressivePool,
} from "./slots.js";
import { getMachineUI, paytableEntries, SLOT_CATEGORIES } from "./slots-ui.js";
import { SportsbookState, fmtOdds } from "./sportsbook.js";
import { BlackjackGame, defaultConfig, Action } from "./blackjack/game.js";
import { HoldemTable, BettingAction } from "./holdem/game.js";
import { HAND_CLASS_NAMES } from "./holdem/hand_eval.js";
import { BET_TYPES, spinWheel, wheelColor, resolveBet, RED_NUMBERS } from "./roulette.js";
import { generateRace, simulateRace, settleTicket, fmtOdds as fmtRaceOdds, loadBundledHorseNames, parseHorseNamesCSV, setCustomHorseNames, getHorseNamePool } from "./horse_racing.js";
import { createHorseSpriteCanvas, getHorseSprite } from "./horse-sprites.js";
import { getSessionDealer, pickQuip } from "./dealers.js";
import { RewardsPhone } from "./RewardsPhone.js";
import { buildHotelRenderers } from "./hotel-ui.js";
import { ensureHotel } from "./hotel.js";
import {
  STAKE_TIERS, TIER_ORDER, getTier, formatTierLabel, effectiveTableStakes, effectiveSlotStakes,
  formatStakeRange, tierUsesSalonLimits,
} from "./stakes.js";

const app = document.getElementById("app");

let session = new PlayerSession();
let rewardsPhone = null;
let sportsbook = new SportsbookState();
let blackjackGame = null;
let blackjackSessionNet = 0;
let slotsState = { machine: null, sessionNet: 0, spins: 0, tier: null };
let holdemState = null;
let rouletteState = { sessionNet: 0, spins: 0, lastNumber: null, spinning: false, tier: null };
let horseRacingState = { card: null, pending: [], sessionNet: 0, races: 0, tier: null };
let currentStakeTier = null;
let activeTableDealer = null;
let viewStack = [];
let statusMessage = null;

function syncSportsbookToSession() {
  if (session.slotId != null) {
    session.sportsbookData = sportsbook.toJSON();
  }
}

function resetSportsbookFromSession() {
  sportsbook = SportsbookState.fromJSON(session.sportsbookData);
}

function persist() {
  syncSportsbookToSession();
  rewardsPhone?.tracker.syncFromWallet();
  if (session.slotId != null) saveSlot(session);
}

function mountRewardsPhone() {
  const root = document.getElementById("rewards-phone");
  if (!root) return;
  ensureHotel(session);
  rewardsPhone = new RewardsPhone(root, session, { onPersist: persist });
  rewardsPhone.sync();
}

function showStatus(text, type = "success") {
  statusMessage = { text, type };
  render();
}

function clearStatus() {
  statusMessage = null;
}

function statusBanner() {
  if (!statusMessage) return null;
  return el("div", {
    className: `status-banner ${statusMessage.type}`,
    role: "status",
  }, [
    el("span", { textContent: statusMessage.text }),
    el("button", {
      className: "status-dismiss",
      textContent: "×",
      "aria-label": "Dismiss",
      onclick: () => { clearStatus(); render(); },
    }),
  ]);
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

function dealerPanel(gameId) {
  const dealer = getSessionDealer(session, gameId);
  activeTableDealer = dealer;
  return el("div", { className: "dealer-panel" }, [
    el("p", { className: "subtitle", textContent: `On duty: ${dealer.name}` }),
    el("p", { className: "dim", textContent: dealer.tagline }),
    el("p", { className: "dim", textContent: `"${pickQuip(dealer, "greeting")}"` }),
  ]);
}

const MACHINE_GAMES = {
  blackjack: { label: "BLACKJACK", icon: "♠♥", variant: "blackjack" },
  holdem: { label: "TEXAS HOLD'EM", icon: "♣♦", variant: "holdem" },
  roulette: { label: "ROULETTE", icon: "◉", variant: "roulette" },
};

function machineGameNav(activeGame) {
  const tabs = [
    ["blackjack", "BJ"],
    ["holdem", "HOLD'EM"],
    ["roulette", "ROULETTE"],
  ];
  return el("div", { className: "machine-game-nav" }, tabs.map(([id, label]) =>
    el("span", {
      className: `machine-game-tab${id === activeGame ? " machine-game-tab--active" : ""}`,
      textContent: label,
    })
  ));
}

function videoMachine(gameId, { title, screenChildren = [], controls = null, footerExtra = null }) {
  const game = MACHINE_GAMES[gameId] || { label: title, icon: "★", variant: "blackjack" };
  const footer = [el("span", { className: "machine-led", textContent: "CREDIT" }), chipLine()];
  if (footerExtra) footer.push(footerExtra);
  const parts = [
    el("div", { className: "machine-cabinet-top" }, [
      el("div", { className: "machine-marquee", textContent: `${game.icon}  ${title || game.label}  ${game.icon}` }),
      el("div", { className: "machine-brand", textContent: CASINO_NAME }),
    ]),
    el("div", { className: "machine-screen" }, [
      el("div", { className: "machine-screen-inner" }, [
        machineGameNav(gameId),
        ...screenChildren.filter(Boolean),
      ]),
    ]),
  ];
  if (controls) parts.push(el("div", { className: "machine-controls" }, [controls]));
  parts.push(el("div", { className: "machine-footer" }, footer));
  return el("div", { className: `video-machine video-machine--${game.variant}` }, parts);
}

function cardTile(card, { hidden = false, empty = false } = {}) {
  if (empty) {
    return el("div", { className: "card-chip card-chip--empty", textContent: "·" });
  }
  if (!card || hidden) {
    return el("div", {
      className: "card-chip card-chip--hidden",
      textContent: session.useUnicode ? "?" : "??",
    });
  }
  const isRed = session.useColor && card.isRed();
  return el("div", {
    className: `card-chip ${isRed ? "card-chip--red" : "card-chip--black"}`,
    innerHTML: formatCardLabel(card),
  });
}

function cardRow(cards, { hiddenMask = null, slots = null } = {}) {
  const row = el("div", { className: "card-row" });
  const count = slots ?? cards.length;
  for (let i = 0; i < count; i++) {
    const card = cards[i];
    const hidden = hiddenMask ? hiddenMask(i, card) : !card;
    row.appendChild(cardTile(card, { hidden: hidden || !card, empty: !card && slots != null }));
  }
  return row;
}

function machineLog(lines, { max = 12, lineClass = "dim" } = {}) {
  const log = el("div", { className: "machine-log" });
  for (const line of lines.slice(-max)) {
    const text = typeof line === "string" ? line : line.text;
    const cls = typeof line === "string" ? lineClass : (line.type || lineClass);
    log.appendChild(el("div", { className: `line ${cls}`, textContent: text }));
  }
  return log;
}

function slotMachineCard(machine, onSelect) {
  const ui = getMachineUI(machine);
  const meta = [el("span", { className: "slot-machine-card-bet", textContent: `${machine.minBet}–${machine.maxBet} chips` })];
  if (machine.progressive && machine.progressivePoolId) {
    meta.push(el("span", {
      className: "slot-machine-card-jackpot",
      textContent: `JP ${progressivePool(session, machine.progressivePoolId, machine.progressiveSeed).toLocaleString()}`,
    }));
  }
  return el("button", {
    type: "button",
    className: `slot-machine-card ${ui.themeClass}`,
    onclick: onSelect,
  }, [
    el("div", { className: "slot-machine-card-header" }, [
      el("span", { className: "slot-machine-card-icon", textContent: ui.icon }),
      el("span", { className: "slot-machine-card-badge", textContent: ui.badge }),
    ]),
    el("p", { className: "slot-machine-card-name", textContent: machine.name }),
    el("p", { className: "slot-machine-card-tagline", textContent: machine.tagline }),
    el("div", { className: "slot-machine-card-meta" }, meta),
    el("p", { className: "slot-machine-card-playstyle", textContent: ui.playstyle }),
  ]);
}

function slotPaytablePanel(machine) {
  const rows = paytableEntries(machine).map((entry) =>
    el("div", {
      className: `slot-paytable-row${entry.progressive ? " slot-paytable-row--jackpot" : ""}`,
    }, [
      el("span", { textContent: entry.label }),
      el("span", {
        className: "slot-paytable-mult",
        textContent: entry.progressive ? `PROGRESSIVE (${entry.note})` : `${entry.mult}x`,
      }),
    ])
  );
  return el("div", { className: "slot-paytable-panel" }, [
    el("div", { className: "slot-paytable-title", textContent: "Paytable" }),
    el("div", { className: "slot-paytable-grid" }, rows),
  ]);
}

function slotReelWindow(machine, reels, { spinning = false, win = false } = {}) {
  const ui = getMachineUI(machine);
  const symbols = reels?.length === 3
    ? reels.map((r) => displaySymbol(r, session.useUnicode))
    : ["—", "—", "—"];
  const windowEl = el("div", {
    className: `slot-reel-window slot-reel-window--${ui.reelFrame}${win ? " slot-reel-window--win" : ""}${spinning ? " slot-reel--spinning" : ""}`,
  });
  for (const sym of symbols) {
    windowEl.appendChild(el("div", { className: "slot-reel" }, [
      el("span", { className: "slot-reel-symbol", textContent: sym }),
    ]));
  }
  return windowEl;
}

function slotCabinet(machine, { screenChildren = [], baseChildren = [] }) {
  const ui = getMachineUI(machine);
  const badges = [
    el("span", { className: "slot-cabinet-badge", textContent: ui.category }),
    el("span", { className: "slot-cabinet-badge", textContent: ui.badge }),
  ];
  return el("div", { className: `slot-cabinet ${ui.themeClass}` }, [
    el("div", { className: "slot-cabinet-topper" }, [
      el("div", { className: "slot-cabinet-name", textContent: `${ui.icon}  ${machine.name}` }),
      machine.tagline ? el("p", { className: "slot-cabinet-tagline", textContent: machine.tagline }) : null,
      el("div", { className: "slot-cabinet-badges" }, badges),
    ]),
    el("div", { className: "slot-cabinet-screen" }, screenChildren.filter(Boolean)),
    el("div", { className: "slot-cabinet-base" }, baseChildren.filter(Boolean)),
  ]);
}

function horsePaddockCard(horse, { selected = false, onClick = null } = {}) {
  const spriteMeta = getHorseSprite(horse.spriteId);
  const card = el("div", {
    className: `horse-paddock-card${selected ? " horse-paddock-card--selected" : ""}`,
  }, [
    createHorseSpriteCanvas(horse.spriteId, { size: 96, animate: true }),
    el("div", { className: "horse-paddock-num", textContent: `#${horse.number}` }),
    el("div", { className: "horse-paddock-name", textContent: horse.name }),
    el("div", { className: "horse-paddock-sprite-label", textContent: spriteMeta.label }),
    el("div", { className: "horse-paddock-odds", textContent: fmtRaceOdds(horse.odds) }),
  ]);
  if (onClick) {
    card.style.cursor = "pointer";
    card.onclick = onClick;
  }
  return card;
}

function renderHorsePaddock(horses, { selectedNumber = null, onSelect = null } = {}) {
  return el("div", { className: "racing-paddock" }, horses.map((h) =>
    horsePaddockCard(h, {
      selected: selectedNumber === h.number,
      onClick: onSelect ? () => onSelect(h.number) : null,
    })
  ));
}

function menu(options, title, onSelect, { showCasinoBanner = true } = {}) {
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
  const frag = [];
  if (showCasinoBanner) frag.push(banner(CASINO_NAME));
  if (title) frag.push(el("p", { className: "subtitle", textContent: title }));
  frag.push(el("ul", { className: "menu-list" }, items));
  return el("div", { className: "panel" }, frag);
}

function enterCasino(nextSession, options = {}) {
  session = nextSession;
  resetSportsbookFromSession();
  blackjackGame = null;
  blackjackSessionNet = 0;
  slotsState = { machine: null, sessionNet: 0, spins: 0, spinning: false, lastWin: false, lastReels: null, lastMessage: null };
  holdemState = null;
  rouletteState = { sessionNet: 0, spins: 0, lastNumber: null, spinning: false };
  horseRacingState = { card: null, pending: [], sessionNet: 0, races: 0 };
  viewStack = [{ name: "hub", data: {} }];
  clearStatus();
  mountRewardsPhone();
  const view = options.initialView;
  if (view?.startsWith("hotel-")) {
    ensureHotel(session);
    viewStack = [{ name: view, data: {} }];
  }
  render();
}

function returnToSavePicker() {
  persist();
  rewardsPhone?.close();
  sportsbook = new SportsbookState();
  blackjackGame = null;
  holdemState = null;
  session = new PlayerSession();
  viewStack = [{ name: "save-picker", data: {} }];
  clearStatus();
  render();
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
        if (blackjackGame) {
          if (!confirm("Leave the blackjack table and return to the save library?")) return;
          finishBlackjack(true);
          return;
        }
        if (holdemState) {
          if (!confirm("Leave the Hold'em table and return to the save library?")) return;
          finishHoldem(true);
          return;
        }
        returnToSavePicker();
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
  const container = el("div", { className: "felt-table bj-table-layout" });

  if (snapshot.dealer) {
    const d = snapshot.dealer;
    const dealerRow = el("div", { className: "bj-dealer-row" }, [
      el("span", { className: "bj-role-label", textContent: activeTableDealer?.name ?? "Dealer" }),
      cardRow(d.cards),
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
      cardRow(row.cards),
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
  felt.appendChild(cardRow(boardCards, { slots: 5 }));

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
      el("div", { className: "holdem-hole-cards" }, [cardRow(holeCards, { hiddenMask: (_, c) => !c })]),
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

function renderSavePicker() {
  const recent = recentSlots();
  const allSlots = listSlots();
  const container = el("div", {}, [
    statusBanner(),
    el("div", { className: "panel" }, [
      banner(CASINO_NAME),
      el("p", { className: "subtitle", textContent: "Save Library" }),
      el("p", { className: "dim", textContent: "Select a save slot to continue, create a new visit, or play as a guest:" }),
    ]),
  ]);

  const panel = container.querySelector(".panel");

  if (recent.length) {
    panel.appendChild(el("p", { className: "subtitle", textContent: "Recent Saves" }));
    const recentList = el("div", { className: "stats-grid" });
    for (const slot of recent) {
      recentList.appendChild(el("div", {
        className: "stat-row dim",
        textContent: `Slot ${slot.slotId}: ${slot.label} — ${slot.playerName} — ${fmtChips(slot.balance)} (last: ${formatSaveTime(slot.updatedAt)})`,
      }));
    }
    panel.appendChild(recentList);
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

  const guestIdx = allSlots.length;
  const deleteIdx = allSlots.length + 1;
  const exitIdx = allSlots.length + 2;

  menuList.appendChild(el("li", {}, [
    el("button", {
      className: "menu-btn",
      innerHTML: `<span class="num">${guestIdx + 1})</span> Play without saving (guest visit)`,
      onclick: () => enterCasino(createGuestSession()),
    }),
  ]));
  menuList.appendChild(el("li", {}, [
    el("button", {
      className: "menu-btn",
      innerHTML: `<span class="num">${deleteIdx + 1})</span> Delete a save`,
      onclick: () => pushView("save-delete"),
    }),
  ]));
  menuList.appendChild(el("li", {}, [
    el("button", {
      className: "menu-btn back",
      innerHTML: `<span class="num">${exitIdx + 1})</span> Exit without playing`,
      onclick: () => {
        app.innerHTML = "";
        app.appendChild(el("div", { className: "loading-screen" }, [
          banner(CASINO_NAME),
          el("p", { className: "subtitle", textContent: "See you next time" }),
          el("p", { className: "dim", textContent: "Reload the page to return to the save library." }),
          el("p", { className: "footer-note", textContent: `${CASINO_NAME} — digital casino` }),
        ]));
      },
    }),
  ]));

  panel.appendChild(el("p", { className: "subtitle", textContent: "Save slots:" }));
  panel.appendChild(menuList);
  panel.appendChild(el("p", { className: "footer-note", textContent: "Your most recent saves appear at the top of the library." }));
  return container;

  function handleSlotChoice(slot) {
    if (slot.occupied) {
      const loaded = loadSlot(slot.slotId);
      if (!loaded) { showStatus(`Could not load Slot ${slot.slotId}.`, "error"); return; }
      enterCasino(loaded);
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
          enterCasino(session);
        },
      }),
      el("button", {
        className: "btn",
        textContent: "Back",
        onclick: () => { popToView("save-picker"); render(); },
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
    ]));
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
  const floors = [...FLOOR_ORDER, "Cashier", "Player Stats", "Save Game", "Exit to Hotel", "Explore Resort (RPG)", "Leave Casino"];
  const options = floors.map((f) => (FLOOR_ORDER.includes(f) ? `Explore ${f}` : f));

  const wrap = el("div", {}, [
    statusBanner(),
    settingsBar(),
    banner(CASINO_NAME),
    session.slotId != null
      ? el("p", { className: "dim", textContent: `Save: ${session.slotLabel || `Slot ${session.slotId}`}` })
      : el("p", { className: "dim", textContent: "Guest visit — progress is not saved" }),
    el("p", { className: "welcome-line", textContent: `Welcome, ${session.playerName}` }),
    chipLine(),
    el("div", { className: "hub-features panel" }, [
      el("p", { className: "subtitle", textContent: "On the floor today:" }),
      ...FLOOR_ORDER.map((floor) => {
        const acts = Object.values(ACTIVITIES).filter((a) => a.floor === floor);
        return el("div", {
          className: "hub-feature",
          innerHTML: `<strong>${floor}</strong> — ${acts.map((a) => a.name).join(", ")}`,
        });
      }),
      el("div", {
        className: "hub-feature",
        innerHTML: "<strong>Hotel Experience</strong> — reservations, suite upgrades, hallway mini-game (Exit to Hotel · P for MGM Rewards)",
      }),
      el("div", {
        className: "hub-feature",
        innerHTML: "<strong>Pixel RPG</strong> — explore the resort open world (Explore Resort)",
      }),
    ]),
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
    el("p", { className: "footer-note", textContent: session.slotId != null ? "Play in your browser — session saved locally" : "Guest mode — use Save Game or pick a slot to persist progress" }),
  ]);
  return wrap;

  function handleChoice(choice) {
    if (choice === 0) {
      if (blackjackGame) {
        if (!confirm("Leave the blackjack table and return to the save library?")) return;
        finishBlackjack(true);
        return;
      }
      if (holdemState) {
        if (!confirm("Leave the Hold'em table and return to the save library?")) return;
        finishHoldem(true);
        return;
      }
      returnToSavePicker();
      return;
    }
    if (choice <= FLOOR_ORDER.length) {
      pushView("floor", { floor: FLOOR_ORDER[choice - 1] });
    } else if (choice === FLOOR_ORDER.length + 1) {
      pushView("cashier");
    } else if (choice === FLOOR_ORDER.length + 2) {
      pushView("stats");
    } else if (choice === FLOOR_ORDER.length + 3) {
      if (session.slotId != null) {
        persist();
        showStatus(`Game saved to ${session.slotLabel || `Slot ${session.slotId}`}.`);
      } else {
        showStatus("No save slot active — pick a slot at entry or play as guest.", "error");
      }
    } else if (choice === FLOOR_ORDER.length + 4) {
      ensureHotel(session);
      pushView("hotel-lobby");
    } else if (choice === FLOOR_ORDER.length + 5) {
      const rpgUrl = session.slotId != null
        ? `./rpg/?slot=${session.slotId}`
        : "./rpg/?guest=1";
      window.location.href = rpgUrl;
    } else {
      pushView("leave");
    }
  }
}

function renderFloor({ floor }) {
  const activities = Object.values(ACTIVITIES).filter((a) => a.floor === floor);
  const items = activities.map((a, i) => el("li", {}, [
    el("button", {
      className: "menu-btn",
      onclick: () => handleChoice(i + 1),
      innerHTML: [
        `<span class="num">${i + 1})</span> ${a.name} — min ${a.minBet} chips`,
        a.description ? `<br><span class="dim" style="padding-left:1.75rem;font-size:0.85rem;">${a.description}</span>` : "",
      ].join(""),
    }),
  ]));
  items.push(el("li", {}, [
    el("button", {
      className: "menu-btn back",
      innerHTML: '<span class="num">0)</span> Back',
      onclick: () => handleChoice(0),
    }),
  ]));

  return el("div", {}, [
    banner(`${floor}`),
    chipLine(),
    el("div", { className: "panel" }, [
      el("p", { className: "subtitle", textContent: `${floor}:` }),
      el("ul", { className: "menu-list" }, items),
    ]),
  ]);

  function handleChoice(choice) {
    if (choice === 0) { goBack(); return; }
    const act = activities[choice - 1];
    if (session.wallet.balance < act.minBet) {
      showStatus(`You need at least ${act.minBet} chips to enter ${act.name}.`, "error");
      return;
    }
    if (act.id === "blackjack") pushView("stake-tier", { activityId: "blackjack", nextView: "blackjack-menu" });
    else if (act.id === "holdem") pushView("stake-tier", { activityId: "holdem", nextView: "holdem-menu" });
    else if (act.id === "roulette") pushView("stake-tier", { activityId: "roulette", nextView: "roulette" });
    else if (act.id === "slots") pushView("stake-tier", { activityId: "slots", nextView: "slots-menu" });
    else if (act.id === "sportsbook") pushView("stake-tier", { activityId: "sportsbook", nextView: "sportsbook" });
    else if (act.id === "horse_racing") pushView("stake-tier", { activityId: "horse_racing", nextView: "horse-racing" });
  }
}

function renderCashier() {
  return el("div", {}, [
    statusBanner(),
    banner("Cashier"),
    chipLine(),
    menu(
      ["Buy chips ($500 bundle)", "Buy custom amount", "Cash out chips", "View transaction ledger"],
      "Chip window:",
      (choice) => {
        if (choice === 0) { goBack(); return; }
        if (choice === 1) {
          session.wallet.buyIn(500);
          persist();
          showStatus(`Purchased ${fmtChips(500)}. Balance: ${fmtChips(session.wallet.balance)}`);
        } else if (choice === 2) {
          pushView("cashier-buy");
        } else if (choice === 3) {
          pushView("cashier-cashout");
        } else if (choice === 4) {
          pushView("cashier-ledger");
        }
      },
      { showCasinoBanner: false },
    ),
  ]);
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
          showStatus(`Purchased ${fmtChips(amount)}. Balance: ${fmtChips(session.wallet.balance)}`);
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
            showStatus(`Cashed out ${fmtChips(amount)}. Balance: ${fmtChips(session.wallet.balance)}`);
            popView();
            render();
          } else showStatus("Cash out failed.", "error");
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
          showStatus(`Thanks for visiting ${CASINO_NAME}. Final balance: ${fmtChips(session.wallet.balance)}`);
          returnToSavePicker();
        },
      }),
      el("button", { className: "btn", textContent: "Stay", onclick: () => { popView(); render(); } }),
    ]),
  ]);
}

function renderStakeTier({ activityId, nextView }) {
  const act = ACTIVITIES[activityId];
  const balance = session.wallet.balance;
  const options = TIER_ORDER.map((id) => {
    const tier = STAKE_TIERS[id];
    if (balance < tier.minBet) {
      return `${tier.name} — requires ${tier.minBet.toLocaleString()} chips`;
    }
    return formatTierLabel(tier, balance);
  });
  return el("div", { className: "panel" }, [
    banner(`${act?.name ?? "Activity"} — Stake Tier`),
    el("p", { className: "dim", textContent: "Pick a stake tier before sitting down. Salon tiers (401K, No Limit) apply across every machine and table." }),
    chipLine(),
    menu(options, "Choose stake tier:", (choice) => {
      if (choice === 0) { goBack(); return; }
      const tier = getTier(TIER_ORDER[choice - 1]);
      if (balance < tier.minBet) {
        showStatus(`You need at least ${tier.minBet.toLocaleString()} chips for ${tier.name}.`, "error");
        return;
      }
      currentStakeTier = tier;
      if (activityId === "slots") slotsState.tier = tier;
      if (activityId === "roulette") rouletteState.tier = tier;
      if (activityId === "horse_racing") horseRacingState.tier = tier;
      pushView(nextView);
    }),
  ]);
}

function renderSlotsMenu() {
  const act = ACTIVITIES.slots;
  if (session.wallet.balance < act.minBet) {
    return el("div", { className: "panel" }, [
      banner("Slot Machines"),
      el("p", { className: "error", textContent: `You need at least ${act.minBet} chips to play.` }),
      el("div", { className: "action-bar" }, [
        el("button", { className: "btn", textContent: "Back", onclick: () => { popView(); render(); } }),
      ]),
    ]);
  }
  session.recordVisit("slots");
  persist();
  const tier = slotsState.tier ?? currentStakeTier;

  const floor = el("div", { className: "slot-floor" }, [
    banner("Slot Machines — Mandalay Bay"),
    el("p", { className: "dim", textContent: tier ? `${tier.name}: ${tier.description}` : "Penny slots to high-limit progressives — pick your machine." }),
    chipLine(),
    el("p", {
      className: "slot-floor-intro",
      textContent: "Penny slots to high-limit progressives — each machine has its own cabinet theme and playstyle.",
    }),
  ]);

  for (const cat of SLOT_CATEGORIES) {
    const machines = MACHINES.filter((m) => getMachineUI(m).category === cat.id);
    if (!machines.length) continue;
    const section = el("div", { className: "slot-category" }, [
      el("h3", { className: "slot-category-title", textContent: cat.label }),
      el("div", { className: "slot-machine-grid" }, machines.map((m) =>
        slotMachineCard(m, () => {
          slotsState = { machine: m, sessionNet: 0, spins: 0, spinning: false, lastWin: false, lastReels: null, lastMessage: null };
          pushView("slots-play");
        })
      )),
    ]);
    floor.appendChild(section);
  }

  floor.appendChild(el("div", { className: "action-bar", style: "margin-top:1.5rem;" }, [
    el("button", { className: "btn", textContent: "Back to floor", onclick: () => goBack() }),
  ]));

  return floor;
}

function renderSlotsPlay() {
  const machine = slotsState.machine;
  const tier = slotsState.tier ?? currentStakeTier ?? getTier("standard");
  const stakes = effectiveSlotStakes(machine, tier, session.wallet.balance);
  const minBet = stakes.minBet;
  const maxBet = stakes.maxBet;
  const betInput = el("input", {
    type: "number", min: String(minBet), max: String(maxBet), value: String(minBet),
  });
  const msgEl = el("p", {
    className: `slot-result ${slotsState.lastMessage?.type ?? "dim"}`,
    textContent: slotsState.spinning
      ? "Spinning…"
      : (slotsState.lastMessage?.text ?? "Place your bet and spin."),
  });
  const summaryEl = el("p", {
    className: "dim",
    textContent: slotsState.spins ? `Session: ${signedChips(slotsState.sessionNet)} over ${slotsState.spins} spin(s)` : "",
  });

  const reelsEl = slotReelWindow(machine, slotsState.lastReels, {
    spinning: slotsState.spinning,
    win: slotsState.lastWin,
  });

  const jackpotEl = machine.progressive && machine.progressivePoolId
    ? el("div", {
      className: "slot-jackpot-ticker",
      textContent: `★ PROGRESSIVE ${progressivePool(session, machine.progressivePoolId, machine.progressiveSeed).toLocaleString()} ★`,
    })
    : null;

  const maxBetNote = machine.jackpotRequiresMaxBet
    ? el("p", { className: "dim", textContent: `Max bet (${maxBet.toLocaleString()} chips) required to qualify for the progressive jackpot.` })
    : null;

  function doSpin() {
    const bet = parseInt(betInput.value, 10);
    if (bet === 0) {
      session.recordResult("slots", slotsState.sessionNet, slotsState.spins);
      persist();
      popView();
      render();
      return;
    }
    if (bet < minBet) { msgEl.className = "slot-result error"; msgEl.textContent = `Minimum spin is ${minBet}.`; return; }
    if (bet > maxBet) { msgEl.className = "slot-result error"; msgEl.textContent = `Maximum spin is ${maxBet}.`; return; }
    if (!session.wallet.debit(bet, "slots", `${machine.name} spin ${fmtChips(bet)}`)) {
      msgEl.className = "slot-result error";
      msgEl.textContent = "Insufficient chips.";
      return;
    }

    slotsState.spinning = true;
    slotsState.lastWin = false;
    render();

    setTimeout(() => {
      contributeToProgressive(session, machine, bet);
      const reels = spinReels(machine);
      const jackpotAmount = tryJackpot(session, machine, reels, bet, maxBet);
      const { win, reason } = calculatePayout(reels, bet, machine, jackpotAmount);
      slotsState.spins += 1;
      slotsState.spinning = false;
      slotsState.lastReels = reels;
      slotsState.lastWin = win > 0;

      if (win > 0) {
        session.wallet.credit(win, "slots", reason);
        slotsState.sessionNet += win - bet;
        slotsState.lastMessage = {
          text: `${reason}${jackpotAmount == null ? ` — Won ${win.toLocaleString()} chips!` : ""}`,
          type: jackpotAmount != null ? "jackpot-win" : "success",
        };
      } else {
        slotsState.sessionNet -= bet;
        slotsState.lastMessage = { text: "No win this spin.", type: "dim" };
      }
      persist();
      render();
    }, 500);
  }

  return slotCabinet(machine, {
    screenChildren: [
      tier ? el("p", { className: "dim", textContent: `Stake tier: ${tier.name}` }) : null,
      jackpotEl,
      maxBetNote,
      slotPaytablePanel(machine),
      reelsEl,
      msgEl,
      summaryEl,
    ],
    baseChildren: [
      el("p", { className: "chip-line", textContent: `Chips: ${fmtChips(session.wallet.balance)}` }),
      el("div", { className: "form-row" }, [
        el("label", { textContent: `Spin amount (${minBet}–${maxBet}, 0 to leave)` }),
        betInput,
      ]),
      el("div", { className: "action-bar" }, [
        el("button", { className: "btn primary", textContent: "Spin", onclick: doSpin, disabled: slotsState.spinning }),
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
    ],
  });
}

function renderSportsbook() {
  const act = ACTIVITIES.sportsbook;
  if (session.wallet.balance < act.minBet && !sportsbook.pending.length) {
    return el("div", { className: "panel" }, [
      banner("Sports Book"),
      el("p", { className: "error", textContent: `You need at least ${act.minBet} chips to wager.` }),
      el("div", { className: "action-bar" }, [
        el("button", { className: "btn", textContent: "Back", onclick: () => { popView(); render(); } }),
      ]),
    ]);
  }
  session.recordVisit("sportsbook");
  persist();
  const tier = currentStakeTier;
  const wagerStakes = tier
    ? effectiveTableStakes(tier, session.wallet.balance, act.minBet)
    : { minBet: act.minBet, maxBet: session.wallet.balance };

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
    tier ? el("p", { className: "dim", textContent: `${tier.name}: ${formatStakeRange(wagerStakes.minBet, wagerStakes.maxBet, { noCap: tier.maxBet == null })}` }) : null,
    el("p", { className: "subtitle", textContent: "Today's Board" }),
    board,
    pendingEl,
    menu(["Place a wager", "Settle all open bets (simulate results)", "Refresh lines"], "Sports Book:", (choice) => {
      if (choice === 0) { goBack(); return; }
      if (choice === 1) pushView("sportsbook-wager");
      else if (choice === 2) pushView("sportsbook-settle");
      else if (choice === 3) { sportsbook.refreshBoard(true); render(); }
    }),
  ]);
}

function renderSportsbookWager() {
  const act = ACTIVITIES.sportsbook;
  const tier = currentStakeTier;
  const wagerStakes = tier
    ? effectiveTableStakes(tier, session.wallet.balance, act.minBet)
    : { minBet: act.minBet, maxBet: session.wallet.balance };
  const eventSelect = el("select", {}, sportsbook.events.map((e, i) =>
    el("option", { value: String(i), textContent: `${i + 1}) ${e.label}` })
  ));
  const betTypeSelect = el("select", {}, [
    el("option", { value: "moneyline", textContent: "Moneyline" }),
    el("option", { value: "spread", textContent: "Spread" }),
  ]);
  const pickSelect = el("select");
  const amountInput = el("input", {
    type: "number", min: String(wagerStakes.minBet), max: String(wagerStakes.maxBet), value: String(wagerStakes.minBet),
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
          if (amount < wagerStakes.minBet) { alert(`Minimum wager is ${wagerStakes.minBet} chips.`); return; }
          if (amount > wagerStakes.maxBet) { alert(`Maximum wager is ${wagerStakes.maxBet} chips.`); return; }
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
          showStatus(`Ticket placed: ${amount.toLocaleString()} chips on ${pick}. Settle when ready.`);
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
  const act = ACTIVITIES.blackjack;
  if (session.wallet.balance < act.minBet) {
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
  session.recordVisit("blackjack");
  persist();
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
          startBlackjack(defaultConfig(session.wallet.balance));
        } else {
          pushView("blackjack-custom");
        }
      }, { showCasinoBanner: false }),
    ],
  });
}

function renderBlackjackCustom() {
  const tier = currentStakeTier;
  const tableStakes = tier ? effectiveTableStakes(tier, session.wallet.balance, 10) : { minBet: 10, maxBet: Math.min(100, session.wallet.balance) };
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
      el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
    ]),
  });
}

function renderHoldemMenu() {
  const act = ACTIVITIES.holdem;
  if (session.wallet.balance < act.minBet) {
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
  session.recordVisit("holdem");
  persist();
  const tier = currentStakeTier;
  const buyInStakes = tier
    ? effectiveTableStakes(tier, session.wallet.balance, act.minBet)
    : { minBet: act.minBet, maxBet: session.wallet.balance };
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
      el("p", { className: "machine-screen-label", textContent: "Hand rankings" }),
      ranksEl,
      el("div", { className: "form-row" }, [
        el("label", { textContent: `Buy-in (${act.minBet}–${session.wallet.balance})` }),
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
          if (!session.wallet.debit(buyIn, "holdem", `Hold'em buy-in ${fmtChips(buyIn)}`)) {
            alert("Insufficient chips."); return;
          }
          holdemState = {
            table: HoldemTable.quickTable(buyIn),
            buyIn,
            sessionNet: 0,
            hands: 0,
            log: [],
          };
          holdemState.table.startHand();
          processHoldemBots();
          pushView("holdem-play");
        },
      }),
      el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
    ]),
  });
}

function processHoldemBots() {
  if (!holdemState || holdemState.table.handOver) return;
  const table = holdemState.table;
  let guard = 0;
  while (!table.handOver && guard < 40) {
    guard += 1;
    const player = table.players[table.actionIndex];
    if (!player || player.folded || player.allIn) {
      table.actionIndex = (table.actionIndex + 1) % table.players.length;
      table._seekActor();
      continue;
    }
    if (player.isHuman) break;
    const action = table.botAction(player);
    const msg = table.applyAction(player, action);
    holdemState.log.push(msg);
  }
}

function renderHoldemPlay() {
  if (!holdemState) return el("div", { textContent: "No active Hold'em table." });
  const table = holdemState.table;
  const logLines = [...holdemState.log];

  if (table.handOver) {
    if (table.showdownScores.length) {
      for (const { name, score } of table.showdownScores) {
        logLines.push({ text: `${name}: ${score.name}`, type: "" });
      }
    }
    logLines.push({ text: table.lastMessage, type: "success" });
  }

  const actionBar = el("div", { className: "action-bar" });

  if (table.handOver) {
    if (table.human.stack >= table.bigBlind) {
      actionBar.appendChild(el("button", {
        className: "btn primary",
        textContent: "Next hand",
        onclick: () => {
          holdemState.hands += 1;
          holdemState.log = [];
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
      for (const act of [BettingAction.CHECK, BettingAction.CALL, BettingAction.RAISE, BettingAction.FOLD]) {
        if (legal.has(act)) {
          actionBar.appendChild(el("button", {
            className: "btn primary",
            textContent: act.charAt(0).toUpperCase() + act.slice(1),
            onclick: () => {
              holdemState.log.push(table.applyAction(player, act));
              processHoldemBots();
              render();
            },
          }));
        }
      }
    } else {
      actionBar.appendChild(el("p", { className: "dim", textContent: "Waiting for action…" }));
      processHoldemBots();
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
        textContent: `Table stack: ${fmtChips(table.human.stack)} · Blinds ${fmtChips(table.smallBlind)}/${fmtChips(table.bigBlind)}`,
      }),
      renderHoldemTable(table),
      machineLog(logLines),
    ],
    controls: actionBar,
    footerExtra: el("span", {
      className: "machine-led",
      textContent: `HAND ${holdemState.hands + 1}`,
    }),
  });
}

function finishHoldem(silent = false) {
  if (holdemState) {
    const cash = holdemState.table.human.stack;
    session.wallet.credit(cash, "holdem", "Cash out from Hold'em table");
    holdemState.sessionNet = cash - holdemState.buyIn;
    session.recordResult("holdem", holdemState.sessionNet, holdemState.hands);
    persist();
    if (!silent) {
      showStatus(`Left Hold'em table. Session net: ${signedChips(holdemState.sessionNet)}`);
    }
    holdemState = null;
  }
  popToView("floor");
  render();
}

function renderRoulette() {
  const act = ACTIVITIES.roulette;
  if (session.wallet.balance < act.minBet) {
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
  session.recordVisit("roulette");
  persist();

  const tier = rouletteState.tier ?? currentStakeTier;
  const wagerStakes = tier
    ? effectiveTableStakes(tier, session.wallet.balance, act.minBet)
    : { minBet: act.minBet, maxBet: session.wallet.balance };

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

  const amountInput = el("input", {
    type: "number", min: String(wagerStakes.minBet), max: String(wagerStakes.maxBet), value: String(wagerStakes.minBet),
  });
  const resultEl = el("p", {
    className: "dim",
    textContent: rouletteState.lastNumber != null
      ? `Last spin: ${rouletteState.lastNumber} (${wheelColor(rouletteState.lastNumber)})`
      : "European wheel (0–36). Place a bet and spin.",
  });
  const summaryEl = el("p", {
    className: "roulette-session",
    textContent: rouletteState.spins
      ? `Session: ${signedChips(rouletteState.sessionNet)} over ${rouletteState.spins} spin(s)`
      : "",
  });

  const onMatPick = (n) => {
    betSelect.value = "0";
    straightRow.style.display = "";
    straightInput.value = String(n);
  };

  const rouletteDisplay = el("div", { className: "roulette-display" }, [
    renderRouletteWheel(rouletteState.lastNumber, rouletteState.spinning),
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
    if (!session.wallet.debit(amount, "roulette", `Roulette ${bet.kind}`)) {
      resultEl.className = "error";
      resultEl.textContent = "Insufficient chips.";
      return;
    }
    const dealer = activeTableDealer ?? getSessionDealer(session, "roulette");
    resultEl.className = "dim";
    resultEl.textContent = `${dealer.name}: "${pickQuip(dealer, "deal")}"`;
    rouletteState.spinning = true;
    render();

    setTimeout(() => {
      const number = spinWheel();
      const straightPick = bet.kind === "straight" ? parseInt(straightInput.value, 10) : null;
      const { win, reason } = resolveBet(bet, amount, number, straightPick);
      rouletteState.spins += 1;
      rouletteState.lastNumber = number;
      rouletteState.spinning = false;
      resultEl.className = win > 0 ? "success" : "dim";
      const quip = pickQuip(dealer, win > 0 ? "win" : "lose");
      resultEl.textContent = `Ball lands on ${number} (${wheelColor(number)}) — ${reason}. ${dealer.name}: "${quip}"`;
      if (win > 0) {
        session.wallet.credit(win, "roulette", reason);
        rouletteState.sessionNet += win - amount;
      } else {
        rouletteState.sessionNet -= amount;
      }
      summaryEl.textContent = `Session: ${signedChips(rouletteState.sessionNet)} over ${rouletteState.spins} spin(s)`;
      persist();
      render();
    }, 1200);
  }

  return videoMachine("roulette", {
    title: "ROULETTE",
    screenChildren: [
      dealerPanel("roulette"),
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
      el("button", { className: "btn primary", textContent: "Spin", onclick: doSpin }),
      el("button", {
        className: "btn",
        textContent: "Leave table",
        onclick: () => {
          session.recordResult("roulette", rouletteState.sessionNet, rouletteState.spins);
          persist();
          goBack();
        },
      }),
    ]),
    footerExtra: el("span", {
      className: "machine-led",
      textContent: rouletteState.spins ? `SPIN ${rouletteState.spins}` : "READY",
    }),
  });
}

function renderHorseRacing() {
  const act = ACTIVITIES.horse_racing;
  if (session.wallet.balance < act.minBet && !horseRacingState.pending.length) {
    return el("div", { className: "panel" }, [
      banner("Mandalay Racing"),
      el("p", { className: "error", textContent: `You need at least ${act.minBet} chips to wager.` }),
      el("div", { className: "action-bar" }, [
        el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
      ]),
    ]);
  }
  session.recordVisit("horse_racing");
  if (!horseRacingState.card) horseRacingState.card = generateRace(session);
  persist();
  const tier = horseRacingState.tier ?? currentStakeTier;
  const wagerStakes = tier
    ? effectiveTableStakes(tier, session.wallet.balance, act.minBet)
    : { minBet: act.minBet, maxBet: session.wallet.balance };

  const card = horseRacingState.card;
  const namePool = getHorseNamePool(session);
  const poolLabel = session.horseRacingCustomNames
    ? `Custom roster (${namePool.length} horses)`
    : `Default roster (${namePool.length} horses)`;

  const pendingEl = el("div", { className: "pending-tickets" });
  if (horseRacingState.pending.length) {
    pendingEl.appendChild(el("p", { className: "subtitle", textContent: "Open tickets:" }));
    for (const slip of horseRacingState.pending) {
      const h = card.horses.find((x) => x.number === slip.horse);
      pendingEl.appendChild(el("div", {
        className: "ticket",
        textContent: `${slip.amount} chips on #${slip.horse} ${h?.name ?? ""} (${slip.betType})`,
      }));
    }
  }

  return el("div", { className: "panel racing-pavilion" }, [
    banner("Mandalay Racing"),
    chipLine(),
    tier ? el("p", { className: "dim", textContent: `${tier.name}: ${formatStakeRange(wagerStakes.minBet, wagerStakes.maxBet, { noCap: tier.maxBet == null })}` }) : null,
    dealerPanel("horse_racing"),
    el("p", { className: "subtitle", textContent: card.label }),
    el("p", { className: "racing-roster-note dim", textContent: `${poolLabel} — study the paddock before you wager.` }),
    el("p", { className: "racing-paddock-label", textContent: "Paddock" }),
    renderHorsePaddock(card.horses),
    pendingEl,
    menu(
      ["Place a wager", "Run race & settle", "New race card", "Manage horse names"],
      "Racing pavilion:",
      (choice) => {
        if (choice === 0) { goBack(); return; }
        if (choice === 1) pushView("horse-racing-wager");
        else if (choice === 2) pushView("horse-racing-settle");
        else if (choice === 3) { horseRacingState.card = generateRace(session); render(); }
        else if (choice === 4) pushView("horse-racing-names");
      },
      { showCasinoBanner: false },
    ),
  ]);
}

function renderHorseRacingWager() {
  const act = ACTIVITIES.horse_racing;
  const tier = horseRacingState.tier ?? currentStakeTier;
  const wagerStakes = tier
    ? effectiveTableStakes(tier, session.wallet.balance, act.minBet)
    : { minBet: act.minBet, maxBet: session.wallet.balance };
  const card = horseRacingState.card;
  let selectedHorse = card.horses[0]?.number ?? 1;
  const paddockContainer = el("div", {});

  const horseSelect = el("select", {}, card.horses.map((h) =>
    el("option", { value: String(h.number), textContent: `#${h.number} ${h.name} (${fmtRaceOdds(h.odds)})` })
  ));
  horseSelect.value = String(selectedHorse);

  function refreshPaddock() {
    paddockContainer.innerHTML = "";
    paddockContainer.appendChild(renderHorsePaddock(card.horses, {
      selectedNumber: selectedHorse,
      onSelect: (num) => {
        selectedHorse = num;
        horseSelect.value = String(num);
        refreshPaddock();
      },
    }));
  }
  horseSelect.onchange = () => {
    selectedHorse = parseInt(horseSelect.value, 10);
    refreshPaddock();
  };
  refreshPaddock();

  const betTypeSelect = el("select", {}, [
    el("option", { value: "win", textContent: "Win" }),
    el("option", { value: "place", textContent: "Place (top 2)" }),
    el("option", { value: "show", textContent: "Show (top 3)" }),
  ]);
  const amountInput = el("input", {
    type: "number", min: String(wagerStakes.minBet), max: String(wagerStakes.maxBet), value: String(wagerStakes.minBet),
  });

  return el("div", { className: "panel racing-pavilion" }, [
    banner("Place Wager"),
    chipLine(),
    el("p", { className: "racing-paddock-label", textContent: "Choose your pony" }),
    paddockContainer,
    el("div", { className: "form-row" }, [el("label", { textContent: "Horse" }), horseSelect]),
    el("div", { className: "form-row" }, [el("label", { textContent: "Bet type" }), betTypeSelect]),
    el("div", { className: "form-row" }, [el("label", { textContent: "Amount" }), amountInput]),
    el("div", { className: "action-bar" }, [
      el("button", {
        className: "btn primary",
        textContent: "Place ticket",
        onclick: () => {
          const horse = parseInt(horseSelect.value, 10);
          const betType = betTypeSelect.value;
          const amount = parseInt(amountInput.value, 10);
          if (amount < wagerStakes.minBet) { alert(`Minimum wager is ${wagerStakes.minBet} chips.`); return; }
          if (amount > wagerStakes.maxBet) { alert(`Maximum wager is ${wagerStakes.maxBet} chips.`); return; }
          const h = card.horses.find((x) => x.number === horse);
          if (!session.wallet.debit(amount, "horse_racing", `${betType} on #${horse}`)) {
            alert("Insufficient chips."); return;
          }
          horseRacingState.pending.push({ horse, horseName: h.name, odds: h.odds, betType, amount, spriteId: h.spriteId });
          persist();
          showStatus(`Ticket placed: ${amount} chips on #${horse} ${h.name} (${betType}).`);
          goBack();
        },
      }),
      el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
    ]),
  ]);
}

function renderHorseRacingSettle() {
  const log = el("div", { className: "log-area" });
  if (!horseRacingState.pending.length) {
    log.appendChild(el("p", { className: "error", textContent: "No open tickets." }));
  } else {
    const results = simulateRace(horseRacingState.card);
    log.appendChild(el("p", { className: "subtitle", textContent: "FINISH ORDER" }));
    const finishLine = el("div", { className: "racing-finish-line" });
    results.forEach((num, i) => {
      const h = horseRacingState.card.horses.find((x) => x.number === num);
      finishLine.appendChild(el("div", { className: "racing-finish-entry" }, [
        el("span", { className: "racing-finish-pos", textContent: `${i + 1}.` }),
        createHorseSpriteCanvas(h.spriteId, { size: 72, frame: i % 4 }),
        el("span", { className: "racing-finish-name", textContent: `#${num} ${h.name}` }),
      ]));
    });
    log.appendChild(finishLine);
    results.forEach((num, i) => {
      const h = horseRacingState.card.horses.find((x) => x.number === num);
      log.appendChild(el("div", { className: "line", textContent: `${i + 1}. #${num} ${h.name}` }));
    });

    for (const slip of horseRacingState.pending) {
      const r = settleTicket(slip, results);
      if (r.won) {
        session.wallet.credit(r.payout, "horse_racing", r.reason);
        horseRacingState.sessionNet += r.net;
        log.appendChild(el("div", { className: "line success", textContent: `WIN: ${r.reason} (${signedChips(r.net)})` }));
      } else {
        horseRacingState.sessionNet += r.net;
        log.appendChild(el("div", { className: "line error", textContent: `LOSE: ${r.reason} (${signedChips(r.net)})` }));
      }
    }
    horseRacingState.races += 1;
    horseRacingState.pending = [];
    session.recordResult("horse_racing", horseRacingState.sessionNet, horseRacingState.races);
    persist();
  }

  return el("div", { className: "panel racing-pavilion" }, [
    banner("Race Results"),
    chipLine(),
    log,
    el("div", { className: "action-bar" }, [
      el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
    ]),
  ]);
}

function renderHorseRacingNames() {
  const pool = getHorseNamePool(session);
  const statusEl = el("p", {
    className: "dim",
    textContent: session.horseRacingCustomNames
      ? `Using custom roster: ${pool.length} horse names.`
      : `Using default roster: ${pool.length} horse names (from bundled CSV).`,
  });
  const previewEl = el("div", { className: "racing-name-preview" });
  const previewNames = pool.slice(0, 12);
  for (const name of previewNames) {
    previewEl.appendChild(el("span", { className: "racing-name-chip", textContent: name }));
  }
  if (pool.length > 12) {
    previewEl.appendChild(el("span", { className: "racing-name-chip dim", textContent: `+${pool.length - 12} more…` }));
  }

  const textarea = el("textarea", {
    className: "racing-names-input",
    rows: "8",
    placeholder: "Paste horse names here — one per line, or CSV with a Name column.\n\nSugar Cube\nStarlight Trot\nMarshmallow Mane",
  });
  const fileInput = el("input", { type: "file", accept: ".csv,.txt,text/csv,text/plain" });
  fileInput.onchange = async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    textarea.value = await file.text();
    statusEl.textContent = `Loaded ${file.name} — review and save to apply.`;
    statusEl.className = "success";
  };

  return el("div", { className: "panel racing-pavilion" }, [
    banner("Horse Name Roster"),
    chipLine(),
    el("p", { className: "dim", textContent: "Upload or paste a custom horse name list. Names cycle through the paddock on each new race card." }),
    statusEl,
    previewEl,
    el("div", { className: "form-row" }, [
      el("label", { textContent: "Import CSV / text file" }),
      fileInput,
    ]),
    el("div", { className: "form-row" }, [
      el("label", { textContent: "Or paste names" }),
      textarea,
    ]),
    el("div", { className: "action-bar" }, [
      el("button", {
        className: "btn primary",
        textContent: "Save custom roster",
        onclick: () => {
          const names = parseHorseNamesCSV(textarea.value);
          if (names.length < 6) {
            alert("Please provide at least 6 unique horse names.");
            return;
          }
          setCustomHorseNames(session, names);
          horseRacingState.card = null;
          persist();
          showStatus(`Saved ${names.length} custom horse names. New race cards will cycle through your roster.`);
          goBack();
        },
      }),
      el("button", {
        className: "btn",
        textContent: "Reset to default",
        onclick: () => {
          setCustomHorseNames(session, null);
          horseRacingState.card = null;
          persist();
          showStatus("Restored default horse name roster.");
          render();
        },
      }),
      el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
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
  if (activeTableDealer) {
    blackjackGame.messages.push({
      type: "dim",
      text: `${activeTableDealer.name}: "${pickQuip(activeTableDealer, "deal")}"`,
    });
  }
  pushView("blackjack-play");
}

function renderBlackjackPlay() {
  if (!blackjackGame) return el("div", { textContent: "No active game." });

  const game = blackjackGame;
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

  return videoMachine("blackjack", {
    title: activeTableDealer ? activeTableDealer.name.toUpperCase() : "BLACKJACK",
    screenChildren: [
      activeTableDealer
        ? el("p", { className: "machine-status", textContent: activeTableDealer.tagline })
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
  if (blackjackGame) {
    if (blackjackGame.phase === "complete" && !blackjackGame.roundOverEarly) {
      blackjackSessionNet += blackjackGame.humanNet;
    }
    session.recordResult("blackjack", blackjackSessionNet);
    persist();
    if (!silent) {
      showStatus(`Leaving table. Session net: ${blackjackSessionNet >= 0 ? "+" : ""}${blackjackSessionNet.toLocaleString()} chips`);
    }
    blackjackGame = null;
    blackjackSessionNet = 0;
  }
  popToView("hub");
  render();
}

function popToView(name) {
  while (viewStack.length > 1 && viewStack[viewStack.length - 1].name !== name) {
    viewStack.pop();
  }
}

function pushView(name, data = {}) {
  viewStack.push({ name, data });
  render();
}

function popView() {
  if (viewStack.length > 1) viewStack.pop();
}

function goBack({ doPersist = true } = {}) {
  popView();
  if (doPersist) persist();
  render();
}

function renderNotFound({ requestedView } = {}) {
  const label = requestedView ? `"${requestedView}"` : "this screen";
  return el("div", { className: "error-screen panel" }, [
    banner(CASINO_NAME),
    el("pre", {
      className: "error-ascii",
      textContent: `╔══════════════════════════════════════╗
║         THE MANDALAY BAY             ║
║      ░░░  WRONG FLOOR  ░░░           ║
╚══════════════════════════════════════╝`,
    }),
    el("p", { className: "error-code", textContent: "404 — TABLE CLOSED" }),
    el("p", { className: "error-slots", textContent: "🎰 7️⃣ ❓" }),
    el("p", {
      className: "error-message",
      innerHTML: `This table isn't on the floor.<br>Screen ${label} is not available at The Mandalay Bay.`,
    }),
    el("div", { className: "error-actions" }, [
      el("button", {
        className: "btn primary",
        textContent: "Return to Casino Floor",
        onclick: () => {
          viewStack = [{ name: session.slotId != null ? "hub" : "save-picker", data: {} }];
          render();
        },
      }),
    ]),
    el("p", { className: "footer-note", textContent: "Play in your browser — session saved locally" }),
  ]);
}

const hotelRenderers = buildHotelRenderers({
  get session() { return session; },
  get rewardsPhone() { return rewardsPhone; },
  pushView,
  goBack,
  persist,
  render,
  el,
  banner,
  chipLine,
  statusBanner,
  viewStack,
});

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
  "stake-tier": renderStakeTier,
  "slots-menu": renderSlotsMenu,
  "slots-play": renderSlotsPlay,
  sportsbook: renderSportsbook,
  "sportsbook-wager": renderSportsbookWager,
  "sportsbook-settle": renderSportsbookSettle,
  "blackjack-menu": renderBlackjackMenu,
  "blackjack-custom": renderBlackjackCustom,
  "blackjack-play": renderBlackjackPlay,
  "holdem-menu": renderHoldemMenu,
  "holdem-play": renderHoldemPlay,
  roulette: renderRoulette,
  "horse-racing": renderHorseRacing,
  "horse-racing-wager": renderHorseRacingWager,
  "horse-racing-settle": renderHorseRacingSettle,
  "horse-racing-names": renderHorseRacingNames,
  ...hotelRenderers,
  "not-found": renderNotFound,
};

function render() {
  const current = viewStack[viewStack.length - 1] ?? { name: "hub", data: {} };
  const fn = RENDERERS[current.name];
  app.innerHTML = "";
  if (fn) {
    app.appendChild(fn(current.data));
    return;
  }
  app.appendChild(renderNotFound({ requestedView: current.name }));
}

viewStack = [{ name: "save-picker", data: {} }];

function applyLaunchParams() {
  const params = new URLSearchParams(window.location.search);
  const initialView = params.get("view") ?? undefined;
  if (params.get("guest") === "1") {
    enterCasino(createGuestSession({
      playerName: params.get("name") || "Guest",
      chips: Math.max(0, parseInt(params.get("chips") || "1000", 10)),
    }), { initialView });
    return true;
  }
  const slotParam = params.get("slot");
  if (slotParam) {
    const slotId = parseInt(slotParam, 10);
    if (slotId >= 1 && slotId <= 5) {
      if (params.get("new") === "1") {
        pushView("save-create", { slotId });
        return true;
      }
      const loaded = loadSlot(slotId);
      if (loaded) {
        enterCasino(loaded, { initialView });
        return true;
      }
      pushView("save-create", { slotId });
      return true;
    }
  }
  return false;
}

function hideBootLoader() {
  const loader = document.getElementById("boot-loader");
  if (loader) loader.remove();
}

if (!applyLaunchParams()) {
  const remembered = loadActiveProfile();
  if (remembered) {
    hideBootLoader();
    enterCasino(remembered);
    loadBundledHorseNames();
  } else {
    loadBundledHorseNames().finally(() => {
      hideBootLoader();
      render();
    });
  }
} else {
  hideBootLoader();
  loadBundledHorseNames();
}

if (!navigator.onLine) {
  window.addEventListener("online", () => render(), { once: true });
}

window.addEventListener("beforeunload", () => {
  if (session.slotId != null) persist();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "p" || e.key === "P") {
    const inCasino = viewStack.some((v) => v.name !== "save-picker" && v.name !== "save-create");
    const blackjackNeedsP = viewStack.at(-1)?.name === "blackjack-play" && blackjackGame?.pendingAction;
    if (inCasino && rewardsPhone && !blackjackNeedsP) {
      rewardsPhone.toggle();
      e.preventDefault();
      return;
    }
  }
  if (!blackjackGame?.pendingAction) return;
  const map = { h: Action.HIT, s: Action.STAND, d: Action.DOUBLE, p: Action.SPLIT, u: Action.SURRENDER };
  const act = map[e.key.toLowerCase()];
  if (act && blackjackGame.getCurrentLegalActions().has(act)) {
    blackjackGame.playerAction(act);
    render();
  }
});
