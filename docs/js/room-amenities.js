import { secureRandomInt, fmtChips } from "./core.js";
import { recordConsumption } from "./intoxication-effects.js";
import { ensureHotel, isNetPositive, getRoomType } from "./hotel.js";
import { resortRequirementsMet, hintForEvent } from "./resort-bridge.js";
import { tierIndex } from "./rewards-perks.js";
import { tierForWagered } from "./rewards.js";
import { getWorldPhase } from "./world-cycle.js";

/** @typedef {{ ok: boolean, message: string, unlock?: string }} AmenityResult */

export const TV_CHANNELS = {
  news: {
    id: "news",
    label: "Channel 4 — Financial News Loop",
    description: "A pundit explains why your vacation is inflationary. You change the channel.",
    flavor: "Markets are jittery. So are you.",
  },
  aquarium: {
    id: "aquarium",
    label: "Channel 47 — Shark Reef Live",
    description: "Sand tiger sharks circle the acrylic tunnel. A school group presses their faces to the glass.",
    flavor: "The shark makes eye contact. It has seen worse nights than yours.",
  },
  wave_pool: {
    id: "wave_pool",
    label: "Channel 12 — Wave Pool Cam",
    description: "Artificial surf rolls across eleven acres of chlorinated ambition.",
    flavor: "Someone loses a hat every thirty seconds. Vegas efficiency.",
  },
  vegas_loop: {
    id: "vegas_loop",
    label: "Channel 99 — Sin City Highlights",
    description: "Montage of neon, fountains, and questionable life choices on a ten-minute loop.",
    flavor: "The montage knows what you did last night. It doesn't judge. Much.",
  },
  steve_harvey: {
    id: "steve_harvey",
    label: "Channel 88 — Steve Harvey Race Replay",
    description: "Steve Harvey calls a photo finish with theatrical certainty — Family Feud energy on a racetrack.",
    flavor: "\"And the winner is—\" You already bet the trifecta. Results pending. Survey says… bet the long shot!",
    requiresNetPositive: true,
  },
  foreign_films: {
    id: "foreign_films",
    label: "Channel 203 — Untranslated Cinema",
    description: "A French noir at 2 AM. No subtitles. You understand perfectly anyway.",
    flavor: "The protagonist also made bad decisions in a hotel room.",
  },
  arena_boxing: {
    id: "arena_boxing",
    label: "Channel 22 — ULTRA Arena Fight Replay",
    description: "Last night's championship bout loops in slow motion. The crowd roars on a ten-second delay.",
    flavor: "Michelob ULTRA Arena — where punches echo louder than slot machines.",
  },
  house_of_blues: {
    id: "house_of_blues",
    label: "Channel 55 — House of Blues Live",
    description: "Blues riffs drift from the venue next door. The bass travels through concrete and minibar sensors.",
    flavor: "Gold tier gets priority line. You get priority guilt for not going down.",
    minTierIndex: 2,
  },
};

export const MINIBAR_ITEMS = {
  mini_vodka: {
    id: "mini_vodka",
    label: "Mini vodka",
    price: 12,
    flavor: "Tastes like regret and complimentary ice.",
  },
  salted_almonds: {
    id: "salted_almonds",
    label: "Salted almonds",
    price: 18,
    flavor: "Sustainably sourced from your wallet.",
  },
  champagne_split: {
    id: "champagne_split",
    label: "Champagne split",
    price: 45,
    flavor: "Pop the cork. The minibar sensor applauds silently.",
  },
  energy_drink: {
    id: "energy_drink",
    label: "Energy drink",
    price: 9,
    flavor: "For when the casino floor is still winning.",
  },
  bottled_water: {
    id: "bottled_water",
    label: "Bottled water",
    price: 8,
    flavor: "Somehow costs almost as much as the vodka. Capitalism.",
  },
  noir_herb_preroll: {
    id: "noir_herb_preroll",
    label: "Noir pre-roll (contraband)",
    price: 55,
    flavor: "State-sanctioned recreational herb — farm-to-lounge, no photos.",
    minTierIndex: 4,
  },
  foundation_edible: {
    id: "foundation_edible",
    label: "Foundation Room edible (contraband)",
    price: 75,
    flavor: "Velvet-rope gummy — the lounge sommelier nods approvingly.",
    minTierIndex: 4,
    roomTypes: ["penthouse"],
    requiresCall: "foundation_room",
  },
  stare_at_minibar: {
    id: "stare_at_minibar",
    label: "Open the door without taking anything",
    price: 50,
    flavor: "The sensor charges you for proximity. Classic Vegas hospitality.",
  },
};

