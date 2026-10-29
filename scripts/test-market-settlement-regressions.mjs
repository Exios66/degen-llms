// Run with: node scripts/test-market-settlement-regressions.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import { SportsbookState, resolveSlip } from "../docs/js/sportsbook.js";
import { PredictionMarketsState, resolveMarket } from "../docs/js/predictionMarkets.js";
import { TradingDeskState, entryCostChips, settlePosition, underlyingSpot } from "../docs/js/tradingDesk.js";
import { eventFromScenario } from "../docs/js/sportSimulator.js";
import { settleTicket } from "../docs/js/horse_racing.js";
import { settleDressageTicket, settleJumperTicket } from "../docs/js/equestrian.js";
import { resolvePick3, resolvePick4, validateMegaPicks } from "../docs/js/lottery.js";

let cases = 0;
const test = (name, run) => { run(); cases++; console.log(`PASS ${name}`); };
const json = (path) => JSON.parse(fs.readFileSync(new URL(path, import.meta.url), "utf8"));
const catalog = json("../docs/data/sports_catalog.json");
const scenarioDb = json("../docs/data/sports_scenarios.json");

test("parlays remove pushed legs and return stake when all push", () => {
  const event = { home: "H", away: "A", homeScore: 10, awayScore: 7, total: 17 };
  const push = { event, betType: "total", pick: "over", amount: 0, odds: 100 };
  const win = { event, betType: "moneyline", pick: "H", amount: 0, odds: 150 };
  assert.equal(resolveSlip({ betType: "parlay", amount: 100, odds: 400, legs: [push, win] }).payout, 250);
  assert.equal(resolveSlip({ betType: "parlay", amount: 100, odds: 400, legs: [push, push] }).payout, 100);
});

test("JSON-roundtripped tickets share one simulated event outcome", () => {
  const event = eventFromScenario(scenarioDb.scenarios.find((s) => s.eventType === "game"));
  const book = SportsbookState.fromJSON(JSON.parse(JSON.stringify({ events: [event], pending: [
    { event, betType: "moneyline", pick: event.home, amount: 100, odds: 100 },
    { event, betType: "moneyline", pick: event.away, amount: 100, odds: 100 },
  ] })));
  const { results } = book.settleAll(catalog);
  assert(results.every((r) => r.event.settled));
  assert.equal(results[0].event.homeScore, results[1].event.homeScore);
  assert.equal(results[0].event.awayScore, results[1].event.awayScore);
  assert.equal(results[0].payout + results[1].payout, 200);
  assert.equal(book.events[0].settled, true);
});

test("settled events reject new wagers", () => {
  assert.throws(() => new SportsbookState().addTicket({ event: { settled: true } }), /settled/);
});

test("prediction pagination retains open contracts and advances first page", () => {
  const state = new PredictionMarketsState();
  state.scenarioDb = json("../docs/data/prediction_scenarios.json");
  state.syncMarkets([]);
  const cursor = state.scenarioCursor;
  const market = state.markets[0];
  state.addPosition({ marketId: market.marketId, side: "yes", amount: 100, priceCents: 50 });
  state.nextSlate([]);
  assert.notEqual(state.scenarioCursor, cursor);
  assert(state.markets.includes(market));
  assert.equal(state.settleAll([]).results.length, 1);
});

test("missing prediction market refunds its stake", () => {
  const state = new PredictionMarketsState({ positions: [{ marketId: "gone", amount: 75 }] });
  assert.equal(state.settleAll().results[0].payout, 75);
});

test("linked predictions retain outcomes across sports slate changes", () => {
  const market = { question: "H covers tonight?", yesPrice: 50, linkedEventId: "old",
    linkedEvent: { settled: true, homeScore: 20, awayScore: 17, spread: -3 } };
  assert.equal(resolveMarket(market, []), "push");
  market.linkedEvent.homeScore = 21;
  assert.equal(resolveMarket(market, []), "yes");
});

test("prediction-only settlement simulates the linked game", () => {
  const book = new SportsbookState();
  book.catalog = catalog;
  const event = eventFromScenario(scenarioDb.scenarios.find((s) => s.eventType === "game"));
  book.events = [event];
  book.predictions.syncMarkets(book.events);
  const market = book.predictions.markets[0];
  book.predictions.addPosition({ marketId: market.marketId, side: "yes", amount: 100, priceCents: 50 });
  book.events = []; // Changed board after buying.
  const { results } = book.settlePredictions();
  assert.equal(event.settled, true);
  assert.equal(results.length, 1);
  assert.equal(results[0].resolution, resolveMarket({ ...market, resolution: null }, []));
  assert.throws(() => book.predictions.addPosition({ marketId: market.marketId }), /closed/);
});

test("options expire against the underlying, not premium", () => {
  const option = { instrument: "call", symbol: "X", expiry: "later", markPrice: 5, ask: 5, strike: 50 };
  const state = new TradingDeskState();
  state.catalog = { contracts: [{ instrument: "future", symbol: "X", expiry: "later", markPrice: 100 }, option] };
  assert.equal(underlyingSpot(option, state.catalog), 100);
  assert.equal(state.openPosition(option).entrySpot, 100);
  const result = state.settleAll().results[0];
  assert(result.exitSpot >= 94 && result.exitSpot <= 106);
  assert(result.payout >= 44);
});

test("futures losses match actual wallet movement and truncate symmetrically", () => {
  const position = { contract: { instrument: "future", symbol: "X", multiplier: 100 }, qty: 1, entryPrice: 100, cost: 1000 };
  assert.deepEqual([settlePosition(position, 0).pnl, settlePosition(position, 0).payout], [-1000, 0]);
  assert.equal(settlePosition({ ...position, contract: { ...position.contract, multiplier: 1 } }, 99.5).pnl, 0);
});

test("invalid trade quantities are rejected", () => {
  for (const qty of [0, -1, 1.5, NaN, Infinity, "1"]) assert.throws(() => entryCostChips({ ask: 5 }, qty), /integer/);
});

test("nonexistent racing entrants cannot win place or show", () => {
  for (const betType of ["place", "show"]) {
    const slip = { horse: 99, entry: 99, amount: 100, betType };
    assert.equal(settleTicket(slip, [1, 2, 3]).payout, 0);
    assert.equal(settleDressageTicket(slip, [1, 2, 3]).payout, 0);
    assert.equal(settleJumperTicket(slip, [{ entryNumber: 1 }]).payout, 0);
  }
});

test("incomplete lottery picks cannot automatically match", () => {
  assert.equal(resolvePick3([]).win, 0);
  assert.equal(resolvePick4([]).win, 0);
  assert(validateMegaPicks([1, 2, 3, 4, NaN], 1));
  assert(validateMegaPicks([1, 2, 3, 4, 5], 1.5));
});

console.log(`${cases} market and wagering regression cases passed.`);
