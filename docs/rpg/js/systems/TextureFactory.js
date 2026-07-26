import { ART_UNIT, TILE, TILE_SIZE } from "./MapTiles.js";

/**
 * Procedural pixel textures for the ground, decor and UI cues — 16px art grid,
 * 2× upscale. Consistent top-left lighting, 4–5 tone palettes, DS polish.
 *
 * Characters are not drawn here: they come from the vendored sprite sheets in
 * `CharacterSprites.js`, which are hand-drawn art rather than generated.
 */

const SCALE = TILE_SIZE / ART_UNIT;
const OUTLINE = 0x241d2e;

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

/**
 * Pixel size for canvas draws.
 *
 * Drawers take whatever `makeWriter` defaults to, so `drawArtToCanvas` sets
 * this for the length of one synchronous draw when a caller wants art at a
 * size other than the world's 2×. The Phaser path ignores it and always uses
 * SCALE, so only canvas output is affected.
 */
let canvasScale = SCALE;

function makeWriter(target, scale = canvasScale) {
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
  // Polished marble. The gold inlay that used to sit in every tile turned
  // concourses into polka dots, so it moved to an occasional variant.
  marbleVeins(w, 0xe8e0d0, 0xc8b8a0, 0xd8c8b0);
  groutGrid(w, 0xb8a890, 8);
  w.px(0xfff8f0, 3, 3, 3, 2);
  w.px(0xfff8f0, 10, 10, 3, 2);
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
  const w = makeWriter(g);
  // Off-map filler: near-black with a faint weave so it reads as depth, not a hole.
  w.px(0x040308, 0, 0, 16, 16);
  ditherWeave(w, 0, 0, 16, 16, 0x070510, 0x040308);
  w.px(0x0a0818, 4, 4, 8, 8);
  w.px(0x100c20, 7, 7, 2, 2);
}

function drawRoadTile(g) {
  const w = makeWriter(g);
  // Porte-cochère asphalt. It used to sit near black, which read as a hole cut
  // in the map beside the cream sidewalk rather than a surface you drive on;
  // this is a real road value with aggregate in it. A lane stripe on every
  // tile turned the boulevard into 32px banding, so paint stays on the accent.
  w.px(0x3c3b49, 0, 0, 16, 16);
  ditherWeave(w, 0, 0, 16, 16, 0x413f4f, 0x393845);
  tileFrame(w, 0x3c3b49, 0x484756, 0x2f2e3a);
  // Chips of stone catching the light, and the pits between them.
  for (const [x, y] of [
    [2, 1], [7, 2], [12, 1], [4, 4], [10, 5], [14, 7],
    [1, 8], [6, 9], [11, 10], [3, 12], [8, 13], [13, 14],
  ]) {
    w.px(0x54535f, x, y, 1, 1);
  }
  for (const [x, y] of [
    [5, 3], [9, 4], [2, 6], [13, 4], [7, 6], [12, 8],
    [4, 11], [10, 13], [1, 14], [14, 11],
  ]) {
    w.px(0x2e2d39, x, y, 1, 1);
  }
}

function drawSandTile(g) {
  const w = makeWriter(g);
  // Beach club sand: warm base, wind ripples, a few shell flecks.
  w.px(0xc9ad72, 0, 0, 16, 16);
  ditherWeave(w, 0, 0, 16, 16, 0xd8bd83, 0xceb379);
  w.px(0xe6cf9c, 0, 0, 16, 1);
  w.px(0xb89a5e, 0, 15, 16, 1);
  for (let i = 0; i < 16; i += 1) {
    const wave = 3 + Math.round(Math.sin(i / 2.4) * 2);
    w.px(0xbfa268, i, wave + 2, 1, 1);
    w.px(0xe6cf9c, i, wave + 3, 1, 1);
    w.px(0xbfa268, i, wave + 9, 1, 1);
  }
  w.px(0xfff0c8, 4, 6, 1, 1);
  w.px(0xfff0c8, 11, 12, 1, 1);
  w.px(0xa88c50, 7, 9, 2, 1);
  w.px(0xf0e0b8, 13, 3, 2, 1);
}