export const PHONE_CALLS = {
  home: {
    id: "home",
    label: "Call home (unlimited)",
    destination: "Mom in Ohio",
    flavor: "\"Are you winning, honey?\" You lie beautifully. She knows.",
  },
  tokyo: {
    id: "tokyo",
    label: "Call Tokyo at 3 AM",
    destination: "Tokyo — wrong timezone, right energy",
    flavor: "A salaryman answers. You discuss fish markets and existential dread.",
  },
  ex: {
    id: "ex",
    label: "Call your ex",
    destination: "Voicemail — full",
    flavor: "The mailbox is full. So is your minibar, soon.",
  },
  concierge: {
    id: "concierge",
    label: "Call concierge",
    destination: "Front desk — actually helpful",
    flavor: "\"Pool party on the 11th floor tonight. Dress code: confident.\"",
  },
  bookie: {
    id: "bookie",
    label: "Call Pete the bookie",
    destination: "Off-strip, picks up first ring",
    flavor: "\"The three horse is live. You still good for two hundred?\"",
  },
  paris: {
    id: "paris",
    label: "Call Paris — romantic wrong number",
    destination: "A café near the Seine",
    flavor: "Someone answers in French. You order a croissant anyway. They hang up.",
  },
  random_foreign: {
    id: "random_foreign",
    label: "Dial a random foreign number",
    destination: "Unknown international prefix",
    flavor: "A butler answers. \"Buckingham Palace, good evening.\" You apologize and order room service instead.",
  },
  house_of_blues: {
    id: "house_of_blues",
    label: "Call House of Blues box office",
    destination: "Mandalay Bay music venue",
    flavor: "\"Tonight's show is sold out. Gold members get the priority line — you're in. Sort of.\"",
    minTierIndex: 2,
  },
  spa_concierge: {
    id: "spa_concierge",
    label: "Call spa concierge",
    destination: "Spa & Salon — Mandalay Bay",
    flavor: "\"Platinum comp upgrade available. Hot stone, cold invoice — waived for you.\"",
    minTierIndex: 3,
  },
  foundation_room: {
    id: "foundation_room",
    label: "Call Foundation Room direct line",
    destination: "Noir lounge — velvet rope",
    flavor: "\"Your penthouse key works as a membership card tonight. No photos.\"",
    roomTypes: ["penthouse"],
    minTierIndex: 4,
  },
  delano_tower: {
    id: "delano_tower",
    label: "Call Delano sister property",
    destination: "Delano Las Vegas — all-suite tower",
    flavor: "\"Wrong tower, darling. But our pool is also eleven acres of ambition.\"",
  },
};

export const ROOM_DECISIONS = {
  do_not_disturb: {
    id: "do_not_disturb",
    label: "Hang the Do Not Disturb sign",
    flavor: "Privacy secured. The pool party will find you anyway.",
  },
  balcony: {
    id: "balcony",
    label: "Step onto the balcony",
    flavor: "The Strip glitters below. You feel briefly like a chairman. The feeling passes.",
  },
  room_service: {
    id: "room_service",
    label: "Order room service instead of the minibar",
    flavor: "A burger arrives in forty-five minutes. The minibar feels neglected.",
    price: 35,
  },
  tip_maid: {
    id: "tip_maid",
    label: "Leave a chip tip for housekeeping",
    flavor: "You tuck a red chip under the pillow. Tomorrow's towels will be fluffier.",
    price: 25,
  },
  sky_bridge_walk: {
    id: "sky_bridge_walk",
    label: "Walk Mandalay Place sky bridge to The Shoppes",
    flavor: "Luxor's pyramid glows through the glass. You window-shop with purpose.",
  },
  suite_living_room: {
    id: "suite_living_room",
    label: "Retreat to the suite living room",
    flavor: "Separate TV, separate minibar judgment. The Strip view doubles.",
    roomTypes: ["suite", "penthouse"],
  },
  telescope_balcony: {
    id: "telescope_balcony",
    label: "Use the penthouse telescope on the sportsbook",
    flavor: "You can read the tote board from floor 62. The house hates this.",
    roomTypes: ["penthouse"],
  },
  butler_turn_down: {
    id: "butler_turn_down",
    label: "Request butler turn-down service",
    flavor: "Chocolate on the pillow. Curtains drawn. Judgment withheld.",
    roomTypes: ["penthouse"],
  },
  spa_day: {
    id: "spa_day",
    label: "Book spa day via room tablet",
    flavor: "Hot stone massage scheduled. Your LUSH bath bomb waits in the shopping bag.",
    minTierIndex: 3,
  },
  wedding_chapel: {
    id: "wedding_chapel",
    label: "Accidentally book a wedding chapel tour",
    flavor: "The chapel sends a brochure. Your ex's voicemail suddenly makes sense.",
  },
  wake_up_call: {
    id: "wake_up_call",
    label: "Schedule wake-up call roulette",
    flavor: "Tomorrow's alarm: Steve Harvey OR Shark Reef feed. Vegas chooses.",
  },
};

