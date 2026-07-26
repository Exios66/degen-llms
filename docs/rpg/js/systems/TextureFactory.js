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

function groutGrid(w, grout, step = 8) {
  for (let i = step; i < 16; i += step) {
    w.px(grout, i, 0, 1, 16);
    w.px(grout, 0, i, 16, 1);
  }
}

/**
 * A writer that sees one 16px tile of a larger pattern.
 *
 * A motif that fits inside a tile is a motif that repeats every 32 screen
 * pixels, and the eye finds that grid immediately however pretty the motif is.
 * The way out is to draw the pattern at the size it wants to be — four tiles
 * across — and cut it up. The block drawer works in block coordinates and this
 * clips each write to the tile being baked, so nothing spills into a
 * neighbouring texture and nothing has to know it was cut.
 */
function patchWriter(w, ox, oy) {
  return {
    px: (color, x, y, pw = 1, ph = 1, alpha) => {
      const x0 = Math.max(0, x - ox);
      const y0 = Math.max(0, y - oy);
      const x1 = Math.min(16, x - ox + pw);
      const y1 = Math.min(16, y - oy + ph);
      if (x1 <= x0 || y1 <= y0) return;
      w.px(color, x0, y0, x1 - x0, y1 - y0, alpha);
    },
  };
}

function makeTex(scene, key, draw, w = TILE_SIZE, h = TILE_SIZE) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

// ─── Ground tiles ──────────────────────────────────────────────────────────

/**
 * Concourse marble, drawn four tiles at a time.
 *
 * This is the floor most of the resort stands on, so its repeat is the one that
 * shows. Per-tile veins and a per-tile polish highlight put the same two marks
 * in the same place a thousand times over; across a block the veins wander, the
 * sheen pools, and the only thing on a strict grid is the grout, which is
 * supposed to be.
 */
function drawLobbyPatch(w) {
  driftFill(w, [0xdcd2bd, 0xe1d8c5, 0xe7dfcf, 0xece5d8, 0xf2ece1]);

  // Veins, broken into runs. An unbroken diagonal across a whole concourse
  // reads as a scratch on the screen rather than as something in the stone.
  const vein = (slope, phase, amp, color, alpha) => {
    for (let t = 0; t < 64; t += 1) {
      if ((t + phase) % 19 < 6) continue;
      const y = (slope * t + phase + amp * Math.sin((2 * Math.PI * t) / 64) + 128) % 64;
      w.px(color, t, Math.floor(y), 1, 1, alpha);
    }
  };
  vein(1, 10, 9, 0xcdbea6, 0.4);
  vein(-1, 52, 6, 0xd4c6ae, 0.28);

  // Polished sheen, pooled where the drift is highest rather than at a fixed
  // spot in every tile.
  for (let y = 0; y < 64; y += 1) {
    for (let x = 0; x < 64; x += 1) {
      if (blockDrift(x, y) > 0.62) w.px(0xfff8f0, x, y, 1, 1, 0.35);
    }
  }

  // Grout on a strict 8px pitch, so slabs stay square across the whole floor.
  // This is the only thing here that is allowed to be regular.
  for (let i = 0; i < 64; i += 8) {
    w.px(0xb8a890, i, 0, 1, 64, 0.7);
    w.px(0xb8a890, 0, i, 64, 1, 0.7);
  }
}

/**
 * Seamless tonal drift across a 64px block, in the range −1…1.
 *
 * A flat fill under a pattern looks printed, and a few translucent rectangles
 * dropped over it look like a few translucent rectangles. Summed sines whose
 * periods all divide 64 give a soft mottle that meets itself exactly at the
 * block edges, so the drift carries from one block to the next.
 */
function blockDrift(x, y) {
  const t = (2 * Math.PI) / 64;
  return (
    0.55 * Math.sin(t * x + 0.6) * Math.sin(t * y + 2.1)
    + 0.28 * Math.sin(2 * t * x + 1.7) * Math.sin(t * y - 0.4)
    + 0.22 * Math.sin(t * x - 1.2) * Math.sin(2 * t * y + 0.9)
  );
}

/** A second drift, out of step with the first, for layering. */
function blockDriftB(x, y) {
  const t = (2 * Math.PI) / 64;
  return (
    0.5 * Math.sin(t * y - 0.9) * Math.sin(2 * t * x + 0.3)
    + 0.3 * Math.sin(3 * t * x + 2.6) * Math.sin(2 * t * y + 1.4)
    + 0.2 * Math.sin(2 * t * x - 2.2) * Math.sin(3 * t * y - 0.7)
  );
}

