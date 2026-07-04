from __future__ import annotations

from dataclasses import dataclass, field

from blackjack.bankroll import settle_hand, settle_insurance
from blackjack.cards import Shoe
from blackjack.config import GameConfig
from blackjack.dealer import Dealer
from blackjack.display import Display
from blackjack.hand import Hand
from blackjack.player import HumanPlayer, Player, SimulatedPlayer
from blackjack.rules import Action, RoundPhase, TableState, dealer_should_hit, dealer_should_peek


@dataclass
class RoundOutcome:
    result_lines: list[str] = field(default_factory=list)
    human_net: int = 0
    round_over_early: bool = False


class Table:
    def __init__(
        self,
        config: GameConfig,
        players: list[Player],
        shoe: Shoe,
        display: Display,
    ) -> None:
        self.config = config
        self.players = sorted(players, key=lambda p: p.seat)
        self.shoe = shoe
        self.display = display
        self.dealer = Dealer()
        self.phase = RoundPhase.BETTING

    @classmethod
    def from_config(cls, config: GameConfig, display: Display, shoe: Shoe | None = None) -> Table:
        shoe = shoe or Shoe(
            num_decks=config.num_decks,
            verbose_shuffle=config.verbose_shuffle,
        )
        players: list[Player] = []
        bot_idx = 0
        names = config.bot_names or []
        for seat in range(1, config.total_seats + 1):
            if seat == config.human_seat:
                human = HumanPlayer(
                    "You",
                    seat,
                    config.starting_bankroll,
                    prompt_bet=display.prompt_bet,
                    prompt_insurance=display.prompt_insurance,
                    prompt_action=display.prompt_action,
                )
                players.append(human)
            else:
                name = names[bot_idx] if bot_idx < len(names) else f"Player {seat}"
                bot_idx += 1
                players.append(SimulatedPlayer(name, seat, config.starting_bankroll))
        return cls(config, players, shoe, display)

    def human(self) -> HumanPlayer:
        for player in self.players:
            if isinstance(player, HumanPlayer):
                return player
        raise RuntimeError("No human player at table")

    def play_round(self) -> RoundOutcome:
        outcome = RoundOutcome()
        self.dealer.reset()
        for player in self.players:
            player.reset_round()

        if not self._collect_bets(outcome):
            outcome.round_over_early = True
            return outcome

        self.phase = RoundPhase.DEAL
        self._deal_initial_cards()
        self.display.show_table(self.players, self.dealer)

        dealer_up = self.dealer.up_card
        assert dealer_up is not None
        dealer_bj = self.dealer.peek_blackjack()
        state = TableState(dealer_up_card=dealer_up, dealer_has_blackjack=dealer_bj)

        if dealer_should_peek(dealer_up) and dealer_bj:
            self.dealer.reveal_hole()
            self.display.print("Dealer has blackjack.")
            self.display.show_table(self.players, self.dealer, reveal_dealer=True)
            return self._settle(outcome, state)

        if dealer_up.is_ace:
            self.phase = RoundPhase.INSURANCE
            self._offer_insurance(state)

        if not dealer_bj:
            self.phase = RoundPhase.PLAYER_TURNS
            self._player_turns(state)

        self.phase = RoundPhase.DEALER_TURN
        self._dealer_turn(state)
        return self._settle(outcome, state)

    def _collect_bets(self, outcome: RoundOutcome) -> bool:
        self.phase = RoundPhase.BETTING
        for player in self.players:
            bet = player.place_bet(self.config)
            if isinstance(player, HumanPlayer) and bet == 0:
                return False
            if bet <= 0:
                outcome.result_lines.append(f"{player.name}: sitting out (no funds)")
                continue
            player.bankroll -= bet
            hand = Hand(bet=bet)
            player.round_state.hands = [hand]
        return True

    def _deal_initial_cards(self) -> None:
        for _ in range(2):
            for player in self.players:
                if player.round_state.hands:
                    player.round_state.hands[0].add_card(self.shoe.deal())
            self.dealer.receive(self.shoe.deal())

    def _offer_insurance(self, state: TableState) -> None:
        state.insurance_offered = True
        for player in self.players:
            if not player.round_state.hands:
                continue
            hand = player.round_state.hands[0]
            max_ins = hand.bet // 2
            if max_ins <= 0:
                continue
            if isinstance(player, HumanPlayer):
                if player.decide_insurance(self.config):
                    ins = max_ins
                    player.bankroll -= ins
                    player.round_state.insurance_bet = ins
                    self.display.print(f"You take insurance for ${_fmt(ins)}.")
            else:
                self.display.print(f"{player.name} declines insurance.")

    def _player_turns(self, state: TableState) -> None:
        for player in self.players:
            if not player.round_state.hands:
                continue
            highlight = player.seat if isinstance(player, HumanPlayer) else None
            hand_idx = 0
            while hand_idx < len(player.round_state.hands):
                player.round_state.current_hand_index = hand_idx
                hand = player.round_state.hands[hand_idx]
                if hand.is_blackjack or hand.is_finished:
                    hand.is_finished = True
                    hand_idx += 1
                    continue

                if isinstance(player, HumanPlayer):
                    self.display.show_table(
                        self.players, self.dealer, highlight_seat=highlight
                    )

                is_first = len(hand.cards) == 2 and not hand.is_doubled
                while not hand.is_finished and not hand.is_bust:
                    action = player.decide_action(
                        hand, state, self.config, is_first_action=is_first
                    )
                    if not isinstance(player, HumanPlayer):
                        self.display.announce_action(player.name, action)
                    self._apply_action(player, hand, action, state)
                    is_first = False
                    if hand.is_from_split_aces and len(hand.cards) >= 2:
                        hand.is_finished = True
                        break
                hand_idx += 1

    def _apply_action(
        self, player: Player, hand: Hand, action: Action, state: TableState
    ) -> None:
        if action == Action.SURRENDER:
            hand.is_surrendered = True
            hand.is_finished = True
            return
        if action == Action.STAND:
            hand.is_finished = True
            return
        if action == Action.HIT:
            hand.add_card(self.shoe.deal())
            if hand.is_bust:
                hand.is_finished = True
            return
        if action == Action.DOUBLE:
            player.bankroll -= hand.bet
            hand.bet *= 2
            hand.is_doubled = True
            hand.add_card(self.shoe.deal())
            hand.is_finished = True
            return
        if action == Action.SPLIT:
            second = hand.clone_for_split()
            hand.cards = [hand.cards[0]]
            hand.is_from_split_aces = hand.cards[0].is_ace
            second.is_from_split_aces = second.is_from_split_aces
            player.bankroll -= hand.bet
            hand.add_card(self.shoe.deal())
            second.add_card(self.shoe.deal())
            player.round_state.hands.insert(
                player.round_state.current_hand_index + 1, second
            )
            if hand.is_from_split_aces:
                hand.is_finished = True
                second.is_finished = True
            return

    def _dealer_turn(self, state: TableState) -> None:
        any_alive = any(
            any(not h.is_bust and not h.is_surrendered for h in p.round_state.hands)
            for p in self.players
            if p.round_state.hands
        )
        if not any_alive:
            return
        self.dealer.reveal_hole()
        self.display.banner("DEALER DRAWS")
        while dealer_should_hit(self.dealer.hand, self.config):
            self.dealer.receive(self.shoe.deal())
        self.display.show_table(self.players, self.dealer, reveal_dealer=True)

    def _settle(self, outcome: RoundOutcome, state: TableState) -> RoundOutcome:
        self.phase = RoundPhase.SETTLEMENT
        dealer_bj = state.dealer_has_blackjack or self.dealer.hand.is_blackjack
        if not self.dealer.hole_revealed:
            self.dealer.reveal_hole()

        for player in self.players:
            if not player.round_state.hands:
                continue
            player_net = 0
            hand_results: list[str] = []
            for idx, hand in enumerate(player.round_state.hands):
                result = settle_hand(
                    hand,
                    self.dealer.hand,
                    dealer_has_blackjack=dealer_bj,
                )
                player.bankroll += hand.bet + result.net_change
                player_net += result.net_change
                suffix = f" hand {idx + 1}" if len(player.round_state.hands) > 1 else ""
                hand_results.append(f"{result.description}{suffix} ({_signed(result.net_change)})")

            ins_net = settle_insurance(player.round_state.insurance_bet, dealer_bj)
            if player.round_state.insurance_bet:
                player.bankroll += player.round_state.insurance_bet + ins_net
                player_net += ins_net
                if ins_net > 0:
                    hand_results.append(f"insurance (+{ins_net})")
                elif ins_net < 0:
                    hand_results.append(f"insurance ({ins_net})")

            label = player.name
            outcome.result_lines.append(
                f"{label}: {' | '.join(hand_results)} = {_signed(player_net)}"
            )
            if isinstance(player, HumanPlayer):
                outcome.human_net += player_net

        self.display.show_table(self.players, self.dealer, reveal_dealer=True)
        self.display.show_round_results(outcome.result_lines)
        self.phase = RoundPhase.COMPLETE
        return outcome


def _signed(value: int) -> str:
    if value > 0:
        return f"+${value:,}"
    if value < 0:
        return f"-${abs(value):,}"
    return "$0"


def _fmt(amount: int) -> str:
    return f"{amount:,}"
