import { Shoe } from "../blackjack/cards.js";
import { secureRandomInt } from "../core.js";
import { bestHandFromCards, compareScores } from "./hand_eval.js";

export const BettingAction = { FOLD: "fold", CHECK: "check", CALL: "call", RAISE: "raise" };
export const Street = {
  PREFLOP: "preflop",
  FLOP: "flop",
  TURN: "turn",
  RIVER: "river",
  SHOWDOWN: "showdown",
};

export const STREET_ORDER = [
  Street.PREFLOP,
  Street.FLOP,
  Street.TURN,
  Street.RIVER,
  Street.SHOWDOWN,
];

function makePlayer(name, isHuman, stack) {
  return {
    name,
    isHuman,
    stack,
    hole: [],
    betThisStreet: 0,
    totalInHand: 0,
    folded: false,
    allIn: false,
    hasActed: false,
    lastActionBet: null,
    reset() {
      this.hole = [];
      this.betThisStreet = 0;
      this.totalInHand = 0;
      this.folded = false;
      this.allIn = false;
      this.hasActed = false;
      this.lastActionBet = null;
    },
  };
}

export class HoldemTable {
  constructor({ players, smallBlind, bigBlind, defaultBotStack = 0 }) {
    this.players = players;
    this.smallBlind = smallBlind;
    this.bigBlind = bigBlind;
    this.defaultBotStack = defaultBotStack;
    this.shoe = new Shoe(1);
    this.community = [];
    this.pot = 0;
    this.street = Street.PREFLOP;
    this.dealerIndex = 0;
    this.currentBet = 0;
    this.minRaise = bigBlind;
    this.actionIndex = 0;
    this.handOver = false;
    this.winners = [];
    this.showdownScores = [];
    this.lastMessage = "";
    this.actionLog = [];
  }

  /** Always seats 1 human + up to 4 bots (5-max table). */
  static quickTable(humanStack, numBots = 4) {
    const requestedBots = Number(numBots);
    const bots = Math.max(1, Math.min(Number.isFinite(requestedBots) ? Math.trunc(requestedBots) : 4, 4));
    const players = [makePlayer("You", true, humanStack)];
    const botStack = Math.max(humanStack, 500);
    for (let i = 0; i < bots; i++) players.push(makePlayer(`Bot ${i + 1}`, false, botStack));
    const bb = Math.max(10, Math.min(50, Math.floor(humanStack / 20)));
    const sb = Math.max(5, Math.floor(bb / 2));
    return new HoldemTable({
      players,
      smallBlind: sb,
      bigBlind: bb,
      defaultBotStack: botStack,
    });
  }

  get human() {
    return this.players.find((p) => p.isHuman) ?? this.players[0];
  }

  minRaiseTo(player) {
    const maxTotal = player.betThisStreet + player.stack;
    const fullMin = this.currentBet > 0 ? this.currentBet + this.minRaise : this.minRaise;
    return Math.min(fullMin, maxTotal);
  }

  maxRaiseTo(player) {
    return player.betThisStreet + player.stack;
  }

