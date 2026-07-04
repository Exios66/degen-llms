import BootScene from "./scenes/BootScene.js";
import SaveScene from "./scenes/SaveScene.js";
import MapScene from "./scenes/MapScene.js";
import { resolveSessionFromParams } from "./session.js";

const boot = resolveSessionFromParams();

const config = {
  type: Phaser.AUTO,
  width: 960,
  height: 640,
  parent: "game-container",
  backgroundColor: "#0a1628",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, SaveScene, MapScene],
};

const game = new Phaser.Game(config);

game.registry.set("boot", boot);
if (boot.session) {
  game.registry.set("session", boot.session);
}

window.addEventListener("beforeunload", () => {
  const session = game.registry.get("session");
  if (session?.slotId != null) {
    import("./session.js").then(({ saveSession }) => saveSession(session));
  }
});
