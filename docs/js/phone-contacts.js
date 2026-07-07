/**
 * Contacts + messaging for the MGM Rewards flip phone.
 * Staff, NPCs, lawyer, and tier-unlocked casino host rep — calls, texts, Easter eggs.
 */

import { DEALER_ROSTER } from "./dealers.js";
import { resolveDealer, resolveNpc } from "./staff-manifest.js";
import { tierForWagered } from "./rewards.js";
import { tierIndex } from "./rewards-perks.js";
import { formatVegasTime } from "./vegas-time.js";

function nowIso() {
  return new Date().toISOString();
}

function visits(session, activity) {
  return session.activityStats?.[activity]?.visits ?? 0;
}

function hasFlag(session, flag) {
  return Boolean(session.rpg?.flags?.[flag]);
}

function tierIdx(session) {
  const rewards = session.rewards;
  if (!rewards) return 0;
  return tierIndex(tierForWagered(rewards.lifetimeWagered).id);
}

function phoneCalls(session) {
  return session.hotel?.roomAmenities?.phoneCalls ?? [];
}

function poolZones(session) {
  return session.poolComplex?.visitedZones ?? [];
}

/** @typedef {{ id: string, label: string, unlock: (session: import("./core.js").PlayerSession) => boolean, resolveName: (session: import("./core.js").PlayerSession) => string, resolveRole: (session: import("./core.js").PlayerSession) => string, emoji?: string }} ContactDef */

/** @type {ContactDef[]} */
const EXTRA_CONTACTS = [
  {
    id: "clerk_carmen",
    label: "Clerk Carmen",
    emoji: "🏨",
    unlock: (s) => visits(s, "hotel") > 0 || hasFlag(s, "met_carmen") || Boolean(s.hotel?.foundReservation) || Boolean(s.hotel?.reservationCode),
    resolveName: () => "Clerk Carmen",
    resolveRole: () => "Front desk",
  },
  {
    id: "lifeguard_lou",
    label: "Lifeguard Lou",
    emoji: "🛟",
    unlock: (s) => poolZones(s).includes("wave_pool") || hasFlag(s, "met_lou"),
    resolveName: () => "Lifeguard Lou",
    resolveRole: () => "Wave Pool",
  },
  {
    id: "shark_reef_guide",
    label: "Reef Guide",
    emoji: "🦈",
    unlock: (s) => poolZones(s).includes("shark_reef") || hasFlag(s, "met_reef_guide"),
    resolveName: () => "Shark Reef Guide",
    resolveRole: () => "Aquarium tunnel",
  },
  {
    id: "beach_dj",
    label: "Beach DJ",
    emoji: "🎧",
    unlock: (s) => poolZones(s).includes("beach_rave") || hasFlag(s, "met_beach_dj"),
    resolveName: () => "Beach DJ",
    resolveRole: () => "Mandalay Beach",
  },
  {
    id: "pete_bookie",
    label: "Pete the Bookie",
    emoji: "📋",
    unlock: (s) => visits(s, "sportsbook") > 0 || phoneCalls(s).includes("bookie"),
    resolveName: () => "Pete the Bookie",
    resolveRole: () => "Sports book back room",
  },
  {
    id: "attorney_brief",
    label: "Harvey Brief, Esq.",
    emoji: "⚖️",
    unlock: (s) => tierIdx(s) >= 2 || (s.wallet?.netSession ?? 0) < -750,
    resolveName: () => "Harvey Brief, Esq.",
    resolveRole: () => "Your lawyer (retained)",
  },
  {
    id: "host_representative",
    label: "Alexandra Vale",
    emoji: "⭐",
    unlock: (s) => tierIdx(s) >= 3,
    resolveName: () => "Alexandra Vale",
    resolveRole: () => "MGM Host Representative",
  },
];

const GAME_TO_DEALERS = {
  blackjack: ["meryl_screech", "jennifer_lawless", "octavia_spectacular", "nicole_widechart"],
  holdem: ["judi_bench", "jennifer_lawless", "octavia_spectacular"],
  roulette: ["steve_harvey", "sofia_volume", "nicole_widechart"],
  horse_racing: ["steve_harvey", "pavilion_paula"],
  horse_stables: ["pavilion_paula"],
  sportsbook: ["pete_bookie"],
};

