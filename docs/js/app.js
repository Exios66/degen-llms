import {
  CASINO_NAME, ACTIVITIES, FLOOR_ORDER, fmtChips, signedChips,
  saveSlot, loadSlot, createSlot, deleteSlot, listSlots, recentSlots, formatSaveTime,
  createGuestSession, PlayerSession, formatPlayTimeSummary, formatSaveSlotPlayTimes, getCasinoTimeMs,
} from "./core.js";
import { startCasinoClock, stopCasinoClock } from "./casino-time.js";
import { formatVegasClockLabel, formatVegasTime } from "./vegas-time.js";
import { onActivityVisit, syncContactIntros, onSessionSwing } from "./phone-contacts.js";
import { applyIntoxicationEffects } from "./intoxication-effects.js";
import {
  MACHINES,
  spinReels,
  randomSymbol,
  displaySymbol,
  calculatePayout,
  contributeToProgressive,
  tryJackpot,
  progressivePool,
} from "./slots.js";
import { getMachineUI, paytableEntries, SLOT_CATEGORIES } from "./slots-ui.js";
import { SportsbookState, fmtOdds, oddsForSelection, formatEventScore } from "./sportsbook.js";
import { categoryLabel, predictionPayout } from "./predictionMarkets.js";
import {
  canEnterHighLimitSalon, canEnterFoundationRoom, HIGH_LIMIT_SALON_CHIP_MIN, SALON_STAKE_TIER_IDS,
} from "./venues.js";
import { BlackjackGame, defaultConfig, Action } from "./blackjack/game.js";
import { HoldemTable, BettingAction } from "./holdem/game.js";
import { HAND_CLASS_NAMES } from "./holdem/hand_eval.js";
import { BET_TYPES, spinWheel, wheelColor, resolveBet, RED_NUMBERS } from "./roulette.js";
import { generateRace, simulateRace, settleTicket, fmtOdds as fmtRaceOdds, loadBundledHorseNames, parseHorseNamesCSV, setCustomHorseNames, getHorseNamePool } from "./horse_racing.js";
import { generateDressage, simulateDressage, settleDressageTicket, generateJumper, simulateJumper, settleJumperTicket, fmtOddsEq } from "./equestrian.js";
import { createHorseSpriteCanvas, getHorseSprite, getJockeySilks, HORSE_SPRITE_ROSTER } from "./horse-sprites.js";
import { createRaceTrackView, createRacePreview } from "./horse-race-track.js";
import { getSessionDealer, pickQuip } from "./dealers.js";
import {
  ensureBank, cashOutToBank, buyInForSession, fundBankFromOutside, renameBankAccount,
  OUTSIDE_EXPENSE_CATEGORIES, expenseCategoryLabel,
} from "./bank-account.js";
import {
  editableStaffEntries, updateStaffOverride, clearStaffOverride, setStaffOverrides,
} from "./staff-manifest.js";
import { RewardsPhone } from "./RewardsPhone.js";
import { buildHotelRenderers } from "./hotel-ui.js";
import { buildPoolRenderers } from "./pool-complex-ui.js";
import { buildAmenitiesRenderers } from "./casino-amenities-ui.js";
import { ensureHotel } from "./hotel.js";
import {
  STAKE_TIERS, TIER_ORDER, getTier, formatTierLabel, effectiveTableStakes, effectiveSlotStakes,
  formatStakeRange, tierUsesSalonLimits, getTierPayoutBoost,
} from "./stakes.js";
import { getActivityTiming, applyTierSpeedCss } from "./rewards-perks.js";

const app = document.getElementById("app");

let session = new PlayerSession();
let rewardsPhone = null;
let sportsbook = new SportsbookState();
let blackjackGame = null;
let blackjackSessionNet = 0;
let slotsState = { machine: null, sessionNet: 0, spins: 0, tier: null };
let slotsSpinTimers = [];
let holdemState = null;
let rouletteState = { sessionNet: 0, spins: 0, lastNumber: null, spinning: false, tier: null };
let horseRacingState = { card: null, pending: [], sessionNet: 0, races: 0, tier: null };
let dressageState = { card: null, pending: [], sessionNet: 0, events: 0, tier: null };
let jumperState = { card: null, pending: [], sessionNet: 0, events: 0, tier: null };
let currentStakeTier = null;
let activeTableDealer = null;
let viewStack = [];
let statusMessage = null;
let casinoTimeTicker = null;

function isInCasinoView() {
  return viewStack.some((v) => v.name !== "save-picker" && v.name !== "save-create" && v.name !== "save-delete");
}

function startCasinoTimeTicker() {
  stopCasinoTimeTicker();
  casinoTimeTicker = window.setInterval(() => {
    const vegasEl = document.getElementById("vegas-clock");
    if (vegasEl) vegasEl.textContent = formatVegasClockLabel();
    if (!isInCasinoView() || session.slotId == null) return;
    const timeEl = document.getElementById("casino-time-tracker");
    if (timeEl) {
      timeEl.textContent = formatPlayTimeSummary(getCasinoTimeMs(session));
    }
  }, 30000);
}

function stopCasinoTimeTicker() {
  if (casinoTimeTicker != null) {
    window.clearInterval(casinoTimeTicker);
    casinoTimeTicker = null;
  }
}

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
  syncContactIntros(session);
  if (session.slotId != null) saveSlot(session);
}

function recordActivityVisit(activity) {
  session.recordVisit(activity);
  onActivityVisit(session, activity);
}