/** Unlockable in-room Vegas vignettes — requirements checked after each action. */
export const ROOM_EVENTS = {
  shark_whisperer: {
    id: "shark_whisperer",
    label: "Shark Whisperer",
    narrative: "You narrate the aquarium feed in a hushed sportscaster voice. The shark nods. Probably.",
    requires: { channels: ["aquarium"], minibar: ["salted_almonds"] },
  },
  midnight_ocean: {
    id: "midnight_ocean",
    label: "Midnight Ocean Conference",
    narrative: "Tokyo and the shark reef are on speakerphone together. Nobody hangs up first.",
    requires: { channels: ["aquarium"], calls: ["tokyo"] },
  },
  champagne_sunset: {
    id: "champagne_sunset",
    label: "Champagne Sunset",
    narrative: "Wave pool on the TV, champagne in hand, bay windows open. Briefly, you are the main character.",
    requires: { channels: ["wave_pool"], minibar: ["champagne_split"] },
  },
  pool_party_vip: {
    id: "pool_party_vip",
    label: "Pool Party VIP",
    narrative: "Concierge sends a wristband via bellhop. The 11th-floor party has an ice luge shaped like a shark.",
    requires: { calls: ["concierge"], minibar: ["champagne_split"], poolZones: ["beach_rave"] },
  },
  what_happens: {
    id: "what_happens",
    label: "What Happens in Vegas…",
    narrative: "The night blurs. You wake up with confetti, a room key that isn't yours, and no regrets you can remember.",
    requires: { minibar: ["mini_vodka", "mini_vodka"], calls: ["ex"], decisions: ["balcony"] },
  },
  high_roller_crawl: {
    id: "high_roller_crawl",
    label: "High-Roller Suite Crawl",
    narrative: "Suite neighbors invite you door-to-door. Someone's penthouse has a telescope pointed at the sportsbook.",
    requires: { roomTypes: ["suite", "penthouse"], minibar: ["champagne_split"] },
  },
  hangover_brunch: {
    id: "hangover_brunch",
    label: "Hangover Brunch Comp",
    narrative: "Room service sends a Bloody Mary the size of the bay. The minibar sends its regards.",
    requires: { events: ["what_happens"] },
  },
  buckingham_moment: {
    id: "buckingham_moment",
    label: "Wrong Number, Right Palace",
    narrative: "You tell the story at the casino bar later. Nobody believes you. The bartender comped your drink anyway.",
    requires: { calls: ["random_foreign"] },
  },
  steve_harvey_hotline: {
    id: "steve_harvey_hotline",
    label: "Steve Harvey Hotline",
    narrative: "You call the sportsbook while Steve loops on TV. The universe aligns. Your horse hits.",
    requires: { channels: ["steve_harvey"], calls: ["bookie"], netPositive: true },
  },
  fight_night_suite: {
    id: "fight_night_suite",
    label: "Fight Night Suite",
    narrative: "ULTRA Arena replay on TV, Pete's picks on speakerphone, suite windows rattling with every punch.",
    requires: { channels: ["arena_boxing"], calls: ["bookie"], roomTypes: ["suite", "penthouse"] },
  },
  foundation_after_dark: {
    id: "foundation_after_dark",
    label: "Foundation After Dark",
    narrative: "Noir velvet rope, penthouse champagne, recreational herb menu — no photos, all vibes.",
    requires: { calls: ["foundation_room"], minibar: ["champagne_split"], minTierIndex: 4, roomTypes: ["penthouse"] },
  },
  sky_bridge_haul: {
    id: "sky_bridge_haul",
    label: "Sky Bridge Haul",
    narrative: "LUSH bath bomb from Mandalay Place, Strip balcony, spa recovery — capitalism never felt so good.",
    requires: { decisions: ["sky_bridge_walk", "balcony"], shoppingItems: ["lush_bath_bomb"] },
  },
  eleven_acres_hangover: {
    id: "eleven_acres_hangover",
    label: "Eleven Acres Hangover",
    narrative: "You conquered every pool zone yesterday. Today's brunch arrives with sunglasses and regret.",
    requires: { poolEvents: ["eleven_acres"], events: ["hangover_brunch"] },
  },
  chapel_wrong_turn: {
    id: "chapel_wrong_turn",
    label: "Chapel Wrong Turn",
    narrative: "Wrong number, wedding brochure, chapel tour — classic Vegas matrimonial chaos.",
    requires: { calls: ["random_foreign"], decisions: ["wedding_chapel"] },
  },
  convention_survival: {
    id: "convention_survival",
    label: "Convention Survival",
    narrative: "Synergy keynote on TV, energy drink in hand, DND sign deployed — CES survivor badge earned.",
    requires: { channels: ["news"], minibar: ["energy_drink"], decisions: ["do_not_disturb"] },
  },
  butler_turn_down: {
    id: "butler_turn_down",
    label: "Butler Turn-Down Legend",
    narrative: "Chocolate, curtains, and a penthouse folio that reads like a novella.",
    requires: { decisions: ["butler_turn_down"], roomTypes: ["penthouse"] },
  },
  telescope_strip: {
    id: "telescope_strip",
    label: "Telescope Strip Sweep",
    narrative: "Floor 62 optics locked on the sportsbook tote. Pete texts: \"Stop cheating.\"",
    requires: { decisions: ["telescope_balcony"], roomTypes: ["penthouse"] },
  },
};

