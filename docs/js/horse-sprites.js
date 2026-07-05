/** Kawaii pixel horse sprite roster and canvas renderer for the racing paddock. */

export const HORSE_SPRITE_ROSTER = [
  // Classic coat colors
  { id: "chestnut", label: "Chestnut Charm", body: "#a85a32", mane: "#5c3018", accent: "#e8c878", blush: "#ffb8c8", eye: "#1a1018", mark: "star" },
  { id: "palomino", label: "Palomino Peach", body: "#e8c878", mane: "#f0e0b0", accent: "#d4a040", blush: "#ffc8d8", eye: "#2a1810", mark: "heart" },
  { id: "grey", label: "Silver Mist", body: "#b0b8c8", mane: "#707888", accent: "#e0e8f0", blush: "#ffd0e0", eye: "#1a2030", mark: "none" },
  { id: "bay", label: "Bay Baron", body: "#8b3a28", mane: "#1a1018", accent: "#c06040", blush: "#ffb8c8", eye: "#101018", mark: "none", pattern: "socks" },
  { id: "buckskin", label: "Buckskin Buckle", body: "#d4a868", mane: "#2a2018", accent: "#f0d8a0", blush: "#ffc8d8", eye: "#201810", mark: "diamond" },
  { id: "black", label: "Onyx Obsidian", body: "#282028", mane: "#101010", accent: "#484050", blush: "#ffa0b8", eye: "#e0d8f0", mark: "diamond" },
  { id: "sorrel", label: "Sorrel Sunset", body: "#c04828", mane: "#601810", accent: "#e87850", blush: "#ffb8a8", eye: "#201008", mark: "flame" },
  { id: "cremello", label: "Cremello Cloud", body: "#f0e8c8", mane: "#e8d8a8", accent: "#fff8e8", blush: "#ffd8e0", eye: "#6080a0", mark: "none" },
  { id: "roan", label: "Roan Ripple", body: "#a08070", mane: "#604840", accent: "#d0b8b0", blush: "#ffc8d0", eye: "#281820", mark: "none", pattern: "dapple" },
  { id: "dun", label: "Dun Drifter", body: "#c0a878", mane: "#504030", accent: "#e8d0a8", blush: "#ffc8b8", eye: "#302018", mark: "none", pattern: "stripe" },
  // Distinctive breeds & patterns
  { id: "appaloosa", label: "Appaloosa Ace", body: "#e8e0d0", mane: "#403028", accent: "#604838", blush: "#ffc8d8", eye: "#201810", mark: "none", pattern: "spots" },
  { id: "paint", label: "Paint Patch", body: "#f0e8d8", mane: "#403020", accent: "#a06040", blush: "#ffc8d8", eye: "#201810", mark: "patch" },
  { id: "pinto", label: "Pinto Parade", body: "#f8f0e8", mane: "#302018", accent: "#704028", blush: "#ffd0d8", eye: "#181008", mark: "none", pattern: "pinto" },
  { id: "friesian", label: "Friesian Frost", body: "#181820", mane: "#080810", accent: "#383848", blush: "#ffa0c0", eye: "#d0c8e8", mark: "none", pattern: "feather" },
  { id: "clydesdale", label: "Clydesdale Charm", body: "#704028", mane: "#f0e8d8", accent: "#a87848", blush: "#ffb8a8", eye: "#201008", mark: "none", pattern: "feather" },
  { id: "arabian", label: "Arabian Astra", body: "#d0a090", mane: "#503028", accent: "#f0d0c0", blush: "#ffc8d0", eye: "#301820", mark: "diamond" },
  { id: "mustang", label: "Mustang Muse", body: "#b08860", mane: "#483020", accent: "#d8b890", blush: "#ffc8b0", eye: "#281810", mark: "none", pattern: "blaze" },
  { id: "andalusian", label: "Andalusian Aura", body: "#d8d0c8", mane: "#908880", accent: "#f0ece8", blush: "#ffd8e0", eye: "#404050", mark: "none" },
  // Pastel & candy palette
  { id: "midnight", label: "Midnight Mochi", body: "#2a2838", mane: "#101018", accent: "#606880", blush: "#ffa0b8", eye: "#e8f0ff", mark: "moon" },
  { id: "snow", label: "Snowflake Sweet", body: "#f0f0f8", mane: "#d0d8e8", accent: "#b8c8e0", blush: "#ffb0c8", eye: "#283040", mark: "snow" },
  { id: "rose", label: "Rose Petal", body: "#e87898", mane: "#c04868", accent: "#ffd0e0", blush: "#ffe0e8", eye: "#301820", mark: "heart" },
  { id: "mint", label: "Mint Marshmallow", body: "#78d8b0", mane: "#40a880", accent: "#b0f0d0", blush: "#ffc8d8", eye: "#103020", mark: "star" },
  { id: "lavender", label: "Lavender Lace", body: "#b898e8", mane: "#8068c0", accent: "#e0d0ff", blush: "#ffd8e8", eye: "#201830", mark: "none" },
  { id: "sky", label: "Sky Sprinter", body: "#68b8f0", mane: "#3080c8", accent: "#b0e0ff", blush: "#ffc0d8", eye: "#102040", mark: "cloud" },
  { id: "caramel", label: "Caramel Cloud", body: "#d0a060", mane: "#906030", accent: "#f0d0a0", blush: "#ffb8c8", eye: "#281808", mark: "none" },
  { id: "cherry", label: "Cherry Cheval", body: "#c03048", mane: "#801828", accent: "#f08090", blush: "#ffc0c8", eye: "#200810", mark: "heart" },
  { id: "sakura", label: "Sakura Spirit", body: "#f8c0d0", mane: "#e890a8", accent: "#ffe0e8", blush: "#ffe8f0", eye: "#502030", mark: "leaf", pattern: "petals" },
  { id: "coral", label: "Coral Coast", body: "#f08878", mane: "#c05040", accent: "#ffc8b8", blush: "#ffd8d0", eye: "#301818", mark: "none" },
  { id: "honey", label: "Honey Harvest", body: "#e8b040", mane: "#a07018", accent: "#ffe890", blush: "#ffc8a0", eye: "#302008", mark: "clover" },
  // Bold & fantasy
  { id: "neon", label: "Neon Nights", body: "#303848", mane: "#ff60a0", accent: "#40f0e0", blush: "#ff90c0", eye: "#00ffff", mark: "bolt" },
  { id: "golden", label: "Golden Gala", body: "#f0c040", mane: "#c09010", accent: "#fff0a0", blush: "#ffb8c0", eye: "#302008", mark: "crown" },
  { id: "copper", label: "Copper Comet", body: "#b86830", mane: "#683818", accent: "#e8a060", blush: "#ffb8a0", eye: "#281008", mark: "flame" },
  { id: "sapphire", label: "Sapphire Sprint", body: "#3060c0", mane: "#102060", accent: "#80b0ff", blush: "#ffc0d8", eye: "#101830", mark: "diamond" },
  { id: "emerald", label: "Emerald Echo", body: "#208858", mane: "#104030", accent: "#60d8a0", blush: "#b0ffc8", eye: "#102820", mark: "leaf" },
  { id: "ruby", label: "Ruby Rush", body: "#a02040", mane: "#600818", accent: "#f06080", blush: "#ffc0c8", eye: "#200810", mark: "diamond" },
  { id: "storm", label: "Storm Stallion", body: "#506878", mane: "#283848", accent: "#90b0c8", blush: "#c0d8e8", eye: "#e8f0ff", mark: "cloud" },
  { id: "frost", label: "Frost Fang", body: "#c8e0f0", mane: "#88b8d8", accent: "#e8f8ff", blush: "#d0e8ff", eye: "#204060", mark: "snow" },
  { id: "sunset", label: "Sunset Sorcery", body: "#e87848", mane: "#803060", accent: "#f0b060", blush: "#ffc8a8", eye: "#301020", mark: "flame", pattern: "flames" },
  { id: "forest", label: "Forest Fern", body: "#487848", mane: "#284828", accent: "#78b878", blush: "#a8d8a8", eye: "#102010", mark: "leaf", pattern: "spots" },
  { id: "phoenix", label: "Phoenix Flame", body: "#f06020", mane: "#ffd040", accent: "#ff9040", blush: "#ffc0a0", eye: "#401008", mark: "flame", pattern: "flames" },
  { id: "galaxy", label: "Galaxy Grace", body: "#281848", mane: "#6040a0", accent: "#c0a0ff", blush: "#e0c0ff", eye: "#80ffff", mark: "star", pattern: "galaxy" },
  { id: "unicorn", label: "Unicorn Utopia", body: "#f0d0f8", mane: "#ff90d0", accent: "#fff0ff", blush: "#ffe0f0", eye: "#6040a0", mark: "horn" },
  { id: "tiger", label: "Tiger Trot", body: "#f0a040", mane: "#c06010", accent: "#402010", blush: "#ffc0a0", eye: "#201008", mark: "stripe" },
  { id: "dragon", label: "Dragon Dash", body: "#60c080", mane: "#208050", accent: "#f0e060", blush: "#ffa0a0", eye: "#103020", mark: "scale" },
  { id: "shadow", label: "Shadow Stallion", body: "#382848", mane: "#181020", accent: "#684878", blush: "#c0a0d0", eye: "#e0c0ff", mark: "moon", pattern: "galaxy" },
  { id: "aurora", label: "Aurora Arc", body: "#408878", mane: "#6040a0", accent: "#80f0c0", blush: "#c0ffe8", eye: "#102030", mark: "star", pattern: "galaxy" },
];

