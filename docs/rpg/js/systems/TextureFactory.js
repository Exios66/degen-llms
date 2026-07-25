import { TILE, TILE_SIZE } from "./MapData.js";

/**
 * Rich procedural 16×16 pixel textures (no external art files).
 * Distinct floor patterns, directional walk cycles, and venue decor.
 */

function px(g, color, x, y, w = 1, h = 1) {
  g.fillStyle(color, 1);
  g.fillRect(x, y, w, h);
}

function makeTex(scene, key, draw, w = TILE_SIZE, h = TILE_SIZE) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

function drawLobbyTile(g) {
  // Gold marble with soft veins
  px(g, 0xb8923e, 0, 0, 16, 16);
  px(g, 0xc9a54a, 0, 0, 16, 2);
  px(g, 0xc9a54a, 0, 0, 2, 16);
  px(g, 0xa67d32, 1, 4, 5, 1);
  px(g, 0xa67d32, 7, 8, 6, 1);
  px(g, 0xd4b36a, 10, 2, 3, 1);
  px(g, 0x8f6a28, 3, 12, 4, 1);
  px(g, 0xe0c878, 14, 14, 1, 1);
}

function drawCarpetTile(g) {
  // Casino burgundy with diamond motif
  px(g, 0x3a1034, 0, 0, 16, 16);
  px(g, 0x4a1942, 1, 1, 14, 14);
  px(g, 0x5c2454, 4, 4, 8, 8);
  px(g, 0x7a3a6e, 6, 6, 4, 4);
  px(g, 0xe8c547, 7, 7, 2, 2);
  px(g, 0x2a0a24, 0, 0, 16, 1);
  px(g, 0x2a0a24, 0, 15, 16, 1);
}

function drawFeltTile(g) {
  // Poker felt with stitch edge
  px(g, 0x145232, 0, 0, 16, 16);
  px(g, 0x1a5c3a, 1, 1, 14, 14);
  px(g, 0x227048, 2, 2, 12, 12);
  for (let i = 2; i < 14; i += 3) {
    px(g, 0x0e3a24, i, 1, 1, 1);
    px(g, 0x0e3a24, 1, i, 1, 1);
    px(g, 0x0e3a24, i, 14, 1, 1);
    px(g, 0x0e3a24, 14, i, 1, 1);
  }
  px(g, 0x2a8c58, 6, 6, 4, 4);
}

function drawWallTile(g) {
  px(g, 0x12101a, 0, 0, 16, 16);
  px(g, 0x1a1520, 1, 1, 14, 14);
  px(g, 0x2a2438, 0, 0, 16, 2);
  px(g, 0x0a0810, 0, 14, 16, 2);
  px(g, 0x3a3048, 2, 4, 3, 1);
  px(g, 0x3a3048, 8, 9, 4, 1);
}

function drawWaterTile(g) {
  px(g, 0x1a4a6a, 0, 0, 16, 16);
  px(g, 0x2a6a8a, 0, 2, 16, 4);
  px(g, 0x39c5cf, 2, 3, 4, 1);
  px(g, 0x4ad4de, 9, 4, 5, 1);
  px(g, 0x1a5a7a, 0, 8, 16, 3);
  px(g, 0x2a8aaa, 3, 9, 6, 1);
  px(g, 0x145070, 0, 13, 16, 3);
}

function drawVipTile(g) {
  px(g, 0x2a2010, 0, 0, 16, 16);
  px(g, 0x3a2a10, 1, 1, 14, 14);
  px(g, 0xe8c547, 3, 3, 10, 10);
  px(g, 0x3a2a10, 5, 5, 6, 6);
  px(g, 0xc4a030, 6, 6, 4, 4);
  px(g, 0xffe08a, 7, 7, 2, 2);
}

function drawAquaTile(g) {
  px(g, 0x0e3040, 0, 0, 16, 16);
  px(g, 0x1a4a5a, 1, 1, 14, 14);
  px(g, 0x2a6a7a, 2, 4, 12, 2);
  px(g, 0x39c5cf, 4, 8, 8, 1);
  px(g, 0x1a5a6a, 0, 12, 16, 4);
  px(g, 0x4ad4de, 10, 5, 3, 1);
}

function drawVoidTile(g) {
  px(g, 0x05040a, 0, 0, 16, 16);
}

const TILE_DRAWERS = {
  [TILE.VOID]: drawVoidTile,
  [TILE.LOBBY]: drawLobbyTile,
  [TILE.CARPET]: drawCarpetTile,
  [TILE.FELT]: drawFeltTile,
  [TILE.PLANT]: drawLobbyTile,
  [TILE.WATER]: drawWaterTile,
  [TILE.WALL]: drawWallTile,
  [TILE.BAR]: drawLobbyTile,
  [TILE.SLOT]: drawCarpetTile,
  [TILE.SCREEN]: drawCarpetTile,
  [TILE.VIP]: drawVipTile,
  [TILE.AQUA]: drawAquaTile,
};

