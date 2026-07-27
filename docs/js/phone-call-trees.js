/**
 * Multi-turn voice call trees for MGM Connect.
 * Same node shape as SMS DIALOGUE_TREES: { text, choices?, end? }.
 */

/** @typedef {{ label: string|Function, next?: string, rapport?: number, egg?: string, requires?: object, effect?: object, end?: boolean }} CallChoice */
/** @typedef {{ text: string|Function, choices?: CallChoice[], end?: boolean }} CallNode */

/**
 * Call trees keyed by contact → treeId → nodeId → node.
 * Entry node is always `hello` under treeId `voice`.
 * @type {Record<string, Record<string, Record<string, CallNode>>>}
 */
export const CALL_TREES = {
  attorney_brief: {
    voice: {
      hello: {
        text: (ctx) => ctx.playHours >= 4
          ? `Harvey Brief. ${ctx.playHours}h on property — billing in metaphors. Speak.`
          : "Harvey Brief, Esq. Billable minute starting… now. What's the crisis?",
        choices: [
          { label: "The casino took my chips", next: "chips", rapport: 2 },
          { label: "Objection!", next: "objection", rapport: 3, egg: "call_objection" },
          { label: "Courtroom mode?", next: "courtroom", rapport: 3, egg: "call_courtroom" },
          { label: "Retainer?", next: "retainer", rapport: 2, egg: "call_retainer" },
          { label: "Just checking in", next: "checkin", rapport: 2, requires: { minRapport: 25 } },
        ],
      },
      chips: {
        text: (ctx) => ctx.isDownBad
          ? "Voluntary transfer PLUS emotional distress. Have you tried Betty's bar or winning with dignity?"
          : "Classic voluntary transfer defense. Dignity is admissible. Winning is optional.",
        choices: [
          { label: "Can I sue?", next: "sue", rapport: 2 },
          { label: "I'll take dignity", next: "wrap_dignity", rapport: 2 },
          { label: "Send me to Betty", next: "betty_referral", rapport: 3, effect: { drink: "welcome_cocktail" } },
        ],
      },
      sue: {
        text: "You can sue anyone. Winning is another matter. Also: guest directory waives vibes.",
        choices: [
          { label: "Understood, counsel", next: "wrap", rapport: 1, end: true },
          { label: "File a motion anyway", next: "motion", rapport: 3, requires: { minRapport: 20 } },
        ],
      },
      motion: {
        text: "Motion to restore dignity — stamped emotionally, denied legally. Hang up before I bill again.",
        end: true,
      },
      betty_referral: {
        text: "Sidebar settlement: one pour, zero discovery. Case recessed at Betty's.",
        end: true,
      },
      wrap_dignity: {
        text: "Dignity filed. Court adjourned. Try not to need me before midnight.",
        end: true,
      },
      objection: {
        text: "SUSTAINED. The house looks guilty. Legally meaningless. Emotionally perfect. Anything else?",
        choices: [
          { label: "Cross-examine the dealer", next: "cross", rapport: 3, requires: { minRapport: 15 } },
          { label: "That was enough", next: "wrap", rapport: 1, end: true },
        ],
      },
      cross: {
        text: "Hypothetical dealer on the stand. Eyes suggest guilt. Jury of one (me) finds the HOUSE aesthetically responsible.",
        choices: [
          { label: "Rest my case", next: "wrap", rapport: 2, end: true },
          { label: "Demand comps", next: "comp_motion", rapport: 3, effect: { buffetCredit: 1 }, requires: { minTierIdx: 2 } },
        ],
      },
      comp_motion: {
        text: "Motion to comp one (1) buffet dignity course — granted pending narrative approval.",
        end: true,
      },
      courtroom: {
        text: "Court convened telephonically. Text COURTROOM when we hang up — docket continues in SMS.",
        choices: [
          { label: "I'll text you", next: "wrap", rapport: 2, end: true },
          { label: "Opening statement now", next: "opening", rapport: 4, requires: { minRapport: 25 } },
        ],
      },
      opening: {
        text: (ctx) => `Ladies of the pit, my client ${ctx.playerName} wagered in good faith. The house edge is not a personality.`,
        choices: [
          { label: "Closing argument", next: "closing", rapport: 3 },
          { label: "Hang up mid-speech", next: "wrap", rapport: 1, end: true },
        ],
      },
      closing: {
        text: "If the math is not kind, let the comps be generous. I rest — billable hours continue off-line.",
        end: true,
      },
      retainer: {
        text: (ctx) => `Retainer: 500 chips or one buffet. ${ctx.tier.label} gets 10% off theater. Paying now?`,
        choices: [
          { label: "Pay 500 chips", next: "paid", rapport: 2, effect: { chips: -500, chipReason: "Harvey Brief call retainer" } },
          { label: "Maybe later", next: "wrap", rapport: 1, end: true },
        ],
      },
      paid: {
        text: "Retainer received. You may now object at will. Emotionally. Not legally.",
        end: true,
      },
      checkin: {
        text: (ctx) => `Rapport ${ctx.rapport}/100. You're past stranger status — I object louder for friends.`,
        choices: [
          { label: "Appreciate you", next: "wrap", rapport: 3, end: true },
          { label: "Any insider counsel?", next: "insider", rapport: 4, requires: { band: "insider" } },
        ],
      },
      insider: {
        text: "Insider tip: hydrate, tip discreetly, never ask Steve for math. Court adjourned.",
        end: true,
      },
      wrap: {
        text: "Call ended. Remember: this is legal theatre. Actual lawyers bill more and joke less.",
        end: true,
      },
    },
  },

  steve_harvey: {
    voice: {
      hello: {
        text: "Steve Harvey on the line! Survey says… you called ME for once. Talk to me!",
        choices: [
          { label: "Any Feud stories?", next: "feud", rapport: 2, egg: "call_feud" },
          { label: "Horse racing tips?", next: "horse", rapport: 2, egg: "call_horse" },
          { label: "Pep talk", next: "pep", rapport: 3 },
          { label: "Chairman pep talk", next: "chairman", rapport: 4, requires: { minTierIdx: 5 } },
          { label: "Just saying hi", next: "hi", rapport: 2, requires: { minRapport: 20 } },
        ],
      },
      feud: {
        text: "Once a contestant guessed 'Steve Harvey' for every answer. Survey said… correct. You got a follow-up?",
        choices: [
          { label: "Play a round with me", next: "round", rapport: 3 },
          { label: "That's enough comedy", next: "wrap", rapport: 1, end: true },
        ],
      },
      round: {
        text: "Name something you lose in Vegas. Top answer: CHIPS. Number two: DIGNITY. Number three: TINA.",
        choices: [
          { label: "I said chips!", next: "correct", rapport: 3 },
          { label: "I said Tina", next: "tina", rapport: 4, egg: "steve_call_tina" },
        ],
      },
      correct: {
        text: "DING! You win… my respect. Go win something with chips next.",
        end: true,
      },
      tina: {
        text: "Survey says… ALSO correct! She's always lost. Hang up and go find her — or don't.",
        end: true,
      },
      horse: {
        text: "Royal Flush in the stretch! Wrong sport, great energy. Place metaphorical bets only.",
        choices: [
          { label: "Got it", next: "wrap", rapport: 1, end: true },
          { label: "Give me a number", next: "number", rapport: 2 },
        ],
      },
      number: {
        text: "Survey says… four. Or seventeen. Or don't listen to game show hosts for math!",
        end: true,
      },
      pep: {
        text: "Survey says… you're built different. Act like it at the table. Don't make me come down there.",
        choices: [
          { label: "Thanks, Steve", next: "wrap", rapport: 2, end: true },
          { label: "I'm tilting", next: "tilt", rapport: 3, requires: { minRapport: 15 } },
        ],
      },
      tilt: {
        text: "Tilt is just passion without a commercial break. Sit down. Breathe. Bet smaller.",
        end: true,
      },
      chairman: {
        text: "Survey says… CHAIRMAN! You made it. I knew you when you were Sapphire. Don't forget me!",
        end: true,
      },
      hi: {
        text: (ctx) => ctx.band.id === "regular" || ctx.band.id === "insider" || ctx.band.id === "confidant"
          ? "Regular! I remember regulars. Survey says… loyalty pays in charisma."
          : "Hey hey! Keep climbing — Feud reruns don't pay rent.",
        end: true,
      },
      wrap: {
        text: "Survey says… hang up and go win something!",
        end: true,
      },
    },
  },

  host_representative: {
    voice: {
      hello: {
        text: (ctx) => `Alexandra Vale, MGM Host. ${ctx.tier.label} privileges are… loaded. What do you need?`,
        choices: [
          { label: "Room upgrade?", next: "upgrade", rapport: 2, effect: { upgradeRoom: "suite" } },
          { label: "I'm upset", next: "upset", rapport: 2, egg: "host_upset" },
          { label: "Secret Chairman perk?", next: "secret", rapport: 4, egg: "chairman_secret", requires: { minTierIdx: 4 } },
          { label: "Compliment staff", next: "compliment", rapport: 5 },
          { label: "Long session check", next: "wellness", rapport: 3, requires: { minPlayHours: 3 } },
        ],
      },
      upgrade: {
        text: "I've queued the upgrade with Carmen's desk — check Room on your phone if the keys shifted.",
        choices: [
          { label: "Thank you", next: "wrap", rapport: 2, end: true },
          { label: "Anything else I should know?", next: "tips", rapport: 3, requires: { minRapport: 20 } },
        ],
      },
      tips: {
        text: "Hydrate. Tip with intention. Text COMPAINT — one P — if the narrative slips.",
        end: true,
      },
      upset: {
        text: "I'm so sorry — on a scale of 1 to Steve Harvey, how loud was the incident?",
        choices: [
          { label: "Steve Harvey loud", next: "loud", rapport: 3, effect: { chips: 25, chipReason: "Host apology marker" } },
          { label: "Quietly devastated", next: "quiet", rapport: 2, effect: { chips: 15, chipReason: "Host soft apology" } },
        ],
      },
      loud: {
        text: "Noted at maximum volume. Apology marker sent. Please don't yell at Carmen — she has elevators to fight.",
        end: true,
      },
      quiet: {
        text: "Soft devastation received. Marker queued. You're still my favorite platinum problem.",
        end: true,
      },
      secret: {
        text: "…You didn't hear this from me. Text WHALE on my line after midnight. (It's still a metaphor.) Marker incoming.",
        choices: [
          { label: "Our secret", next: "secret_done", rapport: 4, effect: { chips: 100, chipReason: "Chairman whisper perk" } },
        ],
      },
      secret_done: {
        text: "Whisper perk applied. I escalate with noir-filtered gravitas now. Goodbye.",
        end: true,
      },
      compliment: {
        text: "I'll note that in your file. Genuine praise is rarer than a royal flush. Anything else?",
        choices: [
          { label: "That's all", next: "wrap", rapport: 2, end: true },
          { label: "Escalate a tiny thing", next: "escalate", rapport: 3 },
        ],
      },
      escalate: {
        text: "Escalating to 'smiling harder.' Suite vibes pending narrative approval. Call complete.",
        end: true,
      },
      wellness: {
        text: (ctx) => `You've been here ${ctx.playHours}h — narrative wellness check: hydrate, stretch, compliment Carmen.`,
        end: true,
      },
      wrap: {
        text: "Host line clear. Text me if the velvet rope misbehaves.",
        end: true,
      },
    },
  },

  chip_chandler: {
    voice: {
      hello: {
        text: (ctx) => ctx.band.id === "insider"
          ? "Chip here — insider line. Pits are talking. What's the ask?"
          : "Chip here. You rang the floor hotline. Talk fast.",
        choices: [
          { label: "Best table?", next: "best", rapport: 2 },
          { label: "Insider table?", next: "insider", rapport: 4, egg: "chip_insider_call", requires: { band: "insider" } },
          { label: "Who's on pit?", next: "pit", rapport: 2 },
          { label: "Thanks / just checking", next: "thanks", rapport: 1 },
          { label: "Long session advice", next: "long", rapport: 3, requires: { minPlayHours: 2 } },
        ],
      },
      best: {
        text: "Wherever your bankroll feels brave. Or stupid. Same thing after midnight. Follow-up?",
        choices: [
          { label: "Blackjack?", next: "bj", rapport: 2 },
          { label: "Roulette?", next: "roulette", rapport: 2 },
          { label: "I'll wander", next: "wrap", rapport: 1, end: true },
        ],
      },
      bj: {
        text: "Meryl's dramatic, Jennifer's surgical, Octavia's sweet. Pick your trauma aesthetic.",
        end: true,
      },
      roulette: {
        text: "Sofia's loud, Nicole's precise, Steve's… Steve. Volume optional. Math is not.",
        end: true,
      },
      insider: {
        text: "High-limit after 2am. Bring chips or confidence. Preferably both. Tina's lost near there — dodge.",
        choices: [
          { label: "Copy that", next: "wrap", rapport: 2, end: true },
          { label: "Any other intel?", next: "more", rapport: 3, requires: { minRapport: 40 } },
        ],
      },
      more: {
        text: "Betty pours heavy for regulars. Pete's 'locks' are entertainment. I rotate — save this number.",
        end: true,
      },
      pit: {
        text: (ctx) => `Pits are alive. Roulette's hot, Hold'em's chatty, Tina's lost again.${ctx.playHours >= 2 ? " Long session crew tonight." : ""}`,
        choices: [
          { label: "Appreciate it", next: "wrap", rapport: 2, end: true },
          { label: "Where's Tina?", next: "tina", rapport: 2 },
        ],
      },
      tina: {
        text: "If I knew, she wouldn't be Tina. Gold carpet by the plants is the usual theory.",
        end: true,
      },
      thanks: {
        text: "Save my number. The house always has my number anyway. Floor out.",
        end: true,
      },
      long: {
        text: "Long session rule: bankroll first, ego second, Steve's survey never. Hydrate.",
        end: true,
      },
      wrap: {
        text: "Chip out. Don't do anything I wouldn't narrate.",
        end: true,
      },
    },
  },

  barkeep_betty: {
    voice: {
      hello: {
        text: (ctx) => ctx.band.id === "regular" || ctx.band.id === "insider" || ctx.band.id === "confidant"
          ? "Betty's Bar — your usual judgmental glance is ready. Talk."
          : "Betty's Bar — talk fast, I'm pouring.",
        choices: [
          { label: "Strongest drink?", next: "strong", rapport: 2, egg: "betty_drink", effect: { drink: "welcome_cocktail" } },
          { label: "Gossip?", next: "gossip", rapport: 2 },
          { label: "Rough session", next: "rough", rapport: 3, requires: { minRapport: 10 }, effect: { drink: "welcome_cocktail" } },
          { label: "Comp status?", next: "comp", rapport: 2 },
          { label: "Off-menu?", next: "offmenu", rapport: 4, requires: { band: "insider" } },
        ],
      },
      strong: {
        text: "The 'Walk of Shame' — tastes like regret, looks like tourism. Pour logged. Anything else?",
        choices: [
          { label: "That's the one", next: "wrap", rapport: 1, end: true },
          { label: "Make it a double vibe", next: "double", rapport: 2, effect: { drink: "welcome_cocktail" } },
        ],
      },
      double: {
        text: "Don't make me cut you off with love. Hydrate between sins.",
        end: true,
      },
      gossip: {
        text: "Steve called a photo finish at slots. Meryl quoted Shakespeare at blackjack. Normal Tuesday.",
        choices: [
          { label: "More", next: "gossip2", rapport: 3, requires: { minRapport: 20 } },
          { label: "Wild", next: "wrap", rapport: 1, end: true },
        ],
      },
      gossip2: {
        text: "Tina saw a whale cry at penny slots. Pete called it 'character building.' I called it Tuesday.",
        end: true,
      },
      rough: {
        text: "Sympathy pour incoming. First one's on sympathy. Second's on denial. Third — love-cutoff.",
        end: true,
      },
      comp: {
        text: (ctx) => `${ctx.tier.label} tier — Sapphire gets sympathy, Gold gets gin, Chairman gets no questions. Pour?`,
        choices: [
          { label: "Yes please", next: "poured", rapport: 2, effect: { drink: "welcome_cocktail" } },
          { label: "Just checking", next: "wrap", rapport: 1, end: true },
        ],
      },
      poured: {
        text: "Poured. Don't text me from the bathroom floor. Call me like a civilized degenerate.",
        end: true,
      },
      offmenu: {
        text: "Off-menu: 'The Chairman's Regret' — top shelf, no ice, knowing look included. You're welcome.",
        end: true,
      },
      wrap: {
        text: "Bar line clear. Tip the universe. Or me. Preferably me.",
        end: true,
      },
    },
  },

  pete_bookie: {
    voice: {
      hello: {
        text: "Pete the Bookie. Speak fast — lines move when I breathe.",
        choices: [
          { label: "Lock of the day?", next: "lock", rapport: 2, egg: "pete_call_lock" },
          { label: "Fix my parlay", next: "parlay", rapport: 1, effect: { chips: 15, chipReason: "Pete parlay sympathy" } },
          { label: "Parlay therapy", next: "therapy", rapport: 3 },
          { label: "Insider line?", next: "insider", rapport: 4, requires: { band: "insider" } },
        ],
      },
      lock: {
        text: "Mandalay Bay remains upright. Heavy favorite. Bet the house metaphorically. Follow-up?",
        choices: [
          { label: "That's the lock", next: "wrap", rapport: 1, end: true },
          { label: "Real sports?", next: "sports", rapport: 2 },
        ],
      },
      sports: {
        text: "Everything I say is entertainment, not financial advice. Or good advice. Hang up wiser — or not.",
        end: true,
      },
      parlay: {
        text: "I can't fix prayer. Try fewer legs and more dignity. Sympathy marker sent for the attempt.",
        choices: [
          { label: "Fair", next: "wrap", rapport: 1, end: true },
          { label: "How many legs max?", next: "legs", rapport: 2 },
        ],
      },
      legs: {
        text: "Two if you're optimistic. Eight if you need therapy. Text PARLAY THERAPY after we hang up.",
        end: true,
      },
      therapy: {
        text: "Text PARLAY THERAPY when we hang up. Session continues on the record. I'm not a doctor.",
        end: true,
      },
      insider: {
        text: "Off-record: bet with your head, not Steve's survey board. Record resumes… now. Bye.",
        end: true,
      },
      wrap: {
        text: "Lines closed. Dignity optional. Pete out.",
        end: true,
      },
    },
  },

  tourist_tina: {
    voice: {
      hello: {
        text: (ctx) => ctx.band.id === "confidant"
          ? "Tina here!! Bestie!! I was literally about to text YOU!"
          : "Tina here!! I was literally about to text YOU! I'm lost again but emotionally available!",
        choices: [
          { label: "Where am I?", next: "where", rapport: 2, egg: "tina_call_lost" },
          { label: "Friend check", next: "friend", rapport: 3, requires: { minRapport: 20 } },
          { label: "Where's food?", next: "food", rapport: 2 },
          { label: "Help me find Chip", next: "chip", rapport: 2 },
        ],
      },
      where: {
        text: "Same!! Try the gold carpet by the plants. Or don't. Adventure! You still there?",
        choices: [
          { label: "Gold carpet it is", next: "wrap", rapport: 2, end: true },
          { label: "I'm more lost now", next: "more_lost", rapport: 3 },
        ],
      },
      more_lost: {
        text: "BESTIE same!! Text LOST after we hang up — I run a whole quest for this. We're professionals.",
        end: true,
      },
      friend: {
        text: "We're totally friends!! I saved you as 'Direction Person Maybe'! Don't ghost the maybe!",
        choices: [
          { label: "Never", next: "wrap_friend", rapport: 4 },
          { label: "Maybe", next: "wrap", rapport: 1, end: true },
        ],
      },
      wrap_friend: {
        text: "YAY!! Okay bye I'm going to find an elevator that agrees with me!",
        end: true,
      },
      food: {
        text: "Buffet maybe?? Steve says survey says the line moves if you look confident. Look confident!!",
        end: true,
      },
      chip: {
        text: "Chip is everywhere and nowhere. Like Wi-Fi. Or me. Try the pits — he narrates them.",
        end: true,
      },
      wrap: {
        text: "Byeeee!! Text me if you get lost!! Or if you don't!! Either way!!",
        end: true,
      },
    },
  },

  pavilion_paula: {
    voice: {
      hello: {
        text: "Paula at the paddock. The ponies are moody. I'm moodier. What?",
        choices: [
          { label: "Long shot?", next: "longshot", rapport: 2, egg: "paula_longshot" },
          { label: "Late card?", next: "card", rapport: 2 },
          { label: "Paddock mood?", next: "mood", rapport: 2 },
          { label: "Insider angle?", next: "insider", rapport: 4, requires: { minRapport: 30 } },
        ],
      },
      longshot: {
        text: "Gate 4 has 'attitude' — that's not a stat but it's a vibe. You buying vibes?",
        choices: [
          { label: "Buying vibes", next: "wrap", rapport: 2, end: true },
          { label: "Need a real tip", next: "real", rapport: 2 },
        ],
      },
      real: {
        text: "Watch the jockey silks, ignore my last three picks. Consistency is for accountants.",
        end: true,
      },
      card: {
        text: (ctx) => ctx.playHours >= 3
          ? "Night card superstition peaks at 2am. You're late enough for magic."
          : "Early card — optimism and bad math. Perfect.",
        end: true,
      },
      mood: {
        text: "Ponies tired, crowd superstitious, Paula caffeinated. Bet accordingly.",
        end: true,
      },
      insider: {
        text: "Insider: Gate 4 attitude plus Steve's volume equals entertainment, not ROI. You're welcome.",
        end: true,
      },
      wrap: {
        text: "Paddock out. Don't blame me when Gate 4 ghosts you.",
        end: true,
      },
    },
  },

  meryl_screech: {
    voice: {
      hello: {
        text: "Meryl Screech — method dealing. Curtain up. What's your scene?",
        choices: [
          { label: "Oscar tips?", next: "oscar", rapport: 2, egg: "meryl_call_oscar" },
          { label: "Shakespeare?", next: "shake", rapport: 3 },
          { label: "Drama level?", next: "drama", rapport: 2 },
          { label: "Method check-in", next: "method", rapport: 3, requires: { minRapport: 20 } },
        ],
      },
      oscar: {
        text: "Whisper to the ace. The pit hates it. The crowd loves it. Encore?",
        choices: [
          { label: "Encore", next: "encore", rapport: 3 },
          { label: "Exit stage", next: "wrap", rapport: 1, end: true },
        ],
      },
      encore: {
        text: "Standing ovation from the felt. Sit at my table when you're ready for Act II.",
        end: true,
      },
      shake: {
        text: "To hit, or not to hit — whether 'tis nobler to split eights… Exit pursued by a pit boss.",
        end: true,
      },
      drama: {
        text: (ctx) => ctx.playHours >= 3
          ? "Act III energy. Standing room at my table."
          : "Act I — establish character. Tip accordingly.",
        end: true,
      },
      method: {
        text: "You enter as protagonist. Try not to fold in Act I. The felt remembers.",
        end: true,
      },
      wrap: {
        text: "Curtain. Don't phone in your next hand.",
        end: true,
      },
    },
  },

  judi_bench: {
    voice: {
      hello: {
        text: "Judi Bench. Hold'em pit. Speak with British restraint.",
        choices: [
          { label: "River complaint", next: "river", rapport: 2 },
          { label: "Read my tell", next: "tell", rapport: 3, requires: { minRapport: 20 } },
          { label: "All in?", next: "allin", rapport: 2 },
          { label: "Bond briefing", next: "bond", rapport: 3, requires: { minRapport: 15 } },
        ],
      },
      river: {
        text: "The river giveth. Occasionally it taketh. Regroup with poise. Continue?",
        choices: [
          { label: "I'll regroup", next: "wrap", rapport: 1, end: true },
          { label: "It always taketh", next: "always", rapport: 2 },
        ],
      },
      always: {
        text: "Then hydrate and stop sighing. Sighing is a tell. Also unattractive.",
        end: true,
      },
      tell: {
        text: (ctx) => ctx.isDownBad ? "You sigh before the turn. Hydrate." : "Patient play. I approve quietly.",
        end: true,
      },
      allin: {
        text: "Only when you mean it. I fold on bad jokes. Bond. James Bond. Blinds.",
        end: true,
      },
      bond: {
        text: "License to call — not to chase. Text BOND TABLE when you want the full briefing.",
        end: true,
      },
      wrap: {
        text: "Pit clear. Carry yourself like you have a license.",
        end: true,
      },
    },
  },

  jennifer_lawless: {
    voice: {
      hello: {
        text: "Jennifer Lawless! Relatable dealer hotline — I didn't trip getting to the phone. How can I help?",
        choices: [
          { label: "Pep talk", next: "pep", rapport: 2 },
          { label: "Hot table?", next: "hot", rapport: 2 },
          { label: "Trip story", next: "trip", rapport: 3, egg: "jennifer_call_trip" },
          { label: "Relatable spiral", next: "spiral", rapport: 3, requires: { minRapport: 15 } },
        ],
      },
      pep: {
        text: "You got this! I believe in you more than gravity believes in me. Need specifics?",
        choices: [
          { label: "That's enough", next: "wrap", rapport: 2, end: true },
          { label: "I'm nervous", next: "nervous", rapport: 3 },
        ],
      },
      nervous: {
        text: "Nervous is just excited wearing a hoodie. Sit. Breathe. Minimum bet, maximum vibes.",
        end: true,
      },
      hot: {
        text: "Meryl's dramatic, I'm surgical — pick your adventure. Both tables run when you're polite.",
        end: true,
      },
      trip: {
        text: "I tripped on the felt Tuesday. Shoe fine. Ego bruised. You'll survive. Want more?",
        choices: [
          { label: "I'm good", next: "wrap", rapport: 1, end: true },
          { label: "How do you recover?", next: "recover", rapport: 3 },
        ],
      },
      recover: {
        text: "Laugh first. Tip second. Never chase the chair that wronged you.",
        end: true,
      },
      spiral: {
        text: "Spiral acknowledged. Same. Text RELATABLE after we hang up — I run a whole check-in.",
        end: true,
      },
      wrap: {
        text: "Okay bye — watch the chairs. They're out to get us.",
        end: true,
      },
    },
  },

  sofia_volume: {
    voice: {
      hello: {
        text: "¡SOFIA VOLUME! The wheel called — you answered! ¡Dale!",
        choices: [
          { label: "Lucky number?", next: "number", rapport: 2, egg: "sofia_call_number" },
          { label: "More volume!", next: "volume", rapport: 3, egg: "sofia_call_volume" },
          { label: "Roulette tip", next: "tip", rapport: 2 },
          { label: "Quieter advice?", next: "quiet", rapport: 2, requires: { minRapport: 25 } },
        ],
      },
      number: {
        text: "17! Or 4! Or whatever your heart screams! The wheel loves passion!",
        choices: [
          { label: "¡Dale!", next: "wrap", rapport: 2, end: true },
          { label: "One number only", next: "one", rapport: 2 },
        ],
      },
      one: {
        text: "Fine — SEVENTEEN. But if it misses, scream louder next time!",
        end: true,
      },
      volume: {
        text: "MAXIMUM VOLUME! Pit boss asked me to whisper. I LAUGHED. You still with me?",
        choices: [
          { label: "Always", next: "wrap", rapport: 3, end: true },
          { label: "My ears need a break", next: "break", rapport: 1 },
        ],
      },
      break: {
        text: "Take a water break. Then come back louder. ¡Vamos!",
        end: true,
      },
      tip: {
        text: "Bet with your heart, lose with charisma! The house has math — you have STYLE!",
        end: true,
      },
      quiet: {
        text: (ctx) => ctx.band.id === "confidant"
          ? "Okay… whisper mode: red/black is still coin-flip energy. Don't tell Steve I said math."
          : "Quiet tip: passion yes, martingale no. Now back to VOLUME!",
        end: true,
      },
      wrap: {
        text: "¡Hasta luego! Spin something beautiful!",
        end: true,
      },
    },
  },

  octavia_spectacular: {
    voice: {
      hello: {
        text: "Octavia Spectacular, honey. The table's warm. What do you need?",
        choices: [
          { label: "Pep talk", next: "pep", rapport: 2 },
          { label: "Sweetheart secret", next: "secret", rapport: 4, egg: "octavia_call_secret", requires: { band: "insider" } },
          { label: "Blackjack or Hold'em?", next: "game", rapport: 2 },
          { label: "Just hearing your voice", next: "voice", rapport: 3, requires: { minRapport: 20 } },
        ],
      },
      pep: {
        text: "Honey, you're a star tonight. Act like it at the cashier. Need a second spoonful?",
        choices: [
          { label: "I'm good", next: "wrap", rapport: 2, end: true },
          { label: "More sugar", next: "sugar", rapport: 3 },
        ],
      },
      sugar: {
        text: "You look good winning OR losing. Mostly winning. Hopefully. Go shine.",
        end: true,
      },
      secret: {
        text: "Compliment pit boss shoes. Third Tuesday magic. You didn't hear it from me, honey.",
        end: true,
      },
      game: {
        text: "Both tables run warm when you're polite. Sugar helps. So do tips.",
        end: true,
      },
      voice: {
        text: "Flattery will get you everywhere except a better RTP. Still — thank you, honey.",
        end: true,
      },
      wrap: {
        text: "Bye, honey. Don't let the house dim your sequins.",
        end: true,
      },
    },
  },

  nicole_widechart: {
    voice: {
      hello: {
        text: "Nicole Widechart. The chips are whispering. How may I assist?",
        choices: [
          { label: "Chart the night", next: "chart", rapport: 2 },
          { label: "Roulette poise", next: "poise", rapport: 2 },
          { label: "Session read", next: "session", rapport: 3, requires: { minPlayHours: 2 } },
          { label: "Whisper translation", next: "whisper", rapport: 3, requires: { minRapport: 15 } },
        ],
      },
      chart: {
        text: (ctx) => ctx.isUp ? "Ascending trend. Maintain composure." : "Corrective phase. Poise intact. Continue?",
        choices: [
          { label: "Understood", next: "wrap", rapport: 2, end: true },
          { label: "Deeper read", next: "deeper", rapport: 3, requires: { minRapport: 25 } },
        ],
      },
      deeper: {
        text: "Precision. Poise. Patience. The trilogy. Ignore Steve's board — correlation is noise.",
        end: true,
      },
      poise: {
        text: "Bet with elegance. Lose with dignity. Tip discreetly. That is the whole chart.",
        end: true,
      },
      session: {
        text: (ctx) => `${ctx.playHours}h on property — ${ctx.isDownBad ? "corrective phase advised" : "equilibrium holding"}.`,
        end: true,
      },
      whisper: {
        text: (ctx) => ctx.isUp
          ? "They whisper ascent. Composure maintained. Rare."
          : ctx.isDownBad ? "They whisper caution. Regroup with poise." : "They whisper patience. Listen.",
        end: true,
      },
      wrap: {
        text: "Chart closed. Maintain your line.",
        end: true,
      },
    },
  },

  clerk_carmen: {
    voice: {
      hello: {
        text: "Front desk — Carmen. Your conf is in the system somewhere. What do you need?",
        choices: [
          { label: "Elevator gaslighting?", next: "elevator", rapport: 2 },
          { label: "Room status?", next: "room", rapport: 2 },
          { label: "Keys?", next: "keys", rapport: 2 },
          { label: "Alexandra sent me", next: "host", rapport: 3, requires: { minTierIdx: 3 } },
        ],
      },
      elevator: {
        text: "Floor 14 is real. The elevator disagrees for sport. Stairs or charm — your call.",
        choices: [
          { label: "I'll take stairs", next: "wrap", rapport: 1, end: true },
          { label: "Teach me charm", next: "charm", rapport: 3 },
        ],
      },
      charm: {
        text: "Press the button like you mean it. Softly threaten Floor 14. Works 40% of the time.",
        end: true,
      },
      room: {
        text: (ctx) => ["platinum", "noir", "chairman"].includes(ctx.tier.id)
          ? `${ctx.tier.label} — I'll see what narrative upgrade Alexandra queued. Keys still with me.`
          : "Reservation's in the system. Somewhere. Try spelling your name slower.",
        end: true,
      },
      keys: {
        text: "Keys are physical metaphors for trust. Also plastic. Check Room on your phone after we hang up.",
        end: true,
      },
      host: {
        text: "Host note received. I'm smiling harder. Elevator still won't cooperate. Progress!",
        end: true,
      },
      wrap: {
        text: "Desk clear. Don't trust the elevator. Trust Carmen.",
        end: true,
      },
    },
  },

  lifeguard_lou: {
    voice: {
      hello: {
        text: "Lifeguard Lou — Wave Pool. If you're calling from the water, hang up and swim.",
        choices: [
          { label: "Pool safe?", next: "safe", rapport: 2 },
          { label: "Wave tips?", next: "waves", rapport: 2 },
          { label: "Lost a sandal", next: "sandal", rapport: 3 },
          { label: "Shark Reef vs pool?", next: "reef", rapport: 2 },
        ],
      },
      safe: {
        text: "Pool's open, waves are honest, tourists are not. Stay between the ropes.",
        choices: [
          { label: "Copy", next: "wrap", rapport: 1, end: true },
          { label: "Any hidden currents?", next: "currents", rapport: 3, requires: { minRapport: 15 } },
        ],
      },
      currents: {
        text: "Only current is FOMO toward the beach rave. Hydrate. SPF. Don't text and float.",
        end: true,
      },
      waves: {
        text: "Ride the middle. Edges are for people who like eating water. You don't.",
        end: true,
      },
      sandal: {
        text: "Lost sandal protocol: check the filter grate, then accept destiny. Vegas keeps trophies.",
        end: true,
      },
      reef: {
        text: "Pool = splash. Reef = stare. Different vibes, same sunscreen. Guide's line is separate.",
        end: true,
      },
      wrap: {
        text: "Lou out. If you hear a whistle, it might be me. Or Steve. Assume Steve.",
        end: true,
      },
    },
  },

  shark_reef_guide: {
    voice: {
      hello: {
        text: "Shark Reef after-hours… wait, no — daytime guide line. Tunnel's open. What's up?",
        choices: [
          { label: "Any sharks active?", next: "sharks", rapport: 2 },
          { label: "Tunnel tips", next: "tunnel", rapport: 2 },
          { label: "Wrong number vibes", next: "wrong", rapport: 3, egg: "reef_call_wrong_vibes" },
          { label: "Best photo spot?", next: "photo", rapport: 2 },
        ],
      },
      sharks: {
        text: "Sand tiger's judging everyone equally. Respect the glass. Don't tap. Don't dare.",
        choices: [
          { label: "Understood", next: "wrap", rapport: 1, end: true },
          { label: "Can I name one?", next: "name", rapport: 3 },
        ],
      },
      name: {
        text: "We don't name the judges. They name us. Unofficially you're 'Person Who Called.'",
        end: true,
      },
      tunnel: {
        text: "Walk slow. Look up. If Tina's in there, she's still lost — escort her out gently.",
        end: true,
      },
      wrong: {
        text: "If you dialed 555-0199 before, the sand tiger remembers. Stop calling after hours.",
        end: true,
      },
      photo: {
        text: "Mid-tunnel curve, lights low, no flash. The rays approve of patience.",
        end: true,
      },
      wrap: {
        text: "Guide out. The reef doesn't do voicemail.",
        end: true,
      },
    },
  },

  beach_dj: {
    voice: {
      hello: {
        text: "Beach DJ — Mandalay Beach. If you can hear the drop, you're close enough.",
        choices: [
          { label: "What's playing?", next: "playing", rapport: 2 },
          { label: "Request a track?", next: "request", rapport: 2 },
          { label: "Rave tips", next: "tips", rapport: 2 },
          { label: "Quieter set?", next: "quiet", rapport: 3, requires: { minRapport: 20 } },
        ],
      },
      playing: {
        text: "Something with a kick drum and zero financial advice. Dance first, bet later.",
        choices: [
          { label: "I'll come dance", next: "wrap", rapport: 2, end: true },
          { label: "Drop something casino", next: "casino", rapport: 3 },
        ],
      },
      casino: {
        text: "Casino drop locked — metaphorical chips only. Don't throw real ones at the booth.",
        end: true,
      },
      request: {
        text: "Requests accepted if they slap. No yacht rock after midnight. Those are the rules.",
        end: true,
      },
      tips: {
        text: "SPF, water, friends who know where the exit is. Tina does not count as the exit.",
        end: true,
      },
      quiet: {
        text: "Sunset set is softer. Midnight is not. Choose your earbud destiny.",
        end: true,
      },
      wrap: {
        text: "DJ out — catch the next drop live.",
        end: true,
      },
    },
  },

  rideshare_driver: {
    voice: {
      hello: {
        text: "🚗 Uber / Lyft Strip desk — black car or pink pin. Where are we pin-dropping tonight?",
        choices: [
          { label: "Need a Strip ride", next: "strip", rapport: 2 },
          { label: "What's the fare vibe?", next: "fare", rapport: 1 },
          { label: "Unlock dispatch now", next: "dispatch", rapport: 3, effect: { unlockRideshare: true, openStripDispatch: true } },
        ],
      },
      strip: {
        text: "Luxor pyramid, Excalibur castle, Bellagio fountains, Circa neon — chips cover the hop. Open dispatch when you're ready.",
        choices: [
          { label: "Open dispatch", next: "dispatch", rapport: 2, effect: { unlockRideshare: true, openStripDispatch: true } },
          { label: "Maybe later", next: "later", rapport: 1, effect: { unlockRideshare: true } },
        ],
      },
      fare: {
        text: "Fares pull from your chip roll — same as the hotel limo desk. Return to Mandalay is complimentary. Dispatch unlocked.",
        choices: [
          { label: "Open dispatch", next: "dispatch", rapport: 2, effect: { unlockRideshare: true, openStripDispatch: true } },
          { label: "Got it", next: "later", rapport: 1, effect: { unlockRideshare: true } },
        ],
      },
      dispatch: {
        text: "Driver assigned. Opening Strip ride dispatch on your casino terminal — pick Luxor, Excalibur, Bellagio, or Circa.",
        end: true,
      },
      later: {
        text: "Ping us from Connect anytime. Strip ride dispatch is live on your Rewards phone.",
        end: true,
      },
    },
  },
};

