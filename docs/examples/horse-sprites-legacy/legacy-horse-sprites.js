/**
 * Cozy 16-bit side-view horse sprites for the racing paddock.
 * Original procedural art inspired by farming-sim creature style (Mana Seed / Hardy Horse
 * aesthetic): chibi proportions, limited color ramps, dark outlines, tail-swish idle,
 * and 4-frame trot cycle. Not a copy of any commercial sprite sheet.
 */

export const HORSE_NATIVE_W = 40;
export const HORSE_NATIVE_H = 32;

export const HORSE_SPRITE_ROSTER = [
  { id: "chestnut", label: "Chestnut Charm", body: "#c89860", mane: "#684830", accent: "#e8c878", blush: "#ffb8c8", eye: "#201810", mark: "star" },
  { id: "palomino", label: "Palomino Peach", body: "#e8c878", mane: "#a88848", accent: "#f0e0a8", blush: "#ffc8d8", eye: "#2a1810", mark: "heart" },
  { id: "grey", label: "Silver Mist", body: "#b0b8c8", mane: "#606878", accent: "#e0e8f0", blush: "#ffd0e0", eye: "#1a2030", mark: "none" },
  { id: "bay", label: "Bay Baron", body: "#985038", mane: "#281810", accent: "#c87858", blush: "#ffb8c8", eye: "#101018", mark: "none", pattern: "socks" },
  { id: "buckskin", label: "Buckskin Buckle", body: "#d4a868", mane: "#403028", accent: "#f0d8a0", blush: "#ffc8d8", eye: "#201810", mark: "diamond" },
  { id: "black", label: "Onyx Obsidian", body: "#383040", mane: "#181018", accent: "#585060", blush: "#ffa0b8", eye: "#d0c8e0", mark: "diamond" },
  { id: "sorrel", label: "Sorrel Sunset", body: "#c05838", mane: "#601810", accent: "#e87850", blush: "#ffb8a8", eye: "#201008", mark: "flame" },
  { id: "cremello", label: "Cremello Cloud", body: "#f0e8c8", mane: "#c8b888", accent: "#fff8e8", blush: "#ffd8e0", eye: "#506878", mark: "none" },
  { id: "roan", label: "Roan Ripple", body: "#a88878", mane: "#584840", accent: "#d0b8b0", blush: "#ffc8d0", eye: "#281820", mark: "none", pattern: "dapple" },
  { id: "dun", label: "Dun Drifter", body: "#c0a878", mane: "#504030", accent: "#e8d0a8", blush: "#ffc8b8", eye: "#302018", mark: "none", pattern: "stripe" },
  { id: "appaloosa", label: "Appaloosa Ace", body: "#e8e0d0", mane: "#403028", accent: "#806848", blush: "#ffc8d8", eye: "#201810", mark: "none", pattern: "spots" },
  { id: "paint", label: "Paint Patch", body: "#f0e8d8", mane: "#403020", accent: "#a06040", blush: "#ffc8d8", eye: "#201810", mark: "patch" },
  { id: "pinto", label: "Pinto Parade", body: "#f8f0e8", mane: "#302018", accent: "#704028", blush: "#ffd0d8", eye: "#181008", mark: "none", pattern: "pinto" },
  { id: "friesian", label: "Friesian Frost", body: "#282830", mane: "#080810", accent: "#484850", blush: "#ffa0c0", eye: "#c8c0d8", mark: "none", pattern: "feather" },
  { id: "clydesdale", label: "Clydesdale Charm", body: "#805038", mane: "#d8c8b0", accent: "#a87848", blush: "#ffb8a8", eye: "#201008", mark: "none", pattern: "feather" },
  { id: "arabian", label: "Arabian Astra", body: "#d0a090", mane: "#503028", accent: "#f0d0c0", blush: "#ffc8d0", eye: "#301820", mark: "diamond" },
  { id: "mustang", label: "Mustang Muse", body: "#b08860", mane: "#483020", accent: "#d8b890", blush: "#ffc8b0", eye: "#281810", mark: "none", pattern: "blaze" },
  { id: "andalusian", label: "Andalusian Aura", body: "#d8d0c8", mane: "#807870", accent: "#f0ece8", blush: "#ffd8e0", eye: "#404050", mark: "none" },
  { id: "midnight", label: "Midnight Mochi", body: "#404058", mane: "#181820", accent: "#686880", blush: "#ffa0b8", eye: "#e8f0ff", mark: "moon" },
  { id: "snow", label: "Snowflake Sweet", body: "#e8e8f0", mane: "#a8b0c0", accent: "#ffffff", blush: "#ffb0c8", eye: "#283040", mark: "snow" },
  { id: "rose", label: "Rose Petal", body: "#e87898", mane: "#a04058", accent: "#ffd0e0", blush: "#ffe0e8", eye: "#301820", mark: "heart" },
  { id: "mint", label: "Mint Marshmallow", body: "#78d8b0", mane: "#389868", accent: "#b0f0d0", blush: "#ffc8d8", eye: "#103020", mark: "star" },
  { id: "lavender", label: "Lavender Lace", body: "#b898e8", mane: "#7058a8", accent: "#e0d0ff", blush: "#ffd8e8", eye: "#201830", mark: "none" },
  { id: "sky", label: "Sky Sprinter", body: "#68b8f0", mane: "#3070b0", accent: "#b0e0ff", blush: "#ffc0d8", eye: "#102040", mark: "cloud" },
  { id: "caramel", label: "Caramel Cloud", body: "#d0a060", mane: "#886030", accent: "#f0d0a0", blush: "#ffb8c8", eye: "#281808", mark: "none" },
  { id: "cherry", label: "Cherry Cheval", body: "#c03048", mane: "#781828", accent: "#f08090", blush: "#ffc0c8", eye: "#200810", mark: "heart" },
  { id: "sakura", label: "Sakura Spirit", body: "#f8c0d0", mane: "#d08098", accent: "#ffe0e8", blush: "#ffe8f0", eye: "#502030", mark: "leaf", pattern: "petals" },
  { id: "coral", label: "Coral Coast", body: "#f08878", mane: "#a84838", accent: "#ffc8b8", blush: "#ffd8d0", eye: "#301818", mark: "none" },
  { id: "honey", label: "Honey Harvest", body: "#e8b040", mane: "#987018", accent: "#ffe890", blush: "#ffc8a0", eye: "#302008", mark: "clover" },
  { id: "neon", label: "Neon Nights", body: "#404858", mane: "#c84888", accent: "#48e8d8", blush: "#ff90c0", eye: "#00ffff", mark: "bolt" },
  { id: "golden", label: "Golden Gala", body: "#f0c040", mane: "#987008", accent: "#fff0a0", blush: "#ffb8c0", eye: "#302008", mark: "crown" },
  { id: "copper", label: "Copper Comet", body: "#b86830", mane: "#683818", accent: "#e8a060", blush: "#ffb8a0", eye: "#281008", mark: "flame" },
  { id: "sapphire", label: "Sapphire Sprint", body: "#3868c0", mane: "#183070", accent: "#88b8ff", blush: "#ffc0d8", eye: "#101830", mark: "diamond" },
  { id: "emerald", label: "Emerald Echo", body: "#288858", mane: "#104838", accent: "#68d8a0", blush: "#b0ffc8", eye: "#102820", mark: "leaf" },
  { id: "ruby", label: "Ruby Rush", body: "#a02040", mane: "#600818", accent: "#f06080", blush: "#ffc0c8", eye: "#200810", mark: "diamond" },
  { id: "storm", label: "Storm Stallion", body: "#587888", mane: "#304050", accent: "#98b8c8", blush: "#c0d8e8", eye: "#e8f0ff", mark: "cloud" },
  { id: "frost", label: "Frost Fang", body: "#c8e0f0", mane: "#78a8c8", accent: "#e8f8ff", blush: "#d0e8ff", eye: "#204060", mark: "snow" },
  { id: "sunset", label: "Sunset Sorcery", body: "#e87848", mane: "#803060", accent: "#f0b060", blush: "#ffc8a8", eye: "#301020", mark: "flame", pattern: "flames" },
  { id: "forest", label: "Forest Fern", body: "#488848", mane: "#284828", accent: "#78b878", blush: "#a8d8a8", eye: "#102010", mark: "leaf", pattern: "spots" },
  { id: "phoenix", label: "Phoenix Flame", body: "#f06020", mane: "#d0a028", accent: "#ff9040", blush: "#ffc0a0", eye: "#401008", mark: "flame", pattern: "flames" },
  { id: "galaxy", label: "Galaxy Grace", body: "#382858", mane: "#6040a0", accent: "#c0a0ff", blush: "#e0c0ff", eye: "#80ffff", mark: "star", pattern: "galaxy" },
  { id: "unicorn", label: "Unicorn Utopia", body: "#f0d0f8", mane: "#d070b0", accent: "#fff0ff", blush: "#ffe0f0", eye: "#6040a0", mark: "horn" },
  { id: "tiger", label: "Tiger Trot", body: "#f0a040", mane: "#a85810", accent: "#502810", blush: "#ffc0a0", eye: "#201008", mark: "stripe" },
  { id: "dragon", label: "Dragon Dash", body: "#60c080", mane: "#208050", accent: "#e8d848", blush: "#ffa0a0", eye: "#103020", mark: "scale" },
  { id: "shadow", label: "Shadow Stallion", body: "#483858", mane: "#201828", accent: "#786888", blush: "#c0a0d0", eye: "#e0c0ff", mark: "moon", pattern: "galaxy" },
  { id: "aurora", label: "Aurora Arc", body: "#488878", mane: "#6040a0", accent: "#80f0c0", blush: "#c0ffe8", eye: "#102030", mark: "star", pattern: "galaxy" },
];

