from __future__ import annotations

import random
from dataclasses import dataclass, field

from mandalay_bay.session import PlayerSession

GameId = str  # blackjack | holdem | roulette | horse_racing

GAME_SLOT_OFFSET: dict[str, int] = {
    "blackjack": 0,
    "holdem": 1,
    "roulette": 2,
    "horse_racing": 3,
}


@dataclass(frozen=True, slots=True)
class DealerProfile:
    id: str
    name: str
    games: tuple[str, ...]
    tagline: str
    quips: dict[str, tuple[str, ...]] = field(default_factory=dict)


DEALER_ROSTER: tuple[DealerProfile, ...] = (
    DealerProfile(
        id="steve_harvey",
        name="Steve Harvey",
        games=("roulette", "horse_racing"),
        tagline="Survey says… bet responsibly!",
        quips={
            "greeting": (
                "Welcome to the table! I'm Steve Harvey — yes, THAT Steve Harvey.",
                "Evening, folks. The wheel waits for no one. Survey says… place your bets.",
                "Family Feud pays in applause. This table pays in chips. Let's go.",
                "Show me 'Things You Do in Vegas That Stay in Vegas' — I'll wait.",
                "I hosted game shows, did stand-up, boxed a little. Tonight I spin wheels.",
                "Name something a tourist says after their first Mandalay Bay buffet. Survey says… 'I need a nap.'",
            ),
            "deal": (
                "Survey says… the wheel is spinning!",
                "No whammies, no whammies — okay, spin!",
                "Steve Harvey does not rig the wheel. The house might.",
                "And down the stretch they come — wait, wrong sport. Spin!",
                "Show me 'Number On The Roulette Wheel'! Top six answers on the board!",
                "The wheel is not a survey board, but we're gonna pretend.",
            ),
            "win": (
                "Survey says… WINNER! That's what I'm talking about!",
                "You got more points than the Johnson family!",
                "I'm not mad — I'm impressed. Don't tell the house.",
                "That's the number-one answer! …Wrong show, right outcome.",
                "Act like a winner, think like a winner — you just did both.",
                "The Lord blessed me with common sense. He blessed you with chips.",
            ),
            "lose": (
                "Survey says… better luck next spin.",
                "The board didn't have your number. Mine neither.",
                "Hey, at least you didn't say something embarrassing on TV.",
                "Name something you lose in Vegas. Survey says… 'dignity.' Just kidding. Mostly.",
                "You have to jump. You have to take the leap. Maybe not on that bet.",
                "I was a boxer before I was a host. Still ducking losses.",
            ),
            "push": (
                "Survey says… it's a push.",
                "Survey says… it's a push. Nobody wins, nobody loses. Boring!",
            ),
            "idle": (
                "Smart money watches first.",
                "Smart money watches first. Dumb money still entertains me.",
                "The wheel doesn't judge. I might, a little.",
                "In my comedy days I said the truth hurts. So does the zero.",
                "Family Feud taught me: always clap for the other team. The house doesn't clap back.",
            ),
        },
    ),
    DealerProfile(
        id="meryl_screech",
        name="Dealer Meryl Screech",
        games=("blackjack",),
        tagline="And the Oscar for Most Aggressive Double goes to… you.",
        quips={
            "greeting": (
                "Evening. Table 7 is open — six decks, H17, 3:2 blackjack. Minimum ten chips.",
                "The felt remembers every hand. I remember the good ones.",
            ),
            "deal": ("A queen. Method acting? No — method DEALING.", "Cards down, drama up."),
            "win": ("Bravo! Standing ovation from seat one!",),
            "lose": ("A tragic third act. There's always another show.",),
            "push": ("A draw — the critics are split.",),
            "idle": ("Smart. The felt remembers every hand. Come back when you're ready.",),
        },
    ),
    DealerProfile(
        id="judi_bench",
        name="Croupier Judi Bench",
        games=("holdem",),
        tagline="Bond. James Bond. Blinds.",
        quips={
            "greeting": (
                "Good evening. Texas Hold'em — blinds posted, cards sharp, patience sharper.",
                "Take a seat. The river reveals all in due time.",
            ),
            "deal": ("Bond. James Bond. Blinds.", "The flop arrives with quiet authority."),
            "win": ("Well played. The Queen approves.",),
            "lose": ("Fortune favors the patient. Be patient.",),
            "push": ("Split pot. Shared glory.",),
            "idle": ("Observe the table. Knowledge is the best tell.",),
        },
    ),
    DealerProfile(
        id="jennifer_lawless",
        name="Jennifer Lawless",
        games=("blackjack", "holdem"),
        tagline="I tripped on the felt once. The shoe didn't even notice.",
        quips={
            "greeting": (
                "Hey! Table's open. I promise I won't trip over your chips. Probably.",
                "Welcome! Full disclosure: I'm relatable AND dealing.",
            ),
            "deal": ("Cards out! Nobody fall — including me.",),
            "win": ("YES! We love a comeback story!",),
            "lose": ("Rough beat. You'll recover.",),
            "push": ("Push! Same energy.",),
            "idle": ("Watching is fine. Take your time.",),
        },
    ),
    DealerProfile(
        id="sofia_volume",
        name="Sofia Volume",
        games=("roulette",),
        tagline="Dale, amigo — the wheel is feeling generous tonight!",
        quips={
            "greeting": (
                "Dale, amigo! The wheel is HOT tonight!",
                "Welcome welcome WELCOME! Place your bets, cariño!",
            ),
            "deal": ("Dale! The wheel spins! Hold your breath!",),
            "win": ("AY! WINNER! I KNEW IT!",),
            "lose": ("Ay, next time! The wheel is fickle!",),
            "push": ("Push! Boring but fair!",),
            "idle": ("Watch the wheel, feel the energy!",),
        },
    ),
    DealerProfile(
        id="octavia_spectacular",
        name="Octavia Spectacular",
        games=("holdem", "blackjack"),
        tagline="Honey, the house always wins — but you look good losing.",
        quips={
            "greeting": (
                "Evening, honey. Pull up a chair — the table's warm.",
                "Welcome, sugar. Let's see what the cards have for you.",
            ),
            "deal": ("Cards coming down like sweet tea on a hot day.",),
            "win": ("Honey, that's how it's DONE!",),
            "lose": ("Honey, the house always wins — but you look good losing.",),
            "push": ("Push, honey. Nobody wins, nobody cries.",),
            "idle": ("Smart to watch first, sugar.",),
        },
    ),
    DealerProfile(
        id="nicole_widechart",
        name="Nicole Widechart",
        games=("blackjack", "roulette"),
        tagline="The chips are whispering. I'm listening.",
        quips={
            "greeting": (
                "Evening. The table is set. The stakes are… negotiable.",
                "The chips are whispering. I'm listening. You should too.",
            ),
            "deal": ("The cards fall where they must.",),
            "win": ("Elegant. Expected. Enjoy it quietly.",),
            "lose": ("The house collects. You persist. Admirable.",),
            "push": ("Equilibrium. How zen.",),
            "idle": ("Observation precedes action. Always.",),
        },
    ),
)

