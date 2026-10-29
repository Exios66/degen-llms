#!/usr/bin/env node
/** Ledger, persistence, rewards, and daily hotel billing regressions. */
import assert from "node:assert/strict";
import { BankAccount, buyInForSession } from "../docs/js/bank-account.js";
import { ChipWallet, PlayerSession, createSlot, loadSlot, loadActiveProfile, loadLibrary, listSlots, saveSlot } from "../docs/js/core.js";
import { checkoutStay, ensureHotel, extendStay } from "../docs/js/hotel.js";
import { refundSlips } from "../docs/js/pendingRefunds.js";
import { RewardsTracker, TIERS, migrateSessionRewards } from "../docs/js/rewards.js";
import { orderAndConsume, createSitting, resolveEncounter, settleSitting, DINING_VENUES } from "../docs/js/dining.js";
import { ensurePoolComplex, enterBeachClub, enterZone, playRingToss } from "../docs/js/pool-complex.js";
import { purchaseMinibarItem, makePhoneCall, makeRoomDecision } from "../docs/js/room-amenities.js";
import { orderClubDrink, resolveBottleMemory, CLUB_BAR } from "../docs/js/gentlemans-club.js";
import { CONSUMABLE_POTENCY, getIntoxicationLevel } from "../docs/js/intoxication-effects.js";
import { ensureWorldCycle, MS_PER_GAME_DAY, syncWorldCycle } from "../docs/js/world-cycle.js";

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};
for (const amount of [NaN, Infinity, -Infinity, "100", null, true]) {
  const wallet = new ChipWallet(1000);
  const bank = new BankAccount({ balance: 1000 });
  assert.equal(wallet.debit(amount, "test", "test"), false);
  assert.equal(wallet.cashOut(amount), false);
  assert.equal(bank.withdraw(amount, "test", "test"), false);
  assert.throws(() => wallet.credit(amount, "test", "test"));
  assert.throws(() => wallet.buyIn(amount));
  assert.throws(() => bank.deposit(amount, "test", "test"));
  assert.throws(() => buyInForSession({ wallet, bank }, amount));
  assert.equal(wallet.balance, 1000);
  assert.equal(bank.balance, 1000);
}
const wallet = new ChipWallet(100);
assert.throws(() => wallet.syncBalance(-1, "test", "test"));
assert.equal(wallet.balance, 100);

const refunds = new PlayerSession({ chips: 850 });
assert.equal(refundSlips(refunds, "sportsbook", [
  { amount: 100 }, { amount: 50 }, { amount: Infinity }, { amount: -10 }, { amount: "oops" }, null,
], "Leave"), 150);
assert.equal(refunds.wallet.balance, 1000);
assert.equal(refunds.wallet.transactions.at(-1).kind, "refund");

const rewards = new PlayerSession({ chips: 2_000_000 });
rewards.wallet.debit(1_000_000, "blackjack", "large wager");
new RewardsTracker(rewards).syncFromWallet();
assert.equal(rewards.rewards.tier, "chairman");
for (const tier of TIERS) if (tier.comp) assert.ok(rewards.rewards.unlockedComps.includes(tier.comp));
const migrated = new PlayerSession();
migrated.wallet = rewards.wallet;
migrateSessionRewards(migrated, 1);
assert.deepEqual(migrated.rewards.unlockedComps, rewards.rewards.unlockedComps);

const hotelSession = new PlayerSession();
const hotel = ensureHotel(hotelSession);
hotel.roomAmenities = null;
assert.equal(checkoutStay(hotelSession).ok, true);
assert.equal(checkoutStay(hotelSession).ok, false);
assert.equal(hotel.nightsRemaining, 1);
new RewardsTracker(hotelSession).ensureRewards().unlockedComps.push("room_night");
for (const nights of [-1, 0, 1.5, Infinity, true, 100]) {
  assert.equal(extendStay(hotelSession, nights).ok, false);
}
assert.equal(extendStay(hotelSession, 1).ok, true);
assert.equal(hotel.nightsRemaining, 2);

const clockSession = new PlayerSession({ chips: 10 });
ensureHotel(clockSession);
const cycle = ensureWorldCycle(clockSession);
const originalNow = Date.now;
try {
  Date.now = () => 1000 + MS_PER_GAME_DAY;
  cycle.clockAnchorMs = 1000;
  const state = syncWorldCycle(clockSession);
  assert.match(state.messages[0], /^Day 2 — Front desk/);
  assert.equal(state.roomEvicted, true);
  assert.equal(state.overdueBalance, 149);
  assert.equal(syncWorldCycle(clockSession).advanced, false);
} finally {
  Date.now = originalNow;
}

