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
  // Regression: strip-limo-ui must not pull menuBtn from ctx (web terminal never provides it).
  const source = readFileSync(js("strip-limo-ui.js"), "utf8");
  check(
    source.includes("function menuBtn(") && !/const\s*\{[^}]*menuBtn[^}]*\}\s*=\s*ctx/.test(source),
    "strip-limo-ui defines local menuBtn (not destructured from ctx)",
  );
  const appJs = readFileSync(js("app.js"), "utf8");
  check(appJs.includes("...stripLimoRenderers"), "app.js mounts stripLimoRenderers into RENDERERS");

  // Minimal DOM so createShell/el can build the dispatch view in Node.
  if (typeof globalThis.document === "undefined") {
    globalThis.document = {
      documentElement: { style: { setProperty() {} }, dataset: {}, classList: { remove() {}, add() {}, [Symbol.iterator]: function* () {} } },
      body: { classList: { toggle() {} } },
      createElement: (tag) => {
        const kids = [];
        const attrs = {};
        return {
          tagName: String(tag).toUpperCase(),
          className: "",
          children: kids,
          style: {},
          dataset: {},
          setAttribute(k, v) { attrs[k] = v; },
          appendChild(c) { kids.push(c); return c; },
          replaceChildren(...nodes) { kids.length = 0; kids.push(...nodes); },
          addEventListener() {},
          textContent: "",
          innerHTML: "",
          get disabled() { return Boolean(attrs.disabled); },
          set disabled(v) { attrs.disabled = v; },
        };
      },
      createTextNode: (t) => ({ textContent: String(t) }),
    };
    globalThis.window = {
      addEventListener() {},
      matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }),
    };
  }

  const { buildStripLimoRenderers } = await import(js("strip-limo-ui.js"));
  const { createShell, createViewStack } = await import(js("ui/shell.js"));
  const session = new PlayerSession({ playerName: "Limo UI", chips: 5000 });
  session.rpg = { flags: {} };
  ensureHotel(session).reachedRoom = true;
  unlockLimoService(session);
  const views = createViewStack({ persist: () => {}, render: () => {} });
  const ctx = {
    get session() { return session; },
    persist: () => {},
    render: () => {},
    pushView: views.pushView,
    navigateTo: views.navigateTo,
    goBack: views.goBack,
    viewStack: views.stack,
  };
  Object.assign(ctx, createShell(ctx));
  // Intentionally omit menuBtn from ctx — web terminal does the same.
  check(typeof ctx.menuBtn !== "function", "web-terminal-like ctx has no menuBtn");
  const renderers = buildStripLimoRenderers(ctx);
  check(typeof renderers["strip-limo"] === "function", "strip-limo renderer registered");
  let rendered = null;
  try {
    rendered = renderers["strip-limo"]();
  } catch (err) {
    console.error(err);
  }
  check(Boolean(rendered), "strip-limo renders without throwing when menuBtn missing from ctx");
}

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
