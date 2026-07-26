# Changelog

All notable changes to **degen-llms** (The Mandalay Bay) are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-07-26

### Added

- **Trading Floor** — 744 stored futures/options contracts (NYSE, commodities, crypto) with filter chips, paging, and settlement (#105)
- **Market databases** — 337 sports events and 204 prediction scenarios with board paging, parlays, and futures (#105)
- **Trading ticker** — live underlying tape and rotating sparkline chart on web and CLI (#108)
- **Arcade Alley** — four CRT overlay cabinet minigames (Strip Cross, Neon Invaders, High-Roller Breakout, Showgirl Beat) with tickets and skill payouts (#110)
- **Vegas Strip Drive** — OutRun-lite arcade from valet garage via Valet Vic (#106)
- **Craps, Lottery Counter, and expanded prediction markets** on the casino floor (#68)
- **Cabinet-style title/attract scene** for the web terminal with skip flags (#94)
- **Animated Kenney playing-card sprites** on table game displays (#91)
- **Pixel RPG expansion** — web-terminal parity, Pokémon-style systems, and phone controls (#67, #89)
- **Walkable Las Vegas Blvd Strip overworld** with 32 explorable rooms
- **Mobile touch controls** and DS-style 2× pixel rendering for the RPG (#75)
- **RPG character customization**, closer camera, and enhanced NPC dialogue (#76)
- **Guest corridor expansion** with lobby/hallway room access (#86)
- **Quarto Posit Connect Cloud** documentation site (#62, #63)
- **Full GitHub Wiki** with themed sidebar, footer, and web UI screenshots (#71, #74)
- **Cursor skills** — `gh-pages-deploy-loop` (#72), `publish-mandalay-bay-pypi` (#83), `update-docs-parity` (#107)
- **Dedicated `mandalay-bay.toml`** for PyPI publish (#80)
- **Save-profile carry-over** between casino terminal and RPG with shared-slot helpers (#92)
- **GitHub pull request template** (#81)

### Changed

- Cashier buy-in raised to **$1M** per purchase; offshore cash-out up to **$1B** with tier-scaled withdraw limits (#108)
- **Table games** no longer cap max bets by stake tier — wager up to bankroll; slots keep tier/machine caps (#108)
- **MGM Rewards tier thresholds** aligned to docs: Pearl $10k, Gold $50k, Platinum $200k, Noir $500k, Chairman $1M lifetime wagered (#109)
- Major **RPG art upgrades** — SNES-era painterly tiles, animated water, shoreline fringes, contact shadows, and cozy resort atmosphere (#82, #84, #97, #98, #101)
- **32×44 tuxedo procedural characters** with feet-origin zone travel for seamless door/zone transitions (#93, #99)
- **Casino floor legibility** — distinct zones, textures, and signage in the pixel RPG (#77)
- Slot machines **remember last bet amount**; roulette shows **animated spin history** (#66)
- **Texas Hold'em** — full street flow, no-limit raises, 5-max table (#65)
- GitHub Pages deploy switched to **manual skill loop**; automatic workflow disabled (#72, #79)
- **Documentation parity** across wiki, Quarto `docs/`, and README — floor catalog kept aligned with `FLOOR_ORDER` (#102, #107)

### Fixed

- Mobile Rewards Phone opens downward under touch-pad layout; Delano suite wing door connected; Carmen front-desk routing scrollable on phones (#103)
- **Valet garage exit softlock** — strip/elevator wayfinding signs, path ramps, and interactive Keys Desk (#106)
- RPG character sprites **clipped to top-left quarter** after tuxedo upgrade (#95)
- **Chopped overworld sprites** and movement blocked by system toasts (#96)
- RPG title screen **blank boot** (#88)
- Hotel front desk interactions and phone reservation room unlock (#78)
- Registration lobby enter/exit loop
- RPG walk facing with vendored tiles and unique staff sprites (#90)

### Removed

- ~900KB of orphaned RPG tiles, dead modules (`EnvironmentTextures.js`, `sportsDataProvider.js`), and legacy archives (#100)

### Documentation

- Posit Connect Cloud added to README access points (#69)
- README access points and project structure updated (#70)
- Player guide, architecture, GDD, and wiki synced for Trading Floor, arcade content, and current deploy model (#102, #107)

### Notes

- Existing saves keep lifetime wager totals; tier is recomputed from the new thresholds, so players who maxed the old ladder may drop until they wager more (#109)
- Posit Connect republish requires JackJBurleson OAuth or `POSIT_CONNECT_CLOUD_*` secrets in the agent environment
- Intentionally excluded: gh-pages sync log commits and Quarto freeze refresh (#104)
