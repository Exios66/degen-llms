import { fmtChips } from "../../../js/core.js";

/**
 * Shared DOM overlay helpers for RPG activity encounters.
 */
export class OverlayBase {
  /**
   * @param {HTMLElement} root
   * @param {import("../../../js/core.js").PlayerSession} session
   * @param {{ onClose?: (result: { net: number }) => void }} hooks
   * @param {string} activityId
   */
  constructor(root, session, hooks, activityId) {
    this.root = root;
    this.session = session;
    this.hooks = hooks;
    this.activityId = activityId;
    this.sessionNet = 0;
    this._active = false;
    this._resolve = null;
  }

  isActive() {
    return this._active;
  }

  /**
   * @param {object} [options]
   * @returns {Promise<{ net: number }>}
   */
  open(options = {}) {
    if (this._active) return Promise.resolve({ net: 0 });
    this._active = true;
    this.sessionNet = 0;
    this._options = options;
    this.session.recordVisit(this.activityId);
    this.root.hidden = false;
    this.root.classList.add("encounter-overlay--active");
    return new Promise((resolve) => {
      this._resolve = resolve;
      this._render();
    });
  }

  close() {
    this.session.recordResult(this.activityId, this.sessionNet);
    this.root.hidden = true;
    this.root.innerHTML = "";
    this.root.classList.remove("encounter-overlay--active");
    this._active = false;
    const net = this.sessionNet;
    this.sessionNet = 0;
    const resolve = this._resolve;
    this._resolve = null;
    if (resolve) resolve({ net });
    this.hooks.onClose?.({ net });
  }

  /** @protected */
  _panel(title) {
    this.root.innerHTML = "";
    const panel = document.createElement("div");
    panel.className = "encounter-panel";
    const h2 = document.createElement("h2");
    h2.textContent = title;
    panel.appendChild(h2);
    const chips = document.createElement("p");
    chips.className = "bj-chip-line";
    chips.textContent = `Chips: ${fmtChips(this.session.wallet.balance)}`;
    panel.appendChild(chips);
    this.root.appendChild(panel);
    return panel;
  }

  /** @protected */
  _leaveButton(panel, label = "Leave") {
    const actions = document.createElement("div");
    actions.className = "bj-actions";
    const leave = document.createElement("button");
    leave.textContent = label;
    leave.onclick = () => this.close();
    actions.appendChild(leave);
    panel.appendChild(actions);
    return actions;
  }

  /** @protected */
  _msg(panel, text, cls = "") {
    const p = document.createElement("p");
    p.className = `bj-status ${cls}`.trim();
    p.textContent = text;
    panel.appendChild(p);
    return p;
  }

  /** @protected */
  _render() {
    // subclasses override
  }
}

/**
 * Create a leave-capable action row with optional primary buttons.
 * @param {HTMLElement} parent
 * @param {{ label: string, primary?: boolean, onClick: () => void }[]} buttons
 */
export function actionRow(parent, buttons) {
  const actions = document.createElement("div");
  actions.className = "bj-actions";
  for (const b of buttons) {
    const btn = document.createElement("button");
    if (b.primary) btn.className = "primary";
    btn.textContent = b.label;
    btn.onclick = b.onClick;
    actions.appendChild(btn);
  }
  parent.appendChild(actions);
  return actions;
}
