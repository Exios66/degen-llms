import { TILE, TILE_SIZE, ART_UNIT } from "./MapData.js";

/**
 * Production-grade procedural pixel textures — 16px art grid, 2× upscale.
 * Consistent top-left lighting, 4–5 tone palettes, DS/Pokémon polish.
 */

const SCALE = TILE_SIZE / ART_UNIT;
const OUTLINE = 0x181828;
const OUTLINE_SOFT = 0x303040;

// ─── Color utilities ───────────────────────────────────────────────────────

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function shade(color, factor) {
  const r = clamp(Math.round(((color >> 16) & 0xff) * factor), 0, 255);
  const g = clamp(Math.round(((color >> 8) & 0xff) * factor), 0, 255);
  const b = clamp(Math.round((color & 0xff) * factor), 0, 255);
  return (r << 16) | (g << 8) | b;
}

// ─── Pixel writers (Phaser Graphics + HTML Canvas) ─────────────────────────

function px(g, color, x, y, w = 1, h = 1, alpha = 1) {
  g.fillStyle(color, alpha);
  g.fillRect(x * SCALE, y * SCALE, w * SCALE, h * SCALE);
}

function pxCtx(ctx, color, scale, x, y, w = 1, h = 1, alpha = 1) {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  ctx.fillStyle = alpha < 1 ? `rgba(${r},${g},${b},${alpha})` : `#${color.toString(16).padStart(6, "0")}`;
  ctx.fillRect(x * scale, y * scale, w * scale, h * scale);
}

function makeWriter(target, scale = SCALE) {
  if (target?.getContext) {
    const ctx = target.getContext("2d");
    return {
      px: (color, x, y, w, h, alpha) => pxCtx(ctx, color, scale, x, y, w, h, alpha),
    };
  }
  return {
    px: (color, x, y, w, h, alpha) => px(target, color, x, y, w, h, alpha),
  };
}

function tileFrame(w, base, light, dark, highlight = null) {
  w.px(base, 0, 0, 16, 16);
  w.px(light, 0, 0, 15, 1);
  w.px(light, 0, 0, 1, 14);
  w.px(dark, 15, 0, 1, 16);
  w.px(dark, 0, 15, 16, 1);
  if (highlight) w.px(highlight, 1, 1, 2, 1);
}

function ditherWeave(w, x0, y0, w0, h0, c1, c2) {
  for (let y = y0; y < y0 + h0; y++) {
    for (let x = x0; x < x0 + w0; x++) {
      w.px((x + y) % 2 === 0 ? c1 : c2, x, y);
    }
  }
}

function marbleVeins(w, base, vein, veinHi) {
  w.px(base, 0, 0, 16, 16);
  w.px(vein, 1, 2, 6, 1);
  w.px(veinHi, 2, 2, 3, 1);
  w.px(vein, 8, 1, 1, 5);
  w.px(vein, 9, 5, 5, 1);
  w.px(veinHi, 10, 5, 2, 1);
  w.px(vein, 3, 9, 8, 1);
  w.px(vein, 2, 10, 1, 4);
  w.px(veinHi, 3, 12, 4, 1);
  w.px(vein, 11, 8, 1, 6);
  w.px(veinHi, 12, 10, 2, 1);
  w.px(0xf8f4ec, 4, 4, 1, 1, 0.7);
  w.px(0xfffaf0, 11, 3, 1, 1, 0.6);
}

function groutGrid(w, grout, step = 8) {
  for (let i = step; i < 16; i += step) {
    w.px(grout, i, 0, 1, 16);
    w.px(grout, 0, i, 16, 1);
  }
}

function makeTex(scene, key, draw, w = TILE_SIZE, h = TILE_SIZE) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

// ─── Ground tiles ──────────────────────────────────────────────────────────

