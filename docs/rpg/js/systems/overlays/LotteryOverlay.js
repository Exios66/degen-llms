import { OverlayBase, actionRow } from "../OverlayBase.js";
import {
  TICKET_TYPES,
  quickPickDigits,
  resolvePick3,
  resolvePick4,
  resolveScratcher,
  resolveMega,
  quickPickMega,
} from "../../../../js/lottery.js";
import { fmtChips } from "../../../../js/core.js";

export class LotteryOverlay extends OverlayBase {
  constructor(root, session, hooks) {
    super(root, session, hooks, "lottery");
    this.lastResult = null;
  }

  open(options = {}) {
    this.lastResult = null;
    return super.open(options);
  }

  _render() {
    const panel = this._panel("LOTTERY COUNTER");
    this._msg(panel, this.lastResult?.reason || "Pick a ticket. Quick Pick fills blank entries.");

    const form = document.createElement("div");
    form.className = "bj-form";
    const sel = document.createElement("select");
    Object.values(TICKET_TYPES).forEach((t) => {
      const o = document.createElement("option");
      o.value = t.id;
      o.textContent = `${t.name} (${t.price})`;
      sel.appendChild(o);
    });
    form.appendChild(sel);
    panel.appendChild(form);

    actionRow(panel, [
      {
        label: "Buy ticket",
        primary: true,
        onClick: () => {
          const id = sel.value;
          const meta = TICKET_TYPES[id];
          if (!this.session.wallet.debit(meta.price, "lottery", meta.name)) {
            alert("Not enough chips.");
            return;
          }
          this.sessionNet -= meta.price;
          let result;
          if (id === "pick3") result = resolvePick3(quickPickDigits(3), meta.price);
          else if (id === "pick4") result = resolvePick4(quickPickDigits(4), meta.price);
          else if (id === "mega") {
            const { balls, mega } = quickPickMega();
            result = resolveMega(balls, mega, meta.price);
          } else {
            result = resolveScratcher(id);
          }
          if (result.win > 0) {
            this.session.wallet.credit(result.win, "lottery", result.reason);
            this.sessionNet += result.win;
          }
          this.lastResult = result;
          this.session.ensureRpgState().flags.played_lottery = true;
          this._render();
        },
      },
      { label: "Leave", onClick: () => this.close() },
    ]);

    if (this.lastResult?.win > 0) {
      const win = document.createElement("div");
      win.className = "bj-status success";
      win.textContent = `Paid ${fmtChips(this.lastResult.win)}`;
      panel.appendChild(win);
    }
  }
}
