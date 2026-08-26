"""Arcade Alley — full CRT-style cabinets in text mode for the Python CLI."""
from __future__ import annotations

from mandalay_bay.activities.base import Activity, ActivityInfo
from mandalay_bay.arcade_catalog import (
    ARCADE_GAMES,
    CABINETS,
    REDEEM_OFFERS,
    payout_from_mult,
    tickets_from_score,
)
from mandalay_bay.arcade_games import run_cabinet
from mandalay_bay.arcade_state import ensure_arcade, persist_arcade
from mandalay_bay.session import PlayerSession


def _apply_redeem_flag(session: PlayerSession, flag: str) -> None:
    """Mirror web arcade redeem flags onto session RPG/rewards blobs."""
    if not hasattr(session, "web_only_state") or session.web_only_state is None:
        session.web_only_state = {}
    rpg = session.web_only_state.setdefault("rpg", {})
    if not isinstance(rpg, dict):
        rpg = {}
        session.web_only_state["rpg"] = rpg
    flags = rpg.setdefault("flags", {})
    flags[flag] = True
    if flag == "arcade_drink_refill":
        rewards = session.web_only_state.setdefault("rewards", {})
        if isinstance(rewards, dict):
            unlocked = rewards.setdefault("unlockedComps", [])
            redeemed = rewards.setdefault("redeemedComps", [])
            if "welcome_drink" not in unlocked:
                unlocked.append("welcome_drink")
            rewards["redeemedComps"] = [c for c in redeemed if c != "welcome_drink"]
            flags["has_welcome_drink_comp"] = True
            flags.pop("redeemed_welcome_drink", None)


class ArcadeActivity(Activity):
    info = ActivityInfo(
        id="arcade",
        name="Mandalay Arcade",
        floor="Arcade Alley",
        description="Vegas-styled CRT cabinets — skill play for chips and redeemable tickets.",
        min_bet=5,
    )

    def run(self, session: PlayerSession, ui) -> None:
        session.record_visit(self.info.id)
        state = ensure_arcade(session)
        session_net = 0
        plays = 0

        while True:
            ui.banner(f"{self.info.floor} — {self.info.name}")
            ui.chip_line(session.wallet.balance)
            ui.dim(f"Arcade tickets: {state.tickets} · lifetime plays: {state.lifetime_plays}")
            choice = ui.menu_choice(
                [
                    "Play a cabinet",
                    "Ticket redeem shop",
                    "High scores",
                    "Leave arcade",
                ],
                title="Arcade Alley:",
            )
            if choice == 0 or choice == 4:
                break
            if choice == 1:
                net, count = self._play_loop(session, ui, state)
                session_net += net
                plays += count
                persist_arcade(session, state)
            elif choice == 2:
                self._redeem_loop(session, ui, state)
                persist_arcade(session, state)
            elif choice == 3:
                self._show_high_scores(ui, state)
                ui.pause()

        persist_arcade(session, state)
        if plays:
            session.record_result(self.info.id, session_net, bets=plays)
        ui.pause()

    def _play_loop(self, session: PlayerSession, ui, state) -> tuple[int, int]:
        labels = [f"{g.title} — {g.cost} chips · {g.classic}" for g in ARCADE_GAMES]
        pick = ui.menu_choice(labels, title="Select cabinet:")
        if pick == 0:
            return 0, 0
        game = ARCADE_GAMES[pick - 1]
        if session.wallet.balance < game.cost:
            ui.error(f"Need {game.cost} chips to play.")
            ui.pause()
            return 0, 0
        if not session.wallet.debit(game.cost, self.info.id, f"Arcade: {game.title}"):
            ui.error("Insufficient chips.")
            ui.pause()
            return 0, 0

        ui.banner(game.title)
        ui.dim(game.blurb)
        ui.dim(game.controls)
        score, cleared, mult = run_cabinet(game.id, ui)
        tickets = tickets_from_score(score, cleared=cleared)
        new_high = state.record_play(game.id, score, tickets)
        payout = payout_from_mult(game.cost, mult)
        session_net = payout - game.cost
        if payout > 0:
            session.wallet.credit(payout, self.info.id, f"{game.title} payout")
        ui.print(f"\nFinal score: {score}")
        if new_high:
            ui.success("New high score!")
        ui.print(f"Tickets earned: {tickets} (balance: {state.tickets})")
        if payout > 0:
            ui.success(f"Skill payout: {payout:,} chips ({mult:.1f}× cost)")
        else:
            ui.dim("No chip payout this run.")
        ui.pause()
        return session_net, 1

    def _redeem_loop(self, session: PlayerSession, ui, state) -> None:
        while True:
            ui.banner("Arcade Ticket Shop")
            ui.print(f"Tickets: {state.tickets}")
            labels = []
            for offer in REDEEM_OFFERS:
                status = ""
                if offer.kind == "flag" and offer.flag and state.flags.get(offer.flag):
                    status = " [owned]"
                labels.append(f"{offer.label} — {offer.cost_tickets} tickets{status}")
            pick = ui.menu_choice(labels + ["Back"], title="Redeem:")
            if pick == 0 or pick == len(labels) + 1:
                break
            offer = REDEEM_OFFERS[pick - 1]
            result = state.redeem(offer.id)
            if not result["ok"]:
                ui.error(result["message"])
                ui.pause()
                continue
            flag = result.get("flag")
            if flag:
                _apply_redeem_flag(session, flag)
            chips = int(result.get("chips") or 0)
            if chips > 0:
                session.wallet.credit(chips, self.info.id, f"Arcade redeem: {offer.label}")
            ui.success(result["message"])
            ui.pause()

    def _show_high_scores(self, ui, state) -> None:
        ui.print("\n--- High Scores ---")
        if not state.high_scores:
            ui.dim("No scores yet — play a cabinet!")
            return
        for game in ARCADE_GAMES:
            score = state.high_scores.get(game.id, 0)
            ui.print(f"  {game.title}: {score:,}")
