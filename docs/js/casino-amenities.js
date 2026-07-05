/** Casino floor amenities — The Shoppes at Mandalay Place and full-service bars. */

export const MALL_NAME = "The Shoppes at Mandalay Place";
export const MALL_TAGLINE =
  "Sky-bridge retail between Mandalay Bay and Luxor — flagship designer row opens directly onto the casino carpet.";

export const FLAGSHIP_DESIGNER_STORES = [
  {
    id: "gucci_flagship",
    name: "Gucci Flagship",
    tagline: "Las Vegas flagship — ready-to-wear, handbags, and signature GG.",
    zone: "Flagship Designer Row (Casino Floor)",
    items: [
      { id: "gucci_dionysus", name: "Dionysus Mini Bag", description: "Iconic chain strap — take a piece of the Strip home.", price: 2850 },
      { id: "gucci_loafers", name: "Horsebit Loafers", description: "Polished leather for the high-limit tables.", price: 890 },
      { id: "gucci_sunglasses", name: "Oversized Sunglasses", description: "Gold-frame aviators for pool-side recovery.", price: 425 },
    ],
  },
  {
    id: "louis_vuitton_flagship",
    name: "Louis Vuitton Flagship",
    tagline: "One of the largest LV boutiques on the Strip.",
    zone: "Flagship Designer Row (Casino Floor)",
    items: [
      { id: "lv_keepall", name: "Keepall Bandoulière 45", description: "Monogram canvas weekender for a lucky streak.", price: 3200 },
      { id: "lv_wallet", name: "Multiple Wallet", description: "Damier Graphite — chips slide in easy.", price: 650 },
      { id: "lv_key_pouch", name: "Key Pouch", description: "Compact essentials for the casino floor.", price: 395 },
    ],
  },
  {
    id: "prada_flagship",
    name: "Prada Flagship",
    tagline: "Minimalist luxury on the casino carpet.",
    zone: "Flagship Designer Row (Casino Floor)",
    items: [
      { id: "prada_re_nylon", name: "Re-Nylon Backpack", description: "Lightweight carry for a day at the tables.", price: 1950 },
      { id: "prada_saffiano", name: "Saffiano Card Case", description: "Crosshatch leather card holder.", price: 375 },
      { id: "prada_sunglasses", name: "Symbole Sunglasses", description: "Angular frames — paparazzi optional.", price: 520 },
    ],
  },
  {
    id: "tom_ford_flagship",
    name: "Tom Ford Flagship",
    tagline: "Tailored glamour steps from the slot bank.",
    zone: "Flagship Designer Row (Casino Floor)",
    items: [
      { id: "tf_suit", name: "O'Connor Suit", description: "Peak lapel — boardroom to baccarat.", price: 4200 },
      { id: "tf_oud", name: "Oud Wood Eau de Parfum", description: "Signature scent for a night on the floor.", price: 295 },
      { id: "tf_sunglasses", name: "Whitman Sunglasses", description: "Bold acetate frames.", price: 485 },
    ],
  },
];

