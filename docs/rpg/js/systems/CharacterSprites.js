/**
 * CC0 top-down character sprites — Fry hero + Danilo Mattos Sora.
 * Replaces procedural chibi sprites with production pixel-art sheets.
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
  walkCols: [0, 2, 4],
  idleCols: { down: 0, up: 1, right: 3 },
};

const SORA_SHEETS = {
  walkDown: { key: "char_sora_walk_down", file: "sora/IdleDownWalking.png", frames: 4 },
  walkUp: { key: "char_sora_walk_up", file: "sora/IdleUpWalking.png", frames: 4 },
  walkRight: { key: "char_sora_walk_right", file: "sora/Walking_Right.png", frames: 4 },
  idleDown: { key: "char_sora_idle_down", file: "sora/IdleDown.png", frames: 2 },
  idleUp: { key: "char_sora_idle_up", file: "sora/IdleUp.png", frames: 2 },
  idleRight: { key: "char_sora_idle_right", file: "sora/IdleLeft.png", frames: 8 },
};

const SORA_FRAME = 64;
const SORA_SCALE = 0.5;
const SORA_ORIGIN_Y = 0.85;

const OUTFIT_TINT = {
  teal: 0xb8f0ff,
  gold: 0xffe8a0,
  purple: 0xddbbff,
  green: 0xb8ffcc,
  crimson: 0xffb8b8,
  navy: 0xb8c8ff,
  coral: 0xffd0a0,
};

/** NPC sprite bases — hero (Fry) or sora with optional tint. */
export const NPC_SPRITE_CONFIG = {
  npc_gold: { base: "hero", tint: 0xfff0b0 },
  npc_orange: { base: "hero", tint: 0xffcc88 },
  npc_pink: { base: "hero", tint: 0xffb8e8 },
  npc_red: { base: "hero", tint: 0xff9999 },
  npc_silver: { base: "hero", tint: 0xd0d8e8 },
  npc_teal: { base: "sora", tint: 0xffffff },
  npc_green: { base: "sora", tint: 0x98ffcc },
};

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

function getSoraSheetKey(dir, moving) {
  if (!moving) {
    if (dir === "down") return SORA_SHEETS.idleDown.key;
    if (dir === "up") return SORA_SHEETS.idleUp.key;
    return SORA_SHEETS.idleRight.key;
  }
  if (dir === "down") return SORA_SHEETS.walkDown.key;
  if (dir === "up") return SORA_SHEETS.walkUp.key;
  return SORA_SHEETS.walkRight.key;
}

function getSoraFrameIndex(dir, frame, moving) {
  if (!moving) {
    if (dir === "right" || dir === "left") return 0;
    return 0;
  }
  return frame % 4;
}

