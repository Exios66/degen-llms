/** Procedural pixel-grid sprites for Arcade Alley cabinets. */

import { drawPixels, drawNeonOrb, withAlpha } from "./pixel.js";
import { frameAt, pulse01 } from "./anim.js";

// ── Tourist (Strip Cross) ────────────────────────────────────────────────────

const TOURIST_PAL = {
  O: "#1a1420",
  S: "#fff8e7",
  s: "#e8dcc8",
  H: "#ffd700",
  h: "#c8a020",
  B: "#3a6ecc",
  b: "#2a4e9a",
  R: "#ff5ec8",
  W: "#ffffff",
};

const TOURIST_DOWN = [
  [
    "..OOOO..",
    ".OSSSSO.",
    ".OSHSHO.",
    ".OSSSSO.",
    ".OBBBBO.",
    ".OBRBRO.",
    ".OBBBBO.",
    "..O..O..",
    "..O..O..",
  ],
  [
    "..OOOO..",
    ".OSSSSO.",
    ".OSHSHO.",
    ".OSSSSO.",
    ".OBBBBO.",
    ".OBRBRO.",
    ".OBBBBO.",
    ".O....O.",
    "O......O",
  ],
  [
    "..OOOO..",
    ".OSSSSO.",
    ".OSHSHO.",
    ".OSSSSO.",
    ".OBBBBO.",
    ".OBRBRO.",
    ".OBBBBO.",
    "..O..O..",
    "..O..O..",
  ],
  [
    "..OOOO..",
    ".OSSSSO.",
    ".OSHSHO.",
    ".OSSSSO.",
    ".OBBBBO.",
    ".OBRBRO.",
    ".OBBBBO.",
    ".O....O.",
    "O......O",
  ],
];

const TOURIST_UP = [
  [
    "..OOOO..",
    ".OSSSSO.",
    ".OSSSSO.",
    ".OSSSSO.",
    ".OBBBBO.",
    ".OBBBBO.",
    ".OBBBBO.",
    "..O..O..",
    "..O..O..",
  ],
  [
    "..OOOO..",
    ".OSSSSO.",
    ".OSSSSO.",
    ".OSSSSO.",
    ".OBBBBO.",
    ".OBBBBO.",
    ".OBBBBO.",
    ".O....O.",
    "O......O",
  ],
];

const TOURIST_SIDE = [
  [
    "..OOOO..",
    ".OSSSSO.",
    ".OSHHSO.",
    ".OSSSSO.",
    ".OBBBBO.",
    ".OBRBO..",
    ".OBBBO..",
    "..O.O...",
    "..O.O...",
  ],
  [
    "..OOOO..",
    ".OSSSSO.",
    ".OSHHSO.",
    ".OSSSSO.",
    ".OBBBBO.",
    ".OBRBO..",
    ".OBBBO..",
    "...O.O..",
    "...O..O.",
  ],
];

export function drawTourist(ctx, x, y, { dir = "up", t = 0, scale = 2, flash = false } = {}) {
  const pal = flash
    ? { ...TOURIST_PAL, S: "#ff6b6b", s: "#cc4444", H: "#ffaaaa", B: "#ff8888", R: "#ffffff" }
    : TOURIST_PAL;
  let frames = TOURIST_DOWN;
  let mirror = false;
  if (dir === "up") frames = TOURIST_UP;
  else if (dir === "left") { frames = TOURIST_SIDE; mirror = true; }
  else if (dir === "right") frames = TOURIST_SIDE;
  const fi = frameAt(t, 8, frames.length);
  const grid = frames[fi];
  if (mirror) {
    const flipped = grid.map((row) => [...row].reverse().join(""));
    drawPixels(ctx, x, y, flipped, pal, scale);
  } else {
    drawPixels(ctx, x, y, grid, pal, scale);
  }
}

// ── Vehicles (Strip Cross) ───────────────────────────────────────────────────

