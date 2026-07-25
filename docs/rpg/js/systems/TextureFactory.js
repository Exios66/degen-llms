import { ART_UNIT, TILE, TILE_SIZE } from "./MapTiles.js";

/**
 * Production-grade procedural pixel textures — 16px art grid, 2× upscale.
 * Multi-variant floors, top-left lighting, casino-material palettes.
 */

const SCALE = TILE_SIZE / ART_UNIT;
const OUTLINE = 0x181828;
const OUTLINE_SOFT = 0x303040;
const TILE_VARIANTS = 3;

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
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = clamp(Math.round(ar + (br - ar) * t), 0, 255);
  const g = clamp(Math.round(ag + (bg - ag) * t), 0, 255);
  const bl = clamp(Math.round(ab + (bb - ab) * t), 0, 255);
  return (r << 16) | (g << 8) | bl;
}

/** Deterministic hash for micro-noise without Math.random. */
function hash2(x, y, seed = 0) {
  let n = x * 374761393 + y * 668265263 + seed * 1274126177;
  n = (n ^ (n >>> 13)) * 1274126177;
  return (n ^ (n >>> 16)) >>> 0;
}

// ─── Pixel writers ─────────────────────────────────────────────────────────

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

function bevelFrame(w, light, dark, hi = null) {
  w.px(light, 0, 0, 15, 1);
  w.px(light, 0, 0, 1, 14);
  w.px(dark, 15, 0, 1, 16);
  w.px(dark, 0, 15, 16, 1);
  if (hi) w.px(hi, 1, 1, 2, 1);
}

function ditherWeave(w, x0, y0, w0, h0, c1, c2) {
  for (let y = y0; y < y0 + h0; y++) {
    for (let x = x0; x < x0 + w0; x++) {
      w.px((x + y) % 2 === 0 ? c1 : c2, x, y);
    }
  }
}

function speckNoise(w, x0, y0, w0, h0, color, seed, density = 6, alpha = 0.35) {
  for (let y = y0; y < y0 + h0; y++) {
    for (let x = x0; x < x0 + w0; x++) {
      if (hash2(x, y, seed) % density === 0) w.px(color, x, y, 1, 1, alpha);
    }
  }
}

