/** Procedural pixel drawing helpers for Arcade Alley. */

/**
 * Draw a string-grid sprite.
 * Legend keys map to CSS colors; `.` / space = transparent.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {string[]} grid
 * @param {Record<string, string>} palette
 * @param {number} [scale=2]
 */
export function drawPixels(ctx, x, y, grid, palette, scale = 2) {
  const ox = Math.round(x);
  const oy = Math.round(y);
  for (let row = 0; row < grid.length; row += 1) {
    const line = grid[row];
    for (let col = 0; col < line.length; col += 1) {
      const ch = line[col];
      if (ch === "." || ch === " " || ch == null) continue;
      const color = palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + col * scale, oy + row * scale, scale, scale);
    }
  }
}

/**
 * Neon glow without relying solely on shadowBlur (expensive / soft).
 * Draws expanding translucent rects then the core fill.
 */
export function drawNeonRect(ctx, x, y, w, h, color, glow = 3) {
  for (let i = glow; i >= 1; i -= 1) {
    ctx.fillStyle = withAlpha(color, 0.08 + (glow - i) * 0.06);
    ctx.fillRect(x - i, y - i, w + i * 2, h + i * 2);
  }
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = withAlpha("#ffffff", 0.35);
  ctx.fillRect(x + 1, y + 1, Math.max(1, w - 2), 2);
}

/** Soft neon ellipse / orb. */
export function drawNeonOrb(ctx, cx, cy, r, color) {
  for (let i = 3; i >= 1; i -= 1) {
    ctx.fillStyle = withAlpha(color, 0.1 * i);
    ctx.beginPath();
    ctx.arc(cx, cy, r + i * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = withAlpha("#ffffff", 0.45);
  ctx.beginPath();
  ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Deterministic dither / grit fill for asphalt, felt, stage boards.
 * @param {number} seed  Stable seed so the pattern never flickers.
 */
export function fillDither(ctx, x, y, w, h, base, speck, seed = 1, density = 0.12) {
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = speck;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.ceil(x + w);
  const y1 = Math.ceil(y + h);
  for (let py = y0; py < y1; py += 2) {
    for (let px = x0; px < x1; px += 2) {
      const n = hash2(px + seed * 17, py + seed * 31);
      if (n < density) ctx.fillRect(px, py, 1, 1);
    }
  }
}

/** Horizontal stripe shade (lane / board boards). */
export function fillStripeShade(ctx, x, y, w, h, c0, c1) {
  ctx.fillStyle = c0;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = c1;
  for (let i = 0; i < h; i += 4) {
    ctx.fillRect(x, y + i, w, 1);
  }
}

export function withAlpha(color, a) {
  if (color.startsWith("rgba") || color.startsWith("hsla")) return color;
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const full = hex.length === 3
      ? hex.split("").map((c) => c + c).join("")
      : hex.slice(0, 6);
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
  return color;
}

function hash2(x, y) {
  let n = (x * 374761393 + y * 668265263) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}