export const HORSE_SPRITE_COUNT = HORSE_SPRITE_ROSTER.length;

/** Classic table-racing silk colors — one palette per post position. */
export const JOCKEY_SILKS = [
  { name: "Teal", cap: "#58c8e8", shirt: "#40b0d0", sleeves: "#3098b8", pants: "#f0f0f0", trim: "#ffffff" },
  { name: "Rose", cap: "#f098a8", shirt: "#e87898", sleeves: "#d06078", pants: "#f8f0f0", trim: "#ffffff" },
  { name: "Violet", cap: "#a878d8", shirt: "#8860c0", sleeves: "#6848a0", pants: "#f0eef8", trim: "#ffd040" },
  { name: "Gold", cap: "#f0d040", shirt: "#e8b820", sleeves: "#c89810", pants: "#fffef0", trim: "#ffffff" },
  { name: "Crimson", cap: "#c84858", shirt: "#a83040", sleeves: "#881828", pants: "#f8ecec", trim: "#ffffff" },
  { name: "Royal", cap: "#4878e8", shirt: "#3060c8", sleeves: "#2048a0", pants: "#eef0f8", trim: "#ffd040" },
  { name: "Emerald", cap: "#48b878", shirt: "#309860", sleeves: "#208048", pants: "#f0f8f2", trim: "#ffffff" },
  { name: "Orange", cap: "#f0a040", shirt: "#e08828", sleeves: "#c07018", pants: "#fff8f0", trim: "#ffffff" },
];

