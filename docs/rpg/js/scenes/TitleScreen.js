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
import { getWorldCycleState } from "../../../js/world-cycle.js";
import { SaveAdapter, initSessionRpg } from "../systems/SaveAdapter.js";
import { renderCharacterCreator } from "../systems/CharacterCreator.js";
import { archetypeLabel, normalizeAppearance, resolvePalette } from "../systems/CharacterAppearance.js";
import { drawCharacterToCanvas } from "../systems/TextureFactory.js";
import { prefersTouchControls } from "../systems/TouchControls.js";

const INTRO_AUTO_MS = 3200;

/** Phone players have no Enter key, so the prompts say "tap" instead. */
const TOUCH = prefersTouchControls();

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
    if (!root) throw new Error("TitleScreen requires #title-overlay");
    this.root = root;
    this.onStart = onStart;
    this.launchSlotId = options.launchSlotId ?? null;
    this.launchGuest = options.launchGuest ?? false;
    this.launchArchetype = options.launchArchetype ?? null;
    this.launchChips = options.launchChips ?? null;
    this.skipIntro = options.skipIntro ?? false;
    this._introTimer = null;
    this._introDone = false;
    this._skipHandler = null;
    this._attractTimer = null;
    this._pendingSession = null;
  }

  show() {
    this.root.hidden = false;
    this.root.classList.remove("title-overlay--menu", "title-overlay--attract");
    this.root.classList.add("title-overlay--intro");
    this._renderIntro();
    this._armAttract();
    if (this.skipIntro) this._finishIntro();
  }

  /** Re-open the save library after a failed overworld boot. */
  showMenu(message = null) {
    this._clearIntroListeners();
    this._clearAttract();
    this._introDone = true;
    this.root.hidden = false;
    this.root.classList.remove("title-overlay--intro", "title-overlay--attract");
    this.root.classList.add("title-overlay--menu");
    this._renderMain();
    if (message) this._showBootMessage(message);
    this._armAttract();
  }

  hide() {
    this._clearIntroListeners();
    this._clearAttract();
    this.root.hidden = true;
    this.root.innerHTML = "";
    this.root.classList.remove("title-overlay--intro", "title-overlay--menu", "title-overlay--attract");
  }

  _showBootMessage(message) {
    const panel = this.root.querySelector(".title-panel");
    if (!panel || !message) return;
    let note = panel.querySelector(".title-boot-note");
    if (!note) {
      note = document.createElement("p");
      note.className = "title-boot-note";
      const subtitle = panel.querySelector(".subtitle");
      if (subtitle) subtitle.insertAdjacentElement("afterend", note);
      else panel.prepend(note);
    }
    note.textContent = message;
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
        <p class="attract-blink">${TOUCH ? "Tap to play" : "Press Enter"} · Blackjack · Slots · Sports · Racing</p>
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
        <p class="title-intro-hint">${TOUCH ? "Tap to begin" : "Press Enter or click to begin"}</p>
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
      try {
        if (this.launchGuest) {
          const guest = createGuestSession(
            this.launchChips != null ? { chips: this.launchChips } : {},
          );
          initSessionRpg(guest);
          if (this.launchArchetype) {
            this._applyArchetype(guest, this.launchArchetype);
            this._start(guest);
            return;
          }
          this._promptArchetype(guest);
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
      } catch (err) {
        console.error(err);
        this._renderMain();
        this._showBootMessage(err?.message || "Could not open save library.");
      }
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
    sub.textContent = "Pixel RPG — 28 rooms of Mandalay Bay";
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
    panel.classList.add("title-panel--visible");
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
    createBtn.textContent = "Customize guest →";
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
    renderCharacterCreator(this.root, {
      session,
      title: "Choose Your Guest",
      onComplete: (s) => this._start(s),
      onBack: () => this._renderMain(),
    });
  }

  _applyArchetype(session, archetypeId) {
    const rpg = session.ensureRpgState();
    rpg.archetype = archetypeId;
    rpg.playerSprite = archetypeId;
    if (archetypeId === "local") rpg.flags.hint_north_wall = true;
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
  const cycle = getWorldCycleState(saveAdapter.session);
  const evicted = cycle.roomEvicted
    ? `<span class="hud-alert">Room locked · ${fmtChips(cycle.overdueBalance)} overdue</span>`
    : "";
  hudRoot.innerHTML = `
    <div class="hud-bar">
      <span class="hud-name">${lines.name}</span>
      <span class="hud-chips">${lines.chips}</span>
      <span class="hud-time">Day ${cycle.displayDay} · ${hour}:${mins} · ${cycle.phase.label}</span>
      ${evicted}
      <span class="hud-hint">Tap to move · WASD · E talk · Esc menu · P phone · T trainer · Shift run · badges ${badges}</span>
    </div>
  `;
}

export function renderTrainerCard(root, saveAdapter, questManager, hooks = {}) {
  if (!root) return;
  if (!root.hidden && root.dataset.open === "1" && !root.dataset.wardrobe) {
    root.hidden = true;
    root.dataset.open = "0";
    return;
  }
  const rpg = saveAdapter.rpg;
  const appearance = normalizeAppearance(rpg);
  const lines = questManager?.summaryLines?.() ?? [];
  const rep = rpg.reputation ?? {};
  root.hidden = false;
  root.dataset.open = "1";
  root.dataset.wardrobe = "0";
  root.innerHTML = `
    <div class="trainer-card-panel">
      <div class="trainer-card__header">
        <canvas class="trainer-card__portrait" id="trainer-portrait" width="64" height="88" aria-hidden="true"></canvas>
        <div>
          <h2>Trainer Card</h2>
          <p>${saveAdapter.session.playerName}</p>
          <p class="dim">${archetypeLabel(rpg.archetype ?? "guest")}</p>
        </div>
      </div>
      <p class="dim">Rep — whales ${rep.whales ?? 0} · staff ${rep.staff ?? 0} · tourists ${rep.tourists ?? 0}</p>
      <ul>${lines.map((l) => `<li>${l}</li>`).join("") || "<li>No quests yet</li>"}</ul>
      <div class="trainer-card__actions">
        <button type="button" id="trainer-wardrobe">Change outfit</button>
        <button type="button" id="trainer-close">Close (T)</button>
      </div>
    </div>
  `;
  const portrait = root.querySelector("#trainer-portrait");
  if (portrait) {
    drawCharacterToCanvas(portrait, resolvePalette(appearance), "down", 0, 3);
  }
  root.querySelector("#trainer-wardrobe")?.addEventListener("click", () => {
    root.dataset.wardrobe = "1";
    renderCharacterCreator(root, {
      session: saveAdapter.session,
      title: "Wardrobe",
      onComplete: (session) => {
        saveAdapter.persist();
        hooks.onAppearanceChange?.();
        renderTrainerCard(root, saveAdapter, questManager, hooks);
      },
      onBack: () => renderTrainerCard(root, saveAdapter, questManager, hooks),
    });
  });
  root.querySelector("#trainer-close")?.addEventListener("click", () => {
    root.hidden = true;
    root.dataset.open = "0";
  });
}
