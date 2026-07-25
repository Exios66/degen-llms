import { fmtChips } from "../../../../js/core.js";
import { ensureBank } from "../../../../js/bank-account.js";
import {
  ensureHotel,
  grantRoomKeyIfReservationReady,
  canAccessHotelRoom,
} from "../../../../js/hotel.js";
import { buildHotelRenderers } from "../../../../js/hotel-ui.js";
import { OverlayBase } from "../OverlayBase.js";

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "className") node.className = v;
    else if (k === "textContent") node.textContent = v;
    else if (k === "innerHTML") node.innerHTML = v;
    else if (k === "disabled") node.disabled = Boolean(v);
    else if (k.startsWith("on")) node[k.toLowerCase()] = v;
    else node.setAttribute(k, v);
  }
  for (const child of children) {
    if (typeof child === "string") node.appendChild(document.createTextNode(child));
    else if (child) node.appendChild(child);
  }
  return node;
}

function banner(title) {
  return el("div", { className: "banner" }, [el("h1", { textContent: title })]);
}

/**
 * Full hotel tower UI inside the RPG overlay — front desk, room amenities, hallway.
 */
export class HotelOverlay extends OverlayBase {
  constructor(root, session, hooks) {
    super(root, session, hooks, "hotel");
    this.viewStack = ["hotel-lobby"];
    this.rewardsPhone = hooks.rewardsPhone ?? null;
    this.onPersist = hooks.onPersist ?? (() => {});
    this._statusMsg = "";
    this._statusKind = "";

    const overlay = this;
    this._renderers = buildHotelRenderers({
      get session() { return overlay.session; },
      get rewardsPhone() { return overlay.rewardsPhone; },
      pushView: (view) => {
        overlay.viewStack.push(view);
        overlay._render();
      },
      goBack: () => {
        if (overlay.viewStack.length > 1) {
          overlay.viewStack.pop();
          overlay._render();
        } else {
          overlay.close();
        }
      },
      navigateTo: (view) => {
        overlay.viewStack = [view];
        overlay._render();
      },
      persist: () => overlay.onPersist(),
      render: () => overlay._render(),
      el,
      banner,
      chipLine: () => overlay._chipLine(),
      statusBanner: () => overlay._statusBanner(),
      showStatus: (msg, kind = "") => overlay._showStatus(msg, kind),
      onExitToFloor: () => overlay.close(),
      viewStack: overlay.viewStack,
    });
  }

  open(options = {}) {
    ensureHotel(this.session);
    grantRoomKeyIfReservationReady(this.session);
    const hotel = ensureHotel(this.session);

    let startView = options.view ?? "hotel-lobby";
    if (options.view) {
      startView = options.view;
    } else if (canAccessHotelRoom(this.session) && hotel.reachedRoom) {
      startView = "hotel-room";
    } else if (!canAccessHotelRoom(this.session)) {
      startView = "hotel-front-desk";
    }

    this.viewStack = [startView];
    this._statusMsg = "";
    this._statusKind = "";
    return super.open(options);
  }

  _chipLine() {
    const bank = ensureBank(this.session);
    const name = bank.accountName || "Off-Strip Checking";
    const suffix = /off[-\s]?strip/i.test(name) ? "" : " (off-strip)";
    return el("div", { className: "chip-line-wrap" }, [
      el("p", { className: "chip-line", textContent: `Floor chips: ${fmtChips(this.session.wallet.balance)}` }),
      el("p", {
        className: "bank-line dim",
        textContent: `${name}: ${fmtChips(bank.balance)}${suffix}`,
      }),
    ]);
  }

  _statusBanner() {
    if (!this._statusMsg) return el("div");
    return el("div", { className: `status-banner ${this._statusKind}`.trim() }, [
      el("p", { textContent: this._statusMsg }),
    ]);
  }

  _showStatus(msg, kind = "") {
    this._statusMsg = msg;
    this._statusKind = kind;
    this._render();
  }

  _render() {
    this.root.innerHTML = "";
    this.root.classList.add("encounter-overlay--hotel");
    const view = this.viewStack[this.viewStack.length - 1] ?? "hotel-lobby";
    const renderFn = this._renderers[view] ?? this._renderers["hotel-lobby"];
    const content = renderFn();
    if (content) this.root.appendChild(content);

    const leave = document.createElement("div");
    leave.className = "bj-actions hotel-overlay-leave";
    const btn = document.createElement("button");
    btn.textContent = "Leave hotel";
    btn.onclick = () => this.close();
    leave.appendChild(btn);
    this.root.appendChild(leave);
  }
}
