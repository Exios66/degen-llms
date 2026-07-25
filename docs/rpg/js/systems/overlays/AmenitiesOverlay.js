import { OverlayBase, actionRow } from "../OverlayBase.js";
import {
  ensureAmenities,
  purchaseShopItem,
  orderBarDrink,
  ALL_SHOP_STORES,
  CASINO_BARS,
} from "../../../../js/casino-amenities.js";
import { fmtChips, TransactionKind } from "../../../../js/core.js";

export class AmenitiesOverlay extends OverlayBase {
  constructor(root, session, hooks) {
    super(root, session, hooks, "amenities");
    this.mode = "shop";
    this.status = "";
  }

  open(options = {}) {
    this.mode = options.mode ?? "shop";
    ensureAmenities(this.session);
    this.status = this.mode === "bar" ? "What are you drinking?" : "The Shoppes at Mandalay Place.";
    return super.open(options);
  }

  _render() {
    const panel = this._panel(this.mode === "bar" ? "LOBBY BAR" : "SHOPPES");
    this._msg(panel, this.status);
    const list = document.createElement("div");
    list.className = "bj-table encounter-scroll";

    if (this.mode === "bar") {
      const bar = CASINO_BARS[0];
      for (const d of bar.drinks.slice(0, 6)) {
        const row = document.createElement("div");
        row.className = "bj-row";
        row.style.cursor = "pointer";
        row.textContent = `${d.name} — ${fmtChips(d.price)}`;
        row.onclick = () => {
          const before = this.session.wallet.balance;
          const r = orderBarDrink(this.session, d.id);
          this.sessionNet += this.session.wallet.balance - before;
          this.status = r?.message ?? (r?.ok === false ? r.message : `Ordered ${d.name}`);
          if (r && typeof r === "object" && r.message) this.status = r.message;
          this._render();
        };
        list.appendChild(row);
      }
    } else {
      const items = ALL_SHOP_STORES.flatMap((s) => s.items.map((i) => ({ ...i, store: s.name }))).slice(0, 8);
      for (const item of items) {
        const row = document.createElement("div");
        row.className = "bj-row";
        row.style.cursor = "pointer";
        row.textContent = `${item.name} (${item.store}) — ${fmtChips(item.price)}`;
        row.onclick = () => {
          const before = this.session.wallet.balance;
          const r = purchaseShopItem(this.session, item.id);
          this.sessionNet += this.session.wallet.balance - before;
          this.status = r?.message ?? `Purchased ${item.name}`;
          this._render();
        };
        list.appendChild(row);
      }
    }
    panel.appendChild(list);
    actionRow(panel, [
      {
        label: this.mode === "bar" ? "Browse shops" : "Open bar",
        onClick: () => {
          this.mode = this.mode === "bar" ? "shop" : "bar";
          this._render();
        },
      },
      { label: "Leave", onClick: () => this.close() },
    ]);
  }
}

export class CashierOverlay extends OverlayBase {
  constructor(root, session, hooks) {
    super(root, session, hooks, "cashier");
    this.status = "";
  }

  open(options = {}) {
    this.status = "Cashier window. Buy chips (play money).";
    return super.open(options);
  }

  _render() {
    const panel = this._panel("CASHIER");
    let bonus = 1;
    const rpg = this.session.ensureRpgState();
    if (rpg.archetype === "convention_goer") bonus = 1.1;
    this._msg(panel, this.status);
    this._msg(panel, bonus > 1 ? "Convention Goer: +10% buy-in bonus." : "Select a buy-in amount.");

    const amounts = [100, 500, 1000, 5000];
    actionRow(panel, [
      ...amounts.map((amt) => ({
        label: `Buy ${fmtChips(amt)}`,
        primary: amt === 500,
        onClick: () => {
          const credit = Math.floor(amt * bonus);
          this.session.wallet.credit(credit, "cashier", "Chip buy-in", TransactionKind.BUY_IN);
          this.sessionNet += credit;
          this.status = `Credited ${fmtChips(credit)}.`;
          this._render();
        },
      })),
      { label: "Done", onClick: () => this.close() },
    ]);
  }
}

export class RhythmOverlay extends OverlayBase {
  constructor(root, session, hooks) {
    super(root, session, hooks, "house_of_blues");
    this.sequence = [];
    this.step = 0;
    this.status = "";
  }

  open(options = {}) {
    this.sequence = [0, 1, 2, 1].map(() => Math.floor(Math.random() * 3));
    this.step = 0;
    this.status = "Match the beat: Kick / Snare / Hat";
    return super.open(options);
  }

  _render() {
    const panel = this._panel("HOUSE OF BLUES");
    this._msg(panel, this.status);
    const labels = ["Kick", "Snare", "Hat"];
    actionRow(panel, [
      ...labels.map((label, i) => ({
        label,
        primary: i === 0,
        onClick: () => {
          if (this.sequence[this.step] !== i) {
            this.status = "Off beat! Try again.";
            this.step = 0;
            this.sequence = [0, 1, 2, 1].map(() => Math.floor(Math.random() * 3));
            this._render();
            return;
          }
          this.step += 1;
          if (this.step >= this.sequence.length) {
            this.session.wallet.credit(30, "house_of_blues", "Rhythm clear");
            this.sessionNet += 30;
            this.session.ensureRpgState().flags.hob_cleared = true;
            this.status = "Encore! +$30";
            this.step = 0;
            this.sequence = [0, 1, 2, 1].map(() => Math.floor(Math.random() * 3));
          } else {
            this.status = `On beat! ${this.step}/${this.sequence.length}`;
          }
          this._render();
        },
      })),
      { label: "Leave stage", onClick: () => this.close() },
    ]);
  }
}
