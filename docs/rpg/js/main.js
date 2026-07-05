import Phaser from "phaser";
import { OverworldScene } from "./scenes/GameScenes.js";
import { TitleScreen, renderHud } from "./scenes/TitleScreen.js";
import { DialogueManager } from "./systems/DialogueManager.js";
import { SaveAdapter } from "./systems/SaveAdapter.js";
import { BlackjackOverlay, EncounterBridge } from "./systems/EncounterBridge.js";
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from "./systems/MapData.js";
import { RewardsPhone } from "../../js/RewardsPhone.js";
import { syncRewardsFlags } from "../../js/rewards.js";

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

const dialogue = new DialogueManager(dialogueRoot, {
  onFlag: (flag) => {
    saveAdapter?.setFlag(flag);
    if (flag === "redeemed_welcome_drink" && rewardsPhone) {
      const r = rewardsPhone.tracker.ensureRewards();
      if (!r.redeemedComps.includes("welcome_drink")) {
        r.redeemedComps.push("welcome_drink");
        if (saveAdapter?.rpg?.flags) delete saveAdapter.rpg.flags.has_welcome_drink_comp;
      }
    }
    saveAdapter?.persist();
    rewardsPhone?.sync();
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
  dialogue.setFlags(saveAdapter.rpg.flags ?? {});

  rewardsPhone = new RewardsPhone(rewardsRoot, session, {
    onPersist: () => persistAll(),
  });
  rewardsPhone.sync();

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
});
title.show();

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
