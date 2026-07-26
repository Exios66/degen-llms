#!/usr/bin/env python3
"""One-shot authoring tool: merges the Phase 4 dialogue nodes into
docs/rpg/js/data/dialogues.json.

The JSON is the source of truth; this script exists so the new rooms could be
written as readable Python literals instead of hand-edited into a 2,000-line
JSON file. Re-running it is idempotent — nodes are replaced, never duplicated.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / "docs/rpg/js/data/dialogues.json"

NODES: dict[str, dict] = {
    # ── Las Vegas Blvd ────────────────────────────────────────────────────
    "doorman_dante_greet": {
        "speaker": "Doorman Dante",
        "text": "Evening. Doors are gold, the air is cold, and the carpet is designed to make you forget which way is out. Welcome to Mandalay Bay.",
        "choices": [
            {"label": "What's inside?", "next": "doorman_dante_tour"},
            {"label": "Anywhere I shouldn't go?", "next": "doorman_dante_warn"},
            {"label": "Just getting my bearings.", "next": "doorman_dante_bye"},
        ],
    },
    "doorman_dante_tour": {
        "speaker": "Doorman Dante",
        "text": "Straight through registration for the casino floor. Slots and the pit up north, race book west, the Shoppes and the sky bridge east. Eleven acres of pool out back and a shark tank under it all.",
        "setFlag": "met_doorman_dante",
        "next": "doorman_dante_bye",
    },
    "doorman_dante_warn": {
        "speaker": "Doorman Dante",
        "text": "High Limit Salon needs chips in your hand before the rope moves. Foundation Room needs a name I don't have. And back-of-house doors are for people wearing name tags.",
        "setFlag": "hint_venues",
        "next": "doorman_dante_bye",
    },
    "doorman_dante_bye": {
        "speaker": "Doorman Dante",
        "text": "Doors open all night. So does everything behind them.",
    },
    "cab_line_carl_greet": {
        "speaker": "Cab Line Carl",
        "text": "Forty minutes for a cab. Fifty if it rains, which it won't. I've been in this line since the buffet closed.",
        "choices": [
            {"label": "Why not just walk?", "next": "cab_line_carl_walk"},
            {"label": "You got a card for that?", "next": "cab_line_carl_card"},
            {"label": "Good luck out here.", "next": "cab_line_carl_bye"},
        ],
    },
    "cab_line_carl_walk": {
        "speaker": "Cab Line Carl",
        "text": "Walk? On the Strip? Friend, the next hotel is a mile of sidewalk and two escalators away. The line is shorter than the walk. Barely.",
        "next": "cab_line_carl_bye",
    },
    "cab_line_carl_card": {
        "speaker": "Cab Line Carl",
        "text": "Take this. Guy handed it to me — 555-0199, no name, no company. Dial it sometime. It rings. Somebody picks up. That's all I'll say.",
        "setFlag": "egg_wrong_number",
        "next": "cab_line_carl_bye",
    },
    "cab_line_carl_bye": {
        "speaker": "Cab Line Carl",
        "text": "If a cab pulls up and nobody's looking, I never saw you.",
    },
    # ── Valet / parking ───────────────────────────────────────────────────
    "valet_vic_greet": {
        "speaker": "Valet Vic",
        "text": "Level P1. Keys on the hook, cars on the ramp, and one very tired golf cart in the corner.",
        "choices": [
            {"label": "Take a car for a spin.", "encounter": "vegas_strip_drive"},
            {"label": "Where are the exits?", "next": "valet_vic_directions"},
            {"label": "Can I get the comped cart?", "next": "valet_vic_cart"},
            {"label": "Anything worth seeing down here?", "next": "valet_vic_garage"},
            {"label": "I'll walk.", "next": "valet_vic_bye"},
        ],
    },
    "valet_vic_directions": {
        "speaker": "Valet Vic",
        "text": "Strip ramp is east — follow the blue STRIP signs. Elevators south back up to registration. Don't wander Row F unless you like dust.",
        "next": "valet_vic_bye",
    },
    "valet_vic_cart": {
        "speaker": "Valet Vic",
        "text": "Cart's comped at Platinum and up. Get your play in and it unlocks itself — you'll feel it in your feet before you see it on the card.",
        "setFlag": "hint_golf_cart",
        "next": "valet_vic_bye",
    },
    "valet_vic_garage": {
        "speaker": "Valet Vic",
        "text": "Row F has a coupe that's been here since the Fourth of July. Keys desk has a little Strip Drive cabinet if you want to pretend you're in traffic without the tickets.",
        "next": "valet_vic_bye",
    },
    "valet_vic_bye": {
        "speaker": "Valet Vic",
        "text": "Strip exit east, elevators south. Try not to come back down heavier than you went up.",
    },
    "valet_vic_challenge": {
        "speaker": "Valet Vic",
        "text": "Hey — HEY. You're the one going upstairs with real money, aren't you. Take the cart line seriously and I'll take you seriously.",
        "reputation": {"staff": 1},
        "next": "valet_vic_greet",
    },
    "keys_desk_arcade_greet": {
        "speaker": "Keys Desk Cabinet",
        "text": "A battered plastic wheel sticks out of a keys-desk arcade cabinet. The marquee flickers: STRIP DRIVE — INSERT ATTENTION.",
        "choices": [
            {"label": "Grab the wheel.", "encounter": "vegas_strip_drive"},
            {"label": "Leave it.", "next": "keys_desk_arcade_bye"},
        ],
    },
    "keys_desk_arcade_bye": {
        "speaker": "Keys Desk Cabinet",
        "text": "The cabinet clicks once, offended, and goes back to humming neon.",
    },
    "row_f_coupe_greet": {
        "speaker": "Row F Coupe",
        "text": "Dust on the hood. A faded Fourth of July sticker. The meter says unpaid since July. Nobody has claimed it.",
        "choices": [
            {"label": "Peek inside.", "next": "row_f_coupe_peek"},
            {"label": "Back away.", "next": "row_f_coupe_bye"},
        ],
    },
    "row_f_coupe_peek": {
        "speaker": "Row F Coupe",
        "text": "Glovebox holds a valet ticket for someone named M. Nobody, a pack of matches from Skyfall, and a note: 'back in 20.' That was months ago.",
        "setFlag": "met_row_f_coupe",
        "next": "row_f_coupe_bye",
    },
    "row_f_coupe_bye": {
        "speaker": "Row F Coupe",
        "text": "The coupe settles. Somewhere a drip tick-ticks onto concrete.",
    },
    # ── Registration lobby ────────────────────────────────────────────────
    "bell_desk_bruno_greet": {
        "speaker": "Bell Desk Bruno",
        "text": "Bell desk. I move luggage, shopping bags, and the occasional regret. What are we carrying?",
        "choices": [
            {"label": "Can you hold shopping bags?", "next": "bell_desk_bruno_bags"},
            {"label": "How's the sky bridge haul?", "next": "bell_desk_bruno_bridge"},
            {"label": "Nothing yet.", "next": "bell_desk_bruno_bye"},
        ],
    },
    "bell_desk_bruno_bags": {
        "speaker": "Bell Desk Bruno",
        "text": "Buy it at the Shoppes, tell Bev at bag check, and it lands in your room before you do. Your Bag menu keeps the receipt either way.",
        "setFlag": "hint_mall_bag",
        "next": "bell_desk_bruno_bye",
    },
    "bell_desk_bruno_bridge": {
        "speaker": "Bell Desk Bruno",
        "text": "Six bags is the record for one crossing. Guy from Reno, 2011. He dropped one at the halfway point and we do not speak of it.",
        "next": "bell_desk_bruno_bye",
    },
    "bell_desk_bruno_bye": {
        "speaker": "Bell Desk Bruno",
        "text": "Trolley's over there if you change your mind.",
    },
    # ── Casino floor south ────────────────────────────────────────────────
    "slot_tech_tessa_greet": {
        "speaker": "Slot Tech Tessa",
        "text": "Don't ask me which one is due. Nothing is due. That said, I do have a service ladder and opinions.",
        "choices": [
            {"label": "Which machine is loose?", "next": "slot_tech_tessa_loose"},
            {"label": "What's that brass bell up there?", "next": "slot_tech_tessa_bell"},
            {"label": "Any fruit machines left?", "next": "slot_tech_tessa_cherry"},
            {"label": "I'll figure it out.", "next": "slot_tech_tessa_bye"},
        ],
    },
    "slot_tech_tessa_loose": {
        "speaker": "Slot Tech Tessa",
        "text": "Play eight different machines and you'll learn more than I can tell you. The floor keeps count even when you don't.",
        "startQuest": "jackpot_hunt",
        "encounter": "slots",
    },
    "slot_tech_tessa_bell": {
        "speaker": "Slot Tech Tessa",
        "text": "That's the old handpay bell. Hasn't rung since 1999 — we page a phone now. I still polish it. Somebody should hear it again.",
        "setFlag": "egg_jackpot_bell",
        "next": "slot_tech_tessa_bye",
    },
    "slot_tech_tessa_cherry": {
        "speaker": "Slot Tech Tessa",
        "text": "One. End of the aisle, mechanical reels, pays in fruit like it's still got a coin hopper. It is not on any report I file.",
        "setFlag": "easter_cherry",
        "next": "slot_tech_tessa_bye",
    },
    "slot_tech_tessa_bye": {
        "speaker": "Slot Tech Tessa",
        "text": "If a screen freezes, wave. Don't hit it. Everyone hits it.",
    },
    "slot_tech_tessa_challenge": {
        "speaker": "Slot Tech Tessa",
        "text": "You've got the walk of somebody who thinks they've spotted a pattern. Sit down. Let's test the theory on my aisle.",
        "reputation": {"staff": 1},
        "encounter": "slots",
    },
    "cocktail_cora_greet": {
        "speaker": "Cocktail Cora",
        "text": "Drinks are free while you're playing, and 'playing' is a generous word around here. What'll it be?",
        "choices": [
            {"label": "Something on the house.", "encounter": "bar"},
            {"label": "How's the bar crawl going?", "next": "cocktail_cora_crawl"},
            {"label": "Later.", "next": "cocktail_cora_bye"},
        ],
    },
    "cocktail_cora_crawl": {
        "speaker": "Cocktail Cora",
        "text": "Three bars on property worth the walk: Betty's in the west lobby, the Skyfall up top, and whatever they're calling the beach bar this season. Do all three and Betty gives you a coaster she stole from herself.",
        "setFlag": "hint_bar_crawl",
        "next": "cocktail_cora_bye",
    },
    "cocktail_cora_bye": {
        "speaker": "Cocktail Cora",
        "text": "Flag me down. I circle every eleven minutes, like weather.",
    },
    # ── Race & sports book ────────────────────────────────────────────────
    "stable_hand_stu_greet": {
        "speaker": "Stable Hand Stu",
        "text": "Simulcast on the screens, stables on the board. I know every horse by the way it breathes, which has never once helped me pick one.",
        "choices": [
            {"label": "Show me the stables.", "encounter": "horse_stables"},
            {"label": "Any advice?", "next": "stable_hand_stu_tip"},
            {"label": "Just watching.", "next": "stable_hand_stu_bye"},
        ],
    },
    "stable_hand_stu_tip": {
        "speaker": "Stable Hand Stu",
        "text": "Never bet the grey in the rain and never bet the favorite because it's the favorite. It doesn't rain here, so that's half my system already useless.",
        "next": "stable_hand_stu_bye",
    },
    "stable_hand_stu_bye": {
        "speaker": "Stable Hand Stu",
        "text": "Post time's whenever the screen says. It's always about to be post time.",
    },
    # Blake predates Phase 4; re-authored here so the predictions board has a
    # door in the overworld and not just a deep link.
    "bookie_blake_greet": {
        "speaker": "Bookie Blake",
        "text": "Lines are live. Moneyline, settle when you're brave. No juice jokes — the juice is the point.",
        "choices": [
            {"label": "Open sports book", "encounter": "sportsbook", "setFlag": "played_sportsbook"},
            {"label": "What's on the prediction board?", "encounter": "predictions",
             "setFlag": "played_predictions"},
            {"label": "Any lock tonight?", "next": "bookie_blake_lock"},
            {"label": "Pass", "next": "bookie_blake_bye"},
        ],
    },
    # ── Craps pit ─────────────────────────────────────────────────────────
    "stickman_stan_greet": {
        "speaker": "Stickman Stan",
        "text": "Dice are out. Hit the back wall, keep one hand on the rail, and do not say the word — you know the word. The one that rhymes with 'heaven'.",
        "choices": [
            {"label": "Get me on the pass line.", "encounter": "craps", "setFlag": "played_craps"},
            {"label": "Which bets are the good ones?", "next": "stickman_stan_odds"},
            {"label": "Why can't I say it?", "next": "stickman_stan_superstition"},
            {"label": "I'll just watch the rail.", "next": "stickman_stan_bye"},
        ],
    },
    "stickman_stan_odds": {
        "speaker": "Stickman Stan",
        "text": "Pass line with odds behind it is the least rude bet in the building. Everything painted in the middle of my layout is there because it's pretty, not because it's fair.",
        "setFlag": "hint_craps_odds",
        "next": "stickman_stan_bye",
    },
    "stickman_stan_superstition": {
        "speaker": "Stickman Stan",
        "text": "Because a table is a group project and the group has decided. Say it and eight strangers will look at you like you turned the lights off.",
        "next": "stickman_stan_bye",
    },
    "stickman_stan_bye": {
        "speaker": "Stickman Stan",
        "text": "Dice are coming out. Watch your fingers and your bankroll, in that order.",
    },
    "stickman_stan_challenge": {
        "speaker": "Stickman Stan",
        "text": "You! Yeah — you walked past my table twice and the shooter's been cold both times. That's not a coincidence, that's a job opening. Grab the rail.",
        "choices": [
            {"label": "Give me the dice.", "encounter": "craps", "setFlag": "played_craps",
             "reputation": {"staff": 1}},
            {"label": "I'm not the lucky type.", "next": "stickman_stan_challenge_decline"},
        ],
    },
    "stickman_stan_challenge_decline": {
        "speaker": "Stickman Stan",
        "text": "Nobody is until the dice say so. Table's here all night, and so is the cold streak.",
    },
    # ── Foundation Room ───────────────────────────────────────────────────
    "host_alexandra_greet": {
        "speaker": "Host Alexandra",
        "text": "Alexandra. I run the list. If you're standing here, someone decided you were interesting — that was probably me, and I can change my mind.",
        "choices": [
            {"label": "Seat me in the lounge.", "encounter": "foundation_room_lounge"},
            {"label": "What gets me comped?", "next": "host_alexandra_comps"},
            {"label": "Who else is up here?", "next": "host_alexandra_room"},
            {"label": "Just enjoying the view.", "next": "host_alexandra_bye"},
        ],
    },
    "host_alexandra_comps": {
        "speaker": "Host Alexandra",
        "text": "Theatre of play, not size of win. Sit long, tip well, lose gracefully. Your phone tracks it — check the rewards tier before you ask me for anything.",
        "setFlag": "met_host_alexandra",
        "next": "host_alexandra_bye",
    },
    "host_alexandra_room": {
        "speaker": "Host Alexandra",
        "text": "Whitney and Warren. Whitney counts cards for fun and never plays. Warren plays everything and counts nothing. They've been married to that dynamic for years.",
        "next": "host_alexandra_bye",
    },
    "host_alexandra_bye": {
        "speaker": "Host Alexandra",
        "text": "The city looks better from here because you can't hear it.",
    },
    # ── The Shoppes at Mandalay Place ─────────────────────────────────────
    "boutique_bianca_greet": {
        "speaker": "Boutique Bianca",
        "text": "Designer wing. Everything is a little too expensive on purpose — it's a service we provide.",
        "choices": [
            {"label": "Show me the stores.", "encounter": "shops"},
            {"label": "What sells at 3am?", "next": "boutique_bianca_late"},
            {"label": "Only browsing.", "next": "boutique_bianca_bye"},
        ],
    },
    "boutique_bianca_late": {
        "speaker": "Boutique Bianca",
        "text": "Sunglasses and apology jewelry, in that order. The register can tell what kind of night you had.",
        "next": "boutique_bianca_bye",
    },
    "boutique_bianca_bye": {
        "speaker": "Boutique Bianca",
        "text": "The sky bridge is that way. Mind the bags.",
    },
    "bag_check_bev_greet": {
        "speaker": "Bag Check Bev",
        "text": "Hand it over and it goes to your room. Carry it yourself and it goes wherever you drop it, which is usually the pool.",
        "choices": [
            {"label": "Check my bag.", "encounter": "mall_bag"},
            {"label": "What's the record?", "next": "bag_check_bev_record"},
            {"label": "I'll hold on to it.", "next": "bag_check_bev_bye"},
        ],
    },
    "bag_check_bev_record": {
        "speaker": "Bag Check Bev",
        "text": "Six bags across the bridge in one trip. Bruno tells it better than I do, and he tells it wrong.",
        "next": "bag_check_bev_bye",
    },
    "bag_check_bev_bye": {
        "speaker": "Bag Check Bev",
        "text": "Tag's good all night. So am I.",
    },
    "lottery_lena_greet": {
        "speaker": "Lottery Lena",
        "text": "Pick 3, Pick 4, Mandalay Mega, and two scratchers that were printed by somebody having a bad week. The counter is open, the odds are not.",
        "choices": [
            {"label": "Buy a ticket.", "encounter": "lottery", "setFlag": "played_lottery"},
            {"label": "Nevada doesn't have a lottery.", "next": "lottery_lena_legal"},
            {"label": "Any strategy?", "next": "lottery_lena_strategy"},
            {"label": "Maybe later.", "next": "lottery_lena_bye"},
        ],
    },
    "lottery_lena_legal": {
        "speaker": "Lottery Lena",
        "text": "Correct. That's why this is a resort amusement paid in chips, and why the sign behind me has more disclaimer than name. Enjoy your resort amusement.",
        "setFlag": "hint_lottery_legal",
        "next": "lottery_lena_bye",
    },
    "lottery_lena_strategy": {
        "speaker": "Lottery Lena",
        "text": "Quick Pick if you're honest, birthdays if you're sentimental, and the same four numbers every day if you'd like a hobby that hurts.",
        "next": "lottery_lena_bye",
    },
    "lottery_lena_bye": {
        "speaker": "Lottery Lena",
        "text": "Tickets don't expire until the draw. Neither does hope, technically.",
    },
    # ── Sky bridge ────────────────────────────────────────────────────────
    "busker_bo_greet": {
        "speaker": "Busker Bo",
        "text": "Best acoustics on property. Two casinos, one hallway, and nobody's in a hurry because they're already lost.",
        "choices": [
            {"label": "Play something.", "encounter": "rhythm"},
            {"label": "How's the crowd?", "next": "busker_bo_crowd"},
            {"label": "Keep it up.", "next": "busker_bo_bye"},
        ],
    },
    "busker_bo_crowd": {
        "speaker": "Busker Bo",
        "text": "Winners tip loud. Losers tip more. I've learned not to ask which one is walking toward me.",
        "next": "busker_bo_bye",
    },
    "busker_bo_bye": {
        "speaker": "Busker Bo",
        "text": "Same spot all night. The bridge doesn't close.",
    },
    "busker_bo_challenge": {
        "speaker": "Busker Bo",
        "text": "You walk in time. Most people don't. Let's find out if that's rhythm or just a good pair of shoes.",
        "reputation": {"tourists": 1},
        "encounter": "rhythm",
    },
    # ── Convention center ─────────────────────────────────────────────────
    "badge_barry_greet": {
        "speaker": "Badge Barry",
        "text": "Registration for the expo. No badge, no floor. Badge, still no floor if the keynote's running.",
        "choices": [
            {"label": "What's the expo?", "next": "badge_barry_expo"},
            {"label": "Can I get a badge?", "next": "badge_barry_badge"},
            {"label": "Wrong hallway.", "next": "badge_barry_bye"},
        ],
    },
    "badge_barry_expo": {
        "speaker": "Badge Barry",
        "text": "This week it's industrial refrigeration. Last week it was hypnotists. The hypnotists tipped better and left the chairs facing the wrong way.",
        "next": "badge_barry_bye",
    },
    "badge_barry_badge": {
        "speaker": "Badge Barry",
        "text": "Here. Guest badge, lanyard's the cheap kind. Don't wear it to the pool — you'd be amazed how often I have to say that.",
        "setFlag": "met_badge_barry",
        "next": "badge_barry_bye",
    },
    "badge_barry_bye": {
        "speaker": "Badge Barry",
        "text": "Casino's back through the double doors. Follow the carpet that hurts to look at.",
    },
    "vendor_val_greet": {
        "speaker": "Vendor Val",
        "text": "Booth 114. I've handed out four thousand pens and made zero sales, and my company calls that a successful activation.",
        "choices": [
            {"label": "What are you selling?", "encounter": "shops"},
            {"label": "Rough week?", "next": "vendor_val_week"},
            {"label": "Good luck.", "next": "vendor_val_bye"},
        ],
    },
    "vendor_val_week": {
        "speaker": "Vendor Val",
        "text": "Nine hours on carpet over concrete. The pool is two hundred feet that way and I have seen it exactly once, from a window, while carrying a box.",
        "next": "vendor_val_bye",
    },
    "vendor_val_bye": {
        "speaker": "Vendor Val",
        "text": "Take a pen. Take two. Please.",
    },
    # ── Betty's Bar ───────────────────────────────────────────────────────
    "regular_reggie_greet": {
        "speaker": "Regular Reggie",
        "text": "Third stool from the end. Twelve years. Betty pours before I sit, which is either friendship or a diagnosis.",
        "choices": [
            {"label": "Best bar on property?", "next": "regular_reggie_bars"},
            {"label": "Seen anything strange?", "next": "regular_reggie_strange"},
            {"label": "Enjoy it.", "next": "regular_reggie_bye"},
        ],
    },
    "regular_reggie_bars": {
        "speaker": "Regular Reggie",
        "text": "Here for the pour, Skyfall for the view, the beach bar for the mistake. Do all three in a night and Betty stops charging you. She also stops respecting you.",
        "setFlag": "hint_bar_crawl",
        "next": "regular_reggie_bye",
    },
    "regular_reggie_strange": {
        "speaker": "Regular Reggie",
        "text": "The elevator skips a floor. Everyone notices, nobody says it. Ask Cleo upstairs — she'll tell you it's mechanical. It's not mechanical.",
        "setFlag": "hint_phantom_floor",
        "next": "regular_reggie_bye",
    },
    "regular_reggie_bye": {
        "speaker": "Regular Reggie",
        "text": "Tell Betty the ice is fine. She worries about the ice.",
    },
    # ── Skyfall Lounge ────────────────────────────────────────────────────
    "sommelier_sy_greet": {
        "speaker": "Sommelier Sy",
        "text": "Sixty-fourth floor. The list is long, the pours are honest, and the view does most of the selling.",
        "choices": [
            {"label": "Pour me something.", "encounter": "bar"},
            {"label": "What's the view worth?", "next": "sommelier_sy_view"},
            {"label": "Just looking out.", "next": "sommelier_sy_bye"},
        ],
    },
    "sommelier_sy_view": {
        "speaker": "Sommelier Sy",
        "text": "About eleven dollars a glass, priced in. From up here the Strip looks like a circuit board somebody left plugged in.",
        "next": "sommelier_sy_bye",
    },
    "sommelier_sy_bye": {
        "speaker": "Sommelier Sy",
        "text": "Last call is a suggestion we make politely and repeatedly.",
    },
    # ── Hotel tower ───────────────────────────────────────────────────────
    "concierge_cleo_greet": {
        "speaker": "Concierge Cleo",
        "text": "Concierge. Reservations, directions, and the occasional impossible request I quietly enjoy.",
        "choices": [
            {"label": "Who else is staying here?", "encounter": "guest_directory"},
            {"label": "Why does the elevator skip a floor?", "next": "concierge_cleo_floor"},
            {"label": "Nothing right now.", "next": "concierge_cleo_bye"},
        ],
    },
    "concierge_cleo_floor": {
        "speaker": "Concierge Cleo",
        "text": "Officially there's no button because there's no floor. Unofficially, press where the button isn't and hold. The tower hums back. I've never explained it and I'm not starting now.",
        "setFlag": "egg_phantom_floor",
        "next": "concierge_cleo_bye",
    },
    "concierge_cleo_bye": {
        "speaker": "Concierge Cleo",
        "text": "Dial 0 from the room. Someone answers. Usually me.",
    },
    # ── Gentleman's Club ──────────────────────────────────────────────────
    "club_hostess_viva_greet": {
        "speaker": "Viva",
        "text": "Velvet Ledger. Membership is a vibe, not a card. Gold tier, suite key, or the phone line — pick your door.",
        "choices": [
            {"label": "Open the club ledger.", "encounter": "gentlemans_club"},
            {"label": "Where do I make it rain?", "next": "club_hostess_viva_rain"},
            {"label": "Just looking.", "next": "club_hostess_viva_bye"},
        ],
    },
    "club_hostess_viva_rain": {
        "speaker": "Viva",
        "text": "Tip cascade is center stage. Monsoon if you're feeling dramatic. The room tips back when it likes you.",
        "choices": [
            {"label": "Who still owes on Row F?", "next": "club_hostess_viva_list"},
            {"label": "Thanks.", "next": "club_hostess_viva_bye"},
        ],
    },
    "club_hostess_viva_list": {
        "speaker": "Viva",
        "text": "Row F coupe guy is still unpaid. Don't be him. You're on the whisper list now.",
        "setFlag": "egg_velvet_guest_list",
        "next": "club_hostess_viva_bye",
    },
    "club_hostess_viva_bye": {
        "speaker": "Viva",
        "text": "No photographs. The LED wall remembers faces anyway. Hit a perfect cascade and it flashes initials.",
        "choices": [
            {"label": "I'll aim for perfect.", "next": "club_hostess_viva_cascade"},
            {"label": "Understood.", "next": "club_hostess_viva_done"},
        ],
    },
    "club_hostess_viva_cascade": {
        "speaker": "Viva",
        "text": "Dead center of the green. The wall already practiced your initials.",
        "setFlag": "egg_perfect_cascade",
        "next": "club_hostess_viva_done",
    },
    "club_hostess_viva_done": {
        "speaker": "Viva",
        "text": "Go make weather.",
    },
    "club_bottle_blair_greet": {
        "speaker": "Blair",
        "text": "Bottle captain. Dom, Cristal, Ace, Paradis, Macallan — I can pour them in any order. Can you?",
        "choices": [
            {"label": "Show me the club menu.", "encounter": "gentlemans_club"},
            {"label": "What's off-menu?", "next": "club_bottle_blair_off"},
            {"label": "Triple Ace — prove it.", "next": "club_bottle_blair_ace"},
            {"label": "Maybe later.", "next": "club_bottle_blair_bye"},
        ],
    },
    "club_bottle_blair_off": {
        "speaker": "Blair",
        "text": "If you have to ask, you tip first. Tonight I'll underline it anyway — off-menu pour, five stars, zero paperwork.",
        "setFlag": "egg_off_menu_pour",
        "next": "club_bottle_blair_bye",
    },
    "club_bottle_blair_ace": {
        "speaker": "Blair",
        "text": "Ace. Ace. Ace. I almost smiled. Almost.",
        "setFlag": "egg_triple_ace",
        "next": "club_bottle_blair_bye",
    },
    "club_bottle_blair_bye": {
        "speaker": "Blair",
        "text": "Sparklers are optional. Louis XIII is not subtle. Five pours and the tab grows a crown.",
        "choices": [
            {"label": "About Louis…", "next": "club_bottle_blair_louis"},
            {"label": "About the tab…", "next": "club_bottle_blair_tab"},
            {"label": "Later.", "next": "club_bottle_blair_done"},
        ],
    },
    "club_bottle_blair_louis": {
        "speaker": "Blair",
        "text": "Louis XIII — the wink is complimentary. The bottle is not.",
        "setFlag": "egg_louis_toast",
        "next": "club_bottle_blair_done",
    },
    "club_bottle_blair_tab": {
        "speaker": "Blair",
        "text": "Five deep and the ledger doodles a crown next to your name.",
        "setFlag": "egg_velvet_bar_tab",
        "next": "club_bottle_blair_done",
    },
    "club_bottle_blair_done": {
        "speaker": "Blair",
        "text": "Ice bucket's waiting.",
    },
    "club_security_sasha_greet": {
        "speaker": "Sasha",
        "text": "Rope stays up for phones. Rope comes down for members who make it rain.",
        "choices": [
            {"label": "I'm on the list.", "encounter": "gentlemans_club"},
            {"label": "Back hallway?", "next": "club_security_sasha_hall"},
            {"label": "Monsoon receipt?", "next": "club_security_sasha_monsoon"},
            {"label": "Understood.", "next": "club_security_sasha_bye"},
        ],
    },
    "club_security_sasha_hall": {
        "speaker": "Sasha",
        "text": "Service corridor. Unclaimed coats. One gold umbrella nobody claims.",
        "setFlag": "egg_velvet_back_hall",
        "next": "club_security_sasha_bye",
    },
    "club_security_sasha_monsoon": {
        "speaker": "Sasha",
        "text": "Black napkin. Stamped PAID IN WEATHER. Don't lose it.",
        "setFlag": "egg_monsoon_receipt",
        "next": "club_security_sasha_bye",
    },
    "club_security_sasha_bye": {
        "speaker": "Sasha",
        "text": "Keep the camera down. Keep the night up. Tip enough and the ledger underlines you twice.",
        "choices": [
            {"label": "Show me the underline.", "next": "club_security_sasha_ledger"},
            {"label": "Dante's ace?", "next": "club_security_sasha_felt"},
            {"label": "Copy.", "next": "club_security_sasha_done"},
        ],
    },
    "club_security_sasha_ledger": {
        "speaker": "Sasha",
        "text": "Your name. Twice. The Velvet Ledger doesn't do that for tourists.",
        "setFlag": "egg_velvet_ledger",
        "next": "club_security_sasha_done",
    },
    "club_security_sasha_felt": {
        "speaker": "Sasha",
        "text": "Dante flips an ace when he likes your call. Chin tip included.",
        "setFlag": "egg_felt_ace",
        "next": "club_security_sasha_done",
    },
    "club_security_sasha_done": {
        "speaker": "Sasha",
        "text": "Move along, member.",
    },
    "club_security_sasha_challenge": {
        "speaker": "Sasha",
        "text": "Hey — phones face-down. The Velvet Ledger doesn't do encore selfies.",
        "reputation": {"staff": 1},
        "next": "club_security_sasha_greet",
    },
    # ── Guest corridor ────────────────────────────────────────────────────
    "housekeeper_hana_greet": {
        "speaker": "Housekeeper Hana",
        "text": "Twenty-fourth floor, east side. I know which rooms slept and which ones just paid.",
        "choices": [
            {"label": "Any rooms with a story?", "next": "housekeeper_hana_stories"},
            {"label": "What's the Delano wing like?", "next": "housekeeper_hana_delano"},
            {"label": "Sorry — I'll get out of your way.", "next": "housekeeper_hana_bye"},
        ],
    },
    "housekeeper_hana_stories": {
        "speaker": "Housekeeper Hana",
        "text": "Every room has one, and you only get yours by staying in it. Turn the TV on, open the minibar, answer the phone. The suite will tell you the rest.",
        "setFlag": "hint_room_vignettes",
        "next": "housekeeper_hana_bye",
    },
    "housekeeper_hana_delano": {
        "speaker": "Housekeeper Hana",
        "text": "Quieter. Cleaner. The carpet pattern over there never repeats, and I've walked it more than anyone alive. Go look, then tell me I'm wrong.",
        "setFlag": "hint_delano_ghost",
        "next": "housekeeper_hana_bye",
    },
    "housekeeper_hana_bye": {
        "speaker": "Housekeeper Hana",
        "text": "Hanger goes on the outside handle. Inside means nothing to anybody.",
    },
    "housekeeper_hana_challenge": {
        "speaker": "Housekeeper Hana",
        "text": "You've walked this corridor three times without opening a door. Either you're lost or you're looking for something. Both are my business up here.",
        "reputation": {"staff": 1},
        "next": "housekeeper_hana_greet",
    },
    # ── Guest room ────────────────────────────────────────────────────────
    "room_console_greet": {
        "speaker": "Room Console",
        "text": "Drapes, lights, temperature, TV, and a phone that reaches the whole property. The room does more than you do.",
        "choices": [
            {"label": "Use the room.", "encounter": "hotel_room"},
            {"label": "Try the odd button sequence.", "next": "room_console_konami"},
            {"label": "Leave it alone.", "next": "room_console_bye"},
        ],
    },
    "room_console_konami": {
        "speaker": "Room Console",
        "text": "Up, up, down, down… the drapes open on a view that isn't outside your window, hold for a beat, and close. The console reports no fault.",
        "setFlag": "konami_mode",
        "next": "room_console_bye",
    },
    "room_console_bye": {
        "speaker": "Room Console",
        "text": "Standby. The room waits better than you do.",
    },
    "minibar_greet": {
        "speaker": "Minibar",
        "text": "Sensors under every bottle. Lift one and think better of it — too late, it's already on the folio.",
        "choices": [
            {"label": "Open it anyway.", "encounter": "hotel_dining"},
            {"label": "Read the price card.", "next": "minibar_prices"},
            {"label": "Close the door.", "next": "minibar_bye"},
        ],
    },
    "minibar_prices": {
        "speaker": "Minibar",
        "text": "Water: more than the flight here. Nuts: the price of a paperback. Somebody laminated this and felt fine.",
        "next": "minibar_bye",
    },
    "minibar_bye": {
        "speaker": "Minibar",
        "text": "The door closes with a click that sounds like a receipt.",
    },
    # ── Delano wing ───────────────────────────────────────────────────────
    "delano_dana_greet": {
        "speaker": "Delano Dana",
        "text": "All-suite tower. No casino noise, no bell sounds, no reason to hurry. Guests come here when the other side stops being fun.",
        "choices": [
            {"label": "Look at the carpet.", "next": "delano_dana_ghost"},
            {"label": "Why so quiet?", "next": "delano_dana_quiet"},
            {"label": "Nice up here.", "next": "delano_dana_bye"},
        ],
    },
    "delano_dana_ghost": {
        "speaker": "Delano Dana",
        "text": "You noticed. Follow the pattern with your eyes and it never comes back around. The installers swore it tiles. It does not tile.",
        "setFlag": "egg_delano_ghost",
        "next": "delano_dana_bye",
    },
    "delano_dana_quiet": {
        "speaker": "Delano Dana",
        "text": "Separate entrance, separate air, separate everything. Some guests never once see a slot machine. I envy them and I don't understand them.",
        "next": "delano_dana_bye",
    },
    "delano_dana_bye": {
        "speaker": "Delano Dana",
        "text": "Take the connector back when you're ready. It's the only loud thing over here.",
    },
    # ── Spa ───────────────────────────────────────────────────────────────
    "spa_attendant_ash_greet": {
        "speaker": "Attendant Ash",
        "text": "Bathhouse. Steam, cold plunge, quiet room. The quiet room has a two-drink history and a one-nap future.",
        "choices": [
            {"label": "Who comes here?", "next": "spa_attendant_ash_guests"},
            {"label": "Does it help?", "next": "spa_attendant_ash_help"},
            {"label": "Maybe later.", "next": "spa_attendant_ash_bye"},
        ],
    },
    "spa_attendant_ash_guests": {
        "speaker": "Attendant Ash",
        "text": "Winners at ten in the morning. Losers at four in the afternoon. Both of them fall asleep in the same chair.",
        "next": "spa_attendant_ash_bye",
    },
    "spa_attendant_ash_help": {
        "speaker": "Attendant Ash",
        "text": "The steam helps. The plunge helps more. Nothing here fixes a bad run at the tables, but it does make you slower about starting the next one.",
        "setFlag": "visited_spa",
        "next": "spa_attendant_ash_bye",
    },
    "spa_attendant_ash_bye": {
        "speaker": "Attendant Ash",
        "text": "Robes are on the hook. Take a cold one on the way out.",
    },
    # ── Mandalay Beach ────────────────────────────────────────────────────
    # Lou predates Phase 4; re-authored here so the pool complex hub and the
    # day's event board have overworld doors instead of only deep links.
    "lifeguard_lou_greet": {
        "speaker": "Lifeguard Lou",
        "text": "Eleven acres of chlorinated ambition. Wave pool's center stage — timing matters.",
        "choices": [
            {"label": "Play wave / ring toss", "encounter": "pool_wave",
             "setFlag": "pool_wave_pool"},
            {"label": "Walk me through the whole complex.", "encounter": "pool"},
            {"label": "What's on today?", "encounter": "pool_events"},
            {"label": "What happens out on the acres?", "next": "lifeguard_lou_quest",
             "unlessFlag": "quest_pool_vignettes_started",
             "setFlag": "quest_pool_vignettes_started"},
            {"label": "How am I doing on that thing?", "next": "lifeguard_lou_quest_done",
             "requiresFlag": "quest_pool_vignettes_started"},
            {"label": "Thanks", "next": "lifeguard_lou_bye"},
        ],
    },
    "shark_reef_guide_greet": {
        "speaker": "Reef Guide",
        "text": "Sand tiger sharks circle the acrylic and a hammerhead runs the far loop. Tunnel's through the doors — photograph five species and the desk stops calling you a tourist.",
        "setFlag": "pool_shark_reef",
        "choices": [
            {"label": "How do the photos work?", "next": "shark_reef_guide_photos"},
            {"label": "Which one is hardest to catch?", "next": "shark_reef_guide_hard"},
            {"label": "Thanks", "next": "shark_reef_guide_bye"},
        ],
    },
    "shark_reef_guide_photos": {
        "speaker": "Reef Guide",
        "text": "Kiosk in the tunnel does the work. One species per shot, and the dex in your menu keeps score so you don't photograph the same nurse shark six times. People do.",
        "next": "shark_reef_guide_bye",
    },
    "shark_reef_guide_hard": {
        "speaker": "Reef Guide",
        "text": "Golden crocodile. Two of them, both beige, both convinced they're furniture. Half the guests walk past and photograph a rock.",
        "next": "shark_reef_guide_bye",
    },
    "shark_reef_guide_bye": {
        "speaker": "Reef Guide",
        "text": "Doors are that way. Don't tap the glass — they remember.",
    },
    # ── Cabana row ────────────────────────────────────────────────────────
    "cabana_curtis_greet": {
        "speaker": "Cabana Curtis",
        "text": "Cabana row. Shade, a fridge, a TV nobody watches, and a bottle list that starts optimistic and ends expensive.",
        "choices": [
            {"label": "Book a cabana.", "encounter": "pool_cabanas"},
            {"label": "Worth the money?", "next": "cabana_curtis_worth"},
            {"label": "I'll take a lounger.", "next": "cabana_curtis_bye"},
        ],
    },
    "cabana_curtis_worth": {
        "speaker": "Cabana Curtis",
        "text": "Worth it if you're staying six hours. Not worth it if you're staying two. Everyone tells me two and stays six.",
        "next": "cabana_curtis_bye",
    },
    "cabana_curtis_bye": {
        "speaker": "Cabana Curtis",
        "text": "Hal's in the hot tub if you want conversation you can't escape.",
    },
    "hot_tub_hal_greet": {
        "speaker": "Hot Tub Hal",
        "text": "Ninety-nine degrees, all day, every day. I have been in this water long enough to have opinions about the filter.",
        "choices": [
            {"label": "Get in.", "encounter": "pool_hot_tubs"},
            {"label": "How long have you been here?", "next": "hot_tub_hal_long"},
            {"label": "Too hot for me.", "next": "hot_tub_hal_bye"},
        ],
    },
    "hot_tub_hal_long": {
        "speaker": "Hot Tub Hal",
        "text": "Checked in Thursday. It's Thursday somewhere. I've eaten two meals in this tub and both of them were nachos.",
        "next": "hot_tub_hal_bye",
    },
    "hot_tub_hal_bye": {
        "speaker": "Hot Tub Hal",
        "text": "Wave pool's north if you want weather with your water.",
    },
    # ── Rave stage ────────────────────────────────────────────────────────
    "rave_dj_greet": {
        "speaker": "Moonlight DJ",
        "text": "Moonlight set. Sand's still warm, the wave machine's on a timer, and nobody out here knows what day it is.",
        "choices": [
            {"label": "Get on the sand.", "encounter": "pool_rave"},
            {"label": "What's the timer?", "next": "rave_dj_timer"},
            {"label": "Just listening.", "next": "rave_dj_bye"},
        ],
    },
    "rave_dj_timer": {
        "speaker": "Moonlight DJ",
        "text": "Waves every four minutes. I drop on the third. Everybody thinks it's luck — it's a maintenance schedule with a beat over it.",
        "setFlag": "hint_wave_timing",
        "next": "rave_dj_bye",
    },
    "rave_dj_bye": {
        "speaker": "Moonlight DJ",
        "text": "Set goes till the lifeguards get tired. They never get tired.",
    },
    "rave_dj_challenge": {
        "speaker": "Moonlight DJ",
        "text": "You've been standing in the same spot nodding on the two and the four. That's not nothing. Get on the sand.",
        "reputation": {"tourists": 1},
        "encounter": "pool_rave",
    },
    # ── Shark Reef ────────────────────────────────────────────────────────
    "reef_dj_greet": {
        "speaker": "Reef DJ",
        "text": "Yes, there's a DJ at the aquarium. No, the sharks don't mind — I've asked, at length, out loud, to a shark.",
        "choices": [
            {"label": "What do you play?", "next": "reef_dj_set"},
            {"label": "Do the fish react?", "next": "reef_dj_fish"},
            {"label": "Only in Vegas.", "next": "reef_dj_bye"},
        ],
    },
    "reef_dj_set": {
        "speaker": "Reef DJ",
        "text": "Ambient until nine, then whatever keeps a family of four from noticing they've been in a tunnel for forty minutes.",
        "next": "reef_dj_bye",
    },
    "reef_dj_fish": {
        "speaker": "Reef DJ",
        "text": "The sand tiger swims a lap on every bass drop. Coincidence, says the biologist. She's said it four hundred times and she's stopped sounding sure.",
        "setFlag": "hint_reef_glass",
        "next": "reef_dj_bye",
    },
    "reef_dj_bye": {
        "speaker": "Reef DJ",
        "text": "Tunnel's that way. Mind the glass. Everyone taps the glass.",
    },
    # ── House of Blues ────────────────────────────────────────────────────
    "hob_bouncer_greet": {
        "speaker": "HOB Bouncer",
        "text": "Stage door. List only, and the list is short tonight because the headliner is in a mood.",
        "choices": [
            {"label": "What's on the rider?", "next": "hob_bouncer_list"},
            {"label": "Who's playing?", "next": "hob_bouncer_who"},
            {"label": "I'll watch from the floor.", "next": "hob_bouncer_bye"},
        ],
    },
    "hob_bouncer_list": {
        "speaker": "HOB Bouncer",
        "text": "One bowl of M&Ms. Green only. It's in the contract, it's been honored every night for nine years, and nobody has ever eaten one.",
        "setFlag": "egg_green_room",
        "next": "hob_bouncer_bye",
    },
    "hob_bouncer_who": {
        "speaker": "HOB Bouncer",
        "text": "Somebody big enough to fill the room and small enough to still take the stage door. That's the sweet spot and it doesn't last.",
        "next": "hob_bouncer_bye",
    },
    "hob_bouncer_bye": {
        "speaker": "HOB Bouncer",
        "text": "Doors in twenty. Bar's open now, which is the real answer.",
    },
    "hob_headliner_greet": {
        "speaker": "The Headliner",
        "text": "You got past Marcus? Nobody gets past Marcus. Sit down, don't take a picture, and I'll tell you the room's a good one.",
        "choices": [
            {"label": "How's the crowd tonight?", "next": "hob_headliner_crowd"},
            {"label": "Nine years of green M&Ms?", "next": "hob_headliner_mms"},
            {"label": "Break a leg.", "next": "hob_headliner_bye"},
        ],
    },
    "hob_headliner_crowd": {
        "speaker": "The Headliner",
        "text": "Casino crowds are honest. They've already lost money, so nobody's pretending. Best listeners on the circuit.",
        "next": "hob_headliner_bye",
    },
    "hob_headliner_mms": {
        "speaker": "The Headliner",
        "text": "That clause has been in the rider since before I could fill a bar. It's not a demand anymore, it's a check — if the bowl's right, the load-in was right.",
        "setFlag": "egg_green_room",
        "next": "hob_headliner_bye",
    },
    "hob_headliner_bye": {
        "speaker": "The Headliner",
        "text": "Go find a spot by the rail. It's the only place the mix is honest.",
    },
    # ── ULTRA Arena ───────────────────────────────────────────────────────
    "merch_marge_greet": {
        "speaker": "Merch Marge",
        "text": "Shirts, hats, one poster nobody buys until the encore. I've sold merch at this arena for every sport that has a ball and several that don't.",
        "choices": [
            {"label": "Show me the table.", "encounter": "shops"},
            {"label": "What sells best?", "next": "merch_marge_best"},
            {"label": "Just passing through.", "next": "merch_marge_bye"},
        ],
    },
    "merch_marge_best": {
        "speaker": "Merch Marge",
        "text": "Whatever the winner is wearing, ninety seconds after they win. I've learned to keep both boxes open and pick one fast.",
        "next": "merch_marge_bye",
    },
    "merch_marge_bye": {
        "speaker": "Merch Marge",
        "text": "Concourse loops all the way around. So does everything here, eventually.",
    },
    # ── Staff corridor ────────────────────────────────────────────────────
    "count_room_cal_greet": {
        "speaker": "Count Room Cal",
        "text": "You are absolutely not supposed to be back here, and I am absolutely not supposed to care. Cal. I count the money.",
        "choices": [
            {"label": "Show me the bank.", "encounter": "bank"},
            {"label": "How much comes through?", "next": "count_room_cal_much"},
            {"label": "I was never here.", "next": "count_room_cal_bye"},
        ],
    },
    "count_room_cal_much": {
        "speaker": "Count Room Cal",
        "text": "Enough that the number stopped meaning anything to me by year two. It's weight now. I know a good night by how my back feels.",
        "setFlag": "met_count_room_cal",
        "next": "count_room_cal_bye",
    },
    "count_room_cal_bye": {
        "speaker": "Count Room Cal",
        "text": "Door at the end goes back to the floor. Walk like you belong and nobody checks.",
    },
}


def main() -> None:
    dialogues = json.loads(TARGET.read_text())
    dialogues.update(NODES)
    TARGET.write_text(json.dumps(dialogues, indent=2, ensure_ascii=False) + "\n")
    print(f"dialogues.json: {len(dialogues)} nodes ({len(NODES)} authored here)")


if __name__ == "__main__":
    main()
