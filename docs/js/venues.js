/**
 * VIP venue gates — High Limit salon and Foundation Room / Noir lounge.
 * Keep chip thresholds aligned with docs/rpg/GDD.md where noted.
 */

import { tierForWagered } from "./rewards.js";
import { tierIndex } from "./rewards-perks.js";
import { getRapport } from "./phone-rapport.js";
import { getIntoxicationSummary, isHeightenedIntoxication } from "./intoxication-effects.js";
import { STAKE_TIERS } from "./stakes.js";

/** @readonly */
export const HIGH_LIMIT_SALON_CHIP_MIN = 10_000;

/** Stake tier ids that qualify for the salon velvet rope. */
export const SALON_STAKE_TIER_IDS = ["high_limit", "401k_contribution", "no_limit"];

/** MGM Rewards tier index for Noir (Foundation Room). */
export const FOUNDATION_MIN_REWARDS_TIER_IDX = 4;

/** Minimum host rapport OR intox path for Foundation Room entry. */
export const FOUNDATION_MIN_HOST_RAPPORT = 15;

/**
 * @param {import("./core.js").PlayerSession} session
 * @param {{ id: string } | null} stakeTier
 */
export function canEnterHighLimitSalon(session, stakeTier) {
  const balance = session.wallet?.balance ?? 0;
  if (balance < HIGH_LIMIT_SALON_CHIP_MIN) {
    return {
      ok: false,
      reason: `High Limit salon requires at least ${HIGH_LIMIT_SALON_CHIP_MIN.toLocaleString()} chips on the floor.`,
    };
  }
  const tierId = stakeTier?.id;
  return {
    ok: true,
    needsStakeAssign: !tierId || !SALON_STAKE_TIER_IDS.includes(tierId),
  };
}

/**
 * @param {import("./core.js").PlayerSession} session
 */
export function canEnterFoundationRoom(session) {
  const rewardsTier = tierForWagered(session.rewards?.lifetimeWagered ?? 0);
  const rewardsIdx = tierIndex(rewardsTier.id);
  if (rewardsIdx < FOUNDATION_MIN_REWARDS_TIER_IDX) {
    return {
      ok: false,
      reason: `${rewardsTier.label} tier — Foundation Room is Noir members and above. Keep wagering.`,
    };
  }

  const intox = getIntoxicationSummary(session);
  const buzzed = isHeightenedIntoxication(session) || intox.level >= 2;
  const hostRapport = getRapport(session, "host_representative");
  const calls = session.hotel?.roomAmenities?.phoneCalls ?? [];
  const calledFoundation = calls.includes("foundation_room");
  const roomType = session.hotel?.roomType;
  const suiteOrBetter = roomType === "suite" || roomType === "penthouse";

  // Any one social/atmosphere path opens the rope for Noir+ members.
  if (hostRapport >= FOUNDATION_MIN_HOST_RAPPORT || buzzed || calledFoundation || suiteOrBetter) {
    return { ok: true, rewardsTier, hostRapport, buzzed, calledFoundation, suiteOrBetter };
  }

  return {
    ok: false,
    reason: "Velvet rope closed — build host rapport, call the Foundation Room from your suite phone, upgrade to a suite, or loosen up at the bar.",
  };
}
