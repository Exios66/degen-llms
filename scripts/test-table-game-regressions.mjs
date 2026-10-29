// Run with: node --experimental-default-type=module scripts/test-table-game-regressions.mjs
import assert from "node:assert/strict";
import { Shoe, makeCard } from "../docs/js/blackjack/cards.js";
import { createHand } from "../docs/js/blackjack/hand.js";
import { BlackjackGame, Action, defaultConfig } from "../docs/js/blackjack/game.js";
import { legalActions, createTableState } from "../docs/js/blackjack/rules.js";
import { HoldemTable, BettingAction, Street } from "../docs/js/holdem/game.js";
import { evaluateFiveUci, evaluateFiveCards, cardsFromUciRow, compareScores, DATASET_FIXTURES } from "../docs/js/holdem/hand_eval.js";
import { CrapsTable } from "../docs/js/craps.js";
import { BET_TYPES, resolveBet } from "../docs/js/roulette.js";
import { buildCrapsRenderers } from "../docs/js/ui/craps-renderers.js";

const c = (r, s = "spades") => makeCard(r, s);
let cases = 0;
const test = (name, run) => { run(); cases++; console.log(`PASS ${name}`); };

test("poker dataset conversion retains real suits and all ten classes", () => {
  for (const [row, category] of DATASET_FIXTURES) {
    assert.equal(evaluateFiveCards(cardsFromUciRow(row)).handClass, category);
  }
});
test("aces rank high in pairs, kickers, trips, quads, and flushes", () => {
  for (const [low, high] of [
    [[13, 13, 9, 7, 3], [1, 1, 9, 7, 3]],
    [[13, 12, 9, 7, 3], [1, 12, 9, 7, 3]],
    [[7, 7, 13, 9, 3], [7, 7, 1, 9, 3]],
    [[13, 13, 13, 9, 3], [1, 1, 1, 9, 3]],
    [[13, 13, 13, 13, 3], [1, 1, 1, 1, 3]],
  ]) assert(compareScores(evaluateFiveUci([1, 2, 3, 4, 1], high), evaluateFiveUci([1, 2, 3, 4, 1], low)) > 0);
  assert(compareScores(evaluateFiveUci([1, 1, 1, 1, 1], [1, 9, 7, 5, 3]), evaluateFiveUci([1, 1, 1, 1, 1], [13, 9, 7, 5, 3])) > 0);
  assert.equal(evaluateFiveUci([1, 2, 3, 4, 1], [1, 2, 3, 4, 5]).tiebreak[0], 5);
});
test("multiple aces retain a soft total", () => {
  const hand = createHand({ cards: [c("A"), c("A"), c("5")] });
  assert.equal(hand.value, 17);
  assert(hand.isSoft);
});
test("cut card is honored between rounds", () => {
  const shoe = new Shoe(1);
  shoe._cards = shoe._cards.slice(0, 15);
  shoe.beginRound();
  const before = shoe.shuffleCount;
  for (let i = 0; i < 5; i++) shoe.deal();
  assert.equal(shoe.shuffleCount, before);
  shoe.finishRound();
  shoe.beginRound();
  assert.equal(shoe.shuffleCount, before + 1);
});
const blackjack = (balance, ranks) => {
  const game = new BlackjackGame(defaultConfig(balance));
  game.shoe._cards = ranks.map((r) => c(r)).reverse();
  game.shoe._cutIndex = 0;
  game.beginRound();
  return game;
};
test("insurance precedes dealer blackjack and cannot overdraw", () => {
  const game = blackjack(500, ["10", "A", "8", "K"]);
  game.placeHumanBet(100);
  assert(game.pendingInsurance);
  game.takeInsurance(true);
  assert.equal(game.human().bankroll, 500);
  assert.equal(game.humanNet, 0);
  assert.equal(game.phase, "complete");
  const short = blackjack(110, ["10", "A", "8", "8"]);
  short.placeHumanBet(100);
  short.takeInsurance(true);
  short.playerAction(Action.STAND);
  assert.equal(short.human().roundState.insuranceBet, 10);
  assert.equal(short.human().bankroll, 0);
});
test("invalid and repeated bets cannot debit the bankroll", () => {
  const game = blackjack(500, ["10", "9", "8", "8"]);
  assert.equal(game.placeHumanBet(NaN), false);
  assert.equal(game.placeHumanBet(10.5), false);
  game.placeHumanBet(10);
  assert.equal(game.placeHumanBet(10), false);
  assert.equal(game.human().bankroll, 490);
  game.playerAction(Action.STAND);
  const settled = game.human().bankroll;
  game._settle();
  assert.equal(game.human().bankroll, settled);
});
test("both split hands lose natural status and obey total-hand limit", () => {
  const game = blackjack(500, ["10", "9", "K", "8", "A", "A"]);
  game.placeHumanBet(10);
  game.playerAction(Action.SPLIT);
  assert(game.human().roundState.hands.every((h) => h.value === 21 && !h.isBlackjack && h.splitCount === 1));
  const hand = createHand({ cards: [c("8"), c("8")], bet: 10, splitCount: 1 });
  const state = createTableState(c("6"));
  state.allowDoubleAfterSplit = false;
  assert.deepEqual(legalActions(hand, state, {}, true, 100, 4), new Set([Action.HIT, Action.STAND]));
});
const showdown = (contributions = [20, 100, 100]) => {
  const table = HoldemTable.quickTable(500, 2);
  table.players.forEach((p, i) => Object.assign(p, { stack: 0, totalInHand: contributions[i], allIn: true }));
  table.players[0].hole = [c("A"), c("A", "hearts")];
  table.players[1].hole = [c("K"), c("K", "hearts")];
  table.players[2].hole = [c("Q"), c("Q", "hearts")];
  table.community = [c("2", "clubs"), c("4", "diamonds"), c("7", "hearts"), c("9", "clubs"), c("J", "diamonds")];
  table.pot = contributions.reduce((a, b) => a + b, 0);
  return table;
};
test("short all-in winners receive only eligible pots", () => {
  const table = showdown(); table._showdown();
  assert.deepEqual(table.players.map((p) => p.stack), [60, 160, 0]);
  const excess = showdown([20, 100, 150]); excess._showdown();
  assert.deepEqual(excess.players.map((p) => p.stack), [60, 160, 50]);
  const folded = showdown(); folded.players[1].folded = true; folded._showdown();
  assert.deepEqual(folded.players.map((p) => p.stack), [60, 0, 160]);
});
test("all-in blinds run out without waiting for an actor", () => {
  const table = HoldemTable.quickTable(5, 1);
  table.players[1].stack = 10;
  table.startHand();
  assert(table.handOver); assert.equal(table.street, Street.SHOWDOWN);
  assert.equal(table.community.length, 5);
  assert.equal(table.players.reduce((n, p) => n + p.stack, 0), 15);
});
test("out-of-turn and fractional raises are rejected", () => {
  const table = HoldemTable.quickTable(500); table.startHand();
  assert.throws(() => table.applyAction(table.human, BettingAction.CALL), /turn/);
  const actor = table.players[table.actionIndex];
  assert.throws(() => table.applyAction(actor, BettingAction.RAISE, 100.5), /integer/);
});
test("short big blinds still require the full blind from active players", () => {
  const table = HoldemTable.quickTable(100, 2);
  table.players[2].stack = 2;
  table.startHand();
  assert.equal(table.currentBet, table.bigBlind);
  table.applyAction(table.human, BettingAction.CALL);
  assert.equal(table.human.betThisStreet, table.bigBlind);
});
test("short all-in raises do not reopen an earlier player's raise", () => {
  const table = HoldemTable.quickTable(500, 2); table.startHand();
  for (const p of table.players) Object.assign(p, { betThisStreet: 100, totalInHand: 100, hasActed: true, lastActionBet: 100 });
  Object.assign(table.players[1], { stack: 50, hasActed: false, lastActionBet: null });
  Object.assign(table, { actionIndex: 1, currentBet: 100, minRaise: 100, pot: 300 });
  table.applyAction(table.players[1], BettingAction.RAISE, 150);
  assert(table.legalActions(table.players[2]).has(BettingAction.CALL));
  assert(!table.legalActions(table.players[2]).has(BettingAction.RAISE));
});
test("Don't Pass establishes and resolves its point", () => {
  const table = new CrapsTable();
  table.resolveDontPass(10, { total: 6, label: "2-4 (6)" }, null);
  assert.equal(table.point, 6);
  assert.equal(table.resolveDontPass(10, { total: 7, label: "3-4 (7)" }, table.point).payout, 20);
  assert.equal(table.point, null);
});
test("roulette zero excludes every outside bet and pays a straight", () => {
  for (const bet of BET_TYPES.filter((b) => b.kind !== "straight")) assert.equal(resolveBet(bet, 10, 0).win, 0);
  assert.equal(resolveBet(BET_TYPES[0], 10, 0, 0).win, 360);
});

