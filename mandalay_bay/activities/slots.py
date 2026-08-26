from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from blackjack.rng import SECURE_RANDOM
from mandalay_bay.activities.base import Activity, ActivityInfo
from mandalay_bay.session import PlayerSession
from mandalay_bay.stakes import (
    effective_slot_stakes,
    format_stake_range,
    get_tier_payout_boost,
    pick_stake_tier,
    tier_uses_salon_limits,
)
from mandalay_bay.terminal_fx import animate_reel_tease, spin_pause


@dataclass(frozen=True, slots=True)
class Symbol:
    name: str
    display: str
    weight: int


@dataclass(frozen=True, slots=True)
class SlotMachine:
    id: str
    name: str
    min_bet: int
    max_bet: int
    symbols: tuple[Symbol, ...]
    paytable: dict[str, int]
    tagline: str = ""
    progressive: bool = False
    progressive_pool_id: str | None = None
    jackpot_requires_max_bet: bool = False
    progressive_contribution_rate: float = 0.0
    progressive_seed: int = 100_000
    jackpot_key: str | None = None
    cherry_rules: bool = False
    salon_only: bool = False
    destination_only: bool = False
    destination_id: str | None = None
    home_only: bool = False


_CATALOG_PATH = Path(__file__).resolve().parent.parent / "data" / "slots_catalog.json"

STRIP_DESTINATIONS = {
    "luxor": "Luxor",
    "excalibur": "Excalibur",
    "bellagio": "Bellagio",
    "circa": "Circa",
}


def _sym(name: str, display: str, weight: int) -> Symbol:
    return Symbol(name, display, weight)



def _machine_from_record(rec: dict) -> SlotMachine:
    symbols = tuple(_sym(s["name"], s["display"], s["weight"]) for s in rec["symbols"])
    paytable = {k: int(v) for k, v in rec["paytable"].items()}
    pool_id = rec.get("progressivePoolId")
    return SlotMachine(
        id=rec["id"],
        name=rec["name"],
        min_bet=int(rec["minBet"]),
        max_bet=int(rec["maxBet"]),
        symbols=symbols,
        paytable=paytable,
        tagline=str(rec.get("tagline") or ""),
        progressive=bool(rec.get("progressive")),
        progressive_pool_id=pool_id if pool_id else None,
        jackpot_requires_max_bet=bool(rec.get("jackpotRequiresMaxBet")),
        progressive_contribution_rate=float(rec.get("progressiveContributionRate") or 0),
        progressive_seed=int(rec.get("progressiveSeed") or 0),
        jackpot_key=rec.get("jackpotKey"),
        cherry_rules=bool(rec.get("cherryRules")),
        salon_only=bool(rec.get("salonOnly")),
        destination_only=bool(rec.get("destinationOnly")),
        destination_id=rec.get("destinationId"),
        home_only=bool(rec.get("homeOnly")),
    )


def _load_catalog() -> tuple[dict[str, SlotMachine], list[str]]:
    raw = json.loads(_CATALOG_PATH.read_text(encoding="utf-8"))
    machines = {rec["id"]: _machine_from_record(rec) for rec in raw}
    order = [rec["id"] for rec in raw]
    return machines, order


MACHINES, MACHINE_ORDER = _load_catalog()


def machines_for_catalog(catalog: str, *, tier_id: str | None = None) -> list[str]:
    """Filter machine ids: main_floor | salon | destination:<id> | all."""
    if catalog == "all":
        return list(MACHINE_ORDER)
    if catalog == "salon":
        return [mid for mid in MACHINE_ORDER if MACHINES[mid].salon_only]
    if catalog.startswith("destination:"):
        dest = catalog.split(":", 1)[1]
        return [
            mid for mid in MACHINE_ORDER
            if MACHINES[mid].destination_only and MACHINES[mid].destination_id == dest
        ]
    # main floor — exclude salon and destination exclusives
    return [
        mid for mid in MACHINE_ORDER
        if not MACHINES[mid].salon_only and not MACHINES[mid].destination_only
    ]


def salon_catalog_available(tier_id: str) -> bool:
    from mandalay_bay.stakes import tier_uses_salon_limits, get_tier

    try:
        tier = get_tier(tier_id)
    except KeyError:
        return False
    return tier_uses_salon_limits(tier)


