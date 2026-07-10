import { OverlayBase, actionRow } from "../OverlayBase.js";
import { BET_TYPES, spinWheel, wheelColor, resolveBet } from "../../../../js/roulette.js";

export class RouletteOverlay extends OverlayBase {
  constructor(root, session, hooks) {
    super(root, session, hooks, "roulette");
    this.lastResult = null;
  }

  _render() {
    const panel = this._panel(`ROULETTE · ${this._options.dealerName ?? "Croupier"}`);
    if (this.lastResult) {
      this._msg(panel, this.lastResult, this.lastResult.includes("Winner") || this.lastResult.includes("Hit") ? "success" : "");
    } else {
      this._msg(panel, "European single-zero. Place a bet.");
    }

    const form = document.createElement("div");
    form.className = "bj-form encounter-form";
    const betSel = document.createElement("select");
    BET_TYPES.forEach((b, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = b.label;
      betSel.appendChild(opt);
    });
    form.appendChild(betSel);

    const straight = document.createElement("input");
    straight.type = "number";
    straight.min = "0";
    straight.max = "36";
    straight.value = "17";
    straight.placeholder = "Straight #";
    form.appendChild(straight);

    const amount = document.createElement("input");
    amount.type = "number";
    amount.min = "5";
    amount.max = String(Math.min(500, this.session.wallet.balance));
    amount.value = "10";
    form.appendChild(amount);
    panel.appendChild(form);

    actionRow(panel, [
      {
        label: "Spin",
        primary: true,
        onClick: () => {
          const bet = BET_TYPES[parseInt(betSel.value, 10)];
          const amt = parseInt(amount.value, 10) || 0;
          if (amt < 5) { alert("Minimum $5."); return; }
          if (!this.session.wallet.debit(amt, "roulette", bet.label)) {
            alert("Not enough chips.");
            return;
          }
          const number = spinWheel();
          const color = wheelColor(number);
          const pick = bet.kind === "straight" ? parseInt(straight.value, 10) : null;
          const result = resolveBet(bet, amt, number, pick);
          if (result.win > 0) {
            this.session.wallet.credit(result.win, "roulette", result.reason);
            this.sessionNet += result.win - amt;
          } else {
            this.sessionNet -= amt;
          }
          this.lastResult = `Ball: ${number} (${color}). ${result.reason}`;
          if (this.session.rpg) this.session.rpg.flags = this.session.rpg.flags || {};
          this.session.ensureRpgState().flags.played_roulette = true;
          this._render();
        },
      },
      { label: "Leave table", onClick: () => this.close() },
    ]);
  }
}
