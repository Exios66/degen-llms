import Phaser from "phaser";
import { createGameTextures } from "../systems/TextureFactory.js";
import {
  TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, buildMapLayersForId, getNpcsForMap,
  DOOR_TRIGGERS, getMapDefinition, SPAWN_DEFAULT, TILE,
} from "../systems/MapData.js";
import { getSessionDealer } from "../../../js/dealers.js";
import { resolveNpc } from "../../../js/staff-manifest.js";

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
  }

  create() {
    createGameTextures(this);
    if (this.dialogues && this.dialogue) {
      this.dialogue.load(this.dialogues);
      this.dialogue.setFlags(this.saveAdapter.rpg.flags ?? {});
    }

    const mapId = this.saveAdapter.rpg.mapId ?? "main_resort";
    this.currentMapId = mapId;
    const { ground, collision, decor } = buildMapLayersForId(mapId);
    this.collisionGrid = collision;

    this.groundLayer = this.add.group();
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tile = ground[y][x];
        if (tile === 0) continue;
        this.groundLayer.add(
          this.add.image(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, `tile_${tile}`)
        );
        if (decor[y][x]) {
          const decorKey = decor[y][x] === TILE.BAR ? "decor_bar" : "decor_plant";
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

    this.player = this.physics.add.sprite(px * TILE_SIZE + TILE_SIZE / 2, py * TILE_SIZE + TILE_SIZE / 2, "player");
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(12, 12);
    this.player.body.setOffset(2, 8);

    this.physics.world.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);

    this.npcSprites = new Map();
    this.npcLabels = new Map();
    this.currentNpcs = getNpcsForMap(mapId);
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
    });

    this.cameras.main.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1);

    this.facing = "down";
    this.canMove = true;
    this.nearbyNpc = null;
    this._lastDoorTile = null;

    this.onHudUpdate?.();
    this.scale.on("resize", this._fitCamera, this);
    this._fitCamera();

    if (!this.saveAdapter.hasFlag("tutorial_complete")) {
      this.time.delayedCall(600, () => {
        this.canMove = false;
        this.dialogue.start("chip_chandler_intro").then(() => {
          this.canMove = true;
        });
      });
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
    if (!this.canMove || this.dialogue.isActive() || this.encounters.blackjack.isActive()) {
      this.player.body.setVelocity(0, 0);
      return;
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
    }

    this._resolveCollision();
    this._updateNearbyNpc();
    this._checkDoorTriggers();

    if (Phaser.Input.Keyboard.JustDown(this.keys.e) ||
        Phaser.Input.Keyboard.JustDown(this.keys.enter) ||
        Phaser.Input.Keyboard.JustDown(this.keys.space)) {
      this._tryInteract();
    }

    this._autosavePosition(delta);
  }

  _resolveCollision() {
    const body = this.player.body;
    const tx = Math.floor(body.center.x / TILE_SIZE);
    const ty = Math.floor(body.center.y / TILE_SIZE);
    const half = 0.35;

    for (const [ox, oy] of [[-half, -half], [half, -half], [-half, half], [half, half]]) {
      const cx = Math.floor((body.center.x + ox * TILE_SIZE) / TILE_SIZE);
      const cy = Math.floor((body.center.y + oy * TILE_SIZE) / TILE_SIZE);
      if (this._isBlocked(cx, cy)) {
        body.setVelocity(0, 0);
        return;
      }
    }

    if (this._isBlocked(tx, ty)) {
      body.setVelocity(0, 0);
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
    this._transitionMap(trigger.targetMap, trigger.targetX, trigger.targetY, trigger.message);
  }

  _transitionMap(targetMapId, targetX, targetY, message) {
    this.canMove = false;
    this.saveAdapter.updatePosition(targetX, targetY, targetMapId);
    this.saveAdapter.persist();
    if (message) {
      this.dialogue.showSystemMessage?.(message) ?? null;
    }
    this.scene.restart({
      session: this.session,
      saveAdapter: this.saveAdapter,
      dialogue: this.dialogue,
      encounters: this.encounters,
      dialogues: this.dialogues,
      onHudUpdate: this.onHudUpdate,
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

    if (result.encounter) {
      const encounterNpc = activeDealer
        ? { ...npc, name: activeDealer.name, dealerId: activeDealer.id }
        : npc;
      await this._runEncounter(result.encounter, encounterNpc, activeDealer);
    }

    this.canMove = true;
    this.onHudUpdate?.();
  }

  async _runEncounter(encounterId, npc, dealerProfile = null) {
    this.scene.pause();
    this.canMove = false;
    await this.encounters.start(encounterId, {
      dealerName: npc.name,
      dealerProfile: dealerProfile ?? null,
    });
    this.scene.resume();
    this.canMove = true;
    this.saveAdapter.persist();
    this.onHudUpdate?.();
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