/** Fill a block with a ramp of tones picked by the drift, dithered. */
function driftFill(w, tones) {
  const last = tones.length - 1;
  for (let y = 0; y < 64; y += 1) {
    for (let x = 0; x < 64; x += 1) {
      const bias = ((x + y) % 2) * 0.06 - 0.03;
      const t = (blockDrift(x, y) + 1) / 2 + bias;
      w.px(tones[Math.max(0, Math.min(last, Math.round(t * last)))], x, y);
    }
  }
}

/**
 * Casino carpet, drawn four tiles at a time.
 *
 * Two earlier versions put a motif in the middle of each tile — first a filled
 * gold block, then an outlined fleuron — and both tiled a room into a
 * chequerboard, because a motif that fits inside a tile repeats on the tile
 * grid however it is drawn. This is a diamond lattice on a 32px pitch laid
 * across a 64px block instead: the ribs cross tile seams, the medallions land
 * where the lattice puts them rather than at the tile centre, and alternating
 * their colour puts the true repeat at four tiles.
 */
function drawCarpetPatch(w) {
  const rib = 0x7d5c22;
  const ribLit = 0xa07a30;
  const gold = 0xc9a049;
  const teal = 0x1d6160;
  const tealLo = 0x144443;

  driftFill(w, [0x4a0824, 0x520a2b, 0x5a0c30, 0x621038, 0x6a143e]);

  for (let y = 0; y < 64; y += 1) {
    for (let x = 0; x < 64; x += 1) {
      // Distance to the nearest lattice centre, and to the smaller medallion
      // sitting in the gap between four of them.
      const dx = (x % 32) - 16;
      const dy = (y % 32) - 16;
      const d = Math.abs(dx) + Math.abs(dy);
      const gap = 32 - d;
      // Which medallion of the block this is, so alternate ones differ.
      const cell = (Math.floor(x / 32) + Math.floor(y / 32)) % 2;
      if (d === 15) w.px(dx + dy < 0 ? ribLit : rib, x, y);
      else if (d === 14) w.px(rib, x, y, 1, 1, 0.35);
      else if (d === 8) w.px(cell ? tealLo : rib, x, y, 1, 1, 0.85);
      else if (d === 7 && (dx === 0 || dy === 0)) w.px(cell ? teal : ribLit, x, y);
      else if (d <= 2) w.px(cell ? teal : gold, x, y);
      else if (d === 3 && (dx === 0 || dy === 0)) w.px(cell ? tealLo : ribLit, x, y);
      else if (gap <= 1) w.px(cell ? gold : teal, x, y, 1, 1, 0.85);
      else if (gap <= 3 && (dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy))) {
        w.px(rib, x, y, 1, 1, 0.5);
      }
    }
  }
}

