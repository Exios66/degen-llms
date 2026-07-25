import { OverlayBase, actionRow } from "../OverlayBase.js";
import {
  ensurePoolComplex,
  playCatchWave,
  playRingToss,
  photographShark,
  startRaveDance,
  submitRaveMove,
  SHARK_SPECIES,
  enterZone,
} from "../../../../js/pool-complex.js";
import { fmtChips } from "../../../../js/core.js";

export class PoolOverlay extends OverlayBase {
  constructor(root, session, hooks) {
    super(root, session, hooks, "pool");
    this.zone = "wave_pool";
    this.status = "";
  }

  open(options = {}) {
    this.zone = options.zone ?? "wave_pool";
    ensurePoolComplex(this.session);
    enterZone(this.session, this.zone);
    this.status = `Zone: ${this.zone.replace(/_/g, " ")}`;
    return super.open(options);
  }

  _render() {
    const panel = this._panel("POOL COMPLEX");
    this._msg(panel, this.status);

    if (this.zone === "wave_pool") {
      actionRow(panel, [
        { label: "Jump early", primary: true, onClick: () => this._do(() => playCatchWave(this.session, 0)) },
        { label: "Ride crest", onClick: () => this._do(() => playCatchWave(this.session, 1)) },
        { label: "Bail late", onClick: () => this._do(() => playCatchWave(this.session, 2)) },
        { label: "Ring toss $10", onClick: () => this._do(() => playRingToss(this.session, 10, 0)) },
        { label: "Leave", onClick: () => this.close() },
      ]);
    } else if (this.zone === "shark_reef") {
      const buttons = Object.values(SHARK_SPECIES).map((s) => ({
        label: `Photo ${s.label}`,
        onClick: () => {
          const r = photographShark(this.session, s.id);
          this.status = r.message;
          this.hooks.onSharkPhoto?.(s.id, r);
          this._render();
        },
      }));
      buttons.push({ label: "Leave", onClick: () => this.close() });
      actionRow(panel, buttons);
    } else if (this.zone === "beach_rave") {
      actionRow(panel, [
        { label: "Start dance", primary: true, onClick: () => this._do(() => startRaveDance(this.session)) },
        { label: "Fist pump", onClick: () => this._do(() => submitRaveMove(this.session, 0)) },
        { label: "Shuffling", onClick: () => this._do(() => submitRaveMove(this.session, 1)) },
        { label: "Glow spin", onClick: () => this._do(() => submitRaveMove(this.session, 2)) },
        { label: "Leave", onClick: () => this.close() },
      ]);
    } else {
      actionRow(panel, [
        { label: "Explore zone", primary: true, onClick: () => this._do(() => enterZone(this.session, this.zone)) },
        { label: "Leave", onClick: () => this.close() },
      ]);
    }
  }

  _do(fn) {
    const before = this.session.wallet.balance;
    const r = fn();
    this.sessionNet += this.session.wallet.balance - before;
    this.status = r?.message ?? this.status;
    this._render();
  }
}