function vehicleBody(w, accent) {
  const cols = Math.max(8, w);
  const win = Math.max(2, Math.floor(cols * 0.35));
  const rows = [
    "O".repeat(cols),
    "O" + "B".repeat(cols - 2) + "O",
    "O" + "W".repeat(win) + "B".repeat(cols - 2 - win) + "O",
    "O" + "A".repeat(cols - 2) + "O",
    "O" + "A".repeat(cols - 2) + "O",
    "O".repeat(cols),
  ];
  return {
    grid: rows,
    pal: { O: "#121018", B: accent, A: shade(accent, 0.72), W: "#9ad0ff" },
  };
}

function shade(hex, f) {
  if (!hex.startsWith("#") || hex.length < 7) return hex;
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * f);
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * f);
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * f);
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Draw a Vegas hazard vehicle with headlights and spinning wheels.
 * @param {number} wPx  Body width in canvas pixels.
 */
export function drawVehicle(ctx, x, y, wPx, hPx, color, t = 0, facingRight = true) {
  const scale = 2;
  const cols = Math.max(8, Math.round(wPx / scale));
  const { grid, pal } = vehicleBody(cols, color);
  const gy = y + Math.max(0, (hPx - grid.length * scale) / 2);
  if (!facingRight) {
    const flipped = grid.map((row) => [...row].reverse().join(""));
    drawPixels(ctx, x, gy, flipped, pal, scale);
  } else {
    drawPixels(ctx, x, gy, grid, pal, scale);
  }
  // Headlights
  const lx = facingRight ? x + wPx - 4 : x;
  ctx.fillStyle = withAlpha("#ffe08a", 0.7 + pulse01(t, 2) * 0.3);
  ctx.fillRect(lx, gy + 4, 3, 3);
  ctx.fillRect(lx, gy + hPx - 10, 3, 3);
  // Wheels
  const wheelFrame = frameAt(t, 12, 2);
  const wy = gy + hPx - 6;
  for (const wx of [x + 6, x + wPx - 12]) {
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(wx, wy, 6, 5);
    ctx.fillStyle = "#888";
    ctx.fillRect(wx + (wheelFrame ? 2 : 1), wy + 1, 2, 3);
  }
}

// ── Neon Invaders ────────────────────────────────────────────────────────────

const INVADER_A = [
  [
    "..O....O..",
    "...O..O...",
    "..OOOOOO..",
    ".OOWOOWOO.",
    "OOOOOOOOOO",
    "O.OOOOOO.O",
    "O.O....O.O",
    "..OO..OO..",
  ],
  [
    "..O....O..",
    "O..O..O..O",
    "..OOOOOO..",
    ".OOWOOWOO.",
    "OOOOOOOOOO",
    ".O.OOOO.O.",
    "..O....O..",
    ".O......O.",
  ],
];

const INVADER_B = [
  [
    "...OOOO...",
    "..OOOOOO..",
    ".OOWOWOWO.",
    ".OOOOOOOO.",
    "..O.OO.O..",
    ".O......O.",
  ],
  [
    "...OOOO...",
    "..OOOOOO..",
    ".OOWOWOWO.",
    ".OOOOOOOO.",
    ".O..OO..O.",
    "..O....O..",
  ],
];

const INVADER_C = [
  [
    ".O......O.",
    "..O....O..",
    ".OOOOOOOO.",
    "OOOWOWOWOO",
    "OOOOOOOOOO",
    "O.OOOOOO.O",
    "O........O",
  ],
  [
    "..O....O..",
    ".O......O.",
    ".OOOOOOOO.",
    "OOOWOWOWOO",
    "OOOOOOOOOO",
    ".O.OOOO.O.",
    "..OO..OO..",
  ],
];

const INVADER_D = [
  [
    "....OO....",
    "...OOOO...",
    "..OWOWOW..",
    ".OOOOOOOO.",
    "O.OOOOOO.O",
    "O.O....O.O",
  ],
  [
    "....OO....",
    "...OOOO...",
    "..OWOWOW..",
    ".OOOOOOOO.",
    ".O.OOOO.O.",
    "O........O",
  ],
];

