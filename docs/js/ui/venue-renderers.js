// Extracted from app.js — shared by the web terminal and the pixel RPG.
import { STAKE_TIERS } from "../stakes.js";
import { HIGH_LIMIT_SALON_CHIP_MIN, canEnterFoundationRoom, canEnterHighLimitSalon } from "../venues.js";

export function buildVenueRenderers(ctx) {
  const { el, banner, chipLine, statusBanner, showStatus, menu, pushView, goBack, navigateTo, recordActivityVisit } = ctx;
  const runtime = ctx.runtime;
  function renderHighLimitSalon() {
    const gate = canEnterHighLimitSalon(ctx.session, runtime.stakeTier);
    if (!gate.ok) {
      return el("div", { className: "panel" }, [
        banner("High Limit Salon"),
        chipLine(),
        el("p", { className: "error", textContent: gate.reason }),
        el("p", { className: "dim", textContent: `Requires ${HIGH_LIMIT_SALON_CHIP_MIN.toLocaleString()}+ chips and a ${STAKE_TIERS.high_limit.name} stake tier (pick tier before entering table games).` }),
        el("div", { className: "action-bar" }, [
          el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
        ]),
      ]);
    }

    recordActivityVisit("high_limit_salon");

    return el("div", { className: "panel amenities-panel" }, [
      banner("High Limit Salon"),
      chipLine(),
      el("p", { className: "dim", textContent: "Velvet ropes, private felt, and stakes that make the main floor nervous. Salon limits apply." }),
      el("p", { className: "subtitle", textContent: `${runtime.stakeTier?.name ?? "High Limit"} · ${ctx.session.wallet.balance.toLocaleString()} chips on the floor` }),
      menu(
        ["Blackjack (salon limits)", "Texas Hold'em", "Roulette", "Craps", "High-limit slots"],
        "Salon tables:",
        (choice) => {
          if (choice === 0) { goBack(); return; }
          if (choice === 1) pushView("stake-tier", { activityId: "blackjack", nextView: "blackjack-menu" });
          else if (choice === 2) pushView("stake-tier", { activityId: "holdem", nextView: "holdem-menu" });
          else if (choice === 3) pushView("stake-tier", { activityId: "roulette", nextView: "roulette" });
          else if (choice === 4) pushView("stake-tier", { activityId: "craps", nextView: "craps" });
          else if (choice === 5) pushView("stake-tier", { activityId: "slots", nextView: "slots-menu" });
        },
      ),
    ]);
  }

  function renderFoundationRoom() {
    const gate = canEnterFoundationRoom(ctx.session);
    if (!gate.ok) {
      return el("div", { className: "panel" }, [
        banner("Foundation Room"),
        chipLine(),
        el("p", { className: "error", textContent: gate.reason }),
        el("p", { className: "dim", textContent: "Noir tier+, host rapport or bar atmosphere, and the Foundation Room phone line from your suite." }),
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
      el("p", { className: "dim", textContent: "Darkness has a cover charge. Whales murmur. Alexandra's comp list flickers on a tablet nobody admits exists." }),
      el("p", { className: "subtitle", textContent: `${gate.rewardsTier.label} member · Host rapport ${gate.hostRapport}/100` }),
      menu(
        ["Whisper with Alexandra (host line)", "Order contraband edible (room phone)", "Return to casino floor"],
        "Noir lounge:",
        (choice) => {
          if (choice === 0) { goBack(); return; }
          if (choice === 1) {
            showStatus("Alexandra texts back: 'Velvet rope noted. Comp queue: dramatic pause.'");
          } else if (choice === 2) {
            showStatus("Foundation Room line rings — edible comp queued for suite delivery narrative.");
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