function drawLobbyTile(g) {
  const w = makeWriter(g);
  marbleVeins(w, 0xe8e0d0, 0xc8b8a0, 0xd8c8b0);
  groutGrid(w, 0xb8a890, 8);
  w.px(0xfff8f0, 3, 3, 3, 2);
  w.px(0xfff8f0, 10, 10, 3, 2);
  w.px(0xf0e8d8, 6, 6, 4, 4);
  w.px(0xe8c878, 7, 7, 2, 2);
  w.px(0xffe890, 7, 7, 1, 1);
  w.px(0xd0c0a8, 0, 0, 16, 1);
  w.px(0xd0c0a8, 0, 0, 1, 16);
}

function drawCarpetTile(g) {
  const w = makeWriter(g);
  tileFrame(w, 0x4a0828, 0x6a1840, 0x2a0418);
  ditherWeave(w, 1, 1, 14, 14, 0x6a1038, 0x5a0c30);
  w.px(0x801848, 2, 2, 12, 12);
  // Ornate medallion
  w.px(0xc8a030, 4, 4, 8, 8);
  w.px(0xe8c547, 5, 5, 6, 6);
  w.px(0xffe890, 6, 6, 4, 4);
  w.px(0xfff0b0, 7, 7, 2, 2);
  w.px(0x982058, 7, 7, 2, 2);
  // Corner flourishes
  w.px(0xc8a030, 2, 2, 2, 2);
  w.px(0xc8a030, 12, 2, 2, 2);
  w.px(0xc8a030, 2, 12, 2, 2);
  w.px(0xc8a030, 12, 12, 2, 2);
  w.px(0xffe890, 3, 3, 1, 1);
  w.px(0xffe890, 13, 13, 1, 1);
  // Fringe
  w.px(0x3a0618, 0, 0, 16, 1);
  w.px(0x3a0618, 0, 15, 16, 1);
}

function drawFeltTile(g) {
  const w = makeWriter(g);
  w.px(0x0a4828, 0, 0, 16, 16);
  ditherWeave(w, 1, 1, 14, 14, 0x0e5830, 0x0c5030);
  w.px(0x128840, 2, 2, 12, 12);
  w.px(0x18a050, 3, 3, 10, 10);
  // Gold rail
  w.px(0xc8a030, 0, 0, 16, 1);
  w.px(0xe8c547, 0, 1, 16, 1);
  w.px(0xc8a030, 0, 14, 16, 2);
  w.px(0xe8c547, 0, 0, 1, 16);
  w.px(0xe8c547, 15, 0, 1, 16);
  w.px(0xffe890, 1, 1, 1, 1);
  // Betting circle
  w.px(0xffffff, 4, 7, 8, 1);
  w.px(0xffffff, 7, 4, 1, 8);
  w.px(0xffffff, 5, 5, 1, 1);
  w.px(0xffffff, 10, 5, 1, 1);
  w.px(0xffffff, 5, 10, 1, 1);
  w.px(0xffffff, 10, 10, 1, 1);
  w.px(0x40e080, 6, 6, 4, 4);
  w.px(0x60ffa0, 7, 7, 2, 2);
  w.px(0xffffff, 7, 7, 1, 1, 0.5);
}

function drawWallTile(g) {
  const w = makeWriter(g);
  w.px(0x0c1018, 0, 0, 16, 16);
  w.px(0x141c28, 1, 1, 14, 14);
  // Crown molding
  w.px(0xc8a030, 0, 0, 16, 2);
  w.px(0xe8c547, 0, 0, 16, 1);
  w.px(0xffe890, 1, 0, 14, 1);
  w.px(0x8a6018, 0, 2, 16, 1);
  // Panel recesses
  w.px(0x1a2438, 2, 4, 5, 9);
  w.px(0x1a2438, 9, 4, 5, 9);
  w.px(0x243048, 3, 5, 3, 7);
  w.px(0x243048, 10, 5, 3, 7);
  w.px(0x304060, 4, 6, 1, 5);
  w.px(0x304060, 11, 6, 1, 5);
  // Sconce glow
  w.px(0xe8c547, 7, 5, 2, 1);
  w.px(0xffe890, 7, 5, 1, 1, 0.8);
  w.px(0xffe890, 6, 6, 4, 2, 0.15);
  w.px(0xc8a030, 0, 14, 16, 2);
  w.px(0x8a6018, 0, 15, 16, 1);
}

