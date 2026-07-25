import { TILE, TILE_SIZE, ART_UNIT } from "./MapData.js";
import {
  appearanceTextureBase,
  normalizeAppearance,
  resolvePalette,
} from "./CharacterAppearance.js";

/**
 * DS-style procedural pixel textures — clean 2× upscaled 16px art grid.
 * Crisp outlines, limited palettes, Pokémon-generation polish.
 */

const SCALE = TILE_SIZE / ART_UNIT; // 2
const CHAR_W = ART_UNIT;
const CHAR_H = 22;
const OUTLINE = 0x282838;
const OUTLINE_SOFT = 0x383848;

function px(g, color, x, y, w = 1, h = 1) {
  g.fillStyle(color, 1);
  g.fillRect(x * SCALE, y * SCALE, w * SCALE, h * SCALE);
}

function pxCtx(ctx, color, scale, x, y, w = 1, h = 1) {
  ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  ctx.fillRect(x * scale, y * scale, w * scale, h * scale);
}

function makeTex(scene, key, draw, w = TILE_SIZE, h = TILE_SIZE) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

function drawLobbyTile(g) {
  // Bright cream marble — clearly distinct lobby floor
  px(g, 0xe8dcc8, 0, 0, 16, 16);
  px(g, 0xf8f0e0, 1, 1, 14, 14);
  px(g, 0xfff8f0, 2, 2, 6, 6);
  px(g, 0xfff8f0, 9, 9, 5, 5);
  px(g, 0xd8c8a8, 7, 0, 2, 16);
  px(g, 0xd8c8a8, 0, 7, 16, 2);
  px(g, 0xc8b898, 7, 7, 2, 2);
  px(g, 0xe8c878, 1, 1, 2, 1);
  px(g, 0xe8c878, 13, 13, 2, 1);
}

function drawCarpetTile(g) {
  // Rich burgundy casino carpet with gold diamond motif
  px(g, 0x4a0828, 0, 0, 16, 16);
  px(g, 0x6a1038, 1, 1, 14, 14);
  px(g, 0x801848, 2, 2, 12, 12);
  px(g, 0x982058, 3, 3, 10, 10);
  px(g, 0xe8c547, 7, 7, 2, 2);
  px(g, 0xffe890, 7, 7, 1, 1);
  px(g, 0xc8a030, 3, 3, 2, 2);
  px(g, 0xc8a030, 11, 11, 2, 2);
  px(g, 0xc8a030, 3, 11, 2, 2);
  px(g, 0xc8a030, 11, 3, 2, 2);
  px(g, 0x5a1840, 0, 0, 16, 1);
  px(g, 0x5a1840, 0, 15, 16, 1);
}

function drawFeltTile(g) {
  // Vivid table felt with gold rail and white betting line
  px(g, 0x0a5028, 0, 0, 16, 16);
  px(g, 0x0e6838, 1, 1, 14, 14);
  px(g, 0x148848, 2, 2, 12, 12);
  px(g, 0x1aa858, 3, 3, 10, 10);
  px(g, 0xe8c547, 0, 0, 16, 1);
  px(g, 0xe8c547, 0, 15, 16, 1);
  px(g, 0xe8c547, 0, 0, 1, 16);
  px(g, 0xe8c547, 15, 0, 1, 16);
  px(g, 0xffffff, 4, 7, 8, 1);
  px(g, 0xffffff, 7, 4, 1, 8);
  px(g, 0x30d070, 6, 6, 4, 4);
  px(g, 0x50f090, 7, 7, 2, 2);
}

function drawWallTile(g) {
  // Navy wall panels with gold trim — readable boundary
  px(g, 0x101828, 0, 0, 16, 16);
  px(g, 0x182038, 1, 1, 14, 14);
  px(g, 0x202848, 2, 2, 12, 12);
  px(g, 0xe8c547, 0, 0, 16, 2);
  px(g, 0xc8a030, 0, 14, 16, 2);
  px(g, 0xe8c547, 0, 0, 2, 16);
  px(g, 0xe8c547, 14, 0, 2, 16);
  px(g, 0x304060, 4, 5, 3, 4);
  px(g, 0x304060, 9, 5, 3, 4);
  px(g, 0x405080, 5, 6, 1, 2);
  px(g, 0x405080, 10, 6, 1, 2);
}

