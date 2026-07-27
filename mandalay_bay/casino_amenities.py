"""Casino floor amenities — The Shoppes at Mandalay Place and full-service bars."""

from __future__ import annotations

from dataclasses import dataclass, field

from mandalay_bay.chips import ChipWallet
from mandalay_bay.intoxication import record_consumption
from mandalay_bay.session import PlayerSession


@dataclass(frozen=True, slots=True)
class ShopItem:
    id: str
    name: str
    description: str
    price: int


@dataclass(frozen=True, slots=True)
class ShopStore:
    id: str
    name: str
    tagline: str
    zone: str
    items: tuple[ShopItem, ...]


@dataclass(frozen=True, slots=True)
class BarDrink:
    id: str
    name: str
    description: str
    price: int


@dataclass(frozen=True, slots=True)
class CasinoBar:
    id: str
    name: str
    location: str
    vibe: str
    drinks: tuple[BarDrink, ...]


@dataclass
class CasinoAmenitiesState:
    """Purchases and bar visits while on the casino floor."""

    purchased_items: list[str] = field(default_factory=list)
    bar_orders: list[str] = field(default_factory=list)


MALL_NAME = "The Shoppes at Mandalay Place"
MALL_TAGLINE = (
    "Sky-bridge retail between Mandalay Bay and Luxor — designer flagships, "
    "sport, souvenirs, and beach gear on the casino carpet."
)

