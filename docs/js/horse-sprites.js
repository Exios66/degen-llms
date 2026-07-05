/** Kawaii pixel horse sprite roster and canvas renderer for the racing paddock. */

export const HORSE_SPRITE_ROSTER = [
  { id: "chestnut", label: "Chestnut Charm", body: "#a85a32", mane: "#5c3018", accent: "#e8c878", blush: "#ffb8c8", eye: "#1a1018", mark: "star" },
  { id: "palomino", label: "Palomino Peach", body: "#e8c878", mane: "#f0e0b0", accent: "#d4a040", blush: "#ffc8d8", eye: "#2a1810", mark: "heart" },
  { id: "grey", label: "Silver Mist", body: "#b0b8c8", mane: "#707888", accent: "#e0e8f0", blush: "#ffd0e0", eye: "#1a2030", mark: "none" },
  { id: "midnight", label: "Midnight Mochi", body: "#2a2838", mane: "#101018", accent: "#606880", blush: "#ffa0b8", eye: "#e8f0ff", mark: "moon" },
  { id: "snow", label: "Snowflake Sweet", body: "#f0f0f8", mane: "#d0d8e8", accent: "#b8c8e0", blush: "#ffb0c8", eye: "#283040", mark: "snow" },
  { id: "rose", label: "Rose Petal", body: "#e87898", mane: "#c04868", accent: "#ffd0e0", blush: "#ffe0e8", eye: "#301820", mark: "heart" },
  { id: "mint", label: "Mint Marshmallow", body: "#78d8b0", mane: "#40a880", accent: "#b0f0d0", blush: "#ffc8d8", eye: "#103020", mark: "star" },
  { id: "lavender", label: "Lavender Lace", body: "#b898e8", mane: "#8068c0", accent: "#e0d0ff", blush: "#ffd8e8", eye: "#201830", mark: "none" },
  { id: "sky", label: "Sky Sprinter", body: "#68b8f0", mane: "#3080c8", accent: "#b0e0ff", blush: "#ffc0d8", eye: "#102040", mark: "cloud" },
  { id: "caramel", label: "Caramel Cloud", body: "#d0a060", mane: "#906030", accent: "#f0d0a0", blush: "#ffb8c8", eye: "#281808", mark: "none" },
  { id: "paint", label: "Paint Patch", body: "#f0e8d8", mane: "#403020", accent: "#a06040", blush: "#ffc8d8", eye: "#201810", mark: "patch" },
  { id: "neon", label: "Neon Nights", body: "#303848", mane: "#ff60a0", accent: "#40f0e0", blush: "#ff90c0", eye: "#00ffff", mark: "bolt" },
  { id: "golden", label: "Golden Gala", body: "#f0c040", mane: "#c09010", accent: "#fff0a0", blush: "#ffb8c0", eye: "#302008", mark: "crown" },
  { id: "unicorn", label: "Unicorn Utopia", body: "#f0d0f8", mane: "#ff90d0", accent: "#fff0ff", blush: "#ffe0f0", eye: "#6040a0", mark: "horn" },
  { id: "tiger", label: "Tiger Trot", body: "#f0a040", mane: "#c06010", accent: "#402010", blush: "#ffc0a0", eye: "#201008", mark: "stripe" },
  { id: "dragon", label: "Dragon Dash", body: "#60c080", mane: "#208050", accent: "#f0e060", blush: "#ffa0a0", eye: "#103020", mark: "scale" },
];

const SPRITE_BY_ID = Object.fromEntries(HORSE_SPRITE_ROSTER.map((s) => [s.id, s]));

export function getHorseSprite(spriteId) {
  return SPRITE_BY_ID[spriteId] ?? HORSE_SPRITE_ROSTER[0];
}

function px(ctx, x, y, w, h, color, scale) {
  ctx.fillStyle = color;
  ctx.fillRect(x * scale, y * scale, w * scale, h * scale);
}