function drawStageTile(g) {
  const w = makeWriter(g);
  // House of Blues boards: black lacquer catching magenta and cyan wash.
  w.px(0x14101c, 0, 0, 16, 16);
  w.px(0x1e1828, 0, 0, 16, 7);
  w.px(0x1a1424, 0, 9, 16, 7);
  w.px(0x0c0a14, 0, 7, 16, 2);
  w.px(0x0c0a14, 0, 15, 16, 1);
  // Board seams and grain
  w.px(0x241c30, 0, 1, 16, 1);
  w.px(0x241c30, 0, 10, 16, 1);
  w.px(0x100c18, 5, 0, 1, 7);
  w.px(0x100c18, 11, 9, 1, 7);
  // Colored wash from the rig
  w.px(0x5a2a6a, 1, 2, 6, 2, 0.55);
  w.px(0x8a48a0, 2, 2, 3, 1, 0.5);
  w.px(0x2a5a6a, 9, 11, 5, 2, 0.5);
  w.px(0x48a0b8, 10, 11, 3, 1, 0.45);
  w.px(0xffe890, 13, 3, 2, 1, 0.3);
  w.px(0xffffff, 3, 5, 1, 1, 0.35);
}

function drawSpaTile(g) {
  const w = makeWriter(g);
  // Bathhouse: honed stone squares, grout, a wet-looking highlight.
  w.px(0x3a4a50, 0, 0, 16, 16);
  const stones = [[1, 1], [9, 1], [1, 9], [9, 9]];
  for (const [sx, sy] of stones) {
    w.px(0x5c6d74, sx, sy, 6, 6);
    w.px(0x6e8188, sx, sy, 6, 1);
    w.px(0x6e8188, sx, sy, 1, 5);
    w.px(0x4a5a60, sx + 5, sy, 1, 6);
    w.px(0x4a5a60, sx, sy + 5, 6, 1);
    w.px(0x82949a, sx + 1, sy + 1, 2, 1);
  }
  groutGrid(w, 0x2e3c42, 8);
  w.px(0x2e3c42, 0, 0, 16, 1);
  w.px(0x2e3c42, 0, 0, 1, 16);
  w.px(0xa8c0c8, 3, 3, 1, 1, 0.5);
  w.px(0xa8c0c8, 11, 11, 1, 1, 0.4);
  w.px(0x9ab8c8, 12, 4, 2, 1, 0.3);
}

function drawGlassTile(g) {
  const w = makeWriter(g);
  // Shark Reef acrylic: lit water behind a mullion, with a specular streak.
  w.px(0x18303c, 0, 0, 16, 16);
  w.px(0x24485a, 1, 1, 14, 14);
  w.px(0x2a94a4, 1, 1, 6, 14);
  w.px(0x39c5cf, 1, 3, 6, 9);
  w.px(0x2a94a4, 9, 1, 6, 14);
  w.px(0x2f9fb0, 9, 4, 6, 8);
  w.px(0x6ae8f0, 2, 4, 2, 6, 0.7);
  w.px(0xa8e8f0, 2, 4, 1, 6);
  w.px(0x80f8ff, 11, 6, 1, 4, 0.6);
  // Mullion and frame
  w.px(0x0e1c24, 7, 0, 2, 16);
  w.px(0x1e3a48, 7, 0, 1, 16);
  w.px(0x0e1c24, 0, 0, 16, 1);
  w.px(0x0e1c24, 0, 15, 16, 1);
  w.px(0x3a6878, 0, 1, 16, 1, 0.6);
}

function drawIceTile(g) {
  const w = makeWriter(g);
  // Minus5 floor: milky carved ice. Pale enough to read as cold next to the
  // navy aquarium acrylic, with a frost bloom and two cleaved facets.
  w.px(0x9fd8f0, 0, 0, 16, 16);
  ditherWeave(w, 0, 0, 16, 16, 0xaee3f8, 0x93cfe8);
  w.px(0xd8f4ff, 0, 0, 16, 1);
  w.px(0xcaeeff, 0, 0, 1, 16);
  w.px(0x74b4d4, 0, 15, 16, 1);
  w.px(0x82bedc, 15, 0, 1, 16);
  // Cleaved facets catching the light from the top-left.
  w.px(0x8ac9e6, 3, 4, 7, 5);
  w.px(0xd4f2ff, 3, 4, 7, 1);
  w.px(0xd4f2ff, 3, 4, 1, 5);
  w.px(0x86c6e4, 9, 10, 5, 4);
  w.px(0xc6ecfc, 9, 10, 5, 1);
  // Frost bloom and a couple of trapped bubbles.
  w.px(0xffffff, 6, 2, 3, 1, 0.5);
  w.px(0xffffff, 12, 6, 1, 3, 0.4);
  w.px(0xffffff, 5, 12, 2, 1, 0.35);
  w.px(0x6ca8c8, 11, 3, 1, 1);
  w.px(0x6ca8c8, 4, 11, 1, 1);
}

