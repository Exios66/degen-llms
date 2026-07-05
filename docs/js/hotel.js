import { secureRandomInt, fmtChips } from "./core.js";

/** @typedef {"mandalay_bay"} PropertyId */
/** @typedef {"standard" | "suite" | "penthouse"} RoomTypeId */

export const SAVE_VERSION_WITH_HOTEL = 4;

/** Future MGM Vegas properties — Mandalay Bay ships first. */
export const PROPERTIES = {
  mandalay_bay: {
    id: "mandalay_bay",
    name: "Mandalay Bay",
    tagline: "11 acres of pool complex · shark reef · championship boxing",
    wings: ["south", "east", "sky"],
  },
};

export const ROOM_TYPES = {
  standard: {
    id: "standard",
    label: "Deluxe King",
    wing: "south",
    floor: 23,
    description: "Gold-carpet comfort overlooking the bay — perfectly adequate unless you're comped.",
    compId: "room_night",
  },
  suite: {
    id: "suite",
    label: "Panorama Suite",
    wing: "east",
    floor: 31,
    description: "Floor-to-ceiling windows, separate living room, minibar that judges you.",
    compId: "suite_upgrade",
  },
  penthouse: {
    id: "penthouse",
    label: "Chairman Penthouse",
    wing: "sky",
    floor: 62,
    description: "The elevator requires a separate elevator. Butler not included but implied.",
    compId: "penthouse_fantasy",
  },
};

/** Hallway stumble beats — wrong turns are comedic; correct path uses reservation wing. */
const HALLWAY_BEATS = [
  {
    id: "elevator",
    text: "The elevator dings. A couple in matching robes exits holding slot cups. The hallway stretches in three directions.",
    choices: (hotel) => [
      { label: "Left — toward the convention center", wing: "west", quip: "You pass a ballroom. A keynote on synergy is happening. Your room is not here." },
      { label: "Right — toward the tower signage", wing: hotel.wing, quip: null },
      { label: "Straight — follow the shark mural", wing: "reef", quip: "The mural winks. You are still lost. Sharks do not give directions." },
    ],
  },
  {
    id: "ice_machine",
    text: "An ice machine hums like a slot reel. Room numbers in the 22000s to the left; a gold elevator to the right.",
    choices: (hotel) => [
      { label: `Take the gold elevator to floor ${hotel.floor}`, wing: hotel.wing, quip: null },
      { label: "Check the ice machine for clues", wing: "ice", quip: "The machine dispenses ice and disappointment. No clues." },
      { label: "Follow housekeeping cart", wing: "service", quip: "The cart turns into STAFF ONLY. A badge beeps. You retreat." },
    ],
  },
  {
    id: "carpet",
    text: "The carpet pattern repeats. You are either close or having a déjà vu episode.",
    choices: (hotel) => [
      { label: `Look for room ${hotel.roomNumber}`, wing: hotel.wing, quip: null },
      { label: "Ask a passing tourist", wing: "tourist", quip: "\"I came for the wave pool,\" they say, and wander off." },
      { label: "Sit down and reconsider life", wing: "existential", quip: "The carpet is supportive emotionally but not geographically." },
    ],
  },
];

export function defaultHotelState(overrides = {}) {
  const wing = overrides.wing ?? "south";
  const floor = overrides.floor ?? ROOM_TYPES.standard.floor;
  const roomNumber = overrides.roomNumber ?? generateRoomNumber(floor);
  return {
    propertyId: "mandalay_bay",
    reservationCode: overrides.reservationCode ?? `MB-${secureRandomInt(1000, 9999)}`,
    roomType: overrides.roomType ?? "standard",
    wing,
    floor,
    roomNumber,
    nightsRemaining: overrides.nightsRemaining ?? 2,
    foundReservation: overrides.foundReservation ?? false,
    reachedRoom: overrides.reachedRoom ?? false,
    hallwayProgress: overrides.hallwayProgress ?? 0,
    hallwayLog: overrides.hallwayLog ?? [],
    frontDeskVisits: overrides.frontDeskVisits ?? 0,
    ...overrides,
  };
}

function generateRoomNumber(floor) {
  return floor * 1000 + secureRandomInt(10, 38);
}

export function getRoomType(hotel) {
  return ROOM_TYPES[hotel.roomType] ?? ROOM_TYPES.standard;
}

export function getProperty(hotel) {
  return PROPERTIES[hotel.propertyId] ?? PROPERTIES.mandalay_bay;
}

export function reservationHint(hotel) {
  const room = getRoomType(hotel);
  return `${room.label} · ${getProperty(hotel).name} · ${hotel.wing.toUpperCase()} tower · Floor ${hotel.floor} · Room ${hotel.roomNumber} · Conf ${hotel.reservationCode}`;
}

export function sessionNetChips(session) {
  return session.wallet?.netSession ?? 0;
}

export function isNetPositive(session) {
  return sessionNetChips(session) > 0;
}

/**
 * @param {import("./core.js").PlayerSession} session
 */
export function ensureHotel(session) {
  if (!session.hotel) {
    session.hotel = defaultHotelState();
  }
  return session.hotel;
}

export function attachHotelToSession(session, data) {
  if (data.hotel) {
    session.hotel = { ...defaultHotelState(), ...data.hotel };
    return;
  }
  ensureHotel(session);
}

/** Reveal reservation details in MGM Rewards app. */
export function findReservation(session) {
  const hotel = ensureHotel(session);
  if (hotel.foundReservation) {
    return { already: true, hint: reservationHint(hotel) };
  }
  hotel.foundReservation = true;
  return {
    already: false,
    hint: reservationHint(hotel),
    clue: `Head to the ${hotel.wing.toUpperCase()} tower. Gold elevator to floor ${hotel.floor}.`,
  };
}

