from __future__ import annotations

from mandalay_bay.activities.base import Activity, ActivityInfo
from mandalay_bay.craps import SIDE_BETS, CrapsTable
from mandalay_bay.dealers import announce_dealer, pick_quip
from mandalay_bay.session import PlayerSession
from mandalay_bay.stakes import effective_table_stakes, pick_stake_tier


class CrapsActivity(Activity):
    info = ActivityInfo(
        id="craps",
        name="Mandalay Craps",
        floor="Table Games",
        description="Dice table — Pass / Don't Pass, Field, props, and hardways.",
        min_bet=5,
    )

    def run(self, session: PlayerSession, ui) -> None:
        session.record_visit(self.info.id)
        ui.banner(f"{self.info.floor} — {self.info.name}")
        ui.chip_line(session.wallet.balance)
        dealer = announce_dealer(session, ui, self.info.id)

        if not self.can_enter(session):
            ui.error(f"Minimum bet is {self.info.min_bet} chips.")
            ui.pause()
            return

        tier = pick_stake_tier(session, ui, title="Choose stake tier:")
        if tier is None:
            return
        wager_min, wager_max = effective_table_stakes(
            tier, session.wallet.balance, activity_min=self.info.min_bet
        )

        table = CrapsTable()
        session_net = 0
        rolls = 0
        # Working line bet while a point is out
        line_bet: dict | None = None  # {kind, amount}
        hardways: dict[str, int] = {}

        ui.print("Pass Line wins on 7/11 come-out; point must repeat before 7.")
        ui.print("Don't Pass is the dark side. Field and props settle each roll.")

        while True:
            ui.chip_line(session.wallet.balance)
            phase = "POINT " + str(table.point) if table.point else "COME-OUT"
            ui.print(f"\n--- {phase} ---")
            if table.last_roll:
                ui.dim(f"Last roll: {table.last_roll.label()}")
            if line_bet:
                ui.print(f"Working {line_bet['kind']}: {line_bet['amount']:,}")
            if hardways:
                ui.dim("Hardways: " + ", ".join(f"{k}={v}" for k, v in hardways.items()))

            if line_bet is None:
                choice = ui.menu_choice(
                    [
                        "Pass Line",
                        "Don't Pass",
                        "One-roll props only (Field / Any Craps / Any Seven)",
                        "Leave table",
                    ],
                    title="Line bet:",
                )
                if choice in (0, 4):
                    break
                line_kind = {1: "pass", 2: "dont", 3: None}[choice]
                line_amount = 0
                if line_kind:
                    line_label = "Don't Pass" if line_kind == "dont" else "Pass Line"
                    line_amount = ui.prompt_int(
                        f"{line_label} amount ({wager_min}-{wager_max}, 0 cancel)",
                        0,
                        wager_max,
                        default=wager_min,
                    )
                    if line_amount == 0 or line_amount < wager_min:
                        continue
                    if not session.wallet.debit(line_amount, self.info.id, f"Craps {line_kind}"):
                        ui.error("Insufficient chips.")
                        continue
                    line_bet = {"kind": line_kind, "amount": line_amount}
                    session_net -= line_amount

            # Optional one-roll sides each throw
            side_stakes: dict[str, int] = {}
            if ui.prompt_yes_no("Add one-roll side bets?", default=False):
                for bet_id in ("field", "any_craps", "any_seven"):
                    amt = ui.prompt_int(
                        f"{SIDE_BETS[bet_id]['label']} (0 skip)",
                        0,
                        wager_max,
                        default=0,
                    )
                    if amt >= wager_min:
                        if session.wallet.debit(amt, self.info.id, f"Craps {bet_id}"):
                            side_stakes[bet_id] = amt
                            session_net -= amt
                        else:
                            ui.error(f"Could not afford {bet_id}.")

            if ui.prompt_yes_no("Add/press hardways?", default=False):
                for bet_id in ("hard_4", "hard_6", "hard_8", "hard_10"):
                    if bet_id in hardways:
                        continue
                    amt = ui.prompt_int(
                        f"{SIDE_BETS[bet_id]['label']} (0 skip)",
                        0,
                        wager_max,
                        default=0,
                    )
                    if amt >= wager_min:
                        if session.wallet.debit(amt, self.info.id, f"Craps {bet_id}"):
                            hardways[bet_id] = amt
                            session_net -= amt

            point_before = table.point
            roll = table.roll()
            rolls += 1
            ui.print(f"\n  🎲 {roll.label()}")
            ui.dim(f'  {dealer.name}: "{pick_quip(dealer, "deal")}"')

            if line_bet:
                if line_bet["kind"] == "pass":
                    result = table.resolve_pass_line(line_bet["amount"], roll)
                else:
                    result = table.resolve_dont_pass(line_bet["amount"], roll, point_before)
                ui.print(result.message)
                if not result.working:
                    if result.payout > 0:
                        session.wallet.credit(result.payout, self.info.id, result.message)
                        session_net += result.payout
                        ui.success(f"Paid {result.payout:,}")
                        ui.dim(f'  {dealer.name}: "{pick_quip(dealer, "win")}"')
                    else:
                        ui.dim(f'  {dealer.name}: "{pick_quip(dealer, "lose")}"')
                    line_bet = None

            for bet_id, amt in list(side_stakes.items()):
                result = table.resolve_side_bet(bet_id, amt, roll)
                ui.dim(result.message)
                if result.payout > 0:
                    session.wallet.credit(result.payout, self.info.id, result.message)
                    session_net += result.payout

            for bet_id, amt in list(hardways.items()):
                result = table.resolve_side_bet(bet_id, amt, roll)
                ui.dim(result.message)
                if not result.working:
                    del hardways[bet_id]
                    if result.payout > 0:
                        session.wallet.credit(result.payout, self.info.id, result.message)
                        session_net += result.payout

            # seven-out clears hardways already via resolve; if line cleared and no hardways, offer leave
            if line_bet is None and not hardways:
                if not ui.prompt_yes_no("Shoot again?", default=True):
                    break

        # Refund any still-working hardways / line (player leaving mid-point)
        if line_bet:
            session.wallet.credit(line_bet["amount"], self.info.id, "Craps leave — line returned")
            session_net += line_bet["amount"]
        for bet_id, amt in hardways.items():
            session.wallet.credit(amt, self.info.id, f"Craps leave — {bet_id} returned")
            session_net += amt

        session.record_result(self.info.id, session_net, bets=rolls)
        ui.print(f"\nCraps session: {'+' if session_net >= 0 else ''}{session_net:,} over {rolls} roll(s)")
        ui.pause()
