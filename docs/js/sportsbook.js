import { secureRandomInt } from "./core.js";
import { loadCatalog, generateBoard, simulateEventOutcome } from "./sportSimulator.js";
import { PredictionMarketsState } from "./predictionMarkets.js";

export function fmtOdds(odds) {
  return odds > 0 ? `+${odds}` : String(odds);
}

export function profit(amount, americanOdds) {
  if (americanOdds > 0) return Math.floor((amount * americanOdds) / 100);
  return Math.floor((amount * 100) / Math.abs(americanOdds));
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

  if (slip.betType === "spread") {
    const margin = event.homeScore - event.awayScore;
    let adjusted;
    if (slip.pick === event.home) adjusted = margin + event.spread;
    else adjusted = -margin - event.spread;

    if (adjusted === 0) {
      return { won: true, payout: slip.amount, reason: "Push — stake returned" };
    }
    if (adjusted > 0) {
      const p = profit(slip.amount, slip.odds);
      return { won: true, payout: slip.amount + p, reason: `${slip.pick} covered the spread` };
    }
    return { won: false, payout: 0, reason: `${slip.pick} did not cover` };
  }

  if (slip.betType === "total") {
    const combined = event.homeScore + event.awayScore;
    const isOver = slip.pick === "over";
    const hit = isOver ? combined > event.total : combined < event.total;
    if (combined === event.total) {
      return { won: true, payout: slip.amount, reason: "Push — stake returned" };
    }
    if (hit) {
      const p = profit(slip.amount, slip.odds);
      return {
        won: true,
        payout: slip.amount + p,
        reason: `${isOver ? "Over" : "Under"} ${event.total} hit (${combined} total)`,
      };
    }
    return { won: false, payout: 0, reason: `${isOver ? "Over" : "Under"} ${event.total} missed` };
  }

  if (slip.betType === "prop") {
    const outcome = event.propOutcomes?.[slip.propId];
    const wantYes = slip.pick === "yes";
    if (outcome === undefined) {
      return { won: false, payout: 0, reason: "Prop could not be resolved" };
    }
    if (outcome === wantYes) {
      const p = profit(slip.amount, slip.odds);
      return { won: true, payout: slip.amount + p, reason: `${slip.propLabel}: ${slip.pick.toUpperCase()}` };
    }
    return { won: false, payout: 0, reason: `${slip.propLabel}: ${slip.pick.toUpperCase()} missed` };
  }

  if (slip.betType === "outright") {
    if (event.winner === slip.pick) {
      const p = profit(slip.amount, slip.odds);
      return { won: true, payout: slip.amount + p, reason: `${slip.pick} wins` };
    }
    return { won: false, payout: 0, reason: `${slip.pick} did not win` };
  }

  return { won: false, payout: 0, reason: "Unknown bet type" };
}

export class SportsbookState {
  constructor(data = null) {
    this.catalog = null;
    this.events = [];
    this.pending = [];
    this.sportFilter = "all";
    this.activeTab = "sports";
    this.liveCache = null;
    this.predictions = new PredictionMarketsState();
    if (data) {
      this.events = data.events ?? [];
      this.pending = data.pending ?? [];
      this.sportFilter = data.sportFilter ?? "all";
      this.activeTab = data.activeTab ?? "sports";
      this.liveCache = data.liveCache ?? null;
      this.predictions = PredictionMarketsState.fromJSON(data.predictions ?? null);
    }
  }

  async ensureCatalog() {
    if (!this.catalog) {
      this.catalog = await loadCatalog();
    }
    return this.catalog;
  }

  async init(force = false) {
    await this.ensureCatalog();
    if (!this.events.length || force) {
      this.refreshBoard(true);
    }
    this.predictions.syncMarkets(this.events, force);
  }

  refreshBoard(force = false) {
    if (this.events.length && !force) return;
    if (!this.catalog) return;
    this.events = generateBoard(this.catalog);
    this.predictions.syncMarkets(this.events, force);
  }

  async refreshBoardAsync(force = false) {
    await this.ensureCatalog();
    this.refreshBoard(force);
  }

  addTicket(slip) {
    this.pending.push(slip);
  }

  getOpenPositionCount() {
    return this.pending.length + this.predictions.getOpenPositionCount();
  }

  settlePredictions() {
    return this.predictions.settleAll(this.events);
  }

  settleAll(catalog) {
    const cat = catalog ?? this.catalog;
    const simulated = new Set();
    const results = [];

    for (const slip of this.pending) {
      const event = slip.event;
      if (!event.settled && !simulated.has(event.eventId)) {
        simulateEventOutcome(cat, event);
        simulated.add(event.eventId);
      }
      const resolved = resolveSlip(slip);
      results.push({ slip, event, ...resolved });
    }

    const count = this.pending.length;
    this.pending = [];
    return { results, count };
  }

  toJSON() {
    return {
      events: this.events.map((e) => ({ ...e, label: e.label ?? `${e.away} @ ${e.home}` })),
      pending: this.pending.map((s) => ({
        event: { ...s.event },
        betType: s.betType,
        pick: s.pick,
        amount: s.amount,
        odds: s.odds,
        propId: s.propId ?? null,
        propLabel: s.propLabel ?? null,
      })),
      sportFilter: this.sportFilter,
      activeTab: this.activeTab,
      liveCache: this.liveCache,
      predictions: this.predictions.toJSON(),
    };
  }

  static fromJSON(data) {
    if (!data) return new SportsbookState();
    return new SportsbookState(data);
  }
}

export function getUniqueSports(events) {
  return [...new Set(events.map((e) => e.sport))];
}

export function filterEvents(events, sportFilter) {
  if (!sportFilter || sportFilter === "all") return events;
  return events.filter((e) => e.sport === sportFilter);
}

export function formatEventScore(event) {
  if (event.eventType === "outright") {
    return event.winner ? `Winner: ${event.winner}` : "Pending";
  }
  return `${event.awayScore} — ${event.homeScore}`;
}

export function oddsForSelection(event, betType, pick, propId = null) {
  if (betType === "moneyline") {
    return pick === event.home ? event.homeOdds : event.awayOdds;
  }
  if (betType === "spread") {
    return pick === event.home ? event.spreadHomeOdds : event.spreadAwayOdds;
  }
  if (betType === "total") {
    return pick === "over" ? event.totalOverOdds : event.totalUnderOdds;
  }
  if (betType === "prop") {
    const prop = event.props?.find((p) => p.id === propId);
    return pick === "yes" ? prop?.yesOdds ?? -110 : prop?.noOdds ?? -110;
  }
  if (betType === "outright") {
    return event.outrightOdds?.[pick] ?? event.homeOdds;
  }
  return -110;
}