/**
 * @returns {{ success: boolean, quip?: string, done?: boolean }}
 */
export function hallwayChoice(session, choiceIndex) {
  const hotel = ensureHotel(session);
  if (!hotel.foundReservation) {
    return { success: false, quip: "Open MGM Rewards (P) and locate your reservation first." };
  }
  const beat = HALLWAY_BEATS[hotel.hallwayProgress];
  if (!beat) {
    hotel.reachedRoom = true;
    return { success: true, done: true, quip: `You found it — room ${hotel.roomNumber}. The key card works on the third try.` };
  }
  const choices = beat.choices(hotel);
  const pick = choices[choiceIndex];
  if (!pick) return { success: false, quip: "Pick a direction." };
  hotel.hallwayLog.push(pick.label);
  if (pick.wing === hotel.wing && !pick.quip) {
    hotel.hallwayProgress += 1;
    if (hotel.hallwayProgress >= HALLWAY_BEATS.length) {
      hotel.reachedRoom = true;
      return { success: true, done: true, quip: `Room ${hotel.roomNumber}. Home, temporarily.` };
    }
    return { success: true, quip: "That felt right. Onward." };
  }
  return { success: false, quip: pick.quip ?? "Dead end." };
}

export function currentHallwayBeat(session) {
  const hotel = ensureHotel(session);
  if (hotel.reachedRoom) return null;
  return HALLWAY_BEATS[hotel.hallwayProgress] ?? null;
}

/** @returns {{ ok: boolean, message: string }} */
export function upgradeRoom(session, targetType, rewardsTracker) {
  const hotel = ensureHotel(session);
  const target = ROOM_TYPES[targetType];
  if (!target) return { ok: false, message: "Unknown room type." };
  const rewards = rewardsTracker?.ensureRewards?.() ?? session.rewards;
  const hasComp = rewards?.unlockedComps?.includes(target.compId) &&
    !rewards?.redeemedComps?.includes(target.compId);
  const netPositive = isNetPositive(session);

  if (targetType === "standard") {
    return { ok: false, message: "You're already at baseline luxury." };
  }
  if (hasComp) {
    rewardsTracker?.redeemComp?.(target.compId);
    hotel.roomType = targetType;
    hotel.wing = target.wing;
    hotel.floor = target.floor;
    hotel.roomNumber = generateRoomNumber(target.floor);
    hotel.foundReservation = false;
    hotel.reachedRoom = false;
    hotel.hallwayProgress = 0;
    hotel.hallwayLog = [];
    return { ok: true, message: `Comp applied! Upgraded to ${target.label}. Check MGM Rewards for your new room.` };
  }
  if (netPositive && targetType === "suite") {
    const cost = 500;
    if (session.wallet.balance < cost) {
      return { ok: false, message: `Need ${fmtChips(cost)} on your card for a suite upgrade.` };
    }
    session.wallet.debit(cost, "hotel", "Suite upgrade");
    hotel.roomType = targetType;
    hotel.wing = target.wing;
    hotel.floor = target.floor;
    hotel.roomNumber = generateRoomNumber(target.floor);
    hotel.foundReservation = false;
    hotel.reachedRoom = false;
    hotel.hallwayProgress = 0;
    return { ok: true, message: `Paid ${fmtChips(cost)} — welcome to the ${target.label}.` };
  }
  if (netPositive && targetType === "penthouse") {
    const cost = 2000;
    if (session.wallet.balance < cost) {
      return { ok: false, message: `The penthouse requires ${fmtChips(cost)} or a Chairman comp.` };
    }
    session.wallet.debit(cost, "hotel", "Penthouse upgrade");
    hotel.roomType = targetType;
    hotel.wing = target.wing;
    hotel.floor = target.floor;
    hotel.roomNumber = generateRoomNumber(target.floor);
    hotel.foundReservation = false;
    hotel.reachedRoom = false;
    hotel.hallwayProgress = 0;
    return { ok: true, message: `The penthouse is yours. Try not to let it go to your head.` };
  }
  return { ok: false, message: "Earn comps on the floor or finish net-positive before upgrading." };
}

/** @returns {{ ok: boolean, message: string }} */
export function extendStay(session, nights = 1, rewardsTracker) {
  const hotel = ensureHotel(session);
  const rewards = rewardsTracker?.ensureRewards?.() ?? session.rewards;
  const hasRoomComp = rewards?.unlockedComps?.includes("room_night") &&
    !rewards?.redeemedComps?.includes("room_night");
  const netPositive = isNetPositive(session);

  if (hasComp) {
    rewardsTracker?.redeemComp?.("room_night");
    hotel.nightsRemaining += nights;
    return { ok: true, message: `Comp night applied! ${hotel.nightsRemaining} night(s) remaining.` };
  }
  if (netPositive) {
    const cost = 150 * nights;
    if (!session.wallet.debit(cost, "hotel", `Extend stay ${nights} night(s)`)) {
      return { ok: false, message: `Need ${fmtChips(cost)} to extend.` };
    }
    hotel.nightsRemaining += nights;
    return { ok: true, message: `Stay extended. ${hotel.nightsRemaining} night(s) on the books.` };
  }
  return { ok: false, message: "Extend when you're net-positive on the floor, or unlock a room-night comp." };
}

export function resetHallway(session) {
  const hotel = ensureHotel(session);
  hotel.hallwayProgress = 0;
  hotel.hallwayLog = [];
  hotel.reachedRoom = false;
}
