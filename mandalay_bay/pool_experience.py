"""Mandalay Bay Pool Complex — CLI menus."""

from __future__ import annotations

from mandalay_bay.display import TerminalUI
from mandalay_bay.pool_complex import (
    POOL_EVENTS,
    POOL_ZONES,
    SHARK_SPECIES,
    beach_club_action,
    book_cabana,
    cabana_service,
    ensure_pool_complex,
    enter_beach_club,
    enter_zone,
    get_pool_summary,
    photograph_shark,
    play_catch_wave,
    play_ring_toss,
    soak_hot_tub,
    start_rave_dance,
    submit_rave_move,
)
from mandalay_bay.session import PlayerSession


def run_pool_complex(session: PlayerSession, ui: TerminalUI) -> None:
    ensure_pool_complex(session)
    while True:
        ui.banner("Mandalay Bay — Pool Complex")
        ui.chip_line(session.wallet.balance)
        ui.dim("11 acres · wave pool · cabanas · shark reef · beach club · rave")
        ui.dim(get_pool_summary(session))
        choice = ui.menu_choice(
            [
                "Wave Pool — catch the wave / ring toss",
                "Hot Tubs — soak & gossip",
                "Private Cabanas — book & relax",
                "Shark Reef Aquarium — photo quest",
                "Topless Beach Club — 21+ deck",
                "Beach Rave — dance minigame",
                "Event log",
                "Back to hotel lobby",
            ],
            title="Pool complex:",
        )
        if choice == 0:
            return
        if choice == 1:
            _run_wave_pool(session, ui)
        elif choice == 2:
            _run_hot_tubs(session, ui)
        elif choice == 3:
            _run_cabanas(session, ui)
        elif choice == 4:
            _run_shark_reef(session, ui)
        elif choice == 5:
            _run_beach_club(session, ui)
        elif choice == 6:
            _run_beach_rave(session, ui)
        elif choice == 7:
            _run_pool_events(ui, session)


def _show_result(ui: TerminalUI, res) -> None:
    if res.ok:
        ui.success(res.message)
    else:
        ui.error(res.message)
    ui.pause()


def _run_wave_pool(session: PlayerSession, ui: TerminalUI) -> None:
    enter_zone(session, "wave_pool")
    while True:
        ui.banner("Wave Pool")
        pick = ui.menu_choice(
            ["Catch the wave (timing)", "Ring toss ($10+)", "Back"],
            title="Wave pool:",
        )
        if pick == 0:
            return
        if pick == 1:
            timing = ui.menu_choice(
                ["Jump early", "Ride the crest", "Bail late", "Back"],
                title="Timing:",
            )
            if timing == 0:
                continue
            _show_result(ui, play_catch_wave(session, timing - 1))
        elif pick == 2:
            bet_str = ui.prompt("Bet amount (min 10): ")
            try:
                bet = int(bet_str)
            except ValueError:
                ui.error("Invalid bet.")
                ui.pause()
                continue
            target = ui.menu_choice(
                ["Inner tube", "Lifeguard tower", "Cabana post", "Back"],
                title="Target:",
            )
            if target == 0:
                continue
            _show_result(ui, play_ring_toss(session, bet, target - 1))


def _run_hot_tubs(session: PlayerSession, ui: TerminalUI) -> None:
    enter_zone(session, "hot_tubs")
    pick = ui.menu_choice(
        ["Overhear gossip (Steve Harvey rumor)", "Relax & soak", "Odds challenge", "Back"],
        title="Hot tubs:",
    )
    if pick == 0:
        return
    choices = ["gossip", "relax", "challenge"]
    _show_result(ui, soak_hot_tub(session, choices[pick - 1]))


def _run_cabanas(session: PlayerSession, ui: TerminalUI) -> None:
    enter_zone(session, "cabanas")
    while True:
        pick = ui.menu_choice(
            ["Book cabana ($200)", "Bottle service ($85)", "Nap", "People-watch", "Back"],
            title="Cabanas:",
        )
        if pick == 0:
            return
        if pick == 1:
            _show_result(ui, book_cabana(session))
        elif pick == 2:
            _show_result(ui, cabana_service(session, "bottle"))
        elif pick == 3:
            _show_result(ui, cabana_service(session, "nap"))
        elif pick == 4:
            _show_result(ui, cabana_service(session, "people_watch"))


def _run_shark_reef(session: PlayerSession, ui: TerminalUI) -> None:
    enter_zone(session, "shark_reef")
    labels = [s["label"] for s in SHARK_SPECIES.values()]
    pick = ui.menu_choice(labels + ["Back"], title="Photograph species:")
    if pick == 0:
        return
    species_id = list(SHARK_SPECIES.keys())[pick - 1]
    _show_result(ui, photograph_shark(session, species_id))


def _run_beach_club(session: PlayerSession, ui: TerminalUI) -> None:
    while True:
        pick = ui.menu_choice(
            ["Enter / re-enter (cover $75)", "Pool bar ($18)", "Sun deck", "VIP rope ($50)", "Back"],
            title="Topless Beach Club (21+):",
        )
        if pick == 0:
            return
        if pick == 1:
            _show_result(ui, enter_beach_club(session))
        elif pick == 2:
            _show_result(ui, beach_club_action(session, "bar"))
        elif pick == 3:
            _show_result(ui, beach_club_action(session, "sun_deck"))
        elif pick == 4:
            _show_result(ui, beach_club_action(session, "vip_rope"))


def _run_beach_rave(session: PlayerSession, ui: TerminalUI) -> None:
    enter_zone(session, "beach_rave")
    start_rave_dance(session)
    while True:
        pick = ui.menu_choice(
            ["Fist pump", "Shuffling", "Glow spin", "Back"],
            title="Match the beat:",
        )
        if pick == 0:
            return
        res = submit_rave_move(session, pick - 1)
        _show_result(ui, res)
        if "Sequence hit" in res.message:
            return


def _run_pool_events(ui: TerminalUI, session: PlayerSession) -> None:
    pc = ensure_pool_complex(session)
    ui.banner("Pool Complex Event Log")
    if pc.unlocked_events:
        ui.print("Unlocked:")
        for event_id in pc.unlocked_events:
            evt = POOL_EVENTS.get(event_id, {})
            ui.success(f"  {evt.get('label', event_id)} — {evt.get('narrative', '')}")
    else:
        ui.dim("Nothing unlocked yet.")
    locked = [e for k, e in POOL_EVENTS.items() if k not in pc.unlocked_events]
    if locked:
        ui.print("")
        ui.dim("Still on the table:")
        for evt in locked:
            ui.dim(f"  {evt['label']}")
    ui.pause()
