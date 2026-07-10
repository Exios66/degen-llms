/**
 * Minimal quest tracker for RPG save state (rpg.quests).
 */
export class QuestManager {
  /**
   * @param {import("../../../js/core.js").PlayerSession} session
   * @param {{ onUpdate?: () => void }} [hooks]
   */
  constructor(session, hooks = {}) {
    this.session = session;
    this.hooks = hooks;
  }

  get quests() {
    return this.session.ensureRpgState().quests;
  }

  start(id, target = 1) {
    if (this.quests[id]?.stage === "complete") return;
    if (!this.quests[id]) {
      this.quests[id] = { stage: 0, target };
      this.hooks.onUpdate?.();
    }
  }

  /**
   * @param {string} id
   * @param {number} [by]
   */
  advance(id, by = 1) {
    this.start(id, id === "shark_photos" ? 5 : 1);
    const q = this.quests[id];
    if (!q || q.stage === "complete") return q;
    if (typeof q.stage === "number") {
      q.stage = Math.min(q.stage + by, q.target ?? 1);
      if (q.stage >= (q.target ?? 1)) {
        q.stage = "complete";
        this.session.ensureRpgState().flags[`quest_${id}_complete`] = true;
      }
    }
    this.hooks.onUpdate?.();
    return q;
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

  summaryLines() {
    return Object.entries(this.quests).map(([id, q]) => {
      if (q.stage === "complete") return `${id}: COMPLETE`;
      return `${id}: ${q.stage}/${q.target ?? "?"}`;
    });
  }
}

export const QUEST_DEFS = {
  shark_photos: { label: "Shark Reef Photographer", target: 5 },
  dana_lucky_hand: { label: "Lucky Hand", target: 1 },
};