_BY_GAME: dict[str, list[DealerProfile]] = {}
for _dealer in DEALER_ROSTER:
    for _game in _dealer.games:
        _BY_GAME.setdefault(_game, []).append(_dealer)


def dealers_for_game(game_id: str) -> list[DealerProfile]:
    return _BY_GAME.get(game_id, [])


def get_on_duty_dealer(game_id: str, seed: int = 0) -> DealerProfile:
    eligible = dealers_for_game(game_id)
    if not eligible:
        return DEALER_ROSTER[0]
    offset = GAME_SLOT_OFFSET.get(game_id, 0)
    index = (seed + offset) % len(eligible)
    return eligible[index]


def dealer_shift_seed(session: PlayerSession, game_id: str) -> int:
    visits = session.stat_for(game_id).visits
    return visits


def get_session_dealer(session: PlayerSession, game_id: str) -> DealerProfile:
    return get_on_duty_dealer(game_id, dealer_shift_seed(session, game_id))


def pick_quip(dealer: DealerProfile, kind: str, rng: random.Random | None = None) -> str:
    pool = dealer.quips.get(kind)
    if not pool:
        return dealer.tagline
    source = rng or random
    return source.choice(pool)


def announce_dealer(session: PlayerSession, ui, game_id: str) -> DealerProfile:
    """Print on-duty dealer greeting for a table activity."""
    dealer = get_session_dealer(session, game_id)
    ui.dim(f"On duty: {dealer.name} — {dealer.tagline}")
    ui.dim(f'  "{pick_quip(dealer, "greeting")}"')
    return dealer


def get_dealer_by_id(dealer_id: str) -> DealerProfile | None:
    for dealer in DEALER_ROSTER:
        if dealer.id == dealer_id:
            return dealer
    return None
