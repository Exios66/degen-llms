from __future__ import annotations

from mandalay_bay.display import TerminalUI, fmt_chips
from mandalay_bay.saves import (
    DEFAULT_STARTING_CHIPS,
    MAX_SAVE_SLOTS,
    SaveLibrary,
    SaveSlotSummary,
    create_new_session,
    load_session,
    save_session,
)
from mandalay_bay.session import PlayerSession


def format_save_library(library: SaveLibrary) -> str:
    lines = ["Save Library (most recent first):", ""]
    for summary in library.ordered_summaries():
        lines.append(f"  {summary.display_line}")
    lines.append("")
    lines.append(f"Save directory: {library.save_dir}")
    return "\n".join(lines)


def run_save_selector(
    ui: TerminalUI,
    library: SaveLibrary,
    *,
    default_starting_chips: int = DEFAULT_STARTING_CHIPS,
    use_color: bool = True,
    use_unicode: bool = True,
    default_player_name: str = "Guest",
) -> PlayerSession | None:
    """Interactive save slot selection when entering the casino."""
    while True:
        ui.banner("Save Library")
        ui.print("Select a save slot to load or create a new game.")
        ui.dim(f"Saves stored at: {library.save_dir}")
        ui.print()

        summaries = library.ordered_summaries()
        for summary in summaries:
            ui.print(f"  {summary.display_line}")

        ui.print()
        choice = ui.menu_choice(
            [
                "Load a save slot",
                "Create new save in empty slot",
                "Delete a save slot",
                "Refresh library",
                "Exit without playing",
            ],
            title="Save options:",
            allow_back=False,
        )
        if choice == 0:
            continue
        if choice == 1:
            session = _load_slot(ui, library)
            if session:
                return session
        elif choice == 2:
            session = _create_slot(
                ui,
                library,
                default_starting_chips=default_starting_chips,
                use_color=use_color,
                use_unicode=use_unicode,
                default_player_name=default_player_name,
            )
            if session:
                return session
        elif choice == 3:
            _delete_slot(ui, library)
        elif choice == 4:
            library = SaveLibrary.load(library.save_dir)
            ui.success("Save library refreshed.")
        else:
            return None


def _load_slot(ui: TerminalUI, library: SaveLibrary) -> PlayerSession | None:
    occupied = [s for s in library.ordered_summaries() if not s.is_empty]
    if not occupied:
        ui.error("No saved games yet. Create a new save first.")
        ui.pause()
        return None

    ui.print("\nOccupied slots (most recent first):")
    slot_map: dict[int, SaveSlotSummary] = {}
    for i, summary in enumerate(occupied, start=1):
        ui.print(f"  {i}) {summary.display_line}")
        slot_map[i] = summary

    pick = ui.prompt_int("Slot to load", 1, len(occupied), default=1)
    summary = slot_map[pick]
    try:
        session = load_session(library, summary.slot_id)
    except (FileNotFoundError, ValueError, KeyError) as exc:
        ui.error(f"Could not load slot {summary.slot_id}: {exc}")
        ui.pause()
        return None

    ui.success(
        f"Loaded {session.slot_label} — {session.player_name} "
        f"with {fmt_chips(session.wallet.balance)}"
    )
    ui.pause()
    return session


def _create_slot(
    ui: TerminalUI,
    library: SaveLibrary,
    *,
    default_starting_chips: int,
    use_color: bool,
    use_unicode: bool,
    default_player_name: str,
) -> PlayerSession | None:
    empty = [s for s in library.ordered_summaries() if s.is_empty]
    if not empty:
        ui.error(f"All {MAX_SAVE_SLOTS} save slots are full. Delete a slot to create a new one.")
        ui.pause()
        return None

    ui.print("\nEmpty slots:")
    slot_map: dict[int, int] = {}
    for i, summary in enumerate(empty, start=1):
        ui.print(f"  {i}) Slot {summary.slot_id}")
        slot_map[i] = summary.slot_id

    pick = ui.prompt_int("Choose empty slot", 1, len(empty), default=1)
    slot_id = slot_map[pick]

    label = ui.prompt(f"Save label [Save {slot_id}]: ") or f"Save {slot_id}"
    name = ui.prompt(f"Player name [{default_player_name}]: ") or default_player_name
    chips = ui.prompt_int(
        "Starting chips",
        100,
        1_000_000,
        default=default_starting_chips,
    )

    session = create_new_session(
        library,
        slot_id,
        player_name=name,
        starting_chips=chips,
        use_color=use_color,
        use_unicode=use_unicode,
        slot_label=label,
    )
    ui.success(f"Created {session.slot_label} for {session.player_name} with {fmt_chips(chips)}")
    ui.pause()
    return session


def _delete_slot(ui: TerminalUI, library: SaveLibrary) -> None:
    occupied = [s for s in library.ordered_summaries() if not s.is_empty]
    if not occupied:
        ui.error("No saves to delete.")
        ui.pause()
        return

    ui.print("\nSelect a save to delete:")
    slot_map: dict[int, SaveSlotSummary] = {}
    for i, summary in enumerate(occupied, start=1):
        ui.print(f"  {i}) {summary.display_line}")
        slot_map[i] = summary

    pick = ui.prompt_int("Slot to delete", 1, len(occupied), default=1)
    summary = slot_map[pick]
    if not ui.prompt_yes_no(f"Delete slot {summary.slot_id} ({summary.label})?", default=False):
        return

    library.delete_slot(summary.slot_id)
    ui.success(f"Deleted slot {summary.slot_id}.")
    ui.pause()
