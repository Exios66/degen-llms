// Run with: node --experimental-default-type=module scripts/test-arcade-slot-regressions.mjs
import assert from "node:assert/strict";
import { createStripCross } from "../docs/js/arcade/games/stripCross.js";
import { createShowgirlBeat } from "../docs/js/arcade/games/showgirlBeat.js";
import { paddleBounceVx } from "../docs/js/arcade/games/highRollerBreakout.js";
import { ArcadeCabinetOverlay } from "../docs/js/arcade/ArcadeCabinetOverlay.js";
import { ARCADE_GAMES } from "../docs/js/arcade/catalog.js";
import { PlayerSession } from "../docs/js/core.js";
import { createSitting, orderAndConsume, resolveEncounter, settleSitting } from "../docs/js/dining.js";
import { MACHINES, formatPaytableText, calculatePayout, tryJackpot, contributeToProgressive } from "../docs/js/slots.js";

let cases = 0;
const test = (name, run) => { run(); cases++; console.log(`PASS ${name}`); };
const noop = () => {};
let frame = null;
let clock = performance.now();
globalThis.requestAnimationFrame = (callback) => { frame = callback; return 1; };
globalThis.cancelAnimationFrame = () => { frame = null; };
const listeners = new Map();
globalThis.window = {
  addEventListener: (type, fn) => { listeners.set(type, fn); },
  removeEventListener: (type, fn) => { if (listeners.get(type) === fn) listeners.delete(type); },
};
let context;
context = new Proxy({}, { get: (target, key) => key in target ? target[key] : () => context });
const canvas = { getContext: () => context };
const advance = (count = 6) => {
  for (let i = 0; i < count && frame; i++) {
    const next = frame; frame = null; clock += 50; next(clock);
  }
};

test("Strip Cross inputs cannot cross all traffic between animation frames", () => {
  let score = 0; let ended = 0;
  const game = createStripCross(canvas, { onHud: (s) => { score = s.score; }, onEnded: () => { ended++; } });
  game.start();
  for (let i = 0; i < 9; i++) game.input("up");
  assert.equal(score, 10); assert.equal(ended, 0);
  game.stop();
});
test("Strip Cross revisiting rows cannot farm score or tickets", () => {
  let highest = 0;
  const game = createStripCross(canvas, { onHud: (s) => { highest = Math.max(highest, s.score); } });
  game.start();
  for (let i = 0; i < 25; i++) { game.input("up"); advance(); game.input("down"); advance(); }
  assert(highest <= 10);
  game.stop();
});

globalThis.document = {
  createElement: () => ({ setAttribute: noop, appendChild: noop }),
  createTextNode: (value) => ({ value }),
};
test("arcade results settle once per paid run", () => {
  const session = new PlayerSession();
  const before = session.wallet.balance;
  const overlay = new ArcadeCabinetOverlay({ querySelector: () => null });
  overlay.setSession(session); overlay.active = true;
  const hud = { hudMsg: {}, hudTickets: {}, hudChips: {}, hudHigh: {} };
  const result = { payoutMult: 2, score: 300, cleared: true };
  overlay._settle(ARCADE_GAMES[0], result, hud);
  overlay._settle(ARCADE_GAMES[0], result, hud);
  assert.equal(session.wallet.balance, before + 10);
  assert.equal(session.arcadeData.lifetimePlays, 1);
  assert.equal(session.arcadeData.tickets, 5);
});
test("mixed slot payouts have accurate visible paytable labels", () => {
  const machine = MACHINES.find((m) => m.id === "tiger_and_dragon");
  const reels = ["tiger", "tiger", "dragon"].map((name) => machine.symbols.find((s) => s.name === name));
  assert.equal(calculatePayout(reels, 2, machine).win, 180);
  assert(formatPaytableText(machine).includes("tiger / tiger / dragon"));
});
test("linked progressive pools preserve ineligible jackpots and reset eligible ones", () => {
  const machine = MACHINES.find((m) => m.id === "monte_carlo");
  const session = { progressivePools: { mandalay_linked: 300000 } };
  const crown = machine.symbols.find((s) => s.name === "crown");
  const reels = [crown, crown, crown];
  contributeToProgressive(session, machine, 5);
  assert.equal(tryJackpot(session, machine, reels, 1, 5), null);
  assert.equal(session.progressivePools.mandalay_linked, 300001);
  assert.equal(tryJackpot(session, machine, reels, 5, 5), 300001);
  assert.equal(session.progressivePools.mandalay_linked, machine.progressiveSeed);
});
test("dining encounter gifts contribute to recorded session net once", () => {
  const session = new PlayerSession(); const before = session.wallet.balance;
  const sitting = createSitting("stripsteak");
  orderAndConsume(session, sitting, "ss_fries", "pace", () => 1);
  sitting.pendingEncounter = { id: "test_gift", title: "Gift", choices: [
    { id: "accept", label: "Accept", effect: { chips: 50 } },
  ] };
  assert(resolveEncounter(session, sitting, "accept").ok);
  settleSitting(session, sitting, 0);
  assert.equal(session.activityStats.dining.netWinnings, 32);
  assert.equal(session.wallet.balance - before, 32);
  settleSitting(session, sitting, 0);
  assert.equal(session.activityStats.dining.netWinnings, 32);
});
test("Breakout center hits keep sideways motion", () => {
  assert.equal(Math.abs(paddleBounceVx(0, 240)), 120);
  assert.equal(Math.abs(paddleBounceVx(0, -240)), 120);
  assert.equal(paddleBounceVx(0.5, 0), 180);
  assert.equal(paddleBounceVx(0.1, 0), 120);
});
test("Showgirl Beat ignores held-key auto-repeat", () => {
  const originalRandom = Math.random;
  Math.random = () => 0.5; // every note is SNARE
  let lives = null; let ended = 0;
  const game = createShowgirlBeat(canvas, {
    onHud: (state) => { if (state.lives != null) lives = state.lives; },
    onEnded: () => { ended += 1; },
  });
  game.start();
  const onKey = listeners.get("keydown");
  onKey({ key: "z", repeat: false, preventDefault() {} });
  assert.equal(lives, 2, "one wrong press costs one life");
  for (let i = 0; i < 12; i += 1) {
    onKey({ key: "z", repeat: true, preventDefault() {} });
  }
  assert.equal(lives, 2, "auto-repeat must not cost more lives");
  assert.equal(ended, 0);
  game.stop();
  Math.random = originalRandom;
});
console.log(`${cases} arcade, slot, and dining regression cases passed.`);
