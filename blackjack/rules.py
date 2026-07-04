from __future__ import annotations

from dataclasses import dataclass
from enum import Enum, auto

from blackjack.cards import Card
from blackjack.config import GameConfig
from blackjack.hand import Hand


class Action(Enum):
    HIT = auto()
    STAND = auto()
    DOUBLE = auto()
    SPLIT = auto()
    SURRENDER = auto()
    INSURANCE = auto()


class RoundPhase(Enum):
    BETTING = auto()
    DEAL = auto()
    INSURANCE = auto()
    PLAYER_TURNS = auto()
    DEALER_TURN = auto()
    SETTLEMENT = auto()
    COMPLETE = auto()


MAX_SPLITS = 3


@dataclass
class TableState:
    dealer_up_card: Card | None
    dealer_has_blackjack: bool = False
    insurance_offered: bool = False
    allow_surrender: bool = True
    allow_double_after_split: bool = True


def dealer_should_hit(hand: Hand, config: GameConfig) -> bool:
    value = hand.value
    if value < 17:
        return True
    if value == 17 and hand.is_soft and config.dealer_hits_soft_17:
        return True
    return False


def dealer_should_peek(up_card: Card) -> bool:
    return up_card.is_ace or up_card.is_ten_value


def legal_actions(
    hand: Hand,
    state: TableState,
    config: GameConfig,
    *,
    is_first_action: bool,
    player_bankroll: int,
    num_active_hands: int,
) -> set[Action]:
    if hand.is_finished or hand.is_surrendered or hand.is_bust:
        return set()

    actions: set[Action] = {Action.HIT, Action.STAND}

    if is_first_action and state.allow_surrender and not hand.is_from_split_aces:
        actions.add(Action.SURRENDER)

    can_double = len(hand.cards) == 2 and not hand.is_doubled
    if can_double and player_bankroll >= hand.bet:
        actions.add(Action.DOUBLE)

    if hand.can_split(MAX_SPLITS) and player_bankroll >= hand.bet:
        actions.add(Action.SPLIT)

    if hand.is_from_split_aces and len(hand.cards) >= 2:
        actions.discard(Action.HIT)
        actions.discard(Action.DOUBLE)
        actions.discard(Action.SPLIT)

    return actions