const RESORT_TIME_LABELS = ["Dawn over the bay", "Midday chlorination", "Neon dusk", "2 AM clarity"];

function defaultRoomAmenities(overrides = {}) {
  return {
    tvChannel: overrides.tvChannel ?? null,
    channelsWatched: overrides.channelsWatched ?? [],
    minibarPurchases: overrides.minibarPurchases ?? [],
    minibarTab: overrides.minibarTab ?? 0,
    phoneCalls: overrides.phoneCalls ?? [],
    decisions: overrides.decisions ?? [],
    unlockedEvents: overrides.unlockedEvents ?? [],
    eventLog: overrides.eventLog ?? [],
    amenityActions: overrides.amenityActions ?? 0,
    wakeUpScheduled: overrides.wakeUpScheduled ?? false,
    checkedOut: overrides.checkedOut ?? false,
    ...overrides,
  };
}

export function ensureRoomAmenities(hotel) {
  if (!hotel.roomAmenities) {
    hotel.roomAmenities = defaultRoomAmenities();
  }
  const defaults = defaultRoomAmenities();
  const ra = hotel.roomAmenities;
  for (const key of Object.keys(defaults)) {
    if (ra[key] === undefined) ra[key] = defaults[key];
  }
  return ra;
}

function hasAll(haystack, needles) {
  return needles.every((n) => haystack.includes(n));
}

function getSessionTierIndex(session) {
  const wagered = session.rewards?.lifetimeWagered ?? 0;
  return tierIndex(tierForWagered(wagered).id);
}

function amenityAllowed(session, hotel, item) {
  if (item.requiresNetPositive && !isNetPositive(session)) return false;
  if (item.minTierIndex != null && getSessionTierIndex(session) < item.minTierIndex) return false;
  if (item.roomTypes && !item.roomTypes.includes(hotel.roomType)) return false;
  if (item.requiresCall) {
    const ra = ensureRoomAmenities(hotel);
    if (!ra.phoneCalls.includes(item.requiresCall)) return false;
  }
  return true;
}

export function filterTvChannels(session, hotel) {
  return Object.values(TV_CHANNELS).filter((ch) => amenityAllowed(session, hotel, ch));
}

export function filterPhoneCalls(session, hotel) {
  return Object.values(PHONE_CALLS).filter((call) => amenityAllowed(session, hotel, call));
}

export function filterRoomDecisions(session, hotel) {
  return Object.values(ROOM_DECISIONS).filter((dec) => amenityAllowed(session, hotel, dec));
}

export function filterMinibarItems(session, hotel) {
  return Object.values(MINIBAR_ITEMS).filter((item) => amenityAllowed(session, hotel, item));
}

export function getResortTimeOfDay(hotel) {
  void hotel;
  return { slot: 0, label: "Use session for world phase" };
}