export const HORSE_SPRITE_COUNT = HORSE_SPRITE_ROSTER.length;

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
  } else if (mark === "diamond") {
    px(ctx, ox + 4, oy + 3, 1, 1, accent, scale);
    px(ctx, ox + 3, oy + 4, 3, 1, accent, scale);
    px(ctx, ox + 4, oy + 5, 1, 1, accent, scale);
  } else if (mark === "flame") {
    px(ctx, ox + 4, oy + 2, 1, 1, accent, scale);
    px(ctx, ox + 3, oy + 3, 3, 1, accent, scale);
    px(ctx, ox + 4, oy + 4, 1, 2, accent, scale);
    px(ctx, ox + 3, oy + 5, 1, 1, accent, scale);
    px(ctx, ox + 5, oy + 5, 1, 1, accent, scale);
  } else if (mark === "leaf") {
    px(ctx, ox + 3, oy + 4, 1, 1, accent, scale);
    px(ctx, ox + 4, oy + 3, 1, 1, accent, scale);
    px(ctx, ox + 5, oy + 4, 1, 1, accent, scale);
    px(ctx, ox + 4, oy + 5, 1, 1, accent, scale);
    px(ctx, ox + 4, oy + 6, 1, 1, accent, scale);
  } else if (mark === "clover") {
    px(ctx, ox + 3, oy + 3, 1, 1, accent, scale);
    px(ctx, ox + 5, oy + 3, 1, 1, accent, scale);
    px(ctx, ox + 4, oy + 4, 1, 1, accent, scale);
    px(ctx, ox + 4, oy + 5, 1, 1, accent, scale);
  }
}

