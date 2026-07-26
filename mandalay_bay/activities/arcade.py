"""Arcade Alley — thin CLI stub; full CRT cabinets play on the web terminal."""
from __future__ import annotations

from mandalay_bay.activities.base import Activity, ActivityInfo
from mandalay_bay.session import PlayerSession

CABINETS = (
    ("Strip Cross", 5, "Frogger-style dash across Las Vegas Blvd"),
    ("Neon Invaders", 10, "Blast descending neon signs"),
    ("High-Roller Breakout", 10, "Felt paddle vs card-suit bricks"),
    ("Showgirl Beat", 15, "Kick / snare / hat rhythm match"),
)


class ArcadeActivity(Activity):
    info = ActivityInfo(
        id="arcade",
        name="Mandalay Arcade",
        floor="Arcade Alley",
        description="Vegas-styled CRT cabinets — play the full overlays in the web terminal.",
        min_bet=5,
    )

    def run(self, session: PlayerSession, ui) -> None:
        session.record_visit(self.info.id)
        ui.banner(f"{self.info.floor} — {self.info.name}")
        ui.chip_line(session.wallet.balance)
        ui.print("Full arcade cabinets (CRT overlay, touch + keyboard) run in the browser.")
        ui.dim("https://exios66.github.io/degen-llms/ → Explore Arcade Alley")
        ui.print("")
        for name, cost, blurb in CABINETS:
            ui.info(f"{name} — {cost} chips · {blurb}")
        ui.print("")
        ui.dim("Earn arcade tickets on the web; redeem for small chip packs and comps.")
        session.record_result(self.info.id, 0, bets=0)
        ui.pause()