export function getJockeySilks(horseNumber) {
  return JOCKEY_SILKS[(horseNumber - 1) % JOCKEY_SILKS.length];
}

const SPRITE_BY_ID = Object.fromEntries(HORSE_SPRITE_ROSTER.map((s) => [s.id, s]));

export function getHorseSprite(spriteId) {
  return SPRITE_BY_ID[spriteId] ?? HORSE_SPRITE_ROSTER[0];
}

function shadeColor(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 0xff;
  let g = (n >> 8) & 0xff;
  let b = n & 0xff;
  if (amount > 0) {
    r = Math.round(r + (255 - r) * amount);
    g = Math.round(g + (255 - g) * amount);
    b = Math.round(b + (255 - b) * amount);
  } else {
    const f = 1 + amount;
    r = Math.max(0, Math.round(r * f));
    g = Math.max(0, Math.round(g * f));
    b = Math.max(0, Math.round(b * f));
  }
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function px(ctx, x, y, w, h, color, scale) {
  ctx.fillStyle = color;
  ctx.fillRect(x * scale, y * scale, w * scale, h * scale);
}

function dots(ctx, pixels, ox, oy, scale) {
  for (const [x, y, color] of pixels) {
    px(ctx, ox + x, oy + y, 1, 1, color, scale);
  }
}

function buildPalette(s) {
  return {
    outline: shadeColor(s.body, -0.42),
    body: s.body,
    bodyLo: shadeColor(s.body, -0.18),
    bodyHi: shadeColor(s.body, 0.16),
    mane: s.mane,
    maneLo: shadeColor(s.mane, -0.15),
    maneHi: shadeColor(s.mane, 0.12),
    muzzle: shadeColor(s.body, 0.22),
    hoof: shadeColor(s.mane, -0.35),
    eyeW: "#f8f4e8",
    eye: s.eye,
    accent: s.accent,
  };
}

/** 3-frame idle tail swish (Hardy Horse idle style). */
const IDLE_TAIL = [
  [[5, 13], [4, 14], [4, 15], [4, 16], [5, 17], [5, 18], [6, 19]],
  [[4, 13], [3, 14], [3, 15], [3, 16], [4, 17], [5, 18], [6, 18], [4, 19]],
  [[6, 13], [5, 14], [5, 15], [6, 16], [6, 17], [5, 18], [5, 19]],
];

/** 4-frame trot leg poses — diagonal pairs like Hardy Horse walk/trot. */
const TROT_LEGS = [
  { backFar: { lift: 0, reach: 0 }, backNear: { lift: 0, reach: 0 }, frontFar: { lift: 0, reach: 0 }, frontNear: { lift: 0, reach: 0 }, bob: 0 },
  { backFar: { lift: 0, reach: 0 }, backNear: { lift: 3, reach: -1 }, frontFar: { lift: 3, reach: 1 }, frontNear: { lift: 0, reach: 0 }, bob: 0 },
  { backFar: { lift: 0, reach: 0 }, backNear: { lift: 0, reach: 0 }, frontFar: { lift: 0, reach: 0 }, frontNear: { lift: 0, reach: 0 }, bob: 1 },
  { backFar: { lift: 3, reach: -1 }, backNear: { lift: 0, reach: 0 }, frontFar: { lift: 0, reach: 0 }, frontNear: { lift: 3, reach: 1 }, bob: 0 },
];

function drawTail(ctx, ox, oy, tailFrame, pal, scale) {
  const pts = IDLE_TAIL[tailFrame % 3];
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    const c = i < 2 ? pal.maneLo : i < pts.length - 2 ? pal.mane : pal.maneHi;
    px(ctx, ox + x, oy + y, 1, 1, c, scale);
  }
}

