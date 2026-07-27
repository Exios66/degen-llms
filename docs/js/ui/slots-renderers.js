// Extracted from app.js — shared by the web terminal and the pixel RPG.
import { ACTIVITIES, fmtChips, signedChips } from "../core.js";
import { applyTierSpeedCss, getActivityTiming } from "../rewards-perks.js";
import { SLOT_CATEGORIES, getMachineUI, paytableEntries } from "../slots-ui.js";
import { isSalonOnlySlot, isSalonVenue } from "../salon-exclusives.js";
import { MACHINES, calculatePayout, contributeToProgressive, displaySymbol, progressivePool, randomSymbol, spinReels, tryJackpot } from "../slots.js";
import { effectiveSlotStakes, getTier, getTierPayoutBoost } from "../stakes.js";

export function buildSlotsRenderers(ctx) {
  const { el, banner, chipLine, pushView, popView, goBack, render, persist, recordActivityVisit, recordActivityResult } = ctx;
  const runtime = ctx.runtime;

  function slotMachineCard(machine, onSelect) {
    const ui = getMachineUI(machine);
    const meta = [el("span", { className: "slot-machine-card-bet", textContent: `${machine.minBet}–${machine.maxBet} chips` })];
    if (machine.progressive && machine.progressivePoolId) {
      meta.push(el("span", {
        className: "slot-machine-card-jackpot",
        textContent: `JP ${progressivePool(ctx.session, machine.progressivePoolId, machine.progressiveSeed).toLocaleString()}`,
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
    for (const timerId of runtime.slotsSpinTimers) {
      clearTimeout(timerId);
      clearInterval(timerId);
    }
    runtime.slotsSpinTimers = [];
    if (runtime.slots.spinIntervalId != null) {
      clearInterval(runtime.slots.spinIntervalId);
      runtime.slots.spinIntervalId = null;
    }
  }

  function scheduleSlotsSpin(fn, ms) {
    const timerId = window.setTimeout(fn, ms);
    runtime.slotsSpinTimers.push(timerId);
    return timerId;
  }

  /** Update reel symbols in place during a spin — avoids full-page flicker. */
  function patchSlotReelDisplay(machine) {
    const root = document.querySelector(".slot-reel-window");
    if (!root) return false;

    const spinning = runtime.slots.spinning;
    const reelsStopped = runtime.slots.reelsStopped ?? 0;
    const landedReel = runtime.slots.landedReel ?? -1;
    const reels = runtime.slots.displayReels ?? runtime.slots.lastReels;
    const symbols = reels?.length === 3
      ? reels.map((r) => (r ? displaySymbol(r, ctx.session.useUnicode) : "—"))
      : ["—", "—", "—"];

    root.classList.toggle("slot-reel-window--active-spin", Boolean(spinning && reelsStopped < 3));

    const reelEls = root.querySelectorAll(".slot-reel");
    for (let i = 0; i < 3; i += 1) {
      const reelEl = reelEls[i];
      if (!reelEl) continue;
      const isSpinning = spinning && i >= reelsStopped;
      reelEl.className = [
        "slot-reel",
        isSpinning ? "slot-reel--spinning" : "",
        i === landedReel ? "slot-reel--landed" : "",
      ].filter(Boolean).join(" ");
      const sym = reelEl.querySelector(".slot-reel-symbol");
      if (sym) sym.textContent = symbols[i];
      if (isSpinning) reelEl.style.setProperty("--reel-delay", `${i * 0.05}s`);
      else reelEl.style.removeProperty("--reel-delay");
    }

    const spinBtn = document.querySelector(".slot-cabinet-base .btn.primary");
    if (spinBtn) spinBtn.disabled = Boolean(spinning);

    const msg = document.querySelector(".slot-result");
    if (msg && spinning && reelsStopped < 3) {
      const cues = ["Spinning…", "Reels rolling…", "Almost there…"];
      msg.className = "slot-result slot-result--spinning";
      msg.textContent = cues[Math.min(reelsStopped, cues.length - 1)];
    }
    return true;
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
      ? reels.map((r) => (r ? displaySymbol(r, ctx.session.useUnicode) : "—"))
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
  function renderSlotsMenu() {
    const act = ACTIVITIES.slots;
    if (ctx.session.wallet.balance < act.minBet) {
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
    const tier = runtime.slots.tier ?? runtime.stakeTier;
    const salon = isSalonVenue(runtime) || runtime.slots?.salonOnly;

    const floor = el("div", { className: "slot-floor" }, [
      banner(salon ? "High Limit Salon — Exclusive Slots" : "Slot Machines — Mandalay Bay"),
      el("p", {
        className: "dim",
        textContent: salon
          ? "Velvet-rope cabinets — these reels never see the main floor."
          : (tier ? `${tier.name}: ${tier.description}` : "Penny slots to high-limit progressives — pick your machine."),
      }),
      chipLine(),
      el("p", {
        className: "slot-floor-intro",
        textContent: salon
          ? "Obsidian Vault, Whale Watch, and Chairman Vault — salon stake limits apply."
          : "Penny slots to high-limit progressives — each machine has its own cabinet theme and playstyle.",
      }),
    ]);

    for (const cat of SLOT_CATEGORIES) {
      if (salon && cat.id !== "Salon Exclusive" && cat.id !== "High Limit") continue;
      if (!salon && cat.id === "Salon Exclusive") continue;
      const machines = MACHINES.filter((m) => {
        if (getMachineUI(m).category !== cat.id) return false;
        if (salon) return isSalonOnlySlot(m) || cat.id === "High Limit";
        return !isSalonOnlySlot(m) && !m.salonOnly;
      });
      if (!machines.length) continue;
      const section = el("div", { className: "slot-category" }, [
        el("h3", { className: "slot-category-title", textContent: cat.label }),
        el("div", { className: "slot-machine-grid" }, machines.map((m) =>
          slotMachineCard(m, () => {
            runtime.slots = {
              machine: m,
              sessionNet: 0,
              spins: 0,
              spinning: false,
              lastWin: false,
              lastReels: null,
              lastMessage: null,
              lastBet: null,
              tier: runtime.slots.tier ?? runtime.stakeTier,
            };
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
    const machine = runtime.slots.machine;
    const tier = runtime.slots.tier ?? runtime.stakeTier ?? getTier("standard");
    applyTierSpeedCss(tier.id);
    const stakes = effectiveSlotStakes(machine, tier, ctx.session.wallet.balance);
    const minBet = stakes.minBet;
    const maxBet = stakes.maxBet;
    const rememberedBet = Number.isFinite(runtime.slots.lastBet)
      ? Math.min(maxBet, Math.max(minBet, runtime.slots.lastBet))
      : minBet;
    const betInput = el("input", {
      type: "number", min: String(minBet), max: String(maxBet), value: String(rememberedBet),
    });
    betInput.oninput = () => {
      const typed = parseInt(betInput.value, 10);
      if (Number.isFinite(typed) && typed > 0) runtime.slots.lastBet = typed;
    };
    const reelsStopped = runtime.slots.reelsStopped ?? 3;
    const reelsForDisplay = (runtime.slots.spinning || reelsStopped < 3)
      ? (runtime.slots.displayReels ?? runtime.slots.lastReels)
      : runtime.slots.lastReels;
    const msgEl = slotResultElement(runtime.slots.lastMessage, {
      spinning: runtime.slots.spinning,
      reelsStopped,
    });
    const summaryEl = el("p", {
      className: "dim",
      textContent: runtime.slots.spins ? `Session: ${signedChips(runtime.slots.sessionNet)} over ${runtime.slots.spins} spin(s)` : "",
    });

    const reelsEl = slotReelWindow(machine, reelsForDisplay, {
      spinning: runtime.slots.spinning,
      reelsStopped,
      landedReel: runtime.slots.landedReel ?? -1,
      win: runtime.slots.lastWin,
      winTier: runtime.slots.winTier,
    });

    const jackpotEl = machine.progressive && machine.progressivePoolId
      ? el("div", {
        className: `slot-jackpot-ticker${runtime.slots.winTier === "jackpot" ? " slot-jackpot-ticker--hit" : ""}`,
        textContent: `★ PROGRESSIVE ${progressivePool(ctx.session, machine.progressivePoolId, machine.progressiveSeed).toLocaleString()} ★`,
      })
      : null;

    const maxBetNote = machine.jackpotRequiresMaxBet
      ? el("p", { className: "dim", textContent: `Max bet (${maxBet.toLocaleString()} chips) required to qualify for the progressive jackpot.` })
      : null;

    function doSpin() {
      const bet = parseInt(betInput.value, 10);
      if (bet === 0) {
        clearSlotsSpinTimers();
        recordActivityResult("slots", runtime.slots.sessionNet, runtime.slots.spins);
        persist();
        popView();
        render();
        return;
      }
      if (bet < minBet) {
        runtime.slots.lastMessage = { text: `Minimum spin is ${minBet}.`, type: "error" };
        render();
        return;
      }
      if (bet > maxBet) {
        runtime.slots.lastMessage = { text: `Maximum spin is ${maxBet}.`, type: "error" };
        render();
        return;
      }
      if (!ctx.session.wallet.debit(bet, "slots", `${machine.name} spin ${fmtChips(bet)}`)) {
        runtime.slots.lastMessage = { text: "Insufficient chips.", type: "error" };
        render();
        return;
      }

      // Keep the player's last wager as the default for the next pull.
      runtime.slots.lastBet = bet;

      clearSlotsSpinTimers();
      const timing = getActivityTiming(tier.id);

      contributeToProgressive(ctx.session, machine, bet);
      const finalReels = spinReels(machine);
      const jackpotAmount = tryJackpot(ctx.session, machine, finalReels, bet, maxBet);
      const tierBoost = getTierPayoutBoost(tier?.id);
      const { win, reason } = calculatePayout(finalReels, bet, machine, jackpotAmount, tierBoost);
      const isJackpot = jackpotAmount != null;
      const winTier = win > 0 ? classifySlotWin(win, bet, isJackpot) : null;

      runtime.slots.spinning = true;
      runtime.slots.lastWin = false;
      runtime.slots.winTier = null;
      runtime.slots.lastWinAmount = 0;
      runtime.slots.reelsStopped = 0;
      runtime.slots.landedReel = -1;
      runtime.slots.displayReels = [...finalReels];
      runtime.slots.pendingFinalReels = finalReels;
      runtime.slots.pendingOutcome = { win, reason, jackpotAmount, bet, winTier, isJackpot };
      runtime.slots.lastMessage = null;

      const cycleSymbols = () => {
        if (!runtime.slots.spinning || runtime.slots.reelsStopped >= 3) return;
        const display = [...runtime.slots.pendingFinalReels];
        for (let i = runtime.slots.reelsStopped; i < 3; i += 1) {
          display[i] = randomSymbol(machine);
        }
        runtime.slots.displayReels = display;
        if (!patchSlotReelDisplay(machine)) render();
      };
      const cycleMs = Math.max(60, Math.round(90 * timing.speedMultiplier));
      runtime.slots.spinIntervalId = window.setInterval(cycleSymbols, cycleMs);
      runtime.slotsSpinTimers.push(runtime.slots.spinIntervalId);
      render();
      cycleSymbols();

      const stopReel = (index) => {
        runtime.slots.landedReel = index;
        runtime.slots.reelsStopped = index + 1;
        const display = [...(runtime.slots.displayReels ?? runtime.slots.pendingFinalReels)];
        display[index] = runtime.slots.pendingFinalReels[index];
        for (let i = index + 1; i < 3; i += 1) {
          display[i] = randomSymbol(machine);
        }
        runtime.slots.displayReels = display;
        if (!patchSlotReelDisplay(machine)) render();
        scheduleSlotsSpin(() => {
          if (runtime.slots.landedReel === index) runtime.slots.landedReel = -1;
          patchSlotReelDisplay(machine);
        }, 520);
      };

      scheduleSlotsSpin(() => stopReel(0), timing.slotsReel1);
      scheduleSlotsSpin(() => stopReel(1), timing.slotsReel2);
      scheduleSlotsSpin(() => stopReel(2), timing.slotsReel3);

      scheduleSlotsSpin(() => {
        clearSlotsSpinTimers();
        const outcome = runtime.slots.pendingOutcome;
        if (!outcome) return;

        runtime.slots.spinning = false;
        runtime.slots.reelsStopped = 3;
        runtime.slots.landedReel = -1;
        runtime.slots.lastReels = runtime.slots.pendingFinalReels;
        runtime.slots.displayReels = runtime.slots.pendingFinalReels;
        runtime.slots.pendingFinalReels = null;
        runtime.slots.pendingOutcome = null;
        runtime.slots.spins += 1;
        runtime.slots.lastWin = outcome.win > 0;
        runtime.slots.winTier = outcome.winTier;
        runtime.slots.lastWinAmount = outcome.win;

        if (outcome.win > 0) {
          ctx.session.wallet.credit(outcome.win, "slots", outcome.reason);
          runtime.slots.sessionNet += outcome.win - outcome.bet;
          runtime.slots.lastMessage = {
            text: outcome.reason,
            amount: outcome.win,
            type: outcome.isJackpot ? "jackpot-win" : "success",
            winTier: outcome.winTier,
          };
        } else {
          runtime.slots.sessionNet -= outcome.bet;
          runtime.slots.lastMessage = { text: "No win this spin.", type: "dim" };
        }
        persist();
        render();
      }, timing.slotsReel3 + 380);
    }

    return slotCabinet(machine, {
      celebrate: runtime.slots.lastWin ? runtime.slots.winTier : null,
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
        el("p", { className: "chip-line", textContent: `Chips: ${fmtChips(ctx.session.wallet.balance)}` }),
        el("div", { className: "form-row" }, [
          el("label", { textContent: `Spin amount (${minBet}–${maxBet}, 0 to leave)` }),
          betInput,
        ]),
        el("div", { className: "action-bar" }, [
          el("button", { className: "btn primary", textContent: "Spin", onclick: doSpin, disabled: runtime.slots.spinning }),
          el("button", {
            className: "btn",
            textContent: "Leave machine",
            onclick: () => {
              clearSlotsSpinTimers();
              recordActivityResult("slots", runtime.slots.sessionNet, runtime.slots.spins);
              persist();
              popView();
              render();
            },
          }),
        ]),
      ],
    });
  }

  return {
    "slots-menu": renderSlotsMenu,
    "slots-play": renderSlotsPlay,
    clearSlotsSpinTimers,
    slotMachineCard,
  };
}
