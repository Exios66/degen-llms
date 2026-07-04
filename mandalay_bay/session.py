from __future__ import annotations

from dataclasses import dataclass, field

from mandalay_bay.chips import ChipWallet


@dataclass
class ActivityStats:
    visits: int = 0
    hands_or_bets: int = 0
    net_winnings: int = 0


@dataclass
class PlayerSession:
    """Persistent casino visit state with unified chip wallet."""

    player_name: str = "Guest"
    wallet: ChipWallet = field(default_factory=lambda: ChipWallet(balance=1000))
    use_color: bool = True
    use_unicode: bool = True
    activity_stats: dict[str, ActivityStats] = field(default_factory=dict)

    def stat_for(self, activity: str) -> ActivityStats:
        if activity not in self.activity_stats:
            self.activity_stats[activity] = ActivityStats()
        return self.activity_stats[activity]

    def record_visit(self, activity: str) -> None:
        self.stat_for(activity).visits += 1

    def record_result(self, activity: str, net: int, bets: int = 1) -> None:
        stats = self.stat_for(activity)
        stats.hands_or_bets += bets
        stats.net_winnings += net
