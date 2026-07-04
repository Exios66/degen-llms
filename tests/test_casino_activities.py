from mandalay_bay.activities.registry import ALL_ACTIVITIES, FLOOR_ORDER
from mandalay_bay.activities.slots import (
    MACHINES,
    MACHINE_ORDER,
    Symbol,
    _contribute_to_progressive,
    _payout,
    _try_jackpot,
    get_machine,
    progressive_pool,
)
from mandalay_bay.session import PlayerSession


def test_all_floors_have_activities() -> None:
    floors = {a.info.floor for a in ALL_ACTIVITIES}
    for floor in FLOOR_ORDER:
        assert floor in floors


def test_machine_catalog_includes_megabucks() -> None:
    assert "megabucks" in MACHINES
    assert MACHINES["megabucks"].name == "Megabucks"
    assert MACHINES["megabucks"].progressive is True


def test_full_mgm_lineup_present() -> None:
    expected = {
        "fortune",
        "high_roller",
        "megabucks",
        "wheel_of_fortune",
        "blazin_7s",
        "buffalo_gold",
        "monte_carlo",
        "super_spin",
        "triple_red_hot_7s",
        "double_jackpot",
        "spooky_link",
        "wizard_of_oz",
        "emerald_guardian",
        "tiger_and_dragon",
    }
    assert set(MACHINE_ORDER) == expected


def test_three_sevens_paytable() -> None:
    machine = get_machine("fortune")
    reels = [
        Symbol("seven", "7", 1),
        Symbol("seven", "7", 1),
        Symbol("seven", "7", 1),
    ]
    win, reason = _payout(reels, 10, machine)
    assert win == 1000
    assert "100x" in reason


def test_no_win() -> None:
    machine = get_machine("fortune")
    reels = [
        Symbol("lemon", "L", 1),
        Symbol("bar", "B", 1),
        Symbol("cherry", "C", 1),
    ]
    win, _ = _payout(reels, 10, machine)
    assert win == 0


def test_progressive_contribution() -> None:
    session = PlayerSession()
    machine = get_machine("megabucks")
    assert progressive_pool(session, "megabucks", machine.progressive_seed) == 250_000
    _contribute_to_progressive(session, machine, 3)
    assert session.progressive_pools["megabucks"] == 250_001


def test_megabucks_jackpot_at_max_bet() -> None:
    session = PlayerSession()
    session.progressive_pools["megabucks"] = 500_000
    machine = get_machine("megabucks")
    reels = [
        Symbol("megabuck", "💵", 1),
        Symbol("megabuck", "💵", 1),
        Symbol("megabuck", "💵", 1),
    ]
    jackpot = _try_jackpot(session, machine, reels, bet=3)
    assert jackpot == 500_000
    assert session.progressive_pools["megabucks"] == machine.progressive_seed
    win, reason = _payout(reels, 3, machine, jackpot_amount=jackpot)
    assert win == 500_000
    assert "PROGRESSIVE" in reason


def test_megabucks_no_jackpot_below_max_bet() -> None:
    session = PlayerSession()
    session.progressive_pools["megabucks"] = 500_000
    machine = get_machine("megabucks")
    reels = [
        Symbol("megabuck", "💵", 1),
        Symbol("megabuck", "💵", 1),
        Symbol("megabuck", "💵", 1),
    ]
    jackpot = _try_jackpot(session, machine, reels, bet=1)
    assert jackpot is None
    assert session.progressive_pools["megabucks"] == 500_000
