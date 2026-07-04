/**
 * Poker hand evaluation — UCI / Kaggle poker-hands-dataset encoding.
 * @see https://www.kaggle.com/datasets/joogollucci/poker-hands-dataset
 */

export const HAND_CLASS_NAMES = [
  "Nothing in hand",
  "One pair",
  "Two pairs",
  "Three of a kind",
  "Straight",
  "Flush",
  "Full house",
  "Four of a kind",
  "Straight flush",
  "Royal flush",
];

const UCI_SUIT_TO_KEY = { 1: "H", 2: "S", 3: "D", 4: "C" };
const UCI_RANK_NAMES = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export function cardToUci(card) {
  const suitMap = { hearts: 1, spades: 2, diamonds: 3, clubs: 4 };
  const rankMap = { A: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, J: 11, Q: 12, K: 13 };
  return [suitMap[card.suit], rankMap[card.rank]];
}

export function cardsFromUciRow(row) {
  const cards = [];
  for (let i = 0; i < 10; i += 2) {
    cards.push({ suit: UCI_SUIT_TO_KEY[row[i]], rank: UCI_RANK_NAMES[row[i + 1]] });
  }
  return cards;
}

function straightHigh(ranks) {
  const set = new Set(ranks);
  if (set.size !== 5) return null;
  if (set.has(1) && set.has(10) && set.has(11) && set.has(12) && set.has(13)) return 14;
  if (set.has(1) && set.has(2) && set.has(3) && set.has(4) && set.has(5)) return 5;
  const sorted = [...set].sort((a, b) => b - a);
  if (sorted[0] - sorted[4] === 4) return sorted[0];
  return null;
}

export function evaluateFiveUci(suits, ranks) {
  const sorted = [...ranks].sort((a, b) => b - a);
  const isFlush = new Set(suits).size === 1;
  const sh = straightHigh(sorted);
  const isStraight = sh != null;

  const counts = {};
  for (const r of sorted) counts[r] = (counts[r] || 0) + 1;
  const byCount = Object.entries(counts).map(([r, c]) => [Number(c), Number(r)]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);

  if (isStraight && isFlush) {
    if (new Set(ranks).has(1) && new Set(ranks).has(10) && new Set(ranks).has(11) && new Set(ranks).has(12) && new Set(ranks).has(13)) {
      return { handClass: 9, tiebreak: [14], name: HAND_CLASS_NAMES[9] };
    }
    return { handClass: 8, tiebreak: [sh], name: HAND_CLASS_NAMES[8] };
  }
  if (byCount[0][0] === 4) {
    const quad = byCount[0][1];
    const kicker = Math.max(...sorted.filter((r) => r !== quad));
    return { handClass: 7, tiebreak: [quad, kicker], name: HAND_CLASS_NAMES[7] };
  }
  if (byCount[0][0] === 3 && byCount[1][0] === 2) {
    return { handClass: 6, tiebreak: [byCount[0][1], byCount[1][1]], name: HAND_CLASS_NAMES[6] };
  }
  if (isFlush) return { handClass: 5, tiebreak: sorted, name: HAND_CLASS_NAMES[5] };
  if (isStraight) return { handClass: 4, tiebreak: [sh], name: HAND_CLASS_NAMES[4] };
  if (byCount[0][0] === 3) {
    const trips = byCount[0][1];
    const kickers = sorted.filter((r) => r !== trips).sort((a, b) => b - a);
    return { handClass: 3, tiebreak: [trips, ...kickers], name: HAND_CLASS_NAMES[3] };
  }
  if (byCount[0][0] === 2 && byCount[1][0] === 2) {
    const [hp, lp] = [byCount[0][1], byCount[1][1]].sort((a, b) => b - a);
    const kicker = Math.max(...sorted.filter((r) => r !== hp && r !== lp));
    return { handClass: 2, tiebreak: [hp, lp, kicker], name: HAND_CLASS_NAMES[2] };
  }
  if (byCount[0][0] === 2) {
    const pair = byCount[0][1];
    const kickers = sorted.filter((r) => r !== pair).sort((a, b) => b - a);
    return { handClass: 1, tiebreak: [pair, ...kickers], name: HAND_CLASS_NAMES[1] };
  }
  return { handClass: 0, tiebreak: sorted, name: HAND_CLASS_NAMES[0] };
}

export function evaluateFiveCards(cards) {
  const suits = [];
  const ranks = [];
  for (const c of cards) {
    const [s, r] = cardToUci(c);
    suits.push(s);
    ranks.push(r);
  }
  return evaluateFiveUci(suits, ranks);
}

function combos(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  return [...combos(rest, k - 1).map((c) => [first, ...c]), ...combos(rest, k)];
}

export function bestHandFromCards(cards) {
  let best = null;
  let bestFive = null;
  for (const combo of combos(cards, 5)) {
    const score = evaluateFiveCards(combo);
    if (!best || compareScores(score, best) > 0) {
      best = score;
      bestFive = combo;
    }
  }
  return { score: best, cards: bestFive };
}

export function compareScores(a, b) {
  const ta = [a.handClass, ...a.tiebreak];
  const tb = [b.handClass, ...b.tiebreak];
  for (let i = 0; i < Math.max(ta.length, tb.length); i++) {
    if ((ta[i] ?? 0) > (tb[i] ?? 0)) return 1;
    if ((ta[i] ?? 0) < (tb[i] ?? 0)) return -1;
  }
  return 0;
}

export const DATASET_FIXTURES = [
  [[1, 1, 1, 13, 2, 4, 2, 3, 1, 12], 0],
  [[3, 12, 3, 2, 3, 11, 4, 5, 2, 5], 1],
  [[4, 8, 1, 3, 2, 3, 2, 2, 2, 8], 2],
  [[1, 9, 1, 6, 4, 5, 3, 5, 1, 5], 3],
  [[1, 11, 1, 10, 1, 12, 3, 8, 1, 9], 4],
  [[1, 1, 1, 7, 1, 2, 1, 6, 1, 5], 5],
  [[4, 5, 1, 9, 3, 5, 4, 9, 2, 9], 6],
  [[1, 2, 3, 2, 4, 2, 2, 2, 1, 8], 7],
  [[4, 5, 4, 4, 4, 8, 4, 6, 4, 7], 8],
  [[4, 12, 4, 1, 4, 13, 4, 11, 4, 10], 9],
];