export const MANDALAY_PLACE_STORES = [
  {
    id: "lik_fine_art",
    name: "LIK Fine Art",
    tagline: "Award-winning photography — Vegas skylines and desert light.",
    zone: "Mandalay Place Sky Bridge",
    items: [
      { id: "lik_vegas_skyline", name: "Vegas Skyline Print", description: "Limited edition — Mandalay gold hour.", price: 450 },
      { id: "lik_desert_moon", name: "Desert Moon", description: "Mojave nightscape on archival paper.", price: 680 },
    ],
  },
  {
    id: "lush",
    name: "LUSH Fresh Handmade Cosmetics",
    tagline: "Self-appointed purveyor of bath bombs and spa recovery.",
    zone: "Mandalay Place Sky Bridge",
    items: [
      { id: "lush_bath_bomb", name: "Intergalactic Bath Bomb", description: "Post-floor soak essential.", price: 12 },
      { id: "lush_mist", name: "Sleepy Body Spray", description: "Lavender wind-down after a long session.", price: 28 },
    ],
  },
  {
    id: "ron_jon",
    name: "Ron Jon Surf Shop",
    tagline: "Beach gear for the 11-acre pool complex.",
    zone: "Mandalay Place Sky Bridge",
    items: [
      { id: "ron_jon_rashguard", name: "Mandalay Rash Guard", description: "Sun-safe for the wave pool.", price: 55 },
      { id: "ron_jon_towel", name: "Strip Logo Beach Towel", description: "Claim your cabana in style.", price: 38 },
    ],
  },
  {
    id: "flip_flop_shops",
    name: "Flip Flop Shops",
    tagline: "Sandals for the pool deck — steps from Big Chill.",
    zone: "Mandalay Place Sky Bridge",
    items: [
      { id: "ff_reefs", name: "Reef Fanning Sandals", description: "Bottle opener sole — pool bar approved.", price: 65 },
      { id: "ff_havaianas", name: "Havaianas Slim", description: "Brazilian classic in Mandalay teal.", price: 32 },
    ],
  },
  {
    id: "beauty_avenue",
    name: "Beauty Avenue",
    tagline: "Resort glam — fragrance, skincare, and Vegas exclusives.",
    zone: "Mandalay Place Sky Bridge",
    items: [
      { id: "ba_vegas_gloss", name: "Vegas Lights Lip Gloss", description: "Shimmer finish for the casino glow.", price: 24 },
      { id: "ba_spa_kit", name: "Pool Recovery Kit", description: "Sunscreen, aloe, and cooling mist.", price: 48 },
    ],
  },
  {
    id: "guinness_store",
    name: "GUINNESS Store",
    tagline: "Everything for celebrating Ireland's signature stout.",
    zone: "Mandalay Place Sky Bridge",
    items: [
      { id: "guinness_pint_glass", name: "Official Pint Glass Set", description: "Pair for Rí Rá nightcap.", price: 35 },
      { id: "guinness_hat", name: "Embroidered Cap", description: "Souvenir from the sky bridge.", price: 28 },
    ],
  },
];

export const ALL_SHOP_STORES = [...FLAGSHIP_DESIGNER_STORES, ...MANDALAY_PLACE_STORES];

export const CASINO_BARS = [
  {
    id: "eyecandy",
    name: "Eyecandy Sound Lounge",
    location: "Heart of the Mandalay Bay casino floor",
    vibe: "Casual social scene with live music and a dance floor surrounded by casino energy.",
    drinks: [
      { id: "eyecandy_mandalay_mule", name: "Mandalay Mule", description: "House ginger beer, vodka, lime — floor favorite.", price: 18 },
      { id: "eyecandy_sound_check", name: "Sound Check", description: "Passion fruit, rum, sparkling wine.", price: 22 },
      { id: "eyecandy_neon_fizz", name: "Neon Fizz", description: "Blue curaçao, lemon, prosecco — dance-floor fuel.", price: 16 },
      { id: "eyecandy_top_shelf", name: "Top Shelf Old Fashioned", description: "Bourbon, bitters, orange peel.", price: 24 },
    ],
  },
  {
    id: "big_chill",
    name: "Big Chill",
    location: "Casino floor near The Shoppes at Mandalay Place entrance",
    vibe: "Frozen drinks in souvenir cups — refills at special pricing after shopping.",
    drinks: [
      { id: "big_chill_frozen_marg", name: "Frozen Margarita (Souvenir Cup)", description: "Classic lime — keepsake cup included.", price: 16 },
      { id: "big_chill_daquiri", name: "Strawberry Daiquiri (Souvenir Cup)", description: "Blended berries — pool-bound.", price: 16 },
      { id: "big_chill_refill", name: "Souvenir Cup Refill", description: "Bring your Big Chill cup back for less.", price: 10 },
      { id: "big_chill_mojito", name: "Frozen Mojito", description: "Mint, rum, crushed ice — sky-bridge cooldown.", price: 18 },
    ],
  },
  {
    id: "rhythm_riiffs",
    name: "Rhythm & Riffs Lounge",
    location: "Center of the action-packed casino floor",
    vibe: "Lounge seating, live music, and game-day energy — signature cocktails and spirits.",
    drinks: [
      { id: "rr_southern_lemonade", name: "Southern Lemonade", description: "Bourbon, lemonade, mint — House of Blues spirit.", price: 20 },
      { id: "rr_kentucky_cooler", name: "Kentucky Cooler", description: "Whiskey, ginger ale, cherry.", price: 19 },
      { id: "rr_dove_margarita", name: "Dove Margarita", description: "Reposado, agave, lime — B Side classic.", price: 21 },
      { id: "rr_craft_beer", name: "Craft Beer Flight", description: "Three rotating taps — game on.", price: 15 },
    ],
  },
];

