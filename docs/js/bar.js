/**
 * Resort bars — unified venue catalogs, FPV overlay ordering, bar-crawl tracking.
 * Casino lounges, Betty's Bar, Skyfall, Velvet Ledger, Beach Club, Foundation Room.
 */

import { CASINO_BARS, orderBarDrink } from "./casino-amenities.js";
import { CLUB_BAR, orderClubDrink, canEnterGentlemansClub } from "./gentlemans-club.js";
import { canEnterFoundationRoom } from "./venues.js";
import { recordConsumption, getIntoxicationLevel } from "./intoxication-effects.js";
import { adjustRapport } from "./phone-rapport.js";
import { ensurePoolComplex } from "./pool-complex.js";

export const BAR_CUTOFF_INTOX = 90;

/** @typedef {{ id: string, name: string, description: string, price: number }} BarDrink */
/** @typedef {{
 *   id: string, name: string, motif: string, icon: string,
 *   location: string, vibe: string, source: string,
 *   drinks: BarDrink[]
 * }} BarVenue */

const BAR_MOTIFS = {
  eyecandy: "sound-lounge",
  big_chill: "frozen-rail",
  rhythm_riiffs: "live-lounge",
  betty_bar: "lobby-bar",
  skyfall_lounge: "skyline",
  velvet_ledger: "velvet",
  pool_beach_club: "pool-deck",
  foundation_room: "noir",
};

const BAR_ICONS = {
  eyecandy: "🎶",
  big_chill: "🧊",
  rhythm_riiffs: "🎸",
  betty_bar: "🍸",
  skyfall_lounge: "🌃",
  velvet_ledger: "🥃",
  pool_beach_club: "🍹",
  foundation_room: "🖤",
};

const BETTY_BAR_DRINKS = [
  { id: "betty_comp_marg", name: "Betty's Comp Margarita", description: "Salted rim, house tequila — tier members get the wink.", price: 14 },
  { id: "betty_rail_whiskey", name: "Rail Whiskey Neat", description: "Two fingers. Betty pours heavy when you're losing.", price: 12 },
  { id: "betty_long_island", name: "Lobby Long Island", description: "Five liquors pretending to be one drink.", price: 16 },
  { id: "betty_shot_special", name: "Betty's Shot Special", description: "Whatever's open. No questions.", price: 8 },
];

const SKYFALL_DRINKS = [
  { id: "skyfall_sunset", name: "Skyfall Sunset", description: "Aperol, prosecco, mandarin — the Strip at golden hour.", price: 24 },
  { id: "skyfall_highball", name: "Penthouse Highball", description: "Japanese whisky, soda, yuzu — altitude in a glass.", price: 28 },
  { id: "skyfall_zero_gravity", name: "Zero Gravity", description: "Vodka, elderflower, butterfly pea — turns purple at the rim.", price: 22 },
  { id: "skyfall_champagne", name: "Moët by the Glass", description: "Bubbles above the bay. Dress code: confident.", price: 32 },
];

const POOL_BAR_DRINKS = [
  { id: "pool_beach_club_bar", name: "Frozen Mandalay Colada", description: "Pineapple, rum, souvenir tiki — pool tax included.", price: 18 },
  { id: "pool_mango_freeze", name: "Mango Wave Freeze", description: "Blended mango, coconut cream, SPF optional.", price: 16 },
  { id: "pool_cabana_spritz", name: "Cabana Aperol Spritz", description: "Orange bitter fizz for the sun deck elite.", price: 20 },
  { id: "pool_shark_bite", name: "Shark Bite Shot", description: "Blue curaçao, grenadine — reef-adjacent courage.", price: 12 },
];

const FOUNDATION_BAR_DRINKS = [
  { id: "foundation_old_fashioned", name: "Noir Old Fashioned", description: "Smoked bourbon, black walnut — Alexandra nods approval.", price: 34 },
  { id: "foundation_champagne", name: "Krug by the Glass", description: "Whisper-tier bubbles. No flash photography.", price: 55 },
  { id: "foundation_edible", name: "Foundation Room Edible", description: "Chef's chocolate square on a black napkin. Atmosphere shifts.", price: 45 },
  { id: "foundation_zero_proof", name: "Velvet Zero-Proof", description: "Seedlip, rosemary, truffle salt — still looks expensive.", price: 18 },
];

function casinoVenue(bar) {
  return {
    id: bar.id,
    name: bar.name,
    motif: BAR_MOTIFS[bar.id] ?? "live-lounge",
    icon: BAR_ICONS[bar.id] ?? "🍸",
    location: bar.location,
    vibe: bar.vibe,
    source: "casino",
    drinks: bar.drinks,
  };
}