function drawRopeTile(g) {
  const w = makeWriter(g);
  // Velvet rope stanchion on the carpet it guards.
  tileFrame(w, 0x2a2010, 0x3a2a14, 0x1a1408);
  ditherWeave(w, 1, 1, 14, 14, 0x3a2a14, 0x342410);
  // Post
  w.px(OUTLINE, 6, 2, 4, 13);
  w.px(0xc4a030, 7, 3, 2, 11);
  w.px(0xe8c547, 7, 3, 1, 11);
  w.px(0x8a6018, 9, 3, 1, 11);
  // Finial and base
  w.px(OUTLINE, 5, 1, 6, 3);
  w.px(0xe8c547, 6, 2, 4, 2);
  w.px(0xffe890, 6, 2, 2, 1);
  w.px(OUTLINE, 4, 13, 8, 3);
  w.px(0xc4a030, 5, 14, 6, 2);
  w.px(0xe8c547, 5, 14, 4, 1);
  // Swagged velvet either side
  w.px(0x5a0a20, 0, 5, 6, 4);
  w.px(0x8a1030, 0, 6, 6, 3);
  w.px(0xb03048, 0, 6, 6, 1);
  w.px(0x5a0a20, 10, 5, 6, 4);
  w.px(0x8a1030, 10, 6, 6, 3);
  w.px(0xb03048, 10, 6, 6, 1);
  w.px(0xd05068, 1, 6, 2, 1, 0.6);
  w.px(0xd05068, 13, 6, 2, 1, 0.6);
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
  [TILE.ROAD]: drawRoadTile,
  [TILE.SAND]: drawSandTile,
  [TILE.STAGE]: drawStageTile,
  [TILE.SPA]: drawSpaTile,
  [TILE.GLASS]: drawGlassTile,
  [TILE.ROPE]: drawRopeTile,
  [TILE.ICE]: drawIceTile,
  [TILE.PATH]: drawPathTile,
  [TILE.TRIM]: drawTrimTile,
};

/**
 * Wide floors otherwise read as wallpaper, because every tile repeats on an
 * exact 32px grid. Each of these gets a few extra variants with a sparse scuff
 * pattern laid over the base draw — too faint to notice on one tile, enough to
 * hide the grid across a ballroom.
 */
const SCUFFED_FLOORS = new Set([
  TILE.LOBBY, TILE.CARPET, TILE.FELT, TILE.VIP,
  TILE.ROAD, TILE.SAND, TILE.SPA, TILE.PATH, TILE.ICE,
]);

const SCUFFS = [
  [[2, 3, 1], [11, 6, 0], [6, 12, 1], [13, 13, 0]],
  [[9, 2, 0], [4, 7, 1], [14, 9, 1], [3, 14, 0]],
  [[6, 1, 1], [13, 4, 0], [1, 9, 0], [10, 13, 1]],
];

function scuff(g, variant) {
  const w = makeWriter(g);
  for (const [x, y, light] of SCUFFS[variant]) {
    w.px(light ? 0xffffff : 0x000000, x, y, 1, 1, light ? 0.07 : 0.1);
  }
}

/**
 * One landmark per floor type, painted onto a single extra variant.
 *
 * These are the details that read as craft close up and as wallpaper when they
 * repeat every 32px, so they get their own texture and appear roughly one tile
 * in five rather than everywhere.
 */
