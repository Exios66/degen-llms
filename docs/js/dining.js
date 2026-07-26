/**
 * Resort dining — venue catalogs, capacity minigame, drink-scaled encounters.
 * Shared by the web terminal overlay and (via HostedEncounters) the pixel RPG.
 */

import { recordConsumption, getIntoxicationLevel, isHeightenedIntoxication } from "./intoxication-effects.js";

export const FULLNESS_MAX = 100;
export const COMPOSURE_MAX = 100;
export const DINING_CUTOFF_INTOX = 85;

/** @typedef {"food" | "drink" | "extra"} MenuKind */

/**
 * @typedef {{
 *   id: string, name: string, description: string, price: number,
 *   kind: MenuKind, satiation?: number, prestige?: number, potencyId?: string
 * }} MenuItem
 */

/**
 * @typedef {{
 *   id: string, name: string, chef: string, type: string, motif: string,
 *   icon: string, description: string, priceRange: string, hours: string,
 *   location: string, menu: MenuItem[]
 * }} DiningVenue
 */

/** @type {DiningVenue[]} */
export const DINING_VENUES = [
  {
    id: "aureole",
    name: "Aureole",
    chef: "Charlie Palmer",
    type: "American fine dining",
    motif: "wine-tower",
    icon: "🍷",
    description:
      "Four-story wine tower with roaming 'wine angels' on harness. Seasonal tasting menus, " +
      "dry-aged steaks, and the most theatrical wine service on the Strip.",
    priceRange: "$$$$$",
    hours: "Dinner nightly",
    location: "Mandalay Bay Resort — east lobby",
    menu: [
      { id: "aur_amuse", name: "Amuse-Bouche Flight", description: "Three tiny bites that cost more than your first apartment.", price: 28, kind: "food", satiation: 6, prestige: 2 },
      { id: "aur_tasting", name: "Seasonal Tasting Menu", description: "Seven courses. The wine angel winks between pours.", price: 185, kind: "food", satiation: 28, prestige: 5 },
      { id: "aur_steak", name: "Dry-Aged Ribeye", description: "Forty-five days of patience. Ten minutes of glory.", price: 96, kind: "food", satiation: 22, prestige: 4 },
      { id: "aur_tower_pour", name: "Wine Angel Tower Pour", description: "They rappel for your Cabernet. Tip accordingly.", price: 65, kind: "drink", satiation: 2, prestige: 5, potencyId: "dining_aureole_cab" },
      { id: "aur_champagne", name: "Krug Grande Cuvée Glass", description: "Bubbles that make strangers introduce themselves.", price: 48, kind: "drink", satiation: 1, prestige: 4, potencyId: "dining_aureole_krug" },
      { id: "aur_dessert", name: "Chocolate Sphere Spectacle", description: "Hot sauce poured tableside. Applause optional.", price: 32, kind: "extra", satiation: 10, prestige: 3 },
    ],
  },
  {
    id: "border_grill",
    name: "Border Grill",
    chef: "Mary Sue Milliken & Susan Feniger",
    type: "Modern Mexican",
    motif: "poolside",
    icon: "🌮",
    description:
      "Bold, chef-driven Mexican from the legendary 'Too Hot Tamales.' Floor-to-ceiling windows " +
      "overlook the Mandalay Beach lazy river — ideal for Border Brunch.",
    priceRange: "$$$$",
    hours: "Brunch & dinner daily",
    location: "Mandalay Bay Resort — poolside",
    menu: [
      { id: "bg_guacamole", name: "Tableside Guacamole", description: "Mashed with confidence and too much lime.", price: 18, kind: "food", satiation: 8, prestige: 1 },
      { id: "bg_ceviche", name: "Ceviche Trio", description: "Bright, acidic, and judgmental about your pace.", price: 24, kind: "food", satiation: 10, prestige: 2 },
      { id: "bg_brunch", name: "Border Brunch Feast", description: "Bottomless energy. Finite stomach.", price: 55, kind: "food", satiation: 26, prestige: 3 },
      { id: "bg_enchiladas", name: "Chicken Enchiladas Suizas", description: "Comfort food wearing a resort badge.", price: 32, kind: "food", satiation: 20, prestige: 2 },
      { id: "bg_margarita", name: "House Margarita", description: "Pool-adjacent danger in a salted rim.", price: 16, kind: "drink", satiation: 2, prestige: 1, potencyId: "dining_border_marg" },
      { id: "bg_mezcal", name: "Mezcal Flight", description: "Smoke, citrus, and poor decision-making.", price: 28, kind: "drink", satiation: 1, prestige: 3, potencyId: "dining_border_mezcal" },
      { id: "bg_bottomless", name: "Bottomless Brunch Pour", description: "The server stops asking. You do not.", price: 22, kind: "extra", satiation: 3, prestige: 2, potencyId: "dining_border_bottomless" },
    ],
  },
  {
    id: "stripsteak",
    name: "Stripsteak",
    chef: "Michael Mina",
    type: "Contemporary steakhouse",
    motif: "steakhouse",
    icon: "🥩",
    description:
      "Michael Mina's flagship Vegas steakhouse: USDA prime and wagyu beef, duck-fat fries, " +
      "and a craft cocktail program that rivals the best bars on the Strip.",
    priceRange: "$$$$$",
    hours: "Dinner nightly",
    location: "Mandalay Bay Resort — casino level",
    menu: [
      { id: "ss_oysters", name: "Oysters on Ice", description: "A dozen reasons to order another cocktail.", price: 42, kind: "food", satiation: 8, prestige: 3 },
      { id: "ss_wagyu", name: "A5 Wagyu Strip", description: "Marbled like a high-limit carpet.", price: 145, kind: "food", satiation: 24, prestige: 5 },
      { id: "ss_prime", name: "USDA Prime Bone-In Ribeye", description: "The classic. The reason this place exists.", price: 89, kind: "food", satiation: 22, prestige: 4 },
      { id: "ss_fries", name: "Duck-Fat Fries Tower", description: "A vertical monument to excess.", price: 18, kind: "extra", satiation: 14, prestige: 2 },
      { id: "ss_old_fashioned", name: "Barrel-Aged Old Fashioned", description: "Smoke, oak, and table-side swagger.", price: 26, kind: "drink", satiation: 1, prestige: 3, potencyId: "dining_strip_of" },
      { id: "ss_martini", name: "Dirty Martini", description: "Olives that have seen things.", price: 22, kind: "drink", satiation: 1, prestige: 2, potencyId: "dining_strip_martini" },
      { id: "ss_cheesecake", name: "Basque Cheesecake", description: "Burnt top, soft middle — like your bankroll.", price: 16, kind: "food", satiation: 12, prestige: 2 },
    ],
  },
];

