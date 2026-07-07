#!/usr/bin/env node
/**
 * Generate original RPG Maker-style equestrian horse sprite frame data.
 * Output: docs/js/horse-sprite-frames.js
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../docs/js/horse-sprite-frames.js");

const FRAME_W = 32;
const FRAME_H = 32;
const GALLOP_W = 48;
const GALLOP_H = 32;

function emptyGrid() {
  return Array.from({ length: FRAME_H }, () => Array(FRAME_W).fill("."));
}

function set(grid, x, y, key) {
  if (x >= 0 && x < FRAME_W && y >= 0 && y < FRAME_H) grid[y][x] = key;
}

function fillRect(grid, x, y, w, h, key) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) set(grid, x + dx, y + dy, key);
  }
}

function mirrorGrid(grid) {
  return grid.map((row) => [...row].reverse());
}

function outlineGridSized(grid, width, height) {
  const out = grid.map((row) => [...row]);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] === ".") continue;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            set(out, x, y, "k");
            continue;
          }
          if (grid[ny][nx] === ".") set(out, x, y, "k");
        }
      }
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] !== "." && out[y][x] === "k") out[y][x] = grid[y][x];
    }
  }
  return out;
}

function outlineGrid(grid) {
  return outlineGridSized(grid, FRAME_W, FRAME_H);
}

function addHighlightShade(grid) {
  const out = grid.map((row) => [...row]);
  for (let y = 0; y < FRAME_H; y++) {
    for (let x = 0; x < FRAME_W; x++) {
      const c = grid[y][x];
      if (c === "b" && grid[y]?.[x - 1] === "b" && grid[y - 1]?.[x] === "b") out[y][x] = "h";
      if (c === "b" && (grid[y + 1]?.[x] === "b" || grid[y]?.[x + 1] === "b")) {
        if (out[y][x] === "b") out[y][x] = "l";
      }
    }
  }
  return out;
}

function drawLegSide(grid, x, y, lift, sock = false) {
  const ly = y - lift;
  fillRect(grid, x, ly, 2, 5, "b");
  fillRect(grid, x, ly + 5, 2, 3, sock ? "s" : "b");
  fillRect(grid, x, ly + 8, 2, 2, "f");
}

function drawRightFrame(walkPhase, sockLegs = false) {
  const g = emptyGrid();
  const legShift = [0, 1, 0][walkPhase];
  const bob = [0, 0, 1][walkPhase];

  fillRect(g, 5, 12 - bob, 2, 2, "m");
  fillRect(g, 4, 14 - bob, 2, 3, "n");
  fillRect(g, 5, 17 - bob, 2, 2, "m");
  fillRect(g, 6, 19 - bob, 1, 2, "n");

  drawLegSide(g, 11, 22 - bob, legShift === 1 ? 2 : 0, sockLegs);
  drawLegSide(g, 15, 22 - bob, legShift === 1 ? 0 : 2, sockLegs);

  fillRect(g, 9, 13 - bob, 14, 9, "b");
  fillRect(g, 10, 12 - bob, 12, 10, "b");
  fillRect(g, 11, 14 - bob, 10, 5, "h");

  fillRect(g, 19, 9 - bob, 5, 8, "b");
  fillRect(g, 20, 8 - bob, 3, 7, "h");

  fillRect(g, 18, 6 - bob, 3, 5, "n");
  fillRect(g, 19, 5 - bob, 2, 6, "m");
  fillRect(g, 20, 4 - bob, 2, 5, "m");

  fillRect(g, 22, 8 - bob, 7, 7, "b");
  fillRect(g, 26, 9 - bob, 4, 5, "b");
  fillRect(g, 28, 10 - bob, 2, 3, "h");
  fillRect(g, 29, 13 - bob, 3, 3, "z");
  set(g, 27, 10 - bob, "w");
  set(g, 28, 10 - bob, "e");

  fillRect(g, 23, 6 - bob, 2, 2, "b");

  drawLegSide(g, 20, 22 - bob, legShift === 1 ? 0 : 2, sockLegs);
  drawLegSide(g, 24, 22 - bob, legShift === 1 ? 2 : 0, sockLegs);

  return addHighlightShade(outlineGrid(g));
}

function drawFrontFrame(walkPhase) {
  const g = emptyGrid();
  const shift = [0, 1, -1][walkPhase];
  const bob = [0, 1, 0][walkPhase];

  fillRect(g, 13, 18 - bob, 2, 3, "n");
  fillRect(g, 14, 20 - bob, 2, 2, "m");

  drawLegSide(g, 11 + shift, 22 - bob, walkPhase === 1 ? 1 : 0);
  drawLegSide(g, 18 - shift, 22 - bob, walkPhase === 2 ? 1 : 0);

  fillRect(g, 10, 14 - bob, 12, 8, "b");
  fillRect(g, 11, 13 - bob, 10, 9, "b");
  fillRect(g, 12, 15 - bob, 8, 4, "h");

  fillRect(g, 12, 10 - bob, 8, 6, "b");

  fillRect(g, 11, 7 - bob, 10, 3, "n");
  fillRect(g, 12, 6 - bob, 8, 4, "m");
  fillRect(g, 13, 5 - bob, 6, 3, "m");

  fillRect(g, 11, 8 - bob, 10, 6, "b");
  fillRect(g, 12, 7 - bob, 8, 5, "h");
  fillRect(g, 13, 12 - bob, 6, 2, "z");
  set(g, 13, 9 - bob, "w");
  set(g, 14, 9 - bob, "e");
  set(g, 17, 9 - bob, "w");
  set(g, 18, 9 - bob, "e");

  set(g, 12, 5 - bob, "b");
  set(g, 13, 4 - bob, "b");
  set(g, 18, 4 - bob, "b");
  set(g, 19, 5 - bob, "b");

  drawLegSide(g, 12 - shift, 22 - bob, walkPhase === 2 ? 1 : 0);
  drawLegSide(g, 17 + shift, 22 - bob, walkPhase === 1 ? 1 : 0);

  return addHighlightShade(outlineGrid(g));
}

function drawBackFrame(walkPhase) {
  const g = emptyGrid();
  const shift = [0, 1, -1][walkPhase];
  const bob = [0, 1, 0][walkPhase];

  fillRect(g, 13, 16 - bob, 6, 4, "m");
  fillRect(g, 14, 20 - bob, 4, 3, "n");
  fillRect(g, 15, 23 - bob, 2, 2, "m");

  drawLegSide(g, 11 + shift, 22 - bob, walkPhase === 1 ? 1 : 0);
  drawLegSide(g, 18 - shift, 22 - bob, walkPhase === 2 ? 1 : 0);
  drawLegSide(g, 12 - shift, 22 - bob, walkPhase === 2 ? 1 : 0);
  drawLegSide(g, 17 + shift, 22 - bob, walkPhase === 1 ? 1 : 0);

  fillRect(g, 10, 14 - bob, 12, 8, "b");
  fillRect(g, 11, 13 - bob, 10, 9, "b");
  fillRect(g, 12, 15 - bob, 8, 4, "l");

  fillRect(g, 12, 10 - bob, 8, 6, "b");
  fillRect(g, 13, 9 - bob, 6, 5, "l");

  fillRect(g, 11, 7 - bob, 10, 3, "n");
  fillRect(g, 12, 6 - bob, 8, 4, "m");

  set(g, 12, 5 - bob, "b");
  set(g, 19, 5 - bob, "b");

  return addHighlightShade(outlineGrid(g));
}

function gridToRows(grid) {
  return grid.map((row) => row.join(""));
}

function emptyGallopGrid() {
  return Array.from({ length: GALLOP_H }, () => Array(GALLOP_W).fill("."));
}

const GALLOP_FRAME_COUNT = 6;
const GALLOP_BOB = [0, 0, 2, 2, 1, 0];
const GALLOP_TAIL_BOB = [0, 1, 2, 1, 0, -1];
const GALLOP_MANE_FLICK = [0, 0, 1, 1, 0, 0];

/** Chibi side-profile gallop — black outlines, two-tone body, blush, 6-frame bounce cycle. */
function drawChibiGallopRightFrame(phase) {
  const g = emptyGallopGrid();
  const bob = GALLOP_BOB[phase];
  const tailBob = GALLOP_TAIL_BOB[phase];
  const maneFlick = GALLOP_MANE_FLICK[phase];

  // Tail — bobs with body rhythm
  fillRect(g, 5, 14 - tailBob - bob, 5, 3, "t");
  fillRect(g, 3, 16 - tailBob - bob, 4, 3, "n");
  fillRect(g, 4, 18 - tailBob - bob, 3, 2, "t");

  // Compact chibi barrel — warm top, shaded lower half
  fillRect(g, 13, 15 - bob, 17, 8, "l");
  fillRect(g, 14, 11 - bob, 15, 7, "b");
  fillRect(g, 15, 10 - bob, 13, 4, "h");

  // Thick neck
  fillRect(g, 25, 10 - bob, 7, 8, "b");
  fillRect(g, 26, 9 - bob, 5, 4, "h");
  fillRect(g, 25, 15 - bob, 6, 3, "l");

  // Large rounded head
  fillRect(g, 29, 8 - bob, 11, 9, "b");
  fillRect(g, 30, 7 - bob, 9, 4, "h");
  fillRect(g, 35, 13 - bob, 7, 5, "b");
  fillRect(g, 37, 15 - bob, 5, 3, "l");
  set(g, 36, 10 - bob, "e");
  set(g, 37, 12 - bob, "p");
  set(g, 38, 12 - bob, "p");

  // Mane tuft — subtle two-position flicker
  fillRect(g, 30 + maneFlick, 5 - bob, 4, 3, "m");
  set(g, 31 + maneFlick, 4 - bob, "m");
  set(g, 32 + maneFlick, 5 - bob, "n");

  const drawStubLeg = (x, baseY, lift) => {
    const ly = baseY - lift - bob;
    fillRect(g, x, ly, 3, 3, "l");
    fillRect(g, x, ly + 3, 3, 2, "l");
    fillRect(g, x + 1, ly + 5, 2, 2, "n");
  };

  // Six-phase gallop: contact → push → flight peak → flight → front contact → gather
  switch (phase) {
    case 0:
      drawStubLeg(15, 23, 0);
      drawStubLeg(19, 23, 0);
      drawStubLeg(28, 22, 3);
      drawStubLeg(32, 21, 4);
      break;
    case 1:
      drawStubLeg(14, 23, 1);
      drawStubLeg(18, 23, 0);
      drawStubLeg(29, 21, 5);
      drawStubLeg(33, 20, 6);
      break;
    case 2:
      drawStubLeg(17, 20, 6);
      drawStubLeg(21, 19, 7);
      drawStubLeg(26, 20, 6);
      drawStubLeg(30, 19, 7);
      break;
    case 3:
      drawStubLeg(16, 21, 5);
      drawStubLeg(20, 20, 6);
      drawStubLeg(27, 21, 5);
      drawStubLeg(31, 20, 6);
      break;
    case 4:
      drawStubLeg(28, 23, 0);
      drawStubLeg(32, 23, 0);
      drawStubLeg(16, 21, 4);
      drawStubLeg(20, 20, 5);
      break;
    default:
      drawStubLeg(27, 23, 0);
      drawStubLeg(31, 23, 0);
      drawStubLeg(15, 23, 1);
      drawStubLeg(19, 23, 0);
      break;
  }

  return outlineGridSized(g, GALLOP_W, GALLOP_H);
}

