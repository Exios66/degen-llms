import { OverlayBase, actionRow } from "../OverlayBase.js";
import { generateRace, simulateRace, settleTicket, fmtOdds } from "../../../../js/horse_racing.js";
import { fmtChips } from "../../../../js/core.js";

export class HorseRacingOverlay extends OverlayBase {
  constructor(root, session, hooks) {
    super(root, session, hooks, "horse_racing");
    this.card = null;
    this.status = "";
    this.pending = [];
  }

  open(options = {}) {
    this.card = generateRace(this.session);
    this.status = this.card.label;
    this.pending = [];
    return super.open(options);
  }

  _render() {
    const panel = this._panel("RACING PAVILION");
    this._msg(panel, this.status);
    const list = document.createElement("div");
    list.className = "bj-table encounter-scroll";
    for (const h of this.card.horses) {
      const row = document.createElement("div");
      row.className = "bj-row";
      row.textContent = `#${h.number} ${h.name} · ${fmtOdds(h.odds)}`;
      list.appendChild(row);
    }
    if (this.card.results) {
      list.appendChild(Object.assign(document.createElement("div"), {
        className: "bj-row highlight",
        textContent: `Finish: ${this.card.results.map((n) => `#${n}`).join(" → ")}`,
      }));
    }
    panel.appendChild(list);

    if (!this.card.results) {
      const form = document.createElement("div");
      form.className = "bj-form";
      const horse = document.createElement("select");
      this.card.horses.forEach((h) => {
        const o = document.createElement("option");
        o.value = String(h.number);
        o.textContent = `#${h.number} ${h.name}`;
        horse.appendChild(o);
      });
      const betType = document.createElement("select");
      ["win", "place", "show"].forEach((t) => {
        const o = document.createElement("option");
        o.value = t;
        o.textContent = t.toUpperCase();
        betType.appendChild(o);
      });
      const amt = document.createElement("input");
      amt.type = "number";
      amt.min = "5";
      amt.value = "20";
      form.append(horse, betType, amt);
      panel.appendChild(form);

      actionRow(panel, [
        {
          label: "Bet & race",
          primary: true,
          onClick: () => {
            const amount = parseInt(amt.value, 10) || 0;
            const num = parseInt(horse.value, 10);
            const h = this.card.horses.find((x) => x.number === num);
            if (amount < 5 || !h) return;
            if (!this.session.wallet.debit(amount, "horse_racing", "Race ticket")) {
              alert("Not enough chips.");
              return;
            }
            const slip = { horse: num, betType: betType.value, amount, odds: h.odds };
            const results = simulateRace(this.card);
            const settled = settleTicket(slip, results);
            if (settled.payout > 0) {
              this.session.wallet.credit(settled.payout, "horse_racing", settled.reason);
            }
            this.sessionNet += settled.net;
            this.status = settled.reason;
            this.session.ensureRpgState().flags.played_horse_racing = true;
            this._render();
          },
        },
        { label: "New card", onClick: () => { this.card = generateRace(this.session); this.status = this.card.label; this._render(); } },
        { label: "Leave", onClick: () => this.close() },
      ]);
    } else {
      actionRow(panel, [
        { label: "New race", primary: true, onClick: () => { this.card = generateRace(this.session); this.status = this.card.label; this._render(); } },
        { label: "Leave", onClick: () => this.close() },
      ]);
    }
  }
}
