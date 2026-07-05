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

/** Real-world active play time as a 24-hour duration (HH:MM:SS). */
export function formatPlayTimeReal(ms) {
  if (!ms || ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** In-game casino time using the same scale as the resort day/night cycle. */
export function formatCasinoTimeInGame(ms) {
  if (!ms || ms <= 0) return "0m in the casino";

  const totalGameMinutes = (ms / MS_PER_GAME_DAY) * 24 * 60;
  const days = Math.floor(totalGameMinutes / (24 * 60));
  const hours = Math.floor((totalGameMinutes % (24 * 60)) / 60);
  const minutes = Math.floor(totalGameMinutes % 60);

  if (days > 0) {
    if (hours > 0) return `${days}d ${hours}h in the casino`;
    if (minutes > 0) return `${days}d ${minutes}m in the casino`;
    return `${days}d in the casino`;
  }
  if (hours > 0) {
    if (minutes > 0) return `${hours}h ${minutes}m in the casino`;
    return `${hours}h in the casino`;
  }
  return `${minutes}m in the casino`;
}

/** Compact save-slot line: real play time + in-game casino time. */
export function formatSaveSlotPlayTimes(ms) {
  return `${formatPlayTimeReal(ms)} played · ${formatCasinoTimeInGame(ms)}`;
}

export function formatPlayTimeLabel(ms) {
  return `Play time: ${formatPlayTimeReal(ms)}`;
}

export function formatCasinoTimeLabel(ms) {
  return `Casino time: ${formatCasinoTimeInGame(ms)}`;
}

export function formatPlayTimeSummary(ms) {
  return `${formatPlayTimeLabel(ms)} · ${formatCasinoTimeLabel(ms)}`;
}
