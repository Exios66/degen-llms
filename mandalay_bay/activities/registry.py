from mandalay_bay.activities.blackjack import BlackjackActivity
from mandalay_bay.activities.craps import CrapsActivity
from mandalay_bay.activities.equestrian import DressageActivity, JumperActivity
from mandalay_bay.activities.holdem import HoldemActivity
from mandalay_bay.activities.horse_racing import HorseRacingActivity
from mandalay_bay.activities.lottery import LotteryActivity
from mandalay_bay.activities.roulette import RouletteActivity
from mandalay_bay.activities.slots import SlotsActivity
from mandalay_bay.activities.sportsbook import SportsbookActivity
from mandalay_bay.activities.arcade import ArcadeActivity
from mandalay_bay.activities.trading_desk import TradingDeskActivity

ALL_ACTIVITIES: list = [
    BlackjackActivity(),
    HoldemActivity(),
    RouletteActivity(),
    CrapsActivity(),
    SlotsActivity(),
    LotteryActivity(),
    SportsbookActivity(),
    TradingDeskActivity(),
    ArcadeActivity(),
    HorseRacingActivity(),
    DressageActivity(),
    JumperActivity(),
]

ACTIVITIES_BY_ID = {a.info.id: a for a in ALL_ACTIVITIES}

FLOOR_ORDER = [
    "Table Games",
    "Slot Machines",
    "Lottery Counter",
    "Sports Book",
    "Trading Floor",
    "Arcade Alley",
    "Racing Pavilion",
    "Equestrian Arena",
]
