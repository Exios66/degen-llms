/**
 * Vegas Strip limo / private-driver / rideshare travel for the web terminal casino.
 * Destinations swap branding, CSS themes, exclusive slots, and table overlays.
 * Not wired into the pixel RPG.
 */

import { ensureHotel } from "./hotel.js";
import { ensureRoomAmenities } from "./room-amenities.js";

export const HOME_DESTINATION_ID = "mandalay_bay";

/**
 * @typedef {{ name: string, blurb: string }} ActivityBrand
 * @typedef {{
 *   id: string,
 *   name: string,
 *   shortName: string,
 *   tagline: string,
 *   limoLabel: string,
 *   fare: number,
 *   cssClass: string,
 *   tokens: Record<string, string>,
 *   exclusiveSlotIds: string[],
 *   tableClass: string,
 *   floorBlurb: string,
 *   gameFlavor: Record<string, string>,
 *   activityBranding: Record<string, ActivityBrand>,
 * }} StripDestination
 */

/** @type {Record<string, StripDestination>} */
export const STRIP_DESTINATIONS = {
  mandalay_bay: {
    id: "mandalay_bay",
    name: "The Mandalay Bay",
    shortName: "Mandalay Bay",
    tagline: "South Strip gold — shark reef energy, wave-pool afterglow.",
    limoLabel: "Return to Mandalay Bay",
    fare: 0,
    cssClass: "dest-mandalay",
    tokens: {
      "--bg": "#0b1210",
      "--felt": "#0f3d2e",
      "--gold": "#c9a227",
      "--machine-accent": "#c9a227",
      "--machine-felt": "#0f3d2e",
      "--machine-glow": "rgba(201, 162, 39, 0.35)",
    },
    exclusiveSlotIds: [],
    tableClass: "table-theme-mandalay",
    floorBlurb: "Home floor — classic Mandalay cabinets and VIP salons.",
    gameFlavor: {
      blackjack: "Mandalay felt — tip the pit with tropical restraint.",
      holdem: "Hold'em under gold canopies.",
      roulette: "Wheel spins with beach-rave aftertaste.",
      craps: "Dice bounce like wave-pool foam.",
      slots: "Penny to progressive — the South Strip standard.",
      sportsbook: "Pavilion boards and Steve-volume energy.",
    },
    activityBranding: {
      blackjack: { name: "Mandalay Blackjack", blurb: "Tropical soft 17 under gold canopies." },
      holdem: { name: "Mandalay Hold'em", blurb: "Beach-rave adjacent, tip-friendly." },
      roulette: { name: "Mandalay Roulette", blurb: "South Strip wheel with wave-pool afterglow." },
      craps: { name: "Mandalay Craps", blurb: "Dice bounce like foam." },
      slots: { name: "Mandalay BaySlots", blurb: "Home cabinets — Shark Reef to progressive." },
      sportsbook: { name: "Mandalay Sportsbook", blurb: "Pavilion picks and long-shot drama." },
      lottery: { name: "Mandalay Lottery", blurb: "Scratch the South Strip." },
      trading_desk: { name: "Trading Desk", blurb: "Offshore-adjacent markets." },
      arcade: { name: "Arcade", blurb: "Cabinet chaos near the beach." },
      horse_racing: { name: "Horse Racing", blurb: "Steve calls photo finishes." },
    },
  },
  luxor: {
    id: "luxor",
    name: "Luxor Las Vegas",
    shortName: "Luxor",
    tagline: "Black pyramid — obelisk light, sphinx odds, desert heat.",
    limoLabel: "Luxor — Pyramid Casino",
    fare: 85,
    cssClass: "dest-luxor",
    tokens: {
      "--bg": "#0a0806",
      "--felt": "#1a1208",
      "--gold": "#e6b422",
      "--machine-accent": "#d4a017",
      "--machine-felt": "#2a1a0a",
      "--machine-glow": "rgba(230, 180, 34, 0.4)",
    },
    exclusiveSlotIds: [
      "luxor_obelisk", "sphinx_spin", "scarab_stampede", "nile_nights", "beam_of_ra",
    ],
    tableClass: "table-theme-luxor",
    floorBlurb: "Pyramid floor — five Egyptian exclusive cabinets, black-gold tables, Beam of Ra progressive.",
    gameFlavor: {
      blackjack: "Cards dealt under a beam of desert light.",
      holdem: "Sphinx watches the flop. Blink and you miss the tell.",
      roulette: "The wheel is an obelisk silhouette — bet the gold.",
      craps: "Bones tumble like scarabs across black felt.",
      slots: "Obelisk, Sphinx, Scarab, Nile Nights, Beam of Ra — Luxor exclusives.",
      sportsbook: "Desert odds board — camel metaphors optional.",
    },
    activityBranding: {
      blackjack: { name: "Sphinx Blackjack", blurb: "🏜️ Soft 17 under the Luxor beam." },
      holdem: { name: "Obelisk Hold'em", blurb: "👁 The Sphinx judges every raise." },
      roulette: { name: "Pyramid Roulette", blurb: "🔺 Gold zero energy — bet the desert." },
      craps: { name: "Scarab Craps", blurb: "🪲 Bones tumble on black felt." },
      slots: { name: "Pyramid Slots", blurb: "☀️ Five exclusive cabinets + Beam of Ra progressive." },
      sportsbook: { name: "Desert Book", blurb: "Odds carved like hieroglyphs." },
      lottery: { name: "Nile Scratch", blurb: "🌙 Instant tickets with moonrise vibes." },
      trading_desk: { name: "Gold Futures Desk", blurb: "🥇 Pharaoh-adjacent speculation." },
      arcade: { name: "Tomb Arcade", blurb: "Cabinets in a black-glass alcove." },
      horse_racing: { name: "Chariot Sim", blurb: "🏇 Desert stretch, theatrical calls." },
    },
  },
  excalibur: {
    id: "excalibur",
    name: "Excalibur Hotel & Casino",
    shortName: "Excalibur",
    tagline: "Castle kitsch — joust energy, scarlet banners, sword-swing payouts.",
    limoLabel: "Excalibur — Castle Casino",
    fare: 70,
    cssClass: "dest-excalibur",
    tokens: {
      "--bg": "#12080c",
      "--felt": "#3a0f18",
      "--gold": "#d4af37",
      "--machine-accent": "#b22222",
      "--machine-felt": "#4a1520",
      "--machine-glow": "rgba(178, 34, 34, 0.4)",
    },
    exclusiveSlotIds: [
      "castle_jackpot", "joust_reels", "dragon_keep", "round_table_reels", "holy_grail_spin",
    ],
    tableClass: "table-theme-excalibur",
    floorBlurb: "Castle floor — five medieval exclusives, crimson rails, Holy Grail progressive.",
    gameFlavor: {
      blackjack: "Knights of the soft 17 — hit with honor.",
      holdem: "Round table Hold'em. Fold like a squire, raise like a king.",
      roulette: "The wheel is a tournament shield — red and gold only feel right.",
      craps: "Dice bounce off crenellations. The crowd cheers either way.",
      slots: "Castle, Joust, Dragon Keep, Round Table, Holy Grail — Excalibur exclusives.",
      sportsbook: "Joust odds — pageantry over PAR sheets.",
    },
    activityBranding: {
      blackjack: { name: "Knight Blackjack", blurb: "⚔ Hit with honor. Split like a knight." },
      holdem: { name: "Round Table Hold'em", blurb: "👑 Raise like a king, fold like a squire." },
      roulette: { name: "Shield Roulette", blurb: "🛡 Scarlet and gold — tournament wheel." },
      craps: { name: "Joust Craps", blurb: "🏇 Dice off the crenellations." },
      slots: { name: "Castle Slots", blurb: "🏰 Five exclusives + Holy Grail progressive." },
      sportsbook: { name: "Tournament Book", blurb: "🚩 Banners over the odds board." },
      lottery: { name: "Quest Tickets", blurb: "🏺 Scratch for grail-adjacent glory." },
      trading_desk: { name: "Royal Ledger", blurb: "👑 Speculative knighthood." },
      arcade: { name: "Keep Arcade", blurb: "🐉 Cabinets in the dragon wing." },
      horse_racing: { name: "Joust Track", blurb: "🐎 Stretch runs with trumpet fanfare." },
    },
  },
  bellagio: {
    id: "bellagio",
    name: "Bellagio",
    shortName: "Bellagio",
    tagline: "Fountain elegance — marble calm, high-limit hush, Italian glass.",
    limoLabel: "Bellagio — Fountain Casino",
    fare: 120,
    cssClass: "dest-bellagio",
    tokens: {
      "--bg": "#0c1018",
      "--felt": "#0e2a24",
      "--gold": "#b8a46a",
      "--machine-accent": "#8eb8c8",
      "--machine-felt": "#123830",
      "--machine-glow": "rgba(142, 184, 200, 0.35)",
    },
    exclusiveSlotIds: [
      "fountain_fortune", "conservatory_spin", "lake_lights", "glass_garden", "prima_fontana",
    ],
    tableClass: "table-theme-bellagio",
    floorBlurb: "Fountain floor — five elegant exclusives, lake-blue lighting, Prima Fontana progressive.",
    gameFlavor: {
      blackjack: "Soft jazz. Softer 17. Tip like you own a suite.",
      holdem: "Marble-rail Hold'em — bluff with European restraint.",
      roulette: "The ball drops like a fountain jet — elegant, inevitable.",
      craps: "Even the stickman whispers. Still lose loudly.",
      slots: "Fountain, Conservatory, Lake Lights, Glass Garden, Prima Fontana — Bellagio exclusives.",
      sportsbook: "Quiet boards — silk over stadium volume.",
    },
    activityBranding: {
      blackjack: { name: "Lakeview Blackjack", blurb: "🥂 Soft jazz. Softer 17." },
      holdem: { name: "Marble Hold'em", blurb: "💎 Bluff with European restraint." },
      roulette: { name: "Fontana Roulette", blurb: "⛲ Ball drops like a fountain jet." },
      craps: { name: "Conservatory Craps", blurb: "🌸 Even the stickman whispers." },
      slots: { name: "Fountain Slots", blurb: "✨ Five exclusives + Prima Fontana progressive." },
      sportsbook: { name: "Salon Book", blurb: "🌊 Quiet odds, silk volume." },
      lottery: { name: "Garden Scratch", blurb: "🌷 Instant florals." },
      trading_desk: { name: "Lake Desk", blurb: "💎 Speculative elegance." },
      arcade: { name: "Glass Arcade", blurb: "🦋 Soft-lit cabinets." },
      horse_racing: { name: "Parade Sim", blurb: "🏇 Polished stretch, hushed calls." },
    },
  },
  circa: {
    id: "circa",
    name: "Circa Resort & Casino",
    shortName: "Circa",
    tagline: "Fremont neon — stadium sportsbook swagger, downtown voltage.",
    limoLabel: "Circa — Downtown Neon",
    fare: 95,
    cssClass: "dest-circa",
    tokens: {
      "--bg": "#08081a",
      "--felt": "#0d1a3a",
      "--gold": "#ff2bd6",
      "--machine-accent": "#00e5ff",
      "--machine-felt": "#122048",
      "--machine-glow": "rgba(0, 229, 255, 0.45)",
    },
    exclusiveSlotIds: [
      "neon_stadium", "fremont_flash", "vegas_vamp", "stadium_swipe", "downtown_drop",
    ],
    tableClass: "table-theme-circa",
    floorBlurb: "Downtown floor — five neon exclusives, cyan tables, Downtown Drop progressive.",
    gameFlavor: {
      blackjack: "Neon edge lights the shoe. Downtown deals faster.",
      holdem: "Stadium screens behind you. Play to the crowd.",
      roulette: "Cyan wheel, magenta zero — Fremont color theory.",
      craps: "The stickman has a stadium mic. Use it wisely.",
      slots: "Neon Stadium, Fremont Flash, Vegas Vamp, Stadium Swipe, Downtown Drop — Circa exclusives.",
      sportsbook: "Stadium swagger — the board is the attraction.",
    },
    activityBranding: {
      blackjack: { name: "Neon Blackjack", blurb: "💜 Cyan edge lights the shoe." },
      holdem: { name: "Stadium Hold'em", blurb: "🏟 Play to the crowd on the wall." },
      roulette: { name: "Fremont Roulette", blurb: "⚡ Magenta zero, cyan wheel." },
      craps: { name: "Mic Craps", blurb: "🎙 Stickman has a stadium mic." },
      slots: { name: "Downtown Slots", blurb: "🦇 Five exclusives + Downtown Drop progressive." },
      sportsbook: { name: "Stadium Sportsbook", blurb: "🏈 The board is the show." },
      lottery: { name: "Vamp Scratch", blurb: "🩸 Instant neon tickets." },
      trading_desk: { name: "Voltage Desk", blurb: "⚡ Speculative downtown." },
      arcade: { name: "Canopy Arcade", blurb: "💜 Cabinets under LED rain." },
      horse_racing: { name: "Neon Stretch", blurb: "🐎 Fast calls, louder screens." },
    },
  },
};

