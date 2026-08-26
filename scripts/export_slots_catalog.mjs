#!/usr/bin/env node
/** Export slot machine catalog from docs/js/slots.js for Python parity sync. */
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const mod = await import(pathToFileURL(join(root, "docs/js/slots.js")).href);
const out = mod.MACHINES.map((m) => ({
  id: m.id,
  name: m.name,
  minBet: m.minBet,
  maxBet: m.maxBet,
  symbols: m.symbols,
  paytable: m.paytable,
  tagline: m.tagline ?? "",
  cherryRules: Boolean(m.cherryRules),
  progressive: Boolean(m.progressive),
  progressivePoolId: m.progressivePoolId ?? null,
  jackpotRequiresMaxBet: Boolean(m.jackpotRequiresMaxBet),
  progressiveContributionRate: m.progressiveContributionRate ?? 0,
  progressiveSeed: m.progressiveSeed ?? 0,
  jackpotKey: m.jackpotKey ?? null,
  salonOnly: Boolean(m.salonOnly),
  destinationOnly: Boolean(m.destinationOnly),
  destinationId: m.destinationId ?? null,
  homeOnly: Boolean(m.homeOnly),
}));
writeFileSync(join(root, "mandalay_bay/data/slots_catalog.json"), JSON.stringify(out, null, 2));
console.log(`Exported ${out.length} machines`);
