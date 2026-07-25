import { OverlayBase, actionRow } from "../OverlayBase.js";
import { CrapsTable } from "../../../../js/craps.js";
import { fmtChips } from "../../../../js/core.js";

export class CrapsOverlay extends OverlayBase {
  constructor(root, session, hooks) {
    super(root, session, hooks, "craps");
    this.table = null;
    this.lineBet = null;
    this.log = [];
  }

  open(options = {}) {
    this.table = new CrapsTable();
    this.lineBet = null;
    this.log = [];
    return super.open(options);
  }

  _render() {
    const t = this.table;
    const panel = this._panel(`CRAPS · ${this._options.dealerName ?? "Dice Delgado"}`);
    const phase = t.point ? `Point ${t.point}` : "Come-out";
    this._msg(panel, `${phase}. ${t.message || "Place a Pass Line bet and roll."}`);

    const board = document.createElement("div");
    board.className = "bj-table";
    const roll = t.lastRoll ? t.lastRoll.label : "—";
    const line = this.lineBet
      ? `${this.lineBet.kind === "dont" ? "Don't Pass" : "Pass"} ${fmtChips(this.lineBet.amount)}`
      : "none";
    board.innerHTML = `
      <div class="bj-dealer">Last roll: ${roll}</div>
      <div class="bj-row">Working line: ${line}</div>
      ${(this.log || []).slice(0, 6).map((l) => `<div class="bj-row dim">${l}</div>`).join("")}
    `;
    panel.appendChild(board);

    const form = document.createElement("div");
    form.className = "bj-form";
    const lineSel = document.createElement("select");
    [["pass", "Pass Line"], ["dont", "Don't Pass"]].forEach(([v, label]) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = label;
      lineSel.appendChild(o);
    });
    if (this.lineBet) lineSel.disabled = true;
    const amt = document.createElement("input");
    amt.type = "number";
    amt.min = "5";
    amt.value = "10";
    form.append(lineSel, amt);
    panel.appendChild(form);

    actionRow(panel, [
      {
        label: "Roll",
        primary: true,
        onClick: () => {
          if (!this.lineBet) {
            const amount = parseInt(amt.value, 10) || 0;
            if (amount < 5) { alert("Minimum $5."); return; }
            if (!this.session.wallet.debit(amount, "craps", "Pass/Don't")) {
              alert("Not enough chips.");
              return;
            }
            this.lineBet = { kind: lineSel.value, amount };
            this.sessionNet -= amount;
          }
          const pointBefore = t.point;
          const rollResult = t.roll();
          const resolved = this.lineBet.kind === "pass"
            ? t.resolvePassLine(this.lineBet.amount, rollResult)
            : t.resolveDontPass(this.lineBet.amount, rollResult, pointBefore);
          this.log = [resolved.message, ...this.log].slice(0, 8);
          if (!resolved.working) {
            if (resolved.payout > 0) {
              this.session.wallet.credit(resolved.payout, "craps", resolved.message);
              this.sessionNet += resolved.payout;
            }
            this.lineBet = null;
          }
          this.session.ensureRpgState().flags.played_craps = true;
          this._render();
        },
      },
      {
        label: "Leave",
        onClick: () => {
          if (this.lineBet) {
            this.session.wallet.credit(this.lineBet.amount, "craps", "Line returned");
            this.sessionNet += this.lineBet.amount;
            this.lineBet = null;
          }
          this.close();
        },
      },
    ]);
  }
}
