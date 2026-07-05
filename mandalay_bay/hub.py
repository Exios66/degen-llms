from __future__ import annotations

from typing import TYPE_CHECKING

from mandalay_bay import CASINO_NAME
from mandalay_bay.activities.registry import ACTIVITIES_BY_ID, ALL_ACTIVITIES, FLOOR_ORDER
from mandalay_bay.chips import ChipTransaction
from mandalay_bay.display import TerminalUI, fmt_chips
from mandalay_bay.help_text import SECTIONS
from mandalay_bay.bank_account import (
    OUTSIDE_EXPENSE_CATEGORIES,
    BankTransaction,
    buy_in_for_session,
    cash_out_to_bank,
    ensure_bank,
    expense_category_label,
    fund_bank_from_outside,
    rename_bank_account,
)
from mandalay_bay.casino_amenities_experience import run_casino_floor
from mandalay_bay.hotel_experience import run_hotel_lobby
from mandalay_bay.rewards import sync_rewards_from_wallet
from mandalay_bay.rewards_experience import run_rewards_phone
from mandalay_bay.session import PlayerSession
from mandalay_bay.casino_time import format_play_time_summary, get_casino_time_ms, start_casino_clock
from mandalay_bay.staff_manifest import (
    clear_staff_override,
    editable_staff_entries,
    update_staff_override,
)

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
        ui.dim(format_play_time_summary(get_casino_time_ms(session)))
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


def _bank_line(session: PlayerSession, ui: TerminalUI) -> None:
    bank = ensure_bank(session)
    ui.dim(f"{bank.account_name}: {fmt_chips(bank.balance)} (off-floor)")


def run_cashier(session: PlayerSession, ui: TerminalUI) -> None:
    ui.banner("Cashier")
    ui.chip_line(session.wallet.balance)
    _bank_line(session, ui)
    choice = ui.menu_choice(
        [
            "Buy chips ($500 bundle)",
            "Buy custom amount",
            "Cash out chips to bank",
            "View floor transaction ledger",
        ],
        title="Chip window:",
    )
    if choice == 0:
        return
    if choice == 1:
        outcome = buy_in_for_session(session, 500, use_outside_funds=True)
        if outcome == "from_bank":
            ui.success(
                f"Purchased {fmt_chips(500)} from {ensure_bank(session).account_name}. "
                f"Floor balance: {fmt_chips(session.wallet.balance)}"
            )
        else:
            ui.success(f"Purchased {fmt_chips(500)} with outside funds. Balance: {fmt_chips(session.wallet.balance)}")
    elif choice == 2:
        amount = ui.prompt_int("Amount to buy", 50, 100_000, default=500)
        bank = ensure_bank(session)
        if bank.balance >= amount:
            outcome = buy_in_for_session(session, amount)
        elif ui.prompt_yes_no(
            f"Only {fmt_chips(bank.balance)} in {bank.account_name}. Use outside funds for the buy-in?",
            default=True,
        ):
            outcome = buy_in_for_session(session, amount, use_outside_funds=True)
        else:
            outcome = "cancelled"
        if outcome == "from_bank":
            ui.success(
                f"Purchased {fmt_chips(amount)} from {bank.account_name}. "
                f"Floor balance: {fmt_chips(session.wallet.balance)}"
            )
        elif outcome == "outside_funds":
            ui.success(f"Purchased {fmt_chips(amount)} with outside funds. Balance: {fmt_chips(session.wallet.balance)}")
        elif outcome != "cancelled":
            ui.error("Buy-in failed.")
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
            bank = ensure_bank(session)
            if cash_out_to_bank(session, amount):
                ui.success(
                    f"Cashed out {fmt_chips(amount)} to {bank.account_name}. "
                    f"Floor balance: {fmt_chips(session.wallet.balance)}"
                )
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


def _show_bank_ledger(session: PlayerSession, ui: TerminalUI) -> None:
    txs: list[BankTransaction] = ensure_bank(session).recent_transactions(20)
    if not txs:
        ui.dim("No bank transactions yet.")
        return
    ui.print("\n--- Recent Bank Transactions ---")
    for tx in reversed(txs):
        sign = "+" if tx.amount >= 0 else ""
        ui.print(
            f"  {tx.timestamp.strftime('%H:%M:%S')} | {tx.category:12} | "
            f"{sign}{tx.amount:,} | bal {tx.balance_after:,} | {tx.description}"
        )