const NPC_UNLOCK = {
  chip_chandler: () => true,
  barkeep_betty: (s) => hasFlag(s, "met_betty") || visits(s, "slots") > 0 || tierIdx(s) >= 0,
  pavilion_paula: (s) => visits(s, "horse_racing") > 0 || hasFlag(s, "met_paula"),
  tourist_tina: (s) => Object.values(s.activityStats ?? {}).some((st) => st.visits > 0) || hasFlag(s, "met_tina"),
};

/** Build full contact list with dynamic names from staff manifest. */
export function buildContactRegistry(session) {
  const list = [];

  for (const dealer of DEALER_ROSTER) {
    const resolved = resolveDealer(session, dealer);
    list.push({
      id: dealer.id,
      label: resolved.name,
      emoji: "🎰",
      category: "dealer",
      unlock: (s) => dealer.games.some((g) => visits(s, g) > 0)
        || hasFlag(s, `met_${dealer.id}`),
      resolveName: (s) => resolveDealer(s, dealer).name,
      resolveRole: () => `Dealer · ${dealer.games.join(", ")}`,
    });
  }

  for (const [id, fn] of Object.entries(NPC_UNLOCK)) {
    const npc = resolveNpc(session, id);
    list.push({
      id,
      label: npc.name,
      emoji: id === "barkeep_betty" ? "🍸" : id === "tourist_tina" ? "🗺️" : "🎲",
      category: "floor",
      unlock: fn,
      resolveName: (s) => resolveNpc(s, id).name,
      resolveRole: () => npc.role?.replace(/_/g, " ") ?? "Floor",
    });
  }

  for (const extra of EXTRA_CONTACTS) {
    list.push({ ...extra, category: "special" });
  }

  return list;
}

export function getContactDef(session, contactId) {
  return buildContactRegistry(session).find((c) => c.id === contactId) ?? null;
}

export function isContactUnlocked(session, contactId) {
  const def = getContactDef(session, contactId);
  return def ? def.unlock(session) : false;
}

export function listUnlockedContacts(session) {
  return buildContactRegistry(session).filter((c) => c.unlock(session));
}

export function ensurePhoneBook(session) {
  if (!session.rewards) return null;
  if (!session.rewards.phoneBook) {
    session.rewards.phoneBook = {
      threads: {},
      easterEggs: [],
      introSent: [],
    };
  }
  const pb = session.rewards.phoneBook;
  if (!pb.threads) pb.threads = {};
  if (!Array.isArray(pb.easterEggs)) pb.easterEggs = [];
  if (!Array.isArray(pb.introSent)) pb.introSent = [];
  return pb;
}

function ensureThread(session, contactId) {
  const pb = ensurePhoneBook(session);
  if (!pb) return null;
  if (!pb.threads[contactId]) {
    pb.threads[contactId] = { messages: [], callCount: 0 };
  }
  return pb.threads[contactId];
}

export function phoneUnreadCount(session) {
  const pb = ensurePhoneBook(session);
  if (!pb) return 0;
  let n = 0;
  for (const thread of Object.values(pb.threads)) {
    for (const msg of thread.messages ?? []) {
      if (msg.dir === "in" && !msg.read) n += 1;
    }
  }
  return n;
}

export function appendMessage(session, contactId, dir, body, { read = dir === "out" } = {}) {
  const thread = ensureThread(session, contactId);
  if (!thread) return null;
  const msg = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    dir,
    body,
    timestamp: nowIso(),
    read,
  };
  thread.messages.push(msg);
  if (thread.messages.length > 40) thread.messages = thread.messages.slice(-40);
  return msg;
}

export function markThreadRead(session, contactId) {
  const thread = ensureThread(session, contactId);
  if (!thread) return;
  for (const msg of thread.messages) {
    if (msg.dir === "in") msg.read = true;
  }
}

function recordEasterEgg(session, eggId) {
  const pb = ensurePhoneBook(session);
  if (!pb || pb.easterEggs.includes(eggId)) return false;
  pb.easterEggs.push(eggId);
  return true;
}

/** Auto-send intro texts when contacts newly unlock. */
export function syncContactIntros(session) {
  const pb = ensurePhoneBook(session);
  if (!pb) return;
  for (const contact of listUnlockedContacts(session)) {
    if (pb.introSent.includes(contact.id)) continue;
    const intro = CONTACT_INTROS[contact.id];
    if (intro) {
      appendMessage(session, contact.id, "in", intro, { read: false });
    }
    pb.introSent.push(contact.id);
  }
}

