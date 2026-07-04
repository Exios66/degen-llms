import {
  listSlots, recentSlots, loadSlot, createSlot, createGuestSession,
  formatSaveTime, fmtChips, ensureRpgData,
} from "../session.js";

export default class SaveScene extends Phaser.Scene {
  constructor() {
    super({ key: "SaveScene" });
  }

  init(data) {
    this.createSlotId = data.createSlotId ?? null;
  }

  create() {
    this.renderPicker();
  }

  renderPicker() {
    const overlay = document.getElementById("ui-overlay");
    overlay.innerHTML = "";

    const panel = document.createElement("div");
    panel.className = "overlay-panel";

    const h2 = document.createElement("h2");
    h2.textContent = "The Mandalay Bay — Save Library";
    panel.appendChild(h2);

    const subtitle = document.createElement("p");
    subtitle.className = "hud-dim";
    subtitle.textContent = "Select a save slot to explore the resort, or play as a guest.";
    panel.appendChild(subtitle);

    const recent = recentSlots();
    if (recent.length) {
      const recentTitle = document.createElement("p");
      recentTitle.textContent = "Recent saves:";
      recentTitle.style.marginTop = "1rem";
      panel.appendChild(recentTitle);

      for (const slot of recent) {
        const row = document.createElement("p");
        row.className = "hud-dim";
        row.style.fontSize = "0.75rem";
        row.textContent = `Slot ${slot.slotId}: ${slot.label} — ${slot.playerName} — ${fmtChips(slot.balance)}`;
        panel.appendChild(row);
      }
    }

    const list = document.createElement("ul");
    list.className = "save-list";

    for (const slot of listSlots()) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.textContent = slot.occupied
        ? `Load Slot ${slot.slotId} — ${slot.playerName} (${fmtChips(slot.balance)})`
        : `New save in Slot ${slot.slotId} (empty)`;
      btn.onclick = () => this.handleSlot(slot);
      li.appendChild(btn);
      list.appendChild(li);
    }

    panel.appendChild(list);

    const guestBtn = document.createElement("button");
    guestBtn.className = "overlay-btn";
    guestBtn.textContent = "Play without saving (guest visit)";
    guestBtn.onclick = () => this.startSession(createGuestSession());
    panel.appendChild(guestBtn);

    const casinoLink = document.createElement("a");
    casinoLink.href = "../";
    casinoLink.className = "hud-btn";
    casinoLink.style.display = "inline-block";
    casinoLink.style.marginTop = "1rem";
    casinoLink.textContent = "Terminal Casino";
    panel.appendChild(casinoLink);

    overlay.appendChild(panel);

    if (this.createSlotId != null) {
      const slot = listSlots().find((s) => s.slotId === this.createSlotId);
      if (slot && !slot.occupied) {
        this.showCreateForm(this.createSlotId);
      }
    }
  }

  handleSlot(slot) {
    if (slot.occupied) {
      const session = loadSlot(slot.slotId);
      if (session) this.startSession(session);
      return;
    }
    this.showCreateForm(slot.slotId);
  }

  showCreateForm(slotId) {
    const overlay = document.getElementById("ui-overlay");
    overlay.innerHTML = "";

    const panel = document.createElement("div");
    panel.className = "overlay-panel";

    panel.innerHTML = `<h2>New Save — Slot ${slotId}</h2>`;

    const nameRow = document.createElement("div");
    nameRow.className = "form-row";
    const nameLabel = document.createElement("label");
    nameLabel.textContent = "Player name";
    const nameInput = document.createElement("input");
    nameInput.value = "Guest";
    nameRow.append(nameLabel, nameInput);
    panel.appendChild(nameRow);

    const chipsRow = document.createElement("div");
    chipsRow.className = "form-row";
    const chipsLabel = document.createElement("label");
    chipsLabel.textContent = "Starting chips";
    const chipsInput = document.createElement("input");
    chipsInput.type = "number";
    chipsInput.value = "1000";
    chipsInput.min = "0";
    chipsRow.append(chipsLabel, chipsInput);
    panel.appendChild(chipsRow);

    const actions = document.createElement("div");
    actions.className = "action-bar";

    const startBtn = document.createElement("button");
    startBtn.className = "overlay-btn primary";
    startBtn.textContent = "Start adventure";
    startBtn.onclick = () => {
      const session = createSlot(slotId, {
        playerName: nameInput.value.trim() || "Guest",
        chips: Math.max(0, parseInt(chipsInput.value, 10) || 1000),
      });
      this.startSession(session);
    };

    const backBtn = document.createElement("button");
    backBtn.className = "overlay-btn";
    backBtn.textContent = "Back";
    backBtn.onclick = () => this.renderPicker();

    actions.append(startBtn, backBtn);
    panel.appendChild(actions);
    overlay.appendChild(panel);
  }

  startSession(session) {
    ensureRpgData(session);
    this.registry.set("session", session);
    document.getElementById("ui-overlay").innerHTML = "";
    this.scene.start("MapScene");
  }
}
