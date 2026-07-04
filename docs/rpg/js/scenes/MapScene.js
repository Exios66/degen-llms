import {
  LOCATIONS, getLocation, canTravel, getEdges, DEFAULT_LOCATION,
} from "../data/locations.js";
import { getNpcsAtLocation } from "../data/dialogues.js";
import { ensureRpgData, travelTo, fmtChips, casinoUrl, persistSession } from "../session.js";
import DialogueUI from "../systems/DialogueUI.js";
import BlackjackEncounter from "../systems/BlackjackEncounter.js";

export default class MapScene extends Phaser.Scene {
  constructor() {
    super({ key: "MapScene" });
  }

  create() {
    this.session = this.registry.get("session");
    ensureRpgData(this.session);

    this.nodeSprites = {};
    this.labelTexts = {};
    this.playerMarker = null;
    this.statusTimer = null;

    this.drawMap();
    this.setupSystems();
    this.renderHud();
    this.placePlayerMarker();
    this.updateNodeHighlights();
  }

  drawMap() {
    const graphics = this.add.graphics();
    graphics.lineStyle(2, 0x3d5a80, 0.6);

    for (const { from, to } of getEdges()) {
      graphics.lineBetween(
        from.position.x, from.position.y + 80,
        to.position.x, to.position.y + 80,
      );
    }

    for (const loc of Object.values(LOCATIONS)) {
      const y = loc.position.y + 80;
      const sprite = this.add.image(loc.position.x, y, "node-default");
      sprite.setTint(loc.color);
      sprite.setInteractive({ useHandCursor: true });
      sprite.setData("locationId", loc.id);
      sprite.on("pointerdown", () => this.tryTravel(loc.id));
      this.nodeSprites[loc.id] = sprite;

      const label = this.add.text(loc.position.x, y + 36, loc.name, {
        fontFamily: "JetBrains Mono, monospace",
        fontSize: "10px",
        color: "#c8d3f5",
        align: "center",
        wordWrap: { width: 120 },
      }).setOrigin(0.5, 0);
      this.labelTexts[loc.id] = label;
    }

    this.playerMarker = this.add.image(0, 0, "player-marker");
    this.playerMarker.setDepth(10);
  }

  setupSystems() {
    const overlayEl = document.getElementById("ui-overlay");

    this.dialogue = new DialogueUI({
      overlayEl,
      onClose: () => {
        this.scene.resume();
        this.renderHud();
      },
      onEncounter: (encounterType, npc) => {
        if (encounterType === "blackjack") {
          this.startBlackjack(npc);
        }
      },
    });

    this.blackjack = new BlackjackEncounter({
      overlayEl,
      onComplete: ({ net, silent }) => {
        this.scene.resume();
        this.renderHud();
        if (!silent) {
          const sign = net >= 0 ? "+" : "";
          this.showStatus(`Left the table. Session net: ${sign}${net.toLocaleString()} chips`);
        }
      },
    });
  }

  currentLocationId() {
    return this.session.rpgData?.location ?? DEFAULT_LOCATION;
  }

  placePlayerMarker() {
    const loc = getLocation(this.currentLocationId());
    if (!loc || !this.playerMarker) return;
    this.playerMarker.setPosition(loc.position.x, loc.position.y + 80);
  }

  updateNodeHighlights() {
    const current = this.currentLocationId();
    for (const [id, sprite] of Object.entries(this.nodeSprites)) {
      if (id === current) {
        sprite.setScale(1.2);
        sprite.setAlpha(1);
      } else {
        sprite.setScale(1);
        const adjacent = canTravel(current, id);
        sprite.setAlpha(adjacent ? 0.85 : 0.45);
      }
    }
  }

  tryTravel(targetId) {
    const current = this.currentLocationId();
    if (targetId === current) return;
    if (!canTravel(current, targetId)) {
      this.showStatus("You can only travel to adjacent locations.", "error");
      return;
    }
    travelTo(this.session, targetId);
    this.placePlayerMarker();
    this.updateNodeHighlights();
    this.renderHud();
    const loc = getLocation(targetId);
    this.showStatus(`Arrived at ${loc?.name ?? targetId}.`);
  }

