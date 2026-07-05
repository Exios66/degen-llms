from __future__ import annotations

import argparse
import sys
from pathlib import Path

from mandalay_bay import CASINO_NAME
from mandalay_bay.chips import ChipWallet
from mandalay_bay.display import TerminalUI
from mandalay_bay.hub import run_hub
from mandalay_bay.casino_time import format_casino_time_in_game
from mandalay_bay.saves import SaveLibrary, default_save_dir, run_save_picker
from mandalay_bay.session import PlayerSession


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=f"{CASINO_NAME} — digital casino adventure (blackjack, slots, sports book)"
    )
    parser.add_argument("--chips", type=int, default=1000, help="Starting chip balance for new saves")
    parser.add_argument("--name", type=str, default="Guest", help="Default player name for new saves")
    parser.add_argument("--slot", type=int, choices=range(1, 6), help="Load save slot 1-5 directly")
    parser.add_argument("--new-save", "--new", dest="new_save", action="store_true", help="With --slot, create a new save")
    parser.add_argument("--no-save", action="store_true", help="Play without saving (ephemeral session)")
    parser.add_argument("--list-saves", action="store_true", help="List save library and exit")
    parser.add_argument("--save-dir", type=str, help="Directory for save library files")
    parser.add_argument("--no-color", action="store_true", help="Disable ANSI colors")
    parser.add_argument("--ascii", action="store_true", help="ASCII symbols instead of Unicode")
    parser.add_argument("--no-intro", action="store_true", help="Skip welcome screen")
    parser.add_argument("--save-label", type=str, help="Label when creating save via --slot --new-save")
    return parser


def resolve_save_dir(args: argparse.Namespace) -> Path:
    if args.save_dir:
        return Path(args.save_dir).expanduser()
    return default_save_dir()


def format_save_library(library: SaveLibrary) -> str:
    lines = ["Save Library (most recent first):", ""]
    for entry in library.recent_slots():
        lines.append(
            f"  Slot {entry.slot_id}: {entry.label} — {entry.player_name}, "
            f"{entry.balance:,} chips · {format_casino_time_in_game(entry.casino_time_ms)}"
        )
    for slot in library.list_slots():
        if not slot.occupied and slot.slot_id not in {e.slot_id for e in library.recent_slots()}:
            lines.append(f"  Slot {slot.slot_id}: [Empty]")
    lines.append("")
    lines.append(f"Save directory: {library.save_dir}")
    return "\n".join(lines)


def resolve_session(args: argparse.Namespace, ui: TerminalUI, library: SaveLibrary) -> PlayerSession | None:
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
            occupied = library.load_slot(args.slot) is not None
            if occupied and not ui.prompt_yes_no(f"Overwrite save in slot {args.slot}?", default=False):
                return None
            if occupied:
                library.delete_slot(args.slot)
            return library.create_session(
                args.slot,
                player_name=args.name,
                starting_chips=max(0, args.chips),
                label=args.save_label or f"Slot {args.slot}",
                use_color=use_color,
                use_unicode=use_unicode,
            )
        loaded = library.load_slot(args.slot)
        if loaded is None:
            ui.error(f"Slot {args.slot} is empty. Use --slot {args.slot} --new-save to create a save.")
            return None
        loaded.use_color = use_color
        loaded.use_unicode = use_unicode
        return loaded

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
    library = SaveLibrary(save_dir=resolve_save_dir(args))

    if args.list_saves:
        print(format_save_library(library))
        sys.exit(0)

    ui = TerminalUI(use_color=not args.no_color)
    session = resolve_session(args, ui, library)
    if session is None:
        sys.exit(0)

    try:
        run_hub(
            session,
            ui,
            library=library if not args.no_save else None,
            show_intro=not args.no_intro,
        )
    except KeyboardInterrupt:
        if session.has_save_slot and not args.no_save:
            library.save_slot(session)
            print(f"\n\nProgress saved to slot {session.slot_id}. Balance: ${session.wallet.balance:,}")
        else:
            print(f"\n\nLeaving {CASINO_NAME}. Balance: ${session.wallet.balance:,}")
        sys.exit(0)


if __name__ == "__main__":
    main()
