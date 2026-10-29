/**
 * JSON-driven branching dialogue overlay (Pokémon / DS style).
 */
import { resolveSpeakerPortrait } from "./CharacterAppearance.js";
import { drawCharacterToCanvas } from "./TextureFactory.js";

export class DialogueManager {
  /**
   * @param {HTMLElement} root
   * @param {{ onClose?: () => void, onFlag?: (flag: string) => void, onEncounter?: (id: string) => void }} hooks
   */
  constructor(root, hooks = {}) {
    this.root = root;
    this.hooks = hooks;
    this.dialogues = {};
    this.flags = {};
    this._resolve = null;
    this._active = false;
    this._systemOnly = false;
    this._typeDelayMs = 18;
  }

  /** @param {"slow"|"normal"|"fast"} speed */
  setTextSpeed(speed) {
    this._typeDelayMs = { slow: 34, normal: 18, fast: 6 }[speed] ?? 18;
  }

  load(dialogues) {
    this.dialogues = dialogues;
  }

  setFlags(flags) {
    this.flags = flags ?? {};
  }

  setQuestManager(qm) {
    this.questManager = qm;
  }

  isActive() {
    return this._active;
  }

  /**
   * Whether the overlay owns the player's input. A branching conversation does;
   * a system toast does not, so walking past a zone sign reads the sign without
   * stopping the player dead for the length of the toast.
   */
  isBlocking() {
    return this._active && !this._systemOnly;
  }

  _buildBox({ speaker, isSystem = false }) {
    const box = document.createElement("div");
    box.className = `dialogue-box dialogue-box--tappable${isSystem ? " dialogue-box--system" : ""}`;

    const inner = document.createElement("div");
    inner.className = "dialogue-box__inner";

    const portraitWrap = document.createElement("div");
    portraitWrap.className = "dialogue-portrait-wrap";
    const portrait = document.createElement("canvas");
    portrait.className = "dialogue-portrait";
    portrait.width = 64;
    portrait.height = 88;
    portrait.setAttribute("aria-hidden", "true");
    drawCharacterToCanvas(portrait, resolveSpeakerPortrait(speaker ?? "Resort"), "down", 0, 2);
    portraitWrap.appendChild(portrait);

    const content = document.createElement("div");
    content.className = "dialogue-box__content";

    const speakerEl = document.createElement("div");
    speakerEl.className = "dialogue-speaker";
    speakerEl.textContent = speaker ?? "";
    content.appendChild(speakerEl);

    const textEl = document.createElement("div");
    textEl.className = "dialogue-text";
    content.appendChild(textEl);

    const advanceHint = document.createElement("div");
    advanceHint.className = "dialogue-advance";
    advanceHint.textContent = "▼ Tap or press Enter / Space / E";
    content.appendChild(advanceHint);

    inner.append(portraitWrap, content);
    box.appendChild(inner);
    return { box, textEl, advanceHint, content };
  }

  /**
   * Brief non-branching toast used for map transitions and system copy.
   * @param {string} text
   * @param {{ speaker?: string, durationMs?: number }} [opts]
   */
  showSystemMessage(text, opts = {}) {
    if (!text) return;
    if (this._active) {
      const prevClose = this.hooks.onClose;
      this.hooks.onClose = () => {
        this.hooks.onClose = prevClose;
        prevClose?.();
        this.showSystemMessage(text, opts);
      };
      return;
    }

    this._active = true;
    this._systemOnly = true;
    this.root.hidden = false;
    this.root.classList.add("dialogue-overlay--toast");
    this.root.innerHTML = "";

    const { box, textEl } = this._buildBox({ speaker: opts.speaker ?? "Resort", isSystem: true });
    textEl.textContent = text;
    this.root.appendChild(box);

    const onPointer = (e) => {
      e.preventDefault();
      dismiss();
    };
    const dismiss = () => {
      if (this._systemTimer) {
        clearTimeout(this._systemTimer);
        this._systemTimer = null;
      }
      box.removeEventListener("pointerdown", onPointer);
      this.root.hidden = true;
      this.root.classList.remove("dialogue-overlay--toast");
      this.root.innerHTML = "";
      this._active = false;
      this._systemOnly = false;
      this._dismissSystem = null;
      // Drain any message queued behind this toast (showSystemMessage wraps
      // onClose while a toast is visible).
      this.hooks.onClose?.();
    };
    this._dismissSystem = dismiss;
    // Only the toast itself swallows the tap: the rest of the screen stays live
    // so a route can be tapped while a room placard is still fading.
    box.addEventListener("pointerdown", onPointer);

    const duration = opts.durationMs ?? 2200;
    this._systemTimer = setTimeout(dismiss, duration);
  }

