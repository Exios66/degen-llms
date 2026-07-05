/** Kawaii high-density pixel horse sprite roster and canvas renderer for the racing paddock. */

export const HORSE_NATIVE_W = 48;
export const HORSE_NATIVE_H = 36;

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

/** Turf strip beneath the pony — gives paddock/track context. */
function drawTrackGround(ctx, scale) {
  const turf = ["#2a6838", "#327840", "#286830", "#3a8848"];
  for (let x = 0; x < HORSE_NATIVE_W; x++) {
    px(ctx, x, 33, 1, 1, turf[x % turf.length], scale);
    if (x % 3 === 0) px(ctx, x, 34, 1, 1, turf[(x + 1) % turf.length], scale);
  }
  px(ctx, 6, 32, 1, 1, "#58c868", scale);
  px(ctx, 22, 32, 1, 1, "#ffe878", scale);
  px(ctx, 38, 32, 1, 1, "#ff90b0", scale);
  px(ctx, 4, 33, 2, 1, "rgba(0,0,0,0.18)", scale);
  px(ctx, 10, 33, 28, 1, "rgba(0,0,0,0.12)", scale);
}

function drawMark(ctx, mark, ox, oy, accent, scale) {
  if (!mark || mark === "none") return;

  const m = {
    star: [
      [8, 4, accent], [7, 5, accent], [8, 5, "#fff"], [9, 5, accent], [8, 6, accent],
      [7, 7, accent], [9, 7, accent],
    ],
    heart: [
      [7, 5, accent], [9, 5, accent], [6, 6, accent], [10, 6, accent],
      [7, 7, accent], [8, 7, "#fff"], [9, 7, accent], [8, 8, accent],
    ],
    moon: [
      [8, 4, accent], [9, 4, accent], [7, 5, accent], [7, 6, accent], [7, 7, accent],
      [10, 7, accent],
    ],
    snow: [
      [8, 4, "#fff"], [7, 5, "#fff"], [8, 5, "#fff"], [9, 5, "#fff"],
      [6, 6, "#fff"], [8, 6, "#fff"], [10, 6, "#fff"], [8, 7, "#fff"],
    ],
    cloud: [
      [7, 5, accent], [8, 5, "#fff"], [9, 5, accent], [8, 4, accent],
      [6, 6, accent], [10, 6, accent],
    ],
    patch: [
      [5, 10, accent], [6, 10, accent], [5, 11, accent], [6, 11, accent], [7, 11, accent],
      [12, 14, accent], [13, 14, accent], [12, 15, accent],
    ],
    bolt: [
      [8, 3, accent], [8, 4, accent], [7, 5, accent], [8, 5, accent],
      [6, 6, accent], [7, 6, accent], [8, 7, accent],
    ],
    crown: [
      [7, 3, accent], [9, 3, accent], [6, 4, accent], [8, 4, "#fff"], [10, 4, accent],
      [6, 5, accent], [7, 5, accent], [8, 5, accent], [9, 5, accent], [10, 5, accent],
    ],
    horn: [
      [17, 2, accent], [17, 3, accent], [16, 4, accent], [17, 4, "#fff"],
      [16, 5, accent], [15, 6, accent],
    ],
    stripe: [
      [6, 12, accent], [6, 13, accent], [6, 14, accent], [6, 15, accent],
      [10, 14, accent], [10, 15, accent], [10, 16, accent],
    ],
    scale: [
      [8, 12, accent], [10, 13, accent], [7, 14, accent], [11, 15, accent], [9, 16, accent],
    ],
    diamond: [
      [8, 4, accent], [7, 5, accent], [8, 5, "#fff"], [9, 5, accent], [8, 6, accent],
    ],
    flame: [
      [8, 2, accent], [7, 3, accent], [8, 3, "#fff"], [9, 3, accent],
      [7, 4, accent], [8, 4, accent], [9, 4, accent], [8, 5, accent],
      [7, 6, accent], [9, 6, accent],
    ],
    leaf: [
      [7, 5, accent], [8, 4, accent], [9, 5, accent], [8, 6, accent], [8, 7, accent], [8, 8, accent],
    ],
    clover: [
      [7, 4, accent], [9, 4, accent], [8, 5, accent], [7, 6, accent], [9, 6, accent], [8, 7, accent],
    ],
  };
  dots(ctx, m[mark] ?? [], ox, oy, scale);
}

