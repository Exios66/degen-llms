import { Ranks } from "./cards.js";

export function createHand(overrides = {}) {
  return {
    cards: [],
    bet: 0,
    isDoubled: false,
    isSurrendered: false,
    isFinished: false,
    isFromSplitAces: false,
    splitCount: 0,
    ...overrides,
    addCard(card) { this.cards.push(card); },
    get value() {
      let total = this.cards.reduce((s, c) => s + c.value, 0);
      let aces = this.cards.filter((c) => c.isAce).length;
      while (total > 21 && aces > 0) { total -= 10; aces -= 1; }
      return total;
    },
    get isSoft() {
      const total = this.cards.reduce((s, c) => s + c.value, 0);
      return this.cards.some((c) => c.isAce) && total <= 21;
    },
    get isBust() { return this.value > 21; },
    get isBlackjack() {
      return this.cards.length === 2 && this.value === 21 && this.splitCount === 0;
    },
    get isPair() {
      return this.cards.length === 2 && this.cards[0].value === this.cards[1].value;
    },
    canSplit(maxSplits = 3) {
      return this.isPair && this.splitCount < maxSplits && !this.isFinished;
    },
    cloneForSplit() {
      return createHand({
        cards: [this.cards[1]],
        bet: this.bet,
        splitCount: this.splitCount + 1,
        isFromSplitAces: this.cards[0].rank === Ranks.ACE,
      });
    },
    displayValue() {
      if (this.isSoft && !this.isBust && this.value !== 21) return `${this.value} (soft)`;
      return String(this.value);
    },
  };
}
