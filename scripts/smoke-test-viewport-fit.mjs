#!/usr/bin/env node
/**
 * Smoke checks for shared responsive viewport CSS contracts.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const css = (...parts) => join(root, "docs", "css", ...parts);

let failed = 0;
function check(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    failed += 1;
  } else {
    console.log(`ok  — ${msg}`);
  }
}

const casino = readFileSync(css("casino.css"), "utf8");
const dining = readFileSync(css("dining-overlay.css"), "utf8");
const bar = readFileSync(css("bar-overlay.css"), "utf8");
const pool = readFileSync(css("pool-overlay.css"), "utf8");
const balcony = readFileSync(css("balcony-smoke-overlay.css"), "utf8");
const phone = readFileSync(css("rewards-phone.css"), "utf8");
const strip = readFileSync(css("strip-destinations.css"), "utf8");
const indexHtml = readFileSync(join(root, "docs", "index.html"), "utf8");

check(casino.includes("--app-vh"), "casino.css defines --app-vh");
check(casino.includes("--overlay-max-h"), "casino.css defines --overlay-max-h");
check(casino.includes("--safe-top"), "casino.css defines safe-area tokens");
check(casino.includes("@supports (height: 100dvh)"), "casino.css has 100dvh @supports fallback");
check(casino.includes("min-height: var(--app-vh)"), "html/body use --app-vh");
check(casino.includes("var(--app-fab-clearance)"), "#app clears Rewards FAB");
check(casino.includes("@media (max-height: 700px)"), "short-height 700px MQ present");
check(casino.includes("@media (max-height: 500px)"), "short-height 500px MQ present");
check(casino.includes("max-height: var(--overlay-max-h)"), "arcade cabinet uses overlay max-height");
check(casino.includes(".machine-screen") && casino.includes("overflow-y: auto"), "machine-screen scrolls");

check(indexHtml.includes("viewport-fit=cover"), "index.html viewport-fit=cover");

check(dining.includes("var(--overlay-max-h"), "dining shell uses --overlay-max-h");
check(!dining.includes("min-height: min(92vh, 820px)"), "dining FPV no longer forces 92vh min-height");
check(dining.includes("overflow-y: auto"), "dining panel/backdrop can scroll");

check(bar.includes("var(--overlay-max-h"), "bar shell uses --overlay-max-h");
check(!bar.includes("min-height: 420px"), "bar stage no longer hard-floors at 420px");
check(!bar.includes("min-height: min(720px, 92vh)"), "bar FPV no longer forces 720/92vh min-height");
check(bar.includes("overflow-y: auto"), "bar panel/backdrop can scroll");

check(pool.includes("var(--overlay-max-h"), "pool shell uses --overlay-max-h");
check(pool.includes("overflow-y: auto"), "pool body/backdrop scrolls");

check(balcony.includes("overflow-y: auto"), "balcony HUD scrolls");
check(balcony.includes("@media (max-height: 500px)"), "balcony short-height MQ present");

check(phone.includes("max-height: calc(var(--app-vh"), "rewards shell capped to viewport");
check(phone.includes("max-height: min(280px, calc(var(--app-vh"), "rewards LCD capped to viewport");
check(phone.includes("@media (max-height: 500px)"), "rewards short-height MQ present");

check(strip.includes(".strip-dest-list"), "strip dest list scroll container present");
check(strip.includes("max-height: min(50vh, 28rem)"), "strip dest list has max-height");

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nAll viewport-fit smoke checks passed.");
