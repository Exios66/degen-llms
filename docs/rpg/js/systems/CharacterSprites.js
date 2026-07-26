/**
 * Character sprites — Fry hero (player) + Jephed staff/dealer sheets.
 * See docs/rpg/assets/characters/ATTRIBUTION.md.
 */
import {
  appearanceTextureBase,
  normalizeAppearance,
  SPEAKER_PORTRAITS,
} from "./CharacterAppearance.js";

const ASSET_ROOT = new URL("../../assets/characters/", import.meta.url);

/** @type {Map<string, HTMLImageElement>} */
const portraitImages = new Map();

const HERO = {
  key: "char_hero",
  file: "player_full_animation.png",
  frameWidth: 40,
  frameHeight: 64,
  columns: 6,
  scale: 0.75,
  originY: 0.82,
  rows: { walkDown: 0, walkRight: 1, walkUp: 2, idle: 3 },
  // Full walk cycle from the sheet; left uses walkRight + flipX
  walkCols: [0, 1, 2, 3, 4, 5],
  // Sheet idle row: col0=down, col1=right, col2=up
  idleCols: { down: 0, up: 2, right: 1 },
};

/** Jephed top-down staff sheets: 20×32 frames, 3×4 (down/left/right/up × walk/idle/walk). */
const STAFF = {
  frameWidth: 20,
  frameHeight: 32,
  columns: 3,
  rows: 4,
  scale: 1.5,
  originY: 0.88,
  // row: 0 down, 1 left, 2 right, 3 up
  rowForDir: { down: 0, left: 1, right: 2, up: 3 },
  idleCol: 1,
  walkCols: [0, 1, 2],
};

const OUTFIT_TINT = {
  teal: 0xb8f0ff,
  gold: 0xffe8a0,
  purple: 0xddbbff,
  green: 0xb8ffcc,
  crimson: 0xffb8b8,
  navy: 0xb8c8ff,
  coral: 0xffd0a0,
};

/** Unique staff/dealer sheets under assets/characters/staff/. */
const STAFF_SHEETS = [
  "npc_gold",
  "npc_orange",
  "npc_pink",
  "npc_red",
  "npc_silver",
  "npc_teal",
  "npc_green",
  "dealer_steve",
  "dealer_meryl",
  "dealer_judi",
  "dealer_jennifer",
  "dealer_sofia",
  "dealer_octavia",
  "dealer_nicole",
];

function staffKey(id) {
  return `char_${id}`;
}

/** NPC sprite config — each key maps to a unique sheet (no tinted hero clones). */
export const NPC_SPRITE_CONFIG = Object.fromEntries(
  STAFF_SHEETS.map((id) => [id, { base: "staff", sheet: id, tint: 0xffffff }])
);

export function resolvePlayerSprite(appearance) {
  const a = normalizeAppearance({ appearance });
  return {
    base: "hero",
    tint: OUTFIT_TINT[a.outfit] ?? 0xffffff,
    prefix: appearanceTextureBase(a),
  };
}

export function resolveNpcSprite(npcKey) {
  return NPC_SPRITE_CONFIG[npcKey] ?? NPC_SPRITE_CONFIG.npc_gold;
}

export function resolveSpeakerSprite(speaker) {
  const key = SPEAKER_PORTRAITS[speaker] ?? "npc_gold";
  return resolveNpcSprite(key);
}

function assetUrl(file) {
  return new URL(file, ASSET_ROOT).href;
}

function heroFrameIndex(row, col) {
  return row * HERO.columns + col;
}

function staffFrameIndex(row, col) {
  return row * STAFF.columns + col;
}

function getHeroFrameRect(dir, frame = 0, moving = false) {
  if (!moving) {
    const col = HERO.idleCols[dir === "left" ? "right" : dir] ?? 0;
    return {
      x: col * HERO.frameWidth,
      y: HERO.rows.idle * HERO.frameHeight,
      w: HERO.frameWidth,
      h: HERO.frameHeight,
    };
  }
  const rowKey = dir === "down" ? "walkDown" : dir === "up" ? "walkUp" : "walkRight";
  const col = HERO.walkCols[frame % HERO.walkCols.length];
  return {
    x: col * HERO.frameWidth,
    y: HERO.rows[rowKey] * HERO.frameHeight,
    w: HERO.frameWidth,
    h: HERO.frameHeight,
  };
}

