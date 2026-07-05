import { TILE, TILE_SIZE } from "./MapData.js";

const PALETTE = {
  [TILE.VOID]: 0x0a0812,
  [TILE.LOBBY]: 0xc4a35a,
  [TILE.CARPET]: 0x4a1942,
  [TILE.FELT]: 0x1a5c3a,
  [TILE.PLANT]: 0x2d6a3f,
  [TILE.WATER]: 0x2a6a8a,
  [TILE.WALL]: 0x1a1520,
  [TILE.BAR]: 0x5c3a1a,
};

const TILE_HIGHLIGHT = {
  [TILE.LOBBY]: 0xd4b36a,
  [TILE.CARPET]: 0x5a2952,
  [TILE.FELT]: 0x2a7c4a,
  [TILE.WALL]: 0x2a2438,
  [TILE.BAR]: 0x7c4a2a,
};

/**
 * Generate placeholder pixel-art textures at runtime (no external assets).
 */
export function createGameTextures(scene) {
  for (const [id, color] of Object.entries(PALETTE)) {
    const key = `tile_${id}`;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const base = color;
    const hi = TILE_HIGHLIGHT[id] ?? base;
    g.fillStyle(base, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.fillStyle(hi, 1);
    g.fillRect(0, 0, TILE_SIZE, 2);
    g.fillRect(0, 0, 2, TILE_SIZE);
    g.lineStyle(1, 0x000000, 0.15);
    g.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.generateTexture(key, TILE_SIZE, TILE_SIZE);
    g.destroy();
  }

  createCharacterTexture(scene, "player", 0x39c5cf, 0x2a9299);
  createCharacterTexture(scene, "npc_gold", 0xe8c547, 0xc4a030);
  createCharacterTexture(scene, "npc_green", 0x3dd68c, 0x2a9c64);
  createCharacterTexture(scene, "npc_pink", 0xc678dd, 0x9a58aa);
  createCharacterTexture(scene, "npc_teal", 0x39c5cf, 0x2a9299);
  createCharacterTexture(scene, "npc_red", 0xf07178, 0xc05058);
  createCharacterTexture(scene, "npc_orange", 0xffa657, 0xcc8445);
  createCharacterTexture(scene, "npc_silver", 0xb0b8c8, 0x808890);

  const barG = scene.make.graphics({ x: 0, y: 0, add: false });
  barG.fillStyle(PALETTE[TILE.BAR], 1);
  barG.fillRect(2, 6, 12, 10);
  barG.fillStyle(0x9a7040, 1);
  barG.fillRect(2, 4, 12, 4);
  barG.generateTexture("decor_bar", TILE_SIZE, TILE_SIZE);
  barG.destroy();

  const plantG = scene.make.graphics({ x: 0, y: 0, add: false });
  plantG.fillStyle(PALETTE[TILE.PLANT], 1);
  plantG.fillRect(4, 8, 8, 8);
  plantG.fillStyle(0x4a9c5a, 1);
  plantG.fillRect(2, 2, 12, 8);
  plantG.generateTexture("decor_plant", TILE_SIZE, TILE_SIZE);
  plantG.destroy();

  const interactG = scene.make.graphics({ x: 0, y: 0, add: false });
  interactG.lineStyle(1, 0xe8c547, 1);
  interactG.strokeTriangle(8, 0, 16, 12, 0, 12);
  interactG.generateTexture("interact_icon", 16, 14);
  interactG.destroy();
}

function createCharacterTexture(scene, key, bodyColor, outlineColor) {
  const w = 16;
  const h = 20;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(outlineColor, 1);
  g.fillRect(4, 2, 8, 6);
  g.fillRect(3, 8, 10, 10);
  g.fillStyle(bodyColor, 1);
  g.fillRect(5, 3, 6, 4);
  g.fillRect(4, 9, 8, 8);
  g.fillStyle(0x1a1520, 1);
  g.fillRect(6, 4, 1, 1);
  g.fillRect(9, 4, 1, 1);
  g.generateTexture(key, w, h);
  g.destroy();
}