function drawMark(ctx, mark, ox, oy, accent, scale) {
  if (mark === "star") {
    px(ctx, ox + 4, oy + 3, 1, 1, accent, scale);
    px(ctx, ox + 3, oy + 4, 3, 1, accent, scale);
    px(ctx, ox + 4, oy + 5, 1, 1, accent, scale);
  } else if (mark === "heart") {
    px(ctx, ox + 3, oy + 4, 1, 1, accent, scale);
    px(ctx, ox + 5, oy + 4, 1, 1, accent, scale);
    px(ctx, ox + 3, oy + 5, 3, 1, accent, scale);
    px(ctx, ox + 4, oy + 6, 1, 1, accent, scale);
  } else if (mark === "moon") {
    px(ctx, ox + 4, oy + 3, 2, 1, accent, scale);
    px(ctx, ox + 3, oy + 4, 1, 2, accent, scale);
    px(ctx, ox + 5, oy + 5, 1, 1, accent, scale);
  } else if (mark === "snow") {
    px(ctx, ox + 4, oy + 3, 1, 1, "#fff", scale);
    px(ctx, ox + 3, oy + 4, 3, 1, "#fff", scale);
    px(ctx, ox + 4, oy + 5, 1, 1, "#fff", scale);
    px(ctx, ox + 2, oy + 4, 1, 1, "#fff", scale);
    px(ctx, ox + 6, oy + 4, 1, 1, "#fff", scale);
  } else if (mark === "cloud") {
    px(ctx, ox + 3, oy + 4, 3, 1, accent, scale);
    px(ctx, ox + 4, oy + 3, 1, 1, accent, scale);
  } else if (mark === "patch") {
    px(ctx, ox + 2, oy + 6, 3, 2, accent, scale);
    px(ctx, ox + 6, oy + 8, 2, 2, accent, scale);
  } else if (mark === "bolt") {
    px(ctx, ox + 4, oy + 3, 1, 2, accent, scale);
    px(ctx, ox + 3, oy + 5, 2, 1, accent, scale);
    px(ctx, ox + 4, oy + 6, 1, 1, accent, scale);
  } else if (mark === "crown") {
    px(ctx, ox + 3, oy + 3, 3, 1, accent, scale);
    px(ctx, ox + 3, oy + 2, 1, 1, accent, scale);
    px(ctx, ox + 5, oy + 2, 1, 1, accent, scale);
  } else if (mark === "horn") {
    px(ctx, ox + 8, oy + 1, 1, 2, accent, scale);
    px(ctx, ox + 7, oy + 2, 1, 1, accent, scale);
  } else if (mark === "stripe") {
    px(ctx, ox + 3, oy + 7, 1, 3, accent, scale);
    px(ctx, ox + 5, oy + 8, 1, 2, accent, scale);
  } else if (mark === "scale") {
    px(ctx, ox + 4, oy + 7, 1, 1, accent, scale);
    px(ctx, ox + 6, oy + 8, 1, 1, accent, scale);
    px(ctx, ox + 3, oy + 9, 1, 1, accent, scale);
  }
}

/**
 * Draw a kawaii side-view pony into a canvas context.
 * Native resolution is 24×18 logical pixels.
 */
export function drawHorseSprite(ctx, spriteId, { scale = 3, frame = 0 } = {}) {
  const s = getHorseSprite(spriteId);
  const bounce = frame % 2 === 0 ? 0 : 1;
  const ox = 2;
  const oy = 3 - bounce;

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Shadow
  px(ctx, ox + 2, oy + 15, 14, 1, "rgba(0,0,0,0.25)", scale);

  // Tail
  px(ctx, ox + 1, oy + 7, 2, 4, s.mane, scale);
  px(ctx, ox, oy + 8, 1, 3, s.mane, scale);

  // Back legs
  px(ctx, ox + 4, oy + 12, 2, 4, s.accent, scale);
  px(ctx, ox + 7, oy + 12, 2, 4, s.accent, scale);

  // Body
  px(ctx, ox + 3, oy + 7, 10, 6, s.body, scale);
  px(ctx, ox + 4, oy + 8, 8, 4, s.body, scale);

  // Mane
  px(ctx, ox + 10, oy + 4, 2, 5, s.mane, scale);
  px(ctx, ox + 11, oy + 3, 1, 3, s.mane, scale);

  // Neck + head
  px(ctx, ox + 10, oy + 6, 4, 4, s.body, scale);
  px(ctx, ox + 12, oy + 5, 5, 4, s.body, scale);
  px(ctx, ox + 14, oy + 6, 3, 3, s.body, scale);

  // Snout
  px(ctx, ox + 16, oy + 8, 2, 2, s.accent, scale);

  // Front legs
  px(ctx, ox + 11, oy + 12, 2, 4, s.accent, scale);
  px(ctx, ox + 14, oy + 12, 2, 4, s.accent, scale);

  // Big kawaii eye
  px(ctx, ox + 14, oy + 6, 2, 2, "#fff", scale);
  px(ctx, ox + 15, oy + 7, 1, 1, s.eye, scale);
  px(ctx, ox + 14, oy + 6, 1, 1, "#fff", scale);

  // Blush
  px(ctx, ox + 13, oy + 8, 1, 1, s.blush, scale);
  px(ctx, ox + 16, oy + 8, 1, 1, s.blush, scale);

  // Saddle cloth
  px(ctx, ox + 6, oy + 8, 4, 2, s.accent, scale);

  drawMark(ctx, s.mark, ox + 5, oy + 2, s.accent, scale);
}

export function createHorseSpriteCanvas(spriteId, { size = 72, frame = 0 } = {}) {
  const nativeW = 24;
  const nativeH = 18;
  const scale = Math.floor(size / nativeW);
  const canvas = document.createElement("canvas");
  canvas.width = nativeW * scale;
  canvas.height = nativeH * scale;
  canvas.className = "horse-sprite-canvas";
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  drawHorseSprite(ctx, spriteId, { scale, frame });
  return canvas;
}

export function assignHorseSprites(count, startOffset = 0) {
  const ids = HORSE_SPRITE_ROSTER.map((s) => s.id);
  const assigned = [];
  for (let i = 0; i < count; i++) {
    assigned.push(ids[(startOffset + i) % ids.length]);
  }
  return assigned;
}
