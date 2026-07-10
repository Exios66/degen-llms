import { OverlayBase, actionRow } from "../OverlayBase.js";
import { ensureHotel, upgradeRoom, checkoutStay, hallwayChoice } from "../../../../js/hotel.js";
import { fmtChips } from "../../../../js/core.js";

export class HotelOverlay extends OverlayBase {
  constructor(root, session, hooks) {
    super(root, session, hooks, "hotel");
    this.status = "";
  }

  open(options = {}) {
    ensureHotel(this.session);
    this.status = "Front desk. Upgrade, hallway, or checkout.";
    return super.open(options);
  }

  _render() {
    const hotel = ensureHotel(this.session);
    const panel = this._panel("HOTEL TOWER");
    this._msg(panel, this.status);
    this._msg(panel, `Room: ${hotel.roomType ?? "standard"} · nights ${hotel.nights ?? 1}`);

    actionRow(panel, [
      {
        label: "Upgrade suite ($150)",
        primary: true,
        onClick: () => {
          const before = this.session.wallet.balance;
          const r = upgradeRoom(this.session, "suite", null);
          this.sessionNet += this.session.wallet.balance - before;
          this.status = r?.message ?? (r?.ok === false ? r.message : "Upgrade processed.");
          if (typeof r === "string") this.status = r;
          else if (r?.message) this.status = r.message;
          else this.status = `Balance ${fmtChips(this.session.wallet.balance)}`;
          this._render();
        },
      },
      {
        label: "Hallway explore",
        onClick: () => {
          const r = hallwayChoice(this.session, 0);
          this.status = r?.message ?? "You wander the hallway.";
          this._render();
        },
      },
      {
        label: "Checkout",
        onClick: () => {
          const before = this.session.wallet.balance;
          const r = checkoutStay(this.session);
          this.sessionNet += this.session.wallet.balance - before;
          this.status = r?.message ?? "Checked out.";
          this._render();
        },
      },
      { label: "Leave desk", onClick: () => this.close() },
    ]);
  }
}
