from mandalay_bay.activities.sportsbook import SportsbookActivity


def test_american_odds_profit_positive() -> None:
    assert SportsbookActivity._profit(100, 150) == 150


def test_american_odds_profit_negative() -> None:
    assert SportsbookActivity._profit(110, -110) == 100