const BASE_FRAMES = {
  right: [0, 1, 2].map((p) => gridToRows(drawRightFrame(p, false))),
  left: [0, 1, 2].map((p) => gridToRows(mirrorGrid(drawRightFrame(p, false)))),
  front: [0, 1, 2].map((p) => gridToRows(drawFrontFrame(p))),
  back: [0, 1, 2].map((p) => gridToRows(drawBackFrame(p))),
};

// Bay uses dark socks on lower legs
const BAY_FRAMES = {
  right: [0, 1, 2].map((p) => gridToRows(drawRightFrame(p, true))),
  left: [0, 1, 2].map((p) => gridToRows(mirrorGrid(drawRightFrame(p, true)))),
  front: BASE_FRAMES.front,
  back: BASE_FRAMES.back,
};

const COAT_FRAME_OVERRIDES = { bay: BAY_FRAMES };

const GALLOP_FRAMES = {
  right: Array.from({ length: GALLOP_FRAME_COUNT }, (_, p) => gridToRows(drawChibiGallopRightFrame(p))),
};

const COAT_PALETTES = {
  black: { k: "#101010", b: "#484848", l: "#303030", h: "#686868", m: "#303038", n: "#202028", f: "#101010", e: "#101010", w: "#d8d8d8", z: "#585858", s: "#282828", t: "#383840", p: "#886878" },
  tan: { k: "#101010", b: "#e8b890", l: "#c0a0b8", h: "#f0c8a0", m: "#485868", n: "#384858", f: "#101010", e: "#101010", w: "#f8f4e8", z: "#f0d0b0", s: "#b89868", t: "#485868", p: "#e89098" },
  grey: { k: "#101010", b: "#b8b8c0", l: "#9898a8", h: "#d8d8e0", m: "#586068", n: "#485058", f: "#383840", e: "#101010", w: "#f0f0f0", z: "#c8c8d0", s: "#9898a0", t: "#586068", p: "#c8a0b0" },
  chestnut: { k: "#101010", b: "#d87840", l: "#b86868", h: "#f09858", m: "#685848", n: "#584038", f: "#382010", e: "#101010", w: "#f8f4e8", z: "#e89060", s: "#a85828", t: "#685848", p: "#e87888" },
  light_brown: { k: "#101010", b: "#a87848", l: "#987868", h: "#c89860", m: "#584838", n: "#483828", f: "#302010", e: "#101010", w: "#f8f4e8", z: "#b88858", s: "#885830", t: "#584838", p: "#d89090" },
  dark_brown: { k: "#101010", b: "#684028", l: "#583838", h: "#885840", m: "#383028", n: "#282018", f: "#101010", e: "#101010", w: "#d8c8b8", z: "#785030", s: "#482818", t: "#383028", p: "#a87078" },
  bay: { k: "#101010", b: "#985038", l: "#884848", h: "#b86848", m: "#383028", n: "#282018", f: "#101010", e: "#101010", w: "#f8f4e8", z: "#a86040", s: "#181008", t: "#384048", p: "#c87888" },
  dapple: { k: "#101010", b: "#989080", l: "#887888", h: "#b8b0a0", m: "#687078", n: "#586068", f: "#383028", e: "#101010", w: "#f0f0f0", z: "#a89888", s: "#787060", t: "#687078", p: "#c8a0a8" },
};

