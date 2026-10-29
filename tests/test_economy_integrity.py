"""Regression coverage for ledger validation, daily billing, and save recovery."""
from __future__ import annotations

import json
from unittest.mock import Mock

import pytest

from mandalay_bay.bank_account import BankAccount, buy_in_for_session, ensure_bank
from mandalay_bay.chips import ChipWallet, TransactionKind
from mandalay_bay.hotel import checkout_stay, ensure_hotel, extend_stay
from mandalay_bay.pending_refunds import refund_slips
from mandalay_bay.rewards import TIERS, ensure_rewards, migrate_session_rewards, sync_rewards_from_wallet
from mandalay_bay.saves import SaveLibrary, run_save_picker
from mandalay_bay.session import PlayerSession
from mandalay_bay.world_cycle import MS_PER_GAME_DAY, ensure_world_cycle, grant_room_key_if_reservation_ready, sync_world_cycle


@pytest.mark.parametrize("amount", [float("nan"), float("inf"), float("-inf"), "100", None, True])
def test_invalid_amounts_cannot_poison_ledgers(amount) -> None:
    wallet, bank = ChipWallet(1000), BankAccount(balance=1000)
    assert not wallet.debit(amount, "test", "test")
    assert not wallet.cash_out(amount)
    assert not bank.withdraw(amount, "test", "test")
    with pytest.raises(ValueError):
        wallet.credit(amount, "test", "test")
    with pytest.raises(ValueError):
        wallet.buy_in(amount)
    with pytest.raises(ValueError):
        bank.deposit(amount, "test", "test")
    session = PlayerSession(wallet=wallet)
    session.bank = bank
    with pytest.raises(ValueError):
        buy_in_for_session(session, amount)
    assert wallet.balance == bank.balance == 1000
    assert wallet.transactions == bank.transactions == []


def test_reconcile_and_delta_cannot_overdraw_wallet() -> None:
    wallet = ChipWallet(100)
    with pytest.raises(ValueError):
        wallet.apply_delta(-101, "test", "test")
    with pytest.raises(ValueError):
        wallet.reconcile(-1, "test", "test")
    assert wallet.balance == 100
    assert not wallet.transactions


def test_refund_filters_corrupt_stakes_and_marks_refund() -> None:
    session = PlayerSession(wallet=ChipWallet(850))
    returned = refund_slips(session, "sportsbook", [
        {"amount": 100}, {"amount": 50}, {"amount": -20},
        {"amount": float("inf")}, {"amount": "oops"}, None,
    ], reason="Return open tickets")
    assert returned == 150
    assert session.wallet.balance == 1000
    assert session.wallet.transactions[-1].kind == TransactionKind.REFUND


def test_tier_jump_grants_every_earned_comp() -> None:
    session = PlayerSession(wallet=ChipWallet(2_000_000))
    session.wallet.debit(1_000_000, "blackjack", "large wager")
    sync_rewards_from_wallet(session)
    assert session.rewards.tier == "chairman"
    assert {tier.comp for tier in TIERS if tier.comp} <= set(session.rewards.unlocked_comps)
    migrated = PlayerSession(wallet=session.wallet)
    migrate_session_rewards(migrated, 1)
    assert set(migrated.rewards.unlocked_comps) == set(session.rewards.unlocked_comps)


def test_checkout_without_amenities_is_persisted() -> None:
    session = PlayerSession()
    hotel = ensure_hotel(session)
    assert hotel.room_amenities is None
    assert checkout_stay(session).ok
    assert not checkout_stay(session).ok
    assert hotel.nights_remaining == 1


@pytest.mark.parametrize("nights", [-1, 0, 1.5, True, float("inf")])
def test_invalid_stay_extension_cannot_consume_comp(nights) -> None:
    session = PlayerSession()
    ensure_rewards(session).unlocked_comps.append("room_night")
    hotel = ensure_hotel(session)
    assert not extend_stay(session, nights).ok
    assert hotel.nights_remaining == 2
    assert "room_night" not in session.rewards.redeemed_comps


