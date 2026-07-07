import Phaser from "phaser";
import { OverworldScene } from "./scenes/GameScenes.js";
import { TitleScreen, renderHud } from "./scenes/TitleScreen.js";
import { DialogueManager } from "./systems/DialogueManager.js";
import { SaveAdapter } from "./systems/SaveAdapter.js";
import { BlackjackOverlay, EncounterBridge } from "./systems/EncounterBridge.js";
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

const hudRoot = document.getElementById("hud");
const rewardsRoot = document.getElementById("rewards-phone");
const dialogueRoot = document.getElementById("dialogue-overlay");
const blackjackRoot = document.getElementById("blackjack-overlay");
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

let blackjack = null;
let encounters = null;

function persistAll() {
  rewardsPhone?.tracker.syncFromWallet();
  syncRewardsFlags(session);
  saveAdapter?.persist();
}

async function loadDialogues() {
  const res = await fetch("js/data/dialogues.json");
  if (!res.ok) throw new Error("Failed to load dialogues");
  return res.json();
}

async function startOverworld(activeSession) {
  session = activeSession;
  saveAdapter = new SaveAdapter(session);
  if (session.slotId != null) startCasinoClock();
  syncContactIntros(session);
  dialogue.setFlags(saveAdapter.rpg.flags ?? {});

  rewardsPhone = new RewardsPhone(rewardsRoot, session, {
    onPersist: () => persistAll(),
  });
  rewardsPhone.sync();
  applyIntoxicationEffects(session);

  blackjack = new BlackjackOverlay(blackjackRoot, session, {
    onClose: () => {
      persistAll();
      renderHud(hudRoot, saveAdapter);
      rewardsPhone?.sync();
    },
  });

  encounters = new EncounterBridge({
    session,
    blackjack,
    onPersist: () => persistAll(),
  });

  renderHud(hudRoot, saveAdapter);

  const dialogues = await loadDialogues();
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

  game.scene.start("OverworldScene", {
    session,
    saveAdapter,
    dialogue,
    encounters,
    dialogues,
    rewardsPhone,
    onHudUpdate: () => {
      renderHud(hudRoot, saveAdapter);
      rewardsPhone?.sync();
    },
  });
}

const title = new TitleScreen(titleRoot, (s) => {
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
  if (e.key === "p" || e.key === "P") {
    if (titleRoot.hidden === false) return;
    if (dialogue.isActive?.()) return;
    if (blackjack?.isActive()) return;
    rewardsPhone?.toggle();
    e.preventDefault();
  }
});
