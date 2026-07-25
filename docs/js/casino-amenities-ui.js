import {
  MALL_NAME, MALL_TAGLINE, FLAGSHIP_DESIGNER_STORES, MANDALAY_PLACE_STORES,
  CASINO_BARS, ensureAmenities, purchaseShopItem, orderBarDrink, listPurchasedItems,
  barForDrink, getStoreById, getBarById,
} from "./casino-amenities.js";
import { fmtChips } from "./core.js";

/**
 * Casino floor amenities UI — shopping mall and full-service bars.
 * @param {object} ctx
 */
export function buildAmenitiesRenderers(ctx) {
  const {
    session, pushView, goBack, navigateTo, persist, render, el, banner, chipLine, statusBanner, showStatus,
  } = ctx;

  function menuBtn(label, onclick, isBack = false) {
    return el("li", {}, [
      el("button", {
        className: "menu-btn" + (isBack ? " back" : ""),
        innerHTML: label,
        onclick,
      }),
    ]);
  }

  function appendResult(log, result) {
    log.appendChild(el("div", {
      className: `line ${result.ok ? "success" : "error"}`,
      textContent: result.message,
    }));
  }

  function renderCasinoFloor() {
    return el("div", {}, [
      statusBanner(),
      banner("Casino Floor"),
      chipLine(),
      el("div", { className: "panel amenities-panel" }, [
        el("p", { className: "subtitle", textContent: "Mandalay Bay casino carpet" }),
        el("p", { className: "dim", textContent: "Gaming, designer shopping, and full-service bars — all within steps on the floor." }),
        el("ul", { className: "menu-list" }, [
          menuBtn(`<span class="num">1)</span> ${MALL_NAME}`, () => pushView("mall-lobby")),
          menuBtn("<span class=\"num\">2)</span> Full Service Bar — choose your lounge", () => pushView("bar-select")),
          menuBtn("<span class=\"num\">3)</span> View shopping bag", () => pushView("mall-bag")),
          menuBtn(`<span class="num">4)</span> High Limit Salon <span class="dim">(10,000+ chips, high-limit tier)</span>`, () => pushView("high-limit-salon")),
          menuBtn(`<span class="num">5)</span> Foundation Room <span class="dim">(Noir lounge)</span>`, () => pushView("foundation-room")),
          menuBtn('<span class="num">0)</span> Back', goBack, true),
        ]),
      ]),
    ]);
  }

  function renderMallLobby() {
    return el("div", {}, [
      statusBanner(),
      banner(MALL_NAME),
      chipLine(),
      el("div", { className: "panel amenities-panel" }, [
        el("p", { className: "dim", textContent: MALL_TAGLINE }),
        el("ul", { className: "menu-list" }, [
          menuBtn("<span class=\"num\">1)</span> Flagship Designer Row <span class=\"dim\">(casino floor)</span>", () => pushView("mall-zone", { zone: "flagship" })),
          menuBtn("<span class=\"num\">2)</span> Mandalay Place boutiques <span class=\"dim\">(sky bridge)</span>", () => pushView("mall-zone", { zone: "place" })),
          menuBtn("<span class=\"num\">3)</span> View shopping bag", () => pushView("mall-bag")),
          menuBtn('<span class="num">0)</span> Back', goBack, true),
        ]),
      ]),
    ]);
  }

  function renderMallZone({ zone }) {
    const stores = zone === "flagship" ? FLAGSHIP_DESIGNER_STORES : MANDALAY_PLACE_STORES;
    const title = zone === "flagship" ? "Flagship Designer Row" : "Mandalay Place";
    return el("div", {}, [
      statusBanner(),
      banner(title),
      chipLine(),
      el("div", { className: "panel amenities-panel" }, [
        el("p", { className: "dim", textContent: zone === "flagship"
          ? "Luxury flagships open directly onto the casino carpet."
          : "Eclectic boutiques on the sky bridge to Luxor." }),
        el("ul", { className: "menu-list" }, [
          ...stores.map((store, i) => menuBtn(
            `<span class="num">${i + 1})</span> <strong>${store.name}</strong><br><span class="dim" style="padding-left:1.75rem;font-size:0.85rem;">${store.tagline}</span>`,
            () => pushView("mall-store", { storeId: store.id }),
          )),
          menuBtn('<span class="num">0)</span> Back', goBack, true),
        ]),
      ]),
    ]);
  }

  function renderMallStore({ storeId }) {
    const store = getStoreById(storeId);
    if (!store) return el("div", { className: "panel" }, [
      el("p", { className: "error", textContent: "Store not found." }),
      el("ul", { className: "menu-list" }, [menuBtn('<span class="num">0)</span> Back', goBack, true)]),
    ]);
    const amenities = ensureAmenities(session);
    const log = el("div", { className: "log-area" });

    return el("div", {}, [
      statusBanner(),
      banner(store.name),
      chipLine(),
      el("div", { className: "panel amenities-panel" }, [
        el("p", { className: "dim", textContent: store.zone }),
        el("p", { textContent: store.tagline }),
        log,
        el("ul", { className: "menu-list store-items" }, [
          ...store.items.map((item, i) => {
            const owned = amenities.purchasedItems.includes(item.id);
            return menuBtn(
              `<span class="num">${i + 1})</span> ${item.name} — ${fmtChips(item.price)}${owned ? ' <span class="success">[owned]</span>' : ""}<br><span class="dim" style="padding-left:1.75rem;font-size:0.85rem;">${item.description}</span>`,
              () => {
                const result = purchaseShopItem(session, item.id);
                appendResult(log, result);
                if (result.ok) {
                  showStatus(result.message);
                  persist();
                  render();
                }
              },
            );
          }),
          menuBtn('<span class="num">0)</span> Back', goBack, true),
        ]),
        el("p", { className: "footer-note dim", textContent: "All purchases tendered in chips at the register." }),
      ]),
    ]);
  }

  function renderMallBag() {
    const purchased = listPurchasedItems(session);
    const amenities = ensureAmenities(session);
    const items = purchased.length
      ? purchased.map(({ item, store }) =>
        el("p", { textContent: `• ${item.name} from ${store.name} — ${fmtChips(item.price)}` }))
      : [el("p", { className: "dim", textContent: "Your bag is empty — browse The Shoppes at Mandalay Place." })];

    const barLines = amenities.barOrders.slice(-10).map((drinkId) => {
      const bar = barForDrink(drinkId);
      const drink = bar?.drinks.find((d) => d.id === drinkId);
      return drink && bar
        ? el("p", { textContent: `• ${drink.name} @ ${bar.name}` })
        : null;
    }).filter(Boolean);

    return el("div", {}, [
      banner("Shopping Bag"),
      chipLine(),
      el("div", { className: "panel amenities-panel" }, [
        el("p", { className: "subtitle", textContent: "Purchases (paid in chips)" }),
        ...items,
        barLines.length ? el("p", { className: "subtitle", textContent: "Recent bar orders" }) : null,
        ...barLines,
        el("ul", { className: "menu-list" }, [
          menuBtn("Back", goBack, true),
        ]),
      ]),
    ]);
  }

  function renderBarSelect() {
    return el("div", {}, [
      statusBanner(),
      banner("Full Service Bar"),
      chipLine(),
      el("div", { className: "panel amenities-panel" }, [
        el("p", { className: "subtitle", textContent: "Three lounges on the Mandalay Bay casino floor" }),
        el("p", { className: "dim", textContent: "Pick where you'd like to drink — mirroring the real property layout." }),
        el("ul", { className: "menu-list" }, [
          ...CASINO_BARS.map((bar, i) => menuBtn(
            `<span class="num">${i + 1})</span> <strong>${bar.name}</strong><br><span class="dim" style="padding-left:1.75rem;font-size:0.85rem;">${bar.location}</span>`,
            () => pushView("bar-menu", { barId: bar.id }),
          )),
          menuBtn('<span class="num">0)</span> Back', goBack, true),
        ]),
      ]),
    ]);
  }

  function renderBarMenu({ barId }) {
    const bar = getBarById(barId);
    if (!bar) return el("div", { className: "panel" }, [
      el("p", { className: "error", textContent: "Bar not found." }),
      el("ul", { className: "menu-list" }, [menuBtn('<span class="num">0)</span> Back', goBack, true)]),
    ]);
    const log = el("div", { className: "log-area" });

    return el("div", {}, [
      statusBanner(),
      banner(bar.name),
      chipLine(),
      el("div", { className: "panel amenities-panel" }, [
        el("p", { className: "dim", textContent: bar.location }),
        el("p", { textContent: bar.vibe }),
        log,
        el("ul", { className: "menu-list" }, [
          ...bar.drinks.map((drink, i) => menuBtn(
            `<span class="num">${i + 1})</span> ${drink.name} — ${fmtChips(drink.price)}<br><span class="dim" style="padding-left:1.75rem;font-size:0.85rem;">${drink.description}</span>`,
            () => {
              const result = orderBarDrink(session, drink.id);
              appendResult(log, result);
              if (result.ok) {
                showStatus(result.message);
                persist();
                render();
              }
            },
          )),
          menuBtn("Choose another bar", () => navigateTo("bar-select")),
          menuBtn('<span class="num">0)</span> Back to casino floor', () => navigateTo("casino-floor"), true),
        ]),
        el("p", { className: "footer-note dim", textContent: "Full service — drinks tendered in chips." }),
      ]),
    ]);
  }

  return {
    "casino-floor": renderCasinoFloor,
    "mall-lobby": renderMallLobby,
    "mall-zone": renderMallZone,
    "mall-store": renderMallStore,
    "mall-bag": renderMallBag,
    "bar-select": renderBarSelect,
    "bar-menu": renderBarMenu,
  };
}
