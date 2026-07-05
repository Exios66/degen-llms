"""Casino floor amenities — CLI experience for shopping and bars."""

from __future__ import annotations

from mandalay_bay.casino_amenities import (
    CASINO_BARS,
    FLAGSHIP_DESIGNER_STORES,
    MALL_NAME,
    MALL_TAGLINE,
    MANDALAY_PLACE_STORES,
    PurchaseResult,
    ensure_amenities,
    fmt_chips,
    list_purchased_items,
    order_bar_drink,
    purchase_shop_item,
)
from mandalay_bay.display import TerminalUI
from mandalay_bay.session import PlayerSession


def run_casino_floor(session: PlayerSession, ui: TerminalUI) -> None:
    while True:
        ui.banner("Casino Floor")
        ui.chip_line(session.wallet.balance)
        ui.dim("Mandalay Bay casino carpet — gaming, shopping, and bars within steps.")
        choice = ui.menu_choice(
            [
                f"{MALL_NAME}",
                "Full Service Bar — choose your lounge",
                "View shopping bag",
                "Back to lobby",
            ],
            title="On the casino floor:",
        )
        if choice == 0 or choice == 4:
            return
        if choice == 1:
            run_shopping_mall(session, ui)
        elif choice == 2:
            run_bar_select(session, ui)
        elif choice == 3:
            _show_bag(session, ui)


def run_shopping_mall(session: PlayerSession, ui: TerminalUI) -> None:
    while True:
        ui.banner(MALL_NAME)
        ui.chip_line(session.wallet.balance)
        ui.print(MALL_TAGLINE)
        ui.print()
        choice = ui.menu_choice(
            [
                "Flagship Designer Row (casino floor)",
                "Mandalay Place boutiques (sky bridge)",
                "View shopping bag",
                "Back",
            ],
            title="Browse:",
        )
        if choice == 0 or choice == 4:
            return
        if choice == 1:
            _browse_zone(session, ui, FLAGSHIP_DESIGNER_STORES, "Flagship Designer Row")
        elif choice == 2:
            _browse_zone(session, ui, MANDALAY_PLACE_STORES, "Mandalay Place")
        elif choice == 3:
            _show_bag(session, ui)


def _browse_zone(session: PlayerSession, ui: TerminalUI, stores: tuple, zone_name: str) -> None:
    while True:
        ui.banner(zone_name)
        ui.chip_line(session.wallet.balance)
        options = [f"{s.name} — {s.tagline}" for s in stores]
        choice = ui.menu_choice(options + ["Back"], title=f"{zone_name} — select a store:")
        if choice == 0 or choice == len(stores) + 1:
            return
        _browse_store(session, ui, stores[choice - 1])


def _browse_store(session: PlayerSession, ui: TerminalUI, store) -> None:
    amenities = ensure_amenities(session)
    while True:
        ui.banner(store.name)
        ui.chip_line(session.wallet.balance)
        ui.dim(store.zone)
        ui.print(store.tagline)
        ui.print()
        item_lines = []
        for item in store.items:
            owned = " [owned]" if item.id in amenities.purchased_items else ""
            item_lines.append(f"{item.name} — {fmt_chips(item.price)}{owned}")
            item_lines.append(f"  {item.description}")
        options = [f"{item.name} ({fmt_chips(item.price)})" for item in store.items]
        choice = ui.menu_choice(options + ["Back"], title=f"{store.name} — tender in chips:")
        if choice == 0 or choice == len(store.items) + 1:
            return
        item = store.items[choice - 1]
        result = purchase_shop_item(session, item.id)
        _show_result(ui, result)


def run_bar_select(session: PlayerSession, ui: TerminalUI) -> None:
    while True:
        ui.banner("Full Service Bar")
        ui.chip_line(session.wallet.balance)
        ui.print("Three lounges on the Mandalay Bay casino floor — pick where you'd like to drink.")
        ui.print()
        options = [f"{b.name} — {b.location}" for b in CASINO_BARS]
        choice = ui.menu_choice(options + ["Back"], title="Choose your bar:")
        if choice == 0 or choice == len(CASINO_BARS) + 1:
            return
        _run_bar_menu(session, ui, CASINO_BARS[choice - 1])


def _run_bar_menu(session: PlayerSession, ui: TerminalUI, bar) -> None:
    while True:
        ui.banner(bar.name)
        ui.chip_line(session.wallet.balance)
        ui.dim(bar.location)
        ui.print(bar.vibe)
        ui.print()
        options = [f"{d.name} — {fmt_chips(d.price)}" for d in bar.drinks]
        choice = ui.menu_choice(options + ["Choose another bar", "Back to casino floor"], title="Full service menu:")
        if choice == 0:
            return
        if choice == len(bar.drinks) + 1:
            run_bar_select(session, ui)
            return
        if choice == len(bar.drinks) + 2:
            return
        drink = bar.drinks[choice - 1]
        result = order_bar_drink(session, drink.id)
        _show_result(ui, result)


def _show_bag(session: PlayerSession, ui: TerminalUI) -> None:
    ui.banner("Shopping Bag")
    purchased = list_purchased_items(session)
    if not purchased:
        ui.dim("Your bag is empty — browse The Shoppes at Mandalay Place.")
    else:
        ui.print("Purchases (paid in chips):")
        for item, store in purchased:
            ui.print(f"  • {item.name} from {store.name} — {fmt_chips(item.price)}")
    amenities = ensure_amenities(session)
    if amenities.bar_orders:
        ui.print("\nRecent bar orders:")
        from mandalay_bay.casino_amenities import BAR_DRINKS_BY_ID, BARS_BY_ID

        for drink_id in amenities.bar_orders[-10:]:
            drink = BAR_DRINKS_BY_ID.get(drink_id)
            if drink:
                bar = next(b for b in CASINO_BARS if any(d.id == drink_id for d in b.drinks))
                ui.print(f"  • {drink.name} @ {bar.name}")
    ui.pause()


def _show_result(ui: TerminalUI, result: PurchaseResult) -> None:
    if result.ok:
        ui.success(result.message)
    else:
        ui.error(result.message)
    ui.pause()