function drawPathTile(g) {
  // Bright gold walkway — navigation paths
  px(g, 0x8a6018, 0, 0, 16, 16);
  px(g, 0xc8a030, 1, 1, 14, 14);
  px(g, 0xe8c547, 2, 2, 12, 12);
  px(g, 0xffe890, 3, 3, 10, 10);
  px(g, 0xfff0b0, 4, 4, 8, 8);
  px(g, 0xe8c547, 6, 6, 4, 4);
  px(g, 0xc8a030, 7, 7, 2, 2);
  px(g, 0xa87820, 0, 7, 16, 2);
  px(g, 0xa87820, 7, 0, 2, 16);
}

function drawTrimTile(g) {
  // Dark wood/metal border between zones
  px(g, 0x1a1018, 0, 0, 16, 16);
  px(g, 0x2a1828, 1, 1, 14, 14);
  px(g, 0x3a2038, 2, 2, 12, 12);
  px(g, 0xe8c547, 1, 1, 14, 1);
  px(g, 0xe8c547, 1, 14, 14, 1);
  px(g, 0x684010, 3, 3, 10, 10);
  px(g, 0x4a2838, 4, 4, 8, 8);
  px(g, 0xc8a030, 7, 7, 2, 2);
}

function drawWaterTile(g) {
  px(g, 0x124060, 0, 0, 16, 16);
  px(g, 0x1a4a6a, 1, 1, 14, 14);
  px(g, 0x2a6a8a, 0, 2, 16, 4);
  px(g, 0x39c5cf, 2, 3, 5, 1);
  px(g, 0x6ae8f0, 3, 3, 2, 1);
  px(g, 0x4ad4de, 9, 4, 5, 1);
  px(g, 0x1a5a7a, 0, 8, 16, 3);
  px(g, 0x2a8aaa, 3, 9, 7, 1);
  px(g, 0x145070, 0, 13, 16, 3);
}

function drawVipTile(g) {
  // Black-and-gold VIP / slot aisle carpet
  px(g, 0x0a0810, 0, 0, 16, 16);
  px(g, 0x14101a, 1, 1, 14, 14);
  px(g, 0x1a1520, 2, 2, 12, 12);
  px(g, 0xe8c547, 3, 3, 10, 1);
  px(g, 0xe8c547, 3, 12, 10, 1);
  px(g, 0xe8c547, 3, 3, 1, 10);
  px(g, 0xe8c547, 12, 3, 1, 10);
  px(g, 0xffe890, 7, 7, 2, 2);
  px(g, 0xc8a030, 4, 4, 8, 8);
  px(g, 0x2a2030, 5, 5, 6, 6);
  px(g, 0xffe08a, 7, 7, 2, 2);
}

function drawAquaTile(g) {
  px(g, 0x0a2030, 0, 0, 16, 16);
  px(g, 0x0e3040, 1, 1, 14, 14);
  px(g, 0x1a4a5a, 2, 2, 12, 12);
  px(g, 0x2a6a7a, 2, 4, 12, 2);
  px(g, 0x39c5cf, 4, 8, 8, 1);
  px(g, 0x6ae8f0, 5, 8, 3, 1);
  px(g, 0x1a5a6a, 0, 12, 16, 4);
  px(g, 0x4ad4de, 10, 5, 3, 1);
}

function drawVoidTile(g) {
  px(g, 0x05040a, 0, 0, 16, 16);
}

const TILE_DRAWERS = {
  [TILE.VOID]: drawVoidTile,
  [TILE.LOBBY]: drawLobbyTile,
  [TILE.CARPET]: drawCarpetTile,
  [TILE.FELT]: drawFeltTile,
  [TILE.PLANT]: drawLobbyTile,
  [TILE.WATER]: drawWaterTile,
  [TILE.WALL]: drawWallTile,
  [TILE.BAR]: drawLobbyTile,
  [TILE.SLOT]: drawCarpetTile,
  [TILE.SCREEN]: drawCarpetTile,
  [TILE.VIP]: drawVipTile,
  [TILE.AQUA]: drawAquaTile,
  [TILE.PATH]: drawPathTile,
  [TILE.TRIM]: drawTrimTile,
};

