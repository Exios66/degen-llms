// Extracted from app.js — shared by the web terminal and the pixel RPG.
import { HIGH_LIMIT_SALON_CHIP_MIN, canEnterFoundationRoom, canEnterHighLimitSalon } from "../venues.js";
import {
  SALON_TABLE_GAMES,
  SALON_SPORTS_SCENARIOS,
  SALON_STAKE_TIER_ORDER,
  enterSalonContext,
  clearSalonContext,
} from "../salon-exclusives.js";
import { recordConsumption } from "../intoxication-effects.js";
import { adjustRapport } from "../phone-rapport.js";

export function buildVenueRenderers(ctx) {
  const { el, banner, chipLine, statusBanner, showStatus, menu, pushView, goBack, navigateTo, recordActivityVisit, persist } = ctx;
  const runtime = ctx.runtime;

  function launchSalonGame(def) {
    const tier = enterSalonContext(runtime);
    runtime.salonActivityMin = def.activityMin ?? null;
    if (tier && SALON_STAKE_TIER_ORDER.includes(tier.id)) {
      if (def.activityId === "slots") runtime.slots.tier = tier;
      if (def.activityId === "roulette") runtime.roulette.tier = tier;
      if (def.activityId === "craps") runtime.craps.tier = tier;
      pushView(def.nextView);
      return;
    }
    pushView("stake-tier", {
      activityId: def.activityId,
      nextView: def.nextView,
      salonExclusive: true,
    });
  }

  function renderHighLimitSalon() {
    const gate = canEnterHighLimitSalon(ctx.session, runtime.stakeTier);
    if (!gate.ok) {
      return el("div", { className: "panel" }, [
        banner("High Limit Salon"),
        chipLine(),
        el("p", { className: "error", textContent: gate.reason }),
        el("p", {
          className: "dim",
          textContent: `Requires ${HIGH_LIMIT_SALON_CHIP_MIN.toLocaleString()}+ chips. Salon tables, exclusive slots, and a private sports desk wait inside.`,
        }),
        el("div", { className: "action-bar" }, [
          el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
        ]),
      ]);
    }

    const tier = enterSalonContext(runtime);
    recordActivityVisit("high_limit_salon");

    const tableLabels = SALON_TABLE_GAMES.map((g) => `${g.label} — ${g.blurb}`);
    const options = [
      ...tableLabels,
      "Exclusive salon slots (Obsidian / Whale / Chairman)",
      "Salon sports desk — whale lines only",
      "Leave salon",
    ];

    return el("div", { className: "panel amenities-panel" }, [
      banner("High Limit Salon"),
      chipLine(),
      el("p", {
        className: "dim",
        textContent: "Velvet ropes, private felt, exclusive cabinets, and a sports desk the main floor never sees.",
      }),
      el("p", {
        className: "subtitle",
        textContent: `${tier.name} · ${ctx.session.wallet.balance.toLocaleString()} chips on the floor`,
      }),
      menu(options, "Salon exclusives:", (choice) => {
        if (choice === 0 || choice === options.length) {
          clearSalonContext(runtime);
          goBack();
          return;
        }
        if (choice <= SALON_TABLE_GAMES.length) {
          launchSalonGame(SALON_TABLE_GAMES[choice - 1]);
          return;
        }
        if (choice === SALON_TABLE_GAMES.length + 1) {
          const tier = enterSalonContext(runtime);
          runtime.salonActivityMin = 250;
          runtime.slots = { ...(runtime.slots ?? {}), salonOnly: true, tier };
          pushView("slots-menu");
          return;
        }
        if (choice === SALON_TABLE_GAMES.length + 2) {
          enterSalonContext(runtime);
          runtime.salonActivityMin = 500;
          runtime.sportsbook?.loadSalonBoard?.(SALON_SPORTS_SCENARIOS);
          pushView("sportsbook");
        }
      }),
    ]);
  }

  function renderFoundationRoom() {
    const gate = canEnterFoundationRoom(ctx.session);
    if (!gate.ok) {
      return el("div", { className: "panel" }, [
        banner("Foundation Room"),
        chipLine(),
        el("p", { className: "error", textContent: gate.reason }),
        el("p", {
          className: "dim",
          textContent: "Noir tier+. Open the rope via host rapport, suite/penthouse stay, Foundation Room phone call, or bar atmosphere.",
        }),
        el("div", { className: "action-bar" }, [
          el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
        ]),
      ]);
    }

    recordActivityVisit("foundation_room");

    return el("div", { className: "panel amenities-panel foundation-room" }, [
      statusBanner(),
      banner("Foundation Room — Noir Lounge"),
      chipLine(),
      el("p", {
        className: "dim",
        textContent: "Darkness has a cover charge. Whales murmur. Alexandra's comp list flickers on a tablet nobody admits exists.",
      }),
      el("p", {
        className: "subtitle",
        textContent: `${gate.rewardsTier.label} member · Host rapport ${gate.hostRapport}/100`,
      }),
      menu(
        [
          "Whisper with Alexandra (host line)",
          "Order at the Foundation Room bar (FPV)",
          "Return to casino floor",
        ],
        "Noir lounge:",
        (choice) => {
          if (choice === 0) { goBack(); return; }
          if (choice === 1) {
            adjustRapport?.(ctx.session, "host_representative", 3);
            showStatus("Alexandra: 'Velvet rope noted. You're on the whisper list — don't make me regret it.'");
            persist?.();
          } else if (choice === 2) {
            if (ctx.barOverlay) {
              ctx.barOverlay.setSession(ctx.session);
              ctx.barOverlay.open("foundation_room");
            } else {
              const r = recordConsumption(ctx.session, "foundation_edible", { source: "foundation_room" });
              showStatus(
                r.ok
                  ? "Foundation edible arrives on a black napkin. The room softens. No photos."
                  : "Edible narrative queued — atmosphere only tonight.",
              );
              persist?.();
            }
          } else if (choice === 3) {
            navigateTo("casino-floor");
          }
        },
      ),
    ]);
  }

  return {
    "high-limit-salon": renderHighLimitSalon,
    "foundation-room": renderFoundationRoom,
  };
}