function drawLeg(ctx, ox, oy, baseX, baseY, { lift, reach }, pal, scale) {
  const y = oy + baseY - lift;
  const x = ox + baseX + reach;
  px(ctx, x, y, 2, 4, pal.body, scale);
  px(ctx, x, y + 4, 2, 3, pal.bodyLo, scale);
  px(ctx, x, y + 7, 2, 2, pal.hoof, scale);
  px(ctx, x, y + 7, 1, 1, shadeColor(pal.hoof, 0.2), scale);
}

function drawMark(ctx, mark, ox, oy, accent, outline, scale) {
  if (!mark || mark === "none") return;
  const m = {
    star: [[8, 5, accent], [7, 6, accent], [8, 6, "#fff"], [9, 6, accent], [8, 7, accent]],
    heart: [[7, 6, accent], [9, 6, accent], [7, 7, accent], [8, 7, accent], [9, 7, accent], [8, 8, accent]],
    moon: [[8, 5, accent], [9, 5, accent], [7, 6, accent], [7, 7, accent], [9, 8, accent]],
    snow: [[8, 5, "#fff"], [7, 6, "#fff"], [8, 6, "#fff"], [9, 6, "#fff"], [8, 7, "#fff"]],
    cloud: [[7, 6, accent], [8, 6, "#fff"], [9, 6, accent], [8, 5, accent]],
    patch: [[6, 12, accent], [7, 12, accent], [6, 13, accent], [12, 15, accent]],
    bolt: [[8, 4, accent], [8, 5, accent], [7, 6, accent], [6, 7, accent], [7, 7, accent]],
    crown: [[7, 4, accent], [8, 4, "#fff"], [9, 4, accent], [6, 5, accent], [10, 5, accent]],
    horn: [[16, 3, accent], [16, 4, accent], [15, 5, accent], [15, 6, accent]],
    stripe: [[6, 13, accent], [6, 14, accent], [10, 15, accent], [10, 16, accent]],
    scale: [[8, 13, accent], [10, 14, accent], [9, 15, accent]],
    diamond: [[8, 5, accent], [7, 6, accent], [8, 6, "#fff"], [9, 6, accent], [8, 7, accent]],
    flame: [[8, 4, accent], [7, 5, accent], [8, 5, "#fff"], [9, 5, accent], [8, 6, accent]],
    leaf: [[7, 6, accent], [8, 5, accent], [9, 6, accent], [8, 7, accent], [8, 8, accent]],
    clover: [[7, 5, accent], [9, 5, accent], [8, 6, accent], [7, 7, accent], [9, 7, accent]],
  };
  dots(ctx, (m[mark] ?? []).map(([x, y, c]) => [x, y, c]), ox, oy, scale);
}

