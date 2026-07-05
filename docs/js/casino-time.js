/** Must stay in sync with world-cycle.js — 2 hours real time = 1 in-game day. */
const MS_PER_GAME_DAY = 2 * 60 * 60 * 1000;

/** @type {number | null} */
let casinoClockStart = null;

export function startCasinoClock() {
  casinoClockStart = Date.now();
}

export function stopCasinoClock() {
  casinoClockStart = null;
}

export function isCasinoClockRunning() {
  return casinoClockStart != null;
}

/** @param {import("./core.js").PlayerSession} session */
export function getCasinoTimeMs(session) {
  const stored = session.casinoTimeMs ?? 0;
  if (session.slotId == null || casinoClockStart == null) return stored;
  return stored + Math.max(0, Date.now() - casinoClockStart);
}

/** @param {import("./core.js").PlayerSession} session */
export function flushCasinoTime(session) {
  if (session.slotId == null || casinoClockStart == null) return;
  session.casinoTimeMs = getCasinoTimeMs(session);
  casinoClockStart = Date.now();
}

/** Format active play time using the same scale as the resort day/night cycle. */
export function formatCasinoTimeInGame(ms) {
  if (!ms || ms <= 0) return "0m in resort";

  const totalGameMinutes = (ms / MS_PER_GAME_DAY) * 24 * 60;
  const days = Math.floor(totalGameMinutes / (24 * 60));
  const hours = Math.floor((totalGameMinutes % (24 * 60)) / 60);
  const minutes = Math.floor(totalGameMinutes % 60);

  if (days > 0) {
    if (hours > 0) return `${days}d ${hours}h in resort`;
    if (minutes > 0) return `${days}d ${minutes}m in resort`;
    return `${days}d in resort`;
  }
  if (hours > 0) {
    if (minutes > 0) return `${hours}h ${minutes}m in resort`;
    return `${hours}h in resort`;
  }
  return `${minutes}m in resort`;
}

export function formatCasinoTimeLabel(ms) {
  return `Time in casino: ${formatCasinoTimeInGame(ms)}`;
}
