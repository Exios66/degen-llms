from __future__ import annotations

from mandalay_bay.activities.base import Activity, ActivityInfo
from mandalay_bay.lottery import (
    MEGA_BALL_MAX,
    MEGA_POWERBALL_MAX,
    TICKET_ORDER,
    TICKET_TYPES,
    parse_pick_input,
    quick_pick_digits,
    quick_pick_mega,
    resolve_mega,
    resolve_pick3,
    resolve_pick4,
    resolve_scratcher,
    scaled_ticket_price,
    ticket_kind,
    validate_mega_picks,
)
from mandalay_bay.session import PlayerSession
from mandalay_bay.stakes import get_tier_payout_boost, pick_stake_tier


class LotteryActivity(Activity):
    info = ActivityInfo(
        id="lottery",
        name="Mandalay Lottery",
        floor="Lottery Counter",
        description="Pick 3/4, Mega/Powerball jackpot draws, and instant scratchers.",
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

        tier = pick_stake_tier(session, ui, title="Choose stake tier:")
        if tier is None:
            return
        scale = get_tier_payout_boost(tier.id)
        ui.dim(f"Stake tier: {tier.name} — {scale:g}× ticket price & prize scale")

        session_net = 0
        tickets = 0

        while True:
            ui.chip_line(session.wallet.balance)
            labels = []
            for tid in TICKET_ORDER:
                meta = TICKET_TYPES[tid]
                price = scaled_ticket_price(int(meta["price"]), tier.id)
                labels.append(
                    f"{meta['name']} — {price:,} chips · {meta['description']}"
                )
            choice = ui.menu_choice(labels, title="Choose a ticket:")
            if choice == 0:
                break
            ticket_id = TICKET_ORDER[choice - 1]
            meta = TICKET_TYPES[ticket_id]
            price = scaled_ticket_price(int(meta["price"]), tier.id)
            kind = ticket_kind(ticket_id)
            if not session.wallet.can_afford(price):
                ui.error("Insufficient chips for that ticket.")
                continue

            result = None
            if kind == "pick":
                digits = int(meta["digits"])
                mode = ui.menu_choice(["Quick Pick", "Choose numbers"], title="Lucky numbers:")
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
                if not session.wallet.debit(price, self.info.id, str(meta["name"])):
                    ui.error("Insufficient chips.")
                    continue
                result = (
                    resolve_pick3(picks, price, ticket_id=ticket_id)
                    if digits == 3
                    else resolve_pick4(picks, price, ticket_id=ticket_id)
                )
                ui.print(f"Your lucky numbers: {' '.join(map(str, picks))}")
            elif kind == "mega":
                ball_max = int(meta.get("ball_max", MEGA_BALL_MAX))
                mega_max = int(meta.get("mega_max", MEGA_POWERBALL_MAX))
                mode = ui.menu_choice(["Quick Pick", "Choose numbers"], title="Entry:")
                if mode == 0:
                    continue
                if mode == 1:
                    balls, mega = quick_pick_mega(ball_max=ball_max, mega_max=mega_max)
                else:
                    raw = ui.prompt(
                        f"Enter 5 unique lucky numbers 1–{ball_max}, comma-separated: "
                    )
                    try:
                        balls = sorted({int(x.strip()) for x in raw.split(",")})
                    except ValueError:
                        ui.error("Invalid lucky number list.")
                        continue
                    mega = ui.prompt_int(f"Powerball (1–{mega_max})", 1, mega_max, default=7)
                    err = validate_mega_picks(
                        balls, mega, ball_max=ball_max, mega_max=mega_max
                    )
                    if err:
                        ui.error(err)
                        continue
                if not session.wallet.debit(price, self.info.id, str(meta["name"])):
                    ui.error("Insufficient chips.")
                    continue
                result = resolve_mega(
                    balls, mega, price, ticket_id=ticket_id, tier_id=tier.id
                )
                ui.print(
                    f"Your ticket: {' '.join(map(str, balls))} + Powerball {mega}"
                )
            else:
                if not session.wallet.debit(price, self.info.id, str(meta["name"])):
                    ui.error("Insufficient chips.")
                    continue
                result = resolve_scratcher(ticket_id, tier_id=tier.id, price=price)

            assert result is not None
            tickets += 1
            session_net -= price
            ui.print(f"\n  {result.reason}")
            if result.draw:
                draw = list(result.draw)
                if kind == "mega" and len(draw) >= 6:
                    ui.dim(
                        f"  Draw: {' '.join(map(str, draw[:-1]))} + Powerball {draw[-1]}"
                    )
                else:
                    ui.dim(f"  Draw: {' '.join(map(str, draw))}")
            if result.win > 0:
                session.wallet.credit(result.win, self.info.id, result.reason)
                session_net += result.win
                ui.success(f"Ticket pays {result.win:,} chips!")
            else:
                ui.dim("Better luck on the next ticket.")

            if not ui.prompt_yes_no("Buy another ticket?", default=True):
                break

        session.record_result(self.info.id, session_net, bets=tickets)
        ui.print(
            f"\nLottery session: {'+' if session_net >= 0 else ''}{session_net:,} "
            f"over {tickets} ticket(s)"
        )
        ui.pause()