function drawPathTile(g) {
  const w = makeWriter(g);
  w.px(0x7a5010, 0, 0, 16, 16);
  w.px(0xa87820, 1, 1, 14, 14);
  w.px(0xc8a030, 2, 2, 12, 12);
  w.px(0xe8c547, 3, 3, 10, 10);
  w.px(0xffe890, 4, 4, 8, 8);
  // Diamond inlay
  w.px(0xfff0b0, 5, 5, 6, 6);
  w.px(0xe8c547, 6, 6, 4, 4);
  w.px(0xffe890, 7, 7, 2, 2);
  w.px(0xffffff, 7, 7, 1, 1, 0.6);
  // Brushed metal streaks
  w.px(0xffe890, 2, 3, 4, 1, 0.4);
  w.px(0xffe890, 9, 10, 5, 1, 0.35);
  w.px(0x684010, 7, 0, 2, 16);
  w.px(0x684010, 0, 7, 16, 2);
  w.px(0x8a6018, 7, 7, 2, 2);
}

function drawTrimTile(g) {
  const w = makeWriter(g);
  w.px(0x140c10, 0, 0, 16, 16);
  w.px(0x241418, 1, 1, 14, 14);
  w.px(0x3a2028, 2, 2, 12, 12);
  // Mahogany inlay
  w.px(0x5c3018, 3, 3, 10, 10);
  w.px(0x7a4828, 4, 4, 8, 8);
  w.px(0x9a6840, 5, 5, 6, 6);
  w.px(0xc8a030, 1, 1, 14, 1);
  w.px(0xe8c547, 2, 2, 12, 1);
  w.px(0xc8a030, 1, 14, 14, 1);
  w.px(0xe8c547, 7, 7, 2, 2);
  w.px(0xffe890, 7, 7, 1, 1);
  w.px(0x2a1820, 0, 0, 16, 1);
  w.px(0x2a1820, 0, 15, 16, 1);
}

function drawWaterTile(g) {
  const w = makeWriter(g);
  w.px(0x0c3050, 0, 0, 16, 16);
  w.px(0x104060, 1, 1, 14, 14);
  w.px(0x186880, 2, 2, 12, 12);
  // Depth bands
  w.px(0x1a5878, 0, 6, 16, 4);
  w.px(0x145068, 0, 11, 16, 5);
  // Caustic highlights
  w.px(0x39c5cf, 2, 3, 4, 1);
  w.px(0x6ae8f0, 3, 3, 2, 1);
  w.px(0x4ad4de, 8, 2, 5, 1);
  w.px(0x6ae8f0, 9, 2, 2, 1);
  w.px(0x39c5cf, 4, 9, 6, 1);
  w.px(0x6ae8f0, 5, 9, 3, 1);
  w.px(0x4ad4de, 11, 7, 3, 1);
  w.px(0x80f8ff, 6, 4, 1, 1, 0.7);
  w.px(0x80f8ff, 12, 8, 1, 1, 0.5);
  // Surface ripple
  w.px(0x2a90a8, 1, 5, 14, 1, 0.5);
  w.px(0x2a90a8, 2, 12, 12, 1, 0.4);
}

