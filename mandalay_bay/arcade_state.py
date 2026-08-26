"""Persisted Arcade Alley progress — tickets, high scores, redeem flags."""
from __future__ import annotations

from dataclasses import dataclass, field

from mandalay_bay.arcade_catalog import OFFER_BY_ID, REDEEM_OFFERS, tickets_from_score


@dataclass
class ArcadeState:
    tickets: int = 0
    lifetime_plays: int = 0
    high_scores: dict[str, int] = field(default_factory=dict)
    flags: dict[str, bool] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: dict | None) -> ArcadeState:
        if not data:
            return cls()
        return cls(
            tickets=max(0, int(data.get("tickets", 0))),
            lifetime_plays=max(0, int(data.get("lifetimePlays", data.get("lifetime_plays", 0)))),
            high_scores={k: int(v) for k, v in (data.get("highScores") or data.get("high_scores") or {}).items()},
            flags={k: bool(v) for k, v in (data.get("flags") or {}).items()},
        )

    def to_dict(self) -> dict:
        return {
            "tickets": self.tickets,
            "lifetimePlays": self.lifetime_plays,
            "highScores": dict(self.high_scores),
            "flags": dict(self.flags),
        }

    def record_play(self, game_id: str, score: int, tickets_earned: int) -> bool:
        self.lifetime_plays += 1
        self.tickets += max(0, tickets_earned)
        prev = self.high_scores.get(game_id, 0)
        if score > prev:
            self.high_scores[game_id] = score
            return True
        return False

    def can_redeem(self, offer_id: str) -> bool:
        offer = OFFER_BY_ID.get(offer_id)
        if not offer:
            return False
        if self.tickets < offer.cost_tickets:
            return False
        if offer.kind == "flag" and offer.flag and self.flags.get(offer.flag):
            return False
        return True

    def redeem(self, offer_id: str) -> dict:
        offer = OFFER_BY_ID.get(offer_id)
        if not offer:
            return {"ok": False, "message": "Unknown offer."}
        if not self.can_redeem(offer_id):
            if offer.kind == "flag" and offer.flag and self.flags.get(offer.flag):
                return {"ok": False, "message": "Already redeemed."}
            return {"ok": False, "message": "Not enough tickets."}
        self.tickets -= offer.cost_tickets
        if offer.kind == "chips":
            return {
                "ok": True,
                "message": f"Cashed {offer.cost_tickets} tickets for {offer.amount} chips.",
                "chips": offer.amount,
            }
        assert offer.flag
        self.flags[offer.flag] = True
        return {"ok": True, "message": f"Redeemed: {offer.label}.", "chips": 0, "flag": offer.flag}


def ensure_arcade(session) -> ArcadeState:
    raw = getattr(session, "arcade", None)
    if raw is None:
        raw = {}
        session.arcade = raw
    if isinstance(raw, ArcadeState):
        return raw
    state = ArcadeState.from_dict(raw if isinstance(raw, dict) else None)
    session.arcade = state
    return state


def persist_arcade(session, state: ArcadeState) -> None:
    session.arcade = state
