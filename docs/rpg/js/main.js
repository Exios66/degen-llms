import Phaser from "phaser";
import { OverworldScene } from "./scenes/GameScenes.js?v=texture-quality-1";
import { TitleScreen, renderHud, renderTrainerCard } from "./scenes/TitleScreen.js";
import { DialogueManager } from "./systems/DialogueManager.js";
import { SaveAdapter } from "./systems/SaveAdapter.js";
import { defaultAppearance } from "./systems/CharacterAppearance.js";
import {
  BlackjackOverlay,
  EncounterBridge,
  RouletteOverlay,
  HoldemOverlay,
  RhythmOverlay,
} from "./systems/EncounterBridge.js";
import { TerminalHostOverlay } from "./systems/TerminalHostOverlay.js";
import { QuestManager } from "./systems/QuestManager.js";
import { MenuOverlay } from "./systems/MenuOverlay.js";
import { loadEggRegistry, syncEggsFromFlags, discoverEgg, eggForFlag } from "./systems/EasterEggs.js";
import { RPG_ITEMS, giveItem } from "./systems/Inventory.js";
import { audioManager } from "./systems/AudioManager.js";
import {
  TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, installWorld, DEFAULT_MAP_ID,
} from "./systems/MapData.js";
import { loadWorld } from "./systems/MapLoader.js";
import { RewardsPhone } from "../../js/RewardsPhone.js";
import { syncRewardsFlags } from "../../js/rewards.js";
import { enterZone, ensurePoolComplex } from "../../js/pool-complex.js";
import { startCasinoClock } from "../../js/casino-time.js";
import { syncContactIntros } from "../../js/phone-contacts.js";
import { recordConsumption, applyIntoxicationEffects } from "../../js/intoxication-effects.js";

const GAME_WIDTH = MAP_WIDTH * TILE_SIZE;
const GAME_HEIGHT = MAP_HEIGHT * TILE_SIZE;

let game = null;
let session = null;
let saveAdapter = null;
let rewardsPhone = null;
let questManager = null;
let encounters = null;
let terminalHost = null;
let menu = null;

const hudRoot = document.getElementById("hud");
const rewardsRoot = document.getElementById("rewards-phone");
const trainerRoot = document.getElementById("trainer-card");
const dialogueRoot = document.getElementById("dialogue-overlay");
const titleRoot = document.getElementById("title-overlay");

const POOL_FLAG_ZONES = {
  pool_wave_pool: "wave_pool",
  pool_shark_reef: "shark_reef",
  pool_beach_rave: "beach_rave",
};

const dialogue = new DialogueManager(dialogueRoot, {
  onItem: (itemId) => {
    if (!session || !giveItem(session, itemId)) return;
    audioManager.sfx("secret");
    dialogue.showSystemMessage(`Got ${RPG_ITEMS[itemId]?.label ?? itemId}. Check your Bag (Esc).`);
    persistAll();
  },
  onFlag: (flag) => {
    saveAdapter?.setFlag(flag);
    if (session) {
      const egg = eggForFlag(flag);
      const found = egg ? discoverEgg(session, egg.id) : null;
      if (found) {
        audioManager.sfx("secret");
        dialogue.showSystemMessage(`Secret found — ${found.label}`);
      }
    }
    if (POOL_FLAG_ZONES[flag] && session) {
      ensurePoolComplex(session);
      enterZone(session, POOL_FLAG_ZONES[flag]);
      saveAdapter?.persist();
    }
    if (flag === "redeemed_welcome_drink" && rewardsPhone) {
      const r = rewardsPhone.tracker.ensureRewards();
      if (!r.redeemedComps.includes("welcome_drink")) {
        r.redeemedComps.push("welcome_drink");
        if (saveAdapter?.rpg?.flags) delete saveAdapter.rpg.flags.has_welcome_drink_comp;
      }
      if (session) recordConsumption(session, "welcome_cocktail", { source: "rpg_bar" });
    }
    saveAdapter?.persist();
    rewardsPhone?.sync();
    if (session) applyIntoxicationEffects(session);
  },
});

function persistAll() {
  rewardsPhone?.tracker.syncFromWallet();
  syncRewardsFlags(session);
  saveAdapter?.persist();
}

function closeHooks() {
  return {
    onClose: () => {
      persistAll();
      renderHud(hudRoot, saveAdapter, questManager);
      rewardsPhone?.sync();
    },
  };
}

