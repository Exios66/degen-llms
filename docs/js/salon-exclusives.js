/**
 * High Limit Salon exclusive catalog — tables, slots, and sportsbook desks
 * that never appear on the main floor.
 */

import { STAKE_TIERS } from "./stakes.js";

export const SALON_VENUE_ID = "high_limit_salon";

/** Slot machine ids that only list inside the salon. */
export const SALON_ONLY_SLOT_IDS = [
  "salon_obsidian",
  "salon_whale_watch",
  "salon_chairman_vault",
];

export function isSalonOnlySlot(machineOrId) {
  const id = typeof machineOrId === "string" ? machineOrId : machineOrId?.id;
  return SALON_ONLY_SLOT_IDS.includes(id);
}

/** Private salon table offerings (route into existing engines with salon context). */
export const SALON_TABLE_GAMES = [
  {
    id: "salon_blackjack",
    label: "Private Shoe Blackjack",
    blurb: "Eight-deck shoe, salon felt, $500 floor courtesy.",
    activityId: "blackjack",
    nextView: "blackjack-menu",
    activityMin: 500,
  },
  {
    id: "salon_holdem",
    label: "Salon No-Limit Hold'em",
    blurb: "Velvet pit — bots who know what a real raise looks like.",
    activityId: "holdem",
    nextView: "holdem-menu",
    activityMin: 500,
  },
  {
    id: "salon_roulette",
    label: "Salon French Roulette",
    blurb: "Single-zero energy on an American wheel narrative. Minimums bite.",
    activityId: "roulette",
    nextView: "roulette",
    activityMin: 250,
  },
  {
    id: "salon_craps",
    label: "Whale Craps Pit",
    blurb: "Hard ways and harder stares. Pass line from $250.",
    activityId: "craps",
    nextView: "craps",
    activityMin: 250,
  },
];

/**
 * Exclusive sportsbook / futures board — only dealt from the salon desk.
 * Shaped like sports_scenarios entries so sportSimulator can materialize them.
 */
