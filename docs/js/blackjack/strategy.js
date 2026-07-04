import { RANK_VALUES, Ranks } from "./cards.js";
import { Action } from "./rules.js";

function dealerUpValue(upCard) {
  return upCard.rank === Ranks.ACE ? 11 : upCard.value;
}

function hardAction(total, dealer) {
  if (total >= 17) return Action.STAND;
  if (total <= 8) return Action.HIT;
  if (total === 9) return [3, 4, 5, 6].includes(dealer) ? Action.DOUBLE : Action.HIT;
  if (total === 10) return dealer <= 9 ? Action.DOUBLE : Action.HIT;
  if (total === 11) return dealer <= 10 ? Action.DOUBLE : Action.HIT;
  if (total === 12) return dealer >= 4 && dealer <= 6 ? Action.STAND : Action.HIT;
  if (total >= 13 && total <= 16) return dealer >= 2 && dealer <= 6 ? Action.STAND : Action.HIT;
  return Action.STAND;
}

function softAction(total, dealer) {
  if (total >= 19) return Action.STAND;
  if (total === 18) return [2, 7, 8].includes(dealer) ? Action.STAND : Action.HIT;
  if (total === 17) return dealer >= 3 && dealer <= 6 ? Action.DOUBLE : Action.HIT;
  if (total === 15 || total === 16) return dealer >= 4 && dealer <= 6 ? Action.DOUBLE : Action.HIT;
  if (total === 13 || total === 14) return dealer >= 5 && dealer <= 6 ? Action.DOUBLE : Action.HIT;
  return Action.HIT;
}

function pairAction(rank, dealer) {
  const value = RANK_VALUES[rank];
  if (rank === Ranks.ACE) return Action.SPLIT;
  if (value === 10) return Action.STAND;
  if (value === 9) return ![7, 10, 11].includes(dealer) ? Action.SPLIT : Action.STAND;
  if (value === 8) return Action.SPLIT;
  if (value === 7) return dealer <= 7 ? Action.SPLIT : Action.HIT;
  if (value === 6) return dealer >= 2 && dealer <= 6 ? Action.SPLIT : Action.HIT;
  if (value === 5) return dealer <= 9 ? Action.DOUBLE : Action.HIT;
  if ([4, 3, 2].includes(value)) return dealer >= 2 && dealer <= 7 ? Action.SPLIT : Action.HIT;
  return Action.HIT;
}

export function basicStrategyAction(total, dealerUp, { isSoft, isPair, pairRank, legal }) {
  const dealer = dealerUpValue(dealerUp);
  let preferred;
  if (isPair && pairRank) preferred = pairAction(pairRank, dealer);
  else if (isSoft) preferred = softAction(total, dealer);
  else preferred = hardAction(total, dealer);

  if (legal.has(preferred)) return preferred;

  const fallbacks = {
    [Action.SPLIT]: [Action.HIT, Action.STAND],
    [Action.DOUBLE]: [Action.HIT, Action.STAND],
    [Action.STAND]: [Action.HIT],
    [Action.HIT]: [Action.STAND],
  };
  for (const alt of fallbacks[preferred] ?? []) {
    if (legal.has(alt)) return alt;
  }
  return [...legal][0];
}
