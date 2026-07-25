#!/usr/bin/env node
/**
 * Export legacy procedural horse sprites to PNG examples.
 * Dev-only — requires: npm install canvas
 */
import { createCanvas } from "canvas";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "docs/examples/horse-sprites-legacy");
const INDIVIDUAL_DIR = join(OUT_DIR, "individual");

const {
  HORSE_NATIVE_W,
  HORSE_NATIVE_H,
  HORSE_SPRITE_ROSTER,
  drawHorseSprite,
} = await import(join(ROOT, "docs/examples/horse-sprites-legacy/legacy-horse-sprites.js"));

mkdirSync(INDIVIDUAL_DIR, { recursive: true });

const SCALE = 3;
const PAD = 4;
const CELL_W = HORSE_NATIVE_W * SCALE + PAD * 2;
const CELL_H = HORSE_NATIVE_H * SCALE + PAD * 2;
const COLS = 8;

function renderSprite(spriteId, animation, frame = 0) {
  const canvas = createCanvas(HORSE_NATIVE_W * SCALE, HORSE_NATIVE_H * SCALE);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  drawHorseSprite(ctx, spriteId, { scale: SCALE, frame, animation });
  return canvas;
}

function buildContactSheet(animation, frame = 0) {
  const count = HORSE_SPRITE_ROSTER.length;
  const rows = Math.ceil(count / COLS);
  const sheet = createCanvas(COLS * CELL_W, rows * CELL_H);
  const ctx = sheet.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, sheet.width, sheet.height);

  HORSE_SPRITE_ROSTER.forEach((entry, index) => {
    const col = index % COLS;
    const row = Math.floor(index / COLS);
    const sprite = renderSprite(entry.id, animation, frame);
    ctx.drawImage(sprite, col * CELL_W + PAD, row * CELL_H + PAD);
  });

  return sheet;
}

for (const entry of HORSE_SPRITE_ROSTER) {
  for (const [suffix, animation] of [["idle", "idle"], ["trot", "trot"]]) {
    const canvas = renderSprite(entry.id, animation, 0);
    const outPath = join(INDIVIDUAL_DIR, `${entry.id}-${suffix}.png`);
    writeFileSync(outPath, canvas.toBuffer("image/png"));
  }
}

writeFileSync(
  join(OUT_DIR, "roster-contact-sheet.png"),
  buildContactSheet("idle").toBuffer("image/png"),
);
writeFileSync(
  join(OUT_DIR, "roster-contact-sheet-trot.png"),
  buildContactSheet("trot").toBuffer("image/png"),
);

console.log(`Exported ${HORSE_SPRITE_ROSTER.length} legacy horse sprites to ${OUT_DIR}`);
