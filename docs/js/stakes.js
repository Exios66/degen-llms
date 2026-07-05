/** Keep in sync with mandalay_bay/stakes.py */

export const T401K_MIN = 542;
export const T401K_MAX = 6500;
export const NO_LIMIT_MIN = 2500;

export const STAKE_TIERS = {
  penny: {
    id: "penny",
    name: "Penny & Low Limit",
    description: "Micro stakes — $1–$25 per wager.",
    minBet: 1,
    maxBet: 25,
  },
  standard: {
    id: "standard",
    name: "Standard",
    description: "Main floor limits — $5–$100 per wager.",
    minBet: 5,
    maxBet: 100,
  },
  high_limit: {
    id: "high_limit",
    name: "High Limit",
    description: "High-limit room — $25–$500 per wager.",
    minBet: 25,
    maxBet: 500,
  },
  "401k_contribution": {
    id: "401k_contribution",
    name: "401K Contribution",
    description: `Average employee deferral — $${T401K_MIN.toLocaleString()}/mo style ($${T401K_MAX.toLocaleString()}/yr cap).`,
    minBet: T401K_MIN,
    maxBet: T401K_MAX,
  },
  no_limit: {
    id: "no_limit",
    name: "High Roller / No Limit",
    description: "Salon stakes — minimum table bet, no maximum (bankroll only).",
    minBet: NO_LIMIT_MIN,
    maxBet: null,
  },
};

export const TIER_ORDER = [
  "penny",
  "standard",
  "high_limit",
  "401k_contribution",
  "no_limit",
];

export function getTier(tierId) {
  return STAKE_TIERS[tierId] ?? STAKE_TIERS.penny;
}

export function tierUsesSalonLimits(tier) {
  return tier.id === "401k_contribution" || tier.id === "no_limit";
}

export function effectiveMaxBet(tier, balance) {
  if (tier.maxBet == null) return balance;
  return Math.min(tier.maxBet, balance);
}

export function effectiveTableStakes(tier, balance, activityMin = 1) {
  const minBet = Math.max(activityMin, tier.minBet);
  const maxBet = effectiveMaxBet(tier, balance);
  return { minBet, maxBet: Math.max(minBet, maxBet) };
}

export function effectiveSlotStakes(machine, tier, balance) {
  const minBet = Math.max(machine.minBet, tier.minBet);
  let maxBet;
  if (tier.maxBet == null) {
    maxBet = balance;
  } else if (tierUsesSalonLimits(tier)) {
    maxBet = Math.min(tier.maxBet, balance);
  } else {
    maxBet = Math.min(machine.maxBet, tier.maxBet, balance);
  }
  return { minBet, maxBet: Math.max(minBet, maxBet) };
}

export function formatStakeRange(minBet, maxBet, { noCap = false } = {}) {
  if (noCap || maxBet >= 1_000_000) {
    return `${minBet.toLocaleString()}+ chips (no limit)`;
  }
  if (minBet === maxBet) {
    return `${minBet.toLocaleString()} chips`;
  }
  return `${minBet.toLocaleString()}-${maxBet.toLocaleString()} chips`;
}

export function formatTierLabel(tier, balance) {
  const maxBet = effectiveMaxBet(tier, balance);
  const stake = formatStakeRange(tier.minBet, maxBet, { noCap: tier.maxBet == null });
  return `${tier.name} (${stake})`;
}
