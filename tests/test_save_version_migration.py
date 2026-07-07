"""Save format migration — CLI v3 rewards bootstrap and v7 tier fields."""

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
