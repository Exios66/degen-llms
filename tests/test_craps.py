from mandalay_bay.craps import CrapsTable, DiceRoll


def test_pass_line_natural_seven_wins() -> None:
    table = CrapsTable()
    roll = DiceRoll(3, 4)
    result = table.resolve_pass_line(10, roll)
    assert result.payout == 20
    assert result.working is False


def test_pass_line_establishes_point() -> None:
    table = CrapsTable()
    roll = DiceRoll(2, 4)  # 6
    result = table.resolve_pass_line(10, roll)
    assert result.working is True
    assert table.point == 6
    assert result.payout == 0


def test_pass_line_hits_point() -> None:
    table = CrapsTable()
    table.point = 8
    roll = DiceRoll(3, 5)
    result = table.resolve_pass_line(25, roll)
    assert result.payout == 50
    assert table.point is None


def test_field_double_on_twelve() -> None:
    table = CrapsTable()
    roll = DiceRoll(6, 6)
    result = table.resolve_side_bet("field", 10, roll)
    assert result.payout == 30


def test_any_craps_hits() -> None:
    table = CrapsTable()
    roll = DiceRoll(1, 1)
    result = table.resolve_side_bet("any_craps", 5, roll)
    assert result.payout == 5 + 5 * 7