FLAGSHIP_DESIGNER_STORES: tuple[ShopStore, ...] = (
    ShopStore(
        id="gucci_flagship",
        name="Gucci Flagship",
        tagline="Las Vegas flagship \u2014 ready-to-wear, handbags, and signature GG.",
        zone="Flagship Designer Row (Casino Floor)",
        items=(
            ShopItem("gucci_dionysus", "Dionysus Mini Bag", "Iconic chain strap \u2014 take a piece of the Strip home.", 2850),
            ShopItem("gucci_loafers", "Horsebit Loafers", "Polished leather for the high-limit tables.", 890),
            ShopItem("gucci_sunglasses", "Oversized Sunglasses", "Gold-frame aviators for pool-side recovery.", 425),
            ShopItem("gucci_belt", "GG Marmont Belt", "Double-G buckle \u2014 cinched for the night.", 520),
            ShopItem("gucci_slides", "Rubber GG Slides", "Pool-to-lobby footwear with logo energy.", 310),
            ShopItem("gucci_scarf", "Silk GG Scarf", "Pocket square ambitions, scarf reality.", 395),
        ),
    ),
    ShopStore(
        id="louis_vuitton_flagship",
        name="Louis Vuitton Flagship",
        tagline="One of the largest LV boutiques on the Strip.",
        zone="Flagship Designer Row (Casino Floor)",
        items=(
            ShopItem("lv_keepall", "Keepall Bandouli\u00e8re 45", "Monogram canvas weekender for a lucky streak.", 3200),
            ShopItem("lv_wallet", "Multiple Wallet", "Damier Graphite \u2014 chips slide in easy.", 650),
            ShopItem("lv_key_pouch", "Key Pouch", "Compact essentials for the casino floor.", 395),
            ShopItem("lv_cap", "Monogram Cap", "Logo brim for the valet line.", 520),
            ShopItem("lv_trainers", "Trainer Sneaker", "Damier accents \u2014 walk of fame adjacent.", 1180),
            ShopItem("lv_trunk_charm", "Mini Trunk Charm", "Bag charm that costs more than a buffet.", 740),
        ),
    ),
    ShopStore(
        id="prada_flagship",
        name="Prada Flagship",
        tagline="Minimalist luxury on the casino carpet.",
        zone="Flagship Designer Row (Casino Floor)",
        items=(
            ShopItem("prada_re_nylon", "Re-Nylon Backpack", "Lightweight carry for a day at the tables.", 1950),
            ShopItem("prada_saffiano", "Saffiano Card Case", "Crosshatch leather card holder.", 375),
            ShopItem("prada_sunglasses", "Symbole Sunglasses", "Angular frames \u2014 paparazzi optional.", 520),
            ShopItem("prada_loafer", "Brushed Leather Loafer", "Quiet wealth for the salon rope.", 890),
            ShopItem("prada_bucket", "Re-Edition Bucket Bag", "Nylon classic revived for the sky bridge.", 1450),
            ShopItem("prada_tee", "Logo Triangle Tee", "Understated flex under a blazer.", 620),
        ),
    ),
    ShopStore(
        id="tom_ford_flagship",
        name="Tom Ford Flagship",
        tagline="Tailored glamour steps from the slot bank.",
        zone="Flagship Designer Row (Casino Floor)",
        items=(
            ShopItem("tf_suit", "O'Connor Suit", "Peak lapel \u2014 boardroom to baccarat.", 4200),
            ShopItem("tf_oud", "Oud Wood Eau de Parfum", "Signature scent for a night on the floor.", 295),
            ShopItem("tf_sunglasses", "Whitman Sunglasses", "Bold acetate frames.", 485),
            ShopItem("tf_loafer", "Shannon Loafer", "Patent shine that survives carpet static.", 990),
            ShopItem("tf_tie", "Silk Evening Tie", "Narrow cut for high-limit lighting.", 225),
            ShopItem("tf_clutch", "Leather Evening Clutch", "Just enough room for ID and a marker.", 1850),
        ),
    ),
    ShopStore(
        id="rolex_boutique",
        name="Rolex Boutique",
        tagline="Swiss precision under Mandalay gold \u2014 green seal, quiet flex.",
        zone="Flagship Designer Row (Casino Floor)",
        items=(
            ShopItem("rolex_submariner", "Oyster Perpetual Submariner", "Dive watch energy for dry land whales.", 12500),
            ShopItem("rolex_datejust", "Datejust 36", "Fluted bezel \u2014 the classic comps conversation starter.", 9800),
            ShopItem("rolex_oyster_bracelet", "Oyster Bracelet Polish", "Service kit souvenir \u2014 still expensive.", 450),
            ShopItem("rolex_travel_pouch", "Green Leather Watch Pouch", "Protect the flex between properties.", 320),
            ShopItem("rolex_cap", "Boutique Cap", "Green crown \u2014 understated until it isn't.", 85),
        ),
    ),
    ShopStore(
        id="tiffany_co",
        name="Tiffany & Co.",
        tagline="Robin's-egg blue on the casino carpet.",
        zone="Flagship Designer Row (Casino Floor)",
        items=(
            ShopItem("tiffany_bracelets", "T Wire Bracelet", "Gold wire \u2014 subtle marker for a good night.", 1450),
            ShopItem("tiffany_key", "Keys Pendant", "Little key, big implication.", 875),
            ShopItem("tiffany_sunglasses", "TF Soft Square Sunglasses", "Blue-case energy without the proposal.", 420),
            ShopItem("tiffany_bone_china", "Tiffany Blue Espresso Cup", "For suite coffee that judges you.", 195),
            ShopItem("tiffany_scarf", "Silk Color Block Scarf", "Pocket of sky on your neck.", 350),
        ),
    ),
)

