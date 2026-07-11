/**
 * Phaser 3.80 ESM has no default export. Re-export the namespace as default
 * so `import Phaser from "phaser"` works under the RPG import map.
 */
import * as PhaserNS from "https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.esm.js";

const Phaser = PhaserNS.default ?? PhaserNS;
export default Phaser;