/** Call when player visits a floor activity — unlocks dealer texts. */
export function onActivityVisit(session, activityId) {
  syncContactIntros(session);
  const dealerIds = GAME_TO_DEALERS[activityId] ?? [];
  for (const id of dealerIds) {
    if (isContactUnlocked(session, id)) {
      const pb = ensurePhoneBook(session);
      if (pb && !pb.introSent.includes(id) && CONTACT_INTROS[id]) {
        appendMessage(session, id, "in", CONTACT_INTROS[id], { read: false });
        pb.introSent.push(id);
      }
    }
  }
}

const CONTACT_INTROS = {
  chip_chandler: "Chip Chandler here. Save my number — I rotate intel on every pit shift. Text PIT for tonight's lineup.",
  steve_harvey: "Steve Harvey 📺 Survey says… you sat at my table! Text SURVEY anytime. Family Feud reruns don't pay rent.",
  meryl_screech: "Meryl Screech. The felt remembers. Text OSCAR if you want table-side drama tips.",
  judi_bench: "Judi Bench — Hold'em pit. Text ALL IN only when you mean it. I fold on bad jokes.",
  barkeep_betty: "Betty's Bar 🍸 Comp drinks flow through tier status. Text COMP and I'll check the pour.",
  pavilion_paula: "Paula at the paddock. Text ODDS for my long-shot of the day. No guarantees — this IS racing.",
  tourist_tina: "Tina!! OMG hi!! Text LOST if you need directions. I get lost hourly so I'm qualified.",
  clerk_carmen: "Front desk — Carmen. Your conf is in the system somewhere. Text CONF if the elevator gaslights you again.",
  attorney_brief: "Harvey Brief, Esq. You've been added to my billable contacts. Text OBJECTION for legal theater. (Not actual legal advice.)",
  host_representative: "Alexandra Vale — MGM Host Services. Platinum welcome. Text COMPAINT (yes, one P) and I'll escalate with a smile.",
  pete_bookie: "Pete here. Off-the-record line. Text LOCK for my 'lock of the day.' Lock not guaranteed. Neither is tomorrow.",
};

/** Outbound text options per contact. */
export const TEXT_OPTIONS = {
  steve_harvey: [
    { key: "survey", label: "Survey says…", reply: "SURVEY SAYS… you're my favorite degenerate tonight! 🔔 Top answer: MORE CHIPS.", egg: "survey_says" },
    { key: "feud", label: "Family Feud?", reply: "Show me 'Reason Steve Left Chicago' — I got a whole board. You get free entertainment.", egg: null },
    { key: "horse", label: "Wrong sport?", reply: "Royal Flush in the stretch! …Wrong animal, right energy.", egg: "steve_horse" },
  ],
  chip_chandler: [
    { key: "pit", label: "Who's on pit?", reply: "Tonight: drama at blackjack, chaos at roulette, Steve being Steve at the pavilion. You're welcome.", egg: null },
    { key: "tip", label: "Any hot tips?", reply: "Hot tip #1: the house has math. Hot tip #2: Betty pours heavy on Pearl+.", egg: "chip_tip" },
  ],
  barkeep_betty: [
    { key: "comp", label: "Comp drink?", reply: "Pour incoming — check tier on your card. Sapphire gets sympathy; Gold gets gin.", egg: null },
    { key: "gossip", label: "Floor gossip?", reply: "Tina saw a whale cry at penny slots. Steve called a photo finish at roulette. Normal Tuesday.", egg: "betty_gossip" },
  ],
  attorney_brief: [
    { key: "objection", label: "Objection!", reply: "Sustained. Emotional damages: one (1) bad beat. My retainer accepts chips and dignity.", egg: "legal_objection" },
    { key: "sue", label: "Can I sue the casino?", reply: "You can sue anyone. Winning is another matter. Also you signed the guest directory. That waives… vibes.", egg: null },
    { key: "nda", label: "What happens in Vegas?", reply: "Stays in Vegas unless Tina posts it. She won't. She can't find the share button.", egg: "vegas_nda" },
  ],
  host_representative: [
    { key: "compaint", label: "I have a compaint", reply: "One P, noted. I'm escalating to 'smiling harder.' Suite upgrade pending narrative approval.", egg: "host_typo" },
    { key: "vip", label: "VIP treatment?", reply: "You're Platinum — velvet rope at the buffet line. Noir gets the rope itself.", egg: null },
    { key: "whale", label: "Am I a whale?", reply: "You're a dolphin with ambition. Keep wagering — Chairman tier gets a literal harpoon metaphor. (It's complimentary.)", egg: "whale_status" },
  ],
  tourist_tina: [
    { key: "lost", label: "I'm lost", reply: "Same!! Try the gold carpet tiles near the plants. Or text CHIP. Or accept destiny.", egg: "tina_lost" },
    { key: "food", label: "Where's food?", reply: "Buffet comp maybe? Steve says survey says… line moves if you look confident.", egg: null },
  ],
  pete_bookie: [
    { key: "lock", label: "Lock of the day?", reply: "Mandalay Bay to remain standing. Line: -10000. (Past performance ≠ future Mandalay.)", egg: "pete_lock" },
    { key: "help", label: "Help my parlay", reply: "I can't fix prayer. I can offer sympathy at 3:1.", egg: null },
  ],
  meryl_screech: [
    { key: "oscar", label: "Oscar tips?", reply: "Method dealing: whisper to the ace. The audience (pit boss) hates it.", egg: "meryl_oscar" },
  ],
  default: [
    { key: "hey", label: "Hey!", reply: "Got your text. I'm between shifts — hit me again after you visit the floor.", egg: null },
  ],
};

