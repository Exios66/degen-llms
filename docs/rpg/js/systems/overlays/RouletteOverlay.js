import { OverlayBase, actionRow } from "../OverlayBase.js";
import { BET_TYPES, spinWheel, wheelColor, resolveBet, appendSpinHistory } from "../../../../js/roulette.js";

export class RouletteOverlay extends OverlayBase {
  constructor(root, session, hooks) {
    super(root, session, hooks, "roulette");
    this.lastResult = null;
    this.history = [];
    this.historyPulse = false;
    this.lastWager = 10;
  }

  open(options = {}) {
    this.lastResult = null;
    this.history = [];
    this.historyPulse = false;
    return super.open(options);
  }

  _renderHistory(panel) {
    const wrap = document.createElement("div");
    wrap.className = `roulette-history${this.historyPulse ? " roulette-history--pulse" : ""}`;
    const label = document.createElement("div");
    label.className = "roulette-history-label";
    label.textContent = "Spin history";
    wrap.appendChild(label);
    const track = document.createElement("div");
    track.className = "roulette-history-track";
    if (!this.history.length) {
      const empty = document.createElement("span");
      empty.className = "roulette-history-empty";
      empty.textContent = "Results appear here as the wheel spins";
      track.appendChild(empty);
    } else {
      this.history.forEach((entry, i) => {
        const chip = document.createElement("div");
        chip.className = [
          "roulette-history-chip",
          `roulette-history-chip--${entry.color}`,
          i === 0 && this.historyPulse ? "roulette-history-chip--enter" : "",
        ].filter(Boolean).join(" ");
        chip.textContent = String(entry.number);
        chip.title = `${entry.number} · ${entry.color}`;
        track.appendChild(chip);
      });
    }
    wrap.appendChild(track);
    panel.appendChild(wrap);
    this.historyPulse = false;
  }

  _render() {
    const panel = this._panel(`ROULETTE · ${this._options.dealerName ?? "Croupier"}`);
    if (this.lastResult) {
      this._msg(panel, this.lastResult, this.lastResult.includes("Winner") || this.lastResult.includes("Hit") ? "success" : "");
    } else {
      this._msg(panel, "European single-zero. Place a bet.");
    }
    this._renderHistory(panel);

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

    const maxWager = Math.min(500, this.session.wallet.balance);
    const remembered = Number.isFinite(this.lastWager)
      ? Math.min(maxWager, Math.max(5, this.lastWager))
      : 10;
    const amount = document.createElement("input");
    amount.type = "number";
    amount.min = "5";
    amount.max = String(maxWager);
    amount.value = String(remembered);
    amount.oninput = () => {
      const typed = parseInt(amount.value, 10);
      if (Number.isFinite(typed) && typed > 0) this.lastWager = typed;
    };
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
          this.lastWager = amt;
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
          this.history = appendSpinHistory(this.history, number, { limit: 18 });
          this.historyPulse = true;
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
