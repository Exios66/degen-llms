from __future__ import annotations

import argparse
import sys

from mandalay_bay import CASINO_NAME
from mandalay_bay.chips import ChipWallet
from mandalay_bay.display import TerminalUI
from mandalay_bay.hub import run_hub
from mandalay_bay.saves import SaveLibrary, run_save_picker
from mandalay_bay.session import PlayerSession


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=f"{CASINO_NAME} — digital casino adventure (blackjack, slots, sports book)"
    )
    parser.add_argument("--chips", type=int, default=1000, help="Starting chip balance for new saves")
    parser.add_argument("--name", type=str, default="Guest", help="Default player name for new saves")
    parser.add_argument("--slot", type=int, choices=range(1, 6), help="Load save slot 1-5 directly (skip picker)")
    parser.add_argument("--new-save", action="store_true", help="With --slot, create a new save in that slot")
    parser.add_argument("--no-save", action="store_true", help="Play without saving (ephemeral session)")
    parser.add_argument("--no-color", action="store_true", help="Disable ANSI colors")
    parser.add_argument("--ascii", action="store_true", help="ASCII symbols instead of Unicode")
    return parser


def _resolve_session(args: argparse.Namespace, ui: TerminalUI, library: SaveLibrary) -> PlayerSession | None:
    use_color = not args.no_color
    use_unicode = not args.ascii

    if args.no_save:
        return PlayerSession(
            player_name=args.name,
            wallet=ChipWallet(balance=max(0, args.chips)),
            use_color=use_color,
            use_unicode=use_unicode,
        )

    if args.slot is not None:
        if args.new_save:
            return library.create_session(
                args.slot,
                player_name=args.name,
                starting_chips=max(0, args.chips),
                use_color=use_color,
                use_unicode=use_unicode,
            )
        loaded = library.load_slot(args.slot)
        if loaded is not None:
            loaded.use_color = use_color
            loaded.use_unicode = use_unicode
            return loaded
        ui.error(f"Slot {args.slot} is empty. Use --new-save to create a save there.")
        return None

    return run_save_picker(
        ui,
        library,
        default_name=args.name,
        default_chips=max(0, args.chips),
        use_color=use_color,
        use_unicode=use_unicode,
    )


def main(argv: list[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    library = SaveLibrary()
    ui = TerminalUI(use_color=not args.no_color)

    session = _resolve_session(args, ui, library)
    if session is None:
        sys.exit(0)

    try:
        run_hub(session, ui, library=library if not args.no_save else None)
    except KeyboardInterrupt:
        if session.slot_id is not None:
            library.save_slot(session)
        print(f"\n\nLeaving {CASINO_NAME}. Balance: ${session.wallet.balance:,}")
        sys.exit(0)


if __name__ == "__main__":
    main()
