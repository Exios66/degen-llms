/**
 * Contacts + messaging for the MGM Rewards flip phone.
 * Staff, NPCs, lawyer, and tier-unlocked casino host rep — calls, texts, Easter eggs.
 */

import { DEALER_ROSTER } from "./dealers.js";
import { resolveDealer, resolveNpc } from "./staff-manifest.js";
import { tierForWagered } from "./rewards.js";
import { tierIndex } from "./rewards-perks.js";
import { formatVegasTime } from "./vegas-time.js";
import {
  adjustRapport, buildDialogueContext, getCustomPhoneContent, getRapport,
  normalizeThread, rapportBand, resolveLine,
} from "./phone-rapport.js";
import {
  getCallNode, getDialogueNode, getDynamicCallScript, getDynamicIntro, getDynamicTextOptions,
  getTierRankUpMessages, INTOX_UNLOCK_MESSAGES, getSessionSwingMessages,
} from "./phone-dialogue-data.js";
import { isHeightenedIntoxication, recordConsumption } from "./intoxication-effects.js";
import { ensureDining } from "./dining.js";

/** @typedef {{ muted: boolean, ringtoneId: string, smsSound: boolean }} PhoneSettings */

export const DEFAULT_PHONE_SETTINGS = {
  muted: false,
  ringtoneId: "classic",
  smsSound: true,
};

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
    unlock: (s) => poolZones(s).includes("wave_pool") || hasFlag(s, "met_lou") || hasFlag(s, "met_lifeguard_lou"),
    resolveName: () => "Lifeguard Lou",
    resolveRole: () => "Wave Pool",
  },
  {
    id: "shark_reef_guide",
    label: "Reef Guide",
    emoji: "🦈",
    unlock: (s) => poolZones(s).includes("shark_reef") || hasFlag(s, "met_reef_guide") || hasFlag(s, "met_shark_guide"),
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
  equestrian: ["pavilion_paula"],
};

const NPC_UNLOCK = {
  chip_chandler: () => true,
  barkeep_betty: (s) => hasFlag(s, "met_betty") || visits(s, "slots") > 0 || tierIdx(s) >= 0,
  pavilion_paula: (s) => visits(s, "horse_racing") > 0 || visits(s, "equestrian") > 0 || hasFlag(s, "met_paula"),
  tourist_tina: (s) => Object.values(s.activityStats ?? {}).some((st) => st.visits > 0) || hasFlag(s, "met_tina"),
};

const STATIC_INTROS = {
  chip_chandler: "Chip Chandler here. Save my number — I rotate intel on every pit shift. Text PIT for tonight's lineup.",
  steve_harvey: "Steve Harvey 📺 Survey says… you sat at my table! Text SURVEY anytime. Family Feud reruns don't pay rent.",
  meryl_screech: "Meryl Screech. The felt remembers. Text OSCAR if you want table-side drama tips.",
  judi_bench: "Judi Bench — Hold'em pit. Text ALL IN only when you mean it. I fold on bad jokes.",
  jennifer_lawless: "Jennifer Lawless on duty. Text me before you trip — I get it, literally.",
  sofia_volume: "Sofia Volume 📣 ¡Dale! Roulette table energy in your pocket.",
  octavia_spectacular: "Octavia Spectacular, honey. Sweetheart line open — text PEP for sugar-coated truth.",
  nicole_widechart: "Nicole Widechart. The chips whisper. I translate. Text when composed.",
  barkeep_betty: "Betty's Bar 🍸 Comp drinks flow through tier status. Text COMP and I'll check the pour.",
  pavilion_paula: "Paula at the paddock. Text ODDS for my long-shot of the day. No guarantees — this IS racing.",
  tourist_tina: "Tina!! OMG hi!! Text LOST if you need directions. I get lost hourly so I'm qualified.",
  clerk_carmen: "Front desk — Carmen. Your conf is in the system somewhere. Text CONF if the elevator gaslights you again.",
  attorney_brief: "Harvey Brief, Esq. You've been added to my billable contacts. Text OBJECTION for legal theater. (Not actual legal advice.)",
  host_representative: "Alexandra Vale — MGM Host Services. Platinum welcome. Text COMPAINT (yes, one P) and I'll escalate with a smile.",
  pete_bookie: "Pete here. Off-the-record line. Text LOCK for my 'lock of the day.' Lock not guaranteed. Neither is tomorrow.",
};

