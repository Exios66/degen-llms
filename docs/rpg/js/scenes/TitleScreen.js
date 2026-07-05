import {
  CASINO_NAME,
  listSlots,
  recentSlots,
  loadSlot,
  createSlot,
  createGuestSession,
  formatSaveTime,
  fmtChips,
  formatCasinoTimeInGame,
} from "../../../js/core.js";
import { getActiveProfileSummary, getActiveSlotId } from "../../../js/profileCache.js";
import { SaveAdapter, initSessionRpg } from "../systems/SaveAdapter.js";

const INTRO_AUTO_MS = 3200;

/**
 * DOM-based title / save picker before entering the overworld.
 * Plays a short intro animation, then reveals the save library.
 */
export class TitleScreen {
  /**
   * @param {HTMLElement} root
   * @param {(session: import("../../js/core.js").PlayerSession) => void} onStart
   * @param {{ launchSlotId?: number | null, launchGuest?: boolean }} [options]
   */
  constructor(root, onStart, options = {}) {
    this.root = root;
    this.onStart = onStart;
    this.launchSlotId = options.launchSlotId ?? null;
    this.launchGuest = options.launchGuest ?? false;
    this._introTimer = null;
    this._introDone = false;
    this._skipHandler = null;
  }

  show() {
    this.root.hidden = false;
    this.root.classList.remove("title-overlay--menu");
    this.root.classList.add("title-overlay--intro");
    this._renderIntro();
  }

  hide() {
    this._clearIntroListeners();
    this.root.hidden = true;
    this.root.innerHTML = "";
    this.root.classList.remove("title-overlay--intro", "title-overlay--menu");
  }

  _clearIntroListeners() {
    if (this._introTimer) {
      clearTimeout(this._introTimer);
      this._introTimer = null;
    }
    if (this._skipHandler) {
      document.removeEventListener("keydown", this._skipHandler);
      this.root.removeEventListener("click", this._skipHandler);
      this._skipHandler = null;
    }
  }

  _renderIntro() {
    this.root.innerHTML = "";
    const intro = document.createElement("div");
    intro.className = "title-intro";
    intro.innerHTML = `
      <div class="title-intro-glow" aria-hidden="true"></div>
      <div class="title-intro-content">
        <p class="title-intro-eyebrow">Welcome to</p>
        <h1 class="title-intro-logo">${CASINO_NAME}</h1>
        <div class="title-intro-rule" aria-hidden="true"></div>
        <p class="title-intro-tagline">Pixel RPG · Open World Resort</p>
        <p class="title-intro-hint">Press Enter or click to begin</p>
      </div>
      <div class="title-intro-chips" aria-hidden="true">
        <span class="chip chip-a">♠</span>
        <span class="chip chip-b">7</span>
        <span class="chip chip-c">♦</span>
      </div>
    `;
    this.root.appendChild(intro);

    requestAnimationFrame(() => {
      intro.classList.add("title-intro--play");
    });

    this._skipHandler = (e) => {
      if (e.type === "keydown" && e.key !== "Enter" && e.key !== " " && e.key !== "Escape") return;
      e.preventDefault();
      this._finishIntro();
    };
    document.addEventListener("keydown", this._skipHandler);
    this.root.addEventListener("click", this._skipHandler);
    this._introTimer = setTimeout(() => this._finishIntro(), INTRO_AUTO_MS);
  }

  _finishIntro() {
    if (this._introDone) return;
    this._introDone = true;
    this._clearIntroListeners();

    const intro = this.root.querySelector(".title-intro");
    if (intro) intro.classList.add("title-intro--out");

    this.root.classList.remove("title-overlay--intro");
    this.root.classList.add("title-overlay--menu");

    setTimeout(() => {
      if (this.launchGuest) {
        this._start(initSessionRpg(createGuestSession()));
        return;
      }
      if (this.launchSlotId != null) {
        const session = loadSlot(this.launchSlotId);
        if (session) {
          initSessionRpg(session);
          this._start(session);
          return;
        }
      }
      this._renderMain();
    }, intro ? 480 : 0);
  }