const VENUES_BY_ID = Object.fromEntries(DINING_VENUES.map((v) => [v.id, v]));
const ITEMS_BY_ID = Object.fromEntries(
  DINING_VENUES.flatMap((v) => v.menu.map((item) => [item.id, { item, venueId: v.id }])),
);

/** Encounter catalog — satirical social roulette. */
export const DINING_ENCOUNTERS = [
  {
    id: "stranger_crypto",
    category: "stranger",
    weight: 3,
    minDrinks: 0,
    title: "Crypto Bro at Two O'Clock",
    body: "A stranger slides over. \"Bro, hear me out — dinner as an NFT.\" He tips you chips for listening, then vanishes into the wine list.",
    choices: [
      { id: "listen", label: "Humor him", effect: { chips: 40, composure: 5 } },
      { id: "block", label: "Signal the waiter", effect: { composure: 10 } },
    ],
  },
  {
    id: "stranger_wedding",
    category: "stranger",
    weight: 2,
    minDrinks: 1,
    title: "Wedding Crashers",
    body: "A bridal party mistakes your table for the rehearsal dinner. Someone pins a boutonniere to your jacket.",
    choices: [
      { id: "toast", label: "Join the toast", effect: { chips: -25, score: 15, composure: -5 } },
      { id: "photo", label: "Pose for the photo", effect: { egg: "dining_wedding_photo", score: 20 } },
    ],
  },
  {
    id: "stranger_tourist",
    category: "stranger",
    weight: 3,
    minDrinks: 0,
    title: "Lost Tourists",
    body: "A couple asks if Aureole is \"the place with the sharks.\" You redirect them. They leave a grateful tip on your bread plate.",
    choices: [
      { id: "help", label: "Give perfect directions", effect: { chips: 15, composure: 5 } },
      { id: "sharks", label: "Send them to Shark Reef", effect: { score: 10 } },
    ],
  },
  {
    id: "stranger_rival",
    category: "stranger",
    weight: 2,
    minDrinks: 2,
    title: "Rival High Roller",
    body: "Someone from the High Limit salon recognizes your face. \"Still chasing 401K Contribution tier?\" They buy a round — or call your bluff.",
    choices: [
      { id: "accept", label: "Accept the round", effect: { chips: -0, drinkBoost: 1, score: 10 } },
      { id: "raise", label: "Raise with dessert", effect: { chips: -40, score: 25, prestigeFlex: true } },
    ],
  },
  {
    id: "escort_champagne",
    category: "escort",
    weight: 2,
    minDrinks: 2,
    title: "Champagne Upsell Ambush",
    body: "A glamorous stranger compliments your order, then the sommelier appears with a $400 bottle \"they insisted on.\" Consent check: you can decline.",
    choices: [
      { id: "decline", label: "Decline politely", effect: { composure: 15, score: 5 } },
      { id: "split", label: "Split a glass, nothing more", effect: { chips: -60, drinkBoost: 1, score: 15 } },
      { id: "comp", label: "Ask Betty to comp the awkwardness", effect: { egg: "dining_betty_bailout", composure: 10 } },
    ],
  },
  {
    id: "escort_pit_boss",
    category: "escort",
    weight: 1,
    minDrinks: 3,
    title: "Pit Boss in Disguise",
    body: "Your charming dinner companion flashes a pit badge under the napkin. \"Surveillance liked your composure. Here's a marker.\"",
    choices: [
      { id: "marker", label: "Take the marker", effect: { chips: 120, egg: "dining_pit_marker" } },
      { id: "laugh", label: "Laugh it off", effect: { score: 20, composure: 5 } },
    ],
  },
  {
    id: "escort_negotiation",
    category: "escort",
    weight: 2,
    minDrinks: 3,
    title: "Negotiation Gag",
    body: "Someone pitches \"dinner companionship rates\" like a timeshare. You negotiate them down to a dessert recommendation and mutual respect.",
    choices: [
      { id: "negotiate", label: "Negotiate to dessert intel", effect: { score: 25, composure: 10 } },
      { id: "exit", label: "Ask for the check energy", effect: { composure: 20 } },
    ],
  },
  {
    id: "celeb_fries",
    category: "celebrity",
    weight: 2,
    minDrinks: 1,
    title: "Celebrity Fry Theft",
    body: "A recognizable face leans over and steals a duck-fat fry. Paparazzi flash. Your composure is now content.",
    choices: [
      { id: "share", label: "Share the tower", effect: { score: 30, egg: "dining_celeb_fries" } },
      { id: "autograph", label: "Trade fries for an autograph", effect: { chips: 50, score: 15 } },
    ],
  },
  {
    id: "celeb_cameo",
    category: "celebrity",
    weight: 2,
    minDrinks: 2,
    title: "Absurd Cameo",
    body: "A mid-tier reality star is filming a \"casual dinner\" bit at the next table. They need an extra. You are available and slightly shiny.",
    choices: [
      { id: "cameo", label: "Do the cameo", effect: { chips: 75, egg: "dining_reality_cameo", composure: -10 } },
      { id: "pass", label: "Stay mysterious", effect: { score: 10, composure: 10 } },
    ],
  },
  {
    id: "celeb_autograph",
    category: "celebrity",
    weight: 1,
    minDrinks: 0,
    title: "Autograph for Chips",
    body: "A touring comedian offers a napkin autograph if you cover their sparkling water. Fair trade in this economy.",
    choices: [
      { id: "deal", label: "Make the deal", effect: { chips: -20, score: 20, egg: "dining_napkin_autograph" } },
      { id: "pass", label: "Keep your chips", effect: { composure: 5 } },
    ],
  },
  {
    id: "staff_wine_angel",
    category: "staff",
    weight: 1,
    minDrinks: 1,
    title: "Wine Angel Interlude",
    body: "A harnessed wine angel lowers to eye level. \"You've been pacing well. Secret pour — on the house.\"",
    choices: [
      { id: "accept", label: "Accept the secret pour", effect: { drinkBoost: 1, score: 35, egg: "dining_wine_angel" } },
      { id: "tip", label: "Tip extravagantly instead", effect: { chips: -80, score: 40, composure: 15 } },
    ],
  },
  {
    id: "staff_whale_host",
    category: "staff",
    weight: 1,
    minDrinks: 2,
    title: "Whale Host Drop-In",
    body: "Your host appears with complimentary amuse bites and a knowing look. \"The book says you're heating up.\"",
    choices: [
      { id: "comp", label: "Take the comps", effect: { chips: 60, score: 15 } },
      { id: "intel", label: "Ask for kitchen gossip", effect: { egg: "dining_kitchen_gossip", score: 25 } },
    ],
  },
];