function recordActivityResult(activity, net, bets = 1) {
  session.recordResult(activity, net, bets);
  onSessionSwing(session, activity, net);
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
    else if (k === "disabled") node.disabled = Boolean(v);
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
  const bank = ensureBank(session);
  return el("div", { className: "chip-line-wrap" }, [
    el("p", { className: "chip-line", textContent: `Floor chips: ${fmtChips(session.wallet.balance)}` }),
    el("p", {
      className: "bank-line dim",
      textContent: `${bank.accountName}: ${fmtChips(bank.balance)} (off-strip)`,
    }),
  ]);
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

function clearSlotsSpinTimers() {
  for (const timerId of slotsSpinTimers) {
    clearTimeout(timerId);
    clearInterval(timerId);
  }
  slotsSpinTimers = [];
  if (slotsState.spinIntervalId != null) {
    clearInterval(slotsState.spinIntervalId);
    slotsState.spinIntervalId = null;
  }
}

function scheduleSlotsSpin(fn, ms) {
  const timerId = window.setTimeout(fn, ms);
  slotsSpinTimers.push(timerId);
  return timerId;
}

function classifySlotWin(win, bet, isJackpot) {
  if (isJackpot) return "jackpot";
  if (win >= bet * 15 || win >= 1000) return "big";
  return "small";
}

function slotResultElement(message, { spinning = false, reelsStopped = 3 } = {}) {
  if (spinning && reelsStopped < 3) {
    const cues = ["Spinning…", "Reels rolling…", "Almost there…"];
    return el("p", {
      className: "slot-result slot-result--spinning",
      textContent: cues[Math.min(reelsStopped, cues.length - 1)],
    });
  }
  if (!message) {
    return el("p", { className: "slot-result dim", textContent: "Place your bet and spin." });
  }
  if (message.type === "success" || message.type === "jackpot-win") {
    const tier = message.winTier ?? (message.type === "jackpot-win" ? "jackpot" : "small");
    return el("div", { className: `slot-win-callout slot-win-callout--${tier}` }, [
      message.amount != null
        ? el("div", { className: "slot-win-callout-amount", textContent: `+${message.amount.toLocaleString()} chips` })
        : null,
      el("div", { className: "slot-win-callout-detail", textContent: message.text }),
    ]);
  }
  return el("p", { className: `slot-result ${message.type}`, textContent: message.text });
}

function slotPaytablePanel(machine, tierBoost = 1.0) {
  const rows = paytableEntries(machine, tierBoost).map((entry) =>
    el("div", {
      className: `slot-paytable-row${entry.progressive ? " slot-paytable-row--jackpot" : ""}`,
    }, [
      el("span", { textContent: entry.label }),
      el("span", {
        className: "slot-paytable-mult",
        textContent: entry.progressive
          ? `PROGRESSIVE (${entry.note})`
          : `${entry.mult.toLocaleString()}x`,
      }),
    ])
  );
  const boostBadge = tierBoost !== 1.0
    ? el("div", { className: "slot-paytable-boost-badge", textContent: `★ ${tierBoost.toFixed(0)}× tier boost active` })
    : null;
  return el("div", { className: "slot-paytable-panel" }, [
    el("div", { className: "slot-paytable-title", textContent: "Paytable" }),
    boostBadge,
    el("div", { className: "slot-paytable-grid" }, rows),
  ].filter(Boolean));
}

function slotReelWindow(machine, reels, {
  spinning = false,
  reelsStopped = 3,
  landedReel = -1,
  win = false,
  winTier = null,
} = {}) {
  const ui = getMachineUI(machine);
  const symbols = reels?.length === 3
    ? reels.map((r) => (r ? displaySymbol(r, session.useUnicode) : "—"))
    : ["—", "—", "—"];
  const windowClasses = [
    "slot-reel-window",
    `slot-reel-window--${ui.reelFrame}`,
    spinning && reelsStopped < 3 ? "slot-reel-window--active-spin" : "",
    win && winTier ? `slot-reel-window--win slot-reel-window--win-${winTier}` : "",
  ].filter(Boolean).join(" ");
  const windowEl = el("div", { className: windowClasses });
  for (let i = 0; i < 3; i += 1) {
    const isSpinning = spinning && i >= reelsStopped;
    const reelClasses = [
      "slot-reel",
      isSpinning ? "slot-reel--spinning" : "",
      i === landedReel ? "slot-reel--landed" : "",
      win && i < reelsStopped ? "slot-reel--winner" : "",
    ].filter(Boolean).join(" ");
    const reelEl = el("div", { className: reelClasses }, [
      el("span", { className: "slot-reel-symbol", textContent: symbols[i] }),
    ]);
    if (isSpinning) reelEl.style.setProperty("--reel-delay", `${i * 0.05}s`);
    windowEl.appendChild(reelEl);
  }
  if (win && winTier) {
    windowEl.appendChild(el("div", { className: "slot-reel-window-shimmer", "aria-hidden": "true" }));
  }
  return windowEl;
}

function slotCabinet(machine, { screenChildren = [], baseChildren = [], celebrate = null } = {}) {
  const ui = getMachineUI(machine);
  const badges = [
    el("span", { className: "slot-cabinet-badge", textContent: ui.category }),
    el("span", { className: "slot-cabinet-badge", textContent: ui.badge }),
  ];
  const cabinetClass = [
    "slot-cabinet",
    ui.themeClass,
    celebrate ? `slot-cabinet--celebrate slot-cabinet--celebrate-${celebrate}` : "",
  ].filter(Boolean).join(" ");
  return el("div", { className: cabinetClass }, [
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
    createHorseSpriteCanvas(horse.spriteId, {
      size: 80,
      animate: true,
      animation: "walk",
      direction: "front",
      horseNumber: horse.number,
      withJockey: false,
    }),
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

function enterCasino(nextSession) {
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
  if (session.slotId != null) startCasinoClock();
  startCasinoTimeTicker();
  mountRewardsPhone();
  syncContactIntros(nextSession);
  applyIntoxicationEffects(session);
  render();
}

function returnToSavePicker() {
  persist();
  stopCasinoClock();
  stopCasinoTimeTicker();
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
  const children = [
    el("span", { className: "dim", textContent: `Save: ${saveLabel}` }),
    el("span", {
      id: "vegas-clock",
      className: "dim",
      textContent: formatVegasClockLabel(),
    }),
  ];
  if (session.slotId != null) {
    children.push(el("span", {
      id: "casino-time-tracker",
      className: "dim",
      textContent: formatPlayTimeSummary(getCasinoTimeMs(session)),
    }));
  }
  children.push(
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
  );
  return el("div", { className: "settings-bar" }, children);
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
        textContent: `Slot ${slot.slotId}: ${slot.label} — ${slot.playerName} — ${fmtChips(slot.balance)} · ${formatSaveSlotPlayTimes(slot.casinoTimeMs)} (last: ${formatSaveTime(slot.updatedAt)})`,
      }));
    }
    panel.appendChild(recentList);
  }

  const menuList = el("ul", { className: "menu-list" });
  allSlots.forEach((slot, i) => {
    const label = slot.occupied
      ? `Load Slot ${slot.slotId} — ${slot.playerName} (${fmtChips(slot.balance)}) · ${formatSaveSlotPlayTimes(slot.casinoTimeMs)}`
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
  const floors = [
    ...FLOOR_ORDER,
    "Cashier",
    "Off-Strip Bank Account",
    "Staff Manifest",
    "Player Stats",
    "Save Game",
    "Exit to Hotel",
    "Casino Amenities",
    "Explore Resort (RPG)",
    "Leave Casino",
  ];
  const options = floors.map((f) => (FLOOR_ORDER.includes(f) ? `Explore ${f}` : f));

  const wrap = el("div", {}, [
    statusBanner(),
    settingsBar(),
    banner(CASINO_NAME),
    session.slotId != null
      ? el("p", { className: "dim", textContent: `Save: ${session.slotLabel || `Slot ${session.slotId}`}` })
      : el("p", { className: "dim", textContent: "Guest visit — progress is not saved" }),
    el("p", { className: "welcome-line", textContent: `Welcome, ${session.playerName}` }),
    el("p", { className: "dim", textContent: formatVegasClockLabel() }),
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
      pushView("bank-account");
    } else if (choice === FLOOR_ORDER.length + 3) {
      pushView("staff-manifest");
    } else if (choice === FLOOR_ORDER.length + 4) {
      pushView("stats");
    } else if (choice === FLOOR_ORDER.length + 5) {
      if (session.slotId != null) {
        persist();
        showStatus(`Game saved to ${session.slotLabel || `Slot ${session.slotId}`}.`);
      } else {
        showStatus("No save slot active — pick a slot at entry or play as guest.", "error");
      }
    } else if (choice === FLOOR_ORDER.length + 6) {
      ensureHotel(session);
      pushView("hotel-lobby");
    } else if (choice === FLOOR_ORDER.length + 7) {
      pushView("casino-floor");
    } else if (choice === FLOOR_ORDER.length + 8) {
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
    else if (act.id === "dressage") pushView("stake-tier", { activityId: "dressage", nextView: "dressage" });
    else if (act.id === "jumper") pushView("stake-tier", { activityId: "jumper", nextView: "jumper" });
  }
}

function renderCashier() {
  return el("div", {}, [
    statusBanner(),
    banner("Cashier"),
    chipLine(),
    menu(
      ["Buy chips ($500 bundle)", "Buy custom amount", "Cash out chips to bank", "View floor transaction ledger"],
      "Chip window:",
      (choice) => {
        if (choice === 0) { goBack(); return; }
        if (choice === 1) {
          const outcome = buyInForSession(session, 500, { useOutsideFunds: true });
          persist();
          const bank = ensureBank(session);
          if (outcome === "from_bank") {
            showStatus(`Purchased ${fmtChips(500)} from ${bank.accountName}. Floor balance: ${fmtChips(session.wallet.balance)}`);
          } else {
            showStatus(`Purchased ${fmtChips(500)} with outside funds. Balance: ${fmtChips(session.wallet.balance)}`);
          }
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
          const bank = ensureBank(session);
          let outcome;
          if (bank.balance >= amount) {
            outcome = buyInForSession(session, amount);
          } else if (confirm(`Only ${fmtChips(bank.balance)} in ${bank.accountName}. Use outside funds for the buy-in?`)) {
            outcome = buyInForSession(session, amount, { useOutsideFunds: true });
          } else {
            return;
          }
          persist();
          if (outcome === "from_bank") {
            showStatus(`Purchased ${fmtChips(amount)} from ${bank.accountName}. Floor balance: ${fmtChips(session.wallet.balance)}`);
          } else if (outcome === "outside_funds") {
            showStatus(`Purchased ${fmtChips(amount)} with outside funds. Balance: ${fmtChips(session.wallet.balance)}`);
          } else {
            showStatus("Buy-in failed.", "error");
            return;
          }
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
          const bank = ensureBank(session);
          if (cashOutToBank(session, amount)) {
            persist();
            showStatus(`Cashed out ${fmtChips(amount)} to ${bank.accountName}. Floor balance: ${fmtChips(session.wallet.balance)}`);
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
      const sign = tx.amount >= 0 ? "+" : "";
      return el("tr", {}, [
        el("td", { textContent: formatVegasTime(tx.timestamp) }),
        el("td", { textContent: tx.activity }),
        el("td", { textContent: `${sign}${tx.amount.toLocaleString()}` }),
        el("td", { textContent: tx.balanceAfter.toLocaleString() }),
        el("td", { textContent: tx.description }),
      ]);
    }) : [el("tr", {}, [el("td", { colSpan: "5", className: "dim", textContent: "No transactions yet." })])]),
  ]);

  return el("div", { className: "panel" }, [
    banner("Transaction Ledger"),
    el("div", { className: "ledger-table-wrap" }, [table]),
    el("div", { className: "action-bar" }, [
      el("button", { className: "btn", textContent: "Back", onclick: () => { popView(); render(); } }),
    ]),
  ]);
}

function renderBankAccount() {
  const bank = ensureBank(session);
  return el("div", {}, [
    statusBanner(),
    banner(bank.accountName),
    chipLine(),
    el("p", {
      className: "dim",
      textContent: "Your off-strip account — cashed-out chips land here for life outside the casino.",
    }),
    menu(
      ["Deposit outside funds", "Pay outside expense", "Rename account", "View bank ledger"],
      "Off-strip banking:",
      (choice) => {
        if (choice === 0) { goBack(); return; }
        if (choice === 1) pushView("bank-deposit");
        else if (choice === 2) pushView("bank-expense");
        else if (choice === 3) pushView("bank-rename");
        else if (choice === 4) pushView("bank-ledger");
      },
      { showCasinoBanner: false },
    ),
  ]);
}

function renderBankDeposit() {
  const input = el("input", { type: "number", min: "50", max: "1000000", value: "500" });
  return el("div", { className: "panel" }, [
    banner("Deposit Outside Funds"),
    chipLine(),
    el("p", { className: "dim", textContent: "Symbolic personal funds wired to your off-strip account." }),
    el("div", { className: "form-row" }, [el("label", { textContent: "Amount" }), input]),
    el("div", { className: "action-bar" }, [
      el("button", {
        className: "btn primary",
        textContent: "Deposit",
        onclick: () => {
          const amount = parseInt(input.value, 10);
          if (amount < 50 || amount > 1000000) { alert("Enter $50–$1,000,000"); return; }
          fundBankFromOutside(session, amount);
          persist();
          showStatus(`Deposited ${fmtChips(amount)}. Bank balance: ${fmtChips(session.bank.balance)}`);
          goBack();
        },
      }),
      el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
    ]),
  ]);
}

function renderBankExpense() {
  const bank = ensureBank(session);
  if (bank.balance <= 0) {
    return el("div", { className: "panel" }, [
      banner("Pay Outside Expense"),
      el("p", { className: "error", textContent: "Your bank account is empty." }),
      el("div", { className: "action-bar" }, [
        el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
      ]),
    ]);
  }

  const categorySelect = el("select", {}, OUTSIDE_EXPENSE_CATEGORIES.map(([id, label]) =>
    el("option", { value: id, textContent: label })
  ));
  const amountInput = el("input", {
    type: "number",
    min: "1",
    max: String(bank.balance),
    value: String(Math.min(100, bank.balance)),
  });
  const memoInput = el("input", { type: "text", placeholder: "Optional memo" });

  return el("div", { className: "panel" }, [
    banner("Pay Outside Expense"),
    chipLine(),
    el("div", { className: "form-row" }, [el("label", { textContent: "Category" }), categorySelect]),
    el("div", { className: "form-row" }, [el("label", { textContent: "Amount" }), amountInput]),
    el("div", { className: "form-row" }, [el("label", { textContent: "Memo" }), memoInput]),
    el("div", { className: "action-bar" }, [
      el("button", {
        className: "btn primary",
        textContent: "Pay",
        onclick: () => {
          const amount = parseInt(amountInput.value, 10);
          if (amount < 1 || amount > bank.balance) {
            alert(`Enter $1–${bank.balance.toLocaleString()}`);
            return;
          }
          const categoryId = categorySelect.value;
          const label = expenseCategoryLabel(categoryId);
          const memo = memoInput.value.trim();
          const description = memo ? `${label} — ${memo}` : label;
          if (bank.payExpense(amount, categoryId, description)) {
            persist();
            showStatus(`Paid ${fmtChips(amount)} for ${label}. Bank balance: ${fmtChips(bank.balance)}`);
            goBack();
          } else {
            showStatus("Payment failed.", "error");
          }
        },
      }),
      el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
    ]),
  ]);
}

function renderBankRename() {
  const bank = ensureBank(session);
  const input = el("input", { type: "text", value: bank.accountName });
  return el("div", { className: "panel" }, [
    banner("Rename Account"),
    el("div", { className: "form-row" }, [el("label", { textContent: "Account name" }), input]),
    el("div", { className: "action-bar" }, [
      el("button", {
        className: "btn primary",
        textContent: "Save name",
        onclick: () => {
          renameBankAccount(session, input.value);
          persist();
          showStatus(`Account renamed to ${session.bank.accountName}.`);
          goBack();
        },
      }),
      el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
    ]),
  ]);
}

function renderBankLedger() {
  const txs = ensureBank(session).recentTransactions(20);
  const table = el("table", { className: "ledger-table" }, [
    el("thead", {}, [el("tr", {}, [
      el("th", { textContent: "Time" }),
      el("th", { textContent: "Category" }),
      el("th", { textContent: "Amount" }),
      el("th", { textContent: "Balance" }),
      el("th", { textContent: "Description" }),
    ])]),
    el("tbody", {}, txs.length ? [...txs].reverse().map((tx) => {
      const sign = tx.amount >= 0 ? "+" : "";
      return el("tr", {}, [
        el("td", { textContent: formatVegasTime(tx.timestamp) }),
        el("td", { textContent: tx.category }),
        el("td", { textContent: `${sign}${tx.amount.toLocaleString()}` }),
        el("td", { textContent: tx.balanceAfter.toLocaleString() }),
        el("td", { textContent: tx.description }),
      ]);
    }) : [el("tr", {}, [el("td", { colSpan: "5", className: "dim", textContent: "No bank transactions yet." })])]),
  ]);

  return el("div", { className: "panel" }, [
    banner("Bank Ledger"),
    el("div", { className: "ledger-table-wrap" }, [table]),
    el("div", { className: "action-bar" }, [
      el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
    ]),
  ]);
}

function renderStaffManifest() {
  const entries = editableStaffEntries(session);
  const list = el("ul", { className: "menu-list staff-manifest-list" });
  entries.forEach((entry, i) => {
    const roleLabel = entry.category === "dealers"
      ? entry.games.join(", ")
      : entry.role;
    list.appendChild(el("li", {}, [
      el("button", {
        className: "menu-btn",
        innerHTML: [
          `<span class="num">${i + 1})</span> ${entry.name}`,
          entry.customized ? ' <span class="staff-custom-badge">custom</span>' : "",
          `<br><span class="dim" style="padding-left:1.75rem;font-size:0.85rem;">${roleLabel}</span>`,
        ].join(""),
        onclick: () => pushView("staff-manifest-edit", { staffId: entry.id, category: entry.category }),
      }),
    ]));
  });

  return el("div", {}, [
    statusBanner(),
    banner("Staff Manifest"),
    el("p", {
      className: "dim",
      textContent: "Customize dealer and venue staff names, context, and optional phone dialogue for MGM Connect.",
    }),
    el("div", { className: "panel" }, [
      list,
      el("div", { className: "action-bar" }, [
        el("button", {
          className: "btn",
          textContent: "Reset all customizations",
          onclick: () => {
            if (confirm("Restore the default staff manifest for this save?")) {
              setStaffOverrides(session, null);
              persist();
              showStatus("Restored default staff manifest.");
              render();
            }
          },
        }),
        el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
      ]),
    ]),
  ]);
}

function renderStaffManifestEdit({ staffId, category }) {
  const entry = editableStaffEntries(session).find((e) => e.id === staffId && e.category === category);
  if (!entry) {
    return el("div", { className: "panel" }, [
      el("p", { className: "error", textContent: "Staff member not found." }),
      el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
    ]);
  }

  const nameInput = el("input", { type: "text", value: entry.name });
  const taglineInput = category === "dealers"
    ? el("input", { type: "text", value: entry.tagline })
    : null;
  const contextInput = el("textarea", {
    className: "staff-context-input",
    rows: "4",
    textContent: entry.context,
  });
  const phoneIntroInput = el("textarea", {
    className: "staff-context-input",
    rows: "2",
    placeholder: "Custom auto-text when this contact unlocks on your phone…",
    textContent: entry.phoneIntro ?? "",
  });
  const phoneTextsInput = el("textarea", {
    className: "staff-context-input",
    rows: "4",
    placeholder: "Custom text options — one per line: Label :: Reply",
    textContent: (entry.phoneTexts ?? []).map((t) => `${t.label} :: ${t.reply}`).join("\n"),
  });

  const fields = [
    el("div", { className: "form-row" }, [el("label", { textContent: "Display name" }), nameInput]),
  ];
  if (taglineInput) {
    fields.push(el("div", { className: "form-row" }, [el("label", { textContent: "Tagline" }), taglineInput]));
  }
  fields.push(el("div", { className: "form-row" }, [el("label", { textContent: "Context / notes" }), contextInput]));
  fields.push(el("div", { className: "form-row" }, [
    el("label", { textContent: "Phone intro (MGM Connect)" }),
    phoneIntroInput,
  ]));
  fields.push(el("div", { className: "form-row" }, [
    el("label", { textContent: "Custom phone texts (Label :: Reply)" }),
    phoneTextsInput,
  ]));

  return el("div", { className: "panel" }, [
    banner(`Edit ${entry.name}`),
    el("p", { className: "dim", textContent: `${entry.id} · ${category === "dealers" ? entry.games.join(", ") : entry.role}` }),
    ...fields,
    el("div", { className: "action-bar" }, [
      el("button", {
        className: "btn primary",
        textContent: "Save",
        onclick: () => {
          const fieldsToSave = { name: nameInput.value.trim() };
          if (taglineInput) fieldsToSave.tagline = taglineInput.value.trim();
          fieldsToSave.context = contextInput.value.trim();
          fieldsToSave.phoneIntro = phoneIntroInput.value.trim();
          const phoneTexts = phoneTextsInput.value
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
              const sep = line.indexOf("::");
              if (sep < 0) return { label: line, reply: "…" };
              return {
                label: line.slice(0, sep).trim(),
                reply: line.slice(sep + 2).trim(),
              };
            })
            .filter((t) => t.label);
          fieldsToSave.phoneTexts = phoneTexts.length ? phoneTexts : undefined;
          const hasContent = Object.entries(fieldsToSave).some(([k, v]) => {
            if (k === "phoneTexts") return Array.isArray(v) && v.length > 0;
            return Boolean(v);
          });
          if (!hasContent) {
            clearStaffOverride(session, category, staffId);
          } else {
            updateStaffOverride(session, category, staffId, fieldsToSave);
          }
          persist();
          showStatus(`Updated ${entry.name}.`);
          goBack();
        },
      }),
      el("button", {
        className: "btn",
        textContent: "Reset this entry",
        onclick: () => {
          clearStaffOverride(session, category, staffId);
          persist();
          showStatus(`Reset ${staffId} to defaults.`);
          goBack();
        },
      }),
      el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
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
    session.slotId != null
      ? el("p", { className: "dim", textContent: formatPlayTimeSummary(getCasinoTimeMs(session)) })
      : null,
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
      if (activityId === "dressage") dressageState.tier = tier;
      if (activityId === "jumper") jumperState.tier = tier;
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
  recordActivityVisit("slots");
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
  applyTierSpeedCss(tier.id);
  const stakes = effectiveSlotStakes(machine, tier, session.wallet.balance);
  const minBet = stakes.minBet;
  const maxBet = stakes.maxBet;
  const betInput = el("input", {
    type: "number", min: String(minBet), max: String(maxBet), value: String(minBet),
  });
  const reelsStopped = slotsState.reelsStopped ?? 3;
  const reelsForDisplay = (slotsState.spinning || reelsStopped < 3)
    ? (slotsState.displayReels ?? slotsState.lastReels)
    : slotsState.lastReels;
  const msgEl = slotResultElement(slotsState.lastMessage, {
    spinning: slotsState.spinning,
    reelsStopped,
  });
  const summaryEl = el("p", {
    className: "dim",
    textContent: slotsState.spins ? `Session: ${signedChips(slotsState.sessionNet)} over ${slotsState.spins} spin(s)` : "",
  });

  const reelsEl = slotReelWindow(machine, reelsForDisplay, {
    spinning: slotsState.spinning,
    reelsStopped,
    landedReel: slotsState.landedReel ?? -1,
    win: slotsState.lastWin,
    winTier: slotsState.winTier,
  });

  const jackpotEl = machine.progressive && machine.progressivePoolId
    ? el("div", {
      className: `slot-jackpot-ticker${slotsState.winTier === "jackpot" ? " slot-jackpot-ticker--hit" : ""}`,
      textContent: `★ PROGRESSIVE ${progressivePool(session, machine.progressivePoolId, machine.progressiveSeed).toLocaleString()} ★`,
    })
    : null;

  const maxBetNote = machine.jackpotRequiresMaxBet
    ? el("p", { className: "dim", textContent: `Max bet (${maxBet.toLocaleString()} chips) required to qualify for the progressive jackpot.` })
    : null;

  function doSpin() {
    const bet = parseInt(betInput.value, 10);
    if (bet === 0) {
      clearSlotsSpinTimers();
      recordActivityResult("slots", slotsState.sessionNet, slotsState.spins);
      persist();
      popView();
      render();
      return;
    }
    if (bet < minBet) {
      slotsState.lastMessage = { text: `Minimum spin is ${minBet}.`, type: "error" };
      render();
      return;
    }
    if (bet > maxBet) {
      slotsState.lastMessage = { text: `Maximum spin is ${maxBet}.`, type: "error" };
      render();
      return;
    }
    if (!session.wallet.debit(bet, "slots", `${machine.name} spin ${fmtChips(bet)}`)) {
      slotsState.lastMessage = { text: "Insufficient chips.", type: "error" };
      render();
      return;
    }

    clearSlotsSpinTimers();
    const timing = getActivityTiming(tier.id);

    contributeToProgressive(session, machine, bet);
    const finalReels = spinReels(machine);
    const jackpotAmount = tryJackpot(session, machine, finalReels, bet, maxBet);
    const tierBoost = getTierPayoutBoost(tier?.id);
    const { win, reason } = calculatePayout(finalReels, bet, machine, jackpotAmount, tierBoost);
    const isJackpot = jackpotAmount != null;
    const winTier = win > 0 ? classifySlotWin(win, bet, isJackpot) : null;

    slotsState.spinning = true;
    slotsState.lastWin = false;
    slotsState.winTier = null;
    slotsState.lastWinAmount = 0;
    slotsState.reelsStopped = 0;
    slotsState.landedReel = -1;
    slotsState.displayReels = [...finalReels];
    slotsState.pendingFinalReels = finalReels;
    slotsState.pendingOutcome = { win, reason, jackpotAmount, bet, winTier, isJackpot };
    slotsState.lastMessage = null;

    const cycleSymbols = () => {
      if (!slotsState.spinning || slotsState.reelsStopped >= 3) return;
      const display = [...slotsState.pendingFinalReels];
      for (let i = slotsState.reelsStopped; i < 3; i += 1) {
        display[i] = randomSymbol(machine);
      }
      slotsState.displayReels = display;
      render();
    };
    slotsState.spinIntervalId = window.setInterval(cycleSymbols, 90);
    slotsSpinTimers.push(slotsState.spinIntervalId);
    cycleSymbols();

    const stopReel = (index) => {
      slotsState.landedReel = index;
      slotsState.reelsStopped = index + 1;
      slotsState.displayReels = slotsState.pendingFinalReels;
      render();
      scheduleSlotsSpin(() => {
        if (slotsState.landedReel === index) slotsState.landedReel = -1;
      }, 520);
    };

    scheduleSlotsSpin(() => stopReel(0), timing.slotsReel1);
    scheduleSlotsSpin(() => stopReel(1), timing.slotsReel2);
    scheduleSlotsSpin(() => stopReel(2), timing.slotsReel3);

    scheduleSlotsSpin(() => {
      clearSlotsSpinTimers();
      const outcome = slotsState.pendingOutcome;
      if (!outcome) return;

      slotsState.spinning = false;
      slotsState.reelsStopped = 3;
      slotsState.landedReel = -1;
      slotsState.lastReels = slotsState.pendingFinalReels;
      slotsState.displayReels = slotsState.pendingFinalReels;
      slotsState.pendingFinalReels = null;
      slotsState.pendingOutcome = null;
      slotsState.spins += 1;
      slotsState.lastWin = outcome.win > 0;
      slotsState.winTier = outcome.winTier;
      slotsState.lastWinAmount = outcome.win;

      if (outcome.win > 0) {
        session.wallet.credit(outcome.win, "slots", outcome.reason);
        slotsState.sessionNet += outcome.win - outcome.bet;
        slotsState.lastMessage = {
          text: outcome.reason,
          amount: outcome.win,
          type: outcome.isJackpot ? "jackpot-win" : "success",
          winTier: outcome.winTier,
        };
      } else {
        slotsState.sessionNet -= outcome.bet;
        slotsState.lastMessage = { text: "No win this spin.", type: "dim" };
      }
      persist();
      render();
    }, timing.slotsReel3 + 380);
  }

  return slotCabinet(machine, {
    celebrate: slotsState.lastWin ? slotsState.winTier : null,
    screenChildren: [
      tier ? el("p", { className: "dim", textContent: `Stake tier: ${tier.name} — ${getTierPayoutBoost(tier?.id).toFixed(0)}× payout multiplier` }) : null,
      jackpotEl,
      maxBetNote,
      slotPaytablePanel(machine, getTierPayoutBoost(tier?.id)),
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
            clearSlotsSpinTimers();
            recordActivityResult("slots", slotsState.sessionNet, slotsState.spins);
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
  const openCount = sportsbook.getOpenPositionCount();
  if (session.wallet.balance < act.minBet && openCount === 0) {
    return el("div", { className: "panel" }, [
      banner("Sports Book"),
      el("p", { className: "error", textContent: `You need at least ${act.minBet} chips to wager.` }),
      el("div", { className: "action-bar" }, [
        el("button", { className: "btn", textContent: "Back", onclick: () => { popView(); render(); } }),
      ]),
    ]);
  }
  recordActivityVisit("sportsbook");
  persist();

  if (!sportsbook.events.length) {
    sportsbook.refreshBoardAsync(false).then(() => render());
    return el("div", { className: "panel" }, [
      banner("Sports Book — Mandalay Sports Book"),
      chipLine(),
      el("p", { className: "dim", textContent: "Loading today's board…" }),
      el("div", { className: "action-bar" }, [
        el("button", { className: "btn", textContent: "Back", onclick: () => { popView(); render(); } }),
      ]),
    ]);
  }

  sportsbook.predictions.syncMarkets(sportsbook.events);

  const tier = currentStakeTier;
  const wagerStakes = tier
    ? effectiveTableStakes(tier, session.wallet.balance, act.minBet)
    : { minBet: act.minBet, maxBet: session.wallet.balance };

  const tabSports = el("button", {
    className: `sportsbook-tab${sportsbook.activeTab === "sports" ? " active" : ""}`,
    textContent: "Sports board",
    onclick: () => { sportsbook.activeTab = "sports"; render(); },
  });
  const tabPredictions = el("button", {
    className: `sportsbook-tab${sportsbook.activeTab === "predictions" ? " active" : ""}`,
    textContent: "Prediction markets",
    onclick: () => { sportsbook.activeTab = "predictions"; render(); },
  });

  const board = sportsbook.activeTab === "sports"
    ? el("div", {}, sportsbook.events.map((event, i) =>
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
    : el("div", {}, sportsbook.predictions.markets.map((market, i) =>
      el("div", { className: "event-card prediction-card" }, [
        el("div", { className: "sport", textContent: categoryLabel(market.category) }),
        el("div", { innerHTML: `<strong>${i + 1}) ${market.question}</strong>` }),
        el("div", { className: "dim", textContent: `YES ${market.yesPrice}¢ · NO ${market.noPrice}¢ · Vol ${market.volume.toLocaleString()}` }),
      ])
    ));

  const pendingEl = el("div", { className: "pending-tickets" });
  if (sportsbook.pending.length || sportsbook.predictions.positions.length) {
    pendingEl.appendChild(el("p", { className: "subtitle", textContent: "Open positions:" }));
    for (const slip of sportsbook.pending) {
      pendingEl.appendChild(el("div", {
        className: "ticket",
        textContent: `${slip.amount.toLocaleString()} chips on ${slip.pick} (${slip.betType}, ${fmtOdds(slip.odds)}) — ${slip.event.label}`,
      }));
    }
    for (const pos of sportsbook.predictions.positions) {
      pendingEl.appendChild(el("div", {
        className: "ticket",
        textContent: `${pos.amount.toLocaleString()} chips ${pos.side.toUpperCase()} @ ${pos.priceCents}¢ — ${pos.question}`,
      }));
    }
  }

  const menuItems = sportsbook.activeTab === "sports"
    ? ["Place sports wager", "Settle all open positions", "Refresh lines & markets"]
    : ["Place prediction contract", "Refresh market prices", "Settle all open positions"];

  return el("div", { className: "panel" }, [
    banner("Sports Book — Mandalay Sports Book"),
    chipLine(),
    tier ? el("p", { className: "dim", textContent: `${tier.name}: ${formatStakeRange(wagerStakes.minBet, wagerStakes.maxBet, { noCap: tier.maxBet == null })}` }) : null,
    el("div", { className: "sportsbook-tabs" }, [tabSports, tabPredictions]),
    el("p", { className: "subtitle", textContent: sportsbook.activeTab === "sports" ? "Today's Board" : "Prediction Markets" }),
    board,
    pendingEl,
    menu(menuItems, "Sports Book:", (choice) => {
      if (choice === 0) { goBack(); return; }
      if (sportsbook.activeTab === "sports") {
        if (choice === 1) pushView("sportsbook-wager");
        else if (choice === 2) pushView("sportsbook-settle");
        else if (choice === 3) { sportsbook.refreshBoard(true); persist(); render(); }
      } else {
        if (choice === 1) pushView("sportsbook-prediction");
        else if (choice === 2) { sportsbook.predictions.refreshPrices(); persist(); render(); }
        else if (choice === 3) pushView("sportsbook-settle");
      }
    }),
  ]);
}

function renderSportsbookWager() {
  if (!sportsbook.events.length) {
    return el("div", { className: "panel" }, [
      banner("Place Wager"),
      el("p", { className: "error", textContent: "No events on the board. Go back and refresh lines." }),
      el("div", { className: "action-bar" }, [
        el("button", { className: "btn", textContent: "Back", onclick: () => { popView(); render(); } }),
      ]),
    ]);
  }
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
    const event = sportsbook.events[parseInt(eventSelect.value, 10)];
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
          const event = sportsbook.events[parseInt(eventSelect.value, 10)];
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
          if (!session.wallet.debit(amount, "sportsbook", `${betType} on ${pick}`)) {
            alert("Insufficient chips."); return;
          }
          sportsbook.addTicket({ event, betType, pick, amount, odds, propId, propLabel });
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
  if (!sportsbook.predictions.markets.length) {
    sportsbook.predictions.syncMarkets(sportsbook.events);
  }
  const act = ACTIVITIES.sportsbook;
  const tier = currentStakeTier;
  const wagerStakes = tier
    ? effectiveTableStakes(tier, session.wallet.balance, act.minBet)
    : { minBet: act.minBet, maxBet: session.wallet.balance };

  const marketSelect = el("select", {}, sportsbook.predictions.markets.map((m, i) =>
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
    const market = sportsbook.predictions.markets[parseInt(marketSelect.value, 10)];
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
          const market = sportsbook.predictions.markets[parseInt(marketSelect.value, 10)];
          const side = sideSelect.value;
          const amount = parseInt(amountInput.value, 10);
          const priceCents = side === "yes" ? market.yesPrice : market.noPrice;
          if (amount < wagerStakes.minBet) { alert(`Minimum stake is ${wagerStakes.minBet} chips.`); return; }
          if (amount > wagerStakes.maxBet) { alert(`Maximum stake is ${wagerStakes.maxBet} chips.`); return; }
          if (!session.wallet.debit(amount, "sportsbook", `Prediction ${side} @ ${priceCents}¢`)) {
            alert("Insufficient chips."); return;
          }
          sportsbook.predictions.addPosition({
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

  if (!sportsbook.pending.length && !sportsbook.predictions.positions.length) {
    log.appendChild(el("p", { className: "error", textContent: "No open positions. Place a wager first." }));
  } else {
    if (sportsbook.pending.length) {
      const sportsResult = sportsbook.settleAll();
      log.appendChild(el("p", { className: "subtitle", textContent: "SPORTS RESULTS" }));
      for (const r of sportsResult.results) {
        log.appendChild(el("div", { className: "line", innerHTML: `<strong>${r.event.label}:</strong> ${formatEventScore(r.event)}` }));
        if (r.won) {
          session.wallet.credit(r.payout, "sportsbook", r.reason);
          sessionNet += r.payout - r.slip.amount;
          log.appendChild(el("div", { className: "line success", textContent: `  WIN: ${r.reason} (+${(r.payout - r.slip.amount).toLocaleString()} chips)` }));
        } else {
          sessionNet -= r.slip.amount;
          log.appendChild(el("div", { className: "line error", textContent: `  LOSE: ${r.reason} (-${r.slip.amount.toLocaleString()} chips)` }));
        }
      }
      count += sportsResult.count;
    }

    if (sportsbook.predictions.positions.length) {
      const predResult = sportsbook.settlePredictions();
      log.appendChild(el("p", { className: "subtitle", textContent: "PREDICTION MARKETS" }));
      for (const r of predResult.results) {
        log.appendChild(el("div", { className: "line", innerHTML: `<strong>${r.market.question}</strong> → ${r.resolution.toUpperCase()}` }));
        if (r.won) {
          session.wallet.credit(r.payout, "sportsbook", r.reason);
          sessionNet += r.payout - r.position.amount;
          log.appendChild(el("div", { className: "line success", textContent: `  WIN: ${r.reason}` }));
        } else {
          sessionNet -= r.position.amount;
          log.appendChild(el("div", { className: "line error", textContent: `  LOSE: ${r.reason} (-${r.position.amount.toLocaleString()} chips)` }));
        }
      }
      count += predResult.count;
    }

    recordActivityResult("sportsbook", sessionNet, count);
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

function renderHighLimitSalon() {
  const gate = canEnterHighLimitSalon(session, currentStakeTier);
  if (!gate.ok) {
    return el("div", { className: "panel" }, [
      banner("High Limit Salon"),
      chipLine(),
      el("p", { className: "error", textContent: gate.reason }),
      el("p", { className: "dim", textContent: `Requires ${HIGH_LIMIT_SALON_CHIP_MIN.toLocaleString()}+ chips and a ${STAKE_TIERS.high_limit.name} stake tier (pick tier before entering table games).` }),
      el("div", { className: "action-bar" }, [
        el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
      ]),
    ]);
  }

  recordActivityVisit("high_limit_salon");

  return el("div", { className: "panel amenities-panel" }, [
    banner("High Limit Salon"),
    chipLine(),
    el("p", { className: "dim", textContent: "Velvet ropes, private felt, and stakes that make the main floor nervous. Salon limits apply." }),
    el("p", { className: "subtitle", textContent: `${currentStakeTier?.name ?? "High Limit"} · ${session.wallet.balance.toLocaleString()} chips on the floor` }),
    menu(
      ["Blackjack (salon limits)", "Texas Hold'em", "Roulette", "High-limit slots"],
      "Salon tables:",
      (choice) => {
        if (choice === 0) { goBack(); return; }
        if (choice === 1) pushView("stake-tier", { activityId: "blackjack", nextView: "blackjack-menu" });
        else if (choice === 2) pushView("stake-tier", { activityId: "holdem", nextView: "holdem-menu" });
        else if (choice === 3) pushView("stake-tier", { activityId: "roulette", nextView: "roulette" });
        else if (choice === 4) pushView("stake-tier", { activityId: "slots", nextView: "slots-menu" });
      },
    ),
  ]);
}

function renderFoundationRoom() {
  const gate = canEnterFoundationRoom(session);
  if (!gate.ok) {
    return el("div", { className: "panel" }, [
      banner("Foundation Room"),
      chipLine(),
      el("p", { className: "error", textContent: gate.reason }),
      el("p", { className: "dim", textContent: "Noir tier+, host rapport or bar atmosphere, and the Foundation Room phone line from your suite." }),
      el("div", { className: "action-bar" }, [
        el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
      ]),
    ]);
  }

  recordActivityVisit("foundation_room");

  return el("div", { className: "panel amenities-panel foundation-room" }, [
    banner("Foundation Room — Noir Lounge"),
    chipLine(),
    el("p", { className: "dim", textContent: "Darkness has a cover charge. Whales murmur. Alexandra's comp list flickers on a tablet nobody admits exists." }),
    el("p", { className: "subtitle", textContent: `${gate.rewardsTier.label} member · Host rapport ${gate.hostRapport}/100` }),
    menu(
      ["Whisper with Alexandra (host line)", "Order contraband edible (room phone)", "Return to casino floor"],
      "Noir lounge:",
      (choice) => {
        if (choice === 0) { goBack(); return; }
        if (choice === 1) {
          showStatus("Alexandra texts back: 'Velvet rope noted. Comp queue: dramatic pause.'");
        } else if (choice === 2) {
          showStatus("Foundation Room line rings — edible comp queued for suite delivery narrative.");
        } else if (choice === 3) {
          pushView("casino-floor");
        }
      },
    ),
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
  recordActivityVisit("blackjack");
  persist();
  const tier = currentStakeTier;
  const tableStakes = tier
    ? effectiveTableStakes(tier, session.wallet.balance, act.minBet)
    : { minBet: act.minBet, maxBet: session.wallet.balance };
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
  recordActivityVisit("holdem");
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
  if (!holdemState) return el("div", { className: "panel" }, [
    el("p", { className: "error", textContent: "No active Hold'em table." }),
    el("div", { className: "action-bar" }, [
      el("button", { className: "btn", textContent: "Back to Hold'em", onclick: () => { popView(); render(); } }),
    ]),
  ]);
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
    recordActivityResult("holdem", holdemState.sessionNet, holdemState.hands);
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
  recordActivityVisit("roulette");
  persist();

  const tier = rouletteState.tier ?? currentStakeTier;
  if (tier) applyTierSpeedCss(tier.id);
  const spinMs = tier ? getActivityTiming(tier.id).rouletteSpin : 1200;
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
    }, spinMs);
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
          recordActivityResult("roulette", rouletteState.sessionNet, rouletteState.spins);
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

function renderHorseStables() {
  recordActivityVisit("horse_stables");
  return el("div", { className: "panel racing-pavilion" }, [
    banner("Mandalay Stables"),
    chipLine(),
    el("p", { className: "horse-stables-intro", textContent: "Behind the Racing Pavilion, past the clockers' stand, eight residents call the Mandalay Stables home. Step through the barn doors to meet them in the pasture or visit them in their stalls." }),
    menu(
      ["Visit the Pasture", "Visit the Stalls"],
      "Stables:",
      (choice) => {
        if (choice === 0) { goBack(); return; }
        if (choice === 1) pushView("horse-stables-pasture");
        if (choice === 2) pushView("horse-stables-stalls");
      },
      { showCasinoBanner: false },
    ),
  ]);
}

function renderHorseStablesPasture() {
  const cards = STABLE_HORSE_DATA.map((horse) =>
    el("div", { className: "horse-pasture-card" }, [
      createHorseSpriteCanvas(horse.id, {
        size: 128,
        animate: true,
        animation: "walk",
        direction: "front",
        withJockey: false,
      }),
      el("div", { className: "horse-pasture-name", textContent: horse.name }),
      el("div", { className: "horse-pasture-coat", textContent: getHorseSprite(horse.id).label }),
    ])
  );

  return el("div", { className: "panel racing-pavilion" }, [
    banner("The Pasture"),
    el("p", { className: "horse-stables-intro", textContent: "Morning light across the south field. The horses roam free between training sessions — no riders, no timers, just open turf." }),
    el("p", { className: "horse-stables-label", textContent: "Current Residents" }),
    el("div", { className: "horse-pasture" }, cards),
    el("div", { className: "action-bar" }, [
      el("button", { className: "btn", textContent: "Back to Stables", onclick: () => goBack() }),
    ]),
  ]);
}

function renderHorseStablesStalls() {
  const cards = STABLE_HORSE_DATA.map((horse) => {
    const spriteMeta = getHorseSprite(horse.id);
    return el("div", { className: "horse-stall-card" }, [
      el("div", { className: "horse-stall-header" }, [
        el("span", { className: "horse-stall-num", textContent: `STALL ${horse.stall}` }),
        el("span", { className: "horse-stall-badge" }),
      ]),
      createHorseSpriteCanvas(horse.id, {
        size: 80,
        animate: true,
        animation: "walk",
        direction: "front",
        withJockey: false,
      }),
      el("div", { className: "horse-stall-name", textContent: horse.name }),
      el("div", { className: "horse-stall-coat", textContent: spriteMeta.label }),
      el("div", { className: "horse-stall-note", textContent: horse.note }),
    ]);
  });

  return el("div", { className: "panel racing-pavilion" }, [
    banner("The Stalls"),
    el("p", { className: "horse-stables-intro", textContent: "Eight stalls line the east barn, each swept and bedded fresh. The green indicator means your horse is in — settled, fed, and ready for tomorrow." }),
    el("p", { className: "horse-stables-label", textContent: "Barn — East Wing" }),
    el("div", { className: "horse-stalls-grid" }, cards),
    el("div", { className: "action-bar" }, [
      el("button", { className: "btn", textContent: "Back to Stables", onclick: () => goBack() }),
    ]),
  ]);
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
  recordActivityVisit("horse_racing");
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
    el("p", { className: "racing-paddock-label", textContent: "Race Track — Post Parade" }),
    createRacePreview(card),
    el("p", { className: "racing-paddock-label", textContent: "Paddock" }),
    renderHorsePaddock(card.horses),
    pendingEl,
    menu(
      ["Place a wager", "Run race & settle", "New race card", "Manage horse names", "Visit the Stables"],
      "Racing pavilion:",
      (choice) => {
        if (choice === 0) { goBack(); return; }
        if (choice === 1) pushView("horse-racing-wager");
        else if (choice === 2) pushView("horse-racing-settle");
        else if (choice === 3) { horseRacingState.card = generateRace(session); render(); }
        else if (choice === 4) pushView("horse-racing-names");
        else if (choice === 5) pushView("horse-stables");
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
  if (!horseRacingState.card) horseRacingState.card = generateRace(session);
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
  const body = el("div", { className: "race-settle-body" });

  if (!horseRacingState.pending.length) {
    body.appendChild(el("p", { className: "error", textContent: "No open tickets." }));
  } else {
    if (!horseRacingState.card) horseRacingState.card = generateRace(session);
    const card = horseRacingState.card;
    const results = simulateRace(card);
    const slips = [...horseRacingState.pending];
    const resultsPanel = el("div", { className: "race-results-panel is-hidden" });
    const log = el("div", { className: "log-area" });

    const track = createRaceTrackView({
      card,
      results,
      slips,
      raceNumber: horseRacingState.races + 1,
      autoRun: true,
      onComplete: () => {
        log.appendChild(el("p", { className: "subtitle", textContent: "FINISH ORDER" }));
        const finishLine = el("div", { className: "racing-finish-line" });
        results.forEach((num, i) => {
          const h = card.horses.find((x) => x.number === num);
          const silks = getJockeySilks(num);
          finishLine.appendChild(el("div", { className: "racing-finish-entry" }, [
            el("span", { className: "racing-finish-pos", textContent: `${i + 1}.` }),
            createHorseSpriteCanvas(h.spriteId, {
              size: 64,
              frame: i % 6,
              animation: "gallop",
              direction: "right",
              horseNumber: num,
              withJockey: true,
            }),
            el("span", { className: "racing-finish-name", textContent: `#${num} ${h.name}` }),
            el("span", { className: "racing-finish-silks dim", textContent: silks.name }),
          ]));
        });
        log.appendChild(finishLine);
        results.forEach((num, i) => {
          const h = card.horses.find((x) => x.number === num);
          log.appendChild(el("div", { className: "line", textContent: `${i + 1}. #${num} ${h.name}` }));
        });

        for (const slip of slips) {
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
        recordActivityResult("horse_racing", horseRacingState.sessionNet, horseRacingState.races);
        persist();
        resultsPanel.classList.remove("is-hidden");
      },
    });

    body.appendChild(track);
    body.appendChild(resultsPanel);
    resultsPanel.appendChild(log);
  }

  return el("div", { className: "panel racing-pavilion" }, [
    banner("Race Results"),
    chipLine(),
    body,
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

// ── Dressage Arena ────────────────────────────────────────────────────────────

function renderDressage() {
  const act = ACTIVITIES.dressage;
  if (session.wallet.balance < act.minBet && !dressageState.pending.length) {
    return el("div", { className: "panel" }, [
      banner("Dressage Arena"),
      el("p", { className: "error", textContent: `You need at least ${act.minBet} chips to wager.` }),
      el("div", { className: "action-bar" }, [
        el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
      ]),
    ]);
  }
  recordActivityVisit("dressage");
  if (!dressageState.card) dressageState.card = generateDressage();
  persist();
  const tier = dressageState.tier ?? currentStakeTier;
  const wagerStakes = tier
    ? effectiveTableStakes(tier, session.wallet.balance, act.minBet)
    : { minBet: act.minBet, maxBet: session.wallet.balance };

  const card = dressageState.card;

  const pendingEl = el("div", { className: "pending-tickets" });
  if (dressageState.pending.length) {
    pendingEl.appendChild(el("p", { className: "subtitle", textContent: "Open tickets:" }));
    for (const slip of dressageState.pending) {
      const e = card.entries.find((x) => x.number === slip.entry);
      pendingEl.appendChild(el("div", {
        className: "ticket",
        textContent: `${slip.amount} chips on #${slip.entry} ${e?.rider ?? ""} (${slip.betType})`,
      }));
    }
  }

  const entriesEl = el("div", { className: "equestrian-entries" });
  for (const e of card.entries) {
    entriesEl.appendChild(el("div", { className: "equestrian-entry-row" }, [
      el("span", { className: "eq-num", textContent: `#${e.number}` }),
      el("span", { className: "eq-names", textContent: `${e.rider} / ${e.horse}` }),
      el("span", { className: "eq-scores dim", textContent: `Tech ${e.tech.toFixed(1)}  Art ${e.art.toFixed(1)}` }),
      el("span", { className: "eq-odds", textContent: fmtOddsEq(e.odds) }),
    ]));
  }

  return el("div", { className: "panel equestrian-arena" }, [
    banner("Dressage Arena"),
    chipLine(),
    tier ? el("p", { className: "dim", textContent: `${tier.name}: ${formatStakeRange(wagerStakes.minBet, wagerStakes.maxBet, { noCap: tier.maxBet == null })}` }) : null,
    el("p", { className: "subtitle", textContent: `${card.level} — ${card.arena}` }),
    entriesEl,
    pendingEl,
    menu(
      ["Place a wager", "Run test & settle", "New entry list"],
      "Dressage arena:",
      (choice) => {
        if (choice === 0) { goBack(); return; }
        if (choice === 1) pushView("dressage-wager");
        else if (choice === 2) pushView("dressage-settle");
        else if (choice === 3) { dressageState.card = generateDressage(); render(); }
      },
      { showCasinoBanner: false },
    ),
  ]);
}

function renderDressageWager() {
  const act = ACTIVITIES.dressage;
  const tier = dressageState.tier ?? currentStakeTier;
  const wagerStakes = tier
    ? effectiveTableStakes(tier, session.wallet.balance, act.minBet)
    : { minBet: act.minBet, maxBet: session.wallet.balance };
  if (!dressageState.card) dressageState.card = generateDressage();
  const card = dressageState.card;

  const entrySelect = el("select", {}, card.entries.map((e) =>
    el("option", { value: String(e.number), textContent: `#${e.number} ${e.rider} / ${e.horse} (${fmtOddsEq(e.odds)})` })
  ));
  const betTypeSelect = el("select", {}, [
    el("option", { value: "win", textContent: "Win (1st place)" }),
    el("option", { value: "place", textContent: "Place (top 2)" }),
    el("option", { value: "show", textContent: "Show (top 3)" }),
  ]);
  const amountInput = el("input", {
    type: "number", min: String(wagerStakes.minBet), max: String(wagerStakes.maxBet), value: String(wagerStakes.minBet),
  });

  return el("div", { className: "panel equestrian-arena" }, [
    banner("Place Wager — Dressage"),
    chipLine(),
    el("div", { className: "form-row" }, [el("label", { textContent: "Rider / Horse" }), entrySelect]),
    el("div", { className: "form-row" }, [el("label", { textContent: "Bet type" }), betTypeSelect]),
    el("div", { className: "form-row" }, [el("label", { textContent: "Amount" }), amountInput]),
    el("div", { className: "action-bar" }, [
      el("button", {
        className: "btn primary",
        textContent: "Place ticket",
        onclick: () => {
          const entry = parseInt(entrySelect.value, 10);
          const betType = betTypeSelect.value;
          const amount = parseInt(amountInput.value, 10);
          if (amount < wagerStakes.minBet) { alert(`Minimum wager is ${wagerStakes.minBet} chips.`); return; }
          if (amount > wagerStakes.maxBet) { alert(`Maximum wager is ${wagerStakes.maxBet} chips.`); return; }
          const e = card.entries.find((x) => x.number === entry);
          if (!session.wallet.debit(amount, "dressage", `${betType} on #${entry}`)) {
            alert("Insufficient chips."); return;
          }
          dressageState.pending.push({ entry, rider: e.rider, odds: e.odds, betType, amount });
          persist();
          showStatus(`Ticket placed: ${amount} chips on #${entry} ${e.rider} (${betType}).`);
          goBack();
        },
      }),
      el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
    ]),
  ]);
}

function renderDressageSettle() {
  const body = el("div", { className: "eq-settle-body" });

  if (!dressageState.pending.length) {
    body.appendChild(el("p", { className: "error", textContent: "No open tickets." }));
  } else {
    if (!dressageState.card) dressageState.card = generateDressage();
    const card = dressageState.card;
    const results = simulateDressage(card);
    const log = el("div", { className: "log-area" });

    log.appendChild(el("p", { className: "subtitle", textContent: "FINAL STANDINGS" }));
    results.forEach((num, i) => {
      const e = card.entries.find((x) => x.number === num);
      log.appendChild(el("div", { className: "line", textContent: `${i + 1}. #${num} ${e.rider} / ${e.horse}` }));
    });

    const slips = [...dressageState.pending];
    for (const slip of slips) {
      const r = settleDressageTicket(slip, results);
      if (r.won) {
        session.wallet.credit(r.payout, "dressage", r.reason);
        dressageState.sessionNet += r.net;
        log.appendChild(el("div", { className: "line success", textContent: `WIN: ${r.reason} (${signedChips(r.net)})` }));
      } else {
        dressageState.sessionNet += r.net;
        log.appendChild(el("div", { className: "line error", textContent: `LOSE: ${r.reason} (${signedChips(r.net)})` }));
      }
    }
    dressageState.events += 1;
    dressageState.pending = [];
    recordActivityResult("dressage", dressageState.sessionNet, dressageState.events);
    persist();
    body.appendChild(log);
  }

  return el("div", { className: "panel equestrian-arena" }, [
    banner("Dressage Results"),
    chipLine(),
    body,
    el("div", { className: "action-bar" }, [
      el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
    ]),
  ]);
}

// ── Show Jumping ──────────────────────────────────────────────────────────────

function renderJumper() {
  const act = ACTIVITIES.jumper;
  if (session.wallet.balance < act.minBet && !jumperState.pending.length) {
    return el("div", { className: "panel" }, [
      banner("Show Jumping"),
      el("p", { className: "error", textContent: `You need at least ${act.minBet} chips to wager.` }),
      el("div", { className: "action-bar" }, [
        el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
      ]),
    ]);
  }
  recordActivityVisit("jumper");
  if (!jumperState.card) jumperState.card = generateJumper();
  persist();
  const tier = jumperState.tier ?? currentStakeTier;
  const wagerStakes = tier
    ? effectiveTableStakes(tier, session.wallet.balance, act.minBet)
    : { minBet: act.minBet, maxBet: session.wallet.balance };

  const card = jumperState.card;

  const pendingEl = el("div", { className: "pending-tickets" });
  if (jumperState.pending.length) {
    pendingEl.appendChild(el("p", { className: "subtitle", textContent: "Open tickets:" }));
    for (const slip of jumperState.pending) {
      const e = card.entries.find((x) => x.number === slip.entry);
      pendingEl.appendChild(el("div", {
        className: "ticket",
        textContent: `${slip.amount} chips on #${slip.entry} ${e?.rider ?? ""} (${slip.betType})`,
      }));
    }
  }

  const entriesEl = el("div", { className: "equestrian-entries" });
  for (const e of card.entries) {
    entriesEl.appendChild(el("div", { className: "equestrian-entry-row" }, [
      el("span", { className: "eq-num", textContent: `#${e.number}` }),
      el("span", { className: "eq-names", textContent: `${e.rider} / ${e.horse}` }),
      el("span", { className: "eq-odds", textContent: fmtOddsEq(e.odds) }),
    ]));
  }

  return el("div", { className: "panel equestrian-arena" }, [
    banner("Show Jumping"),
    chipLine(),
    tier ? el("p", { className: "dim", textContent: `${tier.name}: ${formatStakeRange(wagerStakes.minBet, wagerStakes.maxBet, { noCap: tier.maxBet == null })}` }) : null,
    el("p", { className: "subtitle", textContent: `${card.course} — ${card.fenceCount} fences, ${card.entries.length} competitors` }),
    el("p", { className: "dim", textContent: "Bet types: Win / Place / Show (finish position) or Clear Round (0 faults, pays 3×)." }),
    entriesEl,
    pendingEl,
    menu(
      ["Place a wager", "Run course & settle", "New draw"],
      "Show jumping:",
      (choice) => {
        if (choice === 0) { goBack(); return; }
        if (choice === 1) pushView("jumper-wager");
        else if (choice === 2) pushView("jumper-settle");
        else if (choice === 3) { jumperState.card = generateJumper(); render(); }
      },
      { showCasinoBanner: false },
    ),
  ]);
}

function renderJumperWager() {
  const act = ACTIVITIES.jumper;
  const tier = jumperState.tier ?? currentStakeTier;
  const wagerStakes = tier
    ? effectiveTableStakes(tier, session.wallet.balance, act.minBet)
    : { minBet: act.minBet, maxBet: session.wallet.balance };
  if (!jumperState.card) jumperState.card = generateJumper();
  const card = jumperState.card;

  const entrySelect = el("select", {}, card.entries.map((e) =>
    el("option", { value: String(e.number), textContent: `#${e.number} ${e.rider} / ${e.horse} (${fmtOddsEq(e.odds)})` })
  ));
  const betTypeSelect = el("select", {}, [
    el("option", { value: "win", textContent: "Win (1st place)" }),
    el("option", { value: "place", textContent: "Place (top 2)" }),
    el("option", { value: "show", textContent: "Show (top 3)" }),
    el("option", { value: "clear", textContent: "Clear round (0 faults — pays 3×)" }),
  ]);
  const amountInput = el("input", {
    type: "number", min: String(wagerStakes.minBet), max: String(wagerStakes.maxBet), value: String(wagerStakes.minBet),
  });

  return el("div", { className: "panel equestrian-arena" }, [
    banner("Place Wager — Show Jumping"),
    chipLine(),
    el("div", { className: "form-row" }, [el("label", { textContent: "Rider / Horse" }), entrySelect]),
    el("div", { className: "form-row" }, [el("label", { textContent: "Bet type" }), betTypeSelect]),
    el("div", { className: "form-row" }, [el("label", { textContent: "Amount" }), amountInput]),
    el("div", { className: "action-bar" }, [
      el("button", {
        className: "btn primary",
        textContent: "Place ticket",
        onclick: () => {
          const entry = parseInt(entrySelect.value, 10);
          const betType = betTypeSelect.value;
          const amount = parseInt(amountInput.value, 10);
          if (amount < wagerStakes.minBet) { alert(`Minimum wager is ${wagerStakes.minBet} chips.`); return; }
          if (amount > wagerStakes.maxBet) { alert(`Maximum wager is ${wagerStakes.maxBet} chips.`); return; }
          const e = card.entries.find((x) => x.number === entry);
          if (!session.wallet.debit(amount, "jumper", `${betType} on #${entry}`)) {
            alert("Insufficient chips."); return;
          }
          jumperState.pending.push({ entry, rider: e.rider, odds: e.odds, betType, amount });
          persist();
          showStatus(`Ticket placed: ${amount} chips on #${entry} ${e.rider} (${betType}).`);
          goBack();
        },
      }),
      el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
    ]),
  ]);
}

function renderJumperSettle() {
  const body = el("div", { className: "eq-settle-body" });

  if (!jumperState.pending.length) {
    body.appendChild(el("p", { className: "error", textContent: "No open tickets." }));
  } else {
    if (!jumperState.card) jumperState.card = generateJumper();
    const card = jumperState.card;
    const results = simulateJumper(card);
    const log = el("div", { className: "log-area" });

    log.appendChild(el("p", { className: "subtitle", textContent: "FINAL STANDINGS" }));
    results.forEach((r, i) => {
      const e = card.entries.find((x) => x.number === r.entryNumber);
      const faultStr = r.faults === 0 ? "Clear" : `${r.faults} faults`;
      log.appendChild(el("div", { className: "line", textContent: `${i + 1}. #${r.entryNumber} ${e.rider} / ${e.horse}  ${faultStr}  ${r.timeSeconds}s` }));
    });

    const slips = [...jumperState.pending];
    for (const slip of slips) {
      const r = settleJumperTicket(slip, results);
      if (r.won) {
        session.wallet.credit(r.payout, "jumper", r.reason);
        jumperState.sessionNet += r.net;
        log.appendChild(el("div", { className: "line success", textContent: `WIN: ${r.reason} (${signedChips(r.net)})` }));
      } else {
        jumperState.sessionNet += r.net;
        log.appendChild(el("div", { className: "line error", textContent: `LOSE: ${r.reason} (${signedChips(r.net)})` }));
      }
    }
    jumperState.events += 1;
    jumperState.pending = [];
    recordActivityResult("jumper", jumperState.sessionNet, jumperState.events);
    persist();
    body.appendChild(log);
  }

  return el("div", { className: "panel equestrian-arena" }, [
    banner("Course Results"),
    chipLine(),
    body,
    el("div", { className: "action-bar" }, [
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
  if (!blackjackGame) return el("div", { className: "panel" }, [
    el("p", { className: "error", textContent: "No active blackjack game." }),
    el("div", { className: "action-bar" }, [
      el("button", { className: "btn", textContent: "Back to Blackjack", onclick: () => { popView(); render(); } }),
    ]),
  ]);

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
    recordActivityResult("blackjack", blackjackSessionNet);
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

const poolRenderers = buildPoolRenderers({
  get session() { return session; },
  pushView,
  goBack,
  persist,
  render,
  el,
  banner,
  chipLine,
});

const amenitiesRenderers = buildAmenitiesRenderers({
  get session() { return session; },
  pushView,
  goBack,
  persist,
  render,
  el,
  banner,
  chipLine,
  statusBanner,
  showStatus,
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
  "bank-account": renderBankAccount,
  "bank-deposit": renderBankDeposit,
  "bank-expense": renderBankExpense,
  "bank-rename": renderBankRename,
  "bank-ledger": renderBankLedger,
  "staff-manifest": renderStaffManifest,
  "staff-manifest-edit": renderStaffManifestEdit,
  stats: renderStats,
  leave: renderLeave,
  "stake-tier": renderStakeTier,
  "slots-menu": renderSlotsMenu,
  "slots-play": renderSlotsPlay,
  sportsbook: renderSportsbook,
  "sportsbook-wager": renderSportsbookWager,
  "sportsbook-prediction": renderSportsbookPrediction,
  "sportsbook-settle": renderSportsbookSettle,
  "high-limit-salon": renderHighLimitSalon,
  "foundation-room": renderFoundationRoom,
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
  "horse-stables": renderHorseStables,
  "horse-stables-pasture": renderHorseStablesPasture,
  "horse-stables-stalls": renderHorseStablesStalls,
  dressage: renderDressage,
  "dressage-wager": renderDressageWager,
  "dressage-settle": renderDressageSettle,
  jumper: renderJumper,
  "jumper-wager": renderJumperWager,
  "jumper-settle": renderJumperSettle,
  ...hotelRenderers,
  ...poolRenderers,
  ...amenitiesRenderers,
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
  if (params.get("guest") === "1") {
    enterCasino(createGuestSession({
      playerName: params.get("name") || "Guest",
      chips: Math.max(0, parseInt(params.get("chips") || "1000", 10)),
    }));
    const deepView = params.get("view");
    if (deepView && RENDERERS[deepView]) pushView(deepView);
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
        enterCasino(loaded);
        const deepView = params.get("view");
        if (deepView && RENDERERS[deepView]) pushView(deepView);
        return true;
      }
      pushView("save-create", { slotId });
      return true;
    }
  }
  return false;
}

if (!navigator.onLine) {
  window.addEventListener("online", () => render(), { once: true });
}

window.addEventListener("beforeunload", () => {
  if (session.slotId != null) persist();
});

if (!applyLaunchParams()) {
  loadBundledHorseNames().finally(() => render());
} else {
  loadBundledHorseNames();
}

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
