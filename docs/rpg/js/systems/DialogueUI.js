import { getDialogueNode } from "../data/dialogues.js";
import { setFlag } from "../session.js";

export default class DialogueUI {
  constructor({ overlayEl, onClose, onEncounter }) {
    this.overlayEl = overlayEl;
    this.onClose = onClose;
    this.onEncounter = onEncounter;
    this.session = null;
    this.npc = null;
  }

  open(session, npc) {
    this.session = session;
    this.npc = npc;
    this.showNode(npc.startNode);
  }

  close() {
    this.overlayEl.innerHTML = "";
    if (this.onClose) this.onClose();
  }

  showNode(nodeId) {
    const node = getDialogueNode(nodeId);
    if (!node) {
      this.close();
      return;
    }

    this.overlayEl.innerHTML = "";
    const panel = document.createElement("div");
    panel.className = "overlay-panel";

    const h2 = document.createElement("h2");
    h2.textContent = this.npc.name;
    panel.appendChild(h2);

    const speaker = document.createElement("div");
    speaker.className = "speaker";
    speaker.textContent = node.speaker ?? this.npc.name;
    panel.appendChild(speaker);

    const text = document.createElement("div");
    text.className = "text";
    const content = typeof node.dynamicText === "function"
      ? node.dynamicText(this.session)
      : node.text;
    text.textContent = content ?? "";
    panel.appendChild(text);

    const choicesEl = document.createElement("div");
    choicesEl.className = "choices";

    for (const choice of node.choices ?? []) {
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.textContent = choice.label;
      btn.onclick = () => this.handleChoice(choice);
      choicesEl.appendChild(btn);
    }

    panel.appendChild(choicesEl);
    this.overlayEl.appendChild(panel);
  }

  handleChoice(choice) {
    if (choice.setFlag) {
      setFlag(this.session, choice.setFlag);
    }

    if (choice.encounter) {
      this.overlayEl.innerHTML = "";
      if (this.onEncounter) {
        this.onEncounter(choice.encounter, this.npc);
      }
      return;
    }

    if (choice.end) {
      this.close();
      return;
    }

    if (choice.next) {
      this.showNode(choice.next);
    }
  }
}
