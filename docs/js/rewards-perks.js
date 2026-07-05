import { secureRandomInt } from "./core.js";
import { TIERS, tierForWagered } from "./rewards.js";

/** @typedef {{ id: string, label: string, speedMultiplier: number, tagline: string, monthlyAmortizedCost: string, perks: string[], pitBossLine: string, pitTopupChance: number, pitTopupMin: number, pitTopupMax: number }} TierExperience */

/** @type {Record<string, TierExperience>} */
export const TIER_EXPERIENCE = {
  sapphire: {
    id: "sapphire",
    label: "Sapphire",
    speedMultiplier: 1.0,
    tagline: "Standard digital Vegas — walking shoes required.",
    monthlyAmortizedCost: "$0 (you are the product)",
    perks: [
      "Public casino floor access",
      "Standard buffet line (45–90 min)",
      "Generic dealer small talk",
      "Pit bosses nod politely and forget your face",
    ],
    pitBossLine: "Pit bosses nod politely and forget your face.",
    pitTopupChance: 0,
    pitTopupMin: 0,
    pitTopupMax: 0,
  },
  pearl: {
    id: "pearl",
    label: "Pearl",
    speedMultiplier: 0.82,
    tagline: "Express lanes unlock — still satirically overpriced.",
    monthlyAmortizedCost: "$1,847/mo (waived with $500 lifetime handle)",
    perks: [
      "Pool cabana — 20% off ($890/day → $712/day)",
      "Priority slot-aisle foot traffic",
      "Betty's Bar remembers your usual (it's water)",
      "Pit bosses say \"hey\" twice per visit",
    ],
    pitBossLine: "Pit bosses say \"hey\" and slide you a $25 voucher if you look sad.",
    pitTopupChance: 0.04,
    pitTopupMin: 25,
    pitTopupMax: 75,
  },
  gold: {
    id: "gold",
    label: "Gold",
    speedMultiplier: 0.68,
    tagline: "VIP elevator energy — the line moves when you're comped.",
    monthlyAmortizedCost: "$8,400/mo (comped with buffet loyalty)",
    perks: [
      "House of Blues — priority line for Gold+",
      "Buffet comp — host seats you near the crab legs",
      "Dedicated cocktail server (shared with 40 tables)",
      "Pit bosses know your game and your zodiac sign",
    ],
    pitBossLine: "Pit bosses comp your drink and ask if you're \"heating up.\"",
    pitTopupChance: 0.08,
    pitTopupMin: 50,
    pitTopupMax: 150,
  },
  platinum: {
    id: "platinum",
    label: "Platinum",
    speedMultiplier: 0.52,
    tagline: "Limo from parking — because your time is worth $890/hour.",
    monthlyAmortizedCost: "$34,000/mo (narratively comped)",
    perks: [
      "Spa day — comped upgrade for Platinum+",
      "Chauffeured fleet from valet to slot machine",
      "Room night comp — hallway puzzle optional",
      "Pit bosses greet you by first name",
    ],
    pitBossLine: "Pit bosses greet you by name and bump your table limit \"just this once.\"",
    pitTopupChance: 0.14,
    pitTopupMin: 100,
    pitTopupMax: 400,
  },
  noir: {
    id: "noir",
    label: "Noir",
    speedMultiplier: 0.36,
    tagline: "Foundation Room access — darkness has a cover charge.",
    monthlyAmortizedCost: "$142,000/mo (invisible on the folio)",
    perks: [
      "Foundation Room — Noir members only",
      "Personal driver on retainer (shared Tesla, exclusive attitude)",
      "Private salon tables when the floor is slow",
      "Recreational herb concierge — \"farm-to-lounge\"",
      "Pit bosses text you good luck emojis",
    ],
    pitBossLine: "Pit bosses text you before bad beats and comp the aftermath.",
    pitTopupChance: 0.22,
    pitTopupMin: 250,
    pitTopupMax: 1200,
  },
  chairman: {
    id: "chairman",
    label: "Chairman",
    speedMultiplier: 0.18,
    tagline: "The utmost premium digital Las Vegas experience.",
    monthlyAmortizedCost: "$847,000/mo (fully comped, spiritually)",
    perks: [
      "24/7 chauffeured fleet — driver knows your playlist",
      "Personal chef — tasting menu between spins",
      "Private high-limit games — just you and the house",
      "Companionship concierge — hottest baddies, NDAs included",
      "State-sanctioned recreational herb sommelier",
      "Full bottle service at every pixel",
      "Pit bosses fist-bump, comp losses, ask about your portfolio",
    ],
    pitBossLine: "Pit bosses fist-bump you, comp your losses, and ask about your portfolio.",
    pitTopupChance: 0.38,
    pitTopupMin: 500,
    pitTopupMax: 5000,
  },
};