const INVADER_SETS = [INVADER_A, INVADER_B, INVADER_C, INVADER_D];

export function drawInvader(ctx, x, y, color, type = 0, t = 0, scale = 2) {
  const set = INVADER_SETS[type % INVADER_SETS.length];
  const fi = frameAt(t, 4, set.length);
  const grid = set[fi];
  const pal = { O: color, W: "#0a0e14" };
  // Soft neon halo under the sprite
  ctx.fillStyle = withAlpha(color, 0.14);
  ctx.fillRect(x - 2, y - 2, grid[0].length * scale + 4, grid.length * scale + 4);
  drawPixels(ctx, x, y, grid, pal, scale);
}

const CANNON = [
  "......O......",
  ".....OOO.....",
  ".....OOO.....",
  "....OOOOO....",
  "...OOOOOOO...",
  "..OOOOOOOOO..",
  ".OOOOOOOOOOO.",
  "OOOOOOOOOOOOO",
];

export function drawCannon(ctx, cx, y, t = 0, scale = 2) {
  const pal = {
    O: "#e8f0ff",
  };
  const w = CANNON[0].length * scale;
  drawPixels(ctx, cx - w / 2, y, CANNON, pal, scale);
  // Cockpit gem
  ctx.fillStyle = "#ffd700";
  ctx.fillRect(cx - 3, y + 10, 6, 5);
  // Engine flicker
  const flick = frameAt(t, 16, 3);
  ctx.fillStyle = ["#ff5ec8", "#ffd700", "#6ec6ff"][flick];
  ctx.fillRect(cx - 4, y + CANNON.length * scale, 3, 3);
  ctx.fillRect(cx + 1, y + CANNON.length * scale, 3, 3);
}

export function drawBullet(ctx, x, y, enemy = false) {
  const color = enemy ? "#ff6b6b" : "#ffd700";
  ctx.fillStyle = withAlpha(color, 0.35);
  ctx.fillRect(x - 2, y, 4, 14);
  ctx.fillStyle = color;
  ctx.fillRect(x - 1, y, 2, 12);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x - 1, y, 2, 3);
}

// ── Breakout ─────────────────────────────────────────────────────────────────

const SUIT_GRIDS = {
  "♠": [
    "...O...",
    "..OOO..",
    ".OOOOO.",
    "OOOOOOO",
    ".O.O.O.",
    "...O...",
    "..OOO..",
  ],
  "♥": [
    ".OO.OO.",
    "OOOOOOO",
    "OOOOOOO",
    ".OOOOO.",
    "..OOO..",
    "...O...",
  ],
  "♦": [
    "...O...",
    "..OOO..",
    ".OOOOO.",
    "OOOOOOO",
    ".OOOOO.",
    "..OOO..",
    "...O...",
  ],
  "♣": [
    "..OOO..",
    ".OOOOO.",
    "..OOO..",
    "OOO.OOO",
    "OOOOOOO",
    "..OOO..",
    "...O...",
    "..OOO..",
  ],
};

export function drawBrick(ctx, x, y, w, h, color, suit) {
  // Bevel body
  ctx.fillStyle = shade(color, 0.55);
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = withAlpha("#ffffff", 0.35);
  ctx.fillRect(x + 1, y + 1, w - 2, 2);
  ctx.fillStyle = withAlpha("#000000", 0.25);
  ctx.fillRect(x + 1, y + h - 3, w - 2, 2);
  const grid = SUIT_GRIDS[suit] || SUIT_GRIDS["♠"];
  const scale = 2;
  const gw = grid[0].length * scale;
  const gh = grid.length * scale;
  drawPixels(ctx, x + (w - gw) / 2, y + (h - gh) / 2, grid, { O: "#111111" }, scale);
}