const TEX_CHAR_W = CHAR_W * SCALE;
const TEX_CHAR_H = CHAR_H * SCALE;

/** DS-style chibi character — dark outline, 3-tone shading, clean proportions. */
function drawCharacter(g, palette, dir, frame) {
  const { body, mid, shade, hair, hairShade, skinLight, skinMid, skinShade } = palette;
  const bob = frame === 1 ? -1 : frame === 2 ? 1 : 0;
  const legL = frame === 1 ? 1 : frame === 2 ? -1 : 0;
  const legR = -legL;

  px(g, 0x000000, 3, 19, 10, 2);
  px(g, OUTLINE, 4 + legL, 15 + bob, 3, 5);
  px(g, OUTLINE, 9 + legR, 15 + bob, 3, 5);
  px(g, 0x383848, 4 + legL, 16 + bob, 3, 3);
  px(g, 0x383848, 9 + legR, 16 + bob, 3, 3);
  px(g, OUTLINE, 4 + legL, 19 + bob, 3, 1);
  px(g, OUTLINE, 9 + legR, 19 + bob, 3, 1);

  px(g, OUTLINE, 3, 8 + bob, 10, 8);
  px(g, body, 4, 9 + bob, 8, 6);
  px(g, mid, 4, 9 + bob, 8, 2);
  px(g, shade, 4, 13 + bob, 8, 2);
  px(g, 0xffffff, 5, 10 + bob, 2, 1);

  if (dir === "left") {
    px(g, OUTLINE, 1, 10 + bob, 3, 5);
    px(g, body, 2, 11 + bob, 2, 3);
    px(g, skinMid, 1, 11 + bob, 1, 2);
  } else if (dir === "right") {
    px(g, OUTLINE, 12, 10 + bob, 3, 5);
    px(g, body, 13, 11 + bob, 2, 3);
    px(g, skinMid, 14, 11 + bob, 1, 2);
  } else {
    px(g, OUTLINE, 2, 10 + bob, 2, 5);
    px(g, OUTLINE, 12, 10 + bob, 2, 5);
    px(g, body, 2, 11 + bob, 1, 3);
    px(g, body, 13, 11 + bob, 1, 3);
  }

  px(g, OUTLINE, 4, 1 + bob, 8, 8);
  px(g, skinLight, 5, 2 + bob, 6, 6);
  px(g, skinMid, 5, 6 + bob, 6, 2);
  px(g, skinShade, 6, 7 + bob, 4, 1);

  if (dir === "up") {
    px(g, OUTLINE, 4, 1 + bob, 8, 3);
    px(g, hair, 5, 2 + bob, 6, 2);
    px(g, hairShade, 5, 1 + bob, 6, 1);
  } else if (dir === "down") {
    px(g, hair, 5, 2 + bob, 6, 2);
    px(g, hairShade, 5, 2 + bob, 2, 1);
    px(g, OUTLINE, 6, 5 + bob, 1, 2);
    px(g, OUTLINE, 9, 5 + bob, 1, 2);
    px(g, 0xffffff, 6, 5 + bob, 1, 1);
    px(g, 0xffffff, 9, 5 + bob, 1, 1);
    px(g, 0x181828, 7, 6 + bob, 1, 1);
    px(g, 0x181828, 10, 6 + bob, 1, 1);
    px(g, 0xf0a0a0, 7, 7 + bob, 1, 1);
    px(g, 0xf0a0a0, 10, 7 + bob, 1, 1);
  } else if (dir === "left") {
    px(g, hair, 5, 2 + bob, 4, 2);
    px(g, hairShade, 5, 2 + bob, 2, 1);
    px(g, OUTLINE, 6, 5 + bob, 1, 2);
    px(g, 0xffffff, 6, 5 + bob, 1, 1);
    px(g, 0x181828, 7, 6 + bob, 1, 1);
  } else {
    px(g, hair, 7, 2 + bob, 4, 2);
    px(g, hairShade, 9, 2 + bob, 2, 1);
    px(g, OUTLINE, 9, 5 + bob, 1, 2);
    px(g, 0xffffff, 9, 5 + bob, 1, 1);
    px(g, 0x181828, 10, 6 + bob, 1, 1);
  }
}

