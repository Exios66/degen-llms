import { ensureAmenities, listPurchasedItems } from "../../../js/casino-amenities.js";
import { ensureHotel } from "../../../js/hotel.js";
import { ensureRoomAmenities, MINIBAR_ITEMS } from "../../../js/room-amenities.js";

/**
 * Story items the overworld hands out. Wearables swap the player sprite tint;
 * everything else is flavor the Bag can show off.
 * @type {Record<string, { label: string, note: string, wearable?: boolean }>}
 */
export const RPG_ITEMS = {
  room_key: { label: "Room key card", note: "Magnetic stripe, slightly demagnetized by your phone." },
  players_card: { label: "MGM Rewards card", note: "Tap it at any machine to feel briefly important." },
  reef_camera: { label: "Disposable reef camera", note: "27 exposures. Five species. Do the math." },
  pool_wristband: { label: "Pool wristband", note: "Waterproof. Sticky. Yours until checkout.", wearable: true },
  hob_setlist: { label: "House of Blues setlist", note: "Torn from the stage floor. Smells like fog machine." },
  staff_lanyard: { label: "Back-of-house lanyard", note: "Nobody asks questions when you wear this.", wearable: true },
  velvet_token: { label: "Foundation Room token", note: "Heavier than a chip. Opens exactly one rope." },
  golden_chip: { label: "Golden statue chip", note: "The statue winked. You kept the evidence.", wearable: true },
};

function inventoryState(session) {
  const rpg = session.ensureRpgState();
  if (!Array.isArray(rpg.inventory)) rpg.inventory = [];
  return rpg.inventory;
}

/** @returns {boolean} true when the item is newly added */
export function giveItem(session, itemId) {
  if (!RPG_ITEMS[itemId]) return false;
  const inv = inventoryState(session);
  if (inv.includes(itemId)) return false;
  inv.push(itemId);
  return true;
}

export function hasItem(session, itemId) {
  return inventoryState(session).includes(itemId);
}

export function equippedItem(session) {
  const rpg = session.ensureRpgState();
  return rpg.equipped ?? null;
}

/** Wearables are cosmetic; the overworld reads this for a sprite accent. */
export function equipItem(session, itemId) {
  const rpg = session.ensureRpgState();
  if (!itemId) {
    rpg.equipped = null;
    return null;
  }
  if (!RPG_ITEMS[itemId]?.wearable || !hasItem(session, itemId)) return rpg.equipped ?? null;
  rpg.equipped = rpg.equipped === itemId ? null : itemId;
  return rpg.equipped;
}

/**
 * Everything the player is carrying: RPG story items, mall purchases, and
 * minibar raids — one bag across both surfaces.
 * @returns {{ id: string, label: string, note: string, source: string, wearable: boolean, equipped: boolean }[]}
 */
export function bagContents(session) {
  const equipped = equippedItem(session);
  const items = inventoryState(session)
    .filter((id) => RPG_ITEMS[id])
    .map((id) => ({
      id,
      label: RPG_ITEMS[id].label,
      note: RPG_ITEMS[id].note,
      source: "Resort",
      wearable: Boolean(RPG_ITEMS[id].wearable),
      equipped: equipped === id,
    }));

  ensureAmenities(session);
  for (const { item, store } of listPurchasedItems(session)) {
    items.push({
      id: `shop:${item.id}`,
      label: item.name,
      note: `Bought at ${store.name}`,
      source: "Shops",
      wearable: false,
      equipped: false,
    });
  }

  const hotel = ensureHotel(session);
  const ra = ensureRoomAmenities(hotel);
  const counts = new Map();
  for (const id of ra.minibarPurchases ?? []) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  for (const [id, count] of counts) {
    const item = MINIBAR_ITEMS[id];
    items.push({
      id: `minibar:${id}`,
      label: `${item?.label ?? id}${count > 1 ? ` ×${count}` : ""}`,
      note: item?.flavor ?? "Minibar raid.",
      source: "Minibar",
      wearable: false,
      equipped: false,
    });
  }

  return items;
}
