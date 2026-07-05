/** Keep in sync with mandalay_bay/activities/slots.py */
import { effectiveSlotStakes, formatStakeRange, tierUsesSalonLimits } from "./stakes.js";
import { secureRandomInt } from "./core.js";

/** Keep in sync with mandalay_bay/activities/slots.py */
const sym = (name, display, weight) => ({ name, display, weight });

const CLASSIC_SYMBOLS = [
  sym("seven", "7", 1),
  sym("bar", "BAR", 3),
  sym("bell", "🔔", 4),
  sym("cherry", "🍒", 6),
  sym("lemon", "🍋", 8),
  sym("diamond", "💎", 2),
];

const CLASSIC_PAYTABLE = {
  "seven|seven|seven": 100,
  "diamond|diamond|diamond": 50,
  "bell|bell|bell": 25,
  "bar|bar|bar": 15,
  "cherry|cherry|cherry": 10,
  "cherry|cherry": 2,
  cherry: 1,
};

export const MACHINES = [
  {
    id: "fortune",
    name: "Mandalay Fortune",
    minBet: 5,
    maxBet: 50,
    symbols: CLASSIC_SYMBOLS,
    paytable: CLASSIC_PAYTABLE,
    tagline: "Classic three-reel floor favorite.",
    cherryRules: true,
  },
  {
    id: "high_roller",
    name: "High Roller",
    minBet: 25,
    maxBet: 500,
    symbols: CLASSIC_SYMBOLS,
    paytable: CLASSIC_PAYTABLE,
    tagline: "High-limit room — same reels, bigger bets.",
    cherryRules: true,
  },
  {
    id: "megabucks",
    name: "Megabucks",
    minBet: 1,
    maxBet: 3,
    symbols: [
      sym("megabuck", "💵", 1),
      sym("seven", "7", 2),
      sym("bar", "BAR", 4),
      sym("bell", "🔔", 5),
      sym("cherry", "🍒", 7),
      sym("lemon", "🍋", 9),
    ],
    paytable: {
      "seven|seven|seven": 80,
      "bar|bar|bar": 20,
      "bell|bell|bell": 15,
      "cherry|cherry|cherry": 10,
      "megabuck|megabuck": 10,
      megabuck: 2,
    },
    tagline: "Wide-area progressive — max bet qualifies for the jackpot.",
    progressive: true,
    progressivePoolId: "megabucks",
    jackpotRequiresMaxBet: true,
    progressiveContributionRate: 0.03,
    progressiveSeed: 250000,
    jackpotKey: "megabuck|megabuck|megabuck",
  },
  {
    id: "wheel_of_fortune",
    name: "Wheel of Fortune",
    minBet: 1,
    maxBet: 25,
    symbols: [
      sym("wheel", "🎡", 1),
      sym("diamond", "💎", 2),
      sym("bar", "BAR", 4),
      sym("bell", "🔔", 5),
      sym("cherry", "🍒", 7),
      sym("lemon", "🍋", 9),
    ],
    paytable: {
      "wheel|wheel|wheel": 200,
      "diamond|diamond|diamond": 75,
      "bar|bar|bar": 25,
      "bell|bell|bell": 15,
      "cherry|cherry|cherry": 10,
      "cherry|cherry": 2,
      cherry: 1,
    },
    tagline: "Spin the wheel for bonus-sized wins.",
    cherryRules: true,
  },
  {
    id: "blazin_7s",
    name: "Blazin' 7s",
    minBet: 1,
    maxBet: 25,
    symbols: [
      sym("seven", "7", 3),
      sym("bar", "BAR", 4),
      sym("bell", "🔔", 5),
      sym("cherry", "🍒", 6),
      sym("lemon", "🍋", 8),
      sym("diamond", "💎", 2),
    ],
    paytable: {
      "seven|seven|seven": 150,
      "diamond|diamond|diamond": 40,
      "bar|bar|bar": 20,
      "bell|bell|bell": 12,
      "cherry|cherry|cherry": 8,
    },
    tagline: "Flaming sevens with sizzling top-line pays.",
  },
  {
    id: "buffalo_gold",
    name: "Buffalo Gold",
    minBet: 1,
    maxBet: 50,
    symbols: [
      sym("buffalo", "🦬", 2),
      sym("gold", "🥇", 3),
      sym("sunset", "🌅", 4),
      sym("eagle", "🦅", 5),
      sym("ace", "A", 6),
      sym("king", "K", 8),
    ],
    paytable: {
      "buffalo|buffalo|buffalo": 120,
      "gold|gold|gold": 60,
      "sunset|sunset|sunset": 30,
      "eagle|eagle|eagle": 20,
      "ace|ace|ace": 10,
      "buffalo|buffalo": 5,
    },
    tagline: "Stampede the reels for gold-coin bonuses.",
  },
  {
    id: "monte_carlo",
    name: "Monte Carlo",
    minBet: 1,
    maxBet: 5,
    symbols: [
      sym("crown", "👑", 1),
      sym("diamond", "💎", 2),
      sym("bar", "BAR", 4),
      sym("bell", "🔔", 5),
      sym("cherry", "🍒", 7),
      sym("lemon", "🍋", 9),
    ],
    paytable: {
      "crown|crown|crown": 100,
      "diamond|diamond|diamond": 50,
      "bar|bar|bar": 20,
      "bell|bell|bell": 12,
      "cherry|cherry|cherry": 8,
    },
    tagline: "Linked progressive with European elegance.",
    progressive: true,
    progressivePoolId: "mandalay_linked",
    jackpotRequiresMaxBet: true,
    progressiveContributionRate: 0.025,
    progressiveSeed: 50000,
    jackpotKey: "crown|crown|crown",
  },
  {
    id: "super_spin",
    name: "Super Spin",
    minBet: 1,
    maxBet: 5,
    symbols: [
      sym("star", "⭐", 1),
      sym("seven", "7", 2),
      sym("bar", "BAR", 4),
      sym("bell", "🔔", 5),
      sym("cherry", "🍒", 7),
      sym("lemon", "🍋", 9),
    ],
    paytable: {
      "seven|seven|seven": 90,
      "bar|bar|bar": 25,
      "bell|bell|bell": 15,
      "cherry|cherry|cherry": 10,
    },
    tagline: "Linked progressive — three stars trigger the jackpot.",
    progressive: true,
    progressivePoolId: "mandalay_linked",
    jackpotRequiresMaxBet: true,
    progressiveContributionRate: 0.025,
    progressiveSeed: 50000,
    jackpotKey: "star|star|star",
  },
  {
    id: "triple_red_hot_7s",
    name: "Triple Red Hot 7s",
    minBet: 1,
    maxBet: 25,
    symbols: [
      sym("seven", "7", 4),
      sym("bar", "BAR", 3),
      sym("bell", "🔔", 5),
      sym("cherry", "🍒", 6),
      sym("lemon", "🍋", 8),
    ],
    paytable: {
      "seven|seven|seven": 200,
      "bar|bar|bar": 30,
      "bell|bell|bell": 15,
      "cherry|cherry|cherry": 10,
      "cherry|cherry": 3,
    },
    tagline: "Red-hot triple sevens on every spin.",
    cherryRules: true,
  },
  {
    id: "double_jackpot",
    name: "Double Jackpot",
    minBet: 1,
    maxBet: 25,
    symbols: [
      sym("jackpot", "JP", 2),
      sym("seven", "7", 2),
      sym("bar", "BAR", 4),
      sym("bell", "🔔", 5),
      sym("cherry", "🍒", 7),
      sym("lemon", "🍋", 9),
    ],
    paytable: {
      "jackpot|jackpot|jackpot": 250,
      "seven|seven|seven": 100,
      "bar|bar|bar": 25,
      "bell|bell|bell": 15,
      "cherry|cherry|cherry": 10,
      "jackpot|jackpot": 15,
    },
    tagline: "Two-tier jackpots with blazing top symbols.",
  },
  {
    id: "spooky_link",
    name: "Spooky Link",
    minBet: 1,
    maxBet: 25,
    symbols: [
      sym("ghost", "👻", 2),
      sym("mummy", "🧟", 3),
      sym("yeti", "❄️", 4),
      sym("moon", "🌙", 5),
      sym("skull", "💀", 6),
      sym("bat", "🦇", 8),
    ],
    paytable: {
      "ghost|ghost|ghost": 100,
      "mummy|mummy|mummy": 60,
      "yeti|yeti|yeti": 40,
      "moon|moon|moon": 25,
      "skull|skull|skull": 15,
      "ghost|ghost": 5,
    },
    tagline: "Mo Mummy, Yo Yeti, and Go Ghost bonus features.",
  },
  {
    id: "wizard_of_oz",
    name: "Wizard of Oz — I'll Get You My Pretty",
    minBet: 1,
    maxBet: 25,
    symbols: [
      sym("witch", "🧙", 2),
      sym("slipper", "👠", 3),
      sym("emerald", "💚", 4),
      sym("tin", "🤖", 5),
      sym("lion", "🦁", 6),
      sym("scarecrow", "🌾", 8),
    ],
    paytable: {
      "witch|witch|witch": 150,
      "slipper|slipper|slipper": 80,
      "emerald|emerald|emerald": 50,
      "tin|tin|tin": 25,
      "lion|lion|lion": 15,
      "slipper|slipper": 5,
    },
    tagline: "Follow the yellow-brick road to Hold & Spin bonuses.",
  },
  {
    id: "emerald_guardian",
    name: "Emerald Guardian",
    minBet: 1,
    maxBet: 25,
    symbols: [
      sym("guardian", "🐉", 2),
      sym("emerald", "💚", 3),
      sym("shield", "🛡️", 4),
      sym("sword", "⚔️", 5),
      sym("gem", "💎", 6),
      sym("coin", "🪙", 8),
    ],
    paytable: {
      "guardian|guardian|guardian": 175,
      "emerald|emerald|emerald": 75,
      "shield|shield|shield": 40,
      "sword|sword|sword": 25,
      "gem|gem|gem": 15,
      "emerald|emerald": 5,
    },
    tagline: "Defend the emerald vault for guardian jackpots.",
  },
  {
    id: "tiger_and_dragon",
    name: "Tiger and Dragon — Super Bonus",
    minBet: 1,
    maxBet: 50,
    symbols: [
      sym("tiger", "🐯", 2),
      sym("dragon", "🐲", 2),
      sym("pearl", "🔮", 4),
      sym("fan", "🪭", 5),
      sym("coin", "🪙", 6),
      sym("lantern", "🏮", 8),
    ],
    paytable: {
      "tiger|tiger|tiger": 120,
      "dragon|dragon|dragon": 120,
      "tiger|tiger|dragon": 80,
      "dragon|dragon|tiger": 80,
      "pearl|pearl|pearl": 40,
      "fan|fan|fan": 20,
      "coin|coin|coin": 10,
    },
    tagline: "East-meets-West super bonus with dual jackpots.",
  },
];

