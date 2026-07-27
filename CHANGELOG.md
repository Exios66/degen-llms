# Changelog

All notable changes to **degen-llms** (The Mandalay Bay) are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2026-07-27

### Changed

- **Strip destination menus** — Luxor, Excalibur, Bellagio, and Circa away casinos use distinct accent colors, typography, and table skins instead of Mandalay Bay cyan chrome (#148)

### Documentation

- Docs / wiki / Posit parity — Strip Ride guide, destination exclusives, Rewards Connect rideshare, viewport notes
- README play section revised with terminal screenshot and Web Casino Terminal GitHub Pages badge (#150)

### Notes

- Intentionally excluded: prior changelog PR (#147) and strip-limo render smoke-test-only PR (#149)

## [1.2.0] - 2026-07-27

### Added

- **Gentleman's Club (Velvet Ledger)** — hotel amenity with bottle-service Ledger Bar and tier/suite/phone access paths (#125, #146)
- **Resort dining overlay** — first-person POV with food/drink sprites, capacity minigame, and per-venue scenery (Aureole wine tower, Border Grill poolside, Stripsteak booth) (#117, #123, #128)
- **First-person bar overlays** for eight lounge environments (Eyecandy, Big Chill, Rhythm & Riffs, Betty's, Skyfall, Ledger Bar, Beach Club, Foundation Room) (#133)
- **Mandalay Beach Pool Complex** graphic fullscreen overlay wired into web terminal hub, amenities, and hotel lobby (#119, #132)
- **Suite balcony POV** Strip smoke-break minigame from any guest room balcony once checked in (#120, #135)
- **Strip Ride / limo travel** to themed away casinos (Luxor, Excalibur, Bellagio, Circa) with exclusive slots and destination branding; Uber/Lyft unlock via Rewards Phone Connect (#141, #142)
- **Rewards Phone audio** — Web Audio SFX, customizable ringtones, and multi-turn call dialogues for all 18 contacts (#140)
- **Trading Floor symbol DB** with category-filtered tape and 1D/1W sparkline charts (#121)
- **Offshore spend decision tree** — life/business expense branches and in-world resort privilege purchases (#126)
- **Interactive PR development graph** on the Quarto / Posit documentation site (#136)
- **Shoppes expansion** — 16 stores / 81 SKUs including Rolex Boutique, Tiffany & Co., Nike, and House of Blues Store (#146)

### Changed

- **Lottery counter** — premium stakes, Powerball selectors, and draw overlays (#113)
- **Arcade Alley** — 2× pixel sprites, FX polish, and CRT readability scaling (#112, #115)
- **Desktop Rewards Phone** — enlarged shell/LCD and wired comp/Connect effects to wallet, dining, and hotel state (#129)
- **Room folio** — minibar and priced room decisions record line items with running total preview (#135)
- **Noir/Chairman tier** auto-applies suite/penthouse comp upgrades without a full Carmen reset (#135)
- **Intoxication max visuals** settle after three minutes (#124)
- **Responsive viewport** — terminal, overlays, and menus size against `100dvh` and safe-area tokens (#145)
- Posit Connect publish loads credentials from VM-local dotenv when dashboard secrets are absent (#139)

### Fixed

- **Strip Drive** road projection into a scanline boulevard (#116)
- **Strip Ride / private driver** blank-screen crash from missing `menuBtn` helper (#143)
- **Casino boot** ES module cache-skew that duplicated `venues.js` instances (#131, #138)
- **Slots spin glitches** — in-place reel updates instead of full `#app` re-render every 90ms (#135)
- **Tier gates** — sync effective lifetime wagered for Gentleman's Club, Foundation Room, and express checkout (#135, #146)
- **Velvet Ledger access** — amenity UI reads live session context instead of stale boot wallet (#146)
- **Pool overlay** menu clipping and text-menu fallback under the graphic overlay (#134)
- **Hotel hallway access**, Carmen front desk replies, and High Limit Salon exclusives (#118, #122)
- **gh-pages live verify** false failure on moved horse canvas helper (#114)
- **Phone comp redeem** triggers immediate persist/render so chips and credits appear in-game (#135)

### Documentation

- Docs parity pass — eight-floor catalog, Arcade Alley wiki, Posit Connect Cloud Agent secret setup (#127, #130)
- README deployment badges and access links updated
- PR graph page wired into Quarto navbar and Overview (#136, #137)

### Notes

- Strip Ride is web-terminal only; the pixel RPG hub is unchanged (#141)
- Intentionally excluded: gh-pages sync log commits and routine Quarto freeze refreshes

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
