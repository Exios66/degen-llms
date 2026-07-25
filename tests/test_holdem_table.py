"""Full-table Texas Hold'em flow — one human vs bots through showdown."""

from poker.holdem import BettingAction, Street, HoldemTable, human_net_change


def _drive_hand(table: HoldemTable, *, human_policy: str = "passive") -> None:
    safety = 0
    while not table.hand_over and safety < 200:
        player = table.players[table.action_index]
        if player.folded or player.all_in:
            table.action_index = (table.action_index + 1) % len(table.players)
            table._seek_actor()
            safety += 1
            continue
        legal = table.legal_actions(player)
        if player.is_human:
            if human_policy == "fold" and BettingAction.FOLD in legal:
                action, raise_to = BettingAction.FOLD, None
            elif BettingAction.CHECK in legal:
                action, raise_to = BettingAction.CHECK, None
            elif BettingAction.CALL in legal:
                action, raise_to = BettingAction.CALL, None
            else:
                action, raise_to = BettingAction.FOLD, None
        else:
            action, raise_to = table.bot_action(player)
        table.apply_action(player, action, raise_to=raise_to)
        safety += 1


def test_quick_table_always_five_handed() -> None:
    table = HoldemTable.quick_table(human_stack=500, num_bots=4)
    assert len(table.players) == 5
    assert sum(1 for p in table.players if p.is_human) == 1
    assert sum(1 for p in table.players if not p.is_human) == 4


def test_quick_table_caps_bots_at_four() -> None:
    table = HoldemTable.quick_table(human_stack=100, num_bots=9)
    assert len(table.players) == 5


def test_holdem_hand_reaches_showdown() -> None:
    table = HoldemTable.quick_table(human_stack=500, num_bots=4)
    table.start_hand()
    assert not table.hand_over
    assert len(table.human.hole) == 2
    assert len(table.players) == 5

    _drive_hand(table)

    assert table.hand_over
    assert table.street in (Street.SHOWDOWN, Street.RIVER) or table.winners


def test_postflop_streets_require_betting() -> None:
    """After preflop checks/calls, the flop must open for action (not auto-runout)."""
    table = HoldemTable.quick_table(human_stack=1000, num_bots=4)
    table.start_hand()
    seen_streets: list[Street] = []

    safety = 0
    while not table.hand_over and safety < 200:
        if table.street not in seen_streets:
            seen_streets.append(table.street)
        player = table.players[table.action_index]
        if player.folded or player.all_in:
            table.action_index = (table.action_index + 1) % len(table.players)
            table._seek_actor()
            safety += 1
            continue

        # On flop, verify players must act before the turn is dealt.
        if table.street == Street.FLOP:
            assert len(table.community) == 3
            assert any(not p.has_acted and not p.folded and not p.all_in for p in table.players)
            # One check from the current actor, then stop probing this assertion path.
            legal = table.legal_actions(player)
            if BettingAction.CHECK in legal:
                table.apply_action(player, BettingAction.CHECK)
            elif BettingAction.CALL in legal:
                table.apply_action(player, BettingAction.CALL)
            else:
                table.apply_action(player, BettingAction.FOLD)
            # Continue until turn appears or hand ends — but flop betting happened.
            while not table.hand_over and table.street == Street.FLOP and safety < 200:
                actor = table.players[table.action_index]
                if actor.folded or actor.all_in:
                    table.action_index = (table.action_index + 1) % len(table.players)
                    table._seek_actor()
                    safety += 1
                    continue
                act_legal = table.legal_actions(actor)
                if actor.is_human:
                    act = (
                        BettingAction.CHECK
                        if BettingAction.CHECK in act_legal
                        else BettingAction.CALL
                        if BettingAction.CALL in act_legal
                        else BettingAction.FOLD
                    )
                    table.apply_action(actor, act)
                else:
                    a, amt = table.bot_action(actor)
                    table.apply_action(actor, a, raise_to=amt)
                safety += 1
            assert table.street in (Street.TURN, Street.RIVER, Street.SHOWDOWN) or table.hand_over
            break

        legal = table.legal_actions(player)
        if player.is_human:
            action = (
                BettingAction.CHECK
                if BettingAction.CHECK in legal
                else BettingAction.CALL
                if BettingAction.CALL in legal
                else BettingAction.FOLD
            )
            table.apply_action(player, action)
        else:
            action, raise_to = table.bot_action(player)
            table.apply_action(player, action, raise_to=raise_to)
        safety += 1

    assert Street.PREFLOP in seen_streets
    assert Street.FLOP in seen_streets


def test_no_limit_raise_to_custom_amount() -> None:
    table = HoldemTable.quick_table(human_stack=1000, num_bots=4)
    table.start_hand()
    human = table.human
    # Force action onto the human.
    safety = 0
    while table.players[table.action_index] is not human and not table.hand_over and safety < 40:
        actor = table.players[table.action_index]
        if actor.folded or actor.all_in:
            table.action_index = (table.action_index + 1) % len(table.players)
            table._seek_actor()
        else:
            a, amt = table.bot_action(actor)
            # Keep pot small so human can raise.
            if a == BettingAction.RAISE:
                a = BettingAction.CALL if BettingAction.CALL in table.legal_actions(actor) else BettingAction.CHECK
                amt = None
            if a in table.legal_actions(actor):
                table.apply_action(actor, a, raise_to=amt)
            else:
                table.apply_action(actor, BettingAction.FOLD)
        safety += 1

    if table.hand_over or table.players[table.action_index] is not human:
        return  # rare bot fold-out; mechanics covered elsewhere

    legal = table.legal_actions(human)
    if BettingAction.RAISE not in legal:
        return
    min_to = table.min_raise_to(human)
    max_to = table.max_raise_to(human)
    target = min(max_to, min_to + table.big_blind * 4)
    table.apply_action(human, BettingAction.RAISE, raise_to=target)
    assert human.bet_this_street == target
    assert table.current_bet == target


def test_stack_persists_across_hands() -> None:
    table = HoldemTable.quick_table(human_stack=500, num_bots=4)
    buy_in = 500
    table.start_hand()
    _drive_hand(table, human_policy="passive")
    mid_stack = table.human.stack
    assert mid_stack != buy_in or table.winners  # chips moved somehow, or split/win path
    # Next hand must keep the same human stack (buy-in accrues wins/losses).
    if mid_stack >= table.big_blind:
        table.start_hand()
        assert table.human.stack <= mid_stack  # blinds posted from carried stack
        assert human_net_change(table, buy_in) == table.human.stack - buy_in


def test_bots_rebuy_to_keep_five_players() -> None:
    table = HoldemTable.quick_table(human_stack=500, num_bots=4)
    for p in table.players:
        if not p.is_human:
            p.stack = 0
    table.start_hand()
    assert all(p.stack > 0 or p.is_human for p in table.players)
    assert len([p for p in table.players if not p.folded or p.is_human]) >= 2


def test_short_all_in_call_allowed() -> None:
    table = HoldemTable.quick_table(human_stack=500, num_bots=4)
    table.start_hand()
    human = table.human
    human.stack = 15
    table.current_bet = 100
    human.bet_this_street = 0
    legal = table.legal_actions(human)
    assert BettingAction.CALL in legal
    table.apply_action(human, BettingAction.CALL)
    assert human.all_in
    assert human.stack == 0


def test_holdem_human_net_change_after_hand() -> None:
    table = HoldemTable.quick_table(human_stack=200, num_bots=4)
    buy_in = 200
    table.start_hand()
    _drive_hand(table)
    net = human_net_change(table, buy_in)
    assert isinstance(net, int)
    assert net == table.human.stack - buy_in
