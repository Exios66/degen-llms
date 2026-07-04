from __future__ import annotations

from blackjack.cards import RANK_VALUES, Card, Rank
from blackjack.rules import Action


def _dealer_up_value(up_card: Card) -> int:
    if up_card.rank == Rank.ACE:
        return 11
    return up_card.value


def _hard_action(total: int, dealer: int) -> Action:
    if total >= 17:
        return Action.STAND
    if total <= 8:
        return Action.HIT
    if total == 9:
        return Action.DOUBLE if dealer in (3, 4, 5, 6) else Action.HIT
    if total == 10:
        return Action.DOUBLE if dealer <= 9 else Action.HIT
    if total == 11:
        return Action.DOUBLE if dealer <= 10 else Action.HIT
    if total == 12:
        return Action.STAND if 4 <= dealer <= 6 else Action.HIT
    if 13 <= total <= 16:
        return Action.STAND if 2 <= dealer <= 6 else Action.HIT
    return Action.STAND


def _soft_action(total: int, dealer: int) -> Action:
    if total >= 19:
        return Action.STAND
    if total == 18:
        return Action.STAND if dealer in (2, 7, 8) else Action.HIT
    if total == 17:
        return Action.DOUBLE if 3 <= dealer <= 6 else Action.HIT
    if total in (15, 16):
        return Action.DOUBLE if 4 <= dealer <= 6 else Action.HIT
    if total in (13, 14):
        return Action.DOUBLE if 5 <= dealer <= 6 else Action.HIT
    return Action.HIT


def _pair_action(rank: Rank, dealer: int) -> Action:
    value = RANK_VALUES[rank]
    if rank == Rank.ACE:
        return Action.SPLIT
    if value == 10:
        return Action.STAND
    if value == 9:
        return Action.SPLIT if dealer not in (7, 10, 11) else Action.STAND
    if value == 8:
        return Action.SPLIT
    if value == 7:
        return Action.SPLIT if dealer <= 7 else Action.HIT
    if value == 6:
        return Action.SPLIT if 2 <= dealer <= 6 else Action.HIT
    if value == 5:
        return Action.DOUBLE if dealer <= 9 else Action.HIT
    if value in (4, 3, 2):
        return Action.SPLIT if 2 <= dealer <= 7 else Action.HIT
    return Action.HIT


def basic_strategy_action(
    total: int,
    dealer_up: Card,
    *,
    is_soft: bool,
    is_pair: bool,
    pair_rank: Rank | None,
    legal: set[Action],
) -> Action:
    dealer = _dealer_up_value(dealer_up)

    preferred: Action
    if is_pair and pair_rank is not None:
        preferred = _pair_action(pair_rank, dealer)
    elif is_soft:
        preferred = _soft_action(total, dealer)
    else:
        preferred = _hard_action(total, dealer)

    if preferred in legal:
        return preferred

    fallbacks = {
        Action.SPLIT: [Action.HIT, Action.STAND],
        Action.DOUBLE: [Action.HIT, Action.STAND],
        Action.STAND: [Action.HIT],
        Action.HIT: [Action.STAND],
    }
    for alt in fallbacks.get(preferred, []):
        if alt in legal:
            return alt
    return next(iter(legal))