async function loadDialogues() {
  const res = await fetch("js/data/dialogues.json");
  if (!res.ok) throw new Error("Failed to load dialogues");
  return res.json();
}

async function loadJson(path, fallback) {
  try {
    const res = await fetch(path);
    if (!res.ok) return fallback;
    return await res.json();
  } catch {
    return fallback;
  }
}

async function startOverworld(activeSession) {
  session = activeSession;
  saveAdapter = new SaveAdapter(session);
  const rpg = saveAdapter.rpg;
  if (!rpg.archetype) rpg.archetype = rpg.playerSprite || "weekend_warrior";
  if (!rpg.appearance) rpg.appearance = defaultAppearance(rpg.archetype);
  if (rpg.worldTime == null) rpg.worldTime = 720;
  if (!rpg.reputation) rpg.reputation = { whales: 0, staff: 0, tourists: 0 };

  if (session.slotId != null) startCasinoClock();
  syncContactIntros(session);
  dialogue.setFlags(rpg.flags ?? {});

  const [dialogues, triggers, questDefs, eggDefs, world] = await Promise.all([
    loadDialogues(),
    loadJson("js/data/triggers.json", []),
    loadJson("js/data/quests.json", null),
    loadJson("js/data/easter_eggs.json", null),
    loadWorld(),
  ]);
  const knownMaps = new Set(installWorld(world));
  // A save can point at a map id that a later world revision dropped.
  if (!knownMaps.has(rpg.mapId)) {
    rpg.mapId = DEFAULT_MAP_ID;
    rpg.x = null;
    rpg.y = null;
  }
  loadEggRegistry(eggDefs);
  syncEggsFromFlags(session);

  questManager = new QuestManager(session, {
    onUpdate: () => {
      persistAll();
      renderHud(hudRoot, saveAdapter, questManager);
    },
    onComplete: (id, def) => {
      audioManager.sfx("win");
      if (def?.rewardItem) giveItem(session, def.rewardItem);
      dialogue.showSystemMessage?.(
        `Quest complete — ${def?.label ?? id}${def?.reward ? ` · ${def.reward}` : ""}`,
        { speaker: "Trainer Card", durationMs: 3200 },
      );
    },
  });
  questManager.loadRegistry(questDefs);
  dialogue.setQuestManager?.(questManager);

  rewardsPhone = new RewardsPhone(rewardsRoot, session, {
    onPersist: () => persistAll(),
  });
  rewardsPhone.sync();
  applyIntoxicationEffects(session);

  const hooks = closeHooks();
  const shake = () => {
    game?.scene?.getScene("OverworldScene")?.cameras?.main?.shake(200, 0.01);
    audioManager.sfx("win");
  };

  const overlays = {
    blackjack: new BlackjackOverlay(document.getElementById("blackjack-overlay"), session, {
      ...hooks,
      onNatural21: shake,
    }),
    roulette: new RouletteOverlay(document.getElementById("roulette-overlay"), session, hooks),
    holdem: new HoldemOverlay(document.getElementById("holdem-overlay"), session, hooks),
    rhythm: new RhythmOverlay(document.getElementById("rhythm-overlay"), session, hooks),
  };

  terminalHost = new TerminalHostOverlay(document.getElementById("terminal-overlay"), session, {
    ...hooks,
    onPersist: () => persistAll(),
    rewardsPhone,
  });

  encounters = new EncounterBridge({
    session,
    overlays,
    terminalHost,
    onPersist: () => persistAll(),
    questManager,
    onEncounterEnd: (encounterId, result) => {
      if (result?.net >= 500) shake();
    },
  });

  menu = new MenuOverlay(document.getElementById("menu-overlay"), session, {
    saveAdapter,
    questManager,
    terminalHost,
    rewardsPhone,
    audio: audioManager,
    onPersist: () => persistAll(),
    onClose: () => {
      renderHud(hudRoot, saveAdapter, questManager);
      game?.scene?.getScene("OverworldScene")?.resumeFromMenu?.();
    },
    onTextSpeed: (speed) => dialogue.setTextSpeed?.(speed),
    onExit: () => {
      const url = session.slotId != null ? `../index.html?slot=${session.slotId}` : "../index.html?guest=1";
      window.location.href = url;
    },
  });
  audioManager.setMuted?.(Boolean(saveAdapter.rpg.options?.muted));
  dialogue.setTextSpeed?.(saveAdapter.rpg.options?.textSpeed ?? "normal");

  renderHud(hudRoot, saveAdapter, questManager);
  dialogue.load(dialogues);

  if (game) {
    game.destroy(true);
    game = null;
  }

  game = new Phaser.Game({
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: "phaser-root",
    backgroundColor: "#0a0812",
    pixelArt: true,
    input: {
      activePointers: 2,
      touch: { capture: true },
      keyboard: {
        capture: [
          "W", "A", "S", "D",
          "UP", "DOWN", "LEFT", "RIGHT",
          "SHIFT", "SPACE", "ENTER", "E",
        ],
      },
    },
    physics: {
      default: "arcade",
      arcade: { gravity: { y: 0 }, debug: false },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [OverworldScene],
  });
  // Debug/test hook for movement and encounter verification
  window.__rpgGame = game;
  window.__rpg = {
    get scene() { return game?.scene?.getScene("OverworldScene") ?? null; },
    session,
    saveAdapter,
    encounters,
    terminalHost,
    questManager,
    dialogue,
    get menu() { return menu; },
  };

  game.scene.start("OverworldScene", {
    session,
    saveAdapter,
    dialogue,
    encounters,
    dialogues,
    triggers,
    questManager,
    audio: audioManager,
    onOpenMenu: (page) => menu?.open(page),
    isMenuOpen: () => Boolean(menu?.isActive()),
    onMapBanner: (label, phaseLabel) => showMapBanner(label, phaseLabel),
    onEgg: (eggId) => {
      if (!discoverEgg(session, eggId)) return;
      audioManager.sfx("secret");
      persistAll();
      renderHud(hudRoot, saveAdapter, questManager);
      questManager?.syncDerived?.();
    },
    onHudUpdate: (opts) => {
      renderHud(hudRoot, saveAdapter, questManager);
      rewardsPhone?.sync();
      if (opts?.trainerCard) {
        renderTrainerCard(trainerRoot, saveAdapter, questManager, {
          onAppearanceChange: () => {
            game?.scene?.getScene("OverworldScene")?.refreshPlayerAppearance?.();
            persistAll();
          },
        });
      }
    },
  });
}

let mapBannerTimer = null;

/** Pokémon-style room placard on every map transition. */
function showMapBanner(label, phaseLabel) {
  const root = document.getElementById("map-banner");
  if (!root) return;
  root.innerHTML = `<strong>${label}</strong>${phaseLabel ? `<span>${phaseLabel}</span>` : ""}`;
  root.hidden = false;
  root.classList.remove("map-banner--out");
  // Restart the CSS animation on back-to-back transitions.
  void root.offsetWidth;
  root.classList.add("map-banner--in");
  clearTimeout(mapBannerTimer);
  mapBannerTimer = setTimeout(() => {
    root.classList.remove("map-banner--in");
    root.classList.add("map-banner--out");
    mapBannerTimer = setTimeout(() => { root.hidden = true; }, 400);
  }, 2200);
}

const title = new TitleScreen(titleRoot, (s) => {
  audioManager.unlock();
  audioManager.playBgm("lobby");
  startOverworld(s).catch((err) => {
    console.error(err);
    alert(`Could not start game: ${err.message}`);
  });
}, parseRpgLaunchParams());
title.show();

function parseRpgLaunchParams() {
  const params = new URLSearchParams(window.location.search);
  const slotRaw = params.get("slot");
  const slotId = slotRaw ? parseInt(slotRaw, 10) : null;
  const chipsRaw = params.get("chips");
  return {
    launchSlotId: slotId >= 1 && slotId <= 5 ? slotId : null,
    launchGuest: params.get("guest") === "1",
    launchArchetype: params.get("archetype"),
    launchChips: chipsRaw ? Math.max(0, parseInt(chipsRaw, 10)) : null,
    skipIntro: params.get("skipIntro") === "1" || Boolean(params.get("archetype")),
  };
}

window.addEventListener("beforeunload", () => {
  persistAll();
});

document.addEventListener("keydown", (e) => {
  // Keep arrow keys / space from scrolling the page while playing
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
    if (titleRoot.hidden !== false) e.preventDefault();
  }
  if (e.key === "p" || e.key === "P") {
    if (titleRoot.hidden === false) return;
    if (dialogue.isActive?.()) return;
    if (encounters?.isAnyActive?.()) return;
    rewardsPhone?.toggle();
    e.preventDefault();
  }
});
