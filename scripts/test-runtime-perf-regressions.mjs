// Run with: node --experimental-default-type=module scripts/test-runtime-perf-regressions.mjs
//
// Runtime-cost regressions pinned by the performance sweep:
//   * saveSlot() must not write the save library to localStorage more than the
//     two copies it keeps (library + mirror cache), and must serialise it once.
//   * loadLibrary() is a read: it must not rewrite storage.
//   * the overworld autosave must skip a write when the player has not moved.
import assert from "node:assert/strict";
import { createSlot, loadSlot, saveSlot, loadLibrary } from "../docs/js/core.js";
import { PROFILE_CACHE_KEY, readCacheLibrary } from "../docs/js/profileCache.js";
import { SaveAdapter } from "../docs/rpg/js/systems/SaveAdapter.js";

/** localStorage with per-key write accounting. */
const storage = new Map();
let writes = [];
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => {
    writes.push({ key, bytes: String(value).length });
    storage.set(key, String(value));
  },
  removeItem: (key) => storage.delete(key),
};

let cases = 0;
const test = (name, run) => {
  run();
  cases += 1;
  console.log(`PASS ${name}`);
};

/** Start each case from an empty library so payload sizes are comparable. */
function resetStorage() {
  storage.clear();
  writes = [];
}

/** Fill a slot with `count` wallet transactions, the way a long session does. */
function seedSlot(slotId, count) {
  const session = createSlot(slotId, { playerName: "Perf", chips: 1_000 });
  for (let i = 0; i < count; i += 1) {
    session.wallet.debit(10, "slots", `spin ${i}`);
    session.wallet.credit(9, "slots", `win ${i}`);
  }
  return session;
}

test("one save writes two library copies, not three", () => {
  resetStorage();
  const session = seedSlot(1, 300);
  saveSlot(session); // settle the large payload
  writes = [];
  saveSlot(session);
  const libraryWrites = writes.filter((w) => w.bytes > 1024);
  assert.equal(libraryWrites.length, 2, "library + mirror cache, nothing else");
  assert.deepEqual(
    libraryWrites.map((w) => w.key).sort(),
    ["mandalay-bay-library", PROFILE_CACHE_KEY],
  );
});

test("the save payload is not duplicated past the library + mirror", () => {
  resetStorage();
  const session = seedSlot(1, 300);
  saveSlot(session);
  const payload = JSON.stringify(loadLibrary()).length;
  writes = [];
  saveSlot(session);
  const written = writes.reduce((sum, w) => sum + w.bytes, 0);
  // The mirror wraps the same payload with version/savedAt, so two copies plus
  // the one-byte active-slot key is the ceiling. A third copy is the regression.
  assert.ok(written < payload * 2.2, `wrote ${written} B for a ${payload} B library`);
});

test("loadLibrary() is a pure read", () => {
  resetStorage();
  seedSlot(1, 5);
  writes = [];
  const lib = loadLibrary();
  assert.ok(lib.slots["1"], "library still loads");
  assert.equal(writes.length, 0, "reading the library must not rewrite storage");
});

test("the mirror cache stays readable after sharing the serialised library", () => {
  resetStorage();
  const session = seedSlot(1, 20);
  saveSlot(session);
  const mirrored = readCacheLibrary();
  assert.ok(mirrored, "mirror cache parses");
  assert.equal(mirrored.slots["1"].wallet.balance, session.wallet.balance);
});

test("a save round-trips through the shared mirror payload", () => {
  resetStorage();
  const session = seedSlot(1, 10);
  session.wallet.credit(500, "test", "win");
  saveSlot(session);
  const restored = loadSlot(1);
  assert.equal(restored.wallet.balance, session.wallet.balance);
  assert.equal(restored.wallet.transactions.length, session.wallet.transactions.length);
});

test("the overworld autosave skips a write when the tile is unchanged", () => {
  resetStorage();
  const session = seedSlot(1, 5);
  const adapter = new SaveAdapter(session);
  const rpg = adapter.rpg;
  rpg.x = 12;
  rpg.y = 30;
  rpg.mapId = "main_resort";
  adapter.persist();
  writes = [];

  for (let i = 0; i < 15; i += 1) adapter.persistPosition(12, 30, "main_resort");
  assert.equal(writes.length, 0, "standing still writes nothing");

  assert.equal(adapter.persistPosition(13, 30, "main_resort"), true);
  assert.equal(rpg.x, 13);
  assert.ok(writes.length > 0, "moving writes the position");

  writes = [];
  adapter.persistPosition(13, 30, "main_resort");
  assert.equal(writes.length, 0, "the new tile is now the saved one");
});

test("guest sessions never touch storage", () => {
  resetStorage();
  const session = createSlot(1, { playerName: "Guest", chips: 100 });
  session.slotId = null;
  const adapter = new SaveAdapter(session);
  writes = [];
  assert.equal(adapter.persistPosition(3, 4, "main_resort"), true);
  adapter.persist();
  assert.equal(writes.length, 0);
});

console.log(`${cases} runtime performance regression cases passed.`);
