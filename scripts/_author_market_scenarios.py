#!/usr/bin/env python3
"""Author sports, prediction, and trading scenario JSON catalogs (≥125 each).

Writes identical twins under docs/data/ and mandalay_bay/data/.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CATALOG = json.loads((ROOT / "docs/data/sports_catalog.json").read_text())

ODDS_TABLE = [
    (80, -200, 170),
    (40, -150, 130),
    (15, -130, 110),
    (-15, -110, -110),
    (-40, 110, -130),
    (-80, 130, -150),
]


def rating_odds(diff: float) -> tuple[int, int]:
    for threshold, home, away in ODDS_TABLE:
        if diff >= threshold:
            return home, away
    return 170, -200


def round_spread(value: float, step: float) -> float:
    if not step:
        return 0.0
    return round(value / step) * step


def short(name: str) -> str:
    return name.split()[-1]


def participants(sport_def: dict) -> list[dict]:
    return sport_def.get("teams") or sport_def.get("fighters") or sport_def.get("players") or []


def write_twins(name: str, payload: dict) -> None:
    text = json.dumps(payload, indent=2) + "\n"
    for base in (ROOT / "docs/data", ROOT / "mandalay_bay/data"):
        base.mkdir(parents=True, exist_ok=True)
        (base / name).write_text(text)
    print(f"wrote {name}: {len(payload.get('scenarios') or payload.get('contracts') or [])} entries")


def build_sports_scenarios() -> dict:
    scenarios: list[dict] = []
    n = 0
    for sport_key, sport_def in CATALOG["sports"].items():
        pool = participants(sport_def)
        scoring = sport_def.get("scoringProfile", {})
        is_outright = scoring.get("type") == "outright"
        juice = sport_def.get("juice", -110)
        step = sport_def.get("spreadStep", 0.5)
        home_field = sport_def.get("homeField", 0)
        mean_total = scoring.get("meanTotal", 45)

        if is_outright:
            for i in range(0, max(0, len(pool) - 3)):
                field = pool[i : i + 4]
                if len(field) < 2:
                    continue
                n += 1
                fav = max(field, key=lambda p: p["powerRating"])
                odds_map = {}
                for p in field:
                    gap = fav["powerRating"] - p["powerRating"]
                    if gap == 0:
                        odds_map[p["name"]] = abs(juice) if juice > 0 else 200
                    elif gap <= 20:
                        odds_map[p["name"]] = 350
                    elif gap <= 40:
                        odds_map[p["name"]] = 600
                    else:
                        odds_map[p["name"]] = 900
                scenarios.append({
                    "scenarioId": f"{sport_key.lower()}-out-{n:03d}",
                    "sport": sport_key,
                    "sportLabel": sport_def["label"],
                    "eventType": "outright",
                    "home": field[0]["name"],
                    "away": field[1]["name"],
                    "field": [p["name"] for p in field],
                    "homeOdds": odds_map[field[0]["name"]],
                    "awayOdds": odds_map[field[1]["name"]],
                    "outrightOdds": odds_map,
                    "spread": 0,
                    "total": 0,
                    "spreadHomeOdds": juice,
                    "spreadAwayOdds": juice,
                    "totalOverOdds": juice,
                    "totalUnderOdds": juice,
                    "props": [],
                    "label": " / ".join(short(p["name"]) for p in field),
                    "status": "scheduled",
                    "settled": False,
                    "live": False,
                })
            continue

        # Game matchups — rotate pairs for density
        for i, home in enumerate(pool):
            for j, away in enumerate(pool):
                if home is away:
                    continue
                if (i + j) % 2 == 0 and len(scenarios) > 40:
                    # keep variety without exploding; still hit ≥125 across sports
                    if (i * 7 + j * 3) % 3 != 0:
                        continue
                n += 1
                diff = home["powerRating"] + home_field - away["powerRating"]
                h_odds, a_odds = rating_odds(diff)
                spread = round_spread(-diff / 20.0, step)
                total = float(mean_total + ((i + j) % 5) - 2)
                props = [
                    {
                        "id": "both-score",
                        "label": f"Both teams score {max(1, int(mean_total * 0.35))}+",
                        "yesOdds": -130,
                        "noOdds": 110,
                    }
                ]
                if sport_key in ("NFL", "NCAAF"):
                    props.append({
                        "id": "over-tds",
                        "label": "Over 5.5 total TDs",
                        "yesOdds": -105,
                        "noOdds": -115,
                    })
                if sport_key in ("NBA", "NCAAB"):
                    props.append({
                        "id": "over-threes",
                        "label": "Over 24.5 combined 3PM",
                        "yesOdds": -115,
                        "noOdds": -105,
                    })
                if sport_key == "MLB":
                    props.append({
                        "id": "over-hrs",
                        "label": "Over 2.5 combined HRs",
                        "yesOdds": 105,
                        "noOdds": -125,
                    })
                scenarios.append({
                    "scenarioId": f"{sport_key.lower()}-g-{n:03d}",
                    "sport": sport_key,
                    "sportLabel": sport_def["label"],
                    "eventType": "game",
                    "home": home["name"],
                    "away": away["name"],
                    "homeOdds": h_odds,
                    "awayOdds": a_odds,
                    "spread": spread,
                    "total": total,
                    "spreadHomeOdds": juice,
                    "spreadAwayOdds": juice,
                    "totalOverOdds": juice,
                    "totalUnderOdds": juice,
                    "props": props,
                    "label": f"{short(away['name'])} @ {short(home['name'])}",
                    "status": "scheduled",
                    "settled": False,
                    "live": False,
                })

    # Season futures — championship style
    futures_specs = [
        ("NFL", "Super Bowl winner", ["Kansas City Chiefs", "Buffalo Bills", "San Francisco 49ers", "Philadelphia Eagles"]),
        ("NBA", "NBA Finals winner", ["Boston Celtics", "Denver Nuggets", "Oklahoma City Thunder", "Dallas Mavericks"]),
        ("MLB", "World Series winner", ["Los Angeles Dodgers", "New York Yankees", "Atlanta Braves", "Houston Astros"]),
        ("NHL", "Stanley Cup winner", ["Florida Panthers", "Edmonton Oilers", "Colorado Avalanche", "Dallas Stars"]),
        ("NCAAF", "CFP National Champion", ["Georgia Bulldogs", "Ohio State Buckeyes", "Michigan Wolverines", "Alabama Crimson Tide"]),
        ("Soccer", "Champions League winner", ["Manchester City", "Real Madrid", "Bayern Munich", "Inter Milan"]),
    ]
    for idx, (sport_key, title, field) in enumerate(futures_specs, start=1):
        sport_def = CATALOG["sports"][sport_key]
        # Only include names that exist in catalog when possible
        pool_names = {p["name"] for p in participants(sport_def)}
        field = [n for n in field if n in pool_names] or list(pool_names)[:4]
        odds_map = {name: 250 + i * 150 for i, name in enumerate(field)}
        for k in range(4):
            rotated = field[k:] + field[:k]
            odds_rot = {rotated[i]: 250 + i * 150 for i in range(len(rotated))}
            n += 1
            scenarios.append({
                "scenarioId": f"futures-{sport_key.lower()}-{idx}-{k+1:02d}",
                "sport": sport_key,
                "sportLabel": sport_def["label"],
                "eventType": "futures",
                "home": rotated[0],
                "away": rotated[1] if len(rotated) > 1 else rotated[0],
                "field": rotated,
                "homeOdds": odds_rot[rotated[0]],
                "awayOdds": odds_rot.get(rotated[1], 400),
                "outrightOdds": odds_rot,
                "spread": 0,
                "total": 0,
                "spreadHomeOdds": -110,
                "spreadAwayOdds": -110,
                "totalOverOdds": -110,
                "totalUnderOdds": -110,
                "props": [],
                "label": title,
                "futuresTitle": title,
                "status": "scheduled",
                "settled": False,
                "live": False,
            })

    # Pad if under 125 by cloning with id suffixes
    while len(scenarios) < 125:
        base = scenarios[len(scenarios) % max(1, len(scenarios))]
        clone = dict(base)
        clone["scenarioId"] = f"{base['scenarioId']}-x{len(scenarios)+1:03d}"
        clone["label"] = f"{base['label']} (slate {len(scenarios)+1})"
        scenarios.append(clone)

    return {
        "version": 1,
        "boardSize": CATALOG.get("boardSize", 10),
        "scenarios": scenarios[: max(125, len(scenarios))],
    }


def build_prediction_scenarios() -> dict:
    history = [
        ("Did Apollo 11 land humans on the Moon in July 1969?", "yes", 88, "Neil Armstrong & Buzz Aldrin — Sea of Tranquility."),
        ("Did the Berlin Wall fall in 1989?", "yes", 86, "November 9, 1989 — checkpoints opened overnight."),
        ("Did the 'Miracle on Ice' (USA over USSR) happen at Lake Placid 1980?", "yes", 84, "Feb 22, 1980 — amateur US hockey shocked the Soviets."),
        ("Was the Titanic's maiden voyage completed successfully in 1912?", "no", 12, "Struck an iceberg April 14–15, 1912."),
        ("Did the Wright brothers achieve powered flight at Kitty Hawk in 1903?", "yes", 90, "December 17, 1903."),
        ("Did the Cuban Missile Crisis end with a US invasion of Cuba?", "no", 18, "Resolved via quarantine and withdrawal (1962)."),
        ("Was Shakespeare historically proven to be a woman writing under a pen name?", "no", 8, "Mainstream history attributes the works to William Shakespeare."),
        ("Did Napoleon win the Battle of Waterloo (1815)?", "no", 15, "Defeated by Wellington and Blücher."),
        ("Did the US formally enter WWII after Pearl Harbor (Dec 1941)?", "yes", 92, "Congress declared war on Japan December 8, 1941."),
        ("Was the original Woodstock festival held in 1999?", "no", 10, "Woodstock '69 — Bethel, New York."),
        ("Did the first Super Bowl take place before 1970?", "yes", 78, "Super Bowl I — January 15, 1967."),
        ("Did Prohibition in the United States end with the 21st Amendment?", "yes", 85, "Ratified December 5, 1933."),
        ("Did the Roman Empire fall in a single day in 476 CE?", "no", 22, "Western Empire's end was gradual; 476 is a conventional marker."),
        ("Was the Declaration of Independence signed on July 4, 1776 by all delegates?", "no", 28, "Most signed August 2, 1776."),
        ("Did Magellan personally complete the first circumnavigation?", "no", 20, "He died in the Philippines; his expedition finished."),
        ("Was Pluto reclassified as a dwarf planet in 2006?", "yes", 82, "IAU definition change."),
        ("Did the Hindenburg disaster occur in New Jersey?", "yes", 80, "Lakehurst, 1937."),
        ("Was the Great Chicago Fire started by Mrs. O'Leary's cow (proven)?", "no", 25, "Popular myth; cause never proven."),
        ("Did the USSR launch Sputnik 1 in 1957?", "yes", 91, "October 4, 1957."),
        ("Did the Hundred Years' War last exactly 100 years?", "no", 16, "It lasted 116 years (1337–1453)."),
    ]

    headlines = [
        "Major award show produces a surprise winner tonight?",
        "Viral celebrity story breaks before midnight?",
        "Streaming platform hits #1 trending globally?",
        "Late-night monologue sparks national backlash?",
        "A tech keynote announces a product nobody expected?",
        "Box-office opener crushes opening-weekend forecasts?",
        "A sports star announces retirement mid-interview?",
        "Fashion week closes with an unexpected headliner?",
        "A meme stock ticker trends for the wrong reason?",
        "A podcast guest drop leaks before the episode airs?",
        "Red carpet look becomes the night's top search?",
        "A streaming series cliffhanger splits the internet?",
        "An influencer apology tour goes sideways live?",
        "A brand collab sells out in under ten minutes?",
        "A late-trade rumor moves the Vegas board?",
        "A weather delay becomes the top national story?",
        "A court filing drops after market close?",
        "A viral dance challenge hits a billion views?",
        "A celebrity couple confirms the engagement rumor?",
        "A product recall dominates morning shows?",
        "An AI demo demo fails spectacularly on stage?",
        "A charity stream breaks its donation goal early?",
    ]

    vegas = [
        "Strip foot traffic exceeds weekend forecast?",
        "Pool party attendance breaks venue record?",
        "High-roller salon fills every seat tonight?",
        "Fountain show crowd exceeds 10,000 viewers?",
        "A wedding party books the entire shark-reef overlook?",
        "Valet wait times exceed 45 minutes at peak?",
        "A celebrity sighting empties the casino floor briefly?",
        "Nightclub bottle service sells out before 11pm?",
        "Shark Reef tickets sell out before noon?",
        "House of Blues sells standing-room overflow?",
        "A high-limit slot progressive hits before midnight?",
        "Convention badge scan volume beats yesterday by 20%?",
        "Spa bookings fill every couples suite?",
        "Beach club daybeds are fully reserved?",
        "A whale clears a six-figure credit line tonight?",
        "Sportsbook espresso line exceeds 30 guests?",
        "Ultra Arena doors open late for a production delay?",
        "Sky bridge traffic peaks above hourly average?",
        "A bachelor party books three adjacent cabanas?",
        "Delano lounge hits standing-room only?",
        "Registration lobby wait drops under five minutes?",
        "A fireworks barge delay becomes Strip lore?",
    ]

    sentiment = [
        "Public poll swings toward the underdog?",
        "Social buzz peaks for the away side?",
        "Crowd favors the under on the main event?",
        "National sentiment shifts before kickoff?",
        "Sharp money fades the public favorite?",
        "Casual bettors hammer the over in primetime?",
        "Prediction markets disagree with the Vegas line?",
        "Home-team fandom spikes after a viral clip?",
        "Injury rumor cools the chalk overnight?",
        "Weather narrative flips total bettors?",
        "Referee assignment moves the ATS board?",
        "A coach presser changes closing sentiment?",
        "Ticket prices imply a different favorite?",
        "Fantasy ownership spikes the prop board?",
        "A revenge-game narrative dominates talk radio?",
        "Public splits 50/50 into kickoff?",
        "Live bettors hammer the dog after tip-off?",
        "Closing line value favors early tickets?",
        "Steam move hits three books in five minutes?",
        "Contrarian sharp play becomes consensus?",
        "Hometown bias shows up in handle share?",
        "A celebrity pick moves recreational money?",
    ]

    eggs = [
        "A pigeon steals a $25 chip from the high-limit salon tonight?",
        "The Mandalay Bay shark tank contains at least one shark thinking about blackjack?",
        "Steve Harvey's survey board correctly predicts a roulette spin?",
        "A guest tips the dealer in casino points instead of chips?",
        "The sportsbook espresso machine gains sentience and fades the public?",
        "Someone asks if the horse-racing pavilion takes crypto pigeons?",
        "A slot machine pays a progressive in Monopoly money (it doesn't clear)?",
        "The volcano show apologizes to a tourist for being 'too lava'?",
        "A craps shooter names their dice after Supreme Court justices?",
        "An LLM writes a perfect parlay and then fades itself?",
        "A high roller requests the cocktail menu in iambic pentameter?",
        "Security confuses a cosplay Jedi with a real lightsaber?",
        "A wedding party bets the bouquet toss at the sportsbook?",
        "The piano bar plays the risk theme for three hours straight?",
        "A guest tries to check a horse into the hotel?",
        "The reef tunnel fog machine invents a new weather pattern?",
        "A dealer shuffles so perfectly the cameras applaud?",
        "Someone claims the carpet pattern is a treasure map?",
        "A blackjack table achieves sentience and asks for a raise?",
        "The valet returns the wrong Lamborghini but the right vibes?",
        "A pigeon opens a prediction market on breadcrumbs?",
        "The Konami code unlocks a free espresso?",
        "A slot cabinet whispers tomorrow's lottery numbers (wrongly)?",
        "House odds briefly become fair for one glorious second?",
    ]

    scenarios: list[dict] = []

    def add(cat: str, question: str, yes: int, fixed=None, blurb=None):
        scenarios.append({
            "scenarioId": f"{cat[:4]}-{len(scenarios)+1:03d}",
            "category": cat,
            "question": question,
            "yesPrice": yes,
            "noPrice": 100 - yes,
            "volume": 5000 + (len(scenarios) * 137) % 40000,
            "fixedResolution": fixed,
            "blurb": blurb,
            "linkedEventId": None,
        })

    for q, res, yes, blurb in history:
        add("history", q, yes, res, blurb)
    # Expand history with variants
    for i, (q, res, yes, blurb) in enumerate(history):
        add("history", f"[Archive {i+1}] {q}", max(5, min(95, yes + (i % 5) - 2)), res, blurb)

    for i, q in enumerate(headlines):
        add("headlines", q, 40 + (i * 3) % 25)
    for i, q in enumerate(headlines):
        add("headlines", f"Late edition: {q}", 35 + (i * 2) % 30)

    for i, q in enumerate(vegas):
        add("vegas", q, 42 + (i * 2) % 20)
    for i, q in enumerate(vegas[:10]):
        add("vegas", f"Weekend watch: {q}", 38 + (i * 3) % 25)

    for i, q in enumerate(sentiment):
        add("sentiment", q, 45 + (i * 2) % 15)
    for i, q in enumerate(sentiment[:12]):
        add("sentiment", f"Closing bell: {q}", 40 + (i * 2) % 20)

    for i, q in enumerate(eggs):
        add("easter-eggs", q, 20 + (i * 5) % 40)

    # Sports-pulse style generic scenarios (resolved via RNG unless linked later)
    pulse = [
        "Home favorite covers the evening spread?",
        "Primetime total goes over?",
        "Underdog wins outright on the featured card?",
        "Both teams score in the first half?",
        "Fight ends before the final round?",
        "Tournament favorite finishes top two?",
        "Soccer match finishes with under 2.5 goals?",
        "NBA game sees 20+ combined threes?",
        "MLB game stays under the listed total?",
        "NHL game needs overtime?",
        "College chalk survives as a home dog?",
        "Golf leader after day one wins the event?",
        "Tennis chalk drops the first set but wins?",
        "UFC main event goes the distance?",
        "Public side cashes on the late slate?",
    ]
    for i, q in enumerate(pulse):
        add("sports-pulse", q, 48 + (i % 10))
        add("sports-pulse", f"Next card: {q}", 44 + (i % 12))

    while len(scenarios) < 125:
        add("headlines", f"Bonus buzz item #{len(scenarios)+1} trends nationally?", 50)

    return {"version": 1, "pageSize": 20, "scenarios": scenarios}


def build_trading_catalog() -> dict:
    nyse = [
        ("AAPL", "Apple Inc.", 190.0),
        ("MSFT", "Microsoft", 420.0),
        ("NVDA", "NVIDIA", 110.0),
        ("AMZN", "Amazon", 185.0),
        ("GOOGL", "Alphabet", 175.0),
        ("META", "Meta Platforms", 510.0),
        ("TSLA", "Tesla", 250.0),
        ("JPM", "JPMorgan Chase", 200.0),
        ("V", "Visa", 280.0),
        ("UNH", "UnitedHealth", 520.0),
        ("XOM", "Exxon Mobil", 110.0),
        ("JNJ", "Johnson & Johnson", 155.0),
        ("WMT", "Walmart", 70.0),
        ("MA", "Mastercard", 460.0),
        ("PG", "Procter & Gamble", 165.0),
        ("SPY", "SPDR S&P 500 ETF", 520.0),
        ("QQQ", "Invesco QQQ", 450.0),
        ("DIA", "Dow Diamonds", 390.0),
        ("IWM", "Russell 2000 ETF", 210.0),
        ("BA", "Boeing", 180.0),
    ]
    commodities = [
        ("GC", "Gold Futures", 2350.0, 100),
        ("SI", "Silver Futures", 28.5, 5000),
        ("CL", "Crude Oil WTI", 78.0, 1000),
        ("NG", "Natural Gas", 2.8, 10000),
        ("HG", "Copper", 4.2, 25000),
        ("ZC", "Corn", 4.5, 5000),
        ("ZW", "Wheat", 6.1, 5000),
        ("KC", "Coffee", 220.0, 37500),
        ("CT", "Cotton", 0.82, 50000),
        ("SB", "Sugar", 0.22, 112000),
        ("PL", "Platinum", 980.0, 50),
        ("PA", "Palladium", 1050.0, 100),
    ]
    crypto = [
        ("BTC", "Bitcoin", 65000.0),
        ("ETH", "Ethereum", 3400.0),
        ("SOL", "Solana", 145.0),
        ("XRP", "XRP", 0.62),
        ("ADA", "Cardano", 0.45),
        ("DOGE", "Dogecoin", 0.12),
        ("AVAX", "Avalanche", 35.0),
        ("DOT", "Polkadot", 7.2),
        ("LINK", "Chainlink", 14.5),
        ("MATIC", "Polygon", 0.72),
        ("LTC", "Litecoin", 85.0),
        ("BCH", "Bitcoin Cash", 420.0),
    ]

    contracts: list[dict] = []
    expiries = ["2026-09", "2026-12", "2027-03"]

    def add_contract(**kwargs):
        contracts.append(kwargs)

    # Equity / index futures + options
    for sym, name, px in nyse:
        for exp in expiries:
            add_contract(
                contractId=f"fut-nyse-{sym}-{exp}",
                instrument="future",
                assetClass="nyse",
                symbol=sym,
                underlying=name,
                expiry=exp,
                strike=None,
                multiplier=100 if not sym.endswith(("SPY", "QQQ", "DIA", "IWM")) else 50,
                markPrice=round(px * (1.0 + (hash(exp) % 7 - 3) * 0.01), 2),
                bid=None,
                ask=None,
            )
            for side, instrument in (("C", "call"), ("P", "put")):
                for k_off in (-0.05, 0.0, 0.05):
                    strike = round(px * (1 + k_off), 2)
                    # Crude Black-Scholes-ish premium stub
                    moneyness = abs(k_off)
                    premium = max(0.5, round(px * (0.03 + moneyness * 0.4), 2))
                    add_contract(
                        contractId=f"opt-nyse-{sym}-{exp}-{side}-{strike}",
                        instrument=instrument,
                        assetClass="nyse",
                        symbol=sym,
                        underlying=name,
                        expiry=exp,
                        strike=strike,
                        multiplier=100,
                        markPrice=premium,
                        bid=round(premium * 0.97, 2),
                        ask=round(premium * 1.03, 2),
                    )

    for sym, name, px, mult in commodities:
        for exp in expiries[:2]:
            mark = round(px * (1.0 + (hash(sym + exp) % 5 - 2) * 0.015), 4)
            add_contract(
                contractId=f"fut-cmdty-{sym}-{exp}",
                instrument="future",
                assetClass="commodities",
                symbol=sym,
                underlying=name,
                expiry=exp,
                strike=None,
                multiplier=mult,
                markPrice=mark,
                bid=round(mark * 0.998, 4),
                ask=round(mark * 1.002, 4),
            )
            for instrument, side in (("call", "C"), ("put", "P")):
                strike = round(px * (1.02 if instrument == "call" else 0.98), 4)
                premium = max(0.05, round(px * 0.04, 4))
                add_contract(
                    contractId=f"opt-cmdty-{sym}-{exp}-{side}-{strike}",
                    instrument=instrument,
                    assetClass="commodities",
                    symbol=sym,
                    underlying=name,
                    expiry=exp,
                    strike=strike,
                    multiplier=mult,
                    markPrice=premium,
                    bid=round(premium * 0.96, 4),
                    ask=round(premium * 1.04, 4),
                )

    for sym, name, px in crypto:
        for exp in expiries:
            mark = round(px * (1.0 + (hash(sym) % 9 - 4) * 0.02), 4)
            add_contract(
                contractId=f"fut-crypto-{sym}-{exp}",
                instrument="future",
                assetClass="crypto",
                symbol=sym,
                underlying=name,
                expiry=exp,
                strike=None,
                multiplier=1 if sym in ("BTC", "ETH") else 10,
                markPrice=mark,
                bid=round(mark * 0.995, 4),
                ask=round(mark * 1.005, 4),
            )
            for instrument, side in (("call", "C"), ("put", "P")):
                for k_off in (-0.1, 0.0, 0.1):
                    strike = round(px * (1 + k_off), 4)
                    premium = max(0.01, round(px * (0.05 + abs(k_off) * 0.3), 4))
                    add_contract(
                        contractId=f"opt-crypto-{sym}-{exp}-{side}-{strike}",
                        instrument=instrument,
                        assetClass="crypto",
                        symbol=sym,
                        underlying=name,
                        expiry=exp,
                        strike=strike,
                        multiplier=1 if sym in ("BTC", "ETH") else 10,
                        markPrice=premium,
                        bid=round(premium * 0.97, 4),
                        ask=round(premium * 1.03, 4),
                    )

    # Ensure bid/ask on futures
    for c in contracts:
        if c["bid"] is None:
            c["bid"] = round(c["markPrice"] * 0.999, 4)
        if c["ask"] is None:
            c["ask"] = round(c["markPrice"] * 1.001, 4)

    assert len(contracts) >= 125, len(contracts)
    return {"version": 1, "pageSize": 20, "contracts": contracts}


def main() -> None:
    sports = build_sports_scenarios()
    preds = build_prediction_scenarios()
    trading = build_trading_catalog()
    assert len(sports["scenarios"]) >= 125
    assert len(preds["scenarios"]) >= 125
    assert len(trading["contracts"]) >= 125
    write_twins("sports_scenarios.json", sports)
    write_twins("prediction_scenarios.json", preds)
    write_twins("trading_catalog.json", trading)
    print(
        f"totals: sports={len(sports['scenarios'])} "
        f"predictions={len(preds['scenarios'])} "
        f"trading={len(trading['contracts'])}"
    )


if __name__ == "__main__":
    main()