/** Draw character to a 2D canvas (for previews and dialogue portraits). */
export function drawCharacterToCanvas(canvas, palette, dir = "down", frame = 0, pixelScale = 3) {
  const ctx = canvas.getContext("2d");
  const w = CHAR_W * pixelScale;
  const h = CHAR_H * pixelScale;
  canvas.width = w;
  canvas.height = h;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);

  const { body, mid, shade, hair, hairShade, skinLight, skinMid, skinShade } = palette;
  const bob = frame === 1 ? -1 : frame === 2 ? 1 : 0;
  const legL = frame === 1 ? 1 : frame === 2 ? -1 : 0;
  const legR = -legL;
  const s = pixelScale;

  pxCtx(ctx, 0x000000, s, 3, 19, 10, 2);
  pxCtx(ctx, OUTLINE, s, 4 + legL, 15 + bob, 3, 5);
  pxCtx(ctx, OUTLINE, s, 9 + legR, 15 + bob, 3, 5);
  pxCtx(ctx, 0x383848, s, 4 + legL, 16 + bob, 3, 3);
  pxCtx(ctx, 0x383848, s, 9 + legR, 16 + bob, 3, 3);
  pxCtx(ctx, OUTLINE, s, 4 + legL, 19 + bob, 3, 1);
  pxCtx(ctx, OUTLINE, s, 9 + legR, 19 + bob, 3, 1);
  pxCtx(ctx, OUTLINE, s, 3, 8 + bob, 10, 8);
  pxCtx(ctx, body, s, 4, 9 + bob, 8, 6);
  pxCtx(ctx, mid, s, 4, 9 + bob, 8, 2);
  pxCtx(ctx, shade, s, 4, 13 + bob, 8, 2);
  pxCtx(ctx, 0xffffff, s, 5, 10 + bob, 2, 1);
  pxCtx(ctx, OUTLINE, s, 2, 10 + bob, 2, 5);
  pxCtx(ctx, OUTLINE, s, 12, 10 + bob, 2, 5);
  pxCtx(ctx, body, s, 2, 11 + bob, 1, 3);
  pxCtx(ctx, body, s, 13, 11 + bob, 1, 3);
  pxCtx(ctx, OUTLINE, s, 4, 1 + bob, 8, 8);
  pxCtx(ctx, skinLight, s, 5, 2 + bob, 6, 6);
  pxCtx(ctx, skinMid, s, 5, 6 + bob, 6, 2);
  pxCtx(ctx, skinShade, s, 6, 7 + bob, 4, 1);
  pxCtx(ctx, hair, s, 5, 2 + bob, 6, 2);
  pxCtx(ctx, hairShade, s, 5, 2 + bob, 2, 1);
  pxCtx(ctx, OUTLINE, s, 6, 5 + bob, 1, 2);
  pxCtx(ctx, OUTLINE, s, 9, 5 + bob, 1, 2);
  pxCtx(ctx, 0xffffff, s, 6, 5 + bob, 1, 1);
  pxCtx(ctx, 0xffffff, s, 9, 5 + bob, 1, 1);
  pxCtx(ctx, 0x181828, s, 7, 6 + bob, 1, 1);
  pxCtx(ctx, 0x181828, s, 10, 6 + bob, 1, 1);
  pxCtx(ctx, 0xf0a0a0, s, 7, 7 + bob, 1, 1);
  pxCtx(ctx, 0xf0a0a0, s, 10, 7 + bob, 1, 1);
}

