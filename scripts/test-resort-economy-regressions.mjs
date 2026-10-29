// Run with: node --experimental-default-type=module scripts/test-resort-economy-regressions.mjs
import assert from "node:assert/strict";
import { createSlot, loadSlot, PlayerSession, saveSlot } from "../docs/js/core.js";
import { buildFolioLines, ensureHotel, upgradeRoom } from "../docs/js/hotel.js";
import { makeRoomDecision } from "../docs/js/room-amenities.js";
import {
  createBarRound,
  ensureBar,
  orderBarVenueDrink,
  settleBarRound,
} from "../docs/js/bar.js";
import { ensurePoolComplex, playRingToss } from "../docs/js/pool-complex.js";
import { applyPhoneEffect } from "../docs/js/phone-contacts.js";

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};

let cases = 0;
const test = (name, run) => {
  run();
  cases += 1;
  console.log(`PASS ${name}`);
};

test("room upgrades cannot be charged for the same room or a downgrade", () => {
  const session = new PlayerSession({ chips: 5_000 });
  const hotel = ensureHotel(session);
  hotel.roomType = "penthouse";
  hotel.wing = "sky";
  hotel.floor = 62;
  session.wallet.credit(1_000, "test", "win");
  const before = session.wallet.balance;

  assert.equal(upgradeRoom(session, "suite").ok, false);
  assert.equal(hotel.roomType, "penthouse");
  assert.equal(session.wallet.balance, before);

  hotel.roomType = "suite";
  hotel.wing = "east";
  hotel.floor = 31;
  assert.equal(upgradeRoom(session, "suite").ok, false);
  assert.equal(session.wallet.balance, before);

  hotel.roomType = "standard";
  hotel.wing = "south";
  hotel.floor = 23;
  assert.equal(upgradeRoom(session, "suite").ok, true);
  assert.equal(session.wallet.balance, before - 500);
});

test("a same-tier room comp is not consumed by a no-op upgrade", () => {
  const session = new PlayerSession({ chips: 5_000 });
  const hotel = ensureHotel(session);
  hotel.roomType = "penthouse";
  session.rewards = {
    unlockedComps: ["suite_upgrade"],
    redeemedComps: [],
  };
  assert.equal(upgradeRoom(session, "suite").ok, false);
  assert.deepEqual(session.rewards.redeemedComps, []);
});

test("housekeeping tips are counted once on the folio", () => {
  const session = new PlayerSession({ chips: 5_000 });
  const hotel = ensureHotel(session);
  hotel.reachedRoom = true;
  assert.equal(makeRoomDecision(session, "tip_maid").ok, true);

  const lines = buildFolioLines(session);
  assert.equal(lines.filter((line) => line.includes("housekeeping")).length, 1);
  assert.equal(lines.some((line) => line.startsWith("In-room services:")), false);
  assert.ok(lines.includes("Running folio total: $25"));
});

test("a bar drink is recorded once in the bar ledger", () => {
  const session = new PlayerSession({ chips: 5_000 });
  const round = createBarRound("betty_bar");
  assert.equal(orderBarVenueDrink(session, "betty_bar", "betty_comp_marg", round).ok, true);
  assert.equal(session.bar.orders.length, 1);
  assert.equal(session.bar.lifetimeDrinks, 1);
  assert.equal(session.bar.venueVisits.betty_bar, 1);
});

test("bar stats survive a save reload", () => {
  createSlot(1, { playerName: "Barfly" });
  const session = loadSlot(1);
  const round = createBarRound("betty_bar");
  assert.equal(orderBarVenueDrink(session, "betty_bar", "betty_comp_marg", round).ok, true);
  settleBarRound(session, round);
  saveSlot(session);

  const reloaded = loadSlot(1);
  const bar = ensureBar(reloaded);
  assert.equal(bar.visits, 1);
  assert.equal(bar.lifetimeDrinks, 1);
  assert.equal(bar.venueVisits.betty_bar, 1);
  assert.equal(bar.orders.length, 1);
});

test("positive phone gifts pay once per choice", () => {
  const session = new PlayerSession({ chips: 1_000 });
  session.rewards = {};
  const before = session.wallet.balance;
  applyPhoneEffect(session, { chips: 25 }, null, "call:host:loud");
  applyPhoneEffect(session, { chips: 25 }, null, "call:host:loud");
  assert.equal(session.wallet.balance, before + 25);
  applyPhoneEffect(session, { chips: 15 }, null, "call:host:quiet");
  assert.equal(session.wallet.balance, before + 40);
  applyPhoneEffect(session, { chips: -10 }, null, "call:host:loud");
  assert.equal(session.wallet.balance, before + 30);
});

test("a rejected ring toss does not grant wave-pool progress", () => {
  const session = new PlayerSession({ chips: 0 });
  assert.equal(playRingToss(session, 100, 0).ok, false);
  assert.equal(ensurePoolComplex(session).visitedZones.includes("wave_pool"), false);
  session.wallet.credit(1_000, "test", "stack");
  assert.equal(playRingToss(session, 10, 0).ok, true);
  assert.equal(ensurePoolComplex(session).visitedZones.includes("wave_pool"), true);
});

console.log(`${cases} resort economy regression cases passed.`);
