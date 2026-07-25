import {
  fmtChips,
  saveSlot,
  defaultRpgState,
} from "../../../js/core.js";

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

export function initSessionRpg(session, spawn = null) {
  session.ensureRpgState();
  if (spawn) {
    session.rpg.x = spawn.x;
    session.rpg.y = spawn.y;
  }
  if (!session.rpg.playerSprite) {
    session.rpg.playerSprite = "weekend_warrior";
  }
  if (!session.rpg.archetype) {
    session.rpg.archetype = session.rpg.playerSprite || "weekend_warrior";
  }
  if (session.rpg.worldTime == null) session.rpg.worldTime = 720;
  if (!session.rpg.reputation) {
    session.rpg.reputation = { whales: 0, staff: 0, tourists: 0 };
  }
  return session;
}

export { defaultRpgState };