export function preloadCharacterAssets(scene) {
  scene.load.spritesheet(HERO.key, assetUrl(HERO.file), {
    frameWidth: HERO.frameWidth,
    frameHeight: HERO.frameHeight,
  });

  for (const sheet of Object.values(SORA_SHEETS)) {
    scene.load.spritesheet(sheet.key, assetUrl(sheet.file), {
      frameWidth: SORA_FRAME,
      frameHeight: SORA_FRAME,
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
  for (const sheet of Object.values(SORA_SHEETS)) {
    rememberPortraitImage(sheet.key, scene);
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

function createSoraAnims(scene, prefix) {
  if (scene.anims.exists(`${prefix}_walk_down`)) return;

  const dirs = [
    { dir: "down", walk: SORA_SHEETS.walkDown, idle: SORA_SHEETS.idleDown },
    { dir: "up", walk: SORA_SHEETS.walkUp, idle: SORA_SHEETS.idleUp },
    { dir: "right", walk: SORA_SHEETS.walkRight, idle: SORA_SHEETS.idleRight },
  ];

  for (const { dir, walk, idle } of dirs) {
    scene.anims.create({
      key: `${prefix}_walk_${dir}`,
      frames: scene.anims.generateFrameNumbers(walk.key, { start: 0, end: walk.frames - 1 }),
      frameRate: 10,
      repeat: -1,
    });
    scene.anims.create({
      key: `${prefix}_idle_${dir}`,
      frames: [{ key: idle.key, frame: 0 }],
      frameRate: 1,
      repeat: 0,
    });
  }
}

function ensureAnims(scene, prefix, base) {
  if (base === "sora") createSoraAnims(scene, prefix);
  else createHeroAnims(scene, prefix);
}

export function applySpriteAppearance(sprite, spec) {
  const base = spec.base ?? "hero";
  const scale = base === "sora" ? SORA_SCALE : HERO.scale;
  const originY = base === "sora" ? SORA_ORIGIN_Y : HERO.originY;
  sprite.setScale(scale);
  sprite.setOrigin(0.5, originY);
  if (spec.tint && spec.tint !== 0xffffff) sprite.setTint(spec.tint);
  else sprite.clearTint();
}

export function ensurePlayerTextures(scene, appearance) {
  const spec = resolvePlayerSprite(appearance);
  ensureAnims(scene, spec.prefix, spec.base);
  return spec.prefix;
}

export function setupNpcSprite(scene, sprite, npcTextureKey) {
  const spec = resolveNpcSprite(npcTextureKey);
  const prefix = npcTextureKey;
  ensureAnims(scene, prefix, spec.base);

  const sheetKey = spec.base === "sora" ? SORA_SHEETS.idleDown.key : HERO.key;
  const frame = spec.base === "sora" ? 0 : heroFrameIndex(HERO.rows.idle, HERO.idleCols.down);
  sprite.setTexture(sheetKey, frame);
  applySpriteAppearance(sprite, spec);
}

export function playerTextureKey(rpgOrArchetype, facing = "down") {
  const spec = resolvePlayerSprite(
    rpgOrArchetype && typeof rpgOrArchetype === "object"
      ? rpgOrArchetype
      : { archetype: rpgOrArchetype ?? "weekend_warrior" }
  );
  const dir = facing === "left" ? "right" : facing;
  const rowKey = dir === "down" ? "walkDown" : dir === "up" ? "walkUp" : "walkRight";
  if (spec.base === "sora") {
    const idleKey = dir === "down" ? SORA_SHEETS.idleDown.key : dir === "up" ? SORA_SHEETS.idleUp.key : SORA_SHEETS.idleRight.key;
    return { key: idleKey, frame: 0, flipX: facing === "left" };
  }
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
  const dir = facing === "left" ? "right" : facing;
  const kind = moving ? "walk" : "idle";
  return `${spec.prefix}_${kind}_${dir}`;
}

/** Draw a sprite frame to an HTML canvas (portraits / wardrobe preview). */
export function drawCharacterToCanvas(canvas, spec, dir = "down", frame = 0, pixelScale = 3) {
  const ctx = canvas.getContext("2d");
  const base = spec.base ?? "hero";
  const facing = dir === "left" ? "right" : dir;
  let img;
  let rect;

  if (base === "sora") {
    const sheetKey = getSoraSheetKey(facing, frame > 0);
    img = portraitImages.get(sheetKey);
    const fw = SORA_FRAME;
    const fh = SORA_FRAME;
    const idx = getSoraFrameIndex(facing, frame, frame > 0);
    rect = { x: idx * fw, y: 0, w: fw, h: fh };
  } else {
    img = portraitImages.get(HERO.key);
    rect = getHeroFrameRect(facing, frame, frame > 0);
  }

  if (!img || !rect) return;

  canvas.width = rect.w * pixelScale;
  canvas.height = rect.h * pixelScale;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (dir === "left") {
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
  const img = new Image();
  img.src = assetUrl(HERO.file);
  portraitImages.set(HERO.key, img);
  for (const sheet of Object.values(SORA_SHEETS)) {
    const soraImg = new Image();
    soraImg.src = assetUrl(sheet.file);
    portraitImages.set(sheet.key, soraImg);
  }
}
bootPortraitCache();