/** @param {import("./core.js").PlayerSession} session */
export function getSessionResortPhase(session) {
  const phase = getWorldPhase(session);
  return { slot: phase.id, label: phase.label };
}

export function advanceResortTime(hotel, steps = 1) {
  void hotel;
  void steps;
  return { slot: 0, label: "Time advances with the real-world clock (2h = 1 day)" };
}

function eventRequirementsMet(session, hotel, event) {
  const ra = ensureRoomAmenities(hotel);
  const req = event.requires;
  if (req.channels && !hasAll(ra.channelsWatched, req.channels)) return false;
  if (req.minibar && !hasAll(ra.minibarPurchases, req.minibar)) return false;
  if (req.calls && !hasAll(ra.phoneCalls, req.calls)) return false;
  if (req.decisions && !hasAll(ra.decisions, req.decisions)) return false;
  if (req.events && !hasAll(ra.unlockedEvents, req.events)) return false;
  if (req.netPositive && !isNetPositive(session)) return false;
  if (!resortRequirementsMet(session, req, { hotel, roomAmenities: ra })) return false;
  return true;
}

function tryUnlockEvents(session) {
  const hotel = ensureHotel(session);
  const ra = ensureRoomAmenities(hotel);
  const unlocked = [];
  for (const event of Object.values(ROOM_EVENTS)) {
    if (ra.unlockedEvents.includes(event.id)) continue;
    if (!eventRequirementsMet(session, hotel, event)) continue;
    ra.unlockedEvents.push(event.id);
    ra.eventLog.push(event.narrative);
    unlocked.push(event);
  }
  return unlocked;
}

function afterAmenityAction(session) {
  const hotel = ensureHotel(session);
  const ra = ensureRoomAmenities(hotel);
  ra.amenityActions += 1;
  return tryUnlockEvents(session);
}

function gateMessage(item) {
  if (item.requiresNetPositive) return "Premium channel locked until you're net-positive on the floor.";
  if (item.requiresCall) return "Call the Foundation Room direct line first — velvet rope protocol.";
  if (item.minTierIndex != null) return `Requires MGM Rewards tier ${item.minTierIndex + 1} or higher.`;
  if (item.roomTypes) return `Available in ${item.roomTypes.join(" / ")} only.`;
  return "Not available.";
}

/** @returns {AmenityResult} */
export function tuneTvChannel(session, channelId) {
  const channel = TV_CHANNELS[channelId];
  if (!channel) return { ok: false, message: "Static. No signal." };
  const hotel = ensureHotel(session);
  if (!amenityAllowed(session, hotel, channel)) {
    return { ok: false, message: gateMessage(channel) };
  }
  const ra = ensureRoomAmenities(hotel);
  ra.tvChannel = channelId;
  if (!ra.channelsWatched.includes(channelId)) {
    ra.channelsWatched.push(channelId);
  }
  const unlocked = afterAmenityAction(session);
  let message = `${channel.label}\n${channel.description}\n${channel.flavor}`;
  const time = getSessionResortPhase(session);
  message += `\n(${time.label})`;
  if (unlocked.length) {
    message += `\n\n✦ Unlocked: ${unlocked.map((e) => e.label).join(", ")}`;
  }
  return { ok: true, message, unlock: unlocked[0]?.id };
}

/** @returns {AmenityResult} */
export function purchaseMinibarItem(session, itemId) {
  const item = MINIBAR_ITEMS[itemId];
  if (!item) return { ok: false, message: "The minibar judges silently." };
  const hotel = ensureHotel(session);
  if (!amenityAllowed(session, hotel, item)) {
    return { ok: false, message: gateMessage(item) };
  }
  const ra = ensureRoomAmenities(hotel);
  if (!session.wallet.debit(item.price, "hotel", `Minibar: ${item.label}`)) {
    return { ok: false, message: `Need ${fmtChips(item.price)} — the minibar doesn't accept IOUs.` };
  }
  ra.minibarPurchases.push(itemId);
  ra.minibarTab += item.price;
  recordConsumption(session, itemId, { source: "minibar" });
  const unlocked = afterAmenityAction(session);
  let message = `${item.label} — ${fmtChips(item.price)} charged to the room.\n${item.flavor}`;
  if (unlocked.length) {
    message += `\n\n✦ Unlocked: ${unlocked.map((e) => e.label).join(", ")}`;
  }
  return { ok: true, message, unlock: unlocked[0]?.id };
}