function crapsHarness(balance = 50) {
  const inputs = [], selects = [];
  const noop = () => {};
  const wallet = { balance, debit(n) { if (n > this.balance) return false; this.balance -= n; return true; }, credit(n) { this.balance += n; } };
  const runtime = { craps: { table: new CrapsTable(), lineBet: null, hardways: {}, sessionNet: 0, rolls: 0 } };
  const ctx = { runtime, session: { wallet }, el(tag, props = {}, children = []) {
    const node = { tag, ...props, children };
    if (tag === "input") inputs.push(node);
    if (tag === "select") { node.value = "pass"; selects.push(node); }
    return node;
  }, videoMachine: (_, cfg) => cfg, dealerPanel: noop, machineLog: noop, goBack: noop,
  render: noop, persist: noop, recordActivityVisitOnce: noop, recordActivityResult: noop };
  const screen = buildCrapsRenderers(ctx).craps();
  return { wallet, runtime, inputs, selects, roll: screen.controls.children[0].onclick };
}
globalThis.alert = () => {};
test("craps validates all wagers before debiting any chips", () => {
  for (const line of ["100", "", "NaN"]) {
    const h = crapsHarness(); h.inputs[0].value = line; h.inputs[1].value = "10"; h.roll();
    assert.equal(h.wallet.balance, 50); assert.equal(h.runtime.craps.sessionNet, 0); assert.equal(h.runtime.craps.rolls, 0);
  }
  const h = crapsHarness(); h.inputs[0].value = "40"; h.inputs[1].value = "20"; h.roll();
  assert.equal(h.wallet.balance, 50); assert.equal(h.runtime.craps.lineBet, null);
});
console.log(`${cases} table-game regression cases passed.`);
