from mandalay_bay.prediction_markets import prediction_payout, resolve_position


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
