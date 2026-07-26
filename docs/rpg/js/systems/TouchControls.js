/**
 * Thumb controls for phones and tablets.
 *
 * Tapping the floor walks you there, which covers most of the game, but a pad
 * is still the only comfortable way to line yourself up with a door or step one
 * tile out of a dealer's way — so a phone gets a d-pad, a talk button, a hold-to
 * -run button, and the START menu, all sized for thumbs and anchored clear of
 * the home indicator.
 *
 * The pad writes into a plain state object; OverworldScene reads it the same
 * way it reads the keyboard, so nothing else in the game knows touch exists.
 */

const DIRECTIONS = [
  { dir: "up", label: "▲", cls: "up" },
  { dir: "left", label: "◀", cls: "left" },
  { dir: "right", label: "▶", cls: "right" },
  { dir: "down", label: "▼", cls: "down" },
];

/** Touch is the only input that needs the pad; a mouse has the keyboard. */
export function prefersTouchControls() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(pointer: coarse)").matches
    || navigator.maxTouchPoints > 0;
}

export class TouchControls {
  /**
   * @param {HTMLElement} root
   * @param {{ onInteract?: () => void, onMenu?: () => void }} hooks
   */
  constructor(root, hooks = {}) {
    this.root = root;
    this.hooks = hooks;
    this.state = { left: false, right: false, up: false, down: false, run: false };
    this._held = new Map();
    this._active = true;
    this._render();
  }

  /** Movement the scene should apply this frame. */
  vector() {
    const x = (this.state.right ? 1 : 0) - (this.state.left ? 1 : 0);
    const y = (this.state.down ? 1 : 0) - (this.state.up ? 1 : 0);
    return { x, y, run: this.state.run };
  }

  /** Hide the pad while a panel owns the screen, and drop anything held. */
  setActive(active) {
    if (this._active === active) return;
    this._active = active;
    this.root.classList.toggle("touch-pad--hidden", !active);
    if (!active) this._releaseAll();
  }

  _releaseAll() {
    for (const key of Object.keys(this.state)) this.state[key] = false;
    for (const btn of this._held.values()) btn.classList.remove("is-pressed");
    this._held.clear();
  }

  /**
   * Buttons hold their own pointer so a thumb that slides off still releases,
   * and two thumbs can press two buttons at once.
   */
  _bindHold(btn, onDown, onUp) {
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      btn.setPointerCapture?.(e.pointerId);
      this._held.set(e.pointerId, btn);
      btn.classList.add("is-pressed");
      onDown();
    });
    const release = (e) => {
      if (!this._held.has(e.pointerId)) return;
      this._held.delete(e.pointerId);
      btn.classList.remove("is-pressed");
      onUp?.();
    };
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", release);
    btn.addEventListener("lostpointercapture", release);
  }

  _button(className, label, ariaLabel) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = className;
    btn.textContent = label;
    btn.setAttribute("aria-label", ariaLabel);
    return btn;
  }

  _render() {
    this.root.innerHTML = "";
    this.root.className = "touch-pad";

    const pad = document.createElement("div");
    pad.className = "touch-pad__dpad";
    for (const { dir, label, cls } of DIRECTIONS) {
      const btn = this._button(`touch-btn touch-btn--${cls}`, label, `Walk ${dir}`);
      this._bindHold(btn, () => { this.state[dir] = true; }, () => { this.state[dir] = false; });
      pad.appendChild(btn);
    }

    const actions = document.createElement("div");
    actions.className = "touch-pad__actions";

    const menu = this._button("touch-btn touch-btn--menu", "☰", "Open menu");
    this._bindHold(menu, () => this.hooks.onMenu?.());

    const run = this._button("touch-btn touch-btn--run", "B", "Hold to run");
    this._bindHold(run, () => { this.state.run = true; }, () => { this.state.run = false; });

    const talk = this._button("touch-btn touch-btn--talk", "A", "Talk or confirm");
    this._bindHold(talk, () => this.hooks.onInteract?.());

    actions.append(menu, run, talk);
    this.root.append(pad, actions);
  }

  destroy() {
    this._releaseAll();
    this.root.innerHTML = "";
  }
}