export const SALON_SPORTS_SCENARIOS = {
  version: 1,
  boardSize: 6,
  scenarios: [
    {
      scenarioId: "salon-nfl-whale-001",
      sport: "NFL",
      sportLabel: "NFL · Salon Desk",
      eventType: "game",
      home: "Las Vegas Raiders",
      away: "Kansas City Chiefs",
      homeOdds: 165,
      awayOdds: -190,
      spread: 4.5,
      total: 47.5,
      spreadHomeOdds: -115,
      spreadAwayOdds: -105,
      totalOverOdds: -110,
      totalUnderOdds: -110,
      props: [
        { id: "salon-mvp", label: "Salon prop: opening drive TD", yesOdds: 140, noOdds: -160 },
        { id: "salon-cover", label: "Raiders cover + live champagne", yesOdds: 105, noOdds: -125 },
      ],
      label: "Chiefs @ Raiders — Whale Line",
      status: "scheduled",
      settled: false,
      live: false,
      salonOnly: true,
    },
    {
      scenarioId: "salon-nba-whale-001",
      sport: "NBA",
      sportLabel: "NBA · Salon Desk",
      eventType: "game",
      home: "Los Angeles Lakers",
      away: "Boston Celtics",
      homeOdds: -120,
      awayOdds: 100,
      spread: -2.0,
      total: 224.5,
      spreadHomeOdds: -110,
      spreadAwayOdds: -110,
      totalOverOdds: -105,
      totalUnderOdds: -115,
      props: [
        { id: "salon-triple", label: "Any player triple-double", yesOdds: 220, noOdds: -280 },
      ],
      label: "Celtics @ Lakers — Private Board",
      status: "scheduled",
      settled: false,
      live: false,
      salonOnly: true,
    },
    {
      scenarioId: "salon-ufc-whale-001",
      sport: "UFC",
      sportLabel: "UFC · Salon Desk",
      eventType: "fight",
      home: "Main Event A",
      away: "Main Event B",
      homeOdds: -140,
      awayOdds: 120,
      spread: null,
      total: null,
      props: [
        { id: "salon-finish", label: "Fight ends inside distance", yesOdds: -130, noOdds: 110 },
        { id: "salon-round", label: "Ends in round 1", yesOdds: 250, noOdds: -320 },
      ],
      label: "UFC Main — Salon Ticket",
      status: "scheduled",
      settled: false,
      live: false,
      salonOnly: true,
    },
    {
      scenarioId: "salon-futures-superbowl",
      sport: "NFL",
      sportLabel: "Futures · Salon",
      eventType: "futures",
      home: "AFC Champion",
      away: "NFC Champion",
      homeOdds: 180,
      awayOdds: 160,
      spread: null,
      total: null,
      field: ["Kansas City Chiefs", "Buffalo Bills", "San Francisco 49ers", "Detroit Lions"],
      outrightOdds: {
        "Kansas City Chiefs": 280,
        "Buffalo Bills": 450,
        "San Francisco 49ers": 500,
        "Detroit Lions": 900,
      },
      props: [
        { id: "salon-ot", label: "Super Bowl goes to OT", yesOdds: 900, noOdds: -1400 },
      ],
      label: "Conference futures — salon chalk",
      status: "scheduled",
      settled: false,
      live: false,
      salonOnly: true,
    },
    {
      scenarioId: "salon-golf-whale",
      sport: "GOLF",
      sportLabel: "Golf · Salon Desk",
      eventType: "outright",
      home: "Field Favorite",
      away: "Longshot Bundle",
      homeOdds: -110,
      awayOdds: 350,
      spread: null,
      total: null,
      field: ["Tour Favorite", "In-Form Contender", "Local Hero", "Longshot Bundle"],
      outrightOdds: {
        "Tour Favorite": -110,
        "In-Form Contender": 220,
        "Local Hero": 450,
        "Longshot Bundle": 1200,
      },
      props: [
        { id: "salon-eagle", label: "Eagle on 18 Sunday", yesOdds: 400, noOdds: -550 },
      ],
      label: "Sunday board — private outright",
      status: "scheduled",
      settled: false,
      live: false,
      salonOnly: true,
    },
    {
      scenarioId: "salon-tennis-whale",
      sport: "TENNIS",
      sportLabel: "Tennis · Salon Desk",
      eventType: "game",
      home: "World No. 1",
      away: "Touring Contender",
      homeOdds: -200,
      awayOdds: 170,
      spread: -3.5,
      total: 22.5,
      spreadHomeOdds: -115,
      spreadAwayOdds: -105,
      totalOverOdds: -110,
      totalUnderOdds: -110,
      props: [
        { id: "salon-bagel", label: "Any set at 6-0", yesOdds: 275, noOdds: -350 },
      ],
      label: "Center court — salon only",
      status: "scheduled",
      settled: false,
      live: false,
      salonOnly: true,
    },
  ],
};

/** Salon stake tiers offered at the velvet rope. */
export const SALON_STAKE_TIER_ORDER = ["high_limit", "401k_contribution", "no_limit"];

/** Ensure runtime carries salon venue + a qualifying stake tier. */
export function enterSalonContext(runtime) {
  runtime.venue = SALON_VENUE_ID;
  if (!runtime.stakeTier || !SALON_STAKE_TIER_ORDER.includes(runtime.stakeTier.id)) {
    runtime.stakeTier = STAKE_TIERS.high_limit;
  }
  return runtime.stakeTier;
}

export function clearSalonContext(runtime) {
  if (runtime.venue === SALON_VENUE_ID) runtime.venue = null;
  runtime.salonActivityMin = null;
  if (runtime.slots) runtime.slots.salonOnly = false;
  if (runtime.sportsbook?.salonDesk) {
    runtime.sportsbook.clearSalonDesk();
  }
}

export function isSalonVenue(runtime) {
  return runtime?.venue === SALON_VENUE_ID;
}

/** Prefer salon private-shoe minimum when set on the runtime. */
export function resolveActivityMin(runtime, fallback = 1) {
  const salonMin = runtime?.salonActivityMin;
  if (Number.isFinite(salonMin) && salonMin > 0) return salonMin;
  return fallback;
}