/** Wrong-number Easter egg — dial from contacts search. */
export const WRONG_NUMBER = {
  number: "555-0199",
  opening: "…Hello? You've reached the Shark Reef after-hours comment line.",
  reply: "The sand tiger says: stop calling. (You've unlocked 'Wrong Number' in Easter eggs.)",
  egg: "shark_wrong_number",
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
      lastTierAnnounced: "sapphire",
      intoxSecretsSent: false,
      settings: { ...DEFAULT_PHONE_SETTINGS },
    };
  }
  const pb = session.rewards.phoneBook;
  if (!pb.threads) pb.threads = {};
  if (!Array.isArray(pb.easterEggs)) pb.easterEggs = [];
  if (!Array.isArray(pb.introSent)) pb.introSent = [];
  if (!pb.lastTierAnnounced) pb.lastTierAnnounced = "sapphire";
  if (pb.intoxSecretsSent == null) pb.intoxSecretsSent = false;
  if (!pb.settings || typeof pb.settings !== "object") {
    pb.settings = { ...DEFAULT_PHONE_SETTINGS };
  } else {
    pb.settings = { ...DEFAULT_PHONE_SETTINGS, ...pb.settings };
  }
  return pb;
}

/** @param {import("./core.js").PlayerSession} session @returns {PhoneSettings} */
export function getPhoneSettings(session) {
  const pb = ensurePhoneBook(session);
  return { ...DEFAULT_PHONE_SETTINGS, ...(pb?.settings ?? {}) };
}

/**
 * @param {import("./core.js").PlayerSession} session
 * @param {Partial<PhoneSettings>} patch
 */
export function updatePhoneSettings(session, patch) {
  const pb = ensurePhoneBook(session);
  if (!pb) return getPhoneSettings(session);
  pb.settings = { ...DEFAULT_PHONE_SETTINGS, ...pb.settings, ...patch };
  return { ...pb.settings };
}

function ensureThread(session, contactId) {
  const pb = ensurePhoneBook(session);
  if (!pb) return null;
  if (!pb.threads[contactId]) {
    pb.threads[contactId] = {
      messages: [],
      callCount: 0,
      rapport: 0,
      textCount: 0,
      topicsSeen: [],
      dialogueState: null,
      callState: null,
    };
  }
  return normalizeThread(pb.threads[contactId]);
}

function resolveIntro(session, contactId) {
  const ctx = buildDialogueContext(session, contactId);
  const category = DEALER_ROSTER.some((d) => d.id === contactId) ? "dealers" : "npcs";
  const custom = getCustomPhoneContent(session, contactId, category);
  if (custom.intro) return custom.intro;
  return getDynamicIntro(contactId, ctx) ?? STATIC_INTROS[contactId] ?? null;
}

function recordEasterEgg(session, eggId) {
  const pb = ensurePhoneBook(session);
  if (!pb || pb.easterEggs.includes(eggId)) return false;
  pb.easterEggs.push(eggId);
  return true;
}

function bumpTextStats(session, contactId, rapportDelta = 2) {
  const thread = ensureThread(session, contactId);
  if (!thread) return;
  thread.textCount += 1;
  adjustRapport(session, contactId, rapportDelta);
}

/** Auto-send intro texts when contacts newly unlock. */
export function syncContactIntros(session) {
  const pb = ensurePhoneBook(session);
  if (!pb) return;
  for (const contact of listUnlockedContacts(session)) {
    if (pb.introSent.includes(contact.id)) continue;
    const intro = resolveIntro(session, contact.id);
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
      if (pb && !pb.introSent.includes(id) && resolveIntro(session, id)) {
        appendMessage(session, id, "in", resolveIntro(session, id), { read: false });
        pb.introSent.push(id);
      }
    }
  }
}

