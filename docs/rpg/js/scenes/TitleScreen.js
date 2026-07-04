import {
  CASINO_NAME,
  listSlots,
  recentSlots,
  loadSlot,
  createSlot,
  createGuestSession,
  formatSaveTime,
  fmtChips,
} from "../../js/core.js";
import { SaveAdapter, initSessionRpg } from "../systems/SaveAdapter.js";

/**
 * DOM-based title / save picker before entering the overworld.
 */
export class TitleScreen {
  /**
   * @param {HTMLElement} root
   * @param {(session: import("../../js/core.js").PlayerSession) => void} onStart
   */
  constructor(root, onStart) {
    this.root = root;
    this.onStart = onStart;
    this._pendingSlot = null;
  }

  show() {
    this.root.hidden = false;
    this._renderMain();
  }

  hide() {
    this.root.hidden = true;
    this.root.innerHTML = "";
  }

  _renderMain() {
    this.root.innerHTML = "";
    const panel = document.createElement("div");
    panel.className = "title-panel";

    const h1 = document.createElement("h1");
    h1.textContent = CASINO_NAME;
    panel.appendChild(h1);

    const sub = document.createElement("p");
    sub.className = "subtitle";
    sub.textContent = "Pixel RPG — Phase 1";
    panel.appendChild(sub);

    const recent = recentSlots();
    if (recent.length) {
      const h2 = document.createElement("h2");
      h2.textContent = "Continue";
      panel.appendChild(h2);
      const ul = document.createElement("ul");
      ul.className = "slot-list";
      for (const slot of recent.slice(0, 3)) {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.textContent = `${slot.label} — ${slot.playerName} — ${fmtChips(slot.balance)}`;
        btn.onclick = () => this._loadAndStart(slot.slotId);
        li.appendChild(btn);
        ul.appendChild(li);
      }
      panel.appendChild(ul);
    }

    const h2slots = document.createElement("h2");
    h2slots.textContent = "Save Library";
    panel.appendChild(h2slots);

    const slotsUl = document.createElement("ul");
    slotsUl.className = "slot-list";
    for (const slot of listSlots()) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      if (slot.occupied) {
        btn.textContent = `${slot.label}: ${slot.playerName} — ${fmtChips(slot.balance)} (${formatSaveTime(slot.updatedAt)})`;
        btn.onclick = () => this._loadAndStart(slot.slotId);
      } else {
        btn.className = "empty";
        btn.textContent = `${slot.label} — Empty (click to create)`;
        btn.onclick = () => this._promptCreate(slot.slotId);
      }
      li.appendChild(btn);
      slotsUl.appendChild(li);
    }
    panel.appendChild(slotsUl);

    const actions = document.createElement("div");
    actions.className = "title-actions";

    const guestBtn = document.createElement("button");
    guestBtn.textContent = "Guest visit (no save)";
    guestBtn.onclick = () => {
      const session = initSessionRpg(createGuestSession());
      this._start(session);
    };
    actions.appendChild(guestBtn);

    panel.appendChild(actions);

    const link = document.createElement("p");
    link.className = "title-link";
    link.innerHTML = '<a href="../index.html">← Terminal casino mode</a>';
    panel.appendChild(link);

    this.root.appendChild(panel);
  }

  _promptCreate(slotId) {
    this.root.innerHTML = "";
    const panel = document.createElement("div");
    panel.className = "title-panel";

    const h1 = document.createElement("h1");
    h1.textContent = `New Save — Slot ${slotId}`;
    panel.appendChild(h1);

    const nameLabel = document.createElement("label");
    nameLabel.textContent = "Player name";
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = "Guest";
    nameInput.style.cssText = "width:100%;padding:8px;margin:8px 0;font-family:inherit;font-size:8px;background:#0a0812;border:2px solid #2a2438;color:#e6e1cf;";

    const chipsLabel = document.createElement("label");
    chipsLabel.textContent = "Starting chips";
    const chipsInput = document.createElement("input");
    chipsInput.type = "number";
    chipsInput.min = "100";
    chipsInput.max = "100000";
    chipsInput.value = "1000";
    chipsInput.style.cssText = nameInput.style.cssText;

    const createBtn = document.createElement("button");
    createBtn.textContent = "Create & Play";
    createBtn.onclick = () => {
      const session = createSlot(slotId, {
        playerName: nameInput.value.trim() || "Guest",
        chips: parseInt(chipsInput.value, 10) || 1000,
      });
      initSessionRpg(session);
      this._start(session);
    };

    const backBtn = document.createElement("button");
    backBtn.textContent = "Back";
    backBtn.onclick = () => this._renderMain();

    panel.append(nameLabel, nameInput, chipsLabel, chipsInput, createBtn, backBtn);
    this.root.appendChild(panel);
  }

  _loadAndStart(slotId) {
    const session = loadSlot(slotId);
    if (!session) return;
    initSessionRpg(session);
    this._start(session);
  }

  _start(session) {
    this.hide();
    this.onStart(session);
  }
}

export function renderHud(hudRoot, saveAdapter) {
  const lines = saveAdapter.hudLines();
  hudRoot.innerHTML = `
    <div class="hud-bar">
      <span class="hud-name">${lines.name}</span>
      <span class="hud-chips">${lines.chips}</span>
      <span class="hud-hint">WASD · E talk · Shift run</span>
    </div>
  `;
}
