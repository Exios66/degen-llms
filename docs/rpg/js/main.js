import Phaser from "phaser";
import { OverworldScene } from "./scenes/GameScenes.js";
import { TitleScreen, renderHud } from "./scenes/TitleScreen.js";
import { DialogueManager } from "./systems/DialogueManager.js";
import { SaveAdapter } from "./systems/SaveAdapter.js";
import { BlackjackOverlay, EncounterBridge } from "./systems/EncounterBridge.js";
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from "./systems/MapData.js";

const GAME_WIDTH = MAP_WIDTH * TILE_SIZE;
const GAME_HEIGHT = MAP_HEIGHT * TILE_SIZE;

let game = null;
let session = null;
let saveAdapter = null;

const hudRoot = document.getElementById("hud");
const dialogueRoot = document.getElementById("dialogue-overlay");
const blackjackRoot = document.getElementById("blackjack-overlay");
const titleRoot = document.getElementById("title-overlay");

const dialogue = new DialogueManager(dialogueRoot, {
  onFlag: (flag) => {
    saveAdapter?.setFlag(flag);
    saveAdapter?.persist();
  },
});

let blackjack = null;
let encounters = null;

async function loadDialogues() {
  const res = await fetch("js/data/dialogues.json");
  if (!res.ok) throw new Error("Failed to load dialogues");
  return res.json();
}

async function startOverworld(activeSession) {
  session = activeSession;
  saveAdapter = new SaveAdapter(session);
  dialogue.setFlags(saveAdapter.rpg.flags ?? {});

  blackjack = new BlackjackOverlay(blackjackRoot, session, {
    onClose: () => renderHud(hudRoot, saveAdapter),
  });

  encounters = new EncounterBridge({
    session,
    blackjack,
    onPersist: () => saveAdapter.persist(),
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
    onHudUpdate: () => renderHud(hudRoot, saveAdapter),
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
  saveAdapter?.persist();
});
