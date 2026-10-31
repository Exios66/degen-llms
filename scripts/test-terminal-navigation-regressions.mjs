// Run with: node scripts/test-terminal-navigation-regressions.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { FLOOR_ORDER } from "../docs/js/core.js";
import { Action } from "../docs/js/blackjack/game.js";

// app.js bootstraps the whole page on import. Isolate its actual function and
// listener in a VM so these unit tests need neither a server nor a browser.
const source = readFileSync(new URL("../docs/js/app.js", import.meta.url), "utf8");
const deepViewSource = source.match(/^function applyDeepView\(deepView\) \{[\s\S]*?^\}/m)?.[0];
const keyboardSource = source.match(/^document\.addEventListener\("keydown", \(e\) => \{[\s\S]*?^\}\);/m)?.[0];
assert.ok(deepViewSource, "applyDeepView must be found in app.js");
assert.ok(keyboardSource, "the global keydown listener must be found in app.js");

let cases = 0;
const test = (name, run) => { run(); cases++; console.log(`PASS ${name}`); };

function deepViewHarness(search = "") {
  const views = [];
  const context = {
    URLSearchParams, FLOOR_ORDER,
    window: { location: { search } },
    POOL_LAUNCH_ZONES: {},
    RENDERERS: { floor() {}, "save-create"() {}, "save-picker"() {}, roulette() {} },
    pushView: (name, data = {}) => views.push({ name, data: structuredClone(data) }),
  };
  runInNewContext(deepViewSource, context);
  return { views, apply: context.applyDeepView };
}

for (const floor of [null, "", "unknown", ...FLOOR_ORDER]) {
  test(`floor deep link with ${JSON.stringify(floor)} supplies valid view data`, () => {
    const search = new URLSearchParams({ view: "floor" });
    if (floor !== null) search.set("floor", floor);
    const h = deepViewHarness(`?${search}`);
    h.apply("floor");
    assert.deepEqual(h.views, [{ name: "floor", data: { floor: FLOOR_ORDER.includes(floor) ? floor : FLOOR_ORDER[0] } }]);
  });
}

test("save-create deep link opens the picker rather than an undefined slot form", () => {
  const h = deepViewHarness("?view=save-create");
  h.apply("save-create");
  assert.deepEqual(h.views, [{ name: "save-picker", data: {} }]);
});

test("ordinary, missing and unknown deep views preserve navigation semantics", () => {
  const h = deepViewHarness();
  h.apply(null);
  h.apply("");
  h.apply("unknown");
  assert.deepEqual(h.views, []);
  h.apply("roulette");
  assert.deepEqual(h.views, [{ name: "roulette", data: {} }]);
});

// Minimal Element double implementing the selector subset used by this handler,
// including closest() walking ancestors of a nested contenteditable child.
class Element {
  constructor(tag = "div", editable = null, parent = null) {
    Object.assign(this, { tag, editable, parent });
  }
  closest(selector) {
    const matched = selector.split(/,\s*/).some((part) => {
      if (part === "[contenteditable]:not([contenteditable='false'])") return this.editable !== null && this.editable !== "false";
      return part === this.tag;
    });
    return matched ? this : this.parent?.closest(selector) ?? null;
  }
}

function keyboardHarness({ view = "blackjack-play", phoneOpen = false, pending = true, legal = Object.values(Action), inCasino = true } = {}) {
  const actions = [];
  let handler, renders = 0, toggles = 0;
  runInNewContext(keyboardSource, {
    Element, Action,
    document: { addEventListener(type, callback) { assert.equal(type, "keydown"); handler = callback; } },
    viewStack: [{ name: view }],
    runtime: { blackjackGame: {
      pendingAction: pending,
      getCurrentLegalActions: () => new Set(legal),
      playerAction: (action) => actions.push(action),
    } },
    rewardsPhone: { isOpen: () => phoneOpen, toggle() { toggles++; } },
    isInCasinoView: () => inCasino,
    render() { renders++; },
  });
  return {
    actions, renders: () => renders, toggles: () => toggles,
    key(key, overrides = {}) {
      let prevented = false;
      handler({ key, target: new Element(), preventDefault() { prevented = true; }, ...overrides });
      return prevented;
    },
  };
}

for (const target of [
  new Element("input"), new Element("textarea"), new Element("select"),
  new Element("div", "true"), new Element("div", ""),
  new Element("span", null, new Element("div", "true")),
]) {
  test(`editable ${target.tag} target keeps blackjack and phone shortcuts untouched`, () => {
    const h = keyboardHarness();
    assert.equal(h.key("s", { target }), false);
    assert.deepEqual(h.actions, []);
    const menu = keyboardHarness({ view: "floor" });
    assert.equal(menu.key("p", { target }), false);
    assert.equal(menu.toggles(), 0);
  });
}

for (const modifier of ["altKey", "ctrlKey", "metaKey", "repeat"]) {
  test(`${modifier} suppresses both table actions and phone shortcuts`, () => {
    const h = keyboardHarness();
    h.key("s", { [modifier]: true });
    assert.deepEqual(h.actions, []);
    const menu = keyboardHarness({ view: "floor" });
    assert.equal(menu.key("p", { [modifier]: true }), false);
    assert.equal(menu.toggles(), 0);
  });
}

for (const state of [{ view: "floor" }, { phoneOpen: true }, { pending: false }]) {
  test(`blackjack shortcuts require an active action on the play view: ${JSON.stringify(state)}`, () => {
    const h = keyboardHarness(state);
    h.key("s");
    assert.deepEqual(h.actions, []);
    assert.equal(h.renders(), 0);
  });
}

for (const [key, action] of [["H", Action.HIT], ["s", Action.STAND], ["d", Action.DOUBLE], ["p", Action.SPLIT], ["u", Action.SURRENDER]]) {
  test(`unmodified ${key} executes the legal blackjack action once`, () => {
    const h = keyboardHarness();
    h.key(key);
    assert.deepEqual(h.actions, [action]);
    assert.equal(h.renders(), 1);
    assert.equal(h.toggles(), 0);
  });
}

test("illegal actions and unrelated keys do nothing", () => {
  const h = keyboardHarness({ legal: [Action.STAND] });
  h.key("d");
  h.key("x");
  assert.deepEqual(h.actions, []);
  assert.equal(h.renders(), 0);
});

test("explicitly noneditable content and non-Element targets still allow shortcuts", () => {
  const h = keyboardHarness();
  h.key("s", { target: new Element("div", "false") });
  h.key("s", { target: {} });
  assert.deepEqual(h.actions, [Action.STAND, Action.STAND]);
});

test("plain P opens the phone when blackjack does not need Split", () => {
  const h = keyboardHarness({ view: "floor" });
  assert.equal(h.key("P"), true);
  assert.equal(h.toggles(), 1);
  assert.deepEqual(h.actions, []);
});

test("P does not open the phone outside the casino or when Split is illegal", () => {
  const outside = keyboardHarness({ view: "floor", inCasino: false });
  assert.equal(outside.key("p"), false);
  assert.equal(outside.toggles(), 0);
  const table = keyboardHarness({ legal: [Action.STAND] });
  assert.equal(table.key("p"), false);
  assert.equal(table.toggles(), 0);
  assert.deepEqual(table.actions, []);
  assert.equal(table.renders(), 0);
});

console.log(`${cases} terminal navigation regression cases passed.`);