function createPlayerAnims(scene, base) {
  for (const dir of ["down", "up", "left", "right"]) {
    const animKey = `${base}_walk_${dir}`;
    if (scene.anims.exists(animKey)) scene.anims.remove(animKey);
    scene.anims.create({
      key: animKey,
      frames: [
        { key: `${base}_${dir}_1` },
        { key: `${base}_${dir}` },
        { key: `${base}_${dir}_2` },
        { key: `${base}_${dir}` },
      ],
      frameRate: 8,
      repeat: -1,
    });
    const idleKey = `${base}_idle_${dir}`;
    if (scene.anims.exists(idleKey)) scene.anims.remove(idleKey);
    scene.anims.create({
      key: idleKey,
      frames: [{ key: `${base}_${dir}` }],
      frameRate: 1,
      repeat: 0,
    });
  }
}

/** Generate Phaser textures for a customized player appearance. */
export function ensurePlayerTextures(scene, appearance) {
  const normalized = normalizeAppearance({ appearance });
  const palette = resolvePalette(normalized);
  const base = appearanceTextureBase(normalized);
  if (scene.textures.exists(`${base}_down`)) return base;

  for (const dir of ["down", "up", "left", "right"]) {
    for (const frame of [0, 1, 2]) {
      const suffix = frame === 0 ? "" : `_${frame}`;
      makeTex(
        scene,
        `${base}_${dir}${suffix}`,
        (g) => drawCharacter(g, palette, dir, frame),
        TEX_CHAR_W,
        TEX_CHAR_H
      );
    }
  }
  createPlayerAnims(scene, base);
  return base;
}

export function createGameTextures(scene) {
  for (const [id, drawer] of Object.entries(TILE_DRAWERS)) {
    makeTex(scene, `tile_${id}`, drawer);
  }

  const npcs = [
    ["npc_gold", 0xf0d050, 0xc8a838, 0x987820, 0x685010],
    ["npc_green", 0x50e8a0, 0x38b878, 0x288858, 0x186040],
    ["npc_pink", 0xd888f0, 0xa868c0, 0x7848a0, 0x503070],
    ["npc_teal", 0x48d8e8, 0x30a8b8, 0x208898, 0x1a6070],
    ["npc_red", 0xf08088, 0xc86068, 0x984048, 0x682830],
    ["npc_orange", 0xffb060, 0xd89048, 0xa86830, 0x784820],
    ["npc_silver", 0xc0c8d8, 0x9098a8, 0x606878, 0x404850],
  ];
  for (const [key, body, mid, shade, hair] of npcs) {
    const palette = {
      body, mid, shade, hair, hairShade: shade,
      skinLight: 0xffe8d0, skinMid: 0xffd8b8, skinShade: 0xffc8a8,
    };
    makeTex(scene, key, (g) => drawCharacter(g, palette, "down", 0), TEX_CHAR_W, TEX_CHAR_H);
  }

  makeTex(scene, "decor_bar", drawBarDecor);
  makeTex(scene, "decor_plant", drawPlantDecor);
  makeTex(scene, "decor_slot", drawSlotDecor);
  makeTex(scene, "decor_screen", drawScreenDecor);
  makeTex(scene, "shadow", (g) => {
    px(g, 0x000000, 2, 4, 12, 4);
    px(g, 0x000000, 3, 3, 10, 6);
  }, TILE_SIZE, TILE_SIZE * 0.625);
  makeTex(scene, "interact_icon", drawInteractIcon, TILE_SIZE, TILE_SIZE * 0.875);
}

function drawInteractIcon(g) {
  px(g, OUTLINE, 5, 0, 6, 2);
  px(g, 0xf0d050, 6, 0, 4, 2);
  px(g, 0xffe890, 7, 0, 2, 1);
  px(g, OUTLINE, 3, 2, 10, 2);
  px(g, 0xf0d050, 4, 2, 8, 2);
  px(g, OUTLINE, 1, 4, 14, 2);
  px(g, 0xf0d050, 2, 4, 12, 2);
  px(g, OUTLINE, 0, 6, 16, 2);
  px(g, 0xe8c030, 1, 6, 14, 2);
  px(g, 0xc8a030, 4, 8, 8, 2);
  px(g, 0xa87820, 6, 10, 4, 2);
}