function drawPattern(ctx, pattern, ox, oy, accent, body, scale) {
  if (!pattern || pattern === "none") return;

  const bodyLight = shadeColor(body, 0.15);
  const p = {
    spots: [
      [10, 16, accent], [11, 16, accent], [18, 17, accent], [12, 18, accent],
      [19, 15, accent], [14, 19, accent], [20, 18, accent],
    ],
    blaze: [
      [28, 12, bodyLight], [28, 13, bodyLight], [29, 14, bodyLight], [29, 15, bodyLight],
      [30, 16, bodyLight], [30, 17, bodyLight],
    ],
    feather: [
      [8, 30, accent], [9, 30, accent], [10, 31, accent],
      [14, 30, accent], [15, 30, accent], [16, 31, accent],
      [22, 30, accent], [23, 30, accent], [24, 31, accent],
      [28, 30, accent], [29, 30, accent], [30, 31, accent],
    ],
    dapple: [
      [10, 16, accent], [13, 17, accent], [16, 16, accent], [18, 18, accent],
      [14, 19, accent], [20, 17, accent], [11, 18, accent],
    ],
    stripe: [
      [16, 14, accent], [16, 15, accent], [16, 16, accent], [16, 17, accent],
      [16, 18, accent], [16, 19, accent], [16, 20, accent],
    ],
    socks: [
      [8, 30, accent], [9, 30, accent], [10, 30, accent],
      [28, 30, accent], [29, 30, accent], [30, 30, accent],
    ],
    pinto: [
      [8, 14, accent], [9, 14, accent], [10, 14, accent], [8, 15, accent], [9, 15, accent],
      [10, 15, accent], [8, 16, accent], [9, 16, accent],
      [18, 18, accent], [19, 18, accent], [18, 19, accent], [19, 19, accent],
    ],
    flames: [
      [4, 16, accent], [3, 17, accent], [5, 17, accent], [14, 15, accent],
      [20, 18, accent], [21, 19, accent], [2, 18, accent],
    ],
    galaxy: [
      [10, 16, "#fff"], [14, 17, accent], [18, 16, "#fff"], [20, 18, accent],
      [12, 19, "#fff"], [16, 15, accent], [22, 17, "#fff"],
    ],
    petals: [
      [12, 16, accent], [14, 17, accent], [16, 16, accent], [13, 18, accent], [15, 19, accent],
    ],
  };
  dots(ctx, p[pattern] ?? [], ox, oy, scale);
}

/** Leg pose offsets for a 4-frame trot/gallop cycle. */
function legPose(frame) {
  const f = frame % 4;
  const poses = [
    { backFar: 0, backNear: 0, frontFar: 0, frontNear: 0, tail: 0 },
    { backFar: -1, backNear: 1, frontFar: 1, frontNear: -1, tail: 1 },
    { backFar: 0, backNear: 0, frontFar: 0, frontNear: 0, tail: 0 },
    { backFar: 1, backNear: -1, frontFar: -1, frontNear: 1, tail: -1 },
  ];
  return poses[f];
}

function drawLeg(ctx, x, y, body, hoof, scale, lift = 0) {
  const legY = y + lift;
  const bodyShade = shadeColor(body, -0.18);
  px(ctx, x, legY, 3, 5, body, scale);
  px(ctx, x + 1, legY + 5, 2, 4, bodyShade, scale);
  px(ctx, x, legY + 9, 3, 2, hoof, scale);
  px(ctx, x + 1, legY + 9, 1, 1, shadeColor(hoof, 0.25), scale);
}

function drawFluffyTail(ctx, ox, oy, mane, maneHi, maneLo, scale, sway = 0) {
  const sy = oy + sway;
  px(ctx, ox + 2, sy + 12, 3, 4, maneLo, scale);
  px(ctx, ox + 1, sy + 14, 2, 5, mane, scale);
  px(ctx, ox, sy + 16, 2, 4, maneHi, scale);
  px(ctx, ox + 1, sy + 20, 1, 3, mane, scale);
  px(ctx, ox + 2, sy + 22, 1, 2, maneHi, scale);
  dots(ctx, [[3, 15, maneHi], [2, 18, maneHi], [1, 21, maneHi]], ox, sy, scale);
}