function drawFeltTile(g) {
  const w = makeWriter(g);
  // Baize. Every tile used to carry its own gold rail and its own white betting
  // circle, so a pit came out as a wall of framed coasters instead of a table.
  // The rail moved to EDGE_DRAWERS and the circle went altogether: this is the
  // cloth, and nothing else. Nap only, at a contrast you read as texture rather
  // than as pattern.
  w.px(0x115c33, 0, 0, 16, 16);
  ditherWeave(w, 0, 0, 16, 16, 0x13633a, 0x105830);
  // Nap, at four flecks a tile. A wash across part of the tile would band the
  // whole pit at 32px intervals, which is the mistake the rail already made.
  w.px(0x18754a, 3, 2, 2, 1, 0.3);
  w.px(0x0b431f, 11, 6, 2, 1, 0.25);
  w.px(0x18754a, 6, 11, 2, 1, 0.28);
  w.px(0x0b431f, 1, 14, 2, 1, 0.2);
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

/**
 * The gold runner that connects the wings, drawn four tiles at a time.
 *
 * It was five concentric squares ending in a near-white centre, which at a
 * hundred tiles a room read as stacked bullion rather than as a floor you walk
 * down. It is a woven runner now: one warm gold under a fine weft, worn lighter
 * where the drift says the traffic goes, and the kerb only where it ends.
 */
function drawPathPatch(w) {
  driftFill(w, [0x9c7a2a, 0xa5822e, 0xad8a33, 0xb59239, 0xbd9a40]);
  for (let y = 1; y < 64; y += 3) {
    for (let x = 0; x < 64; x += 1) {
      w.px(0xc9a44a, x, y, 1, 1, 0.28);
      w.px(0x8e6d24, x, y + 1, 1, 1, 0.22);
    }
  }
  for (let y = 0; y < 64; y += 1) {
    for (let x = 0; x < 64; x += 1) {
      if (blockDrift(x, y) > 0.75) w.px(0xd8b869, x, y, 1, 1, 0.3);
    }
  }
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

/**
 * Pool water, drawn four tiles at a time.
 *
 * The old tile put a depth band across its own middle and a caustic streak at
 * its own top, so the lazy river came out corrugated. Caustics are the one
 * thing here that has to be drawn as a field rather than as marks: these are
 * the contour lines of the same drift the other floors use, which is exactly
 * the shape light makes on the bottom of a pool.
 */
function drawWaterPatch(w) {
  driftFill(w, [0x0e3c5c, 0x114668, 0x145174, 0x175c80, 0x1a678c]);
  for (let y = 0; y < 64; y += 1) {
    for (let x = 0; x < 64; x += 1) {
      // Two drifts out of step, so the contours make an open net rather than a
      // field of identical closed loops.
      const d = blockDrift(x, y) + 0.7 * blockDriftB(x, y);
      for (const level of [0.62, 0.05, -0.55]) {
        const band = Math.abs(d - level);
        if (band < 0.035) w.px(0x6ae8f0, x, y, 1, 1, 0.5);
        else if (band < 0.09) w.px(0x39c5cf, x, y, 1, 1, 0.22);
      }
      if (d < -1.05) w.px(0x0a2f4a, x, y, 1, 1, 0.4);
    }
  }
}

/**
 * The high limit salon's marble, drawn four tiles at a time.
 *
 * Veins are the whole point of marble and they are longer than a tile. Fitting
 * them into one meant a gold elbow in every slab, which tiled the salon into
 * something between a maze and a circuit board. Across a 64px block a vein can
 * actually wander; each one runs on a 45° diagonal with a sine wobble so it
 * leaves the block exactly where it entered and the seam disappears.
 */
function drawVipPatch(w) {
  driftFill(w, [0x100d18, 0x141120, 0x181425, 0x1c182b, 0x211c33]);

  const vein = (slope, phase, amp, color, lit, alpha) => {
    for (let t = 0; t < 64; t += 1) {
      const x = t;
      const y = (slope * t + phase + amp * Math.sin((2 * Math.PI * t) / 64) + 128) % 64;
      w.px(color, x, Math.floor(y), 1, 1, alpha);
      w.px(color, x, Math.floor(y) + 1, 1, 1, alpha * 0.5);
      if (t % 7 < 3) w.px(lit, x, Math.floor(y), 1, 1, alpha * 0.8);
    }
  };
  vein(1, 6, 7, 0x2e2740, 0x413859, 0.9);
  vein(-1, 44, 9, 0x2a2338, 0x3a3350, 0.7);
  vein(2, 20, 5, 0x241f31, 0x342d45, 0.55);
  // One gold seam, because this is the room where that reads as money rather
  // than as decoration.
  vein(1, 38, 11, 0x6a5214, 0x9c7628, 0.65);
}

/**
 * The aquarium's mosaic deck, drawn four tiles at a time.
 *
 * A shimmer line ran across the same two rows of every tile, which striped the
 * exhibit hall end to end. The shimmer is now a wash that pools where the tank
 * light falls, and the mosaic underneath it is a strict 4px grid — small enough
 * that it reads as mosaic rather than as the tile grid it sits on.
 */
function drawAquaPatch(w) {
  driftFill(w, [0x112c3a, 0x143342, 0x173a4c, 0x1a4155, 0x1e485e]);
  for (let y = 0; y < 64; y += 4) {
    for (let x = 0; x < 64; x += 4) {
      const tone = ((x + y) / 4) % 2 === 0 ? 0x000000 : 0xffffff;
      w.px(tone, x, y, 4, 4, 0.06);
      w.px(0xffffff, x + 1, y + 1, 2, 1, 0.05);
      w.px(0x0c2030, x + 3, y, 1, 4, 0.55);
      w.px(0x0c2030, x, y + 3, 4, 1, 0.55);
    }
  }
  // Tank light on the deck.
  for (let y = 0; y < 64; y += 1) {
    for (let x = 0; x < 64; x += 1) {
      const d = blockDrift(x, y);
      if (d > 0.55) w.px(0x39c5cf, x, y, 1, 1, 0.16);
      else if (d > 0.3) w.px(0x39c5cf, x, y, 1, 1, 0.07);
    }
  }
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

/**
 * Floors whose pattern is bigger than one tile, and the block that draws it.
 *
 * `size` is the block's width and height in tiles; the drawer paints the whole
 * block in its own coordinates and each tile bakes the window it owns.
 */
const PATCH_FLOORS = {
  [TILE.LOBBY]: { size: 4, draw: drawLobbyPatch },
  [TILE.CARPET]: { size: 4, draw: drawCarpetPatch },
  [TILE.VIP]: { size: 4, draw: drawVipPatch },
  [TILE.PATH]: { size: 4, draw: drawPathPatch },
  [TILE.WATER]: { size: 4, draw: drawWaterPatch },
  [TILE.AQUA]: { size: 4, draw: drawAquaPatch },
};

/** The drawer for one tile of a patch floor's block. */
const patchCell = (tile, cx, cy) => (target) => {
  const { draw } = PATCH_FLOORS[tile];
  draw(patchWriter(makeWriter(target), cx * 16, cy * 16));
};

const TILE_DRAWERS = {
  [TILE.VOID]: drawVoidTile,
  [TILE.LOBBY]: patchCell(TILE.LOBBY, 0, 0),
  [TILE.CARPET]: patchCell(TILE.CARPET, 0, 0),
  [TILE.FELT]: drawFeltTile,
  [TILE.PLANT]: drawPlantTile,
  [TILE.WATER]: patchCell(TILE.WATER, 0, 0),
  [TILE.WALL]: drawWallTile,
  [TILE.BAR]: drawBarTile,
  [TILE.SLOT]: drawSlotTile,
  [TILE.SCREEN]: drawScreenTile,
  [TILE.VIP]: patchCell(TILE.VIP, 0, 0),
  [TILE.AQUA]: patchCell(TILE.AQUA, 0, 0),
  [TILE.ROAD]: drawRoadTile,
  [TILE.SAND]: drawSandTile,
  [TILE.STAGE]: drawStageTile,
  [TILE.SPA]: drawSpaTile,
  [TILE.GLASS]: drawGlassTile,
  [TILE.ROPE]: drawRopeTile,
  [TILE.ICE]: drawIceTile,
  [TILE.PATH]: patchCell(TILE.PATH, 0, 0),
  [TILE.TRIM]: drawTrimTile,
};

/**
 * Wide floors otherwise read as wallpaper, because every tile repeats on an
 * exact 32px grid. Each of these gets a few extra variants with a sparse scuff
 * pattern laid over the base draw — too faint to notice on one tile, enough to
 * hide the grid across a ballroom.
 */
const SCUFFED_FLOORS = new Set([
  TILE.FELT, TILE.ROAD, TILE.SAND, TILE.SPA, TILE.ICE,
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

/**
 * Floors that are a bordered surface rather than a repeating material.
 *
 * A table pit and a walkway both have an edge in the world, and drawing that
 * edge into every tile — a gold rail around each square of felt, a kerb around
 * each square of runner — turns one twelve-metre table into a hundred and
 * thirty-two coasters. These floors draw their border only on the sides that
 * actually face something else, so a region reads as one object.
 */
const EDGE_DRAWERS = {
  [TILE.FELT]: (w, side) => {
    const rail = 0x8a6018;
    const lit = 0xe8c547;
    const shade = 0x073a20;
    if (side === "n") {
      w.px(rail, 0, 0, 16, 2);
      w.px(lit, 0, 0, 16, 1);
      w.px(shade, 0, 2, 16, 1, 0.45);
    } else if (side === "s") {
      w.px(rail, 0, 14, 16, 2);
      w.px(lit, 0, 14, 16, 1);
      w.px(shade, 0, 13, 16, 1, 0.3);
    } else if (side === "w") {
      w.px(rail, 0, 0, 2, 16);
      w.px(lit, 0, 0, 1, 16);
      w.px(shade, 2, 0, 1, 16, 0.45);
    } else {
      w.px(rail, 14, 0, 2, 16);
      w.px(lit, 14, 0, 1, 16);
      w.px(shade, 13, 0, 1, 16, 0.3);
    }
  },
  [TILE.PATH]: (w, side) => {
    const kerb = 0x7c5e1c;
    const lit = 0xd9b552;
    if (side === "n") {
      w.px(kerb, 0, 0, 16, 1);
      w.px(lit, 0, 1, 16, 1);
    } else if (side === "s") {
      w.px(kerb, 0, 15, 16, 1);
      w.px(lit, 0, 14, 16, 1);
    } else if (side === "w") {
      w.px(kerb, 0, 0, 1, 16);
      w.px(lit, 1, 0, 1, 16);
    } else {
      w.px(kerb, 15, 0, 1, 16);
      w.px(lit, 14, 0, 1, 16);
    }
  },
};

const SIDES = ["n", "e", "s", "w"];
const SIDE_STEP = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };

/**
 * Which sides of this tile face something that is not the same floor.
 *
 * Off the edge of the map counts as facing out, so a region that runs to the
 * border is still closed off.
 */
export function edgeMask(ground, tile, x, y) {
  let mask = 0;
  SIDES.forEach((side, bit) => {
    const [dx, dy] = SIDE_STEP[side];
    if (ground?.[y + dy]?.[x + dx] !== tile) mask |= 1 << bit;
  });
  return mask;
}

/**
 * Every ground texture key and the drawer that paints it.
 *
 * Built once at module load so the scene, the previews and the headless checks
 * all work from the same list — a variant that is registered but never keyed,
 * or keyed but never registered, is the failure this table rules out.
 */
const GROUND_DRAWERS = (() => {
  const out = {};
  for (const [id, drawer] of Object.entries(TILE_DRAWERS)) {
    const tile = Number(id);
    out[`tile_${id}`] = drawer;
    const patch = PATCH_FLOORS[tile];
    if (patch) {
      for (let cell = 1; cell < patch.size * patch.size; cell += 1) {
        out[`tile_${id}_p${cell}`] = patchCell(tile, cell % patch.size, Math.floor(cell / patch.size));
      }
    }
    const edge = EDGE_DRAWERS[tile];
    if (edge) {
      for (let mask = 1; mask < 16; mask += 1) {
        out[`tile_${id}_e${mask}`] = (target) => {
          drawer(target);
          const w = makeWriter(target);
          SIDES.forEach((side, bit) => {
            if (mask & (1 << bit)) edge(w, side);
          });
        };
      }
    }
    if (!SCUFFED_FLOORS.has(tile)) continue;
    SCUFFS.forEach((_, variant) => {
      out[`tile_${id}_s${variant}`] = (target) => {
        drawer(target);
        scuff(target, variant);
      };
    });
    const accent = FLOOR_ACCENTS[tile];
    if (accent) {
      out[`tile_${id}_s${SCUFFS.length}`] = (target) => {
        drawer(target);
        accent(makeWriter(target));
      };
    }
  }
  return out;
})();

/** Every ground texture key createGameTextures() will register. */
export function groundTextureKeys() {
  return Object.keys(GROUND_DRAWERS);
}

/**
 * Texture key for a ground tile at a map position.
 *
 * Interior tiles spread the scuff variants so a wide floor does not read as
 * wallpaper; a bordered floor picks the variant carrying the sides it needs.
 */
export function groundTileKey(tile, x, y, ground = null) {
  if (EDGE_DRAWERS[tile] && ground) {
    const mask = edgeMask(ground, tile, x, y);
    if (mask) return `tile_${tile}_e${mask}`;
  }
  const patch = PATCH_FLOORS[tile];
  if (patch) {
    const cell = (y % patch.size) * patch.size + (x % patch.size);
    return cell === 0 ? `tile_${tile}` : `tile_${tile}_p${cell}`;
  }
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
  return [...groundTextureKeys(), ...Object.keys(SPRITE_DRAWERS)];
}

/**
 * Draw one art key onto a 2D canvas at `pixelScale` screen pixels per art unit.
 *
 * The scene draws through Phaser Graphics; this is the same drawer against a
 * canvas, for previews, portraits and headless checks.
 */
export function drawArtToCanvas(canvas, key, pixelScale = SCALE) {
  const drawer = GROUND_DRAWERS[key] ?? SPRITE_DRAWERS[key];
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
  for (const [key, drawer] of Object.entries(GROUND_DRAWERS)) {
    makeTex(scene, key, drawer);
  }

  for (const [key, drawer] of Object.entries(SPRITE_DRAWERS)) {
    makeTex(scene, key, drawer, TILE_SIZE, artHeightUnits(key) * SCALE);
  }
}

