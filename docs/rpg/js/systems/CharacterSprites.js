/**
 * Character sprites, built by repainting the vendored Jephed sheets.
 *
 * The pack ships fourteen hand-drawn characters (see
 * docs/rpg/assets/characters/ATTRIBUTION.md). Rather than tint them — which
 * drags skin, hair and clothing toward one colour and ruins the shading — each
 * sheet's palette is sorted into skin / hair / outfit / legwear ramps by
 * `scripts/_author_sprites.py`, and a repaint maps those ramps onto the ones a
 * look asks for. Relative luminance is preserved, so a recoloured character
 * keeps every highlight and shadow the artist drew.
 *
 * Textures are baked at the world's 2× art scale, matching the tiles, so
 * sprites render at scale 1 and collision boxes stay in plain world pixels.
 */
import { CHARACTER_SHEETS } from "../data/character-sheets.js";
import { ART_UNIT, TILE_SIZE } from "./MapTiles.js";
import { normalizeAppearance, resolvePalette } from "./CharacterAppearance.js";
import { drawArtToCanvas } from "./TextureFactory.js";

const ASSET_ROOT = new URL("../../assets/characters/", import.meta.url);
const SHEETS = CHARACTER_SHEETS.sheets;
const FRAME = CHARACTER_SHEETS.frame;
const ROW_FOR_DIR = CHARACTER_SHEETS.rowForDir;
const WALK_COLS = CHARACTER_SHEETS.walkCols;
const IDLE_COL = CHARACTER_SHEETS.idleCol;
const DIRS = ["down", "left", "right", "up"];

/** Art is drawn at 16px to the tile and displayed at 32, same as the ground. */
const SCALE = TILE_SIZE / ART_UNIT;

/** Out and back through the three walk columns reads as a full step cycle. */
const WALK_SEQUENCE = [WALK_COLS[0], WALK_COLS[1], WALK_COLS[2], WALK_COLS[1]];

/**
 * Where a character's shoes sit inside a frame, in art units.
 *
 * The scene uses this for the collision body so the box hugs the feet rather
 * than the whole two-tile-tall sprite, and to work out how far above a tile
 * centre the sprite's own centre belongs.
 */
export const CHAR_METRICS = {
  width: FRAME.w,
  height: FRAME.h,
  scale: SCALE,
  feet: { x: 6, y: 28, w: 8, h: 4 },
};

/** Sprite-centre offset that puts a character's feet on a tile centre, in px. */
export const FOOT_DROP =
  (CHAR_METRICS.feet.y + CHAR_METRICS.feet.h / 2 - FRAME.h / 2) * SCALE;

const TEX_FRAME_W = FRAME.w * SCALE;
const TEX_FRAME_H = FRAME.h * SCALE;

// ---------------------------------------------------------------------------
// Palette mapping