def get_machine(machine_id: str) -> SlotMachine:
    return MACHINES[machine_id]


def progressive_pool(session: PlayerSession, pool_id: str, seed: int) -> int:
    return session.progressive_pools.get(pool_id, seed)


def _contribute_to_progressive(session: PlayerSession, machine: SlotMachine, bet: int) -> None:
    if not machine.progressive or not machine.progressive_pool_id:
        return
    pool_id = machine.progressive_pool_id
    current = progressive_pool(session, pool_id, machine.progressive_seed)
    contribution = max(1, int(bet * machine.progressive_contribution_rate))
    session.progressive_pools[pool_id] = current + contribution


def _weighted_pick(symbols: tuple[Symbol, ...]) -> Symbol:
    pool = [s for s in symbols for _ in range(s.weight)]
    return pool[SECURE_RANDOM.randrange(0, len(pool))]


def _spin_reels(machine: SlotMachine) -> list[Symbol]:
    return [_weighted_pick(machine.symbols) for _ in range(3)]


def estimate_base_game_rtp(machine: SlotMachine) -> tuple[float, float]:
    """Exact PAR-sheet base-game RTP and hit frequency (excludes progressives)."""
    symbols = machine.symbols
    total_w = sum(s.weight for s in symbols)
    probs = [s.weight / total_w for s in symbols]
    rtp = 0.0
    hit_frequency = 0.0
    for i, left in enumerate(symbols):
        for j, mid in enumerate(symbols):
            for k, right in enumerate(symbols):
                reels = [left, mid, right]
                probability = probs[i] * probs[j] * probs[k]
                win, _ = _payout(reels, 1, machine)
                rtp += probability * win
                if win > 0:
                    hit_frequency += probability
    return rtp, hit_frequency


_ASCII_SYMBOLS = {
    "bell", "cherry", "lemon", "diamond", "buffalo", "gold", "sunset", "eagle",
    "ghost", "mummy", "yeti", "moon", "skull", "bat", "witch", "slipper",
    "emerald", "tin", "lion", "scarecrow", "guardian", "shield", "sword", "gem",
    "coin", "tiger", "dragon", "pearl", "fan", "lantern", "wheel", "crown",
    "star", "megabuck", "obelisk", "scarab", "ankh", "sphinx", "pyramid", "eye",
    "castle", "lance", "helmet", "banner", "fountain", "glass", "orchid", "bloom",
    "marble", "stadium", "neon", "chip", "flash", "vamp", "dice", "vault", "whale",
    "champagne", "boat", "lotus", "cobra", "sun", "flame", "table", "chalice",
    "grail", "cross", "lake", "spark", "glassflower", "vase", "butterfly",
    "fontana", "fang", "ball", "ticket", "drop", "obsidian",
}


def _display_symbol(sym: Symbol, use_unicode: bool) -> str:
    if not use_unicode and sym.name in _ASCII_SYMBOLS:
        return sym.name[:3].upper()
    return sym.display


def _payout(
    reels: list[Symbol],
    bet: int,
    machine: SlotMachine,
    *,
    jackpot_amount: int | None = None,
    tier_boost: float = 1.0,
) -> tuple[int, str]:
    keys = [r.name for r in reels]
    line = "|".join(keys)

    if machine.jackpot_key and line == machine.jackpot_key and jackpot_amount is not None:
        return jackpot_amount, f"PROGRESSIVE JACKPOT! {jackpot_amount:,} chips!"

    def _apply(base_mult: int, label: str) -> tuple[int, str]:
        effective = round(base_mult * tier_boost)
        boost_tag = f" ({tier_boost:.0f}× tier)" if tier_boost != 1.0 else ""
        return bet * effective, f"{label} {effective}x{boost_tag}"

    if line in machine.paytable:
        return _apply(machine.paytable[line], f"Three {reels[0].display}!")

    if machine.cherry_rules:
        if keys[0] == keys[1] == "cherry" and "cherry|cherry" in machine.paytable:
            return _apply(machine.paytable["cherry|cherry"], "Two cherries!")
        if keys[0] == "cherry" and "cherry" in machine.paytable:
            return _apply(machine.paytable["cherry"], "Cherry on line!")

    parts = line.split("|")
    if len(parts) >= 2 and parts[0] == parts[1]:
        pair_key = f"{parts[0]}|{parts[1]}"
        if pair_key in machine.paytable:
            return _apply(machine.paytable[pair_key], f"Two {reels[0].display}!")
    if parts[0] in machine.paytable and "|" not in parts[0]:
        single_key = parts[0]
        if single_key in machine.paytable and single_key.count("|") == 0:
            return _apply(machine.paytable[single_key], f"{reels[0].display} on line!")

    return 0, "No win"


