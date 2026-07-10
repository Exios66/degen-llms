import { secureRandomInt } from "./core.js";

const CATALOG_PATH = new URL("../data/sports_catalog.json", import.meta.url).href;
let catalogCache = null;

export async function loadCatalog() {
  if (catalogCache) return catalogCache;
  const res = await fetch(CATALOG_PATH);
  if (!res.ok) throw new Error(`Failed to load sports catalog: ${res.status}`);
  catalogCache = await res.json();
  return catalogCache;
}

export function loadCatalogSync(catalog) {
  catalogCache = catalog;
  return catalog;
}

export function getSportKeys(catalog) {
  return Object.keys(catalog.sports);
}

function participantsForSport(sportDef) {
  return sportDef.teams ?? sportDef.fighters ?? sportDef.players ?? [];
}

function shortName(fullName) {
  const parts = fullName.split(" ");
  return parts[parts.length - 1];
}

function gaussianInt(rng, mean, std, minVal, maxVal) {
  let sum = 0;
  for (let i = 0; i < 6; i += 1) sum += rng();
  const z = (sum - 3) / Math.sqrt(0.5);
  const val = Math.round(mean + z * std);
  return Math.max(minVal, Math.min(maxVal, val));
}

function ratingDiffToAmericanOdds(diff) {
  if (diff >= 80) return { home: -200, away: 170 };
  if (diff >= 40) return { home: -150, away: 130 };
  if (diff >= 15) return { home: -130, away: 110 };
  if (diff <= -80) return { home: 170, away: -200 };
  if (diff <= -40) return { home: 130, away: -150 };
  if (diff <= -15) return { home: 110, away: -130 };
  return { home: -110, away: -110 };
}

function roundSpread(value, step) {
  if (!step) return 0;
  return Math.round(value / step) * step;
}

