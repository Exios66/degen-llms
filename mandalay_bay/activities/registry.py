from mandalay_bay.activities.blackjack import BlackjackActivity
from mandalay_bay.activities.equestrian import DressageActivity, JumperActivity
from mandalay_bay.activities.holdem import HoldemActivity
from mandalay_bay.activities.horse_racing import HorseRacingActivity
from mandalay_bay.activities.roulette import RouletteActivity
from mandalay_bay.activities.slots import SlotsActivity
from mandalay_bay.activities.sportsbook import SportsbookActivity

ALL_ACTIVITIES: list = [
    BlackjackActivity(),
    HoldemActivity(),
    RouletteActivity(),
    SlotsActivity(),
    SportsbookActivity(),
    HorseRacingActivity(),
    DressageActivity(),
    JumperActivity(),
]

ACTIVITIES_BY_ID = {a.info.id: a for a in ALL_ACTIVITIES}

FLOOR_ORDER = ["Table Games", "Slot Machines", "Sports Book", "Racing Pavilion", "Equestrian Arena"]
