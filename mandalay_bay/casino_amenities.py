"""Casino floor amenities — The Shoppes at Mandalay Place and full-service bars."""

from __future__ import annotations

from dataclasses import dataclass, field

from mandalay_bay.chips import ChipWallet
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
    "Sky-bridge retail between Mandalay Bay and Luxor — flagship designer row "
    "opens directly onto the casino carpet."
)

FLAGSHIP_DESIGNER_STORES: tuple[ShopStore, ...] = (
    ShopStore(
        id="gucci_flagship",
        name="Gucci Flagship",
        tagline="Las Vegas flagship — ready-to-wear, handbags, and signature GG.",
        zone="Flagship Designer Row (Casino Floor)",
        items=(
            ShopItem("gucci_dionysus", "Dionysus Mini Bag", "Iconic chain strap — take a piece of the Strip home.", 2850),
            ShopItem("gucci_loafers", "Horsebit Loafers", "Polished leather for the high-limit tables.", 890),
            ShopItem("gucci_sunglasses", "Oversized Sunglasses", "Gold-frame aviators for pool-side recovery.", 425),
        ),
    ),
    ShopStore(
        id="louis_vuitton_flagship",
        name="Louis Vuitton Flagship",
        tagline="One of the largest LV boutiques on the Strip.",
        zone="Flagship Designer Row (Casino Floor)",
        items=(
            ShopItem("lv_keepall", "Keepall Bandoulière 45", "Monogram canvas weekender for a lucky streak.", 3200),
            ShopItem("lv_wallet", "Multiple Wallet", "Damier Graphite — chips slide in easy.", 650),
            ShopItem("lv_key_pouch", "Key Pouch", "Compact essentials for the casino floor.", 395),
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
            ShopItem("prada_sunglasses", "Symbole Sunglasses", "Angular frames — paparazzi optional.", 520),
        ),
    ),
    ShopStore(
        id="tom_ford_flagship",
        name="Tom Ford Flagship",
        tagline="Tailored glamour steps from the slot bank.",
        zone="Flagship Designer Row (Casino Floor)",
        items=(
            ShopItem("tf_suit", "O'Connor Suit", "Peak lapel — boardroom to baccarat.", 4200),
            ShopItem("tf_oud", "Oud Wood Eau de Parfum", "Signature scent for a night on the floor.", 295),
            ShopItem("tf_sunglasses", "Whitman Sunglasses", "Bold acetate frames.", 485),
        ),
    ),
)

MANDALAY_PLACE_STORES: tuple[ShopStore, ...] = (
    ShopStore(
        id="lik_fine_art",
        name="LIK Fine Art",
        tagline="Award-winning photography — Vegas skylines and desert light.",
        zone="Mandalay Place Sky Bridge",
        items=(
            ShopItem("lik_vegas_skyline", "Vegas Skyline Print", "Limited edition — Mandalay gold hour.", 450),
            ShopItem("lik_desert_moon", "Desert Moon", "Mojave nightscape on archival paper.", 680),
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
        ),
    ),
    ShopStore(
        id="flip_flop_shops",
        name="Flip Flop Shops",
        tagline="Sandals for the pool deck — steps from Big Chill.",
        zone="Mandalay Place Sky Bridge",
        items=(
            ShopItem("ff_reefs", "Reef Fanning Sandals", "Bottle opener sole — pool bar approved.", 65),
            ShopItem("ff_havaianas", "Havaianas Slim", "Brazilian classic in Mandalay teal.", 32),
        ),
    ),
    ShopStore(
        id="beauty_avenue",
        name="Beauty Avenue",
        tagline="Resort glam — fragrance, skincare, and Vegas exclusives.",
        zone="Mandalay Place Sky Bridge",
        items=(
            ShopItem("ba_vegas_gloss", "Vegas Lights Lip Gloss", "Shimmer finish for the casino glow.", 24),
            ShopItem("ba_spa_kit", "Pool Recovery Kit", "Sunscreen, aloe, and cooling mist.", 48),
        ),
    ),
    ShopStore(
        id="guinness_store",
        name="GUINNESS Store",
        tagline="Everything for celebrating Ireland's signature stout.",
        zone="Mandalay Place Sky Bridge",
        items=(
            ShopItem("guinness_pint_glass", "Official Pint Glass Set", "Pair for Rí Rá nightcap.", 35),
            ShopItem("guinness_hat", "Embroidered Cap", "Souvenir from the sky bridge.", 28),
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
