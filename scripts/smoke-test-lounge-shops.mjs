/**
 * Smoke checks: Gentleman's Club gate + Shoppes catalog / purchase wiring.
 * Catches the stale-session bug where UI factories closed over boot PlayerSession
 * while enterCasino reassigned ctx.session to the live save.
 *
 * Run: node scripts/smoke-test-lounge-shops.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const js = (rel) => pathToFileURL(path.join(root, "docs/js", rel)).href;
const read = (rel) => readFileSync(path.join(root, rel), "utf8");

let failed = 0;
function check(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed += 1;
  } else {
    console.log("ok:", msg);
  }
}

const { PlayerSession } = await import(js("core.js"));
const { ensureHotel } = await import(js("hotel.js"));
const { makePhoneCall, PHONE_CALLS } = await import(js("room-amenities.js"));
const { canEnterGentlemansClub } = await import(js("gentlemans-club.js"));
const { buildGentlemansClubRenderers } = await import(js("ui/gentlemans-club-renderers.js"));
const {
  ALL_SHOP_STORES,
  FLAGSHIP_DESIGNER_STORES,
  MANDALAY_PLACE_STORES,
  purchaseShopItem,
  ensureAmenities,
} = await import(js("casino-amenities.js"));
const { buildAmenitiesRenderers } = await import(js("casino-amenities-ui.js"));

// ── Static: live session() helpers (no destructured session snapshot) ───────
const clubUiSrc = read("docs/js/ui/gentlemans-club-renderers.js");
check(clubUiSrc.includes("function session()"), "club UI reads ctx.session via session()");
check(!/const\s*\{\s*[^}]*\bsession\b[^}]*\}\s*=\s*ctx/.test(clubUiSrc),
  "club UI does not destructure session from ctx");

const amenitiesUiSrc = read("docs/js/casino-amenities-ui.js");
check(amenitiesUiSrc.includes("function session()"), "amenities UI reads ctx.session via session()");
check(!/const\s*\{\s*[^}]*\bsession\b[^}]*\}\s*=\s*ctx/.test(amenitiesUiSrc),
  "amenities UI does not destructure session from ctx");
check(amenitiesUiSrc.includes("purchaseShopItem(session()"), "shop purchase uses live session()");

const hotelUiSrc = read("docs/js/hotel-ui.js");
check(hotelUiSrc.includes("function session()"), "hotel UI reads ctx.session via session()");
check(hotelUiSrc.includes('pushView("gentlemans-club")'), "hotel phone can open Velvet Ledger");
check(hotelUiSrc.includes("Enter Gentleman's Club"), "hotel phone offers Enter Gentleman's Club after call");

const phoneCall = PHONE_CALLS.gentlemans_club;
check(Boolean(phoneCall), "gentlemans_club phone call defined");
check(phoneCall.minTierIndex == null, "club phone call is not Gold-gated");

// ── Catalog expansion ───────────────────────────────────────────────────────
const allItems = ALL_SHOP_STORES.flatMap((s) => s.items);
check(FLAGSHIP_DESIGNER_STORES.length >= 6, `flagship stores expanded (${FLAGSHIP_DESIGNER_STORES.length})`);
check(MANDALAY_PLACE_STORES.length >= 10, `Mandalay Place stores expanded (${MANDALAY_PLACE_STORES.length})`);
check(ALL_SHOP_STORES.length === 16, `16 total stores (${ALL_SHOP_STORES.length})`);
check(allItems.length === 81, `81 SKUs (${allItems.length})`);
for (const id of ["rolex_boutique", "tiffany_co", "nike_mandalay", "house_of_blues_store", "surf_city", "mandalay_souvenirs"]) {
  check(ALL_SHOP_STORES.some((s) => s.id === id), `store present: ${id}`);
}
const ids = allItems.map((i) => i.id);
check(new Set(ids).size === ids.length, "shop item ids are unique");

// ── Club gate: suite / phone / live ctx after reassignment ───────────────────
{
  const sapphire = new PlayerSession({ chips: 1000 });
  ensureHotel(sapphire);
  sapphire.hotel.checkedIn = true;
  sapphire.hotel.roomType = "deluxe";
  sapphire.hotel.reachedRoom = true;
  check(!canEnterGentlemansClub(sapphire).ok, "deluxe Sapphire cannot enter club without call");

  const call = makePhoneCall(sapphire, "gentlemans_club");
  check(call.ok && call.openGentlemansClub, "room phone opens Velvet Ledger");
  check(canEnterGentlemansClub(sapphire).ok, "phone call unlocks club rope");
}

{
  const ctx = {
    session: new PlayerSession({ chips: 1000 }),
    pushView() {},
    goBack() {},
    navigateTo() {},
    persist() {},
    render() {},
    el(tag, props = {}, kids = []) {
      return { tag, props, kids };
    },
    banner: (t) => ({ tag: "banner", t }),
    chipLine: () => ({ tag: "chipLine", bal: ctx.session.wallet.balance }),
    statusBanner: () => null,
    showStatus() {},
  };
  const renderers = buildGentlemansClubRenderers(ctx);
  const live = new PlayerSession({ chips: 50_000 });
  ensureHotel(live);
  live.hotel.checkedIn = true;
  live.hotel.roomType = "suite";
  live.hotel.reachedRoom = true;
  ctx.session = live;

  check(canEnterGentlemansClub(ctx.session).ok, "suite key opens rope on live session");
  const hub = renderers["gentlemans-club"]();
  const text = JSON.stringify(hub);
  check(text.includes("Make it rain"), "club hub renders after session reassignment");
  check(!text.includes("wants Gold+"), "stale blank session does not block club hub");
}

// ── Shop purchase: catalog + live session debit ─────────────────────────────
{
  const blank = new PlayerSession({ chips: 1000 });
  const ctx = {
    session: blank,
    pushView() {},
    goBack() {},
    navigateTo() {},
    persist() {},
    render() {},
    el(tag, props = {}, kids = []) {
      return { tag, props, kids };
    },
    banner: (t) => ({ tag: "banner", t }),
    chipLine: () => ({ tag: "chipLine", bal: ctx.session.wallet.balance }),
    statusBanner: () => null,
    showStatus() {},
  };
  // Ensure factory builds without throwing / capturing blank session for purchases.
  buildAmenitiesRenderers(ctx);

  const buyer = new PlayerSession({ chips: 500 });
  ctx.session = buyer;
  const before = buyer.wallet.balance;
  const r = purchaseShopItem(ctx.session, "nike_dri_fit");
  check(r.ok, `purchase nike_dri_fit: ${r.message}`);
  check(buyer.wallet.balance === before - 45, `debited live wallet (${buyer.wallet.balance})`);
  check(ensureAmenities(buyer).purchasedItems.includes("nike_dri_fit"), "item in shopping bag");

  const luxury = purchaseShopItem(buyer, "rolex_cap");
  check(luxury.ok, "purchase new Rolex boutique SKU");
  const again = purchaseShopItem(buyer, "nike_dri_fit");
  check(!again.ok, "duplicate purchase rejected");
  const broke = purchaseShopItem(buyer, "gucci_dionysus");
  check(!broke.ok, "insufficient funds rejected");
}

if (failed) {
  console.error(`\n${failed} smoke check(s) failed`);
  process.exit(1);
}
console.log("\nlounge + shops smoke tests passed");
