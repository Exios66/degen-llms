/**
 * Smoke checks for suite balcony POV overlay logic.
 * Run: node scripts/smoke-test-balcony-smoke.mjs
 */
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const js = (rel) => pathToFileURL(path.join(root, "docs/js", rel)).href;

const { PlayerSession } = await import(js("core.js"));
const { ensureHotel, findReservation, useRoomKeyToDoor, upgradeRoom } = await import(js("hotel.js"));
const {
  canEnterBalconySmoke,
  startBalconyVisit,
  createBalconySitting,
  takeBalconyHit,
  closeBalconySitting,
  BALCONY_HIT_MAX,
  BALCONY_JOINT_ID,
} = await import(js("balcony-smoke.js"));
const { CONSUMABLE_POTENCY } = await import(js("intoxication-effects.js"));
const { ROOM_DECISIONS } = await import(js("room-amenities.js"));

let failed = 0;
function check(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed += 1;
  } else {
    console.log("ok:", msg);
  }
}

check(Boolean(CONSUMABLE_POTENCY[BALCONY_JOINT_ID]), "balcony joint consumable registered");
check(!ROOM_DECISIONS.balcony_smoke_pov?.roomTypes, "POV decision available for all balcony rooms");

const session = new PlayerSession({ chips: 20000 });
ensureHotel(session);
check(!canEnterBalconySmoke(session).ok, "blocked before room access");

findReservation(session);
useRoomKeyToDoor(session);
check(canEnterBalconySmoke(session).ok, "standard room + door opens balcony POV");

session.wallet.credit(1000, "blackjack", "win");
upgradeRoom(session, "suite");
useRoomKeyToDoor(session);
check(canEnterBalconySmoke(session).ok, "suite + door opens balcony POV");

const started = startBalconyVisit(session);
check(started.ok, "start balcony visit");
const sitting = createBalconySitting(session);
for (let i = 0; i < BALCONY_HIT_MAX; i += 1) {
  const hit = takeBalconyHit(session, sitting);
  check(hit.ok, `hit ${i + 1}`);
}
check(sitting.hits === BALCONY_HIT_MAX, "max hits reached");
const closed = closeBalconySitting(session, sitting);
check(closed.ok && session.balconySmoke.lifetimeHits >= BALCONY_HIT_MAX, "ledger updated");
check(session.balconySmoke.eggs.includes("high_roller_haze"), "high roller haze egg");

if (failed) {
  console.error(`\n${failed} smoke check(s) failed`);
  process.exit(1);
}
console.log("\nAll balcony POV smoke checks passed.");