const ASCII_SYMBOLS = new Set([
  "bell", "cherry", "lemon", "diamond", "buffalo", "gold", "sunset", "eagle",
  "ghost", "mummy", "yeti", "moon", "skull", "bat", "witch", "slipper",
  "emerald", "tin", "lion", "scarecrow", "guardian", "shield", "sword", "gem",
  "coin", "tiger", "dragon", "pearl", "fan", "lantern", "wheel", "crown",
  "star", "megabuck",
]);

export function getMachine(machineId) {
  return MACHINES.find((m) => m.id === machineId) ?? MACHINES[0];
}

export function progressivePool(session, poolId, seed) {
  return session.progressivePools?.[poolId] ?? seed;
}

export function contributeToProgressive(session, machine, bet) {
  if (!machine.progressive || !machine.progressivePoolId) return;
  if (!session.progressivePools) session.progressivePools = {};
  const poolId = machine.progressivePoolId;
  const current = progressivePool(session, poolId, machine.progressiveSeed);
  const contribution = Math.max(1, Math.floor(bet * machine.progressiveContributionRate));
  session.progressivePools[poolId] = current + contribution;
}

function weightedPick(symbols) {
  const pool = [];
  for (const symObj of symbols) {
    for (let i = 0; i < symObj.weight; i++) pool.push(symObj);
  }
  return pool[secureRandomInt(0, pool.length - 1)];
}

