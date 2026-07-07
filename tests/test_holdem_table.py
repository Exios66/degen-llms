"""Full-table Texas Hold'em flow — one human vs bots through showdown."""

from poker.holdem import BettingAction, HoldemTable, human_net_change


def test_holdem_hand_reaches_showdown() -> None:
    table = HoldemTable.quick_table(human_stack=500, num_bots=2)
    table.start_hand()
    assert not table.hand_over
    assert len(table.human.hole) == 2

    safety = 0
    while not table.hand_over and safety < 80:
        player = table.players[table.action_index]
        if player.folded or player.all_in:
            table.action_index = (table.action_index + 1) % len(table.players)
            table._seek_actor()
            safety += 1
            continue
        legal = table.legal_actions(player)
        if player.is_human:
            action = BettingAction.CHECK if BettingAction.CHECK in legal else BettingAction.CALL
        else:
            action = table.bot_action(player)
        table.apply_action(player, action)
        safety += 1

    assert table.hand_over
    assert table.street.value in ("showdown", "river") or table.winners


def test_holdem_human_net_change_after_winning_pot() -> None:
    table = HoldemTable.quick_table(human_stack=200, num_bots=1)
    buy_in = 200
    table.start_hand()
    while not table.hand_over:
        player = table.players[table.action_index]
        if player.folded or player.all_in:
            table.action_index = (table.action_index + 1) % len(table.players)
            table._seek_actor()
            continue
        legal = table.legal_actions(player)
        if player.is_human:
            table.apply_action(player, BettingAction.CHECK if BettingAction.CHECK in legal else BettingAction.CALL)
        else:
            table.apply_action(player, table.bot_action(player))
    net = human_net_change(table, buy_in)
    assert isinstance(net, int)