  _renderMain() {
    this.root.innerHTML = "";
    const panel = document.createElement("div");
    panel.className = "title-panel title-panel--enter";

    const h1 = document.createElement("h1");
    h1.textContent = CASINO_NAME;
    panel.appendChild(h1);

    const sub = document.createElement("p");
    sub.className = "subtitle";
    sub.textContent = "Pixel RPG — Phase 1";
    panel.appendChild(sub);

    const active = getActiveProfileSummary(listSlots);
    if (active) {
      const resume = document.createElement("div");
      resume.className = "title-resume-block";
      const resumeLabel = document.createElement("p");
      resumeLabel.className = "title-resume-label";
      resumeLabel.textContent = "Your profile";
      resume.appendChild(resumeLabel);
      const resumeBtn = document.createElement("button");
      resumeBtn.type = "button";
      resumeBtn.className = "title-resume-btn";
      resumeBtn.textContent = `Continue as ${active.playerName} — ${fmtChips(active.balance)}`;
      resumeBtn.onclick = () => this._loadAndStart(active.slotId);
      resume.appendChild(resumeBtn);
      panel.appendChild(resume);
    }

    const recent = recentSlots().filter((s) => s.slotId !== active?.slotId);
    if (recent.length) {
      const h2 = document.createElement("h2");
      h2.textContent = "Recent";
      panel.appendChild(h2);
      const ul = document.createElement("ul");
      ul.className = "slot-list slot-list--stagger";
      for (const slot of recent.slice(0, 3)) {
        ul.appendChild(this._slotButton(slot, false));
      }
      panel.appendChild(ul);
    }

    const h2slots = document.createElement("h2");
    h2slots.textContent = "Save Library";
    panel.appendChild(h2slots);

    const slotsUl = document.createElement("ul");
    slotsUl.className = "slot-list slot-list--stagger";
    for (const slot of listSlots()) {
      slotsUl.appendChild(
        slot.occupied
          ? this._slotButton(slot, slot.slotId === getActiveSlotId())
          : this._emptySlotButton(slot),
      );
    }
    panel.appendChild(slotsUl);

    const actions = document.createElement("div");
    actions.className = "title-actions";
    const guestBtn = document.createElement("button");
    guestBtn.type = "button";
    guestBtn.textContent = "Guest visit (no save)";
    guestBtn.onclick = () => this._start(initSessionRpg(createGuestSession()));
    actions.appendChild(guestBtn);
    panel.appendChild(actions);

    const link = document.createElement("p");
    link.className = "title-link";
    link.innerHTML = '<a href="../index.html">← Terminal casino mode</a>';
    panel.appendChild(link);

    this.root.appendChild(panel);
    requestAnimationFrame(() => panel.classList.add("title-panel--visible"));
  }

  _slotButton(slot, isActive) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    if (isActive) btn.classList.add("active-profile");
    btn.textContent = `${slot.label}: ${slot.playerName} — ${fmtChips(slot.balance)} · ${formatCasinoTimeInGame(slot.casinoTimeMs)} (${formatSaveTime(slot.updatedAt)})`;
    btn.onclick = () => this._loadAndStart(slot.slotId);
    li.appendChild(btn);
    return li;
  }

  _emptySlotButton(slot) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "empty";
    btn.textContent = `${slot.label} — Empty (click to create)`;
    btn.onclick = () => this._promptCreate(slot.slotId);
    li.appendChild(btn);
    return li;
  }

  _promptCreate(slotId) {
    this.root.innerHTML = "";
    const panel = document.createElement("div");
    panel.className = "title-panel title-panel--enter title-panel--visible";

    const h1 = document.createElement("h1");
    h1.textContent = `New Save — Slot ${slotId}`;
    panel.appendChild(h1);

    const nameLabel = document.createElement("label");
    nameLabel.textContent = "Player name";
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = "Guest";
    nameInput.className = "title-input";

    const chipsLabel = document.createElement("label");
    chipsLabel.textContent = "Starting chips";
    const chipsInput = document.createElement("input");
    chipsInput.type = "number";
    chipsInput.min = "100";
    chipsInput.max = "100000";
    chipsInput.value = "1000";
    chipsInput.className = "title-input";

    const createBtn = document.createElement("button");
    createBtn.type = "button";
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
    backBtn.type = "button";
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
  const session = saveAdapter.session;
  const hotelUrl = session.slotId != null
    ? `../index.html?slot=${session.slotId}&view=hotel-lobby`
    : "../index.html?guest=1&view=hotel-lobby";
  hudRoot.innerHTML = `
    <div class="hud-bar">
      <span class="hud-name">${lines.name}</span>
      <span class="hud-chips">${lines.chips}</span>
      <a class="hud-link" href="${hotelUrl}">Hotel</a>
      <span class="hud-hint">WASD · E talk · P phone · Shift run</span>
    </div>
  `;
}
