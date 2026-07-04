from __future__ import annotations

from dataclasses import dataclass

from blackjack.config import GameConfig
from blackjack.hand import Hand


def clamp_bet(amount: int, bankroll: int, config: GameConfig) -> int:
    return max(config.min_bet, min(amount, config.max_bet, bankroll))


def compute_bot_bet(bankroll: int, config: GameConfig) -> int:
    if bankroll < config.min_bet:
        return 0
    target = max(config.min_bet, int(bankroll * 0.03))
    rounded = (target // config.min_bet) * config.min_bet
    if rounded < config.min_bet:
        rounded = config.min_bet
    return clamp_bet(rounded, bankroll, config)


@dataclass
class SettlementResult:
    description: str
    net_change: int


def settle_hand(
    player_hand: Hand,
    dealer_hand: Hand,
    *,
    dealer_has_blackjack: bool,
    blackjack_payout_numerator: int = 3,
    blackjack_payout_denominator: int = 2,
) -> SettlementResult:
    bet = player_hand.bet

    if player_hand.is_surrendered:
        loss = bet // 2
        return SettlementResult("SURRENDER", -loss)

    if player_hand.is_bust:
        return SettlementResult("BUST", -bet)

    player_bj = player_hand.is_blackjack
    if player_bj and dealer_has_blackjack:
        return SettlementResult("PUSH (both blackjack)", 0)
    if player_bj:
        win = bet * blackjack_payout_numerator // blackjack_payout_denominator
        return SettlementResult("BLACKJACK", win)
    if dealer_has_blackjack:
        return SettlementResult("LOSE (dealer blackjack)", -bet)
    if dealer_hand.is_bust:
        return SettlementResult("WIN (dealer bust)", bet)
    if player_hand.value > dealer_hand.value:
        return SettlementResult("WIN", bet)
    if player_hand.value < dealer_hand.value:
        return SettlementResult("LOSE", -bet)
    return SettlementResult("PUSH", 0)


def settle_insurance(insurance_bet: int, dealer_has_blackjack: bool) -> int:
    if insurance_bet <= 0:
        return 0
    if dealer_has_blackjack:
        return insurance_bet * 2
    return -insurance_bet