export function defaultStripTravelState() {
  return {
    destinationId: HOME_DESTINATION_ID,
    limoUnlocked: false,
    rideshareUnlocked: false,
    visits: [],
    tripCount: 0,
    lastFare: 0,
    lastDestinationId: null,
    lastRideMode: null,
  };
}

/** @param {import("./core.js").PlayerSession} session */
export function ensureStripTravel(session) {
  if (!session.stripTravel || typeof session.stripTravel !== "object") {
    session.stripTravel = defaultStripTravelState();
  }
  const st = session.stripTravel;
  if (!st.destinationId) st.destinationId = HOME_DESTINATION_ID;
  if (!Array.isArray(st.visits)) st.visits = [];
  if (typeof st.tripCount !== "number") st.tripCount = 0;
  if (st.limoUnlocked == null) st.limoUnlocked = false;
  if (st.rideshareUnlocked == null) st.rideshareUnlocked = false;
  const calls = session.hotel?.roomAmenities?.phoneCalls ?? [];
  if (calls.includes("limo_service") || calls.includes("private_driver")) {
    st.limoUnlocked = true;
  }
  return st;
}

/** @param {import("./core.js").PlayerSession} session @param {object|null} [data] */
export function attachStripTravelToSession(session, data = null) {
  if (data?.stripTravel) {
    session.stripTravel = { ...defaultStripTravelState(), ...data.stripTravel };
  }
  ensureStripTravel(session);
  return session.stripTravel;
}

