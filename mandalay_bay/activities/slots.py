from __future__ import annotations

from dataclasses import dataclass

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


def _sym(name: str, display: str, weight: int) -> Symbol:
    return Symbol(name, display, weight)


CLASSIC_SYMBOLS = (
    _sym("seven", "7", 1),
    _sym("diamond", "💎", 2),
    _sym("bar", "BAR", 5),
    _sym("bell", "🔔", 5),
    _sym("cherry", "🍒", 11),
    _sym("lemon", "🍋", 8),
)

CLASSIC_PAYTABLE = {
    "seven|seven|seven": 200,
    "diamond|diamond|diamond": 100,
    "bell|bell|bell": 50,
    "bar|bar|bar": 30,
    "cherry|cherry|cherry": 20,
    "cherry|cherry": 4,
    "cherry": 1,
}

MACHINES: dict[str, SlotMachine] = {
    "fortune": SlotMachine(
        id="fortune",
        name="Mandalay Fortune",
        min_bet=5,
        max_bet=50,
        symbols=CLASSIC_SYMBOLS,
        paytable=CLASSIC_PAYTABLE,
        tagline="Classic three-reel floor favorite.",
        cherry_rules=True,
    ),
    "high_roller": SlotMachine(
        id="high_roller",
        name="High Roller",
        min_bet=25,
        max_bet=500,
        symbols=CLASSIC_SYMBOLS,
        paytable=CLASSIC_PAYTABLE,
        tagline="High-limit room — same reels, bigger bets.",
        cherry_rules=True,
    ),
    "megabucks": SlotMachine(
        id="megabucks",
        name="Megabucks",
        min_bet=1,
        max_bet=3,
        symbols=(
            _sym("megabuck", "💵", 2),
            _sym("seven", "7", 2),
            _sym("bar", "BAR", 5),
            _sym("bell", "🔔", 5),
            _sym("cherry", "🍒", 10),
            _sym("lemon", "🍋", 8),
        ),
        paytable={
            "seven|seven|seven": 200,
            "bar|bar|bar": 50,
            "bell|bell|bell": 40,
            "cherry|cherry|cherry": 25,
            "cherry|cherry": 5,
            "cherry": 1,
            "megabuck|megabuck": 25,
            "megabuck": 3,
        },
        tagline="Wide-area progressive — max bet qualifies for the jackpot.",
        progressive=True,
        progressive_pool_id="megabucks",
        jackpot_requires_max_bet=True,
        progressive_contribution_rate=0.03,
        progressive_seed=1_000_000,
        jackpot_key="megabuck|megabuck|megabuck",
        cherry_rules=True,
    ),
    "wheel_of_fortune": SlotMachine(
        id="wheel_of_fortune",
        name="Wheel of Fortune",
        min_bet=1,
        max_bet=25,
        symbols=(
            _sym("wheel", "🎡", 1),
            _sym("diamond", "💎", 2),
            _sym("bar", "BAR", 5),
            _sym("bell", "🔔", 5),
            _sym("cherry", "🍒", 11),
            _sym("lemon", "🍋", 8),
        ),
        paytable={
            "wheel|wheel|wheel": 500,
            "diamond|diamond|diamond": 200,
            "bar|bar|bar": 60,
            "bell|bell|bell": 40,
            "cherry|cherry|cherry": 25,
            "cherry|cherry": 5,
            "cherry": 1,
        },
        tagline="Spin the wheel for bonus-sized wins.",
        cherry_rules=True,
    ),
    "blazin_7s": SlotMachine(
        id="blazin_7s",
        name="Blazin' 7s",
        min_bet=1,
        max_bet=25,
        symbols=(
            _sym("seven", "7", 3),
            _sym("bar", "BAR", 6),
            _sym("bell", "🔔", 5),
            _sym("cherry", "🍒", 12),
            _sym("lemon", "🍋", 8),
            _sym("diamond", "💎", 2),
        ),
        paytable={
            "seven|seven|seven": 400,
            "diamond|diamond|diamond": 100,
            "bar|bar|bar": 50,
            "bell|bell|bell": 30,
            "cherry|cherry|cherry": 20,
            "cherry|cherry": 7,
            "cherry": 1,
        },
        tagline="Flaming sevens with sizzling top-line pays.",
        cherry_rules=True,
    ),
    "buffalo_gold": SlotMachine(
        id="buffalo_gold",
        name="Buffalo Gold",
        min_bet=1,
        max_bet=50,
        symbols=(
            _sym("buffalo", "🦬", 6),
            _sym("gold", "🥇", 6),
            _sym("sunset", "🌅", 6),
            _sym("eagle", "🦅", 7),
            _sym("ace", "A", 8),
            _sym("king", "K", 9),
        ),
        paytable={
            "buffalo|buffalo|buffalo": 300,
            "gold|gold|gold": 150,
            "sunset|sunset|sunset": 75,
            "eagle|eagle|eagle": 50,
            "ace|ace|ace": 25,
            "buffalo|buffalo": 10,
            "ace|ace": 5,
        },
        tagline="Stampede the reels for gold-coin bonuses.",
    ),
    "monte_carlo": SlotMachine(
        id="monte_carlo",
        name="Monte Carlo",
        min_bet=1,
        max_bet=5,
        symbols=(
            _sym("crown", "👑", 2),
            _sym("diamond", "💎", 3),
            _sym("bar", "BAR", 6),
            _sym("bell", "🔔", 6),
            _sym("cherry", "🍒", 12),
            _sym("lemon", "🍋", 8),
        ),
        paytable={
            "crown|crown|crown": 250,
            "diamond|diamond|diamond": 125,
            "bar|bar|bar": 60,
            "bell|bell|bell": 40,
            "cherry|cherry|cherry": 25,
            "cherry|cherry": 7,
            "cherry": 1,
        },
        tagline="Linked progressive with European elegance.",
        progressive=True,
        progressive_pool_id="mandalay_linked",
        jackpot_requires_max_bet=True,
        progressive_contribution_rate=0.025,
        progressive_seed=250_000,
        jackpot_key="crown|crown|crown",
        cherry_rules=True,
    ),
    "super_spin": SlotMachine(
        id="super_spin",
        name="Super Spin",
        min_bet=1,
        max_bet=5,
        symbols=(
            _sym("star", "⭐", 2),
            _sym("seven", "7", 3),
            _sym("bar", "BAR", 5),
            _sym("bell", "🔔", 6),
            _sym("cherry", "🍒", 12),
            _sym("lemon", "🍋", 8),
        ),
        paytable={
            "seven|seven|seven": 225,
            "bar|bar|bar": 60,
            "bell|bell|bell": 40,
            "cherry|cherry|cherry": 25,
            "cherry|cherry": 5,
            "cherry": 1,
        },
        tagline="Linked progressive — three stars trigger the jackpot.",
        progressive=True,
        progressive_pool_id="mandalay_linked",
        jackpot_requires_max_bet=True,
        progressive_contribution_rate=0.025,
        progressive_seed=250_000,
        jackpot_key="star|star|star",
        cherry_rules=True,
    ),
    "triple_red_hot_7s": SlotMachine(
        id="triple_red_hot_7s",
        name="Triple Red Hot 7s",
        min_bet=1,
        max_bet=25,
        symbols=(
            _sym("seven", "7", 2),
            _sym("bar", "BAR", 5),
            _sym("bell", "🔔", 5),
            _sym("cherry", "🍒", 11),
            _sym("lemon", "🍋", 8),
        ),
        paytable={
            "seven|seven|seven": 175,
            "bar|bar|bar": 60,
            "bell|bell|bell": 30,
            "cherry|cherry|cherry": 20,
            "cherry|cherry": 5,
            "cherry": 1,
        },
        tagline="Red-hot triple sevens on every spin.",
        cherry_rules=True,
    ),
    "double_jackpot": SlotMachine(
        id="double_jackpot",
        name="Double Jackpot",
        min_bet=1,
        max_bet=25,
        symbols=(
            _sym("jackpot", "JP", 3),
            _sym("seven", "7", 3),
            _sym("bar", "BAR", 5),
            _sym("bell", "🔔", 6),
            _sym("cherry", "🍒", 10),
            _sym("lemon", "🍋", 8),
        ),
        paytable={
            "jackpot|jackpot|jackpot": 500,
            "seven|seven|seven": 200,
            "bar|bar|bar": 60,
            "bell|bell|bell": 40,
            "cherry|cherry|cherry": 25,
            "cherry|cherry": 5,
            "cherry": 1,
            "jackpot|jackpot": 25,
        },
        tagline="Two-tier jackpots with blazing top symbols.",
        cherry_rules=True,
    ),
    "spooky_link": SlotMachine(
        id="spooky_link",
        name="Spooky Link",
        min_bet=1,
        max_bet=25,
        symbols=(
            _sym("ghost", "👻", 4),
            _sym("mummy", "🧟", 5),
            _sym("yeti", "❄️", 5),
            _sym("moon", "🌙", 6),
            _sym("skull", "💀", 7),
            _sym("bat", "🦇", 8),
        ),
        paytable={
            "ghost|ghost|ghost": 250,
            "mummy|mummy|mummy": 150,
            "yeti|yeti|yeti": 100,
            "moon|moon|moon": 60,
            "skull|skull|skull": 40,
            "ghost|ghost": 12,
            "skull|skull": 5,
            "bat|bat": 5,
        },
        tagline="Mo Mummy, Yo Yeti, and Go Ghost bonus features.",
    ),
    "wizard_of_oz": SlotMachine(
        id="wizard_of_oz",
        name="Wizard of Oz — I'll Get You My Pretty",
        min_bet=1,
        max_bet=25,
        symbols=(
            _sym("witch", "🧙", 4),
            _sym("slipper", "👠", 5),
            _sym("emerald", "💚", 5),
            _sym("tin", "🤖", 6),
            _sym("lion", "🦁", 7),
            _sym("scarecrow", "🌾", 8),
        ),
        paytable={
            "witch|witch|witch": 400,
            "slipper|slipper|slipper": 200,
            "emerald|emerald|emerald": 125,
            "tin|tin|tin": 60,
            "lion|lion|lion": 40,
            "slipper|slipper": 12,
        },
        tagline="Follow the yellow-brick road to Hold & Spin bonuses.",
    ),
    "emerald_guardian": SlotMachine(
        id="emerald_guardian",
        name="Emerald Guardian",
        min_bet=1,
        max_bet=25,
        symbols=(
            _sym("guardian", "🐉", 4),
            _sym("emerald", "💚", 5),
            _sym("shield", "🛡️", 5),
            _sym("sword", "⚔️", 6),
            _sym("gem", "💎", 7),
            _sym("coin", "🪙", 8),
        ),
        paytable={
            "guardian|guardian|guardian": 450,
            "emerald|emerald|emerald": 200,
            "shield|shield|shield": 100,
            "sword|sword|sword": 60,
            "gem|gem|gem": 40,
            "emerald|emerald": 12,
        },
        tagline="Defend the emerald vault for guardian jackpots.",
    ),
    "tiger_and_dragon": SlotMachine(
        id="tiger_and_dragon",
        name="Tiger and Dragon — Super Bonus",
        min_bet=1,
        max_bet=50,
        symbols=(
            _sym("tiger", "🐯", 4),
            _sym("dragon", "🐲", 4),
            _sym("pearl", "🔮", 5),
            _sym("fan", "🪭", 6),
            _sym("coin", "🪙", 7),
            _sym("lantern", "🏮", 8),
        ),
        paytable={
            "tiger|tiger|tiger": 300,
            "dragon|dragon|dragon": 300,
            "tiger|tiger|dragon": 90,
            "dragon|dragon|tiger": 90,
            "pearl|pearl|pearl": 100,
            "fan|fan|fan": 50,
            "coin|coin|coin": 25,
            "coin|coin": 8,
            "fan|fan": 5,
        },
        tagline="East-meets-West super bonus with dual jackpots.",
    ),
}

