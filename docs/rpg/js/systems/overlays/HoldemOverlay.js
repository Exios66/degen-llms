import { OverlayBase, actionRow } from "../OverlayBase.js";
import { HoldemTable, BettingAction } from "../../../../js/holdem/game.js";
import { fmtChips } from "../../../../js/core.js";

export class HoldemOverlay extends OverlayBase {
  constructor(root, session, hooks) {
    super(root, session, hooks, "holdem");
    this.table = null;
    this.buyIn = 0;
    this.phase = "buyin";
  }

  open(options = {}) {
    this.table = null;
    this.buyIn = 0;
    this.phase = "buyin";
    return super.open(options);
  }

  close() {
    if (this.table && this.buyIn > 0) {
      const stack = this.table.human.stack;
      if (stack > 0) {
        this.session.wallet.credit(stack, "holdem", "Cash out");
      }
      this.sessionNet += stack - this.buyIn;
    }
    this.table = null;
    super.close();
  }

  _render() {
    if (this.phase === "buyin") {
      const panel = this._panel(`TEXAS HOLD'EM · ${this._options.dealerName ?? "Dealer"}`);
      this._msg(panel, "Buy in to sit. Blinds scale with your stack.");
      const form = document.createElement("div");
      form.className = "bj-form";
      const input = document.createElement("input");
      input.type = "number";
      const max = this.session.wallet.balance;
      input.min = "10";
      input.max = String(max);
      input.value = String(Math.min(200, Math.max(10, max)));
      form.appendChild(input);
      panel.appendChild(form);
      actionRow(panel, [
        {
          label: "Sit down",
          primary: true,
          onClick: () => {
            const amt = parseInt(input.value, 10) || 0;
            if (amt < 10) { alert("Minimum buy-in $10."); return; }
            if (!this.session.wallet.debit(amt, "holdem", "Buy-in")) {
              alert("Not enough chips.");
              return;
            }
            this.buyIn = amt;
            this.table = HoldemTable.quickTable(amt, 2);
            this.table.startHand();
            this.phase = "play";
            this.session.ensureRpgState().flags.played_holdem = true;
            this._runBots();
            this._render();
          },
        },
        { label: "Leave", onClick: () => this.close() },
      ]);
      return;
    }

    const t = this.table;
    const panel = this._panel(`HOLD'EM · Pot ${fmtChips(t.pot)}`);
    this._msg(panel, t.lastMessage || t.street);
    const board = document.createElement("div");
    board.className = "bj-table";
    const uni = this.session.useUnicode;
    const rows = t.players.map((p) => {
      const cards = p.isHuman || t.handOver
        ? p.hole.map((c) => c.label(uni)).join(" ")
        : "?? ??";
      return `<div class="bj-row${p.isHuman ? " highlight" : ""}">${p.name}: ${cards} · stack ${fmtChips(p.stack)}${p.folded ? " [FOLD]" : ""}</div>`;
    }).join("");
    board.innerHTML = `<div class="bj-dealer">Board: ${t.community.map((c) => c.label(uni)).join(" ") || "—"}</div>${rows}`;
    panel.appendChild(board);

    if (t.handOver) {
      actionRow(panel, [
        {
          label: "Next hand",
          primary: true,
          onClick: () => {
            if (t.human.stack <= 0) {
              alert("Busted.");
              this.close();
              return;
            }
            t.startHand();
            this._runBots();
            this._render();
          },
        },
        { label: "Cash out", onClick: () => this.close() },
      ]);
      return;
    }

    const actor = t.players[t.actionIndex];
    if (!actor?.isHuman) {
      this._runBots();
      this._render();
      return;
    }

    const toCall = Math.max(0, t.currentBet - actor.betThisStreet);
    const legal = t.legalActions(actor);
    const buttons = [];
    if (legal.has(BettingAction.CHECK)) {
      buttons.push({ label: "Check", primary: true, onClick: () => this._act(BettingAction.CHECK) });
    }
    if (legal.has(BettingAction.CALL)) {
      buttons.push({ label: `Call ${fmtChips(toCall)}`, primary: true, onClick: () => this._act(BettingAction.CALL) });
    }
    if (legal.has(BettingAction.RAISE)) {
      buttons.push({ label: "Raise", onClick: () => this._act(BettingAction.RAISE) });
    }
    if (legal.has(BettingAction.FOLD)) {
      buttons.push({ label: "Fold", onClick: () => this._act(BettingAction.FOLD) });
    }
    buttons.push({ label: "Cash out", onClick: () => this.close() });
    actionRow(panel, buttons);
  }

  _act(action) {
    const actor = this.table.players[this.table.actionIndex];
    this.table.applyAction(actor, action);
    this._runBots();
    this._render();
  }

  _runBots() {
    let guard = 0;
    while (!this.table.handOver && guard++ < 48) {
      const actor = this.table.players[this.table.actionIndex];
      if (!actor || actor.isHuman) break;
      const act = this.table.botAction(actor);
      this.table.applyAction(actor, act);
    }
  }
}