MANDALAY_PLACE_STORES: tuple[ShopStore, ...] = (
    ShopStore(
        id="lik_fine_art",
        name="LIK Fine Art",
        tagline="Award-winning photography \u2014 Vegas skylines and desert light.",
        zone="Mandalay Place Sky Bridge",
        items=(
            ShopItem("lik_vegas_skyline", "Vegas Skyline Print", "Limited edition \u2014 Mandalay gold hour.", 450),
            ShopItem("lik_desert_moon", "Desert Moon", "Mojave nightscape on archival paper.", 680),
            ShopItem("lik_neon_noir", "Neon Noir Series", "Three-print set \u2014 pink, cyan, gold.", 920),
            ShopItem("lik_wave_pool", "Wave Pool Study", "Turquoise chaos framed for the suite.", 540),
        ),
    ),
    ShopStore(
        id="lush",
        name="LUSH Fresh Handmade Cosmetics",
        tagline="Self-appointed purveyor of bath bombs and spa recovery.",
        zone="Mandalay Place Sky Bridge",
        items=(
            ShopItem("lush_bath_bomb", "Intergalactic Bath Bomb", "Post-floor soak essential.", 12),
            ShopItem("lush_mist", "Sleepy Body Spray", "Lavender wind-down after a long session.", 28),
            ShopItem("lush_scrub", "Ocean Salt Scrub", "Exfoliate the cigarette patio shame.", 22),
            ShopItem("lush_mask", "Catastrophe Cosmetic Mask", "Blue clay for red-eye recovery.", 18),
            ShopItem("lush_soap", "Honey I Washed the Kids", "Solid soap \u2014 novelty, still works.", 14),
        ),
    ),
    ShopStore(
        id="ron_jon",
        name="Ron Jon Surf Shop",
        tagline="Beach gear for the 11-acre pool complex.",
        zone="Mandalay Place Sky Bridge",
        items=(
            ShopItem("ron_jon_rashguard", "Mandalay Rash Guard", "Sun-safe for the wave pool.", 55),
            ShopItem("ron_jon_towel", "Strip Logo Beach Towel", "Claim your cabana in style.", 38),
            ShopItem("ron_jon_boardshorts", "Palm Boardshorts", "Quick-dry for lazy river circuits.", 64),
            ShopItem("ron_jon_hat", "Snapback Surf Cap", "Shade for the daybeds.", 32),
            ShopItem("ron_jon_cooler", "Soft-Sided Cooler", "Smuggle waters \u2014 not contraband.", 48),
        ),
    ),
    ShopStore(
        id="flip_flop_shops",
        name="Flip Flop Shops",
        tagline="Sandals for the pool deck \u2014 steps from Big Chill.",
        zone="Mandalay Place Sky Bridge",
        items=(
            ShopItem("ff_reefs", "Reef Fanning Sandals", "Bottle opener sole \u2014 pool bar approved.", 65),
            ShopItem("ff_havaianas", "Havaianas Slim", "Brazilian classic in Mandalay teal.", 32),
            ShopItem("ff_olukai", "OluKai Ohana", "Beach-to-lobby comfort.", 85),
            ShopItem("ff_socks", "No-Show Resort Socks", "Because blisters ruin hot streaks.", 16),
        ),
    ),
    ShopStore(
        id="beauty_avenue",
        name="Beauty Avenue",
        tagline="Resort glam \u2014 fragrance, skincare, and Vegas exclusives.",
        zone="Mandalay Place Sky Bridge",
        items=(
            ShopItem("ba_vegas_gloss", "Vegas Lights Lip Gloss", "Shimmer finish for the casino glow.", 24),
            ShopItem("ba_spa_kit", "Pool Recovery Kit", "Sunscreen, aloe, and cooling mist.", 48),
            ShopItem("ba_bronzer", "Desert Bronze Compact", "Contour like you mean it.", 36),
            ShopItem("ba_perfume", "Mandalay Gold Eau Fraiche", "Citrus, amber, faint cigarette nostalgia.", 72),
            ShopItem("ba_lash", "Showgirl Lash Kit", "Dramatic without the feathers.", 42),
        ),
    ),
    ShopStore(
        id="guinness_store",
        name="GUINNESS Store",
        tagline="Everything for celebrating Ireland's signature stout.",
        zone="Mandalay Place Sky Bridge",
        items=(
            ShopItem("guinness_pint_glass", "Official Pint Glass Set", "Pair for Ri Ra nightcap.", 35),
            ShopItem("guinness_hat", "Embroidered Cap", "Souvenir from the sky bridge.", 28),
            ShopItem("guinness_tee", "Harp Logo Tee", "Black tee, white harp, zero regrets.", 32),
            ShopItem("guinness_coaster", "Slate Coaster Set", "Four coasters \u2014 protect the suite glass.", 22),
        ),
    ),
    ShopStore(
        id="nike_mandalay",
        name="Nike Store",
        tagline="Sport style for casino athletes and pool sprinters.",
        zone="Mandalay Place Sky Bridge",
        items=(
            ShopItem("nike_pegasus", "Air Zoom Pegasus", "Walk of shame, but cushioned.", 140),
            ShopItem("nike_dri_fit", "Dri-FIT Resort Tee", "Wicks regret and chlorine.", 45),
            ShopItem("nike_shorts", "Flex Stride Shorts", "Gym-to-buffet ready.", 55),
            ShopItem("nike_duffel", "Brasilia Duffel", "Stuff the shopping bag into a bag.", 40),
            ShopItem("nike_socks", "Everyday Cushion Socks (3-pack)", "Support for marathon sessions.", 22),
        ),
    ),
    ShopStore(
        id="house_of_blues_store",
        name="House of Blues Store",
        tagline="Merch from the joint next door \u2014 blues, tees, and tour posters.",
        zone="Mandalay Place Sky Bridge",
        items=(
            ShopItem("hob_tee", "Guitar Skeleton Tee", "Classic HOB art on soft cotton.", 38),
            ShopItem("hob_poster", "Mandalay Live Poster", "Tonight's energy, framed later.", 45),
            ShopItem("hob_hat", "Trucker Cap", "Mesh back for the pit.", 28),
            ShopItem("hob_pint", "HOB Pint Glass", "For Rhythm & Riffs encore drinks.", 18),
            ShopItem("hob_hoodie", "Tour Hoodie", "AC is aggressive in the casino.", 72),
        ),
    ),
    ShopStore(
        id="surf_city",
        name="Surf City Squeeze / Beach Essentials",
        tagline="Smoothies upstairs, SPF and floaties downstairs.",
        zone="Mandalay Place Sky Bridge",
        items=(
            ShopItem("surf_float", "Inflatable Cabana Lounger", "Claim water real estate.", 45),
            ShopItem("surf_spf", "SPF 50 Resort Stick", "Nose and ears \u2014 don't fry.", 18),
            ShopItem("surf_goggles", "Wave Pool Goggles", "See the foam coming.", 24),
            ShopItem("surf_bottle", "Insulated Squeeze Bottle", "Hydrate between bets.", 28),
        ),
    ),
    ShopStore(
        id="mandalay_souvenirs",
        name="Mandalay Bay Essentials",
        tagline="Official resort souvenirs \u2014 gold, waves, and shark-adjacent merch.",
        zone="Mandalay Place Sky Bridge",
        items=(
            ShopItem("mb_mug", "Gold Wave Mug", "Coffee that remembers the night before.", 22),
            ShopItem("mb_keychain", "Shark Reef Keychain", "Cute. Slightly menacing.", 14),
            ShopItem("mb_hoodie", "Resort Crest Hoodie", "Warmth for the 2 a.m. walk.", 68),
            ShopItem("mb_deck", "Mandalay Playing Cards", "House-branded deck for the room.", 16),
            ShopItem("mb_tote", "Canvas Resort Tote", "Carry The Shoppes home.", 32),
            ShopItem("mb_magnet", "Skyline Magnet Set", "Fridge trophies.", 12),
        ),
    ),
)

