import { applyLiveFixture } from "./sportSimulator.js";

const CACHE_TTL_MS = 15 * 60 * 1000;
const API_BASE = "https://www.thesportsdb.com/api/v1/json/3";

const LEAGUE_MAP = {
  NFL: "4391",
  NBA: "4387",
  MLB: "4424",
  NHL: "4380",
  Soccer: "4346",
};

export async function fetchLiveFixtures(catalog, cache = null) {
  if (cache?.fetchedAt && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache;
  }

  const fixtures = [];
  const sportKeys = Object.keys(LEAGUE_MAP);

  for (const sportKey of sportKeys) {
    const leagueId = LEAGUE_MAP[sportKey];
    try {
      const res = await fetch(`${API_BASE}/eventsnextleague.php?id=${leagueId}`);
      if (!res.ok) continue;
      const data = await res.json();
      const events = data.events ?? [];
      for (const ev of events.slice(0, 2)) {
        fixtures.push({
          sport: sportKey,
          eventId: `live-${sportKey}-${ev.idEvent}`,
          home: ev.strHomeTeam,
          away: ev.strAwayTeam,
          homeScore: parseInt(ev.intHomeScore, 10) || 0,
          awayScore: parseInt(ev.intAwayScore, 10) || 0,
          status: ev.strStatus === "Match Finished" ? "final" : "scheduled",
          live: true,
          label: `${ev.strAwayTeam} @ ${ev.strHomeTeam}`,
          dateEvent: ev.dateEvent,
        });
      }
    } catch {
      // Silent fallback to simulator
    }
  }

  return {
    fixtures,
    fetchedAt: Date.now(),
  };
}

export function mergeLiveFixtures(simulatedEvents, liveCache, catalog) {
  if (!liveCache?.fixtures?.length) return simulatedEvents;

  const merged = [...simulatedEvents];
  let liveIdx = 0;

  for (let i = 0; i < merged.length && liveIdx < liveCache.fixtures.length; i += 1) {
    if (merged[i].sport === liveCache.fixtures[liveIdx].sport && !merged[i].settled) {
      merged[i] = applyLiveFixture(merged[i], liveCache.fixtures[liveIdx]);
      liveIdx += 1;
    }
  }

  return merged;
}

export function isCacheStale(cache) {
  if (!cache?.fetchedAt) return true;
  return Date.now() - cache.fetchedAt >= CACHE_TTL_MS;
}
