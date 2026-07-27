// Extracted from app.js — shared by the web terminal and the pixel RPG.
import { ACTIVITIES, signedChips } from "../core.js";
import {
  TICKET_TYPES,
  TICKET_ORDER,
  MEGA_BALL_MAX,
  MEGA_POWERBALL_MAX,
  MEGA_BALLS,
  quickPickDigits,
  quickPickMega,
  resolveMega,
  resolvePick3,
  resolvePick4,
  resolveScratcher,
  scaledTicketPrice,
  lotteryTierScale,
  ticketKind,
  validateMegaPicks,
  classifyLotteryWin,
} from "../lottery.js";
import { applyTierSpeedCss, getActivityTiming } from "../rewards-perks.js";
import { getTier, getTierPayoutBoost } from "../stakes.js";
import { getActivityBranding } from "../strip-destinations.js";

export function buildLotteryRenderers(ctx) {
  const {
    el, banner, chipLine, goBack, render, persist,
    recordActivityVisit, recordActivityResult,
  } = ctx;
  const runtime = ctx.runtime;

  function ensureLotteryState() {
    if (!runtime.lottery) {
      runtime.lottery = {
        sessionNet: 0,
        tickets: 0,
        lastResult: null,
        lastTicketId: "pick3",
      };
    }
    const L = runtime.lottery;
    if (!Array.isArray(L.luckyPicks)) L.luckyPicks = [];
    if (L.powerball == null) L.powerball = null;
    if (!Array.isArray(runtime.lotteryDrawTimers)) runtime.lotteryDrawTimers = [];
    return L;
  }

  function clearLotteryTimers() {
    for (const id of runtime.lotteryDrawTimers ?? []) {
      clearTimeout(id);
      clearInterval(id);
    }
    runtime.lotteryDrawTimers = [];
  }

  function scheduleLottery(fn, ms) {
    const id = window.setTimeout(fn, ms);
    runtime.lotteryDrawTimers.push(id);
    return id;
  }

  function activeTier() {
    return runtime.lottery?.tier ?? runtime.stakeTier ?? getTier("standard");
  }

  function resetPickerForTicket(ticketId) {
    const L = ensureLotteryState();
    const kind = ticketKind(ticketId);
    if (kind === "pick") {
      L.luckyPicks = [];
      L.powerball = null;
    } else if (kind === "mega") {
      L.luckyPicks = [];
      L.powerball = null;
    } else {
      L.luckyPicks = [];
      L.powerball = null;
    }
  }

  function buildDigitPad(digits, selected, { disabled = false, onChange } = {}) {
    const pad = el("div", { className: "lottery-digit-pad", role: "group", "aria-label": "Lucky digits" });
    for (let d = 0; d <= 9; d += 1) {
      // Digits may repeat; highlight when the digit appears in the current pick.
      const count = selected.filter((x) => x === d).length;
      pad.appendChild(el("button", {
        type: "button",
        className: `lottery-ball lottery-ball--digit${count > 0 ? " lottery-ball--selected" : ""}`,
        textContent: String(d),
        disabled: disabled || selected.length >= digits,
        onclick: () => {
          if (selected.length >= digits) return;
          onChange([...selected, d]);
        },
      }));
    }
    const slots = el("div", { className: "lottery-pick-slots" }, Array.from({ length: digits }, (_, i) =>
      el("button", {
        type: "button",
        className: `lottery-pick-slot${selected[i] != null ? " lottery-pick-slot--filled" : ""}`,
        textContent: selected[i] != null ? String(selected[i]) : "·",
        disabled,
        title: selected[i] != null ? "Click to clear from here" : "Empty slot",
        onclick: () => {
          if (disabled) return;
          onChange(selected.slice(0, i));
        },
      })
    ));
    return el("div", { className: "lottery-lucky-selector" }, [
      el("div", { className: "lottery-selector-label", textContent: `Lucky numbers — pick ${digits} digits (0–9)` }),
      slots,
      pad,
      el("div", { className: "lottery-selector-actions" }, [
        el("button", {
          type: "button",
          className: "btn",
          textContent: "Clear",
          disabled,
          onclick: () => onChange([]),
        }),
        el("button", {
          type: "button",
          className: "btn",
          textContent: "Quick Pick",
          disabled,
          onclick: () => onChange(quickPickDigits(digits)),
        }),
      ]),
    ]);
  }

  function buildBallGrid({
    max,
    count,
    selected,
    label,
    powerballMode = false,
    disabled = false,
    onChange,
  }) {
    const grid = el("div", {
      className: `lottery-ball-grid${powerballMode ? " lottery-ball-grid--powerball" : ""}`,
      role: "group",
      "aria-label": label,
    });
    for (let n = 1; n <= max; n += 1) {
      const isOn = powerballMode ? selected === n : selected.includes(n);
      grid.appendChild(el("button", {
        type: "button",
        className: [
          "lottery-ball",
          powerballMode ? "lottery-ball--powerball" : "lottery-ball--lucky",
          isOn ? "lottery-ball--selected" : "",
        ].filter(Boolean).join(" "),
        textContent: String(n),
        disabled: disabled || (!powerballMode && !isOn && selected.length >= count),
        onclick: () => {
          if (powerballMode) {
            onChange(isOn ? null : n);
            return;
          }
          if (isOn) onChange(selected.filter((x) => x !== n).sort((a, b) => a - b));
          else if (selected.length < count) onChange([...selected, n].sort((a, b) => a - b));
        },
      }));
    }
    const summary = powerballMode
      ? (selected != null ? `Powerball: ${selected}` : "Select a Powerball")
      : `${selected.length}/${count} lucky numbers selected`;
    return el("div", { className: "lottery-lucky-selector" }, [
      el("div", { className: "lottery-selector-label", textContent: label }),
      el("div", { className: "lottery-selector-summary", textContent: summary }),
      grid,
      el("div", { className: "lottery-selector-actions" }, [
        el("button", {
          type: "button",
          className: "btn",
          textContent: "Clear",
          disabled,
          onclick: () => onChange(powerballMode ? null : []),
        }),
      ]),
    ]);
  }

  function winCallout(result, winTier) {
    if (!result) return null;
    if (result.win > 0 && winTier) {
      return el("div", { className: `lottery-win-callout lottery-win-callout--${winTier}` }, [
        el("div", {
          className: "lottery-win-callout-amount",
          textContent: `+${result.win.toLocaleString()} chips`,
        }),
        el("div", { className: "lottery-win-callout-detail", textContent: result.reason }),
      ]);
    }
    return el("p", {
      className: result.win > 0 ? "success" : "dim",
      textContent: result.reason,
    });
  }

  function drawBallsRow(draw, { revealCount = draw?.length ?? 0, powerballIndex = null } = {}) {
    if (!draw?.length) return null;
    const row = el("div", { className: "lottery-draw-row", "aria-live": "polite" });
    draw.forEach((n, i) => {
      const revealed = i < revealCount;
      const isPb = powerballIndex != null && i === powerballIndex;
      const attrs = {
        className: [
          "lottery-draw-ball",
          isPb ? "lottery-draw-ball--powerball" : "",
          revealed ? "lottery-draw-ball--revealed" : "lottery-draw-ball--pending",
        ].filter(Boolean).join(" "),
        textContent: revealed ? String(n) : "?",
      };
      if (revealed) attrs.style = `--ball-delay:${i * 0.08}s`;
      row.appendChild(el("span", attrs));
    });
    return row;
  }

  function scratchPanel(result, { revealed = false } = {}) {
    const symbols = result?.symbols ?? ["?", "?", "?"];
    return el("div", {
      className: `lottery-scratch-card${revealed ? " lottery-scratch-card--revealed" : " lottery-scratch-card--foil"}`,
    }, [
      el("div", { className: "lottery-scratch-foil", "aria-hidden": "true" }),
      el("div", { className: "lottery-scratch-symbols" }, symbols.map((s, i) =>
        el("span", {
          className: "lottery-scratch-symbol",
          style: `--sym-delay: ${i * 0.12}s`,
          textContent: s,
        })
      )),
    ]);
  }

  function lotteryCabinet({ celebrate = null, screenChildren = [], baseChildren = [] } = {}) {
    const cabinetClass = [
      "lottery-cabinet",
      celebrate ? `lottery-cabinet--celebrate lottery-cabinet--celebrate-${celebrate}` : "",
    ].filter(Boolean).join(" ");
    return el("div", { className: cabinetClass }, [
      el("div", { className: "lottery-cabinet-topper" }, [
        el("div", { className: "lottery-cabinet-name", textContent: "MANDALAY LOTTERY" }),
        el("div", { className: "lottery-cabinet-sub", textContent: "Lucky numbers · Powerball · Scratchers" }),
      ]),
      el("div", { className: "lottery-cabinet-screen" }, screenChildren.filter(Boolean)),
      el("div", { className: "lottery-cabinet-base" }, baseChildren.filter(Boolean)),
    ]);
  }

  function finishPendingResult() {
    const L = ensureLotteryState();
    const pending = L.pendingOutcome;
    if (!pending) return;
    const { result, price, winTier } = pending;
    L.tickets += 1;
    L.sessionNet -= price;
    if (result.win > 0) {
      ctx.session.wallet.credit(result.win, "lottery", result.reason);
      L.sessionNet += result.win;
    }
    L.lastResult = result;
    L.winTier = winTier;
    L.pendingOutcome = null;
    L.drawing = false;
    L.scratching = false;
    L.scratchRevealed = ticketKind(result.ticketId) === "scratch";
    L.revealStep = result.draw?.length ?? 0;
    L.displayDraw = result.draw ?? [];
    persist();
    render();
  }

  function startDrawReveal(result, price) {
    const L = ensureLotteryState();
    const tier = activeTier();
    const timing = getActivityTiming(tier?.id ?? "standard");
    const winTier = classifyLotteryWin(result.win, price);
    const kind = ticketKind(result.ticketId);
    clearLotteryTimers();
    L.pendingOutcome = { result, price, winTier };
    L.lastResult = null;
    L.winTier = null;
    L.displayDraw = result.draw ?? [];
    L.revealStep = 0;

    if (kind === "scratch") {
      L.drawing = false;
      L.scratching = true;
      L.scratchRevealed = false;
      persist();
      render();
      const scratchMs = timing.lotteryScratch ?? Math.max(400, Math.round((timing.rouletteSpin ?? 1200) * 0.7));
      scheduleLottery(() => {
        L.scratchRevealed = true;
        persist();
        render();
        scheduleLottery(() => finishPendingResult(), 450);
      }, scratchMs);
      return;
    }

    L.drawing = true;
    L.scratching = false;
    L.scratchRevealed = false;
    persist();
    render();

    const steps = result.draw?.length ?? 0;
    const stepMs = timing.lotteryBallStep ?? Math.max(120, Math.round(220 * (timing.speedMultiplier ?? 1)));
    for (let i = 1; i <= steps; i += 1) {
      scheduleLottery(() => {
        L.revealStep = i;
        persist();
        render();
      }, i * stepMs);
    }
    scheduleLottery(() => finishPendingResult(), steps * stepMs + 280);
  }

  function buyTicket() {
    const L = ensureLotteryState();
    if (L.drawing || L.scratching || L.pendingOutcome) return;

    const ticketId = L.lastTicketId || "pick3";
    const meta = TICKET_TYPES[ticketId];
    if (!meta) return;
    const tier = activeTier();
    const tierId = tier?.id ?? null;
    const price = scaledTicketPrice(meta.price, tierId);
    const kind = ticketKind(ticketId);

    if (!ctx.session.wallet.canAfford?.(price) && ctx.session.wallet.balance < price) {
      alert("Insufficient chips.");
      return;
    }

    let result;
    if (kind === "pick") {
      const digits = meta.digits;
      let picks = Array.isArray(L.luckyPicks) ? [...L.luckyPicks] : [];
      if (picks.length !== digits) picks = quickPickDigits(digits);
      L.luckyPicks = picks;
      if (!ctx.session.wallet.debit(price, "lottery", meta.name)) {
        alert("Insufficient chips.");
        return;
      }
      result = digits === 3
        ? resolvePick3(picks, price, { ticketId })
        : resolvePick4(picks, price, { ticketId });
    } else if (kind === "mega") {
      let balls = Array.isArray(L.luckyPicks) ? [...L.luckyPicks] : [];
      let powerball = L.powerball;
      if (balls.length !== MEGA_BALLS || powerball == null) {
        const qp = quickPickMega(meta.ballMax, meta.megaMax);
        balls = qp.balls;
        powerball = qp.mega;
        L.luckyPicks = balls;
        L.powerball = powerball;
      }
      const err = validateMegaPicks(balls, powerball, {
        ballMax: meta.ballMax,
        megaMax: meta.megaMax,
      });
      if (err) {
        alert(err);
        return;
      }
      if (!ctx.session.wallet.debit(price, "lottery", meta.name)) {
        alert("Insufficient chips.");
        return;
      }
      result = resolveMega(balls, powerball, price, { ticketId, tierId });
    } else {
      if (!ctx.session.wallet.debit(price, "lottery", meta.name)) {
        alert("Insufficient chips.");
        return;
      }
      result = resolveScratcher(ticketId, { tierId, price });
    }

    L.lastTicketId = ticketId;
    startDrawReveal(result, price);
  }

  function renderLottery() {
    const act = ACTIVITIES.lottery;
    const L = ensureLotteryState();
    if (!L.tier && runtime.stakeTier) L.tier = runtime.stakeTier;
    const tier = activeTier();
    applyTierSpeedCss(tier?.id);

    const cheapest = Math.min(...TICKET_ORDER.map((id) => scaledTicketPrice(TICKET_TYPES[id].price, tier?.id)));
    if (ctx.session.wallet.balance < Math.min(act.minBet, cheapest) && !L.drawing && !L.scratching) {
      return el("div", { className: "panel" }, [
        banner("Lottery Counter"),
        el("p", {
          className: "error",
          textContent: `You need at least ${act.minBet} chips for a ticket.`,
        }),
        el("div", { className: "action-bar" }, [
          el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
        ]),
      ]);
    }

    recordActivityVisit("lottery");
    persist();

    const ticketId = L.lastTicketId || "pick3";
    const meta = TICKET_TYPES[ticketId];
    const kind = ticketKind(ticketId);
    const price = scaledTicketPrice(meta.price, tier?.id);
    const scale = lotteryTierScale(tier?.id);
    const busy = Boolean(L.drawing || L.scratching || L.pendingOutcome);

    const ticketCards = TICKET_ORDER.map((id) => {
      const t = TICKET_TYPES[id];
      const p = scaledTicketPrice(t.price, tier?.id);
      const premium = t.price >= 25;
      return el("button", {
        type: "button",
        className: [
          "lottery-ticket-card",
          `lottery-ticket-card--${t.kind}`,
          premium ? "lottery-ticket-card--premium" : "",
          L.lastTicketId === id ? "lottery-ticket-card--active" : "",
        ].filter(Boolean).join(" "),
        disabled: busy,
        onclick: () => {
          if (busy) return;
          if (L.lastTicketId !== id) resetPickerForTicket(id);
          L.lastTicketId = id;
          persist();
          render();
        },
      }, [
        el("div", { className: "lottery-ticket-name", textContent: t.name }),
        el("div", { className: "lottery-ticket-price", textContent: `${p.toLocaleString()} chips` }),
        scale > 1 && p !== t.price
          ? el("div", {
            className: "lottery-ticket-scale",
            textContent: `Base ${t.price} · ${scale.toFixed(0)}× tier`,
          })
          : null,
        el("div", { className: "dim", textContent: t.description }),
      ]);
    });

    let selector = null;
    if (kind === "pick") {
      selector = buildDigitPad(meta.digits, L.luckyPicks, {
        disabled: busy,
        onChange: (next) => {
          L.luckyPicks = next;
          persist();
          render();
        },
      });
    } else if (kind === "mega") {
      selector = el("div", { className: "lottery-mega-selectors" }, [
        buildBallGrid({
          max: meta.ballMax ?? MEGA_BALL_MAX,
          count: MEGA_BALLS,
          selected: L.luckyPicks,
          label: `Lucky numbers — pick ${MEGA_BALLS} from 1–${meta.ballMax ?? MEGA_BALL_MAX}`,
          disabled: busy,
          onChange: (next) => {
            L.luckyPicks = next;
            persist();
            render();
          },
        }),
        buildBallGrid({
          max: meta.megaMax ?? MEGA_POWERBALL_MAX,
          count: 1,
          selected: L.powerball,
          label: `Powerball — pick 1 from 1–${meta.megaMax ?? MEGA_POWERBALL_MAX}`,
          powerballMode: true,
          disabled: busy,
          onChange: (next) => {
            L.powerball = next;
            persist();
            render();
          },
        }),
        el("div", { className: "lottery-selector-actions" }, [
          el("button", {
            type: "button",
            className: "btn primary",
            textContent: "Quick Pick all",
            disabled: busy,
            onclick: () => {
              const qp = quickPickMega(meta.ballMax, meta.megaMax);
              L.luckyPicks = qp.balls;
              L.powerball = qp.mega;
              persist();
              render();
            },
          }),
        ]),
      ]);
    } else {
      selector = el("p", {
        className: "dim lottery-scratch-hint",
        textContent: "Instant scratcher — no number pick needed. Buy to scratch the foil.",
      });
    }

    const overlay = (L.drawing || L.scratching)
      ? el("div", { className: "lottery-draw-overlay", "aria-live": "assertive" }, [
        el("div", { className: "lottery-draw-overlay-card" }, [
          el("div", {
            className: "lottery-draw-overlay-title",
            textContent: L.scratching ? "Scratching…" : "Drawing numbers…",
          }),
          L.scratching
            ? scratchPanel(L.pendingOutcome?.result, { revealed: L.scratchRevealed })
            : drawBallsRow(L.displayDraw, {
              revealCount: L.revealStep ?? 0,
              powerballIndex: kind === "mega" || ticketKind(L.pendingOutcome?.result?.ticketId ?? "") === "mega"
                ? (L.displayDraw?.length ?? 1) - 1
                : null,
            }),
        ]),
      ])
      : null;

    const resultBlock = el("div", { className: "lottery-result" });
    if (L.lastResult && !busy) {
      resultBlock.appendChild(winCallout(L.lastResult, L.winTier));
      if (L.lastResult.playerPicks?.length) {
        const picks = L.lastResult.playerPicks;
        const isMega = ticketKind(L.lastResult.ticketId) === "mega";
        const pickText = isMega
          ? `Your pick: ${picks.slice(0, -1).join(" ")} + PB ${picks[picks.length - 1]}`
          : `Your pick: ${picks.join(" ")}`;
        resultBlock.appendChild(el("p", { className: "dim", textContent: pickText }));
      }
      if (L.lastResult.draw?.length) {
        resultBlock.appendChild(drawBallsRow(L.lastResult.draw, {
          revealCount: L.lastResult.draw.length,
          powerballIndex: ticketKind(L.lastResult.ticketId) === "mega"
            ? L.lastResult.draw.length - 1
            : null,
        }));
      }
      if (ticketKind(L.lastResult.ticketId) === "scratch") {
        resultBlock.appendChild(scratchPanel(L.lastResult, { revealed: true }));
      }
    }

    const boost = getTierPayoutBoost(tier?.id);
    return el("div", { className: "panel lottery-panel" }, [
      banner(`Lottery Counter — ${getActivityBranding(ctx.session, "lottery", "Lottery").name}`),
      lotteryCabinet({
        celebrate: L.winTier && L.lastResult?.win > 0 ? L.winTier : null,
        screenChildren: [
          chipLine(),
          el("p", {
            className: "dim",
            textContent: `Stake tier: ${tier?.name ?? "Standard"} — ${boost.toFixed(0)}× price & prize scale · Session ${signedChips(L.sessionNet)} · ${L.tickets} ticket(s)`,
          }),
          el("div", { className: "lottery-ticket-grid" }, ticketCards),
          selector,
          resultBlock,
          overlay,
        ],
        baseChildren: [
          el("div", { className: "action-bar" }, [
            el("button", {
              className: "btn primary",
              textContent: busy ? "Drawing…" : `Buy ticket — ${price.toLocaleString()} chips`,
              disabled: busy,
              onclick: buyTicket,
            }),
            el("button", {
              className: "btn",
              textContent: "Leave counter",
              disabled: busy,
              onclick: () => {
                if (busy) return;
                clearLotteryTimers();
                recordActivityResult("lottery", L.sessionNet, L.tickets);
                runtime.lottery = {
                  sessionNet: 0,
                  tickets: 0,
                  lastResult: null,
                  lastTicketId: ticketId,
                  tier: L.tier,
                  luckyPicks: [],
                  powerball: null,
                  drawing: false,
                  scratching: false,
                  winTier: null,
                };
                persist();
                goBack();
              },
            }),
          ]),
        ],
      }),
    ]);
  }

  return { lottery: renderLottery };
}