function drawVipTile(g) {
  const w = makeWriter(g);
  w.px(0x060408, 0, 0, 16, 16);
  w.px(0x0c0810, 1, 1, 14, 14);
  w.px(0x121018, 2, 2, 12, 12);
  // Gold veining on black marble
  w.px(0xc8a030, 2, 3, 5, 1);
  w.px(0xe8c547, 3, 3, 2, 1);
  w.px(0xc8a030, 8, 2, 1, 4);
  w.px(0xe8c547, 8, 4, 1, 1);
  w.px(0xc8a030, 4, 9, 8, 1);
  w.px(0xe8c547, 6, 9, 3, 1);
  w.px(0xc8a030, 11, 7, 1, 5);
  // Gold frame border
  w.px(0xe8c547, 2, 2, 12, 1);
  w.px(0xe8c547, 2, 13, 12, 1);
  w.px(0xe8c547, 2, 2, 1, 12);
  w.px(0xe8c547, 13, 2, 1, 12);
  w.px(0xffe890, 7, 7, 2, 2);
  w.px(0xfff0b0, 7, 7, 1, 1);
  w.px(0x1a1520, 5, 5, 6, 6);
}

function drawAquaTile(g) {
  const w = makeWriter(g);
  w.px(0x0a1820, 0, 0, 16, 16);
  // Pool deck mosaic
  for (let y = 0; y < 16; y += 4) {
    for (let x = 0; x < 16; x += 4) {
      const tone = ((x + y) / 4) % 2 === 0 ? 0x1a3848 : 0x143040;
      w.px(tone, x, y, 4, 4);
      w.px(0x244858, x + 1, y + 1, 2, 2);
    }
  }
  groutGrid(w, 0x0c2030, 4);
  // Shimmer water line
  w.px(0x39c5cf, 0, 10, 16, 2);
  w.px(0x6ae8f0, 2, 10, 4, 1);
  w.px(0x4ad4de, 8, 11, 6, 1);
  w.px(0x80f8ff, 12, 10, 2, 1, 0.6);
  w.px(0x1a5060, 0, 12, 16, 4);
  w.px(0x2a7080, 3, 13, 8, 1);
}

function drawPlantTile(g) {
  const w = makeWriter(g);
  tileFrame(w, 0x283028, 0x384838, 0x182018);
  w.px(0x304030, 2, 2, 12, 12);
  // Flagstone
  w.px(0x485848, 2, 2, 5, 5);
  w.px(0x586858, 8, 2, 6, 5);
  w.px(0x485848, 2, 8, 6, 6);
  w.px(0x586858, 9, 8, 5, 6);
  w.px(0x688868, 3, 3, 3, 3);
  w.px(0x688868, 9, 3, 4, 3);
  // Scattered leaves
  w.px(0x2d8a48, 4, 5, 2, 1);
  w.px(0x4acc68, 5, 4, 1, 1);
  w.px(0x2d8a48, 11, 9, 2, 1);
  w.px(0x4acc68, 12, 8, 1, 1);
  w.px(0x1a5a30, 7, 11, 2, 1);
}

function drawBarTile(g) {
  const w = makeWriter(g);
  w.px(0x2a1810, 0, 0, 16, 16);
  // Dark hardwood parquet
  w.px(0x3a2418, 0, 0, 8, 8);
  w.px(0x4a3020, 8, 0, 8, 8);
  w.px(0x4a3020, 0, 8, 8, 8);
  w.px(0x3a2418, 8, 8, 8, 8);
  w.px(0x5c3a1a, 1, 1, 6, 6);
  w.px(0x6c4a28, 9, 1, 6, 6);
  w.px(0x6c4a28, 1, 9, 6, 6);
  w.px(0x5c3a1a, 9, 9, 6, 6);
  w.px(0x9a7040, 2, 2, 2, 1);
  w.px(0x9a7040, 10, 10, 2, 1);
  w.px(0xc4a070, 3, 3, 1, 1, 0.5);
  w.px(0x1a1008, 7, 0, 2, 16);
  w.px(0x1a1008, 0, 7, 16, 2);
}

