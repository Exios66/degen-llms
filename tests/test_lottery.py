from mandalay_bay.lottery import (
    TICKET_TYPES,
    parse_pick_input,
    resolve_pick3,
    resolve_scratcher,
)


def test_ticket_catalog_has_core_products() -> None:
    assert {"pick3", "pick4", "mega", "scratch_gold", "scratch_wild"} <= set(TICKET_TYPES)


def test_parse_pick_input() -> None:
    assert parse_pick_input("7-4-2", 3) == [7, 4, 2]
    assert parse_pick_input("12", 3) is None


def test_pick3_returns_ticket_result() -> None:
    result = resolve_pick3([1, 2, 3], price=2)
    assert result.ticket_id == "pick3"
    assert result.price == 2
    assert len(result.draw) == 3
    assert result.win >= 0


def test_scratcher_returns_result() -> None:
    result = resolve_scratcher("scratch_gold")
    assert result.ticket_id == "scratch_gold"
    assert result.price == 5
    assert isinstance(result.reason, str)