function drawBarDecor(g) {
  px(g, OUTLINE, 0, 3, 16, 13);
  px(g, 0x5c3a1a, 1, 4, 14, 12);
  px(g, 0x9a7040, 1, 3, 14, 4);
  px(g, 0xc4a070, 2, 3, 12, 2);
  px(g, 0xe8c547, 2, 2, 12, 1);
  px(g, 0x48d8e8, 3, 8, 3, 4);
  px(g, 0xf08088, 7, 8, 3, 4);
  px(g, 0xf0d050, 11, 8, 3, 4);
  px(g, 0xffffff, 4, 4, 8, 1);
  px(g, 0xffe890, 6, 4, 4, 1);
}

function drawPlantDecor(g) {
  px(g, OUTLINE, 3, 9, 10, 7);
  px(g, 0x5c3a1a, 4, 10, 8, 6);
  px(g, 0x3a2410, 6, 11, 4, 4);
  px(g, OUTLINE, 2, 3, 12, 9);
  px(g, 0x1a5a30, 3, 4, 10, 7);
  px(g, 0x2d8a48, 4, 3, 8, 7);
  px(g, 0x4acc68, 5, 2, 6, 6);
  px(g, 0x70f090, 6, 1, 4, 4);
  px(g, 0x90ffb0, 7, 1, 2, 2);
}

function drawSlotDecor(g) {
  px(g, OUTLINE, 0, 0, 16, 16);
  px(g, 0x1a0a18, 1, 1, 14, 15);
  px(g, 0x3a1838, 2, 2, 12, 13);
  px(g, 0xe8c547, 2, 2, 12, 2);
  px(g, 0xf0d050, 3, 3, 10, 5);
  px(g, 0xffe890, 4, 3, 8, 2);
  px(g, 0xff4a60, 4, 5, 2, 4);
  px(g, 0x50e8a0, 7, 5, 2, 4);
  px(g, 0x48d8e8, 10, 5, 2, 4);
  px(g, 0x2a1028, 3, 10, 10, 4);
  px(g, 0xff4a60, 7, 13, 2, 2);
  px(g, 0xffffff, 5, 1, 6, 1);
}

function drawScreenDecor(g) {
  px(g, OUTLINE, 0, 1, 16, 14);
  px(g, 0x0a1520, 1, 2, 14, 12);
  px(g, 0xe8c547, 1, 2, 14, 1);
  px(g, 0x1a3040, 2, 3, 12, 10);
  px(g, 0x48d8e8, 3, 4, 10, 7);
  px(g, 0x6ae8f0, 4, 4, 8, 2);
  px(g, 0x50e8a0, 3, 8, 10, 2);
  px(g, 0xf0d050, 3, 11, 4, 1);
  px(g, 0xf08088, 9, 11, 4, 1);
  px(g, 0xffffff, 4, 3, 8, 1);
  px(g, OUTLINE, 6, 14, 4, 2);
  px(g, 0x1a1520, 7, 14, 2, 2);
}

export function playerTextureKey(rpgOrArchetype, facing = "down") {
  if (rpgOrArchetype && typeof rpgOrArchetype === "object") {
    const base = appearanceTextureBase(normalizeAppearance(rpgOrArchetype));
    return `${base}_${facing}`;
  }
  const archetype = rpgOrArchetype ?? "weekend_warrior";
  const base = appearanceTextureBase(normalizeAppearance({ archetype }));
  return `${base}_${facing}`;
}

export function playerAnimKey(rpgOrArchetype, facing, moving) {
  const base = (rpgOrArchetype && typeof rpgOrArchetype === "object")
    ? appearanceTextureBase(normalizeAppearance(rpgOrArchetype))
    : appearanceTextureBase(normalizeAppearance({ archetype: rpgOrArchetype ?? "weekend_warrior" }));
  return moving ? `${base}_walk_${facing}` : `${base}_idle_${facing}`;
}