function shuffleInPlace(arr, rngFn = secureRandomInt) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = typeof rngFn === "function" && rngFn.length >= 2
      ? rngFn(0, i)
      : secureRandomInt(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickMatchupParticipants(sportDef, rng, preferDivision = true) {
  const pool = [...participantsForSport(sportDef)];
  shuffleInPlace(pool, secureRandomInt);
  if (pool.length < 2) return [pool[0], pool[1]];

  if (preferDivision && rng() < 0.7) {
    const byDivision = {};
    for (const p of pool) {
      const key = p.division ?? p.weightClass ?? p.tour ?? "default";
      if (!byDivision[key]) byDivision[key] = [];
      byDivision[key].push(p);
    }
    const viable = Object.values(byDivision).filter((g) => g.length >= 2);
    if (viable.length) {
      shuffleInPlace(viable, secureRandomInt);
      const group = [...viable[0]];
      shuffleInPlace(group, secureRandomInt);
      return [group[0], group[1]];
    }
  }

  return [pool[0], pool[1]];
}

function makeRng(seedFn) {
  return () => {
    const n = seedFn(0, 999999);
    return n / 999999;
  };
}

export function generateEvent(catalog, sportKey, options = {}) {
  const rng = options.rng ?? makeRng(secureRandomInt);
  const sportDef = catalog.sports[sportKey];
  if (!sportDef) throw new Error(`Unknown sport: ${sportKey}`);

  const scoringType = sportDef.scoringProfile?.type ?? "points";
  const isOutright = scoringType === "outright";

  if (isOutright) {
    const pool = [...participantsForSport(sportDef)];
    shuffleInPlace(pool, secureRandomInt);
    const field = pool.slice(0, Math.min(4, pool.length));
    const favorite = field.reduce((a, b) => (a.powerRating >= b.powerRating ? a : b));
    const oddsMap = {};
    for (const p of field) {
      const gap = favorite.powerRating - p.powerRating;
      if (gap === 0) oddsMap[p.name] = sportDef.juice ?? 200;
      else if (gap <= 20) oddsMap[p.name] = 350;
      else if (gap <= 40) oddsMap[p.name] = 600;
      else oddsMap[p.name] = 900;
    }
    const eventId = `${sportKey}-${secureRandomInt(10000, 99999)}`;
    const home = field[0].name;
    const away = field[1]?.name ?? field[0].name;

    return {
      eventId,
      sport: sportKey,
      sportLabel: sportDef.label,
      eventType: "outright",
      home,
      away,
      field: field.map((p) => p.name),
      outrightOdds: oddsMap,
      homeOdds: oddsMap[home] ?? 200,
      awayOdds: oddsMap[away] ?? 350,
      spread: 0,
      total: 0,
      spreadHomeOdds: sportDef.juice ?? -110,
      spreadAwayOdds: sportDef.juice ?? -110,
      totalOverOdds: -110,
      totalUnderOdds: -110,
      props: [],
      homeScore: 0,
      awayScore: 0,
      winner: null,
      status: "scheduled",
      settled: false,
      live: false,
      label: `${shortName(away)} vs ${shortName(home)}`,
    };
  }

  const [awayTeam, homeTeam] = pickMatchupParticipants(sportDef, rng);
  const homeRating = homeTeam.powerRating + (sportDef.homeField ?? 0) * 10;
  const awayRating = awayTeam.powerRating;
  const diff = homeRating - awayRating;
  const odds = ratingDiffToAmericanOdds(diff);
  const spread = roundSpread((diff / 25) - (sportDef.homeField ?? 0), sportDef.spreadStep ?? 0.5);
  const profile = sportDef.scoringProfile;
  const total = Math.round((profile.meanTotal ?? 44) * 2) / 2;

  const props = [
    { id: "both-score", label: "Both teams score", yesOdds: -130, noOdds: 110 },
  ];
  if (sportKey === "NFL" || sportKey === "NCAAF") {
    props.push({ id: "over-tds", label: "Combined TDs over 4.5", yesOdds: -105, noOdds: -115 });
  }

  const eventId = `${sportKey}-${shortName(homeTeam.name)}-${shortName(awayTeam.name)}-${secureRandomInt(1000, 9999)}`;

  return {
    eventId,
    sport: sportKey,
    sportLabel: sportDef.label,
    eventType: "game",
    home: homeTeam.name,
    away: awayTeam.name,
    homeOdds: odds.home,
    awayOdds: odds.away,
    spread,
    total,
    spreadHomeOdds: sportDef.juice ?? -110,
    spreadAwayOdds: sportDef.juice ?? -110,
    totalOverOdds: -110,
    totalUnderOdds: -110,
    props,
    homeScore: 0,
    awayScore: 0,
    winner: null,
    propOutcomes: {},
    status: "scheduled",
    settled: false,
    live: false,
    label: `${shortName(awayTeam.name)} @ ${shortName(homeTeam.name)}`,
  };
}

export function generateBoard(catalog, count = null, options = {}) {
  const boardSize = count ?? catalog.boardSize ?? 10;
  const sportKeys = getSportKeys(catalog);
  const events = [];
  const usedMatchups = new Set();

  for (let i = 0; i < boardSize; i += 1) {
    const sportKey = sportKeys[secureRandomInt(0, sportKeys.length - 1)];
    let event;
    let attempts = 0;
    do {
      event = generateEvent(catalog, sportKey, options);
      attempts += 1;
    } while (
      attempts < 8
      && event.eventType === "game"
      && usedMatchups.has(`${event.sport}:${event.home}:${event.away}`)
    );
    if (event.eventType === "game") {
      usedMatchups.add(`${event.sport}:${event.home}:${event.away}`);
    }
    events.push(event);
  }
  return events;
}

function simulateGameScore(catalog, event, rng) {
  const sportDef = catalog.sports[event.sport];
  const profile = sportDef.scoringProfile;
  const participants = participantsForSport(sportDef);
  const homeRating = participants.find((t) => t.name === event.home)?.powerRating ?? 1450;
  const awayRating = participants.find((t) => t.name === event.away)?.powerRating ?? 1450;
  const ratingDiff = homeRating - awayRating + (sportDef.homeField ?? 0) * 10;

  const meanHome = (profile.meanTotal ?? 44) / 2 + ratingDiff / 40;
  const meanAway = (profile.meanTotal ?? 44) / 2 - ratingDiff / 40;
  const std = profile.stdPerTeam ?? 7;

  let homeScore = gaussianInt(rng, meanHome, std, profile.minPerTeam ?? 0, profile.maxPerTeam ?? 50);
  let awayScore = gaussianInt(rng, meanAway, std, profile.minPerTeam ?? 0, profile.maxPerTeam ?? 50);

  if (profile.type === "runs" || profile.type === "goals") {
    homeScore = Math.max(0, homeScore);
    awayScore = Math.max(0, awayScore);
  }

  if (profile.allowTie && rng() < 0.22) {
    const drawScore = Math.min(homeScore, awayScore);
    homeScore = drawScore;
    awayScore = drawScore;
  } else if (!profile.allowTie && homeScore === awayScore) {
    if (ratingDiff >= 0) homeScore += 1;
    else awayScore += 1;
  }

  event.homeScore = homeScore;
  event.awayScore = awayScore;
  event.winner = homeScore > awayScore ? event.home : awayScore > homeScore ? event.away : null;
  event.propOutcomes = {
    "both-score": homeScore > 0 && awayScore > 0,
    "over-tds": homeScore + awayScore > 45,
  };
}

function simulateOutright(catalog, event, rng) {
  const sportDef = catalog.sports[event.sport];
  const pool = participantsForSport(sportDef).filter((p) => (event.field?.includes(p.name) ?? true));
  const weights = pool.map((p) => Math.max(1, p.powerRating - 1300));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  let winner = pool[0].name;
  for (let i = 0; i < pool.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) {
      winner = pool[i].name;
      break;
    }
  }
  event.winner = winner;
  if (event.field?.length === 2) {
    event.homeScore = event.winner === event.home ? 1 : 0;
    event.awayScore = event.winner === event.away ? 1 : 0;
  }
}

export function simulateEventOutcome(catalog, event, options = {}) {
  if (!catalog) return event;
  const rng = options.rng ?? makeRng(secureRandomInt);
  const sportDef = catalog.sports[event.sport];
  if (!sportDef) return event;

  if (sportDef.scoringProfile?.type === "outright") {
    simulateOutright(catalog, event, rng);
  } else {
    simulateGameScore(catalog, event, rng);
  }
  event.status = "final";
  event.settled = true;
  return event;
}

export function applyLiveFixture(event, fixture) {
  const updated = { ...event, ...fixture, live: true };
  if (fixture.homeScore != null) updated.homeScore = fixture.homeScore;
  if (fixture.awayScore != null) updated.awayScore = fixture.awayScore;
  if (fixture.status) updated.status = fixture.status;
  if (fixture.homeScore != null && fixture.awayScore != null) {
    updated.winner = fixture.homeScore > fixture.awayScore
      ? updated.home
      : fixture.awayScore > fixture.homeScore
        ? updated.away
        : null;
    updated.settled = fixture.status === "final";
  }
  return updated;
}