MACHINE_ORDER = [
    "fortune",
    "high_roller",
    "megabucks",
    "wheel_of_fortune",
    "blazin_7s",
    "buffalo_gold",
    "monte_carlo",
    "super_spin",
    "triple_red_hot_7s",
    "double_jackpot",
    "spooky_link",
    "wizard_of_oz",
    "emerald_guardian",
    "tiger_and_dragon",
]


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
    "star", "megabuck",
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

        menu_labels = []
        for mid in MACHINE_ORDER:
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

        machine = MACHINES[MACHINE_ORDER[choice - 1]]
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
        while True:
            ui.chip_line(session.wallet.balance)
            if machine.progressive and machine.progressive_pool_id:
                pool = progressive_pool(session, machine.progressive_pool_id, machine.progressive_seed)
                ui.dim(f"Jackpot: {pool:,} chips")
            bet = ui.prompt_int(
                f"Spin amount ({min_bet}-{max_bet}, 0 to leave)",
                0,
                max_bet,
                default=min_bet,
            )
            if bet == 0:
                break
            if bet < min_bet:
                ui.error(f"Minimum spin is {min_bet}.")
                continue
            if not session.wallet.debit(bet, self.info.id, f"{machine.name} spin ${bet}"):
                ui.error("Insufficient chips.")
                continue

            _contribute_to_progressive(session, machine, bet)
            reels = _spin_reels(machine)
            shown = " | ".join(_display_symbol(r, session.use_unicode) for r in reels)
            ui.print(f"\n  [ {shown} ]")

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