export const DINING_EGGS = {
  dining_wedding_photo: "Boutonniere banquet — wedding photo on your stats brag reel.",
  dining_betty_bailout: "Betty bailed you out of a champagne ambush via text.",
  dining_pit_marker: "Pit boss marker earned over duck-fat diplomacy.",
  dining_celeb_fries: "You shared fries with someone who has a publicist.",
  dining_reality_cameo: "Reality-TV cameo: \"Resort Extra #3 (hungry).\"",
  dining_napkin_autograph: "Napkin autograph — grease optional.",
  dining_wine_angel: "Secret pour from a harnessed wine angel.",
  dining_kitchen_gossip: "Kitchen gossip unlocked — dealers quip differently tonight.",
  dining_food_coma: "Food coma survivor — hallway zig when you should've zagged.",
  dining_clean_sweep: "Cleared five courses in one sitting. Carmen is concerned.",
};

export function defaultDiningState(overrides = {}) {
  return {
    visits: overrides.visits ?? 0,
    lifetimeCourses: overrides.lifetimeCourses ?? 0,
    lifetimeDrinks: overrides.lifetimeDrinks ?? 0,
    encountersSeen: [...(overrides.encountersSeen ?? [])],
    venueHighScores: { ...(overrides.venueHighScores ?? {}) },
    unlockedEggs: [...(overrides.unlockedEggs ?? [])],
    foodComaHallway: Boolean(overrides.foodComaHallway),
    buffetCompCredits: overrides.buffetCompCredits ?? 0,
  };
}