function drawPattern(ctx, pattern, ox, oy, accent, body, scale) {
  if (!pattern || pattern === "none") return;

  if (pattern === "spots") {
    px(ctx, ox + 5, oy + 8, 1, 1, accent, scale);
    px(ctx, ox + 8, oy + 9, 1, 1, accent, scale);
    px(ctx, ox + 6, oy + 10, 1, 1, accent, scale);
    px(ctx, ox + 9, oy + 7, 1, 1, accent, scale);
  } else if (pattern === "blaze") {
    px(ctx, ox + 14, oy + 6, 1, 3, accent, scale);
    px(ctx, ox + 15, oy + 7, 1, 2, accent, scale);
  } else if (pattern === "feather") {
    px(ctx, ox + 4, oy + 15, 2, 1, accent, scale);
    px(ctx, ox + 7, oy + 15, 2, 1, accent, scale);
    px(ctx, ox + 11, oy + 15, 2, 1, accent, scale);
    px(ctx, ox + 14, oy + 15, 2, 1, accent, scale);
  } else if (pattern === "dapple") {
    px(ctx, ox + 5, oy + 8, 1, 1, accent, scale);
    px(ctx, ox + 8, oy + 9, 1, 1, accent, scale);
    px(ctx, ox + 7, oy + 7, 1, 1, accent, scale);
    px(ctx, ox + 10, oy + 8, 1, 1, accent, scale);
  } else if (pattern === "stripe") {
    px(ctx, ox + 8, oy + 7, 1, 5, accent, scale);
  } else if (pattern === "socks") {
    px(ctx, ox + 4, oy + 15, 2, 1, accent, scale);
    px(ctx, ox + 14, oy + 15, 2, 1, accent, scale);
  } else if (pattern === "pinto") {
    px(ctx, ox + 4, oy + 7, 3, 3, accent, scale);
    px(ctx, ox + 9, oy + 10, 2, 2, accent, scale);
  } else if (pattern === "flames") {
    px(ctx, ox + 2, oy + 8, 1, 1, accent, scale);
    px(ctx, ox + 1, oy + 9, 1, 1, accent, scale);
    px(ctx, ox + 7, oy + 7, 1, 1, accent, scale);
    px(ctx, ox + 10, oy + 10, 1, 1, accent, scale);
  } else if (pattern === "galaxy") {
    px(ctx, ox + 5, oy + 8, 1, 1, "#fff", scale);
    px(ctx, ox + 9, oy + 9, 1, 1, accent, scale);
    px(ctx, ox + 7, oy + 7, 1, 1, "#fff", scale);
    px(ctx, ox + 11, oy + 8, 1, 1, accent, scale);
  } else if (pattern === "petals") {
    px(ctx, ox + 6, oy + 8, 1, 1, accent, scale);
    px(ctx, ox + 8, oy + 9, 1, 1, accent, scale);
    px(ctx, ox + 5, oy + 10, 1, 1, accent, scale);
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

  drawPattern(ctx, s.pattern, ox, oy, s.accent, s.body, scale);
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
