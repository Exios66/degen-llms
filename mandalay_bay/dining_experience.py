"""CLI experience for resort dining capacity minigame + encounters."""

from __future__ import annotations

from mandalay_bay.dining import (
    DINING_VENUES,
    can_enter_dining,
    create_sitting,
    dining_summary,
    encounter_chance,
    ensure_dining,
    get_venue,
    order_and_consume,
    resolve_encounter,
    settle_sitting,
)
from mandalay_bay.display import TerminalUI
from mandalay_bay.session import PlayerSession


def run_dining_lobby(session: PlayerSession, ui: TerminalUI) -> None:
    ensure_dining(session)
    while True:
        gate = can_enter_dining(session)
        summary = dining_summary(session)
        ui.banner("Resort Dining — How Much Can You Handle?")
        ui.chip_line(session.wallet.balance)
        ui.dim(
            f"Visits {summary['visits']} · Courses {summary['lifetime_courses']} · "
            f"Eggs {summary['eggs']}/{summary['egg_total']}"
        )
        ui.print("Order plates and pours. Pace yourself. Drinks raise encounter odds.")
        ui.print()
        if not gate.ok:
            ui.error(gate.message)
            ui.pause()
            return

        options = [
            f"{v['name']} — {v['type']} ({v['price_range']})"
            for v in DINING_VENUES
        ]
        choice = ui.menu_choice(options + ["Back"], title="Carmen's tables:")
        if choice == 0 or choice == len(options) + 1:
            return
        run_dining_sitting(session, ui, DINING_VENUES[choice - 1]["id"])


def run_dining_sitting(session: PlayerSession, ui: TerminalUI, venue_id: str) -> None:
    venue = get_venue(venue_id)
    if not venue:
        ui.error("Restaurant not found.")
        return
    sitting = create_sitting(venue_id)
    pace = "pace"

    while not sitting.closed:
        ui.banner(f"{venue['name']} — {venue['chef']}")
        ui.chip_line(session.wallet.balance)
        ui.dim(venue["blurb"])
        ui.print(
            f"Fullness {sitting.fullness}/100 · Composure {sitting.composure}/100 · "
            f"Tab ${sitting.tab:,} · Score {sitting.score} · Drinks {sitting.drinks_this_sitting}"
        )
        ui.dim(f"Encounter risk ~{round(encounter_chance(sitting, session) * 100)}%")
        ui.print(sitting.last_message)
        ui.print()

        if sitting.busted:
            result = settle_sitting(session, sitting, tip_percent=18)
            ui.success(result.message) if result.ok else ui.error(result.message)
            ui.pause()
            return

        if sitting.pending_encounter:
            _run_encounter(session, ui, sitting)
            continue

        pace_labels = {
            "pace": "Pace yourself",
            "clean_plate": "Clean the plate",
            "chase_shots": "Chase with shots",
        }
        menu_opts = [f"{item['name']} (${item['price']}) [{item['kind']}]" for item in venue["menu"]]
        menu_opts.append(f"Change pace (now: {pace_labels[pace]})")
        menu_opts.append("Close out tab")
        choice = ui.menu_choice(menu_opts, title="Order:")
        if choice == 0:
            result = settle_sitting(session, sitting, tip_percent=18)
            ui.success(result.message)
            ui.pause()
            return
        if choice == len(venue["menu"]) + 1:
            pace = _pick_pace(ui, pace)
            continue
        if choice == len(venue["menu"]) + 2:
            result = settle_sitting(session, sitting, tip_percent=18)
            ui.success(result.message)
            ui.pause()
            return
        item = venue["menu"][choice - 1]
        result = order_and_consume(session, sitting, item["id"], pace=pace)
        if result.ok:
            ui.success(result.message)
        else:
            ui.error(result.message)
        if result.encounter:
            ui.print()
            ui.dim("Someone approaches the table...")
        ui.pause()


def _pick_pace(ui: TerminalUI, current: str) -> str:
    options = ["Pace yourself", "Clean the plate", "Chase with shots"]
    ids = ["pace", "clean_plate", "chase_shots"]
    choice = ui.menu_choice(options, title=f"Pacing (current: {current}):")
    if choice == 0:
        return current
    return ids[choice - 1]


def _run_encounter(session: PlayerSession, ui: TerminalUI, sitting) -> None:
    enc = sitting.pending_encounter
    assert enc is not None
    ui.banner(enc["title"])
    ui.dim(enc["category"].replace("_", " ").upper())
    ui.print(enc["body"])
    ui.print()
    labels = [c["label"] for c in enc["choices"]]
    choice = ui.menu_choice(labels, title="Respond:")
    if choice == 0:
        choice = 1
    result = resolve_encounter(session, sitting, enc["choices"][choice - 1]["id"])
    ui.success(result.message) if result.ok else ui.error(result.message)
    ui.pause()