/** @param {import("./core.js").PlayerSession} session */
export function getCurrentDestination(session) {
  const st = ensureStripTravel(session);
  return STRIP_DESTINATIONS[st.destinationId] ?? STRIP_DESTINATIONS[HOME_DESTINATION_ID];
}

/** @param {import("./core.js").PlayerSession} session */
export function casinoDisplayName(session) {
  return getCurrentDestination(session).name;
}

/** @param {import("./core.js").PlayerSession} session */
export function isAwayFromHome(session) {
  return ensureStripTravel(session).destinationId !== HOME_DESTINATION_ID;
}

/** @param {import("./core.js").PlayerSession} session */
export function isLimoUnlocked(session) {
  const st = ensureStripTravel(session);
  return Boolean(st.limoUnlocked || st.rideshareUnlocked);
}

/**
 * Activity display name/blurb for the current destination.
 * @param {import("./core.js").PlayerSession} session
 * @param {string} activityId
 * @param {string} [fallbackName]
 */
export function getActivityBranding(session, activityId, fallbackName = "") {
  const dest = getCurrentDestination(session);
  const brand = dest.activityBranding?.[activityId];
  if (brand) return brand;
  return {
    name: fallbackName || activityId,
    blurb: dest.gameFlavor?.[activityId] ?? dest.floorBlurb,
  };
}

