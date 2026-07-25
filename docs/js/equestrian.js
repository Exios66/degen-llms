import { secureRandomInt, fisherYatesShuffle } from "./core.js";

// ── Shared helpers ────────────────────────────────────────────────────────────

export function fmtOddsEq(odds) {
  return odds > 0 ? `+${odds}` : String(odds);
}

function payoutWin(amount, odds) {
  if (odds > 0) return amount + Math.floor((amount * odds) / 100);
  return amount + Math.floor((amount * 100) / Math.abs(odds));
}

// ── Dressage ──────────────────────────────────────────────────────────────────

const DRESSAGE_RIDERS = [
  ["Isabelle Fontaine", "Éclat du Soir"],
  ["Klaus von Reiter", "Silbersturm"],
  ["Sofia Ramirez", "Fuego Dorado"],
  ["Emma Blackwell", "Midnight Sonata"],
  ["Henrik Larsson", "Kronborg Prince"],
  ["Yuki Tanaka", "Sakura Waltz"],
  ["Olivia Hartford", "Royal Minuet"],
  ["Marco Bellini", "Venezia Danza"],
];

const DRESSAGE_LEVELS = ["Grand Prix", "Grand Prix Spécial", "Grand Prix Freestyle"];
const DRESSAGE_ARENAS = ["Mandalay Grand Arena", "Pavilion Dressage Ring", "Indoor Arena A"];

export function generateDressage() {
  const level = DRESSAGE_LEVELS[secureRandomInt(0, DRESSAGE_LEVELS.length - 1)];
  const arena = DRESSAGE_ARENAS[secureRandomInt(0, DRESSAGE_ARENAS.length - 1)];
  const count = secureRandomInt(4, 6);
  const shuffled = fisherYatesShuffle([...DRESSAGE_RIDERS]);
  const chosen = shuffled.slice(0, count);

  const entries = chosen.map(([rider, horse], i) => {
    const tech = 55 + secureRandomInt(0, 300) / 10;
    const art = 55 + secureRandomInt(0, 300) / 10;
    const combined = (tech + art) / 2;
    let odds;
    if (combined >= 75) odds = [-180, -150, -120][secureRandomInt(0, 2)];
    else if (combined >= 67) odds = [110, 140, 180][secureRandomInt(0, 2)];
    else odds = [220, 300, 450][secureRandomInt(0, 2)];
    return { number: i + 1, rider, horse, tech, art, combined, odds };
  });

  return { level, arena, entries, results: null };
}

export function simulateDressage(card) {
  const scored = card.entries.map((e) => {
    const noise = (secureRandomInt(0, 60) - 30) / 10;
    return { number: e.number, score: e.combined + noise };
  });
  scored.sort((a, b) => b.score - a.score);
  card.results = scored.map((s) => s.number);
  return card.results;
}

export function settleDressageTicket(slip, results) {
  const pos = results.indexOf(slip.entry) + 1;
  if (slip.betType === "win" && pos === 1) {
    const payout = payoutWin(slip.amount, slip.odds);
    return { won: true, payout, net: payout - slip.amount, reason: `Win — #${slip.entry} placed 1st` };
  }
  if (slip.betType === "place" && pos <= 2) {
    const payout = slip.amount * 2;
    return { won: true, payout, net: payout - slip.amount, reason: `Place — #${slip.entry} placed ${pos}` };
  }
  if (slip.betType === "show" && pos <= 3) {
    const payout = slip.amount * 2;
    return { won: true, payout, net: payout - slip.amount, reason: `Show — #${slip.entry} placed ${pos}` };
  }
  return { won: false, payout: 0, net: -slip.amount, reason: `#${slip.entry} placed ${pos}` };
}

// ── Show Jumping ──────────────────────────────────────────────────────────────

const JUMPER_RIDERS = [
  ["Claudia Mercer", "Firefly"],
  ["Jan de Vries", "Dutch Courage"],
  ["Amara Osei", "Golden Horizon"],
  ["Lucas Bertrand", "Vent du Nord"],
  ["Priya Sharma", "Maharaja"],
  ["Caitlin O'Brien", "Irish Storm"],
  ["Tomas Kowalski", "Warsaw Knight"],
  ["Rin Nakamura", "Hayabusa"],
];

const JUMPER_COURSES = [
  "Mandalay Grand Prix Course",
  "Pavilion Jumper Ring",
  "Open Derby Field",
];

const FENCE_COUNT = 12;

export function generateJumper() {
  const course = JUMPER_COURSES[secureRandomInt(0, JUMPER_COURSES.length - 1)];
  const count = secureRandomInt(4, 6);
  const shuffled = fisherYatesShuffle([...JUMPER_RIDERS]);
  const chosen = shuffled.slice(0, count);

  const entries = chosen.map(([rider, horse], i) => {
    const ability = 0.45 + secureRandomInt(0, 500) / 1000;
    let odds;
    if (ability > 0.82) odds = [-200, -160, -130][secureRandomInt(0, 2)];
    else if (ability > 0.65) odds = [100, 130, 170][secureRandomInt(0, 2)];
    else odds = [230, 310, 500][secureRandomInt(0, 2)];
    return { number: i + 1, rider, horse, ability, odds };
  });

  return { course, fenceCount: FENCE_COUNT, entries, results: null };
}

export function simulateJumper(card) {
  const results = card.entries.map((e) => {
    let faults = 0;
    for (let f = 0; f < card.fenceCount; f++) {
      const roll = secureRandomInt(0, 999) / 1000;
      if (roll > e.ability) {
        faults += secureRandomInt(0, 1) === 0 ? 4 : 1;
      }
    }
    const baseTime = 58 + secureRandomInt(0, 200) / 10;
    const noise = (secureRandomInt(0, 40) - 20) / 10;
    return { entryNumber: e.number, faults, timeSeconds: Math.round((baseTime + noise) * 100) / 100 };
  });
  results.sort((a, b) => a.faults - b.faults || a.timeSeconds - b.timeSeconds);
  card.results = results;
  return results;
}

export function settleJumperTicket(slip, results) {
  const pos = results.findIndex((r) => r.entryNumber === slip.entry) + 1;
  const result = results.find((r) => r.entryNumber === slip.entry);
  if (slip.betType === "win" && pos === 1) {
    const payout = payoutWin(slip.amount, slip.odds);
    return { won: true, payout, net: payout - slip.amount, reason: `Win — #${slip.entry} finished 1st` };
  }
  if (slip.betType === "place" && pos <= 2) {
    const payout = slip.amount * 2;
    return { won: true, payout, net: payout - slip.amount, reason: `Place — #${slip.entry} finished ${pos}` };
  }
  if (slip.betType === "show" && pos <= 3) {
    const payout = slip.amount * 2;
    return { won: true, payout, net: payout - slip.amount, reason: `Show — #${slip.entry} finished ${pos}` };
  }
  if (slip.betType === "clear" && result?.faults === 0) {
    const payout = slip.amount * 3;
    return { won: true, payout, net: payout - slip.amount, reason: `Clear round — #${slip.entry} (0 faults)` };
  }
  const faultNote = result ? ` (${result.faults} faults)` : "";
  return { won: false, payout: 0, net: -slip.amount, reason: `#${slip.entry} finished ${pos}${faultNote}` };
}