def _jackpot_eligible(machine: SlotMachine, bet: int, effective_max: int) -> bool:
    if not machine.jackpot_requires_max_bet:
        return True
    return bet >= effective_max


def _try_jackpot(
    session: PlayerSession,
    machine: SlotMachine,
    reels: list[Symbol],
    bet: int,
    effective_max: int,
) -> int | None:
    if not machine.progressive or not machine.jackpot_key or not machine.progressive_pool_id:
        return None
    keys = [r.name for r in reels]
    if "|".join(keys) != machine.jackpot_key:
        return None
    if not _jackpot_eligible(machine, bet, effective_max):
        return None
    pool_id = machine.progressive_pool_id
    amount = progressive_pool(session, pool_id, machine.progressive_seed)
    session.progressive_pools[pool_id] = machine.progressive_seed
    return amount


def format_paytable(machine: SlotMachine, *, tier_boost: float = 1.0) -> str:
    lines = []
    if tier_boost != 1.0:
        lines.append(f"  ★ Tier boost: {tier_boost:.0f}× applied to all multipliers")
    for key, base_mult in sorted(machine.paytable.items(), key=lambda item: -item[1]):
        effective = round(base_mult * tier_boost)
        if "|" in key:
            parts = key.split("|")
            if len(parts) == 3 and parts[0] == parts[1] == parts[2]:
                lines.append(f"  {parts[0]} x3  {effective:,}x bet")
            elif len(parts) == 2:
                lines.append(f"  {parts[0]} x2  {effective:,}x bet")
        else:
            lines.append(f"  {key} (1st reel)  {effective:,}x bet")
    if machine.progressive and machine.jackpot_key:
        req = "max bet required" if machine.jackpot_requires_max_bet else "any bet"
        sym = machine.jackpot_key.split("|")[0]
        lines.append(f"  {sym} x3  PROGRESSIVE JACKPOT ({req})")
    return "\n".join(lines)


