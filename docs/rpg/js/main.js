import Phaser from "phaser";
import { OverworldScene } from "./scenes/GameScenes.js?v=gfx-move-5";
import { TitleScreen, renderHud, renderTrainerCard } from "./scenes/TitleScreen.js";
import { DialogueManager } from "./systems/DialogueManager.js";
import { SaveAdapter } from "./systems/SaveAdapter.js";
import {
  BlackjackOverlay,
  EncounterBridge,
  RouletteOverlay,
  HoldemOverlay,
  SlotsOverlay,
  SportsbookOverlay,
  HorseRacingOverlay,
  EquestrianOverlay,
  PoolOverlay,
  HotelOverlay,
  AmenitiesOverlay,
  CashierOverlay,
  RhythmOverlay,
} from "./systems/EncounterBridge.js";
import { QuestManager } from "./systems/QuestManager.js";
import { audioManager } from "./systems/AudioManager.js";
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from "./systems/MapData.js";
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
  onFlag: (flag) => {
    saveAdapter?.setFlag(flag);
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

async function loadTriggers() {
  try {
    const res = await fetch("js/data/triggers.json");
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function startOverworld(activeSession) {
  session = activeSession;
  saveAdapter = new SaveAdapter(session);
  const rpg = saveAdapter.rpg;
  if (!rpg.archetype) rpg.archetype = rpg.playerSprite || "weekend_warrior";
  if (rpg.worldTime == null) rpg.worldTime = 720;
  if (!rpg.reputation) rpg.reputation = { whales: 0, staff: 0, tourists: 0 };

  if (session.slotId != null) startCasinoClock();
  syncContactIntros(session);
  dialogue.setFlags(rpg.flags ?? {});

  questManager = new QuestManager(session, {
    onUpdate: () => {
      persistAll();
      renderHud(hudRoot, saveAdapter, questManager);
    },
  });
  questManager.start("shark_photos", 5);
  questManager.start("dana_lucky_hand", 1);
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
    slots: new SlotsOverlay(document.getElementById("slots-overlay"), session, {
      ...hooks,
      onBigWin: shake,
    }),
    sportsbook: new SportsbookOverlay(document.getElementById("sportsbook-overlay"), session, hooks),
    horse_racing: new HorseRacingOverlay(document.getElementById("racing-overlay"), session, hooks),
    dressage: new EquestrianOverlay(document.getElementById("dressage-overlay"), session, hooks, "dressage"),
    jumper: new EquestrianOverlay(document.getElementById("jumper-overlay"), session, hooks, "jumper"),
    hotel: new HotelOverlay(document.getElementById("hotel-overlay"), session, hooks),
    pool: new PoolOverlay(document.getElementById("pool-overlay"), session, {
      ...hooks,
      onSharkPhoto: (speciesId) => {
        questManager.advance("shark_photos");
        if (questManager.isComplete("shark_photos")) {
          audioManager.sfx("secret");
        }
      },
    }),
    amenities: new AmenitiesOverlay(document.getElementById("amenities-overlay"), session, hooks),
    cashier: new CashierOverlay(document.getElementById("cashier-overlay"), session, hooks),
    rhythm: new RhythmOverlay(document.getElementById("rhythm-overlay"), session, hooks),
  };

  encounters = new EncounterBridge({
    session,
    overlays,
    onPersist: () => persistAll(),
    questManager,
  });

  renderHud(hudRoot, saveAdapter, questManager);

  const [dialogues, triggers] = await Promise.all([loadDialogues(), loadTriggers()]);
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
  // Debug/test hook for movement verification
  window.__rpgGame = game;

  game.scene.start("OverworldScene", {
    session,
    saveAdapter,
    dialogue,
    encounters,
    dialogues,
    triggers,
    questManager,
    audio: audioManager,
    onHudUpdate: (opts) => {
      renderHud(hudRoot, saveAdapter, questManager);
      rewardsPhone?.sync();
      if (opts?.trainerCard) {
        renderTrainerCard(trainerRoot, saveAdapter, questManager);
      }
    },
  });
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
  return {
    launchSlotId: slotId >= 1 && slotId <= 5 ? slotId : null,
    launchGuest: params.get("guest") === "1",
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
