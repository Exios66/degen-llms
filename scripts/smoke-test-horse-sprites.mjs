#!/usr/bin/env node
/** Smoke-test horse sprite module imports and rendering. */
import { createCanvas } from "canvas";
import {
  HORSE_GALLOP_FRAME_COUNT,
  HORSE_GALLOP_W,
  HORSE_SPRITE_COUNT,
  HORSE_SPRITE_ROSTER,
  assignHorseSprites,
  drawHorseSprite,
  getHorseSprite,
  getHorseAnimationFrameCount,
} from "../docs/js/horse-sprites.js";

if (HORSE_SPRITE_COUNT !== 8) throw new Error(`Expected 8 sprites, got ${HORSE_SPRITE_COUNT}`);
if (getHorseAnimationFrameCount("gallop") !== 6) throw new Error("Gallop should use 6 frames");
if (HORSE_GALLOP_FRAME_COUNT !== 6) throw new Error("GALLOP frame data should have 6 frames");
if (HORSE_SPRITE_ROSTER.some((s) => /unicorn|galaxy|neon|kawaii/i.test(s.label))) {
  throw new Error("Fantasy sprite labels still present");
}

const canvas = createCanvas(HORSE_GALLOP_W, 32);
const ctx = canvas.getContext("2d");
for (const entry of HORSE_SPRITE_ROSTER) {
  drawHorseSprite(ctx, entry.id, { scale: 1, frame: 0, direction: "front", animation: "walk" });
  for (let f = 0; f < 6; f++) {
    drawHorseSprite(ctx, entry.id, {
      scale: 1,
      frame: f,
      direction: "right",
      animation: "gallop",
      jockeySilks: { cap: "#fff", shirt: "#f00", sleeves: "#800", pants: "#eee", trim: "#fff" },
    });
  }
  if (!getHorseSprite(entry.id)) throw new Error(`Missing sprite ${entry.id}`);
}

const assigned = assignHorseSprites(8, 0);
if (assigned.length !== 8 || new Set(assigned).size !== 8) {
  throw new Error("assignHorseSprites failed for 8-horse field");
}

console.log("Horse sprite smoke test passed.");
