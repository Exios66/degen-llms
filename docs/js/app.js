import {
  CASINO_NAME, ACTIVITIES, FLOOR_ORDER, fmtChips,
  saveSlot, loadSlot, createSlot, deleteSlot, listSlots, recentSlots, formatSaveTime,
  createGuestSession, PlayerSession, formatPlayTimeSummary, formatSaveSlotPlayTimes, getCasinoTimeMs,
} from "./core.js";
import { startCasinoClock, stopCasinoClock } from "./casino-time.js";
import { formatVegasClockLabel } from "./vegas-time.js";
import { onActivityVisit, syncContactIntros, onSessionSwing } from "./phone-contacts.js";
import { applyIntoxicationEffects } from "./intoxication-effects.js";

window.addEventListener("mandalay:intoxication-settled", () => {
  persist();
});
import { SportsbookState } from "./sportsbook.js";
import { TradingDeskState } from "./tradingDesk.js";
import { Action } from "./blackjack/game.js";
import { loadBundledHorseNames } from "./horse_racing.js";
import { RewardsPhone } from "./RewardsPhone.js";
import { buildHotelRenderers } from "./hotel-ui.js";
import { buildPoolRenderers } from "./pool-complex-ui.js";
import { buildAmenitiesRenderers } from "./casino-amenities-ui.js";
import { ensureHotel, applyPromotedTierRoomUpgrade } from "./hotel.js";
import { createShell, createRuntime, createViewStack } from "./ui/shell.js";
import { buildTitleSceneRenderer, shouldSkipCasinoTitle } from "./ui/title-scene.js";
import { buildStakesRenderers } from "./ui/stakes-ui.js";
import { buildSlotsRenderers } from "./ui/slots-renderers.js";
import { buildTableRenderers } from "./ui/table-renderers.js";
import { buildCrapsRenderers } from "./ui/craps-renderers.js";
import { buildLotteryRenderers } from "./ui/lottery-renderers.js";
import { buildSportsbookRenderers } from "./ui/sportsbook-renderers.js";
import { buildTradingDeskRenderers } from "./ui/trading-desk-renderers.js";
import { buildArcadeRenderers } from "./ui/arcade-renderers.js";
import { ArcadeCabinetOverlay } from "./arcade/ArcadeCabinetOverlay.js";
import { DiningOverlay } from "./DiningOverlay.js";
import { BarOverlay } from "./BarOverlay.js";
import { PoolComplexOverlay } from "./PoolComplexOverlay.js";
import { BalconySmokeOverlay } from "./BalconySmokeOverlay.js";
import { buildRacingRenderers } from "./ui/racing-renderers.js";
import { buildVenueRenderers } from "./ui/venue-renderers.js";
import { buildGentlemansClubRenderers } from "./ui/gentlemans-club-renderers.js?v=__ASSET_SHA__";
import { buildCashierRenderers } from "./ui/cashier-renderers.js";
import { buildMetaRenderers } from "./ui/meta-renderers.js";

const META_VIEWS = new Set(["title-intro", "save-picker", "save-create", "save-delete"]);

const app = document.getElementById("app");

let session = new PlayerSession();
let rewardsPhone = null;
let arcadeOverlay = null;
let diningOverlay = null;
let barOverlay = null;
let poolOverlay = null;
let balconySmokeOverlay = null;
let casinoTimeTicker = null;

const runtime = createRuntime({
  sportsbook: new SportsbookState(),
  tradingDesk: new TradingDeskState(),
});

/** Context handed to every shared renderer factory (terminal flavor). */
const ctx = {
  get session() { return session; },
  set session(next) { session = next; },
  get rewardsPhone() { return rewardsPhone; },
  get arcadeOverlay() { return arcadeOverlay; },
  get diningOverlay() { return diningOverlay; },
  get barOverlay() { return barOverlay; },
  get poolOverlay() { return poolOverlay; },
  get balconySmokeOverlay() { return balconySmokeOverlay; },
  runtime,
  persist,
  render,
  recordActivityVisit,
  recordActivityResult,
  settingsBar,
};