function getStaffFrameRect(dir, frame = 0, moving = false) {
  const facing = dir === "left" || dir === "right" || dir === "up" || dir === "down" ? dir : "down";
  const row = STAFF.rowForDir[facing] ?? 0;
  const col = moving ? STAFF.walkCols[frame % STAFF.walkCols.length] : STAFF.idleCol;
  return {
    x: col * STAFF.frameWidth,
    y: row * STAFF.frameHeight,
    w: STAFF.frameWidth,
    h: STAFF.frameHeight,
  };
}

export function preloadCharacterAssets(scene) {
  scene.load.spritesheet(HERO.key, assetUrl(HERO.file), {
    frameWidth: HERO.frameWidth,
    frameHeight: HERO.frameHeight,
  });

  for (const id of STAFF_SHEETS) {
    scene.load.spritesheet(staffKey(id), assetUrl(`staff/${id}.png`), {
      frameWidth: STAFF.frameWidth,
      frameHeight: STAFF.frameHeight,
    });
  }
}

function rememberPortraitImage(key, scene) {
  const tex = scene.textures.get(key);
  const img = tex.getSourceImage();
  if (img) portraitImages.set(key, img);
}

export function cachePortraitImages(scene) {
  rememberPortraitImage(HERO.key, scene);
  for (const id of STAFF_SHEETS) {
    rememberPortraitImage(staffKey(id), scene);
  }
}

function createHeroAnims(scene, prefix) {
  if (scene.anims.exists(`${prefix}_walk_down`)) return;

  for (const dir of ["down", "up", "right"]) {
    const rowKey = dir === "down" ? "walkDown" : dir === "up" ? "walkUp" : "walkRight";
    const row = HERO.rows[rowKey];
    const walkFrames = HERO.walkCols.map((col) => ({
      key: HERO.key,
      frame: heroFrameIndex(row, col),
    }));
    scene.anims.create({
      key: `${prefix}_walk_${dir}`,
      frames: walkFrames,
      frameRate: 10,
      repeat: -1,
    });

    const idleCol = HERO.idleCols[dir];
    scene.anims.create({
      key: `${prefix}_idle_${dir}`,
      frames: [{ key: HERO.key, frame: heroFrameIndex(HERO.rows.idle, idleCol) }],
      frameRate: 1,
      repeat: 0,
    });
  }
}

function createStaffAnims(scene, prefix, sheetId) {
  if (scene.anims.exists(`${prefix}_walk_down`)) return;
  const key = staffKey(sheetId);

  for (const dir of ["down", "up", "left", "right"]) {
    const row = STAFF.rowForDir[dir];
    const walkFrames = STAFF.walkCols.map((col) => ({
      key,
      frame: staffFrameIndex(row, col),
    }));
    scene.anims.create({
      key: `${prefix}_walk_${dir}`,
      frames: walkFrames,
      frameRate: 8,
      repeat: -1,
    });
    scene.anims.create({
      key: `${prefix}_idle_${dir}`,
      frames: [{ key, frame: staffFrameIndex(row, STAFF.idleCol) }],
      frameRate: 1,
      repeat: 0,
    });
  }
}

function ensureAnims(scene, prefix, spec) {
  if (spec.base === "staff") createStaffAnims(scene, prefix, spec.sheet);
  else createHeroAnims(scene, prefix);
}

export function applySpriteAppearance(sprite, spec) {
  const base = spec.base ?? "hero";
  const scale = base === "staff" ? STAFF.scale : HERO.scale;
  const originY = base === "staff" ? STAFF.originY : HERO.originY;
  sprite.setScale(scale);
  sprite.setOrigin(0.5, originY);
  if (spec.tint && spec.tint !== 0xffffff) sprite.setTint(spec.tint);
  else sprite.clearTint();
}

export function ensurePlayerTextures(scene, appearance) {
  const spec = resolvePlayerSprite(appearance);
  ensureAnims(scene, spec.prefix, spec);
  return spec.prefix;
}