/** Multi-step call scripts. */
export const CALL_SCRIPTS = {
  steve_harvey: {
    opening: "Steve Harvey on the line! Survey says… you called ME for once.",
    lines: [
      "Listen, I spun wheels, hosted Feud, boxed a little — this call is still peak excitement.",
      "You need betting advice? Survey says… the number four. Or don't. I'm a host, not a prophet.",
    ],
    choices: [
      { label: "Any Feud stories?", response: "Once a contestant guessed 'Steve Harvey' for every answer. Survey said… correct.", egg: "call_feud" },
      { label: "Horse racing tips?", response: "Royal Flush in the stretch! Place your bets — wrong sport, great energy.", egg: "call_horse" },
      { label: "Goodbye", response: "Survey says… hang up and go win something!", egg: null },
    ],
  },
  attorney_brief: {
    opening: "Harvey Brief, Esq. Billable minute #1 starting… now.",
    lines: [
      "Before you speak: I am not licensed in your jurisdiction, this call, or the astral plane.",
      "That said — how can I theatrically assist?",
    ],
    choices: [
      { label: "The casino took my chips", response: "Ah, the classic 'voluntary transfer' defense. Have you tried winning them back with dignity?", egg: null },
      { label: "Objection!", response: "SUSTAINED. The house looks guilty. Legally meaningless. Emotionally satisfying.", egg: "call_objection" },
      { label: "Retainer?", response: "My retainer is 500 chips or one buffet comp. Both hurt differently.", egg: "call_retainer" },
    ],
  },
  host_representative: {
    opening: "Alexandra Vale, MGM Host Representative. Platinum privileges are… loading… loaded.",
    lines: [
      "I can comp, escalate, or pretend the minibar prices are a typo.",
      "What do you need, member?",
    ],
    choices: [
      { label: "Room upgrade?", response: "Narrative upgrade queued. Actual keys remain with Carmen — I make vibes happen.", egg: null },
      { label: "I'm upset", response: "I'm so sorry — on a scale of 1 to Steve Harvey, how loud was the incident?", egg: "host_upset" },
      { label: "Secret Chairman perk?", response: "…You didn't hear this from me. Text WHALE on my line after midnight. (It's still a metaphor.)", egg: "chairman_secret" },
    ],
  },
  chip_chandler: {
    opening: "Chip here. You rang the floor hotline.",
    lines: ["Pits are alive. Roulette's hot, Hold'em's chatty, Tina's lost again."],
    choices: [
      { label: "Best table?", response: "Wherever your bankroll feels brave. Or stupid. Same thing after midnight.", egg: null },
      { label: "Thanks", response: "Save my number. The house always has my number anyway.", egg: null },
    ],
  },
  barkeep_betty: {
    opening: "Betty's Bar — talk fast, I'm pouring.",
    lines: ["Comp status checks take two seconds and one judgmental glance."],
    choices: [
      { label: "Strongest drink?", response: "The 'Walk of Shame' — tastes like regret, looks like tourism.", egg: "betty_drink" },
      { label: "Gossip?", response: "Steve called a photo finish at slots. Meryl quoted Shakespeare at blackjack. Normal.", egg: null },
    ],
  },
  pete_bookie: {
    opening: "Pete the Bookie. Speak fast — lines move when I breathe.",
    lines: ["Everything I say is entertainment, not financial advice. Or good advice."],
    choices: [
      { label: "Lock of the day?", response: "Mandalay Bay remains upright. Heavy favorite. Bet the house metaphorically.", egg: "pete_call_lock" },
      { label: "Fix my parlay", response: "I can't fix prayer. Try fewer legs and more dignity.", egg: null },
    ],
  },
  tourist_tina: {
    opening: "Tina here!! I was literally about to text YOU!",
    lines: ["I'm lost again but emotionally available."],
    choices: [
      { label: "Where am I?", response: "Same!! Try the gold carpet by the plants. Or don't. Adventure!", egg: "tina_call_lost" },
    ],
  },
  pavilion_paula: {
    opening: "Paula at the paddock. The ponies are moody. I'm moodier.",
    lines: ["Text ODDS for my long-shot. Call me for drama."],
    choices: [
      { label: "Long shot?", response: "Gate 4 has 'attitude' — that's not a stat but it's a vibe.", egg: "paula_longshot" },
    ],
  },
  default: {
    opening: "You've reached the Mandalay Bay mobile desk.",
    lines: ["Leave a text — calls cost extra personality."],
    choices: [
      { label: "Wrong number?", response: "Wrong numbers are right numbers in Vegas. Goodbye!", egg: "wrong_number" },
    ],
  },
};

