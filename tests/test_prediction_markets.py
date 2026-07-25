from mandalay_bay.prediction_markets import (
    HISTORY_MARKETS,
    MARKET_CATEGORIES,
    filter_markets,
    generate_markets,
    prediction_payout,
    resolve_market,
    resolve_position,
)


def test_prediction_payout_at_35_cents() -> None:
    assert prediction_payout(100, 35) == 285


def test_prediction_payout_at_50_cents() -> None:
    assert prediction_payout(100, 50) == 200


def test_prediction_win_pays_multiple() -> None:
    position = {"side": "yes", "amount": 100, "priceCents": 40}
    result = resolve_position(position, "yes")
    assert result["won"] is True
    assert result["payout"] == 250


def test_prediction_loss_zero_payout() -> None:
    position = {"side": "yes", "amount": 100, "priceCents": 40}
    result = resolve_position(position, "no")
    assert result["won"] is False
    assert result["payout"] == 0


def test_board_includes_history_and_easter_eggs() -> None:
    markets = generate_markets([])
    cats = {m["category"] for m in markets}
    assert "history" in cats
    assert "easter-eggs" in cats
    assert any(c["id"] == "history" for c in MARKET_CATEGORIES)


def test_history_market_resolves_to_fixed_truth() -> None:
    sample = HISTORY_MARKETS[0]
    market = {
        "question": sample["question"],
        "yesPrice": sample["yesPrice"],
        "fixedResolution": sample["resolution"],
        "resolution": None,
        "linkedEventId": None,
    }
    assert resolve_market(market, []) == sample["resolution"]


def test_filter_markets_by_category() -> None:
    markets = generate_markets([])
    eggs = filter_markets(markets, "easter-eggs")
    assert eggs
    assert all(m["category"] == "easter-eggs" for m in eggs)
