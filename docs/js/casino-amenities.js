/** Casino floor amenities — The Shoppes at Mandalay Place and full-service bars. */

import { recordConsumption } from "./intoxication-effects.js";

export const MALL_NAME = "The Shoppes at Mandalay Place";
export const MALL_TAGLINE =
  "Sky-bridge retail between Mandalay Bay and Luxor — designer flagships, sport, souvenirs, and beach gear on the casino carpet.";

export const FLAGSHIP_DESIGNER_STORES = [
  {
    id: "gucci_flagship",
    name: "Gucci Flagship",
    tagline: "Las Vegas flagship \u2014 ready-to-wear, handbags, and signature GG.",
    zone: "Flagship Designer Row (Casino Floor)",
    items: [
      { id: "gucci_dionysus", name: "Dionysus Mini Bag", description: "Iconic chain strap \u2014 take a piece of the Strip home.", price: 2850 },
      { id: "gucci_loafers", name: "Horsebit Loafers", description: "Polished leather for the high-limit tables.", price: 890 },
      { id: "gucci_sunglasses", name: "Oversized Sunglasses", description: "Gold-frame aviators for pool-side recovery.", price: 425 },
      { id: "gucci_belt", name: "GG Marmont Belt", description: "Double-G buckle \u2014 cinched for the night.", price: 520 },
      { id: "gucci_slides", name: "Rubber GG Slides", description: "Pool-to-lobby footwear with logo energy.", price: 310 },
      { id: "gucci_scarf", name: "Silk GG Scarf", description: "Pocket square ambitions, scarf reality.", price: 395 },
    ],
  },
  {
    id: "louis_vuitton_flagship",
    name: "Louis Vuitton Flagship",
    tagline: "One of the largest LV boutiques on the Strip.",
    zone: "Flagship Designer Row (Casino Floor)",
    items: [
      { id: "lv_keepall", name: "Keepall Bandouli\u00e8re 45", description: "Monogram canvas weekender for a lucky streak.", price: 3200 },
      { id: "lv_wallet", name: "Multiple Wallet", description: "Damier Graphite \u2014 chips slide in easy.", price: 650 },
      { id: "lv_key_pouch", name: "Key Pouch", description: "Compact essentials for the casino floor.", price: 395 },
      { id: "lv_cap", name: "Monogram Cap", description: "Logo brim for the valet line.", price: 520 },
      { id: "lv_trainers", name: "Trainer Sneaker", description: "Damier accents \u2014 walk of fame adjacent.", price: 1180 },
      { id: "lv_trunk_charm", name: "Mini Trunk Charm", description: "Bag charm that costs more than a buffet.", price: 740 },
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
      { id: "prada_sunglasses", name: "Symbole Sunglasses", description: "Angular frames \u2014 paparazzi optional.", price: 520 },
      { id: "prada_loafer", name: "Brushed Leather Loafer", description: "Quiet wealth for the salon rope.", price: 890 },
      { id: "prada_bucket", name: "Re-Edition Bucket Bag", description: "Nylon classic revived for the sky bridge.", price: 1450 },
      { id: "prada_tee", name: "Logo Triangle Tee", description: "Understated flex under a blazer.", price: 620 },
    ],
  },
  {
    id: "tom_ford_flagship",
    name: "Tom Ford Flagship",
    tagline: "Tailored glamour steps from the slot bank.",
    zone: "Flagship Designer Row (Casino Floor)",
    items: [
      { id: "tf_suit", name: "O'Connor Suit", description: "Peak lapel \u2014 boardroom to baccarat.", price: 4200 },
      { id: "tf_oud", name: "Oud Wood Eau de Parfum", description: "Signature scent for a night on the floor.", price: 295 },
      { id: "tf_sunglasses", name: "Whitman Sunglasses", description: "Bold acetate frames.", price: 485 },
      { id: "tf_loafer", name: "Shannon Loafer", description: "Patent shine that survives carpet static.", price: 990 },
      { id: "tf_tie", name: "Silk Evening Tie", description: "Narrow cut for high-limit lighting.", price: 225 },
      { id: "tf_clutch", name: "Leather Evening Clutch", description: "Just enough room for ID and a marker.", price: 1850 },
    ],
  },
  {
    id: "rolex_boutique",
    name: "Rolex Boutique",
    tagline: "Swiss precision under Mandalay gold \u2014 green seal, quiet flex.",
    zone: "Flagship Designer Row (Casino Floor)",
    items: [
      { id: "rolex_submariner", name: "Oyster Perpetual Submariner", description: "Dive watch energy for dry land whales.", price: 12500 },
      { id: "rolex_datejust", name: "Datejust 36", description: "Fluted bezel \u2014 the classic comps conversation starter.", price: 9800 },
      { id: "rolex_oyster_bracelet", name: "Oyster Bracelet Polish", description: "Service kit souvenir \u2014 still expensive.", price: 450 },
      { id: "rolex_travel_pouch", name: "Green Leather Watch Pouch", description: "Protect the flex between properties.", price: 320 },
      { id: "rolex_cap", name: "Boutique Cap", description: "Green crown \u2014 understated until it isn't.", price: 85 },
    ],
  },
  {
    id: "tiffany_co",
    name: "Tiffany & Co.",
    tagline: "Robin's-egg blue on the casino carpet.",
    zone: "Flagship Designer Row (Casino Floor)",
    items: [
      { id: "tiffany_bracelets", name: "T Wire Bracelet", description: "Gold wire \u2014 subtle marker for a good night.", price: 1450 },
      { id: "tiffany_key", name: "Keys Pendant", description: "Little key, big implication.", price: 875 },
      { id: "tiffany_sunglasses", name: "TF Soft Square Sunglasses", description: "Blue-case energy without the proposal.", price: 420 },
      { id: "tiffany_bone_china", name: "Tiffany Blue Espresso Cup", description: "For suite coffee that judges you.", price: 195 },
      { id: "tiffany_scarf", name: "Silk Color Block Scarf", description: "Pocket of sky on your neck.", price: 350 },
    ],
  },
];

