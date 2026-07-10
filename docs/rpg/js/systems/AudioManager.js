/**
 * Procedural Web Audio BGM / SFX for the RPG (no external files).
 */
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.unlocked = false;
    this.currentLoop = null;
    this.gain = null;
    this.muted = false;
  }

  unlock() {
    if (this.unlocked) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.gain = this.ctx.createGain();
    this.gain.gain.value = 0.12;
    this.gain.connect(this.ctx.destination);
    this.unlocked = true;
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.gain) this.gain.gain.value = m ? 0 : 0.12;
  }

  /**
   * @param {"title"|"lobby"|"casino"|"encounter"|"victory"|"secret"} track
   */
  playBgm(track) {
    if (!this.unlocked || !this.ctx || this.muted) return;
    this.stopBgm();
    const freqs = {
      title: [196, 247, 294, 330],
      lobby: [220, 277, 330, 370],
      casino: [165, 196, 247, 294],
      encounter: [130, 164, 196, 246],
      victory: [262, 330, 392, 523],
      secret: [110, 138, 164, 207],
    }[track] ?? [220, 277, 330];

    const oscs = [];
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = i % 2 === 0 ? "triangle" : "sine";
      osc.frequency.value = f;
      g.gain.value = 0.04 / (i + 1);
      osc.connect(g);
      g.connect(this.gain);
      osc.start();
      oscs.push({ osc, g });
    });

    let step = 0;
    const timer = setInterval(() => {
      if (!this.currentLoop || this.currentLoop.timer !== timer) return;
      step += 1;
      oscs.forEach(({ osc }, i) => {
        const base = freqs[(step + i) % freqs.length];
        osc.frequency.setTargetAtTime(base, this.ctx.currentTime, 0.05);
      });
    }, 900);

    this.currentLoop = {
      timer,
      stop: () => {
        clearInterval(timer);
        oscs.forEach(({ osc }) => { try { osc.stop(); } catch (_) {} });
      },
    };
  }

  stopBgm() {
    if (this.currentLoop) {
      this.currentLoop.stop();
      this.currentLoop = null;
    }
  }

  /**
   * @param {"foot_lobby"|"foot_carpet"|"win"|"secret"|"click"} kind
   */
  sfx(kind) {
    if (!this.unlocked || !this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const now = this.ctx.currentTime;
    const map = {
      foot_lobby: { f: 180, d: 0.05, type: "square" },
      foot_carpet: { f: 120, d: 0.06, type: "triangle" },
      win: { f: 520, d: 0.25, type: "sine" },
      secret: { f: 880, d: 0.35, type: "sine" },
      click: { f: 400, d: 0.04, type: "square" },
    };
    const cfg = map[kind] ?? map.click;
    osc.type = cfg.type;
    osc.frequency.value = cfg.f;
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + cfg.d);
    osc.connect(g);
    g.connect(this.gain);
    osc.start(now);
    osc.stop(now + cfg.d + 0.02);
  }

  bgmForMap(mapId) {
    if (mapId === "main_resort") return "casino";
    if (mapId === "foundation_room") return "secret";
    if (mapId === "house_of_blues") return "encounter";
    return "lobby";
  }
}

export const audioManager = new AudioManager();
