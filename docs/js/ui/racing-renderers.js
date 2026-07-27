// Extracted from app.js — shared by the web terminal and the pixel RPG.
import { ACTIVITIES, signedChips } from "../core.js";
import { fmtOddsEq, generateDressage, generateJumper, settleDressageTicket, settleJumperTicket, simulateDressage, simulateJumper } from "../equestrian.js";
import { createRacePreview, createRaceTrackView } from "../horse-race-track.js";
import { assignHorseSprites, createHorseSpriteCanvas, getHorseSprite, getJockeySilks } from "../horse-sprites.js";
import { fmtOdds as fmtRaceOdds, generateRace, getHorseNamePool, parseHorseNamesCSV, setCustomHorseNames, settleTicket, simulateRace } from "../horse_racing.js";
import { effectiveTableStakes, formatStakeRange } from "../stakes.js";
import { getActivityBranding, casinoDisplayName } from "../strip-destinations.js";

export function buildRacingRenderers(ctx) {
  const { el, banner, chipLine, showStatus, menu, dealerPanel, pushView, goBack, render, persist, recordActivityVisit, recordActivityResult } = ctx;
  const runtime = ctx.runtime;

  function racingBrandName() {
    return getActivityBranding(ctx.session, "horse_racing", "Horse Racing").name;
  }

  function stablesBannerTitle() {
    return `${casinoDisplayName(ctx.session).replace(/^The\s+/i, "")} Stables`;
  }

  // ── Horse Stables ──────────────────────────────────────────────────────────
  const STABLE_HORSE_DATA = [
    { id: "black",       name: "Midnight",    stall: 1, note: "Calm at dawn, electric at the gate." },
    { id: "tan",         name: "Biscuit",     stall: 2, note: "Loves apples. Will follow you anywhere." },
    { id: "grey",        name: "Sterling",    stall: 3, note: "Three-time distance champion. Retired hero." },
    { id: "chestnut",    name: "Ember",       stall: 4, note: "Fastest quarter-mile in Mandalay history." },
    { id: "light_brown", name: "Hazel",       stall: 5, note: "Gentle giant. Prefers morning workouts." },
    { id: "dark_brown",  name: "Cacao",       stall: 6, note: "Suspicious of hats. Loves carrots." },
    { id: "bay",         name: "Sovereign",   stall: 7, note: "Racing royalty. Eleven wins this season." },
    { id: "dapple",      name: "Cloudberry",  stall: 8, note: "Newest arrival. Still learning the track." },
  ];


  function horsePaddockCard(horse, { selected = false, onClick = null } = {}) {
    const spriteMeta = getHorseSprite(horse.spriteId);
    const card = el("div", {
      className: `horse-paddock-card${selected ? " horse-paddock-card--selected" : ""}`,
    }, [
      createHorseSpriteCanvas(horse.spriteId, {
        size: 80,
        animate: true,
        animation: "walk",
        direction: "front",
        horseNumber: horse.number,
        withJockey: false,
      }),
      el("div", { className: "horse-paddock-num", textContent: `#${horse.number}` }),
      el("div", { className: "horse-paddock-name", textContent: horse.name }),
      el("div", { className: "horse-paddock-sprite-label", textContent: spriteMeta.label }),
      el("div", { className: "horse-paddock-odds", textContent: fmtRaceOdds(horse.odds) }),
    ]);
    if (onClick) {
      card.style.cursor = "pointer";
      card.onclick = onClick;
    }
    return card;
  }

  function withHorseSpriteIds(horses) {
    if (!horses.some((h) => !h.spriteId)) return horses;
    const spriteIds = assignHorseSprites(horses.length, 0);
    return horses.map((h, i) => (h.spriteId ? h : { ...h, spriteId: spriteIds[i] }));
  }

  function renderHorsePaddock(horses, { selectedNumber = null, onSelect = null } = {}) {
    const roster = withHorseSpriteIds(horses);
    return el("div", { className: "racing-paddock" }, roster.map((h) =>
      horsePaddockCard(h, {
        selected: selectedNumber === h.number,
        onClick: onSelect ? () => onSelect(h.number) : null,
      })
    ));
  }

  function renderHorseStables() {
    recordActivityVisit("horse_stables");
    return el("div", { className: "panel racing-pavilion" }, [
      banner(stablesBannerTitle()),
      chipLine(),
      el("p", { className: "horse-stables-intro", textContent: `Behind the Racing Pavilion, past the clockers' stand, eight residents call the ${stablesBannerTitle()} home. Step through the barn doors to meet them in the pasture or visit them in their stalls.` }),
      menu(
        ["Visit the Pasture", "Visit the Stalls"],
        "Stables:",
        (choice) => {
          if (choice === 0) { goBack(); return; }
          if (choice === 1) pushView("horse-stables-pasture");
          if (choice === 2) pushView("horse-stables-stalls");
        },
        { showCasinoBanner: false },
      ),
    ]);
  }

  function renderHorseStablesPasture() {
    const cards = STABLE_HORSE_DATA.map((horse) =>
      el("div", { className: "horse-pasture-card" }, [
        createHorseSpriteCanvas(horse.id, {
          size: 128,
          animate: true,
          animation: "walk",
          direction: "front",
          withJockey: false,
        }),
        el("div", { className: "horse-pasture-name", textContent: horse.name }),
        el("div", { className: "horse-pasture-coat", textContent: getHorseSprite(horse.id).label }),
      ])
    );

    return el("div", { className: "panel racing-pavilion" }, [
      banner("The Pasture"),
      el("p", { className: "horse-stables-intro", textContent: "Morning light across the south field. The horses roam free between training sessions — no riders, no timers, just open turf." }),
      el("p", { className: "horse-stables-label", textContent: "Current Residents" }),
      el("div", { className: "horse-pasture" }, cards),
      el("div", { className: "action-bar" }, [
        el("button", { className: "btn", textContent: "Back to Stables", onclick: () => goBack() }),
      ]),
    ]);
  }

  function renderHorseStablesStalls() {
    const cards = STABLE_HORSE_DATA.map((horse) => {
      const spriteMeta = getHorseSprite(horse.id);
      return el("div", { className: "horse-stall-card" }, [
        el("div", { className: "horse-stall-header" }, [
          el("span", { className: "horse-stall-num", textContent: `STALL ${horse.stall}` }),
          el("span", { className: "horse-stall-badge" }),
        ]),
        createHorseSpriteCanvas(horse.id, {
          size: 80,
          animate: true,
          animation: "walk",
          direction: "front",
          withJockey: false,
        }),
        el("div", { className: "horse-stall-name", textContent: horse.name }),
        el("div", { className: "horse-stall-coat", textContent: spriteMeta.label }),
        el("div", { className: "horse-stall-note", textContent: horse.note }),
      ]);
    });

    return el("div", { className: "panel racing-pavilion" }, [
      banner("The Stalls"),
      el("p", { className: "horse-stables-intro", textContent: "Eight stalls line the east barn, each swept and bedded fresh. The green indicator means your horse is in — settled, fed, and ready for tomorrow." }),
      el("p", { className: "horse-stables-label", textContent: "Barn — East Wing" }),
      el("div", { className: "horse-stalls-grid" }, cards),
      el("div", { className: "action-bar" }, [
        el("button", { className: "btn", textContent: "Back to Stables", onclick: () => goBack() }),
      ]),
    ]);
  }

  function renderHorseRacing() {
    const act = ACTIVITIES.horse_racing;
    if (ctx.session.wallet.balance < act.minBet && !runtime.horseRacing.pending.length) {
      return el("div", { className: "panel" }, [
        banner(racingBrandName()),
        el("p", { className: "error", textContent: `You need at least ${act.minBet} chips to wager.` }),
        el("div", { className: "action-bar" }, [
          el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
        ]),
      ]);
    }
    recordActivityVisit("horse_racing");
    if (!runtime.horseRacing.card) runtime.horseRacing.card = generateRace(ctx.session);
    persist();
    const tier = runtime.horseRacing.tier ?? runtime.stakeTier;
    const wagerStakes = tier
      ? effectiveTableStakes(tier, ctx.session.wallet.balance, act.minBet)
      : { minBet: act.minBet, maxBet: ctx.session.wallet.balance };

    const card = runtime.horseRacing.card;
    const namePool = getHorseNamePool(ctx.session);
    const poolLabel = ctx.session.horseRacingCustomNames
      ? `Custom roster (${namePool.length} horses)`
      : `Default roster (${namePool.length} horses)`;

    const pendingEl = el("div", { className: "pending-tickets" });
    if (runtime.horseRacing.pending.length) {
      pendingEl.appendChild(el("p", { className: "subtitle", textContent: "Open tickets:" }));
      for (const slip of runtime.horseRacing.pending) {
        const h = card.horses.find((x) => x.number === slip.horse);
        pendingEl.appendChild(el("div", {
          className: "ticket",
          textContent: `${slip.amount} chips on #${slip.horse} ${h?.name ?? ""} (${slip.betType})`,
        }));
      }
    }

    return el("div", { className: "panel racing-pavilion" }, [
      banner(racingBrandName()),
      chipLine(),
      tier ? el("p", { className: "dim", textContent: `${tier.name}: ${formatStakeRange(wagerStakes.minBet, wagerStakes.maxBet, { noCap: tier.maxBet == null })}` }) : null,
      dealerPanel("horse_racing"),
      el("p", { className: "subtitle", textContent: card.label }),
      el("p", { className: "racing-roster-note dim", textContent: `${poolLabel} — study the paddock before you wager.` }),
      el("p", { className: "racing-paddock-label", textContent: "Race Track — Post Parade" }),
      createRacePreview(card),
      el("p", { className: "racing-paddock-label", textContent: "Paddock" }),
      renderHorsePaddock(card.horses),
      pendingEl,
      menu(
        ["Place a wager", "Run race & settle", "New race card", "Manage horse names", "Visit the Stables"],
        "Racing pavilion:",
        (choice) => {
          if (choice === 0) { goBack(); return; }
          if (choice === 1) pushView("horse-racing-wager");
          else if (choice === 2) pushView("horse-racing-settle");
          else if (choice === 3) { runtime.horseRacing.card = generateRace(ctx.session); render(); }
          else if (choice === 4) pushView("horse-racing-names");
          else if (choice === 5) pushView("horse-stables");
        },
        { showCasinoBanner: false },
      ),
    ]);
  }

  function renderHorseRacingWager() {
    const act = ACTIVITIES.horse_racing;
    const tier = runtime.horseRacing.tier ?? runtime.stakeTier;
    const wagerStakes = tier
      ? effectiveTableStakes(tier, ctx.session.wallet.balance, act.minBet)
      : { minBet: act.minBet, maxBet: ctx.session.wallet.balance };
    if (!runtime.horseRacing.card) runtime.horseRacing.card = generateRace(ctx.session);
    const card = runtime.horseRacing.card;
    let selectedHorse = card.horses[0]?.number ?? 1;
    const paddockContainer = el("div", {});

    const horseSelect = el("select", {}, card.horses.map((h) =>
      el("option", { value: String(h.number), textContent: `#${h.number} ${h.name} (${fmtRaceOdds(h.odds)})` })
    ));
    horseSelect.value = String(selectedHorse);

    function refreshPaddock() {
      paddockContainer.innerHTML = "";
      paddockContainer.appendChild(renderHorsePaddock(card.horses, {
        selectedNumber: selectedHorse,
        onSelect: (num) => {
          selectedHorse = num;
          horseSelect.value = String(num);
          refreshPaddock();
        },
      }));
    }
    horseSelect.onchange = () => {
      selectedHorse = parseInt(horseSelect.value, 10);
      refreshPaddock();
    };
    refreshPaddock();

    const betTypeSelect = el("select", {}, [
      el("option", { value: "win", textContent: "Win" }),
      el("option", { value: "place", textContent: "Place (top 2)" }),
      el("option", { value: "show", textContent: "Show (top 3)" }),
    ]);
    const amountInput = el("input", {
      type: "number", min: String(wagerStakes.minBet), max: String(wagerStakes.maxBet), value: String(wagerStakes.minBet),
    });

    return el("div", { className: "panel racing-pavilion" }, [
      banner("Place Wager"),
      chipLine(),
      el("p", { className: "racing-paddock-label", textContent: "Choose your pony" }),
      paddockContainer,
      el("div", { className: "form-row" }, [el("label", { textContent: "Horse" }), horseSelect]),
      el("div", { className: "form-row" }, [el("label", { textContent: "Bet type" }), betTypeSelect]),
      el("div", { className: "form-row" }, [el("label", { textContent: "Amount" }), amountInput]),
      el("div", { className: "action-bar" }, [
        el("button", {
          className: "btn primary",
          textContent: "Place ticket",
          onclick: () => {
            const horse = parseInt(horseSelect.value, 10);
            const betType = betTypeSelect.value;
            const amount = parseInt(amountInput.value, 10);
            if (amount < wagerStakes.minBet) { alert(`Minimum wager is ${wagerStakes.minBet} chips.`); return; }
            if (amount > wagerStakes.maxBet) { alert(`Maximum wager is ${wagerStakes.maxBet} chips.`); return; }
            const h = card.horses.find((x) => x.number === horse);
            if (!ctx.session.wallet.debit(amount, "horse_racing", `${betType} on #${horse}`)) {
              alert("Insufficient chips."); return;
            }
            runtime.horseRacing.pending.push({ horse, horseName: h.name, odds: h.odds, betType, amount, spriteId: h.spriteId });
            persist();
            showStatus(`Ticket placed: ${amount} chips on #${horse} ${h.name} (${betType}).`);
            goBack();
          },
        }),
        el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
      ]),
    ]);
  }

  function renderHorseRacingSettle() {
    const body = el("div", { className: "race-settle-body" });

    if (!runtime.horseRacing.pending.length) {
      body.appendChild(el("p", { className: "error", textContent: "No open tickets." }));
    } else {
      if (!runtime.horseRacing.card) runtime.horseRacing.card = generateRace(ctx.session);
      const card = runtime.horseRacing.card;
      const results = simulateRace(card);
      const slips = [...runtime.horseRacing.pending];
      const resultsPanel = el("div", { className: "race-results-panel is-hidden" });
      const log = el("div", { className: "log-area" });

      const track = createRaceTrackView({
        card,
        results,
        slips,
        raceNumber: runtime.horseRacing.races + 1,
        autoRun: true,
        onComplete: () => {
          log.appendChild(el("p", { className: "subtitle", textContent: "FINISH ORDER" }));
          const finishLine = el("div", { className: "racing-finish-line" });
          results.forEach((num, i) => {
            const h = card.horses.find((x) => x.number === num);
            const silks = getJockeySilks(num);
            finishLine.appendChild(el("div", { className: "racing-finish-entry" }, [
              el("span", { className: "racing-finish-pos", textContent: `${i + 1}.` }),
              createHorseSpriteCanvas(h.spriteId, {
                size: 64,
                frame: i % 6,
                animation: "gallop",
                direction: "right",
                horseNumber: num,
                withJockey: true,
              }),
              el("span", { className: "racing-finish-name", textContent: `#${num} ${h.name}` }),
              el("span", { className: "racing-finish-silks dim", textContent: silks.name }),
            ]));
          });
          log.appendChild(finishLine);
          results.forEach((num, i) => {
            const h = card.horses.find((x) => x.number === num);
            log.appendChild(el("div", { className: "line", textContent: `${i + 1}. #${num} ${h.name}` }));
          });

          for (const slip of slips) {
            const r = settleTicket(slip, results);
            if (r.won) {
              ctx.session.wallet.credit(r.payout, "horse_racing", r.reason);
              runtime.horseRacing.sessionNet += r.net;
              log.appendChild(el("div", { className: "line success", textContent: `WIN: ${r.reason} (${signedChips(r.net)})` }));
            } else {
              runtime.horseRacing.sessionNet += r.net;
              log.appendChild(el("div", { className: "line error", textContent: `LOSE: ${r.reason} (${signedChips(r.net)})` }));
            }
          }
          runtime.horseRacing.races += 1;
          runtime.horseRacing.pending = [];
          recordActivityResult("horse_racing", runtime.horseRacing.sessionNet, runtime.horseRacing.races);
          persist();
          resultsPanel.classList.remove("is-hidden");
        },
      });

      body.appendChild(track);
      body.appendChild(resultsPanel);
      resultsPanel.appendChild(log);
    }

    return el("div", { className: "panel racing-pavilion" }, [
      banner("Race Results"),
      chipLine(),
      body,
      el("div", { className: "action-bar" }, [
        el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
      ]),
    ]);
  }

  function renderHorseRacingNames() {
    const pool = getHorseNamePool(ctx.session);
    const statusEl = el("p", {
      className: "dim",
      textContent: ctx.session.horseRacingCustomNames
        ? `Using custom roster: ${pool.length} horse names.`
        : `Using default roster: ${pool.length} horse names (from bundled CSV).`,
    });
    const previewEl = el("div", { className: "racing-name-preview" });
    const previewNames = pool.slice(0, 12);
    for (const name of previewNames) {
      previewEl.appendChild(el("span", { className: "racing-name-chip", textContent: name }));
    }
    if (pool.length > 12) {
      previewEl.appendChild(el("span", { className: "racing-name-chip dim", textContent: `+${pool.length - 12} more…` }));
    }

    const textarea = el("textarea", {
      className: "racing-names-input",
      rows: "8",
      placeholder: "Paste horse names here — one per line, or CSV with a Name column.\n\nSugar Cube\nStarlight Trot\nMarshmallow Mane",
    });
    const fileInput = el("input", { type: "file", accept: ".csv,.txt,text/csv,text/plain" });
    fileInput.onchange = async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      textarea.value = await file.text();
      statusEl.textContent = `Loaded ${file.name} — review and save to apply.`;
      statusEl.className = "success";
    };

    return el("div", { className: "panel racing-pavilion" }, [
      banner("Horse Name Roster"),
      chipLine(),
      el("p", { className: "dim", textContent: "Upload or paste a custom horse name list. Names cycle through the paddock on each new race card." }),
      statusEl,
      previewEl,
      el("div", { className: "form-row" }, [
        el("label", { textContent: "Import CSV / text file" }),
        fileInput,
      ]),
      el("div", { className: "form-row" }, [
        el("label", { textContent: "Or paste names" }),
        textarea,
      ]),
      el("div", { className: "action-bar" }, [
        el("button", {
          className: "btn primary",
          textContent: "Save custom roster",
          onclick: () => {
            const names = parseHorseNamesCSV(textarea.value);
            if (names.length < 6) {
              alert("Please provide at least 6 unique horse names.");
              return;
            }
            setCustomHorseNames(ctx.session, names);
            runtime.horseRacing.card = null;
            persist();
            showStatus(`Saved ${names.length} custom horse names. New race cards will cycle through your roster.`);
            goBack();
          },
        }),
        el("button", {
          className: "btn",
          textContent: "Reset to default",
          onclick: () => {
            setCustomHorseNames(ctx.session, null);
            runtime.horseRacing.card = null;
            persist();
            showStatus("Restored default horse name roster.");
            render();
          },
        }),
        el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
      ]),
    ]);
  }

  // ── Dressage Arena ────────────────────────────────────────────────────────────

  function renderDressage() {
    const act = ACTIVITIES.dressage;
    if (ctx.session.wallet.balance < act.minBet && !runtime.dressage.pending.length) {
      return el("div", { className: "panel" }, [
        banner("Dressage Arena"),
        el("p", { className: "error", textContent: `You need at least ${act.minBet} chips to wager.` }),
        el("div", { className: "action-bar" }, [
          el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
        ]),
      ]);
    }
    recordActivityVisit("dressage");
    if (!runtime.dressage.card) runtime.dressage.card = generateDressage();
    persist();
    const tier = runtime.dressage.tier ?? runtime.stakeTier;
    const wagerStakes = tier
      ? effectiveTableStakes(tier, ctx.session.wallet.balance, act.minBet)
      : { minBet: act.minBet, maxBet: ctx.session.wallet.balance };

    const card = runtime.dressage.card;

    const pendingEl = el("div", { className: "pending-tickets" });
    if (runtime.dressage.pending.length) {
      pendingEl.appendChild(el("p", { className: "subtitle", textContent: "Open tickets:" }));
      for (const slip of runtime.dressage.pending) {
        const e = card.entries.find((x) => x.number === slip.entry);
        pendingEl.appendChild(el("div", {
          className: "ticket",
          textContent: `${slip.amount} chips on #${slip.entry} ${e?.rider ?? ""} (${slip.betType})`,
        }));
      }
    }

    const entriesEl = el("div", { className: "equestrian-entries" });
    for (const e of card.entries) {
      entriesEl.appendChild(el("div", { className: "equestrian-entry-row" }, [
        el("span", { className: "eq-num", textContent: `#${e.number}` }),
        el("span", { className: "eq-names", textContent: `${e.rider} / ${e.horse}` }),
        el("span", { className: "eq-scores dim", textContent: `Tech ${e.tech.toFixed(1)}  Art ${e.art.toFixed(1)}` }),
        el("span", { className: "eq-odds", textContent: fmtOddsEq(e.odds) }),
      ]));
    }

    return el("div", { className: "panel equestrian-arena" }, [
      banner("Dressage Arena"),
      chipLine(),
      tier ? el("p", { className: "dim", textContent: `${tier.name}: ${formatStakeRange(wagerStakes.minBet, wagerStakes.maxBet, { noCap: tier.maxBet == null })}` }) : null,
      el("p", { className: "subtitle", textContent: `${card.level} — ${card.arena}` }),
      entriesEl,
      pendingEl,
      menu(
        ["Place a wager", "Run test & settle", "New entry list"],
        "Dressage arena:",
        (choice) => {
          if (choice === 0) { goBack(); return; }
          if (choice === 1) pushView("dressage-wager");
          else if (choice === 2) pushView("dressage-settle");
          else if (choice === 3) { runtime.dressage.card = generateDressage(); render(); }
        },
        { showCasinoBanner: false },
      ),
    ]);
  }

  function renderDressageWager() {
    const act = ACTIVITIES.dressage;
    const tier = runtime.dressage.tier ?? runtime.stakeTier;
    const wagerStakes = tier
      ? effectiveTableStakes(tier, ctx.session.wallet.balance, act.minBet)
      : { minBet: act.minBet, maxBet: ctx.session.wallet.balance };
    if (!runtime.dressage.card) runtime.dressage.card = generateDressage();
    const card = runtime.dressage.card;

    const entrySelect = el("select", {}, card.entries.map((e) =>
      el("option", { value: String(e.number), textContent: `#${e.number} ${e.rider} / ${e.horse} (${fmtOddsEq(e.odds)})` })
    ));
    const betTypeSelect = el("select", {}, [
      el("option", { value: "win", textContent: "Win (1st place)" }),
      el("option", { value: "place", textContent: "Place (top 2)" }),
      el("option", { value: "show", textContent: "Show (top 3)" }),
    ]);
    const amountInput = el("input", {
      type: "number", min: String(wagerStakes.minBet), max: String(wagerStakes.maxBet), value: String(wagerStakes.minBet),
    });

    return el("div", { className: "panel equestrian-arena" }, [
      banner("Place Wager — Dressage"),
      chipLine(),
      el("div", { className: "form-row" }, [el("label", { textContent: "Rider / Horse" }), entrySelect]),
      el("div", { className: "form-row" }, [el("label", { textContent: "Bet type" }), betTypeSelect]),
      el("div", { className: "form-row" }, [el("label", { textContent: "Amount" }), amountInput]),
      el("div", { className: "action-bar" }, [
        el("button", {
          className: "btn primary",
          textContent: "Place ticket",
          onclick: () => {
            const entry = parseInt(entrySelect.value, 10);
            const betType = betTypeSelect.value;
            const amount = parseInt(amountInput.value, 10);
            if (amount < wagerStakes.minBet) { alert(`Minimum wager is ${wagerStakes.minBet} chips.`); return; }
            if (amount > wagerStakes.maxBet) { alert(`Maximum wager is ${wagerStakes.maxBet} chips.`); return; }
            const e = card.entries.find((x) => x.number === entry);
            if (!ctx.session.wallet.debit(amount, "dressage", `${betType} on #${entry}`)) {
              alert("Insufficient chips."); return;
            }
            runtime.dressage.pending.push({ entry, rider: e.rider, odds: e.odds, betType, amount });
            persist();
            showStatus(`Ticket placed: ${amount} chips on #${entry} ${e.rider} (${betType}).`);
            goBack();
          },
        }),
        el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
      ]),
    ]);
  }

  function renderDressageSettle() {
    const body = el("div", { className: "eq-settle-body" });

    if (!runtime.dressage.pending.length) {
      body.appendChild(el("p", { className: "error", textContent: "No open tickets." }));
    } else {
      if (!runtime.dressage.card) runtime.dressage.card = generateDressage();
      const card = runtime.dressage.card;
      const results = simulateDressage(card);
      const log = el("div", { className: "log-area" });

      log.appendChild(el("p", { className: "subtitle", textContent: "FINAL STANDINGS" }));
      results.forEach((num, i) => {
        const e = card.entries.find((x) => x.number === num);
        log.appendChild(el("div", { className: "line", textContent: `${i + 1}. #${num} ${e.rider} / ${e.horse}` }));
      });

      const slips = [...runtime.dressage.pending];
      for (const slip of slips) {
        const r = settleDressageTicket(slip, results);
        if (r.won) {
          ctx.session.wallet.credit(r.payout, "dressage", r.reason);
          runtime.dressage.sessionNet += r.net;
          log.appendChild(el("div", { className: "line success", textContent: `WIN: ${r.reason} (${signedChips(r.net)})` }));
        } else {
          runtime.dressage.sessionNet += r.net;
          log.appendChild(el("div", { className: "line error", textContent: `LOSE: ${r.reason} (${signedChips(r.net)})` }));
        }
      }
      runtime.dressage.events += 1;
      runtime.dressage.pending = [];
      recordActivityResult("dressage", runtime.dressage.sessionNet, runtime.dressage.events);
      persist();
      body.appendChild(log);
    }

    return el("div", { className: "panel equestrian-arena" }, [
      banner("Dressage Results"),
      chipLine(),
      body,
      el("div", { className: "action-bar" }, [
        el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
      ]),
    ]);
  }

  // ── Show Jumping ──────────────────────────────────────────────────────────────

  function renderJumper() {
    const act = ACTIVITIES.jumper;
    if (ctx.session.wallet.balance < act.minBet && !runtime.jumper.pending.length) {
      return el("div", { className: "panel" }, [
        banner("Show Jumping"),
        el("p", { className: "error", textContent: `You need at least ${act.minBet} chips to wager.` }),
        el("div", { className: "action-bar" }, [
          el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
        ]),
      ]);
    }
    recordActivityVisit("jumper");
    if (!runtime.jumper.card) runtime.jumper.card = generateJumper();
    persist();
    const tier = runtime.jumper.tier ?? runtime.stakeTier;
    const wagerStakes = tier
      ? effectiveTableStakes(tier, ctx.session.wallet.balance, act.minBet)
      : { minBet: act.minBet, maxBet: ctx.session.wallet.balance };

    const card = runtime.jumper.card;

    const pendingEl = el("div", { className: "pending-tickets" });
    if (runtime.jumper.pending.length) {
      pendingEl.appendChild(el("p", { className: "subtitle", textContent: "Open tickets:" }));
      for (const slip of runtime.jumper.pending) {
        const e = card.entries.find((x) => x.number === slip.entry);
        pendingEl.appendChild(el("div", {
          className: "ticket",
          textContent: `${slip.amount} chips on #${slip.entry} ${e?.rider ?? ""} (${slip.betType})`,
        }));
      }
    }

    const entriesEl = el("div", { className: "equestrian-entries" });
    for (const e of card.entries) {
      entriesEl.appendChild(el("div", { className: "equestrian-entry-row" }, [
        el("span", { className: "eq-num", textContent: `#${e.number}` }),
        el("span", { className: "eq-names", textContent: `${e.rider} / ${e.horse}` }),
        el("span", { className: "eq-odds", textContent: fmtOddsEq(e.odds) }),
      ]));
    }

    return el("div", { className: "panel equestrian-arena" }, [
      banner("Show Jumping"),
      chipLine(),
      tier ? el("p", { className: "dim", textContent: `${tier.name}: ${formatStakeRange(wagerStakes.minBet, wagerStakes.maxBet, { noCap: tier.maxBet == null })}` }) : null,
      el("p", { className: "subtitle", textContent: `${card.course} — ${card.fenceCount} fences, ${card.entries.length} competitors` }),
      el("p", { className: "dim", textContent: "Bet types: Win / Place / Show (finish position) or Clear Round (0 faults, pays 3×)." }),
      entriesEl,
      pendingEl,
      menu(
        ["Place a wager", "Run course & settle", "New draw"],
        "Show jumping:",
        (choice) => {
          if (choice === 0) { goBack(); return; }
          if (choice === 1) pushView("jumper-wager");
          else if (choice === 2) pushView("jumper-settle");
          else if (choice === 3) { runtime.jumper.card = generateJumper(); render(); }
        },
        { showCasinoBanner: false },
      ),
    ]);
  }

  function renderJumperWager() {
    const act = ACTIVITIES.jumper;
    const tier = runtime.jumper.tier ?? runtime.stakeTier;
    const wagerStakes = tier
      ? effectiveTableStakes(tier, ctx.session.wallet.balance, act.minBet)
      : { minBet: act.minBet, maxBet: ctx.session.wallet.balance };
    if (!runtime.jumper.card) runtime.jumper.card = generateJumper();
    const card = runtime.jumper.card;

    const entrySelect = el("select", {}, card.entries.map((e) =>
      el("option", { value: String(e.number), textContent: `#${e.number} ${e.rider} / ${e.horse} (${fmtOddsEq(e.odds)})` })
    ));
    const betTypeSelect = el("select", {}, [
      el("option", { value: "win", textContent: "Win (1st place)" }),
      el("option", { value: "place", textContent: "Place (top 2)" }),
      el("option", { value: "show", textContent: "Show (top 3)" }),
      el("option", { value: "clear", textContent: "Clear round (0 faults — pays 3×)" }),
    ]);
    const amountInput = el("input", {
      type: "number", min: String(wagerStakes.minBet), max: String(wagerStakes.maxBet), value: String(wagerStakes.minBet),
    });

    return el("div", { className: "panel equestrian-arena" }, [
      banner("Place Wager — Show Jumping"),
      chipLine(),
      el("div", { className: "form-row" }, [el("label", { textContent: "Rider / Horse" }), entrySelect]),
      el("div", { className: "form-row" }, [el("label", { textContent: "Bet type" }), betTypeSelect]),
      el("div", { className: "form-row" }, [el("label", { textContent: "Amount" }), amountInput]),
      el("div", { className: "action-bar" }, [
        el("button", {
          className: "btn primary",
          textContent: "Place ticket",
          onclick: () => {
            const entry = parseInt(entrySelect.value, 10);
            const betType = betTypeSelect.value;
            const amount = parseInt(amountInput.value, 10);
            if (amount < wagerStakes.minBet) { alert(`Minimum wager is ${wagerStakes.minBet} chips.`); return; }
            if (amount > wagerStakes.maxBet) { alert(`Maximum wager is ${wagerStakes.maxBet} chips.`); return; }
            const e = card.entries.find((x) => x.number === entry);
            if (!ctx.session.wallet.debit(amount, "jumper", `${betType} on #${entry}`)) {
              alert("Insufficient chips."); return;
            }
            runtime.jumper.pending.push({ entry, rider: e.rider, odds: e.odds, betType, amount });
            persist();
            showStatus(`Ticket placed: ${amount} chips on #${entry} ${e.rider} (${betType}).`);
            goBack();
          },
        }),
        el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
      ]),
    ]);
  }

  function renderJumperSettle() {
    const body = el("div", { className: "eq-settle-body" });

    if (!runtime.jumper.pending.length) {
      body.appendChild(el("p", { className: "error", textContent: "No open tickets." }));
    } else {
      if (!runtime.jumper.card) runtime.jumper.card = generateJumper();
      const card = runtime.jumper.card;
      const results = simulateJumper(card);
      const log = el("div", { className: "log-area" });

      log.appendChild(el("p", { className: "subtitle", textContent: "FINAL STANDINGS" }));
      results.forEach((r, i) => {
        const e = card.entries.find((x) => x.number === r.entryNumber);
        const faultStr = r.faults === 0 ? "Clear" : `${r.faults} faults`;
        log.appendChild(el("div", { className: "line", textContent: `${i + 1}. #${r.entryNumber} ${e.rider} / ${e.horse}  ${faultStr}  ${r.timeSeconds}s` }));
      });

      const slips = [...runtime.jumper.pending];
      for (const slip of slips) {
        const r = settleJumperTicket(slip, results);
        if (r.won) {
          ctx.session.wallet.credit(r.payout, "jumper", r.reason);
          runtime.jumper.sessionNet += r.net;
          log.appendChild(el("div", { className: "line success", textContent: `WIN: ${r.reason} (${signedChips(r.net)})` }));
        } else {
          runtime.jumper.sessionNet += r.net;
          log.appendChild(el("div", { className: "line error", textContent: `LOSE: ${r.reason} (${signedChips(r.net)})` }));
        }
      }
      runtime.jumper.events += 1;
      runtime.jumper.pending = [];
      recordActivityResult("jumper", runtime.jumper.sessionNet, runtime.jumper.events);
      persist();
      body.appendChild(log);
    }

    return el("div", { className: "panel equestrian-arena" }, [
      banner("Course Results"),
      chipLine(),
      body,
      el("div", { className: "action-bar" }, [
        el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
      ]),
    ]);
  }

  return {
    "horse-racing": renderHorseRacing,
    "horse-racing-wager": renderHorseRacingWager,
    "horse-racing-settle": renderHorseRacingSettle,
    "horse-racing-names": renderHorseRacingNames,
    "horse-stables": renderHorseStables,
    "horse-stables-pasture": renderHorseStablesPasture,
    "horse-stables-stalls": renderHorseStablesStalls,
    dressage: renderDressage,
    "dressage-wager": renderDressageWager,
    "dressage-settle": renderDressageSettle,
    jumper: renderJumper,
    "jumper-wager": renderJumperWager,
    "jumper-settle": renderJumperSettle,
    renderHorsePaddock,
  };
}
