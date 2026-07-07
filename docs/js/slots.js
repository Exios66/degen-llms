/** Keep in sync with mandalay_bay/activities/slots.py */
import { effectiveSlotStakes, formatStakeRange, tierUsesSalonLimits } from "./stakes.js";
import { secureRandomInt } from "./core.js";

/**
 * PAR-sheet profile for the parody floor.
 * Real Nevada penny/low-limit strips land ~88–92% base RTP with ~20–28% hit frequency.
 * We nudge stops toward more small wins for a tantalizing (not blatant) parody feel.
 */
export const SLOT_PAR_TARGETS = {
  rtpMin: 0.92,
  rtpMax: 0.97,
  hitFrequencyMin: 0.30,
};

/** Keep in sync with mandalay_bay/activities/slots.py */
const sym = (name, display, weight) => ({ name, display, weight });

const CLASSIC_SYMBOLS = [
  sym("seven", "7", 1),
  sym("diamond", "💎", 2),
  sym("bar", "BAR", 5),
  sym("bell", "🔔", 5),
  sym("cherry", "🍒", 11),
  sym("lemon", "🍋", 8),
];

const CLASSIC_PAYTABLE = {
  "seven|seven|seven": 200,
  "diamond|diamond|diamond": 100,
  "bell|bell|bell": 50,
  "bar|bar|bar": 30,
  "cherry|cherry|cherry": 20,
  "cherry|cherry": 4,
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
      sym("megabuck", "💵", 2),
      sym("seven", "7", 2),
      sym("bar", "BAR", 5),
      sym("bell", "🔔", 5),
      sym("cherry", "🍒", 10),
      sym("lemon", "🍋", 8),
    ],
    paytable: {
      "seven|seven|seven": 200,
      "bar|bar|bar": 50,
      "bell|bell|bell": 40,
      "cherry|cherry|cherry": 25,
      "cherry|cherry": 5,
      cherry: 1,
      "megabuck|megabuck": 25,
      megabuck: 3,
    },
    tagline: "Wide-area progressive — max bet qualifies for the jackpot.",
    progressive: true,
    progressivePoolId: "megabucks",
    jackpotRequiresMaxBet: true,
    progressiveContributionRate: 0.03,
    progressiveSeed: 1000000,
    jackpotKey: "megabuck|megabuck|megabuck",
    cherryRules: true,
  },
  {
    id: "wheel_of_fortune",
    name: "Wheel of Fortune",
    minBet: 1,
    maxBet: 25,
    symbols: [
      sym("wheel", "🎡", 1),
      sym("diamond", "💎", 2),
      sym("bar", "BAR", 5),
      sym("bell", "🔔", 5),
      sym("cherry", "🍒", 11),
      sym("lemon", "🍋", 8),
    ],
    paytable: {
      "wheel|wheel|wheel": 500,
      "diamond|diamond|diamond": 200,
      "bar|bar|bar": 60,
      "bell|bell|bell": 40,
      "cherry|cherry|cherry": 25,
      "cherry|cherry": 5,
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
      sym("bar", "BAR", 6),
      sym("bell", "🔔", 5),
      sym("cherry", "🍒", 12),
      sym("lemon", "🍋", 8),
      sym("diamond", "💎", 2),
    ],
    paytable: {
      "seven|seven|seven": 400,
      "diamond|diamond|diamond": 100,
      "bar|bar|bar": 50,
      "bell|bell|bell": 30,
      "cherry|cherry|cherry": 20,
      "cherry|cherry": 7,
      cherry: 1,
    },
    tagline: "Flaming sevens with sizzling top-line pays.",
    cherryRules: true,
  },
  {
    id: "buffalo_gold",
    name: "Buffalo Gold",
    minBet: 1,
    maxBet: 50,
    symbols: [
      sym("buffalo", "🦬", 6),
      sym("gold", "🥇", 6),
      sym("sunset", "🌅", 6),
      sym("eagle", "🦅", 7),
      sym("ace", "A", 8),
      sym("king", "K", 9),
    ],
    paytable: {
      "buffalo|buffalo|buffalo": 300,
      "gold|gold|gold": 150,
      "sunset|sunset|sunset": 75,
      "eagle|eagle|eagle": 50,
      "ace|ace|ace": 25,
      "buffalo|buffalo": 10,
      "ace|ace": 5,
    },
    tagline: "Stampede the reels for gold-coin bonuses.",
  },
  {
    id: "monte_carlo",
    name: "Monte Carlo",
    minBet: 1,
    maxBet: 5,
    symbols: [
      sym("crown", "👑", 2),
      sym("diamond", "💎", 3),
      sym("bar", "BAR", 6),
      sym("bell", "🔔", 6),
      sym("cherry", "🍒", 12),
      sym("lemon", "🍋", 8),
    ],
    paytable: {
      "crown|crown|crown": 250,
      "diamond|diamond|diamond": 125,
      "bar|bar|bar": 60,
      "bell|bell|bell": 40,
      "cherry|cherry|cherry": 25,
      "cherry|cherry": 7,
      cherry: 1,
    },
    tagline: "Linked progressive with European elegance.",
    progressive: true,
    progressivePoolId: "mandalay_linked",
    jackpotRequiresMaxBet: true,
    progressiveContributionRate: 0.025,
    progressiveSeed: 250000,
    jackpotKey: "crown|crown|crown",
    cherryRules: true,
  },
  {
    id: "super_spin",
    name: "Super Spin",
    minBet: 1,
    maxBet: 5,
    symbols: [
      sym("star", "⭐", 2),
      sym("seven", "7", 3),
      sym("bar", "BAR", 5),
      sym("bell", "🔔", 6),
      sym("cherry", "🍒", 12),
      sym("lemon", "🍋", 8),
    ],
    paytable: {
      "seven|seven|seven": 225,
      "bar|bar|bar": 60,
      "bell|bell|bell": 40,
      "cherry|cherry|cherry": 25,
      "cherry|cherry": 5,
      cherry: 1,
    },
    tagline: "Linked progressive — three stars trigger the jackpot.",
    progressive: true,
    progressivePoolId: "mandalay_linked",
    jackpotRequiresMaxBet: true,
    progressiveContributionRate: 0.025,
    progressiveSeed: 250000,
    jackpotKey: "star|star|star",
    cherryRules: true,
  },
  {
    id: "triple_red_hot_7s",
    name: "Triple Red Hot 7s",
    minBet: 1,
    maxBet: 25,
    symbols: [
      sym("seven", "7", 2),
      sym("bar", "BAR", 5),
      sym("bell", "🔔", 5),
      sym("cherry", "🍒", 11),
      sym("lemon", "🍋", 8),
    ],
    paytable: {
      "seven|seven|seven": 175,
      "bar|bar|bar": 60,
      "bell|bell|bell": 30,
      "cherry|cherry|cherry": 20,
      "cherry|cherry": 5,
      cherry: 1,
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
      sym("jackpot", "JP", 3),
      sym("seven", "7", 3),
      sym("bar", "BAR", 5),
      sym("bell", "🔔", 6),
      sym("cherry", "🍒", 10),
      sym("lemon", "🍋", 8),
    ],
    paytable: {
      "jackpot|jackpot|jackpot": 500,
      "seven|seven|seven": 200,
      "bar|bar|bar": 60,
      "bell|bell|bell": 40,
      "cherry|cherry|cherry": 25,
      "cherry|cherry": 5,
      cherry: 1,
      "jackpot|jackpot": 25,
    },
    tagline: "Two-tier jackpots with blazing top symbols.",
    cherryRules: true,
  },
  {
    id: "spooky_link",
    name: "Spooky Link",
    minBet: 1,
    maxBet: 25,
    symbols: [
      sym("ghost", "👻", 4),
      sym("mummy", "🧟", 5),
      sym("yeti", "❄️", 5),
      sym("moon", "🌙", 6),
      sym("skull", "💀", 7),
      sym("bat", "🦇", 8),
    ],
    paytable: {
      "ghost|ghost|ghost": 250,
      "mummy|mummy|mummy": 150,
      "yeti|yeti|yeti": 100,
      "moon|moon|moon": 60,
      "skull|skull|skull": 40,
      "ghost|ghost": 12,
      "skull|skull": 5,
      "bat|bat": 5,
    },
    tagline: "Mo Mummy, Yo Yeti, and Go Ghost bonus features.",
  },
  {
    id: "wizard_of_oz",
    name: "Wizard of Oz — I'll Get You My Pretty",
    minBet: 1,
    maxBet: 25,
    symbols: [
      sym("witch", "🧙", 4),
      sym("slipper", "👠", 5),
      sym("emerald", "💚", 5),
      sym("tin", "🤖", 6),
      sym("lion", "🦁", 7),
      sym("scarecrow", "🌾", 8),
    ],
    paytable: {
      "witch|witch|witch": 400,
      "slipper|slipper|slipper": 200,
      "emerald|emerald|emerald": 125,
      "tin|tin|tin": 60,
      "lion|lion|lion": 40,
      "slipper|slipper": 12,
    },
    tagline: "Follow the yellow-brick road to Hold & Spin bonuses.",
  },
  {
    id: "emerald_guardian",
    name: "Emerald Guardian",
    minBet: 1,
    maxBet: 25,
    symbols: [
      sym("guardian", "🐉", 4),
      sym("emerald", "💚", 5),
      sym("shield", "🛡️", 5),
      sym("sword", "⚔️", 6),
      sym("gem", "💎", 7),
      sym("coin", "🪙", 8),
    ],
    paytable: {
      "guardian|guardian|guardian": 450,
      "emerald|emerald|emerald": 200,
      "shield|shield|shield": 100,
      "sword|sword|sword": 60,
      "gem|gem|gem": 40,
      "emerald|emerald": 12,
    },
    tagline: "Defend the emerald vault for guardian jackpots.",
  },
  {
    id: "tiger_and_dragon",
    name: "Tiger and Dragon — Super Bonus",
    minBet: 1,
    maxBet: 50,
    symbols: [
      sym("tiger", "🐯", 4),
      sym("dragon", "🐲", 4),
      sym("pearl", "🔮", 5),
      sym("fan", "🪭", 6),
      sym("coin", "🪙", 7),
      sym("lantern", "🏮", 8),
    ],
    paytable: {
      "tiger|tiger|tiger": 300,
      "dragon|dragon|dragon": 300,
      "tiger|tiger|dragon": 90,
      "dragon|dragon|tiger": 90,
      "pearl|pearl|pearl": 100,
      "fan|fan|fan": 50,
      "coin|coin|coin": 25,
      "coin|coin": 8,
      "fan|fan": 5,
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

/** Exact PAR-sheet base-game RTP (excludes progressive jackpots). */
export function estimateBaseGameRtp(machine) {
  const symbols = machine.symbols;
  const totalW = symbols.reduce((sum, s) => sum + s.weight, 0);
  const probs = symbols.map((s) => s.weight / totalW);
  let rtp = 0;
  let hitFrequency = 0;
  for (let i = 0; i < symbols.length; i += 1) {
    for (let j = 0; j < symbols.length; j += 1) {
      for (let k = 0; k < symbols.length; k += 1) {
        const reels = [symbols[i], symbols[j], symbols[k]];
        const probability = probs[i] * probs[j] * probs[k];
        const { win } = calculatePayout(reels, 1, machine, null);
        rtp += probability * win;
        if (win > 0) hitFrequency += probability;
      }
    }
  }
  return { rtp, hitFrequency };
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

export function calculatePayout(reels, bet, machine, jackpotAmount = null, tierBoost = 1.0) {
  const keys = reels.map((r) => r.name);
  const line = keys.join("|");

  if (machine.jackpotKey && line === machine.jackpotKey && jackpotAmount != null) {
    return { win: jackpotAmount, reason: `PROGRESSIVE JACKPOT! ${jackpotAmount.toLocaleString()} chips!` };
  }

  function apply(baseMult, label) {
    const effective = Math.round(baseMult * tierBoost);
    const boostTag = tierBoost !== 1.0 ? ` (${tierBoost.toFixed(0)}× tier)` : "";
    return { win: bet * effective, reason: `${label} ${effective.toLocaleString()}x${boostTag}` };
  }

  if (machine.paytable[line] !== undefined) {
    return apply(machine.paytable[line], `Three ${reels[0].display}!`);
  }

  if (machine.cherryRules) {
    if (keys[0] === "cherry" && keys[1] === "cherry" && machine.paytable["cherry|cherry"] !== undefined) {
      return apply(machine.paytable["cherry|cherry"], "Two cherries!");
    }
    if (keys[0] === "cherry" && machine.paytable.cherry !== undefined) {
      return apply(machine.paytable.cherry, "Cherry on line!");
    }
  }

  if (keys[0] === keys[1]) {
    const pairKey = `${keys[0]}|${keys[1]}`;
    if (machine.paytable[pairKey] !== undefined) {
      return apply(machine.paytable[pairKey], `Two ${reels[0].display}!`);
    }
  }

  if (machine.paytable[keys[0]] !== undefined && !keys[0].includes("|")) {
    return apply(machine.paytable[keys[0]], `${reels[0].display} on line!`);
  }

  return { win: 0, reason: "No win" };
}

export function formatPaytableText(machine, tierBoost = 1.0) {
  const entries = Object.entries(machine.paytable).sort((a, b) => b[1] - a[1]);
  const parts = entries.map(([key, baseMult]) => {
    const effective = Math.round(baseMult * tierBoost);
    const bits = key.split("|");
    if (bits.length === 3 && bits[0] === bits[1] && bits[1] === bits[2]) {
      return `${bits[0]}×3 = ${effective.toLocaleString()}x`;
    }
    if (bits.length === 2) return `${bits[0]}×2 = ${effective.toLocaleString()}x`;
    return `${key} (1st) = ${effective.toLocaleString()}x`;
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
