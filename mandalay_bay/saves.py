from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from mandalay_bay.chips import ChipTransaction, ChipWallet, TransactionKind
from mandalay_bay.session import ActivityStats, PlayerSession

SAVE_VERSION = 1
MAX_SAVE_SLOTS = 5
DEFAULT_STARTING_CHIPS = 1000


def default_save_dir() -> Path:
    xdg = os.environ.get("XDG_DATA_HOME")
    if xdg:
        return Path(xdg) / "mandalay-bay" / "saves"
    return Path.home() / ".local" / "share" / "mandalay-bay" / "saves"


@dataclass
class SaveSlotSummary:
    slot_id: int
    label: str
    player_name: str
    balance: int
    created_at: str
    updated_at: str
    is_empty: bool = False

    @property
    def display_line(self) -> str:
        if self.is_empty:
            return f"Slot {self.slot_id}: [Empty]"
        updated = self.updated_at[:16].replace("T", " ")
        return (
            f"Slot {self.slot_id}: {self.label} — {self.player_name}, "
            f"{self.balance:,} chips (last played {updated})"
        )


@dataclass
class SaveLibrary:
    """On-disk save library with recent-play ordering."""

    save_dir: Path
    slots: dict[int, SaveSlotSummary] = field(default_factory=dict)
    recent_order: list[int] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.save_dir.mkdir(parents=True, exist_ok=True)
        if not self.slots:
            self._init_empty_slots()

    def _init_empty_slots(self) -> None:
        for slot_id in range(1, MAX_SAVE_SLOTS + 1):
            self.slots[slot_id] = SaveSlotSummary(
                slot_id=slot_id,
                label="",
                player_name="",
                balance=0,
                created_at="",
                updated_at="",
                is_empty=True,
            )

    @property
    def index_path(self) -> Path:
        return self.save_dir / "library.json"

    @classmethod
    def load(cls, save_dir: Path | None = None) -> SaveLibrary:
        directory = save_dir or default_save_dir()
        library = cls(save_dir=directory)
        if not library.index_path.exists():
            library.save_index()
            return library

        data = json.loads(library.index_path.read_text(encoding="utf-8"))
        if data.get("version") != SAVE_VERSION:
            raise ValueError(f"Unsupported save version: {data.get('version')}")

        library.recent_order = data.get("recent_order", [])
        library.slots = {}
        for entry in data.get("slots", []):
            summary = SaveSlotSummary(**entry)
            library.slots[summary.slot_id] = summary

        for slot_id in range(1, MAX_SAVE_SLOTS + 1):
            if slot_id not in library.slots:
                library.slots[slot_id] = SaveSlotSummary(
                    slot_id=slot_id,
                    label="",
                    player_name="",
                    balance=0,
                    created_at="",
                    updated_at="",
                    is_empty=True,
                )
        return library

    def save_index(self) -> None:
        payload = {
            "version": SAVE_VERSION,
            "recent_order": self.recent_order,
            "slots": [asdict(self.slots[i]) for i in range(1, MAX_SAVE_SLOTS + 1)],
        }
        self.index_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def slot_path(self, slot_id: int) -> Path:
        return self.save_dir / f"slot_{slot_id:02d}.json"

    def ordered_summaries(self) -> list[SaveSlotSummary]:
        seen: set[int] = set()
        ordered: list[SaveSlotSummary] = []
        for slot_id in self.recent_order:
            if slot_id in self.slots and slot_id not in seen:
                ordered.append(self.slots[slot_id])
                seen.add(slot_id)
        for slot_id in range(1, MAX_SAVE_SLOTS + 1):
            if slot_id not in seen:
                ordered.append(self.slots[slot_id])
        return ordered

    def touch_recent(self, slot_id: int) -> None:
        if slot_id in self.recent_order:
            self.recent_order.remove(slot_id)
        self.recent_order.insert(0, slot_id)

    def delete_slot(self, slot_id: int) -> None:
        path = self.slot_path(slot_id)
        if path.exists():
            path.unlink()
        self.slots[slot_id] = SaveSlotSummary(
            slot_id=slot_id,
            label="",
            player_name="",
            balance=0,
            created_at="",
            updated_at="",
            is_empty=True,
        )
        if slot_id in self.recent_order:
            self.recent_order.remove(slot_id)
        self.save_index()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _serialize_transaction(tx: ChipTransaction) -> dict[str, Any]:
    return {
        "timestamp": tx.timestamp.isoformat(),
        "kind": tx.kind.value,
        "amount": tx.amount,
        "activity": tx.activity,
        "description": tx.description,
        "balance_after": tx.balance_after,
    }


