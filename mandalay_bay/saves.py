from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

from mandalay_bay.chips import ChipWallet, TransactionKind
from mandalay_bay.display import TerminalUI, fmt_chips
from mandalay_bay.casino_amenities import CasinoAmenitiesState, ensure_amenities
from mandalay_bay.hotel import HotelState, RoomAmenitiesState, default_hotel_state, ensure_hotel
from mandalay_bay.pool_complex import PoolComplexState, ensure_pool_complex
from mandalay_bay.world_cycle import WorldCycleState, ensure_world_cycle
from mandalay_bay.bank_account import BankAccount, BankTransaction, BankTransactionKind, ensure_bank
from mandalay_bay.rewards import RewardsState, SAVE_VERSION_WITH_REWARDS, ensure_rewards, migrate_session_rewards
from mandalay_bay.session import ActivityStats, PlayerSession
from mandalay_bay.staff_manifest import set_staff_overrides

MAX_SLOTS = 5
DEFAULT_STARTING_CHIPS = 1000


def default_save_dir() -> Path:
    override = os.environ.get("MANDALAY_BAY_SAVE_DIR")
    if override:
        return Path(override).expanduser()
    return Path.home() / ".mandalay_bay" / "saves"


@dataclass
class SlotSummary:
    slot_id: int
    label: str
    player_name: str
    balance: int
    updated_at: datetime | None
    occupied: bool