/**
 * Generate all game textures at runtime.
 */
export function createGameTextures(scene) {
  for (const [id, drawer] of Object.entries(TILE_DRAWERS)) {
    makeTex(scene, `tile_${id}`, drawer);
  }

  // Characters — idle + 2 walk frames per facing for player archetypes
  const archetypes = [
    ["player", 0x39c5cf, 0x2a9299, 0x1a6070],
    ["player_weekend_warrior", 0x39c5cf, 0x2a9299, 0x1a6070],
    ["player_high_roller", 0xe8c547, 0xc4a030, 0x8a7020],
    ["player_convention_goer", 0xc678dd, 0x9a58aa, 0x6a3880],
    ["player_local", 0x3dd68c, 0x2a9c64, 0x1a7048],
  ];
  for (const [base, body, outline, shade] of archetypes) {
    for (const dir of ["down", "up", "left", "right"]) {
      makeTex(scene, `${base}_${dir}`, (g) => drawCharacter(g, body, outline, shade, dir, 0), 16, 22);
      makeTex(scene, `${base}_${dir}_1`, (g) => drawCharacter(g, body, outline, shade, dir, 1), 16, 22);
      makeTex(scene, `${base}_${dir}_2`, (g) => drawCharacter(g, body, outline, shade, dir, 2), 16, 22);
    }
    // Legacy key used before directional textures
    makeTex(scene, base, (g) => drawCharacter(g, body, outline, shade, "down", 0), 16, 22);
  }

  const npcs = [
    ["npc_gold", 0xe8c547, 0xc4a030, 0x8a7020],
    ["npc_green", 0x3dd68c, 0x2a9c64, 0x1a7048],
    ["npc_pink", 0xc678dd, 0x9a58aa, 0x6a3880],
    ["npc_teal", 0x39c5cf, 0x2a9299, 0x1a6070],
    ["npc_red", 0xf07178, 0xc05058, 0x803038],
    ["npc_orange", 0xffa657, 0xcc8445, 0x8a5020],
    ["npc_silver", 0xb0b8c8, 0x808890, 0x505860],
  ];
  for (const [key, body, outline, shade] of npcs) {
    makeTex(scene, key, (g) => drawCharacter(g, body, outline, shade, "down", 0), 16, 22);
  }

  makeTex(scene, "decor_bar", drawBarDecor);
  makeTex(scene, "decor_plant", drawPlantDecor);
  makeTex(scene, "decor_slot", drawSlotDecor);
  makeTex(scene, "decor_screen", drawScreenDecor);
  makeTex(scene, "shadow", (g) => {
    px(g, 0x000000, 2, 4, 12, 4);
    px(g, 0x000000, 3, 3, 10, 6);
  }, 16, 10);
  makeTex(scene, "interact_icon", (g) => {
    px(g, 0xe8c547, 6, 0, 4, 2);
    px(g, 0xe8c547, 4, 2, 8, 2);
    px(g, 0xe8c547, 2, 4, 12, 2);
    px(g, 0xe8c547, 0, 6, 16, 2);
    px(g, 0xc4a030, 4, 8, 8, 2);
    px(g, 0xc4a030, 6, 10, 4, 2);
  }, 16, 14);

  // Register walk animations for player archetypes
  for (const [base] of archetypes) {
    for (const dir of ["down", "up", "left", "right"]) {
      const animKey = `${base}_walk_${dir}`;
      if (scene.anims.exists(animKey)) scene.anims.remove(animKey);
      scene.anims.create({
        key: animKey,
        frames: [
          { key: `${base}_${dir}_1` },
          { key: `${base}_${dir}` },
          { key: `${base}_${dir}_2` },
          { key: `${base}_${dir}` },
        ],
        frameRate: 8,
        repeat: -1,
      });
      const idleKey = `${base}_idle_${dir}`;
      if (scene.anims.exists(idleKey)) scene.anims.remove(idleKey);
      scene.anims.create({
        key: idleKey,
        frames: [{ key: `${base}_${dir}` }],
        frameRate: 1,
        repeat: 0,
      });
    }
  }
}