export function ensureDining(session) {
  if (!session.dining) session.dining = defaultDiningState();
  const d = session.dining;
  if (!Array.isArray(d.encountersSeen)) d.encountersSeen = [];
  if (!Array.isArray(d.unlockedEggs)) d.unlockedEggs = [];
  if (!d.venueHighScores || typeof d.venueHighScores !== "object") d.venueHighScores = {};
  d.visits = d.visits ?? 0;
  d.lifetimeCourses = d.lifetimeCourses ?? 0;
  d.lifetimeDrinks = d.lifetimeDrinks ?? 0;
  d.foodComaHallway = Boolean(d.foodComaHallway);
  d.buffetCompCredits = d.buffetCompCredits ?? 0;
  return d;
}

export function attachDiningToSession(session, data = {}) {
  const raw = data.dining ?? {};
  session.dining = defaultDiningState({
    visits: raw.visits ?? 0,
    lifetimeCourses: raw.lifetimeCourses ?? raw.lifetime_courses ?? 0,
    lifetimeDrinks: raw.lifetimeDrinks ?? raw.lifetime_drinks ?? 0,
    encountersSeen: raw.encountersSeen ?? raw.encounters_seen ?? [],
    venueHighScores: raw.venueHighScores ?? raw.venue_high_scores ?? {},
    unlockedEggs: raw.unlockedEggs ?? raw.unlocked_eggs ?? [],
    foodComaHallway: raw.foodComaHallway ?? raw.food_coma_hallway ?? false,
    buffetCompCredits: raw.buffetCompCredits ?? raw.buffet_comp_credits ?? 0,
  });
  return session.dining;
}

