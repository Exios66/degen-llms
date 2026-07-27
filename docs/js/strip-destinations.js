/**
 * Vegas Strip limo / private-driver travel for the web terminal casino.
 * Destinations swap branding, CSS themes, exclusive slots, and table overlays.
 * Not wired into the pixel RPG.
 */

import { ensureHotel } from "./hotel.js";
import { ensureRoomAmenities } from "./room-amenities.js";

export const HOME_DESTINATION_ID = "mandalay_bay";

/**
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
    exclusiveSlotIds: ["luxor_obelisk", "sphinx_spin"],
    tableClass: "table-theme-luxor",
    floorBlurb: "Pyramid floor — Egyptian video slots and black-gold tables.",
    gameFlavor: {
      blackjack: "Cards dealt under a beam of desert light.",
      holdem: "Sphinx watches the flop. Blink and you miss the tell.",
      roulette: "The wheel is an obelisk silhouette — bet the gold.",
      craps: "Bones tumble like scarabs across black felt.",
      slots: "Obelisk and Sphinx cabinets — Luxor exclusives.",
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
    exclusiveSlotIds: ["castle_jackpot", "joust_reels"],
    tableClass: "table-theme-excalibur",
    floorBlurb: "Castle floor — medieval themed reels and crimson table rails.",
    gameFlavor: {
      blackjack: "Knights of the soft 17 — hit with honor.",
      holdem: "Round table Hold'em. Fold like a squire, raise like a king.",
      roulette: "The wheel is a tournament shield — red and gold only feel right.",
      craps: "Dice bounce off crenellations. The crowd cheers either way.",
      slots: "Castle Jackpot and Joust Reels — Excalibur exclusives.",
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
    exclusiveSlotIds: ["fountain_fortune", "conservatory_spin"],
    tableClass: "table-theme-bellagio",
    floorBlurb: "Fountain floor — refined cabinets and lake-blue table lighting.",
    gameFlavor: {
      blackjack: "Soft jazz. Softer 17. Tip like you own a suite.",
      holdem: "Marble-rail Hold'em — bluff with European restraint.",
      roulette: "The ball drops like a fountain jet — elegant, inevitable.",
      craps: "Even the stickman whispers. Still lose loudly.",
      slots: "Fountain Fortune and Conservatory Spin — Bellagio exclusives.",
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
    exclusiveSlotIds: ["neon_stadium", "fremont_flash"],
    tableClass: "table-theme-circa",
    floorBlurb: "Downtown floor — neon video slots and cyan-lit tables.",
    gameFlavor: {
      blackjack: "Neon edge lights the shoe. Downtown deals faster.",
      holdem: "Stadium screens behind you. Play to the crowd.",
      roulette: "Cyan wheel, magenta zero — Fremont color theory.",
      craps: "The stickman has a stadium mic. Use it wisely.",
      slots: "Neon Stadium and Fremont Flash — Circa exclusives.",
    },
  },
};

export function defaultStripTravelState() {
  return {
    destinationId: HOME_DESTINATION_ID,
    limoUnlocked: false,
    visits: [],
    tripCount: 0,
    lastFare: 0,
    lastDestinationId: null,
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
  // Unlock if the room phone already logged the limo call (save migration).
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
  return Boolean(ensureStripTravel(session).limoUnlocked);
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
 * Travel via limo to a Strip destination. Debits fare when leaving home or
 * hopping between properties; return to Mandalay is complimentary after first unlock.
 * @param {import("./core.js").PlayerSession} session
 * @param {string} destinationId
 */
export function travelByLimo(session, destinationId) {
  const dest = STRIP_DESTINATIONS[destinationId];
  if (!dest) return { ok: false, message: "Driver shrugs. That address isn't on the Strip map." };

  const st = ensureStripTravel(session);
  if (!st.limoUnlocked) {
    return { ok: false, message: "Call the limo from your room phone first." };
  }
  if (st.destinationId === destinationId) {
    return { ok: false, message: `You're already at ${dest.shortName}.` };
  }

  const fare = destinationId === HOME_DESTINATION_ID ? 0 : dest.fare;
  if (fare > 0) {
    if (!session.wallet.debit(fare, "limo", `Limo to ${dest.shortName}`)) {
      return {
        ok: false,
        message: `Limo to ${dest.shortName} is ${fare} chips. You're short on the curb.`,
      };
    }
  }

  const from = getCurrentDestination(session);
  st.lastDestinationId = st.destinationId;
  st.destinationId = destinationId;
  st.lastFare = fare;
  st.tripCount += 1;
  if (!st.visits.includes(destinationId) && destinationId !== HOME_DESTINATION_ID) {
    st.visits.push(destinationId);
  }

  applyDestinationTheme(session);

  const fareNote = fare > 0 ? ` Fare: ${fare} chips.` : " Complimentary return.";
  return {
    ok: true,
    destination: dest,
    fare,
    message: `Private driver from ${from.shortName} → ${dest.shortName}.${fareNote} ${dest.tagline}`,
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
  // Shared floor machines always OK at home; at away properties, still show
  // a curated shared set so tables/slots floors aren't empty.
  if (dest.id === HOME_DESTINATION_ID) return true;
  // Away: allow shared classics/video/progressive unless home-branded only.
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
