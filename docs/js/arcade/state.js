/** Persisted Arcade Alley progress — tickets, high scores, redeem flags. */

import { REDEEM_OFFERS } from "./catalog.js";

export class ArcadeState {
  constructor(data = null) {
    this.tickets = 0;
    this.lifetimePlays = 0;
    this.highScores = {};
    this.flags = {};
    if (data) {
      this.tickets = Math.max(0, data.tickets ?? 0);
      this.lifetimePlays = Math.max(0, data.lifetimePlays ?? 0);
      this.highScores = { ...(data.highScores ?? {}) };
      this.flags = { ...(data.flags ?? {}) };
    }
  }

  recordPlay(gameId, score, ticketsEarned) {
    this.lifetimePlays += 1;
    this.tickets += Math.max(0, ticketsEarned);
    const prev = this.highScores[gameId] ?? 0;
    if (score > prev) this.highScores[gameId] = score;
    return score > prev;
  }

  canRedeem(offerId) {
    const offer = REDEEM_OFFERS.find((o) => o.id === offerId);
    if (!offer) return false;
    if (this.tickets < offer.costTickets) return false;
    if (offer.kind === "flag" && this.flags[offer.flag]) return false;
    return true;
  }

  /**
   * Apply redeem. Returns { ok, message, chips? }.
   * When `session` is provided, flag offers also update rpg flags and
   * welcome-drink / slot free-spin infrastructure.
   * Caller credits chips when chips>0.
   */
  redeem(offerId, session = null) {
    const offer = REDEEM_OFFERS.find((o) => o.id === offerId);
    if (!offer) return { ok: false, message: "Unknown offer." };
    if (!this.canRedeem(offerId)) {
      if (offer.kind === "flag" && this.flags[offer.flag]) {
        return { ok: false, message: "Already redeemed." };
      }
      return { ok: false, message: "Not enough tickets." };
    }
    this.tickets -= offer.costTickets;
    if (offer.kind === "chips") {
      return { ok: true, message: `Cashed ${offer.costTickets} tickets for ${offer.amount} chips.`, chips: offer.amount };
    }
    this.flags[offer.flag] = true;
    if (session) {
      applyArcadeRedeemFlag(session, offer.flag);
    }
    return { ok: true, message: `Redeemed: ${offer.label}.`, chips: 0 };
  }

  toJSON() {
    return {
      tickets: this.tickets,
      lifetimePlays: this.lifetimePlays,
      highScores: { ...this.highScores },
      flags: { ...this.flags },
    };
  }

  static fromJSON(data) {
    return new ArcadeState(data);
  }
}

export function ensureArcade(session) {
  if (!session.arcadeData || typeof session.arcadeData !== "object") {
    session.arcadeData = new ArcadeState().toJSON();
  }
  return ArcadeState.fromJSON(session.arcadeData);
}

export function persistArcade(session, state) {
  session.arcadeData = state.toJSON();
}

/**
 * Mirror arcade ticket-shop flags onto session infrastructure.
 * - arcade_slot_voucher → one free slot spin (consumed on pull)
 * - arcade_drink_refill → re-unlock welcome cocktail on Rewards
 */
export function applyArcadeRedeemFlag(session, flag) {
  if (!session || !flag) return;
  session.rpg = session.rpg ?? {};
  session.rpg.flags = session.rpg.flags ?? {};
  session.rpg.flags[flag] = true;

  if (flag === "arcade_drink_refill") {
    session.rewards = session.rewards ?? {};
    session.rewards.unlockedComps = session.rewards.unlockedComps ?? [];
    session.rewards.redeemedComps = session.rewards.redeemedComps ?? [];
    if (!session.rewards.unlockedComps.includes("welcome_drink")) {
      session.rewards.unlockedComps.push("welcome_drink");
    }
    session.rewards.redeemedComps = session.rewards.redeemedComps.filter((id) => id !== "welcome_drink");
    session.rpg.flags.has_welcome_drink_comp = true;
    delete session.rpg.flags.redeemed_welcome_drink;
  }
}

/** True when an unused arcade free-spin voucher is waiting on the floor. */
export function hasArcadeSlotVoucher(session) {
  return Boolean(session?.rpg?.flags?.arcade_slot_voucher);
}

/**
 * Consume one arcade free-spin voucher. Returns true if a voucher was used.
 * Keeps arcade shop "owned" state so tickets cannot buy it again.
 */
export function consumeArcadeSlotVoucher(session) {
  if (!hasArcadeSlotVoucher(session)) return false;
  delete session.rpg.flags.arcade_slot_voucher;
  return true;
}