/** Unlock limo after room-phone call. */
export function unlockLimoService(session) {
  const st = ensureStripTravel(session);
  st.limoUnlocked = true;
  const hotel = ensureHotel(session);
  const ra = ensureRoomAmenities(hotel);
  if (!ra.phoneCalls.includes("limo_service")) {
    ra.phoneCalls.push("limo_service");
  }
  return st;
}

/** Unlock rideshare (Uber/Lyft) via Rewards Phone Connect. */
export function unlockRideshareService(session) {
  const st = ensureStripTravel(session);
  st.rideshareUnlocked = true;
  return st;
}

/** Destinations offered by the limo (excludes current). */
export function listLimoDestinations(session) {
  const st = ensureStripTravel(session);
  return Object.values(STRIP_DESTINATIONS).filter((d) => d.id !== st.destinationId);
}

/**
 * Apply CSS theme tokens + data attribute for the current destination.
 * Web terminal only — safe no-op without document.
 */
export function applyDestinationTheme(session) {
  if (typeof document === "undefined") return;
  const dest = getCurrentDestination(session);
  const root = document.documentElement;
  root.dataset.destination = dest.id;
  root.classList.remove(
    ...[...root.classList].filter((c) => c.startsWith("dest-")),
  );
  root.classList.add(dest.cssClass);
  for (const [key, value] of Object.entries(dest.tokens)) {
    root.style.setProperty(key, value);
  }
  document.body?.classList.toggle("strip-away", dest.id !== HOME_DESTINATION_ID);
}

