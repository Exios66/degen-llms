# Resort Hotel

The **Mandalay Bay Hotel Experience** — check in, navigate hallways, and unlock in-room vignettes.

## Access

- **CLI:** Exit casino floor to hotel from the hub menu
- **Web:** Hub menu or `?view=hotel-lobby`
- **RPG:** East lobby → Hotel Tower (Clerk Carmen encounter)

## Room types

| Type | Description |
|------|-------------|
| **Deluxe King** | Standard tower room |
| **Panorama Suite** | Upgraded views and amenities |
| **Chairman Penthouse** | Top-tier fantasy suite |

MGM Rewards tier comps can cover upgrades and room nights. See [[MGM-Rewards|MGM Rewards]].

## Hotel flow

1. **Front desk (Clerk Carmen)** — locate reservation, settle overdue charges, upgrade rooms, review folios, checkout, **resort dining**. Carmen's desk terminal can complete check-in for phone-only, desk-only, or two-step days (whale days still need a net-positive floor session).
2. **Room key** — activates as soon as the day's check-in requirement is satisfied, whether the phone or the desk finished it; the desk then offers your hallway or your door directly
3. **Hallway mini-game** — three beats of directional choices to reach your door (wrong turns are comedic; a dining food coma forces one zig). Reaching the door sets `reachedRoom` and unlocks in-room amenities
4. **Gentleman's Club — The Velvet Ledger** — opens from Gold+, a suite key, or the club phone line (hotel lobby / amenities)
5. **Your room** — TV, minibar, phone, balcony decisions, unlockable Vegas vignettes. Foundation Room phone line unlocks from a suite or penthouse (Noir+). **Call limo / private driver** (or Rewards Connect Uber / Lyft) unlocks [[Strip-Ride|Strip Ride]] travel on the web terminal

## Resort dining

Carmen books the three tables that matter: **Aureole**, **Border Grill**, and **Stripsteak**. Opening dining launches the capacity overlay — order courses, pace yourself, and risk drink-scaled encounters (strangers, celebrities, satirical escort gags, wine angels).

→ [[Resort-Dining|Resort Dining]]

## Strip Ride (web terminal)

From the room phone (**Call limo / private driver**) or MGM Rewards Phone **Connect → Call Uber / Lyft**, dispatch a chip-fare ride to **Luxor**, **Excalibur**, **Bellagio**, or **Circa**. Each property has five exclusive slots, destination-branded activities, and themed menus. Return to Mandalay Bay is complimentary. Not available in the pixel RPG.

→ [[Strip-Ride|Strip Ride]]

## In-room amenities

| Amenity | Highlights |
|---------|------------|
| **TV** | Shark Reef (ch. 47), wave pool cam, ULTRA Arena boxing, House of Blues (Gold+ tier) |
| **Minibar** | Sensor-enabled charges; concierge suggests items |
| **Phone** | Concierge, bookie, Foundation Room (Noir+), Gentleman's Club / Velvet Ledger (Gold+), spa, Delano, **limo / private driver** (Strip Ride) |
| **Gentleman's Club** | Hotel lobby amenity — make it rain, encounters, stocked bar, Tip Cascade / Bottle Memory / Felt Flip, ledger eggs |
| **Suite balcony POV** | Fullscreen Strip vista smoke-break overlay (suite/penthouse) — take hits, savor the view, step inside |
| **Decisions** | Balcony, sky bridge to Mandalay Place, suite/penthouse perks, wake-up roulette |

### Suite balcony POV smoke break

From a **Panorama Suite** or **Chairman Penthouse**, stepping onto the balcony opens a fullscreen first-person Strip overlook (haze advances with each hit; step inside to close). Overlay: `docs/js/BalconySmokeOverlay.js`.

### Unlockable vignettes

**17 unlockable room events** chain across:

- Pool visits
- Shopping (LUSH bath bomb at Mandalay Place)
- MGM Rewards tier status
- Bad decisions and easter eggs

Locked events show cryptic hints in the event log. Unlock all room events to auto-sign the guest directory.

## Guest Directory

Leather-bound lobby guest book with persistent signatures. Sign after completing resort milestones.

## World day/night cycle

**2 hours real time = 1 resort day.**

Phases within a day: dawn → midday → neon dusk → 2 AM clarity.

Each new day:

- **Daily charges** post automatically (room rate + resort fee + parking — higher for suites/penthouse)
- **Reservation requirement rotates:** phone only → desk only → phone + desk → net-positive whale check-in
- **Insufficient chips** locks room access until overdue charges are settled at the front desk or won on the casino floor

Platinum+ tiers reduce resort fees; Chairman tier waives them narratively.

## Stay lifecycle (Front Desk)

| Action | Behavior |
|--------|----------|
| **Review folio** | Minibar + room service + Mandalay Place deliveries |
| **Late checkout** | Comp if net-positive, else $75 |
| **Express checkout** | Pearl+ skips the line; Chairman waives the folio |
| **Standard checkout** | Decrements nights; at 0 nights Carmen offers extend-stay |

## Resort completion tracker

The hotel lobby and in-room hub show progress:

- Room vignettes unlocked
- Pool vignettes visited
- Dining encounter eggs
- TV channels sampled
- Guest book signed

## MGM Rewards phone

Press **P** in the web app for:

- Tier status and comps
- Reservation locate
- Textable / callable staff contacts (Connect)
- **Call Uber / Lyft** — Strip Ride unlock

## Implementation

| Path | Role |
|------|------|
| `mandalay_bay/hotel.py` | Hotel state machine |
| `mandalay_bay/hotel_experience.py` | CLI flows |
| `mandalay_bay/room_amenities.py` | TV, minibar, phone, events |
| `docs/js/hotel.js` / `docs/js/hotel-ui.js` | Browser mirror |
| `docs/js/hotel-ui.js` → `buildHotelRenderers(ctx)` | Screens the RPG mounts too |

See also [[Save-Slots]] for the hotel save schema.
