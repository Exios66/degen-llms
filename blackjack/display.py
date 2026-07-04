from __future__ import annotations

import sys

from blackjack.cards import Card
from blackjack.config import GameConfig
from blackjack.dealer import Dealer
from blackjack.hand import Hand
from blackjack.player import Player
from blackjack.rules import Action


class Colors:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    GREEN = "\033[32m"
    RED = "\033[31m"
    YELLOW = "\033[33m"
    CYAN = "\033[36m"
    DIM = "\033[2m"


def _c(text: str, code: str, enabled: bool) -> str:
    if not enabled:
        return text
    return f"{code}{text}{Colors.RESET}"


def format_card(card: Card, config: GameConfig) -> str:
    label = card.label(config.use_unicode)
    if config.use_color:
        if card.suit.value in ("hearts", "diamonds"):
            return _c(label, Colors.RED, True)
    return label


def format_hidden_card(config: GameConfig) -> str:
    label = "[?]" if config.use_unicode else "[??]"
    return _c(label, Colors.DIM, config.use_color)


def format_hand(cards: list[Card], config: GameConfig, hide_second: bool = False) -> str:
    if not cards:
        return ""
    parts: list[str] = []
    for i, card in enumerate(cards):
        if hide_second and i == 1:
            parts.append(format_hidden_card(config))
        else:
            parts.append(format_card(card, config))
    return " ".join(parts)


class Display:
    def __init__(self, config: GameConfig) -> None:
        self.config = config
        self._out = sys.stdout

    def print(self, text: str = "") -> None:
        print(text, file=self._out)

    def banner(self, title: str) -> None:
        line = "=" * max(20, len(title) + 4)
        self.print(_c(line, Colors.CYAN, self.config.use_color))
        self.print(_c(f"  {title}  ", Colors.BOLD + Colors.CYAN, self.config.use_color))
        self.print(_c(line, Colors.CYAN, self.config.use_color))

    def status_bar(self, bankroll: int) -> None:
        cfg = self.config
        self.print(
            f"Bankroll: ${_fmt(bankroll)} | "
            f"Min: ${_fmt(cfg.min_bet)} | Max: ${_fmt(cfg.max_bet)} | "
            f"Shoe: {cfg.num_decks} deck{'s' if cfg.num_decks != 1 else ''} | "
            f"Dealer: {'H17' if cfg.dealer_hits_soft_17 else 'S17'}"
        )

    def shuffle_notice(self, shuffle_id: str | None) -> None:
        msg = "Shuffling shoe..."
        if self.config.verbose_shuffle and shuffle_id:
            msg += f" (id: {shuffle_id})"
        self.print(_c(msg, Colors.YELLOW, self.config.use_color))

    def show_table(
        self,
        players: list[Player],
        dealer: Dealer,
        *,
        reveal_dealer: bool = False,
        highlight_seat: int | None = None,
    ) -> None:
        self.print()
        for player in sorted(players, key=lambda p: p.seat):
            marker = ">>" if player.seat == highlight_seat else "  "
            for idx, hand in enumerate(player.round_state.hands):
                bet = hand.bet
                cards = format_hand(hand.cards, self.config)
                val = hand.display_value()
                suffix = ""
                if hand.is_surrendered:
                    suffix = " [surrendered]"
                elif hand.is_bust:
                    suffix = " [BUST]"
                elif hand.is_blackjack:
                    suffix = " [BLACKJACK]"
                label = player.name if idx == 0 else f"{player.name} hand {idx + 1}"
                self.print(
                    f"{marker} Seat {player.seat} {label} (${_fmt(player.bankroll)}): "
                    f"bet ${_fmt(bet)} — {cards} ({val}){suffix}"
                )

        up = dealer.up_card
        if up:
            if reveal_dealer or dealer.hole_revealed:
                cards = format_hand(dealer.hand.cards, self.config)
                val = dealer.hand.display_value()
                self.print(f"   Dealer: {cards} ({val})")
            else:
                visible = format_card(up, self.config)
                hidden = format_hidden_card(self.config)
                val = up.value
                self.print(f"   Dealer: {visible} {hidden} ({val}+)")
        self.print()

    def show_round_results(self, lines: list[str]) -> None:
        self.banner("RESULTS")
        for line in lines:
            if line.startswith("+"):
                self.print(_c(line, Colors.GREEN, self.config.use_color))
            elif line.startswith("-") or "LOSE" in line or "BUST" in line:
                self.print(_c(line, Colors.RED, self.config.use_color))
            else:
                self.print(line)

    def prompt_bet(self, bankroll: int, config: GameConfig) -> int:
        while True:
            raw = input(
                f"Place bet (${config.min_bet}-${config.max_bet}, bankroll ${_fmt(bankroll)}): "
            ).strip()
            if raw.lower() in {"q", "quit", "leave"}:
                return 0
            try:
                amount = int(raw)
            except ValueError:
                self.print("Enter a whole-dollar amount.")
                continue
            if amount < config.min_bet:
                self.print(f"Minimum bet is ${config.min_bet}.")
                continue
            if amount > config.max_bet:
                self.print(f"Maximum bet is ${config.max_bet}.")
                continue
            if amount > bankroll:
                self.print("Insufficient bankroll.")
                continue
            return amount

    def prompt_insurance(self, max_amount: int) -> bool:
        while True:
            raw = input(f"Insurance (up to ${_fmt(max_amount)})? (y/n): ").strip().lower()
            if raw in {"y", "yes"}:
                return True
            if raw in {"n", "no", ""}:
                return False
            self.print("Please enter y or n.")

    def prompt_action(self, hand: Hand, legal: set[Action], is_first_action: bool) -> Action:
        shortcuts = {
            Action.HIT: "h",
            Action.STAND: "s",
            Action.DOUBLE: "d",
            Action.SPLIT: "p",
            Action.SURRENDER: "u",
        }
        labels = []
        for action in [Action.HIT, Action.STAND, Action.DOUBLE, Action.SPLIT, Action.SURRENDER]:
            if action in legal:
                labels.append(f"({shortcuts[action]}){action.name.lower()}")
        prompt = f"Your turn [{hand.display_value()}]: {' '.join(labels)} → "
        action_map = {shortcuts[a]: a for a in legal if a in shortcuts}
        while True:
            raw = input(prompt).strip().lower()
            if not raw and Action.STAND in legal:
                return Action.STAND
            if raw in action_map:
                return action_map[raw]
            full = raw.upper()
            try:
                return Action[full]
            except KeyError:
                self.print("Invalid action.")

    def announce_action(self, player_name: str, action: Action) -> None:
        self.print(f"{player_name} {action.name.lower()}s.")

    def prompt_continue(self) -> bool:
        raw = input("Play another hand? (y/n): ").strip().lower()
        return raw in {"y", "yes", ""}

    def prompt_rebuy(self, min_bet: int) -> bool:
        raw = input(f"Out of funds. Rebuy ${_fmt(min_bet * 50)}? (y/n): ").strip().lower()
        return raw in {"y", "yes"}


def _fmt(amount: int) -> str:
    return f"{amount:,}"