/**
 * Travel via limo / rideshare to a Strip destination.
 * @param {import("./core.js").PlayerSession} session
 * @param {string} destinationId
 * @param {{ mode?: "limo"|"rideshare" }} [opts]
 */
export function travelByLimo(session, destinationId, opts = {}) {
  const dest = STRIP_DESTINATIONS[destinationId];
  if (!dest) return { ok: false, message: "Driver shrugs. That address isn't on the Strip map." };

  const st = ensureStripTravel(session);
  if (!st.limoUnlocked && !st.rideshareUnlocked) {
    return { ok: false, message: "Call limo from your room phone — or Uber/Lyft from MGM Connect — first." };
  }
  if (st.destinationId === destinationId) {
    return { ok: false, message: `You're already at ${dest.shortName}.` };
  }

  const mode = opts.mode ?? (
    st.rideshareUnlocked && !st.limoUnlocked
      ? "rideshare"
      : st.limoUnlocked && !st.rideshareUnlocked
        ? "limo"
        : (st.lastRideMode === "rideshare" ? "rideshare" : "limo")
  );
  const fare = destinationId === HOME_DESTINATION_ID ? 0 : dest.fare;
  if (fare > 0) {
    const reason = mode === "rideshare"
      ? `Uber/Lyft to ${dest.shortName}`
      : `Limo to ${dest.shortName}`;
    if (!session.wallet.debit(fare, mode === "rideshare" ? "rideshare" : "limo", reason)) {
      return {
        ok: false,
        message: `Ride to ${dest.shortName} is ${fare} chips. You're short on the curb.`,
      };
    }
  }

  const from = getCurrentDestination(session);
  st.lastDestinationId = st.destinationId;
  st.destinationId = destinationId;
  st.lastFare = fare;
  st.lastRideMode = mode;
  st.tripCount += 1;
  if (!st.visits.includes(destinationId) && destinationId !== HOME_DESTINATION_ID) {
    st.visits.push(destinationId);
  }

  applyDestinationTheme(session);

  const vehicle = mode === "rideshare" ? "Uber/Lyft" : "Private driver";
  const fareNote = fare > 0 ? ` Fare: ${fare} chips.` : " Complimentary return.";
  return {
    ok: true,
    destination: dest,
    fare,
    mode,
    message: `${vehicle} from ${from.shortName} → ${dest.shortName}.${fareNote} ${dest.tagline}`,
  };
}

/** @param {object} machine */
export function isDestinationExclusiveSlot(machine) {
  return Boolean(machine?.destinationOnly || machine?.destinationId);
}

/**
 * Whether a machine belongs on the current destination's floor.
 * @param {import("./core.js").PlayerSession} session
 * @param {object} machine
 */
export function machineAllowedAtDestination(session, machine) {
  const dest = getCurrentDestination(session);
  if (machine.salonOnly) return false;
  if (machine.destinationId) {
    return machine.destinationId === dest.id;
  }
  if (machine.destinationOnly) return false;
  if (dest.id === HOME_DESTINATION_ID) return true;
  if (machine.homeOnly) return false;
  return true;
}

/**
 * @param {import("./core.js").PlayerSession} session
 * @param {object[]} machines
 */
export function filterMachinesForDestination(session, machines) {
  return machines.filter((m) => machineAllowedAtDestination(session, m));
}
