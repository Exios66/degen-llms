"""Tests for casino floor amenities — shopping mall and bars."""

from __future__ import annotations

from mandalay_bay.casino_amenities import (
    ALL_SHOP_STORES,
    FLAGSHIP_DESIGNER_STORES,
    MANDALAY_PLACE_STORES,
    SHOP_ITEMS_BY_ID,
    ensure_amenities,
    order_bar_drink,
    purchase_shop_item,
)
from mandalay_bay.chips import ChipWallet
from mandalay_bay.saves import SaveLibrary, session_from_dict, session_to_dict
from mandalay_bay.session import PlayerSession


def test_shoppes_catalog_expanded() -> None:
    assert len(FLAGSHIP_DESIGNER_STORES) == 6
    assert len(MANDALAY_PLACE_STORES) == 10
    assert len(ALL_SHOP_STORES) == 16
    assert len(SHOP_ITEMS_BY_ID) == 81
    for store_id in (
        "rolex_boutique",
        "tiffany_co",
        "nike_mandalay",
        "house_of_blues_store",
        "surf_city",
        "mandalay_souvenirs",
    ):
        assert store_id in {s.id for s in ALL_SHOP_STORES}


def test_purchase_new_catalog_items() -> None:
    session = PlayerSession(wallet=ChipWallet(balance=50_000))
    assert purchase_shop_item(session, "nike_dri_fit").ok
    assert purchase_shop_item(session, "rolex_cap").ok
    assert purchase_shop_item(session, "mb_mug").ok
    amenities = ensure_amenities(session)
    assert amenities.purchased_items == ["nike_dri_fit", "rolex_cap", "mb_mug"]


def test_purchase_shop_item_debits_chips() -> None:
    session = PlayerSession(wallet=ChipWallet(balance=5000))
    result = purchase_shop_item(session, "lush_bath_bomb")
    assert result.ok
    assert session.wallet.balance == 4988
    assert "lush_bath_bomb" in ensure_amenities(session).purchased_items
    assert session.stat_for("shopping").visits == 1


def test_purchase_shop_item_insufficient_funds() -> None:
    session = PlayerSession(wallet=ChipWallet(balance=10))
    result = purchase_shop_item(session, "gucci_dionysus")
    assert not result.ok
    assert session.wallet.balance == 10
    assert ensure_amenities(session).purchased_items == []


def test_purchase_shop_item_already_owned() -> None:
    session = PlayerSession(wallet=ChipWallet(balance=5000))
    purchase_shop_item(session, "lush_bath_bomb")
    result = purchase_shop_item(session, "lush_bath_bomb")
    assert not result.ok


def test_order_bar_drink_debits_chips() -> None:
    session = PlayerSession(wallet=ChipWallet(balance=100))
    result = order_bar_drink(session, "eyecandy_mandalay_mule")
    assert result.ok
    assert session.wallet.balance == 82
    assert "eyecandy_mandalay_mule" in ensure_amenities(session).bar_orders
    assert session.stat_for("bar").visits == 1


def test_order_bar_drink_insufficient_funds() -> None:
    session = PlayerSession(wallet=ChipWallet(balance=5))
    result = order_bar_drink(session, "eyecandy_top_shelf")
    assert not result.ok
    assert session.wallet.balance == 5


def test_amenities_persist_in_save(tmp_path) -> None:
    library = SaveLibrary(save_dir=tmp_path / "saves")
    session = library.create_session(1, player_name="Shopper", starting_chips=10000)
    purchase_shop_item(session, "guinness_hat")
    order_bar_drink(session, "big_chill_frozen_marg")
    library.save_slot(session)

    loaded = library.load_slot(1)
    assert loaded is not None
    amenities = ensure_amenities(loaded)
    assert "guinness_hat" in amenities.purchased_items
    assert "big_chill_frozen_marg" in amenities.bar_orders
    assert loaded.wallet.balance == 10000 - 28 - 16


def test_amenities_round_trip_dict() -> None:
    session = PlayerSession(wallet=ChipWallet(balance=1000))
    purchase_shop_item(session, "ff_havaianas")
    data = session_to_dict(session)
    restored = session_from_dict(data)
    amenities = ensure_amenities(restored)
    assert "ff_havaianas" in amenities.purchased_items