function drawSlotTile(g) {
  const w = makeWriter(g);
  tileFrame(w, 0x1a0818, 0x2a1028, 0x0c040c);
  ditherWeave(w, 1, 1, 14, 14, 0x220c20, 0x1a0818);
  // Neon strip accents
  w.px(0xff4a60, 1, 1, 14, 1);
  w.px(0xff8090, 2, 1, 12, 1, 0.5);
  w.px(0x48d8e8, 1, 14, 14, 1);
  w.px(0x80f0ff, 2, 14, 12, 1, 0.5);
  w.px(0xf0d050, 7, 2, 2, 12);
  w.px(0xffe890, 7, 4, 2, 1, 0.6);
  w.px(0xffe890, 7, 10, 2, 1, 0.6);
  w.px(0x3a1838, 3, 4, 10, 8);
}

function drawScreenTile(g) {
  const w = makeWriter(g);
  tileFrame(w, 0x1a1028, 0x2a1838, 0x0c0818);
  ditherWeave(w, 1, 1, 14, 14, 0x221430, 0x1a1028);
  // TV glow spill on carpet
  w.px(0x1a3040, 4, 3, 8, 8, 0.6);
  w.px(0x48d8e8, 5, 4, 6, 5, 0.25);
  w.px(0x6ae8f0, 6, 5, 4, 3, 0.2);
  w.px(0x50e8a0, 5, 9, 6, 2, 0.15);
  w.px(0x304060, 3, 2, 10, 1);
  w.px(0x405080, 4, 3, 8, 1);
}

function drawVoidTile(g) {
  px(g, 0x040308, 0, 0, 16, 16);
  px(g, 0x06050a, 1, 1, 14, 14, 0.5);
}

const TILE_DRAWERS = {
  [TILE.VOID]: drawVoidTile,
  [TILE.LOBBY]: drawLobbyTile,
  [TILE.CARPET]: drawCarpetTile,
  [TILE.FELT]: drawFeltTile,
  [TILE.PLANT]: drawPlantTile,
  [TILE.WATER]: drawWaterTile,
  [TILE.WALL]: drawWallTile,
  [TILE.BAR]: drawBarTile,
  [TILE.SLOT]: drawSlotTile,
  [TILE.SCREEN]: drawScreenTile,
  [TILE.VIP]: drawVipTile,
  [TILE.AQUA]: drawAquaTile,
  [TILE.PATH]: drawPathTile,
  [TILE.TRIM]: drawTrimTile,
};

// ─── Decor & UI sprites ──────────────────────────────────────────────────────

function drawShadow(g) {
  const w = makeWriter(g);
  w.px(0x000000, 1, 5, 14, 2, 0.08);
  w.px(0x000000, 2, 4, 12, 3, 0.14);
  w.px(0x000000, 3, 3, 10, 4, 0.22);
  w.px(0x000000, 4, 4, 8, 3, 0.32);
  w.px(0x000000, 5, 4, 6, 2, 0.42);
}

function drawInteractIcon(g) {
  const w = makeWriter(g);
  // Pulsing gold diamond prompt
  w.px(OUTLINE, 7, 0, 2, 2);
  w.px(0xf0d050, 7, 0, 2, 1);
  w.px(0xffe890, 7, 0, 1, 1);
  w.px(OUTLINE, 5, 2, 6, 2);
  w.px(0xf0d050, 6, 2, 4, 2);
  w.px(OUTLINE, 3, 4, 10, 2);
  w.px(0xf0d050, 4, 4, 8, 2);
  w.px(0xffe890, 5, 4, 6, 1);
  w.px(OUTLINE, 1, 6, 14, 2);
  w.px(0xe8c030, 2, 6, 12, 2);
  w.px(0xffe890, 3, 6, 10, 1);
  w.px(OUTLINE, 3, 8, 10, 2);
  w.px(0xc8a030, 4, 8, 8, 2);
  w.px(0xa87820, 6, 10, 4, 2);
  w.px(0xffffff, 5, 5, 1, 1, 0.7);
  w.px(0xffffff, 10, 3, 1, 1, 0.5);
}

