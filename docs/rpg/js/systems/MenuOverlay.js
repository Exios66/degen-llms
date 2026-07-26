import { fmtChips } from "../../../js/core.js";
import { getResortCompletion } from "../../../js/resort-completion.js";
import { getWorldCycleSummary } from "../../../js/world-cycle.js";
import { STAKE_TIERS, TIER_ORDER, getTier } from "../../../js/stakes.js";
import { doorsForMap, getMapDefinition, mapIds } from "./MapData.js";
import { DEX_COLLECTIONS, dexEntries, dexProgress } from "./Dex.js";
import { bagContents, equipItem } from "./Inventory.js";
import { EGG_REGISTRY, foundEggs } from "./EasterEggs.js";
import { normalizeAppearance, resolvePalette } from "./CharacterAppearance.js";
import { renderCharacterCreator } from "./CharacterCreator.js";
import { drawCharacterToCanvas } from "./CharacterSprites.js";

const DEX_LABELS = {
  reef: "Shark Reef species",
  slots: "Slot machines played",
  staff: "Dealers & staff met",
};

/**
 * Pokémon-style START menu. Panels the terminal already renders (bank, staff
 * manifest, guest book, stats, shops) are delegated to TerminalHostOverlay;
 * the RPG-native panels (trainer card, quests, dex, bag, eggs, options) are
 * drawn here in the pixel skin.
 */
export class MenuOverlay {
  /**
   * @param {HTMLElement} root
   * @param {import("../../../js/core.js").PlayerSession} session
   * @param {{
   *   saveAdapter: import("./SaveAdapter.js").SaveAdapter,
   *   questManager: import("./QuestManager.js").QuestManager,
   *   terminalHost: import("./TerminalHostOverlay.js").TerminalHostOverlay,
   *   rewardsPhone?: { toggle: () => void },
   *   audio?: { setMuted?: (m: boolean) => void, isMuted?: () => boolean, sfx?: (k: string) => void },
   *   onPersist?: () => void,
   *   onClose?: () => void,
   *   onExit?: () => void,
   * }} deps
   */
  constructor(root, session, deps) {
    this.root = root;
    this.session = session;
    this.deps = deps;
    this._active = false;
    this._page = "root";
    this._status = "";
    this._cursor = 0;
    this._onKeyDown = (ev) => this._handleKey(ev);
  }

  /** Arrow/Enter/Esc navigation so the menu works without a mouse. */
  _handleKey(ev) {
    if (!this._active) return;
    const buttons = [...this.root.querySelectorAll(".menu-panel-list button")];
    const key = ev.key;
    if (key === "Escape" || key === "Backspace" || key === "x" || key === "X") {
      ev.preventDefault();
      this.back();
      return;
    }
    if (!buttons.length) return;
    if (key === "ArrowDown" || key === "s" || key === "S") {
      ev.preventDefault();
      this._moveCursor(buttons, 1);
    } else if (key === "ArrowUp" || key === "w" || key === "W") {
      ev.preventDefault();
      this._moveCursor(buttons, -1);
    } else if (key === "Enter" || key === " " || key === "e" || key === "E") {
      ev.preventDefault();
      buttons[Math.min(this._cursor, buttons.length - 1)]?.click();
    } else if (/^[1-9]$/.test(key)) {
      ev.preventDefault();
      buttons[Number(key) - 1]?.click();
    }
  }

  _moveCursor(buttons, step) {
    this._cursor = (this._cursor + step + buttons.length) % buttons.length;
    buttons.forEach((b, i) => b.classList.toggle("selected", i === this._cursor));
    buttons[this._cursor]?.scrollIntoView({ block: "nearest" });
    this.deps.audio?.sfx?.("click");
  }

  isActive() {
    return this._active;
  }

  get rpg() {
    return this.session.ensureRpgState();
  }

  open(page = "root") {
    if (this._active) return;
    this._active = true;
    this._page = typeof page === "string" ? page : "root";
    this._status = "";
    this._cursor = 0;
    this.deps.questManager?.syncDerived?.();
    this.root.hidden = false;
    this.root.classList.add("encounter-overlay--active");
    window.addEventListener("keydown", this._onKeyDown, true);
    this._render();
  }

  close() {
    if (!this._active) return;
    this._active = false;
    window.removeEventListener("keydown", this._onKeyDown, true);
    this.root.hidden = true;
    this.root.innerHTML = "";
    this.root.classList.remove("encounter-overlay--active");
    this.deps.onPersist?.();
    this.deps.onClose?.();
  }

