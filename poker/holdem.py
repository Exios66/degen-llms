"""Texas Hold'em table engine — one human vs AI opponents."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum

from blackjack.cards import Card, Rank, Shoe
from blackjack.rng import SECURE_RANDOM
from poker.hand_eval import HandScore, best_hand_from_cards, compare_scores


class BettingAction(str, Enum):
    FOLD = "fold"
    CHECK = "check"
    CALL = "call"
    RAISE = "raise"


class Street(str, Enum):
    PREFLOP = "preflop"
    FLOP = "flop"
    TURN = "turn"
    RIVER = "river"
    SHOWDOWN = "showdown"


@dataclass
class HoldemPlayer:
    name: str
    is_human: bool
    hole: list[Card] = field(default_factory=list)
    stack: int = 0
    bet_this_street: int = 0
    total_in_hand: int = 0
    folded: bool = False
    all_in: bool = False

    def reset_for_hand(self) -> None:
        self.hole = []
        self.bet_this_street = 0
        self.total_in_hand = 0
        self.folded = False
        self.all_in = False


@dataclass
class HoldemTable:
    players: list[HoldemPlayer]
    small_blind: int
    big_blind: int
    shoe: Shoe = field(default_factory=lambda: Shoe(num_decks=1))
    community: list[Card] = field(default_factory=list)
    pot: int = 0
    street: Street = Street.PREFLOP
    dealer_index: int = 0
    current_bet: int = 0
    min_raise: int = 0
    action_index: int = 0
    acted_since_raise: int = 0
    hand_over: bool = False
    winners: list[str] = field(default_factory=list)
    showdown_scores: list[tuple[str, HandScore]] = field(default_factory=list)
    last_message: str = ""

    @classmethod
    def quick_table(cls, human_stack: int, num_bots: int = 2) -> HoldemTable:
        bots = min(num_bots, 2) if human_stack >= 100 else 1
        players = [HoldemPlayer("You", True, stack=human_stack)]
        bot_stack = max(human_stack, 500)
        for i in range(bots):
            players.append(HoldemPlayer(f"Bot {i + 1}", False, stack=bot_stack))
        bb = max(10, min(50, human_stack // 20))
        sb = max(5, bb // 2)
        return cls(players=players, small_blind=sb, big_blind=bb)

    @property
    def human(self) -> HoldemPlayer:
        return self.players[0]

    def start_hand(self) -> None:
        self.community = []
        self.pot = 0
        self.street = Street.PREFLOP
        self.current_bet = 0
        self.min_raise = self.big_blind
        self.hand_over = False
        self.winners = []
        self.showdown_scores = []
        self.last_message = ""
        self.acted_since_raise = 0

        for p in self.players:
            p.reset_for_hand()

        eligible = [p for p in self.players if p.stack > 0]
        if len(eligible) < 2:
            self.hand_over = True
            self.last_message = "Not enough players with chips."
            return

        n = len(self.players)
        sb_idx = (self.dealer_index + 1) % n
        bb_idx = (self.dealer_index + 2) % n
        self._post_blind(sb_idx, self.small_blind)
        self._post_blind(bb_idx, self.big_blind)
        self.current_bet = max(p.bet_this_street for p in self.players)

        for p in self.players:
            if not p.folded and p.stack >= 0:
                p.hole = [self.shoe.deal(), self.shoe.deal()]

        self.action_index = (bb_idx + 1) % n
        self._seek_actor()
        self.last_message = "Cards dealt — pre-flop betting."

    def _post_blind(self, idx: int, amount: int) -> None:
        player = self.players[idx]
        if player.stack <= 0:
            player.folded = True
            return
        paid = min(amount, player.stack)
        player.stack -= paid
        player.bet_this_street = paid
        player.total_in_hand += paid
        self.pot += paid
        if player.stack == 0:
            player.all_in = True

    def _seek_actor(self) -> None:
        n = len(self.players)
        for _ in range(n):
            p = self.players[self.action_index]
            if not p.folded and not p.all_in:
                return
            self.action_index = (self.action_index + 1) % n

    def _players_in_hand(self) -> list[HoldemPlayer]:
        return [p for p in self.players if not p.folded]

    def legal_actions(self, player: HoldemPlayer) -> set[BettingAction]:
        if player.folded or player.all_in or self.hand_over:
            return set()
        to_call = self.current_bet - player.bet_this_street
        actions: set[BettingAction] = {BettingAction.FOLD}
        if to_call <= 0:
            actions.add(BettingAction.CHECK)
        if to_call > 0 and player.stack >= to_call:
            actions.add(BettingAction.CALL)
        if player.stack > to_call and (player.stack - to_call) >= self.min_raise:
            actions.add(BettingAction.RAISE)
        return actions

    def apply_action(self, player: HoldemPlayer, action: BettingAction) -> str:
        if self.hand_over:
            return "Hand is over."
        to_call = max(0, self.current_bet - player.bet_this_street)

        if action == BettingAction.FOLD:
            player.folded = True
            msg = f"{player.name} folds."
        elif action == BettingAction.CHECK:
            if to_call > 0:
                raise ValueError("Cannot check facing a bet")
            msg = f"{player.name} checks."
        elif action == BettingAction.CALL:
            pay = min(to_call, player.stack)
            player.stack -= pay
            player.bet_this_street += pay
            player.total_in_hand += pay
            self.pot += pay
            if player.stack == 0:
                player.all_in = True
            msg = f"{player.name} calls {pay}."
        elif action == BettingAction.RAISE:
            raise_total = self.current_bet + self.min_raise
            add = raise_total - player.bet_this_street
            add = min(add, player.stack)
            player.stack -= add
            player.bet_this_street += add
            player.total_in_hand += add
            self.pot += add
            if player.bet_this_street > self.current_bet:
                self.min_raise = player.bet_this_street - self.current_bet
                self.current_bet = player.bet_this_street
                self.acted_since_raise = 0
            if player.stack == 0:
                player.all_in = True
            msg = f"{player.name} raises to {player.bet_this_street}."
        else:
            raise ValueError(f"Unknown action {action}")

        self.last_message = msg
        self._after_action(player)
        return msg

    def _after_action(self, acted: HoldemPlayer) -> None:
        live = self._players_in_hand()
        if len(live) == 1:
            self._award_uncontested(live[0])
            return

        self.acted_since_raise += 1
        n = len(self.players)
        self.action_index = (self.players.index(acted) + 1) % n
        self._seek_actor()

        if self._round_complete():
            self._advance_street()
        elif self.acted_since_raise >= len([p for p in self.players if not p.folded and not p.all_in]):
            self._advance_street()

    def _round_complete(self) -> bool:
        active = [p for p in self.players if not p.folded and not p.all_in]
        if not active:
            return True
        return all(p.bet_this_street == self.current_bet for p in active)

    def _advance_street(self) -> None:
        if len(self._players_in_hand()) == 1:
            self._award_uncontested(self._players_in_hand()[0])
            return

        for p in self.players:
            p.bet_this_street = 0
        self.current_bet = 0
        self.min_raise = self.big_blind
        self.acted_since_raise = 0

        if self.street == Street.PREFLOP:
            self.community.extend([self.shoe.deal() for _ in range(3)])
            self.street = Street.FLOP
            self.last_message = "Flop dealt."
        elif self.street == Street.FLOP:
            self.community.append(self.shoe.deal())
            self.street = Street.TURN
            self.last_message = "Turn dealt."
        elif self.street == Street.TURN:
            self.community.append(self.shoe.deal())
            self.street = Street.RIVER
            self.last_message = "River dealt."
        elif self.street == Street.RIVER:
            self._showdown()
            return

        self.action_index = (self.dealer_index + 1) % len(self.players)
        self._seek_actor()

        if self._round_complete():
            self._advance_street()

    def _showdown(self) -> None:
        self.street = Street.SHOWDOWN
        live = self._players_in_hand()
        scored: list[tuple[HoldemPlayer, HandScore]] = []
        for p in live:
            score, _ = best_hand_from_cards(p.hole + self.community)
            scored.append((p, score))
        best = scored[0][1]
        for _, s in scored[1:]:
            if compare_scores(s, best) > 0:
                best = s
        winner_names = [p.name for p, s in scored if compare_scores(s, best) == 0]
        self.showdown_scores = [(p.name, s) for p, s in scored]
        self._split_pot(winner_names)
        self.last_message = "Showdown complete."

    def _award_uncontested(self, winner: HoldemPlayer) -> None:
        self._split_pot([winner.name])
        self.last_message = f"{winner.name} wins {self.pot} uncontested."

    def _split_pot(self, winner_names: list[str]) -> None:
        if not winner_names:
            return
        share = self.pot // len(winner_names)
        remainder = self.pot % len(winner_names)
        for i, name in enumerate(winner_names):
            payout = share + (1 if i < remainder else 0)
            for p in self.players:
                if p.name == name:
                    p.stack += payout
        self.winners = winner_names
        self.hand_over = True
        self.dealer_index = (self.dealer_index + 1) % len(self.players)
        self.pot = 0

    def bot_action(self, player: HoldemPlayer) -> BettingAction:
        known = player.hole + self.community
        if len(known) >= 5:
            score, _ = best_hand_from_cards(known)
            strength = score.hand_class
        elif _has_pair_preflop(player.hole):
            strength = 2
        elif _has_high_card_preflop(player.hole):
            strength = 1
        else:
            strength = 0

        to_call = max(0, self.current_bet - player.bet_this_street)
        legal = self.legal_actions(player)

        if BettingAction.FOLD in legal and to_call > self.big_blind and strength == 0:
            return BettingAction.FOLD
        if BettingAction.RAISE in legal and strength >= 4 and SECURE_RANDOM.random() < 0.3:
            return BettingAction.RAISE
        if BettingAction.CHECK in legal:
            return BettingAction.CHECK
        if BettingAction.CALL in legal:
            return BettingAction.CALL
        return BettingAction.FOLD


def _has_pair_preflop(hole: list[Card]) -> bool:
    return len(hole) == 2 and hole[0].rank == hole[1].rank


def _has_high_card_preflop(hole: list[Card]) -> bool:
    high = {Rank.ACE, Rank.KING, Rank.QUEEN, Rank.JACK, Rank.TEN}
    return any(c.rank in high for c in hole)


def human_net_change(table: HoldemTable, starting_stack: int) -> int:
    return table.human.stack - starting_stack
