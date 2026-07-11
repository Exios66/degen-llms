import {
  CASINO_NAME,
  listSlots,
  recentSlots,
  loadSlot,
  createSlot,
  createGuestSession,
  formatSaveTime,
  fmtChips,
  formatSaveSlotPlayTimes,
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
    this._attractTimer = null;
    this._pendingSession = null;
  }

  show() {
    this.root.hidden = false;
    this.root.classList.remove("title-overlay--menu");
    this.root.classList.add("title-overlay--intro");
    this._renderIntro();
    this._armAttract();
  }

  hide() {
    this._clearIntroListeners();
    this._clearAttract();
    this.root.hidden = true;
    this.root.innerHTML = "";
    this.root.classList.remove("title-overlay--intro", "title-overlay--menu", "title-overlay--attract");
  }

  _armAttract() {
    this._clearAttract();
    this._attractTimer = setTimeout(() => this._renderAttract(), 28000);
  }

  _clearAttract() {
    if (this._attractTimer) {
      clearTimeout(this._attractTimer);
      this._attractTimer = null;
    }
  }

  _renderAttract() {
    this.root.classList.add("title-overlay--attract");
    this.root.innerHTML = `
      <div class="attract-screen">
        <p class="attract-insert">INSERT COIN</p>
        <h1>${CASINO_NAME}</h1>
        <p class="attract-blink">Press Enter · Play blackjack · Slots · Sports · Racing</p>
        <p class="attract-hint">Arcade cabinet mode · Epic Furious vibes</p>
      </div>
    `;
    const wake = (e) => {
      if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
      document.removeEventListener("keydown", wake);
      this.root.removeEventListener("click", wake);
      this.root.classList.remove("title-overlay--attract");
      this._renderMain();
      this._armAttract();
    };
    document.addEventListener("keydown", wake);
    this.root.addEventListener("click", wake);
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
        this._promptArchetype(initSessionRpg(createGuestSession()));
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
    sub.textContent = "Pixel RPG — Phases 2–4";
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
    guestBtn.onclick = () => this._promptArchetype(initSessionRpg(createGuestSession()));
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
    btn.textContent = `${slot.label}: ${slot.playerName} — ${fmtChips(slot.balance)} · ${formatSaveSlotPlayTimes(slot.casinoTimeMs)} (${formatSaveTime(slot.updatedAt)})`;
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
    createBtn.textContent = "Choose archetype →";
    createBtn.onclick = () => {
      const session = createSlot(slotId, {
        playerName: nameInput.value.trim() || "Guest",
        chips: parseInt(chipsInput.value, 10) || 1000,
      });
      initSessionRpg(session);
      this._promptArchetype(session);
    };

    const backBtn = document.createElement("button");
    backBtn.type = "button";
    backBtn.textContent = "Back";
    backBtn.onclick = () => this._renderMain();

    panel.append(nameLabel, nameInput, chipsLabel, chipsInput, createBtn, backBtn);
    this.root.appendChild(panel);
  }

  _promptArchetype(session) {
    this.root.innerHTML = "";
    const panel = document.createElement("div");
    panel.className = "title-panel title-panel--enter title-panel--visible";
    const h1 = document.createElement("h1");
    h1.textContent = "Choose Your Guest";
    panel.appendChild(h1);
    const archetypes = [
      { id: "weekend_warrior", name: "Weekend Warrior", perk: "+10% first slot spin payout" },
      { id: "high_roller", name: "High Roller", perk: "High Limit access at 5,000 chips" },
      { id: "convention_goer", name: "Convention Goer", perk: "10% cashier buy-in bonus" },
      { id: "local", name: "Local", perk: "Back-hall shortcut unlocked" },
    ];
    for (const a of archetypes) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "archetype-btn";
      btn.innerHTML = `<strong>${a.name}</strong><br><span class="dim">${a.perk}</span>`;
      btn.onclick = () => {
        const rpg = session.ensureRpgState();
        rpg.archetype = a.id;
        rpg.playerSprite = a.id;
        if (a.id === "local") rpg.flags.hint_north_wall = true;
        this._start(session);
      };
      panel.appendChild(btn);
    }
    this.root.appendChild(panel);
  }

  _loadAndStart(slotId) {
    const session = loadSlot(slotId);
    if (!session) return;
    initSessionRpg(session);
    const rpg = session.ensureRpgState();
    if (!rpg.archetype) {
      this._promptArchetype(session);
      return;
    }
    this._start(session);
  }

  _start(session) {
    this.hide();
    this.onStart(session);
  }
}

export function renderHud(hudRoot, saveAdapter, questManager = null) {
  const lines = saveAdapter.hudLines();
  const rpg = saveAdapter.rpg;
  const badges = questManager?.badges?.()?.length ?? 0;
  const hour = Math.floor((rpg.worldTime ?? 720) / 60);
  const mins = String((rpg.worldTime ?? 720) % 60).padStart(2, "0");
  hudRoot.innerHTML = `
    <div class="hud-bar">
      <span class="hud-name">${lines.name}</span>
      <span class="hud-chips">${lines.chips}</span>
      <span class="hud-time">${hour}:${mins}</span>
      <span class="hud-hint">WASD/Arrows · E talk · P phone · T trainer · Shift run · badges ${badges}</span>
    </div>
  `;
}

export function renderTrainerCard(root, saveAdapter, questManager) {
  if (!root) return;
  if (!root.hidden && root.dataset.open === "1") {
    root.hidden = true;
    root.dataset.open = "0";
    return;
  }
  const rpg = saveAdapter.rpg;
  const lines = questManager?.summaryLines?.() ?? [];
  const rep = rpg.reputation ?? {};
  root.hidden = false;
  root.dataset.open = "1";
  root.innerHTML = `
    <div class="trainer-card-panel">
      <h2>Trainer Card</h2>
      <p>${saveAdapter.session.playerName} · ${rpg.archetype ?? "guest"}</p>
      <p class="dim">Rep — whales ${rep.whales ?? 0} · staff ${rep.staff ?? 0} · tourists ${rep.tourists ?? 0}</p>
      <ul>${lines.map((l) => `<li>${l}</li>`).join("") || "<li>No quests yet</li>"}</ul>
      <button type="button" id="trainer-close">Close (T)</button>
    </div>
  `;
  root.querySelector("#trainer-close")?.addEventListener("click", () => {
    root.hidden = true;
    root.dataset.open = "0";
  });
}