/**
 * @param {Phaser.Scene} scene
 * @param {Phaser.GameObjects.Sprite} sprite
 * @param {string} npcTextureKey
 * @param {string} [facing]
 */
export function setupNpcSprite(scene, sprite, npcTextureKey, facing = "down") {
  const spec = resolveNpcSprite(npcTextureKey);
  const prefix = npcTextureKey;
  ensureAnims(scene, prefix, spec);

  const dir = ["down", "up", "left", "right"].includes(facing) ? facing : "down";
  if (spec.base === "staff") {
    const key = staffKey(spec.sheet);
    const row = STAFF.rowForDir[dir] ?? 0;
    sprite.setTexture(key, staffFrameIndex(row, STAFF.idleCol));
    sprite.setFlipX(false);
  } else {
    sprite.setTexture(HERO.key, heroFrameIndex(HERO.rows.idle, HERO.idleCols.down));
    sprite.setFlipX(dir === "left");
  }
  applySpriteAppearance(sprite, spec);

  const idleKey = `${prefix}_idle_${dir === "left" && spec.base !== "staff" ? "right" : dir}`;
  if (scene.anims.exists(idleKey)) {
    sprite.anims.play(idleKey, true);
  }
}

export function playerTextureKey(rpgOrArchetype, facing = "down") {
  const spec = resolvePlayerSprite(
    rpgOrArchetype && typeof rpgOrArchetype === "object"
      ? rpgOrArchetype
      : { archetype: rpgOrArchetype ?? "weekend_warrior" }
  );
  const dir = facing === "left" ? "right" : facing;
  return {
    key: HERO.key,
    frame: heroFrameIndex(HERO.rows.idle, HERO.idleCols[dir] ?? 0),
    flipX: facing === "left",
  };
}

export function playerAnimKey(rpgOrArchetype, facing, moving) {
  const spec = resolvePlayerSprite(
    rpgOrArchetype && typeof rpgOrArchetype === "object"
      ? rpgOrArchetype
      : { archetype: rpgOrArchetype ?? "weekend_warrior" }
  );
  // Hero sheet has no left column — remap + flip in the scene
  const dir = facing === "left" ? "right" : facing;
  const kind = moving ? "walk" : "idle";
  return `${spec.prefix}_${kind}_${dir}`;
}

/** Draw a sprite frame to an HTML canvas (portraits / wardrobe preview). */
export function drawCharacterToCanvas(canvas, spec, dir = "down", frame = 0, pixelScale = 3) {
  const ctx = canvas.getContext("2d");
  const base = spec.base ?? "hero";
  let img;
  let rect;
  let flip = false;

  if (base === "staff") {
    const sheetId = spec.sheet ?? "npc_gold";
    img = portraitImages.get(staffKey(sheetId));
    const facing = ["down", "up", "left", "right"].includes(dir) ? dir : "down";
    rect = getStaffFrameRect(facing, frame, frame > 0);
  } else {
    img = portraitImages.get(HERO.key);
    const facing = dir === "left" ? "right" : dir;
    rect = getHeroFrameRect(facing, frame, frame > 0);
    flip = dir === "left";
  }

  if (!img || !rect) return;

  canvas.width = rect.w * pixelScale;
  canvas.height = rect.h * pixelScale;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (flip) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w * pixelScale, rect.h * pixelScale);

  if (spec.tint && spec.tint !== 0xffffff) {
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = `#${spec.tint.toString(16).padStart(6, "0")}`;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
}

// Warm portrait cache for HTML overlays (creator / dialogue before Phaser boots).
function bootPortraitCache() {
  if (typeof Image === "undefined") return;
  try {
    const img = new Image();
    img.src = assetUrl(HERO.file);
    portraitImages.set(HERO.key, img);
    for (const id of STAFF_SHEETS) {
      const staffImg = new Image();
      staffImg.src = assetUrl(`staff/${id}.png`);
      portraitImages.set(staffKey(id), staffImg);
    }
  } catch (err) {
    console.warn("Character portrait cache warm-up failed", err);
  }
}
bootPortraitCache();
