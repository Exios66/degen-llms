// Shared UI shell for the web terminal and the pixel RPG's hosted screens.
// Extracted verbatim from app.js so both surfaces build DOM the same way.
import { CASINO_NAME, fmtChips } from "../core.js";
import { ensureBank } from "../bank-account.js";
import { getSessionDealer, pickQuip } from "../dealers.js";
import { createPlayingCardEl, createCardSpriteRow } from "./card-sprites.js";

export function el(tag, attrs = {}, children = []) {
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

export function banner(title) {
  return el("div", { className: "banner" }, [el("h1", { textContent: title })]);
}

export function menu(options, title, onSelect, { showCasinoBanner = true } = {}) {
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

export const MACHINE_GAMES = {
  blackjack: { label: "BLACKJACK", icon: "♠♥", variant: "blackjack" },
  holdem: { label: "TEXAS HOLD'EM", icon: "♣♦", variant: "holdem" },
  roulette: { label: "ROULETTE", icon: "◉", variant: "roulette" },
  craps: { label: "CRAPS", icon: "⚄⚀", variant: "craps" },
};

export function machineGameNav(activeGame) {
  const tabs = [
    ["blackjack", "BJ"],
    ["holdem", "HOLD'EM"],
    ["roulette", "ROULETTE"],
    ["craps", "CRAPS"],
  ];
  return el("div", { className: "machine-game-nav" }, tabs.map(([id, label]) =>
    el("span", {
      className: `machine-game-tab${id === activeGame ? " machine-game-tab--active" : ""}`,
      textContent: label,
    })
  ));
}

export function machineLog(lines, { max = 12, lineClass = "dim" } = {}) {
  const log = el("div", { className: "machine-log" });
  for (const line of lines.slice(-max)) {
    const text = typeof line === "string" ? line : line.text;
    const cls = typeof line === "string" ? lineClass : (line.type || lineClass);
    log.appendChild(el("div", { className: `line ${cls}`, textContent: text }));
  }
  return log;
}

/**
 * View stack shared by the terminal router and the RPG's terminal host.
 * `stack` is mutated in place so consumers can hold a stable reference.
 */
export function createViewStack({ persist = () => {}, render = () => {}, initial = [] } = {}) {
  const stack = [...initial];

  function popToView(name) {
    while (stack.length > 1 && stack[stack.length - 1].name !== name) {
      stack.pop();
    }
  }

  /** Pop back to an ancestor view (or the root if missing), then re-render. */
  function navigateTo(name, { doPersist = true } = {}) {
    popToView(name);
    if (stack[stack.length - 1]?.name !== name) {
      stack.push({ name, data: {} });
    }
    if (doPersist) persist();
    render();
  }

  function pushView(name, data = {}) {
    stack.push({ name, data });
    render();
  }

  function popView() {
    if (stack.length > 1) stack.pop();
  }

  function goBack({ doPersist = true } = {}) {
    popView();
    if (doPersist) persist();
    render();
  }

  function reset(entries) {
    stack.length = 0;
    stack.push(...entries);
  }

  function current() {
    return stack[stack.length - 1] ?? null;
  }

  return { stack, popToView, navigateTo, pushView, popView, goBack, reset, current };
}

/**
 * Session-bound rendering helpers. `ctx` must expose a live `session` getter,
 * a `render()` callback, and the shared `runtime` state bag.
 */
export function createShell(ctx) {
  let statusMessage = null;

  function showStatus(text, type = "success") {
    statusMessage = { text, type };
    ctx.render();
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
        onclick: () => { clearStatus(); ctx.render(); },
      }),
    ]);
  }

  function chipLine() {
    const bank = ensureBank(ctx.session);
    const name = bank.accountName || "Off-Strip Checking";
    // Avoid "Off-Strip Checking: $0 (off-strip)" redundancy when the default name already says off-strip.
    const suffix = /off[-\s]?strip/i.test(name) ? "" : " (off-strip)";
    return el("div", { className: "chip-line-wrap" }, [
      el("p", { className: "chip-line", textContent: `Floor chips: ${fmtChips(ctx.session.wallet.balance)}` }),
      el("p", {
        className: "bank-line dim",
        textContent: `${name}: ${fmtChips(bank.balance)}${suffix}`,
      }),
    ]);
  }

  function dealerPanel(gameId) {
    const dealer = getSessionDealer(ctx.session, gameId);
    ctx.runtime.activeTableDealer = dealer;
    return el("div", { className: "dealer-panel" }, [
      el("p", { className: "subtitle", textContent: `On duty: ${dealer.name}` }),
      el("p", { className: "dim", textContent: dealer.tagline }),
      el("p", { className: "dim", textContent: `"${pickQuip(dealer, "greeting")}"` }),
    ]);
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

  function formatCardLabel(card) {
    if (!card) return ctx.session.useUnicode ? "[?]" : "[??]";
    const label = card.label(ctx.session.useUnicode);
    if (ctx.session.useColor && card.isRed()) return `<span class="card-red">${label}</span>`;
    return label;
  }

  function cardTile(card, { hidden = false, empty = false, deal = true, flip = false, delayMs = 0 } = {}) {
    return createPlayingCardEl(card, { hidden, empty, deal, flip, delayMs });
  }

  function cardRow(cards, { hiddenMask = null, slots = null, rowId = "table", animate = true } = {}) {
    return createCardSpriteRow(cards, { hiddenMask, slots, rowId, animate });
  }

  return {
    el,
    banner,
    menu,
    machineGameNav,
    machineLog,
    showStatus,
    clearStatus,
    statusBanner,
    chipLine,
    dealerPanel,
    videoMachine,
    formatCardLabel,
    cardTile,
    cardRow,
  };
}

/** Fresh shared runtime state bag used by the renderer factories. */
export function createRuntime(overrides = {}) {
  return {
    stakeTier: null,
    activeTableDealer: null,
    sportsbook: null,
    tradingDesk: null,
    blackjackGame: null,
    blackjackSessionNet: 0,
    slots: { machine: null, sessionNet: 0, spins: 0, tier: null, lastBet: null },
    slotsSpinTimers: [],
    holdem: null,
    roulette: {
      sessionNet: 0, spins: 0, lastNumber: null, spinning: false, tier: null,
      history: [], historyPulse: false, lastWager: null,
    },
    craps: {
      table: null, sessionNet: 0, rolls: 0, tier: null,
      lineBet: null, hardways: {}, lastWager: null, log: [],
    },
    lottery: { sessionNet: 0, tickets: 0, lastResult: null, lastTicketId: "pick3" },
    horseRacing: { card: null, pending: [], sessionNet: 0, races: 0, tier: null },
    dressage: { card: null, pending: [], sessionNet: 0, events: 0, tier: null },
    jumper: { card: null, pending: [], sessionNet: 0, events: 0, tier: null },
    ...overrides,
  };
}
