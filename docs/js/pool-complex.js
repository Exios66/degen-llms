import { secureRandomInt, fmtChips } from "./core.js";
import { isNetPositive } from "./hotel.js";
import { recordConsumption, POOL_CONSUMABLE_IDS } from "./intoxication-effects.js";

/** @typedef {{ ok: boolean, message: string, unlock?: string }} PoolResult */

export const POOL_ZONES = {
  wave_pool: {
    id: "wave_pool",
    label: "Wave Pool",
    description: "Eleven acres of artificial surf. The wave machine hums like a slot reel.",
  },
  hot_tubs: {
    id: "hot_tubs",
    label: "Hot Tubs",
    description: "Steaming circles of gossip, chlorine, and questionable life choices.",
  },
  cabanas: {
    id: "cabanas",
    label: "Private Cabanas",
    description: "Rope-off luxury. Bottle service implied. Dignity optional.",
  },
  shark_reef: {
    id: "shark_reef",
    label: "Shark Reef Aquarium",
    description: "Sand tiger sharks glide behind acrylic. Children press faces to the glass. You relate.",
  },
  beach_club: {
    id: "beach_club",
    label: "Topless Beach Club",
    description: "21+ European-style pool deck. Cover charge enforced. Confidence recommended.",
    requiresAge: 21,
  },
  beach_rave: {
    id: "beach_rave",
    label: "Beach Rave",
    description: "Neon after dark. DJ, glow sticks, and the wave pool lit like a fever dream.",
  },
};

export const SHARK_SPECIES = {
  sand_tiger: { id: "sand_tiger", label: "Sand tiger shark", points: 1 },
  green_sea_turtle: { id: "green_sea_turtle", label: "Green sea turtle", points: 1 },
  sawfish: { id: "sawfish", label: "Largetooth sawfish", points: 2 },
  golden_ray: { id: "golden_ray", label: "Golden cownose ray", points: 1 },
  jellyfish: { id: "jellyfish", label: "Pacific sea nettle", points: 1 },
};

const WAVE_TIMING = ["Jump early", "Ride the crest", "Bail late"];

export const POOL_EVENTS = {
  first_splash: {
    id: "first_splash",
    label: "First Splash",
    narrative: "The wave catches you perfectly. Chlorinated triumph.",
    requires: { zones: ["wave_pool"] },
  },
  steam_and_chips: {
    id: "steam_and_chips",
    label: "Steam & Chips",
    narrative: "Hot tub gossip confirms your blackjack run. The bubbles applaud.",
    requires: { zones: ["hot_tubs"], netPositive: true },
  },
  cabana_king: {
    id: "cabana_king",
    label: "Cabana King",
    narrative: "Your cabana. Your rules. The ice bucket respects you.",
    requires: { flags: ["cabana_booked"] },
  },
  reef_photographer: {
    id: "reef_photographer",
    label: "Reef Photographer",
    narrative: "Five species captured. The gift shop sells your enthusiasm back to you.",
    requires: { sharkPhotos: 5 },
  },
  beach_club_initiate: {
    id: "beach_club_initiate",
    label: "Beach Club Initiate",
    narrative: "You survived the rope line. The sun deck nods approvingly.",
    requires: { zones: ["beach_club"] },
  },
  rave_til_dawn: {
    id: "rave_til_dawn",
    label: "Rave Til Dawn",
    narrative: "Glow sticks, bass drops, and a wave pool that shouldn't exist at 2 AM.",
    requires: { zones: ["beach_rave"], flags: ["rave_danced"] },
  },
  eleven_acres: {
    id: "eleven_acres",
    label: "Eleven Acres Conquered",
    narrative: "Every zone in the complex. The lifeguard salutes. You need a nap.",
    requires: { zones: ["wave_pool", "hot_tubs", "cabanas", "shark_reef", "beach_club", "beach_rave"] },
  },
  steve_at_the_reef: {
    id: "steve_at_the_reef",
    label: "Steve at the Reef",
    narrative: "Steve Harvey narrates the shark tunnel like Family Feud. Survey says… apex predator!",
    requires: { zones: ["shark_reef"], flags: ["steve_reef_rumor"] },
  },
};

