export function settleHand(playerHand, dealerHand, dealerHasBlackjack) {
  const bet = playerHand.bet;

  if (playerHand.isSurrendered) {
    return { description: "SURRENDER", netChange: -(bet >> 1) };
  }
  if (playerHand.isBust) {
    return { description: "BUST", netChange: -bet };
  }

  const playerBj = playerHand.isBlackjack;
  if (playerBj && dealerHasBlackjack) return { description: "PUSH (both blackjack)", netChange: 0 };
  if (playerBj) return { description: "BLACKJACK", netChange: Math.floor((bet * 3) / 2) };
  if (dealerHasBlackjack) return { description: "LOSE (dealer blackjack)", netChange: -bet };
  if (dealerHand.isBust) return { description: "WIN (dealer bust)", netChange: bet };
  if (playerHand.value > dealerHand.value) return { description: "WIN", netChange: bet };
  if (playerHand.value < dealerHand.value) return { description: "LOSE", netChange: -bet };
  return { description: "PUSH", netChange: 0 };
}

export function settleInsurance(insuranceBet, dealerHasBlackjack) {
  if (insuranceBet <= 0) return 0;
  if (dealerHasBlackjack) return insuranceBet * 2;
  return -insuranceBet;
}

export function computeBotBet(bankroll, config) {
  if (bankroll < config.minBet) return 0;
  let target = Math.max(config.minBet, Math.floor(bankroll * 0.03));
  let rounded = Math.floor(target / config.minBet) * config.minBet;
  if (rounded < config.minBet) rounded = config.minBet;
  return Math.max(config.minBet, Math.min(rounded, config.maxBet, bankroll));
}