export function spinReels(machine) {
  return [weightedPick(machine.symbols), weightedPick(machine.symbols), weightedPick(machine.symbols)];
}

export function displaySymbol(symObj, useUnicode) {
  if (!useUnicode && ASCII_SYMBOLS.has(symObj.name)) {
    return symObj.name.slice(0, 3).toUpperCase();
  }
  return symObj.display;
}

function jackpotEligible(machine, bet, effectiveMax) {
  if (!machine.jackpotRequiresMaxBet) return true;
  return bet >= effectiveMax;
}

export function tryJackpot(session, machine, reels, bet, effectiveMax) {
  if (!machine.progressive || !machine.jackpotKey || !machine.progressivePoolId) return null;
  const line = reels.map((r) => r.name).join("|");
  if (line !== machine.jackpotKey) return null;
  if (!jackpotEligible(machine, bet, effectiveMax)) return null;
  const poolId = machine.progressivePoolId;
  const amount = progressivePool(session, poolId, machine.progressiveSeed);
  if (!session.progressivePools) session.progressivePools = {};
  session.progressivePools[poolId] = machine.progressiveSeed;
  return amount;
}

export function calculatePayout(reels, bet, machine, jackpotAmount = null) {
  const keys = reels.map((r) => r.name);
  const line = keys.join("|");

  if (machine.jackpotKey && line === machine.jackpotKey && jackpotAmount != null) {
    return { win: jackpotAmount, reason: `PROGRESSIVE JACKPOT! ${jackpotAmount.toLocaleString()} chips!` };
  }

  if (machine.paytable[line] !== undefined) {
    const mult = machine.paytable[line];
    return { win: bet * mult, reason: `Three ${reels[0].display}! ${mult}x` };
  }

  if (machine.cherryRules) {
    if (keys[0] === "cherry" && keys[1] === "cherry" && machine.paytable["cherry|cherry"] !== undefined) {
      const mult = machine.paytable["cherry|cherry"];
      return { win: bet * mult, reason: `Two cherries! ${mult}x` };
    }
    if (keys[0] === "cherry" && machine.paytable.cherry !== undefined) {
      const mult = machine.paytable.cherry;
      return { win: bet * mult, reason: "Cherry on line! 1x (bet returned)" };
    }
  }

  if (keys[0] === keys[1]) {
    const pairKey = `${keys[0]}|${keys[1]}`;
    if (machine.paytable[pairKey] !== undefined) {
      const mult = machine.paytable[pairKey];
      return { win: bet * mult, reason: `Two ${reels[0].display}! ${mult}x` };
    }
  }

  if (machine.paytable[keys[0]] !== undefined && !keys[0].includes("|")) {
    const mult = machine.paytable[keys[0]];
    return { win: bet * mult, reason: `${reels[0].display} on line! ${mult}x` };
  }

  return { win: 0, reason: "No win" };
}

