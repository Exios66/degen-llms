from __future__ import annotations

import argparse
import sys
from pathlib import Path

from mandalay_bay import CASINO_NAME
from mandalay_bay.display import TerminalUI
from mandalay_bay.hub import run_hub
from mandalay_bay.save_menu import format_save_library, run_save_selector
from mandalay_bay.saves import (
    DEFAULT_STARTING_CHIPS,
    SaveLibrary,
    create_new_session,
    default_save_dir,
    load_session,
    save_session,
)
from mandalay_bay.session import PlayerSession


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=f"{CASINO_NAME} — digital casino adventure (blackjack, slots, sports book)"
    )
    parser.add_argument("--chips", type=int, default=DEFAULT_STARTING_CHIPS, help="Starting chips for new saves")
    parser.add_argument("--name", type=str, default="Guest", help="Default player name for new saves")
    parser.add_argument("--no-color", action="store_true", help="Disable ANSI colors")
    parser.add_argument("--ascii", action="store_true", help="ASCII symbols instead of Unicode")
    parser.add_argument("--no-intro", action="store_true", help="Skip welcome screen")
    parser.add_argument("--save-dir", type=str, help="Directory for save library files")
    parser.add_argument("--slot", type=int, choices=range(1, 6), help="Load save slot 1-5 directly")
    parser.add_argument("--new", action="store_true", help="With --slot, create a new save in that slot")
    parser.add_argument("--list-saves", action="store_true", help="List save library and exit")
    parser.add_argument("--save-label", type=str, help="Label when creating save via --slot --new")
    return parser


def resolve_save_dir(args: argparse.Namespace) -> Path:
    if args.save_dir:
        return Path(args.save_dir).expanduser()
    return default_save_dir()


def load_or_create_from_cli(
    args: argparse.Namespace,
    library: SaveLibrary,
    ui: TerminalUI,
) -> PlayerSession | None:
    if args.slot is None:
        return None

    use_color = not args.no_color
    use_unicode = not args.ascii
    summary = library.slots.get(args.slot)

    if args.new or (summary and summary.is_empty):
        if summary and not summary.is_empty:
            if not args.new:
                ui.error(f"Slot {args.slot} is occupied. Use --new to overwrite or pick another slot.")
                return None
            if not ui.prompt_yes_no(f"Overwrite existing save in slot {args.slot}?", default=False):
                return None
            library.delete_slot(args.slot)

        label = args.save_label or f"Save {args.slot}"
        return create_new_session(
            library,
            args.slot,
            player_name=args.name,
            starting_chips=max(0, args.chips),
            use_color=use_color,
            use_unicode=use_unicode,
            slot_label=label,
        )

    if summary and summary.is_empty:
        ui.error(f"Slot {args.slot} is empty. Use --slot {args.slot} --new to create a save.")
        return None

    return load_session(library, args.slot)


def main(argv: list[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    save_dir = resolve_save_dir(args)
    library = SaveLibrary.load(save_dir)

    if args.list_saves:
        print(format_save_library(library))
        sys.exit(0)

    ui = TerminalUI(use_color=not args.no_color)
    session: PlayerSession | None = None

    try:
        session = load_or_create_from_cli(args, library, ui)
        if session is None and args.slot is not None:
            sys.exit(1)

        if session is None:
            session = run_save_selector(
                ui,
                library,
                default_starting_chips=max(0, args.chips),
                use_color=not args.no_color,
                use_unicode=not args.ascii,
                default_player_name=args.name,
            )
            if session is None:
                ui.print("Goodbye!")
                sys.exit(0)

        run_hub(session, ui, library=library, show_intro=not args.no_intro)
    except KeyboardInterrupt:
        if session and session.has_save_slot:
            save_session(library, session)
            print(f"\n\nProgress saved to slot {session.slot_id}. Balance: ${session.wallet.balance:,}")
        else:
            print(f"\n\nLeaving {CASINO_NAME}.")
        sys.exit(0)


if __name__ == "__main__":
    main()
