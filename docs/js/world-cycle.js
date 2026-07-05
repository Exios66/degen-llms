/** Real-time day/night cycle — 2 hours real time = 1 in-game day. */

import { fmtChips } from "./core.js";
import { defaultHotelState, ensureHotel, isNetPositive } from "./hotel.js";
import { getSessionTierIndex } from "./resort-bridge.js";

/** 2 hours of real time = one in-game day. */
export const MS_PER_GAME_DAY = 2 * 60 * 60 * 1000;

export const WORLD_PHASES = [
  { id: 0, label: "Dawn over the bay", start: 0, end: 0.25 },
  { id: 1, label: "Midday chlorination", start: 0.25, end: 0.5 },
  { id: 2, label: "Neon dusk", start: 0.5, end: 0.75 },
  { id: 3, label: "2 AM clarity", start: 0.75, end: 1.0 },
];

/** Reservation requirement rotates each in-game day. */
export const RESERVATION_REQUIREMENTS = [
  {
    id: "phone",
    label: "MGM Rewards phone — press P → Reservation",
    needsPhone: true,
    needsDesk: false,
    needsNetPositive: false,
  },
  {
    id: "desk",
    label: "Front desk terminal — Clerk Carmen must locate your conf",
    needsPhone: false,
    needsDesk: true,
    needsNetPositive: false,
  },
  {
    id: "both",
    label: "Phone locate, then desk confirmation (two-step check-in)",
    needsPhone: true,
    needsDesk: true,
    needsNetPositive: false,
  },
  {
    id: "whale",
    label: "Net-positive floor session, then desk check-in",
    needsPhone: false,
    needsDesk: true,
    needsNetPositive: true,
  },
];

export const DAILY_RATES = {
  standard: { room: 89, resort: 45, parking: 25, label: "Deluxe King daily" },
  suite: { room: 250, resort: 45, parking: 15, label: "Panorama Suite daily" },
  penthouse: { room: 890, resort: 45, parking: 0, label: "Chairman Penthouse daily" },
};

export function defaultWorldCycle(overrides = {}) {
  return {
    clockAnchorMs: overrides.clockAnchorMs ?? Date.now(),
    processedDay: overrides.processedDay ?? 0,
    reservationConfirmedDesk: overrides.reservationConfirmedDesk ?? false,
    roomEvicted: overrides.roomEvicted ?? false,
    overdueBalance: overrides.overdueBalance ?? 0,
    lastRolloverMessages: overrides.lastRolloverMessages ?? [],
    ...overrides,
  };
}

/** @param {import("./core.js").PlayerSession} session */
export function ensureWorldCycle(session) {
  if (!session.worldCycle) {
    session.worldCycle = defaultWorldCycle();
  }
  const defaults = defaultWorldCycle();
  for (const key of Object.keys(defaults)) {
    if (session.worldCycle[key] === undefined) session.worldCycle[key] = defaults[key];
  }
  return session.worldCycle;
}

export function attachWorldCycleToSession(session, data = {}) {
  if (data.worldCycle) {
    session.worldCycle = { ...defaultWorldCycle(), ...data.worldCycle };
  } else {
    ensureWorldCycle(session);
  }
}

/** @param {import("./core.js").PlayerSession} session */
export function getWorldCycleState(session) {
  const wc = ensureWorldCycle(session);
  const elapsed = Math.max(0, Date.now() - wc.clockAnchorMs);
  const dayFloat = elapsed / MS_PER_GAME_DAY;
  const dayIndex = Math.floor(dayFloat);
  const dayProgress = dayFloat - dayIndex;
  const phase = WORLD_PHASES.find((p) => dayProgress >= p.start && dayProgress < p.end)
    ?? WORLD_PHASES[WORLD_PHASES.length - 1];
  const msIntoDay = elapsed % MS_PER_GAME_DAY;
  const msUntilNextDay = MS_PER_GAME_DAY - msIntoDay;
  const requirement = RESERVATION_REQUIREMENTS[dayIndex % RESERVATION_REQUIREMENTS.length];
  return {
    dayIndex,
    displayDay: dayIndex + 1,
    phase,
    dayProgress,
    msUntilNextDay,
    requirement,
    roomEvicted: wc.roomEvicted,
    overdueBalance: wc.overdueBalance,
  };
}

