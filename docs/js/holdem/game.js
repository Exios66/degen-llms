import { Shoe } from "../blackjack/cards.js";
import { secureRandomInt } from "../core.js";
import { bestHandFromCards, compareScores } from "./hand_eval.js";

export const BettingAction = { FOLD: "fold", CHECK: "check", CALL: "call", RAISE: "raise" };
export const Street = { PREFLOP: "preflop", FLOP: "flop", TURN: "turn", RIVER: "river", SHOWDOWN: "showdown" };

function makePlayer(name, isHuman, stack) {
  return {
    name, isHuman, stack,
    hole: [], betThisStreet: 0, totalInHand: 0, folded: false, allIn: false,
    reset() {
      this.hole = []; this.betThisStreet = 0; this.totalInHand = 0;
      this.folded = false; this.allIn = false;
    },
  };
}

export class HoldemTable {
  constructor({ players, smallBlind, bigBlind }) {
    this.players = players;
    this.smallBlind = smallBlind;
    this.bigBlind = bigBlind;
    this.shoe = new Shoe(1);
    this.community = [];
    this.pot = 0;
    this.street = Street.PREFLOP;
    this.dealerIndex = 0;
    this.currentBet = 0;
    this.minRaise = bigBlind;
    this.actionIndex = 0;
    this.actedSinceRaise = 0;
    this.handOver = false;
    this.winners = [];
    this.showdownScores = [];
    this.lastMessage = "";
  }

  static quickTable(humanStack, numBots = 2) {
    const bots = humanStack >= 100 ? Math.min(numBots, 2) : 1;
    const players = [makePlayer("You", true, humanStack)];
    const botStack = Math.max(humanStack, 500);
    for (let i = 0; i < bots; i++) players.push(makePlayer(`Bot ${i + 1}`, false, botStack));
    const bb = Math.max(10, Math.min(50, Math.floor(humanStack / 20)));
    const sb = Math.max(5, Math.floor(bb / 2));
    return new HoldemTable({ players, smallBlind: sb, bigBlind: bb });
  }

  get human() { return this.players[0]; }

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
    this.actedSinceRaise = 0;
    this.players.forEach((p) => p.reset());

    const eligible = this.players.filter((p) => p.stack > 0);
    if (eligible.length < 2) {
      this.handOver = true;
      this.lastMessage = "Not enough players with chips.";
      return;
    }

    const n = this.players.length;
    const sbIdx = (this.dealerIndex + 1) % n;
    const bbIdx = (this.dealerIndex + 2) % n;
    this._postBlind(sbIdx, this.smallBlind);
    this._postBlind(bbIdx, this.bigBlind);
    this.currentBet = Math.max(...this.players.map((p) => p.betThisStreet));