  getNpcsHere() {
    return getNpcsAtLocation(this.currentLocationId());
  }

  openDialogue(npc) {
    this.scene.pause();
    this.dialogue.open(this.session, npc);
  }

  startBlackjack(npc) {
    this.scene.pause();
    const loc = getLocation(npc.location);
    this.blackjack.start(this.session, {
      title: `${loc?.name ?? "Casino"} — Blackjack`,
    });
  }

  renderHud() {
    const hud = document.getElementById("hud-overlay");
    hud.innerHTML = "";

    const title = document.createElement("span");
    title.className = "hud-title";
    title.textContent = "Resort RPG";
    hud.appendChild(title);

    const player = document.createElement("span");
    player.textContent = this.session.playerName;
    hud.appendChild(player);

    const chips = document.createElement("span");
    chips.textContent = fmtChips(this.session.wallet.balance);
    hud.appendChild(chips);

    const loc = getLocation(this.currentLocationId());
    const locEl = document.createElement("span");
    locEl.className = "hud-dim";
    locEl.textContent = loc?.name ?? "Unknown";
    hud.appendChild(locEl);

    const actions = document.createElement("div");
    actions.className = "hud-actions";

    const npcs = this.getNpcsHere();
    if (npcs.length) {
      const talkBtn = document.createElement("button");
      talkBtn.className = "hud-btn primary";
      talkBtn.textContent = npcs.length === 1
        ? `Talk to ${npcs[0].name}`
        : `Talk (${npcs.map((n) => n.name).join(", ")})`;
      talkBtn.onclick = () => {
        if (npcs.length === 1) {
          this.openDialogue(npcs[0]);
        } else {
          this.showNpcPicker(npcs);
        }
      };
      actions.appendChild(talkBtn);
    }

    const saveBtn = document.createElement("button");
    saveBtn.className = "hud-btn";
    saveBtn.textContent = "Save";
    saveBtn.onclick = () => {
      persistSession(this.session);
      this.showStatus(this.session.slotId != null
        ? `Saved to ${this.session.slotLabel || `Slot ${this.session.slotId}`}.`
        : "Guest visit — pick a save slot to persist progress.");
    };
    actions.appendChild(saveBtn);

    const casinoLink = document.createElement("a");
    casinoLink.href = casinoUrl(this.session);
    casinoLink.className = "hud-btn";
    casinoLink.textContent = "Terminal Casino";
    actions.appendChild(casinoLink);

    hud.appendChild(actions);
  }

  showNpcPicker(npcs) {
    const overlay = document.getElementById("ui-overlay");
    overlay.innerHTML = "";

    const panel = document.createElement("div");
    panel.className = "overlay-panel";
    panel.innerHTML = "<h2>Who do you want to talk to?</h2>";

    const choices = document.createElement("div");
    choices.className = "choices";
    for (const npc of npcs) {
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.textContent = npc.name;
      btn.onclick = () => {
        overlay.innerHTML = "";
        this.openDialogue(npc);
      };
      choices.appendChild(btn);
    }

    const cancel = document.createElement("button");
    cancel.className = "overlay-btn";
    cancel.textContent = "Cancel";
    cancel.onclick = () => { overlay.innerHTML = ""; };
    choices.appendChild(cancel);

    panel.appendChild(choices);
    overlay.appendChild(panel);
  }

  showStatus(text, type = "success") {
    const existing = document.querySelector(".status-msg");
    if (existing) existing.remove();
    if (this.statusTimer) clearTimeout(this.statusTimer);

    const msg = document.createElement("div");
    msg.className = `status-msg${type === "error" ? " error" : ""}`;
    msg.textContent = text;
    document.body.appendChild(msg);

    this.statusTimer = setTimeout(() => msg.remove(), 3500);
  }

  shutdown() {
    document.getElementById("ui-overlay").innerHTML = "";
    if (this.statusTimer) clearTimeout(this.statusTimer);
    const status = document.querySelector(".status-msg");
    if (status) status.remove();
  }
}