function drawJockey(ctx, ox, oy, silks, scale) {
  const skin = "#f0d0b0";
  const skinLo = "#d8b090";
  px(ctx, ox + 15, oy + 4, 3, 2, silks.cap, scale);
  px(ctx, ox + 16, oy + 3, 2, 1, shadeColor(silks.cap, 0.15), scale);
  px(ctx, ox + 16, oy + 6, 2, 2, skin, scale);
  px(ctx, ox + 17, oy + 7, 1, 1, skinLo, scale);
  px(ctx, ox + 14, oy + 8, 6, 3, silks.shirt, scale);
  px(ctx, ox + 13, oy + 9, 1, 2, silks.sleeves, scale);
  px(ctx, ox + 20, oy + 9, 1, 2, silks.sleeves, scale);
  px(ctx, ox + 15, oy + 8, 4, 1, silks.trim, scale);
  px(ctx, ox + 15, oy + 11, 2, 2, silks.pants, scale);
  px(ctx, ox + 17, oy + 11, 2, 2, silks.pants, scale);
  px(ctx, ox + 14, oy + 10, 1, 1, shadeColor(silks.pants, -0.15), scale);
}

function drawPattern(ctx, pattern, ox, oy, accent, bodyHi, scale) {
  if (!pattern) return;
  const p = {
    spots: [[11, 15, accent], [14, 16, accent], [16, 15, accent], [13, 17, accent], [17, 16, accent]],
    blaze: [[27, 11, bodyHi], [28, 12, bodyHi], [29, 13, bodyHi], [29, 14, bodyHi]],
    feather: [[10, 25, accent], [11, 25, accent], [15, 25, accent], [16, 25, accent], [22, 25, accent], [23, 25, accent]],
    dapple: [[12, 15, accent], [15, 16, accent], [14, 14, accent], [17, 15, accent]],
    stripe: [[16, 13, accent], [16, 14, accent], [16, 15, accent], [16, 16, accent]],
    socks: [[10, 25, accent], [11, 25, accent], [23, 25, accent], [24, 25, accent]],
    pinto: [[10, 13, accent], [11, 13, accent], [10, 14, accent], [11, 14, accent], [16, 16, accent], [17, 16, accent]],
    flames: [[5, 15, accent], [4, 16, accent], [14, 14, accent], [18, 16, accent]],
    galaxy: [[12, 15, "#fff"], [15, 16, accent], [17, 15, "#fff"], [14, 17, accent]],
    petals: [[13, 15, accent], [15, 16, accent], [14, 17, accent]],
  };
  dots(ctx, p[pattern] ?? [], ox, oy, scale);
}