export function getVenueById(venueId) {
  return VENUES_BY_ID[venueId] ?? null;
}

export function getMenuItem(itemId) {
  return ITEMS_BY_ID[itemId]?.item ?? null;
}

export function createSitting(venueId) {
  return {
    venueId,
    tab: 0,
    coursesCleared: 0,
    drinksThisSitting: 0,
    fullness: 0,
    composure: 80,
    orderedIds: [],
    score: 0,
    busted: false,
    closed: false,
    pendingEncounter: null,
    encounterLog: [],
    lastMessage: "The host seats you. Menus arrive like a dare.",
    lastResult: null,
  };
}

export function canEnterDining(session) {
  const level = getIntoxicationLevel(session);
  if (level >= DINING_CUTOFF_INTOX) {
    return {
      ok: false,
      message: "Security and the maître d' agree: you're cut off. Text Betty for a roast, not a reservation.",
    };
  }
  return { ok: true, message: "" };
}

/**
 * Encounter chance rises with drinks this sitting and global intox.
 * @param {{ drinksThisSitting: number }} sitting
 * @param {import("./core.js").PlayerSession} session
 */
export function encounterChance(sitting, session) {
  const intox = getIntoxicationLevel(session);
  const base = 0.06;
  const drinkFactor = sitting.drinksThisSitting * 0.12;
  const intoxFactor = intox * 0.003;
  const heightened = isHeightenedIntoxication(session) ? 0.08 : 0;
  return Math.min(0.78, base + drinkFactor + intoxFactor + heightened);
}

function unlockEgg(session, eggId) {
  if (!eggId || !DINING_EGGS[eggId]) return null;
  const dining = ensureDining(session);
  if (!dining.unlockedEggs.includes(eggId)) {
    dining.unlockedEggs.push(eggId);
    return eggId;
  }
  return null;
}

function applyEffect(session, sitting, effect = {}) {
  const notes = [];
  if (effect.chips) {
    if (effect.chips > 0) {
      session.wallet.credit(effect.chips, "dining", "Dining encounter tip");
      notes.push(`+${effect.chips} chips`);
    } else if (effect.chips < 0) {
      const cost = Math.abs(effect.chips);
      if (session.wallet.debit(cost, "dining", "Dining encounter expense")) {
        sitting.tab += cost;
        notes.push(`-${cost} chips`);
      } else {
        notes.push("Could not cover the expense — dignity intact, wallet empty");
      }
    }
  }
  if (effect.composure) {
    sitting.composure = Math.max(0, Math.min(COMPOSURE_MAX, sitting.composure + effect.composure));
  }
  if (effect.score) sitting.score += effect.score;
  if (effect.drinkBoost) {
    sitting.drinksThisSitting += effect.drinkBoost;
    recordConsumption(session, "dining_encounter_pour", { source: "dining" });
    notes.push("Another pour hits the table");
  }
  if (effect.egg) {
    const unlocked = unlockEgg(session, effect.egg);
    if (unlocked) notes.push(`Egg: ${DINING_EGGS[unlocked]}`);
  }
  return notes;
}