const shell = createShell(ctx);
const { el, banner, menu, chipLine, statusBanner, showStatus, clearStatus, dealerPanel, videoMachine, machineLog, cardRow, cardTile, formatCardLabel } = shell;
Object.assign(ctx, shell);

const skipTitle = shouldSkipCasinoTitle();
const views = createViewStack({
  persist: () => persist(),
  render: () => render(),
  initial: [{ name: skipTitle ? "save-picker" : "title-intro", data: {} }],
});
const viewStack = views.stack;
const { pushView, popView, goBack, navigateTo, popToView } = views;
Object.assign(ctx, { pushView, popView, goBack, navigateTo, popToView, viewStack });


function isInCasinoView() {
  return viewStack.some((v) => !META_VIEWS.has(v.name));
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
    session.sportsbookData = runtime.sportsbook.toJSON();
    session.tradingDeskData = runtime.tradingDesk.toJSON();
  }
}

function resetSportsbookFromSession() {
  runtime.sportsbook = SportsbookState.fromJSON(session.sportsbookData);
  runtime.tradingDesk = TradingDeskState.fromJSON(session.tradingDeskData);
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
  rewardsPhone = new RewardsPhone(root, session, {
    onPersist: () => {
      persist();
      render();
    },
    onTierPromoted: (tierId) => {
      const result = applyPromotedTierRoomUpgrade(session, tierId, rewardsPhone?.tracker);
      if (result?.ok) {
        rewardsPhone?.tracker.pushNotification("Room Upgraded", result.message);
        persist();
        render();
      }
    },
  });
  rewardsPhone.sync();
}

function mountArcadeOverlay() {
  const root = document.getElementById("arcade-overlay");
  if (!root) return;
  arcadeOverlay = new ArcadeCabinetOverlay(root, {
    onPersist: () => persist(),
    onStatus: (msg, kind) => showStatus(msg, kind),
    onPlayResult: ({ net }) => {
      runtime.arcade.sessionNet += net;
      runtime.arcade.plays += 1;
    },
    onClosed: () => render(),
  });
  arcadeOverlay.setSession(session);
}

function mountDiningOverlay() {
  const root = document.getElementById("dining-overlay");
  if (!root) return;
  diningOverlay = new DiningOverlay(root, {
    onPersist: () => persist(),
    onStatus: (msg, kind) => showStatus(msg, kind),
    onClosed: () => render(),
    onChipDelta: () => {
      const line = document.querySelector(".chip-line");
      if (line) {
        line.classList.remove("chip-pulse--up", "chip-pulse--down");
        void line.offsetWidth;
        line.classList.add("chip-pulse", "chip-pulse--down");
      }
    },
  });
  diningOverlay.setSession(session);
}

function mountBarOverlay() {
  const root = document.getElementById("bar-overlay");
  if (!root) return;
  barOverlay = new BarOverlay(root, {
    onPersist: () => persist(),
    onStatus: (msg, kind) => showStatus(msg, kind),
    onClosed: () => render(),
    onChipDelta: () => {
      const line = document.querySelector(".chip-line");
      if (line) {
        line.classList.remove("chip-pulse--up", "chip-pulse--down");
        void line.offsetWidth;
        line.classList.add("chip-pulse", "chip-pulse--down");
      }
    },
  });
  barOverlay.setSession(session);
}

const POOL_LAUNCH_ZONES = {
  "pool-complex": "hub",
  "pool-wave": "wave_pool",
  "pool-hot-tubs": "hot_tubs",
  "pool-cabanas": "cabanas",
  "pool-reef": "shark_reef",
  "pool-beach-club": "beach_club",
  "pool-rave": "beach_rave",
  "pool-events": "events",
};

function poolOverlayReturnView() {
  const name = viewStack.at(-1)?.name ?? "hub";
  if (name.startsWith("pool") || name.startsWith("hotel")) return "hotel-lobby";
  return null;
}