  toggle() {
    if (this._active) this.close();
    else this.open();
  }

  /** Escape/Backspace steps back one page before closing the menu. */
  back() {
    if (this._page === "root") {
      this.close();
      return;
    }
    this._page = "root";
    this._cursor = 0;
    this._render();
  }

  _host(view, title) {
    const host = this.deps.terminalHost;
    if (!host?.hasView(view)) {
      this._status = "That desk is closed right now.";
      this._render();
      return;
    }
    this.close();
    host.open({ view, title });
  }

  _render() {
    this.root.innerHTML = "";
    const panel = document.createElement("div");
    panel.className = "encounter-panel menu-panel";

    const header = document.createElement("div");
    header.className = "menu-panel-header";
    header.innerHTML = `<span>MENU</span><span class="menu-chips">${fmtChips(this.session.wallet.balance)}</span>`;
    panel.appendChild(header);

    const body = document.createElement("div");
    body.className = "menu-panel-body";
    panel.appendChild(body);

    const renderers = {
      root: () => this._renderRoot(body),
      trainer: () => this._renderTrainer(body),
      wardrobe: () => this._renderWardrobe(body),
      stakes: () => this._renderStakes(body),
      directory: () => this._renderDirectory(body),
      quests: () => this._renderQuests(body),
      dex: () => this._renderDex(body),
      bag: () => this._renderBag(body),
      eggs: () => this._renderEggs(body),
      completion: () => this._renderCompletion(body),
      options: () => this._renderOptions(body),
    };
    (renderers[this._page] ?? renderers.root)();

    if (this._status) {
      const status = document.createElement("p");
      status.className = "menu-status";
      status.textContent = this._status;
      body.appendChild(status);
    }

    const footer = document.createElement("div");
    footer.className = "menu-panel-footer";
    const back = document.createElement("button");
    back.type = "button";
    back.textContent = this._page === "root" ? "Close (Esc)" : "Back";
    back.onclick = () => this.back();
    footer.appendChild(back);
    panel.appendChild(footer);

    this.root.appendChild(panel);
  }

