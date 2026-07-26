import { ART_UNIT, TILE, TILE_SIZE } from "./MapTiles.js";
import {
  appearanceTextureBase,
  normalizeAppearance,
  resolvePalette,
} from "./CharacterAppearance.js";

/**
 * Production-grade procedural pixel textures — 16px art grid, 2× upscale.
 * Consistent top-left lighting, clustered dither, selective colored outlines,
 * and animated water — Chrono Trigger / modern SNES-era polish.
 */

const SCALE = TILE_SIZE / ART_UNIT;
/** Characters are authored at 2× the tile art unit for lapels, bow ties, and facial detail. */
const CHAR_W = ART_UNIT * 2;
const CHAR_H = 44;
/** One art pixel → one texture pixel so the 32×44 grid keeps the same on-screen footprint. */
const CHAR_SCALE = 1;
/** Selective outline: cool charcoal, never pure black — keeps sprites soft against busy floors. */
const OUTLINE = 0x241c30;
const OUTLINE_SOFT = 0x3a3048;
/** Water animation frames registered at boot and cycled by the overworld. */
export const WATER_FRAMES = 3;

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

function px(g, color, scale, x, y, w = 1, h = 1, alpha = 1) {
  g.fillStyle(color, alpha);
  g.fillRect(x * scale, y * scale, w * scale, h * scale);
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
    px: (color, x, y, w, h, alpha) => px(target, color, scale, x, y, w, h, alpha),
  };
}

// ─── Fine-detail rendering ─────────────────────────────────────────────────
/**
 * Everything above draws on the 16-unit art grid at 2×. The helpers below
 * write at true output resolution (1 unit = 1 screen pixel) so grain, glow,
 * and gradients read as continuous texture instead of blown-up blocks — the
 * difference between a photographed felt swatch and a green rectangle.
 *
 * Every helper here is alpha-blended (never opaque) so it layers over the
 * macro shapes above without disturbing the opacity contract ground tiles
 * must keep (see smoke-test-rpg.mjs's per-tile coverage check).
 */

/** A fine writer for a TILE_SIZE-square texture: coordinates are real pixels. */
function fineWriter(target) {
  return makeWriter(target, 1);
}

