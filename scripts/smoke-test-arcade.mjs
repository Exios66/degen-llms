#!/usr/bin/env node
/**
 * Smoke tests for Arcade Alley — catalog, tickets, redeem caps, save round-trip,
 * and redeem flag wiring into Rewards / slots.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const js = (...p) => join(root, "docs", "js", ...p);

let failed = 0;
function check(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    failed += 1;
  } else {
    console.log(`ok  — ${msg}`);
  }
}

const {
  ARCADE_GAMES, REDEEM_OFFERS, ticketsFromScore, payoutFromMult, getArcadeGame,
} = await import(js("arcade/catalog.js"));
const {
  ArcadeState, ensureArcade, persistArcade, applyArcadeRedeemFlag,
  hasArcadeSlotVoucher, consumeArcadeSlotVoucher,
} = await import(js("arcade/state.js"));
const { PlayerSession } = await import(js("core.js"));
const { createStripCross } = await import(js("arcade/games/stripCross.js"));
const { createNeonInvaders } = await import(js("arcade/games/neonInvaders.js"));
const { createHighRollerBreakout } = await import(js("arcade/games/highRollerBreakout.js"));
const { createShowgirlBeat } = await import(js("arcade/games/showgirlBeat.js"));
const { ArcadeCabinetOverlay } = await import(js("arcade/ArcadeCabinetOverlay.js"));

check(ARCADE_GAMES.length === 4, "four starter cabinets");
check(ARCADE_GAMES.every((g) => g.cost >= 5 && g.cost <= 25), "play costs in 5–25 range");
check(
  ["strip_cross", "neon_invaders", "high_roller_breakout", "showgirl_beat"].every((id) => getArcadeGame(id)),
  "catalog ids match plan cabinets",
);
check(typeof createStripCross === "function", "Strip Cross factory");
check(typeof createNeonInvaders === "function", "Neon Invaders factory");
check(typeof createHighRollerBreakout === "function", "High-Roller Breakout factory");
check(typeof createShowgirlBeat === "function", "Showgirl Beat factory");
check(typeof ArcadeCabinetOverlay === "function", "ArcadeCabinetOverlay class");

check(ticketsFromScore(250) === 2, "ticketsFromScore base");
check(ticketsFromScore(250, { cleared: true }) === 4, "ticketsFromScore clear bonus");
check(payoutFromMult(10, 2.5) === 25, "payoutFromMult mid");
check(payoutFromMult(10, 9) === 30, "payoutFromMult capped at 3×");

const state = new ArcadeState();
state.recordPlay("strip_cross", 350, ticketsFromScore(350, { cleared: true }));
check(state.tickets === 5, "recordPlay awards tickets (3+2)");
check(state.highScores.strip_cross === 350, "high score stored");
check(state.lifetimePlays === 1, "lifetime plays bumped");

state.tickets = 30;
const chip = state.redeem("chips_50");
check(chip.ok && chip.chips === 50, "chip pack redeem");
check(state.tickets === 22, "tickets deducted for chip pack");

const session = new PlayerSession({ playerName: "Arcade Smoke" });
session.rpg = { flags: {} };
session.rewards = {
  unlockedComps: ["welcome_drink"],
  redeemedComps: ["welcome_drink"],
  notifications: [],
};
session.rpg.flags.redeemed_welcome_drink = true;

const drink = state.redeem("welcome_refill", session);
check(drink.ok, "welcome drink refill redeem ok");
check(session.rpg.flags.arcade_drink_refill === true, "drink refill sets rpg flag");
check(session.rpg.flags.has_welcome_drink_comp === true, "welcome drink re-unlocked");
check(!session.rewards.redeemedComps.includes("welcome_drink"), "welcome_drink removed from redeemed");

const voucher = state.redeem("slot_voucher", session);
check(voucher.ok, "slot voucher redeem ok");
check(hasArcadeSlotVoucher(session), "slot voucher available");
check(consumeArcadeSlotVoucher(session) === true, "consume slot voucher once");
check(!hasArcadeSlotVoucher(session), "voucher gone after consume");
check(state.flags.arcade_slot_voucher === true, "shop still marks voucher owned");
check(state.redeem("slot_voucher", session).ok === false, "cannot re-buy owned voucher");

const roundTrip = ArcadeState.fromJSON(state.toJSON());
check(roundTrip.tickets === state.tickets, "toJSON/fromJSON tickets");
check(roundTrip.highScores.strip_cross === 350, "toJSON/fromJSON high scores");

persistArcade(session, roundTrip);
const ensured = ensureArcade(session);
check(ensured.lifetimePlays === 1, "ensureArcade round-trip via session.arcadeData");

const payload = session.toJSON();
check(payload.arcade && payload.arcade.tickets === ensured.tickets, "PlayerSession save includes arcade");
const restored = PlayerSession.fromJSON(payload);
check(restored.arcadeData?.highScores?.strip_cross === 350, "PlayerSession restore arcadeData");

const css = readFileSync(join(root, "docs", "css", "casino.css"), "utf8");
check(css.includes(".arcade-overlay"), "arcade overlay CSS present");
check(css.includes("arcade-overlay__scanlines"), "CRT scanlines CSS present");
const html = readFileSync(join(root, "docs", "index.html"), "utf8");
check(html.includes('id="arcade-overlay"'), "#arcade-overlay mount in index.html");

const core = readFileSync(js("core.js"), "utf8");
check(core.includes('floor: "Arcade Alley"'), "ACTIVITIES.arcade floor registered");
check(core.includes('"Arcade Alley"'), "FLOOR_ORDER includes Arcade Alley");

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nAll arcade smoke checks passed.");
