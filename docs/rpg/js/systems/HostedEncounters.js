import { MACHINES } from "../../../js/slots.js";

/**
 * Encounter ids that mount a shared terminal screen instead of a bespoke
 * pixel overlay. `view` is the entry renderer; `stakeFor` sends the player
 * through the shared stake-tier picker first, exactly like the terminal.
 */
export const HOSTED_ENCOUNTERS = {
  // ── Hotel tower ──────────────────────────────────────────────────────────
  hotel: { view: "hotel-lobby", activityId: "hotel", title: "MANDALAY BAY HOTEL" },
  hotel_front_desk: { view: "hotel-front-desk", activityId: "hotel", title: "FRONT DESK" },
  hotel_dining: { view: "hotel-dining", activityId: "dining", title: "RESORT DINING" },
  restaurant_aureole: { view: "hotel-dining", activityId: "dining", title: "AUREOLE", venueId: "aureole" },
  restaurant_border_grill: { view: "hotel-dining", activityId: "dining", title: "BORDER GRILL", venueId: "border_grill" },
  restaurant_stripsteak: { view: "hotel-dining", activityId: "dining", title: "STRIPSTEAK", venueId: "stripsteak" },
  hotel_room: { view: "hotel-room", activityId: "hotel", title: "YOUR ROOM" },
  hotel_hallway: { view: "hotel-hallway", activityId: "hotel", title: "GUEST FLOOR" },
  guest_directory: { view: "hotel-guest-directory", title: "GUEST DIRECTORY" },

  // ── Pool complex ─────────────────────────────────────────────────────────
  pool: { view: "pool-complex", activityId: "pool_complex", zoneId: "hub", title: "MANDALAY BEACH" },
  pool_wave: { view: "pool-wave", activityId: "pool_complex", zoneId: "wave_pool", title: "WAVE POOL" },
  pool_hot_tubs: { view: "pool-hot-tubs", activityId: "pool_complex", zoneId: "hot_tubs", title: "HOT TUBS" },
  pool_cabanas: { view: "pool-cabanas", activityId: "pool_complex", zoneId: "cabanas", title: "CABANAS" },
  pool_reef: { view: "pool-reef", activityId: "pool_complex", zoneId: "shark_reef", title: "SHARK REEF" },
  pool_beach_club: { view: "pool-beach-club", activityId: "pool_complex", zoneId: "beach_club", title: "BEACH CLUB" },
  pool_rave: { view: "pool-rave", activityId: "pool_complex", zoneId: "beach_rave", title: "MOONLIGHT RAVE" },
  pool_events: { view: "pool-events", activityId: "pool_complex", zoneId: "events", title: "POOL EVENTS" },

  // ── Shops and bars ───────────────────────────────────────────────────────
  amenities: { view: "casino-floor", activityId: "amenities", title: "RESORT AMENITIES" },
  shops: { view: "mall-lobby", activityId: "amenities", title: "MANDALAY PLACE" },
  mall_bag: { view: "mall-bag", title: "SHOPPING BAG" },
  bar: { view: "bar-select", activityId: "amenities", title: "BARS" },

  // ── Gambling floors ──────────────────────────────────────────────────────
  slots: { view: "slots-menu", activityId: "slots", stakeFor: "slots", title: "SLOT FLOOR" },
  slots_fortune: { view: "slots-play", activityId: "slots", stakeFor: "slots", machineId: "fortune", title: "FORTUNE REELS" },
  slots_high_roller: { view: "slots-play", activityId: "slots", stakeFor: "slots", machineId: "high_roller", title: "HIGH ROLLER" },
  craps: { view: "craps", activityId: "craps", stakeFor: "craps", title: "CRAPS PIT" },
  lottery: { view: "lottery", activityId: "lottery", stakeFor: "lottery", title: "LOTTERY COUNTER" },
  sportsbook: { view: "sportsbook", activityId: "sportsbook", stakeFor: "sportsbook", title: "RACE & SPORTS BOOK" },
  predictions: { view: "sportsbook", activityId: "sportsbook", stakeFor: "sportsbook", tab: "predictions", title: "PREDICTION MARKETS" },
  horse_racing: { view: "horse-racing", activityId: "horse_racing", stakeFor: "horse_racing", title: "HORSE RACING" },
  horse_stables: { view: "horse-stables", activityId: "horse_stables", title: "STABLES" },
  dressage: { view: "dressage", activityId: "dressage", stakeFor: "dressage", title: "DRESSAGE" },
  jumper: { view: "jumper", activityId: "jumper", stakeFor: "jumper", title: "SHOW JUMPING" },

  // ── Money and meta ───────────────────────────────────────────────────────
  cashier: { view: "cashier", activityId: "cashier", title: "CASHIER CAGE" },
  bank: { view: "bank-account", title: "OFF-STRIP BANK" },
  stats: { view: "stats", title: "PLAYER STATS" },
  staff_manifest: { view: "staff-manifest", title: "STAFF MANIFEST" },

  // ── Gated venues ─────────────────────────────────────────────────────────
  high_limit_salon: { view: "high-limit-salon", title: "HIGH LIMIT SALON" },
  foundation_room_lounge: { view: "foundation-room", title: "FOUNDATION ROOM" },
  gentlemans_club: { view: "gentlemans-club", activityId: "gentlemans_club", title: "GENTLEMAN'S CLUB" },
};

/** Encounters that keep their bespoke pixel battle screen but pick stakes first. */
export const TABLE_STAKE_ACTIVITIES = {
  blackjack: "blackjack",
  holdem: "holdem",
  roulette: "roulette",
};

/** Prime host runtime state an entry view depends on (e.g. the chosen machine). */
export function prepareHostedState(runtime, spec) {
  if (spec.machineId) {
    const machine = MACHINES.find((m) => m.id === spec.machineId) ?? MACHINES[0];
    runtime.slots = {
      machine,
      sessionNet: 0,
      spins: 0,
      spinning: false,
      lastWin: false,
      lastReels: null,
      lastMessage: null,
      tier: runtime.stakeTier,
    };
  }
}