def test_one_room_night_comp_cannot_buy_unlimited_nights() -> None:
    session = PlayerSession()
    ensure_rewards(session).unlocked_comps.append("room_night")
    hotel = ensure_hotel(session)
    assert not extend_stay(session, 100).ok
    assert hotel.nights_remaining == 2
    assert extend_stay(session, 1).ok
    assert hotel.nights_remaining == 3


def test_rollover_reports_current_day_and_updated_debt(monkeypatch) -> None:
    session = PlayerSession(wallet=ChipWallet(10))
    ensure_hotel(session)
    wc = ensure_world_cycle(session)
    wc.clock_anchor_ms = 1000
    monkeypatch.setattr("mandalay_bay.world_cycle._now_ms", lambda: 1000 + MS_PER_GAME_DAY)
    state = sync_world_cycle(session)
    assert state["messages"][0].startswith("Day 2 — Front desk")
    assert state["room_evicted"] is True
    assert state["overdue_balance"] == 149
    assert not sync_world_cycle(session)["advanced"]
    session.hotel.found_reservation = True
    session.hotel.reservation_confirmed_desk = True
    assert not grant_room_key_if_reservation_ready(session)
    assert not session.hotel.room_key_active


@pytest.mark.parametrize("index", [[], {"recent": [1, "oops", 1, 9], "slots": {"1": None}}, {"recent": None, "slots": []}])
def test_corrupt_library_index_does_not_block_existing_save(tmp_path, index) -> None:
    library = SaveLibrary(tmp_path)
    library.create_session(1, player_name="Survivor")
    (tmp_path / "library.json").write_text(json.dumps(index))
    reopened = SaveLibrary(tmp_path)
    assert len(reopened.list_slots()) == 5
    assert reopened.load_slot(1).player_name == "Survivor"


def test_corrupt_save_returns_none_and_preserves_file(tmp_path) -> None:
    library = SaveLibrary(tmp_path)
    raw = '{"wallet":{"balance":-2}}'
    (tmp_path / "slot_1.json").write_text(raw)
    assert library.load_slot(1) is None
    assert (tmp_path / "slot_1.json").read_text() == raw


def test_invalid_utf8_library_and_save_do_not_crash_picker(tmp_path) -> None:
    library = SaveLibrary(tmp_path)
    library.create_session(1)
    (tmp_path / "library.json").write_bytes(b"\xff")
    reopened = SaveLibrary(tmp_path)
    assert reopened.load_slot(1) is not None
    (tmp_path / "slot_1.json").write_bytes(b"\xff")
    assert reopened.load_slot(1) is None
    assert (tmp_path / "slot_1.json").read_bytes() == b"\xff"


def test_failed_atomic_save_preserves_previous_slot(tmp_path, monkeypatch) -> None:
    library = SaveLibrary(tmp_path)
    session = library.create_session(1)
    before = (tmp_path / "slot_1.json").read_text()
    session.wallet.balance = 2000
    monkeypatch.setattr("mandalay_bay.saves.os.replace", Mock(side_effect=OSError("disk error")))
    with pytest.raises(OSError):
        library.save_slot(session)
    assert (tmp_path / "slot_1.json").read_text() == before
    assert sorted(p.name for p in tmp_path.iterdir()) == ["library.json", "slot_1.json"]


def test_save_picker_routes_delete_then_exit(tmp_path, monkeypatch) -> None:
    ui = Mock()
    ui.menu_choice.side_effect = [6, 7]
    delete_flow = Mock()
    monkeypatch.setattr("mandalay_bay.saves._delete_save_flow", delete_flow)
    library = SaveLibrary(tmp_path)
    assert run_save_picker(ui, library) is None
    delete_flow.assert_called_once_with(ui, library)