  _list(parent, items) {
    const ul = document.createElement("ul");
    ul.className = "menu-panel-list";
    items.forEach((item, i) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.innerHTML = `<span class="num">${i + 1}</span> ${item.label}` +
        (item.detail ? `<span class="menu-detail">${item.detail}</span>` : "");
      btn.onclick = () => {
        this._status = "";
        item.onSelect();
      };
      li.appendChild(btn);
      ul.appendChild(li);
    });
    parent.appendChild(ul);
    const buttons = [...ul.querySelectorAll("button")];
    this._cursor = Math.min(this._cursor, Math.max(0, buttons.length - 1));
    buttons[this._cursor]?.classList.add("selected");
    return ul;
  }

  _go(page) {
    this._page = page;
    this._cursor = 0;
    this._render();
  }

  _renderRoot(body) {
    const quests = this.deps.questManager?.entries?.() ?? [];
    const openQuests = quests.filter((q) => !q.complete).length;
    const completion = getResortCompletion(this.session);
    const dex = DEX_COLLECTIONS.reduce((sum, id) => sum + dexProgress(this.session, id).found, 0);

    this._list(body, [
      { label: "Trainer Card", detail: `${quests.filter((q) => q.complete).length} badges`, onSelect: () => this._go("trainer") },
      { label: "Wardrobe", detail: "Restyle your guest", onSelect: () => this._go("wardrobe") },
      { label: "Stakes Desk", detail: this._tierName(), onSelect: () => this._go("stakes") },
      { label: "Resort Directory", detail: `${this._visitedCount()}/${mapIds().length} rooms`, onSelect: () => this._go("directory") },
      { label: "Quests", detail: `${openQuests} open`, onSelect: () => this._go("quests") },
      { label: "Dex", detail: `${dex} found`, onSelect: () => this._go("dex") },
      { label: "Bag", detail: `${bagContents(this.session).length} items`, onSelect: () => this._go("bag") },
      { label: "Secrets", detail: `${foundEggs(this.session).length}/${Object.keys(EGG_REGISTRY).length}`, onSelect: () => this._go("eggs") },
      { label: "Rewards Phone", detail: "P", onSelect: () => { this.close(); this.deps.rewardsPhone?.toggle?.(); } },
      { label: "Off-Strip Bank", onSelect: () => this._host("bank-account", "OFF-STRIP BANK") },
      { label: "Player Stats", onSelect: () => this._host("stats", "PLAYER STATS") },
      { label: "Staff Manifest", onSelect: () => this._host("staff-manifest", "STAFF MANIFEST") },
      { label: "Guest Book", onSelect: () => this._host("hotel-guest-directory", "GUEST DIRECTORY") },
      { label: "Resort Completion", detail: `${completion.percent}%`, onSelect: () => this._go("completion") },
      { label: "Options", onSelect: () => this._go("options") },
      { label: "Save Game", onSelect: () => this._save() },
      { label: "Exit to Terminal", onSelect: () => this._exit() },
    ]);
  }

  _renderTrainer(body) {
    const rpg = this.rpg;
    const rep = rpg.reputation ?? {};
    const cycle = getWorldCycleSummary(this.session);
    const completion = getResortCompletion(this.session);
    body.innerHTML = `
      <h3>${this.session.playerName}</h3>
      <p class="dim">${rpg.archetype ?? "guest"} · ${this.session.slotLabel || (this.session.slotId ? `Slot ${this.session.slotId}` : "Guest visit")}</p>
      <p>Chips: ${fmtChips(this.session.wallet.balance)}</p>
      <p>Reputation — whales ${rep.whales ?? 0} · staff ${rep.staff ?? 0} · tourists ${rep.tourists ?? 0}</p>
      <p>Rooms explored: ${Object.keys(rpg.mapVisits ?? {}).length}</p>
      <p>Resort completion: ${completion.percent}% — ${completion.tagline}</p>
      <p class="dim">${cycle?.phaseLabel ?? ""} ${cycle?.dayLabel ?? ""}</p>
    `;
    const portrait = document.createElement("canvas");
    portrait.className = "menu-portrait";
    portrait.width = 64;
    portrait.height = 96;
    portrait.setAttribute("aria-hidden", "true");
    drawCharacterToCanvas(portrait, resolvePalette(normalizeAppearance(rpg)), "down", 0, 4);
    body.prepend(portrait);
    this._list(body, [
      { label: "Change outfit", onSelect: () => this._go("wardrobe") },
    ]);
  }

  _tierName() {
    return getTier(this.rpg.stakeTier ?? "penny").name;
  }

  _visitedCount() {
    return mapIds().filter((id) => this.rpg.mapVisits?.[id]).length;
  }

  /**
   * Stakes desk: pick the tier you sit down at, away from a table.
   *
   * The picker that runs when you take a seat only ever showed the tiers in
   * passing, so which ones existed and what they cost was something you learned
   * by walking up to a dealer. Choosing here presets every table and machine.
   */
  _renderStakes(body) {
    const balance = this.session.wallet.balance;
    const current = this.rpg.stakeTier ?? "penny";
    body.innerHTML = `
      <h3>Stakes Desk</h3>
      <p class="dim">The tier you pick here is preselected at every table and
      machine. You can still change it when you sit down.</p>
      <p>Floor chips: ${fmtChips(balance)}</p>
    `;
    this._list(body, TIER_ORDER.map((id) => {
      const tier = STAKE_TIERS[id];
      const max = tier.maxBet === null ? "no max" : fmtChips(tier.maxBet);
      const afford = balance >= tier.minBet;
      return {
        label: `${tier.name}${id === current ? " ✓" : ""}`,
        detail: afford
          ? `${fmtChips(tier.minBet)}–${max}`
          : `locked · needs ${fmtChips(tier.minBet)}`,
        onSelect: () => {
          if (!afford) {
            this._status = `${tier.name} opens at ${fmtChips(tier.minBet)} chips.`;
            this._render();
            return;
          }
          this.rpg.stakeTier = id;
          this.deps.terminalHost?.setStakeTier?.(tier);
          this.deps.onPersist?.();
          this._status = `Stakes set to ${tier.name}.`;
          this._render();
        },
      };
    }));
  }

  /**
   * Resort directory: what exists, what you have seen, and how rooms connect.
   *
   * The resort is 30-odd rooms deep and several are behind a gate or a flag, so
   * without this the only way to know a wing exists is to have already found it.
   */
  _renderDirectory(body) {
    const here = this.rpg.mapId;
    const visits = this.rpg.mapVisits ?? {};
    body.innerHTML = `
      <h3>Resort Directory</h3>
      <p class="dim">You are in <strong>${getMapDefinition(here)?.label ?? here}</strong>.
      ${this._visitedCount()} of ${mapIds().length} rooms explored.</p>
    `;
    // A room you have stood in is listed with its exits. A room you have only
    // seen a door to is listed as a lead. The rest stay hidden, rather than
    // padding the list with two dozen identical "???" rows.
    const label = (id) => getMapDefinition(id)?.label ?? id;
    const leads = new Map();
    for (const id of mapIds()) {
      if (!visits[id]) continue;
      for (const door of doorsForMap(id)) {
        if (visits[door.targetMap]) continue;
        if (!leads.has(door.targetMap)) leads.set(door.targetMap, []);
        leads.get(door.targetMap).push(label(id));
      }
    }

    const ul = document.createElement("ul");
    ul.className = "menu-quest-list";
    for (const id of mapIds().filter((m) => visits[m])) {
      const exits = doorsForMap(id).map((d) => label(d.targetMap));
      const li = document.createElement("li");
      li.className = id === here ? "quest-complete" : "";
      li.innerHTML = `<strong>${label(id)}</strong>` +
        `<span class="menu-detail">${id === here ? "you are here" : "visited"}</span>` +
        `<span class="dim">Exits: ${exits.join(" · ") || "none"}</span>`;
      ul.appendChild(li);
    }
    for (const [id, from] of leads) {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${label(id)}</strong>` +
        `<span class="menu-detail">not yet visited</span>` +
        `<span class="dim">Door from ${from.join(" · ")}</span>`;
      ul.appendChild(li);
    }
    body.appendChild(ul);

    const hidden = mapIds().filter((id) => !visits[id] && !leads.has(id)).length;
    if (hidden) {
      const p = document.createElement("p");
      p.className = "dim";
      p.textContent = `${hidden} more ${hidden === 1 ? "room is" : "rooms are"} still hidden ` +
        "somewhere in the resort.";
      body.appendChild(p);
    }
  }

  /**
   * Wardrobe, in the menu rather than behind a title-screen-only flow.
   *
   * Confirming re-skins the sprite that is standing in the overworld right now
   * and writes the look back to the save slot, so it survives a reload.
   */
  _renderWardrobe(body) {
    renderCharacterCreator(body, {
      session: this.session,
      title: "Wardrobe",
      confirmLabel: "Save look",
      resetColorsOnArchetype: false,
      onComplete: () => {
        this.deps.onAppearanceChange?.();
        this.deps.onPersist?.();
        this._status = "Look saved to your slot.";
        this._go("trainer");
      },
    });
  }

  _renderQuests(body) {
    const entries = this.deps.questManager?.entries?.() ?? [];
    const available = this.deps.questManager?.available?.() ?? [];
    if (!entries.length && !available.length) {
      body.innerHTML = "<p class=\"dim\">No quests yet. Talk to the staff.</p>";
      return;
    }
    if (entries.length) {
      const ul = document.createElement("ul");
      ul.className = "menu-quest-list";
      for (const q of entries.sort((a, b) => Number(a.complete) - Number(b.complete))) {
        const li = document.createElement("li");
        li.className = q.complete ? "quest-complete" : "";
        li.innerHTML = `<strong>${q.label}</strong>` +
          `<span class="menu-detail">${q.complete ? "COMPLETE" : `${q.stage}/${q.target}`}</span>` +
          (q.hint ? `<span class="dim">${q.hint}</span>` : "") +
          (q.complete && q.reward ? `<span class="dim">Reward: ${q.reward}</span>` : "");
        ul.appendChild(li);
      }
      body.appendChild(ul);
    }
    if (!available.length) return;
    const h = document.createElement("h3");
    h.textContent = "Not accepted yet";
    body.appendChild(h);
    const ul = document.createElement("ul");
    ul.className = "menu-quest-list";
    for (const q of available) {
      const li = document.createElement("li");
      li.className = "quest-locked";
      li.innerHTML = `<strong>${q.label}</strong>` +
        (q.giver ? `<span class="menu-detail">ask ${q.giver}</span>` : "") +
        (q.hint ? `<span class="dim">${q.hint}</span>` : "");
      ul.appendChild(li);
    }
    body.appendChild(ul);
  }

  _renderDex(body) {
    for (const collection of DEX_COLLECTIONS) {
      const progress = dexProgress(this.session, collection);
      const h = document.createElement("h3");
      h.textContent = `${DEX_LABELS[collection]} — ${progress.found}/${progress.total}`;
      body.appendChild(h);
      const grid = document.createElement("div");
      grid.className = "menu-dex-grid";
      for (const entry of dexEntries(this.session, collection)) {
        const cell = document.createElement("div");
        cell.className = `menu-dex-entry${entry.found ? " found" : ""}`;
        cell.innerHTML = entry.found
          ? `<strong>${entry.label}</strong><span class="dim">${entry.sublabel}</span>`
          : "<strong>— — —</strong><span class=\"dim\">not yet seen</span>";
        grid.appendChild(cell);
      }
      body.appendChild(grid);
    }
  }

  _renderBag(body) {
    const items = bagContents(this.session);
    if (!items.length) {
      body.innerHTML = "<p class=\"dim\">Your bag is empty. Buy something you will regret.</p>";
      return;
    }
    this._list(body, items.map((item) => ({
      label: `${item.label}${item.equipped ? " ★" : ""}`,
      detail: item.source,
      onSelect: () => {
        if (item.wearable) {
          const equipped = equipItem(this.session, item.id);
          this._status = equipped === item.id ? `Wearing ${item.label}.` : `Stowed ${item.label}.`;
          this.deps.onPersist?.();
        } else {
          this._status = item.note;
        }
        this._render();
      },
    })));
  }

  _renderEggs(body) {
    const found = new Set(foundEggs(this.session));
    const ul = document.createElement("ul");
    ul.className = "menu-quest-list";
    for (const [id, egg] of Object.entries(EGG_REGISTRY)) {
      const li = document.createElement("li");
      const isFound = found.has(id);
      li.className = isFound ? "quest-complete" : "";
      li.innerHTML = isFound
        ? `<strong>${egg.label}</strong><span class="dim">${egg.reveal}</span>`
        : `<strong>???</strong><span class="dim">${egg.hint}</span>`;
      ul.appendChild(li);
    }
    body.appendChild(ul);
  }

  _renderCompletion(body) {
    const completion = getResortCompletion(this.session);
    const heading = document.createElement("h3");
    heading.textContent = `Resort completion — ${completion.percent}%`;
    const tagline = document.createElement("p");
    tagline.className = "dim";
    tagline.textContent = completion.tagline;
    body.append(heading, tagline);

    const ul = document.createElement("ul");
    ul.className = "menu-quest-list";
    for (const item of completion.items) {
      const li = document.createElement("li");
      li.className = item.current >= item.total ? "quest-complete" : "";
      li.innerHTML = `<strong>${item.label}</strong><span class="menu-detail">${item.current}/${item.total}</span>`;
      ul.appendChild(li);
    }
    body.appendChild(ul);
  }

  _renderOptions(body) {
    const rpg = this.rpg;
    if (!rpg.options) rpg.options = {};
    const options = rpg.options;
    const speeds = ["slow", "normal", "fast"];
    this._list(body, [
      {
        label: `Sound: ${options.muted ? "OFF" : "ON"}`,
        onSelect: () => {
          options.muted = !options.muted;
          this.deps.audio?.setMuted?.(options.muted);
          this.deps.onPersist?.();
          this._render();
        },
      },
      {
        label: `Text speed: ${options.textSpeed ?? "normal"}`,
        onSelect: () => {
          const idx = speeds.indexOf(options.textSpeed ?? "normal");
          options.textSpeed = speeds[(idx + 1) % speeds.length];
          this.deps.onTextSpeed?.(options.textSpeed);
          this.deps.onPersist?.();
          this._render();
        },
      },
      {
        label: `Footstep SFX: ${options.footsteps === false ? "OFF" : "ON"}`,
        onSelect: () => {
          options.footsteps = options.footsteps === false;
          this.deps.onPersist?.();
          this._render();
        },
      },
    ]);
  }

  _save() {
    if (this.session.slotId == null) {
      this._status = "Guest visit — start from a save slot to keep progress.";
      this._render();
      return;
    }
    this.deps.saveAdapter?.persist();
    this._status = `Saved to ${this.session.slotLabel || `Slot ${this.session.slotId}`}.`;
    this._render();
  }

  _exit() {
    this.deps.saveAdapter?.persist();
    this.deps.onExit?.();
  }
}