export function defaultPoolComplexState(overrides = {}) {
  return {
    visitedZones: overrides.visitedZones ?? [],
    actionLog: overrides.actionLog ?? [],
    unlockedEvents: overrides.unlockedEvents ?? [],
    flags: overrides.flags ?? {},
    waveWins: overrides.waveWins ?? 0,
    ringTossWins: overrides.ringTossWins ?? 0,
    sharkPhotos: overrides.sharkPhotos ?? [],
    hotTubSoaks: overrides.hotTubSoaks ?? 0,
    waveTarget: overrides.waveTarget ?? null,
    raveMoves: overrides.raveMoves ?? [],
    raveStep: overrides.raveStep ?? 0,
    ...overrides,
  };
}

export function ensurePoolComplex(session) {
  if (!session.poolComplex) {
    session.poolComplex = defaultPoolComplexState();
  }
  const defaults = defaultPoolComplexState();
  const pc = session.poolComplex;
  for (const key of Object.keys(defaults)) {
    if (pc[key] === undefined) pc[key] = defaults[key];
  }
  if (!pc.flags) pc.flags = {};
  return pc;
}

export function attachPoolComplexToSession(session, data) {
  if (data.poolComplex) {
    session.poolComplex = { ...defaultPoolComplexState(), ...data.poolComplex };
  } else {
    ensurePoolComplex(session);
  }
}

function hasAll(haystack, needles) {
  return needles.every((n) => haystack.includes(n));
}

function eventRequirementsMet(session, pc, event) {
  const req = event.requires;
  if (req.zones && !hasAll(pc.visitedZones, req.zones)) return false;
  if (req.sharkPhotos && pc.sharkPhotos.length < req.sharkPhotos) return false;
  if (req.flags && !req.flags.every((f) => pc.flags[f])) return false;
  if (req.netPositive && !isNetPositive(session)) return false;
  return true;
}

function tryUnlockEvents(session) {
  const pc = ensurePoolComplex(session);
  const unlocked = [];
  for (const event of Object.values(POOL_EVENTS)) {
    if (pc.unlockedEvents.includes(event.id)) continue;
    if (!eventRequirementsMet(session, pc, event)) continue;
    pc.unlockedEvents.push(event.id);
    pc.actionLog.push(event.narrative);
    unlocked.push(event);
  }
  return unlocked;
}

function visitZone(session, zoneId) {
  const pc = ensurePoolComplex(session);
  if (!pc.visitedZones.includes(zoneId)) {
    pc.visitedZones.push(zoneId);
  }
  return tryUnlockEvents(session);
}

function finishResult(session, message, unlocked = []) {
  let msg = message;
  if (unlocked.length) {
    msg += `\n\n✦ Unlocked: ${unlocked.map((e) => e.label).join(", ")}`;
  }
  return { ok: true, message: msg, unlock: unlocked[0]?.id };
}

/** @returns {PoolResult} */
export function enterZone(session, zoneId) {
  const zone = POOL_ZONES[zoneId];
  if (!zone) return { ok: false, message: "That's a maintenance closet." };
  const unlocked = visitZone(session, zoneId);
  return finishResult(session, `${zone.label}\n${zone.description}`, unlocked);
}

/** @returns {PoolResult} */
export function playCatchWave(session, timingIndex) {
  const pc = ensurePoolComplex(session);
  visitZone(session, "wave_pool");
  if (pc.waveTarget === null) {
    pc.waveTarget = secureRandomInt(0, WAVE_TIMING.length - 1);
  }
  const pick = WAVE_TIMING[timingIndex];
  if (!pick) return { ok: false, message: "Pick a timing." };
  const correct = timingIndex === pc.waveTarget;
  pc.waveTarget = secureRandomInt(0, WAVE_TIMING.length - 1);
  if (correct) {
    pc.waveWins += 1;
    const payout = 25;
    session.wallet.credit(payout, "pool", "Wave pool ride");
    const unlocked = tryUnlockEvents(session);
    return finishResult(
      session,
      `${pick} — PERFECT! The wave lifts you. +${fmtChips(payout)}.\nChlorinated glory.`,
      unlocked,
    );
  }
  return { ok: true, message: `${pick} — mistimed. The wave eats you. Try again.` };
}

