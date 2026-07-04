from __future__ import annotations

import argparse
import sys

from blackjack.cards import Shoe
from blackjack.config import GameConfig, make_bot_names, quick_play_config
from blackjack.display import Display
from blackjack.table import Table


RULES_TEXT = """
BLACKJACK RULES (defaults)
==========================
- Shoe: 6 decks (1-8 configurable), shuffled with OS CSPRNG (secrets.SystemRandom)
- Dealer hits soft 17 (H17); stands on hard 17+
- Blackjack (natural 21) pays 3:2
- Double on any two cards; double after split allowed
- Split up to 3 times (4 hands); split aces receive one card each
- Insurance when dealer shows Ace: pays 2:1, max half of original bet
- Late surrender: forfeit half bet before other actions
- Push on ties; both blackjacks push
- Dealer peeks for blackjack when showing Ace or 10-value card

CONTROLS
========
Betting: enter dollar amount (or q to leave)
Actions: (h)it (s)tand (d)ouble (p)split (u)surrender
Insurance: y/n
"""


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Casino-faithful blackjack CLI")
    parser.add_argument("--bankroll", type=int, help="Starting bankroll")
    parser.add_argument("--min-bet", type=int, help="Minimum bet")
    parser.add_argument("--max-bet", type=int, help="Maximum bet")
    parser.add_argument("--decks", type=int, choices=range(1, 9), help="Number of decks (1-8)")
    parser.add_argument("--bots", type=int, choices=range(0, 7), help="Simulated players (0-6)")
    parser.add_argument("--seat", type=int, help="Your seat number at the table")
    parser.add_argument("--s17", action="store_true", help="Dealer stands on soft 17")
    parser.add_argument("--rounds", type=int, help="Play N rounds then exit (auto-bet min)")
    parser.add_argument("--no-color", action="store_true", help="Disable ANSI colors")
    parser.add_argument("--ascii", action="store_true", help="ASCII card symbols")
    parser.add_argument("--verbose-shuffle", action="store_true", help="Print shoe shuffle id")
    parser.add_argument("--quick", action="store_true", help="Skip menu, start quick play")
    return parser


def apply_args(config: GameConfig, args: argparse.Namespace) -> GameConfig:
    if args.bankroll is not None:
        config.starting_bankroll = args.bankroll
    if args.min_bet is not None:
        config.min_bet = args.min_bet
    if args.max_bet is not None:
        config.max_bet = args.max_bet
    if args.decks is not None:
        config.num_decks = args.decks
    if args.bots is not None:
        config.num_bots = args.bots
        config.bot_names = make_bot_names(args.bots)
    if args.seat is not None:
        config.human_seat = args.seat
    if args.s17:
        config.dealer_hits_soft_17 = False
    config.use_color = not args.no_color
    config.use_unicode = not args.ascii
    config.verbose_shuffle = args.verbose_shuffle
    return config


def prompt_int(prompt: str, low: int, high: int, default: int) -> int:
    while True:
        raw = input(f"{prompt} [{default}]: ").strip()
        if not raw:
            return default
        try:
            value = int(raw)
        except ValueError:
            print("Enter a number.")
            continue
        if low <= value <= high:
            return value
        print(f"Enter a value between {low} and {high}.")


def custom_game_wizard() -> GameConfig:
    print("\n--- Custom Game ---")
    mode = input("Mode: (1) solo  (2) table [1]: ").strip() or "1"
    if mode == "2":
        num_bots = prompt_int("Number of simulated players (1-6)", 1, 6, 2)
        total = num_bots + 1
        human_seat = prompt_int(f"Your seat (1-{total})", 1, total, min(2, total))
        bot_names = make_bot_names(num_bots)
    else:
        num_bots = 0
        human_seat = 1
        bot_names = []

    bankroll = prompt_int("Starting bankroll", 50, 1_000_000, 500)
    min_bet = prompt_int("Minimum bet", 1, bankroll, 10)
    max_bet = prompt_int("Maximum bet", min_bet, bankroll, min(100, bankroll))
    num_decks = prompt_int("Number of decks (1-8)", 1, 8, 6)
    dealer = input("Dealer rule: (1) H17  (2) S17 [1]: ").strip() or "1"

    return GameConfig(
        starting_bankroll=bankroll,
        min_bet=min_bet,
        max_bet=max_bet,
        num_decks=num_decks,
        dealer_hits_soft_17=dealer != "2",
        num_bots=num_bots,
        human_seat=human_seat,
        bot_names=bot_names,
    )


def run_game(config: GameConfig, *, max_rounds: int | None = None) -> None:
    display = Display(config)
    shoe = Shoe(num_decks=config.num_decks, verbose_shuffle=config.verbose_shuffle)
    table = Table.from_config(config, display, shoe)
    human = table.human()
    rounds_played = 0

    display.banner("BLACKJACK")
    display.status_bar(human.bankroll)
    if config.verbose_shuffle and shoe.last_shuffle_id:
        display.shuffle_notice(shoe.last_shuffle_id)

    while True:
        if human.bankroll < config.min_bet:
            if display.prompt_rebuy(config.min_bet):
                human.bankroll = config.min_bet * 50
                display.print(f"Rebuy successful. Bankroll: ${human.bankroll:,}")
            else:
                display.print("Thanks for playing!")
                break

        prev_remaining = shoe.remaining
        outcome = table.play_round()
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
            display.print("Thanks for playing!")
            break


def main_menu(args: argparse.Namespace) -> GameConfig | None:
    if args.quick or any(
        v is not None
        for v in (args.bankroll, args.min_bet, args.max_bet, args.decks, args.bots, args.rounds)
    ):
        config = quick_play_config()
        return apply_args(config, args)

    while True:
        print("\n=== BLACKJACK ===")
        print("1) Quick play")
        print("2) Custom game")
        print("3) Rules")
        print("4) Quit")
        choice = input("Choose: ").strip()
        if choice == "1":
            return apply_args(quick_play_config(), args)
        if choice == "2":
            config = custom_game_wizard()
            return apply_args(config, args)
        if choice == "3":
            print(RULES_TEXT)
        if choice in {"4", "q", "quit"}:
            return None
        print("Invalid choice.")


def main(argv: list[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    config = main_menu(args)
    if config is None:
        sys.exit(0)
    try:
        run_game(config, max_rounds=args.rounds)
    except KeyboardInterrupt:
        print("\nInterrupted. Goodbye!")
        sys.exit(0)


if __name__ == "__main__":
    main()