  startHand() {
    this.community = [];
    this.pot = 0;
    this.street = Street.PREFLOP;
    this.currentBet = 0;
    this.minRaise = this.bigBlind;
    this.handOver = false;
    this.winners = [];
    this.showdownScores = [];
    this.lastMessage = "";
    this.actionLog = [];

    for (const p of this.players) {
      if (!p.isHuman && p.stack <= 0) {
        p.stack = this.defaultBotStack || Math.max(this.bigBlind * 20, 500);
      }
    }
    this.players.forEach((p) => { p.reset(); p.folded = p.stack <= 0; });

    const eligible = this.players.filter((p) => p.stack > 0);
    if (eligible.length < 2) {
      this.handOver = true;
      this.lastMessage = "Not enough players with chips.";
      return;
    }

    const n = this.players.length;
    this.shoe.reshuffle();
    let sbIdx;
    let bbIdx;
    if (n === 2) {
      sbIdx = this.dealerIndex;
      bbIdx = (this.dealerIndex + 1) % n;
    } else {
      sbIdx = (this.dealerIndex + 1) % n;
      bbIdx = (this.dealerIndex + 2) % n;
    }

    this._postBlind(sbIdx, this.smallBlind);
    this._postBlind(bbIdx, this.bigBlind);
    this.currentBet = Math.max(...this.players.map((p) => p.betThisStreet));
    if (this._activeActors().length > 1) this.currentBet = Math.max(this.bigBlind, this.currentBet);

    for (const p of this.players) {
      if (!p.folded) p.hole = [this.shoe.deal(), this.shoe.deal()];
    }
    this.actionIndex = (bbIdx + 1) % n;
    this._seekActor();
    this.lastMessage = "Cards dealt — pre-flop betting.";
    this.actionLog.push(this.lastMessage);
    if (this._roundComplete()) this._advanceStreet();
  }

  _postBlind(idx, amount) {
    const player = this.players[idx];
    if (player.stack <= 0) {
      player.folded = true;
      return;
    }
    const paid = Math.min(amount, player.stack);
    player.stack -= paid;
    player.betThisStreet = paid;
    player.totalInHand += paid;
    this.pot += paid;
    if (player.stack === 0) player.allIn = true;
    player.hasActed = false;
  }

  _seekActor() {
    const n = this.players.length;
    for (let i = 0; i < n; i++) {
      const p = this.players[this.actionIndex];
      if (!p.folded && !p.allIn) return;
      this.actionIndex = (this.actionIndex + 1) % n;
    }
  }

  _inHand() {
    return this.players.filter((p) => !p.folded);
  }

  _activeActors() {
    return this.players.filter((p) => !p.folded && !p.allIn);
  }

  legalActions(player) {
    if (player.folded || player.allIn || this.handOver) return new Set();
    const toCall = this.currentBet - player.betThisStreet;
    const actions = new Set([BettingAction.FOLD]);
    if (toCall <= 0) actions.add(BettingAction.CHECK);
    else if (player.stack > 0) actions.add(BettingAction.CALL);
    const canReopen = player.lastActionBet == null || this.currentBet - player.lastActionBet >= this.minRaise;
    if (player.stack > toCall && canReopen && this._activeActors().length > 1) actions.add(BettingAction.RAISE);
    return actions;
  }

  applyAction(player, action, raiseTo = null) {
    if (this.handOver) return "Hand is over.";
    if (player !== this.players[this.actionIndex]) throw new Error("It is not this player's turn");
    const legal = this.legalActions(player);
    if (!legal.has(action)) throw new Error(`${player.name} cannot ${action} now`);

    const toCall = Math.max(0, this.currentBet - player.betThisStreet);
    let raised = false;
    let msg;

    if (action === BettingAction.FOLD) {
      player.folded = true;
      msg = `${player.name} folds.`;
    } else if (action === BettingAction.CHECK) {
      if (toCall > 0) throw new Error("Cannot check facing a bet");
      msg = `${player.name} checks.`;
    } else if (action === BettingAction.CALL) {
      const pay = Math.min(toCall, player.stack);
      player.stack -= pay;
      player.betThisStreet += pay;
      player.totalInHand += pay;
      this.pot += pay;
      if (player.stack === 0) player.allIn = true;
      msg = pay < toCall
        ? `${player.name} calls all-in for ${pay}.`
        : `${player.name} calls ${pay}.`;
    } else if (action === BettingAction.RAISE) {
      const maxTotal = this.maxRaiseTo(player);
      const minTotal = this.minRaiseTo(player);
      let target = raiseTo == null ? minTotal : Number(raiseTo);
      if (!Number.isSafeInteger(target)) throw new Error("Raise amount must be an integer");
      if (target < minTotal && target < maxTotal) {
        throw new Error(`Raise must be at least ${minTotal} (or all-in)`);
      }
      if (target > maxTotal) target = maxTotal;
      if (target <= player.betThisStreet) throw new Error("Raise must increase your bet");

      const add = Math.min(target - player.betThisStreet, player.stack);
      const openingBet = toCall <= 0;
      player.stack -= add;
      player.betThisStreet += add;
      player.totalInHand += add;
      this.pot += add;

      if (player.betThisStreet > this.currentBet) {
        const raiseSize = player.betThisStreet - this.currentBet;
        if (raiseSize >= this.minRaise) this.minRaise = raiseSize;
        this.currentBet = player.betThisStreet;
        raised = true;
      }
      if (player.stack === 0) player.allIn = true;
      msg = openingBet
        ? `${player.name} bets ${player.betThisStreet}.`
        : `${player.name} raises to ${player.betThisStreet}.`;
    } else {
      throw new Error(`Unknown action ${action}`);
    }

    player.hasActed = true;
    player.lastActionBet = action === BettingAction.CHECK ? null : this.currentBet;
    if (raised) {
      for (const other of this.players) {
        if (other !== player && !other.folded && !other.allIn) other.hasActed = false;
      }
    }

    this.lastMessage = msg;
    this.actionLog.push(msg);
    this._afterAction(player);
    return msg;
  }