def _deserialize_transaction(data: dict[str, Any]) -> ChipTransaction:
    return ChipTransaction(
        timestamp=datetime.fromisoformat(data["timestamp"]),
        kind=TransactionKind(data["kind"]),
        amount=data["amount"],
        activity=data["activity"],
        description=data["description"],
        balance_after=data["balance_after"],
    )


def session_to_dict(session: PlayerSession) -> dict[str, Any]:
    stats = {
        activity_id: {
            "visits": s.visits,
            "hands_or_bets": s.hands_or_bets,
            "net_winnings": s.net_winnings,
        }
        for activity_id, s in session.activity_stats.items()
    }
    return {
        "version": SAVE_VERSION,
        "slot_id": session.slot_id,
        "slot_label": session.slot_label,
        "player_name": session.player_name,
        "created_at": session.created_at,
        "updated_at": session.updated_at,
        "use_color": session.use_color,
        "use_unicode": session.use_unicode,
        "wallet": {
            "balance": session.wallet.balance,
            "transactions": [_serialize_transaction(t) for t in session.wallet.transactions],
        },
        "activity_stats": stats,
    }


def session_from_dict(data: dict[str, Any]) -> PlayerSession:
    wallet_data = data["wallet"]
    transactions = [_deserialize_transaction(t) for t in wallet_data.get("transactions", [])]
    wallet = ChipWallet(balance=wallet_data["balance"], transactions=transactions)

    stats: dict[str, ActivityStats] = {}
    for activity_id, s in data.get("activity_stats", {}).items():
        stats[activity_id] = ActivityStats(
            visits=s["visits"],
            hands_or_bets=s["hands_or_bets"],
            net_winnings=s["net_winnings"],
        )

    return PlayerSession(
        player_name=data["player_name"],
        wallet=wallet,
        use_color=data.get("use_color", True),
        use_unicode=data.get("use_unicode", True),
        activity_stats=stats,
        slot_id=data["slot_id"],
        slot_label=data.get("slot_label", f"Slot {data['slot_id']}"),
        created_at=data.get("created_at", _now_iso()),
        updated_at=data.get("updated_at", _now_iso()),
    )


def save_session(library: SaveLibrary, session: PlayerSession) -> None:
    session.updated_at = _now_iso()
    payload = session_to_dict(session)
    library.slot_path(session.slot_id).write_text(
        json.dumps(payload, indent=2),
        encoding="utf-8",
    )
    library.slots[session.slot_id] = SaveSlotSummary(
        slot_id=session.slot_id,
        label=session.slot_label,
        player_name=session.player_name,
        balance=session.wallet.balance,
        created_at=session.created_at,
        updated_at=session.updated_at,
        is_empty=False,
    )
    library.touch_recent(session.slot_id)
    library.save_index()


def load_session(library: SaveLibrary, slot_id: int) -> PlayerSession:
    path = library.slot_path(slot_id)
    if not path.exists():
        raise FileNotFoundError(f"No save data for slot {slot_id}")
    data = json.loads(path.read_text(encoding="utf-8"))
    session = session_from_dict(data)
    library.touch_recent(slot_id)
    library.save_index()
    return session


def create_new_session(
    library: SaveLibrary,
    slot_id: int,
    *,
    player_name: str,
    starting_chips: int = DEFAULT_STARTING_CHIPS,
    use_color: bool = True,
    use_unicode: bool = True,
    slot_label: str | None = None,
) -> PlayerSession:
    now = _now_iso()
    label = slot_label or f"Save {slot_id}"
    session = PlayerSession(
        player_name=player_name,
        wallet=ChipWallet(balance=starting_chips),
        use_color=use_color,
        use_unicode=use_unicode,
        slot_id=slot_id,
        slot_label=label,
        created_at=now,
        updated_at=now,
    )
    save_session(library, session)
    return session
