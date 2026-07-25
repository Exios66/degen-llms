// Extracted from app.js — shared by the web terminal and the pixel RPG.
import { ACTIVITIES, signedChips } from "../core.js";
import {
  TICKET_TYPES, parsePickInput, quickPickDigits, quickPickMega,
  resolveMega, resolvePick3, resolvePick4, resolveScratcher,
} from "../lottery.js";

export function buildLotteryRenderers(ctx) {
  const { el, banner, chipLine, goBack, render, persist,
    recordActivityVisit, recordActivityResult } = ctx;
  const runtime = ctx.runtime;

  function renderLottery() {
    const act = ACTIVITIES.lottery;
    if (ctx.session.wallet.balance < act.minBet) {
      return el("div", { className: "panel" }, [
        banner("Lottery Counter"),
        el("p", { className: "error", textContent: `You need at least ${act.minBet} chips for a ticket.` }),
        el("div", { className: "action-bar" }, [
          el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
        ]),
      ]);
    }
    recordActivityVisit("lottery");
    persist();

    const ticketIds = Object.keys(TICKET_TYPES);
    const ticketSelect = el("select", {}, ticketIds.map((id) =>
      el("option", {
        value: id,
        textContent: `${TICKET_TYPES[id].name} — ${TICKET_TYPES[id].price} chips`,
        selected: id === runtime.lottery.lastTicketId,
      })
    ));
    const picksInput = el("input", {
      type: "text",
      placeholder: "Digits / balls (blank = Quick Pick)",
      value: "",
    });
    const megaInput = el("input", { type: "number", min: "1", max: "20", value: "7" });
    const resultEl = el("div", { className: "lottery-result" });
    if (runtime.lottery.lastResult) {
      const r = runtime.lottery.lastResult;
      resultEl.appendChild(el("p", {
        className: r.win > 0 ? "success" : "dim",
        textContent: r.reason,
      }));
      if (r.playerPicks?.length) {
        resultEl.appendChild(el("p", { className: "dim", textContent: `Your pick: ${r.playerPicks.join(" ")}` }));
      }
      if (r.draw?.length) {
        resultEl.appendChild(el("p", { className: "lottery-draw", textContent: `Draw: ${r.draw.join(" ")}` }));
      }
    }

    function buyTicket() {
      const ticketId = ticketSelect.value;
      const meta = TICKET_TYPES[ticketId];
      const price = meta.price;
      if (!ctx.session.wallet.canAfford?.(price) && ctx.session.wallet.balance < price) {
        alert("Insufficient chips.");
        return;
      }
      let result;
      if (ticketId === "pick3" || ticketId === "pick4") {
        const digits = meta.digits;
        let picks = parsePickInput(picksInput.value, digits);
        if (!picks) picks = quickPickDigits(digits);
        if (!ctx.session.wallet.debit(price, "lottery", meta.name)) { alert("Insufficient chips."); return; }
        result = ticketId === "pick3" ? resolvePick3(picks, price) : resolvePick4(picks, price);
      } else if (ticketId === "mega") {
        let balls;
        let mega;
        const raw = picksInput.value.trim();
        if (raw) {
          balls = raw.split(/[,\s]+/).map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n));
          balls = [...new Set(balls)].sort((a, b) => a - b);
          if (balls.length !== 5 || balls.some((b) => b < 1 || b > 45)) {
            alert("Enter five unique balls from 1–45.");
            return;
          }
          mega = parseInt(megaInput.value, 10) || 7;
        } else {
          ({ balls, mega } = quickPickMega());
        }
        if (!ctx.session.wallet.debit(price, "lottery", meta.name)) { alert("Insufficient chips."); return; }
        result = resolveMega(balls, mega, price);
      } else {
        if (!ctx.session.wallet.debit(price, "lottery", meta.name)) { alert("Insufficient chips."); return; }
        result = resolveScratcher(ticketId);
      }
      runtime.lottery.tickets += 1;
      runtime.lottery.sessionNet -= price;
      runtime.lottery.lastTicketId = ticketId;
      if (result.win > 0) {
        ctx.session.wallet.credit(result.win, "lottery", result.reason);
        runtime.lottery.sessionNet += result.win;
      }
      runtime.lottery.lastResult = result;
      persist();
      render();
    }

    return el("div", { className: "panel lottery-panel" }, [
      banner("Lottery Counter — Mandalay Lottery"),
      chipLine(),
      el("p", {
        className: "dim",
        textContent: `Session ${signedChips(runtime.lottery.sessionNet)} · ${runtime.lottery.tickets} ticket(s)`,
      }),
      el("div", { className: "lottery-ticket-grid" }, ticketIds.map((id) => {
        const t = TICKET_TYPES[id];
        return el("button", {
          className: `lottery-ticket-card${runtime.lottery.lastTicketId === id ? " lottery-ticket-card--active" : ""}`,
          onclick: () => { ticketSelect.value = id; runtime.lottery.lastTicketId = id; render(); },
        }, [
          el("div", { className: "lottery-ticket-name", textContent: t.name }),
          el("div", { className: "lottery-ticket-price", textContent: `${t.price} chips` }),
          el("div", { className: "dim", textContent: t.description }),
        ]);
      })),
      el("div", { className: "form-row" }, [el("label", { textContent: "Ticket" }), ticketSelect]),
      el("div", { className: "form-row" }, [el("label", { textContent: "Numbers (optional)" }), picksInput]),
      el("div", { className: "form-row" }, [el("label", { textContent: "Mega ball" }), megaInput]),
      resultEl,
      el("div", { className: "action-bar" }, [
        el("button", { className: "btn primary", textContent: "Buy ticket", onclick: buyTicket }),
        el("button", {
          className: "btn",
          textContent: "Leave counter",
          onclick: () => {
            recordActivityResult("lottery", runtime.lottery.sessionNet, runtime.lottery.tickets);
            persist();
            goBack();
          },
        }),
      ]),
    ]);
  }

  return { lottery: renderLottery };
}