const hexToRgb = (hex) => {
  const n = parseInt(String(hex).replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const luminance = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;

const packRgb = ([r, g, b]) => (r << 16) | (g << 8) | b;

/**
 * Where each colour of a ramp sits on a 0…1 scale from its lightest stop to its
 * darkest, by luminance rather than by position in the list.
 */
function rampPositions(rgbs) {
  const lums = rgbs.map(luminance);
  const hi = Math.max(...lums);
  const span = hi - Math.min(...lums) || 1;
  return lums.map((l) => (hi - l) / span);
}

/**
 * A function that reads a colour off a ramp at `t` in 0…1, lightest to darkest.
 *
 * Stops are placed at their own relative luminance rather than spread evenly,
 * which is what makes a repaint reversible: feed a sheet its own ramp back and
 * every pixel lands on the colour it started as. Ranking the stops instead
 * moved colours that happened to sit close together in the original art, and a
 * face is mostly colours that sit close together.
 */
function rampSampler(stops) {
  const sorted = [...stops].sort((a, b) => luminance(b) - luminance(a));
  if (sorted.length === 1) return () => sorted[0];
  const pos = rampPositions(sorted);
  return (t) => {
    const x = Math.min(Math.max(t, 0), 1);
    let i = 0;
    while (i < pos.length - 2 && x > pos[i + 1]) i += 1;
    const span = pos[i + 1] - pos[i];
    const f = span <= 0 ? 0 : Math.min(Math.max((x - pos[i]) / span, 0), 1);
    const a = sorted[i];
    const b = sorted[i + 1];
    return [
      Math.round(a[0] + (b[0] - a[0]) * f),
      Math.round(a[1] + (b[1] - a[1]) * f),
      Math.round(a[2] + (b[2] - a[2]) * f),
    ];
  };
}

/**
 * Build the source-colour → target-colour table for one look.
 *
 * Each region's source colours are read off the target ramp at their own
 * relative luminance, so a five-stop skin ramp can drive a sheet that uses
 * seven and the shading the artist drew survives the trip.
 */
export function buildColorMap(sheetId, look) {
  const spec = SHEETS[sheetId];
  const map = new Map();
  if (!spec) return map;

  for (const region of ["skin", "hair", "outfit", "legs"]) {
    const target = look?.[region];
    const source = spec[region];
    if (!target?.length || !source?.length) continue;

    const sample = rampSampler(target.map(hexToRgb));
    const rgbs = source.map(hexToRgb);
    const pos = rampPositions(rgbs);
    rgbs.forEach((rgb, i) => map.set(packRgb(rgb), sample(pos[i])));
  }
  return map;
}

// ---------------------------------------------------------------------------
// Source art

/** @type {Map<string, HTMLImageElement>} */
const sourceImages = new Map();
/** @type {Promise<void> | null} */
let artPromise = null;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

/** Fetch every base sheet once. Safe to await repeatedly. */
export function preloadCharacterArt() {
  if (artPromise) return artPromise;
  if (typeof Image === "undefined") return Promise.resolve();
  artPromise = Promise.all(
    Object.entries(SHEETS).map(async ([id, spec]) => {
      try {
        sourceImages.set(id, await loadImage(new URL(spec.file, ASSET_ROOT).href));
      } catch (err) {
        console.warn(`Character sheet ${id} failed to load`, err);
      }
    })
  ).then(() => undefined);
  return artPromise;
}
preloadCharacterArt();

// ---------------------------------------------------------------------------
// Recoloured canvases

/** @type {Map<string, HTMLCanvasElement>} */
const bakedCanvases = new Map();

export function lookKey(look) {
  const sheet = look?.sheet ?? "gold";
  const part = (region) => (look?.[region] ?? []).join("");
  return `char_${sheet}_${part("skin")}_${part("hair")}_${part("outfit")}_${part("legs")}`;
}

/**
 * Draw a look onto an offscreen canvas at display scale.
 *
 * Returns null until the base sheet has loaded, so callers that run before the
 * art is ready can redraw once `preloadCharacterArt()` settles.
 */
function bakeLook(look) {
  const key = lookKey(look);
  const cached = bakedCanvases.get(key);
  if (cached) return cached;

  const sheetId = look?.sheet ?? "gold";
  const img = sourceImages.get(sheetId) ?? sourceImages.get("gold");
  if (!img?.width) return null;

  const canvas = document.createElement("canvas");
  canvas.width = img.width * SCALE;
  canvas.height = img.height * SCALE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;

  // Recolour at source resolution, then blow up with nearest-neighbour so the
  // pixel grid stays exact.
  const work = document.createElement("canvas");
  work.width = img.width;
  work.height = img.height;
  const wctx = work.getContext("2d", { willReadFrequently: true });
  wctx.imageSmoothingEnabled = false;
  wctx.drawImage(img, 0, 0);

  const colorMap = buildColorMap(sheetId, look);
  if (colorMap.size) {
    const data = wctx.getImageData(0, 0, work.width, work.height);
    const px = data.data;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] === 0) continue;
      const swap = colorMap.get((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]);
      if (!swap) continue;
      px[i] = swap[0];
      px[i + 1] = swap[1];
      px[i + 2] = swap[2];
    }
    wctx.putImageData(data, 0, 0);
  }

  ctx.drawImage(work, 0, 0, canvas.width, canvas.height);
  bakedCanvases.set(key, canvas);
  return canvas;
}

// ---------------------------------------------------------------------------
// Phaser textures and animations

export const frameIndex = (dir, col) => (ROW_FOR_DIR[dir] ?? 0) * FRAME.cols + col;

/** Register a look with the texture manager, returning its texture key. */
export function ensureLookTexture(scene, look) {
  const key = lookKey(look);
  if (scene.textures.exists(key)) return key;
  const canvas = bakeLook(look);
  if (!canvas) return null;
  scene.textures.addSpriteSheet(key, canvas, {
    frameWidth: TEX_FRAME_W,
    frameHeight: TEX_FRAME_H,
  });
  return key;
}