class SaveLibrary:
    """Persistent multi-slot save library with recent-save ordering."""

    def __init__(self, save_dir: Path | None = None) -> None:
        self.save_dir = (save_dir or default_save_dir()).resolve()
        self.save_dir.mkdir(parents=True, exist_ok=True)
        self.library_path = self.save_dir / "library.json"
        self._recent: list[int] = []
        self._summaries: dict[str, dict] = {}
        self._load_index()

    def _slot_path(self, slot_id: int) -> Path:
        return self.save_dir / f"slot_{slot_id}.json"

    def _load_index(self) -> None:
        if not self.library_path.exists():
            self._recent = []
            self._summaries = {}
            return
        try:
            data = json.loads(self.library_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            self._recent = []
            self._summaries = {}
            return
        self._recent = [int(x) for x in data.get("recent", [])]
        self._summaries = {str(k): v for k, v in data.get("slots", {}).items()}

    def _write_index(self) -> None:
        payload = {"recent": self._recent, "slots": self._summaries}
        self.library_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def _touch_recent(self, slot_id: int) -> None:
        if slot_id in self._recent:
            self._recent.remove(slot_id)
        self._recent.insert(0, slot_id)
        self._recent = self._recent[:MAX_SLOTS]

    def _update_summary(self, session: PlayerSession) -> None:
        if session.slot_id is None:
            return
        key = str(session.slot_id)
        self._summaries[key] = {
            "label": session.slot_label,
            "player_name": session.player_name,
            "balance": session.wallet.balance,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

    def list_slots(self) -> list[SlotSummary]:
        slots: list[SlotSummary] = []
        for slot_id in range(1, MAX_SLOTS + 1):
            path = self._slot_path(slot_id)
            meta = self._summaries.get(str(slot_id), {})
            if path.exists():
                updated_raw = meta.get("updated_at")
                updated = datetime.fromisoformat(updated_raw) if updated_raw else None
                slots.append(
                    SlotSummary(
                        slot_id=slot_id,
                        label=meta.get("label", f"Slot {slot_id}"),
                        player_name=meta.get("player_name", "Guest"),
                        balance=meta.get("balance", 0),
                        updated_at=updated,
                        occupied=True,
                    )
                )
            else:
                slots.append(
                    SlotSummary(
                        slot_id=slot_id,
                        label=f"Slot {slot_id} (empty)",
                        player_name="",
                        balance=0,
                        updated_at=None,
                        occupied=False,
                    )
                )
        return slots

    def recent_slots(self) -> list[SlotSummary]:
        by_id = {s.slot_id: s for s in self.list_slots() if s.occupied}
        ordered: list[SlotSummary] = []
        for slot_id in self._recent:
            if slot_id in by_id:
                ordered.append(by_id[slot_id])
        for slot in self.list_slots():
            if slot.occupied and slot.slot_id not in self._recent:
                ordered.append(slot)
        return ordered

    def load_slot(self, slot_id: int) -> PlayerSession | None:
        path = self._slot_path(slot_id)
        if not path.exists():
            return None
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return None
        session = session_from_dict(data)
        session.slot_id = slot_id
        self._touch_recent(slot_id)
        self._write_index()
        return session

    def save_slot(self, session: PlayerSession) -> None:
        if session.slot_id is None:
            raise ValueError("Session has no slot_id — cannot save")
        path = self._slot_path(session.slot_id)
        path.write_text(json.dumps(session_to_dict(session), indent=2), encoding="utf-8")
        self._update_summary(session)
        self._touch_recent(session.slot_id)
        self._write_index()

    def delete_slot(self, slot_id: int) -> bool:
        path = self._slot_path(slot_id)
        if not path.exists():
            return False
        path.unlink(missing_ok=True)
        self._summaries.pop(str(slot_id), None)
        if slot_id in self._recent:
            self._recent.remove(slot_id)
        self._write_index()
        return True

    def create_session(
        self,
        slot_id: int,
        *,
        player_name: str = "Guest",
        starting_chips: int = DEFAULT_STARTING_CHIPS,
        label: str | None = None,
        use_color: bool = True,
        use_unicode: bool = True,
    ) -> PlayerSession:
        if not 1 <= slot_id <= MAX_SLOTS:
            raise ValueError(f"slot_id must be between 1 and {MAX_SLOTS}")
        session = PlayerSession(
            player_name=player_name,
            wallet=ChipWallet(balance=max(0, starting_chips)),
            use_color=use_color,
            use_unicode=use_unicode,
            slot_id=slot_id,
            slot_label=label or f"Slot {slot_id}",
        )
        ensure_hotel(session)
        ensure_rewards(session)
        ensure_pool_complex(session)
        ensure_amenities(session)
        ensure_bank(session)
        self.save_slot(session)
        return session


def session_to_dict(session: PlayerSession) -> dict:
    stats = {}
    for activity_id, s in session.activity_stats.items():
        stats[activity_id] = {
            "visits": s.visits,
            "hands_or_bets": s.hands_or_bets,
            "net_winnings": s.net_winnings,
        }
    txs = []
    for tx in session.wallet.transactions:
        txs.append(
            {
                "timestamp": tx.timestamp.isoformat(),
                "kind": tx.kind.value,
                "amount": tx.amount,
                "activity": tx.activity,
                "description": tx.description,
                "balance_after": tx.balance_after,
            }
        )
    payload = {
        "version": SAVE_VERSION_WITH_REWARDS,
        "player_name": session.player_name,
        "slot_id": session.slot_id,
        "slot_label": session.slot_label,
        "use_color": session.use_color,
        "use_unicode": session.use_unicode,
        "wallet": {"balance": session.wallet.balance, "transactions": txs},
        "activity_stats": stats,
        "progressive_pools": dict(session.progressive_pools),
    }
    if hasattr(session, "hotel") and session.hotel is not None:
        payload["hotel"] = asdict(session.hotel)
    if hasattr(session, "pool_complex") and session.pool_complex is not None:
        payload["pool_complex"] = asdict(session.pool_complex)
    if hasattr(session, "rewards") and session.rewards is not None:
        payload["rewards"] = asdict(session.rewards)
    if hasattr(session, "amenities") and session.amenities is not None:
        payload["amenities"] = asdict(session.amenities)
    if hasattr(session, "world_cycle") and session.world_cycle is not None:
        payload["world_cycle"] = asdict(session.world_cycle)
    if hasattr(session, "bank") and session.bank is not None:
        bank_txs = []
        for tx in session.bank.transactions:
            bank_txs.append(
                {
                    "timestamp": tx.timestamp.isoformat(),
                    "kind": tx.kind.value,
                    "amount": tx.amount,
                    "category": tx.category,
                    "description": tx.description,
                    "balance_after": tx.balance_after,
                }
            )
        payload["bank"] = {
            "balance": session.bank.balance,
            "account_name": session.bank.account_name,
            "transactions": bank_txs,
        }
    if hasattr(session, "staff_overrides") and session.staff_overrides is not None:
        payload["staff_overrides"] = session.staff_overrides
    return payload


def session_from_dict(data: dict) -> PlayerSession:
    from mandalay_bay.chips import ChipTransaction

    wallet_data = data.get("wallet", {})
    wallet = ChipWallet(balance=wallet_data.get("balance", DEFAULT_STARTING_CHIPS))
    wallet.transactions = []
    for raw in wallet_data.get("transactions", []):
        wallet.transactions.append(
            ChipTransaction(
                timestamp=datetime.fromisoformat(raw["timestamp"]),
                kind=TransactionKind(raw["kind"]),
                amount=raw["amount"],
                activity=raw["activity"],
                description=raw["description"],
                balance_after=raw["balance_after"],
            )
        )

    stats: dict[str, ActivityStats] = {}
    for activity_id, raw in data.get("activity_stats", {}).items():
        stats[activity_id] = ActivityStats(
            visits=raw.get("visits", 0),
            hands_or_bets=raw.get("hands_or_bets", 0),
            net_winnings=raw.get("net_winnings", 0),
        )

    session = PlayerSession(
        player_name=data.get("player_name", "Guest"),
        wallet=wallet,
        use_color=data.get("use_color", True),
        use_unicode=data.get("use_unicode", True),
        activity_stats=stats,
        slot_id=data.get("slot_id"),
        slot_label=data.get("slot_label", ""),
        progressive_pools=dict(data.get("progressive_pools", {})),
    )
    if "hotel" in data:
        hotel_data = dict(data["hotel"])
        ra_data = hotel_data.pop("room_amenities", None)
        session.hotel = HotelState(**hotel_data)
        if ra_data:
            session.hotel.room_amenities = RoomAmenitiesState(**ra_data)
    else:
        ensure_hotel(session)
    if "pool_complex" in data:
        session.pool_complex = PoolComplexState(**data["pool_complex"])
    else:
        ensure_pool_complex(session)
    data_version = data.get("version", 1)
    if "rewards" in data:
        session.rewards = RewardsState(**data["rewards"])
    else:
        migrate_session_rewards(session, data_version)
    if "amenities" in data:
        session.amenities = CasinoAmenitiesState(**data["amenities"])
    else:
        ensure_amenities(session)
    if "world_cycle" in data:
        session.world_cycle = WorldCycleState(**data["world_cycle"])
    else:
        ensure_world_cycle(session)
    if "bank" in data:
        bank_data = data["bank"]
        bank = BankAccount(
            balance=bank_data.get("balance", 0),
            account_name=bank_data.get("account_name", "Off-Strip Checking"),
        )
        bank.transactions = []
        for raw in bank_data.get("transactions", []):
            bank.transactions.append(
                BankTransaction(
                    timestamp=datetime.fromisoformat(raw["timestamp"]),
                    kind=BankTransactionKind(raw["kind"]),
                    amount=raw["amount"],
                    category=raw["category"],
                    description=raw["description"],
                    balance_after=raw["balance_after"],
                )
            )
        session.bank = bank
    else:
        ensure_bank(session)
    if "staff_overrides" in data:
        set_staff_overrides(session, data["staff_overrides"])
    return session


def _format_updated(when: datetime | None) -> str:
    if when is None:
        return "never"
    return when.astimezone().strftime("%Y-%m-%d %H:%M")


def run_save_picker(
    ui: TerminalUI,
    library: SaveLibrary,
    *,
    default_name: str = "Guest",
    default_chips: int = DEFAULT_STARTING_CHIPS,
    use_color: bool = True,
    use_unicode: bool = True,
) -> PlayerSession | None:
    """Choose an existing save, create a new one, or delete a save."""
    while True:
        ui.print()
        ui.banner("Save Library")
        ui.subtitle("Select a save slot to continue, or create a new visit:")

        recent = library.recent_slots()
        if recent:
            ui.print("\n--- Recent Saves ---")
            for entry in recent:
                ui.print(
                    f"  Slot {entry.slot_id}: {entry.label} — {entry.player_name} — "
                    f"{fmt_chips(entry.balance)} (last: {_format_updated(entry.updated_at)})"
                )

        all_slots = library.list_slots()
        options: list[str] = []
        for slot in all_slots:
            if slot.occupied:
                options.append(
                    f"Load Slot {slot.slot_id} — {slot.player_name} ({fmt_chips(slot.balance)})"
                )
            else:
                options.append(f"New save in Slot {slot.slot_id} (empty)")
        options.append("Delete a save")
        options.append("Exit without playing")

        choice = ui.menu_choice(options, title="Save slots:")
        if choice == 0:
            continue
        if choice == len(options) - 1:
            return None
        if choice == len(options):
            _delete_save_flow(ui, library)
            continue

        slot = all_slots[choice - 1]
        if slot.occupied:
            loaded = library.load_slot(slot.slot_id)
            if loaded is None:
                ui.error(f"Could not load Slot {slot.slot_id}.")
                ui.pause()
                continue
            loaded.use_color = use_color
            loaded.use_unicode = use_unicode
            ui.success(f"Loaded {loaded.slot_label} — {loaded.player_name}")
            ui.pause()
            return loaded

        name = ui.prompt(f"Player name [{default_name}]: ") or default_name
        label = ui.prompt(f"Save label [Slot {slot.slot_id}]: ") or f"Slot {slot.slot_id}"
        chips = ui.prompt_int("Starting chips", 100, 1_000_000, default=default_chips)
        session = library.create_session(
            slot.slot_id,
            player_name=name.strip() or default_name,
            starting_chips=chips,
            label=label.strip() or f"Slot {slot.slot_id}",
            use_color=use_color,
            use_unicode=use_unicode,
        )
        ui.success(f"Created {session.slot_label} for {session.player_name}")
        ui.pause()
        return session


def _delete_save_flow(ui: TerminalUI, library: SaveLibrary) -> None:
    occupied = [s for s in library.list_slots() if s.occupied]
    if not occupied:
        ui.error("No saves to delete.")
        ui.pause()
        return
    options = [f"Slot {s.slot_id} — {s.player_name} ({fmt_chips(s.balance)})" for s in occupied]
    choice = ui.menu_choice(options, title="Delete which save?")
    if choice == 0:
        return
    slot = occupied[choice - 1]
    if ui.prompt_yes_no(f"Delete Slot {slot.slot_id}? This cannot be undone.", default=False):
        if library.delete_slot(slot.slot_id):
            ui.success(f"Deleted Slot {slot.slot_id}.")
        else:
            ui.error("Delete failed.")
    ui.pause()