    for (const p of this.players) {
      if (!p.folded) p.hole = [this.shoe.deal(), this.shoe.deal()];
    }
    this.actionIndex = (bbIdx + 1) % n;
    this._seekActor();
    this.lastMessage = "Cards dealt — pre-flop betting.";
  }

  _postBlind(idx, amount) {
    const player = this.players[idx];
    if (player.stack <= 0) { player.folded = true; return; }
    const paid = Math.min(amount, player.stack);
    player.stack -= paid;
    player.betThisStreet = paid;
    player.totalInHand += paid;
    this.pot += paid;
    if (player.stack === 0) player.allIn = true;
  }

  _seekActor() {
    const n = this.players.length;
    for (let i = 0; i < n; i++) {
      const p = this.players[this.actionIndex];
      if (!p.folded && !p.allIn) return;
      this.actionIndex = (this.actionIndex + 1) % n;
    }
  }

  _inHand() { return this.players.filter((p) => !p.folded); }

  legalActions(player) {
    if (player.folded || player.allIn || this.handOver) return new Set();
    const toCall = this.currentBet - player.betThisStreet;
    const actions = new Set([BettingAction.FOLD]);
    if (toCall <= 0) actions.add(BettingAction.CHECK);
    if (toCall > 0 && player.stack >= toCall) actions.add(BettingAction.CALL);
    if (player.stack > toCall && (player.stack - toCall) >= this.minRaise) actions.add(BettingAction.RAISE);
    return actions;
  }

  applyAction(player, action) {
    const toCall = Math.max(0, this.currentBet - player.betThisStreet);
    let msg;
    if (action === BettingAction.FOLD) {
      player.folded = true;
      msg = `${player.name} folds.`;
    } else if (action === BettingAction.CHECK) {
      msg = `${player.name} checks.`;
    } else if (action === BettingAction.CALL) {
      const pay = Math.min(toCall, player.stack);
      player.stack -= pay;
      player.betThisStreet += pay;
      player.totalInHand += pay;
      this.pot += pay;
      if (player.stack === 0) player.allIn = true;
      msg = `${player.name} calls ${pay}.`;
    } else if (action === BettingAction.RAISE) {
      const raiseTotal = this.currentBet + this.minRaise;
      let add = raiseTotal - player.betThisStreet;
      add = Math.min(add, player.stack);
      player.stack -= add;
      player.betThisStreet += add;
      player.totalInHand += add;
      this.pot += add;
      if (player.betThisStreet > this.currentBet) {
        this.minRaise = player.betThisStreet - this.currentBet;
        this.currentBet = player.betThisStreet;
        this.actedSinceRaise = 0;
      }
      if (player.stack === 0) player.allIn = true;
      msg = `${player.name} raises to ${player.betThisStreet}.`;
    }
    this.lastMessage = msg;
    this._afterAction(player);
    return msg;
  }

  _afterAction(acted) {
    const live = this._inHand();
    if (live.length === 1) { this._splitPot([live[0].name]); return; }

    this.actedSinceRaise += 1;
    this.actionIndex = (this.players.indexOf(acted) + 1) % this.players.length;
    this._seekActor();

    const activeCount = this.players.filter((p) => !p.folded && !p.allIn).length;
    if (this._roundComplete() || this.actedSinceRaise >= activeCount) this._advanceStreet();
  }

  _roundComplete() {
    const active = this.players.filter((p) => !p.folded && !p.allIn);
    if (!active.length) return true;
    return active.every((p) => p.betThisStreet === this.currentBet);
  }

  _advanceStreet() {
    if (this._inHand().length === 1) {
      this._splitPot([this._inHand()[0].name]);
      return;
    }
    for (const p of this.players) p.betThisStreet = 0;
    this.currentBet = 0;
    this.minRaise = this.bigBlind;
    this.actedSinceRaise = 0;

    if (this.street === Street.PREFLOP) {
      this.community.push(this.shoe.deal(), this.shoe.deal(), this.shoe.deal());
      this.street = Street.FLOP;
      this.lastMessage = "Flop dealt.";
    } else if (this.street === Street.FLOP) {
      this.community.push(this.shoe.deal());
      this.street = Street.TURN;
      this.lastMessage = "Turn dealt.";
    } else if (this.street === Street.TURN) {
      this.community.push(this.shoe.deal());
      this.street = Street.RIVER;
      this.lastMessage = "River dealt.";
    } else if (this.street === Street.RIVER) {
      this._showdown();
      return;
    }
    this.actionIndex = (this.dealerIndex + 1) % this.players.length;
    this._seekActor();
    if (this._roundComplete()) this._advanceStreet();
  }

  _showdown() {
    this.street = Street.SHOWDOWN;
    const live = this._inHand();
    const scored = live.map((p) => ({ player: p, ...bestHandFromCards([...p.hole, ...this.community]) }));
    let best = scored[0].score;
    for (const s of scored) if (compareScores(s.score, best) > 0) best = s.score;
    const winners = scored.filter((s) => compareScores(s.score, best) === 0).map((s) => s.player.name);
    this.showdownScores = scored.map((s) => ({ name: s.player.name, score: s.score }));
    this._splitPot(winners);
    this.lastMessage = "Showdown complete.";
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
    this.winners = winnerNames;
    this.handOver = true;
    this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
    this.pot = 0;
  }

  botAction(player) {
    const known = [...player.hole, ...this.community];
    let strength = 0;
    if (known.length >= 5) strength = bestHandFromCards(known).score.handClass;
    else if (player.hole.length === 2 && player.hole[0].rank === player.hole[1].rank) strength = 2;
    else if (player.hole.some((c) => ["A", "K", "Q", "J", "10"].includes(c.rank))) strength = 1;

    const toCall = Math.max(0, this.currentBet - player.betThisStreet);
    const legal = this.legalActions(player);
    if (legal.has(BettingAction.FOLD) && toCall > this.bigBlind && strength === 0) return BettingAction.FOLD;
    if (legal.has(BettingAction.RAISE) && strength >= 4 && secureRandomInt(0, 9) < 3) return BettingAction.RAISE;
    if (legal.has(BettingAction.CHECK)) return BettingAction.CHECK;
    if (legal.has(BettingAction.CALL)) return BettingAction.CALL;
    return BettingAction.FOLD;
  }
}