ALL_SHOP_STORES: tuple[ShopStore, ...] = FLAGSHIP_DESIGNER_STORES + MANDALAY_PLACE_STORES
SHOP_STORES_BY_ID = {s.id: s for s in ALL_SHOP_STORES}
SHOP_ITEMS_BY_ID = {item.id: item for store in ALL_SHOP_STORES for item in store.items}

CASINO_BARS: tuple[CasinoBar, ...] = (
    CasinoBar(
        id="eyecandy",
        name="Eyecandy Sound Lounge",
        location="Heart of the Mandalay Bay casino floor",
        vibe="Casual social scene with live music and a dance floor surrounded by casino energy.",
        drinks=(
            BarDrink("eyecandy_mandalay_mule", "Mandalay Mule", "House ginger beer, vodka, lime — floor favorite.", 18),
            BarDrink("eyecandy_sound_check", "Sound Check", "Passion fruit, rum, sparkling wine.", 22),
            BarDrink("eyecandy_neon_fizz", "Neon Fizz", "Blue curaçao, lemon, prosecco — dance-floor fuel.", 16),
            BarDrink("eyecandy_top_shelf", "Top Shelf Old Fashioned", "Bourbon, bitters, orange peel.", 24),
        ),
    ),
    CasinoBar(
        id="big_chill",
        name="Big Chill",
        location="Casino floor near The Shoppes at Mandalay Place entrance",
        vibe="Frozen drinks in souvenir cups — refills at special pricing after shopping.",
        drinks=(
            BarDrink("big_chill_frozen_marg", "Frozen Margarita (Souvenir Cup)", "Classic lime — keepsake cup included.", 16),
            BarDrink("big_chill_daquiri", "Strawberry Daiquiri (Souvenir Cup)", "Blended berries — pool-bound.", 16),
            BarDrink("big_chill_refill", "Souvenir Cup Refill", "Bring your Big Chill cup back for less.", 10),
            BarDrink("big_chill_mojito", "Frozen Mojito", "Mint, rum, crushed ice — sky-bridge cooldown.", 18),
        ),
    ),
    CasinoBar(
        id="rhythm_riiffs",
        name="Rhythm & Riffs Lounge",
        location="Center of the action-packed casino floor",
        vibe="Lounge seating, live music, and game-day energy — signature cocktails and spirits.",
        drinks=(
            BarDrink("rr_southern_lemonade", "Southern Lemonade", "Bourbon, lemonade, mint — House of Blues spirit.", 20),
            BarDrink("rr_kentucky_cooler", "Kentucky Cooler", "Whiskey, ginger ale, cherry.", 19),
            BarDrink("rr_dove_margarita", "Dove Margarita", "Reposado, agave, lime — B Side classic.", 21),
            BarDrink("rr_craft_beer", "Craft Beer Flight", "Three rotating taps — game on.", 15),
        ),
    ),
)