const FLOOR_ACCENTS = {
  // Gold inlay medallion set into the marble.
  [TILE.LOBBY]: (w) => {
    w.px(0xf0e8d8, 6, 6, 4, 4);
    w.px(0xe8c878, 7, 7, 2, 2);
    w.px(0xffe890, 7, 7, 1, 1);
  },
  // Tar seams sealing a crack, and nothing louder. Accents land on roughly one
  // tile in five, which is often enough that anything with a recognisable
  // shape — the storm drain and the lane paint that lived here before — lines
  // itself up into visible diagonal rows across the boulevard.
  [TILE.ROAD]: (w) => {
    w.px(0x33323e, 1, 4, 7, 1);
    w.px(0x33323e, 7, 5, 6, 1);
    w.px(0x33323e, 4, 11, 9, 1);
    w.px(0x474655, 1, 4, 7, 1, 0.25);
    w.px(0x474655, 4, 11, 9, 1, 0.25);
  },
  // Damp patch around a spa drain.
  [TILE.SPA]: (w) => {
    w.px(0xffffff, 5, 5, 6, 6, 0.06);
    w.px(0x000000, 7, 7, 2, 2, 0.12);
  },
  // Footprints crossing the sand.
  [TILE.SAND]: (w) => {
    w.px(0x000000, 4, 4, 2, 3, 0.1);
    w.px(0x000000, 9, 9, 2, 3, 0.1);
  },
  // A hairline crack in the ice with meltwater sitting in it.
  [TILE.ICE]: (w) => {
    w.px(0x6ea8c6, 2, 11, 5, 1);
    w.px(0x6ea8c6, 7, 10, 4, 1);
    w.px(0xeaf8ff, 2, 10, 5, 1, 0.6);
    w.px(0xffffff, 12, 2, 2, 2, 0.45);
  },
};

const variantCount = (tile) => SCUFFS.length + (FLOOR_ACCENTS[tile] ? 1 : 0);

/** Every ground texture key createGameTextures() will register. */
export function groundTextureKeys() {
  const keys = [];
  for (const id of Object.keys(TILE_DRAWERS)) {
    keys.push(`tile_${id}`);
    if (!SCUFFED_FLOORS.has(Number(id))) continue;
    for (let v = 0; v < variantCount(Number(id)); v += 1) keys.push(`tile_${id}_s${v}`);
  }
  return keys;
}

/** Texture key for a ground tile at a map position, spreading the variants. */
export function groundTileKey(tile, x, y) {
  if (!SCUFFED_FLOORS.has(tile)) return `tile_${tile}`;
  const variant = (x * 5 + y * 3 + ((x * y) % 7)) % (variantCount(tile) + 1);
  return variant === 0 ? `tile_${tile}` : `tile_${tile}_s${variant - 1}`;
}

// ─── Decor & UI sprites ──────────────────────────────────────────────────────

/** Speech balloon with a gold "!" — the same read as a DS interaction cue. */
/** Paint a grid of legend characters, one pixel per character. */
function paintGrid(w, rows, legend, top = 0) {
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const entry = legend[ch];
      if (entry) w.px(entry[0], x, top + y, 1, 1, entry[1]);
    });
  });
}

const INTERACT_GRID = [
  "...OOOOOOOOOO...",
  ".OOWWWWWWWWWWOO.",
  ".OWWWWWWWWWWWWO.",
  ".OWWWWOGGOWWWWO.",
  ".OWWWWOGGOWWWWO.",
  ".OWWWWOGGOWWWWO.",
  ".OWWWWOGgOWWWWO.",
  ".OWWWWWggWWWWWO.",
  ".OWWWWWWWWWWWWO.",
  ".OWWWWOGGOWWWWO.",
  ".OOWWWOGgOWWWOO.",
  "...OOWWWWWWOO...",
  "....OOWWWWO.....",
  ".....OOOO.......",
];