export const MANDALAY_PLACE_STORES = [
  {
    id: "lik_fine_art",
    name: "LIK Fine Art",
    tagline: "Award-winning photography \u2014 Vegas skylines and desert light.",
    zone: "Mandalay Place Sky Bridge",
    items: [
      { id: "lik_vegas_skyline", name: "Vegas Skyline Print", description: "Limited edition \u2014 Mandalay gold hour.", price: 450 },
      { id: "lik_desert_moon", name: "Desert Moon", description: "Mojave nightscape on archival paper.", price: 680 },
      { id: "lik_neon_noir", name: "Neon Noir Series", description: "Three-print set \u2014 pink, cyan, gold.", price: 920 },
      { id: "lik_wave_pool", name: "Wave Pool Study", description: "Turquoise chaos framed for the suite.", price: 540 },
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
      { id: "lush_scrub", name: "Ocean Salt Scrub", description: "Exfoliate the cigarette patio shame.", price: 22 },
      { id: "lush_mask", name: "Catastrophe Cosmetic Mask", description: "Blue clay for red-eye recovery.", price: 18 },
      { id: "lush_soap", name: "Honey I Washed the Kids", description: "Solid soap \u2014 novelty, still works.", price: 14 },
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
      { id: "ron_jon_boardshorts", name: "Palm Boardshorts", description: "Quick-dry for lazy river circuits.", price: 64 },
      { id: "ron_jon_hat", name: "Snapback Surf Cap", description: "Shade for the daybeds.", price: 32 },
      { id: "ron_jon_cooler", name: "Soft-Sided Cooler", description: "Smuggle waters \u2014 not contraband.", price: 48 },
    ],
  },
  {
    id: "flip_flop_shops",
    name: "Flip Flop Shops",
    tagline: "Sandals for the pool deck \u2014 steps from Big Chill.",
    zone: "Mandalay Place Sky Bridge",
    items: [
      { id: "ff_reefs", name: "Reef Fanning Sandals", description: "Bottle opener sole \u2014 pool bar approved.", price: 65 },
      { id: "ff_havaianas", name: "Havaianas Slim", description: "Brazilian classic in Mandalay teal.", price: 32 },
      { id: "ff_olukai", name: "OluKai Ohana", description: "Beach-to-lobby comfort.", price: 85 },
      { id: "ff_socks", name: "No-Show Resort Socks", description: "Because blisters ruin hot streaks.", price: 16 },
    ],
  },
  {
    id: "beauty_avenue",
    name: "Beauty Avenue",
    tagline: "Resort glam \u2014 fragrance, skincare, and Vegas exclusives.",
    zone: "Mandalay Place Sky Bridge",
    items: [
      { id: "ba_vegas_gloss", name: "Vegas Lights Lip Gloss", description: "Shimmer finish for the casino glow.", price: 24 },
      { id: "ba_spa_kit", name: "Pool Recovery Kit", description: "Sunscreen, aloe, and cooling mist.", price: 48 },
      { id: "ba_bronzer", name: "Desert Bronze Compact", description: "Contour like you mean it.", price: 36 },
      { id: "ba_perfume", name: "Mandalay Gold Eau Fraiche", description: "Citrus, amber, faint cigarette nostalgia.", price: 72 },
      { id: "ba_lash", name: "Showgirl Lash Kit", description: "Dramatic without the feathers.", price: 42 },
    ],
  },
  {
    id: "guinness_store",
    name: "GUINNESS Store",
    tagline: "Everything for celebrating Ireland's signature stout.",
    zone: "Mandalay Place Sky Bridge",
    items: [
      { id: "guinness_pint_glass", name: "Official Pint Glass Set", description: "Pair for Ri Ra nightcap.", price: 35 },
      { id: "guinness_hat", name: "Embroidered Cap", description: "Souvenir from the sky bridge.", price: 28 },
      { id: "guinness_tee", name: "Harp Logo Tee", description: "Black tee, white harp, zero regrets.", price: 32 },
      { id: "guinness_coaster", name: "Slate Coaster Set", description: "Four coasters \u2014 protect the suite glass.", price: 22 },
    ],
  },
  {
    id: "nike_mandalay",
    name: "Nike Store",
    tagline: "Sport style for casino athletes and pool sprinters.",
    zone: "Mandalay Place Sky Bridge",
    items: [
      { id: "nike_pegasus", name: "Air Zoom Pegasus", description: "Walk of shame, but cushioned.", price: 140 },
      { id: "nike_dri_fit", name: "Dri-FIT Resort Tee", description: "Wicks regret and chlorine.", price: 45 },
      { id: "nike_shorts", name: "Flex Stride Shorts", description: "Gym-to-buffet ready.", price: 55 },
      { id: "nike_duffel", name: "Brasilia Duffel", description: "Stuff the shopping bag into a bag.", price: 40 },
      { id: "nike_socks", name: "Everyday Cushion Socks (3-pack)", description: "Support for marathon sessions.", price: 22 },
    ],
  },
  {
    id: "house_of_blues_store",
    name: "House of Blues Store",
    tagline: "Merch from the joint next door \u2014 blues, tees, and tour posters.",
    zone: "Mandalay Place Sky Bridge",
    items: [
      { id: "hob_tee", name: "Guitar Skeleton Tee", description: "Classic HOB art on soft cotton.", price: 38 },
      { id: "hob_poster", name: "Mandalay Live Poster", description: "Tonight's energy, framed later.", price: 45 },
      { id: "hob_hat", name: "Trucker Cap", description: "Mesh back for the pit.", price: 28 },
      { id: "hob_pint", name: "HOB Pint Glass", description: "For Rhythm & Riffs encore drinks.", price: 18 },
      { id: "hob_hoodie", name: "Tour Hoodie", description: "AC is aggressive in the casino.", price: 72 },
    ],
  },
  {
    id: "surf_city",
    name: "Surf City Squeeze / Beach Essentials",
    tagline: "Smoothies upstairs, SPF and floaties downstairs.",
    zone: "Mandalay Place Sky Bridge",
    items: [
      { id: "surf_float", name: "Inflatable Cabana Lounger", description: "Claim water real estate.", price: 45 },
      { id: "surf_spf", name: "SPF 50 Resort Stick", description: "Nose and ears \u2014 don't fry.", price: 18 },
      { id: "surf_goggles", name: "Wave Pool Goggles", description: "See the foam coming.", price: 24 },
      { id: "surf_bottle", name: "Insulated Squeeze Bottle", description: "Hydrate between bets.", price: 28 },
    ],
  },
  {
    id: "mandalay_souvenirs",
    name: "Mandalay Bay Essentials",
    tagline: "Official resort souvenirs \u2014 gold, waves, and shark-adjacent merch.",
    zone: "Mandalay Place Sky Bridge",
    items: [
      { id: "mb_mug", name: "Gold Wave Mug", description: "Coffee that remembers the night before.", price: 22 },
      { id: "mb_keychain", name: "Shark Reef Keychain", description: "Cute. Slightly menacing.", price: 14 },
      { id: "mb_hoodie", name: "Resort Crest Hoodie", description: "Warmth for the 2 a.m. walk.", price: 68 },
      { id: "mb_deck", name: "Mandalay Playing Cards", description: "House-branded deck for the room.", price: 16 },
      { id: "mb_tote", name: "Canvas Resort Tote", description: "Carry The Shoppes home.", price: 32 },
      { id: "mb_magnet", name: "Skyline Magnet Set", description: "Fridge trophies.", price: 12 },
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
  recordConsumption(session, drinkId, { source: "bar" });
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
