import { ART_UNIT, TILE, TILE_SIZE } from "./MapTiles.js";
import {
  appearanceTextureBase,
  normalizeAppearance,
  resolvePalette,
} from "./CharacterAppearance.js";

/**
 * Production-grade procedural pixel textures — 16px art grid, 2× upscale.
 * Consistent top-left lighting, 4–5 tone palettes, DS/Pokémon polish.
 */

const SCALE = TILE_SIZE / ART_UNIT;
/** Characters are authored at 2× the tile art unit for lapels, bow ties, and facial detail. */
const CHAR_W = ART_UNIT * 2;
const CHAR_H = 44;
/** One art pixel → one texture pixel so the 32×44 grid keeps the same on-screen footprint. */
const CHAR_SCALE = 1;
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

function mix(a, b, t) {
  const ch = (shift) => {
    const av = (a >> shift) & 0xff;
    const bv = (b >> shift) & 0xff;
    return clamp(Math.round(av + (bv - av) * t), 0, 255);
  };
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
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
  const w = makeWriter(g);
  // Off-map filler: near-black with a faint weave so it reads as depth, not a hole.
  w.px(0x040308, 0, 0, 16, 16);
  ditherWeave(w, 0, 0, 16, 16, 0x070510, 0x040308);
  w.px(0x0a0818, 4, 4, 8, 8);
  w.px(0x100c20, 7, 7, 2, 2);
}