/** @type {BarVenue[]} */
export const BAR_VENUES = [
  ...CASINO_BARS.map(casinoVenue),
  {
    id: "betty_bar",
    name: "Betty's Bar",
    motif: "lobby-bar",
    icon: "🍸",
    location: "Main casino lobby — steps from the slots",
    vibe: "Betty comps tier members, roasts everyone else, and knows your drink before you sit.",
    source: "betty",
    drinks: BETTY_BAR_DRINKS,
  },
  {
    id: "skyfall_lounge",
    name: "Skyfall Lounge",
    motif: "skyline",
    icon: "🌃",
    location: "Upper mezzanine — floor-to-ceiling Strip views",
    vibe: "Cocktails above the neon. Dress code enforced by the elevator.",
    source: "skyfall",
    drinks: SKYFALL_DRINKS,
  },
  {
    id: "velvet_ledger",
    name: "The Ledger Bar",
    motif: "velvet",
    icon: "🥃",
    location: "Inside The Velvet Ledger — Gentleman's Club",
    vibe: "Insanely stocked bottles, bottle service, and no photographs.",
    source: "club",
    drinks: CLUB_BAR,
  },
  {
    id: "pool_beach_club",
    name: "Mandalay Beach Club Bar",
    motif: "pool-deck",
    icon: "🍹",
    location: "Beach Club sun deck — 21+",
    vibe: "Frozen everything. European attitude. Sunscreen sold separately.",
    source: "pool",
    drinks: POOL_BAR_DRINKS,
  },
  {
    id: "foundation_room",
    name: "Foundation Room Bar",
    motif: "noir",
    icon: "🖤",
    location: "Noir members lounge — velvet rope",
    vibe: "Darkness has a cover charge. Whales murmur. Alexandra's comp list flickers.",
    source: "foundation",
    drinks: FOUNDATION_BAR_DRINKS,
  },
];

const VENUES_BY_ID = Object.fromEntries(BAR_VENUES.map((v) => [v.id, v]));
const DRINKS_BY_ID = Object.fromEntries(
  BAR_VENUES.flatMap((v) => v.drinks.map((d) => [d.id, { drink: d, venueId: v.id }])),
);

export const BAR_ENCOUNTERS = [
  {
    id: "betty_roast",
    category: "staff",
    weight: 3,
    minDrinks: 1,
    title: "Betty's Roast",
    body: "Betty slides a coaster over. \"You're drinking like someone who just discovered comps. Slow down — or don't. I get paid either way.\"",
    choices: [
      { id: "laugh", label: "Laugh it off", effect: { rapport: 2 } },
      { id: "tip", label: "Tip Betty", effect: { chips: -20, rapport: 4 } },
    ],
  },
  {
    id: "stranger_buy_round",
    category: "stranger",
    weight: 3,
    minDrinks: 2,
    title: "Mystery Round",
    body: "A stranger at the rail buys your next round. They vanish before you can thank them — or invoice them.",
    choices: [
      { id: "accept", label: "Accept graciously", effect: { chips: 25 } },
      { id: "toast", label: "Toast the ghost", effect: { score: 10 } },
    ],
  },
  {
    id: "live_band",
    category: "atmosphere",
    weight: 2,
    minDrinks: 1,
    title: "Live Set Drops",
    body: "The house band hits the chorus. The bartender turns the lights down half a notch. Everyone pretends they planned to be here.",
    choices: [
      { id: "vibe", label: "Stay for the set", effect: { score: 15 } },
      { id: "dance", label: "Dance badly", effect: { score: 8, rapport: 1 } },
    ],
  },
  {
    id: "high_roller_spot",
    category: "vip",
    weight: 2,
    minDrinks: 3,
    title: "High Roller Spotted",
    body: "Someone from the salon recognizes your face at the rail. \"Still on Sapphire?\" They signal the bartender — your tab might get interesting.",
    choices: [
      { id: "flex", label: "Order top shelf", effect: { chips: -40, score: 20 } },
      { id: "nod", label: "Nod and sip water", effect: { score: 5 } },
    ],
  },
];

export function defaultBarState() {
  return {
    visits: 0,
    lifetimeDrinks: 0,
    venueVisits: {},
    orders: [],
    unlockedEggs: [],
  };
}

export function ensureBar(session) {
  if (!session.bar) session.bar = defaultBarState();
  return session.bar;
}

export function attachBarToSession(session, data = {}) {
  const raw = data.bar ?? {};
  session.bar = {
    ...defaultBarState(),
    ...raw,
    venueVisits: { ...(raw.venueVisits ?? {}) },
    orders: [...(raw.orders ?? [])],
    unlockedEggs: [...(raw.unlockedEggs ?? [])],
  };
  return session.bar;
}

export function getBarVenueById(id) {
  return VENUES_BY_ID[id] ?? null;
}

export function canEnterBar(session) {
  const intox = getIntoxicationLevel(session);
  if (intox >= BAR_CUTOFF_INTOX) {
    return { ok: false, message: "Security and the bartender agree: you're cut off. Text Betty for a roast, not another round." };
  }
  return { ok: true };
}

