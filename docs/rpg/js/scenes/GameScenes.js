import Phaser from "phaser";
import { createGameTextures, ensurePlayerTextures, playerTextureKey, playerAnimKey } from "../systems/TextureFactory.js";
import { normalizeAppearance } from "../systems/CharacterAppearance.js";
import {
  TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, buildMapLayersForId, getNpcsForMap,
  doorAt, getMapDefinition, SPAWN_DEFAULT, TILE, resolveNpcPosition,
  MAP_ZONE_SIGNS,
} from "../systems/MapData.js";
import { getSessionDealer } from "../../../js/dealers.js";
import { resolveNpc } from "../../../js/staff-manifest.js";
import { audioManager } from "../systems/AudioManager.js";
import {
  canAccessHotelRoom, getWorldCycleState, reservationStatusMessage, syncWorldCycle,
} from "../../../js/world-cycle.js";
import { tierForWagered } from "../../../js/rewards.js";
import { tierIndex } from "../../../js/rewards-perks.js";
import { recordDex } from "../systems/Dex.js";
import { EGG_REGISTRY, discoverEgg, eggForFlag } from "../systems/EasterEggs.js";

/** Extra walk speed per MGM Rewards tier, plus the comped cart bonus. */
const SPEED_PER_TIER = 12;
const GOLF_CART_BONUS = 68;
const GOLF_CART_TIER_IDX = 3;

/** Per-surface footstep sound. */
const FOOTSTEP_SFX = {
  [TILE.LOBBY]: "foot_lobby",
  [TILE.CARPET]: "foot_carpet",
  [TILE.FELT]: "foot_felt",
  [TILE.VIP]: "foot_vip",
  [TILE.AQUA]: "foot_water",
  [TILE.WATER]: "foot_water",
  [TILE.SAND]: "foot_lobby",
  [TILE.ROAD]: "foot_lobby",
  [TILE.STAGE]: "foot_vip",
  [TILE.SPA]: "foot_water",
};

/** Screen wash per world-cycle day phase, indexed by WORLD_PHASES id. */
const PHASE_WASH = [
  { bg: "#120e18", tint: 0xffb066, alpha: 0.14 },
  { bg: "#0a0812", tint: 0x000000, alpha: 0 },
  { bg: "#0c0818", tint: 0x6a1a70, alpha: 0.22 },
  { bg: "#080610", tint: 0x1a0a40, alpha: 0.3 },
];

/** Decor props are drawn from the same tile vocabulary as the ground. */
const DECOR_KEYS = {
  [TILE.BAR]: "decor_bar",
  [TILE.PLANT]: "decor_plant",
  [TILE.SLOT]: "decor_slot",
  [TILE.SCREEN]: "decor_screen",
  [TILE.GLASS]: "decor_glass",
  [TILE.ROPE]: "decor_rope",
};

/** Sub-line under the room placard: which wing you are in, and when. */
const placardSub = (mapDef, phaseLabel) =>
  [mapDef?.wing, phaseLabel].filter(Boolean).join(" · ");

