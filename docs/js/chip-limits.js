/** Cashier / offshore bank transaction ceilings. Keep in sync with mandalay_bay/chip_limits.py */

import { tierForWagered } from "./rewards.js";

/** Max chips purchased from the cashier in one transaction. */
export const BUY_CHIPS_MAX = 1_000_000;

/** Max chips cashed out to the private offshore account in one transaction. */
export const CASHOUT_TO_BANK_MAX = 1_000_000_000;

/**
 * Per-transaction withdraw / expense ceiling from the offshore account,
 * scaled by MGM Rewards tier (Chairman unlocks the full $1B).
 */
export const TIER_BANK_WITHDRAW_MAX = {
  sapphire: 1_000_000,
  pearl: 5_000_000,
  gold: 25_000_000,
  platinum: 100_000_000,
  noir: 250_000_000,
  chairman: 1_000_000_000,
};

export function rewardsTierIdForSession(session) {
  const wagered = session?.rewards?.lifetimeWagered ?? 0;
  return tierForWagered(wagered).id;
}

export function bankWithdrawMaxForSession(session) {
  const id = rewardsTierIdForSession(session);
  return TIER_BANK_WITHDRAW_MAX[id] ?? TIER_BANK_WITHDRAW_MAX.sapphire;
}

export function cashOutMaxForSession(session) {
  return Math.min(CASHOUT_TO_BANK_MAX, session?.wallet?.balance ?? 0);
}
