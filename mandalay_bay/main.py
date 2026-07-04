from __future__ import annotations

import argparse
import sys

from mandalay_bay import CASINO_NAME
from mandalay_bay.chips import ChipWallet
from mandalay_bay.display import TerminalUI
from mandalay_bay.hub import run_hub
from mandalay_bay.session import PlayerSession


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=f"{CASINO_NAME} — digital casino adventure (blackjack, slots, sports book)"
    )
    parser.add_argument("--chips", type=int, default=1000, help="Starting chip balance")
    parser.add_argument("--name", type=str, default="Guest", help="Player name")
    parser.add_argument("--no-color", action="store_true", help="Disable ANSI colors")
    parser.add_argument("--ascii", action="store_true", help="ASCII symbols instead of Unicode")
    return parser


def main(argv: list[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)

    session = PlayerSession(
        player_name=args.name,
        wallet=ChipWallet(balance=max(0, args.chips)),
        use_color=not args.no_color,
        use_unicode=not args.ascii,
    )
    ui = TerminalUI(use_color=session.use_color)

    try:
        run_hub(session, ui)
    except KeyboardInterrupt:
        print(f"\n\nLeaving {CASINO_NAME}. Balance: ${session.wallet.balance:,}")
        sys.exit(0)


if __name__ == "__main__":
    main()
