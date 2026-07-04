export const Action = {
  HIT: "HIT", STAND: "STAND", DOUBLE: "DOUBLE", SPLIT: "SPLIT", SURRENDER: "SURRENDER",
};

export const MAX_SPLITS = 3;

export function dealerShouldHit(hand, dealerHitsSoft17) {
  const value = hand.value;
  if (value < 17) return true;
  if (value === 17 && hand.isSoft && dealerHitsSoft17) return true;
  return false;
}

export function dealerShouldPeek(upCard) {
  return upCard.isAce || upCard.isTenValue;
}

export function legalActions(hand, state, config, isFirstAction, playerBankroll) {
  if (hand.isFinished || hand.isSurrendered || hand.isBust) return new Set();

  const actions = new Set([Action.HIT, Action.STAND]);

  if (isFirstAction && state.allowSurrender && !hand.isFromSplitAces) {
    actions.add(Action.SURRENDER);
  }

  const canDouble = hand.cards.length === 2 && !hand.isDoubled;
  if (canDouble && playerBankroll >= hand.bet) actions.add(Action.DOUBLE);

  if (hand.canSplit(MAX_SPLITS) && playerBankroll >= hand.bet) actions.add(Action.SPLIT);

  if (hand.isFromSplitAces && hand.cards.length >= 2) {
    actions.delete(Action.HIT);
    actions.delete(Action.DOUBLE);
    actions.delete(Action.SPLIT);
  }

  return actions;
}

export function createTableState(dealerUpCard) {
  return {
    dealerUpCard,
    dealerHasBlackjack: false,
    insuranceOffered: false,
    allowSurrender: true,
    allowDoubleAfterSplit: true,
  };
}
