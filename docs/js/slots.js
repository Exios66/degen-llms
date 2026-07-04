import { secureRandomInt } from "./core.js";

const SYMBOLS = [
  { name: "seven", display: "7", weight: 1 },
  { name: "bar", display: "BAR", weight: 3 },
  { name: "bell", display: "🔔", weight: 4 },
  { name: "cherry", display: "🍒", weight: 6 },
  { name: "lemon", display: "🍋", weight: 8 },
  { name: "diamond", display: "💎", weight: 2 },
];

const PAYTABLE = {
  "seven|seven|seven": 100,
  "diamond|diamond|diamond": 50,
  "bell|bell|bell": 25,
  "bar|bar|bar": 15,
  "cherry|cherry|cherry": 10,
  "cherry|cherry": 2,
  cherry: 1,
};

export const MACHINES = [
  { id: "fortune", name: "Mandalay Fortune (5-50 chips)", minBet: 5, maxBet: 50 },
  { id: "high_roller", name: "High Roller (25-500 chips)", minBet: 25, maxBet: 500 },
];

function weightedPick() {
  const pool = [];
  for (const sym of SYMBOLS) {
    for (let i = 0; i < sym.weight; i++) pool.push(sym);
  }
  return pool[secureRandomInt(0, pool.length - 1)];
}

export function spinReels() {
  return [weightedPick(), weightedPick(), weightedPick()];
}

export function displaySymbol(sym, useUnicode) {
  if (!useUnicode && ["bell", "cherry", "lemon", "diamond"].includes(sym.name)) {
    return sym.name.slice(0, 3).toUpperCase();
  }
  return sym.display;
}

export function calculatePayout(reels, bet) {
  const keys = reels.map((r) => r.name);
  const line = keys.join("|");
  if (PAYTABLE[line] !== undefined) {
    const mult = PAYTABLE[line];
    return { win: bet * mult, reason: `Three ${reels[0].display}! ${mult}x` };
  }
  if (keys[0] === "cherry" && keys[1] === "cherry") {
    return { win: bet * PAYTABLE["cherry|cherry"], reason: "Two cherries! 2x" };
  }
  if (keys[0] === "cherry") {
    return { win: bet * PAYTABLE.cherry, reason: "Cherry on line! 1x (bet returned)" };
  }
  return { win: 0, reason: "No win" };
}

export const PAYTABLE_TEXT =
  "Paytable: 7-7-7 = 100x | 💎💎💎 = 50x | 🔔🔔🔔 = 25x | BAR×3 = 15x | Two cherries = 2x | One cherry = bet returned";