function handlePoolOverlayClosed() {
  const ret = poolOverlay?.returnView ?? poolOverlayReturnView();
  if (poolOverlay) poolOverlay.returnView = null;
  if (ret === "hotel-lobby") {
    ensureHotel(session);
    navigateTo("hotel-lobby");
    return;
  }
  render();
}

function mountPoolOverlay() {
  const root = document.getElementById("pool-overlay");
  if (!root) return null;
  poolOverlay = new PoolComplexOverlay(root, {
    onPersist: () => persist(),
    onStatus: (msg, kind) => showStatus(msg, kind),
    onClosed: () => handlePoolOverlayClosed(),
    get barOverlay() { return barOverlay; },
    onChipDelta: () => {
      const line = document.querySelector(".chip-line");
      if (line) {
        line.classList.remove("chip-pulse--up", "chip-pulse--down");
        void line.offsetWidth;
        line.classList.add("chip-pulse", "chip-pulse--up");
      }
    },
  });
  poolOverlay.setSession(session);
  return poolOverlay;
}

/** Remount if the graphic beach deck was never attached (stale host / missing root race). */
function ensurePoolOverlay() {
  if (poolOverlay && typeof poolOverlay.open === "function") {
    poolOverlay.setSession(session);
    return poolOverlay;
  }
  return mountPoolOverlay();
}

/** Open the Mandalay Beach graphic overlay from any casino entry point. */
function openPoolComplexVisual(zoneId = "hub", opts = {}) {
  const overlay = ensurePoolOverlay();
  if (!overlay) {
    showStatus("Pool overlay not ready — try Hotel Lobby → Pool Complex.", "error");
    return false;
  }
  overlay.setSession(session);
  overlay.returnView = opts.returnView ?? poolOverlayReturnView();
  const target = zoneId || "hub";
  // Avoid re-open/reset on every render() while the beach deck is already up.
  if (!overlay.active) overlay.open(target);
  else if (target !== "hub" && overlay.zoneId !== target) overlay.openZone(target);
  return true;
}

Object.assign(ctx, { ensurePoolOverlay, openPoolComplexVisual });

function mountBalconySmokeOverlay() {
  const root = document.getElementById("balcony-smoke-overlay");
  if (!root) return;
  balconySmokeOverlay = new BalconySmokeOverlay(root, {
    onPersist: () => persist(),
    onStatus: (msg, kind) => showStatus(msg, kind),
    onClosed: () => render(),
    onIntoxChange: () => applyIntoxicationEffects(session),
  });
  balconySmokeOverlay.setSession(session);
}










function enterCasino(nextSession) {
  session = nextSession;
  // A new sitting starts every table, machine, and counter from scratch; going
  // through createRuntime keeps this from drifting as buckets are added.
  Object.assign(runtime, createRuntime());
  resetSportsbookFromSession();
  views.reset([{ name: "hub", data: {} }]);
  clearStatus();
  if (session.slotId != null) startCasinoClock();
  startCasinoTimeTicker();
  mountRewardsPhone();
  mountArcadeOverlay();
  mountDiningOverlay();
  mountBarOverlay();
  mountPoolOverlay();
  mountBalconySmokeOverlay();
  syncContactIntros(nextSession);
  applyIntoxicationEffects(session);
  render();
}

