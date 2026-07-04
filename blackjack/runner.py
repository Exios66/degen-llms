from __future__ import annotations

from mandalay_bay.chips import ChipWallet
from blackjack.cards import Shoe
from blackjack.config import GameConfig
from blackjack.display import Display
from blackjack.table import Table


def run_casino_blackjack(
    config: GameConfig,
    wallet: ChipWallet,
    *,
    activity_id: str = "blackjack",
    max_rounds: int | None = None,
) -> int:
    """Play blackjack using the shared chip wallet. Returns net chips won/lost."""
    starting_chips = wallet.balance
    config = _config_with_bankroll(config, starting_chips)

    display = Display(config)
    shoe = Shoe(num_decks=config.num_decks, verbose_shuffle=config.verbose_shuffle)
    table = Table.from_config(config, display, shoe)
    human = table.human()
    human.bankroll = starting_chips
    rounds_played = 0

    display.banner("BLACKJACK")
    display.status_bar(human.bankroll)
    if config.verbose_shuffle and shoe.last_shuffle_id:
        display.shuffle_notice(shoe.last_shuffle_id)

    while True:
        if human.bankroll < config.min_bet:
            display.print("Not enough chips for the table minimum.")
            break

        prev_remaining = shoe.remaining
        chips_before = human.bankroll
        outcome = table.play_round()
        chips_after = human.bankroll
        _sync_wallet(wallet, chips_before, chips_after, activity_id)

        if shoe.remaining > prev_remaining and shoe.shuffle_count > 1:
            display.shuffle_notice(shoe.last_shuffle_id)

        if outcome.round_over_early:
            display.print("Leaving table.")
            break

        rounds_played += 1
        display.status_bar(human.bankroll)

        if max_rounds is not None and rounds_played >= max_rounds:
            display.print(f"Completed {max_rounds} round(s).")
            break

        if not display.prompt_continue():
            break

    wallet.reconcile(human.bankroll, activity_id, "Table exit balance sync")
    return human.bankroll - starting_chips


def _config_with_bankroll(config: GameConfig, bankroll: int) -> GameConfig:
    from dataclasses import replace

    max_bet = min(config.max_bet, bankroll) if bankroll > 0 else config.max_bet
    return replace(config, starting_bankroll=bankroll, max_bet=max(config.min_bet, max_bet))


def _sync_wallet(
    wallet: ChipWallet,
    before: int,
    after: int,
    activity_id: str,
) -> None:
    wallet.apply_delta(after - before, activity_id, "Hand result")
