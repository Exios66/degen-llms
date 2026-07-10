import Phaser from "phaser";
import { createGameTextures, playerTextureKey } from "../systems/TextureFactory.js";
import {
  TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, buildMapLayersForId, getNpcsForMap,
  DOOR_TRIGGERS, getMapDefinition, SPAWN_DEFAULT, TILE, resolveNpcPosition,
} from "../systems/MapData.js";
import { getSessionDealer } from "../../../js/dealers.js";
import { resolveNpc } from "../../../js/staff-manifest.js";
import { audioManager } from "../systems/AudioManager.js";

export class OverworldScene extends Phaser.Scene {
  constructor() {
    super({ key: "OverworldScene" });
  }

  init(data) {
    this.session = data.session;
    this.saveAdapter = data.saveAdapter;
    this.dialogue = data.dialogue;
    this.encounters = data.encounters;
    this.onHudUpdate = data.onHudUpdate;
    this.dialogues = data.dialogues ?? {};
    this.triggers = data.triggers ?? [];
    this.questManager = data.questManager ?? null;
    this.audio = data.audio ?? audioManager;
  }

  create() {
    createGameTextures(this);
    if (this.dialogues && this.dialogue) {
      this.dialogue.load(this.dialogues);
      this.dialogue.setFlags(this.saveAdapter.rpg.flags ?? {});
      if (this.questManager) this.dialogue.setQuestManager?.(this.questManager);
    }

    const mapId = this.saveAdapter.rpg.mapId ?? "main_resort";
    this.currentMapId = mapId;
    const { ground, collision, decor } = buildMapLayersForId(mapId);
    this.collisionGrid = collision;
    this.groundGrid = ground;

    // Local archetype shortcut / staff corridor unlock
    const rpg = this.saveAdapter.rpg;
    if (rpg.flags?.hint_north_wall || rpg.archetype === "local") {
      if (mapId === "main_resort") {
        for (let x = 14; x <= 16; x++) {
          this.collisionGrid[1][x] = 0;
          this.groundGrid[1][x] = TILE.CARPET;
        }
      }
    }

    this.groundLayer = this.add.group();
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tile = ground[y][x];
        if (tile === 0) continue;
        this.groundLayer.add(
          this.add.image(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, `tile_${tile}`)
        );
        if (decor[y][x]) {
          const d = decor[y][x];
          let decorKey = "decor_plant";
          if (d === TILE.BAR) decorKey = "decor_bar";
          else if (d === TILE.SLOT) decorKey = "decor_slot";
          else if (d === TILE.SCREEN) decorKey = "decor_screen";
          this.groundLayer.add(
            this.add.image(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, decorKey)
          );
        }
      }
    }

    const spawn = this.saveAdapter.rpg;
    const mapDef = getMapDefinition(mapId);
    const px = spawn.x ?? mapDef.spawn.x ?? SPAWN_DEFAULT.x;
    const py = spawn.y ?? mapDef.spawn.y ?? SPAWN_DEFAULT.y;

    const pKey = playerTextureKey(spawn.archetype || spawn.playerSprite);
    this.player = this.physics.add.sprite(px * TILE_SIZE + TILE_SIZE / 2, py * TILE_SIZE + TILE_SIZE / 2, pKey);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(12, 12);
    this.player.body.setOffset(2, 8);

    this.physics.world.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);

    const worldTime = spawn.worldTime ?? 720;
    this.npcSprites = new Map();
    this.npcLabels = new Map();
    this.currentNpcs = getNpcsForMap(mapId).map((npc) => {
      const pos = resolveNpcPosition(npc, worldTime);
      return { ...npc, x: pos.x, y: pos.y };
    });
    for (const npc of this.currentNpcs) {
      const sprite = this.add.sprite(
        npc.x * TILE_SIZE + TILE_SIZE / 2,
        npc.y * TILE_SIZE + TILE_SIZE / 2,
        npc.sprite
      );
      sprite.setData("npc", npc);
      this.npcSprites.set(npc.id, sprite);

      const displayName = this._resolveNpcDisplayName(npc);
      const label = this.add.text(sprite.x, sprite.y - 14, displayName.split(" ")[0], {
        fontFamily: "Press Start 2P",
        fontSize: "6px",
        color: "#e8c547",
      }).setOrigin(0.5);
      this.npcLabels.set(npc.id, label);

      if (npc.zone) {
        const dealer = this._dealerForZone(npc.zone);
        sprite.setTexture(dealer.sprite);
      }
    }

    this.interactIcon = this.add.image(0, 0, "interact_icon").setVisible(false).setDepth(100);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      t: Phaser.Input.Keyboard.KeyCodes.T,
    });

    this.cameras.main.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1);

    this.facing = "down";
    this.canMove = true;
    this.nearbyNpc = null;
    this._lastDoorTile = null;
    this._lastTriggerId = null;
    this._footTimer = 0;
    this._konami = [];

    this._applyDayNightTint(worldTime);
    this.audio?.playBgm?.(this.audio.bgmForMap(mapId));

    this.onHudUpdate?.();
    this.scale.on("resize", this._fitCamera, this);
    this._fitCamera();

    this.cameras.main.fadeIn(300, 0, 0, 0);

    if (!this.saveAdapter.hasFlag("tutorial_complete")) {
      this.time.delayedCall(600, () => {
        this.canMove = false;
        this.dialogue.start("chip_chandler_intro").then(() => {
          this.canMove = true;
        });
      });
    }

    this.input.keyboard.on("keydown", (ev) => this._trackKonami(ev));
  }

  _applyDayNightTint(worldTime) {
    const isNight = worldTime >= 1200 || worldTime < 360;
    if (isNight) {
      this.cameras.main.setBackgroundColor("#080610");
      this.tweens.add({
        targets: this.cameras.main,
        // soft neon night via fade overlay
        duration: 1,
      });
      if (!this._nightOverlay) {
        this._nightOverlay = this.add.rectangle(
          MAP_WIDTH * TILE_SIZE / 2,
          MAP_HEIGHT * TILE_SIZE / 2,
          MAP_WIDTH * TILE_SIZE,
          MAP_HEIGHT * TILE_SIZE,
          0x1a0a40,
          0.28
        ).setDepth(50).setScrollFactor(1);
      }
    } else if (this._nightOverlay) {
      this._nightOverlay.destroy();
      this._nightOverlay = null;
    }
  }

  _fitCamera() {
    const w = MAP_WIDTH * TILE_SIZE;
    const h = MAP_HEIGHT * TILE_SIZE;
    const scaleX = this.scale.width / w;
    const scaleY = this.scale.height / h;
    const zoom = Math.min(scaleX, scaleY, 2);
    this.cameras.main.setZoom(zoom);
  }

  update(_time, delta) {
    if (!this.canMove || this.dialogue.isActive() || this.encounters.isAnyActive?.() || this.encounters.blackjack?.isActive()) {
      this.player.body.setVelocity(0, 0);
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.t)) {
      this.onHudUpdate?.({ trainerCard: true });
    }

    const speed = this.keys.shift.isDown ? 120 : 80;
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.keys.a.isDown) vx = -speed;
    else if (this.cursors.right.isDown || this.keys.d.isDown) vx = speed;
    if (this.cursors.up.isDown || this.keys.w.isDown) vy = -speed;
    else if (this.cursors.down.isDown || this.keys.s.isDown) vy = speed;

    this.player.body.setVelocity(vx, vy);

    if (vx !== 0 || vy !== 0) {
      if (Math.abs(vx) > Math.abs(vy)) this.facing = vx < 0 ? "left" : "right";
      else this.facing = vy < 0 ? "up" : "down";
      this._footTimer += delta;
      if (this._footTimer > 220) {
        this._footTimer = 0;
        const tx = Math.floor(this.player.x / TILE_SIZE);
        const ty = Math.floor(this.player.y / TILE_SIZE);
        const tile = this.groundGrid?.[ty]?.[tx];
        this.audio?.sfx?.(tile === TILE.LOBBY ? "foot_lobby" : "foot_carpet");
        this._advanceWorldTime(1);
      }
    }

    this._resolveCollision();
    this._updateNearbyNpc();
    this._checkDoorTriggers();
    this._checkZoneTriggers();

    if (Phaser.Input.Keyboard.JustDown(this.keys.e) ||
        Phaser.Input.Keyboard.JustDown(this.keys.enter) ||
        Phaser.Input.Keyboard.JustDown(this.keys.space)) {
      this._tryInteract();
    }

    this._autosavePosition(delta);
  }

  _advanceWorldTime(minutes) {
    const rpg = this.saveAdapter.rpg;
    rpg.worldTime = ((rpg.worldTime ?? 720) + minutes) % 1440;
    if (minutes >= 1 && Math.random() < 0.02) {
      this._applyDayNightTint(rpg.worldTime);
    }
  }

  _resolveCollision() {
    const body = this.player.body;
    const half = 0.35;
    for (const [ox, oy] of [[-half, -half], [half, -half], [-half, half], [half, half]]) {
      const cx = Math.floor((body.center.x + ox * TILE_SIZE) / TILE_SIZE);
      const cy = Math.floor((body.center.y + oy * TILE_SIZE) / TILE_SIZE);
      if (this._isBlocked(cx, cy)) {
        body.setVelocity(0, 0);
        return;
      }
    }
  }

  _isBlocked(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= MAP_WIDTH || ty >= MAP_HEIGHT) return true;
    return this.collisionGrid[ty][tx] === 1;
  }

  _updateNearbyNpc() {
    let closest = null;
    let closestDist = 999;

    for (const npc of this.currentNpcs ?? []) {
      const dx = this.player.x - (npc.x * TILE_SIZE + TILE_SIZE / 2);
      const dy = this.player.y - (npc.y * TILE_SIZE + TILE_SIZE / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 28 && this._isFacingNpc(npc)) {
        if (dist < closestDist) {
          closestDist = dist;
          closest = npc;
        }
      }
    }

    this.nearbyNpc = closest;
    if (closest) {
      this.interactIcon.setVisible(true);
      this.interactIcon.setPosition(
        closest.x * TILE_SIZE + TILE_SIZE / 2,
        closest.y * TILE_SIZE - 18
      );
    } else {
      this.interactIcon.setVisible(false);
    }
  }

  _isFacingNpc(npc) {
    const px = this.player.x;
    const py = this.player.y;
    const nx = npc.x * TILE_SIZE + TILE_SIZE / 2;
    const ny = npc.y * TILE_SIZE + TILE_SIZE / 2;
    const dx = nx - px;
    const dy = ny - py;
    switch (this.facing) {
      case "up": return dy < -4 && Math.abs(dx) < 20;
      case "down": return dy > 4 && Math.abs(dx) < 20;
      case "left": return dx < -4 && Math.abs(dy) < 20;
      case "right": return dx > 4 && Math.abs(dy) < 20;
      default: return false;
    }
  }

  _dealerForZone(zone) {
    return getSessionDealer(this.session, zone);
  }

  _resolveNpcDisplayName(npc) {
    if (npc.zone) {
      return this._dealerForZone(npc.zone).name;
    }
    return resolveNpc(this.session, npc.id, { fallbackName: npc.name }).name;
  }

  _resolveDealerDialogueId(dealerId, baseKind) {
    const returnId = `${dealerId}_return`;
    const greetId = `${dealerId}_greet`;
    if (baseKind === "return" && this.dialogues[returnId]) return returnId;
    return this.dialogues[greetId] ? greetId : greetId;
  }

  _checkDoorTriggers() {
    const tx = Math.floor(this.player.x / TILE_SIZE);
    const ty = Math.floor(this.player.y / TILE_SIZE);
    const key = `${tx},${ty}`;
    if (this._lastDoorTile === key) return;
    this._lastDoorTile = key;
    const trigger = DOOR_TRIGGERS.find((d) =>
      d.mapId === this.currentMapId && d.x === tx && d.y === ty);
    if (!trigger) return;

    if (trigger.requiresFlag && !this.saveAdapter.hasFlag(trigger.requiresFlag)) {
      this.dialogue.showSystemMessage("A locked STAFF ONLY door.");
      return;
    }
    if (trigger.requiresChips != null) {
      const rpg = this.saveAdapter.rpg;
      const need = (rpg.archetype === "high_roller" && trigger.highRollerAlt != null)
        ? trigger.highRollerAlt
        : trigger.requiresChips;
      if (this.session.wallet.balance < need) {
        this.dialogue.showSystemMessage(`Need ${need.toLocaleString()} chips to enter.`);
        return;
      }
    }
    this._transitionMap(trigger.targetMap, trigger.targetX, trigger.targetY, trigger.message);
  }

  _checkZoneTriggers() {
    const tx = Math.floor(this.player.x / TILE_SIZE);
    const ty = Math.floor(this.player.y / TILE_SIZE);
    for (const t of this.triggers) {
      if (t.mapId && t.mapId !== this.currentMapId) continue;
      const w = t.width ?? 1;
      const h = t.height ?? 1;
      if (tx >= t.x && tx < t.x + w && ty >= t.y && ty < t.y + h) {
        if (this._lastTriggerId === t.id) return;
        this._lastTriggerId = t.id;
        if (t.setFlag) this.saveAdapter.setFlag(t.setFlag);
        if (t.type === "zone_message" && t.message) {
          this.dialogue.showSystemMessage(t.message);
        }
        if (t.type === "warp" && t.targetMap) {
          if (t.requiresFlag && !this.saveAdapter.hasFlag(t.requiresFlag)) continue;
          this._transitionMap(t.targetMap, t.targetX ?? 15, t.targetY ?? 26, t.message);
        }
        return;
      }
    }
    this._lastTriggerId = null;
  }

  _transitionMap(targetMapId, targetX, targetY, message) {
    this.canMove = false;
    this.saveAdapter.updatePosition(targetX, targetY, targetMapId);
    this.saveAdapter.persist();
    if (message) this.dialogue.showSystemMessage(message);
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.time.delayedCall(260, () => {
      this.scene.restart({
        session: this.session,
        saveAdapter: this.saveAdapter,
        dialogue: this.dialogue,
        encounters: this.encounters,
        dialogues: this.dialogues,
        triggers: this.triggers,
        questManager: this.questManager,
        audio: this.audio,
        onHudUpdate: this.onHudUpdate,
      });
    });
  }

  async _tryInteract() {
    if (!this.nearbyNpc) return;
    const npc = this.nearbyNpc;
    let dialogueId = npc.dialogueId;
    let activeDealer = null;

    if (npc.zone) {
      activeDealer = this._dealerForZone(npc.zone);
      const playedFlag = npc.zone === "blackjack" ? "played_blackjack" : `played_${npc.zone}`;
      const kind = this.saveAdapter.hasFlag(playedFlag) ? "return" : "greet";
      dialogueId = this._resolveDealerDialogueId(activeDealer.id, kind);
    }

    this.canMove = false;
    this.player.body.setVelocity(0, 0);

    const result = await this.dialogue.start(dialogueId);

    if (result.reputation) {
      const rep = this.saveAdapter.rpg.reputation ?? { whales: 0, staff: 0, tourists: 0 };
      for (const [k, v] of Object.entries(result.reputation)) {
        rep[k] = (rep[k] ?? 0) + v;
      }
      this.saveAdapter.rpg.reputation = rep;
    }

    if (result.encounter || npc.encounter) {
      const encounterId = result.encounter || npc.encounter;
      const encounterNpc = activeDealer
        ? { ...npc, name: activeDealer.name, dealerId: activeDealer.id }
        : npc;
      await this._runEncounter(encounterId, encounterNpc, activeDealer);
    }

    // Security Sam escort comedy
    if (npc.id === "security_sam" && this.saveAdapter.hasFlag("hint_north_wall")) {
      this.saveAdapter.setFlag("found_back_room");
    }

    this.canMove = true;
    this.onHudUpdate?.();
  }

  async _runEncounter(encounterId, npc, dealerProfile = null) {
    this.scene.pause();
    this.canMove = false;
    this.cameras.main.flash(120, 20, 10, 40);
    this.audio?.sfx?.("click");
    await this.encounters.start(encounterId, {
      dealerName: npc.name,
      dealerProfile: dealerProfile ?? null,
    });
    this.scene.resume();
    this.canMove = true;
    this._advanceWorldTime(5);
    this.saveAdapter.persist();
    this.onHudUpdate?.();
  }

  _trackKonami(ev) {
    const code = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    this._konami.push(ev.key);
    if (this._konami.length > code.length) this._konami.shift();
    if (this._konami.join(",") === code.join(",")) {
      this.saveAdapter.setFlag("konami_mode");
      this.audio?.sfx?.("secret");
      this.dialogue.showSystemMessage("Retro palette unlocked. The statue winks.");
      document.getElementById("game-shell")?.classList.add("konami-mode");
      this._konami = [];
    }
  }

  _saveTimer = 0;
  _autosavePosition(delta) {
    this._saveTimer += delta;
    if (this._saveTimer < 2000) return;
    this._saveTimer = 0;
    const tx = Math.floor(this.player.x / TILE_SIZE);
    const ty = Math.floor(this.player.y / TILE_SIZE);
    this.saveAdapter.updatePosition(tx, ty);
    this.saveAdapter.persist();
  }
}
