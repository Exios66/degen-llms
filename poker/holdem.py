"""Texas Hold'em table engine — one human vs four AI opponents (5-max)."""

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


STREET_ORDER = (
    Street.PREFLOP,
    Street.FLOP,
    Street.TURN,
    Street.RIVER,
    Street.SHOWDOWN,
)


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
    has_acted: bool = False

    def reset_for_hand(self) -> None:
        self.hole = []
        self.bet_this_street = 0
        self.total_in_hand = 0
        self.folded = False
        self.all_in = False
        self.has_acted = False


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
    hand_over: bool = False
    winners: list[str] = field(default_factory=list)
    showdown_scores: list[tuple[str, HandScore]] = field(default_factory=list)
    last_message: str = ""
    default_bot_stack: int = 0
    action_log: list[str] = field(default_factory=list)

    @classmethod
    def quick_table(cls, human_stack: int, num_bots: int = 4) -> HoldemTable:
        """Build a full ring: always 1 human + up to 4 bots (5 seats)."""
        bots = max(1, min(int(num_bots), 4))
        players = [HoldemPlayer("You", True, stack=human_stack)]
        bot_stack = max(human_stack, 500)
        for i in range(bots):
            players.append(HoldemPlayer(f"Bot {i + 1}", False, stack=bot_stack))
        bb = max(10, min(50, human_stack // 20))
        sb = max(5, bb // 2)
        return cls(
            players=players,
            small_blind=sb,
            big_blind=bb,
            default_bot_stack=bot_stack,
        )

    @property
    def human(self) -> HoldemPlayer:
        return next(p for p in self.players if p.is_human)

    def min_raise_to(self, player: HoldemPlayer) -> int:
        """Minimum total bet size for a full raise (or open bet)."""
        max_total = player.bet_this_street + player.stack
        full_min = self.current_bet + self.min_raise if self.current_bet > 0 else self.min_raise
        return min(full_min, max_total)

    def max_raise_to(self, player: HoldemPlayer) -> int:
        """No-limit: player may put their entire stack in."""
        return player.bet_this_street + player.stack

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
        self.action_log = []

        # Keep busted bots in the game so the table stays 5-handed.
        for p in self.players:
            if not p.is_human and p.stack <= 0:
                p.stack = self.default_bot_stack or max(self.big_blind * 20, 500)

        for p in self.players:
            p.reset_for_hand()

        eligible = [p for p in self.players if p.stack > 0]
        if len(eligible) < 2:
            self.hand_over = True
            self.last_message = "Not enough players with chips."
            return

        n = len(self.players)
        if n == 2:
            sb_idx = self.dealer_index
            bb_idx = (self.dealer_index + 1) % n
        else:
            sb_idx = (self.dealer_index + 1) % n
            bb_idx = (self.dealer_index + 2) % n

        self._post_blind(sb_idx, self.small_blind)
        self._post_blind(bb_idx, self.big_blind)
        self.current_bet = max(p.bet_this_street for p in self.players)

        for p in self.players:
            if not p.folded and p.stack >= 0:
                p.hole = [self.shoe.deal(), self.shoe.deal()]

        # Preflop action starts left of the big blind.
        self.action_index = (bb_idx + 1) % n
        self._seek_actor()
        self.last_message = "Cards dealt — pre-flop betting."
        self.action_log.append(self.last_message)

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
        # Blinds do not count as voluntary actions for the round.
        player.has_acted = False

    def _seek_actor(self) -> None:
        n = len(self.players)
        for _ in range(n):
            p = self.players[self.action_index]
            if not p.folded and not p.all_in:
                return
            self.action_index = (self.action_index + 1) % n

    def _players_in_hand(self) -> list[HoldemPlayer]:
        return [p for p in self.players if not p.folded]

    def _active_actors(self) -> list[HoldemPlayer]:
        return [p for p in self.players if not p.folded and not p.all_in]

    def legal_actions(self, player: HoldemPlayer) -> set[BettingAction]:
        if player.folded or player.all_in or self.hand_over:
            return set()
        to_call = self.current_bet - player.bet_this_street
        actions: set[BettingAction] = {BettingAction.FOLD}
        if to_call <= 0:
            actions.add(BettingAction.CHECK)
        elif player.stack > 0:
            # Short all-in calls are allowed in no-limit.
            actions.add(BettingAction.CALL)
        if player.stack > to_call:
            actions.add(BettingAction.RAISE)
        return actions

    def apply_action(
        self,
        player: HoldemPlayer,
        action: BettingAction,
        raise_to: int | None = None,
    ) -> str:
        if self.hand_over:
            return "Hand is over."
        legal = self.legal_actions(player)
        if action not in legal:
            raise ValueError(f"{player.name} cannot {action.value} now")

        to_call = max(0, self.current_bet - player.bet_this_street)
        raised = False

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
            if pay < to_call:
                msg = f"{player.name} calls all-in for {pay}."
            else:
                msg = f"{player.name} calls {pay}."
        elif action == BettingAction.RAISE:
            max_total = self.max_raise_to(player)
            min_total = self.min_raise_to(player)
            target = raise_to if raise_to is not None else min_total
            try:
                target = int(target)
            except (TypeError, ValueError) as exc:
                raise ValueError("Raise amount must be an integer") from exc

            # No-limit: any size from min full raise up to all-in.
            # All-in for less than a full raise is always allowed.
            if target < min_total and target < max_total:
                raise ValueError(f"Raise must be at least {min_total} (or all-in)")
            if target > max_total:
                target = max_total
            if target <= player.bet_this_street:
                raise ValueError("Raise must increase your bet")

            add = target - player.bet_this_street
            add = min(add, player.stack)
            opening_bet = to_call <= 0
            player.stack -= add
            player.bet_this_street += add
            player.total_in_hand += add
            self.pot += add

            if player.bet_this_street > self.current_bet:
                raise_size = player.bet_this_street - self.current_bet
                # Only a full raise updates the minimum re-raise size.
                if raise_size >= self.min_raise:
                    self.min_raise = raise_size
                self.current_bet = player.bet_this_street
                raised = True
            if player.stack == 0:
                player.all_in = True
            if opening_bet:
                msg = f"{player.name} bets {player.bet_this_street}."
            else:
                msg = f"{player.name} raises to {player.bet_this_street}."
        else:
            raise ValueError(f"Unknown action {action}")

        player.has_acted = True
        if raised:
            for other in self.players:
                if other is not player and not other.folded and not other.all_in:
                    other.has_acted = False

        self.last_message = msg
        self.action_log.append(msg)
        self._after_action(player)
        return msg

    def _after_action(self, acted: HoldemPlayer) -> None:
        live = self._players_in_hand()
        if len(live) == 1:
            self._award_uncontested(live[0])
            return

        n = len(self.players)
        self.action_index = (self.players.index(acted) + 1) % n
        self._seek_actor()

        if self._round_complete():
            self._advance_street()

    def _round_complete(self) -> bool:
        active = self._active_actors()
        if not active:
            return True
        return all(p.has_acted and p.bet_this_street == self.current_bet for p in active)

    def _advance_street(self) -> None:
        if len(self._players_in_hand()) == 1:
            self._award_uncontested(self._players_in_hand()[0])
            return

        for p in self.players:
            p.bet_this_street = 0
            p.has_acted = False
        self.current_bet = 0
        self.min_raise = self.big_blind

        if self.street == Street.PREFLOP:
            self.community.extend([self.shoe.deal() for _ in range(3)])
            self.street = Street.FLOP
            self.last_message = "Flop dealt — betting opens."
        elif self.street == Street.FLOP:
            self.community.append(self.shoe.deal())
            self.street = Street.TURN
            self.last_message = "Turn dealt — betting opens."
        elif self.street == Street.TURN:
            self.community.append(self.shoe.deal())
            self.street = Street.RIVER
            self.last_message = "River dealt — betting opens."
        elif self.street == Street.RIVER:
            self._showdown()
            return

        self.action_log.append(self.last_message)

        # Fewer than two players able to bet → run out remaining board.
        if len(self._active_actors()) < 2:
            self._advance_street()
            return

        self.action_index = (self.dealer_index + 1) % len(self.players)
        self._seek_actor()

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
        self.action_log.append(self.last_message)

    def _award_uncontested(self, winner: HoldemPlayer) -> None:
        won = self.pot
        self._split_pot([winner.name])
        self.last_message = f"{winner.name} wins {won} uncontested."
        self.action_log.append(self.last_message)

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

    def bot_action(self, player: HoldemPlayer) -> tuple[BettingAction, int | None]:
        """Return (action, raise_to) for a bot. raise_to is set only for RAISE."""
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
        pot_odds_pressure = to_call > max(self.big_blind * 3, self.pot // 3)

        if BettingAction.FOLD in legal and strength == 0 and (pot_odds_pressure or to_call > self.big_blind * 2):
            return BettingAction.FOLD, None

        if BettingAction.RAISE in legal and strength >= 2 and SECURE_RANDOM.random() < (0.15 + 0.1 * strength):
            min_to = self.min_raise_to(player)
            max_to = self.max_raise_to(player)
            # Size by strength: stronger hands bet bigger; still no-limit within stack.
            pot_bet = max(min_to, min(max_to, self.current_bet + max(self.min_raise, self.pot // 2 + self.big_blind)))
            if strength >= 5:
                target = max_to if SECURE_RANDOM.random() < 0.25 else max(min_to, min(max_to, pot_bet * 2))
            elif strength >= 3:
                target = pot_bet
            else:
                target = min_to
            target = max(min_to, min(max_to, int(target)))
            return BettingAction.RAISE, target

        if BettingAction.CHECK in legal:
            return BettingAction.CHECK, None
        if BettingAction.CALL in legal:
            if strength == 0 and to_call > self.big_blind and SECURE_RANDOM.random() < 0.55:
                return BettingAction.FOLD, None
            return BettingAction.CALL, None
        if BettingAction.FOLD in legal:
            return BettingAction.FOLD, None
        return BettingAction.CHECK, None


def _has_pair_preflop(hole: list[Card]) -> bool:
    return len(hole) == 2 and hole[0].rank == hole[1].rank


def _has_high_card_preflop(hole: list[Card]) -> bool:
    high = {Rank.ACE, Rank.KING, Rank.QUEEN, Rank.JACK, Rank.TEN}
    return any(c.rank in high for c in hole)


def human_net_change(table: HoldemTable, starting_stack: int) -> int:
    return table.human.stack - starting_stack
