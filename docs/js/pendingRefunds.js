/** Refund open wagers when leaving an activity without settling (CLI parity). */

export function refundAmounts(session, activityId, amounts, reason) {
  const total = amounts.reduce((sum, n) => sum + Math.max(0, Number(n) || 0), 0);
  if (total <= 0) return 0;
  session.wallet.credit(total, activityId, reason);
  return total;
}

export function refundSlips(session, activityId, slips, reason) {
  return refundAmounts(
    session,
    activityId,
    slips.map((s) => s.amount),
    reason,
  );
}

export function refundTradingPositions(session, activityId, positions, reason) {
  return refundAmounts(
    session,
    activityId,
    positions.map((p) => p.cost),
    reason,
  );
}

export function refundSportsbookOpen(session, sportsbook, reasonPrefix = "Sportsbook leave") {
  let total = 0;
  if (sportsbook.pending?.length) {
    total += refundSlips(
      session,
      "sportsbook",
      sportsbook.pending,
      `${reasonPrefix} — open tickets returned`,
    );
    sportsbook.pending = [];
  }
  if (sportsbook.predictions?.positions?.length) {
    total += refundSlips(
      session,
      "sportsbook",
      sportsbook.predictions.positions,
      `${reasonPrefix} — prediction stakes returned`,
    );
    sportsbook.predictions.positions = [];
  }
  return total;
}