function drawInteractIcon(g) {
  const w = makeWriter(g);
  const legend = {
    O: [OUTLINE, 1],
    W: [0xfff6e0, 1],
    G: [0xf0c840, 1],
    g: [0xb88818, 1],
  };
  paintGrid(w, INTERACT_GRID, legend, 0);
  // Top-left light, bottom-right falloff, same rule the tiles follow.
  w.px(0xffffff, 3, 2, 4, 1);
  w.px(0xe4d6b8, 2, 10, 3, 1);
  w.px(0xe4d6b8, 11, 8, 3, 1);
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

/**
 * Fixtures the world files list among the NPCs because you walk up and press
 * A on them. They are furniture, not guests, so they get their own art instead
 * of a character sheet. Drawn a tile and a half tall on the same 16-unit grid,
 * standing on the bottom edge of their tile.
 */
export const PROP_HEIGHT = 24;

/**
 * The lobby lion, seated on a plaqued plinth.
 *
 * Gold on a gold carpet needs a hard dark edge or the whole thing dissolves
 * into the floor, so every silhouette pixel is spelled out rather than filled
 * with overlapping rectangles.
 */
const STATUE_GRID = [
  "................",
  "....OOO..OOO....",
  "...OMMMOOMMMO...",
  "..OMMMMMMMMMMO..",
  ".OHMMMMMMMMMMSO.",
  ".OHMMGGGGGGMMSO.",
  ".OHMMGDGGDGMMSO.",
  ".OHMMGGHHGGMMSO.",
  ".OHMMGGDDGGMMSO.",
  ".OHMMMGSSGMMMSO.",
  ".OHMMMMSSMMMMSO.",
  "..OHMMMMMMMMSO..",
  "...OHMMMMMMSO...",
  "...OGGGGGGGSO...",
  "..OHGGGGGGGGSO..",
  "..OHGGMSSMGGSO..",
  ".OHHGGMSSMGGHSO.",
  ".EEEEEEEEEEEEEE.",
  ".OPPPPPPPPPPPPO.",
  ".OPppppppppppqO.",
  ".OPppEEEEEEppqO.",
  ".OPppppppppppqO.",
  ".OqqqqqqqqqqqqO.",
  ".OOOOOOOOOOOOOO.",
];

function drawStatueProp(g) {
  paintGrid(makeWriter(g), STATUE_GRID, {
    O: [OUTLINE, 1],
    H: [0xffe890, 1],
    G: [0xf0d050, 1],
    M: [0xc8a030, 1],
    S: [0x8a6c18, 1],
    D: [0x4a3608, 1],
    E: [0xe8c547, 1],
    P: [0x6a6280, 1],
    p: [0x443c5c, 1],
    q: [0x262038, 1],
  });
}

function drawDoorProp(g) {
  const w = makeWriter(g);
  // Frame and leaf
  w.px(OUTLINE, 1, 0, 14, 24);
  w.px(0x4a3524, 2, 1, 12, 23);
  w.px(0x6b4c31, 3, 2, 10, 21);
  w.px(0x835f3c, 3, 2, 10, 1);
  w.px(0x835f3c, 3, 2, 1, 21);
  w.px(0x3a2818, 12, 3, 1, 20);
  // Recessed panels
  w.px(0x53381f, 4, 4, 8, 7);
  w.px(0x7a5738, 4, 4, 8, 1);
  w.px(0x53381f, 4, 13, 8, 7);
  w.px(0x7a5738, 4, 13, 8, 1);
  // Number plate and handle
  w.px(0xe8c547, 5, 6, 6, 3);
  w.px(0xffe890, 5, 6, 6, 1);
  w.px(0x8a6c18, 6, 7, 1, 1);
  w.px(0x8a6c18, 8, 7, 1, 1);
  w.px(0x8a6c18, 10, 7, 1, 1);
  w.px(OUTLINE, 10, 12, 3, 2);
  w.px(0xd8c8a0, 10, 12, 3, 1);
  w.px(0xffffff, 10, 12, 1, 1);
}

function drawKioskProp(g) {
  const w = makeWriter(g);
  // Pedestal cabinet
  w.px(OUTLINE, 2, 4, 12, 20);
  w.px(0x1a2030, 3, 5, 10, 18);
  w.px(0x2c3648, 3, 5, 10, 1);
  w.px(0x11161f, 3, 22, 10, 1);
  // Angled screen with a menu on it
  w.px(OUTLINE, 2, 4, 12, 10);
  w.px(0x0a1018, 3, 5, 10, 8);
  w.px(0x1a4060, 4, 6, 8, 6);
  w.px(0x48d8e8, 4, 6, 8, 1);
  w.px(0x6ae8f0, 5, 6, 4, 1);
  w.px(0xf0d050, 4, 8, 5, 1);
  w.px(0x9fb4c8, 4, 10, 6, 1);
  w.px(0x9fb4c8, 4, 11, 4, 1);
  // Keypad and card slot
  w.px(0x2c3648, 4, 15, 8, 4);
  w.px(0x5a6a80, 5, 16, 2, 1);
  w.px(0x5a6a80, 8, 16, 2, 1);
  w.px(0x5a6a80, 5, 18, 2, 1);
  w.px(0x5a6a80, 8, 18, 2, 1);
  w.px(0xe8c547, 4, 20, 8, 1);
  // Screen glow spilling onto the floor
  w.px(0x48d8e8, 2, 13, 12, 2, 0.14);
}

/** Standalone sprites, keyed by the texture name the scene looks them up by. */
const SPRITE_DRAWERS = {
  decor_bar: drawBarDecor,
  decor_plant: drawPlantDecor,
  decor_slot: drawSlotDecor,
  decor_screen: drawScreenDecor,
  decor_glass: drawGlassTile,
  decor_rope: drawRopeTile,
  interact_icon: drawInteractIcon,
  prop_statue: drawStatueProp,
  prop_door: drawDoorProp,
  prop_kiosk: drawKioskProp,
};

/** Sprites that are not a square tile tall, in art units. */
const ART_HEIGHTS = {
  interact_icon: 14,
  prop_statue: PROP_HEIGHT,
  prop_door: PROP_HEIGHT,
  prop_kiosk: PROP_HEIGHT,
};

/** Height of one art key in art units — 16 unless it is listed above. */
export const artHeightUnits = (key) => ART_HEIGHTS[key] ?? ART_UNIT;

/**
 * The handful of "NPCs" that are really furniture, and the art they use.
 *
 * The world files list them alongside the staff because you talk to them the
 * same way, but drawing them from a character sheet put a person where the
 * dialogue says there is a statue, a door or a kiosk.
 */
export const NPC_PROPS = {
  lobby_statue: "prop_statue",
  hotel_room_door: "prop_door",
  room_console: "prop_kiosk",
  photo_kiosk: "prop_kiosk",
  salon_cage: "prop_kiosk",
  minibar: "decor_bar",
};

/** Every art key the overworld registers at boot. */
export function artKeys() {
  return [
    ...Object.keys(TILE_DRAWERS).map((id) => `tile_${id}`),
    ...Object.keys(SPRITE_DRAWERS),
  ];
}

/**
 * Draw one art key onto a 2D canvas at `pixelScale` screen pixels per art unit.
 *
 * The scene draws through Phaser Graphics; this is the same drawer against a
 * canvas, for previews, portraits and headless checks.
 */
export function drawArtToCanvas(canvas, key, pixelScale = SCALE) {
  const drawer = key.startsWith("tile_")
    ? TILE_DRAWERS[key.slice("tile_".length)]
    : SPRITE_DRAWERS[key];
  if (!drawer) throw new Error(`unknown art key "${key}"`);
  const ctx = canvas.getContext("2d");
  canvas.width = ART_UNIT * pixelScale;
  canvas.height = artHeightUnits(key) * pixelScale;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvasScale = pixelScale;
  try {
    drawer(canvas);
  } finally {
    canvasScale = SCALE;
  }
}

export function createGameTextures(scene) {
  for (const [id, drawer] of Object.entries(TILE_DRAWERS)) {
    makeTex(scene, `tile_${id}`, drawer);
    const tile = Number(id);
    if (!SCUFFED_FLOORS.has(tile)) continue;
    SCUFFS.forEach((_, variant) => {
      makeTex(scene, `tile_${id}_s${variant}`, (g) => {
        drawer(g);
        scuff(g, variant);
      });
    });
    const accent = FLOOR_ACCENTS[tile];
    if (accent) {
      makeTex(scene, `tile_${id}_s${SCUFFS.length}`, (g) => {
        drawer(g);
        accent(makeWriter(g));
      });
    }
  }

  for (const [key, drawer] of Object.entries(SPRITE_DRAWERS)) {
    makeTex(scene, key, drawer, TILE_SIZE, artHeightUnits(key) * SCALE);
  }
}