/** @returns {AmenityResult} */
export function makePhoneCall(session, callId) {
  const call = PHONE_CALLS[callId];
  if (!call) return { ok: false, message: "Dead line. Try again." };
  const hotel = ensureHotel(session);
  if (!amenityAllowed(session, hotel, call)) {
    return { ok: false, message: gateMessage(call) };
  }
  const ra = ensureRoomAmenities(hotel);
  if (!ra.phoneCalls.includes(callId)) {
    ra.phoneCalls.push(callId);
  }
  const unlocked = afterAmenityAction(session);
  let message = `${call.label} → ${call.destination}\n${call.flavor}\n(Unlimited foreign calls — the hotel absorbs the guilt.)`;
  if (unlocked.length) {
    message += `\n\n✦ Unlocked: ${unlocked.map((e) => e.label).join(", ")}`;
  }
  return { ok: true, message, unlock: unlocked[0]?.id };
}

/** @returns {AmenityResult} */
export function makeRoomDecision(session, decisionId) {
  const decision = ROOM_DECISIONS[decisionId];
  if (!decision) return { ok: false, message: "Indecision is also a choice." };
  const hotel = ensureHotel(session);
  if (!amenityAllowed(session, hotel, decision)) {
    return { ok: false, message: gateMessage(decision) };
  }
  const ra = ensureRoomAmenities(hotel);
  if (decision.price) {
    if (!session.wallet.debit(decision.price, "hotel", decision.label)) {
      return { ok: false, message: `Need ${fmtChips(decision.price)}.` };
    }
  }
  if (!ra.decisions.includes(decisionId)) {
    ra.decisions.push(decisionId);
  }
  if (decisionId === "wake_up_call") {
    ra.wakeUpScheduled = true;
  }
  const unlocked = afterAmenityAction(session);
  let message = `${decision.label}\n${decision.flavor}`;
  if (decisionId === "balcony" || decisionId === "telescope_balcony") {
    const room = getRoomType(hotel);
    const time = getSessionResortPhase(session);
    message += `\n${room.label} · ${time.label} — the Strip ${time.slot >= 2 ? "blazes" : "shimmers"}.`;
  }
  if (unlocked.length) {
    message += `\n\n✦ Unlocked: ${unlocked.map((e) => e.label).join(", ")}`;
  }
  return { ok: true, message, unlock: unlocked[0]?.id };
}

export function getUnlockedEvents(hotel) {
  const ra = ensureRoomAmenities(hotel);
  return ra.unlockedEvents.map((id) => ROOM_EVENTS[id]).filter(Boolean);
}

export function getLockedEvents(hotel) {
  const ra = ensureRoomAmenities(hotel);
  return Object.values(ROOM_EVENTS).filter((e) => !ra.unlockedEvents.includes(e.id));
}

export function getEventHint(eventId) {
  return hintForEvent(eventId);
}

export function getRoomAmenitiesSummary(hotel) {
  const ra = ensureRoomAmenities(hotel);
  const parts = [];
  const time = getResortTimeOfDay(hotel);
  parts.push(time.label);
  if (ra.tvChannel) {
    const ch = TV_CHANNELS[ra.tvChannel];
    parts.push(`TV: ${ch?.label ?? ra.tvChannel}`);
  }
  if (ra.minibarTab > 0) parts.push(`Minibar tab: ${fmtChips(ra.minibarTab)}`);
  if (ra.phoneCalls.length) parts.push(`${ra.phoneCalls.length} call(s) logged`);
  if (ra.unlockedEvents.length) parts.push(`${ra.unlockedEvents.length} event(s) unlocked`);
  return parts.length ? parts.join(" · ") : "The room awaits your bad decisions.";
}

export function randomMinibarSuggestion() {
  const ids = Object.keys(MINIBAR_ITEMS).filter((id) => id !== "stare_at_minibar");
  return MINIBAR_ITEMS[ids[secureRandomInt(0, ids.length - 1)]];
}

export function conciergeMinibarNudge(session) {
  const suggestion = randomMinibarSuggestion();
  const hotel = ensureHotel(session);
  const ra = ensureRoomAmenities(hotel);
  if (ra.minibarPurchases.includes(suggestion.id)) {
    return { ok: true, message: "Concierge: \"You've already sampled that. Try the champagne — it's a Tuesday somewhere.\"" };
  }
  return {
    ok: true,
    message: `Concierge whispers: "The ${suggestion.label.toLowerCase()} is popular tonight — ${fmtChips(suggestion.price)} on your folio."`,
  };
}
