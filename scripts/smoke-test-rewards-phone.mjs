#!/usr/bin/env node
/**
 * Smoke tests for MGM Rewards flip phone — desktop sizing CSS + Connect / comps
 * integrations with wallet, dining, intoxication, hotel, and call scripts.
 */
import { readFileSync } from "node:fs";
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

const css = readFileSync(join(root, "docs", "css", "rewards-phone.css"), "utf8");
check(css.includes("@media (min-width: 768px)"), "desktop media query present");
check(css.includes("body:not(.has-touch-pad) .rewards-phone-shell"), "desktop shell enlarge scoped off touch pad");
check(css.includes("width: 224px") || css.includes("width:224px"), "desktop shell width ~224px");
check(css.includes("min-height: 320px"), "desktop LCD min-height enlarged");
check(css.includes("rewards-home-actions"), "home shortcut styles present");
check(css.includes("@media (min-width: 1100px)"), "large-desktop media query present");

const {
  PlayerSession,
} = await import(js("core.js"));
const { RewardsTracker, COMP_CATALOG } = await import(js("rewards.js"));
const {
  startCall,
  resolveCallChoice,
  sendText,
  advanceDialogue,
  applyPhoneEffect,
  onIntoxicationChange,
  syncContactIntros,
  ensurePhoneBook,
  markThreadRead,
  phoneUnreadCount,
} = await import(js("phone-contacts.js"));
const { ensureDining, orderAndConsume, createSitting } = await import(js("dining.js"));
const { recordConsumption, ensureIntoxication } = await import(js("intoxication-effects.js"));
const { ensureHotel, extendStay, upgradeRoom } = await import(js("hotel.js"));

function makeSession(overrides = {}) {
  const session = new PlayerSession({
    playerName: "Smoke Tester",
    ...overrides,
  });
  session.rpg = session.rpg ?? { flags: {} };
  session.rpg.flags = session.rpg.flags ?? {};
  return session;
}

// ── Comp redeem effects ────────────────────────────────────────────────────
{
  const session = makeSession();
  const tracker = new RewardsTracker(session);
  tracker.ensureRewards();
  const before = session.wallet.balance;
  const r = tracker.redeemComp("welcome_drink");
  check(r && r.ok, "welcome_drink redeem returns ok object");
  check(session.rpg.flags.redeemed_welcome_drink === true, "welcome_drink sets redeem flag");
  check(ensureIntoxication(session).level > 0, "welcome_drink raises intoxication");
  check(session.rewards.redeemedComps.includes("welcome_drink"), "welcome_drink in redeemed list");

  session.rewards.unlockedComps.push("slot_freeplay");
  const bal0 = session.wallet.balance;
  tracker.redeemComp("slot_freeplay");
  check(session.wallet.balance === bal0 + 10, "slot_freeplay credits 10 chips");

  session.rewards.unlockedComps.push("buffet_comp");
  tracker.redeemComp("buffet_comp");
  check(ensureDining(session).buffetCompCredits === 1, "buffet_comp grants dining credit");

  void before;
}

// ── Buffet credit consumes on dining order ─────────────────────────────────
{
  const session = makeSession();
  ensureHotel(session);
  const dining = ensureDining(session);
  dining.buffetCompCredits = 1;
  const sitting = createSitting("aureole");
  const bal = session.wallet.balance;
  const result = orderAndConsume(session, sitting, "aur_amuse", "pace");
  check(result.ok, "buffet-comp food order succeeds");
  check(session.wallet.balance === bal, "buffet credit skips wallet debit");
  check(dining.buffetCompCredits === 0, "buffet credit consumed");
  check(String(result.message).toLowerCase().includes("buffet"), "order message mentions buffet");
}

// ── Call fallback script resolves Wrong number? ────────────────────────────
{
  const session = makeSession();
  const tracker = new RewardsTracker(session);
  tracker.ensureRewards();
  session.recordVisit("slots");
  syncContactIntros(session);
  // chip_chandler always unlocked
  const started = startCall(session, "chip_chandler");
  check(started.ok && started.script?.choices?.length, "startCall returns script with choices");
  const idx = started.script.choices.findIndex((c) => /wrong number/i.test(c.label));
  // chip_chandler has a real script; use last choice or first
  const choiceIdx = idx >= 0 ? idx : 0;
  const resolved = resolveCallChoice(session, "chip_chandler", choiceIdx, started.script, {
    redeemComp: (id) => tracker.redeemComp(id),
    upgradeRoom: (t) => upgradeRoom(session, t, tracker),
    extendStay: (n) => extendStay(session, n, tracker),
  });
  check(!/call dropped/i.test(resolved.response), `call choice resolves (got: ${resolved.response})`);
  check(Boolean(resolved.response), "call response non-empty");
}