/**
 * Send hidden-line unlock texts when player first hits heightened intoxication.
 * @returns {boolean} true if new messages were written (caller should persist)
 */
export function onIntoxicationChange(session) {
  if (!isHeightenedIntoxication(session)) return false;
  const pb = ensurePhoneBook(session);
  if (!pb || pb.intoxSecretsSent) return false;
  pb.intoxSecretsSent = true;
  recordEasterEgg(session, "intox_hidden_lines");
  for (const [contactId, body] of Object.entries(INTOX_UNLOCK_MESSAGES)) {
    if (!isContactUnlocked(session, contactId)) continue;
    appendMessage(session, contactId, "in", body, { read: false });
    adjustRapport(session, contactId, 3);
  }
  return true;
}

/**
 * Apply infrastructure side-effects declared on text/call/dialogue choices.
 * Room upgrade / stay extend go through optional tracker hooks to avoid
 * circular imports with hotel.js.
 * @param {import("./core.js").PlayerSession} session
 * @param {object|null|undefined} effect
 * @param {{
 *   redeemComp?: (id: string) => unknown,
 *   upgradeRoom?: (target: string) => { ok: boolean, message: string },
 *   extendStay?: (nights: number) => { ok: boolean, message: string },
 * }|null} [tracker]
 * @returns {string[]} human-readable notes
 */
export function applyPhoneEffect(session, effect, tracker = null) {
  if (!effect || typeof effect !== "object") return [];
  const notes = [];

  if (effect.drink) {
    const r = recordConsumption(session, effect.drink, { source: "phone" });
    if (r.ok) notes.push(`Pour logged (+${r.added} intox)`);
  }
  if (typeof effect.chips === "number" && effect.chips !== 0 && session.wallet) {
    if (effect.chips > 0) {
      session.wallet.credit(effect.chips, "phone", effect.chipReason ?? "Phone comp");
      notes.push(`+${effect.chips} chips`);
    } else {
      const owed = Math.abs(effect.chips);
      if (session.wallet.debit(owed, "phone", effect.chipReason ?? "Phone charge")) {
        notes.push(`-${owed} chips`);
      } else {
        notes.push("Insufficient chips for phone charge");
      }
    }
  }
  if (effect.buffetCredit) {
    const dining = ensureDining(session);
    dining.buffetCompCredits = (dining.buffetCompCredits ?? 0) + Number(effect.buffetCredit);
    notes.push("Dining course credit queued");
  }
  if (effect.flag) {
    session.rpg = session.rpg ?? {};
    session.rpg.flags = session.rpg.flags ?? {};
    session.rpg.flags[effect.flag] = true;
  }
  if (effect.extendStay && tracker?.extendStay) {
    const r = tracker.extendStay(Number(effect.extendStay) || 1);
    notes.push(r.message);
  }
  if (effect.upgradeRoom && tracker?.upgradeRoom) {
    const r = tracker.upgradeRoom(effect.upgradeRoom);
    notes.push(r.message);
  }
  if (effect.redeemComp && tracker?.redeemComp) {
    const r = tracker.redeemComp(effect.redeemComp);
    if (r) notes.push(`Comp redeemed: ${effect.redeemComp}`);
  }

  return notes;
}

/** Send tier rank-up texts from key contacts. */
export function onTierRankUp(session, newTierId) {
  const pb = ensurePhoneBook(session);
  if (!pb || pb.lastTierAnnounced === newTierId) return;
  pb.lastTierAnnounced = newTierId;
  for (const [contactId, body] of getTierRankUpMessages(newTierId)) {
    if (!isContactUnlocked(session, contactId)) continue;
    appendMessage(session, contactId, "in", `🎉 ${body}`, { read: false });
    adjustRapport(session, contactId, 5);
  }
}

