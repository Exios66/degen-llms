# Resort Dining

Interactive restaurant overlays at **Aureole**, **Border Grill**, and **Stripsteak** — order food and drinks, manage fullness and composure, and risk unexpected encounters as the pours add up.

Available in the **web terminal** (fullscreen overlay), **CLI**, and **pixel RPG** (hosted dining encounters).

## How to enter

| Surface | Path |
|---------|------|
| Web / CLI hotel | Front desk → **Resort dining** |
| Web / CLI casino floor | Casino Floor → **Resort dining** |
| Pixel RPG | Minibar / dining NPCs (`hotel_dining`, `restaurant_*`) |

Extreme intoxication (level ≥ 85) cuts you off at the door — Betty will roast you by text instead.

## Capacity minigame

Each sitting tracks:

- **Fullness** (0–100) — rises with every course
- **Composure** (0–100) — drops when you rush or chase shots
- **Drinks this sitting** — raises encounter odds
- **Score** — prestige dishes + bold pacing + encounter flair

### Pacing

| Pace | Effect |
|------|--------|
| **Pace yourself** | Less fullness, small composure gain |
| **Clean the plate** | Full satiation, more score, slight composure hit |
| **Chase with shots** | Less food fill, extra drink + intox, composure drop |

Bust by hitting full fullness or zero composure → food coma flag (next hotel hallway choice zigzags once) and settle the tab.

## Drink-scaled encounters

Encounter chance starts low and climbs with drinks this sitting plus global intoxication. Categories:

- **Strangers** — crypto bros, wedding crashers, lost tourists, rival high rollers
- **Escorts / call-girl gags** — champagne upsells, pit-boss-in-disguise, consent-forward dismiss options
- **Celebrities** — fry theft, absurd cameos, napkin autographs
- **Staff** — wine angels, whale hosts, kitchen gossip

Outcomes can grant chips, eggs, composure, or more pours. Tone stays satirical and opt-in — you can always decline.

## Persistence

`session.dining` stores visits, lifetime courses/drinks, per-venue high scores, encounter history, and dining eggs. Eggs also count toward **resort completion**.

## Wallet

Orders and tips debit the unified chip wallet under activity `dining`. Comps and encounter tips can credit chips back.

## See also

- [Casino Offerings](casino-offerings.md)
- [Resort Hotel](hotel.md)
- [Casino Floor amenities](casino-offerings.md#beyond-the-pits) (bars & intoxication)