/** @returns {PoolResult} */
export function playRingToss(session, bet, ringIndex) {
  const pc = ensurePoolComplex(session);
  visitZone(session, "wave_pool");
  if (bet < 10) return { ok: false, message: "Minimum $10 ring toss." };
  if (!session.wallet.debit(bet, "pool", "Ring toss")) {
    return { ok: false, message: `Need ${fmtChips(bet)} for rings.` };
  }
  const rings = ["Inner tube", "Lifeguard tower", "Cabana post"];
  const pick = rings[ringIndex];
  if (!pick) return { ok: false, message: "Pick a target." };
  const roll = secureRandomInt(1, 10);
  if (roll >= 8) {
    const payout = bet * 3;
    session.wallet.credit(payout, "pool", "Ring toss winner");
    pc.ringTossWins += 1;
    const unlocked = tryUnlockEvents(session);
    return finishResult(session, `${pick} — RINGER! +${fmtChips(payout)}.`, unlocked);
  }
  if (roll >= 5) {
    session.wallet.credit(bet, "pool", "Ring toss push");
    return { ok: true, message: `${pick} — close! Bet returned.` };
  }
  return { ok: true, message: `${pick} — splash. Ring sunk. House keeps ${fmtChips(bet)}.` };
}

/** @returns {PoolResult} */
export function photographShark(session, speciesId) {
  const pc = ensurePoolComplex(session);
  visitZone(session, "shark_reef");
  const species = SHARK_SPECIES[speciesId];
  if (!species) return { ok: false, message: "That species migrated." };
  if (pc.sharkPhotos.includes(speciesId)) {
    return { ok: true, message: `${species.label} already in your camera roll.` };
  }
  pc.sharkPhotos.push(speciesId);
  const unlocked = tryUnlockEvents(session);
  return finishResult(
    session,
    `📷 ${species.label} captured! (${pc.sharkPhotos.length}/5 species)`,
    unlocked,
  );
}

/** @returns {PoolResult} */
export function soakHotTub(session, choiceId) {
  visitZone(session, "hot_tubs");
  const pc = ensurePoolComplex(session);
  pc.hotTubSoaks += 1;
  const options = {
    gossip: {
      message: "Overheard: Steve Harvey was at the reef yesterday narrating sharks. Survey says… fish!",
      flag: "steve_reef_rumor",
    },
    relax: { message: "You soak until your chips feel lighter. They aren't. You are.", flag: null },
    challenge: { message: "A stranger bets you can't last ten minutes without checking sportsbook odds. You last four.", flag: null },
  };
  const opt = options[choiceId];
  if (!opt) return { ok: false, message: "Pick a soak option." };
  if (opt.flag) pc.flags[opt.flag] = true;
  const unlocked = tryUnlockEvents(session);
  return finishResult(session, opt.message, unlocked);
}

/** @returns {PoolResult} */
export function bookCabana(session) {
  visitZone(session, "cabanas");
  const pc = ensurePoolComplex(session);
  if (pc.flags.cabana_booked) {
    return { ok: true, message: "Your cabana awaits. Bottle service on speed dial." };
  }
  const cost = 200;
  if (!session.wallet.debit(cost, "pool", "Cabana rental")) {
    return { ok: false, message: `Cabana requires ${fmtChips(cost)} or a Pearl+ comp.` };
  }
  pc.flags.cabana_booked = true;
  const unlocked = tryUnlockEvents(session);
  return finishResult(session, `Cabana secured for ${fmtChips(cost)}. Privacy, shade, and judgment-free naps.`, unlocked);
}

/** @returns {PoolResult} */
export function cabanaService(session, serviceId) {
  const pc = ensurePoolComplex(session);
  if (!pc.flags.cabana_booked) {
    return { ok: false, message: "Book a cabana first." };
  }
  const services = {
    bottle: { price: 85, message: "Champagne arrives on ice. The cabana approves." },
    nap: { price: 0, message: "You nap through the afternoon heat. Smart money." },
    people_watch: { price: 0, message: "You people-watch the wave pool. Entertainment is free." },
  };
  const svc = services[serviceId];
  if (!svc) return { ok: false, message: "Unknown service." };
  if (svc.price && !session.wallet.debit(svc.price, "pool", "Cabana service")) {
    return { ok: false, message: `Need ${fmtChips(svc.price)}.` };
  }
  if (serviceId === "bottle") {
    recordConsumption(session, POOL_CONSUMABLE_IDS.bottle, { source: "pool_cabana" });
  }
  return { ok: true, message: svc.message };
}

