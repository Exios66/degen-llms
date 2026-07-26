import {
  fmtChips,
  saveSlot,
  defaultRpgState,
  bootstrapSessionForRpg,
} from "../../../js/core.js";
import { defaultAppearance, normalizeAppearance } from "./CharacterAppearance.js";

/**
 * Persist RPG position/state alongside the shared casino save library.
 */
export class SaveAdapter {
  /**
   * @param {import("../../../js/core.js").PlayerSession} session
   */
  constructor(session) {
    this.session = session;
  }

  get rpg() {
    return this.session.ensureRpgState();
  }

  updatePosition(x, y, mapId = "main_resort") {
    const rpg = this.rpg;
    rpg.x = x;
    rpg.y = y;
    rpg.mapId = mapId;
  }

  setFlag(flag, value = true) {
    this.rpg.flags[flag] = value;
  }

  hasFlag(flag) {
    return Boolean(this.rpg.flags[flag]);
  }

  persist() {
    if (this.session.slotId != null) {
      saveSlot(this.session);
    }
  }

  hudLines() {
    return {
      name: this.session.playerName,
      chips: fmtChips(this.session.wallet.balance),
      slot: this.session.slotLabel || (this.session.slotId ? `Slot ${this.session.slotId}` : "Guest"),
    };
  }
}

export function initSessionRpg(session, spawn = null, { allowDefaultArchetype = true } = {}) {
  bootstrapSessionForRpg(session);
  const rpg = session.rpg;
  if (spawn) {
    rpg.x = spawn.x;
    rpg.y = spawn.y;
  }
  if (!rpg.playerSprite) {
    rpg.playerSprite = "weekend_warrior";
  }
  if (!rpg.archetype && allowDefaultArchetype) {
    rpg.archetype = rpg.playerSprite || "weekend_warrior";
  }
  if (!rpg.appearance && (rpg.archetype || allowDefaultArchetype)) {
    rpg.appearance = defaultAppearance(rpg.archetype || rpg.playerSprite || "weekend_warrior");
  } else if (rpg.appearance) {
    rpg.appearance = normalizeAppearance(rpg);
  }
  return session;
}

export { defaultRpgState };
