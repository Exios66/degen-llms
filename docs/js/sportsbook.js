import { secureRandomInt, fisherYatesShuffle } from "./core.js";

const SPORTS = ["NFL", "NBA", "MLB", "Soccer"];

const TEAMS = {
  NFL: ["Raiders", "Chiefs", "Bills", "49ers", "Cowboys", "Eagles"],
  NBA: ["Lakers", "Celtics", "Warriors", "Heat", "Nuggets", "Bucks"],
  MLB: ["Yankees", "Dodgers", "Red Sox", "Cubs", "Giants", "Mets"],
  Soccer: ["Bay FC", "LA United", "Seattle Sound", "Miami FC", "NY City", "Austin FC"],
};

export function fmtOdds(odds) {
  return odds > 0 ? `+${odds}` : String(odds);
}

export function profit(amount, americanOdds) {
  if (americanOdds > 0) return Math.floor((amount * americanOdds) / 100);
  return Math.floor((amount * 100) / Math.abs(americanOdds));
}

function generateEvent() {
  const sport = SPORTS[secureRandomInt(0, SPORTS.length - 1)];
  const teams = [...TEAMS[sport]];
  fisherYatesShuffle(teams);
  const home = teams[0];
  const away = teams[1];
  const homeStrength = secureRandomInt(1, 10);
  const awayStrength = secureRandomInt(1, 10);
  const diff = homeStrength - awayStrength;
  let homeOdds, awayOdds;
  if (diff >= 3) {
    homeOdds = -150;
    awayOdds = 130;
  } else if (diff <= -3) {
    homeOdds = 130;
    awayOdds = -150;
  } else {
    homeOdds = -110;
    awayOdds = -110;
  }
  const spread = Math.round((diff * 0.5 - 0.5) * 10) / 10;
  return {
    eventId: `${sport}-${home}-${away}-${secureRandomInt(1000, 9999)}`,
    sport,
    home,
    away,
    homeOdds,
    awayOdds,
    spread,
    spreadHomeOdds: -110,
    spreadAwayOdds: -110,
    homeScore: 0,
    awayScore: 0,
    settled: false,
    get label() {
      return `${this.away} @ ${this.home}`;
    },
  };
}

export class SportsbookState {
  constructor(data = null) {
    this.events = [];
    this.pending = [];
    if (data) {
      this.events = data.events ?? [];
      this.pending = data.pending ?? [];
    } else {
      this.refreshBoard(true);
    }
  }

  refreshBoard(force = false) {
    if (this.events.length && !force) return;
    this.events = Array.from({ length: 4 }, () => generateEvent());
  }

  addTicket(slip) {
    this.pending.push(slip);
  }

  settleAll() {
    const results = [];
    for (const slip of this.pending) {
      const event = slip.event;
      if (event.sport === "Soccer") {
        event.homeScore = secureRandomInt(0, 3);
        event.awayScore = secureRandomInt(0, 3);
      } else {
        event.homeScore = secureRandomInt(10, 35);
        event.awayScore = secureRandomInt(10, 35);
      }
      event.settled = true;
      const resolved = resolveSlip(slip);
      results.push({ slip, event, ...resolved });
    }
    const count = this.pending.length;
    this.pending = [];
    return { results, count };
  }

  toJSON() {
    return {
      events: this.events.map((e) => ({ ...e })),
      pending: this.pending.map((s) => ({
        event: { ...s.event },
        betType: s.betType,
        pick: s.pick,
        amount: s.amount,
        odds: s.odds,
      })),
    };
  }

  static fromJSON(data) {
    if (!data) return new SportsbookState();
    return new SportsbookState(data);
  }
}

export function resolveSlip(slip) {
  const event = slip.event;
  if (slip.betType === "moneyline") {
    if (event.homeScore === event.awayScore) {
      return { won: true, payout: slip.amount, reason: "Push — stake returned" };
    }
    const winner = event.homeScore > event.awayScore ? event.home : event.away;
    if (winner === slip.pick) {
      const p = profit(slip.amount, slip.odds);
      return { won: true, payout: slip.amount + p, reason: `${slip.pick} wins outright` };
    }
    return { won: false, payout: 0, reason: `${slip.pick} did not win` };
  }

  const margin = event.homeScore - event.awayScore;
  let covered;
  if (slip.pick === event.home) {
    covered = margin + event.spread > 0 || (margin + event.spread === 0 && slip.odds < 0);
  } else {
    covered = -margin - event.spread > 0 || (-margin - event.spread === 0 && slip.odds < 0);
  }
  if (covered) {
    const p = profit(slip.amount, slip.odds);
    return { won: true, payout: slip.amount + p, reason: `${slip.pick} covered the spread` };
  }
  return { won: false, payout: 0, reason: `${slip.pick} did not cover` };
}
