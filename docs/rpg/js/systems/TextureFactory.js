import { TILE, TILE_SIZE } from "./MapData.js";

const PALETTE = {
  [TILE.VOID]: 0x0a0812,
  [TILE.LOBBY]: 0xc4a35a,
  [TILE.CARPET]: 0x4a1942,
  [TILE.FELT]: 0x1a5c3a,
  [TILE.PLANT]: 0x2d6a3f,
  [TILE.WATER]: 0x2a6a8a,
  [TILE.WALL]: 0x1a1520,
};

const TILE_HIGHLIGHT = {
  [TILE.LOBBY]: 0xd4b36a,
  [TILE.CARPET]: 0x5a2952,
  [TILE.FELT]: 0x2a7c4a,
  [TILE.WALL]: 0x2a2438,
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
