/** Mandalay Bay lobby guest directory — hardcoded roster + persistent signatures. */

import { formatVegasSignedAt } from "./vegas-time.js";

const REGISTRY_PATH = "data/guest_directory.json";
const SIGNATURES_KEY = "mandalay-bay-guest-directory-signatures";

/** @type {{ title: string, subtitle: string, guests: GuestEntry[] } | null} */
let cachedRegistry = null;

/**
 * @typedef {{ name: string, signedAt: string, note?: string, seed?: boolean }} GuestEntry
 * @typedef {{ ok: true, entry: GuestEntry } | { ok: false, message: string }} SignResult
 */

/** Load the hardcoded guest roster bundled with the site. */
export async function loadGuestRegistry() {
  if (cachedRegistry) return cachedRegistry;
  try {
    const res = await fetch(REGISTRY_PATH);
    if (res.ok) {
      const data = await res.json();
      cachedRegistry = {
        title: data.title ?? "Mandalay Bay Guest Directory",
        subtitle: data.subtitle ?? "",
        guests: Array.isArray(data.guests) ? data.guests.map((g) => ({ ...g, seed: true })) : [],
      };
      return cachedRegistry;
    }
  } catch {
    /* fall through */
  }
  cachedRegistry = { title: "Mandalay Bay Guest Directory", subtitle: "", guests: [] };
  return cachedRegistry;
}

/** @returns {GuestEntry[]} */
export function loadStoredSignatures() {
  try {
    const raw = localStorage.getItem(SIGNATURES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** @param {GuestEntry[]} signatures */
function writeStoredSignatures(signatures) {
  try {
    localStorage.setItem(SIGNATURES_KEY, JSON.stringify(signatures));
  } catch {
    /* ignore quota errors */
  }
}

function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ");
}

function namesMatch(a, b) {
  return normalizeName(a).toLowerCase() === normalizeName(b).toLowerCase();
}

/** Merge hardcoded roster with locally persisted signatures, oldest first. */
export async function listAllGuests() {
  const registry = await loadGuestRegistry();
  const stored = loadStoredSignatures();
  const merged = [...registry.guests, ...stored];
  merged.sort((a, b) => new Date(a.signedAt).getTime() - new Date(b.signedAt).getTime());
  return merged;
}

/** @param {string} name */
export function hasSigned(name) {
  const normalized = normalizeName(name);
  if (!normalized) return false;
  return loadStoredSignatures().some((g) => namesMatch(g.name, normalized));
}

/**
 * Sign the guest directory under the given name.
 * @param {string} name
 * @param {string} [note]
 * @returns {SignResult}
 */
export function signGuestDirectory(name, note = "") {
  const trimmed = normalizeName(name);
  if (!trimmed) {
    return { ok: false, message: "Enter a name to sign the guest book." };
  }
  if (trimmed.length > 64) {
    return { ok: false, message: "Name must be 64 characters or fewer." };
  }
  const noteTrimmed = note.trim().slice(0, 160);
  const stored = loadStoredSignatures();
  if (stored.some((g) => namesMatch(g.name, trimmed))) {
    return { ok: false, message: `"${trimmed}" has already signed the guest directory.` };
  }
  const entry = {
    name: trimmed,
    signedAt: new Date().toISOString(),
    note: noteTrimmed || undefined,
  };
  stored.push(entry);
  writeStoredSignatures(stored);
  return { ok: true, entry };
}

/** Format ISO timestamp for display in the guest book. */
export function formatSignedAt(iso) {
  return formatVegasSignedAt(iso);
}

/** Reset cached registry (for tests). */
export function resetGuestRegistryCache() {
  cachedRegistry = null;
}