class SlotsActivity(Activity):
    info = ActivityInfo(
        id="slots",
        name="Mandalay Bay Slots",
        floor="Slot Machines",
        description="Nearly 1,000 reel games from penny slots to high-limit progressives.",
        min_bet=1,
    )

    def run(self, session: PlayerSession, ui) -> None:
        session.record_visit(self.info.id)
        ui.banner(f"{self.info.floor} — {self.info.name}")
        ui.chip_line(session.wallet.balance)

        if not self.can_enter(session):
            ui.error(f"Minimum spin is {self.info.min_bet} chip.")
            ui.pause()
            return

        tier = pick_stake_tier(session, ui, title="Choose stake tier:")
        if tier is None:
            return
        ui.dim(tier.description)

        catalog_choice = self._pick_catalog(ui, tier.id)
        if catalog_choice is None:
            return

        machine_ids = machines_for_catalog(catalog_choice, tier_id=tier.id)
        if not machine_ids:
            ui.error("No machines in that catalog.")
            ui.pause()
            return

        menu_labels = []
        for mid in machine_ids:
            m = MACHINES[mid]
            stakes = effective_slot_stakes(m.min_bet, m.max_bet, tier, session.wallet.balance)
            range_label = format_stake_range(
                stakes[0],
                stakes[1],
                no_cap=tier_uses_salon_limits(tier) and tier.max_bet is None,
            )
            prog = ""
            if m.progressive and m.progressive_pool_id:
                pool = progressive_pool(session, m.progressive_pool_id, m.progressive_seed)
                prog = f" [Jackpot: {pool:,}]"
            menu_labels.append(f"{m.name} ({range_label}){prog}")

        choice = ui.menu_choice(menu_labels, title="Pick a machine:")
        if choice == 0:
            return

        machine = MACHINES[machine_ids[choice - 1]]
        min_bet, max_bet = effective_slot_stakes(
            machine.min_bet, machine.max_bet, tier, session.wallet.balance
        )

        if max_bet < min_bet:
            ui.error(f"This machine requires at least {min_bet} chips per spin at {tier.name}.")
            ui.pause()
            return

        tier_boost = get_tier_payout_boost(tier.id)
        ui.print(f"\n{machine.name} — {tier.name}")
        if tier_boost != 1.0:
            ui.success(f"  ★ {tier.name} tier boost: {tier_boost:.0f}× multiplier on all wins")
        if machine.tagline:
            ui.dim(machine.tagline)
        if machine.progressive and machine.progressive_pool_id:
            pool = progressive_pool(session, machine.progressive_pool_id, machine.progressive_seed)
            ui.print(f"Current progressive jackpot: {pool:,} chips")
            if machine.jackpot_requires_max_bet:
                ui.dim(f"Max bet ({max_bet:,} chips) required to qualify for the jackpot.")
        ui.print("\nPaytable:")
        ui.print(format_paytable(machine, tier_boost=tier_boost))
        ui.print("")

        session_net = 0
        spins = 0
        last_bet = min_bet
        while True:
            ui.chip_line(session.wallet.balance)
            if machine.progressive and machine.progressive_pool_id:
                pool = progressive_pool(session, machine.progressive_pool_id, machine.progressive_seed)
                ui.dim(f"Jackpot: {pool:,} chips")
            default_bet = last_bet if min_bet <= last_bet <= max_bet else min_bet
            bet = ui.prompt_int(
                f"Spin amount ({min_bet}-{max_bet}, 0 to leave)",
                0,
                max_bet,
                default=default_bet,
            )
            if bet == 0:
                break
            if bet < min_bet:
                ui.error(f"Minimum spin is {min_bet}.")
                continue
            if not session.wallet.debit(bet, self.info.id, f"{machine.name} spin ${bet}"):
                ui.error("Insufficient chips.")
                continue

            last_bet = bet
            _contribute_to_progressive(session, machine, bet)
            spin_pause(0.15)
            reels = _spin_reels(machine)
            reel_displays = [_display_symbol(r, session.use_unicode) for r in reels]
            symbol_pool = [_display_symbol(s, session.use_unicode) for s in machine.symbols]
            animate_reel_tease(ui, symbol_pool, " | ".join(reel_displays))

            jackpot_amount = _try_jackpot(session, machine, reels, bet, max_bet)
            win, reason = _payout(reels, bet, machine, jackpot_amount=jackpot_amount, tier_boost=tier_boost)
            spins += 1
            if win > 0:
                session.wallet.credit(win, self.info.id, reason)
                session_net += win - bet
                if jackpot_amount is not None:
                    ui.success(f"🎰 {reason}")
                else:
                    ui.success(f"{reason} — Won {win:,} chips!")
            else:
                session_net -= bet
                ui.dim("No win this spin.")

            if not ui.prompt_yes_no("Spin again?", default=True):
                break

        session.record_result(self.info.id, session_net, bets=spins)
        ui.print(f"\nSlots session: {'+' if session_net >= 0 else ''}{session_net:,} chips over {spins} spin(s)")
        ui.pause()

    def _pick_catalog(self, ui, tier_id: str) -> str | None:
        options = ["Main floor"]
        keys = ["main_floor"]
        if salon_catalog_available(tier_id):
            options.append("High Limit Salon exclusives")
            keys.append("salon")
        options.append("Strip destination exclusives")
        keys.append("destination_menu")
        pick = ui.menu_choice(options, title="Slot catalog:")
        if pick == 0:
            return None
        key = keys[pick - 1]
        if key != "destination_menu":
            return key
        dest_labels = [STRIP_DESTINATIONS[d] for d in STRIP_DESTINATIONS]
        dest_pick = ui.menu_choice(dest_labels, title="Away casino:")
        if dest_pick == 0:
            return None
        dest_id = list(STRIP_DESTINATIONS.keys())[dest_pick - 1]
        return f"destination:{dest_id}"