function pickEncounter(sitting, session, rng = Math.random) {
  const pool = DINING_ENCOUNTERS.filter((e) => sitting.drinksThisSitting >= e.minDrinks);
  if (!pool.length) return null;
  const total = pool.reduce((s, e) => s + e.weight, 0);
  let roll = rng() * total;
  for (const enc of pool) {
    roll -= enc.weight;
    if (roll <= 0) return enc;
  }
  return pool[pool.length - 1];
}

/**
 * Order and consume an item with a pacing choice.
 * @param {"pace" | "clean_plate" | "chase_shots"} pace
 */
export function orderAndConsume(session, sitting, itemId, pace = "pace", rng = Math.random) {
  if (sitting.busted || sitting.closed) {
    return { ok: false, message: "This sitting is over — settle the tab." };
  }
  const gate = canEnterDining(session);
  if (!gate.ok) return gate;

  const entry = ITEMS_BY_ID[itemId];
  if (!entry || entry.venueId !== sitting.venueId) {
    return { ok: false, message: "That isn't on tonight's menu." };
  }
  const item = entry.item;
  const diningState = ensureDining(session);
  const useBuffetComp = (diningState.buffetCompCredits ?? 0) > 0 && item.kind === "food";
  if (useBuffetComp) {
    diningState.buffetCompCredits -= 1;
  } else if (!session.wallet.debit(item.price, "dining", `${item.name} @ ${getVenueById(sitting.venueId).name}`)) {
    return { ok: false, message: `Insufficient chips — ${item.name} is $${item.price.toLocaleString()}.` };
  }

  sitting.tab += useBuffetComp ? 0 : item.price;
  sitting.orderedIds.push(itemId);

  let satiation = item.satiation ?? 8;
  let composureDelta = 0;
  let scoreGain = item.prestige ?? 1;
  let message = "";

  if (pace === "pace") {
    satiation = Math.round(satiation * 0.7);
    composureDelta = 5;
    message = useBuffetComp
      ? `Buffet comp covers ${item.name}. You pace yourself — the line still respects you.`
      : `You pace yourself through ${item.name}.`;
  } else if (pace === "clean_plate") {
    satiation = Math.round(satiation * 1.05);
    scoreGain += (item.prestige ?? 1) * 2;
    composureDelta = -3;
    message = useBuffetComp
      ? `Buffet comp covers ${item.name}. You clean the plate like a Whale.`
      : `You clean the plate — ${item.name} doesn't stand a chance.`;
  } else if (pace === "chase_shots") {
    satiation = Math.round(satiation * 0.55);
    composureDelta = -10;
    scoreGain += 5;
    sitting.drinksThisSitting += 1;
    recordConsumption(session, "dining_chase_shot", { source: "dining" });
    message = useBuffetComp
      ? `Buffet comp covers ${item.name}. You still chase it with something stronger.`
      : `You chase ${item.name} with something stronger.`;
  }

  sitting.fullness = Math.min(FULLNESS_MAX, sitting.fullness + satiation);
  sitting.composure = Math.max(0, Math.min(COMPOSURE_MAX, sitting.composure + composureDelta));
  sitting.score += scoreGain;
  sitting.coursesCleared += 1;

  if (item.kind === "drink" || item.potencyId) {
    sitting.drinksThisSitting += 1;
    if (item.potencyId) recordConsumption(session, item.potencyId, { source: "dining" });
  }

  sitting.lastMessage = message;
  const dining = ensureDining(session);

  if (sitting.fullness >= FULLNESS_MAX || sitting.composure <= 0) {
    sitting.busted = true;
    sitting.lastMessage = sitting.composure <= 0
      ? "Composure gone. The maître d' suggests a graceful exit."
      : "Food coma incoming. The room tilts like a craps table.";
    unlockEgg(session, "dining_food_coma");
    dining.foodComaHallway = true;
    sitting.lastResult = { ok: true, busted: true, encounter: null, message: sitting.lastMessage };
    return sitting.lastResult;
  }

  let encounter = null;
  if (rng() < encounterChance(sitting, session)) {
    encounter = pickEncounter(sitting, session, rng);
    sitting.pendingEncounter = encounter
      ? { id: encounter.id, title: encounter.title, body: encounter.body, choices: encounter.choices, category: encounter.category }
      : null;
  }

  if (sitting.coursesCleared >= 5) unlockEgg(session, "dining_clean_sweep");

  sitting.lastResult = {
    ok: true,
    busted: false,
    encounter: sitting.pendingEncounter,
    message: sitting.lastMessage,
    fullness: sitting.fullness,
    composure: sitting.composure,
    score: sitting.score,
  };
  return sitting.lastResult;
}

