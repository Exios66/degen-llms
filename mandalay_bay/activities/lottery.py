from __future__ import annotations

from mandalay_bay.activities.base import Activity, ActivityInfo
from mandalay_bay.lottery import (
    TICKET_TYPES,
    parse_pick_input,
    quick_pick_digits,
    quick_pick_mega,
    resolve_mega,
    resolve_pick3,
    resolve_pick4,
    resolve_scratcher,
)
from mandalay_bay.session import PlayerSession


class LotteryActivity(Activity):
    info = ActivityInfo(
        id="lottery",
        name="Mandalay Lottery",
        floor="Lottery Counter",
        description="Pick 3/4, Mega jackpot draws, and instant scratchers.",
        min_bet=2,
    )

    def run(self, session: PlayerSession, ui) -> None:
        session.record_visit(self.info.id)
        ui.banner(f"{self.info.floor} — {self.info.name}")
        ui.chip_line(session.wallet.balance)

        if not self.can_enter(session):
            ui.error(f"Minimum ticket is {self.info.min_bet} chips.")
            ui.pause()
            return

        session_net = 0
        tickets = 0
        order = ["pick3", "pick4", "mega", "scratch_gold", "scratch_wild"]

        while True:
            ui.chip_line(session.wallet.balance)
            labels = [
                f"{TICKET_TYPES[tid]['name']} — {TICKET_TYPES[tid]['price']} chips · {TICKET_TYPES[tid]['description']}"
                for tid in order
            ]
            choice = ui.menu_choice(labels, title="Choose a ticket:")
            if choice == 0:
                break
            ticket_id = order[choice - 1]
            meta = TICKET_TYPES[ticket_id]
            price = int(meta["price"])
            if not session.wallet.can_afford(price):
                ui.error("Insufficient chips for that ticket.")
                continue

            result = None
            if ticket_id in ("pick3", "pick4"):
                digits = int(meta["digits"])
                mode = ui.menu_choice(["Quick Pick", "Choose numbers"], title="Entry:")
                if mode == 0:
                    continue
                if mode == 1:
                    picks = quick_pick_digits(digits)
                else:
                    raw = ui.prompt(f"Enter {digits} digits (e.g. {'0' * digits}): ")
                    picks = parse_pick_input(raw, digits)
                    if picks is None:
                        ui.error(f"Need exactly {digits} digits.")
                        continue
                if not session.wallet.debit(price, self.info.id, meta["name"]):
                    ui.error("Insufficient chips.")
                    continue
                result = resolve_pick3(picks, price) if ticket_id == "pick3" else resolve_pick4(picks, price)
                ui.print(f"Your numbers: {' '.join(map(str, picks))}")
            elif ticket_id == "mega":
                mode = ui.menu_choice(["Quick Pick", "Choose numbers"], title="Entry:")
                if mode == 0:
                    continue
                if mode == 1:
                    balls, mega = quick_pick_mega()
                else:
                    raw = ui.prompt("Enter 5 unique balls 1–45, comma-separated: ")
                    try:
                        balls = sorted({int(x.strip()) for x in raw.split(",")})
                    except ValueError:
                        ui.error("Invalid ball list.")
                        continue
                    if len(balls) != 5 or any(b < 1 or b > 45 for b in balls):
                        ui.error("Need five unique numbers from 1–45.")
                        continue
                    mega = ui.prompt_int("Mega ball (1–20)", 1, 20, default=7)
                if not session.wallet.debit(price, self.info.id, meta["name"]):
                    ui.error("Insufficient chips.")
                    continue
                result = resolve_mega(balls, mega, price)
                ui.print(f"Your ticket: {' '.join(map(str, balls))} + Mega {mega}")
            else:
                if not session.wallet.debit(price, self.info.id, meta["name"]):
                    ui.error("Insufficient chips.")
                    continue
                result = resolve_scratcher(ticket_id)

            assert result is not None
            tickets += 1
            session_net -= price
            ui.print(f"\n  {result.reason}")
            if result.draw:
                ui.dim(f"  Draw: {' '.join(map(str, result.draw))}")
            if result.win > 0:
                session.wallet.credit(result.win, self.info.id, result.reason)
                session_net += result.win
                ui.success(f"Ticket pays {result.win:,} chips!")
            else:
                ui.dim("Better luck on the next ticket.")

            if not ui.prompt_yes_no("Buy another ticket?", default=True):
                break

        session.record_result(self.info.id, session_net, bets=tickets)
        ui.print(f"\nLottery session: {'+' if session_net >= 0 else ''}{session_net:,} over {tickets} ticket(s)")
        ui.pause()
