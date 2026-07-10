import { OverlayBase, actionRow } from "../OverlayBase.js";
import {
  getMachine,
  spinReels,
  calculatePayout,
  contributeToProgressive,
  tryJackpot,
  displaySymbol,
} from "../../../../js/slots.js";
import { fmtChips } from "../../../../js/core.js";

export class SlotsOverlay extends OverlayBase {
  /**
   * @param {HTMLElement} root
   * @param {import("../../../../js/core.js").PlayerSession} session
   * @param {{ onClose?: Function }} hooks
   * @param {string} machineId
   */
  constructor(root, session, hooks, machineId = "fortune") {
    super(root, session, hooks, "slots");
    this.machineId = machineId;
    this.lastLine = "";
    this.reels = null;
  }

  open(options = {}) {
    if (options.machineId) this.machineId = options.machineId;
    this.lastLine = "";
    this.reels = null;
    return super.open(options);
  }

  _render() {
    const machine = getMachine(this.machineId) ?? getMachine("fortune");
    const panel = this._panel(`${machine.name.toUpperCase()}`);
    this._msg(panel, machine.tagline || "Pull the handle.");

    if (this.reels) {
      const reelRow = document.createElement("div");
      reelRow.className = "slot-reels";
      reelRow.textContent = this.reels
        .map((s) => displaySymbol(s, this.session.useUnicode))
        .join("  |  ");
      panel.appendChild(reelRow);
    }
    if (this.lastLine) this._msg(panel, this.lastLine);

    const form = document.createElement("div");
    form.className = "bj-form";
    const input = document.createElement("input");
    input.type = "number";
    input.min = String(machine.minBet);
    input.max = String(Math.min(machine.maxBet, this.session.wallet.balance));
    input.value = String(machine.minBet);
    form.appendChild(input);
    panel.appendChild(form);

    actionRow(panel, [
      {
        label: "Spin",
        primary: true,
        onClick: () => {
          const bet = parseInt(input.value, 10) || 0;
          if (bet < machine.minBet || bet > machine.maxBet) {
            alert(`Bet ${machine.minBet}–${machine.maxBet}.`);
            return;
          }
          if (!this.session.wallet.debit(bet, "slots", machine.name)) {
            alert("Not enough chips.");
            return;
          }
          contributeToProgressive(this.session, machine, bet);
          const reels = spinReels(machine);
          this.reels = reels;
          const jp = tryJackpot(this.session, machine, reels, bet, machine.maxBet);
          let { win: payout, reason: description } = calculatePayout(reels, bet, machine, jp);

          // Weekend Warrior one-shot +10% first spin
          const rpg = this.session.ensureRpgState();
          if (
            rpg.archetype === "weekend_warrior" &&
            !rpg.flags.weekend_warrior_spin_used &&
            payout > 0
          ) {
            const bonus = Math.floor(payout * 0.1);
            payout += bonus;
            rpg.flags.weekend_warrior_spin_used = true;
            description += ` (+10% WW bonus $${bonus})`;
          }

          // Cherry easter egg
          const names = reels.map((r) => r.name);
          if (names.filter((n) => n === "cherry").length >= 2) {
            rpg.flags.easter_cherry = true;
          }

          if (payout > 0) {
            this.session.wallet.credit(payout, "slots", description);
            this.sessionNet += payout - bet;
            this.lastLine = `WIN ${fmtChips(payout)} — ${description}`;
            this.hooks.onBigWin?.(payout);
          } else {
            this.sessionNet -= bet;
            this.lastLine = description || "No win — try again.";
          }
          rpg.flags.played_slots = true;
          this._render();
        },
      },
      { label: "Leave machine", onClick: () => this.close() },
    ]);
  }
}
