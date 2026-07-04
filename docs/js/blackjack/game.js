import { Shoe } from "./cards.js";
import { createHand } from "./hand.js";
import {
  Action, MAX_SPLITS, createTableState, dealerShouldHit, dealerShouldPeek, legalActions,
} from "./rules.js";
import { settleHand, settleInsurance, computeBotBet } from "./bankroll.js";
import { basicStrategyAction } from "./strategy.js";

const BOT_NAMES = ["Alex", "Sam", "Jordan", "Casey", "Riley", "Morgan"];

export function defaultConfig(balance) {
  return {
    startingBankroll: balance,
    minBet: 10,
    maxBet: Math.min(100, balance),
    numDecks: 6,
    dealerHitsSoft17: true,
    numBots: 0,
    humanSeat: 1,
  };
}

export function createPlayers(config) {
  const players = [];
  let botIdx = 0;
  for (let seat = 1; seat <= config.numBots + 1; seat++) {
    const isHuman = seat === config.humanSeat;
    players.push({
      name: isHuman ? "You" : (BOT_NAMES[botIdx++] ?? `Player ${seat}`),
      seat,
      bankroll: config.startingBankroll,
      isHuman,
      roundState: { hands: [], insuranceBet: 0, currentHandIndex: 0 },
      resetRound() {
        this.roundState = { hands: [], insuranceBet: 0, currentHandIndex: 0 };
      },
    });
  }
  return players.sort((a, b) => a.seat - b.seat);
}

export class BlackjackGame {
  constructor(config, walletSync) {
    this.config = config;
    this.walletSync = walletSync;
    this.shoe = new Shoe(config.numDecks);
    this.players = createPlayers(config);
    this.dealer = { hand: createHand(), holeRevealed: false };
    this.state = null;
    this.phase = "idle";
    this.messages = [];
    this.resultLines = [];
    this.humanNet = 0;
    this.pendingInsurance = false;
    this.pendingAction = null;
    this.pendingBet = false;
    this.roundOverEarly = false;
    this.human = () => this.players.find((p) => p.isHuman);
  }

  resetDealer() {
    this.dealer = { hand: createHand(), holeRevealed: false };
  }

  addMessage(text, type = "") {
    this.messages.push({ text, type });
  }

  statusLine() {
    const h = this.human();
    const cfg = this.config;
    return `Bankroll: $${h.bankroll.toLocaleString()} | Min: $${cfg.minBet} | Max: $${cfg.maxBet} | Shoe: ${cfg.numDecks} deck${cfg.numDecks !== 1 ? "s" : ""} | Dealer: ${cfg.dealerHitsSoft17 ? "H17" : "S17"}`;
  }

  canPlayAnother() {
    const h = this.human();
    return h.bankroll >= this.config.minBet;
  }

  beginRound() {
    this.messages = [];
    this.resultLines = [];
    this.humanNet = 0;
    this.roundOverEarly = false;
    this.resetDealer();
    for (const p of this.players) p.resetRound();
    this.phase = "betting";
    this.pendingBet = true;
    return this;
  }

  placeHumanBet(amount) {
    const human = this.human();
    if (amount === 0) {
      this.roundOverEarly = true;
      this.phase = "complete";
      this.addMessage("Leaving table.", "dim");
      return false;
    }
    if (amount < this.config.minBet || amount > this.config.maxBet || amount > human.bankroll) {
      return false;
    }

    for (const player of this.players) {
      let bet = 0;
      if (player.isHuman) {
        bet = amount;
      } else {
        bet = computeBotBet(player.bankroll, this.config);
      }
      if (player.isHuman && bet === 0) {
        this.roundOverEarly = true;
        this.phase = "complete";
        return false;
      }
      if (bet <= 0) {
        this.addMessage(`${player.name}: sitting out (no funds)`, "dim");
        continue;
      }
      player.bankroll -= bet;
      player.roundState.hands = [createHand({ bet })];
    }

    this._dealInitial();
    return this._afterDeal();
  }

  _dealInitial() {
    for (let i = 0; i < 2; i++) {
      for (const player of this.players) {
        if (player.roundState.hands.length) {
          player.roundState.hands[0].addCard(this.shoe.deal());
        }
      }
      this.dealer.hand.addCard(this.shoe.deal());
    }
    this.phase = "deal";
  }