  _afterAction(acted) {
    const live = this._inHand();
    if (live.length === 1) {
      this._awardUncontested(live[0]);
      return;
    }

    this.actionIndex = (this.players.indexOf(acted) + 1) % this.players.length;
    this._seekActor();
    if (this._roundComplete()) this._advanceStreet();
  }

  _roundComplete() {
    const active = this._activeActors();
    if (!active.length) return true;
    if (active.length === 1 && active[0].betThisStreet >= this.currentBet) return true;
    return active.every((p) => p.hasActed && p.betThisStreet === this.currentBet);
  }

  _advanceStreet() {
    if (this._inHand().length === 1) {
      this._awardUncontested(this._inHand()[0]);
      return;
    }

    for (const p of this.players) {
      p.betThisStreet = 0;
      p.hasActed = false;
      p.lastActionBet = null;
    }
    this.currentBet = 0;
    this.minRaise = this.bigBlind;

    if (this.street === Street.PREFLOP) {
      this.community.push(this.shoe.deal(), this.shoe.deal(), this.shoe.deal());
      this.street = Street.FLOP;
      this.lastMessage = "Flop dealt — betting opens.";
    } else if (this.street === Street.FLOP) {
      this.community.push(this.shoe.deal());
      this.street = Street.TURN;
      this.lastMessage = "Turn dealt — betting opens.";
    } else if (this.street === Street.TURN) {
      this.community.push(this.shoe.deal());
      this.street = Street.RIVER;
      this.lastMessage = "River dealt — betting opens.";
    } else if (this.street === Street.RIVER) {
      this._showdown();
      return;
    }

    this.actionLog.push(this.lastMessage);

    // Run out the board when fewer than two players can still bet.
    if (this._activeActors().length < 2) {
      this._advanceStreet();
      return;
    }

    this.actionIndex = (this.dealerIndex + 1) % this.players.length;
    this._seekActor();
  }

  _showdown() {
    this.street = Street.SHOWDOWN;
    const live = this._inHand();
    const scored = live.map((p) => ({ player: p, ...bestHandFromCards([...p.hole, ...this.community]) }));
    this.showdownScores = scored.map((s) => ({ name: s.player.name, score: s.score }));
    const winnerNames = [];
    let previous = 0;
    const levels = [...new Set(this.players.map((p) => p.totalInHand).filter((n) => n > 0))].sort((a, b) => a - b);
    for (const level of levels) {
      const contributors = this.players.filter((p) => p.totalInHand >= level);
      const amount = (level - previous) * contributors.length;
      const eligible = scored.filter((s) => s.player.totalInHand >= level);
      if (eligible.length) {
        let best = eligible[0].score;
        for (const s of eligible) if (compareScores(s.score, best) > 0) best = s.score;
        const winners = eligible.filter((s) => compareScores(s.score, best) === 0).map((s) => s.player);
        const seatOrder = (p) => (this.players.indexOf(p) - this.dealerIndex - 1 + this.players.length) % this.players.length;
        winners.sort((a, b) => seatOrder(a) - seatOrder(b));
        const share = Math.floor(amount / winners.length);
        const remainder = amount % winners.length;
        winners.forEach((p, i) => {
          p.stack += share + (i < remainder ? 1 : 0);
          if (!winnerNames.includes(p.name)) winnerNames.push(p.name);
        });
      }
      previous = level;
    }
    this._finishHand(winnerNames);
    this.lastMessage = "Showdown complete.";
    this.actionLog.push(this.lastMessage);
  }