function drawBarDecor(g) {
  const w = makeWriter(g);
  // Back bar + mirror
  w.px(OUTLINE, 0, 2, 16, 14);
  w.px(0x3a2010, 1, 3, 14, 13);
  w.px(0x5c3a1a, 1, 2, 14, 5);
  w.px(0x9a7040, 2, 2, 12, 3);
  w.px(0xc4a070, 2, 2, 12, 1);
  w.px(0xe8c547, 2, 1, 12, 1);
  // Mirror backsplash
  w.px(0x6080a0, 2, 5, 12, 3);
  w.px(0x90b0d0, 3, 5, 4, 1, 0.5);
  w.px(0x90b0d0, 9, 6, 3, 1, 0.4);
  // Bottles
  w.px(0x48d8e8, 3, 8, 2, 5);
  w.px(0x80f0ff, 3, 8, 1, 1);
  w.px(0xf08088, 6, 8, 2, 5);
  w.px(0xffa0a8, 6, 8, 1, 1);
  w.px(0xf0d050, 9, 8, 2, 5);
  w.px(0xffe890, 9, 8, 1, 1);
  w.px(0xc678dd, 12, 8, 2, 5);
  w.px(0xe0a0f0, 12, 8, 1, 1);
  w.px(OUTLINE, 3, 7, 2, 1);
  w.px(OUTLINE, 6, 7, 2, 1);
  w.px(OUTLINE, 9, 7, 2, 1);
  w.px(OUTLINE, 12, 7, 2, 1);
  // Counter lip
  w.px(0xffffff, 1, 12, 14, 1);
  w.px(0xffe890, 3, 12, 10, 1);
  // Neon sign
  w.px(0xff4a60, 4, 0, 8, 2);
  w.px(0xff8090, 5, 0, 6, 1, 0.6);
  w.px(OUTLINE, 5, 0, 6, 2);
}

function drawPlantDecor(g) {
  const w = makeWriter(g);
  // Ceramic pot
  w.px(OUTLINE, 3, 10, 10, 6);
  w.px(0x5c3a1a, 4, 11, 8, 5);
  w.px(0x7a5030, 4, 10, 8, 2);
  w.px(0x9a7040, 5, 10, 6, 1);
  w.px(0xc4a070, 5, 10, 3, 1, 0.6);
  w.px(0x3a2410, 6, 12, 4, 3);
  // Trunk
  w.px(OUTLINE, 7, 7, 2, 4);
  w.px(0x4a3020, 7, 7, 2, 3);
  // Fronds
  w.px(OUTLINE, 2, 2, 12, 9);
  w.px(0x1a5a30, 3, 3, 10, 8);
  w.px(0x2d8a48, 4, 2, 8, 7);
  w.px(0x4acc68, 5, 1, 6, 6);
  w.px(0x70f090, 6, 0, 4, 5);
  w.px(0x90ffb0, 7, 0, 2, 3);
  w.px(0xb0ffc8, 7, 0, 1, 1);
  w.px(0x2d8a48, 2, 4, 2, 3);
  w.px(0x4acc68, 1, 3, 2, 2);
  w.px(0x2d8a48, 12, 4, 2, 3);
  w.px(0x4acc68, 13, 3, 2, 2);
  w.px(0x1a5a30, 5, 7, 6, 2);
}

