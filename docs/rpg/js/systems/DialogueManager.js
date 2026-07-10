/**
 * JSON-driven branching dialogue overlay (Pokémon / Epic Furious style).
 */
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
  }

  load(dialogues) {
    this.dialogues = dialogues;
  }

  setFlags(flags) {
    this.flags = flags ?? {};
  }

  isActive() {
    return this._active;
  }

  /**
   * Brief non-branching toast used for map transitions and system copy.
   * @param {string} text
   * @param {{ speaker?: string, durationMs?: number }} [opts]
   */
  showSystemMessage(text, opts = {}) {
    if (!text) return;
    if (this._active) {
      // Don't interrupt an active dialogue tree — queue a one-shot after close.
      const prevClose = this.hooks.onClose;
      this.hooks.onClose = () => {
        this.hooks.onClose = prevClose;
        prevClose?.();
        this.showSystemMessage(text, opts);
      };
      return;
    }

    this._active = true;
    this.root.hidden = false;
    this.root.innerHTML = "";

    const box = document.createElement("div");
    box.className = "dialogue-box dialogue-box--system";

    const speaker = document.createElement("div");
    speaker.className = "dialogue-speaker";
    speaker.textContent = opts.speaker ?? "Resort";
    box.appendChild(speaker);

    const textEl = document.createElement("div");
    textEl.className = "dialogue-text";
    textEl.textContent = text;
    box.appendChild(textEl);

    this.root.appendChild(box);

    const duration = opts.durationMs ?? 2200;
    this._systemTimer = setTimeout(() => {
      this._systemTimer = null;
      this.root.hidden = true;
      this.root.innerHTML = "";
      this._active = false;
    }, duration);
  }

  /**
   * Start a dialogue tree by id.
   * @returns {Promise<{ action?: string, flag?: string, encounter?: string }>}
   */
  start(dialogueId) {
    if (this._active) return Promise.resolve({});
    const node = this.dialogues[dialogueId];
    if (!node) return Promise.resolve({});

    this._active = true;
    this.root.hidden = false;
    return new Promise((resolve) => {
      this._resolve = resolve;
      this._renderNode(node);
    });
  }

  close(result = {}) {
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
    this.root.innerHTML = "";

    const box = document.createElement("div");
    box.className = "dialogue-box";

    const speaker = document.createElement("div");
    speaker.className = "dialogue-speaker";
    speaker.textContent = node.speaker ?? "";
    box.appendChild(speaker);

    const textEl = document.createElement("div");
    textEl.className = "dialogue-text";
    box.appendChild(textEl);

    const advanceHint = document.createElement("div");
    advanceHint.className = "dialogue-advance";
    advanceHint.textContent = "▼ Press Enter / Space / E";
    box.appendChild(advanceHint);

    this.root.appendChild(box);

    const fullText = node.text ?? "";
    let idx = 0;
    let typing = true;

    const typeTick = () => {
      if (idx <= fullText.length) {
        textEl.textContent = fullText.slice(0, idx);
        idx += 1;
        if (idx <= fullText.length) {
          setTimeout(typeTick, 18);
        } else {
          typing = false;
          this._afterText(node, box, advanceHint);
        }
      }
    };

    const skipType = () => {
      if (typing) {
        typing = false;
        textEl.textContent = fullText;
        this._afterText(node, box, advanceHint);
      }
    };

    this._keyHandler = (e) => {
      if (!this._active) return;
      if (["Enter", " ", "e", "E"].includes(e.key)) {
        e.preventDefault();
        if (typing) skipType();
        else this._advance(node);
      }
    };
    window.addEventListener("keydown", this._keyHandler);

    this._cleanupKeys = () => window.removeEventListener("keydown", this._keyHandler);
    typeTick();
  }

  _afterText(node, box, advanceHint) {
    if (node.choices?.length) {
      advanceHint.hidden = true;
      const ul = document.createElement("ul");
      ul.className = "dialogue-choices";
      for (const choice of node.choices) {
        if (choice.requiresFlag && !this.flags[choice.requiresFlag]) continue;
        if (choice.unlessFlag && this.flags[choice.unlessFlag]) continue;
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.textContent = choice.label;
        btn.onclick = () => this._pickChoice(choice);
        li.appendChild(btn);
        ul.appendChild(li);
      }
      box.appendChild(ul);
    }
  }

  _pickChoice(choice) {
    if (choice.setFlag) {
      this.flags[choice.setFlag] = true;
      this.hooks.onFlag?.(choice.setFlag);
    }
    if (choice.encounter) {
      this._cleanupKeys?.();
      this.close({ action: "encounter", encounter: choice.encounter, flag: choice.setFlag });
      this.hooks.onEncounter?.(choice.encounter);
      return;
    }
    if (choice.next) {
      const next = this.dialogues[choice.next];
      if (next) this._renderNode(next);
      else this._finish(choice);
    } else {
      this._finish(choice);
    }
  }

  _advance(node) {
    if (node.choices?.length) return;
    if (node.next) {
      const next = this.dialogues[node.next];
      if (next) this._renderNode(next);
      else this._finish(node);
    } else if (node.encounter) {
      this._cleanupKeys?.();
      this.close({ action: "encounter", encounter: node.encounter });
      this.hooks.onEncounter?.(node.encounter);
    } else {
      this._finish(node);
    }
  }

  _finish(node) {
    if (node.setFlag) {
      this.flags[node.setFlag] = true;
      this.hooks.onFlag?.(node.setFlag);
    }
    this._cleanupKeys?.();
    this.close({ action: "close", flag: node.setFlag });
  }
}
