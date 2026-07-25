import { OverlayBase, actionRow } from "../OverlayBase.js";
import {
  SportsbookState,
  fmtOdds,
  oddsForSelection,
  filterEvents,
} from "../../../../js/sportsbook.js";
import { categoryLabel, predictionPayout, filterMarkets, MARKET_CATEGORIES } from "../../../../js/predictionMarkets.js";
import { fmtChips } from "../../../../js/core.js";

export class SportsbookOverlay extends OverlayBase {
  constructor(root, session, hooks) {
    super(root, session, hooks, "sportsbook");
    this.state = null;
    this.status = "";
    this.selected = null;
    this.selectedMarket = null;
    this.tab = "sports";
  }

  async open(options = {}) {
    if (this._active) return { net: 0 };
    this._active = true;
    this.sessionNet = 0;
    this._options = options;
    this.status = "Loading board…";
    this.selected = null;
    this.selectedMarket = null;
    this.tab = options.tab === "predictions" ? "predictions" : "sports";
    this.state = SportsbookState.fromJSON(this.session.sportsbookData ?? null);
    this.session.recordVisit(this.activityId);
    this.root.hidden = false;
    this.root.classList.add("encounter-overlay--active");
    const p = new Promise((resolve) => { this._resolve = resolve; });
    this._render();
    try {
      await this.state.init();
      this.state.predictions.syncMarkets(this.state.events);
      this.status = this.tab === "predictions"
        ? "Prediction board ready — History Desk + easter eggs live."
        : "Board ready. Pick a moneyline or open Prediction markets.";
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

    actionRow(panel, [
      {
        label: "Sports",
        primary: this.tab === "sports",
        onClick: () => { this.tab = "sports"; this._render(); },
      },
      {
        label: "Predictions",
        primary: this.tab === "predictions",
        onClick: () => {
          this.tab = "predictions";
          this.state.predictions.syncMarkets(this.state.events);
          this.status = "Prediction markets — filter by History Desk or Easter Eggs.";
          this._render();
        },
      },
    ]);

    if (this.tab === "predictions") {
      this._renderPredictions(panel);
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
          onClick: () => this._settleAll(),
        },
        { label: "Leave", onClick: () => this.close() },
      ]);
    } else {
      actionRow(panel, [
        {
          label: "Refresh board",
          onClick: async () => {
            await this.state.refreshBoardAsync(true);
            this.state.predictions.syncMarkets(this.state.events, true);
            this.status = "Board refreshed.";
            this._sync();
            this._render();
          },
        },
        { label: "Leave", onClick: () => this.close() },
      ]);
    }
  }

  _renderPredictions(panel) {
    this.state.predictions.syncMarkets(this.state.events);
    const filter = this.state.predictions.categoryFilter || "all";
    const chips = document.createElement("div");
    chips.className = "prediction-filter-chips";
    const allBtn = document.createElement("button");
    allBtn.className = `prediction-chip${filter === "all" ? " prediction-chip--active" : ""}`;
    allBtn.textContent = "All";
    allBtn.onclick = () => {
      this.state.predictions.categoryFilter = "all";
      this._render();
    };
    chips.appendChild(allBtn);
    for (const cat of MARKET_CATEGORIES) {
      const btn = document.createElement("button");
      btn.className = `prediction-chip${filter === cat.id ? " prediction-chip--active" : ""}`;
      btn.textContent = cat.label;
      btn.onclick = () => {
        this.state.predictions.categoryFilter = cat.id;
        this._render();
      };
      chips.appendChild(btn);
    }
    panel.appendChild(chips);

    const markets = filterMarkets(this.state.predictions.markets, filter);
    const list = document.createElement("div");
    list.className = "bj-table encounter-scroll";
    for (const market of markets.slice(0, 10)) {
      const row = document.createElement("div");
      row.className = "bj-row";
      row.textContent = `[${categoryLabel(market.category)}] ${market.question} · YES ${market.yesPrice}¢ / NO ${market.noPrice}¢`;
      row.style.cursor = "pointer";
      row.onclick = () => {
        this.selectedMarket = market;
        this.status = market.blurb || market.question;
        this._render();
      };
      if (this.selectedMarket?.marketId === market.marketId) row.classList.add("highlight");
      list.appendChild(row);
    }
    panel.appendChild(list);

    if (this.selectedMarket) {
      const form = document.createElement("div");
      form.className = "bj-form";
      const side = document.createElement("select");
      [["yes", "YES"], ["no", "NO"]].forEach(([v, label]) => {
        const o = document.createElement("option");
        o.value = v;
        o.textContent = label;
        side.appendChild(o);
      });
      const amt = document.createElement("input");
      amt.type = "number";
      amt.min = "10";
      amt.value = "25";
      form.append(side, amt);
      panel.appendChild(form);

      actionRow(panel, [
        {
          label: "Buy contract",
          primary: true,
          onClick: () => {
            const amount = parseInt(amt.value, 10) || 0;
            if (amount < 10) { alert("Min $10."); return; }
            const price = side.value === "yes" ? this.selectedMarket.yesPrice : this.selectedMarket.noPrice;
            if (!this.session.wallet.debit(amount, "sportsbook", `Prediction ${side.value}`)) {
              alert("Not enough chips.");
              return;
            }
            this.state.predictions.addPosition({
              marketId: this.selectedMarket.marketId,
              question: this.selectedMarket.question,
              side: side.value,
              amount,
              priceCents: price,
            });
            this.sessionNet -= amount;
            this.status = `Bought ${side.value.toUpperCase()} @ ${price}¢ (max ${predictionPayout(amount, price)})`;
            this.session.ensureRpgState().flags.played_predictions = true;
            this._sync();
            this._render();
          },
        },
        { label: "Settle all", onClick: () => this._settleAll() },
        { label: "Leave", onClick: () => this.close() },
      ]);
    } else {
      actionRow(panel, [
        {
          label: "Refresh prices",
          onClick: () => {
            this.state.predictions.refreshPrices();
            this.status = "Prediction prices refreshed.";
            this._sync();
            this._render();
          },
        },
        { label: "Leave", onClick: () => this.close() },
      ]);
    }
  }

  _settleAll() {
    const before = this.session.wallet.balance;
    const sports = this.state.settleAll?.() ?? { results: [] };
    const preds = this.state.settlePredictions?.() ?? this.state.predictions.settleAll(this.state.events);
    const sportResults = sports.results ?? [];
    const predResults = preds.results ?? [];
    for (const r of [...sportResults, ...predResults]) {
      if (r.payout > 0) this.session.wallet.credit(r.payout, "sportsbook", r.reason);
    }
    this.sessionNet += this.session.wallet.balance - before;
    this.status = `Settled ${sportResults.length + predResults.length} position(s).`;
    this._sync();
    this._render();
  }
}
