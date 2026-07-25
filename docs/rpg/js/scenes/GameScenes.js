import Phaser from "phaser";
import {
  createGameTextures,
  ensurePlayerTextures,
  playerTextureKey,
  playerAnimKey,
  preloadCharacterAssets,
  cachePortraitImages,
  setupNpcSprite,
  applySpriteAppearance,
  resolvePlayerSprite,
} from "../systems/TextureFactory.js";
import { normalizeAppearance } from "../systems/CharacterAppearance.js";
import {
  TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, buildMapLayersForId, getNpcsForMap,
  DOOR_TRIGGERS, getMapDefinition, SPAWN_DEFAULT, TILE, resolveNpcPosition,
  MAP_ZONE_SIGNS,
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

  preload() {
    preloadCharacterAssets(this);
  }

  create() {
    cachePortraitImages(this);
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
          const d = decor[y][x];
          let decorKey = "decor_plant";
          if (d === TILE.BAR) decorKey = "decor_bar";
          else if (d === TILE.SLOT) decorKey = "decor_slot";
          else if (d === TILE.SCREEN) decorKey = "decor_screen";
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
    const playerSpec = resolvePlayerSprite(this.playerAppearance);
    const pTex = playerTextureKey({ appearance: this.playerAppearance }, "down");
    this.player = this.physics.add.sprite(
      px * TILE_SIZE + TILE_SIZE / 2,
      py * TILE_SIZE + TILE_SIZE / 2,
      pTex.key,
      pTex.frame
    );
    applySpriteAppearance(this.player, playerSpec);
    this.player.setFlipX(pTex.flipX);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.player.body.setSize(TILE_SIZE * 0.45, TILE_SIZE * 0.3);
    this.player.body.setOffset(TILE_SIZE * 0.275, TILE_SIZE * 0.58);

    this.playerShadow = this.add.image(this.player.x, this.player.y + TILE_SIZE * 0.28, "shadow");
    this.playerShadow.setDepth(9);
    this.playerShadow.setAlpha(0.35);

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
        "char_hero",
        0
      );
      setupNpcSprite(this, sprite, npc.sprite);
      sprite.setDepth(10);
      sprite.setData("npc", npc);
      this.npcSprites.set(npc.id, sprite);

      const displayName = this._resolveNpcDisplayName(npc);
      const label = this._createNpcLabel(sprite.x, sprite.y - TILE_SIZE * 0.72, displayName, npc.zone);
      this.npcLabels.set(npc.id, label);

      if (npc.zone) {
        const dealer = this._dealerForZone(npc.zone);
        setupNpcSprite(this, sprite, dealer.sprite);
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

  _createZoneSigns(mapId) {
    const signs = MAP_ZONE_SIGNS[mapId];
    if (!signs?.length) return;
    this.zoneSigns = [];
    const fontSize = Math.max(7, Math.round(TILE_SIZE * 0.28));
    for (const sign of signs) {
      const x = sign.x * TILE_SIZE + TILE_SIZE / 2;
      const y = sign.y * TILE_SIZE + TILE_SIZE / 2;
      const padW = sign.text.length * fontSize * 0.72 + 14;
      const padH = fontSize + 10;
      const glow = this.add.rectangle(x, y, padW + 4, padH + 4, 0xe8c547, 0.12);
      glow.setDepth(2);
      const bg = this.add.rectangle(x, y, padW, padH, 0x0a0812, 0.9);
      bg.setStrokeStyle(2, sign.stroke ?? 0xe8c547);
      bg.setDepth(3);
      const inner = this.add.rectangle(x, y, padW - 4, padH - 4, 0x14101f, 0.55);
      inner.setStrokeStyle(1, 0x684810);
      inner.setDepth(3);
      const text = this.add.text(x, y, sign.text, {
        fontFamily: "Press Start 2P",
        fontSize: `${fontSize}px`,
        color: sign.color ?? "#ffe890",
        stroke: sign.stroke ?? "#684810",
        strokeThickness: 2,
      }).setOrigin(0.5).setDepth(4);
      this.zoneSigns.push(glow, bg, inner, text);
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
          0.18
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
    this.player.setFlipX(this.facing === "left");
    const key = playerAnimKey(appearance, this.facing, moving);
    if (this.player.anims?.currentAnim?.key === key) return;
    if (this.anims.exists(key)) {
      this.player.anims.play(key, true);
    } else {
      const tex = playerTextureKey(appearance, this.facing);
      this.player.setTexture(tex.key, tex.frame);
      this.player.setFlipX(tex.flipX);
    }
  }

  refreshPlayerAppearance() {
    const rpg = this.saveAdapter.rpg;
    this.playerAppearance = normalizeAppearance(rpg);
    ensurePlayerTextures(this, this.playerAppearance);
    applySpriteAppearance(this.player, resolvePlayerSprite(this.playerAppearance));
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

    if (!this.canMove || this.dialogue.isActive() || this.encounters.isAnyActive?.() || this.encounters.blackjack?.isActive()) {
      this.player.body.setVelocity(0, 0);
      if (this._moving) {
        this._moving = false;
        this._applyPlayerAnim(false);
      }
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.t)) {
      this.onHudUpdate?.({ trainerCard: true });
    }

    const run = this.moveKeys?.run || this._isKeyDown(this.keys.shift);
    const speed = run ? TILE_SIZE * 8.125 : TILE_SIZE * 5.5;
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
        const tx = Math.floor(this.player.x / TILE_SIZE);
        const ty = Math.floor(this.player.y / TILE_SIZE);
        const tile = this.groundGrid?.[ty]?.[tx];
        this.audio?.sfx?.(tile === TILE.LOBBY ? "foot_lobby" : "foot_carpet");
        this._advanceWorldTime(1);
      }
    }

    if (moving !== this._moving || moving) {
      this._moving = moving;
      this._applyPlayerAnim(moving);
    }

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
