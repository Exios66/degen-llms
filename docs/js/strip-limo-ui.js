/**
 * Strip limo dispatch UI — web terminal only.
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
 *   menuBtn: Function,
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
    el, banner, chipLine, menuBtn, statusBanner, showStatus,
    persist, render, pushView, navigateTo, goBack,
  } = ctx;

  function session() {
    return ctx.session;
  }

  function renderStripLimoDispatch() {
    const s = session();
    ensureStripTravel(s);
    applyDestinationTheme(s);
    const unlocked = isLimoUnlocked(s);
    const current = getCurrentDestination(s);
    const destinations = listLimoDestinations(s);

    const cards = unlocked
      ? destinations.map((dest) => {
          const fareLabel = dest.fare > 0 ? `${dest.fare} chips` : "Complimentary";
          return el("button", {
            type: "button",
            className: `strip-dest-card strip-dest-card--${dest.id}`,
            onclick: () => {
              const res = travelByLimo(s, dest.id);
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
            el("span", { className: "strip-dest-fare", textContent: `Fare: ${fareLabel} · ${dest.exclusiveSlotIds.length} exclusive slot(s)` }),
          ]);
        })
      : [
          el("p", {
            className: "dim",
            textContent: "Call limo / private driver from your hotel room phone to unlock Strip dispatch.",
          }),
          menuBtn("Go to room phone", () => {
            pushView("hotel-room-phone");
          }),
        ];

    return el("div", {}, [
      statusBanner(),
      banner("Strip Limo — Private Driver"),
      chipLine(),
      el("div", { className: "panel hotel-panel strip-limo-panel" }, [
        el("p", {
          className: "subtitle",
          textContent: unlocked
            ? `Black car ready. You are at ${current.shortName}.`
            : "Chauffeur desk — awaiting room-phone authorization.",
        }),
        el("p", {
          className: "dim",
          textContent: "Web terminal only — ride the Strip to Luxor, Excalibur, Bellagio, or Circa. Each property has its own slots, table lighting, and floor vibe.",
        }),
        isAwayFromHome(s)
          ? el("span", { className: "strip-away-badge", textContent: `Away · ${current.shortName}` })
          : null,
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
