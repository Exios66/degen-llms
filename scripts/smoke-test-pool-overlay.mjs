/**
 * Smoke checks for Pool Complex graphic overlay wiring on the web terminal.
 * Run: node scripts/smoke-test-pool-overlay.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const js = (rel) => pathToFileURL(path.join(root, "docs/js", rel)).href;
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const { PlayerSession } = await import(js("core.js"));
const {
  ensurePoolComplex,
  enterZone,
  playCatchWave,
  POOL_ZONES,
} = await import(js("pool-complex.js"));
const { PoolComplexOverlay } = await import(js("PoolComplexOverlay.js"));

let failed = 0;
function check(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed += 1;
  } else {
    console.log("ok:", msg);
  }
}

const indexHtml = read("docs/index.html");
check(indexHtml.includes('id="pool-overlay"'), "index.html mounts #pool-overlay");
check(indexHtml.includes("css/pool-overlay.css"), "index.html links pool-overlay.css");
check(indexHtml.includes("js/app.js"), "index.html boots app.js");

const appJs = read("docs/js/app.js");
check(appJs.includes("openPoolComplexVisual"), "app.js exports openPoolComplexVisual");
check(appJs.includes("ensurePoolOverlay"), "app.js exports ensurePoolOverlay");
check(appJs.includes("Pool Complex — Mandalay Beach"), "hub menu lists Pool Complex");
check(appJs.includes("POOL_LAUNCH_ZONES"), "deep-link zone map present");
check(appJs.includes("applyDeepView"), "launch params open pool overlay");

const hotelUi = read("docs/js/hotel-ui.js");
check(hotelUi.includes("openPoolComplexVisual") || hotelUi.includes("ensurePoolOverlay"),
  "hotel-ui opens graphic overlay");

const amenitiesUi = read("docs/js/casino-amenities-ui.js");
check(amenitiesUi.includes("Pool Complex — Mandalay Beach"), "amenities menu lists Pool Complex");
check(amenitiesUi.includes("openPoolComplexVisual") || amenitiesUi.includes("poolOverlay"),
  "amenities opens graphic overlay");

const poolUi = read("docs/js/pool-complex-ui.js");
check(poolUi.includes("ensurePoolOverlay") || poolUi.includes("openPoolComplexVisual"),
  "pool-complex-ui remounts overlay when needed");

const rpgHtml = read("docs/rpg/index.html");
check(rpgHtml.includes('id="pool-overlay"'), "RPG also mounts #pool-overlay");

const session = new PlayerSession({ chips: 5000 });
ensurePoolComplex(session);
check(Boolean(session.poolComplex), "pool complex state initialized");

const enter = enterZone(session, "wave_pool");
check(enter.ok, "enter wave pool zone");
check(session.poolComplex.visitedZones.includes("wave_pool"), "wave pool visited");

const wave = playCatchWave(session);
check(typeof wave.ok === "boolean" && typeof wave.message === "string", "catch-wave returns result");

check(Object.keys(POOL_ZONES).length >= 6, "all pool zones defined");
check(typeof PoolComplexOverlay === "function", "PoolComplexOverlay class exportable");

// Minimal DOM shim so PoolComplexOverlay.open/close can run under Node.
const bodyClass = new Set();
globalThis.document = {
  body: {
    classList: {
      add: (c) => bodyClass.add(c),
      remove: (c) => bodyClass.delete(c),
    },
  },
  createElement: (tag) => {
    const kids = [];
    const attrs = {};
    return {
      tagName: String(tag).toUpperCase(),
      children: kids,
      style: {},
      classList: { add() {}, remove() {}, toggle() {} },
      setAttribute(k, v) { attrs[k] = v; },
      getAttribute(k) { return attrs[k] ?? null; },
      appendChild(n) { kids.push(n); return n; },
      replaceChildren(...nodes) { kids.length = 0; kids.push(...nodes); },
      addEventListener() {},
      removeEventListener() {},
      focus() {},
      click() {},
      textContent: "",
      innerHTML: "",
      disabled: false,
    };
  },
  createTextNode: (t) => ({ textContent: String(t) }),
};
globalThis.window = {
  addEventListener() {},
  removeEventListener() {},
  setTimeout: (fn) => { fn(); return 0; },
  clearTimeout() {},
  matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }),
};

const rootEl = globalThis.document.createElement("div");
const overlay = new PoolComplexOverlay(rootEl, {});
overlay.setSession(session);
overlay.open("hub");
check(overlay.active === true && overlay.zoneId === "hub", "overlay opens hub");
check(bodyClass.has("pool-overlay-active"), "body gets pool-overlay-active");
overlay.openZone("wave_pool");
check(overlay.zoneId === "wave_pool", "overlay switches to wave pool");
overlay.close();
check(overlay.active === false, "overlay closes");
check(!bodyClass.has("pool-overlay-active"), "body clears pool-overlay-active");

if (failed) {
  console.error(`\n${failed} smoke check(s) failed`);
  process.exit(1);
}
console.log("\nAll pool overlay smoke checks passed.");