const fileContent = `/**
 * Original RPG Maker-style equestrian horse sprite frames.
 * Generated by scripts/generate-horse-sprite-frames.mjs — do not edit by hand.
 * Walk: 8 coats × 4 dirs × 3 frames @ 32×32. Gallop: chibi side profile × ${GALLOP_FRAME_COUNT} frames @ 48×32.
 */

export const HORSE_FRAME_W = ${FRAME_W};
export const HORSE_FRAME_H = ${FRAME_H};
export const HORSE_GALLOP_W = ${GALLOP_W};
export const HORSE_GALLOP_H = ${GALLOP_H};
export const HORSE_GALLOP_FRAME_COUNT = ${GALLOP_FRAME_COUNT};

/** Palette keys: k=outline b=body l=bodyLo h=bodyHi m=mane n=maneLo f=hoof e=eye w=eyeWhite z=muzzle s=sock t=tail p=blush */
export const BASE_FRAMES = ${JSON.stringify(BASE_FRAMES)};

export const COAT_FRAME_OVERRIDES = ${JSON.stringify(COAT_FRAME_OVERRIDES)};

/** Chibi outlined side-profile gallop cycle for race track animation. */
export const GALLOP_FRAMES = ${JSON.stringify(GALLOP_FRAMES)};

export const COAT_PALETTES = ${JSON.stringify(COAT_PALETTES, null, 2)};

export const COAT_PALETTE_IDS = ${JSON.stringify(Object.keys(COAT_PALETTES))};
`;

writeFileSync(OUT, fileContent);
console.log(`Wrote ${OUT} (${fileContent.length} bytes)`);
