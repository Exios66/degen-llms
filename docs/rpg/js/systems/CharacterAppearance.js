/**
 * Player appearance palettes and persistence helpers.
 * Archetype still controls gameplay perks; appearance controls the sprite look.
 */

export const SKIN_TONES = [
  { id: "fair", label: "Fair", light: 0xffe8d0, mid: 0xffd8b8, shade: 0xffc8a8 },
  { id: "medium", label: "Medium", light: 0xe8c8a0, mid: 0xd8b890, shade: 0xc8a880 },
  { id: "tan", label: "Tan", light: 0xd8a878, mid: 0xc89868, shade: 0xb88858 },
  { id: "deep", label: "Deep", light: 0xa87850, mid: 0x986840, shade: 0x885838 },
];

export const HAIR_COLORS = [
  { id: "chestnut", label: "Chestnut", color: 0x684010, shade: 0x503008 },
  { id: "blonde", label: "Blonde", color: 0xe8c878, shade: 0xc8a858 },
  { id: "black", label: "Black", color: 0x413a52, shade: 0x2b2638 },
  { id: "auburn", label: "Auburn", color: 0x983828, shade: 0x782820 },
  { id: "silver", label: "Silver", color: 0xc0c8d8, shade: 0x9098a8 },
  { id: "pink", label: "Pink", color: 0xd888f0, shade: 0xa868c0 },
  { id: "teal", label: "Teal", color: 0x1a6070, shade: 0x104050 },
];

export const OUTFIT_COLORS = [
  { id: "teal", label: "Teal", body: 0x48d8e8, mid: 0x30a8b8, shade: 0x208898 },
  { id: "gold", label: "Gold", body: 0xf0d050, mid: 0xc8a838, shade: 0x987820 },
  { id: "purple", label: "Purple", body: 0xd888f0, mid: 0xa868c0, shade: 0x7848a0 },
  { id: "green", label: "Green", body: 0x50e8a0, mid: 0x38b878, shade: 0x288858 },
  { id: "crimson", label: "Crimson", body: 0xf08088, mid: 0xc86068, shade: 0x984048 },
  { id: "navy", label: "Navy", body: 0x6080c0, mid: 0x4860a0, shade: 0x384880 },
  { id: "coral", label: "Coral", body: 0xffb060, mid: 0xd89048, shade: 0xa86830 },
];

/** NPC portrait palettes for dialogue (matches TextureFactory npc keys). */
export const NPC_PORTRAITS = {
  npc_gold: { body: 0xf0d050, mid: 0xc8a838, shade: 0x987820, hair: 0x685010, skin: "medium" },
  npc_green: { body: 0x50e8a0, mid: 0x38b878, shade: 0x288858, hair: 0x186040, skin: "medium" },
  npc_pink: { body: 0xd888f0, mid: 0xa868c0, shade: 0x7848a0, hair: 0x503070, skin: "fair" },
  npc_teal: { body: 0x48d8e8, mid: 0x30a8b8, shade: 0x208898, hair: 0x1a6070, skin: "fair" },
  npc_red: { body: 0xf08088, mid: 0xc86068, shade: 0x984048, hair: 0x682830, skin: "tan" },
  npc_orange: { body: 0xffb060, mid: 0xd89048, shade: 0xa86830, hair: 0x784820, skin: "tan" },
  npc_silver: { body: 0xc0c8d8, mid: 0x9098a8, shade: 0x606878, hair: 0x404850, skin: "fair" },
};

/** Map dialogue speaker names to portrait palette keys. */
export const SPEAKER_PORTRAITS = {
  "Chip Chandler": "npc_gold",
  "Steve Harvey": "npc_gold",
  "Betty": "npc_orange",
  "Barkeep Betty": "npc_orange",
  "Paula": "npc_pink",
  "Pavilion Paula": "npc_pink",
  "Tina": "npc_silver",
  "Tourist Tina": "npc_silver",
  "Carmen": "npc_pink",
  "Clerk Carmen": "npc_pink",
  "Sam": "npc_red",
  "Security Sam": "npc_red",
  "Sal": "npc_pink",
  "Spinster Sal": "npc_pink",
  "Blake": "npc_silver",
  "Bookie Blake": "npc_silver",
  "Alex": "npc_teal",
  "Lou": "npc_teal",
  "Resort": "npc_gold",
};

const ARCHETYPE_DEFAULTS = {
  weekend_warrior: { skin: "fair", hair: "teal", outfit: "teal" },
  high_roller: { skin: "medium", hair: "black", outfit: "gold" },
  convention_goer: { skin: "fair", hair: "pink", outfit: "purple" },
  local: { skin: "tan", hair: "chestnut", outfit: "green" },
};

export function defaultAppearance(archetype = "weekend_warrior") {
  const base = ARCHETYPE_DEFAULTS[archetype] ?? ARCHETYPE_DEFAULTS.weekend_warrior;
  return { skin: base.skin, hair: base.hair, outfit: base.outfit };
}

export function normalizeAppearance(rpg) {
  const archetype = rpg?.archetype || rpg?.playerSprite || "weekend_warrior";
  const defaults = defaultAppearance(archetype);
  const appearance = rpg?.appearance ?? {};
  return {
    skin: appearance.skin ?? defaults.skin,
    hair: appearance.hair ?? defaults.hair,
    outfit: appearance.outfit ?? defaults.outfit,
  };
}

export function appearanceTextureBase(appearance) {
  const a = normalizeAppearance({ appearance, archetype: "weekend_warrior" });
  return `player_${a.skin}_${a.hair}_${a.outfit}`;
}

export function resolvePalette(appearance) {
  const a = normalizeAppearance({ appearance });
  const skin = SKIN_TONES.find((s) => s.id === a.skin) ?? SKIN_TONES[0];
  const hair = HAIR_COLORS.find((h) => h.id === a.hair) ?? HAIR_COLORS[0];
  const outfit = OUTFIT_COLORS.find((o) => o.id === a.outfit) ?? OUTFIT_COLORS[0];
  return {
    skinLight: skin.light,
    skinMid: skin.mid,
    skinShade: skin.shade,
    hair: hair.color,
    hairShade: hair.shade,
    body: outfit.body,
    mid: outfit.mid,
    shade: outfit.shade,
  };
}

export function resolveSpeakerPortrait(speaker) {
  const key = SPEAKER_PORTRAITS[speaker] ?? "npc_gold";
  const palette = NPC_PORTRAITS[key];
  const skin = SKIN_TONES.find((s) => s.id === palette.skin) ?? SKIN_TONES[1];
  return {
    body: palette.body,
    mid: palette.mid,
    shade: palette.shade,
    hair: palette.hair,
    hairShade: palette.hair,
    skinLight: skin.light,
    skinMid: skin.mid,
    skinShade: skin.shade,
  };
}

export function archetypeLabel(id) {
  const labels = {
    weekend_warrior: "Weekend Warrior",
    high_roller: "High Roller",
    convention_goer: "Convention Goer",
    local: "Local",
  };
  return labels[id] ?? id;
}

export const ARCHETYPES = [
  { id: "weekend_warrior", name: "Weekend Warrior", perk: "+10% first slot spin payout" },
  { id: "high_roller", name: "High Roller", perk: "High Limit access at 5,000 chips" },
  { id: "convention_goer", name: "Convention Goer", perk: "10% cashier buy-in bonus" },
  { id: "local", name: "Local", perk: "Back-hall shortcut unlocked" },
];