  _awardUncontested(winner) {
    const won = this.pot;
    this._splitPot([winner.name]);
    this.lastMessage = `${winner.name} wins ${won} uncontested.`;
    this.actionLog.push(this.lastMessage);
  }

  _splitPot(winnerNames) {
    if (!winnerNames.length) return;
    const share = Math.floor(this.pot / winnerNames.length);
    const rem = this.pot % winnerNames.length;
    winnerNames.forEach((name, i) => {
      const payout = share + (i < rem ? 1 : 0);
      const p = this.players.find((x) => x.name === name);
      if (p) p.stack += payout;
    });
    this._finishHand(winnerNames);
  }

  _finishHand(winnerNames) {
    this.winners = winnerNames;
    this.handOver = true;
    this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
    this.pot = 0;
  }

  /** Returns `{ action, raiseTo }` — raiseTo is set only for RAISE. */
  botAction(player) {
    const known = [...player.hole, ...this.community];
    let strength = 0;
    if (known.length >= 5) strength = bestHandFromCards(known).score.handClass;
    else if (player.hole.length === 2 && player.hole[0].rank === player.hole[1].rank) strength = 2;
    else if (player.hole.some((c) => ["A", "K", "Q", "J", "10"].includes(c.rank))) strength = 1;

    const toCall = Math.max(0, this.currentBet - player.betThisStreet);
    const legal = this.legalActions(player);
    const potOddsPressure = toCall > Math.max(this.bigBlind * 3, Math.floor(this.pot / 3));

    if (legal.has(BettingAction.FOLD) && strength === 0 && (potOddsPressure || toCall > this.bigBlind * 2)) {
      return { action: BettingAction.FOLD, raiseTo: null };
    }

    const raiseChance = 15 + 10 * strength;
    if (legal.has(BettingAction.RAISE) && strength >= 2 && secureRandomInt(0, 99) < raiseChance) {
      const minTo = this.minRaiseTo(player);
      const maxTo = this.maxRaiseTo(player);
      const potBet = Math.max(
        minTo,
        Math.min(maxTo, this.currentBet + Math.max(this.minRaise, Math.floor(this.pot / 2) + this.bigBlind)),
      );
      let target;
      if (strength >= 5) {
        target = secureRandomInt(0, 3) === 0 ? maxTo : Math.max(minTo, Math.min(maxTo, potBet * 2));
      } else if (strength >= 3) {
        target = potBet;
      } else {
        target = minTo;
      }
      target = Math.max(minTo, Math.min(maxTo, Math.floor(target)));
      return { action: BettingAction.RAISE, raiseTo: target };
    }

    if (legal.has(BettingAction.CHECK)) return { action: BettingAction.CHECK, raiseTo: null };
    if (legal.has(BettingAction.CALL)) {
      if (strength === 0 && toCall > this.bigBlind && secureRandomInt(0, 99) < 55) {
        return { action: BettingAction.FOLD, raiseTo: null };
      }
      return { action: BettingAction.CALL, raiseTo: null };
    }
    if (legal.has(BettingAction.FOLD)) return { action: BettingAction.FOLD, raiseTo: null };
    return { action: BettingAction.CHECK, raiseTo: null };
  }
}
