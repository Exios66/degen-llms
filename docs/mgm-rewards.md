# MGM Rewards

Lifetime wagered chips advance you through MGM Rewards tiers with narrative comps and gameplay perks.

## Tiers

| Tier | Lifetime wagered | Key perks |
|------|-------------------|-----------|
| **Sapphire** | $0 | Entry tier, welcome drink comp |
| **Pearl** | $10,000 | Slot free-play comp, express checkout |
| **Gold** | $50,000 | Buffet comp, House of Blues TV channel |
| **Platinum** | $200,000 | Room night comp, reduced resort fees |
| **Noir** | $500,000 | Suite upgrade comp, Foundation Room phone access |
| **Chairman** | $1,000,000 | Penthouse fantasy, waived resort fees, VIP everything |

## Comps

Each tier unlocks narrative comps:

- Welcome drink
- Slot free-play
- Buffet voucher
- Room night
- Suite upgrade
- Penthouse fantasy sequence

Comps can cover hotel upgrades, room nights, and late checkout.

## Perks that gate content

| Perk | Gated by |
|------|----------|
| TV channels (House of Blues, etc.) | Gold+ |
| Gentleman's Club / Velvet Ledger | Gold+ (or suite key / club phone line) |
| Foundation Room phone line | Noir+ |
| Express checkout | Pearl+ |
| Resort fee reduction | Platinum+ |
| Resort fee waiver | Chairman |

## MGM Rewards phone

Press **P** in the web app (or access via RPG HUD):

- View tier status and progress to next tier
- Claim available comps
- Locate hotel reservation
- Text and **call** staff contacts (Connect tab) with multi-turn conversations
- Phone **Sounds** on Home: mute, SMS tones, and selectable ringtones (procedural dial / ringback / SMS SFX)
- **Connect → Call Uber / Lyft** — unlocks Strip Ride dispatch (web terminal) to Luxor, Excalibur, Bellagio, and Circa

Calls play dial tone → keypad → ringback, then branch like a real conversation until you hang up. Texts play send/receive tones when Sounds are enabled. The desktop phone shell and overlays respect dynamic viewport / safe-area caps so the LCD stays readable on short screens.

→ [Strip Ride](strip-ride.md)

## Wagering tracking

Every chip wagered across all activities contributes to `rewards.lifetimeWagered` in your save. This is separate from your current balance — you can be broke on the floor but still hold tier status.

## Implementation

| Path | Role |
|------|------|
| `mandalay_bay/rewards.py` | Tier calculation |
| `mandalay_bay/rewards_perks.py` | Perk gates |
| `mandalay_bay/rewards_experience.py` | Narrative comp flows |
| `docs/js/rewards.js` / `docs/js/RewardsPhone.js` | Browser mirror |

See [Chip Economy](chip-economy.md) for wallet mechanics.
