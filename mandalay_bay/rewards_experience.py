"""MGM Rewards — CLI text mode (parity with web RewardsPhone)."""

from __future__ import annotations

from mandalay_bay.display import TerminalUI, fmt_chips
from mandalay_bay.hotel import ensure_hotel, find_reservation, get_room_type, reservation_hint
from mandalay_bay.rewards import (
    COMP_CATALOG,
    TIERS,
    ensure_rewards,
    progress_to_next_tier,
    sync_rewards_from_wallet,
    tier_for_wagered,
)
from mandalay_bay.rewards_perks import (
    RESORT_OFFERS,
    activity_timing,
    get_tier_experience,
    tier_index,
)
from mandalay_bay.session import PlayerSession


def run_rewards_phone(session: PlayerSession, ui: TerminalUI) -> None:
    sync_rewards_from_wallet(session)
    while True:
        rewards = ensure_rewards(session)
        tier = tier_for_wagered(rewards.lifetime_wagered)
        unread = sum(1 for n in rewards.notifications if not n.get("read"))
        ui.banner("MGM Rewards")
        ui.print(f"Member {rewards.member_id} · {tier.label} tier")
        ui.dim(f"{fmt_chips(rewards.lifetime_wagered)} lifetime wagered")
        if unread:
            ui.print(f"({unread} unread notification(s))")
        choice = ui.menu_choice(
            [
                "Member card",
                "My comps",
                "VIP perks",
                "Reservation",
                "Notifications",
                "Resort offers",
                "Back",
            ],
            title="Rewards phone:",
        )
        if choice == 0:
            return
        if choice == 1:
            _show_member_card(session, ui)
        elif choice == 2:
            _show_comps(session, ui)
        elif choice == 3:
            _show_perks(session, ui)
        elif choice == 4:
            _show_reservation(session, ui)
        elif choice == 5:
            _show_notifications(session, ui)
        elif choice == 6:
            _show_offers(session, ui)


def _show_member_card(session: PlayerSession, ui: TerminalUI) -> None:
    rewards = ensure_rewards(session)
    tier = tier_for_wagered(rewards.lifetime_wagered)
    exp = get_tier_experience(tier.id)
    prog = progress_to_next_tier(rewards)
    ui.banner("Member Card")
    ui.print(f"  {tier.label.upper()} — {session.player_name}")
    ui.print(f"  {rewards.member_id}")
    ui.print(f"  {fmt_chips(rewards.lifetime_wagered)} lifetime wagered")
    ui.dim(f"  {exp.monthly_amortized_cost}")
    ui.dim(f"  {exp.pit_boss_line}")
    if prog["next"]:
        ui.dim(
            f"  Progress to {prog['next'].label}: {prog['pct']}% "
            f"({fmt_chips(prog['remaining'])} to go)"
        )
    else:
        ui.dim("  Chairman status — you've arrived.")
    ui.pause()


def _show_perks(session: PlayerSession, ui: TerminalUI) -> None:
    rewards = ensure_rewards(session)
    tier = tier_for_wagered(rewards.lifetime_wagered)
    exp = get_tier_experience(tier.id)
    timing = activity_timing(tier.id)
    ui.banner(f"{exp.label} VIP Perks")
    ui.print(f"  {exp.tagline}")
    ui.dim(f"  Amortized cost: {exp.monthly_amortized_cost}")
    ui.dim(f"  Floor speed: {round((1 / timing['speed_multiplier']) * 100)}% VIP")
    ui.print("")
    for perk in exp.perks:
        ui.print(f"  • {perk}")
    ui.print("")
    ui.dim(f"  {exp.pit_boss_line}")
    if tier.id != "chairman":
        idx = tier_index(tier.id)
        if idx < len(TIERS) - 1:
            ui.dim(f"  Rank up to {TIERS[idx + 1].label} for more absurdity.")
    ui.pause()


def _show_comps(session: PlayerSession, ui: TerminalUI) -> None:
    rewards = ensure_rewards(session)
    ui.banner("My Comps")
    if not rewards.unlocked_comps:
        ui.dim("No comps yet — play the floor to earn tier rewards.")
    else:
        for comp_id in rewards.unlocked_comps:
            meta = COMP_CATALOG.get(comp_id, {})
            title = meta.get("title", comp_id)
            redeemed = comp_id in rewards.redeemed_comps
            status = "redeemed" if redeemed else "available"
            ui.print(f"  [{status}] {title}")
            if meta.get("body"):
                ui.dim(f"    {meta['body']}")
    ui.pause()


def _show_reservation(session: PlayerSession, ui: TerminalUI) -> None:
    hotel = ensure_hotel(session)
    room = get_room_type(hotel)
    ui.banner("Reservation")
    ui.print(f"  {room['label']}")
    ui.dim(f"  Conf {hotel.reservation_code}")
    if hotel.found_reservation:
        ui.dim(f"  {reservation_hint(hotel)}")
        ui.dim("  Head to hotel hallways from the lobby (Exit to Hotel).")
    else:
        ui.print("  Reservation not yet located.")
        if ui.prompt_yes_no("Locate reservation now?", default=True):
            result = find_reservation(session)
            ui.print(result.hint)
            if result.clue:
                ui.success(result.clue)
    ui.pause()


def _show_notifications(session: PlayerSession, ui: TerminalUI) -> None:
    rewards = ensure_rewards(session)
    ui.banner("Notifications")
    if not rewards.notifications:
        ui.dim("No notifications.")
    else:
        for note in rewards.notifications[:12]:
            read = note.get("read", False)
            prefix = "  " if read else "* "
            ui.print(f"{prefix}{note.get('title', 'Notice')}")
            if note.get("body"):
                ui.dim(f"    {note['body']}")
        if ui.prompt_yes_no("Mark all as read?", default=True):
            for note in rewards.notifications:
                note["read"] = True
    ui.pause()


def _show_offers(session: PlayerSession, ui: TerminalUI) -> None:
    rewards = ensure_rewards(session)
    tier = tier_for_wagered(rewards.lifetime_wagered)
    tier_idx = tier_index(tier.id)
    ui.banner("Resort Offers")
    for offer in RESORT_OFFERS:
        locked = tier_idx < offer["min_tier_index"]
        line = f"  {'[locked] ' if locked else ''}{offer['title']}"
        if locked:
            ui.dim(line)
        else:
            ui.print(line)
        ui.dim(f"    {offer['detail']}")
    ui.pause()
