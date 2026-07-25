import { ensurePoolComplex } from "../../../js/pool-complex.js";
import { ensureHotel } from "../../../js/hotel.js";
import { ensureRoomAmenities } from "../../../js/room-amenities.js";
import { barForDrink, ensureAmenities } from "../../../js/casino-amenities.js";
import { getResortCompletion } from "../../../js/resort-completion.js";
import { dexProgress, syncDexFromSession } from "./Dex.js";

/** Fallback registry used when js/data/quests.json cannot be fetched. */
export const QUEST_DEFS = {
  shark_photos: { label: "Shark Reef Photographer", target: 5, autoStart: true },
  dana_lucky_hand: { label: "Lucky Hand", target: 1, autoStart: true },
};

/**
 * Quest tracker over `rpg.quests`, backed by the js/data/quests.json registry.
 *
 * Most quests are derived rather than manually incremented: `syncDerived()`
 * reads the shared session state (reef photos, bars visited, dex counts,
 * resort completion) so quest progress can never disagree with the systems
 * that actually produced it.
 */
export class QuestManager {
  /**
   * @param {import("../../../js/core.js").PlayerSession} session
   * @param {{ onUpdate?: () => void, onComplete?: (id: string, def: object) => void }} [hooks]
   */
  constructor(session, hooks = {}) {
    this.session = session;
    this.hooks = hooks;
    this.defs = { ...QUEST_DEFS };
    /**
     * Progress the world has already produced, whether or not the matching
     * quest has been accepted. Accepting a quest late still credits the work.
     * @type {Record<string, number>}
     */
    this.derived = {};
  }

  /** @param {Record<string, object>} registry */
  loadRegistry(registry) {
    if (registry && typeof registry === "object") {
      this.defs = registry;
    }
    for (const [id, def] of Object.entries(this.defs)) {
      if (def.autoStart) this.start(id, def.target ?? 1);
    }
    this.syncDerived();
  }

  def(id) {
    return this.defs[id] ?? null;
  }

  label(id) {
    return this.defs[id]?.label ?? id;
  }

  get quests() {
    return this.session.ensureRpgState().quests;
  }

  start(id, target = null) {
    if (this.quests[id]) return;
    this.quests[id] = { stage: 0, target: target ?? this.defs[id]?.target ?? 1 };
    if (this.derived[id] != null) this._setProgress(id, this.derived[id]);
    this.hooks.onUpdate?.();
  }

  /**
   * @param {string} id
   * @param {number} [by]
   */
  advance(id, by = 1) {
    this.start(id);
    const q = this.quests[id];
    if (!q || q.stage === "complete") return q;
    if (typeof q.stage === "number") {
      this._setProgress(id, q.stage + by);
    }
    this.hooks.onUpdate?.();
    return q;
  }

  /**
   * Set absolute progress on an accepted quest, completing it at its target.
   * Unaccepted quests only bank the value in `derived`.
   */
  setProgress(id, value) {
    this.derived[id] = value;
    if (!this.quests[id]) return false;
    const changed = this._setProgress(id, value);
    if (changed) this.hooks.onUpdate?.();
    return changed;
  }

  _setProgress(id, value) {
    const q = this.quests[id];
    if (!q || q.stage === "complete") return false;
    const target = q.target ?? this.defs[id]?.target ?? 1;
    const next = Math.max(0, Math.min(value, target));
    if (next === q.stage) return false;
    q.stage = next;
    if (next >= target) {
      q.stage = "complete";
      this.session.ensureRpgState().flags[`quest_${id}_complete`] = true;
      this.hooks.onComplete?.(id, this.defs[id] ?? null);
    }
    return true;
  }

  setStage(id, stage, target = 1) {
    this.quests[id] = { stage, target };
    this.hooks.onUpdate?.();
  }

  isComplete(id) {
    return this.quests[id]?.stage === "complete";
  }

  stage(id) {
    return this.quests[id]?.stage ?? 0;
  }

  /**
   * @param {{ id: string, min?: number, complete?: boolean }} req
   */
  meets(req) {
    if (!req?.id) return true;
    const q = this.quests[req.id];
    if (req.complete) return q?.stage === "complete";
    const min = req.min ?? 1;
    if (q?.stage === "complete") return true;
    return typeof q?.stage === "number" && q.stage >= min;
  }

  badges() {
    return Object.entries(this.quests)
      .filter(([, q]) => q.stage === "complete")
      .map(([id]) => id);
  }

  /** Recompute every quest whose progress lives in shared session state. */
  syncDerived() {
    const session = this.session;
    syncDexFromSession(session);
    const rpg = session.ensureRpgState();

    const pc = ensurePoolComplex(session);
    this.setProgress("shark_photos", pc.sharkPhotos?.length ?? 0);
    this.setProgress("pool_vignettes", pc.unlockedEvents?.length ?? 0);

    const hotel = ensureHotel(session);
    const ra = ensureRoomAmenities(hotel);
    this.setProgress("room_vignettes", ra.unlockedEvents?.length ?? 0);

    const amenities = ensureAmenities(session);
    this.setProgress("sky_bridge_haul", amenities.purchasedItems?.length ?? 0);
    const barsVisited = new Set(
      (amenities.barOrders ?? []).map((drinkId) => barForDrink(drinkId)?.id).filter(Boolean)
    );
    this.setProgress("bar_crawl", barsVisited.size);

    this.setProgress("jackpot_hunt", dexProgress(session, "slots").found);
    this.setProgress("dealer_meet_and_greet", dexProgress(session, "staff").found);
    this.setProgress("egg_hunt", Object.keys(rpg.eggs ?? {}).length);
    this.setProgress("resort_completion", getResortCompletion(session).percent);
    if (rpg.flags?.played_blackjack) this.setProgress("dana_lucky_hand", 1);
  }

  /** @returns {{ id: string, label: string, hint: string, stage: number|string, target: number, complete: boolean }[]} */
  entries() {
    return Object.entries(this.quests).map(([id, q]) => {
      const def = this.defs[id] ?? {};
      return {
        id,
        label: def.label ?? id,
        hint: def.hint ?? "",
        reward: def.reward ?? "",
        stage: q.stage,
        target: q.target ?? def.target ?? 1,
        complete: q.stage === "complete",
      };
    });
  }

  /**
   * Quests in the registry the player has not accepted yet, with the NPC who
   * hands them out — the quest log doubles as a to-do list of people to meet.
   * @returns {{ id: string, label: string, hint: string, giver: string }[]}
   */
  available() {
    return Object.entries(this.defs)
      .filter(([id]) => !this.quests[id])
      .map(([id, def]) => ({
        id,
        label: def.label ?? id,
        hint: def.hint ?? "",
        giver: def.giverName ?? def.giver ?? "",
      }));
  }

  summaryLines() {
    return this.entries().map((q) =>
      q.complete ? `${q.label}: COMPLETE` : `${q.label}: ${q.stage}/${q.target}`);
  }
}
