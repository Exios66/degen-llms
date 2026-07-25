/**
 * Hard-coded local mirror of the save library so casino profiles survive
 * storage glitches and are remembered across sessions.
 */

export const PROFILE_CACHE_KEY = "mandalay-bay-profile-cache";
export const ACTIVE_SLOT_KEY = "mandalay-bay-active-slot";
export const PROFILE_CACHE_VERSION = 1;

/** @typedef {import("./core.js").PlayerSession} PlayerSession */

/**
 * Write a full snapshot of the save library to the profile cache.
 * @param {object} lib
 */
export function mirrorLibraryToCache(lib) {
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
      version: PROFILE_CACHE_VERSION,
      savedAt: new Date().toISOString(),
      library: lib,
    }));
  } catch {
    /* quota / private mode */
  }
}

/**
 * Read the cached library snapshot, if any.
 * @returns {object | null}
 */
export function readCacheLibrary() {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data.library ?? null;
  } catch {
    return null;
  }
}

/**
 * Remember which save slot the player last used.
 * @param {number | null} slotId
 */
export function setActiveSlotId(slotId) {
  try {
    if (slotId == null) {
      localStorage.removeItem(ACTIVE_SLOT_KEY);
      return;
    }
    localStorage.setItem(ACTIVE_SLOT_KEY, String(slotId));
  } catch {
    /* ignore */
  }
}

/**
 * @returns {number | null}
 */
export function getActiveSlotId() {
  try {
    const n = parseInt(localStorage.getItem(ACTIVE_SLOT_KEY), 10);
    if (Number.isFinite(n) && n >= 1 && n <= 5) return n;
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Summarize the active profile for title / boot screens.
 * @param {() => import("./core.js").SlotSummary[]} listSlots
 * @returns {import("./core.js").SlotSummary | null}
 */
export function getActiveProfileSummary(listSlots) {
  const slotId = getActiveSlotId();
  if (slotId == null) return null;
  const slots = listSlots();
  return slots.find((s) => s.slotId === slotId && s.occupied) ?? null;
}
