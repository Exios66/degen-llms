import { OverlayBase, actionRow } from "../OverlayBase.js";

/** House of Blues rhythm mini-game — a bespoke pixel "battle" screen. */
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