function returnToSavePicker() {
  persist();
  stopCasinoClock();
  stopCasinoTimeTicker();
  rewardsPhone?.close();
  arcadeOverlay?.close();
  diningOverlay?.close();
  barOverlay?.close();
  poolOverlay?.close();
  balconySmokeOverlay?.close();
  runtime.sportsbook = new SportsbookState();
  runtime.tradingDesk = new TradingDeskState();
  runtime.blackjackGame = null;
  runtime.holdem = null;
  session = new PlayerSession();
  views.reset([{ name: "save-picker", data: {} }]);
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
        if (runtime.blackjackGame) {
          if (!confirm("Leave the blackjack table and return to the save library?")) return;
          finishBlackjack(true);
          return;
        }
        if (runtime.holdem) {
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


function renderSavePicker() {
  const recent = recentSlots();
  const allSlots = listSlots();
  const container = el("div", {}, [
    statusBanner(),
    el("div", { className: "panel" }, [
      banner(CASINO_NAME),
      el("p", { className: "subtitle", textContent: "Save Library" }),
      el("p", { className: "dim", textContent: "Select a save slot to continue, create a new visit, or play as a guest:" }),
      el("p", { className: "dim", textContent: "Save slots are shared with Pixel RPG mode — wallet, hotel, and MGM Rewards carry over." }),
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

  const occupied = allSlots.filter((slot) => slot.occupied);
  if (occupied.length) {
    panel.appendChild(el("p", { className: "subtitle", textContent: "Pixel RPG (shared slots):" }));
    const rpgList = el("ul", { className: "menu-list" });
    for (const slot of occupied) {
      const mode = slot.hasRpgProgress ? "continue RPG" : "carry profile into RPG";
      rpgList.appendChild(el("li", {}, [
        el("button", {
          className: "menu-btn",
          innerHTML: `<span class="num">→</span> Slot ${slot.slotId} — ${slot.playerName} (${mode})`,
          onclick: () => {
            persist();
            window.location.href = `./rpg/?slot=${slot.slotId}&skipIntro=1`;
          },
        }),
      ]));
    }
    panel.appendChild(rpgList);
  }

  panel.appendChild(el("p", { className: "footer-note", textContent: "Your most recent saves appear at the top of the library. Chips, hotel, and rewards sync between terminal and RPG." }));
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
    "Private Offshore Account",
    "Staff Manifest",
    "Player Stats",
    "Save Game",
    "Exit to Hotel",
    "Pool Complex — Mandalay Beach",
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
      if (runtime.blackjackGame) {
        if (!confirm("Leave the blackjack table and return to the save library?")) return;
        finishBlackjack(true);
        return;
      }
      if (runtime.holdem) {
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
      if (!openPoolComplexVisual("hub")) pushView("pool-complex");
    } else if (choice === FLOOR_ORDER.length + 8) {
      pushView("casino-floor");
    } else if (choice === FLOOR_ORDER.length + 9) {
      persist();
      const rpgUrl = session.slotId != null
        ? `./rpg/?slot=${session.slotId}&skipIntro=1`
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
    else if (act.id === "craps") pushView("stake-tier", { activityId: "craps", nextView: "craps" });
    else if (act.id === "slots") pushView("stake-tier", { activityId: "slots", nextView: "slots-menu" });
    else if (act.id === "lottery") pushView("stake-tier", { activityId: "lottery", nextView: "lottery" });
    else if (act.id === "sportsbook") pushView("stake-tier", { activityId: "sportsbook", nextView: "sportsbook" });
    else if (act.id === "trading_desk") pushView("stake-tier", { activityId: "trading_desk", nextView: "trading-desk" });
    else if (act.id === "arcade") pushView("arcade-menu");
    else if (act.id === "horse_racing") pushView("stake-tier", { activityId: "horse_racing", nextView: "horse-racing" });
    else if (act.id === "dressage") pushView("stake-tier", { activityId: "dressage", nextView: "dressage" });
    else if (act.id === "jumper") pushView("stake-tier", { activityId: "jumper", nextView: "jumper" });
  }
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
          views.reset([{ name: session.slotId != null ? "hub" : "save-picker", data: {} }]);
          render();
        },
      }),
    ]),
    el("p", { className: "footer-note", textContent: "Play in your browser — session saved locally" }),
  ]);
}