def run_bank_account(session: PlayerSession, ui: TerminalUI) -> None:
    bank = ensure_bank(session)
    ui.banner(bank.account_name)
    ui.print("Your off-strip account — cashed-out chips land here for life outside the casino.")
    ui.chip_line(session.wallet.balance)
    ui.print(f"Bank balance: {fmt_chips(bank.balance)}")
    choice = ui.menu_choice(
        [
            "Deposit outside funds",
            "Pay outside expense",
            "Rename account",
            "View bank ledger",
        ],
        title="Off-strip banking:",
    )
    if choice == 0:
        return
    if choice == 1:
        amount = ui.prompt_int("Amount to deposit", 50, 1_000_000, default=500)
        fund_bank_from_outside(session, amount)
        ui.success(f"Deposited {fmt_chips(amount)}. Bank balance: {fmt_chips(bank.balance)}")
    elif choice == 2:
        if bank.balance <= 0:
            ui.error("Your bank account is empty.")
        else:
            options = [label for _, label in OUTSIDE_EXPENSE_CATEGORIES]
            cat_choice = ui.menu_choice(options, title="Expense category:")
            if cat_choice == 0:
                ui.pause()
                return
            category_id = OUTSIDE_EXPENSE_CATEGORIES[cat_choice - 1][0]
            amount = ui.prompt_int(
                "Amount to spend",
                1,
                bank.balance,
                default=min(100, bank.balance),
            )
            note = ui.prompt("Memo (optional): ").strip()
            label = expense_category_label(category_id)
            description = f"{label}" + (f" — {note}" if note else "")
            if bank.pay_expense(amount, category_id, description):
                ui.success(f"Paid {fmt_chips(amount)} for {label}. Bank balance: {fmt_chips(bank.balance)}")
            else:
                ui.error("Payment failed.")
    elif choice == 3:
        new_name = ui.prompt(f"Account name [{bank.account_name}]: ").strip()
        if new_name:
            rename_bank_account(session, new_name)
            ui.success(f"Account renamed to {session.bank.account_name}.")
    elif choice == 4:
        _show_bank_ledger(session, ui)
    ui.pause()


def run_staff_manifest(session: PlayerSession, ui: TerminalUI) -> None:
    ui.banner("Staff Manifest")
    ui.print("Customize dealer and venue staff names and context for your visit.")
    entries = editable_staff_entries(session)
    while True:
        options = [
            f"{entry['name']} ({entry['category'][:-1]})"
            + (" *" if entry["customized"] else "")
            for entry in entries
        ]
        options.extend(["Reset all customizations", "Done"])
        choice = ui.menu_choice(options, title="Edit staff member:")
        if choice == 0 or choice == len(options):
            break
        if choice == len(options) - 1:
            session.staff_overrides = None
            entries = editable_staff_entries(session)
            ui.success("Restored default staff manifest.")
            continue
        entry = entries[choice - 1]
        ui.print(f"\nEditing: {entry['id']} ({entry['category']})")
        if entry["category"] == "dealers":
            ui.dim(f"Games: {', '.join(entry['games'])}")
        else:
            ui.dim(f"Role: {entry.get('role', 'staff')}")
        new_name = ui.prompt(f"Display name [{entry['name']}]: ")
        if entry["category"] == "dealers":
            new_tagline = ui.prompt(f"Tagline [{entry['tagline']}]: ")
            new_context = ui.prompt(f"Context [{entry['context']}]: ")
            fields: dict[str, str] = {}
            if new_name.strip():
                fields["name"] = new_name
            if new_tagline.strip():
                fields["tagline"] = new_tagline
            if new_context.strip():
                fields["context"] = new_context
            if fields:
                update_staff_override(
                    session,
                    category="dealers",
                    staff_id=entry["id"],
                    fields=fields,
                )
            else:
                clear_staff_override(session, category="dealers", staff_id=entry["id"])
        else:
            new_context = ui.prompt(f"Context [{entry['context']}]: ")
            fields = {}
            if new_name.strip():
                fields["name"] = new_name
            if new_context.strip():
                fields["context"] = new_context
            if fields:
                update_staff_override(
                    session,
                    category="npcs",
                    staff_id=entry["id"],
                    fields=fields,
                )
            else:
                clear_staff_override(session, category="npcs", staff_id=entry["id"])
        entries = editable_staff_entries(session)
        ui.success(f"Updated {entry['id']}.")
    ui.pause()


def run_stats(session: PlayerSession, ui: TerminalUI) -> None:
    ui.banner("Player Stats")
    ui.print(f"Player: {session.player_name}")
    ui.chip_line(session.wallet.balance)
    if session.has_save_slot:
        ui.print(format_play_time_summary(get_casino_time_ms(session)))
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
    if session.has_save_slot:
        start_casino_clock(session)

    while True:
        ui.print()
        ui.banner(CASINO_NAME)
        ui.print(f"Welcome, {session.player_name}")
        if session.has_save_slot:
            ui.dim(f"Save slot {session.slot_id}: {session.slot_label}")
            ui.dim(format_play_time_summary(get_casino_time_ms(session)))
        ui.chip_line(session.wallet.balance)
        _bank_line(session, ui)
        _maybe_low_balance_notice(session, ui)
        ui.print()

        lobby_options = (
            [f"Explore {floor}" for floor in FLOOR_ORDER]
            + [
                "Casino Floor — shopping & bars",
                "Cashier",
                "Off-Strip Bank Account",
                "Staff Manifest",
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
            run_bank_account(session, ui)
            _autosave(session, library)
        elif choice == floor_count + 4:
            run_staff_manifest(session, ui)
            _autosave(session, library)
        elif choice == floor_count + 5:
            run_stats(session, ui)
        elif choice == floor_count + 6:
            _save_game(session, ui, library)
        elif choice == floor_count + 7:
            run_hotel_lobby(session, ui)
            _autosave(session, library)
        elif choice == floor_count + 8:
            run_rewards_phone(session, ui)
            _autosave(session, library)
        elif choice == floor_count + 9:
            run_rpg_link(session, ui)
        elif choice == floor_count + 10:
            run_help(ui)
        else:
            if ui.prompt_yes_no("Leave The Mandalay Bay?", default=False):
                _autosave(session, library)
                if session.has_save_slot:
                    ui.success(f"Progress saved to slot {session.slot_id}.")
                ui.print(f"\nThanks for visiting {CASINO_NAME}. Final balance: {fmt_chips(session.wallet.balance)}")
                break