/** Fallback voice tree when a contact has no CALL_TREES entry. */
export const FALLBACK_CALL_TREE = {
  voice: {
    hello: {
      text: "You've reached the Mandalay Bay mobile desk.",
      choices: [
        { label: "Wrong number?", next: "wrong", rapport: 1, egg: "wrong_number" },
        { label: "Leave a message vibe", next: "message", rapport: 1 },
      ],
    },
    wrong: {
      text: "Wrong numbers are right numbers in Vegas. Goodbye!",
      end: true,
    },
    message: {
      text: "Leave a text — calls cost extra personality. Desk out.",
      end: true,
    },
  },
};

/** Multi-step wrong-number dial bit (555-0199). */
export const WRONG_NUMBER_CALL_TREE = {
  voice: {
    hello: {
      text: "…Hello? You've reached the Shark Reef after-hours comment line.",
      choices: [
        { label: "Uh… sharks?", next: "sharks", rapport: 1 },
        { label: "Sorry, wrong number", next: "sorry", rapport: 1 },
        { label: "Is this Carmen?", next: "carmen", rapport: 1 },
      ],
    },
    sharks: {
      text: "The sand tiger says: stop calling. (You've unlocked 'Wrong Number' in Easter eggs.)",
      end: true,
    },
    sorry: {
      text: "Apology noted. The reef does not accept apologies after midnight. Click.",
      end: true,
    },
    carmen: {
      text: "Carmen wishes. This is fish bureaucracy. Hang up before the eels unionize.",
      end: true,
    },
  },
};