/**
 * Draw a cozy chibi side-view horse (Hardy Horse / Mana Seed inspired).
 * @param {'idle'|'trot'} animation
 * @param {boolean} clear — clear canvas before draw (default true when canvas exists)
 * @param {object|null} jockeySilks — when set, draws jockey and silk cloth
 */
export function drawHorseSprite(ctx, spriteId, {
  scale = 2,
  frame = 0,
  animation = "idle",
  offsetX = 0,
  offsetY = 0,
  clear = null,
  jockeySilks = null,
} = {}) {
  const s = getHorseSprite(spriteId);
  const pal = buildPalette(s);
  const ox = 4 + offsetX;
  const isTrot = animation === "trot";
  const tailFrame = isTrot ? Math.floor(frame / 2) % 3 : frame % 3;
  const legPose = isTrot ? TROT_LEGS[frame % 4] : TROT_LEGS[0];
  const oy = 3 + legPose.bob + offsetY;

  const shouldClear = clear ?? (offsetX === 0 && offsetY === 0);
  if (shouldClear && ctx.canvas) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  // Ground shadow
  px(ctx, ox + 8, oy + 26, 22, 2, "rgba(0,0,0,0.22)", scale);
  px(ctx, ox + 10, oy + 27, 18, 1, "rgba(0,0,0,0.12)", scale);

  // Tail (behind body)
  drawTail(ctx, ox, oy, tailFrame, pal, scale);

  // Back legs
  drawLeg(ctx, ox, oy, 8, 18, legPose.backFar, pal, scale);
  drawLeg(ctx, ox, oy, 13, 18, legPose.backNear, pal, scale);

  // Body barrel — chibi rounded
  px(ctx, ox + 9, oy + 13, 16, 9, pal.body, scale);
  px(ctx, ox + 10, oy + 12, 14, 10, pal.body, scale);
  px(ctx, ox + 11, oy + 14, 12, 6, pal.bodyHi, scale);
  px(ctx, ox + 9, oy + 20, 3, 2, pal.bodyLo, scale);
  px(ctx, ox + 22, oy + 20, 3, 2, pal.bodyLo, scale);

  // Neck
  px(ctx, ox + 20, oy + 9, 5, 8, pal.body, scale);
  px(ctx, ox + 21, oy + 10, 3, 6, pal.bodyHi, scale);

  // Mane — blocky clumps on crest
  px(ctx, ox + 19, oy + 6, 4, 5, pal.maneLo, scale);
  px(ctx, ox + 20, oy + 5, 3, 6, pal.mane, scale);
  px(ctx, ox + 21, oy + 4, 2, 5, pal.maneHi, scale);
  px(ctx, ox + 22, oy + 5, 2, 4, pal.mane, scale);
  dots(ctx, [[20, 5, pal.maneHi], [21, 6, pal.maneHi], [22, 7, pal.maneHi]], ox, oy, scale);

  // Head
  px(ctx, ox + 23, oy + 8, 8, 7, pal.body, scale);
  px(ctx, ox + 28, oy + 9, 6, 6, pal.body, scale);
  px(ctx, ox + 31, oy + 10, 4, 4, pal.bodyHi, scale);

  // Ear
  px(ctx, ox + 24, oy + 5, 2, 3, pal.body, scale);
  px(ctx, ox + 25, oy + 6, 1, 1, pal.bodyLo, scale);

  // Muzzle
  px(ctx, ox + 32, oy + 12, 4, 3, pal.muzzle, scale);
  px(ctx, ox + 34, oy + 13, 2, 2, pal.bodyLo, scale);

  // Eye — small cozy dot, not kawaii
  px(ctx, ox + 29, oy + 10, 2, 2, pal.eyeW, scale);
  px(ctx, ox + 30, oy + 11, 1, 1, pal.eye, scale);

  // Front legs
  drawLeg(ctx, ox, oy, 19, 18, legPose.frontFar, pal, scale);
  drawLeg(ctx, ox, oy, 23, 18, legPose.frontNear, pal, scale);

  // Racing saddle cloth or jockey silks
  if (jockeySilks) {
    px(ctx, ox + 13, oy + 14, 8, 3, jockeySilks.shirt, scale);
    px(ctx, ox + 14, oy + 13, 6, 1, shadeColor(jockeySilks.shirt, -0.2), scale);
    px(ctx, ox + 15, oy + 15, 4, 1, jockeySilks.trim, scale);
    drawJockey(ctx, ox, oy, jockeySilks, scale);
  } else {
    px(ctx, ox + 13, oy + 14, 8, 3, pal.accent, scale);
    px(ctx, ox + 14, oy + 13, 6, 1, shadeColor(pal.accent, -0.2), scale);
    px(ctx, ox + 15, oy + 15, 4, 1, shadeColor(pal.accent, 0.15), scale);
  }

  drawPattern(ctx, s.pattern, ox, oy, pal.accent, pal.bodyHi, scale);
  drawMark(ctx, s.mark, ox + 18, oy, pal.accent, pal.outline, scale);

  // Body outline pass
  const outlineBlocks = [
    [9, 12, 16, 1], [9, 21, 16, 1], [9, 12, 1, 10], [24, 12, 1, 10],
    [23, 8, 8, 1], [23, 15, 8, 1], [23, 8, 1, 8], [30, 9, 1, 7],
    [32, 12, 4, 1], [32, 15, 4, 1], [35, 13, 1, 3],
    [20, 9, 5, 1], [20, 17, 5, 1], [24, 5, 2, 1], [24, 8, 2, 1],
  ];
  for (const [x, y, w, h] of outlineBlocks) {
    px(ctx, ox + x, oy + y, w, h, pal.outline, scale);
  }
}