const hotelRenderers = buildHotelRenderers(ctx);
const poolRenderers = buildPoolRenderers(ctx);
const amenitiesRenderers = buildAmenitiesRenderers(ctx);
const stakesRenderers = buildStakesRenderers(ctx);
const { clearSlotsSpinTimers, slotMachineCard, ...slotsRenderers } = buildSlotsRenderers(ctx);
const { finishBlackjack, finishHoldem, startBlackjack, ...tableRenderers } = buildTableRenderers(ctx);
const sportsbookRenderers = buildSportsbookRenderers(ctx);
const tradingDeskRenderers = buildTradingDeskRenderers(ctx);
const arcadeRenderers = buildArcadeRenderers(ctx);
const { renderHorsePaddock, ...racingRenderers } = buildRacingRenderers(ctx);
const venueRenderers = buildVenueRenderers(ctx);
const gentlemansClubRenderers = buildGentlemansClubRenderers(ctx);
const cashierRenderers = buildCashierRenderers(ctx);
const metaRenderers = buildMetaRenderers(ctx);
const crapsRenderers = buildCrapsRenderers(ctx);
const lotteryRenderers = buildLotteryRenderers(ctx);
const renderTitleIntro = buildTitleSceneRenderer(ctx, {
  onComplete: () => {
    views.reset([{ name: "save-picker", data: {} }]);
    render();
  },
});

const RENDERERS = {
  "title-intro": renderTitleIntro,
  "save-picker": renderSavePicker,
  "save-create": renderSaveCreate,
  "save-delete": renderSaveDelete,
  hub: renderHub,
  floor: renderFloor,
  leave: renderLeave,
  ...stakesRenderers,
  ...slotsRenderers,
  ...tableRenderers,
  ...crapsRenderers,
  ...lotteryRenderers,
  ...sportsbookRenderers,
  ...tradingDeskRenderers,
  ...arcadeRenderers,
  ...racingRenderers,
  ...venueRenderers,
  ...gentlemansClubRenderers,
  ...cashierRenderers,
  ...metaRenderers,
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
  } else {
    app.appendChild(renderNotFound({ requestedView: current.name }));
  }
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const slotsSpinning = runtime.slots?.spinning === true;
  if (!reduceMotion && !slotsSpinning) {
    app.classList.remove("view-transition");
    void app.offsetWidth;
    app.classList.add("view-transition");
    window.setTimeout(() => app.classList.remove("view-transition"), 240);
  }
  diningOverlay?.setSession(session);
  barOverlay?.setSession(session);
  poolOverlay?.setSession(session);
  arcadeOverlay?.setSession(session);
  balconySmokeOverlay?.setSession(session);
  window.__casinoReady = true;
}

function applyDeepView(deepView) {
  if (!deepView) return;
  const poolZone = POOL_LAUNCH_ZONES[deepView];
  if (poolZone) {
    if (openPoolComplexVisual(poolZone, { returnView: "hotel-lobby" })) return;
    if (RENDERERS[deepView]) pushView(deepView);
    return;
  }
  if (RENDERERS[deepView]) pushView(deepView);
}

function applyLaunchParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("guest") === "1") {
    enterCasino(createGuestSession({
      playerName: params.get("name") || "Guest",
      chips: Math.max(0, parseInt(params.get("chips") || "1000", 10)),
    }));
    applyDeepView(params.get("view"));
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
        applyDeepView(params.get("view"));
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
    const inCasino = isInCasinoView();
    const blackjackNeedsP = viewStack.at(-1)?.name === "blackjack-play" && runtime.blackjackGame?.pendingAction;
    if (inCasino && rewardsPhone && !blackjackNeedsP) {
      rewardsPhone.toggle();
      e.preventDefault();
      return;
    }
  }
  if (!runtime.blackjackGame?.pendingAction) return;
  const map = { h: Action.HIT, s: Action.STAND, d: Action.DOUBLE, p: Action.SPLIT, u: Action.SURRENDER };
  const act = map[e.key.toLowerCase()];
  if (act && runtime.blackjackGame.getCurrentLegalActions().has(act)) {
    runtime.blackjackGame.playerAction(act);
    render();
  }
});