export function resolveEncounter(session, sitting, choiceId) {
  const pending = sitting.pendingEncounter;
  if (!pending) return { ok: false, message: "No encounter in progress." };
  const enc = DINING_ENCOUNTERS.find((e) => e.id === pending.id);
  const choice = enc?.choices.find((c) => c.id === choiceId) ?? pending.choices[0];
  const notes = applyEffect(session, sitting, choice.effect);
  const dining = ensureDining(session);
  if (!dining.encountersSeen.includes(pending.id)) dining.encountersSeen.push(pending.id);
  sitting.encounterLog.push({ id: pending.id, choice: choice.id });
  sitting.pendingEncounter = null;
  sitting.lastMessage = `${pending.title}: ${choice.label}. ${notes.join(" · ") || "Moment passes."}`;
  return { ok: true, message: sitting.lastMessage, notes };
}

export function dismissEncounter(session, sitting) {
  return resolveEncounter(session, sitting, sitting.pendingEncounter?.choices?.[0]?.id ?? "pass");
}

/**
 * Close out the sitting — tip optional, persist high score.
 * @param {number} [tipPercent] 0–30
 */
export function settleSitting(session, sitting, tipPercent = 18) {
  if (sitting.closed) {
    return { ok: true, message: "Tab already closed.", total: sitting.tab, score: sitting.score };
  }
  const tip = Math.max(0, Math.round(sitting.tab * (Math.min(30, Math.max(0, tipPercent)) / 100)));
  if (tip > 0) {
    if (session.wallet.debit(tip, "dining", "Dining tip")) {
      sitting.tab += tip;
    }
  }
  const dining = ensureDining(session);
  dining.visits += 1;
  dining.lifetimeCourses += sitting.coursesCleared;
  dining.lifetimeDrinks += sitting.drinksThisSitting;
  const prev = dining.venueHighScores[sitting.venueId] ?? 0;
  if (sitting.score > prev) dining.venueHighScores[sitting.venueId] = sitting.score;
  session.recordVisit("dining");
  session.recordResult("dining", -sitting.tab, sitting.coursesCleared || 1);
  sitting.closed = true;
  const venue = getVenueById(sitting.venueId);
  return {
    ok: true,
    message: `Closed out at ${venue?.name ?? "the restaurant"} — tab $${sitting.tab.toLocaleString()}, score ${sitting.score}.`,
    total: sitting.tab,
    score: sitting.score,
    tip,
  };
}

export function diningSummary(session) {
  const d = ensureDining(session);
  return {
    visits: d.visits,
    lifetimeCourses: d.lifetimeCourses,
    lifetimeDrinks: d.lifetimeDrinks,
    eggs: d.unlockedEggs.length,
    eggTotal: Object.keys(DINING_EGGS).length,
    encounters: d.encountersSeen.length,
    highScores: { ...d.venueHighScores },
  };
}

export function consumeFoodComaFlag(session) {
  const d = ensureDining(session);
  if (!d.foodComaHallway) return false;
  d.foodComaHallway = false;
  return true;
}