function drawSlotDecor(g) {
  const w = makeWriter(g);
  w.px(OUTLINE, 0, 0, 16, 16);
  w.px(0x120810, 1, 1, 14, 15);
  w.px(0x2a1830, 2, 2, 12, 13);
  // Chrome top
  w.px(0xe8c547, 2, 1, 12, 2);
  w.px(0xffe890, 3, 1, 10, 1);
  w.px(0xc8a030, 2, 2, 12, 1);
  // Marquee
  w.px(0xf0d050, 3, 3, 10, 4);
  w.px(0xffe890, 4, 3, 8, 2);
  w.px(0xff4a60, 4, 5, 2, 2);
  w.px(0x50e8a0, 7, 5, 2, 2);
  w.px(0x48d8e8, 10, 5, 2, 2);
  // Reel windows
  w.px(0x0a0810, 3, 8, 10, 4);
  w.px(OUTLINE, 3, 8, 3, 4);
  w.px(OUTLINE, 6, 8, 3, 4);
  w.px(OUTLINE, 9, 8, 4, 4);
  w.px(0xff4a60, 4, 9, 1, 2);
  w.px(0xf0d050, 7, 9, 1, 2);
  w.px(0x50e8a0, 10, 9, 2, 2);
  // Lever
  w.px(OUTLINE, 14, 6, 2, 6);
  w.px(0xc8a030, 14, 6, 1, 5);
  w.px(0xff4a60, 14, 5, 2, 2);
  w.px(0xff8090, 14, 5, 1, 1);
  // Coin tray
  w.px(0x383848, 4, 13, 8, 2);
  w.px(0x585868, 5, 13, 6, 1);
  w.px(0xffffff, 5, 1, 6, 1);
}

function drawScreenDecor(g) {
  const w = makeWriter(g);
  // Wall mount
  w.px(OUTLINE, 0, 1, 16, 13);
  w.px(0x0a1018, 1, 2, 14, 11);
  w.px(0xe8c547, 1, 2, 14, 1);
  w.px(0xc8a030, 1, 2, 14, 1, 0.5);
  // Screen bezel
  w.px(0x1a2030, 2, 3, 12, 9);
  w.px(OUTLINE, 2, 3, 12, 9);
  // Sports broadcast
  w.px(0x1a4060, 3, 4, 10, 7);
  w.px(0x48d8e8, 3, 4, 10, 3);
  w.px(0x6ae8f0, 4, 4, 8, 1);
  w.px(0x50e8a0, 3, 7, 10, 2);
  w.px(0x3dd68c, 4, 7, 8, 1);
  w.px(0xf0d050, 3, 9, 4, 1);
  w.px(0xf08088, 9, 9, 4, 1);
  w.px(0xffffff, 4, 5, 2, 1);
  w.px(0xffffff, 10, 5, 2, 1);
  // Score bug
  w.px(0x0a0810, 4, 5, 8, 2);
  w.px(0xf0d050, 5, 5, 2, 1);
  w.px(0xf08088, 9, 5, 2, 1);
  // Stand
  w.px(OUTLINE, 6, 13, 4, 3);
  w.px(0x1a1520, 7, 13, 2, 3);
  w.px(0x304050, 5, 14, 6, 1);
  // Ambient glow
  w.px(0x48d8e8, 1, 10, 14, 2, 0.12);
}

export function createGameTextures(scene) {
  for (const [id, drawer] of Object.entries(TILE_DRAWERS)) {
    makeTex(scene, `tile_${id}`, drawer);
  }

  makeTex(scene, "decor_bar", drawBarDecor);
  makeTex(scene, "decor_plant", drawPlantDecor);
  makeTex(scene, "decor_slot", drawSlotDecor);
  makeTex(scene, "decor_screen", drawScreenDecor);
  makeTex(scene, "shadow", drawShadow, TILE_SIZE, TILE_SIZE * 0.625);
  makeTex(scene, "interact_icon", drawInteractIcon, TILE_SIZE, TILE_SIZE * 0.875);
}

export {
  preloadCharacterAssets,
  cachePortraitImages,
  ensurePlayerTextures,
  setupNpcSprite,
  applySpriteAppearance,
  resolvePlayerSprite,
  resolveNpcSprite,
  resolveSpeakerSprite,
  drawCharacterToCanvas,
  playerTextureKey,
  playerAnimKey,
} from "./CharacterSprites.js";