/** Draw horse + jockey composited at canvas pixel coordinates. */
export function drawHorseAndJockeyAt(ctx, spriteId, canvasX, canvasY, {
  scale = 1,
  frame = 0,
  animation = "trot",
  horseNumber = 1,
  jockeySilks = null,
} = {}) {
  const silks = jockeySilks ?? getJockeySilks(horseNumber);
  drawHorseSprite(ctx, spriteId, {
    scale,
    frame,
    animation,
    offsetX: canvasX / scale - 4,
    offsetY: canvasY / scale - 3,
    clear: false,
    jockeySilks: silks,
  });
}

export function createHorseSpriteCanvas(spriteId, { size = 80, frame = 0, animate = false, animation = "idle", horseNumber = 1, withJockey = false } = {}) {
  const scale = Math.max(1, Math.floor(size / HORSE_NATIVE_W));
  const canvas = document.createElement("canvas");
  canvas.width = HORSE_NATIVE_W * scale;
  canvas.height = HORSE_NATIVE_H * scale;
  canvas.className = "horse-sprite-canvas";
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  drawHorseSprite(ctx, spriteId, {
    scale,
    frame,
    animation,
    jockeySilks: withJockey ? getJockeySilks(horseNumber) : null,
  });
  if (animate) startHorseCanvasAnimation(canvas, spriteId, { animation, horseNumber, withJockey });
  return canvas;
}

/** Cycle idle tail-swish or trot frames (Hardy Horse animation style). */
export function startHorseCanvasAnimation(canvas, spriteId, { fps = 4, animation = "idle", horseNumber = 1, withJockey = false } = {}) {
  const scale = canvas.width / HORSE_NATIVE_W;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const frameCount = animation === "trot" ? 4 : 3;
  const silks = withJockey ? getJockeySilks(horseNumber) : null;
  let frame = 0;
  const tick = () => {
    drawHorseSprite(ctx, spriteId, { scale, frame, animation, jockeySilks: silks });
    frame = (frame + 1) % frameCount;
  };
  tick();
  const id = setInterval(tick, 1000 / fps);
  canvas.dataset.animateId = String(id);
  return id;
}

export function assignHorseSprites(count, startOffset = 0) {
  const ids = HORSE_SPRITE_ROSTER.map((s) => s.id);
  const assigned = [];
  for (let i = 0; i < count; i++) {
    assigned.push(ids[(startOffset + i) % ids.length]);
  }
  return assigned;
}
