#!/usr/bin/env node
/**
 * Smoke tests for Strip limo / destination travel (web terminal).
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const js = (...parts) => join(root, "docs", "js", ...parts);

let failed = 0;
function check(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    failed += 1;
  } else {
    console.log(`ok  — ${msg}`);
  }
}

const { PlayerSession } = await import(js("core.js"));
const { makePhoneCall, PHONE_CALLS } = await import(js("room-amenities.js"));
const { ensureHotel } = await import(js("hotel.js"));
const { MACHINES } = await import(js("slots.js"));
const { SLOT_CATEGORIES, getMachineUI } = await import(js("slots-ui.js"));
const {
  STRIP_DESTINATIONS,
  ensureStripTravel,
  unlockLimoService,
  travelByLimo,
  filterMachinesForDestination,
  getCurrentDestination,
  isAwayFromHome,
  isLimoUnlocked,
  HOME_DESTINATION_ID,
} = await import(js("strip-destinations.js"));

const css = readFileSync(join(root, "docs", "css", "strip-destinations.css"), "utf8");
check(css.includes("dest-luxor"), "luxor theme CSS present");
check(css.includes("table-theme-bellagio"), "bellagio table theme present");
check(css.includes("slot-theme-fremont"), "circa fremont slot theme present");
check(css.includes("strip-limo-panel"), "limo panel CSS present");

check(Boolean(PHONE_CALLS.limo_service), "limo_service phone call catalogued");

{
  const session = new PlayerSession({ playerName: "Limo Tester", chips: 5000 });
  session.rpg = { flags: {} };
  ensureHotel(session).reachedRoom = true;
  ensureStripTravel(session);
  check(!isLimoUnlocked(session), "limo locked before call");
  const call = makePhoneCall(session, "limo_service");
  check(call.ok && call.openLimoDispatch, "limo call opens dispatch");
  check(isLimoUnlocked(session), "limo unlocked after call");
}

{
  const session = new PlayerSession({ playerName: "Traveler", chips: 5000 });
  session.rpg = { flags: {} };
  ensureHotel(session).reachedRoom = true;
  unlockLimoService(session);
  const before = session.wallet.balance;
  const trip = travelByLimo(session, "luxor");
  check(trip.ok, "travel to Luxor ok");
  check(session.wallet.balance === before - STRIP_DESTINATIONS.luxor.fare, "Luxor fare debited");
  check(getCurrentDestination(session).id === "luxor", "current dest Luxor");
  check(isAwayFromHome(session), "away from home");
  const luxorSlots = filterMachinesForDestination(session, MACHINES).filter((m) => m.destinationId === "luxor");
  check(luxorSlots.length === 2, "two Luxor exclusive slots visible");
  const homeOnlyHidden = filterMachinesForDestination(session, MACHINES).some((m) => m.destinationId === "bellagio");
  check(!homeOnlyHidden, "Bellagio exclusives hidden at Luxor");
  const home = travelByLimo(session, HOME_DESTINATION_ID);
  check(home.ok && home.fare === 0, "return home complimentary");
  check(!isAwayFromHome(session), "back home");
}

{
  const session = new PlayerSession({ chips: 50 });
  unlockLimoService(session);
  const poor = travelByLimo(session, "bellagio");
  check(!poor.ok, "insufficient chips blocks Bellagio");
}

{
  const ids = ["luxor_obelisk", "sphinx_spin", "castle_jackpot", "joust_reels",
    "fountain_fortune", "conservatory_spin", "neon_stadium", "fremont_flash"];
  for (const id of ids) {
    const m = MACHINES.find((x) => x.id === id);
    check(Boolean(m), `machine ${id} exists`);
    check(getMachineUI(m).category === "Strip Exclusive", `${id} Strip Exclusive category`);
  }
  check(SLOT_CATEGORIES.some((c) => c.id === "Strip Exclusive"), "Strip Exclusive category registered");
  check(Object.keys(STRIP_DESTINATIONS).length === 5, "5 destinations incl home");
}

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nAll strip-limo smoke checks passed.");