BARS_BY_ID = {b.id: b for b in CASINO_BARS}
BAR_DRINKS_BY_ID = {d.id: d for bar in CASINO_BARS for d in bar.drinks}


@dataclass
class PurchaseResult:
    ok: bool
    message: str


def ensure_amenities(session: PlayerSession) -> CasinoAmenitiesState:
    if not hasattr(session, "amenities") or session.amenities is None:
        session.amenities = CasinoAmenitiesState()
    return session.amenities


def default_amenities_state() -> CasinoAmenitiesState:
    return CasinoAmenitiesState()


def fmt_chips(amount: int) -> str:
    return f"${amount:,}"


def purchase_shop_item(session: PlayerSession, item_id: str) -> PurchaseResult:
    item = SHOP_ITEMS_BY_ID.get(item_id)
    if item is None:
        return PurchaseResult(False, "Unknown item.")
    amenities = ensure_amenities(session)
    if item_id in amenities.purchased_items:
        return PurchaseResult(False, f"You already picked up {item.name}.")
    wallet: ChipWallet = session.wallet
    if not wallet.debit(item.price, "shopping", f"{item.name} — The Shoppes"):
        return PurchaseResult(False, f"Insufficient chips — {item.name} is {fmt_chips(item.price)}.")
    amenities.purchased_items.append(item_id)
    session.record_visit("shopping")
    return PurchaseResult(
        True,
        f"Purchased {item.name} for {fmt_chips(item.price)}. "
        f"Balance: {fmt_chips(wallet.balance)}.",
    )


def order_bar_drink(session: PlayerSession, drink_id: str) -> PurchaseResult:
    drink = BAR_DRINKS_BY_ID.get(drink_id)
    if drink is None:
        return PurchaseResult(False, "Unknown drink.")
    bar = next(b for b in CASINO_BARS if any(d.id == drink_id for d in b.drinks))
    wallet: ChipWallet = session.wallet
    if not wallet.debit(drink.price, "bar", f"{drink.name} @ {bar.name}"):
        return PurchaseResult(False, f"Insufficient chips — {drink.name} is {fmt_chips(drink.price)}.")
    amenities = ensure_amenities(session)
    amenities.bar_orders.append(drink_id)
    session.record_visit("bar")
    record_consumption(session, drink_id, source="bar")
    return PurchaseResult(
        True,
        f"{drink.name} served at {bar.name} — {fmt_chips(drink.price)}. "
        f"Balance: {fmt_chips(wallet.balance)}.",
    )


def store_for_item(item_id: str) -> ShopStore | None:
    for store in ALL_SHOP_STORES:
        if any(i.id == item_id for i in store.items):
            return store
    return None


def list_purchased_items(session: PlayerSession) -> list[tuple[ShopItem, ShopStore]]:
    amenities = ensure_amenities(session)
    result: list[tuple[ShopItem, ShopStore]] = []
    for item_id in amenities.purchased_items:
        item = SHOP_ITEMS_BY_ID.get(item_id)
        store = store_for_item(item_id)
        if item and store:
            result.append((item, store))
    return result
