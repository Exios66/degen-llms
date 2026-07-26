from mandalay_bay.lottery import (
    MEGA_BALL_MAX,
    MEGA_POWERBALL_MAX,
    TICKET_ORDER,
    TICKET_TYPES,
    parse_pick_input,
    resolve_mega,
    resolve_pick3,
    resolve_scratcher,
    scaled_ticket_price,
    validate_mega_picks,
)


def test_ticket_catalog_has_core_and_premium_products() -> None:
    core = {"pick3", "pick4", "mega", "scratch_gold", "scratch_wild"}
    premium = {
        "pick3_high",
        "pick4_high",
        "mega_high",
        "mega_salon",
        "scratch_platinum",
        "scratch_diamond",
    }
    assert core | premium <= set(TICKET_TYPES)
    assert set(TICKET_ORDER) == set(TICKET_TYPES)


def test_mega_ranges_match_powerball_docs() -> None:
    mega = TICKET_TYPES["mega"]
    assert mega["ball_max"] == MEGA_BALL_MAX == 70
    assert mega["mega_max"] == MEGA_POWERBALL_MAX == 25
    assert TICKET_TYPES["mega_salon"]["prize_mult"] == 100


def test_parse_pick_input() -> None:
    assert parse_pick_input("7-4-2", 3) == [7, 4, 2]
    assert parse_pick_input("12", 3) is None


def test_validate_mega_picks() -> None:
    assert validate_mega_picks([1, 2, 3, 4, 5], 10) is None
    assert validate_mega_picks([1, 2, 3, 4, 5], 0) is not None
    assert validate_mega_picks([1, 2, 3, 4, 71], 10) is not None
    assert validate_mega_picks([1, 2, 3, 4, 4], 10) is not None


def test_scaled_ticket_price_follows_stake_tier() -> None:
    assert scaled_ticket_price(5, "penny") == 5
    assert scaled_ticket_price(5, "high_limit") == 20
    assert scaled_ticket_price(5, "no_limit") == 75


def test_pick3_returns_ticket_result() -> None:
    result = resolve_pick3([1, 2, 3], price=2)
    assert result.ticket_id == "pick3"
    assert result.price == 2
    assert len(result.draw) == 3
    assert result.win >= 0


def test_high_limit_pick_uses_ticket_id() -> None:
    result = resolve_pick3([1, 2, 3], price=25, ticket_id="pick3_high")
    assert result.ticket_id == "pick3_high"
    assert result.name == TICKET_TYPES["pick3_high"]["name"]


def test_resolve_mega_draw_in_corrected_range() -> None:
    result = resolve_mega([1, 2, 3, 4, 5], 7, price=5)
    assert result.ticket_id == "mega"
    assert len(result.draw) == 6
    assert all(1 <= n <= 70 for n in result.draw[:5])
    assert 1 <= result.draw[5] <= 25


def test_scratcher_returns_result() -> None:
    result = resolve_scratcher("scratch_gold")
    assert result.ticket_id == "scratch_gold"
    assert result.price == 5
    assert isinstance(result.reason, str)


def test_premium_scratcher_catalog() -> None:
    result = resolve_scratcher("scratch_diamond", tier_id="penny")
    assert result.ticket_id == "scratch_diamond"
    assert result.price == 250
