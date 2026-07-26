// Extracted from app.js — shared by the web terminal and the pixel RPG.
import { ACTIVITIES, fmtChips, signedChips } from "../core.js";
import { CrapsTable } from "../craps.js";
import { effectiveTableStakes } from "../stakes.js";
import { resolveActivityMin } from "../salon-exclusives.js";

export function buildCrapsRenderers(ctx) {
  const { el, dealerPanel, videoMachine, machineLog, goBack, render, persist,
    recordActivityVisit, recordActivityResult } = ctx;
  const runtime = ctx.runtime;

  function ensureCrapsTable() {
    if (!runtime.craps.table) runtime.craps.table = new CrapsTable();
    return runtime.craps.table;
  }

  function renderCrapsDice(roll) {
    if (!roll) {
      return el("div", { className: "craps-dice craps-dice--idle", textContent: "⚄ ⚀" });
    }
    return el("div", { className: "craps-dice" }, [
      el("span", { className: "craps-die", textContent: String(roll.die1) }),
      el("span", { className: "craps-die", textContent: String(roll.die2) }),
      el("span", { className: "craps-total", textContent: `= ${roll.total}${roll.isHard ? " hard" : ""}` }),
    ]);
  }

  function renderCraps() {
    const act = ACTIVITIES.craps;
    if (ctx.session.wallet.balance < act.minBet && !runtime.craps.lineBet && !Object.keys(runtime.craps.hardways || {}).length) {
      return videoMachine("craps", {
        title: "CRAPS",
        screenChildren: [el("p", { className: "error", textContent: `You need at least ${act.minBet} chips to shoot.` })],
        controls: el("div", { className: "action-bar" }, [
          el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
        ]),
      });
    }
    recordActivityVisit("craps");
    persist();
    const table = ensureCrapsTable();
    const tier = runtime.craps.tier ?? runtime.stakeTier;
    const activityMin = resolveActivityMin(runtime, act.minBet);
    const wagerStakes = tier
      ? effectiveTableStakes(tier, ctx.session.wallet.balance, activityMin)
      : { minBet: activityMin, maxBet: ctx.session.wallet.balance };
    const remembered = Number.isFinite(runtime.craps.lastWager)
      ? Math.min(wagerStakes.maxBet, Math.max(wagerStakes.minBet, runtime.craps.lastWager))
      : wagerStakes.minBet;

    const lineSelect = el("select", {}, [
      el("option", { value: "pass", textContent: "Pass Line" }),
      el("option", { value: "dont", textContent: "Don't Pass" }),
      el("option", { value: "none", textContent: "No new line (props only)" }),
    ]);
    if (runtime.craps.lineBet) lineSelect.disabled = true;
    const amountInput = el("input", {
      type: "number",
      min: String(wagerStakes.minBet),
      max: String(wagerStakes.maxBet),
      value: String(remembered),
    });
    const fieldInput = el("input", { type: "number", min: "0", max: String(wagerStakes.maxBet), value: "0" });
    const anyCrapsInput = el("input", { type: "number", min: "0", max: String(wagerStakes.maxBet), value: "0" });
    const anySevenInput = el("input", { type: "number", min: "0", max: String(wagerStakes.maxBet), value: "0" });

    const phaseLabel = table.point ? `POINT ${table.point}` : "COME-OUT";
    const workingLine = runtime.craps.lineBet
      ? `${runtime.craps.lineBet.kind === "dont" ? "Don't Pass" : "Pass Line"} ${fmtChips(runtime.craps.lineBet.amount)}`
      : "none";

    function leaveCraps() {
      if (runtime.craps.lineBet) {
        ctx.session.wallet.credit(runtime.craps.lineBet.amount, "craps", "Craps leave — line returned");
        runtime.craps.sessionNet += runtime.craps.lineBet.amount;
        runtime.craps.lineBet = null;
      }
      for (const [id, amt] of Object.entries(runtime.craps.hardways || {})) {
        ctx.session.wallet.credit(amt, "craps", `Craps leave — ${id} returned`);
        runtime.craps.sessionNet += amt;
      }
      runtime.craps.hardways = {};
      recordActivityResult("craps", runtime.craps.sessionNet, runtime.craps.rolls);
      persist();
      runtime.craps.table = null;
      runtime.craps.log = [];
      goBack();
    }

    function doRoll() {
      const sideStakes = {};
      const sides = [
        ["field", parseInt(fieldInput.value, 10) || 0],
        ["any_craps", parseInt(anyCrapsInput.value, 10) || 0],
        ["any_seven", parseInt(anySevenInput.value, 10) || 0],
      ];
      for (const [id, amt] of sides) {
        if (amt <= 0) continue;
        if (amt < wagerStakes.minBet) { alert(`Side bets need at least ${wagerStakes.minBet}.`); return; }
        if (!ctx.session.wallet.debit(amt, "craps", `Craps ${id}`)) { alert("Insufficient chips."); return; }
        sideStakes[id] = amt;
        runtime.craps.sessionNet -= amt;
      }

      if (!runtime.craps.lineBet) {
        const kind = lineSelect.value;
        if (kind !== "none") {
          const amount = parseInt(amountInput.value, 10);
          if (amount < wagerStakes.minBet) { alert(`Minimum line bet is ${wagerStakes.minBet}.`); return; }
          if (!ctx.session.wallet.debit(amount, "craps", `Craps ${kind}`)) { alert("Insufficient chips."); return; }
          runtime.craps.lineBet = { kind, amount };
          runtime.craps.lastWager = amount;
          runtime.craps.sessionNet -= amount;
        } else if (!Object.keys(sideStakes).length) {
          alert("Place a line bet or at least one side bet.");
          return;
        }
      }

      const pointBefore = table.point;
      const roll = table.roll();
      runtime.craps.rolls += 1;
      const messages = [`🎲 ${roll.label}`];

      if (runtime.craps.lineBet) {
        const result = runtime.craps.lineBet.kind === "pass"
          ? table.resolvePassLine(runtime.craps.lineBet.amount, roll)
          : table.resolveDontPass(runtime.craps.lineBet.amount, roll, pointBefore);
        messages.push(result.message);
        if (!result.working) {
          if (result.payout > 0) {
            ctx.session.wallet.credit(result.payout, "craps", result.message);
            runtime.craps.sessionNet += result.payout;
          }
          runtime.craps.lineBet = null;
        }
      }

      for (const [id, amt] of Object.entries(sideStakes)) {
        const result = table.resolveSideBet(id, amt, roll);
        messages.push(result.message);
        if (result.payout > 0) {
          ctx.session.wallet.credit(result.payout, "craps", result.message);
          runtime.craps.sessionNet += result.payout;
        }
      }

      for (const [id, amt] of Object.entries({ ...runtime.craps.hardways })) {
        const result = table.resolveSideBet(id, amt, roll);
        messages.push(result.message);
        if (!result.working) {
          delete runtime.craps.hardways[id];
          if (result.payout > 0) {
            ctx.session.wallet.credit(result.payout, "craps", result.message);
            runtime.craps.sessionNet += result.payout;
          }
        }
      }

      runtime.craps.log = [...messages, ...(runtime.craps.log || [])].slice(0, 12);
      persist();
      render();
    }

    function pressHardway(id) {
      const amount = parseInt(amountInput.value, 10) || wagerStakes.minBet;
      if (runtime.craps.hardways[id]) { alert("That hardway is already working."); return; }
      if (amount < wagerStakes.minBet) { alert(`Minimum is ${wagerStakes.minBet}.`); return; }
      if (!ctx.session.wallet.debit(amount, "craps", `Craps ${id}`)) { alert("Insufficient chips."); return; }
      runtime.craps.hardways[id] = amount;
      runtime.craps.lastWager = amount;
      runtime.craps.sessionNet -= amount;
      runtime.craps.log = [`Hardway ${id} pressed for ${fmtChips(amount)}.`, ...(runtime.craps.log || [])].slice(0, 12);
      persist();
      render();
    }

    return videoMachine("craps", {
      title: "CRAPS",
      screenChildren: [
        dealerPanel("craps"),
        el("p", {
          className: "machine-status",
          textContent: `${phaseLabel} · Line ${workingLine} · Session ${signedChips(runtime.craps.sessionNet)} · ${runtime.craps.rolls} roll(s)`,
        }),
        renderCrapsDice(table.lastRoll),
        el("div", { className: "craps-point-lamp" }, [
          el("span", { textContent: table.point ? `Point: ${table.point}` : "Come-out" }),
        ]),
        machineLog(runtime.craps.log || [], { max: 10 }),
        el("div", { className: "form-row" }, [el("label", { textContent: "Line" }), lineSelect]),
        el("div", { className: "form-row" }, [el("label", { textContent: "Amount" }), amountInput]),
        el("div", { className: "craps-sides" }, [
          el("div", { className: "form-row" }, [el("label", { textContent: "Field" }), fieldInput]),
          el("div", { className: "form-row" }, [el("label", { textContent: "Any Craps" }), anyCrapsInput]),
          el("div", { className: "form-row" }, [el("label", { textContent: "Any Seven" }), anySevenInput]),
        ]),
      ],
      controls: el("div", { className: "action-bar" }, [
        el("button", { className: "btn primary", textContent: "Roll dice", onclick: doRoll }),
        el("button", { className: "btn", textContent: "Hard 4", onclick: () => pressHardway("hard_4") }),
        el("button", { className: "btn", textContent: "Hard 6", onclick: () => pressHardway("hard_6") }),
        el("button", { className: "btn", textContent: "Hard 8", onclick: () => pressHardway("hard_8") }),
        el("button", { className: "btn", textContent: "Hard 10", onclick: () => pressHardway("hard_10") }),
        el("button", { className: "btn", textContent: "Leave table", onclick: leaveCraps }),
      ]),
      footerExtra: el("span", { className: "machine-led", textContent: phaseLabel }),
    });
  }

  return { craps: renderCraps };
}