  /**
   * Start a dialogue tree by id.
   * @returns {Promise<{ action?: string, flag?: string, encounter?: string }>}
   */
  start(dialogueId) {
    // A conversation outranks a toast that happens to still be on screen.
    if (this._systemOnly) this._dismissSystem?.();
    if (this._active) return Promise.resolve({});
    const node = this._resolveNode(dialogueId);
    if (!node) return Promise.resolve({});

    this._active = true;
    this._appliedEffects = new WeakSet();
    this._pendingReputation = null;
    this.root.hidden = false;
    return new Promise((resolve) => {
      this._resolve = resolve;
      this._renderNode(node);
    });
  }

  /**
   * Follow a node id, honoring node-level gates. A node whose gate fails hands
   * off to its `elseNext`, which is how NPCs say something different once a
   * quest has moved on.
   * @param {string} id
   */
  _resolveNode(id, depth = 0) {
    const node = this.dialogues[id];
    if (!node || depth > 8) return node ?? null;
    if (!this._nodeVisible(node)) {
      return node.elseNext ? this._resolveNode(node.elseNext, depth + 1) : null;
    }
    return node;
  }

  _nodeVisible(node) {
    if (node.requiresFlag && !this.flags[node.requiresFlag]) return false;
    if (node.unlessFlag && this.flags[node.unlessFlag]) return false;
    if (node.requiresQuestStage && this.questManager) {
      if (!this.questManager.meets(node.requiresQuestStage)) return false;
    }
    return true;
  }

  close(result = {}) {
    this._cleanupKeys?.();
    this._cleanupKeys = null;
    this._systemOnly = false;
    this.root.classList.remove("dialogue-overlay--toast");
    if (this._systemTimer) {
      clearTimeout(this._systemTimer);
      this._systemTimer = null;
    }
    this.root.hidden = true;
    this.root.innerHTML = "";
    this._active = false;
    const resolve = this._resolve;
    this._resolve = null;
    if (resolve) resolve(result);
    this.hooks.onClose?.();
  }

  _renderNode(node) {
    this._cleanupKeys?.();
    this._cleanupKeys = null;
    this.root.innerHTML = "";
    this._currentNode = node;

    const { box, textEl, advanceHint, content } = this._buildBox({
      speaker: node.speaker ?? "",
    });
    this.root.appendChild(box);

    const fullText = node.text ?? "";
    let idx = 0;
    let typing = true;
    let typeTimer = null;

    const typeTick = () => {
      if (!typing || !this._active) return;
      if (idx <= fullText.length) {
        textEl.textContent = fullText.slice(0, idx);
        idx += 1;
        if (idx <= fullText.length) {
          typeTimer = setTimeout(typeTick, this._typeDelayMs);
        } else {
          typing = false;
          this._afterText(node, box, advanceHint, content);
        }
      }
    };

    const skipType = () => {
      if (typing) {
        clearTimeout(typeTimer);
        typing = false;
        textEl.textContent = fullText;
        this._afterText(node, box, advanceHint, content);
      }
    };

    this._keyHandler = (e) => {
      if (!this._active) return;
      if (["Enter", " ", "e", "E"].includes(e.key)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (typing) skipType();
        else this._advance(node);
      }
    };
    window.addEventListener("keydown", this._keyHandler, true);

    // The overlay covers the screen, so a tap anywhere reads the next line —
    // a thumb should not have to find the box.
    const onPointer = (e) => {
      if (!this._active) return;
      if (e.target.closest("button")) return;
      e.preventDefault();
      if (typing) skipType();
      else if (!node.choices?.length) this._advance(node);
    };
    this.root.addEventListener("pointerdown", onPointer);

    const keyHandler = this._keyHandler;
    this._cleanupKeys = () => {
      typing = false;
      clearTimeout(typeTimer);
      window.removeEventListener("keydown", keyHandler, true);
      this.root.removeEventListener("pointerdown", onPointer);
    };
    typeTick();
  }