/** @returns {PoolResult} */
export function enterBeachClub(session) {
  visitZone(session, "beach_club");
  const pc = ensurePoolComplex(session);
  if (pc.flags.beach_club_pass) {
    const unlocked = tryUnlockEvents(session);
    return finishResult(session, "Welcome back to the beach club. The rope remembers you.", unlocked);
  }
  const cover = 75;
  if (!session.wallet.debit(cover, "pool", "Beach club cover")) {
    return { ok: false, message: `Cover charge: ${fmtChips(cover)}. Confidence sold separately.` };
  }
  pc.flags.beach_club_pass = true;
  const unlocked = tryUnlockEvents(session);
  return finishResult(
    session,
    `Cover paid (${fmtChips(cover)}). European-style deck. 21+ enforced. Sunscreen optional.`,
    unlocked,
  );
}

/** @returns {PoolResult} */
export function beachClubAction(session, actionId) {
  if (!ensurePoolComplex(session).flags.beach_club_pass) {
    return enterBeachClub(session);
  }
  const actions = {
    bar: { price: 18, message: "Frozen cocktail that costs more than your first apartment." },
    sun_deck: { price: 0, message: "You claim a lounger. The Vegas sun files a tax return on your skin." },
    vip_rope: { price: 50, message: "VIP section. Fewer people, same bad decisions." },
  };
  const act = actions[actionId];
  if (!act) return { ok: false, message: "Pick an action." };
  if (act.price && !session.wallet.debit(act.price, "pool", "Beach club")) {
    return { ok: false, message: `Need ${fmtChips(act.price)}.` };
  }
  if (actionId === "bar") {
    recordConsumption(session, POOL_CONSUMABLE_IDS.bar, { source: "pool_beach_club" });
  }
  return { ok: true, message: act.message };
}

/** @returns {PoolResult} */
export function startRaveDance(session) {
  visitZone(session, "beach_rave");
  const pc = ensurePoolComplex(session);
  pc.raveMoves = [secureRandomInt(0, 2), secureRandomInt(0, 2), secureRandomInt(0, 2)];
  pc.raveStep = 0;
  return { ok: true, message: "The DJ drops bass. Match three moves: Fist pump, Shuffling, Glow spin." };
}

/** @returns {PoolResult} */
export function submitRaveMove(session, moveIndex) {
  const pc = ensurePoolComplex(session);
  if (!pc.raveMoves.length) return startRaveDance(session);
  const moves = ["Fist pump", "Shuffling", "Glow spin"];
  if (pc.raveMoves[pc.raveStep] !== moveIndex) {
    pc.raveMoves = [];
    pc.raveStep = 0;
    return { ok: true, message: `${moves[moveIndex] ?? "?"} — off beat. Crowd wobbles. Try again.` };
  }
  pc.raveStep += 1;
  if (pc.raveStep >= pc.raveMoves.length) {
    pc.flags.rave_danced = true;
    pc.raveMoves = [];
    pc.raveStep = 0;
    const payout = 40;
    session.wallet.credit(payout, "pool", "Beach rave");
    const unlocked = tryUnlockEvents(session);
    return finishResult(session, `Sequence hit! The wave pool glows. +${fmtChips(payout)}.`, unlocked);
  }
  return { ok: true, message: `${moves[moveIndex]} — on beat! ${pc.raveStep + 1}/3…` };
}

export function getPoolSummary(session) {
  const pc = ensurePoolComplex(session);
  const parts = [];
  if (pc.visitedZones.length) parts.push(`${pc.visitedZones.length}/6 zones`);
  if (pc.sharkPhotos.length) parts.push(`${pc.sharkPhotos.length}/5 reef photos`);
  if (pc.unlockedEvents.length) parts.push(`${pc.unlockedEvents.length} event(s)`);
  if (pc.flags.cabana_booked) parts.push("cabana booked");
  return parts.length ? parts.join(" · ") : "Eleven acres await.";
}

export function getUnlockedPoolEvents(session) {
  const pc = ensurePoolComplex(session);
  return pc.unlockedEvents.map((id) => POOL_EVENTS[id]).filter(Boolean);
}