export function formatTimeRemaining(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m until next day`;
  return `${m}m until next day`;
}

export function getDailyChargeTotal(hotel, tierIndex = 0) {
  const rates = DAILY_RATES[hotel.roomType] ?? DAILY_RATES.standard;
  let resort = rates.resort;
  if (tierIndex >= 3) resort = Math.max(0, resort - 20);
  if (tierIndex >= 5) resort = 0;
  return {
    ...rates,
    resort,
    total: rates.room + resort + rates.parking,
  };
}

function resetDailyReservation(hotel) {
  hotel.foundReservation = false;
  hotel.reservationConfirmedDesk = false;
  hotel.reachedRoom = false;
  hotel.hallwayProgress = 0;
  hotel.hallwayLog = [];
  hotel.lateCheckoutUsed = false;
  hotel.roomEvicted = false;
  if (hotel.roomAmenities) {
    hotel.roomAmenities.checkedOut = false;
  }
}

function applyDayRollover(session, dayIndex) {
  if (!session.hotel) {
    session.hotel = defaultHotelState();
  }
  const hotel = session.hotel;
  const wc = ensureWorldCycle(session);
  const tierIndex = getSessionTierIndex(session);
  const charges = getDailyChargeTotal(hotel, tierIndex);
  const req = RESERVATION_REQUIREMENTS[dayIndex % RESERVATION_REQUIREMENTS.length];

  resetDailyReservation(hotel);

  let message = `Day ${dayIndex + 1} — ${req.label}.`;

  const totalDue = charges.total + wc.overdueBalance;
  if (session.wallet.debit(totalDue, "hotel", `Day ${dayIndex + 1} resort charges`)) {
    wc.overdueBalance = 0;
    wc.roomEvicted = false;
    hotel.roomEvicted = false;
    message += ` ${fmtChips(charges.total)} posted`;
    if (wc.overdueBalance > 0) message += ` (includes overdue)`;
    message += ".";
  } else {
    const paid = session.wallet.balance;
    session.wallet.debit(paid, "hotel", `Partial day ${dayIndex + 1} charges`);
    wc.overdueBalance = totalDue - paid;
    wc.roomEvicted = true;
    hotel.roomEvicted = true;
    hotel.reachedRoom = false;
    message += ` Could not cover ${fmtChips(totalDue)} — ${fmtChips(wc.overdueBalance)} overdue. Room locked until you pay at the desk or win on the floor.`;
  }

  if (hotel.nightsRemaining > 0) {
    hotel.nightsRemaining -= 1;
  }

  return message;
}

/**
 * Advance world clock, apply daily rollovers and charges.
 * @param {import("./core.js").PlayerSession} session
 */
export function syncWorldCycle(session) {
  if (session._worldCycleSyncing) {
    return { ...getWorldCycleState(session), advanced: false, messages: [] };
  }
  session._worldCycleSyncing = true;
  try {
    const wc = ensureWorldCycle(session);
    const state = getWorldCycleState(session);
    const messages = [];

    if (state.dayIndex > wc.processedDay) {
      for (let d = wc.processedDay; d < state.dayIndex; d++) {
        messages.push(applyDayRollover(session, d));
      }
      wc.processedDay = state.dayIndex;
      wc.lastRolloverMessages = messages.slice(-3);
    }

    return { ...state, advanced: messages.length > 0, messages };
  } finally {
    session._worldCycleSyncing = false;
  }
}

/** Current phase for room atmosphere — replaces action-based resortTime. */
export function getWorldPhase(session) {
  return getWorldCycleState(session).phase;
}

export function getReservationRequirement(session) {
  return getWorldCycleState(session).requirement;
}

export function reservationAccessMet(session) {
  if (!session.hotel) return false;
  const hotel = session.hotel;
  const req = getReservationRequirement(session);
  if (req.needsNetPositive && !isNetPositive(session)) return false;
  if (req.needsPhone && !hotel.foundReservation) return false;
  if (req.needsDesk && !hotel.reservationConfirmedDesk) return false;
  if (!req.needsPhone && !req.needsDesk) return true;
  return true;
}

export function reservationStatusMessage(session) {
  if (!session.hotel) return "Check in at the hotel lobby.";
  const hotel = session.hotel;
  const req = getReservationRequirement(session);
  const parts = [`Today: ${req.label}`];
  if (req.needsPhone) {
    parts.push(hotel.foundReservation ? "Phone: located" : "Phone: not located");
  }
  if (req.needsDesk) {
    parts.push(hotel.reservationConfirmedDesk ? "Desk: confirmed" : "Desk: pending");
  }
  if (req.needsNetPositive) {
    parts.push(isNetPositive(session) ? "Floor: net-positive" : "Floor: not net-positive");
  }
  return parts.join(" · ");
}

/** Phone / MGM Rewards reservation step. */
export function locateReservationViaPhone(session) {
  syncWorldCycle(session);
  if (!session.hotel) session.hotel = defaultHotelState();
  const hotel = session.hotel;
  const req = getReservationRequirement(session);
  if (!req.needsPhone && req.needsDesk) {
    return {
      ok: false,
      message: "Today's requirement: front desk only. Visit Clerk Carmen.",
    };
  }
  if (hotel.foundReservation) {
    return { ok: true, already: true, message: reservationStatusMessage(session) };
  }
  hotel.foundReservation = true;
  return {
    ok: true,
    message: `${reservationStatusMessage(session)}\nHead to the ${hotel.wing.toUpperCase()} tower — floor ${hotel.floor}.`,
  };
}

/** Front desk reservation step. */
export function confirmReservationAtDesk(session) {
  syncWorldCycle(session);
  if (!session.hotel) session.hotel = defaultHotelState();
  const hotel = session.hotel;
  const req = getReservationRequirement(session);
  if (req.needsNetPositive && !isNetPositive(session)) {
    return { ok: false, message: "Whale check-in day — finish net-positive on the floor first." };
  }
  if (req.needsPhone && !hotel.foundReservation) {
    return { ok: false, message: "Locate via MGM Rewards phone (P) first — today's two-step check-in." };
  }
  if (!req.needsDesk) {
    return { ok: true, message: "Desk confirmation not required today. Phone locate is enough." };
  }
  if (hotel.reservationConfirmedDesk) {
    return { ok: true, already: true, message: reservationStatusMessage(session) };
  }
  hotel.reservationConfirmedDesk = true;
  hotel.foundReservation = true;
  return {
    ok: true,
    message: `${reservationStatusMessage(session)}\nCarmen stamps your folio. Hallway access granted.`,
  };
}

export function canAccessHotelRoom(session) {
  syncWorldCycle(session);
  const hotel = ensureHotel(session);
  if (hotel.roomEvicted || session.worldCycle?.roomEvicted) return false;
  return reservationAccessMet(session);
}

/** Pay overdue balance + today's catch-up at front desk. */
export function settleHotelOverdue(session) {
  syncWorldCycle(session);
  const wc = ensureWorldCycle(session);
  if (wc.overdueBalance <= 0 && !wc.roomEvicted) {
    return { ok: true, message: "No overdue balance. The minibar still judges you anyway." };
  }
  const amount = wc.overdueBalance;
  if (!session.wallet.debit(amount, "hotel", "Overdue resort charges")) {
    return {
      ok: false,
      message: `Need ${fmtChips(amount)} to restore room access — the casino floor awaits your comeback.`,
    };
  }
  wc.overdueBalance = 0;
  wc.roomEvicted = false;
  const hotel = ensureHotel(session);
  hotel.roomEvicted = false;
  return { ok: true, message: `${fmtChips(amount)} settled. Room access restored. Try to stay ahead tomorrow.` };
}

export function getWorldCycleSummary(session) {
  const state = syncWorldCycle(session);
  const hotel = session.hotel ?? defaultHotelState();
  const charges = getDailyChargeTotal(hotel, getSessionTierIndex(session));
  return {
    ...state,
    timeLabel: formatTimeRemaining(state.msUntilNextDay),
    phaseLabel: state.phase.label,
    dailyTotal: charges.total,
    statusMessage: reservationStatusMessage(session),
  };
}