function drawFluffyMane(ctx, ox, oy, mane, maneHi, maneLo, scale) {
  px(ctx, ox + 20, oy + 4, 4, 6, maneLo, scale);
  px(ctx, ox + 21, oy + 3, 3, 8, mane, scale);
  px(ctx, ox + 22, oy + 2, 2, 10, maneHi, scale);
  px(ctx, ox + 23, oy + 1, 1, 8, mane, scale);
  px(ctx, ox + 24, oy + 2, 2, 7, maneLo, scale);
  px(ctx, ox + 25, oy + 4, 2, 5, mane, scale);
  dots(ctx, [
    [21, 5, maneHi], [22, 4, maneHi], [23, 3, maneHi], [24, 5, maneHi],
    [25, 6, maneHi], [26, 7, maneHi],
  ], ox, oy, scale);
}

function drawKawaiiFace(ctx, ox, oy, s, scale) {
  const bodyHi = shadeColor(s.body, 0.12);
  const bodyLo = shadeColor(s.body, -0.12);

  // Ear (back)
  px(ctx, ox + 24, oy + 2, 3, 4, s.body, scale);
  px(ctx, ox + 25, oy + 3, 2, 2, s.blush, scale);

  // Head
  px(ctx, ox + 24, oy + 5, 8, 7, s.body, scale);
  px(ctx, ox + 30, oy + 6, 6, 6, s.body, scale);
  px(ctx, ox + 34, oy + 7, 4, 5, s.body, scale);
  px(ctx, ox + 36, oy + 9, 3, 3, bodyHi, scale);

  // Ear (front)
  px(ctx, ox + 27, oy + 1, 3, 4, s.body, scale);
  px(ctx, ox + 28, oy + 2, 2, 2, s.blush, scale);

  // Muzzle
  px(ctx, ox + 36, oy + 12, 5, 4, bodyHi, scale);
  px(ctx, ox + 39, oy + 13, 3, 3, shadeColor(s.accent, 0.2), scale);
  px(ctx, ox + 40, oy + 14, 1, 1, bodyLo, scale);
  px(ctx, ox + 41, oy + 15, 2, 1, bodyLo, scale);

  // Big sparkly kawaii eye
  px(ctx, ox + 31, oy + 8, 4, 4, "#fff", scale);
  px(ctx, ox + 32, oy + 9, 3, 3, s.eye, scale);
  px(ctx, ox + 32, oy + 9, 1, 1, "#fff", scale);
  px(ctx, ox + 34, oy + 10, 1, 1, "#fff", scale);
  px(ctx, ox + 33, oy + 11, 1, 1, shadeColor(s.eye, 0.3), scale);

  // Cheek blush
  px(ctx, ox + 29, oy + 12, 2, 1, s.blush, scale);
  px(ctx, ox + 30, oy + 13, 1, 1, s.blush, scale);
  px(ctx, ox + 35, oy + 12, 2, 1, s.blush, scale);
  px(ctx, ox + 36, oy + 13, 1, 1, s.blush, scale);

  // Cute smile
  px(ctx, ox + 38, oy + 15, 2, 1, s.blush, scale);
  px(ctx, ox + 39, oy + 16, 1, 1, bodyLo, scale);
}

function drawSaddle(ctx, ox, oy, accent, scale) {
  const saddle = shadeColor(accent, -0.15);
  const strap = shadeColor(accent, -0.35);
  px(ctx, ox + 14, oy + 16, 10, 4, accent, scale);
  px(ctx, ox + 15, oy + 15, 8, 1, saddle, scale);
  px(ctx, ox + 14, oy + 20, 10, 1, strap, scale);
  px(ctx, ox + 16, oy + 17, 6, 2, shadeColor(accent, 0.2), scale);
  px(ctx, ox + 18, oy + 17, 2, 2, "#fff", scale);
  px(ctx, ox + 19, oy + 18, 1, 1, strap, scale);
}