/** Deterministic pseudo-random 0..1 — stable across reloads, no runtime jitter. */
function hash(x, y, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

/**
 * Per-pixel speckle across a region — wood grain, felt nap, sand grit, marble
 * fleck, asphalt aggregate. `tones` is a list of [color, alpha] pairs; each
 * struck pixel picks one deterministically so the pattern never flickers.
 */
function speckle(fine, x0, y0, w0, h0, tones, coverage = 0.16, seed = 0) {
  for (let y = y0; y < y0 + h0; y++) {
    for (let x = x0; x < x0 + w0; x++) {
      const r = hash(x, y, seed);
      if (r >= coverage) continue;
      const [color, alpha] = tones[Math.floor((r / coverage) * tones.length) % tones.length];
      fine.px(color, x, y, 1, 1, Math.min(alpha, 0.92));
    }
  }
}

/**
 * Soft ambient light: brighter along the top-left, a faint cool shadow toward
 * the bottom-right — the same rule the flat edge-highlights already followed,
 * rendered as a smooth multi-band gradient instead of a 1px line.
 */
function ambientLight(fine, w0, h0, { bands = 5, lift = 0.075, drop = 0.06 } = {}) {
  for (let i = 0; i < bands; i++) {
    const t = i / bands;
    const band = h0 / bands;
    fine.px(0xffffff, 0, i * band, w0, band + 1, lift * (1 - t) * (1 - t));
  }
  for (let i = 0; i < bands; i++) {
    const t = i / bands;
    const band = h0 / bands;
    fine.px(0x000000, 0, h0 - (i + 1) * band, w0, band + 1, drop * (1 - t) * (1 - t));
  }
}

/** Soft radial bloom for neon, gold, and glass — concentric fading squares. */
function glow(fine, cx, cy, rings, color) {
  for (const { r, alpha } of rings) {
    fine.px(color, cx - r, cy - r, r * 2, r * 2, Math.min(alpha, 0.92));
  }
}

/** Scattered fixed highlight points, e.g. gold flecks or water sparkle. */
function sparkle(fine, points, color, alpha = 0.6) {
  for (const [x, y] of points) fine.px(color, x, y, 1, 1, Math.min(alpha, 0.92));
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

/**
 * Painterly clustering: 2×2 same-tone blocks with sparse checker breaks —
 * the reference technique that gives volume without noisy Bayer dither.
 */
function clusterDither(w, x0, y0, w0, h0, c1, c2, seed = 0) {
  for (let y = y0; y < y0 + h0; y += 2) {
    for (let x = x0; x < x0 + w0; x += 2) {
      const tone = hash(x, y, seed) > 0.45 ? c1 : c2;
      const bw = Math.min(2, x0 + w0 - x);
      const bh = Math.min(2, y0 + h0 - y);
      w.px(tone, x, y, bw, bh);
      if (hash(x + 3, y + 5, seed + 1) > 0.72 && bw > 1 && bh > 1) {
        w.px(tone === c1 ? c2 : c1, x + 1, y + 1, 1, 1);
      }
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
  const fine = fineWriter(g);
  // Polished cream marble with denser vein network + gold medallion inlay.
  marbleVeins(w, 0xe8e0d0, 0xc8b8a0, 0xd8c8b0);
  w.px(0xb8a890, 5, 6, 4, 1);
  w.px(0xd8c8b0, 6, 6, 2, 1);
  w.px(0xc8b8a0, 12, 11, 1, 3);
  w.px(0xd8c8b0, 13, 12, 1, 1);
  groutGrid(w, 0xb8a890, 8);
  w.px(0xfff8f0, 2, 2, 3, 2);
  w.px(0xfff8f0, 10, 9, 3, 2);
  w.px(0xf0e8d8, 6, 6, 4, 4);
  w.px(0xe8c878, 7, 7, 2, 2);
  w.px(0xffe890, 7, 7, 1, 1);
  w.px(0xffffff, 7, 7, 1, 1, 0.45);
  w.px(0xd0c0a8, 0, 0, 16, 1);
  w.px(0xd0c0a8, 0, 0, 1, 16);
  w.px(0xa89478, 15, 0, 1, 16);
  w.px(0xa89478, 0, 15, 16, 1);
  sparkle(fine, [[6, 5], [20, 8], [14, 18]], 0xffffff, 0.5);
  speckle(fine, 0, 0, TILE_SIZE, TILE_SIZE, [
    [0xf8f0e0, 0.38], [0xa89478, 0.3], [0xffffff, 0.42], [0xc8b898, 0.2],
  ], 0.26, 11);
  ambientLight(fine, TILE_SIZE, TILE_SIZE, { lift: 0.11, drop: 0.05 });
  glow(fine, 15, 15, [{ r: 7, alpha: 0.09 }, { r: 3, alpha: 0.16 }], 0xfff6dc);
}

function drawCarpetTile(g) {
  const w = makeWriter(g);
  const fine = fineWriter(g);
  // Ornate casino carpet: plush maroon field, gold scrollwork, cut-pile nap.
  tileFrame(w, 0x4a0828, 0x6a1840, 0x2a0418);
  ditherWeave(w, 1, 1, 14, 14, 0x6a1038, 0x5a0c30);
  w.px(0x801848, 2, 2, 12, 12);
  // Scroll rings around the medallion (busy floral read without cluttering UI).
  w.px(0x982058, 3, 3, 10, 10);
  w.px(0x801848, 4, 4, 8, 8);
  w.px(0xc8a030, 3, 5, 1, 6);
  w.px(0xc8a030, 12, 5, 1, 6);
  w.px(0xc8a030, 5, 3, 6, 1);
  w.px(0xc8a030, 5, 12, 6, 1);
  w.px(0xe8c547, 4, 4, 1, 1);
  w.px(0xe8c547, 11, 4, 1, 1);
  w.px(0xe8c547, 4, 11, 1, 1);
  w.px(0xe8c547, 11, 11, 1, 1);
  // Ornate medallion
  w.px(0xc8a030, 5, 5, 6, 6);
  w.px(0xe8c547, 6, 6, 4, 4);
  w.px(0xffe890, 7, 7, 2, 2);
  w.px(0x982058, 7, 7, 2, 2);
  w.px(0xfff0b0, 7, 7, 1, 1);
  // Corner flourishes
  w.px(0xc8a030, 2, 2, 2, 2);
  w.px(0xc8a030, 12, 2, 2, 2);
  w.px(0xc8a030, 2, 12, 2, 2);
  w.px(0xc8a030, 12, 12, 2, 2);
  w.px(0xffe890, 3, 3, 1, 1);
  w.px(0xffe890, 13, 13, 1, 1);
  w.px(0x3a0618, 0, 0, 16, 1);
  w.px(0x3a0618, 0, 15, 16, 1);
  speckle(fine, 2, 2, 28, 28, [
    [0x9a2860, 0.32], [0x5c0a30, 0.34], [0xb84878, 0.2], [0xe8c547, 0.1],
  ], 0.24, 23);
  glow(fine, 16, 16, [{ r: 9, alpha: 0.09 }, { r: 5, alpha: 0.14 }, { r: 2, alpha: 0.2 }], 0xffe890);
  ambientLight(fine, TILE_SIZE, TILE_SIZE, { lift: 0.07, drop: 0.07 });
}

function drawFeltTile(g) {
  const w = makeWriter(g);
  const fine = fineWriter(g);
  // Casino baize: multi-tone green nap, gold rail, crisp betting oval.
  w.px(0x0a4828, 0, 0, 16, 16);
  ditherWeave(w, 1, 1, 14, 14, 0x0e5830, 0x0c5030);
  w.px(0x128840, 2, 2, 12, 12);
  w.px(0x18a050, 3, 3, 10, 10);
  w.px(0x20b058, 5, 4, 6, 3);
  w.px(0x0e6838, 4, 10, 8, 2);
  // Gold rail with highlight edge
  w.px(0xc8a030, 0, 0, 16, 1);
  w.px(0xe8c547, 0, 1, 16, 1);
  w.px(0xffe890, 1, 0, 14, 1, 0.5);
  w.px(0xc8a030, 0, 14, 16, 2);
  w.px(0xe8c547, 0, 0, 1, 16);
  w.px(0xe8c547, 15, 0, 1, 16);
  w.px(0xffe890, 1, 1, 1, 1);
  // Betting circle — clearer oval structure
  w.px(0xffffff, 4, 7, 8, 1);
  w.px(0xffffff, 7, 4, 1, 8);
  w.px(0xffffff, 5, 5, 1, 1);
  w.px(0xffffff, 10, 5, 1, 1);
  w.px(0xffffff, 5, 10, 1, 1);
  w.px(0xffffff, 10, 10, 1, 1);
  w.px(0x40e080, 6, 6, 4, 4);
  w.px(0x60ffa0, 7, 7, 2, 2);
  w.px(0xffffff, 7, 7, 1, 1, 0.55);
  speckle(fine, 2, 2, 28, 24, [
    [0x0e6838, 0.32], [0x1cb058, 0.24], [0x083c20, 0.32], [0x40e080, 0.12],
  ], 0.28, 41);
  glow(fine, 16, 16, [{ r: 8, alpha: 0.09 }, { r: 4, alpha: 0.14 }], 0x8affc0);
  ambientLight(fine, TILE_SIZE, TILE_SIZE, { lift: 0.08, drop: 0.06 });
}

function drawWallTile(g) {
  const w = makeWriter(g);
  const fine = fineWriter(g);
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
  // Brushed-plaster grain plus a real bloom under the sconce instead of a
  // flat translucent rectangle.
  speckle(fine, 2, 6, 28, 20, [[0x1c2638, 0.25], [0x0a0e16, 0.28]], 0.16, 5);
  glow(fine, 15, 11, [{ r: 8, alpha: 0.1 }, { r: 5, alpha: 0.16 }, { r: 2, alpha: 0.3 }], 0xffe890);
  ambientLight(fine, TILE_SIZE, TILE_SIZE, { lift: 0.05, drop: 0.08 });
}

function drawPathTile(g) {
  const w = makeWriter(g);
  const fine = fineWriter(g);
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
  // Brushed-metal grain running with the streaks, plus a mirror-polish glow
  // pooling on the gold diamond.
  speckle(fine, 4, 4, 24, 24, [[0xfff4c8, 0.28], [0x8a6018, 0.22]], 0.14, 63);
  glow(fine, 16, 16, [{ r: 10, alpha: 0.06 }, { r: 6, alpha: 0.1 }, { r: 3, alpha: 0.18 }], 0xfff8dc);
  ambientLight(fine, TILE_SIZE, TILE_SIZE, { lift: 0.1, drop: 0.05 });
}

function drawTrimTile(g) {
  const w = makeWriter(g);
  const fine = fineWriter(g);
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
  // Mahogany grain streaking with the wood, plus a soft French-polish sheen.
  speckle(fine, 6, 6, 20, 20, [[0xb08858, 0.3], [0x4a260f, 0.3]], 0.2, 71);
  glow(fine, 15, 15, [{ r: 6, alpha: 0.1 }, { r: 3, alpha: 0.18 }], 0xffe890);
  ambientLight(fine, TILE_SIZE, TILE_SIZE, { lift: 0.06, drop: 0.07 });
}

function drawWaterTile(g, frame = 0) {
  const w = makeWriter(g);
  const fine = fineWriter(g);
  const f = ((frame % WATER_FRAMES) + WATER_FRAMES) % WATER_FRAMES;
  // Deep lagoon base with layered depth — dark floor, mid-water, sunlit cyan.
  w.px(0x0a2840, 0, 0, 16, 16);
  w.px(0x0e3858, 0, 0, 16, 5);
  w.px(0x145878, 0, 4, 16, 5);
  w.px(0x186888, 0, 8, 16, 4);
  w.px(0x124868, 0, 12, 16, 4);
  clusterDither(w, 1, 1, 14, 14, 0x145878, 0x186888, 17 + f);
  // Scaly ripple lattice — phase-shifted per frame so the pool breathes.
  const ox = f;
  const oy = f === 2 ? 1 : 0;
  for (let y = 1; y < 15; y += 3) {
    for (let x = ((y % 6 === 1 ? 0 : 2) + ox) % 14; x <= 13; x += 4) {
      const yy = Math.min(14, y + oy);
      w.px(0x1a7090, x, yy, 3, 1);
      w.px(0x2a98b0, x + 1, yy, 1, 1);
    }
  }
  // Bright caustic streaks travel with the frame.
  const streaks = [
    [1 + f, 2, 5], [8 - (f % 2), 1, 6], [3 + f, 7, 7], [10 - f, 10, 5],
  ];
  for (const [sx, sy, sw] of streaks) {
    w.px(0x4ad4de, sx, sy, sw, 1);
    w.px(0x80f8ff, sx + 1, sy, Math.max(1, sw - 2), 1);
  }
  w.px(0x2a90a8, 0, 5, 16, 1, 0.45);
  w.px(0x2a90a8, 1, 13, 14, 1, 0.4);
  w.px(0xa8f0f8, 0, 15, 16, 1, 0.35);
  w.px(0x6ae8f0, 2 + f, 14, 3, 1, 0.5);
  w.px(0x6ae8f0, 9 - (f % 2), 14, 4, 1, 0.45);
  const sparks = [
    [6 + f * 2, 5], [14, 3 + (f % 2)], [22 - f * 2, 9],
    [10 + f, 15], [26, 19 - f], [4 + f * 3, 22],
  ];
  sparkle(fine, sparks, 0xffffff, 0.65);
  speckle(fine, 0, 0, TILE_SIZE, TILE_SIZE, [
    [0x8af0ff, 0.28], [0x082030, 0.32], [0x4ad4de, 0.22], [0xffffff, 0.2],
  ], 0.18, 29 + f);
  glow(fine, 10 + f * 2, 6, [{ r: 8, alpha: 0.09 }, { r: 4, alpha: 0.16 }], 0x9ef6ff);
  glow(fine, 24 - f * 2, 20, [{ r: 7, alpha: 0.08 }, { r: 3, alpha: 0.14 }], 0x9ef6ff);
  ambientLight(fine, TILE_SIZE, TILE_SIZE, { lift: 0.1, drop: 0.05 });
}

function drawVipTile(g) {
  const w = makeWriter(g);
  const fine = fineWriter(g);
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
  // Black-marble fleck plus a gold-dust shimmer along every vein — the
  // detail that separates painted stone from lacquered slab.
  speckle(fine, 4, 4, 24, 24, [[0x241f30, 0.32], [0x080610, 0.3]], 0.16, 83);
  sparkle(fine, [[5, 7], [17, 5], [9, 19], [23, 15], [13, 9]], 0xffe890, 0.5);
  glow(fine, 15, 15, [{ r: 7, alpha: 0.09 }, { r: 4, alpha: 0.16 }], 0xf4dc84);
  ambientLight(fine, TILE_SIZE, TILE_SIZE, { lift: 0.05, drop: 0.08 });
}

function drawAquaTile(g) {
  const w = makeWriter(g);
  const fine = fineWriter(g);
  // Pool-deck travertine: warm-cool stone checkers with per-tile edge bevels.
  w.px(0x0a1820, 0, 0, 16, 16);
  for (let y = 0; y < 16; y += 4) {
    for (let x = 0; x < 16; x += 4) {
      const warm = ((x + y) / 4) % 2 === 0;
      w.px(warm ? 0x2a4858 : 0x1a3444, x, y, 4, 4);
      w.px(warm ? 0x3a6070 : 0x284858, x, y, 3, 1);
      w.px(warm ? 0x3a6070 : 0x284858, x, y, 1, 3);
      w.px(warm ? 0x142838 : 0x0e2030, x + 3, y, 1, 4);
      w.px(warm ? 0x142838 : 0x0e2030, x, y + 3, 4, 1);
      w.px(warm ? 0x4a7888 : 0x386878, x + 1, y + 1, 1, 1);
    }
  }
  groutGrid(w, 0x0c2030, 4);
  // Wet band where deck meets pool water — foam + caustic.
  w.px(0x1a5060, 0, 11, 16, 5);
  w.px(0x39c5cf, 0, 10, 16, 2);
  w.px(0x6ae8f0, 1, 10, 4, 1);
  w.px(0x80f8ff, 3, 10, 1, 1);
  w.px(0x4ad4de, 7, 11, 6, 1);
  w.px(0x80f8ff, 12, 10, 3, 1, 0.7);
  w.px(0x2a7080, 2, 13, 5, 1);
  w.px(0x2a7080, 10, 14, 4, 1);
  sparkle(fine, [[8, 20], [18, 21], [26, 20]], 0xffffff, 0.55);
  speckle(fine, 0, 0, TILE_SIZE, 20, [
    [0x4a7888, 0.28], [0x0a1c28, 0.3], [0xc8a878, 0.12],
  ], 0.2, 97);
  speckle(fine, 0, 20, TILE_SIZE, 12, [
    [0x8af0ff, 0.3], [0x123844, 0.28], [0xffffff, 0.18],
  ], 0.18, 101);
  glow(fine, 16, 21, [{ r: 9, alpha: 0.09 }, { r: 5, alpha: 0.14 }], 0x9ef6ff);
  ambientLight(fine, TILE_SIZE, TILE_SIZE, { lift: 0.09, drop: 0.05 });
}

function drawPlantTile(g) {
  const w = makeWriter(g);
  const fine = fineWriter(g);
  // Resort landscaping: warm flagstone under dappled tropical canopy.
  tileFrame(w, 0x283028, 0x384838, 0x182018);
  w.px(0x304030, 2, 2, 12, 12);
  clusterDither(w, 2, 2, 12, 12, 0x3a5038, 0x304030, 53);
  // Irregular flagstones with individual bevels.
  const stones = [
    [2, 2, 6, 5, 0x4a5a40], [8, 2, 6, 4, 0x586848],
    [2, 7, 5, 7, 0x425438], [7, 6, 7, 8, 0x506040],
  ];
  for (const [sx, sy, sw, sh, tone] of stones) {
    w.px(tone, sx, sy, sw, sh);
    w.px(mix(tone, 0xffffff, 0.18), sx, sy, sw - 1, 1);
    w.px(mix(tone, 0xffffff, 0.12), sx, sy, 1, sh - 1);
    w.px(shade(tone, 0.7), sx + sw - 1, sy, 1, sh);
    w.px(shade(tone, 0.7), sx, sy + sh - 1, sw, 1);
  }
  // Leaf litter, moss tufts, and bright flora pops (reference clutter density).
  w.px(0x1a5a30, 3, 4, 2, 1);
  w.px(0x2d8a48, 4, 3, 2, 1);
  w.px(0x4acc68, 5, 3, 1, 1);
  w.px(0x70f090, 5, 2, 1, 1);
  w.px(0x1a5a30, 10, 8, 3, 1);
  w.px(0x2d8a48, 11, 7, 2, 1);
  w.px(0x4acc68, 12, 7, 1, 1);
  w.px(0x186028, 6, 11, 3, 1);
  w.px(0x2d8a48, 7, 10, 2, 1);
  w.px(0xc8a848, 9, 5, 1, 1);
  w.px(0xe8c878, 14, 12, 1, 1);
  w.px(0x4a80d0, 4, 9, 1, 1); // bluebell
  w.px(0xe05070, 12, 4, 1, 1); // desert bloom
  w.px(0xf0e8a0, 8, 12, 1, 1); // pale clover
  speckle(fine, 2, 2, 28, 28, [
    [0x789878, 0.28], [0x304430, 0.3], [0x4acc68, 0.16], [0xd8b868, 0.1],
  ], 0.22, 109);
  glow(fine, 10, 8, [{ r: 7, alpha: 0.08 }, { r: 3, alpha: 0.14 }], 0xc8f0c0);
  ambientLight(fine, TILE_SIZE, TILE_SIZE, { lift: 0.08, drop: 0.06 });
}

function drawBarTile(g) {
  const w = makeWriter(g);
  const fine = fineWriter(g);
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
  // Parquet grain running with each plank, plus a lacquer sheen.
  speckle(fine, 2, 2, 12, 12, [[0xb0885a, 0.24], [0x2a180e, 0.28]], 0.16, 113);
  speckle(fine, 18, 2, 12, 12, [[0xb0885a, 0.24], [0x2a180e, 0.28]], 0.16, 127);
  speckle(fine, 2, 18, 12, 12, [[0xb0885a, 0.24], [0x2a180e, 0.28]], 0.16, 131);
  speckle(fine, 18, 18, 12, 12, [[0xb0885a, 0.24], [0x2a180e, 0.28]], 0.16, 137);
  ambientLight(fine, TILE_SIZE, TILE_SIZE, { lift: 0.07, drop: 0.07 });
}

function drawSlotTile(g) {
  const w = makeWriter(g);
  const fine = fineWriter(g);
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
  // Real neon bloom instead of a flat tint strip, plus carpet grain so the
  // aisle floor doesn't read as a single dark rectangle.
  speckle(fine, 2, 2, 28, 28, [[0x3a1838, 0.28], [0x1a0818, 0.3]], 0.16, 139);
  glow(fine, 16, 2, [{ r: 8, alpha: 0.07 }], 0xff4a60);
  glow(fine, 16, 30, [{ r: 8, alpha: 0.07 }], 0x48d8e8);
  glow(fine, 15, 15, [{ r: 6, alpha: 0.08 }, { r: 3, alpha: 0.15 }], 0xffe890);
  ambientLight(fine, TILE_SIZE, TILE_SIZE, { lift: 0.05, drop: 0.08 });
}

function drawScreenTile(g) {
  const w = makeWriter(g);
  const fine = fineWriter(g);
  tileFrame(w, 0x1a1028, 0x2a1838, 0x0c0818);
  ditherWeave(w, 1, 1, 14, 14, 0x221430, 0x1a1028);
  // TV glow spill on carpet
  w.px(0x1a3040, 4, 3, 8, 8, 0.6);
  w.px(0x48d8e8, 5, 4, 6, 5, 0.25);
  w.px(0x6ae8f0, 6, 5, 4, 3, 0.2);
  w.px(0x50e8a0, 5, 9, 6, 2, 0.15);
  w.px(0x304060, 3, 2, 10, 1);
  w.px(0x405080, 4, 3, 8, 1);
  // Soft screen-glow bloom that actually falls off, plus carpet grain.
  speckle(fine, 2, 2, 28, 28, [[0x2a1838, 0.26], [0x140a1e, 0.3]], 0.14, 149);
  glow(fine, 16, 14, [{ r: 10, alpha: 0.06 }, { r: 6, alpha: 0.11 }], 0x6ae8f0);
  ambientLight(fine, TILE_SIZE, TILE_SIZE, { lift: 0.05, drop: 0.07 });
}

function drawVoidTile(g) {
  const w = makeWriter(g);
  const fine = fineWriter(g);
  // Off-map filler: near-black with a faint weave so it reads as depth, not a hole.
  w.px(0x040308, 0, 0, 16, 16);
  ditherWeave(w, 0, 0, 16, 16, 0x070510, 0x040308);
  w.px(0x0a0818, 4, 4, 8, 8);
  w.px(0x100c20, 7, 7, 2, 2);
  speckle(fine, 0, 0, TILE_SIZE, TILE_SIZE, [[0x0c0a18, 0.2], [0x020208, 0.24]], 0.08, 3);
}

function drawRoadTile(g) {
  const w = makeWriter(g);
  const fine = fineWriter(g);
  // Strip asphalt under Nevada sun: warm-grey aggregate, heat shimmer, bleached paint.
  w.px(0x2a2824, 0, 0, 16, 16);
  ditherWeave(w, 0, 0, 16, 16, 0x34322e, 0x2c2a26);
  w.px(0x3e3a34, 1, 1, 6, 3);
  w.px(0x36322e, 9, 5, 6, 4);
  w.px(0x1e1c18, 3, 6, 4, 1);
  w.px(0x1e1c18, 9, 11, 5, 1);
  w.px(0x181610, 4, 13, 3, 1);
  w.px(0x4a463e, 12, 2, 2, 1);
  w.px(0x4a463e, 2, 10, 2, 1);
  // Sun-baked lane stripe
  w.px(0x9a8e60, 0, 7, 16, 2);
  w.px(0xc0b480, 0, 7, 16, 1);
  w.px(0x7a6e48, 5, 7, 2, 2);
  w.px(0x7a6e48, 12, 8, 3, 1);
  w.px(0x2c2a26, 8, 7, 1, 2);
  w.px(0x5a5448, 0, 15, 16, 1);
  // Warm heat-haze flecks + aggregate grit.
  speckle(fine, 0, 0, TILE_SIZE, TILE_SIZE, [
    [0x524e44, 0.3], [0x181610, 0.32], [0x6a6458, 0.16], [0xe8c878, 0.08],
  ], 0.24, 151);
  glow(fine, 16, 4, [{ r: 8, alpha: 0.05 }], 0xffd080);
  ambientLight(fine, TILE_SIZE, TILE_SIZE, { lift: 0.1, drop: 0.05 });
}

function drawSandTile(g) {
  const w = makeWriter(g);
  const fine = fineWriter(g);
  // Nevada heat: sun-bleached ochre sand with wind ripples and warm glare.
  w.px(0xc4a060, 0, 0, 16, 16);
  clusterDither(w, 0, 0, 16, 16, 0xd8b878, 0xc8a868, 41);
  // Hot-spot bands — brighter toward the sunlit top.
  w.px(0xe8d090, 0, 0, 16, 3, 0.45);
  w.px(0xf0dc9c, 0, 0, 16, 1, 0.5);
  w.px(0xa88848, 0, 14, 16, 2);
  w.px(0x987838, 0, 15, 16, 1);
  // Wind-carved ripples (organic, not grid-aligned).
  for (let i = 0; i < 16; i += 1) {
    const wave = 2 + Math.round(Math.sin(i / 2.2) * 2.2);
    w.px(0xb89450, i, wave + 2, 1, 1);
    w.px(0xe8d090, i, wave + 3, 1, 1);
    w.px(0xb89450, i, wave + 8, 1, 1);
    w.px(0xe0c888, i, wave + 9, 1, 1);
  }
  // Shell flecks + darker grit pockets.
  w.px(0xfff0c8, 3, 5, 1, 1);
  w.px(0xfff8e0, 4, 5, 1, 1);
  w.px(0xfff0c8, 11, 11, 1, 1);
  w.px(0xa07838, 7, 8, 2, 1);
  w.px(0x886828, 8, 13, 2, 1);
  w.px(0xf0e0b8, 13, 3, 2, 1);
  w.px(0xd8a858, 1, 10, 1, 1);
  // Dense grain + desert heat haze lift.
  speckle(fine, 0, 0, TILE_SIZE, TILE_SIZE, [
    [0xfff4cc, 0.42], [0x9a7438, 0.32], [0xe8d090, 0.24], [0xffffff, 0.18],
  ], 0.32, 157);
  glow(fine, 8, 4, [{ r: 10, alpha: 0.06 }], 0xffe8a0);
  ambientLight(fine, TILE_SIZE, TILE_SIZE, { lift: 0.14, drop: 0.04 });
}

function drawStageTile(g) {
  const w = makeWriter(g);
  const fine = fineWriter(g);
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
  // Lacquer grain plus a real rig-light bloom instead of flat washes.
  speckle(fine, 0, 0, TILE_SIZE, TILE_SIZE, [[0x241c30, 0.24], [0x0a0810, 0.28]], 0.14, 163);
  glow(fine, 6, 6, [{ r: 7, alpha: 0.09 }], 0x9a58c8);
  glow(fine, 22, 24, [{ r: 6, alpha: 0.08 }], 0x58c0d8);
  ambientLight(fine, TILE_SIZE, TILE_SIZE, { lift: 0.05, drop: 0.06 });
}

function drawSpaTile(g) {
  const w = makeWriter(g);
  const fine = fineWriter(g);
  // Bathhouse / pool-adjacent honed stone: wet sheen, cool mist tones.
  w.px(0x3a4a50, 0, 0, 16, 16);
  const stones = [[1, 1], [9, 1], [1, 9], [9, 9]];
  for (const [sx, sy] of stones) {
    w.px(0x5c6d74, sx, sy, 6, 6);
    w.px(0x6e8188, sx, sy, 6, 1);
    w.px(0x6e8188, sx, sy, 1, 5);
    w.px(0x4a5a60, sx + 5, sy, 1, 6);
    w.px(0x4a5a60, sx, sy + 5, 6, 1);
    w.px(0x82949a, sx + 1, sy + 1, 2, 1);
    w.px(0x9ab0b8, sx + 1, sy + 2, 1, 1);
  }
  groutGrid(w, 0x2e3c42, 8);
  w.px(0x2e3c42, 0, 0, 16, 1);
  w.px(0x2e3c42, 0, 0, 1, 16);
  w.px(0xa8c0c8, 3, 3, 1, 1, 0.55);
  w.px(0xa8c0c8, 11, 11, 1, 1, 0.45);
  w.px(0x9ab8c8, 12, 4, 2, 1, 0.35);
  w.px(0xc0d8e0, 4, 10, 2, 1, 0.3);
  sparkle(fine, [[7, 7], [23, 23], [9, 22]], 0xffffff, 0.45);
  speckle(fine, 2, 2, 28, 28, [[0x7a929a, 0.26], [0x2c3a40, 0.28], [0xc0d8e0, 0.14]], 0.2, 167);
  glow(fine, 8, 8, [{ r: 6, alpha: 0.09 }], 0xd0e8ec);
  glow(fine, 22, 22, [{ r: 6, alpha: 0.09 }], 0xd0e8ec);
  ambientLight(fine, TILE_SIZE, TILE_SIZE, { lift: 0.08, drop: 0.05 });
}

function drawGlassTile(g) {
  const w = makeWriter(g);
  const fine = fineWriter(g);
  // Shark Reef acrylic: lit turquoise water behind a mullion, with caustic swim.
  w.px(0x18303c, 0, 0, 16, 16);
  w.px(0x24485a, 1, 1, 14, 14);
  w.px(0x2a94a4, 1, 1, 6, 14);
  w.px(0x39c5cf, 1, 3, 6, 9);
  w.px(0x4ad4de, 2, 5, 4, 4);
  w.px(0x2a94a4, 9, 1, 6, 14);
  w.px(0x2f9fb0, 9, 4, 6, 8);
  w.px(0x39c5cf, 10, 6, 4, 4);
  w.px(0x6ae8f0, 2, 4, 2, 6, 0.7);
  w.px(0xa8e8f0, 2, 4, 1, 6);
  w.px(0x80f8ff, 11, 6, 1, 4, 0.6);
  w.px(0xffffff, 3, 6, 1, 2, 0.4);
  // Mullion and frame
  w.px(0x0e1c24, 7, 0, 2, 16);
  w.px(0x1e3a48, 7, 0, 1, 16);
  w.px(0x0e1c24, 0, 0, 16, 1);
  w.px(0x0e1c24, 0, 15, 16, 1);
  w.px(0x3a6878, 0, 1, 16, 1, 0.6);
  sparkle(fine, [[5, 10], [6, 14], [22, 12], [24, 18]], 0xffffff, 0.55);
  speckle(fine, 2, 2, 12, 28, [[0x8af0ff, 0.28], [0x123844, 0.26], [0xffffff, 0.14]], 0.2, 173);
  speckle(fine, 18, 2, 12, 28, [[0x8af0ff, 0.28], [0x123844, 0.26], [0xffffff, 0.14]], 0.2, 179);
  glow(fine, 5, 12, [{ r: 7, alpha: 0.11 }], 0xa8e8f0);
  glow(fine, 24, 16, [{ r: 6, alpha: 0.09 }], 0xa8e8f0);
  ambientLight(fine, TILE_SIZE, TILE_SIZE, { lift: 0.09, drop: 0.05 });
}

function drawRopeTile(g) {
  const w = makeWriter(g);
  const fine = fineWriter(g);
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
  // Velvet nap on the swags and a brass gleam running down the post.
  speckle(fine, 0, 10, 12, 8, [[0xa03858, 0.26], [0x4a0818, 0.28]], 0.2, 191);
  speckle(fine, 20, 10, 12, 8, [[0xa03858, 0.26], [0x4a0818, 0.28]], 0.2, 197);
  glow(fine, 16, 8, [{ r: 6, alpha: 0.08 }], 0xffe890);
  ambientLight(fine, TILE_SIZE, TILE_SIZE, { lift: 0.06, drop: 0.06 });
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
  TILE.AQUA, TILE.WATER, TILE.PLANT, TILE.BAR, TILE.STAGE, TILE.TRIM,
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
export function groundTileKey(tile, x, y, frame = 0) {
  if (tile === TILE.WATER) {
    const f = ((frame % WATER_FRAMES) + WATER_FRAMES) % WATER_FRAMES;
    const variant = (x * 5 + y * 3 + ((x * y) % 7)) % (SCUFFS.length + 1);
    return variant === 0 ? `tile_${tile}_f${f}` : `tile_${tile}_f${f}_s${variant - 1}`;
  }
  if (!SCUFFED_FLOORS.has(tile)) return `tile_${tile}`;
  const variant = (x * 5 + y * 3 + ((x * y) % 7)) % (SCUFFS.length + 1);
  return variant === 0 ? `tile_${tile}` : `tile_${tile}_s${variant - 1}`;
}

/**
 * Neighbor-edge fringe key. `kind` is foam | wet | path | pool; `dir` is n|s|e|w.
 * Overlays sit on top of ground so sand↔water and carpet↔path read as one surface.
 */
export function fringeTextureKey(kind, dir) {
  return `fringe_${kind}_${dir}`;
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
    "....OWBBBMBRwwwwRMBBBBWO........",
    "....OBBBBMBRwuuwRMBBBBBO........",
    "...OoWBBBBBBwLLwBBBBBBWoO.......",
    "...OoBBBBBBBwLLwBBBBBBBoO.......",
    "...OoBBBBMBBBwwBBBMBBBBoO.......",
    "...OSBBBBBBBBwwBBBBBBBBSO.......",
    "....OBBBBBBBBwwBBBBBBBBO........",
    "....OBBBBBDBBBuBBDBBBBBO........",
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
    "....OWBBBMBBBBBBBMBBBBWO........",
    "....OBBBBMBBBBBBBMBBBBBO........",
    "...OoWBBBBBBBBBBBBBBBBWoO.......",
    "...OoBBBBBBBBBBBBBBBBBBoO.......",
    "...OoBBBBMBBBBBBMBBBBBBoO.......",
    "...OSBBBBBBBBBBBBBBBBBBSO.......",
    "....OBBBBBBBBBBBBBBBBBBO........",
    "....OBBBBBDBBBBBBDBBBBBO........",
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
    "....OWBBBMBRwuuwRBO.............",
    "....OWBBBBBwLLwBBBO.............",
    "...OoWBBBBBwLLwBBBoO............",
    "...OoBBBBBMBBwwBBBoO............",
    "...OoBBBBBBBwwBBBBoO............",
    "...OSBBBBBBBwwBBBBSO............",
    "....OBBBBBBBwwBBBBO.............",
    "....OBBBBBBBuBBDBBO.............",
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
    "......OKKkkOOKKkO...............",
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
    "......OKKkkOOnnnO...............",
    "......OKkkkOOnnnO...............",
    "............OnnnO...............",
    "............OKKkO...............",
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
    "......OnnnnOOKKkO...............",
    "......OnnnnOOKkkO...............",
    "......OnnnO.....................",
    "......OKKkO.....................",
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

/**
 * Soft graded contact shadow beneath the feet — a falloff blob instead of the
 * two flat bars the raw legend can express, the same trick the tile glows use.
 */
function paintContactShadow(w) {
  glow(w, CHAR_W / 2, LEGS_TOP + 12, [
    { r: 11, alpha: 0.05 },
    { r: 8, alpha: 0.08 },
    { r: 5, alpha: 0.12 },
  ], 0x000000);
}

/** A few hand-placed highlights that read as life without touching the legend grid. */
function paintFrontDetail(w, palette) {
  // Eye glint and a hair-shine fleck, both inside the "down" silhouette.
  sparkle(w, [[11, 9], [17, 9]], 0xffffff, 0.55);
  sparkle(w, [[12, 4]], mix(palette.hair, 0xffffff, 0.5), 0.6);
}

/** Polished shoe-cap highlight — shared by every direction's leg frame. */
function paintShoeShine(w) {
  sparkle(w, [[8, LEGS_TOP + 8], [14, LEGS_TOP + 8]], 0x6a6a78, 0.5);
}

/**
 * A small gold pin on the right lapel — the detail that reads as "on shift"
 * at a glance and separates casino staff from a guest in the same tuxedo.
 */
function paintStaffBadge(w) {
  const y = BODY_TOP + 17;
  w.px(OUTLINE, 19, y, 2, 2);
  w.px(0xe8c547, 19, y, 2, 1);
  w.px(0xffe890, 19, y, 1, 1);
}

function drawCharacterPixels(w, palette, dir, frame, opts = {}) {
  const legend = CHAR_LEGEND(palette);
  const legs = CHAR_LEGS[frame] ?? CHAR_LEGS[0];
  const body = CHAR_BODY_BY_DIR[dir] ?? CHAR_BODY_BY_DIR.down;
  // Frames 1 and 2 lift a foot, so the upper body rides a pixel higher. The leg
  // block always starts at LEGS_TOP, which keeps the waist joined either way.
  const bob = frame === 0 ? 0 : -1;
  paintContactShadow(w);
  paintGrid(w, legs, legend, LEGS_TOP);
  paintGrid(w, body, legend, BODY_TOP + bob);
  paintShoeShine(w);
  if (dir === "down" && frame === 0) {
    paintFrontDetail(w, palette);
    if (opts.badge) paintStaffBadge(w);
  }
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

function drawCharacter(g, palette, dir, frame, opts) {
  // Characters use CHAR_SCALE (1), not the tile SCALE (2). Drawing at tile
  // scale painted a 64×88 sprite into a 32×44 texture — only the top-left
  // quarter was visible in the overworld.
  drawCharacterPixels(makeWriter(g, CHAR_SCALE), palette, dir, frame, opts);
}

/** Draw character to a 2D canvas (for previews and dialogue portraits). */
export function drawCharacterToCanvas(canvas, palette, dir = "down", frame = 0, pixelScale = 2, opts) {
  const ctx = canvas.getContext("2d");
  const w = CHAR_W * pixelScale;
  const h = CHAR_H * pixelScale;
  canvas.width = w;
  canvas.height = h;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);
  drawCharacterPixels(makeWriter(canvas, pixelScale), palette, dir, frame, opts);
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
  const fine = fineWriter(g);
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
  glow(fine, 16, 10, [{ r: 6, alpha: 0.1 }, { r: 3, alpha: 0.18 }], 0xffe890);
  sparkle(fine, [[10, 5], [20, 6]], 0xffffff, 0.5);
}

function drawBarDecor(g) {
  const w = makeWriter(g);
  const fine = fineWriter(g);
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
  // Bottle-glass glints, a mirror sheen, and a real neon-sign halo.
  sparkle(fine, [[6, 16], [12, 16], [18, 16], [24, 16]], 0xffffff, 0.7);
  glow(fine, 16, 12, [{ r: 6, alpha: 0.1 }, { r: 3, alpha: 0.18 }], 0x9ec8e0);
  glow(fine, 16, 1, [{ r: 9, alpha: 0.1 }, { r: 5, alpha: 0.18 }], 0xff4a60);
  ambientLight(fine, TILE_SIZE, TILE_SIZE, { lift: 0.06, drop: 0.06 });
}

function drawPlantDecor(g) {
  const w = makeWriter(g);
  const fine = fineWriter(g);
  // Tropical planter: terracotta pot + layered palm canopy (resort greenery).
  w.px(OUTLINE, 3, 10, 10, 6);
  w.px(0x5c3a1a, 4, 11, 8, 5);
  w.px(0x7a5030, 4, 10, 8, 2);
  w.px(0x9a7040, 5, 10, 6, 1);
  w.px(0xc4a070, 5, 10, 3, 1, 0.6);
  w.px(0x3a2410, 6, 12, 4, 3);
  w.px(0xd8a060, 5, 11, 2, 1, 0.4); // pot glaze fleck
  // Trunk with bark shading
  w.px(OUTLINE, 7, 7, 2, 4);
  w.px(0x4a3020, 7, 7, 2, 3);
  w.px(0x6a4828, 7, 7, 1, 2);
  // Frond clusters — deep shadow under, bright tip on top (reference canopy).
  w.px(OUTLINE, 2, 2, 12, 9);
  w.px(0x145028, 3, 4, 10, 7);
  w.px(0x1a5a30, 3, 3, 10, 6);
  w.px(0x2d8a48, 4, 2, 8, 6);
  w.px(0x4acc68, 5, 1, 6, 5);
  w.px(0x70f090, 6, 0, 4, 4);
  w.px(0x90ffb0, 7, 0, 2, 3);
  w.px(0xb0ffc8, 7, 0, 1, 1);
  w.px(0xc8ffe0, 8, 0, 1, 1);
  // Side fronds
  w.px(0x1a5a30, 1, 5, 3, 3);
  w.px(0x2d8a48, 1, 4, 2, 2);
  w.px(0x4acc68, 0, 3, 2, 2);
  w.px(0x70f090, 0, 3, 1, 1);
  w.px(0x1a5a30, 12, 5, 3, 3);
  w.px(0x2d8a48, 13, 4, 2, 2);
  w.px(0x4acc68, 14, 3, 2, 2);
  w.px(0x70f090, 15, 3, 1, 1);
  w.px(0x145028, 5, 8, 6, 2);
  // Color pops tucked into the canopy — pink bloom + gold fruit fleck.
  w.px(0xe86890, 5, 4, 1, 1);
  w.px(0xf0c050, 11, 5, 1, 1);
  sparkle(fine, [[13, 3], [15, 6], [11, 1], [17, 8], [21, 4], [6, 8]], 0xc8ffd0, 0.55);
  glow(fine, 16, 6, [{ r: 7, alpha: 0.07 }], 0xa0f0b0);
  glow(fine, 10, 22, [{ r: 4, alpha: 0.14 }], 0xf0dcb0);
  ambientLight(fine, TILE_SIZE, TILE_SIZE, { lift: 0.08, drop: 0.05 });
}

/** Walkable flower cluster — bluebells / desert blooms for lived-in density. */
function drawFlowerDecor(g) {
  const w = makeWriter(g);
  const fine = fineWriter(g);
  // Stem tufts
  w.px(0x2d6a38, 4, 10, 1, 4);
  w.px(0x2d6a38, 8, 9, 1, 5);
  w.px(0x2d6a38, 11, 11, 1, 3);
  w.px(0x4acc68, 4, 10, 1, 1);
  w.px(0x4acc68, 8, 9, 1, 1);
  // Bloom heads — bright palette pops against sand/lobby.
  w.px(OUTLINE, 3, 7, 3, 3);
  w.px(0x4a80d0, 3, 7, 3, 3);
  w.px(0x80b0f0, 3, 7, 2, 1);
  w.px(0xffffff, 4, 8, 1, 1);
  w.px(OUTLINE, 7, 5, 3, 3);
  w.px(0xe05070, 7, 5, 3, 3);
  w.px(0xf090a8, 7, 5, 2, 1);
  w.px(0xfff0c0, 8, 6, 1, 1);
  w.px(OUTLINE, 10, 8, 3, 3);
  w.px(0xf0d050, 10, 8, 3, 3);
  w.px(0xffe890, 10, 8, 2, 1);
  w.px(0xffffff, 11, 9, 1, 1, 0.7);
  glow(fine, 16, 14, [{ r: 5, alpha: 0.08 }], 0xf0d0a0);
  ambientLight(fine, TILE_SIZE, TILE_SIZE, { lift: 0.06, drop: 0.04 });
}

/** Blocking boulder with moss and top-left bevel. */
function drawRockDecor(g) {
  const w = makeWriter(g);
  const fine = fineWriter(g);
  w.px(OUTLINE, 3, 6, 10, 9);
  w.px(0x5a5048, 4, 7, 8, 7);
  w.px(0x7a7064, 4, 7, 7, 1);
  w.px(0x7a7064, 4, 7, 1, 6);
  w.px(0x3a342e, 11, 7, 1, 7);
  w.px(0x3a342e, 4, 13, 8, 1);
  w.px(0x9a9080, 5, 8, 3, 2);
  w.px(0xb0a898, 5, 8, 2, 1);
  // Moss cap + grit
  w.px(0x3a7040, 6, 6, 4, 2);
  w.px(0x50a058, 7, 6, 2, 1);
  w.px(0x2a5030, 5, 11, 2, 1);
  speckle(fine, 8, 14, 16, 14, [[0x8a8074, 0.3], [0x3a342e, 0.28]], 0.2, 223);
  ambientLight(fine, TILE_SIZE, TILE_SIZE, { lift: 0.07, drop: 0.08 });
}

/** Brass lantern on a post — warm bloom for evening atmosphere. */
function drawLanternDecor(g) {
  const w = makeWriter(g);
  const fine = fineWriter(g);
  // Post
  w.px(OUTLINE, 7, 6, 2, 10);
  w.px(0x5c3a1a, 7, 6, 2, 9);
  w.px(0x8a6030, 7, 6, 1, 8);
  // Lantern body
  w.px(OUTLINE, 4, 2, 8, 7);
  w.px(0x3a2a18, 5, 3, 6, 5);
  w.px(0xc8a030, 5, 2, 6, 1);
  w.px(0xe8c547, 5, 2, 4, 1);
  w.px(0xffe890, 6, 4, 4, 3);
  w.px(0xfff6c8, 7, 4, 2, 2);
  w.px(0xffffff, 7, 4, 1, 1, 0.7);
  // Cap + base
  w.px(OUTLINE, 5, 1, 6, 2);
  w.px(0x8a6018, 6, 1, 4, 1);
  w.px(OUTLINE, 5, 14, 6, 2);
  w.px(0x5c3a1a, 6, 14, 4, 1);
  glow(fine, 16, 10, [
    { r: 12, alpha: 0.08 }, { r: 8, alpha: 0.12 }, { r: 4, alpha: 0.2 },
  ], 0xffe090);
  sparkle(fine, [[14, 8], [18, 10]], 0xffffff, 0.55);
  ambientLight(fine, TILE_SIZE, TILE_SIZE, { lift: 0.05, drop: 0.06 });
}

/** Soft elliptical contact shadow under decor / characters. */
function drawShadowBlob(g) {
  const fine = fineWriter(g);
  glow(fine, TILE_SIZE / 2, TILE_SIZE / 2 + 2, [
    { r: 12, alpha: 0.1 },
    { r: 9, alpha: 0.14 },
    { r: 6, alpha: 0.2 },
    { r: 3, alpha: 0.28 },
  ], 0x000000);
}

/**
 * Edge fringe strips — transparent except the contact band.
 * Foam: water edge. Wet: sand/deck meeting water. Path: gold walkway into carpet.
 * Pool: aqua deck meeting lagoon.
 */
function drawFringe(g, kind, dir) {
  const w = makeWriter(g);
  const fine = fineWriter(g);
  const horizontal = dir === "n" || dir === "s";
  const atStart = dir === "n" || dir === "w";
  const band = horizontal
    ? { x: 0, y: atStart ? 0 : 13, bw: 16, bh: 3 }
    : { x: atStart ? 0 : 13, y: 0, bw: 3, bh: 16 };

  if (kind === "foam") {
    w.px(0xa8f0f8, band.x, band.y, band.bw, band.bh, 0.55);
    w.px(0xffffff, band.x + (horizontal ? 2 : 0), band.y + (horizontal ? 0 : 2),
      horizontal ? 3 : 2, horizontal ? 1 : 3, 0.7);
    w.px(0x6ae8f0, band.x + (horizontal ? 8 : 1), band.y + (horizontal ? 1 : 7),
      horizontal ? 4 : 1, horizontal ? 1 : 4, 0.65);
    sparkle(fine, horizontal
      ? [[6, (band.y + 1) * 2], [20, (band.y + 1) * 2], [28, band.y * 2]]
      : [[(band.x + 1) * 2, 8], [(band.x + 1) * 2, 18], [band.x * 2, 26]],
    0xffffff, 0.55);
  } else if (kind === "wet") {
    w.px(0x8a7040, band.x, band.y, band.bw, band.bh, 0.45);
    w.px(0x39c5cf, band.x, band.y + (horizontal ? (atStart ? 2 : 0) : 0),
      horizontal ? 16 : 1, horizontal ? 1 : 16, 0.4);
    w.px(0x6ae8f0, band.x + (horizontal ? 3 : 0), band.y + (horizontal ? 1 : 4),
      horizontal ? 2 : 2, horizontal ? 1 : 2, 0.5);
  } else if (kind === "path") {
    w.px(0xc8a030, band.x, band.y, band.bw, band.bh, 0.35);
    w.px(0xffe890, band.x + (horizontal ? 1 : 0), band.y + (horizontal ? 0 : 1),
      horizontal ? 14 : 1, horizontal ? 1 : 14, 0.4);
  } else if (kind === "pool") {
    w.px(0x2a7080, band.x, band.y, band.bw, band.bh, 0.5);
    w.px(0x6ae8f0, band.x, band.y + (horizontal ? 1 : 0),
      horizontal ? 16 : 2, horizontal ? 1 : 16, 0.45);
    sparkle(fine, [[10, (band.y + 1) * 2], [22, (band.y + 1) * 2]], 0xffffff, 0.45);
  }
}

function drawSlotDecor(g) {
  const w = makeWriter(g);
  const fine = fineWriter(g);
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
  // Marquee bloom and chrome glints instead of flat lit rectangles.
  speckle(fine, 4, 4, 24, 24, [[0x3a1838, 0.22], [0x120810, 0.24]], 0.12, 201);
  glow(fine, 16, 8, [{ r: 8, alpha: 0.09 }, { r: 5, alpha: 0.15 }], 0xffe890);
  glow(fine, 8, 20, [{ r: 4, alpha: 0.14 }], 0xff4a60);
  glow(fine, 18, 20, [{ r: 4, alpha: 0.14 }], 0x50e8a0);
  sparkle(fine, [[6, 3], [24, 3], [4, 22]], 0xffffff, 0.6);
  ambientLight(fine, TILE_SIZE, TILE_SIZE, { lift: 0.05, drop: 0.06 });
}

function drawScreenDecor(g) {
  const w = makeWriter(g);
  const fine = fineWriter(g);
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
  // Genuine screen-light bloom spilling off the bezel onto the wall.
  speckle(fine, 4, 6, 24, 20, [[0x2a1838, 0.2], [0x0a1018, 0.24]], 0.1, 211);
  glow(fine, 16, 14, [{ r: 10, alpha: 0.07 }, { r: 6, alpha: 0.12 }], 0x6ae8f0);
  sparkle(fine, [[10, 10], [22, 10]], 0xffffff, 0.5);
  ambientLight(fine, TILE_SIZE, TILE_SIZE, { lift: 0.05, drop: 0.06 });
}

/** Standalone sprites, keyed by the texture name the scene looks them up by. */
const SPRITE_DRAWERS = {
  decor_bar: drawBarDecor,
  decor_plant: drawPlantDecor,
  decor_slot: drawSlotDecor,
  decor_screen: drawScreenDecor,
  decor_glass: drawGlassTile,
  decor_rope: drawRopeTile,
  decor_flower: drawFlowerDecor,
  decor_rock: drawRockDecor,
  decor_lantern: drawLanternDecor,
  interact_icon: drawInteractIcon,
  shadow_blob: drawShadowBlob,
};

const FRINGE_KINDS = ["foam", "wet", "path", "pool"];
const FRINGE_DIRS = ["n", "s", "e", "w"];

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
  let drawer = null;
  if (key.startsWith("tile_")) {
    const id = key.slice("tile_".length);
    drawer = TILE_DRAWERS[id];
  } else if (key.startsWith("fringe_")) {
    const parts = key.split("_");
    const kind = parts[1];
    const dir = parts[2];
    drawer = (target) => drawFringe(target, kind, dir);
  } else {
    drawer = SPRITE_DRAWERS[key];
  }
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
    const tileId = Number(id);
    if (tileId === TILE.WATER) {
      for (let f = 0; f < WATER_FRAMES; f += 1) {
        const frameDrawer = (g) => drawWaterTile(g, f);
        makeTex(scene, `tile_${tileId}_f${f}`, frameDrawer);
        // Alias frame 0 to the static key so any leftover lookup still resolves.
        if (f === 0) makeTex(scene, `tile_${tileId}`, frameDrawer);
        SCUFFS.forEach((_, variant) => {
          makeTex(scene, `tile_${tileId}_f${f}_s${variant}`, (g) => {
            frameDrawer(g);
            scuff(g, variant);
          });
        });
      }
      continue;
    }
    makeTex(scene, `tile_${tileId}`, drawer);
    if (!SCUFFED_FLOORS.has(tileId)) continue;
    SCUFFS.forEach((_, variant) => {
      makeTex(scene, `tile_${tileId}_s${variant}`, (g) => {
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
    makeTex(scene, key, (g) => drawCharacter(g, palette, "down", 0, { badge: true }), TEX_CHAR_W, TEX_CHAR_H);
  }

  for (const [key, drawer] of Object.entries(SPRITE_DRAWERS)) {
    if (key === "interact_icon") {
      makeTex(scene, key, drawer, TILE_SIZE, TILE_SIZE * 0.875);
    } else {
      makeTex(scene, key, drawer);
    }
  }

  for (const kind of FRINGE_KINDS) {
    for (const dir of FRINGE_DIRS) {
      makeTex(scene, fringeTextureKey(kind, dir), (g) => drawFringe(g, kind, dir));
    }
  }
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
