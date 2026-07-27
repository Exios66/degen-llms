#!/usr/bin/env node
/**
 * Smoke tests for Strip limo / rideshare destination travel (web terminal).
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
const { RewardsTracker } = await import(js("rewards.js"));
const { MACHINES } = await import(js("slots.js"));
const { SLOT_CATEGORIES, getMachineUI } = await import(js("slots-ui.js"));
const { CALL_TREES } = await import(js("phone-call-trees.js"));
const {
  startRideshareCall,
  listUnlockedContacts,
  getContactDef,
} = await import(js("phone-contacts.js"));
const {
  STRIP_DESTINATIONS,
  ensureStripTravel,
  unlockLimoService,
  unlockRideshareService,
  travelByLimo,
  filterMachinesForDestination,
  getCurrentDestination,
  getActivityBranding,
  isAwayFromHome,
  isLimoUnlocked,
  HOME_DESTINATION_ID,
} = await import(js("strip-destinations.js"));

const css = readFileSync(join(root, "docs", "css", "strip-destinations.css"), "utf8");
check(css.includes("dest-luxor"), "luxor theme CSS present");
check(css.includes("table-theme-bellagio"), "bellagio table theme present");
check(css.includes("slot-theme-fremont"), "circa fremont slot theme present");
check(css.includes("slot-theme-scarab"), "luxor scarab slot theme present");
check(css.includes("slot-theme-grail"), "excalibur grail slot theme present");
check(css.includes("slot-theme-downtown-drop"), "circa downtown-drop theme present");
check(css.includes("strip-limo-panel"), "limo panel CSS present");

check(Boolean(PHONE_CALLS.limo_service), "limo_service phone call catalogued");
check(Boolean(CALL_TREES.rideshare_driver?.voice?.hello), "rideshare call tree present");

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
  const session = new PlayerSession({ playerName: "Rideshare Tester", chips: 5000 });
  session.rpg = { flags: {} };
  new RewardsTracker(session).ensureRewards();
  ensureStripTravel(session);
  check(!isLimoUnlocked(session), "dispatch locked before rideshare");
  const contact = getContactDef(session, "rideshare_driver");
  check(Boolean(contact), "rideshare_driver contact exists");
  const unlocked = listUnlockedContacts(session).some((c) => c.id === "rideshare_driver");
  check(unlocked, "rideshare contact always unlockable");
  const dial = startRideshareCall(session);
  check(dial.ok && dial.contactId === "rideshare_driver", "startRideshareCall ok");
  check(isLimoUnlocked(session), "dispatch unlocked via rideshare dial");
  check(session.stripTravel.rideshareUnlocked, "rideshareUnlocked flag set");
  check(!session.stripTravel.limoUnlocked, "limoUnlocked stays false on rideshare-only path");
  const trip = travelByLimo(session, "circa", { mode: "rideshare" });
  check(trip.ok && trip.mode === "rideshare", "rideshare travel to Circa");
  check(session.stripTravel.lastRideMode === "rideshare", "lastRideMode rideshare");
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
  check(luxorSlots.length === 5, "five Luxor exclusive slots visible");
  const homeOnlyHidden = filterMachinesForDestination(session, MACHINES).some((m) => m.destinationId === "bellagio");
  check(!homeOnlyHidden, "Bellagio exclusives hidden at Luxor");
  const fortuneVisible = filterMachinesForDestination(session, MACHINES).some((m) => m.id === "fortune");
  check(!fortuneVisible, "homeOnly fortune hidden away from Mandalay");
  const brand = getActivityBranding(session, "blackjack", "Blackjack");
  check(brand.name === "Sphinx Blackjack", "Luxor blackjack branding");
  const home = travelByLimo(session, HOME_DESTINATION_ID);
  check(home.ok && home.fare === 0, "return home complimentary");
  check(!isAwayFromHome(session), "back home");
  const fortuneHome = filterMachinesForDestination(session, MACHINES).some((m) => m.id === "fortune");
  check(fortuneHome, "homeOnly fortune visible at Mandalay");
}

{
  const session = new PlayerSession({ chips: 50 });
  unlockLimoService(session);
  const poor = travelByLimo(session, "bellagio");
  check(!poor.ok, "insufficient chips blocks Bellagio");
}

{
  const awayIds = ["luxor", "excalibur", "bellagio", "circa"];
  const progressives = {
    luxor: "luxor_ra",
    excalibur: "excalibur_grail",
    bellagio: "bellagio_fontana",
    circa: "circa_downtown",
  };
  for (const destId of awayIds) {
    const dest = STRIP_DESTINATIONS[destId];
    check(dest.exclusiveSlotIds.length === 5, `${destId} has 5 exclusives`);
    check(Boolean(dest.activityBranding?.slots?.name), `${destId} slots activity branding`);
    for (const id of dest.exclusiveSlotIds) {
      const m = MACHINES.find((x) => x.id === id);
      check(Boolean(m), `machine ${id} exists`);
      check(m.destinationOnly === true, `${id} destinationOnly`);
      check(m.destinationId === destId, `${id} destinationId ${destId}`);
      check(getMachineUI(m).category === "Strip Exclusive", `${id} Strip Exclusive category`);
    }
    const progressive = MACHINES.find(
      (m) => m.destinationId === destId && m.progressive && m.progressivePoolId === progressives[destId],
    );
    check(Boolean(progressive), `${destId} progressive pool ${progressives[destId]}`);
  }
  check(SLOT_CATEGORIES.some((c) => c.id === "Strip Exclusive"), "Strip Exclusive category registered");
  check(Object.keys(STRIP_DESTINATIONS).length === 5, "5 destinations incl home");
  const fortune = MACHINES.find((m) => m.id === "fortune");
  check(fortune?.homeOnly === true, "fortune marked homeOnly");
}

{
  const session = new PlayerSession({ chips: 5000 });
  unlockRideshareService(session);
  check(isLimoUnlocked(session), "unlockRideshareService enables dispatch");
}

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nAll strip-limo smoke checks passed.");