createSlot(1, { playerName: "Survivor" });
for (const broken of ["null", "[]", '{"slots":null,"recent":null}', '{"slots":[],"recent":[]}']) {
  // Restore the backup before testing each corrupt main library.
  storage.set("mandalay-bay-profile-cache", JSON.stringify({ library: {
    recent: [1], summaries: {}, slots: { "1": new PlayerSession({ playerName: "Survivor", slotId: 1 }).toJSON() },
  } }));
  storage.set("mandalay-bay-library", broken);
  assert.equal(loadSlot(1)?.playerName, "Survivor");
}
assert.throws(() => createSlot(6));
assert.throws(() => loadSlot("1"));

storage.clear();
createSlot(1, { playerName: "Good" });
const lib = loadLibrary();
lib.slots["2"] = { wallet: { balance: "broken" } };
lib.recent = [2, 1];
storage.set("mandalay-bay-library", JSON.stringify(lib));
storage.set("mandalay-bay-active-slot", "2");
assert.equal(loadSlot(2), null);
assert.equal(loadActiveProfile()?.playerName, "Good");

storage.clear();
const primarySet = localStorage.setItem;
localStorage.setItem = (key, value) => {
  if (key === "mandalay-bay-library") throw new Error("primary storage unavailable");
  return primarySet(key, value);
};
saveSlot(new PlayerSession({ playerName: "Cached", slotId: 1 }));
assert.equal(loadSlot(1)?.playerName, "Cached");
localStorage.setItem = primarySet;

for (const target of [-1, 3, 0.5, "0", null, true]) {
  const session = new PlayerSession();
  assert.equal(playRingToss(session, 100, target).ok, false);
  assert.equal(session.wallet.balance, 1000);
  assert.equal(session.wallet.transactions.length, 0);
}
for (const enter of [enterBeachClub, (session) => enterZone(session, "beach_club")]) {
  const session = new PlayerSession({ chips: 0 });
  assert.equal(enter(session).ok, false);
  const pool = ensurePoolComplex(session);
  assert.ok(!pool.visitedZones.includes("beach_club"));
  assert.ok(!pool.unlockedEvents.includes("beach_club_initiate"));
  session.wallet.balance = 75;
  assert.equal(enter(session).ok, true);
  assert.equal(session.wallet.balance, 0);
  assert.ok(pool.unlockedEvents.includes("beach_club_initiate"));
  assert.equal(enter(session).ok, true);
  assert.equal(session.wallet.transactions.length, 1);
}
const recipe = new PlayerSession();
const recipeHotel = ensureHotel(recipe);
recipeHotel.reachedRoom = true;
purchaseMinibarItem(recipe, "mini_vodka");
makePhoneCall(recipe, "ex");
makeRoomDecision(recipe, "balcony");
assert.ok(!recipeHotel.roomAmenities.unlockedEvents.includes("what_happens"));
purchaseMinibarItem(recipe, "mini_vodka");
assert.ok(recipeHotel.roomAmenities.unlockedEvents.includes("what_happens"));
for (const venue of DINING_VENUES) {
  for (const item of venue.menu) if (item.potencyId) assert.ok(CONSUMABLE_POTENCY[item.potencyId]?.potency > 0);
}
for (const drink of CLUB_BAR) {
  assert.ok(drink.id in CONSUMABLE_POTENCY);
  if (drink.id !== "gc_club_soda") assert.ok(CONSUMABLE_POTENCY[drink.id].potency > 0);
}
const diner = new PlayerSession();
const sitting = createSitting("aureole");
assert.equal(orderAndConsume(diner, sitting, "aur_champagne", "pace", () => 1).ok, true);
assert.equal(getIntoxicationLevel(diner), 2);
assert.equal(orderClubDrink(diner, "gc_old_fashioned").ok, true);
assert.equal(getIntoxicationLevel(diner), 5);
assert.ok(orderAndConsume(diner, sitting, "aur_amuse", "pace", () => 0).encounter);
const pending = sitting.pendingEncounter;
const balanceBefore = diner.wallet.balance;
assert.equal(orderAndConsume(diner, sitting, "aur_amuse", "pace", () => 0).ok, false);
assert.equal(resolveEncounter(diner, sitting, "missing").ok, false);
assert.equal(diner.wallet.balance, balanceBefore);
assert.equal(sitting.pendingEncounter, pending);
assert.equal(settleSitting(diner, sitting, 0).ok, true);
assert.equal(sitting.pendingEncounter, null);
assert.equal(resolveEncounter(diner, sitting, pending.choices[0].id).ok, false);
assert.equal(diner.wallet.balance, balanceBefore);
assert.equal(resolveBottleMemory(diner, [], []).ok, false);
assert.equal(diner.wallet.balance, balanceBefore);

console.log("Economy and resort service integrity smoke checks passed.");
