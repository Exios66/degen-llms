/**
 * Vendored online tilesets → Phaser texture keys matching the TILE enum.
 * Ground/decor PNGs live under docs/rpg/assets/tiles/ (see ATTRIBUTION.md).
 */
import { TILE, TILE_SIZE } from "./MapTiles.js";

const ASSET_ROOT = new URL("../../assets/tiles/", import.meta.url);
const TILE_VARIANTS = 3;

/** TILE id → base filename (without .png / _vN). */
const TILE_FILES = {
  [TILE.VOID]: "void",
  [TILE.LOBBY]: "lobby",
  [TILE.CARPET]: "carpet",
  [TILE.FELT]: "felt",
  [TILE.PLANT]: "plant",
  [TILE.WATER]: "water_f0",
  [TILE.WALL]: "wall",
  [TILE.BAR]: "bar",
  [TILE.SLOT]: "slot",
  [TILE.SCREEN]: "screen",
  [TILE.VIP]: "vip",
  [TILE.AQUA]: "aqua",
  [TILE.ROAD]: "road",
  [TILE.SAND]: "sand",
  [TILE.STAGE]: "stage",
  [TILE.SPA]: "spa",
  [TILE.GLASS]: "glass",
  [TILE.ROPE]: "rope",
  [TILE.PATH]: "path",
  [TILE.TRIM]: "trim",
};

const DECOR_FILES = {
  decor_bar: "decor/bar.png",
  decor_plant: "decor/plant.png",
  decor_slot: "decor/slot.png",
  decor_screen: "decor/screen.png",
  decor_glass: "decor/glass.png",
  decor_rope: "decor/rope.png",
};

function assetUrl(rel) {
  return new URL(rel, ASSET_ROOT).href;
}

function variantFile(base, variant) {
  if (variant === 0) return `${base}.png`;
  return `${base}_v${variant}.png`;
}

/** Stable texture key for a ground tile with positional variant. */
export function tileTextureKey(tileId, x = 0, y = 0) {
  const v = (x * 3 + y * 5 + tileId * 7) % TILE_VARIANTS;
  return v === 0 ? `tile_${tileId}` : `tile_${tileId}_v${v}`;
}

export function preloadEnvironmentAssets(scene) {
  for (const [id, base] of Object.entries(TILE_FILES)) {
    const tileId = Number(id);
    if (tileId === TILE.WATER) {
      for (let frame = 0; frame < 3; frame++) {
        scene.load.image(`tile_water_f${frame}`, assetUrl(`water_f${frame}.png`));
      }
      // Also alias tile_5 to first water frame for static lookups
      scene.load.image(`tile_${TILE.WATER}`, assetUrl("water_f0.png"));
      continue;
    }
    for (let v = 0; v < TILE_VARIANTS; v++) {
      const key = v === 0 ? `tile_${tileId}` : `tile_${tileId}_v${v}`;
      const file = variantFile(base, v);
      scene.load.image(key, assetUrl(file));
    }
  }

  for (const [key, file] of Object.entries(DECOR_FILES)) {
    scene.load.image(key, assetUrl(file));
  }
}

/**
 * Ensure all expected keys exist after load. Missing variant files fall back
 * to the base tile so maps never show missing textures.
 */
export function createEnvironmentTextures(scene) {
  for (const [id] of Object.entries(TILE_FILES)) {
    const tileId = Number(id);
    if (tileId === TILE.WATER) {
      for (let frame = 0; frame < 3; frame++) {
        const key = `tile_water_f${frame}`;
        if (!scene.textures.exists(key) && scene.textures.exists("tile_water_f0")) {
          // leave as-is; water frames are independent images
        }
      }
      continue;
    }
    const baseKey = `tile_${tileId}`;
    for (let v = 1; v < TILE_VARIANTS; v++) {
      const key = `tile_${tileId}_v${v}`;
      if (!scene.textures.exists(key) && scene.textures.exists(baseKey)) {
        // Phaser has no cheap clone; re-load base under variant key via canvas
        const src = scene.textures.get(baseKey).getSourceImage();
        if (src) {
          scene.textures.addImage(key, src);
        }
      }
    }
  }

  // Ensure aqua variants exist
  if (scene.textures.exists("tile_11") && !scene.textures.exists("tile_11_v1")) {
    const src = scene.textures.get("tile_11").getSourceImage();
    if (src) {
      scene.textures.addImage("tile_11_v1", src);
      scene.textures.addImage("tile_11_v2", src);
    }
  }

  void TILE_SIZE; // documented contract: PNGs are authored at TILE_SIZE
}