export function formatPaytableText(machine) {
  const entries = Object.entries(machine.paytable).sort((a, b) => b[1] - a[1]);
  const parts = entries.map(([key, mult]) => {
    const bits = key.split("|");
    if (bits.length === 3 && bits[0] === bits[1] && bits[1] === bits[2]) {
      return `${bits[0]}×3 = ${mult}x`;
    }
    if (bits.length === 2) return `${bits[0]}×2 = ${mult}x`;
    return `${key} (1st) = ${mult}x`;
  });
  if (machine.progressive && machine.jackpotKey) {
    const symName = machine.jackpotKey.split("|")[0];
    const req = machine.jackpotRequiresMaxBet ? "max bet" : "any bet";
    parts.unshift(`${symName}×3 = PROGRESSIVE (${req})`);
  }
  return parts.join(" | ");
}

export function formatMachineLabel(machine, session, tier = null) {
  const balance = session?.wallet?.balance ?? machine.maxBet;
  let range;
  if (tier) {
    const stakes = effectiveSlotStakes(machine, tier, balance);
    range = formatStakeRange(stakes.minBet, stakes.maxBet, {
      noCap: tier.maxBet == null && tierUsesSalonLimits(tier),
    });
  } else {
    range = `${machine.minBet}-${machine.maxBet} chips`;
  }
  if (machine.progressive && machine.progressivePoolId && session) {
    const pool = progressivePool(session, machine.progressivePoolId, machine.progressiveSeed);
    return `${machine.name} (${range}) — Jackpot: ${pool.toLocaleString()}`;
  }
  return `${machine.name} (${range})`;
}

/** @deprecated use formatPaytableText(machine) */
export const PAYTABLE_TEXT =
  "Paytable: 7-7-7 = 100x | 💎💎💎 = 50x | 🔔🔔🔔 = 25x | BAR×3 = 15x | Two cherries = 2x | One cherry = bet returned";
