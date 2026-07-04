from __future__ import annotations

from typing import TYPE_CHECKING

from mandalay_bay import CASINO_NAME
from mandalay_bay.activities.registry import ACTIVITIES_BY_ID, ALL_ACTIVITIES, FLOOR_ORDER
from mandalay_bay.chips import ChipTransaction
from mandalay_bay.display import TerminalUI, fmt_chips
from mandalay_bay.session import PlayerSession

if TYPE_CHECKING:
    from mandalay_bay.saves import SaveLibrary


def _autosave(session: PlayerSession, library: SaveLibrary | None) -> None:
    if library is not None and session.slot_id is not None:
        library.save_slot(session)


def run_cashier(session: PlayerSession, ui: TerminalUI) -> None:
    ui.banner("Cashier")
    ui.chip_line(session.wallet.balance)
    choice = ui.menu_choice(
        [
            "Buy chips ($500 bundle)",
            "Buy custom amount",
            "Cash out chips",
            "View transaction ledger",
        ],
        title="Chip window:",
    )
    if choice == 0:
        return
    if choice == 1:
        session.wallet.buy_in(500)
        ui.success(f"Purchased {fmt_chips(500)}. Balance: {fmt_chips(session.wallet.balance)}")
    elif choice == 2:
        amount = ui.prompt_int("Amount to buy", 50, 100_000, default=500)
        session.wallet.buy_in(amount)
        ui.success(f"Purchased {fmt_chips(amount)}. Balance: {fmt_chips(session.wallet.balance)}")
    elif choice == 3:
        amount = ui.prompt_int("Amount to cash out", 1, session.wallet.balance, default=session.wallet.balance)
        if session.wallet.cash_out(amount):
            ui.success(f"Cashed out {fmt_chips(amount)}. Balance: {fmt_chips(session.wallet.balance)}")
        else:
            ui.error("Cash out failed.")
    elif choice == 4:
        _show_ledger(session, ui)
    ui.pause()


def _show_ledger(session: PlayerSession, ui: TerminalUI) -> None:
    txs: list[ChipTransaction] = session.wallet.recent_transactions(20)
    if not txs:
        ui.dim("No transactions yet.")
        return
    ui.print("\n--- Recent Transactions ---")
    for tx in reversed(txs):
        sign = "+" if tx.amount >= 0 else ""
        ui.print(
            f"  {tx.timestamp.strftime('%H:%M:%S')} | {tx.activity:12} | "
            f"{sign}{tx.amount:,} | bal {tx.balance_after:,} | {tx.description}"
        )


def run_stats(session: PlayerSession, ui: TerminalUI) -> None:
    ui.banner("Player Stats")
    ui.print(f"Player: {session.player_name}")
    ui.chip_line(session.wallet.balance)
    ui.print(f"Session net (excl. buy-ins): {session.wallet.net_session:+,} chips\n")
    if not session.activity_stats:
        ui.dim("No activity history yet.")
    else:
        for activity_id, stats in session.activity_stats.items():
            info = ACTIVITIES_BY_ID.get(activity_id)
            name = info.name if info else activity_id
            ui.print(
                f"  {name}: {stats.visits} visit(s), "
                f"{stats.hands_or_bets} bet(s), net {stats.net_winnings:+,} chips"
            )
    ui.pause()


def run_floor(session: PlayerSession, ui: TerminalUI, floor: str) -> None:
    activities = [a for a in ALL_ACTIVITIES if a.info.floor == floor]
    if not activities:
        ui.error("Nothing open on this floor.")
        ui.pause()
        return

    options = [f"{a.info.name} — {a.info.description} (min {a.info.min_bet} chips)" for a in activities]
    choice = ui.menu_choice(options, title=f"{floor}:")
    if choice == 0:
        return
    activities[choice - 1].run(session, ui)


def run_hub(session: PlayerSession, ui: TerminalUI, *, library=None) -> None:
    while True:
        ui.print()
        ui.banner(CASINO_NAME)
        if session.slot_id is not None:
            ui.dim(f"Save: {session.slot_label or f'Slot {session.slot_id}'}")
        ui.print(f"Welcome, {session.player_name}")
        ui.chip_line(session.wallet.balance)
        ui.print()

        floors = FLOOR_ORDER + ["Cashier", "Player Stats", "Save Game", "Leave Casino"]
        choice = ui.menu_choice(
            [f"Explore {f}" if f in FLOOR_ORDER else f for f in floors],
            title="Choose your adventure:",
        )
        if choice == 0:
            continue
        if choice <= len(FLOOR_ORDER):
            run_floor(session, ui, FLOOR_ORDER[choice - 1])
            _autosave(session, library)
        elif choice == len(FLOOR_ORDER) + 1:
            run_cashier(session, ui)
            _autosave(session, library)
        elif choice == len(FLOOR_ORDER) + 2:
            run_stats(session, ui)
        elif choice == len(FLOOR_ORDER) + 3:
            if library is not None and session.slot_id is not None:
                library.save_slot(session)
                ui.success(f"Game saved to {session.slot_label or f'Slot {session.slot_id}'}.")
            else:
                ui.dim("No save slot active (use --no-save or pick a slot at entry).")
            ui.pause()
        else:
            if ui.prompt_yes_no("Leave The Mandalay Bay?", default=False):
                _autosave(session, library)
                ui.print(f"\nThanks for visiting {CASINO_NAME}. Final balance: {fmt_chips(session.wallet.balance)}")
                break
