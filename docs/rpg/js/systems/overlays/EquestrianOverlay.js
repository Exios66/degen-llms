import { OverlayBase, actionRow } from "../OverlayBase.js";
import {
  generateDressage,
  simulateDressage,
  settleDressageTicket,
  generateJumper,
  simulateJumper,
  settleJumperTicket,
  fmtOddsEq,
} from "../../../../js/equestrian.js";
import { fmtChips } from "../../../../js/core.js";

export class EquestrianOverlay extends OverlayBase {
  /**
   * @param {HTMLElement} root
   * @param {*} session
   * @param {*} hooks
   * @param {"dressage"|"jumper"} mode
   */
  constructor(root, session, hooks, mode = "dressage") {
    super(root, session, hooks, mode);
    this.mode = mode;
    this.card = null;
    this.status = "";
  }

  open(options = {}) {
    if (options.mode) this.mode = options.mode;
    this.activityId = this.mode;
    this.card = this.mode === "jumper" ? generateJumper() : generateDressage();
    this.status = this.mode === "jumper"
      ? this.card.course
      : `${this.card.level} · ${this.card.arena}`;
    return super.open(options);
  }

  _render() {
    const title = this.mode === "jumper" ? "SHOW JUMPING" : "DRESSAGE";
    const panel = this._panel(title);
    this._msg(panel, this.status);
    const list = document.createElement("div");
    list.className = "bj-table encounter-scroll";
    for (const e of this.card.entries) {
      const row = document.createElement("div");
      row.className = "bj-row";
      row.textContent = `#${e.number} ${e.rider} / ${e.horse} · ${fmtOddsEq(e.odds)}`;
      list.appendChild(row);
    }
    panel.appendChild(list);

    if (!this.card.results) {
      const form = document.createElement("div");
      form.className = "bj-form";
      const entry = document.createElement("select");
      this.card.entries.forEach((e) => {
        const o = document.createElement("option");
        o.value = String(e.number);
        o.textContent = `#${e.number} ${e.rider}`;
        entry.appendChild(o);
      });
      const betType = document.createElement("select");
      const types = this.mode === "jumper" ? ["win", "place", "show", "clear"] : ["win", "place", "show"];
      types.forEach((t) => {
        const o = document.createElement("option");
        o.value = t;
        o.textContent = t.toUpperCase();
        betType.appendChild(o);
      });
      const amt = document.createElement("input");
      amt.type = "number";
      amt.min = "5";
      amt.value = "20";
      form.append(entry, betType, amt);
      panel.appendChild(form);

      actionRow(panel, [
        {
          label: "Bet & run",
          primary: true,
          onClick: () => {
            const amount = parseInt(amt.value, 10) || 0;
            const num = parseInt(entry.value, 10);
            const e = this.card.entries.find((x) => x.number === num);
            if (amount < 5 || !e) return;
            if (!this.session.wallet.debit(amount, this.mode, "Equestrian ticket")) {
              alert("Not enough chips.");
              return;
            }
            const slip = { entry: num, betType: betType.value, amount, odds: e.odds };
            const results = this.mode === "jumper"
              ? simulateJumper(this.card)
              : simulateDressage(this.card);
            const settled = this.mode === "jumper"
              ? settleJumperTicket(slip, results)
              : settleDressageTicket(slip, results);
            if (settled.payout > 0) {
              this.session.wallet.credit(settled.payout, this.mode, settled.reason);
            }
            this.sessionNet += settled.net;
            this.status = settled.reason;
            this.session.ensureRpgState().flags[`played_${this.mode}`] = true;
            this._render();
          },
        },
        { label: "Leave", onClick: () => this.close() },
      ]);
    } else {
      actionRow(panel, [
        {
          label: "New card",
          primary: true,
          onClick: () => {
            this.card = this.mode === "jumper" ? generateJumper() : generateDressage();
            this.status = this.mode === "jumper" ? this.card.course : `${this.card.level} · ${this.card.arena}`;
            this._render();
          },
        },
        { label: "Leave", onClick: () => this.close() },
      ]);
    }
  }
}
