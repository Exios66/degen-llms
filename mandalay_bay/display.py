from __future__ import annotations

import sys
from typing import Protocol


class Colors:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    GREEN = "\033[32m"
    RED = "\033[31m"
    YELLOW = "\033[33m"
    CYAN = "\033[36m"
    MAGENTA = "\033[35m"
    DIM = "\033[2m"


class CasinoDisplay(Protocol):
    use_color: bool


def _c(text: str, code: str, enabled: bool) -> str:
    if not enabled:
        return text
    return f"{code}{text}{Colors.RESET}"


def fmt_chips(amount: int) -> str:
    return f"${amount:,}"


class TerminalUI:
    def __init__(self, *, use_color: bool = True) -> None:
        self.use_color = use_color
        self._out = sys.stdout

    def print(self, text: str = "") -> None:
        print(text, file=self._out)

    def banner(self, title: str) -> None:
        line = "═" * max(24, len(title) + 4)
        self.print(_c(line, Colors.CYAN, self.use_color))
        self.print(_c(f"  {title}  ", Colors.BOLD + Colors.CYAN, self.use_color))
        self.print(_c(line, Colors.CYAN, self.use_color))

    def subtitle(self, text: str) -> None:
        self.print(_c(text, Colors.MAGENTA, self.use_color))

    def chip_line(self, balance: int) -> None:
        self.print(_c(f"Chips: {fmt_chips(balance)}", Colors.YELLOW + Colors.BOLD, self.use_color))

    def success(self, text: str) -> None:
        self.print(_c(text, Colors.GREEN, self.use_color))

    def error(self, text: str) -> None:
        self.print(_c(text, Colors.RED, self.use_color))

    def dim(self, text: str) -> None:
        self.print(_c(text, Colors.DIM, self.use_color))

    def prompt(self, text: str) -> str:
        return input(text).strip()

    def prompt_int(self, prompt: str, low: int, high: int, default: int | None = None) -> int:
        suffix = f" [{default}]" if default is not None else ""
        while True:
            raw = input(f"{prompt}{suffix}: ").strip()
            if not raw and default is not None:
                return default
            try:
                value = int(raw)
            except ValueError:
                self.error("Enter a whole number.")
                continue
            if low <= value <= high:
                return value
            self.error(f"Enter a value between {low} and {high}.")

    def prompt_yes_no(self, prompt: str, default: bool = True) -> bool:
        hint = "Y/n" if default else "y/N"
        while True:
            raw = input(f"{prompt} ({hint}): ").strip().lower()
            if not raw:
                return default
            if raw in {"y", "yes"}:
                return True
            if raw in {"n", "no"}:
                return False
            self.error("Please enter y or n.")

    def pause(self) -> None:
        input("\nPress Enter to continue...")

    def menu_choice(
        self,
        options: list[str],
        title: str | None = None,
        *,
        allow_back: bool = True,
        back_label: str = "Back",
    ) -> int:
        if title:
            self.subtitle(title)
        for i, option in enumerate(options, start=1):
            self.print(f"  {i}) {option}")
        if allow_back:
            self.print(f"  0) {back_label}")
        while True:
            raw = self.prompt("Choose: ")
            if allow_back and raw == "0":
                return 0
            try:
                choice = int(raw)
            except ValueError:
                self.error("Enter a number from the menu.")
                continue
            if 1 <= choice <= len(options):
                return choice
            self.error("Invalid choice.")