export function drawPaddle(ctx, x, y, w, h, squash = 0) {
  const sy = squash * 3;
  const sh = h - sy;
  const sw = w + squash * 4;
  const sx = x - squash * 2;
  ctx.fillStyle = "#6a5020";
  ctx.fillRect(sx, y + sy, sw, sh);
  ctx.fillStyle = "#c8a45a";
  ctx.fillRect(sx + 2, y + sy + 1, sw - 4, sh - 2);
  ctx.fillStyle = "#ffd700";
  ctx.fillRect(sx + 4, y + sy + 2, sw - 8, 3);
  ctx.fillStyle = withAlpha("#ffffff", 0.4);
  ctx.fillRect(sx + 6, y + sy + 2, Math.max(4, sw * 0.25), 2);
}

export function drawChipBall(ctx, x, y, r, trail = []) {
  for (let i = 0; i < trail.length; i += 1) {
    const p = trail[i];
    const a = ((i + 1) / trail.length) * 0.35;
    ctx.fillStyle = withAlpha("#ffd700", a);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * (0.4 + a), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = withAlpha("#ffd700", 0.35);
  ctx.beginPath();
  ctx.arc(x, y, r + 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff8e7";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd700";
  ctx.beginPath();
  ctx.arc(x, y, r - 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = withAlpha("#ffffff", 0.7);
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

// ── Showgirl Beat ────────────────────────────────────────────────────────────

const SHOWGIRL = [
  [
    "...OOOO...",
    "..OSSSSO..",
    "..OSHSHO..",
    "..OSSSSO..",
    "...ORRO...",
    "..ORRRRO..",
    ".ORRRRRRO.",
    "ORRORORRRO",
    ".O..O..O..",
    ".O.....O..",
  ],
  [
    "...OOOO...",
    "..OSSSSO..",
    "..OSHSHO..",
    "..OSSSSO..",
    "...ORRO...",
    "..ORRRRO..",
    ".ORRRRRRO.",
    "ORRORORRRO",
    "..O..O....",
    "..O.....O.",
  ],
];

export function drawShowgirl(ctx, x, y, t = 0, scale = 3) {
  const pal = {
    O: "#1a1020",
    S: "#f5d0b0",
    H: "#3a1828",
    R: "#ff5ec8",
  };
  const fi = frameAt(t, 3, SHOWGIRL.length);
  const sway = Math.sin(t * 2.2) * 2;
  drawPixels(ctx, x + sway, y, SHOWGIRL[fi], pal, scale);
}

export function drawDrumPad(ctx, x, y, w, h, color, label, hint, { lit = false, press = 0 } = {}) {
  const squash = press * 6;
  const px = x;
  const py = y + squash;
  const ph = h - squash;
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(x + 4, y + h - 4, w, 6);
  // Body
  ctx.fillStyle = shade(color, 0.55);
  ctx.fillRect(px, py, w, ph);
  ctx.fillStyle = lit ? "#ffd700" : color;
  ctx.fillRect(px + 3, py + 3, w - 6, ph - 6);
  ctx.fillStyle = withAlpha("#ffffff", lit ? 0.45 : 0.22);
  ctx.fillRect(px + 6, py + 5, w - 12, 4);
  // Rim
  ctx.strokeStyle = withAlpha("#ffffff", 0.35);
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 2, py + 2, w - 4, ph - 4);
  ctx.fillStyle = "#111";
  ctx.font = "bold 16px JetBrains Mono, monospace";
  ctx.textAlign = "center";
  ctx.fillText(label, px + w / 2, py + ph * 0.42);
  ctx.font = "11px JetBrains Mono, monospace";
  ctx.fillText(hint, px + w / 2, py + ph * 0.62);
  ctx.textAlign = "left";
}

export function drawNoteOrb(ctx, x, y, label, active, t = 0) {
  const r = active ? 20 + pulse01(t, 3) * 3 : 16;
  const color = active ? "#ffd700" : "#c8d0e0";
  drawNeonOrb(ctx, x, y, r, color);
  ctx.fillStyle = "#111";
  ctx.font = "bold 12px JetBrains Mono, monospace";
  ctx.textAlign = "center";
  ctx.fillText(label, x, y + 4);
  ctx.textAlign = "left";
}

export { shade };
