/**
 * Validate docs/js ES module graph for the web terminal.
 * Run: node scripts/validate-docs-imports.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const docsJs = path.join(root, "docs/js");

let failed = 0;
function fail(msg) {
  console.error("FAIL:", msg);
  failed += 1;
}
function ok(msg) {
  console.log("ok:", msg);
}

/** @param {string} dir */
function walkJs(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkJs(full));
    else if (ent.name.endsWith(".js")) out.push(full);
  }
  return out;
}

// 1) Forbid inline ?v= on JS import specifiers (causes duplicate module instances).
const inlineVersionImport = /from\s+['"][^'"]+\.js\?v=/;
for (const file of walkJs(docsJs)) {
  const text = fs.readFileSync(file, "utf8");
  if (inlineVersionImport.test(text)) {
    fail(`inline ?v= import in ${path.relative(root, file)}`);
  }
}
if (!failed) ok("no inline ?v= imports in docs/js");

// 2) esbuild bundle — catches missing exports/paths across full graph.
const bundleOut = path.join(root, ".tmp-validate-app-bundle.js");
try {
  fs.mkdirSync(path.dirname(bundleOut), { recursive: true });
  execFileSync(
    "npx",
    [
      "--yes", "esbuild@0.25.0",
      path.join(docsJs, "app.js"),
      "--bundle",
      "--platform=browser",
      "--format=esm",
      `--outfile=${bundleOut}`,
      "--log-level=warning",
    ],
    { cwd: root, stdio: "pipe", encoding: "utf8" },
  );
  ok("esbuild bundle of docs/js/app.js succeeded");
} catch (err) {
  const detail = err.stdout || err.stderr || err.message || String(err);
  fail(`esbuild bundle failed:\n${detail}`);
} finally {
  try { fs.unlinkSync(bundleOut); } catch { /* ignore */ }
}

// 3) Dynamic import key modules under Node (export surface smoke).
const jsUrl = (rel) => pathToFileURL(path.join(docsJs, rel)).href;

const importChecks = [
  ["core.js", async () => {
    const mod = await import(jsUrl("core.js"));
    if (!mod.PlayerSession) throw new Error("missing PlayerSession");
  }],
  ["venues.js", async () => {
    const mod = await import(jsUrl("venues.js"));
    if (typeof mod.canEnterFoundationRoom !== "function") throw new Error("missing canEnterFoundationRoom");
    if (typeof mod.canEnterHighLimitSalon !== "function") throw new Error("missing canEnterHighLimitSalon");
    if (typeof mod.canEnterGentlemansClub !== "function") throw new Error("missing canEnterGentlemansClub");
  }],
  ["gentlemans-club.js", async () => {
    const mod = await import(jsUrl("gentlemans-club.js"));
    if (typeof mod.canEnterGentlemansClub !== "function") throw new Error("missing canEnterGentlemansClub");
  }],
  ["bar.js", async () => {
    const mod = await import(jsUrl("bar.js"));
    if (!mod.BAR_VENUES?.length) throw new Error("missing BAR_VENUES");
  }],
  ["PoolComplexOverlay.js", async () => {
    const mod = await import(jsUrl("PoolComplexOverlay.js"));
    if (typeof mod.PoolComplexOverlay !== "function") throw new Error("missing PoolComplexOverlay class");
  }],
  ["ui/gentlemans-club-renderers.js", async () => {
    const mod = await import(jsUrl("ui/gentlemans-club-renderers.js"));
    if (typeof mod.buildGentlemansClubRenderers !== "function") throw new Error("missing buildGentlemansClubRenderers");
  }],
  ["ui/venue-renderers.js", async () => {
    const mod = await import(jsUrl("ui/venue-renderers.js"));
    if (typeof mod.buildVenueRenderers !== "function") throw new Error("missing buildVenueRenderers");
  }],
];

for (const [label, fn] of importChecks) {
  try {
    await fn();
    ok(`dynamic import ${label}`);
  } catch (err) {
    fail(`dynamic import ${label}: ${err.message || err}`);
  }
}

if (failed) {
  console.error(`\n${failed} validation check(s) failed`);
  process.exit(1);
}
console.log("\nAll docs/js import validations passed.");
