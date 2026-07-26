import { OverlayBase, actionRow } from "../OverlayBase.js";

/** House of Blues rhythm mini-game — a bespoke pixel "battle" screen. */
export class RhythmOverlay extends OverlayBase {
  constructor(root, session, hooks) {
    super(root, session, hooks, "house_of_blues");
    this.sequence = [];
    this.step = 0;
    this.status = "";
    this.venue = null;
  }

  /**
   * @param {{ title?: string, beats?: string[], clearFlag?: string,
   *   prompt?: string }} [options] the venue this stage is standing in for
   */
  open(options = {}) {
    this.venue = {
      title: options.title ?? "HOUSE OF BLUES",
      beats: options.beats ?? ["Kick", "Snare", "Hat"],
      clearFlag: options.clearFlag ?? "hob_cleared",
      prompt: options.prompt ?? null,
    };
    this.sequence = this._newSequence();
    this.step = 0;
    this.status = this.venue.prompt ?? `Match the beat: ${this.venue.beats.join(" / ")}`;
    return super.open(options);
  }

  _newSequence() {
    return [0, 1, 2, 1].map(() => Math.floor(Math.random() * this.venue.beats.length));
  }

  _render() {
    const panel = this._panel(this.venue.title);
    this._msg(panel, this.status);
    actionRow(panel, [
      ...this.venue.beats.map((label, i) => ({
        label,
        primary: i === 0,
        onClick: () => {
          if (this.sequence[this.step] !== i) {
            this.status = "Off beat! Try again.";
            this.step = 0;
            this.sequence = this._newSequence();
            this._render();
            return;
          }
          this.step += 1;
          if (this.step >= this.sequence.length) {
            this.session.wallet.credit(30, "house_of_blues", "Rhythm clear");
            this.sessionNet += 30;
            this.session.ensureRpgState().flags[this.venue.clearFlag] = true;
            this.status = "Encore! +$30";
            this.step = 0;
            this.sequence = this._newSequence();
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
