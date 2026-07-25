"""Save format migration — CLI v3 rewards bootstrap, v7 tier fields, v8 RPG state."""

from mandalay_bay.rewards import SAVE_VERSION_WITH_REWARDS, ensure_rewards, migrate_session_rewards
from mandalay_bay.saves import session_from_dict, session_to_dict
from mandalay_bay.session import PlayerSession
from mandalay_bay.chips import ChipWallet


def test_v3_save_without_rewards_migrates() -> None:
    data = {
        "version": SAVE_VERSION_WITH_REWARDS,
        "player_name": "Legacy",
        "wallet": {"balance": 1200, "transactions": []},
        "activity_stats": {},
    }
    session = session_from_dict(data)
    assert session.rewards is not None
    assert session.rewards.tier == "sapphire"


def test_rewards_state_roundtrip_in_session_dict() -> None:
    session = PlayerSession(
        player_name="Web",
        wallet=ChipWallet(balance=5000),
        slot_id=2,
        slot_label="Web Run",
    )
    ensure_rewards(session)
    session.rewards.lifetime_wagered = 12_000
    session.rewards.tier = "noir"

    payload = session_to_dict(session)
    restored = session_from_dict({**payload, "version": 7})

    assert restored.player_name == "Web"
    assert restored.rewards.tier == "noir"
    assert restored.rewards.lifetime_wagered == 12_000


def test_migrate_session_rewards_welcome_on_old_version() -> None:
    session = PlayerSession(player_name="Old", wallet=ChipWallet(balance=1000))
    migrate_session_rewards(session, data_version=1)
    assert session.rewards.notifications
    assert any(n["title"] == "Welcome to MGM Rewards" for n in session.rewards.notifications)


def test_v8_save_loads_in_the_cli() -> None:
    """The CLI reads `version` tolerantly, so a web v8 save must still load."""
    data = {
        "version": 8,
        "player_name": "Pixel",
        "wallet": {"balance": 4200, "transactions": []},
        "activity_stats": {},
        "rpg": {"mapId": "sky_bridge", "x": 4, "y": 9, "eggs": {"konami_mode": {}}},
    }
    session = session_from_dict(data)
    assert session.player_name == "Pixel"
    assert session.wallet.balance == 4200


def test_cli_round_trip_preserves_web_rpg_state() -> None:
    """Playing in the terminal must not erase pixel-RPG progress."""
    rpg = {
        "mapId": "guest_room",
        "x": 15,
        "y": 20,
        "inventory": ["reef_badge"],
        "dex": {"reef": ["sand_tiger"]},
        "eggs": {"egg_green_room": {"at": None}},
        "mapVisits": {"guest_room": 3},
        "options": {"muted": True, "textSpeed": "fast"},
    }
    loaded = session_from_dict(
        {
            "version": 8,
            "player_name": "Pixel",
            "wallet": {"balance": 900, "transactions": []},
            "activity_stats": {},
            "rpg": rpg,
        }
    )
    loaded.wallet.balance = 1500

    payload = session_to_dict(loaded)

    assert payload["rpg"] == rpg
    assert payload["wallet"]["balance"] == 1500
