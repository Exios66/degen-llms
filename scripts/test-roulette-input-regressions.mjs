// Run with: node scripts/test-roulette-input-regressions.mjs
import assert from "node:assert/strict";
import { mock } from "node:test";
import { PlayerSession } from "../docs/js/core.js";
import { STAKE_TIERS } from "../docs/js/stakes.js";
import { BET_TYPES } from "../docs/js/roulette.js";
import { buildTableRenderers } from "../docs/js/ui/table-renderers.js";

let cases = 0;
const test = (name, run) => {
  try {
    run();
    cases++;
    console.log(`PASS ${name}`);
  } finally {
    mock.restoreAll();
  }
};

// Render real controls with a small DOM stand-in; do not run wheel animations.
function rouletteHarness({ tier = STAKE_TIERS.high_limit, balance = 2000, salonMin } = {}) {
  const nodes = [], timers = [];
  const session = new PlayerSession({ chips: balance });
  const runtime = {
    stakeTier: tier,
    salonActivityMin: salonMin,
    activeTableDealer: { name: "Test dealer", quips: { deal: ["Place your bets"] } },
    roulette: { lastWager: 50, spinning: false, spins: 0, sessionNet: 0, history: [] },
  };
  let renders = 0;
  mock.method(globalThis, "setTimeout", (callback) => { timers.push(callback); return timers.length; });
  const ctx = {
    session, runtime,
    el(tag, props = {}, children = []) {
      const node = { tag, style: {}, children: [...children], ...props,
        appendChild(child) { this.children.push(child); },
      };
      if (tag === "select") node.value = children[0].value;
      nodes.push(node);
      return node;
    },
    videoMachine: (_id, screen) => screen,
    dealerPanel: () => null,
    persist() {}, recordActivityVisitOnce() {},
    render() { renders++; },
  };
  const screen = buildTableRenderers(ctx).roulette();
  return {
    session, runtime, timers,
    wager: nodes.find((node) => node.oninput),
    pick: nodes.find((node) => node.tag === "input" && node.max === "36"),
    bet: nodes.find((node) => node.tag === "select"),
    spin: screen.controls.children.find((node) => node.textContent === "Spin").onclick,
    errors: () => nodes.filter((node) => node.className === "error"),
    renders: () => renders,
  };
}