function drawCharacter(g, body, outline, shade, dir, frame) {
  const bob = frame === 1 ? -1 : frame === 2 ? 1 : 0;
  const legL = frame === 1 ? 1 : frame === 2 ? -1 : 0;
  const legR = -legL;

  // Shadow
  px(g, 0x000000, 3, 19, 10, 2);

  // Legs
  px(g, 0x2a2438, 4 + legL, 16 + bob, 3, 4);
  px(g, 0x2a2438, 9 + legR, 16 + bob, 3, 4);
  px(g, 0x1a1520, 4 + legL, 19 + bob, 3, 1);
  px(g, 0x1a1520, 9 + legR, 19 + bob, 3, 1);

  // Body
  px(g, outline, 3, 8 + bob, 10, 9);
  px(g, body, 4, 9 + bob, 8, 7);
  px(g, shade, 4, 14 + bob, 8, 2);

  // Arms by facing
  if (dir === "left") {
    px(g, outline, 1, 10 + bob, 3, 5);
    px(g, body, 1, 11 + bob, 2, 3);
  } else if (dir === "right") {
    px(g, outline, 12, 10 + bob, 3, 5);
    px(g, body, 13, 11 + bob, 2, 3);
  } else {
    px(g, outline, 2, 10 + bob, 2, 5);
    px(g, outline, 12, 10 + bob, 2, 5);
    px(g, body, 2, 11 + bob, 1, 3);
    px(g, body, 13, 11 + bob, 1, 3);
  }

  // Head
  px(g, outline, 4, 2 + bob, 8, 7);
  px(g, 0xffe0c0, 5, 3 + bob, 6, 5);
  px(g, 0xf0c8a0, 5, 6 + bob, 6, 2);

  // Hair / facing cue
  if (dir === "up") {
    px(g, shade, 5, 2 + bob, 6, 3);
    px(g, outline, 4, 2 + bob, 8, 2);
  } else if (dir === "down") {
    px(g, shade, 5, 2 + bob, 6, 2);
    // Eyes
    px(g, 0x1a1520, 6, 5 + bob, 1, 1);
    px(g, 0x1a1520, 9, 5 + bob, 1, 1);
  } else if (dir === "left") {
    px(g, shade, 5, 2 + bob, 4, 2);
    px(g, 0x1a1520, 6, 5 + bob, 1, 1);
  } else {
    px(g, shade, 7, 2 + bob, 4, 2);
    px(g, 0x1a1520, 9, 5 + bob, 1, 1);
  }
}

function drawBarDecor(g) {
  px(g, 0x3a2410, 1, 5, 14, 11);
  px(g, 0x5c3a1a, 2, 6, 12, 9);
  px(g, 0x9a7040, 1, 4, 14, 3);
  px(g, 0xc4a070, 2, 4, 12, 1);
  px(g, 0x39c5cf, 4, 8, 2, 3);
  px(g, 0xf07178, 8, 8, 2, 3);
  px(g, 0xe8c547, 12, 8, 2, 3);
}

function drawPlantDecor(g) {
  px(g, 0x5c3a1a, 5, 11, 6, 5);
  px(g, 0x3a2410, 6, 12, 4, 3);
  px(g, 0x2d6a3f, 3, 4, 10, 8);
  px(g, 0x4a9c5a, 4, 2, 8, 6);
  px(g, 0x6aba6a, 6, 1, 4, 3);
  px(g, 0x1a4a28, 7, 6, 2, 5);
}

function drawSlotDecor(g) {
  px(g, 0x1a0a18, 1, 1, 14, 15);
  px(g, 0x3a1838, 2, 2, 12, 13);
  px(g, 0xe8c547, 3, 3, 10, 5);
  px(g, 0x0a0812, 4, 4, 2, 3);
  px(g, 0xf07178, 7, 4, 2, 3);
  px(g, 0x3dd68c, 10, 4, 2, 3);
  px(g, 0x2a1028, 3, 9, 10, 5);
  px(g, 0xc4a030, 5, 10, 6, 2);
  px(g, 0xff4a60, 7, 13, 2, 2);
}

function drawScreenDecor(g) {
  px(g, 0x0a1520, 0, 1, 16, 14);
  px(g, 0x1a3040, 1, 2, 14, 12);
  px(g, 0x39c5cf, 2, 3, 12, 9);
  px(g, 0x0a2030, 3, 4, 4, 3);
  px(g, 0x0a2030, 9, 4, 4, 3);
  px(g, 0x3dd68c, 3, 8, 10, 1);
  px(g, 0xe8c547, 3, 10, 3, 1);
  px(g, 0xf07178, 8, 10, 4, 1);
  px(g, 0x1a1520, 6, 14, 4, 2);
}

export function playerTextureKey(archetype, facing = "down") {
  const map = {
    weekend_warrior: "player_weekend_warrior",
    high_roller: "player_high_roller",
    convention_goer: "player_convention_goer",
    local: "player_local",
  };
  const base = map[archetype] ?? "player";
  return `${base}_${facing}`;
}

export function playerAnimKey(archetype, facing, moving) {
  const map = {
    weekend_warrior: "player_weekend_warrior",
    high_roller: "player_high_roller",
    convention_goer: "player_convention_goer",
    local: "player_local",
  };
  const base = map[archetype] ?? "player";
  return moving ? `${base}_walk_${facing}` : `${base}_idle_${facing}`;
}
