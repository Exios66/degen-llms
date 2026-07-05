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

function outlineGrid(grid) {
  const out = grid.map((row) => [...row]);
  for (let y = 0; y < FRAME_H; y++) {
    for (let x = 0; x < FRAME_W; x++) {
      if (grid[y][x] === ".") continue;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= FRAME_W || ny >= FRAME_H) {
            set(out, x, y, "k");
            continue;
          }
          if (grid[ny][nx] === ".") set(out, x, y, "k");
        }
      }
    }
  }
  for (let y = 0; y < FRAME_H; y++) {
    for (let x = 0; x < FRAME_W; x++) {
      if (grid[y][x] !== "." && out[y][x] === "k") out[y][x] = grid[y][x];
    }
  }
  return out;
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

const COAT_PALETTES = {
  black: { k: "#181818", b: "#383838", l: "#282828", h: "#505050", m: "#181818", n: "#101010", f: "#101010", e: "#080808", w: "#d8d8d8", z: "#484848", s: "#282828" },
  tan: { k: "#483828", b: "#d8c098", l: "#b89868", h: "#f0dcb8", m: "#684830", n: "#503820", f: "#302018", e: "#201810", w: "#f8f4e8", z: "#e8d8b0", s: "#b89868" },
  grey: { k: "#484850", b: "#b8b8c0", l: "#9898a0", h: "#d8d8e0", m: "#686870", n: "#505058", f: "#383840", e: "#202028", w: "#f0f0f0", z: "#c8c8d0", s: "#9898a0" },
  chestnut: { k: "#582818", b: "#c87840", l: "#a85828", h: "#e89858", m: "#e8c878", n: "#c8a858", f: "#382010", e: "#201008", w: "#f8f4e8", z: "#d89060", s: "#a85828" },
  light_brown: { k: "#503820", b: "#a87848", l: "#885830", h: "#c89860", m: "#784828", n: "#583018", f: "#302010", e: "#201008", w: "#f8f4e8", z: "#b88858", s: "#885830" },
  dark_brown: { k: "#281810", b: "#684028", l: "#482818", h: "#885840", m: "#181008", n: "#100808", f: "#100808", e: "#100808", w: "#d8c8b8", z: "#785030", s: "#482818" },
  bay: { k: "#281810", b: "#985038", l: "#783828", h: "#b86848", m: "#181008", n: "#100808", f: "#100808", e: "#100808", w: "#f8f4e8", z: "#a86040", s: "#181008" },
  dapple: { k: "#484038", b: "#989080", l: "#787060", h: "#b8b0a0", m: "#e8e8e8", n: "#c8c8c8", f: "#383028", e: "#282018", w: "#f0f0f0", z: "#a89888", s: "#787060" },
};

const COAT_FRAME_OVERRIDES = { bay: BAY_FRAMES };

const fileContent = `/**
 * Original RPG Maker-style equestrian horse sprite frames.
 * Generated by scripts/generate-horse-sprite-frames.mjs — do not edit by hand.
 * Shared palette-key templates + per-coat palettes (8 coats × 4 dirs × 3 frames @ 32×32).
 */

export const HORSE_FRAME_W = ${FRAME_W};
export const HORSE_FRAME_H = ${FRAME_H};

/** Palette keys: k=outline b=body l=bodyLo h=bodyHi m=mane n=maneLo f=hoof e=eye w=eyeWhite z=muzzle s=sock */
export const BASE_FRAMES = ${JSON.stringify(BASE_FRAMES)};

export const COAT_FRAME_OVERRIDES = ${JSON.stringify(COAT_FRAME_OVERRIDES)};

export const COAT_PALETTES = ${JSON.stringify(COAT_PALETTES, null, 2)};

export const COAT_PALETTE_IDS = ${JSON.stringify(Object.keys(COAT_PALETTES))};
`;

writeFileSync(OUT, fileContent);
console.log(`Wrote ${OUT} (${fileContent.length} bytes)`);
