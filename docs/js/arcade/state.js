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
   * Caller credits chips when chips>0.
   */
  redeem(offerId) {
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
