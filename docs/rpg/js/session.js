import {
  loadSlot, createSlot, saveSlot, createGuestSession,
  ensureRpgData, listSlots, recentSlots, formatSaveTime, fmtChips,
} from "../../js/core.js";

export { ensureRpgData, saveSlot as saveSession, fmtChips, listSlots, recentSlots, formatSaveTime };

export function resolveSessionFromParams() {
  const params = new URLSearchParams(window.location.search);

  if (params.get("guest") === "1") {
    const session = createGuestSession({
      playerName: params.get("name") || "Guest",
      chips: Math.max(0, parseInt(params.get("chips") || "1000", 10)),
    });
    ensureRpgData(session);
    return { session, needsSavePicker: false };
  }

  const slotParam = params.get("slot");
  if (slotParam) {
    const slotId = parseInt(slotParam, 10);
    if (slotId >= 1 && slotId <= 5) {
      if (params.get("new") === "1") {
        return { session: null, needsSavePicker: true, createSlotId: slotId };
      }
      const loaded = loadSlot(slotId);
      if (loaded) {
        ensureRpgData(loaded);
        return { session: loaded, needsSavePicker: false };
      }
      return { session: null, needsSavePicker: true, createSlotId: slotId };
    }
  }

  return { session: null, needsSavePicker: true, createSlotId: null };
}

export function travelTo(session, locationId) {
  ensureRpgData(session);
  session.rpgData.location = locationId;
  saveSlot(session);
}

export function setFlag(session, flag) {
  ensureRpgData(session);
  session.rpgData.flags[flag] = true;
  saveSlot(session);
}

export function casinoUrl(session) {
  if (session.slotId != null) {
    return `../?slot=${session.slotId}`;
  }
  return "../?guest=1";
}

export function persistSession(session) {
  if (session.slotId != null) saveSlot(session);
}