  _afterDeal() {
    const up = this.dealer.hand.cards[0];
    const dealerBj = this.dealer.hand.cards.length === 2 && this.dealer.hand.isBlackjack;
    this.state = createTableState(up);
    this.state.dealerHasBlackjack = dealerBj;

    if (dealerShouldPeek(up) && dealerBj) {
      this.dealer.holeRevealed = true;
      this.addMessage("Dealer has blackjack.", "error");
      return this._settle();
    }

    if (up.isAce) {
      this.phase = "insurance";
      this.pendingInsurance = true;
      const maxIns = Math.floor((this.human().roundState.hands[0]?.bet ?? 0) / 2);
      if (maxIns <= 0) {
        this.pendingInsurance = false;
        return this._startPlayerTurns();
      }
      return this;
    }

    if (!dealerBj) return this._startPlayerTurns();
    return this._settle();
  }

  takeInsurance(take) {
    if (!this.pendingInsurance) return;
    this.pendingInsurance = false;
    const human = this.human();
    const hand = human.roundState.hands[0];
    const maxIns = Math.floor(hand.bet / 2);
    if (take && maxIns > 0) {
      human.bankroll -= maxIns;
      human.roundState.insuranceBet = maxIns;
      this.addMessage(`You take insurance for $${maxIns.toLocaleString()}.`, "success");
    }
    for (const p of this.players) {
      if (!p.isHuman && p.roundState.hands.length) {
        this.addMessage(`${p.name} declines insurance.`, "dim");
      }
    }
    return this._startPlayerTurns();
  }

  _startPlayerTurns() {
    this.phase = "player";
    return this._advanceToNextAction();
  }

  _advanceToNextAction() {
    for (const player of this.players) {
      if (!player.roundState.hands.length) continue;
      let handIdx = 0;
      while (handIdx < player.roundState.hands.length) {
        player.roundState.currentHandIndex = handIdx;
        const hand = player.roundState.hands[handIdx];
        if (hand.isBlackjack || hand.isFinished) {
          hand.isFinished = true;
          handIdx++;
          continue;
        }

        if (player.isHuman) {
          this.pendingAction = { player, hand, isFirstAction: hand.cards.length === 2 && !hand.isDoubled };
          this.phase = "player";
          return this;
        }

        this._playBotHand(player, hand);
        handIdx++;
      }
    }
    return this._dealerTurn();
  }

  _playBotHand(player, hand) {
    let isFirst = hand.cards.length === 2 && !hand.isDoubled;
    while (!hand.isFinished && !hand.isBust) {
      const legal = legalActions(hand, this.state, this.config, isFirst, player.bankroll);
      const pairRank = hand.isPair ? hand.cards[0].rank : null;
      const action = basicStrategyAction(hand.value, this.state.dealerUpCard, {
        isSoft: hand.isSoft, isPair: hand.isPair, pairRank, legal,
      });
      this.addMessage(`${player.name} ${action.toLowerCase()}s.`, "dim");
      this._applyAction(player, hand, action);
      isFirst = false;
      if (hand.isFromSplitAces && hand.cards.length >= 2) {
        hand.isFinished = true;
        break;
      }
    }
  }

  playerAction(action) {
    if (!this.pendingAction) return;
    const { player, hand, isFirstAction } = this.pendingAction;
    const legal = legalActions(hand, this.state, this.config, isFirstAction, player.bankroll);
    if (!legal.has(action)) return false;

    this._applyAction(player, hand, action);
    this.pendingAction = null;

    if (!hand.isFinished && !hand.isBust) {
      this.pendingAction = { player, hand, isFirstAction: false };
      return this;
    }

    const handIdx = player.roundState.currentHandIndex;
    if (handIdx + 1 < player.roundState.hands.length) {
      player.roundState.currentHandIndex = handIdx + 1;
      const nextHand = player.roundState.hands[handIdx + 1];
      if (!nextHand.isFinished && !nextHand.isBlackjack) {
        this.pendingAction = { player, hand: nextHand, isFirstAction: nextHand.cards.length === 2 && !nextHand.isDoubled };
        return this;
      }
    }

    return this._advanceToNextAction();
  }

