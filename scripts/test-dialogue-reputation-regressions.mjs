// Run with: node scripts/test-dialogue-reputation-regressions.mjs
import assert from "node:assert/strict";
import { DialogueManager } from "../docs/rpg/js/systems/DialogueManager.js";

let cases = 0;
const test = async (name, run) => { await run(); cases++; console.log(`PASS ${name}`); };

function dialogueHarness(nodes) {
  const flags = [], items = [], quests = [], encounters = [];
  let closes = 0;
  const root = { hidden: true, classList: { remove() {} } };
  const manager = new DialogueManager(root, {
    onFlag: (flag) => flags.push(flag),
    onItem: (item) => items.push(item),
    onEncounter: (id) => encounters.push(id),
    onClose: () => closes++,
  });
  manager.load(nodes);
  manager.setQuestManager({ start: (id) => quests.push(id) });
  // Only presentation is replaced; start, transitions, effects and close are real.
  manager._renderNode = (node) => { manager._currentNode = node; };
  return { manager, root, flags, items, quests, encounters, closes: () => closes };
}

await test("normal closure sums all nodes and the selected branch across reputation groups", async () => {
  const nodes = {
    opening: { reputation: { staff: 1, vip: 2 }, next: "choice" },
    choice: { reputation: { staff: 2 }, choices: [
      { label: "Accept", reputation: { staff: -1, vip: -2 }, next: "ending" },
      { label: "Decline", reputation: { staff: 100 }, setFlag: "declined" },
    ] },
    ending: { reputation: { staff: 3, locals: 4 } },
  };
  const original = structuredClone(nodes);
  const h = dialogueHarness(nodes);
  const result = h.manager.start("opening");
  h.manager._advance(nodes.opening);
  h.manager._pickChoice(nodes.choice.choices[0]);
  h.manager._advance(nodes.ending);
  assert.deepEqual(await result, { action: "close", flag: undefined, reputation: { staff: 5, vip: 0, locals: 4 } });
  assert.deepEqual(nodes, original, "reputation accumulation must not mutate dialogue data");
  assert.deepEqual(h.flags, []);
  assert.equal(h.closes(), 1);
  assert.equal(h.manager.isActive(), false);
  assert.equal(h.root.hidden, true);
});

for (const ending of ["node", "choice"]) {
  await test(`${ending} encounter carries earlier reputation and fires its hook once`, async () => {
    const exit = { reputation: { staff: 3, vip: -2 }, encounter: "craps" };
    const nodes = {
      opening: { reputation: { staff: 2 }, next: "ending" },
      ending: ending === "node" ? exit : { reputation: { staff: 1 }, choices: [exit] },
    };
    const h = dialogueHarness(nodes);
    const result = h.manager.start("opening");
    h.manager._advance(nodes.opening);
    if (ending === "node") h.manager._advance(nodes.ending);
    else h.manager._pickChoice(exit);
    const outcome = await result;
    assert.equal(outcome.action, "encounter");
    assert.equal(outcome.encounter, "craps");
    assert.deepEqual(outcome.reputation, { staff: ending === "node" ? 5 : 6, vip: -2 });
    assert.deepEqual(h.encounters, ["craps"]);
    assert.equal(h.closes(), 1);
  });
}

for (const ending of ["node", "choice"]) {
  await test(`${ending} with a missing next applies its effects exactly once`, async () => {
    const exit = { reputation: { staff: 2 }, setFlag: "met", giveItem: "token", startQuest: "visit", next: "missing" };
    const nodes = { opening: ending === "node" ? exit : { reputation: { staff: 1 }, choices: [exit] } };
    const h = dialogueHarness(nodes);
    const result = h.manager.start("opening");
    if (ending === "node") h.manager._advance(exit);
    else h.manager._pickChoice(exit);
    const outcome = await result;
    assert.deepEqual(outcome.reputation, { staff: ending === "node" ? 2 : 3 });
    assert.equal(outcome.flag, "met");
    assert.deepEqual(h.flags, ["met"]);
    assert.deepEqual(h.items, ["token"]);
    assert.deepEqual(h.quests, ["visit"]);
  });
}

await test("revisiting a node does not duplicate reputation, flags, items or quests", async () => {
  const nodes = {
    opening: { reputation: { staff: 2 }, setFlag: "met", giveItem: "token", startQuest: "visit", next: "choice" },
    choice: { reputation: { staff: 1 }, choices: [{ next: "opening" }, { reputation: { staff: -1 } }] },
  };
  const h = dialogueHarness(nodes);
  const result = h.manager.start("opening");
  h.manager._advance(nodes.opening);
  h.manager._pickChoice(nodes.choice.choices[0]);
  h.manager._advance(nodes.opening);
  h.manager._pickChoice(nodes.choice.choices[1]);
  assert.deepEqual((await result).reputation, { staff: 2 });
  assert.deepEqual(h.flags, ["met"]);
  assert.deepEqual(h.items, ["token"]);
  assert.deepEqual(h.quests, ["visit"]);
});

await test("a new conversation resets reputation and can apply the same node's effects again", async () => {
  const nodes = { opening: { reputation: { staff: 2 } }, neutral: {} };
  const h = dialogueHarness(nodes);
  for (let i = 0; i < 2; i++) {
    const result = h.manager.start("opening");
    h.manager._advance(nodes.opening);
    assert.deepEqual((await result).reputation, { staff: 2 });
  }
  const result = h.manager.start("neutral");
  h.manager._advance(nodes.neutral);
  assert.equal((await result).reputation, null);
});

await test("attempting another start while active preserves the current chain's reputation", async () => {
  const nodes = { opening: { reputation: { staff: 2 }, next: "ending" }, ending: { reputation: { staff: 1 } } };
  const h = dialogueHarness(nodes);
  const result = h.manager.start("opening");
  h.manager._advance(nodes.opening);
  assert.deepEqual(await h.manager.start("opening"), {});
  h.manager._advance(nodes.ending);
  assert.deepEqual((await result).reputation, { staff: 3 });
});

await test("gated next node uses its visible alternate without applying blocked effects", async () => {
  const nodes = {
    opening: { reputation: { staff: 2 }, next: "restricted" },
    restricted: { requiresFlag: "member", reputation: { staff: 100 }, setFlag: "restricted_seen", elseNext: "alternate" },
    alternate: { reputation: { staff: -1, locals: 3 }, setFlag: "alternate_seen" },
  };
  const h = dialogueHarness(nodes);
  const result = h.manager.start("opening");
  h.manager._advance(nodes.opening);
  assert.equal(h.manager._currentNode, nodes.alternate);
  h.manager._advance(nodes.alternate);
  assert.deepEqual((await result).reputation, { staff: 1, locals: 3 });
  assert.deepEqual(h.flags, ["alternate_seen"]);
});

await test("advancing a choice node waits for a selection before applying effects", async () => {
  const choice = { reputation: { staff: 3 }, setFlag: "chosen" };
  const nodes = { opening: { reputation: { staff: 2 }, choices: [choice] } };
  const h = dialogueHarness(nodes);
  const result = h.manager.start("opening");
  h.manager._advance(nodes.opening);
  assert.equal(h.manager.isActive(), true);
  assert.deepEqual(h.flags, []);
  assert.equal(h.closes(), 0);
  h.manager._pickChoice(choice);
  assert.deepEqual((await result).reputation, { staff: 5 });
  assert.deepEqual(h.flags, ["chosen"]);
});

console.log(`${cases} dialogue reputation regression cases passed.`);
