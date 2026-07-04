import { secureRandomInt } from "./core.js";

export const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export const BET_TYPES = [
  { kind: "straight", label: "Single number (35:1)", payout: 35, numbers: null },
  { kind: "red", label: "Red (1:1)", payout: 1, numbers: RED_NUMBERS },
  { kind: "black", label: "Black (1:1)", payout: 1, numbers: new Set([...Array(36)].map((_, i) => i + 1).filter((n) => !RED_NUMBERS.has(n))) },
  { kind: "odd", label: "Odd (1:1)", payout: 1, numbers: new Set([...Array(36)].map((_, i) => i + 1).filter((n) => n % 2 === 1)) },
  { kind: "even", label: "Even (1:1)", payout: 1, numbers: new Set([...Array(36)].map((_, i) => i + 1).filter((n) => n % 2 === 0)) },
  { kind: "low", label: "1–18 (1:1)", payout: 1, numbers: new Set([...Array(18)].map((_, i) => i + 1)) },
  { kind: "high", label: "19–36 (1:1)", payout: 1, numbers: new Set([...Array(18)].map((_, i) => i + 19)) },
  { kind: "dozen1", label: "1st dozen 1–12 (2:1)", payout: 2, numbers: new Set([...Array(12)].map((_, i) => i + 1)) },
  { kind: "dozen2", label: "2nd dozen 13–24 (2:1)", payout: 2, numbers: new Set([...Array(12)].map((_, i) => i + 13)) },
  { kind: "dozen3", label: "3rd dozen 25–36 (2:1)", payout: 2, numbers: new Set([...Array(12)].map((_, i) => i + 25)) },
];

export function spinWheel() {
  return secureRandomInt(0, 36);
}

export function wheelColor(number) {
  if (number === 0) return "green";
  return RED_NUMBERS.has(number) ? "red" : "black";
}

export function resolveBet(bet, amount, number, straightPick = null) {
  if (bet.kind === "straight") {
    if (straightPick == null) return { win: 0, reason: "No number selected" };
    if (number === straightPick) {
      const win = amount * bet.payout + amount;
      return { win, reason: `Hit ${number}! ${bet.payout}:1` };
    }
    return { win: 0, reason: `Ball landed on ${number}, you picked ${straightPick}` };
  }
  if (number === 0) return { win: 0, reason: "Ball landed on 0 (green) — outside bets lose" };
  if (bet.numbers.has(number)) {
    const win = amount * bet.payout + amount;
    return { win, reason: `Winner! ${bet.label.split("(")[0].trim()} — ${bet.payout}:1` };
  }
  return { win: 0, reason: `Ball on ${number} — no win` };
}