/** Create the four-direction walk and idle animations for a texture. */
export function ensureLookAnims(scene, key) {
  if (!key) return;
  for (const dir of DIRS) {
    const walk = `${key}_walk_${dir}`;
    if (!scene.anims.exists(walk)) {
      scene.anims.create({
        key: walk,
        frames: WALK_SEQUENCE.map((col) => ({ key, frame: frameIndex(dir, col) })),
        frameRate: 8,
        repeat: -1,
      });
    }
    const idle = `${key}_idle_${dir}`;
    if (!scene.anims.exists(idle)) {
      scene.anims.create({
        key: idle,
        frames: [{ key, frame: frameIndex(dir, IDLE_COL) }],
        frameRate: 1,
        repeat: 0,
      });
    }
  }
}

/** Register a look's texture and animations in one call. */
export function ensureLook(scene, look) {
  const key = ensureLookTexture(scene, look);
  ensureLookAnims(scene, key);
  return key;
}

export function ensurePlayerTextures(scene, appearance) {
  return ensureLook(scene, resolvePalette(normalizeAppearance({ appearance })));
}

const lookFor = (rpgOrLook) =>
  Array.isArray(rpgOrLook?.skin) || rpgOrLook?.sheet
    ? rpgOrLook
    : resolvePalette(normalizeAppearance(rpgOrLook));

export function playerTextureKey(rpgOrLook, facing = "down") {
  const key = lookKey(lookFor(rpgOrLook));
  return { key, frame: frameIndex(facing, IDLE_COL) };
}

export function playerAnimKey(rpgOrLook, facing = "down", moving = false) {
  const dir = DIRS.includes(facing) ? facing : "down";
  return `${lookKey(lookFor(rpgOrLook))}_${moving ? "walk" : "idle"}_${dir}`;
}

/** Point a sprite at a look, standing still and facing `facing`. */
export function applyLook(scene, sprite, look, facing = "down") {
  const key = ensureLook(scene, look);
  if (!key) return null;
  const dir = DIRS.includes(facing) ? facing : "down";
  sprite.setTexture(key, frameIndex(dir, IDLE_COL));
  const idle = `${key}_idle_${dir}`;
  if (scene.anims.exists(idle)) sprite.anims.play(idle, true);
  return key;
}

// ---------------------------------------------------------------------------
// HTML canvas portraits

/** Callbacks waiting on the base art, so early portraits fill themselves in. */
const pendingRedraws = new Set();

/**
 * Draw a fixture's own art into a portrait frame, centred and standing on the
 * bottom edge the way it does in the world.
 */
function drawPropPortrait(ctx, canvas, artKey, pixelScale) {
  const art = document.createElement("canvas");
  drawArtToCanvas(art, artKey, pixelScale);
  ctx.drawImage(art, (canvas.width - art.width) / 2, canvas.height - art.height);
}

/**
 * Draw one frame of a look into a 2D canvas, for wardrobe previews and
 * dialogue portraits. Redraws itself once the source art arrives.
 */
export function drawCharacterToCanvas(canvas, look, dir = "down", frame = 0, pixelScale = 3) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width = FRAME.w * pixelScale;
  canvas.height = FRAME.h * pixelScale;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (look?.prop) {
    drawPropPortrait(ctx, canvas, look.prop, pixelScale);
    return;
  }

  const baked = bakeLook(look);
  if (!baked) {
    const retry = () => drawCharacterToCanvas(canvas, look, dir, frame, pixelScale);
    if (!pendingRedraws.has(canvas)) {
      pendingRedraws.add(canvas);
      preloadCharacterArt().then(() => {
        pendingRedraws.delete(canvas);
        if (canvas.isConnected !== false) retry();
      });
    }
    return;
  }

  const col = frame > 0 ? WALK_SEQUENCE[frame % WALK_SEQUENCE.length] : IDLE_COL;
  const facing = DIRS.includes(dir) ? dir : "down";
  ctx.drawImage(
    baked,
    col * TEX_FRAME_W,
    (ROW_FOR_DIR[facing] ?? 0) * TEX_FRAME_H,
    TEX_FRAME_W,
    TEX_FRAME_H,
    0,
    0,
    canvas.width,
    canvas.height
  );
}
