/**
 * Smoke checks for hotel key/hallway split + High Limit Salon exclusives.
 * Run: node scripts/smoke-test-hotel-salon.mjs
 */
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const js = (rel) => pathToFileURL(path.join(root, "docs/js", rel)).href;

const { PlayerSession } = await import(js("core.js"));
const { ensureHotel, findReservation, hallwayChoice, useRoomKeyToDoor, upgradeRoom } = await import(js("hotel.js"));
const { grantRoomKeyIfReservationReady, canAccessHotelRoom } = await import(js("world-cycle.js"));
const { MACHINES } = await import(js("slots.js"));
const {
  SALON_TABLE_GAMES,
  SALON_SPORTS_SCENARIOS,
  isSalonOnlySlot,
  enterSalonContext,
  clearSalonContext,
  resolveActivityMin,
} = await import(js("salon-exclusives.js"));
const { boardFromScenarios } = await import(js("sportSimulator.js"));
const { SportsbookState } = await import(js("sportsbook.js"));
const { canEnterFoundationRoom, canEnterHighLimitSalon } = await import(js("venues.js"));
const { STAKE_TIERS } = await import(js("stakes.js"));
const { defaultRewardsState } = await import(js("rewards.js"));

let failed = 0;
function check(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed += 1;
  } else {
    console.log("ok:", msg);
  }
}

const session = new PlayerSession({ chips: 20000 });
const hotel = ensureHotel(session);
const locate = findReservation(session);
check(locate.ok, "locate reservation ok");
check(hotel.roomKeyActive === true, "key active after locate");
check(hotel.reachedRoom === false, "hallway not skipped after locate");
check(canAccessHotelRoom(session), "can access hotel after locate");

hallwayChoice(session, 0);
check(hotel.reachedRoom === false, "wrong turn does not finish hallway");

const skip = useRoomKeyToDoor(session);
check(skip.ok && hotel.reachedRoom, "use key reaches door");

session.wallet.credit(1000, "blackjack", "win");
const up = upgradeRoom(session, "suite");
check(up.ok, "suite upgrade ok");
check(hotel.roomType === "suite", "room type suite");
check(hotel.roomKeyActive === true && hotel.reachedRoom === false, "upgrade keeps key but resets door for new suite hallway");
grantRoomKeyIfReservationReady(session);
check(hotel.roomKeyActive && !hotel.reachedRoom, "key active for new suite hallway walk");

const salonSlots = MACHINES.filter((m) => isSalonOnlySlot(m) || m.salonOnly);
check(salonSlots.length >= 3, `salon slots present (${salonSlots.length})`);
check(SALON_TABLE_GAMES.length >= 4, "salon table games present");
check(SALON_SPORTS_SCENARIOS.scenarios.every((s) => s.salonOnly), "salon sports marked salonOnly");

const mainBoard = boardFromScenarios(SALON_SPORTS_SCENARIOS, 0, 6, { includeSalonOnly: false });
check(mainBoard.events.length === 0, "main floor filters salon sports");
const salonBoard = boardFromScenarios(SALON_SPORTS_SCENARIOS, 0, 6, { includeSalonOnly: true });
check(salonBoard.events.length === 6, "salon desk loads whale lines");

const sb = new SportsbookState();
sb.loadSalonBoard(SALON_SPORTS_SCENARIOS);
check(sb.salonDesk && sb.events.length > 0, "sportsbook loadSalonBoard");
sb.clearSalonDesk();
check(!sb.salonDesk && sb.events.length === 0, "sportsbook clearSalonDesk");

const runtime = { venue: null, stakeTier: null, salonActivityMin: null, slots: {}, sportsbook: sb };
enterSalonContext(runtime);
runtime.salonActivityMin = 500;
check(runtime.venue === "high_limit_salon", "enterSalonContext sets venue");
check(resolveActivityMin(runtime, 5) === 500, "resolveActivityMin prefers salon min");
check(canEnterHighLimitSalon(session, STAKE_TIERS.high_limit).ok, "high limit salon chip gate");
clearSalonContext(runtime);
check(runtime.venue == null && runtime.salonActivityMin == null, "clearSalonContext resets");

session.rewards = defaultRewardsState({ lifetimeWagered: 500_000 });
hotel.roomType = "suite";
const foundation = canEnterFoundationRoom(session);
check(foundation.ok, "suite + Noir path opens Foundation Room");

if (failed) {
  console.error(`\n${failed} smoke check(s) failed`);
  process.exit(1);
}
console.log("\nAll hotel/salon smoke checks passed.");
