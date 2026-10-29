import { secureRandomInt, fisherYatesShuffle } from "../core.js";

export const Suits = { SPADES: "spades", HEARTS: "hearts", DIAMONDS: "diamonds", CLUBS: "clubs" };
export const Ranks = {
  ACE: "A", TWO: "2", THREE: "3", FOUR: "4", FIVE: "5", SIX: "6",
  SEVEN: "7", EIGHT: "8", NINE: "9", TEN: "10", JACK: "J", QUEEN: "Q", KING: "K",
};

export const RANK_VALUES = {
  [Ranks.ACE]: 11, [Ranks.TWO]: 2, [Ranks.THREE]: 3, [Ranks.FOUR]: 4,
  [Ranks.FIVE]: 5, [Ranks.SIX]: 6, [Ranks.SEVEN]: 7, [Ranks.EIGHT]: 8,
  [Ranks.NINE]: 9, [Ranks.TEN]: 10, [Ranks.JACK]: 10, [Ranks.QUEEN]: 10, [Ranks.KING]: 10,
};

export const SUIT_SYMBOLS = { spades: "♠", hearts: "♥", diamonds: "♦", clubs: "♣" };
export const SUIT_ASCII = { spades: "S", hearts: "H", diamonds: "D", clubs: "C" };

export function makeCard(rank, suit) {
  return {
    rank,
    suit,
    get value() { return RANK_VALUES[rank]; },
    get isAce() { return rank === Ranks.ACE; },
    get isTenValue() { return this.value === 10; },
    label(useUnicode = true) {
      const symbol = useUnicode ? SUIT_SYMBOLS[suit] : SUIT_ASCII[suit];
      return `${rank}${symbol}`;
    },
    key() { return `${rank}${suit}`; },
    isRed() { return suit === Suits.HEARTS || suit === Suits.DIAMONDS; },
  };
}

function makeSingleDeck() {
  const deck = [];
  for (const suit of Object.values(Suits)) {
    for (const rank of Object.values(Ranks)) {
      deck.push(makeCard(rank, suit));
    }
  }
  return deck;
}

export class Shoe {
  constructor(numDecks = 6) {
    if (numDecks < 1 || numDecks > 8) throw new Error("num_decks must be between 1 and 8");
    this.numDecks = numDecks;
    this._cards = [];
    this._initialSize = numDecks * 52;
    this._cutIndex = Math.floor(this._initialSize * 0.25);
    this.shuffleCount = 0;
    this._roundActive = false;
    this._roundDealt = new Map();
    this.reshuffle();
  }

  reshuffle() {
    this._cards = [];
    for (let i = 0; i < this.numDecks; i++) {
      this._cards.push(...makeSingleDeck());
    }
    fisherYatesShuffle(this._cards);
    this.shuffleCount += 1;
  }

  _maybeReshuffle() {
    if (this._cards.length <= this._cutIndex) this.reshuffle();
  }

  _refillRoundShoe() {
    // A cut-card shuffle waits for the next round, but a short shoe can still
    // run dry mid-round. Rebuild from the complement so no card repeats in the
    // live round; if all 52 are on the table, there is nothing left to deal.
    const counts = new Map();
    for (const card of makeSingleDeck()) {
      const key = card.key();
      counts.set(key, (counts.get(key) ?? 0) + this.numDecks);
    }
    for (const [key, count] of this._roundDealt) {
      counts.set(key, (counts.get(key) ?? 0) - count);
    }
    this._cards = [];
    for (let i = 0; i < this.numDecks; i += 1) {
      for (const card of makeSingleDeck()) {
        const key = card.key();
        const remaining = counts.get(key) ?? 0;
        if (remaining > 0) {
          this._cards.push(card);
          counts.set(key, remaining - 1);
        }
      }
    }
    if (!this._cards.length) return;
    fisherYatesShuffle(this._cards);
    this.shuffleCount += 1;
  }

  deal() {
    if (!this._roundActive) this._maybeReshuffle();
    if (!this._cards.length && this._roundActive) this._refillRoundShoe();
    if (!this._cards.length) throw new Error("Shoe is empty");
    const card = this._cards.pop();
    if (this._roundActive) {
      this._roundDealt.set(card.key(), (this._roundDealt.get(card.key()) ?? 0) + 1);
    }
    return card;
  }

  beginRound() {
    this._maybeReshuffle();
    this._roundDealt = new Map();
    this._roundActive = true;
  }

  finishRound() {
    this._roundActive = false;
    this._roundDealt = new Map();
  }

  get remaining() { return this._cards.length; }
}
