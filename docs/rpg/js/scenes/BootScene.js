export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  create() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    g.fillStyle(0x26a69a, 1);
    g.fillCircle(32, 32, 28);
    g.generateTexture("node-default", 64, 64);

    g.clear();
    g.fillStyle(0x7dcfff, 1);
    g.fillCircle(32, 32, 12);
    g.generateTexture("player-marker", 64, 64);

    g.destroy();

    const boot = this.registry.get("boot");
    if (boot?.needsSavePicker) {
      this.scene.start("SaveScene", { createSlotId: boot.createSlotId ?? null });
    } else {
      this.scene.start("MapScene");
    }
  }
}
