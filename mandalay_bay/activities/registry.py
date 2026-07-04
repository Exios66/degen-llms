from mandalay_bay.activities.blackjack import BlackjackActivity
from mandalay_bay.activities.slots import SlotsActivity
from mandalay_bay.activities.sportsbook import SportsbookActivity

ALL_ACTIVITIES: list = [
    BlackjackActivity(),
    SlotsActivity(),
    SportsbookActivity(),
]

ACTIVITIES_BY_ID = {a.info.id: a for a in ALL_ACTIVITIES}

FLOOR_ORDER = ["Table Games", "Slot Machines", "Sports Book"]