export const RESORT_OFFERS = [
  {
    title: "Pool cabana — 20% off",
    detail: "Pearl+ — still $712/day. Infinity edge, finite patience.",
    minTierIndex: 1,
  },
  {
    title: "House of Blues — priority line",
    detail: "Gold+ — skip 200 people who also paid for priority.",
    minTierIndex: 2,
  },
  {
    title: "Spa day — comped upgrade",
    detail: "Platinum+ — hot stone, cold invoice (waived).",
    minTierIndex: 3,
  },
  {
    title: "Foundation Room — members only",
    detail: "Noir+ — velvet rope, recreational herb menu, no photos.",
    minTierIndex: 4,
  },
  {
    title: "Chairman fantasy package",
    detail: "Drivers, chefs, private games, bottle service, pit-boss love.",
    minTierIndex: 5,
  },
];

/** @param {string} tierId */
export function getTierExperience(tierId) {
  return TIER_EXPERIENCE[tierId] ?? TIER_EXPERIENCE.sapphire;
}

/** @param {import("./core.js").PlayerSession} session */
export function getSessionTierExperience(session) {
  const wagered = session.rewards?.lifetimeWagered ?? 0;
  return getTierExperience(tierForWagered(wagered).id);
}

/** @param {string} tierId */
export function tierIndex(tierId) {
  const idx = TIERS.findIndex((t) => t.id === tierId);
  return idx >= 0 ? idx : 0;
}

/** @param {string} tierId */
export function getActivityTiming(tierId) {
  const mult = getTierExperience(tierId).speedMultiplier;
  return {
    speedMultiplier: mult,
    slotsReel1: Math.max(80, Math.round(350 * mult)),
    slotsReel2: Math.max(160, Math.round(700 * mult)),
    slotsReel3: Math.max(240, Math.round(1050 * mult)),
    rouletteSpin: Math.max(200, Math.round(1200 * mult)),
  };
}

/** @param {import("./core.js").PlayerSession} session */
export function rewardsTierId(session) {
  const wagered = session.rewards?.lifetimeWagered ?? 0;
  return tierForWagered(wagered).id;
}

/**
 * Pit boss may comp free-play chips after a losing wager.
 * @param {import("./core.js").PlayerSession} session
 * @param {string} activityId
 * @param {number} lossAmount
 * @returns {{ amount: number, line: string } | null}
 */
export function maybePitBossTopUp(session, activityId, lossAmount) {
  if (lossAmount <= 0) return null;
  const tierId = rewardsTierId(session);
  const exp = getTierExperience(tierId);
  if (exp.pitTopupChance <= 0 || Math.random() >= exp.pitTopupChance) return null;
  const amount = secureRandomInt(exp.pitTopupMin, exp.pitTopupMax);
  session.wallet.credit(amount, "pit_boss", `Pit boss free play — ${activityId}`);
  return {
    amount,
    line: `Pit boss comp: +${amount.toLocaleString()} chips. "${exp.pitBossLine}"`,
  };
}

/** @param {string} tierId */
export function applyTierSpeedCss(tierId) {
  const mult = getTierExperience(tierId).speedMultiplier;
  document.documentElement.style.setProperty("--rewards-speed-mult", String(mult));
}
