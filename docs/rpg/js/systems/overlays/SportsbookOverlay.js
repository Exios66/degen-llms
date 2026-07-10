import { OverlayBase, actionRow } from "../OverlayBase.js";
import {
  SportsbookState,
  fmtOdds,
  oddsForSelection,
  filterEvents,
} from "../../../../js/sportsbook.js";
import { fmtChips } from "../../../../js/core.js";

export class SportsbookOverlay extends OverlayBase {
  constructor(root, session, hooks) {
    super(root, session, hooks, "sportsbook");
    this.state = null;
    this.status = "";
    this.selected = null;
  }

  async open(options = {}) {
    if (this._active) return { net: 0 };
    this._active = true;
    this.sessionNet = 0;
    this._options = options;
    this.status = "Loading board…";
    this.selected = null;
    this.state = SportsbookState.fromJSON(this.session.sportsbookData ?? null);
    this.session.recordVisit(this.activityId);
    this.root.hidden = false;
    this.root.classList.add("encounter-overlay--active");
    const p = new Promise((resolve) => { this._resolve = resolve; });
    this._render();
    try {
      await this.state.init();
      this.status = "Board ready. Pick a moneyline.";
    } catch (err) {
      this.status = `Board error: ${err.message}`;
    }
    this._sync();
    this._render();
    return p;
  }

  close() {
    this._sync();
    super.close();
  }

  _sync() {
    if (this.state) this.session.sportsbookData = this.state.toJSON();
  }

  _render() {
    const panel = this._panel("SPORTS BOOK");
    this._msg(panel, this.status);

    if (!this.state?.events?.length) {
      actionRow(panel, [{ label: "Leave", onClick: () => this.close() }]);
      return;
    }

    const list = document.createElement("div");
    list.className = "bj-table encounter-scroll";
    const events = filterEvents(this.state.events, "all").slice(0, 8);
    for (const ev of events) {
      const row = document.createElement("div");
      row.className = "bj-row";
      const label = ev.label ?? `${ev.away} @ ${ev.home}`;
      row.textContent = `${label} · ML ${fmtOdds(ev.homeOdds)} / ${fmtOdds(ev.awayOdds)}`;
      row.style.cursor = "pointer";
      row.onclick = () => {
        this.selected = ev;
        this.status = `Selected: ${label}`;
        this._render();
      };
      if (this.selected?.eventId === ev.eventId) row.classList.add("highlight");
      list.appendChild(row);
    }
    panel.appendChild(list);

    if (this.selected) {
      const form = document.createElement("div");
      form.className = "bj-form";
      const pick = document.createElement("select");
      [this.selected.home, this.selected.away].forEach((name) => {
        const o = document.createElement("option");
        o.value = name;
        o.textContent = `${name} (${fmtOdds(oddsForSelection(this.selected, "moneyline", name))})`;
        pick.appendChild(o);
      });
      const amt = document.createElement("input");
      amt.type = "number";
      amt.min = "5";
      amt.value = "25";
      form.append(pick, amt);
      panel.appendChild(form);

      actionRow(panel, [
        {
          label: "Place ticket",
          primary: true,
          onClick: () => {
            const amount = parseInt(amt.value, 10) || 0;
            if (amount < 5) { alert("Min $5."); return; }
            if (!this.session.wallet.debit(amount, "sportsbook", "Ticket")) {
              alert("Not enough chips.");
              return;
            }
            const pickName = pick.value;
            this.state.addTicket({
              event: this.selected,
              betType: "moneyline",
              pick: pickName,
              amount,
              odds: oddsForSelection(this.selected, "moneyline", pickName),
            });
            this.sessionNet -= amount;
            this.status = `Ticket booked: ${pickName} ${fmtChips(amount)}`;
            this.session.ensureRpgState().flags.played_sportsbook = true;
            this._sync();
            this._render();
          },
        },
        {
          label: "Settle all",
          onClick: () => {
            const before = this.session.wallet.balance;
            const { results } = this.state.settleAll();
            for (const r of results) {
              if (r.payout > 0) {
                this.session.wallet.credit(r.payout, "sportsbook", r.reason);
              }
            }
            this.sessionNet += this.session.wallet.balance - before;
            this.status = `Settled ${results.length} ticket(s).`;
            this._sync();
            this._render();
          },
        },
        { label: "Leave", onClick: () => this.close() },
      ]);
    } else {
      actionRow(panel, [
        {
          label: "Refresh board",
          onClick: async () => {
            await this.state.refreshBoardAsync(true);
            this.status = "Board refreshed.";
            this._sync();
            this._render();
          },
        },
        { label: "Leave", onClick: () => this.close() },
      ]);
    }
  }
}
