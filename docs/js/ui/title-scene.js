/**
 * Cabinet-style attract / title scene for the web terminal.
 * Mirrors the pixel RPG intro cadence: cinematic hold → fade out → save library.
 */
import { CASINO_NAME } from "../core.js";

const INTRO_AUTO_MS = 3400;
const INTRO_OUT_MS = 480;

const TOUCH = typeof window !== "undefined"
  && (window.matchMedia?.("(pointer: coarse)")?.matches || "ontouchstart" in window);

/**
 * @param {{ el: Function, pushView?: Function }} ctx
 * @param {{ onComplete: () => void }} opts
 */
export function buildTitleSceneRenderer(ctx, opts) {
  const { el } = ctx;
  const { onComplete } = opts;

  return function renderTitleIntro() {
    let finished = false;
    let timer = null;

    const finish = () => {
      if (finished) return;
      finished = true;
      document.removeEventListener("keydown", onKey);
      root.removeEventListener("click", onSkip);
      root.removeEventListener("touchend", onSkip);
      if (timer != null) clearTimeout(timer);
      const scene = root.querySelector(".cabinet-title");
      if (scene) scene.classList.add("cabinet-title--out");
      setTimeout(() => onComplete(), scene ? INTRO_OUT_MS : 0);
    };

    const onKey = (e) => {
      if (e.key !== "Enter" && e.key !== " " && e.key !== "Escape") return;
      e.preventDefault();
      finish();
    };
    const onSkip = (e) => {
      e.preventDefault();
      finish();
    };

    const root = el("div", {
      className: "cabinet-title-root",
      role: "dialog",
      "aria-label": `${CASINO_NAME} title screen`,
    }, [
      el("div", { className: "cabinet-title", "aria-hidden": "false" }, [
        el("div", { className: "cabinet-title-bezel", "aria-hidden": "true" }, [
          el("div", { className: "cabinet-title-marquee" }, [
            el("span", { className: "cabinet-title-marquee-text", textContent: "THE MANDALAY BAY" }),
          ]),
          el("div", { className: "cabinet-title-screen" }, [
            el("div", { className: "cabinet-title-felt", "aria-hidden": "true" }),
            el("div", { className: "cabinet-title-scanlines", "aria-hidden": "true" }),
            el("div", { className: "cabinet-title-glow", "aria-hidden": "true" }),
            el("div", { className: "cabinet-title-content" }, [
              el("p", { className: "cabinet-title-eyebrow", textContent: "Welcome to" }),
              el("h1", { className: "cabinet-title-logo", textContent: CASINO_NAME }),
              el("div", { className: "cabinet-title-rule", "aria-hidden": "true" }),
              el("p", {
                className: "cabinet-title-tagline",
                textContent: "Digital Table Games · Cabinet Edition",
              }),
              el("ul", { className: "cabinet-title-games", "aria-hidden": "true" }, [
                el("li", { textContent: "BLACKJACK" }),
                el("li", { textContent: "HOLD'EM" }),
                el("li", { textContent: "ROULETTE" }),
                el("li", { textContent: "SLOTS" }),
              ]),
              el("p", {
                className: "cabinet-title-hint",
                textContent: TOUCH ? "Tap to enter the floor" : "Press Start · Enter or click",
              }),
            ]),
            el("div", { className: "cabinet-title-suits", "aria-hidden": "true" }, [
              el("span", { className: "suit suit-a", textContent: "♠" }),
              el("span", { className: "suit suit-b", textContent: "♥" }),
              el("span", { className: "suit suit-c", textContent: "♦" }),
              el("span", { className: "suit suit-d", textContent: "♣" }),
            ]),
            el("div", { className: "cabinet-title-chips", "aria-hidden": "true" }, [
              el("span", { className: "chip-disk chip-a" }),
              el("span", { className: "chip-disk chip-b" }),
              el("span", { className: "chip-disk chip-c" }),
            ]),
          ]),
          el("div", { className: "cabinet-title-rail", "aria-hidden": "true" }, [
            el("span", { className: "cabinet-title-rail-lamp" }),
            el("span", { className: "cabinet-title-rail-lamp" }),
            el("span", { className: "cabinet-title-rail-lamp" }),
            el("span", { className: "cabinet-title-rail-lamp" }),
            el("span", { className: "cabinet-title-rail-lamp" }),
          ]),
        ]),
      ]),
    ]);

    requestAnimationFrame(() => {
      root.querySelector(".cabinet-title")?.classList.add("cabinet-title--play");
    });

    document.addEventListener("keydown", onKey);
    root.addEventListener("click", onSkip);
    root.addEventListener("touchend", onSkip, { passive: false });
    timer = setTimeout(finish, INTRO_AUTO_MS);

    return root;
  };
}

/** True when the URL asks to skip the attract title (deep links, testing). */
export function shouldSkipCasinoTitle() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("skipIntro") === "1" || params.get("skipTitle") === "1";
  } catch {
    return false;
  }
}
