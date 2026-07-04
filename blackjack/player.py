from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field

from blackjack.bankroll import clamp_bet, compute_bot_bet
from blackjack.cards import Card, Rank
from blackjack.config import GameConfig
from blackjack.hand import Hand
from blackjack.rules import Action, TableState, legal_actions
from blackjack.strategy import basic_strategy_action


@dataclass
class PlayerHandState:
    hands: list[Hand] = field(default_factory=list)
    insurance_bet: int = 0
    current_hand_index: int = 0

    @property
    def active_hand(self) -> Hand | None:
        if not self.hands:
            return None
        return self.hands[self.current_hand_index]

    def all_finished(self) -> bool:
        return all(h.is_finished or h.is_surrendered or h.is_bust for h in self.hands)


class Player(ABC):
    def __init__(self, name: str, seat: int, bankroll: int) -> None:
        self.name = name
        self.seat = seat
        self.bankroll = bankroll
        self.round_state = PlayerHandState()

    def reset_round(self) -> None:
        self.round_state = PlayerHandState()

    @abstractmethod
    def place_bet(self, config: GameConfig) -> int:
        ...

    @abstractmethod
    def decide_insurance(self, config: GameConfig) -> bool:
        ...

    @abstractmethod
    def decide_action(
        self,
        hand: Hand,
        state: TableState,
        config: GameConfig,
        *,
        is_first_action: bool,
    ) -> Action:
        ...


class HumanPlayer(Player):
    def __init__(
        self,
        name: str,
        seat: int,
        bankroll: int,
        *,
        prompt_bet,
        prompt_insurance,
        prompt_action,
    ) -> None:
        super().__init__(name, seat, bankroll)
        self._prompt_bet = prompt_bet
        self._prompt_insurance = prompt_insurance
        self._prompt_action = prompt_action

    def place_bet(self, config: GameConfig) -> int:
        while True:
            amount = self._prompt_bet(self.bankroll, config)
            if amount == 0:
                return 0
            if amount < config.min_bet:
                continue
            if amount > config.max_bet:
                continue
            if amount > self.bankroll:
                continue
            return amount

    def decide_insurance(self, config: GameConfig) -> bool:
        max_insurance = self.round_state.hands[0].bet // 2 if self.round_state.hands else 0
        return self._prompt_insurance(max_insurance)

    def decide_action(
        self,
        hand: Hand,
        state: TableState,
        config: GameConfig,
        *,
        is_first_action: bool,
    ) -> Action:
        legal = legal_actions(
            hand,
            state,
            config,
            is_first_action=is_first_action,
            player_bankroll=self.bankroll,
            num_active_hands=len(self.round_state.hands),
        )
        return self._prompt_action(hand, legal, is_first_action)


class SimulatedPlayer(Player):
    def place_bet(self, config: GameConfig) -> int:
        return compute_bot_bet(self.bankroll, config)

    def decide_insurance(self, config: GameConfig) -> bool:
        return False

    def decide_action(
        self,
        hand: Hand,
        state: TableState,
        config: GameConfig,
        *,
        is_first_action: bool,
    ) -> Action:
        legal = legal_actions(
            hand,
            state,
            config,
            is_first_action=is_first_action,
            player_bankroll=self.bankroll,
            num_active_hands=len(self.round_state.hands),
        )
        pair_rank = hand.cards[0].rank if hand.is_pair else None
        return basic_strategy_action(
            hand.value,
            state.dealer_up_card,  # type: ignore[arg-type]
            is_soft=hand.is_soft,
            is_pair=hand.is_pair,
            pair_rank=pair_rank,
            legal=legal,
        )