  _choiceVisible(choice) {
    if (choice.requiresFlag && !this.flags[choice.requiresFlag]) return false;
    if (choice.unlessFlag && this.flags[choice.unlessFlag]) return false;
    if (choice.requiresQuestStage && this.questManager) {
      if (!this.questManager.meets(choice.requiresQuestStage)) return false;
    }
    return true;
  }

  _afterText(node, box, advanceHint, content) {
    if (node.choices?.length) {
      advanceHint.hidden = true;
      const ul = document.createElement("ul");
      ul.className = "dialogue-choices";
      for (const choice of node.choices) {
        if (!this._choiceVisible(choice)) continue;
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = choice.label;
        btn.onclick = (e) => {
          e.stopPropagation();
          this._pickChoice(choice);
        };
        li.appendChild(btn);
        ul.appendChild(li);
      }
      content.appendChild(ul);
    }
  }

  _pickChoice(choice) {
    this._applyNodeEffects(this._currentNode);
    this._applyNodeEffects(choice);
    if (choice.encounter) {
      this._cleanupKeys?.();
      this.close({
        action: "encounter",
        encounter: choice.encounter,
        flag: choice.setFlag,
        reputation: this._takeReputation(),
      });
      this.hooks.onEncounter?.(choice.encounter);
      return;
    }
    if (choice.next) {
      const next = this._resolveNode(choice.next);
      if (next) {
        this._renderNode(next);
      } else {
        this._finish(choice);
      }
    } else {
      this._finish(choice);
    }
  }

  _advance(node) {
    if (node.choices?.length) return;
    if (node.next) {
      this._applyNodeEffects(node);
      const next = this._resolveNode(node.next);
      if (next) this._renderNode(next);
      else this._finish(node);
    } else if (node.encounter) {
      this._applyNodeEffects(node);
      const reputation = this._takeReputation();
      this._cleanupKeys?.();
      this.close({ action: "encounter", encounter: node.encounter, reputation });
      this.hooks.onEncounter?.(node.encounter);
    } else {
      this._finish(node);
    }
  }

  _applyNodeEffects(node) {
    if (!node || this._appliedEffects?.has(node)) return;
    this._appliedEffects?.add(node);
    if (node.setFlag) {
      this.flags[node.setFlag] = true;
      this.hooks.onFlag?.(node.setFlag);
    }
    if (node.giveItem) this.hooks.onItem?.(node.giveItem);
    if (node.startQuest) this.questManager?.start(node.startQuest);
    if (node.reputation) {
      this._pendingReputation ??= {};
      for (const [key, value] of Object.entries(node.reputation)) {
        this._pendingReputation[key] = (this._pendingReputation[key] ?? 0) + value;
      }
    }
  }

  _takeReputation() {
    const reputation = this._pendingReputation;
    this._pendingReputation = null;
    return reputation;
  }

  _finish(node) {
    this._applyNodeEffects(node);
    const reputation = this._takeReputation();
    this._cleanupKeys?.();
    this.close({ action: "close", flag: node.setFlag, reputation });
  }
}
