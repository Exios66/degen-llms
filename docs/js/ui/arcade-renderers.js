import { ACTIVITIES } from "../core.js";
import { ARCADE_GAMES, REDEEM_OFFERS } from "../arcade/catalog.js";
import { ensureArcade, persistArcade } from "../arcade/state.js";
import { getActivityBranding } from "../strip-destinations.js";

export function buildArcadeRenderers(ctx) {
  const {
    el, banner, chipLine, showStatus, menu, pushView, popView, goBack,
    render, persist, recordActivityVisit, recordActivityResult,
  } = ctx;
  const runtime = ctx.runtime;

  function arcadeBannerTitle() {
    const brand = getActivityBranding(ctx.session, "arcade", "Arcade");
    return `Arcade Alley — ${brand.name}`;
  }

  function state() {
    return ensureArcade(ctx.session);
  }

  function renderArcadeMenu() {
    const act = ACTIVITIES.arcade;
    if (ctx.session.wallet.balance < act.minBet) {
      return el("div", { className: "panel" }, [
        banner(arcadeBannerTitle()),
        el("p", { className: "error", textContent: `You need at least ${act.minBet} chips to enter.` }),
        el("div", { className: "action-bar" }, [
          el("button", { className: "btn", textContent: "Back", onclick: () => { popView(); render(); } }),
        ]),
      ]);
    }

    recordActivityVisit("arcade");
    persist();
    const st = state();

    const cards = el("div", { className: "arcade-cabinet-grid" }, ARCADE_GAMES.map((g) => {
      const hi = st.highScores[g.id] ?? 0;
      return el("button", {
        className: "arcade-cabinet-card",
        style: `--arcade-accent:${g.accent}`,
        onclick: () => {
          if (!ctx.arcadeOverlay) {
            showStatus("Arcade overlay not ready.", "error");
            return;
          }
          ctx.arcadeOverlay.setSession(ctx.session);
          ctx.arcadeOverlay.open(g.id);
        },
      }, [
        el("div", { className: "arcade-cabinet-card__marquee", textContent: g.title }),
        el("div", { className: "arcade-cabinet-card__classic", textContent: `Classic: ${g.classic}` }),
        el("p", { className: "arcade-cabinet-card__blurb", textContent: g.blurb }),
        el("div", { className: "arcade-cabinet-card__meta" }, [
          el("span", { textContent: `${g.cost} chips` }),
          el("span", { textContent: `HI ${hi}` }),
        ]),
        el("span", { className: "arcade-cabinet-card__play", textContent: "INSERT COIN" }),
      ]);
    }));

    return el("div", { className: "panel arcade-floor" }, [
      banner(arcadeBannerTitle()),
      chipLine(),
      el("p", {
        className: "dim",
        textContent: `Vegas-styled classics in a CRT cabinet overlay · ${st.tickets} tickets · ${st.lifetimePlays} plays`,
      }),
      cards,
      menu(
        ["Ticket redeem shop", "Leave arcade"],
        "Arcade Alley:",
        (choice) => {
          if (choice === 0 || choice === 2) {
            if (runtime.arcade.plays > 0) {
              recordActivityResult("arcade", runtime.arcade.sessionNet, runtime.arcade.plays);
              runtime.arcade.sessionNet = 0;
              runtime.arcade.plays = 0;
              persist();
            }
            goBack();
            return;
          }
          if (choice === 1) pushView("arcade-redeem");
        },
      ),
    ]);
  }

  function renderArcadeRedeem() {
    const st = state();
    const list = el("div", { className: "arcade-redeem-list" }, REDEEM_OFFERS.map((offer) => {
      const owned = offer.kind === "flag" && st.flags[offer.flag];
      const can = st.canRedeem(offer.id);
      return el("div", { className: "arcade-redeem-row" }, [
        el("div", {}, [
          el("strong", { textContent: offer.label }),
          el("div", { className: "dim", textContent: `${offer.costTickets} tickets${owned ? " · owned" : ""}` }),
        ]),
        el("button", {
          className: "btn primary",
          textContent: owned ? "Owned" : "Redeem",
          disabled: !can,
          onclick: () => {
            const live = state();
            const result = live.redeem(offer.id);
            if (!result.ok) {
              showStatus(result.message, "error");
              return;
            }
            if (result.chips > 0) {
              ctx.session.wallet.credit(result.chips, "arcade", `Ticket redeem: ${offer.label}`);
            }
            persistArcade(ctx.session, live);
            persist();
            showStatus(result.message);
            render();
          },
        }),
      ]);
    }));

    return el("div", { className: "panel" }, [
      banner("Arcade Ticket Shop"),
      chipLine(),
      el("p", { className: "dim", textContent: `${st.tickets} tickets on hand · small perks only` }),
      list,
      el("div", { className: "action-bar" }, [
        el("button", { className: "btn", textContent: "Back", onclick: () => { popView(); render(); } }),
      ]),
    ]);
  }

  return {
    "arcade-menu": renderArcadeMenu,
    "arcade-redeem": renderArcadeRedeem,
  };
}