/** Proactive texts after a big win or loss at an activity. */
export function onSessionSwing(session, activityId, net) {
  const pb = ensurePhoneBook(session);
  if (!pb || net === 0) return;
  if (!Array.isArray(pb.sessionSwings)) pb.sessionSwings = [];

  const bucket = net >= 0 ? "win" : "loss";
  const magnitude = Math.floor(Math.abs(net) / 1000);
  const key = `${bucket}_${activityId}_${magnitude}k`;
  if (pb.sessionSwings.includes(key)) return;
  pb.sessionSwings.push(key);

  for (const [contactId, body] of getSessionSwingMessages(session, activityId, net)) {
    if (!isContactUnlocked(session, contactId)) continue;
    const prefix = net >= 0 ? "🎰" : "📉";
    appendMessage(session, contactId, "in", `${prefix} ${body}`, { read: false });
    adjustRapport(session, contactId, net >= 0 ? 3 : 2);
  }
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
  if (thread.messages.length > 50) thread.messages = thread.messages.slice(-50);
  return msg;
}

export function markThreadRead(session, contactId) {
  const thread = ensureThread(session, contactId);
  if (!thread) return;
  for (const msg of thread.messages) {
    if (msg.dir === "in") msg.read = true;
  }
}

export function getDialogueState(session, contactId) {
  return ensureThread(session, contactId)?.dialogueState ?? null;
}

export function clearDialogueState(session, contactId) {
  const thread = ensureThread(session, contactId);
  if (thread) thread.dialogueState = null;
}

/**
 * Advance an active multi-turn SMS dialogue tree.
 * @param {import("./core.js").PlayerSession} session
 * @param {string} contactId
 * @param {number} choiceIndex
 */
export function advanceDialogue(session, contactId, choiceIndex, tracker = null) {
  const thread = ensureThread(session, contactId);
  const state = thread?.dialogueState;
  if (!state) return { ok: false, message: "No active conversation." };

  const ctx = buildDialogueContext(session, contactId);
  const node = getDialogueNode(contactId, state.treeId, state.nodeId, ctx);
  const choice = node?.choices?.[choiceIndex];
  if (!choice) return { ok: false, message: "Invalid choice." };

  appendMessage(session, contactId, "out", choice.label);
  if (choice.rapport) adjustRapport(session, contactId, choice.rapport);
  if (choice.egg) recordEasterEgg(session, choice.egg);
  const effectNotes = applyPhoneEffect(session, choice.effect, tracker);

  if (choice.next) {
    const nextNode = getDialogueNode(contactId, state.treeId, choice.next, ctx);
    if (nextNode) {
      thread.dialogueState = { treeId: state.treeId, nodeId: choice.next };
      appendMessage(session, contactId, "in", nextNode.text, { read: false });
      if (nextNode.end || !nextNode.choices?.length) {
        thread.dialogueState = null;
      }
      bumpTextStats(session, contactId, 0);
      return { ok: true, ended: !thread.dialogueState, effectNotes };
    }
  }

  thread.dialogueState = null;
  bumpTextStats(session, contactId, 0);
  return { ok: true, ended: true, effectNotes };
}

export function sendText(session, contactId, optionKey, tracker = null) {
  if (!isContactUnlocked(session, contactId)) {
    return { ok: false, message: "Contact not unlocked yet." };
  }

  const thread = ensureThread(session, contactId);
  const ctx = buildDialogueContext(session, contactId);
  const options = getDynamicTextOptions(contactId, ctx);
  const opt = options.find((o) => o.key === optionKey) ?? options[0];
  if (!opt) return { ok: false, message: "No text option." };

  if (opt.onceKey && thread.topicsSeen.includes(opt.onceKey)) {
    return { ok: false, message: "Already discussed." };
  }
  if (opt.onceKey) thread.topicsSeen.push(opt.onceKey);

  appendMessage(session, contactId, "out", opt.label);
  const effectNotes = applyPhoneEffect(session, opt.effect, tracker);

  if (opt.startTree) {
    const node = getDialogueNode(contactId, opt.startTree.treeId, opt.startTree.nodeId, ctx);
    if (node) {
      thread.dialogueState = { treeId: opt.startTree.treeId, nodeId: opt.startTree.nodeId };
      appendMessage(session, contactId, "in", node.text, { read: false });
      if (node.end || !node.choices?.length) thread.dialogueState = null;
      bumpTextStats(session, contactId, opt.rapport ?? 3);
      return { ok: true, startedTree: true, ended: !thread.dialogueState, effectNotes };
    }
  }

  const reply = resolveLine(opt.reply, ctx);
  appendMessage(session, contactId, "in", reply, { read: false });
  if (opt.egg) recordEasterEgg(session, opt.egg);
  bumpTextStats(session, contactId, opt.rapport ?? 2);
  return { ok: true, reply, egg: opt.egg, effectNotes };
}