  _applyAction(player, hand, action) {
    if (action === Action.SURRENDER) {
      hand.isSurrendered = true;
      hand.isFinished = true;
      return;
    }
    if (action === Action.STAND) {
      hand.isFinished = true;
      return;
    }
    if (action === Action.HIT) {
      hand.addCard(this.shoe.deal());
      if (hand.isBust) hand.isFinished = true;
      return;
    }
    if (action === Action.DOUBLE) {
      player.bankroll -= hand.bet;
      hand.bet *= 2;
      hand.isDoubled = true;
      hand.addCard(this.shoe.deal());
      hand.isFinished = true;
      return;
    }
    if (action === Action.SPLIT) {
      const second = hand.cloneForSplit();
      hand.cards = [hand.cards[0]];
      hand.isFromSplitAces = hand.cards[0].isAce;
      player.bankroll -= hand.bet;
      hand.addCard(this.shoe.deal());
      second.addCard(this.shoe.deal());
      const idx = player.roundState.currentHandIndex;
      player.roundState.hands.splice(idx + 1, 0, second);
      if (hand.isFromSplitAces) {
        hand.isFinished = true;
        second.isFinished = true;
      }
    }
  }

  _dealerTurn() {
    const anyAlive = this.players.some((p) =>
      p.roundState.hands.some((h) => !h.isBust && !h.isSurrendered)
    );
    if (!anyAlive) return this._settle();

    this.dealer.holeRevealed = true;
    this.addMessage("--- DEALER DRAWS ---", "subtitle");
    while (dealerShouldHit(this.dealer.hand, this.config.dealerHitsSoft17)) {
      this.dealer.hand.addCard(this.shoe.deal());
    }
    return this._settle();
  }

  _settle() {
    this.phase = "settlement";
    const dealerBj = this.state.dealerHasBlackjack || (this.dealer.holeRevealed && this.dealer.hand.isBlackjack);
    if (!this.dealer.holeRevealed) this.dealer.holeRevealed = true;

    this.resultLines = [];
    for (const player of this.players) {
      if (!player.roundState.hands.length) continue;
      let playerNet = 0;
      const handResults = [];

      for (let idx = 0; idx < player.roundState.hands.length; idx++) {
        const hand = player.roundState.hands[idx];
        const result = settleHand(hand, this.dealer.hand, dealerBj);
        player.bankroll += hand.bet + result.netChange;
        playerNet += result.netChange;
        const suffix = player.roundState.hands.length > 1 ? ` hand ${idx + 1}` : "";
        handResults.push(`${result.description}${suffix} (${signed(result.netChange)})`);
      }

      const insNet = settleInsurance(player.roundState.insuranceBet, dealerBj);
      if (player.roundState.insuranceBet) {
        player.bankroll += player.roundState.insuranceBet + insNet;
        playerNet += insNet;
        if (insNet > 0) handResults.push(`insurance (+${insNet})`);
        else if (insNet < 0) handResults.push(`insurance (${insNet})`);
      }

      const line = `${player.name}: ${handResults.join(" | ")} = ${signed(playerNet)}`;
      this.resultLines.push(line);
      if (player.isHuman) this.humanNet += playerNet;
    }

    this.phase = "complete";
    this.pendingBet = false;
    this.pendingAction = null;
    this.pendingInsurance = false;

    if (this.walletSync) {
      const human = this.human();
      this.walletSync(human.bankroll);
    }
    return this;
  }

  getCurrentLegalActions() {
    if (!this.pendingAction) return new Set();
    const { player, hand, isFirstAction } = this.pendingAction;
    return legalActions(hand, this.state, this.config, isFirstAction, player.bankroll);
  }

  getTableSnapshot(revealDealer = false, highlightSeat = null) {
    const rows = [];
    for (const player of this.players) {
      for (let idx = 0; idx < player.roundState.hands.length; idx++) {
        const hand = player.roundState.hands[idx];
        const label = idx === 0 ? player.name : `${player.name} hand ${idx + 1}`;
        rows.push({
          seat: player.seat,
          label,
          bankroll: player.bankroll,
          bet: hand.bet,
          cards: hand.cards,
          value: hand.displayValue(),
          highlight: player.seat === highlightSeat,
          surrendered: hand.isSurrendered,
          bust: hand.isBust,
          blackjack: hand.isBlackjack,
        });
      }
    }

    const up = this.dealer.hand.cards[0];
    let dealerRow = null;
    if (up) {
      if (revealDealer || this.dealer.holeRevealed) {
        dealerRow = {
          cards: this.dealer.hand.cards,
          value: this.dealer.hand.displayValue(),
          hidden: false,
        };
      } else {
        dealerRow = {
          cards: [up, null],
          value: `${up.value}+`,
          hidden: true,
        };
      }
    }
    return { rows, dealer: dealerRow };
  }
}

function signed(value) {
  if (value > 0) return `+$${value.toLocaleString()}`;
  if (value < 0) return `-$${Math.abs(value).toLocaleString()}`;
  return "$0";
}

export { Action };
