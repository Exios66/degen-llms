from __future__ import annotations

from dataclasses import dataclass

from blackjack.rng import SECURE_RANDOM
from mandalay_bay.activities.base import Activity, ActivityInfo
from mandalay_bay.session import PlayerSession
from mandalay_bay.stakes import (
    effective_slot_stakes,
    format_stake_range,
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
    _sym("bar", "BAR", 3),
    _sym("bell", "🔔", 4),
    _sym("cherry", "🍒", 6),
    _sym("lemon", "🍋", 8),
    _sym("diamond", "💎", 2),
)

CLASSIC_PAYTABLE = {
    "seven|seven|seven": 100,
    "diamond|diamond|diamond": 50,
    "bell|bell|bell": 25,
    "bar|bar|bar": 15,
    "cherry|cherry|cherry": 10,
    "cherry|cherry": 2,
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
            _sym("megabuck", "💵", 1),
            _sym("seven", "7", 2),
            _sym("bar", "BAR", 4),
            _sym("bell", "🔔", 5),
            _sym("cherry", "🍒", 7),
            _sym("lemon", "🍋", 9),
        ),
        paytable={
            "seven|seven|seven": 80,
            "bar|bar|bar": 20,
            "bell|bell|bell": 15,
            "cherry|cherry|cherry": 10,
            "megabuck|megabuck": 10,
            "megabuck": 2,
        },
        tagline="Wide-area progressive — max bet qualifies for the jackpot.",
        progressive=True,
        progressive_pool_id="megabucks",
        jackpot_requires_max_bet=True,
        progressive_contribution_rate=0.03,
        progressive_seed=250_000,
        jackpot_key="megabuck|megabuck|megabuck",
    ),
    "wheel_of_fortune": SlotMachine(
        id="wheel_of_fortune",
        name="Wheel of Fortune",
        min_bet=1,
        max_bet=25,
        symbols=(
            _sym("wheel", "🎡", 1),
            _sym("diamond", "💎", 2),
            _sym("bar", "BAR", 4),
            _sym("bell", "🔔", 5),
            _sym("cherry", "🍒", 7),
            _sym("lemon", "🍋", 9),
        ),
        paytable={
            "wheel|wheel|wheel": 200,
            "diamond|diamond|diamond": 75,
            "bar|bar|bar": 25,
            "bell|bell|bell": 15,
            "cherry|cherry|cherry": 10,
            "cherry|cherry": 2,
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
            _sym("bar", "BAR", 4),
            _sym("bell", "🔔", 5),
            _sym("cherry", "🍒", 6),
            _sym("lemon", "🍋", 8),
            _sym("diamond", "💎", 2),
        ),
        paytable={
            "seven|seven|seven": 150,
            "diamond|diamond|diamond": 40,
            "bar|bar|bar": 20,
            "bell|bell|bell": 12,
            "cherry|cherry|cherry": 8,
        },
        tagline="Flaming sevens with sizzling top-line pays.",
    ),
    "buffalo_gold": SlotMachine(
        id="buffalo_gold",
        name="Buffalo Gold",
        min_bet=1,
        max_bet=50,
        symbols=(
            _sym("buffalo", "🦬", 2),
            _sym("gold", "🥇", 3),
            _sym("sunset", "🌅", 4),
            _sym("eagle", "🦅", 5),
            _sym("ace", "A", 6),
            _sym("king", "K", 8),
        ),
        paytable={
            "buffalo|buffalo|buffalo": 120,
            "gold|gold|gold": 60,
            "sunset|sunset|sunset": 30,
            "eagle|eagle|eagle": 20,
            "ace|ace|ace": 10,
            "buffalo|buffalo": 5,
        },
        tagline="Stampede the reels for gold-coin bonuses.",
    ),
    "monte_carlo": SlotMachine(
        id="monte_carlo",
        name="Monte Carlo",
        min_bet=1,
        max_bet=5,
        symbols=(
            _sym("crown", "👑", 1),
            _sym("diamond", "💎", 2),
            _sym("bar", "BAR", 4),
            _sym("bell", "🔔", 5),
            _sym("cherry", "🍒", 7),
            _sym("lemon", "🍋", 9),
        ),
        paytable={
            "crown|crown|crown": 100,
            "diamond|diamond|diamond": 50,
            "bar|bar|bar": 20,
            "bell|bell|bell": 12,
            "cherry|cherry|cherry": 8,
        },
        tagline="Linked progressive with European elegance.",
        progressive=True,
        progressive_pool_id="mandalay_linked",
        jackpot_requires_max_bet=True,
        progressive_contribution_rate=0.025,
        progressive_seed=50_000,
        jackpot_key="crown|crown|crown",
    ),
    "super_spin": SlotMachine(
        id="super_spin",
        name="Super Spin",
        min_bet=1,
        max_bet=5,
        symbols=(
            _sym("star", "⭐", 1),
            _sym("seven", "7", 2),
            _sym("bar", "BAR", 4),
            _sym("bell", "🔔", 5),
            _sym("cherry", "🍒", 7),
            _sym("lemon", "🍋", 9),
        ),
        paytable={
            "seven|seven|seven": 90,
            "bar|bar|bar": 25,
            "bell|bell|bell": 15,
            "cherry|cherry|cherry": 10,
        },
        tagline="Linked progressive — three stars trigger the jackpot.",
        progressive=True,
        progressive_pool_id="mandalay_linked",
        jackpot_requires_max_bet=True,
        progressive_contribution_rate=0.025,
        progressive_seed=50_000,
        jackpot_key="star|star|star",
    ),
    "triple_red_hot_7s": SlotMachine(
        id="triple_red_hot_7s",
        name="Triple Red Hot 7s",
        min_bet=1,
        max_bet=25,
        symbols=(
            _sym("seven", "7", 4),
            _sym("bar", "BAR", 3),
            _sym("bell", "🔔", 5),
            _sym("cherry", "🍒", 6),
            _sym("lemon", "🍋", 8),
        ),
        paytable={
            "seven|seven|seven": 200,
            "bar|bar|bar": 30,
            "bell|bell|bell": 15,
            "cherry|cherry|cherry": 10,
            "cherry|cherry": 3,
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
            _sym("jackpot", "JP", 2),
            _sym("seven", "7", 2),
            _sym("bar", "BAR", 4),
            _sym("bell", "🔔", 5),
            _sym("cherry", "🍒", 7),
            _sym("lemon", "🍋", 9),
        ),
        paytable={
            "jackpot|jackpot|jackpot": 250,
            "seven|seven|seven": 100,
            "bar|bar|bar": 25,
            "bell|bell|bell": 15,
            "cherry|cherry|cherry": 10,
            "jackpot|jackpot": 15,
        },
        tagline="Two-tier jackpots with blazing top symbols.",
    ),
    "spooky_link": SlotMachine(
        id="spooky_link",
        name="Spooky Link",
        min_bet=1,
        max_bet=25,
        symbols=(
            _sym("ghost", "👻", 2),
            _sym("mummy", "🧟", 3),
            _sym("yeti", "❄️", 4),
            _sym("moon", "🌙", 5),
            _sym("skull", "💀", 6),
            _sym("bat", "🦇", 8),
        ),
        paytable={
            "ghost|ghost|ghost": 100,
            "mummy|mummy|mummy": 60,
            "yeti|yeti|yeti": 40,
            "moon|moon|moon": 25,
            "skull|skull|skull": 15,
            "ghost|ghost": 5,
        },
        tagline="Mo Mummy, Yo Yeti, and Go Ghost bonus features.",
    ),
    "wizard_of_oz": SlotMachine(
        id="wizard_of_oz",
        name="Wizard of Oz — I'll Get You My Pretty",
        min_bet=1,
        max_bet=25,
        symbols=(
            _sym("witch", "🧙", 2),
            _sym("slipper", "👠", 3),
            _sym("emerald", "💚", 4),
            _sym("tin", "🤖", 5),
            _sym("lion", "🦁", 6),
            _sym("scarecrow", "🌾", 8),
        ),
        paytable={
            "witch|witch|witch": 150,
            "slipper|slipper|slipper": 80,
            "emerald|emerald|emerald": 50,
            "tin|tin|tin": 25,
            "lion|lion|lion": 15,
            "slipper|slipper": 5,
        },
        tagline="Follow the yellow-brick road to Hold & Spin bonuses.",
    ),
    "emerald_guardian": SlotMachine(
        id="emerald_guardian",
        name="Emerald Guardian",
        min_bet=1,
        max_bet=25,
        symbols=(
            _sym("guardian", "🐉", 2),
            _sym("emerald", "💚", 3),
            _sym("shield", "🛡️", 4),
            _sym("sword", "⚔️", 5),
            _sym("gem", "💎", 6),
            _sym("coin", "🪙", 8),
        ),
        paytable={
            "guardian|guardian|guardian": 175,
            "emerald|emerald|emerald": 75,
            "shield|shield|shield": 40,
            "sword|sword|sword": 25,
            "gem|gem|gem": 15,
            "emerald|emerald": 5,
        },
        tagline="Defend the emerald vault for guardian jackpots.",
    ),
    "tiger_and_dragon": SlotMachine(
        id="tiger_and_dragon",
        name="Tiger and Dragon — Super Bonus",
        min_bet=1,
        max_bet=50,
        symbols=(
            _sym("tiger", "🐯", 2),
            _sym("dragon", "🐲", 2),
            _sym("pearl", "🔮", 4),
            _sym("fan", "🪭", 5),
            _sym("coin", "🪙", 6),
            _sym("lantern", "🏮", 8),
        ),
        paytable={
            "tiger|tiger|tiger": 120,
            "dragon|dragon|dragon": 120,
            "tiger|tiger|dragon": 80,
            "dragon|dragon|tiger": 80,
            "pearl|pearl|pearl": 40,
            "fan|fan|fan": 20,
            "coin|coin|coin": 10,
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
) -> tuple[int, str]:
    keys = [r.name for r in reels]
    line = "|".join(keys)

    if machine.jackpot_key and line == machine.jackpot_key and jackpot_amount is not None:
        return jackpot_amount, f"PROGRESSIVE JACKPOT! {jackpot_amount:,} chips!"

    if line in machine.paytable:
        mult = machine.paytable[line]
        return bet * mult, f"Three {reels[0].display}! {mult}x"

    if machine.cherry_rules:
        if keys[0] == keys[1] == "cherry" and "cherry|cherry" in machine.paytable:
            mult = machine.paytable["cherry|cherry"]
            return bet * mult, f"Two cherries! {mult}x"
        if keys[0] == "cherry" and "cherry" in machine.paytable:
            mult = machine.paytable["cherry"]
            return bet * mult, "Cherry on line! 1x (bet returned)"

    parts = line.split("|")
    if len(parts) >= 2 and parts[0] == parts[1]:
        pair_key = f"{parts[0]}|{parts[1]}"
        if pair_key in machine.paytable:
            mult = machine.paytable[pair_key]
            return bet * mult, f"Two {reels[0].display}! {mult}x"
    if parts[0] in machine.paytable and "|" not in parts[0]:
        single_key = parts[0]
        if single_key in machine.paytable and single_key.count("|") == 0:
            mult = machine.paytable[single_key]
            return bet * mult, f"{reels[0].display} on line! {mult}x"

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


def format_paytable(machine: SlotMachine) -> str:
    lines = []
    for key, mult in sorted(machine.paytable.items(), key=lambda item: -item[1]):
        if "|" in key:
            parts = key.split("|")
            if len(parts) == 3 and parts[0] == parts[1] == parts[2]:
                lines.append(f"  {parts[0]} x3  {mult}x bet")
            elif len(parts) == 2:
                lines.append(f"  {parts[0]} x2  {mult}x bet")
        else:
            lines.append(f"  {key} (1st reel)  {mult}x bet")
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

        ui.print(f"\n{machine.name} — {tier.name}")
        if machine.tagline:
            ui.dim(machine.tagline)
        if machine.progressive and machine.progressive_pool_id:
            pool = progressive_pool(session, machine.progressive_pool_id, machine.progressive_seed)
            ui.print(f"Current progressive jackpot: {pool:,} chips")
            if machine.jackpot_requires_max_bet:
                ui.dim(f"Max bet ({max_bet:,} chips) required to qualify for the jackpot.")
        ui.print("\nPaytable:")
        ui.print(format_paytable(machine))
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
            win, reason = _payout(reels, bet, machine, jackpot_amount=jackpot_amount)
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