function drawFantasySparkles(ctx, ox, oy, accent, scale, spriteId) {
  const fantasy = ["unicorn", "galaxy", "aurora", "golden", "phoenix", "frost", "neon"];
  if (!fantasy.includes(spriteId)) return;
  dots(ctx, [
    [4, 6, accent], [42, 8, accent], [38, 2, accent], [6, 20, accent],
  ], ox, oy, scale);
}

/**
 * Draw a kawaii side-view pony into a canvas context.
 * Native resolution is 48×36 logical pixels (high-density pixel art).
 */
export function drawHorseSprite(ctx, spriteId, { scale = 2, frame = 0 } = {}) {
  const s = getHorseSprite(spriteId);
  const bounce = frame % 2 === 0 ? 0 : -1;
  const pose = legPose(frame);
  const ox = 4;
  const oy = 4 + bounce;

  const bodyHi = shadeColor(s.body, 0.14);
  const bodyLo = shadeColor(s.body, -0.16);
  const maneHi = shadeColor(s.mane, 0.22);
  const maneLo = shadeColor(s.mane, -0.18);
  const hoof = shadeColor(s.mane, -0.35);

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  drawTrackGround(ctx, scale);

  // Soft shadow on turf
  px(ctx, ox + 6, oy + 29, 28, 2, "rgba(0,0,0,0.2)", scale);
  px(ctx, ox + 10, oy + 30, 22, 1, "rgba(0,0,0,0.12)", scale);

  // Tail (behind body)
  drawFluffyTail(ctx, ox, oy, s.mane, maneHi, maneLo, scale, pose.tail);

  // Back legs
  drawLeg(ctx, ox + 10, oy + 18, s.body, hoof, scale, pose.backFar);
  drawLeg(ctx, ox + 16, oy + 18, s.body, hoof, scale, pose.backNear);

  // Body — round chibi barrel
  px(ctx, ox + 8, oy + 12, 22, 12, s.body, scale);
  px(ctx, ox + 10, oy + 10, 18, 14, s.body, scale);
  px(ctx, ox + 12, oy + 14, 16, 10, bodyHi, scale);
  px(ctx, ox + 8, oy + 20, 4, 4, bodyLo, scale);
  px(ctx, ox + 26, oy + 20, 4, 4, bodyLo, scale);
  px(ctx, ox + 14, oy + 22, 12, 2, bodyLo, scale);

  // Neck
  px(ctx, ox + 22, oy + 8, 6, 10, s.body, scale);
  px(ctx, ox + 24, oy + 7, 4, 8, bodyHi, scale);

  // Mane (over neck)
  drawFluffyMane(ctx, ox, oy, s.mane, maneHi, maneLo, scale);

  // Head & cute face
  drawKawaiiFace(ctx, ox, oy, s, scale);

  // Front legs
  drawLeg(ctx, ox + 22, oy + 18, s.body, hoof, scale, pose.frontFar);
  drawLeg(ctx, ox + 28, oy + 18, s.body, hoof, scale, pose.frontNear);

  // Racing saddle
  drawSaddle(ctx, ox, oy, s.accent, scale);

  // Coat patterns & forehead marks
  drawPattern(ctx, s.pattern, ox, oy, s.accent, s.body, scale);
  drawMark(ctx, s.mark, ox + 18, oy, s.accent, scale);

  // Fantasy sparkle accents
  drawFantasySparkles(ctx, ox, oy, s.accent, scale, spriteId);
}

export function createHorseSpriteCanvas(spriteId, { size = 96, frame = 0, animate = false } = {}) {
  const scale = Math.max(1, Math.floor(size / HORSE_NATIVE_W));
  const canvas = document.createElement("canvas");
  canvas.width = HORSE_NATIVE_W * scale;
  canvas.height = HORSE_NATIVE_H * scale;
  canvas.className = "horse-sprite-canvas";
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  drawHorseSprite(ctx, spriteId, { scale, frame });
  if (animate) startHorseCanvasAnimation(canvas, spriteId);
  return canvas;
}

/** Cycle gallop frames on an existing horse canvas (paddock idle trot). */
export function startHorseCanvasAnimation(canvas, spriteId, { fps = 5 } = {}) {
  const scale = canvas.width / HORSE_NATIVE_W;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  let frame = 0;
  const tick = () => {
    drawHorseSprite(ctx, spriteId, { scale, frame });
    frame = (frame + 1) % 4;
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