export function getTextOptions(session, contactId) {
  const ctx = buildDialogueContext(session, contactId);
  return getDynamicTextOptions(contactId, ctx);
}

export function getActiveDialogueChoices(session, contactId) {
  const state = getDialogueState(session, contactId);
  if (!state) return null;
  const ctx = buildDialogueContext(session, contactId);
  const node = getDialogueNode(contactId, state.treeId, state.nodeId, ctx);
  if (!node || node.end) {
    clearDialogueState(session, contactId);
    return null;
  }
  return node;
}

export function getRapportSummary(session, contactId) {
  const rapport = getRapport(session, contactId);
  return { rapport, band: rapportBand(rapport) };
}

export function getCallState(session, contactId) {
  return ensureThread(session, contactId)?.callState ?? null;
}

export function clearCallState(session, contactId) {
  const thread = ensureThread(session, contactId);
  if (thread) thread.callState = null;
}

/**
 * Begin a multi-turn voice call. Sets callState to the greeting node.
 * @param {import("./core.js").PlayerSession} session
 * @param {string} contactId
 */
export function startCall(session, contactId) {
  if (!isContactUnlocked(session, contactId)) {
    return { ok: false, message: "Contact not unlocked." };
  }
  const thread = ensureThread(session, contactId);
  if (thread) thread.callCount += 1;
  const ctx = buildDialogueContext(session, contactId);
  const treeId = "voice";
  const nodeId = "hello";
  const node = getCallNode(contactId, treeId, nodeId, ctx);
  if (!node) {
    return { ok: false, message: "No answer." };
  }
  thread.callState = { treeId, nodeId, phase: "connecting" };
  appendMessage(session, contactId, "in", `[Call] ${node.text}`, { read: false });
  // Compatibility: expose legacy script shape for older tests / UI shims.
  const script = getDynamicCallScript(contactId, ctx);
  return { ok: true, node, script, callState: thread.callState };
}

/**
 * Mark the connecting phase complete so the LCD shows live choices.
 * @param {import("./core.js").PlayerSession} session
 * @param {string} contactId
 */
export function connectCall(session, contactId) {
  const thread = ensureThread(session, contactId);
  if (!thread?.callState) return { ok: false, message: "No active call." };
  thread.callState = { ...thread.callState, phase: "talking" };
  return { ok: true, callState: thread.callState };
}

/**
 * Advance an active multi-turn voice call.
 * @param {import("./core.js").PlayerSession} session
 * @param {string} contactId
 * @param {number} choiceIndex
 */
export function advanceCall(session, contactId, choiceIndex, tracker = null) {
  const thread = ensureThread(session, contactId);
  const state = thread?.callState;
  if (!state) return { ok: false, message: "No active call.", response: "…Call dropped.", egg: null, effectNotes: [] };

  const ctx = buildDialogueContext(session, contactId);
  const node = getCallNode(contactId, state.treeId, state.nodeId, ctx);
  const choice = node?.choices?.[choiceIndex];
  if (!choice) {
    return { ok: false, message: "Invalid choice.", response: "…Call dropped.", egg: null, effectNotes: [] };
  }

  appendMessage(session, contactId, "out", `[Call] ${choice.label}`);
  if (choice.egg) recordEasterEgg(session, choice.egg);
  if (choice.rapport) adjustRapport(session, contactId, choice.rapport);
  else adjustRapport(session, contactId, 5);
  const effectNotes = applyPhoneEffect(session, choice.effect, tracker);

  if (choice.next) {
    const nextNode = getCallNode(contactId, state.treeId, choice.next, ctx);
    if (nextNode) {
      thread.callState = { treeId: state.treeId, nodeId: choice.next, phase: "talking" };
      appendMessage(session, contactId, "in", `[Call] ${nextNode.text}`, { read: false });
      const ended = nextNode.end || !nextNode.choices?.length;
      if (ended) thread.callState = null;
      return {
        ok: true,
        ended,
        response: nextNode.text,
        egg: choice.egg ?? null,
        effectNotes,
        node: ended ? null : nextNode,
      };
    }
  }

  thread.callState = null;
  return {
    ok: true,
    ended: true,
    response: choice.response ?? "…",
    egg: choice.egg ?? null,
    effectNotes,
    node: null,
  };
}