function marbleVeins(w, base, vein, veinHi, variant = 0) {
  w.px(base, 0, 0, 16, 16);
  const ox = variant === 1 ? 2 : variant === 2 ? -1 : 0;
  const oy = variant === 1 ? -1 : variant === 2 ? 2 : 0;
  w.px(vein, 1 + ox, 2 + oy, 6, 1);
  w.px(veinHi, 2 + ox, 2 + oy, 3, 1);
  w.px(vein, 8 + ox, 1 + oy, 1, 5);
  w.px(vein, 9 + ox, 5 + oy, 5, 1);
  w.px(veinHi, 10 + ox, 5 + oy, 2, 1);
  w.px(vein, 3 + ox, 9 + oy, 8, 1);
  w.px(vein, 2 + ox, 10 + oy, 1, 4);
  w.px(veinHi, 3 + ox, 12 + oy, 4, 1);
  w.px(vein, 11 + ox, 8 + oy, 1, 6);
  w.px(veinHi, 12 + ox, 10 + oy, 2, 1);
  w.px(0xf8f4ec, 4 + ox, 4 + oy, 1, 1, 0.75);
  w.px(0xfffaf0, 11 + ox, 3 + oy, 1, 1, 0.65);
  speckNoise(w, 1, 1, 14, 14, 0xfff8f0, 11 + variant, 9, 0.28);
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

/** Stable texture key for a ground tile with positional variant. */
export function tileTextureKey(tileId, x = 0, y = 0) {
  const v = (x * 3 + y * 5 + tileId * 7) % TILE_VARIANTS;
  return v === 0 ? `tile_${tileId}` : `tile_${tileId}_v${v}`;
}

// ─── Ground tiles ──────────────────────────────────────────────────────────

function drawLobbyTile(g, variant = 0) {
  const w = makeWriter(g);
  const bases = [0xe8e0d0, 0xe4dcc8, 0xece4d4];
  marbleVeins(w, bases[variant % 3], 0xc8b8a0, 0xd8c8b0, variant);
  groutGrid(w, 0xb8a890, 8);
  // Specular flecks — always
  w.px(0xfff8f0, 3 + variant, 3, 2, 1);
  w.px(0xfff8f0, 10, 10 - (variant % 2), 2, 1);
  // Brass inlay only on medallion variant
  if (variant === 0) {
    w.px(0xf0e8d8, 6, 6, 4, 4);
    w.px(0xe8c878, 7, 7, 2, 2);
    w.px(0xffe890, 7, 7, 1, 1);
  }
  bevelFrame(w, 0xf0e8d8, 0xb8a890, 0xfffaf0);
}

function drawCarpetTile(g, variant = 0) {
  const w = makeWriter(g);
  const deep = [0x4a0828, 0x420624, 0x52102c][variant % 3];
  w.px(deep, 0, 0, 16, 16);
  bevelFrame(w, 0x6a1840, 0x2a0418);
  ditherWeave(w, 1, 1, 14, 14, 0x6a1038, 0x5a0c30);
  w.px(0x801848, 2, 2, 12, 12);
  speckNoise(w, 2, 2, 12, 12, 0x982058, 20 + variant, 7, 0.35);

  if (variant === 0) {
    // Occasional damask medallion (1 of 3 tiles)
    w.px(0xc8a030, 5, 5, 6, 6);
    w.px(0xe8c547, 6, 6, 4, 4);
    w.px(0xffe890, 7, 7, 2, 2);
    w.px(0x982058, 7, 7, 2, 2);
    w.px(0xc8a030, 2, 2, 1, 1);
    w.px(0xc8a030, 13, 13, 1, 1);
  } else if (variant === 1) {
    // Subtle diagonal pin-dots — field tile
    w.px(0xc8a030, 3, 4, 1, 1, 0.85);
    w.px(0xc8a030, 8, 7, 1, 1, 0.7);
    w.px(0xe8c547, 12, 11, 1, 1, 0.8);
    w.px(0xc8a030, 6, 12, 1, 1, 0.65);
  } else {
    // Quiet weave with micro corner ticks
    w.px(0xa87830, 2, 2, 1, 1, 0.7);
    w.px(0xa87830, 13, 2, 1, 1, 0.7);
    w.px(0xa87830, 2, 13, 1, 1, 0.7);
    w.px(0xa87830, 13, 13, 1, 1, 0.7);
    speckNoise(w, 3, 3, 10, 10, 0xb89040, 21, 12, 0.25);
  }
  w.px(0x3a0618, 0, 0, 16, 1);
  w.px(0x3a0618, 0, 15, 16, 1);
}

function drawFeltTile(g, variant = 0) {
  const w = makeWriter(g);
  w.px(0x0a4828, 0, 0, 16, 16);
  ditherWeave(w, 1, 1, 14, 14, 0x0e5830, 0x0c5030);
  w.px(0x128840, 2, 2, 12, 12);
  w.px(0x18a050, 3, 3, 10, 10);
  speckNoise(w, 3, 3, 10, 10, 0x20b860, 30 + variant, 8, 0.3);
  // Soft nap highlight — fabric, not iconography
  w.px(0x28b868, 4 + variant, 4, 3, 1, 0.25);
  w.px(0x28b868, 9, 9 + (variant % 2), 4, 1, 0.2);
  // Thin gold rail (all felt tiles share table edge language)
  w.px(0xc8a030, 0, 0, 16, 1);
  w.px(0xe8c547, 0, 1, 16, 1, 0.85);
  w.px(0xc8a030, 0, 15, 16, 1);
  w.px(0xe8c547, 0, 0, 1, 16, 0.75);
  w.px(0xe8c547, 15, 0, 1, 16, 0.75);
  // Betting mark only on medallion variant — avoids star-grid stamp
  if (variant === 0) {
    w.px(0xffffff, 5, 7, 6, 1, 0.85);
    w.px(0xffffff, 7, 5, 1, 6, 0.85);
    w.px(0x40e080, 6, 6, 4, 4);
    w.px(0x60ffa0, 7, 7, 2, 2);
    w.px(0xffffff, 7, 7, 1, 1, 0.45);
  }
}

function drawWallTile(g, variant = 0) {
  const w = makeWriter(g);
  w.px(0x0c1018, 0, 0, 16, 16);
  w.px(0x141c28, 1, 1, 14, 14);
  // Crown molding
  w.px(0xc8a030, 0, 0, 16, 2);
  w.px(0xe8c547, 0, 0, 16, 1);
  w.px(0xffe890, 1, 0, 14, 1);
  w.px(0x8a6018, 0, 2, 16, 1);
  // Panel recesses — shift for variety
  const gap = variant === 1 ? 1 : 0;
  w.px(0x1a2438, 2, 4 + gap, 5, 8);
  w.px(0x1a2438, 9, 4 + gap, 5, 8);
  w.px(0x243048, 3, 5 + gap, 3, 6);
  w.px(0x243048, 10, 5 + gap, 3, 6);
  w.px(0x304060, 4, 6 + gap, 1, 4);
  w.px(0x304060, 11, 6 + gap, 1, 4);
  // Wallpaper stripe / damask hint
  if (variant === 2) {
    w.px(0x1c2840, 7, 4, 2, 9);
    w.px(0xe8c547, 7, 8, 2, 1, 0.35);
  }
  // Sconce only on some wall tiles — breaks stamp rhythm
  if (variant === 0) {
    w.px(0xe8c547, 7, 5, 2, 1);
    w.px(0xffe890, 7, 5, 1, 1, 0.85);
    w.px(0xffe890, 6, 6, 4, 2, 0.18);
  }
  w.px(0xc8a030, 0, 14, 16, 2);
  w.px(0x8a6018, 0, 15, 16, 1);
  speckNoise(w, 2, 4, 12, 9, 0x2a3850, 40 + variant, 11, 0.25);
}

function drawPathTile(g, variant = 0) {
  const w = makeWriter(g);
  // Brass runner — brushed plate, not gold-block stamp
  w.px(0x6a4810, 0, 0, 16, 16);
  w.px(0x8a6820, 1, 1, 14, 14);
  w.px(0xb89030, 2, 2, 12, 12);
  ditherWeave(w, 2, 2, 12, 12, 0xc8a038, 0xb89030);
  w.px(0xe8c547, 3, 3, 10, 10, 0.55);
  // Brush streaks
  const sy = 3 + variant;
  w.px(0xffe890, 2, sy, 8, 1, 0.4);
  w.px(0xffe890, 5, sy + 3, 7, 1, 0.28);
  w.px(0xffffff, 4 + variant, 5, 1, 1, 0.35);
  // Subtle seam lines
  w.px(0x684010, 0, 7, 16, 1, 0.55);
  w.px(0x684010, 7, 0, 1, 16, 0.45);
  bevelFrame(w, 0xe8c547, 0x503808, 0xfff0b0);
}

function drawTrimTile(g, variant = 0) {
  const w = makeWriter(g);
  w.px(0x140c10, 0, 0, 16, 16);
  w.px(0x241418, 1, 1, 14, 14);
  w.px(0x3a2028, 2, 2, 12, 12);
  w.px(0x5c3018, 3, 3, 10, 10);
  w.px(0x7a4828, 4, 4, 8, 8);
  w.px(0x9a6840, 5, 5, 6, 6);
  // Wood grain
  const gy = 4 + (variant % 3);
  w.px(0x6a3820, 4, gy, 8, 1, 0.5);
  w.px(0x8a5838, 5, gy + 2, 6, 1, 0.4);
  w.px(0xc8a030, 1, 1, 14, 1);
  w.px(0xe8c547, 2, 2, 12, 1);
  w.px(0xc8a030, 1, 14, 14, 1);
  w.px(0xe8c547, 7, 7, 2, 2);
  w.px(0xffe890, 7, 7, 1, 1);
  w.px(0x2a1820, 0, 0, 16, 1);
  w.px(0x2a1820, 0, 15, 16, 1);
}

function drawWaterTile(g, variant = 0, frame = 0) {
  const w = makeWriter(g);
  w.px(0x0c3050, 0, 0, 16, 16);
  w.px(0x104060, 1, 1, 14, 14);
  w.px(0x186880, 2, 2, 12, 12);
  w.px(0x1a5878, 0, 6, 16, 4);
  w.px(0x145068, 0, 11, 16, 5);
  const shift = (variant + frame) % 3;
  w.px(0x39c5cf, 2 + shift, 3, 4, 1);
  w.px(0x6ae8f0, 3 + shift, 3, 2, 1);
  w.px(0x4ad4de, 8 - shift, 2, 5, 1);
  w.px(0x6ae8f0, 9 - shift, 2, 2, 1);
  w.px(0x39c5cf, 4 + shift, 9, 6, 1);
  w.px(0x6ae8f0, 5 + shift, 9, 3, 1);
  w.px(0x4ad4de, 11 - shift, 7, 3, 1);
  w.px(0x80f8ff, 6 + shift, 4, 1, 1, 0.75);
  w.px(0x80f8ff, 12 - shift, 8, 1, 1, 0.55);
  w.px(0x2a90a8, 1, 5 + (frame % 2), 14, 1, 0.5);
  w.px(0x2a90a8, 2, 12 - (frame % 2), 12, 1, 0.4);
  bevelFrame(w, 0x2a7088, 0x0a2840);
}

function drawVipTile(g, variant = 0) {
  const w = makeWriter(g);
  w.px(0x060408, 0, 0, 16, 16);
  w.px(0x0c0810, 1, 1, 14, 14);
  w.px(0x121018, 2, 2, 12, 12);
  const ox = variant === 1 ? 1 : variant === 2 ? -1 : 0;
  w.px(0xc8a030, 2 + ox, 3, 5, 1);
  w.px(0xe8c547, 3 + ox, 3, 2, 1);
  w.px(0xc8a030, 8 + ox, 2, 1, 4);
  w.px(0xe8c547, 8 + ox, 4, 1, 1);
  w.px(0xc8a030, 4 + ox, 9, 8, 1);
  w.px(0xe8c547, 6 + ox, 9, 3, 1);
  w.px(0xc8a030, 11 + ox, 7, 1, 5);
  w.px(0xe8c547, 2, 2, 12, 1);
  w.px(0xe8c547, 2, 13, 12, 1);
  w.px(0xe8c547, 2, 2, 1, 12);
  w.px(0xe8c547, 13, 2, 1, 12);
  w.px(0xffe890, 7, 7, 2, 2);
  w.px(0xfff0b0, 7, 7, 1, 1);
  w.px(0x1a1520, 5, 5, 6, 6);
  speckNoise(w, 3, 3, 10, 10, 0xe8c547, 50 + variant, 14, 0.35);
}

function drawAquaTile(g, variant = 0) {
  const w = makeWriter(g);
  w.px(0x0a1820, 0, 0, 16, 16);
  const phase = variant % 2;
  for (let y = 0; y < 16; y += 4) {
    for (let x = 0; x < 16; x += 4) {
      const tone = ((x + y) / 4 + phase) % 2 === 0 ? 0x1a3848 : 0x143040;
      w.px(tone, x, y, 4, 4);
      w.px(0x244858, x + 1, y + 1, 2, 2);
      w.px(0x2a5868, x + 1, y + 1, 1, 1);
    }
  }
  groutGrid(w, 0x0c2030, 4);
  w.px(0x39c5cf, 0, 10, 16, 2);
  w.px(0x6ae8f0, 2 + variant, 10, 4, 1);
  w.px(0x4ad4de, 8, 11, 6, 1);
  w.px(0x80f8ff, 12, 10, 2, 1, 0.65);
  w.px(0x1a5060, 0, 12, 16, 4);
  w.px(0x2a7080, 3, 13, 8, 1);
  bevelFrame(w, 0x2a5060, 0x081018);
}

function drawPlantTile(g, variant = 0) {
  const w = makeWriter(g);
  w.px(0x283028, 0, 0, 16, 16);
  bevelFrame(w, 0x384838, 0x182018);
  w.px(0x304030, 2, 2, 12, 12);
  // Flagstones — rearrange by variant
  const layouts = [
    [[2, 2, 5, 5], [8, 2, 6, 5], [2, 8, 6, 6], [9, 8, 5, 6]],
    [[2, 2, 6, 6], [9, 2, 5, 5], [2, 9, 5, 5], [8, 8, 6, 6]],
    [[2, 2, 5, 6], [8, 2, 6, 6], [2, 9, 6, 5], [9, 9, 5, 5]],
  ][variant % 3];
  const tones = [0x485848, 0x586858, 0x405040, 0x506050];
  layouts.forEach(([x, y, ww, hh], i) => {
    w.px(tones[i % 4], x, y, ww, hh);
    w.px(shade(tones[i % 4], 1.15), x + 1, y + 1, Math.max(1, ww - 2), 1);
  });
  w.px(0x2d8a48, 4 + variant, 5, 2, 1);
  w.px(0x4acc68, 5 + variant, 4, 1, 1);
  w.px(0x2d8a48, 11 - variant, 9, 2, 1);
  w.px(0x4acc68, 12 - variant, 8, 1, 1);
}

function drawBarTile(g, variant = 0) {
  const w = makeWriter(g);
  w.px(0x2a1810, 0, 0, 16, 16);
  // Herringbone / parquet — flip by variant
  const flip = variant % 2 === 1;
  for (let by = 0; by < 16; by += 8) {
    for (let bx = 0; bx < 16; bx += 8) {
      const dark = ((bx + by) / 8 + (flip ? 1 : 0)) % 2 === 0;
      w.px(dark ? 0x3a2418 : 0x4a3020, bx, by, 8, 8);
      w.px(dark ? 0x5c3a1a : 0x6c4a28, bx + 1, by + 1, 6, 6);
      w.px(0x9a7040, bx + 2, by + 2, 2, 1, 0.55);
    }
  }
  w.px(0xc4a070, 3 + variant, 3, 1, 1, 0.55);
  w.px(0x1a1008, 7, 0, 2, 16);
  w.px(0x1a1008, 0, 7, 16, 2);
  bevelFrame(w, 0x6c4a28, 0x1a1008);
}

function drawSlotTile(g, variant = 0) {
  const w = makeWriter(g);
  w.px(0x1a0818, 0, 0, 16, 16);
  bevelFrame(w, 0x2a1028, 0x0c040c);
  ditherWeave(w, 1, 1, 14, 14, 0x220c20, 0x1a0818);
  const neonTop = [0xff4a60, 0x48d8e8, 0xf0d050][variant % 3];
  const neonBot = [0x48d8e8, 0xf0d050, 0xff4a60][variant % 3];
  w.px(neonTop, 1, 1, 14, 1);
  w.px(mix(neonTop, 0xffffff, 0.35), 2, 1, 12, 1, 0.55);
  w.px(neonBot, 1, 14, 14, 1);
  w.px(mix(neonBot, 0xffffff, 0.35), 2, 14, 12, 1, 0.55);
  w.px(0xf0d050, 7, 2, 2, 12);
  w.px(0xffe890, 7, 4 + variant, 2, 1, 0.65);
  w.px(0x3a1838, 3, 4, 10, 8);
  speckNoise(w, 3, 4, 10, 8, 0x502050, 60 + variant, 8, 0.3);
}

function drawScreenTile(g, variant = 0) {
  const w = makeWriter(g);
  w.px(0x1a1028, 0, 0, 16, 16);
  bevelFrame(w, 0x2a1838, 0x0c0818);
  ditherWeave(w, 1, 1, 14, 14, 0x221430, 0x1a1028);
  w.px(0x1a3040, 4, 3, 8, 8, 0.65);
  w.px(0x48d8e8, 5, 4, 6, 5, 0.28);
  w.px(0x6ae8f0, 6, 5, 4, 3, 0.22);
  w.px(0x50e8a0, 5, 9, 6, 2, 0.18);
  w.px(0x304060, 3, 2, 10, 1);
  w.px(0x405080, 4, 3, 8, 1);
  if (variant === 1) w.px(0xf0d050, 6, 11, 4, 1, 0.25);
  if (variant === 2) w.px(0xf08088, 6, 11, 4, 1, 0.25);
}

function drawVoidTile(g) {
  px(g, 0x040308, 0, 0, 16, 16);
  px(g, 0x06050a, 1, 1, 14, 14, 0.5);
}

function drawRoadTile(g) {
  // Porte-cochère asphalt with a worn lane stripe
  px(g, 0x22212a, 0, 0, 16, 16);
  px(g, 0x2a2933, 1, 1, 14, 14);
  px(g, 0x1a1922, 3, 6, 4, 1);
  px(g, 0x1a1922, 9, 11, 5, 1);
  px(g, 0x33323d, 11, 3, 3, 1);
  px(g, 0x6a6752, 0, 7, 6, 2);
}

function drawSandTile(g) {
  px(g, 0xc9ad72, 0, 0, 16, 16);
  px(g, 0xd8bd83, 1, 1, 14, 14);
  px(g, 0xb89a5e, 3, 5, 3, 1);
  px(g, 0xb89a5e, 9, 10, 4, 1);
  px(g, 0xe6cf9c, 6, 3, 2, 1);
  px(g, 0xe6cf9c, 12, 13, 2, 1);
}

function drawStageTile(g) {
  // Black lacquered boards under stage wash
  px(g, 0x14101c, 0, 0, 16, 16);
  px(g, 0x1e1828, 0, 1, 16, 6);
  px(g, 0x1a1424, 0, 9, 16, 6);
  px(g, 0x0c0a14, 0, 7, 16, 2);
  px(g, 0x5a2a6a, 2, 2, 5, 1);
  px(g, 0x2a5a6a, 10, 11, 4, 1);
}

function drawSpaTile(g) {
  // Bathhouse stone with grout lines
  px(g, 0x4a5a60, 0, 0, 16, 16);
  px(g, 0x5c6d74, 1, 1, 6, 6);
  px(g, 0x5c6d74, 9, 1, 6, 6);
  px(g, 0x5c6d74, 1, 9, 6, 6);
  px(g, 0x5c6d74, 9, 9, 6, 6);
  px(g, 0x6e8188, 2, 2, 2, 1);
  px(g, 0x6e8188, 10, 10, 2, 1);
}

function drawGlassTile(g) {
  px(g, 0x18303c, 0, 0, 16, 16);
  px(g, 0x24485a, 1, 1, 14, 14);
  px(g, 0x39c5cf, 2, 2, 5, 12);
  px(g, 0x2a94a4, 9, 2, 5, 12);
  px(g, 0xa8e8f0, 3, 3, 1, 8);
  px(g, 0x0e1c24, 7, 0, 2, 16);
}

function drawRopeTile(g) {
  // Velvet rope stanchion
  px(g, 0x2a2010, 0, 0, 16, 16);
  px(g, 0x3a2a14, 1, 1, 14, 14);
  px(g, 0xe8c547, 6, 3, 4, 2);
  px(g, 0xc4a030, 7, 5, 2, 9);
  px(g, 0xe8c547, 5, 13, 6, 2);
  px(g, 0x8a1030, 0, 6, 6, 3);
  px(g, 0x8a1030, 10, 6, 6, 3);
}

const TILE_DRAWERS = {
  [TILE.VOID]: (g) => drawVoidTile(g),
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

// ─── Decor, glows, signage, UI ─────────────────────────────────────────────

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

function drawSoftGlow(g, color) {
  const w = makeWriter(g);
  // Soft radial-ish blob from concentric squares
  w.px(color, 0, 0, 16, 16, 0.04);
  w.px(color, 2, 2, 12, 12, 0.08);
  w.px(color, 4, 4, 8, 8, 0.14);
  w.px(color, 5, 5, 6, 6, 0.22);
  w.px(color, 6, 6, 4, 4, 0.32);
  w.px(0xffffff, 7, 7, 2, 2, 0.18);
}

function drawSignPlaque(g) {
  const w = makeWriter(g);
  // Dark lacquer plaque with thin gold fillet (reads well when stretched)
  w.px(0x0a0812, 0, 0, 16, 16);
  w.px(0xe8c547, 0, 0, 16, 1);
  w.px(0xe8c547, 0, 15, 16, 1);
  w.px(0xe8c547, 0, 0, 1, 16);
  w.px(0xe8c547, 15, 0, 1, 16);
  w.px(0x14101f, 1, 1, 14, 14);
  w.px(0x1c1628, 2, 2, 12, 12);
  w.px(0xc8a030, 2, 2, 12, 1, 0.9);
  w.px(0xc8a030, 2, 13, 12, 1, 0.9);
  w.px(0xc8a030, 2, 2, 1, 12, 0.9);
  w.px(0xc8a030, 13, 2, 1, 12, 0.9);
  w.px(0xffe890, 3, 3, 1, 1);
  w.px(0xffe890, 12, 3, 1, 1);
  w.px(0xffe890, 3, 12, 1, 1);
  w.px(0xffe890, 12, 12, 1, 1);
  w.px(0x2a2038, 4, 4, 8, 8, 0.35);
}

function drawBarDecor(g) {
  const w = makeWriter(g);
  w.px(OUTLINE, 0, 2, 16, 14);
  w.px(0x3a2010, 1, 3, 14, 13);
  w.px(0x5c3a1a, 1, 2, 14, 5);
  w.px(0x9a7040, 2, 2, 12, 3);
  w.px(0xc4a070, 2, 2, 12, 1);
  w.px(0xe8c547, 2, 1, 12, 1);
  // Mirror with reflection bands
  w.px(0x6080a0, 2, 5, 12, 3);
  w.px(0x90b0d0, 3, 5, 4, 1, 0.55);
  w.px(0x90b0d0, 9, 6, 3, 1, 0.4);
  w.px(0xffffff, 4, 5, 1, 1, 0.35);
  // Bottle shelf + labels
  const bottles = [
    [3, 0x48d8e8, 0x80f0ff],
    [6, 0xf08088, 0xffa0a8],
    [9, 0xf0d050, 0xffe890],
    [12, 0xc678dd, 0xe0a0f0],
  ];
  for (const [x, body, hi] of bottles) {
    w.px(OUTLINE, x, 7, 2, 1);
    w.px(body, x, 8, 2, 5);
    w.px(hi, x, 8, 1, 1);
    w.px(0xffffff, x, 10, 1, 1, 0.35);
  }
  w.px(0xffffff, 1, 12, 14, 1);
  w.px(0xffe890, 3, 12, 10, 1);
  // Neon BAR sign
  w.px(0xff4a60, 3, 0, 10, 2);
  w.px(0xff8090, 4, 0, 8, 1, 0.65);
  w.px(OUTLINE, 4, 0, 8, 2);
  w.px(0xffffff, 5, 0, 1, 1, 0.5);
  w.px(0xffffff, 10, 0, 1, 1, 0.35);
}

function drawPlantDecor(g) {
  const w = makeWriter(g);
  w.px(OUTLINE, 3, 10, 10, 6);
  w.px(0x5c3a1a, 4, 11, 8, 5);
  w.px(0x7a5030, 4, 10, 8, 2);
  w.px(0x9a7040, 5, 10, 6, 1);
  w.px(0xc4a070, 5, 10, 3, 1, 0.65);
  w.px(0x3a2410, 6, 12, 4, 3);
  w.px(0xffffff, 5, 11, 1, 1, 0.25);
  w.px(OUTLINE, 7, 7, 2, 4);
  w.px(0x4a3020, 7, 7, 2, 3);
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
  w.px(0x90ffb0, 8, 2, 1, 1, 0.5);
}

function drawSlotDecor(g) {
  const w = makeWriter(g);
  w.px(OUTLINE, 0, 0, 16, 16);
  w.px(0x120810, 1, 1, 14, 15);
  w.px(0x2a1830, 2, 2, 12, 13);
  // Chrome crown
  w.px(0xe8c547, 2, 1, 12, 2);
  w.px(0xffe890, 3, 1, 10, 1);
  w.px(0xc8a030, 2, 2, 12, 1);
  w.px(0xffffff, 4, 1, 3, 1, 0.55);
  // Marquee lights
  w.px(0xf0d050, 3, 3, 10, 4);
  w.px(0xffe890, 4, 3, 8, 2);
  w.px(0xff4a60, 4, 5, 2, 2);
  w.px(0x50e8a0, 7, 5, 2, 2);
  w.px(0x48d8e8, 10, 5, 2, 2);
  w.px(0xffffff, 4, 5, 1, 1, 0.45);
  w.px(0xffffff, 7, 5, 1, 1, 0.45);
  w.px(0xffffff, 10, 5, 1, 1, 0.45);
  // Reels
  w.px(0x0a0810, 3, 8, 10, 4);
  w.px(OUTLINE, 3, 8, 3, 4);
  w.px(OUTLINE, 6, 8, 3, 4);
  w.px(OUTLINE, 9, 8, 4, 4);
  w.px(0xff4a60, 4, 9, 1, 2);
  w.px(0xf0d050, 7, 9, 1, 2);
  w.px(0x50e8a0, 10, 9, 2, 2);
  w.px(0xffffff, 4, 9, 1, 1, 0.4);
  // Lever + coin tray
  w.px(OUTLINE, 14, 6, 2, 6);
  w.px(0xc8a030, 14, 6, 1, 5);
  w.px(0xff4a60, 14, 5, 2, 2);
  w.px(0xff8090, 14, 5, 1, 1);
  w.px(0x383848, 4, 13, 8, 2);
  w.px(0x585868, 5, 13, 6, 1);
  w.px(0xf0d050, 6, 13, 1, 1);
  w.px(0xf0d050, 9, 13, 1, 1);
  w.px(0xffffff, 5, 1, 6, 1);
}

function drawScreenDecor(g) {
  const w = makeWriter(g);
  w.px(OUTLINE, 0, 1, 16, 13);
  w.px(0x0a1018, 1, 2, 14, 11);
  w.px(0xe8c547, 1, 2, 14, 1);
  w.px(0xc8a030, 1, 2, 14, 1, 0.5);
  w.px(0x1a2030, 2, 3, 12, 9);
  w.px(OUTLINE, 2, 3, 12, 9);
  // Broadcast scene
  w.px(0x1a4060, 3, 4, 10, 7);
  w.px(0x48d8e8, 3, 4, 10, 3);
  w.px(0x6ae8f0, 4, 4, 8, 1);
  w.px(0x50e8a0, 3, 7, 10, 2);
  w.px(0x3dd68c, 4, 7, 8, 1);
  // Field markings
  w.px(0xffffff, 7, 7, 2, 2, 0.5);
  w.px(0xffffff, 3, 8, 10, 1, 0.25);
  w.px(0xf0d050, 3, 9, 4, 1);
  w.px(0xf08088, 9, 9, 4, 1);
  // Score bug
  w.px(0x0a0810, 4, 5, 8, 2);
  w.px(0xf0d050, 5, 5, 2, 1);
  w.px(0xf08088, 9, 5, 2, 1);
  w.px(0xffffff, 7, 5, 1, 1, 0.5);
  // Stand + ambient glow
  w.px(OUTLINE, 6, 13, 4, 3);
  w.px(0x1a1520, 7, 13, 2, 3);
  w.px(0x304050, 5, 14, 6, 1);
  w.px(0x48d8e8, 1, 10, 14, 2, 0.14);
  w.px(0x6ae8f0, 3, 11, 10, 1, 0.1);
}

export function createGameTextures(scene) {
  for (const [id, drawer] of Object.entries(TILE_DRAWERS)) {
    const tileId = Number(id);
    for (let v = 0; v < TILE_VARIANTS; v++) {
      const key = v === 0 ? `tile_${tileId}` : `tile_${tileId}_v${v}`;
      makeTex(scene, key, (g) => drawer(g, v));
    }
  }

  // Animated water frames (used by GameScenes for pool/water tiles)
  for (let frame = 0; frame < 3; frame++) {
    makeTex(scene, `tile_water_f${frame}`, (g) => drawWaterTile(g, 0, frame));
  }

  makeTex(scene, "decor_bar", drawBarDecor);
  makeTex(scene, "decor_plant", drawPlantDecor);
  makeTex(scene, "decor_slot", drawSlotDecor);
  makeTex(scene, "decor_screen", drawScreenDecor);
  makeTex(scene, "decor_glass", drawGlassTile);
  makeTex(scene, "decor_rope", drawRopeTile);
  makeTex(scene, "sign_plaque", drawSignPlaque);
  makeTex(scene, "glow_gold", (g) => drawSoftGlow(g, 0xe8c547));
  makeTex(scene, "glow_cyan", (g) => drawSoftGlow(g, 0x39c5cf));
  makeTex(scene, "glow_magenta", (g) => drawSoftGlow(g, 0xc678dd));
  makeTex(scene, "glow_red", (g) => drawSoftGlow(g, 0xff4a60));
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