/** Wrong-number Easter egg — dial from contacts search. */
export const WRONG_NUMBER = {
  number: "555-0199",
  opening: "…Hello? You've reached the Shark Reef after-hours comment line.",
  reply: "The sand tiger says: stop calling. (You've unlocked 'Wrong Number' in Easter eggs.)",
  egg: "shark_wrong_number",
};

export function sendText(session, contactId, optionKey) {
  if (!isContactUnlocked(session, contactId)) {
    return { ok: false, message: "Contact not unlocked yet." };
  }
  const options = TEXT_OPTIONS[contactId] ?? TEXT_OPTIONS.default;
  const opt = options.find((o) => o.key === optionKey) ?? options[0];
  if (!opt) return { ok: false, message: "No text option." };

  appendMessage(session, contactId, "out", opt.label);
  appendMessage(session, contactId, "in", opt.reply, { read: false });

  if (opt.egg) recordEasterEgg(session, opt.egg);
  return { ok: true, reply: opt.reply, egg: opt.egg };
}

export function getTextOptions(contactId) {
  return TEXT_OPTIONS[contactId] ?? TEXT_OPTIONS.default;
}

export function startCall(session, contactId) {
  if (!isContactUnlocked(session, contactId)) {
    return { ok: false, message: "Contact not unlocked." };
  }
  const thread = ensureThread(session, contactId);
  if (thread) thread.callCount += 1;
  const script = CALL_SCRIPTS[contactId] ?? CALL_SCRIPTS.default;
  return { ok: true, script };
}

export function resolveCallChoice(session, contactId, choiceIndex) {
  const script = CALL_SCRIPTS[contactId] ?? CALL_SCRIPTS.default;
  const choice = script.choices[choiceIndex];
  if (!choice) return { response: "…Call dropped.", egg: null };
  if (choice.egg) recordEasterEgg(session, choice.egg);
  appendMessage(session, contactId, "in", `[Call] ${choice.response}`, { read: false });
  return { response: choice.response, egg: choice.egg };
}

export function dialWrongNumber(session) {
  if (recordEasterEgg(session, WRONG_NUMBER.egg)) {
    appendMessage(session, "chip_chandler", "in", `[Wrong #] ${WRONG_NUMBER.reply}`, { read: false });
  }
  return WRONG_NUMBER;
}

export function formatMessageTime(iso) {
  try {
    return formatVegasTime(iso);
  } catch {
    return "";
  }
}

export function getThread(session, contactId) {
  return ensureThread(session, contactId);
}

export function easterEggCount(session) {
  return ensurePhoneBook(session)?.easterEggs?.length ?? 0;
}

export function listEasterEggs(session) {
  return [...(ensurePhoneBook(session)?.easterEggs ?? [])];
}
