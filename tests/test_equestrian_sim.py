"""Equestrian dressage and jumper simulation parity."""

from mandalay_bay.activities.equestrian import (
    DressageActivity,
    _generate_dressage,
    _simulate_dressage,
    _generate_jumper,
    _simulate_jumper,
)


def test_dressage_card_generation() -> None:
    card = _generate_dressage()
    assert 4 <= len(card.entries) <= 6
    assert card.level in ("Grand Prix", "Grand Prix Spécial", "Grand Prix Freestyle")
    for entry in card.entries:
        assert entry.odds != 0
        assert 0 < entry.total_score < 100


def test_dressage_simulation_orders_entries() -> None:
    card = _generate_dressage()
    order = _simulate_dressage(card)
    assert len(order) == len(card.entries)
    assert len(set(order)) == len(order)


def test_jumper_card_and_simulation() -> None:
    card = _generate_jumper()
    assert len(card.entries) >= 4
    results = _simulate_jumper(card)
    assert len(results) == len(card.entries)
    assert all(r.faults >= 0 for r in results)


def test_dressage_activity_can_enter() -> None:
    activity = DressageActivity()
    from mandalay_bay.session import PlayerSession
    from mandalay_bay.chips import ChipWallet

    session = PlayerSession(player_name="Rider", wallet=ChipWallet(balance=100))
    assert activity.can_enter(session) is True
