/** Shared Arcade Alley canvas setup — 2× CRT playfield. */

export const ARCADE_W = 720;
export const ARCADE_H = 840;

/** Scale factor vs the original 360×420 cabinets. */
export const ARCADE_SCALE = 2;

/**
 * Size the canvas and lock nearest-neighbor sampling for crisp pixel art.
 * @param {HTMLCanvasElement} canvas
 * @returns {CanvasRenderingContext2D}
 */
export function setupArcadeCanvas(canvas) {
  canvas.width = ARCADE_W;
  canvas.height = ARCADE_H;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  return ctx;
}