function drawRoadTile(g) {
  const w = makeWriter(g);
  // Porte-cochère asphalt: coarse aggregate, oil sheen, worn lane paint.
  w.px(0x22212a, 0, 0, 16, 16);
  ditherWeave(w, 0, 0, 16, 16, 0x2a2933, 0x24232d);
  w.px(0x33323d, 1, 1, 6, 3);
  w.px(0x2e2d38, 9, 5, 6, 4);
  w.px(0x1a1922, 3, 6, 4, 1);
  w.px(0x1a1922, 9, 11, 5, 1);
  w.px(0x15141c, 4, 13, 3, 1);
  w.px(0x3d3c48, 12, 2, 2, 1);
  w.px(0x3d3c48, 2, 10, 2, 1);
  // Lane stripe, sun-bleached and chipped
  w.px(0x8a8770, 0, 7, 16, 2);
  w.px(0xa8a58c, 0, 7, 16, 1);
  w.px(0x6a6752, 5, 7, 2, 2);
  w.px(0x6a6752, 12, 8, 3, 1);
  w.px(0x2a2933, 8, 7, 1, 2);
  w.px(0x4a4956, 0, 15, 16, 1);
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
  TILE.ROAD, TILE.SAND, TILE.SPA, TILE.PATH,
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

/** Texture key for a ground tile at a map position, spreading the variants. */
export function groundTileKey(tile, x, y) {
  if (!SCUFFED_FLOORS.has(tile)) return `tile_${tile}`;
  const variant = (x * 5 + y * 3 + ((x * y) % 7)) % (SCUFFS.length + 1);
  return variant === 0 ? `tile_${tile}` : `tile_${tile}_s${variant - 1}`;
}

const TEX_CHAR_W = CHAR_W * CHAR_SCALE;
const TEX_CHAR_H = CHAR_H * CHAR_SCALE;

// ─── Characters ──────────────────────────────────────────────────────────────

/**
 * Characters are authored as pixel grids rather than stacked rectangles: one
 * character per pixel, 32 wide × 44 tall, read against a palette legend. The
 * default silhouette is a black-tie tuxedo (lapels, bow tie, white shirt, satin
 * trouser stripe). The upper body is separate from the legs so a walk cycle only
 * has to swap the leg block and bob the body a pixel, the way DS sprites do.
 */

const CHAR_LEGEND = (palette) => {
  const { body, mid, shade: outfit, hair, hairShade, skinLight, skinMid, skinShade } = palette;
  const jacketHi = mix(body, 0xffffff, 0.18);
  const satin = mix(mid, 0xffffff, 0.12);
  return {
    O: [OUTLINE, 1],
    o: [OUTLINE_SOFT, 1],
    H: [hair, 1],
    h: [hairShade, 1],
    G: [mix(hair, 0xffffff, 0.22), 1],
    S: [skinLight, 1],
    s: [skinMid, 1],
    d: [skinShade, 1],
    e: [0xfffaf2, 1],
    p: [OUTLINE, 1],
    c: [mix(skinMid, 0xe06878, 0.5), 1],
    // Jacket / tuxedo body — outfit colour (tuxedo defaults to near-black).
    B: [body, 1],
    M: [mid, 1],
    D: [outfit, 1],
    W: [jacketHi, 1],
    b: [shade(outfit, 0.55), 1],
    // Satin lapel face (slightly brighter than the jacket mid).
    R: [satin, 1],
    r: [mix(outfit, satin, 0.45), 1],
    // Dress shirt.
    w: [0xf7f4ee, 1],
    u: [0xd8d2c6, 1],
    // Bow tie — classic black with a deep crimson knot highlight.
    Y: [0x14141c, 1],
    y: [0x8a2030, 1],
    // Studs / cufflinks / buckle.
    L: [0xf4dc84, 1],
    // Formal trousers (charcoal) with a satin outer stripe (A/a).
    N: [0x1a1a28, 1],
    n: [0x101018, 1],
    A: [0x3a3a4e, 1],
    a: [0x2a2a3a, 1],
    k: [0x14141c, 1],
    K: [0x3a3a48, 1],
    ",": [0x000000, 0.16],
    ";": [0x000000, 0.26],
  };
};

/** Head, tuxedo torso and arms: 29 rows. */
const CHAR_BODY = {
  down: [
    ".............OOOOOO.............",
    "...........OOhhhhhhOO...........",
    "..........OhGGHHHHHhO...........",
    ".........OHGGHHHHHHhO...........",
    ".........OHSSSSSSSShO...........",
    ".........OHSSSSSSSShO...........",
    ".........OHsSSSSSSshO...........",
    ".........OHOOSSSSOOhO...........",
    ".........OHepSSpSehO............",
    "..........OcSSSSScO.............",
    "...........OssssO...............",
    "..........OdsssdO...............",
    "........OOOOYYYYOOOO............",
    ".......OWMRRYyyYRRMWO...........",
    "......OWMRRRwwwwRRRMWO..........",
    ".....OWBBBRRwwwwRRBBBWO.........",
    "....OWBBBBBRwwwwRBBBBBWO........",
    "....OBBBBBBRwwwwRBBBBBBO........",
    "....OBBBBBBRwuuwRBBBBBBO........",
    "...OoBBBBBBBwLLwBBBBBBBoO.......",
    "...OoBBBBBBBwLLwBBBBBBBoO.......",
    "...OoBBBBBBBBwwBBBBBBBBoO.......",
    "...OSBBBBBBBBwwBBBBBBBBSO.......",
    "....OBBBBBBBBwwBBBBBBBBO........",
    "....OBBBBBBBBwwBBBBBBBBO........",
    "....OBBBBBBBBBuBBBBBBBBO........",
    "....ObbbbbbbbbbbbbbbbbO.........",
    ".....ObbbbbbbbbbbbbbbO..........",
    "......OOOOOOOOOOOOOO............",
  ],
  up: [
    ".............OOOOOO.............",
    "...........OOhhhhhhOO...........",
    "..........OhGGHHHHHhO...........",
    ".........OHGGHHHHHHhO...........",
    ".........OHHHHHHHHhO............",
    ".........OHHHHHHHHhO............",
    ".........OHHHHHHHhhO............",
    ".........OHHHHHHHhhO............",
    "..........OhhhhhhO..............",
    "...........OhsshO...............",
    "...........OdssdO...............",
    "..........OOOOOOOO..............",
    "........OOWMMMMMMWOO............",
    ".......OWMRRRRRRRRMWO...........",
    "......OWMRRRRRRRRRRMWO..........",
    ".....OWBBBRRRRRRRRBBBWO.........",
    "....OWBBBBBRRRRRRBBBBBWO........",
    "....OBBBBBBBBBBBBBBBBBBO........",
    "....OBBBBBBBBBBBBBBBBBBO........",
    "...OoBBBBBBBBBBBBBBBBBBoO.......",
    "...OoBBBBBBBBBBBBBBBBBBoO.......",
    "...OoBBBBBBBBBBBBBBBBBBoO.......",
    "...OSBBBBBBBBBBBBBBBBBBSO.......",
    "....OBBBBBBBBBBBBBBBBBBO........",
    "....OBBBBBBBBBBBBBBBBBBO........",
    "....OBBBBBBBBBBBBBBBBBBO........",
    "....ObbbbbbbbbbbbbbbbbO.........",
    ".....ObbbbbbbbbbbbbbbO..........",
    "......OOOOOOOOOOOOOO............",
  ],
  left: [
    "..............OOOOOO............",
    "............OOhhhhhhO...........",
    "...........OGHHHHHHhO...........",
    "..........OHHHHHHHhhO...........",
    "..........OSSSSHHHhhO...........",
    "..........OSSSSHHHhhO...........",
    "..........OOOSSSHHhhO...........",
    "..........OepSdSHHhhO...........",
    "..........OcSSdHHhhO............",
    "...........OdSshhO..............",
    "...........OdssO................",
    "..........OOOOOOO...............",
    "........OOWMMMMMMO..............",
    ".......OWMRRRRRRMO..............",
    "......OWMRRRwwwwRMO.............",
    ".....OWBBBRwwwwRRBO.............",
    "....OWBBBBRwwwwRBBO.............",
    "....OBBBBBRwuuwRBBO.............",
    "....OBBBBBBwLLwBBBO.............",
    "...OoBBBBBBwLLwBBBoO............",
    "...OoBBBBBBBwwBBBBoO............",
    "...OoBBBBBBBwwBBBBoO............",
    "...OSBBBBBBBwwBBBBSO............",
    "....OBBBBBBBwwBBBBO.............",
    "....OBBBBBBBuBBBBBO.............",
    "....OBBBBBBBBBBBBBO.............",
    "....ObbbbbbbbbbbbO..............",
    ".....ObbbbbbbbbbO...............",
    "......OOOOOOOOOO................",
  ],
};

/** Legs, satin stripe, shoes and contact shadow: 14 rows × 3 walk frames. */
const CHAR_LEGS = [
  [
    "......ONNAAAAAANNO..............",
    "......ONNAAAAAnnO...............",
    "......ONNNAAAnnnO...............",
    "......ONNNnOOnnnO...............",
    "......ONNNnOOnnnO...............",
    "......OnnnnOOnnnO...............",
    "......OnnnnOOnnnO...............",
    "......OnnnnOOnnnO...............",
    "......OKkkkOOKkkO...............",
    "......OKkkkOOKkkO...............",
    ".....,OOOOO,,OOOO,..............",
    ".....,OOOO,,,,OOOO,.............",
    "......;;;;;;;;..................",
    ".......;;;;;;...................",
  ],
  [
    "......ONNAAAAAANNO..............",
    "......ONNAAAAAnnO...............",
    "......ONNNAAAnnnO...............",
    "......ONNNnOOnnnO...............",
    "......ONNNnOOnnnO...............",
    "......OKkkkOOnnnO...............",
    "......OKkkkOOnnnO...............",
    "............OnnnO...............",
    "............OKkkO...............",
    "............OKkkO...............",
    ".....,,,,,,OOOOOO,..............",
    ".....,,,,,OOOOOOO,..............",
    "......;;;;;;;;..................",
    ".......;;;;;;...................",
  ],
  [
    "......ONNAAAAAANNO..............",
    "......ONNAAAAAnnO...............",
    "......ONNNAAAnnnO...............",
    "......ONNNnOOnnnO...............",
    "......ONNNnOOnnnO...............",
    "......OnnnnOOKkkO...............",
    "......OnnnnOOKkkO...............",
    "......OnnnO.....................",
    "......OKkkO.....................",
    "......OKkkO.....................",
    ".....,OOOOOO,,,,,,..............",
    ".....,OOOOOOO,,,,,..............",
    "......;;;;;;;;..................",
    ".......;;;;;;...................",
  ],
];

const BODY_TOP = 1;
const LEGS_TOP = 30;


const mirrorRows = (rows) => rows.map((row) => [...row].reverse().join(""));

const CHAR_BODY_BY_DIR = { ...CHAR_BODY, right: mirrorRows(CHAR_BODY.left) };

/** Paint a grid, merging horizontal runs of one colour into a single rect. */
function paintGrid(w, rows, legend, top) {
  rows.forEach((row, index) => {
    const y = top + index;
    if (y < 0) return;
    let run = 0;
    while (run < row.length) {
      const ch = row[run];
      let width = 1;
      while (row[run + width] === ch) width += 1;
      const paint = ch === "." ? null : legend[ch];
      if (paint) w.px(paint[0], run, y, width, 1, paint[1]);
      run += width;
    }
  });
}

function drawCharacterPixels(w, palette, dir, frame) {
  const legend = CHAR_LEGEND(palette);
  const legs = CHAR_LEGS[frame] ?? CHAR_LEGS[0];
  const body = CHAR_BODY_BY_DIR[dir] ?? CHAR_BODY_BY_DIR.down;
  // Frames 1 and 2 lift a foot, so the upper body rides a pixel higher. The leg
  // block always starts at row 15, which keeps the waist joined either way.
  const bob = frame === 0 ? 0 : -1;
  paintGrid(w, legs, legend, LEGS_TOP);
  paintGrid(w, body, legend, BODY_TOP + bob);
}

/** The authored grids, so tests can assert their shape and legend coverage. */
export function characterGrids() {
  return {
    legend: Object.keys(CHAR_LEGEND(resolvePalette({}))),
    rowWidth: CHAR_W,
    bodyRows: 29,
    legRows: 14,
    body: CHAR_BODY_BY_DIR,
    legs: CHAR_LEGS,
  };
}

function drawCharacter(g, palette, dir, frame) {
  drawCharacterPixels(makeWriter(g), palette, dir, frame);
}

/** Draw character to a 2D canvas (for previews and dialogue portraits). */
export function drawCharacterToCanvas(canvas, palette, dir = "down", frame = 0, pixelScale = 2) {
  const ctx = canvas.getContext("2d");
  const w = CHAR_W * pixelScale;
  const h = CHAR_H * pixelScale;
  canvas.width = w;
  canvas.height = h;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);
  drawCharacterPixels(makeWriter(canvas, pixelScale), palette, dir, frame);
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

// ─── Decor & UI sprites ──────────────────────────────────────────────────────

/** Speech balloon with a gold "!" — the same read as a DS interaction cue. */
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

/** Standalone sprites, keyed by the texture name the scene looks them up by. */
const SPRITE_DRAWERS = {
  decor_bar: drawBarDecor,
  decor_plant: drawPlantDecor,
  decor_slot: drawSlotDecor,
  decor_screen: drawScreenDecor,
  decor_glass: drawGlassTile,
  decor_rope: drawRopeTile,
  interact_icon: drawInteractIcon,
};

/** Every art key the overworld registers at boot. */
export function artKeys() {
  return [
    ...Object.keys(TILE_DRAWERS).map((id) => `tile_${id}`),
    ...Object.keys(SPRITE_DRAWERS),
  ];
}

/**
 * Draw one art key onto a 2D canvas. The scene draws through Phaser Graphics;
 * this is the same drawer against a canvas, for previews and headless checks.
 */
export function drawArtToCanvas(canvas, key) {
  const drawer = key.startsWith("tile_")
    ? TILE_DRAWERS[key.slice("tile_".length)]
    : SPRITE_DRAWERS[key];
  if (!drawer) throw new Error(`unknown art key "${key}"`);
  const ctx = canvas.getContext("2d");
  canvas.width = TILE_SIZE;
  canvas.height = TILE_SIZE;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawer(canvas);
}

export function createGameTextures(scene) {
  for (const [id, drawer] of Object.entries(TILE_DRAWERS)) {
    makeTex(scene, `tile_${id}`, drawer);
    if (!SCUFFED_FLOORS.has(Number(id))) continue;
    SCUFFS.forEach((_, variant) => {
      makeTex(scene, `tile_${id}_s${variant}`, (g) => {
        drawer(g);
        scuff(g, variant);
      });
    });
  }

  const npcs = [
    ["npc_gold", 0xf0d050, 0xc8a838, 0x987820, 0x685010, 0x504008],
    ["npc_green", 0x50e8a0, 0x38b878, 0x288858, 0x186040, 0x104030],
    ["npc_pink", 0xd888f0, 0xa868c0, 0x7848a0, 0x503070, 0x382050],
    ["npc_teal", 0x48d8e8, 0x30a8b8, 0x208898, 0x1a6070, 0x104050],
    ["npc_red", 0xf08088, 0xc86068, 0x984048, 0x682830, 0x481820],
    ["npc_orange", 0xffb060, 0xd89048, 0xa86830, 0x784820, 0x503010],
    ["npc_silver", 0xc0c8d8, 0x9098a8, 0x606878, 0x404850, 0x303038],
  ];
  for (const [key, body, mid, shade, hair, hairShade] of npcs) {
    const palette = {
      body, mid, shade, hair, hairShade,
      skinLight: 0xffe8d0, skinMid: 0xffd8b8, skinShade: 0xffc8a8,
    };
    makeTex(scene, key, (g) => drawCharacter(g, palette, "down", 0), TEX_CHAR_W, TEX_CHAR_H);
  }

  makeTex(scene, "decor_bar", drawBarDecor);
  makeTex(scene, "decor_plant", drawPlantDecor);
  makeTex(scene, "decor_slot", drawSlotDecor);
  makeTex(scene, "decor_screen", drawScreenDecor);
  makeTex(scene, "decor_glass", drawGlassTile);
  makeTex(scene, "decor_rope", drawRopeTile);
  makeTex(scene, "interact_icon", drawInteractIcon, TILE_SIZE, TILE_SIZE * 0.875);
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