const originalDocument = globalThis.document;
globalThis.document = { documentElement: { style: { setProperty() {} } } };
try {
  for (const amount of ["", "0", "-1", "24", "25.5", "25chips", "NaN", "Infinity", "2001", "9007199254740992"]) {
    test(`invalid wager ${JSON.stringify(amount)} cannot debit or start a spin`, () => {
      const h = rouletteHarness();
      h.wager.value = amount;
      h.spin();
      assert.equal(h.session.wallet.balance, 2000);
      assert.equal(h.session.wallet.transactions.length, 0);
      assert.equal(h.runtime.roulette.pendingSpin, undefined);
      assert.equal(h.runtime.roulette.spinning, false);
      assert.equal(h.timers.length, 0);
      assert.equal(h.renders(), 0);
      assert.match(h.errors()[0].textContent, /between 25 and 2000/);
    });
  }

  for (const pick of ["", " ", "-1", "37", "1.5", "7chips", "NaN", "Infinity"]) {
    test(`invalid straight pick ${JSON.stringify(pick)} leaves the wallet untouched`, () => {
      const h = rouletteHarness();
      h.wager.value = "25";
      h.pick.value = pick;
      h.spin();
      assert.equal(h.session.wallet.balance, 2000);
      assert.equal(h.session.wallet.transactions.length, 0);
      assert.equal(h.runtime.roulette.pendingSpin, undefined);
      assert.equal(h.timers.length, 0);
      assert.match(h.errors()[0].textContent, /whole number from 0 to 36/);
    });
  }

  for (const [amount, pick] of [[25, 0], [1000, 36], [2000, 7]]) {
    test(`wager ${amount} and straight ${pick} reach the spin with one debit`, () => {
      const h = rouletteHarness();
      h.wager.value = String(amount);
      h.pick.value = String(pick);
      h.spin();
      assert.equal(h.session.wallet.balance, 2000 - amount);
      assert.deepEqual(h.session.wallet.transactions.map((tx) => tx.amount), [-amount]);
      assert.equal(h.runtime.roulette.pendingSpin.amount, amount);
      assert.equal(h.runtime.roulette.pendingSpin.straightPick, pick);
      assert.equal(h.runtime.roulette.lastWager, amount);
      assert.equal(h.runtime.roulette.spinning, true);
      assert.equal(h.timers.length, 1);
      assert.equal(h.renders(), 1);
      assert.equal(h.errors().length, 0);
    });
  }

  test("outside bets ignore the hidden straight-number field", () => {
    const h = rouletteHarness();
    h.bet.value = String(BET_TYPES.findIndex((bet) => bet.kind !== "straight"));
    h.pick.value = "invalid";
    h.wager.value = "25";
    h.spin();
    assert.equal(h.session.wallet.balance, 1975);
    assert.equal(h.runtime.roulette.pendingSpin.straightPick, null);
  });

  test("correcting invalid inputs starts exactly one spin and clears the error", () => {
    const h = rouletteHarness();
    h.wager.value = "24";
    h.spin();
    assert.match(h.errors()[0].textContent, /whole-chip wager/);
    h.wager.value = "25";
    h.pick.value = "37";
    h.spin();
    assert.match(h.errors()[0].textContent, /whole number from 0 to 36/);
    assert.equal(h.session.wallet.transactions.length, 0);
    h.pick.value = "0";
    h.spin();
    assert.equal(h.errors().length, 0);
    assert.deepEqual(h.session.wallet.transactions.map((tx) => tx.amount), [-25]);
    assert.equal(h.runtime.roulette.pendingSpin.straightPick, 0);
    assert.equal(h.timers.length, 1);
  });

  test("salon minimum applies even without a selected tier", () => {
    const h = rouletteHarness({ tier: null, salonMin: 100 });
    h.wager.value = "99";
    h.spin();
    assert.equal(h.session.wallet.transactions.length, 0);
    assert.match(h.errors()[0].textContent, /between 100 and 2000/);
    h.wager.value = "100";
    h.spin();
    assert.equal(h.session.wallet.balance, 1900);
  });

  test("insufficient funds after rendering do not create a pending spin", () => {
    const h = rouletteHarness();
    h.session.wallet.debit(1990, "test", "Other purchase");
    h.wager.value = "25";
    h.spin();
    assert.equal(h.session.wallet.balance, 10);
    assert.equal(h.session.wallet.transactions.length, 1);
    assert.equal(h.runtime.roulette.pendingSpin, undefined);
    assert.equal(h.timers.length, 0);
    assert.equal(h.errors()[0].textContent, "Insufficient chips.");
  });

  for (const typed of ["25.5", "25chips", "", "0", "-1", "NaN", "Infinity", "9007199254740992"]) {
    test(`input ${JSON.stringify(typed)} does not overwrite a remembered whole-chip wager`, () => {
      const h = rouletteHarness();
      h.wager.value = typed;
      h.wager.oninput();
      assert.equal(h.runtime.roulette.lastWager, 50);
      assert.equal(h.session.wallet.transactions.length, 0);
    });
  }

  test("valid whole-chip input updates the remembered wager without taking chips", () => {
    const h = rouletteHarness();
    h.wager.value = "125";
    h.wager.oninput();
    assert.equal(h.runtime.roulette.lastWager, 125);
    assert.equal(h.session.wallet.balance, 2000);
    assert.equal(h.timers.length, 0);
  });
} finally {
  if (originalDocument === undefined) delete globalThis.document;
  else globalThis.document = originalDocument;
}

console.log(`${cases} roulette input regression cases passed.`);
