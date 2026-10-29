/**
 * Strip limo dispatch UI for the web terminal casino.
 */
import {
  applyDestinationTheme,
  casinoDisplayName,
  ensureStripTravel,
  getCurrentDestination,
  isAwayFromHome,
  isLimoUnlocked,
  listLimoDestinations,
  travelByLimo,
  unlockLimoService,
} from "./strip-destinations.js";

/**
 * @param {{
 *   session: import("./core.js").PlayerSession,
 *   el: Function,
 *   banner: Function,
 *   chipLine: Function,
 *   statusBanner: Function,
 *   showStatus: Function,
 *   persist: Function,
 *   render: Function,
 *   pushView: Function,
 *   navigateTo: Function,
 *   goBack: Function,
 * }} ctx
 */
export function buildStripLimoRenderers(ctx) {
  const {
    el, banner, chipLine, statusBanner, showStatus,
    persist, render, pushView, navigateTo, goBack,
  } = ctx;

  function session() {
    return ctx.session;
  }

  /** Local helper — menuBtn is not on the shared web-terminal ctx (only hotel/pool factories define it). */
  function menuBtn(label, onclick, isBack = false) {
    return el("li", {}, [
      el("button", {
        className: "menu-btn" + (isBack ? " back" : ""),
        textContent: label,
        onclick,
      }),
    ]);
  }

  function renderStripLimoDispatch() {
    const s = session();
    ensureStripTravel(s);
    applyDestinationTheme(s);
    const unlocked = isLimoUnlocked(s);
    const current = getCurrentDestination(s);
    const destinations = listLimoDestinations(s);

    const st = ensureStripTravel(s);
    const bothModes = st.limoUnlocked && st.rideshareUnlocked;
    let rideFlavor = st.rideshareUnlocked && !st.limoUnlocked
      ? "rideshare"
      : st.limoUnlocked && !st.rideshareUnlocked
        ? "limo"
        : (st.preferredRideMode ?? st.lastRideMode ?? "limo");
    if (bothModes && !st.preferredRideMode) {
      st.preferredRideMode = rideFlavor;
    }
    const modeLabel = rideFlavor === "rideshare" ? "Uber / Lyft" : "Black car";

    const modeToggle = bothModes
      ? el("div", { className: "strip-ride-mode" }, [
        el("button", {
          type: "button",
          className: `strip-ride-mode__btn${rideFlavor === "limo" ? " strip-ride-mode__btn--active" : ""}`,
          textContent: "Black car",
          onclick: () => {
            st.preferredRideMode = "limo";
            render();
          },
        }),
        el("button", {
          type: "button",
          className: `strip-ride-mode__btn${rideFlavor === "rideshare" ? " strip-ride-mode__btn--active" : ""}`,
          textContent: "Uber / Lyft",
          onclick: () => {
            st.preferredRideMode = "rideshare";
            render();
          },
        }),
      ])
      : null;

    const cards = unlocked
      ? destinations.map((dest) => {
          const fareLabel = dest.fare > 0 ? `${dest.fare} chips` : "Complimentary";
          return el("button", {
            type: "button",
            className: `strip-dest-card strip-dest-card--${dest.id}`,
            onclick: () => {
              const res = travelByLimo(s, dest.id, { mode: rideFlavor });
              if (!res.ok) {
                showStatus(res.message, "error");
                render();
                return;
              }
              showStatus(res.message, "success");
              persist();
              navigateTo("hub");
            },
          }, [
            el("span", { className: "strip-dest-name", textContent: dest.limoLabel }),
            el("span", { className: "strip-dest-tag", textContent: dest.tagline }),
            el("span", {
              className: "strip-dest-fare",
              textContent: `${modeLabel} · Fare: ${fareLabel} · ${dest.exclusiveSlotIds.length} exclusive slot(s)`,
            }),
          ]);
        })
      : [
          el("p", {
            className: "dim",
            textContent: "Unlock via room-phone limo / private driver, or Call Uber / Lyft from MGM Rewards Connect.",
          }),
          menuBtn("Go to room phone", () => {
            pushView("hotel-room-phone");
          }),
        ];

    return el("div", {}, [
      statusBanner(),
      banner("Strip Ride — Limo / Uber / Lyft"),
      chipLine(),
      el("div", { className: "panel hotel-panel strip-limo-panel" }, [
        el("p", {
          className: "subtitle",
          textContent: unlocked
            ? `${modeLabel} ready. You are at ${current.shortName}.`
            : "Dispatch locked — authorize via room phone or Rewards Connect rideshare.",
        }),
        el("p", {
          className: "dim",
          textContent: "Web terminal only — black-car limo or Uber/Lyft flavor, same chip fares. Luxor, Excalibur, Bellagio, and Circa each run five exclusive slots plus branded tables.",
        }),
        isAwayFromHome(s)
          ? el("span", { className: "strip-away-badge", textContent: `Away · ${current.shortName}` })
          : null,
        modeToggle,
        el("div", { className: "strip-dest-list" }, cards),
        el("ul", { className: "menu-list" }, [
          menuBtn("Back", () => goBack(), true),
        ]),
      ]),
    ]);
  }

  return {
    "strip-limo": renderStripLimoDispatch,
  };
}

export {
  applyDestinationTheme,
  casinoDisplayName,
  ensureStripTravel,
  getCurrentDestination,
  isAwayFromHome,
  isLimoUnlocked,
  unlockLimoService,
  travelByLimo,
};
