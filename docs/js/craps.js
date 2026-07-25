import { secureRandomInt } from "./core.js";

export const FIELD_NUMBERS = new Set([2, 3, 4, 9, 10, 11, 12]);
export const FIELD_DOUBLE = new Set([2, 12]);

export const SIDE_BETS = {
  field: { label: "Field (2,3,4,9,10,11,12)", kind: "one_roll" },
  any_craps: { label: "Any Craps (2,3,12) — 7:1", kind: "one_roll", payout: 7 },
  any_seven: { label: "Any Seven — 4:1", kind: "one_roll", payout: 4 },
  hard_4: { label: "Hard 4 — 7:1", kind: "hardway", payout: 7, target: 4 },
  hard_6: { label: "Hard 6 — 9:1", kind: "hardway", payout: 9, target: 6 },
  hard_8: { label: "Hard 8 — 9:1", kind: "hardway", payout: 9, target: 8 },
  hard_10: { label: "Hard 10 — 7:1", kind: "hardway", payout: 7, target: 10 },
};

export function rollDice() {
  const die1 = secureRandomInt(1, 6);
  const die2 = secureRandomInt(1, 6);
  const total = die1 + die2;
  const isHard = die1 === die2 && [4, 6, 8, 10].includes(total);
  return {
    die1,
    die2,
    total,
    isHard,
    label: `${die1}-${die2} (${total}${isHard ? " hard" : ""})`,
  };
}

export class CrapsTable {
  constructor() {
    this.point = null;
    this.lastRoll = null;
    this.rolls = [];
    this.message = "Place your bets — come-out roll.";
  }

  get phase() {
    return this.point ? "point" : "comeout";
  }

  roll() {
    const roll = rollDice();
    this.lastRoll = roll;
    this.rolls.push(roll);
    if (this.rolls.length > 24) this.rolls = this.rolls.slice(-24);
    return roll;
  }

  /**
   * Resolve pass line. Returns { payout, working, message }.
   * working=true means stake stays on the table (point established / still out).
   */
  resolvePassLine(stake, roll) {
    const total = roll.total;
    if (this.point == null) {
      if (total === 7 || total === 11) {
        this.message = `Come-out ${roll.label} — Pass Line wins!`;
        return { payout: stake * 2, working: false, message: this.message };
      }
      if (total === 2 || total === 3 || total === 12) {
        this.message = `Come-out ${roll.label} — craps, Pass Line loses.`;
        return { payout: 0, working: false, message: this.message };
      }
      this.point = total;
      this.message = `Come-out ${roll.label} — point is ${total}.`;
      return { payout: 0, working: true, message: this.message };
    }
    if (total === this.point) {
      this.message = `${roll.label} — point ${this.point} hit! Pass Line wins.`;
      this.point = null;
      return { payout: stake * 2, working: false, message: this.message };
    }
    if (total === 7) {
      this.message = `${roll.label} — seven-out. Pass Line loses.`;
      this.point = null;
      return { payout: 0, working: false, message: this.message };
    }
    this.message = `${roll.label} — point ${this.point} still working.`;
    return { payout: 0, working: true, message: this.message };
  }

  resolveDontPass(stake, roll, pointBefore) {
    const total = roll.total;
    if (pointBefore == null) {
      if (total === 2 || total === 3) {
        return { payout: stake * 2, working: false, message: `Come-out ${roll.label} — Don't Pass wins!` };
      }
      if (total === 12) {
        return { payout: stake, working: false, message: `Come-out ${roll.label} — Don't Pass push (12).` };
      }
      if (total === 7 || total === 11) {
        return { payout: 0, working: false, message: `Come-out ${roll.label} — Don't Pass loses.` };
      }
      return { payout: 0, working: true, message: `Don't Pass working against point ${total}.` };
    }
    if (total === 7) {
      return { payout: stake * 2, working: false, message: `${roll.label} — seven-out! Don't Pass wins.` };
    }
    if (total === pointBefore) {
      return { payout: 0, working: false, message: `${roll.label} — point hit. Don't Pass loses.` };
    }
    return { payout: 0, working: true, message: `Don't Pass still working against ${pointBefore}.` };
  }

  resolveSideBet(betId, stake, roll) {
    const total = roll.total;
    const meta = SIDE_BETS[betId];
    if (!meta) throw new Error(`Unknown side bet ${betId}`);

    if (betId === "field") {
      if (FIELD_DOUBLE.has(total)) {
        const payout = stake + stake * 2;
        return { payout, working: false, message: `Field hits ${total} (2:1) — paid ${payout}.` };
      }
      if (FIELD_NUMBERS.has(total)) {
        const payout = stake * 2;
        return { payout, working: false, message: `Field hits ${total} — paid ${payout}.` };
      }
      return { payout: 0, working: false, message: `Field misses on ${total}.` };
    }
    if (betId === "any_craps") {
      if (total === 2 || total === 3 || total === 12) {
        const payout = stake + stake * 7;
        return { payout, working: false, message: `Any Craps hits ${total} — paid ${payout}.` };
      }
      return { payout: 0, working: false, message: `Any Craps misses on ${total}.` };
    }
    if (betId === "any_seven") {
      if (total === 7) {
        const payout = stake + stake * 4;
        return { payout, working: false, message: `Any Seven hits — paid ${payout}.` };
      }
      return { payout: 0, working: false, message: `Any Seven misses on ${total}.` };
    }
    // Hardways — multi-roll until hit or seven/soft
    const target = meta.target;
    if (total === target && roll.isHard) {
      const payout = stake + stake * meta.payout;
      return { payout, working: false, message: `Hard ${target} hits — paid ${payout}.` };
    }
    if (total === target || total === 7) {
      return { payout: 0, working: false, message: `Hard ${target} loses on ${roll.label}.` };
    }
    return { payout: 0, working: true, message: `Hard ${target} still working (${roll.label}).` };
  }
}