export class OverworldScene extends Phaser.Scene {
  constructor() {
    super({ key: "OverworldScene" });
    /** World pixels per tile — read by anything converting between the two. */
    this.tileSize = TILE_SIZE;
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
    this.onOpenMenu = data.onOpenMenu ?? null;
    this.isMenuOpen = data.isMenuOpen ?? (() => false);
    this.onMapBanner = data.onMapBanner ?? null;
    this.onEgg = data.onEgg ?? null;
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
        const groundImg = this.add.image(
          x * TILE_SIZE + TILE_SIZE / 2,
          y * TILE_SIZE + TILE_SIZE / 2,
          `tile_${tile}`
        );
        groundImg.setDepth(0);
        this.groundLayer.add(groundImg);
        if (decor[y][x]) {
          const decorKey = DECOR_KEYS[decor[y][x]] ?? "decor_plant";
          const decorImg = this.add.image(
            x * TILE_SIZE + TILE_SIZE / 2,
            y * TILE_SIZE + TILE_SIZE / 2,
            decorKey
          );
          decorImg.setDepth(2);
          this.groundLayer.add(decorImg);
        }
      }
    }
    this._createZoneSigns(mapId);

    const spawn = this.saveAdapter.rpg;
    const mapDef = getMapDefinition(mapId);
    const px = spawn.x ?? mapDef.spawn.x ?? SPAWN_DEFAULT.x;
    const py = spawn.y ?? mapDef.spawn.y ?? SPAWN_DEFAULT.y;

    this.playerArchetype = spawn.archetype || spawn.playerSprite || "weekend_warrior";
    this.playerAppearance = normalizeAppearance(spawn);
    ensurePlayerTextures(this, this.playerAppearance);
    const pKey = playerTextureKey({ appearance: this.playerAppearance }, "down");
    this.player = this.physics.add.sprite(px * TILE_SIZE + TILE_SIZE / 2, py * TILE_SIZE + TILE_SIZE / 2, pKey);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.player.body.setSize(TILE_SIZE * 0.625, TILE_SIZE * 0.5);
    this.player.body.setOffset(TILE_SIZE * 0.1875, TILE_SIZE * 0.75);

    this.playerShadow = this.add.image(this.player.x, this.player.y + TILE_SIZE * 0.28, "shadow");
    this.playerShadow.setDepth(9);
    this.playerShadow.setAlpha(0.35);

    this.physics.world.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);

    // world-cycle.js is the single clock: the overworld tint and NPC schedules
    // both read its day phase, and rpg.worldTime mirrors it for older saves.
    const cycle = syncWorldCycle(this.session);
    this.dayPhase = cycle.phase;
    this._lastPhaseId = cycle.phase.id;
    this._wasEvicted = Boolean(cycle.roomEvicted);
    const worldTime = this._mirrorWorldTime(cycle);
    this.npcSprites = new Map();
    this.npcLabels = new Map();
    this.currentNpcs = getNpcsForMap(mapId).map((npc) => {
      const pos = resolveNpcPosition(npc, worldTime, this.dayPhase?.id);
      return { ...npc, x: pos.x, y: pos.y };
    });
    for (const npc of this.currentNpcs) {
      const sprite = this.add.sprite(
        npc.x * TILE_SIZE + TILE_SIZE / 2,
        npc.y * TILE_SIZE + TILE_SIZE / 2,
        npc.sprite
      );
      sprite.setDepth(10);
      sprite.setData("npc", npc);
      this.npcSprites.set(npc.id, sprite);

      const displayName = this._resolveNpcDisplayName(npc);
      const label = this._createNpcLabel(sprite.x, sprite.y - TILE_SIZE * 0.62, displayName, npc.zone);
      this.npcLabels.set(npc.id, label);

      if (npc.zone) {
        const dealer = this._dealerForZone(npc.zone);
        sprite.setTexture(dealer.sprite);
      }
    }

    this.interactIcon = this.add.image(0, 0, "interact_icon").setVisible(false).setDepth(100);

    // Make canvas focusable so keyboard events reach Phaser
    const canvas = this.game.canvas;
    if (canvas) {
      canvas.setAttribute("tabindex", "0");
      canvas.style.outline = "none";
      canvas.focus({ preventScroll: true });
    }

    this.moveKeys = { left: false, right: false, up: false, down: false, run: false };
    const setMove = (e, down) => {
      const k = e.key;
      const c = e.code;
      if (k === "ArrowLeft" || c === "ArrowLeft" || k === "a" || k === "A" || c === "KeyA") this.moveKeys.left = down;
      if (k === "ArrowRight" || c === "ArrowRight" || k === "d" || k === "D" || c === "KeyD") this.moveKeys.right = down;
      if (k === "ArrowUp" || c === "ArrowUp" || k === "w" || k === "W" || c === "KeyW") this.moveKeys.up = down;
      if (k === "ArrowDown" || c === "ArrowDown" || k === "s" || k === "S" || c === "KeyS") this.moveKeys.down = down;
      if (k === "Shift" || c === "ShiftLeft" || c === "ShiftRight") this.moveKeys.run = down;
      if (down && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(k)) {
        e.preventDefault?.();
      }
    };
    this._onKeyDownMove = (e) => setMove(e, true);
    this._onKeyUpMove = (e) => setMove(e, false);
    this.input.keyboard.on("keydown", this._onKeyDownMove);
    this.input.keyboard.on("keyup", this._onKeyUpMove);
    // Also listen on window in case canvas loses focus briefly
    window.addEventListener("keydown", this._onKeyDownMove);
    window.addEventListener("keyup", this._onKeyUpMove);
    this.events.once("shutdown", () => {
      window.removeEventListener("keydown", this._onKeyDownMove);
      window.removeEventListener("keyup", this._onKeyUpMove);
    });

    this.input.keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.W,
      Phaser.Input.Keyboard.KeyCodes.A,
      Phaser.Input.Keyboard.KeyCodes.S,
      Phaser.Input.Keyboard.KeyCodes.D,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.SHIFT,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    ]);
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
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
      x: Phaser.Input.Keyboard.KeyCodes.X,
    });

    this.cameras.main.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
    this.cameras.main.startFollow(this.player, true, 0.14, 0.14);
    this.cameras.main.setFollowOffset(0, TILE_SIZE * 0.45);
    this.cameras.main.setZoom(1);
    this.cameras.main.setRoundPixels(true);

    this.facing = "down";
    this.canMove = true;
    this.nearbyNpc = null;
    this._lastDoorTile = null;
    this._lastTriggerId = null;
    this._footTimer = 0;
    this._konami = [];
    this._moving = false;
    this._prevX = this.player.x;
    this._prevY = this.player.y;
    this.moveTarget = null;
    this._touchInteractRadius = TILE_SIZE * 1.75;
    this._setupTouchInput();
    this.events.on("postupdate", this._resolveCollision, this);
    this.events.once("shutdown", () => {
      this.events.off("postupdate", this._resolveCollision, this);
    });
    this._applyPlayerAnim(false);

    this._applyDayNightTint(worldTime);
    this.audio?.playBgm?.(mapDef.bgm ?? this.audio.bgmForMap(mapId));

    this._recordMapVisit(mapId);
    this._applyWalkSpeed();
    this.onMapBanner?.(mapDef.label ?? mapId, placardSub(mapDef, this.dayPhase?.label));

    this.onHudUpdate?.();
    this.scale.on("resize", this._fitCamera, this);
    this._fitCamera();

    this.cameras.main.fadeIn(300, 0, 0, 0);

    const hasGreeter = this.currentNpcs.some((n) => n.id === "chip_chandler");
    if (hasGreeter && !this.saveAdapter.hasFlag("tutorial_complete")) {
      this.time.delayedCall(600, () => {
        this.canMove = false;
        this.dialogue.start("chip_chandler_intro").then(() => {
          this.canMove = true;
        });
      });
    }

    this.input.keyboard.on("keydown", (ev) => this._trackKonami(ev));

    this._worldClock = this.time.addEvent({
      delay: 4000,
      loop: true,
      callback: () => this._tickWorldCycle(),
    });
    this.events.once("shutdown", () => this._worldClock?.remove());
    this.time.delayedCall(1400, () => this._announceDay(cycle));

    window.__rpgReady = true;
  }

  /**
   * Keep the legacy footstep clock in step with the real cycle so old saves and
   * the HUD keep reading a plausible time of day.
   * @returns {number} minutes past midnight
   */
  _mirrorWorldTime(cycle) {
    const minutes = Math.floor((cycle.dayProgress ?? 0) * 1440);
    this.saveAdapter.rpg.worldTime = minutes;
    return minutes;
  }

  /**
   * The overworld's heartbeat. One clock drives the tint, NPC schedules, and
   * the resort's daily pressure — charges, the rotating reservation
   * requirement, and eviction — so the RPG player feels what the terminal
   * player feels.
   */
  _tickWorldCycle() {
    if (!this.scene.isActive()) return;
    const cycle = syncWorldCycle(this.session);
    this._mirrorWorldTime(cycle);

    if (cycle.advanced) {
      for (const message of cycle.messages) {
        this.dialogue?.showSystemMessage?.(message, { speaker: "Front Desk", durationMs: 4200 });
      }
      this.audio?.sfx?.("denied");
      this.saveAdapter.persist();
      this._announceDay(cycle);
    }

    if (cycle.roomEvicted && !this._wasEvicted) {
      this.dialogue?.showSystemMessage?.(
        "Your key stops working. Settle the folio at the front desk or win it back on the floor.",
        { speaker: "Front Desk", durationMs: 4200 },
      );
    }
    this._wasEvicted = Boolean(cycle.roomEvicted);

    if (cycle.phase.id !== this._lastPhaseId) {
      this._lastPhaseId = cycle.phase.id;
      this.dayPhase = cycle.phase;
      this._applyDayNightTint(cycle.dayProgress * 1440);
      this._repositionNpcsForPhase();
      const mapDef = getMapDefinition(this.currentMapId);
      this.onMapBanner?.(mapDef.label ?? this.currentMapId, placardSub(mapDef, cycle.phase.label));
    }
    this.onHudUpdate?.();
  }

  /** Tell the player what today asks of them, once per in-game day. */
  _announceDay(cycle) {
    const state = cycle ?? getWorldCycleState(this.session);
    this.dialogue?.showSystemMessage?.(
      `Day ${state.displayDay} · ${state.phase.label} — ${reservationStatusMessage(this.session)}`,
      { speaker: "Resort", durationMs: 3600 },
    );
  }

  /** Walk NPCs to their positions for the new day phase. */
  _repositionNpcsForPhase() {
    const worldTime = this.saveAdapter.rpg.worldTime ?? 720;
    for (const npc of this.currentNpcs ?? []) {
      const pos = resolveNpcPosition(npc, worldTime, this.dayPhase?.id);
      if (pos.x === npc.x && pos.y === npc.y) continue;
      npc.x = pos.x;
      npc.y = pos.y;
      const sprite = this.npcSprites.get(npc.id);
      const label = this.npcLabels.get(npc.id);
      const tx = pos.x * TILE_SIZE + TILE_SIZE / 2;
      const ty = pos.y * TILE_SIZE + TILE_SIZE / 2;
      if (sprite) this.tweens.add({ targets: sprite, x: tx, y: ty, duration: 600 });
      if (label) this.tweens.add({ targets: label, x: tx, y: ty - 16, duration: 600 });
    }
  }

  /** First visit to a room counts toward exploration and the trainer card. */
  _recordMapVisit(mapId) {
    const rpg = this.saveAdapter.rpg;
    if (!rpg.mapVisits || typeof rpg.mapVisits !== "object") rpg.mapVisits = {};
    const first = !rpg.mapVisits[mapId];
    rpg.mapVisits[mapId] = (rpg.mapVisits[mapId] ?? 0) + 1;
    if (first) this.saveAdapter.persist();
  }

  /**
   * Walk speed scales with MGM Rewards tier; Platinum+ guests get the comped
   * golf cart, which is the RPG's bicycle.
   */
  _applyWalkSpeed() {
    const rpg = this.saveAdapter.rpg;
    const idx = tierIndex(tierForWagered(this.session.rewards?.lifetimeWagered ?? 0).id);
    if (idx >= GOLF_CART_TIER_IDX && !rpg.flags.comped_golf_cart) {
      rpg.flags.comped_golf_cart = true;
      this.dialogue?.showSystemMessage?.("A host tosses you the keys to a comped golf cart. Hold Shift.");
    }
    const cart = rpg.flags.comped_golf_cart ? GOLF_CART_BONUS : 0;
    this.walkSpeed = TILE_SIZE * 5.5 + idx * SPEED_PER_TIER;
    this.runSpeed = TILE_SIZE * 8.125 + idx * SPEED_PER_TIER * 2 + cart;
  }

  _createZoneSigns(mapId) {
    // Authored rooms carry their own signage; MAP_ZONE_SIGNS only covers the
    // procedural fallback floor.
    const signs = getMapDefinition(mapId).signs ?? MAP_ZONE_SIGNS[mapId];
    if (!signs?.length) return;
    this.zoneSigns = [];
    const fontSize = Math.max(7, Math.round(TILE_SIZE * 0.28));
    for (const sign of signs) {
      const x = sign.x * TILE_SIZE + TILE_SIZE / 2;
      const y = sign.y * TILE_SIZE + TILE_SIZE / 2;
      const bg = this.add.rectangle(x, y, sign.text.length * fontSize * 0.72 + 10, fontSize + 8, 0x0a0812, 0.82);
      bg.setStrokeStyle(2, sign.stroke ?? "#e8c547");
      bg.setDepth(3);
      const text = this.add.text(x, y, sign.text, {
        fontFamily: "Press Start 2P",
        fontSize: `${fontSize}px`,
        color: sign.color ?? "#ffe890",
        stroke: sign.stroke ?? "#684810",
        strokeThickness: 2,
      }).setOrigin(0.5).setDepth(4);
      this.zoneSigns.push(bg, text);
    }
  }

  _createNpcLabel(x, y, displayName, isPit = false) {
    const shortName = isPit ? displayName : displayName.split(" ").slice(-1)[0];
    const fontSize = Math.max(7, Math.round(TILE_SIZE * (isPit ? 0.26 : 0.3)));
    const text = this.add.text(0, 0, shortName, {
      fontFamily: "Press Start 2P",
      fontSize: `${fontSize}px`,
      color: isPit ? "#b8ffd0" : "#ffe890",
      stroke: "#0a0812",
      strokeThickness: 3,
    }).setOrigin(0.5);
    const padX = 8;
    const padY = 4;
    const w = text.width + padX * 2;
    const h = text.height + padY * 2;
    const bg = this.add.rectangle(0, 0, w, h, 0x0a0812, 0.88);
    bg.setStrokeStyle(2, isPit ? 0x30a858 : 0xe8c547);
    const container = this.add.container(x, y, [bg, text]);
    container.setDepth(12);
    return container;
  }

  _applyDayNightTint(worldTime) {
    const phaseId = this.dayPhase?.id
      ?? (worldTime >= 1200 || worldTime < 360 ? 3 : 1);
    const wash = PHASE_WASH[phaseId] ?? PHASE_WASH[1];
    this.cameras.main.setBackgroundColor(wash.bg);
    if (wash.alpha === 0) {
      this._phaseOverlay?.destroy();
      this._phaseOverlay = null;
      return;
    }
    if (!this._phaseOverlay) {
      this._phaseOverlay = this.add.rectangle(
        MAP_WIDTH * TILE_SIZE / 2,
        MAP_HEIGHT * TILE_SIZE / 2,
        MAP_WIDTH * TILE_SIZE,
        MAP_HEIGHT * TILE_SIZE,
        wash.tint,
        wash.alpha,
      ).setDepth(50).setScrollFactor(1);
      return;
    }
    this._phaseOverlay.setFillStyle(wash.tint, wash.alpha);
  }

  _fitCamera() {
    const w = MAP_WIDTH * TILE_SIZE;
    const h = MAP_HEIGHT * TILE_SIZE;
    const scaleX = this.scale.width / w;
    const scaleY = this.scale.height / h;
    const fit = Math.min(scaleX, scaleY);
    const zoom = Phaser.Math.Clamp(fit * 1.55, 1.15, 2.35);
    this.cameras.main.setZoom(zoom);
  }

  _setupTouchInput() {
    this.input.addPointer(2);
    this.input.on("pointerdown", (pointer) => {
      if (!pointer.wasTouch && pointer.button !== 0) return;
      if (!this.canMove || this.dialogue.isActive() || this.encounters.isAnyActive?.()) return;

      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

      if (this.nearbyNpc && this.interactIcon.visible) {
        const ix = this.interactIcon.x;
        const iy = this.interactIcon.y;
        if (Phaser.Math.Distance.Between(world.x, world.y, ix, iy) < TILE_SIZE * 0.9) {
          this._tryInteract();
          return;
        }
      }

      for (const npc of this.currentNpcs ?? []) {
        const nx = npc.x * TILE_SIZE + TILE_SIZE / 2;
        const ny = npc.y * TILE_SIZE + TILE_SIZE / 2;
        const dist = Phaser.Math.Distance.Between(world.x, world.y, nx, ny);
        if (dist < TILE_SIZE * 1.25) {
          this._faceToward(nx, ny);
          if (dist < this._touchInteractRadius && this._isFacingNpc(npc)) {
            this.nearbyNpc = npc;
            this._tryInteract();
            return;
          }
          this.moveTarget = { x: nx, y: ny - TILE_SIZE * 0.35 };
          return;
        }
      }

      this.moveTarget = { x: world.x, y: world.y };
    });
  }

  _faceToward(wx, wy) {
    const dx = wx - this.player.x;
    const dy = wy - this.player.y;
    if (Math.abs(dx) > Math.abs(dy)) this.facing = dx < 0 ? "left" : "right";
    else this.facing = dy < 0 ? "up" : "down";
    this._applyPlayerAnim(false);
  }

  _isKeyDown(key) {
    return Boolean(key?.isDown);
  }

  _readMoveVector() {
    const left = this.moveKeys?.left || this._isKeyDown(this.cursors?.left) || this._isKeyDown(this.keys?.a);
    const right = this.moveKeys?.right || this._isKeyDown(this.cursors?.right) || this._isKeyDown(this.keys?.d);
    const up = this.moveKeys?.up || this._isKeyDown(this.cursors?.up) || this._isKeyDown(this.keys?.w);
    const down = this.moveKeys?.down || this._isKeyDown(this.cursors?.down) || this._isKeyDown(this.keys?.s);
    let x = 0;
    let y = 0;
    if (left) x -= 1;
    if (right) x += 1;
    if (up) y -= 1;
    if (down) y += 1;
    return { x, y };
  }

  _applyPlayerAnim(moving) {
    const appearance = { appearance: this.playerAppearance };
    const key = playerAnimKey(appearance, this.facing, moving);
    if (this.player.anims?.currentAnim?.key === key) return;
    if (this.anims.exists(key)) {
      this.player.anims.play(key, true);
    } else {
      this.player.setTexture(playerTextureKey(appearance, this.facing));
    }
  }

  refreshPlayerAppearance() {
    const rpg = this.saveAdapter.rpg;
    this.playerAppearance = normalizeAppearance(rpg);
    ensurePlayerTextures(this, this.playerAppearance);
    this.player.anims?.stop();
    this._applyPlayerAnim(this._moving);
  }

  update(_time, delta) {
    if (!this.player?.body) return;

    this._prevX = this.player.x;
    this._prevY = this.player.y;

    if (this.playerShadow) {
      this.playerShadow.setPosition(this.player.x, this.player.y + TILE_SIZE * 0.28);
    }

    if (!this.canMove || this.isMenuOpen?.() || this.dialogue.isActive()
        || this.encounters.isAnyActive?.() || this.encounters.blackjack?.isActive()) {
      this.player.body.setVelocity(0, 0);
      if (this._moving) {
        this._moving = false;
        this._applyPlayerAnim(false);
      }
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.esc) || Phaser.Input.Keyboard.JustDown(this.keys.x)) {
      this.onOpenMenu?.();
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.t)) {
      this.onOpenMenu?.("trainer");
      return;
    }

    const run = this.moveKeys?.run || this._isKeyDown(this.keys.shift);
    const speed = run ? (this.runSpeed ?? TILE_SIZE * 8.125) : (this.walkSpeed ?? TILE_SIZE * 5.5);
    let { x: mx, y: my } = this._readMoveVector();

    if (mx === 0 && my === 0 && this.moveTarget) {
      const dx = this.moveTarget.x - this.player.x;
      const dy = this.moveTarget.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < TILE_SIZE * 0.2) {
        this.moveTarget = null;
      } else {
        mx = dx / dist;
        my = dy / dist;
        if (Math.abs(mx) > Math.abs(my)) this.facing = mx < 0 ? "left" : "right";
        else this.facing = my < 0 ? "up" : "down";
      }
    } else if (mx !== 0 || my !== 0) {
      this.moveTarget = null;
    }

    let vx = mx * speed;
    let vy = my * speed;
    // Normalize diagonal so WASD/arrows feel even on diagonals
    if (vx !== 0 && vy !== 0) {
      const inv = Math.SQRT1_2;
      vx *= inv;
      vy *= inv;
    }

    this.player.body.setVelocity(vx, vy);

    const moving = vx !== 0 || vy !== 0;
    if (moving) {
      if (Math.abs(vx) > Math.abs(vy)) this.facing = vx < 0 ? "left" : "right";
      else this.facing = vy < 0 ? "up" : "down";
      this._footTimer += delta;
      if (this._footTimer > 200) {
        this._footTimer = 0;
        if (this.saveAdapter.rpg.options?.footsteps !== false) {
          const tx = Math.floor(this.player.x / TILE_SIZE);
          const ty = Math.floor(this.player.y / TILE_SIZE);
          this.audio?.sfx?.(FOOTSTEP_SFX[this.groundGrid?.[ty]?.[tx]] ?? "foot_carpet");
        }
      }
    }

    if (moving !== this._moving || moving) {
      this._moving = moving;
      this._applyPlayerAnim(moving);
    }

    this._updateNearbyNpc();
    this._checkChallengers();
    this._checkDoorTriggers();
    this._checkZoneTriggers();

    if (Phaser.Input.Keyboard.JustDown(this.keys.e) ||
        Phaser.Input.Keyboard.JustDown(this.keys.enter) ||
        Phaser.Input.Keyboard.JustDown(this.keys.space)) {
      this._tryInteract();
    }

    this._autosavePosition(delta);
  }

  /** True if the player's physics body overlaps any solid tile. */
  _bodyHitsWall() {
    const body = this.player?.body;
    if (!body) return true;
    const x0 = Math.floor(body.x / TILE_SIZE);
    const y0 = Math.floor(body.y / TILE_SIZE);
    const x1 = Math.floor((body.right - 0.01) / TILE_SIZE);
    const y1 = Math.floor((body.bottom - 0.01) / TILE_SIZE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (this._isBlocked(tx, ty)) return true;
      }
    }
    return false;
  }

  /**
   * Post-physics slide collision: keep X or Y from the previous frame so the
   * player can walk past plants/walls instead of freezing when a corner clips.
   */
  _resolveCollision() {
    if (!this.player?.body || !this.canMove) return;
    if (!this._bodyHitsWall()) return;

    const body = this.player.body;
    const prevX = this._prevX ?? this.player.x;
    const prevY = this._prevY ?? this.player.y;
    const newX = this.player.x;
    const newY = this.player.y;

    // Slide on X (new X, old Y)
    this.player.setPosition(newX, prevY);
    if (!this._bodyHitsWall()) {
      body.setVelocity(body.velocity.x, 0);
      return;
    }

    // Slide on Y (old X, new Y)
    this.player.setPosition(prevX, newY);
    if (!this._bodyHitsWall()) {
      body.setVelocity(0, body.velocity.y);
      return;
    }

    // Fully blocked — revert
    this.player.setPosition(prevX, prevY);
    body.setVelocity(0, 0);
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
      if (dist < this._touchInteractRadius && this._isFacingNpc(npc)) {
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
        closest.y * TILE_SIZE - TILE_SIZE * 0.55
      );
    } else {
      this.interactIcon.setVisible(false);
    }
  }

  /**
   * Trainer-battle logic: an NPC with a `sight` cone notices the player
   * walking through it, marches over, and starts its dialogue/encounter.
   * Each challenger fires once per save.
   */
  _checkChallengers() {
    if (this._challengeRunning) return;
    const px = Math.floor(this.player.x / TILE_SIZE);
    const py = Math.floor(this.player.y / TILE_SIZE);
    for (const npc of this.currentNpcs ?? []) {
      if (!npc.sight) continue;
      if (this.saveAdapter.hasFlag(`challenged_${npc.id}`)) continue;
      if (!this._inSightCone(npc, px, py)) continue;
      this._runChallenge(npc);
      return;
    }
  }

  _inSightCone(npc, px, py) {
    const { dir = npc.direction ?? "down", range = 4 } = npc.sight;
    const dx = px - npc.x;
    const dy = py - npc.y;
    const axis = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir] ?? [0, 1];
    const along = dx * axis[0] + dy * axis[1];
    const across = axis[0] === 0 ? dx : dy;
    if (along < 1 || along > range || across !== 0) return false;
    // Walls break line of sight.
    for (let step = 1; step < along; step += 1) {
      if (this._isBlocked(npc.x + axis[0] * step, npc.y + axis[1] * step)) return false;
    }
    return true;
  }

  async _runChallenge(npc) {
    this._challengeRunning = true;
    this.saveAdapter.setFlag(`challenged_${npc.id}`);
    this.canMove = false;
    this.player.body.setVelocity(0, 0);

    const sprite = this.npcSprites.get(npc.id);
    this.audio?.sfx?.("secret");
    const bang = this.add.text(
      npc.x * TILE_SIZE + TILE_SIZE / 2,
      npc.y * TILE_SIZE - 14,
      "!",
      { fontFamily: "Press Start 2P", fontSize: "10px", color: "#f07178", stroke: "#0a0812", strokeThickness: 3 }
    ).setOrigin(0.5).setDepth(120);

    if (sprite) {
      await new Promise((resolve) => {
        this.tweens.add({
          targets: sprite,
          x: this.player.x,
          y: this.player.y + TILE_SIZE,
          duration: 420,
          ease: "Linear",
          onComplete: resolve,
        });
      });
    }
    bang.destroy();

    const dealer = npc.zone ? this._dealerForZone(npc.zone) : null;
    const dialogueId = [npc.challengeDialogueId, dealer && `${dealer.id}_challenge`,
      dealer && `${dealer.id}_greet`, npc.dialogueId]
      .find((id) => id && this.dialogues[id]) ?? npc.dialogueId;

    const result = await this.dialogue.start(dialogueId);
    const encounterId = result.encounter || npc.encounter;
    if (encounterId) {
      await this._runEncounter(encounterId, npc, dealer);
    }
    this._challengeRunning = false;
    this.canMove = true;
    this.onHudUpdate?.();
  }

  /** Called by main.js when the START menu closes. */
  resumeFromMenu() {
    this.canMove = true;
    this._applyWalkSpeed();
    this.onHudUpdate?.();
  }

  _isFacingNpc(npc) {
    const px = this.player.x;
    const py = this.player.y;
    const nx = npc.x * TILE_SIZE + TILE_SIZE / 2;
    const ny = npc.y * TILE_SIZE + TILE_SIZE / 2;
    const dx = nx - px;
    const dy = ny - py;
    switch (this.facing) {
      case "up": return dy < -TILE_SIZE * 0.125 && Math.abs(dx) < TILE_SIZE * 0.625;
      case "down": return dy > TILE_SIZE * 0.125 && Math.abs(dx) < TILE_SIZE * 0.625;
      case "left": return dx < -TILE_SIZE * 0.125 && Math.abs(dy) < TILE_SIZE * 0.625;
      case "right": return dx > TILE_SIZE * 0.125 && Math.abs(dy) < TILE_SIZE * 0.625;
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

  async _checkDoorTriggers() {
    if (this._gateBusy) return;
    const tx = Math.floor(this.player.x / TILE_SIZE);
    const ty = Math.floor(this.player.y / TILE_SIZE);
    const key = `${tx},${ty}`;
    if (this._lastDoorTile === key) return;
    this._lastDoorTile = key;
    const trigger = doorAt(this.currentMapId, tx, ty);
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
    if (trigger.requiresRoomKey && !canAccessHotelRoom(this.session)) {
      const wc = getWorldCycleState(this.session);
      this.dialogue.showSystemMessage(wc.roomEvicted
        ? "The lock blinks red. Settle the folio at the front desk."
        : `Key card declined. ${reservationStatusMessage(this.session)}`,
      { speaker: "Room 24-118", durationMs: 3600 });
      this.audio?.sfx?.("denied");
      return;
    }
    if (trigger.venueGate) {
      // The salon gate can open the stake picker, so hold the player at the
      // rope until the check settles.
      this._gateBusy = true;
      this.canMove = false;
      this.player.body.setVelocity(0, 0);
      let gate = { ok: true };
      try {
        gate = (await this.encounters?.checkVenue?.(trigger.venueGate)) ?? { ok: true };
      } finally {
        this._gateBusy = false;
        this.canMove = true;
      }
      if (!gate.ok) {
        this.dialogue.showSystemMessage(gate.reason ?? "The velvet rope stays closed.");
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
        // _findEgg falls back to a plain flag when the id isn't a registered egg.
        if (t.setFlag) this._findEgg(t.setFlag);
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
        onOpenMenu: this.onOpenMenu,
        isMenuOpen: this.isMenuOpen,
        onMapBanner: this.onMapBanner,
        onEgg: this.onEgg,
      });
    });
  }

  async _tryInteract() {
    if (!this.nearbyNpc) {
      // Nothing to talk to — the confirm key doubles as START, Pokémon-style.
      this.onOpenMenu?.();
      return;
    }
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
      this._findEgg("found_back_room");
    }

    if (npc.id) recordDex(this.session, "staff", npc.id);

    this.canMove = true;
    this.onHudUpdate?.();
  }

  /** Pokémon-style pixel wipe into an encounter, with the BGM ducked. */
  _encounterWipe() {
    const cam = this.cameras.main;
    const cell = 24;
    const cols = Math.ceil((MAP_WIDTH * TILE_SIZE) / cell);
    const rows = Math.ceil((MAP_HEIGHT * TILE_SIZE) / cell);
    const squares = [];
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const rect = this.add.rectangle(
          col * cell + cell / 2, row * cell + cell / 2, cell, cell, 0x0a0812, 1
        ).setDepth(150).setAlpha(0);
        squares.push({ rect, delay: (col + row) * 6 });
      }
    }
    cam.flash(120, 232, 197, 71);
    for (const { rect, delay } of squares) {
      this.tweens.add({ targets: rect, alpha: 1, duration: 90, delay });
    }
    return () => {
      for (const { rect, delay } of squares) {
        this.tweens.add({
          targets: rect,
          alpha: 0,
          duration: 110,
          delay: delay / 2,
          onComplete: () => rect.destroy(),
        });
      }
    };
  }

  async _runEncounter(encounterId, npc, dealerProfile = null) {
    const clearWipe = this._encounterWipe();
    this.canMove = false;
    this.audio?.sfx?.("click");
    this.audio?.duck?.();
    if (dealerProfile?.id) recordDex(this.session, "staff", dealerProfile.id);
    if (npc?.id) recordDex(this.session, "staff", npc.id);

    // The scene keeps ticking (update() no-ops while an encounter is active)
    // so the wipe tweens can play out behind the overlay.
    await this.encounters.start(encounterId, {
      dealerName: npc?.name,
      dealerProfile: dealerProfile ?? null,
    });

    clearWipe();
    this.audio?.unduck?.();
    this.canMove = true;
    this._tickWorldCycle();
    this.questManager?.syncDerived?.();
    this.saveAdapter.persist();
    this.onHudUpdate?.();
  }

  _trackKonami(ev) {
    const code = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    this._konami.push(ev.key);
    if (this._konami.length > code.length) this._konami.shift();
    if (this._konami.join(",") === code.join(",")) {
      this._findEgg("konami_mode");
      this.dialogue.showSystemMessage("Retro palette unlocked. The statue winks.");
      document.getElementById("game-shell")?.classList.add("konami-mode");
      this._konami = [];
    }
  }

  /**
   * Record an easter egg by registry id (or by legacy flag name), so the
   * Secrets page and the overworld agree on what has been found.
   */
  _findEgg(idOrFlag) {
    const egg = EGG_REGISTRY[idOrFlag] ? { id: idOrFlag } : eggForFlag(idOrFlag);
    if (!egg) {
      this.saveAdapter.setFlag(idOrFlag);
      return null;
    }
    const found = discoverEgg(this.session, egg.id);
    this.saveAdapter.setFlag(EGG_REGISTRY[egg.id]?.flag ?? egg.id);
    if (found) {
      this.audio?.sfx?.("secret");
      this.onEgg?.(egg.id);
    }
    return found;
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
