#!/usr/bin/env node
/** Smoke tests for leave-without-settle refund helpers (web terminal parity with CLI). */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
const { refundSlips, refundSportsbookOpen } = await import(js("pendingRefunds.js"));

const session = new PlayerSession();
session.wallet.debit(100, "sportsbook", "test");
session.wallet.debit(50, "horse_racing", "test");
check(session.wallet.balance === 850, "debits applied");

const sportsbook = {
  pending: [{ amount: 100 }],
  predictions: { positions: [{ amount: 25 }] },
};
const total = refundSportsbookOpen(session, sportsbook);
check(total === 125, "sportsbook refunds pending + predictions");
check(sportsbook.pending.length === 0, "pending cleared");
check(session.wallet.balance === 975, "wallet credited");

const racing = refundSlips(session, "horse_racing", [{ amount: 50 }], "test");
check(racing === 50, "racing slip refund");
check(session.wallet.balance === 1025, "wallet restored");

console.log(failed ? `\n${failed} failed` : "\nAll pending-refund smoke checks passed.");
process.exit(failed ? 1 : 0);