const SHOP_ITEMS_BY_ID = Object.fromEntries(
  ALL_SHOP_STORES.flatMap((s) => s.items.map((i) => [i.id, i])),
);

const BAR_DRINKS_BY_ID = Object.fromEntries(
  CASINO_BARS.flatMap((b) => b.drinks.map((d) => [d.id, d])),
);

export function defaultAmenitiesState() {
  return { purchasedItems: [], barOrders: [] };
}

export function ensureAmenities(session) {
  if (!session.amenities) session.amenities = defaultAmenitiesState();
  return session.amenities;
}

export function attachAmenitiesToSession(session, data = {}) {
  const raw = data.amenities ?? {};
  session.amenities = {
    purchasedItems: [...(raw.purchasedItems ?? raw.purchased_items ?? [])],
    barOrders: [...(raw.barOrders ?? raw.bar_orders ?? [])],
  };
  return session.amenities;
}

export function purchaseShopItem(session, itemId) {
  const item = SHOP_ITEMS_BY_ID[itemId];
  if (!item) return { ok: false, message: "Unknown item." };
  const amenities = ensureAmenities(session);
  if (amenities.purchasedItems.includes(itemId)) {
    return { ok: false, message: `You already picked up ${item.name}.` };
  }
  if (!session.wallet.debit(item.price, "shopping", `${item.name} — The Shoppes`)) {
    return { ok: false, message: `Insufficient chips — ${item.name} is $${item.price.toLocaleString()}.` };
  }
  amenities.purchasedItems.push(itemId);
  session.recordVisit("shopping");
  return {
    ok: true,
    message: `Purchased ${item.name} for $${item.price.toLocaleString()}. Balance: $${session.wallet.balance.toLocaleString()}.`,
  };
}

export function orderBarDrink(session, drinkId) {
  const drink = BAR_DRINKS_BY_ID[drinkId];
  if (!drink) return { ok: false, message: "Unknown drink." };
  const bar = CASINO_BARS.find((b) => b.drinks.some((d) => d.id === drinkId));
  if (!session.wallet.debit(drink.price, "bar", `${drink.name} @ ${bar.name}`)) {
    return { ok: false, message: `Insufficient chips — ${drink.name} is $${drink.price.toLocaleString()}.` };
  }
  const amenities = ensureAmenities(session);
  amenities.barOrders.push(drinkId);
  session.recordVisit("bar");
  return {
    ok: true,
    message: `${drink.name} served at ${bar.name} — $${drink.price.toLocaleString()}. Balance: $${session.wallet.balance.toLocaleString()}.`,
  };
}

export function storeForItem(itemId) {
  return ALL_SHOP_STORES.find((s) => s.items.some((i) => i.id === itemId)) ?? null;
}

export function listPurchasedItems(session) {
  const amenities = ensureAmenities(session);
  return amenities.purchasedItems
    .map((id) => {
      const item = SHOP_ITEMS_BY_ID[id];
      const store = storeForItem(id);
      return item && store ? { item, store } : null;
    })
    .filter(Boolean);
}

export function barForDrink(drinkId) {
  return CASINO_BARS.find((b) => b.drinks.some((d) => d.id === drinkId)) ?? null;
}

export function getStoreById(storeId) {
  return ALL_SHOP_STORES.find((s) => s.id === storeId) ?? null;
}

export function getBarById(barId) {
  return CASINO_BARS.find((b) => b.id === barId) ?? null;
}
