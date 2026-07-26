/**
 * Carmen front-desk check-in + hallway access smoke test.
 * Run: node scripts/smoke-test-carmen-desk.mjs
 */
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const js = (rel) => pathToFileURL(path.join(root, "docs/js", rel)).href;

const { PlayerSession } = await import(js("core.js"));
const {
  ensureHotel,
  findReservationAtDesk,
  useRoomKeyToDoor,
  canAccessHotelRoom,
  hallwayChoice,
} = await import(js("hotel.js"));
const {
  ensureWorldCycle,
  getReservationRequirement,
  RESERVATION_REQUIREMENTS,
  MS_PER_GAME_DAY,
  syncWorldCycle,
} = await import(js("world-cycle.js"));

let failed = 0;
function check(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed += 1;
  } else {
    console.log("ok:", msg);
  }
}

function sessionOnDay(dayIndex) {
  const session = new PlayerSession({ chips: 5000 });
  const hotel = ensureHotel(session);
  const wc = ensureWorldCycle(session);
  wc.clockAnchorMs = Date.now() - (MS_PER_GAME_DAY * dayIndex) - 500;
  wc.processedDay = 0;
  syncWorldCycle(session);
  return { session, hotel, wc };
}

for (let day = 0; day < RESERVATION_REQUIREMENTS.length; day += 1) {
  const req = RESERVATION_REQUIREMENTS[day];
  if (req.needsNetPositive) continue; // whale day needs floor wins
  const { session, hotel } = sessionOnDay(day);
  const actual = getReservationRequirement(session);
  check(actual.id === req.id, `day ${day} requirement ${req.id}`);
  const r = findReservationAtDesk(session);
  check(r.ok, `day ${day} desk locate ok (${req.id})`);
  check(canAccessHotelRoom(session), `day ${day} can access hotel`);
  check(hotel.roomKeyActive, `day ${day} key active`);
  check(!hotel.reachedRoom, `day ${day} hallway not skipped`);
  check(Boolean(r.message && r.message.length > 8), `day ${day} carmen message present`);
}

{
  const { session, hotel } = sessionOnDay(0);
  findReservationAtDesk(session);
  const skip = useRoomKeyToDoor(session);
  check(skip.ok && hotel.reachedRoom, "skip hallway reaches door");
}

{
  const { session, hotel } = sessionOnDay(0);
  findReservationAtDesk(session);
  // Correct south-wing path indices for default south room
  const path = [1, 0, 0];
  for (const idx of path) {
    const step = hallwayChoice(session, idx);
    check(step.success, `hallway step ${idx} success`);
  }
  check(hotel.reachedRoom, "hallway reaches room");
}

if (failed) {
  console.error(`\n${failed} smoke check(s) failed`);
  process.exit(1);
}
console.log("\nAll Carmen desk smoke checks passed.");