export function canEnterBarVenue(session, venueId) {
  const gate = canEnterBar(session);
  if (!gate.ok) return gate;
  const venue = getBarVenueById(venueId);
  if (!venue) return { ok: false, message: "Unknown bar." };
  if (venue.id === "velvet_ledger") return canEnterGentlemansClub(session);
  if (venue.id === "foundation_room") return canEnterFoundationRoom(session);
  if (venue.id === "pool_beach_club") {
    const pc = ensurePoolComplex(session);
    if (!pc.flags.beach_club_pass) {
      return { ok: false, message: "Beach Club cover required — enter the Beach Club zone first." };
    }
  }
  return { ok: true, venue };
}

export function createBarRound(venueId) {
  return {
    venueId,
    drinksOrdered: [],
    tab: 0,
    score: 0,
    drinksThisRound: 0,
    closed: false,
    busted: false,
    pendingEncounter: null,
    lastMessage: "Bell up — what are you having?",
  };
}

function encounterChance(round) {
  const base = 8 + round.drinksThisRound * 12;
  return Math.min(65, base);
}

function rollEncounter(round) {
  if (round.pendingEncounter) return null;
  const eligible = BAR_ENCOUNTERS.filter((e) => round.drinksThisRound >= e.minDrinks);
  if (!eligible.length) return null;
  const chance = encounterChance(round);
  if (Math.random() * 100 > chance) return null;
  const total = eligible.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const enc of eligible) {
    r -= enc.weight;
    if (r <= 0) return enc;
  }
  return eligible[eligible.length - 1];
}

/**
 * @param {import("./core.js").PlayerSession} session
 * @param {string} venueId
 * @param {string} drinkId
 * @param {object} round
 */
export function orderBarVenueDrink(session, venueId, drinkId, round) {
  const venue = getBarVenueById(venueId);
  if (!venue) return { ok: false, message: "Unknown bar." };
  const drink = venue.drinks.find((d) => d.id === drinkId);
  if (!drink) return { ok: false, message: "Not on the menu." };

  let result;
  if (venue.source === "casino") {
    result = orderBarDrink(session, drinkId);
  } else if (venue.source === "club") {
    result = orderClubDrink(session, drinkId);
  } else {
    if (!session.wallet.debit(drink.price, "bar", `${drink.name} @ ${venue.name}`)) {
      return { ok: false, message: `Insufficient chips — ${drink.name} is $${drink.price.toLocaleString()}.` };
    }
    ensureBar(session).orders.push({ venueId, drinkId, ts: Date.now() });
    session.recordVisit("bar");
    if (drinkId !== "foundation_edible") {
      recordConsumption(session, drinkId, { source: venue.source });
    } else {
      recordConsumption(session, "foundation_edible", { source: "foundation_room" });
    }
    result = {
      ok: true,
      message: `${drink.name} served at ${venue.name} — $${drink.price.toLocaleString()}.`,
    };
  }

  if (!result.ok) return result;

  round.drinksOrdered.push(drinkId);
  round.drinksThisRound += 1;
  round.tab += drink.price;
  round.score += 5 + Math.floor(drink.price / 10);
  round.lastMessage = result.message;

  const bar = ensureBar(session);
  bar.lifetimeDrinks += 1;
  bar.venueVisits[venueId] = (bar.venueVisits[venueId] ?? 0) + 1;
  bar.orders.push({ venueId, drinkId, ts: Date.now() });

  const enc = rollEncounter(round);
  if (enc) round.pendingEncounter = enc;

  return { ok: true, message: result.message, drink, encounter: enc ?? null };
}

export function resolveBarEncounter(session, round, choiceId) {
  const enc = round.pendingEncounter;
  if (!enc) return { ok: false, message: "No encounter pending." };
  const choice = enc.choices.find((c) => c.id === choiceId);
  if (!choice) return { ok: false, message: "Invalid choice." };
  round.pendingEncounter = null;
  const eff = choice.effect ?? {};
  if (eff.chips) {
    if (eff.chips > 0) session.wallet.credit(eff.chips, "bar", enc.title);
    else session.wallet.debit(-eff.chips, "bar", enc.title);
  }
  if (eff.score) round.score += eff.score;
  if (eff.rapport) adjustRapport(session, "barkeep_betty", eff.rapport);
  round.lastMessage = `${enc.title} — ${choice.label}.`;
  return { ok: true, message: round.lastMessage };
}

export function settleBarRound(session, round) {
  round.closed = true;
  const venue = getBarVenueById(round.venueId);
  ensureBar(session).visits += 1;
  return {
    ok: true,
    message: `Last call at ${venue?.name ?? "the bar"}. ${round.drinksThisRound} drink(s) · tab $${round.tab.toLocaleString()} · score ${round.score}.`,
    score: round.score,
    drinks: round.drinksThisRound,
  };
}

export function barForDrinkId(drinkId) {
  const entry = DRINKS_BY_ID[drinkId];
  return entry ? getBarVenueById(entry.venueId) : null;
}
