"""Tests for resort dining capacity minigame and encounters."""

from __future__ import annotations

from mandalay_bay.chips import ChipWallet
from mandalay_bay.dining import (
    DINING_EGGS,
    can_enter_dining,
    consume_food_coma_flag,
    create_sitting,
    dining_summary,
    encounter_chance,
    ensure_dining,
    order_and_consume,
    resolve_encounter,
    settle_sitting,
)
from mandalay_bay.intoxication import ensure_intoxication
from mandalay_bay.saves import SaveLibrary, session_from_dict, session_to_dict
from mandalay_bay.session import PlayerSession


def test_order_food_debits_and_raises_fullness() -> None:
    session = PlayerSession(wallet=ChipWallet(balance=5000))
    sitting = create_sitting("stripsteak")
    result = order_and_consume(session, sitting, "ss_fries", pace="pace", rng=lambda: 1.0)
    assert result.ok
    assert sitting.fullness > 0
    assert sitting.tab == 18
    assert session.wallet.balance == 5000 - 18


def test_drink_raises_encounter_chance() -> None:
    session = PlayerSession(wallet=ChipWallet(balance=5000))
    sitting = create_sitting("aureole")
    before = encounter_chance(sitting, session)
    order_and_consume(session, sitting, "aur_champagne", pace="pace", rng=lambda: 1.0)
    after = encounter_chance(sitting, session)
    assert sitting.drinks_this_sitting >= 1
    assert after > before


def test_forced_encounter_and_resolve() -> None:
    session = PlayerSession(wallet=ChipWallet(balance=5000))
    sitting = create_sitting("border_grill")
    result = order_and_consume(session, sitting, "bg_margarita", pace="pace", rng=lambda: 0.0)
    assert result.ok
    assert sitting.pending_encounter is not None
    enc = sitting.pending_encounter
    choice_id = enc["choices"][0]["id"]
    resolved = resolve_encounter(session, sitting, choice_id)
    assert resolved.ok
    assert sitting.pending_encounter is None
    assert enc["id"] in ensure_dining(session).encounters_seen


def test_food_coma_bust_and_hallway_flag() -> None:
    session = PlayerSession(wallet=ChipWallet(balance=50_000))
    sitting = create_sitting("aureole")
    # Force high fullness via repeated clean_plate tasting menus
    for _ in range(6):
        if sitting.busted:
            break
        order_and_consume(session, sitting, "aur_tasting", pace="clean_plate", rng=lambda: 1.0)
    assert sitting.busted or sitting.fullness >= 100
    if sitting.busted:
        assert ensure_dining(session).food_coma_hallway
        assert consume_food_coma_flag(session)
        assert not consume_food_coma_flag(session)


def test_settle_persists_high_score() -> None:
    session = PlayerSession(wallet=ChipWallet(balance=5000))
    sitting = create_sitting("stripsteak")
    order_and_consume(session, sitting, "ss_oysters", pace="clean_plate", rng=lambda: 1.0)
    result = settle_sitting(session, sitting, tip_percent=10)
    assert result.ok
    dining = ensure_dining(session)
    assert dining.visits == 1
    assert dining.venue_high_scores.get("stripsteak", 0) >= sitting.score
    summary = dining_summary(session)
    assert summary["visits"] == 1


def test_cutoff_at_high_intox() -> None:
    session = PlayerSession(wallet=ChipWallet(balance=5000))
    state = ensure_intoxication(session)
    state.level = 90
    gate = can_enter_dining(session)
    assert not gate.ok


def test_dining_save_round_trip(tmp_path) -> None:
    library = SaveLibrary(save_dir=tmp_path / "saves")
    session = library.create_session(1, player_name="Diner", starting_chips=10_000)
    sitting = create_sitting("border_grill")
    order_and_consume(session, sitting, "bg_guacamole", pace="pace", rng=lambda: 1.0)
    settle_sitting(session, sitting, tip_percent=0)
    ensure_dining(session).unlocked_eggs.append("dining_wine_angel")
    library.save_slot(session)

    loaded = library.load_slot(1)
    assert loaded is not None
    dining = ensure_dining(loaded)
    assert dining.visits == 1
    assert "dining_wine_angel" in dining.unlocked_eggs
    assert "dining_wine_angel" in DINING_EGGS


def test_dining_dict_round_trip() -> None:
    session = PlayerSession(wallet=ChipWallet(balance=3000))
    sitting = create_sitting("aureole")
    order_and_consume(session, sitting, "aur_amuse", pace="pace", rng=lambda: 1.0)
    settle_sitting(session, sitting, tip_percent=0)
    data = session_to_dict(session)
    restored = session_from_dict(data)
    assert ensure_dining(restored).visits == 1