// ── Fallback script (unknown contact path via empty dynamic) ───────────────
{
  const session = makeSession();
  const tracker = new RewardsTracker(session);
  tracker.ensureRewards();
  // Force fallback by resolving against an explicit fallback script
  const fallback = {
    opening: "desk",
    lines: ["x"],
    choices: [{ label: "Wrong number?", response: "Wrong numbers are right numbers in Vegas. Goodbye!", egg: "wrong_number" }],
  };
  const r = resolveCallChoice(session, "chip_chandler", 0, fallback, null);
  check(r.response.includes("Wrong numbers"), "activeScript fallback choice works");
  check(r.egg === "wrong_number", "fallback egg recorded");
}

// ── Betty text pour applies intoxication ───────────────────────────────────
{
  const session = makeSession();
  const tracker = new RewardsTracker(session);
  tracker.ensureRewards();
  session.rpg.flags.met_betty = true;
  syncContactIntros(session);
  const before = ensureIntoxication(session).level;
  const hooks = {
    redeemComp: (id) => tracker.redeemComp(id),
    upgradeRoom: (t) => upgradeRoom(session, t, tracker),
    extendStay: (n) => extendStay(session, n, tracker),
  };
  const r = sendText(session, "barkeep_betty", "comp", hooks);
  check(r.ok, "Betty Comp drink? text ok");
  check(ensureIntoxication(session).level > before, "Betty comp drink raises intox");
  check(r.effectNotes?.length > 0, "Betty text returns effect notes");
}

// ── Attorney retainer dialogue charges chips ───────────────────────────────
{
  const session = makeSession();
  const tracker = new RewardsTracker(session);
  const rewards = tracker.ensureRewards();
  rewards.lifetimeWagered = 60_000;
  rewards.tier = "gold";
  // Ensure attorney unlocked (Gold+) and enough chips for the 500 retainer.
  session.wallet.credit(2000, "test", "retainer bankroll");
  syncContactIntros(session);
  const pb = ensurePhoneBook(session);
  pb.threads.attorney_brief = {
    messages: [],
    callCount: 0,
    rapport: 20,
    textCount: 0,
    topicsSeen: [],
    dialogueState: { treeId: "retainer", nodeId: "start" },
  };
  const bal = session.wallet.balance;
  const hooks = {
    redeemComp: (id) => tracker.redeemComp(id),
    upgradeRoom: (t) => upgradeRoom(session, t, tracker),
    extendStay: (n) => extendStay(session, n, tracker),
  };
  const r = advanceDialogue(session, "attorney_brief", 0, hooks); // Pay in chips
  check(r.ok, "retainer Pay in chips advances");
  check(session.wallet.balance === bal - 500, `retainer deducts 500 chips (bal ${bal} → ${session.wallet.balance})`);
}

// ── Room night redeem via extendStay ───────────────────────────────────────
{
  const session = makeSession();
  const tracker = new RewardsTracker(session);
  const rewards = tracker.ensureRewards();
  rewards.unlockedComps.push("room_night");
  const hotel = ensureHotel(session);
  const nights = hotel.nightsRemaining;
  const r = extendStay(session, 1, tracker);
  check(r.ok, "extendStay with room_night comp ok");
  check(hotel.nightsRemaining === nights + 1, "nights remaining increased");
  check(rewards.redeemedComps.includes("room_night"), "room_night marked redeemed");
}

// ── Intox unlock returns dirty flag for persist ────────────────────────────
{
  const session = makeSession();
  const tracker = new RewardsTracker(session);
  tracker.ensureRewards();
  session.rpg.flags.met_betty = true;
  syncContactIntros(session);
  for (let i = 0; i < 8; i += 1) recordConsumption(session, "welcome_cocktail", { source: "test" });
  const dirty = onIntoxicationChange(session);
  check(dirty === true, "onIntoxicationChange returns true when unlocking");
  check(onIntoxicationChange(session) === false, "second intox unlock is no-op");
  check(phoneUnreadCount(session) > 0, "intox unlock creates unread messages");
  markThreadRead(session, "barkeep_betty");
  // betty may or may not have gotten the message depending on unlock
}

// ── applyPhoneEffect buffet + chips ────────────────────────────────────────
{
  const session = makeSession();
  const notes = applyPhoneEffect(session, { chips: 40, buffetCredit: 2, flag: "phone_effect_ok" });
  check(session.wallet.balance >= 40, "applyPhoneEffect credits chips");
  check(ensureDining(session).buffetCompCredits === 2, "applyPhoneEffect buffet credits");
  check(session.rpg.flags.phone_effect_ok === true, "applyPhoneEffect sets flag");
  check(notes.length >= 2, "applyPhoneEffect returns notes");
}

// ── Catalog completeness ───────────────────────────────────────────────────
for (const id of ["welcome_drink", "slot_freeplay", "buffet_comp", "room_night", "suite_upgrade", "penthouse_fantasy"]) {
  check(Boolean(COMP_CATALOG[id]), `COMP_CATALOG has ${id}`);
}

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nAll rewards-phone smoke checks passed.");