/**
 * Hang up and clear call state.
 * @param {import("./core.js").PlayerSession} session
 * @param {string} contactId
 */
export function endCall(session, contactId) {
  clearCallState(session, contactId);
  return { ok: true };
}

export function getActiveCallNode(session, contactId) {
  const state = getCallState(session, contactId);
  if (!state) return null;
  const ctx = buildDialogueContext(session, contactId);
  const node = getCallNode(contactId, state.treeId, state.nodeId, ctx);
  if (!node || node.end) {
    clearCallState(session, contactId);
    return null;
  }
  return { ...node, phase: state.phase ?? "talking", treeId: state.treeId, nodeId: state.nodeId };
}

/**
 * Resolve a call menu choice (compat shim over advanceCall).
 * Pass `activeScript` from startCall so fallback / filtered choice indexes stay aligned.
 * @param {import("./core.js").PlayerSession} session
 * @param {string} contactId
 * @param {number} choiceIndex
 * @param {object|null} [activeScript]
 * @param {{ redeemComp?: Function }|null} [tracker]
 */
export function resolveCallChoice(session, contactId, choiceIndex, activeScript = null, tracker = null) {
  // If a multi-turn call is active, advance it.
  if (getCallState(session, contactId)) {
    const r = advanceCall(session, contactId, choiceIndex, tracker);
    return { response: r.response, egg: r.egg, effectNotes: r.effectNotes ?? [], ended: r.ended };
  }

  // Legacy path: one-shot script without callState (tests with explicit activeScript).
  const ctx = buildDialogueContext(session, contactId);
  const script = activeScript ?? getDynamicCallScript(contactId, ctx);
  const choices = script?.choices ?? [];
  const choice = choices[choiceIndex];
  if (!choice) return { response: "…Call dropped.", egg: null, effectNotes: [] };
  if (choice.egg) recordEasterEgg(session, choice.egg);
  if (choice.rapport) adjustRapport(session, contactId, choice.rapport);
  else adjustRapport(session, contactId, 5);
  const effectNotes = applyPhoneEffect(session, choice.effect, tracker);
  appendMessage(session, contactId, "in", `[Call] ${choice.response}`, { read: false });
  return { response: choice.response, egg: choice.egg, effectNotes };
}

/**
 * Start the multi-step wrong-number call tree (Dial 555-0199).
 * @param {import("./core.js").PlayerSession} session
 */
export function startWrongNumberCall(session) {
  const contactId = "chip_chandler";
  const thread = ensureThread(session, contactId);
  if (!thread) return { ok: false, message: "No phone book." };
  recordEasterEgg(session, WRONG_NUMBER.egg);
  const ctx = buildDialogueContext(session, contactId);
  const node = getCallNode(contactId, "wrong_number", "hello", ctx);
  thread.callCount += 1;
  thread.callState = { treeId: "wrong_number", nodeId: "hello", phase: "connecting", contactId: "wrong_number" };
  if (node) {
    appendMessage(session, contactId, "in", `[Wrong #] ${node.text}`, { read: false });
  }
  return { ok: true, contactId, node, opening: WRONG_NUMBER.opening, egg: WRONG_NUMBER.egg };
}

export function dialWrongNumber(session) {
  // Keep one-shot egg text for simple dial, and also seed the multi-step tree state
  // when the UI wants a full call experience via startWrongNumberCall.
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

// Legacy exports for tests / external references
export const TEXT_OPTIONS = {};
export const CALL_SCRIPTS = {};
