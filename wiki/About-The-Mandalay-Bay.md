# About The Mandalay Bay

**The Mandalay Bay** (`degen-llms`) is a satirical choose-your-adventure resort simulator. It is not affiliated with MGM Resorts International or the real Mandalay Bay property — it is a love letter to Vegas floor culture, hotel absurdity, and the chip-economy RPG loop.

## What it is

A full-stack digital resort spanning:

| Surface | Description |
|---------|-------------|
| **Python CLI** | Terminal casino hub with save slots, hotel, pool, and rewards |
| **Browser terminal** | GitHub Pages web app with the same chip wallet and activities |
| **Pixel RPG** | Phaser 3 overworld where casino games launch as in-world encounters |
| **Quarto docs** | Published manuscript on Posit Connect Cloud |

All game surfaces share one **unified chip economy**. Wins and losses in blackjack, slots, sports, racing, or the RPG all flow through the same wallet.

## Design pillars

### Unified chip wallet

One balance follows you everywhere — table games, slots, sports book, prediction markets, racing, hotel charges, and pool vignettes. The **Cashier** handles buy-ins and cash-outs; an **off-strip bank account** (web) lets you park winnings outside the cage.

### Hub-and-spoke navigation

The casino uses a lobby → floor → activity pattern. Sub-menus always offer `0) Back`. Progress auto-saves after each activity and when leaving.

### Satirical resort realism

The project riffs on real Vegas mechanics:

- Stake tiers from penny slots through **401K Contribution** ($542–$6,500) and **High Roller / No Limit**
- MGM Rewards tiers (Sapphire → Chairman) with narrative comps
- Hotel folios, minibar sensors, rotating check-in requirements, and overdue-charge lockouts
- An 11-acre pool complex with wave timing, cabanas, and Shark Reef collection quests

### Python source of truth

`mandalay_bay/` is the authoritative game logic. The browser mirrors it in `docs/js/` as vanilla ES modules. The pixel RPG delegates casino/hotel mechanics to that shared engine via DOM overlays.

## Property zones

| Zone | Highlights |
|------|------------|
| **Casino floor** | Table games, slots, lottery, sports book, trading floor, arcade alley, racing, equestrian |
| **Casino amenities** | Shoppes at Mandalay Place, three bars, intoxication tracking |
| **Resort dining** | Aureole, Border Grill, Stripsteak — eat/drink capacity minigame + encounters |
| **Hotel tower** | Front desk, hallway mini-game, in-room TV/phone/minibar, suite balcony POV |
| **Pool complex** | Wave pool, hot tubs, cabanas, beach club, aquarium |
| **VIP venues** | High Limit salon, Foundation Room, Gentleman's Club / Velvet Ledger (chip- and tier-gated) |

## Tone

Comedic, self-aware, and dense with environmental storytelling. NPCs have dialogue trees. Easter eggs hide in the RPG (Konami code, secret rooms, ludicrous prediction-market contracts). The project treats degenerate bankroll management as both gameplay loop and punchline.

## History

The project began as a digital blackjack CLI and grew into a multi-surface resort simulator:

1. **Phase 1** — CLI casino hub + blackjack engine
2. **Phase 2** — Web terminal parity + slots, sports book, hotel
3. **Phase 3** — Pool complex, MGM Rewards, world day/night cycle
4. **Phase 4** — Pixel RPG overworld with full activity encounters
5. **Phase 5** — Craps, lottery counter, no-limit Hold'em, prediction markets
6. **Phase 6** — Trading Floor (Mandalay Markets), stored sports/prediction scenario DBs
7. **Phase 7** — Resort dining overlays (capacity minigame, drink-scaled encounters) with CLI/RPG parity
8. **Phase 8** — Arcade Alley CRT cabinets, Vegas Strip Drive, Gentleman's Club, suite balcony POV
9. **Ongoing** — Art polish, new resort vignettes, and market catalog expansion

## See also

- [[Casino-Offerings]] — Full activity catalog
- [[Pixel-RPG-Simulator]] — Overworld design
- [[Architecture]] — Technical overview
