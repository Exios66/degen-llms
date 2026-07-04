from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

from mandalay_bay.session import PlayerSession


@dataclass(frozen=True, slots=True)
class ActivityInfo:
    id: str
    name: str
    floor: str
    description: str
    min_bet: int


class Activity(ABC):
    info: ActivityInfo

    @abstractmethod
    def run(self, session: PlayerSession, ui) -> None:
        """Run the activity; mutates session wallet in place."""

    def can_enter(self, session: PlayerSession) -> bool:
        return session.wallet.balance >= self.info.min_bet
