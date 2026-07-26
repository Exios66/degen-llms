import { OverlayBase } from "../OverlayBase.js";
import { createStripDriveGame, CLEAR_REWARD } from "../vegas-strip-drive.js";

/** Valet-garage arcade cabinet — OutRun-lite Strip drive. */
export class VegasStripDriveOverlay extends OverlayBase {
  constructor(root, session, hooks) {
    super(root, session, hooks, "vegas_strip_drive");
    this._game = null;
    this._hud = { score: 0, tips: 0, timeLeft: 55, status: "Ready" };
    this._finished = false;
  }

  open(options = {}) {
    this._finished = false;
    this._hud = { score: 0, tips: 0, timeLeft: 55, status: "Ready" };
    return super.open(options);
  }

  close() {
    this._teardownGame();
    return super.close();
  }

  _teardownGame() {
    this._game?.stop();
    this._game = null;
  }

  _award(result) {
    if (this._finished) return;
    this._finished = true;
    const reward = result.reward ?? 0;
    if (reward > 0) {
      this.session.wallet.credit(reward, "vegas_strip_drive", result.cleared ? "Strip Drive clear" : "Strip Drive tips");
      this.sessionNet += reward;
    }
    if (result.cleared) {
      this.session.ensureRpgState().flags.strip_drive_cleared = true;
    }
    this._hud.status = result.cleared
      ? `Clear! +$${reward}`
      : `Run over · +$${reward}`;
    this._renderChrome();
  }

  _render() {
    this.root.innerHTML = "";
    const panel = document.createElement("div");
    panel.className = "encounter-panel drive-panel";
    this.root.appendChild(panel);

    const title = document.createElement("h2");
    title.textContent = "STRIP DRIVE";
    panel.appendChild(title);

    const tag = document.createElement("p");
    tag.className = "drive-tagline";
    tag.textContent = "Neon boulevard · dodge traffic · grab tips · last 55 seconds";
    panel.appendChild(tag);

    const canvas = document.createElement("canvas");
    canvas.className = "drive-canvas";
    canvas.setAttribute("aria-label", "Vegas Strip Drive playfield");
    panel.appendChild(canvas);

    const hud = document.createElement("p");
    hud.className = "bj-status drive-hud";
    hud.dataset.role = "hud";
    panel.appendChild(hud);

    const controls = document.createElement("div");
    controls.className = "drive-controls";
    controls.innerHTML = `
      <button type="button" data-dir="left" aria-label="Steer left">◀</button>
      <button type="button" data-dir="accel" class="primary" aria-label="Accelerate">▲ GAS</button>
      <button type="button" data-dir="right" aria-label="Steer right">▶</button>
    `;
    panel.appendChild(controls);

    const actions = document.createElement("div");
    actions.className = "bj-actions";
    const leave = document.createElement("button");
    leave.textContent = "Leave cabinet";
    leave.onclick = () => this.close();
    actions.appendChild(leave);
    const again = document.createElement("button");
    again.className = "primary";
    again.textContent = "Restart";
    again.onclick = () => {
      this._finished = false;
      this._teardownGame();
      this._bootGame(canvas);
    };
    actions.appendChild(again);
    panel.appendChild(actions);

    this._bindTouch(controls);
    this._bootGame(canvas);
    this._renderChrome();
  }

  _bootGame(canvas) {
    this._game = createStripDriveGame(canvas, {
      onHud: (hud) => {
        this._hud = hud;
        this._renderChrome();
      },
      onEnd: (result) => this._award(result),
    });
    this._game.start();
  }

  _bindTouch(controls) {
    const set = (partial, on) => {
      const next = {};
      for (const [k, v] of Object.entries(partial)) next[k] = on ? v : false;
      this._game?.setInput(next);
    };
    for (const btn of controls.querySelectorAll("button")) {
      const dir = btn.dataset.dir;
      const partial =
        dir === "left" ? { left: true }
          : dir === "right" ? { right: true }
            : { accel: true };
      const press = (e) => {
        e.preventDefault();
        set(partial, true);
      };
      const release = (e) => {
        e.preventDefault();
        set(partial, false);
      };
      btn.addEventListener("pointerdown", press);
      btn.addEventListener("pointerup", release);
      btn.addEventListener("pointerleave", release);
      btn.addEventListener("pointercancel", release);
    }
  }

  _renderChrome() {
    const hud = this.root.querySelector("[data-role='hud']");
    if (!hud) return;
    const t = this._hud.timeLeft?.toFixed?.(1) ?? "—";
    hud.textContent = `${this._hud.status} · score ${this._hud.score} · tips ${this._hud.tips} · ${t}s · clear pays $${CLEAR_REWARD}`;
  }
}
