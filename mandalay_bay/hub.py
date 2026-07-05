from __future__ import annotations

from typing import TYPE_CHECKING

from mandalay_bay import CASINO_NAME
from mandalay_bay.activities.registry import ACTIVITIES_BY_ID, ALL_ACTIVITIES, FLOOR_ORDER
from mandalay_bay.chips import ChipTransaction
from mandalay_bay.display import TerminalUI, fmt_chips
from mandalay_bay.help_text import SECTIONS
from mandalay_bay.casino_amenities_experience import run_casino_floor
from mandalay_bay.hotel_experience import run_hotel_lobby
from mandalay_bay.rewards import sync_rewards_from_wallet
from mandalay_bay.rewards_experience import run_rewards_phone
from mandalay_bay.session import PlayerSession

if TYPE_CHECKING:
    from mandalay_bay.saves import SaveLibrary

LOW_BALANCE_THRESHOLD = 50


def _autosave(session: PlayerSession, library: SaveLibrary | None) -> None:
    sync_rewards_from_wallet(session)
    if library is not None and session.has_save_slot:
        library.save_slot(session)


RPG_PAGES_URL = "https://exios66.github.io/degen-llms/rpg/"


def run_rpg_link(session: PlayerSession, ui: TerminalUI) -> None:
    ui.banner("Explore Resort (RPG)")
    ui.print("The pixel RPG open world runs in your web browser.")
    if session.has_save_slot:
        url = f"{RPG_PAGES_URL}?slot={session.slot_id}"
        ui.print(f"\n  {url}")
        ui.dim("Same save slot and chip wallet as this terminal session.")
    else:
        ui.print(f"\n  {RPG_PAGES_URL}?guest=1")
        ui.dim("Guest mode — pick a save slot in the RPG title screen to persist progress.")
    ui.pause()


def show_welcome(session: PlayerSession, ui: TerminalUI) -> None:
    ui.banner(CASINO_NAME)
    ui.print("Welcome to the floor — a choose-your-adventure digital casino.")
    ui.print(f"Your player card: {session.player_name}")
    if session.has_save_slot:
        ui.print(f"Save slot {session.slot_id}: {session.slot_label}")
    ui.chip_line(session.wallet.balance)
    ui.print("\nExplore table games, slots, and the sports book.")
    ui.print("Your chips travel with you. Visit the Cashier anytime.")
    ui.dim("Tip: Select 'Casino Guide' from the lobby for rules and controls.")
    ui.pause()


def run_help(ui: TerminalUI) -> None:
    ui.banner("Casino Guide")
    choice = ui.menu_choice(
        [
            "Overview & navigation",
            "Blackjack rules & controls",
            "Texas Hold'em guide",
            "Roulette guide",
            "Slot machine paytable",
            "Sports book guide",
            "Horse racing guide",
            "Chip economy",
            "Save slots & library",
            "View all sections",
        ],
        title="What would you like to read?",
    )
    if choice == 0:
        return
    if choice == 10:
        for section in SECTIONS.values():
            ui.print(section)
    else:
        keys = list(SECTIONS.keys())
        ui.print(SECTIONS[keys[choice - 1]])
    ui.pause()


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
        if session.wallet.balance <= 0:
            ui.error("You have no chips to cash out.")
        else:
            amount = ui.prompt_int(
                "Amount to cash out",
                1,
                session.wallet.balance,
                default=session.wallet.balance,
            )
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


def run_floor(
    session: PlayerSession,
    ui: TerminalUI,
    floor: str,
    library: SaveLibrary | None = None,
) -> None:
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
    _autosave(session, library)


def _save_game(session: PlayerSession, ui: TerminalUI, library: SaveLibrary | None) -> None:
    if not library or not session.has_save_slot:
        ui.error("No save slot assigned to this session.")
        ui.pause()
        return
    library.save_slot(session)
    ui.success(
        f"Saved slot {session.slot_id} ({session.slot_label}) — "
        f"{fmt_chips(session.wallet.balance)}"
    )
    ui.pause()


def _maybe_low_balance_notice(session: PlayerSession, ui: TerminalUI) -> None:
    if 0 < session.wallet.balance < LOW_BALANCE_THRESHOLD:
        ui.error(f"Low balance ({fmt_chips(session.wallet.balance)}). Visit the Cashier to buy chips.")


def run_hub(
    session: PlayerSession,
    ui: TerminalUI,
    *,
    library: SaveLibrary | None = None,
    show_intro: bool = True,
) -> None:
    if show_intro:
        show_welcome(session, ui)

    while True:
        ui.print()
        ui.banner(CASINO_NAME)
        ui.print(f"Welcome, {session.player_name}")
        if session.has_save_slot:
            ui.dim(f"Save slot {session.slot_id}: {session.slot_label}")
        ui.chip_line(session.wallet.balance)
        _maybe_low_balance_notice(session, ui)
        ui.print()

        lobby_options = (
            [f"Explore {floor}" for floor in FLOOR_ORDER]
            + [
                "Casino Floor — shopping & bars",
                "Cashier",
                "Player Stats",
                "Save Game",
                "Exit to Hotel",
                "MGM Rewards",
                "Explore Resort (RPG)",
                "Casino Guide",
                "Leave Casino",
            ]
        )
        choice = ui.menu_choice(
            lobby_options,
            title="Choose your adventure:",
            allow_back=False,
        )
        if choice == 0:
            continue

        floor_count = len(FLOOR_ORDER)
        if choice <= floor_count:
            run_floor(session, ui, FLOOR_ORDER[choice - 1], library)
        elif choice == floor_count + 1:
            run_casino_floor(session, ui)
            _autosave(session, library)
        elif choice == floor_count + 2:
            run_cashier(session, ui)
            _autosave(session, library)
        elif choice == floor_count + 3:
            run_stats(session, ui)
        elif choice == floor_count + 4:
            _save_game(session, ui, library)
        elif choice == floor_count + 5:
            run_hotel_lobby(session, ui)
            _autosave(session, library)
        elif choice == floor_count + 6:
            run_rewards_phone(session, ui)
            _autosave(session, library)
        elif choice == floor_count + 7:
            run_rpg_link(session, ui)
        elif choice == floor_count + 8:
            run_help(ui)
        else:
            if ui.prompt_yes_no("Leave The Mandalay Bay?", default=False):
                _autosave(session, library)
                if session.has_save_slot:
                    ui.success(f"Progress saved to slot {session.slot_id}.")
                ui.print(f"\nThanks for visiting {CASINO_NAME}. Final balance: {fmt_chips(session.wallet.balance)}")
                break
