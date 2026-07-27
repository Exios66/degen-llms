/**
 * Procedural Web Audio SFX for the MGM Rewards flip phone.
 * Works in both casino web and RPG hosts (separate from RPG AudioManager).
 */

/** @typedef {"classic"|"casino"|"neon"|"soft"|"urgent"} RingtoneId */

/** @type {{ id: RingtoneId, label: string, pattern: { f: number, d: number, type?: OscillatorType, gap?: number }[] }[]} */
export const RINGTONE_CATALOG = [
  {
    id: "classic",
    label: "Classic Flip",
    pattern: [
      { f: 440, d: 0.18, type: "sine" },
      { f: 480, d: 0.18, type: "sine", gap: 0.05 },
      { f: 440, d: 0.18, type: "sine", gap: 0.05 },
    ],
  },
  {
    id: "casino",
    label: "Casino Chime",
    pattern: [
      { f: 523, d: 0.12, type: "triangle" },
      { f: 659, d: 0.12, type: "triangle", gap: 0.04 },
      { f: 784, d: 0.18, type: "triangle", gap: 0.04 },
      { f: 1047, d: 0.1, type: "sine", gap: 0.06 },
    ],
  },
  {
    id: "neon",
    label: "Neon Strip",
    pattern: [
      { f: 880, d: 0.08, type: "square" },
      { f: 660, d: 0.1, type: "square", gap: 0.03 },
      { f: 990, d: 0.14, type: "sawtooth", gap: 0.03 },
    ],
  },
  {
    id: "soft",
    label: "Soft Pulse",
    pattern: [
      { f: 330, d: 0.22, type: "sine" },
      { f: 370, d: 0.22, type: "sine", gap: 0.08 },
      { f: 294, d: 0.28, type: "triangle", gap: 0.08 },
    ],
  },
  {
    id: "urgent",
    label: "Pit Alert",
    pattern: [
      { f: 720, d: 0.09, type: "square" },
      { f: 540, d: 0.09, type: "square", gap: 0.02 },
      { f: 720, d: 0.09, type: "square", gap: 0.02 },
      { f: 540, d: 0.12, type: "square", gap: 0.02 },
    ],
  },
];

const DTMF_FREQS = [
  [697, 1209],
  [697, 1336],
  [770, 1209],
  [770, 1336],
  [852, 1209],
];

export class PhoneAudio {
  constructor() {
    this.ctx = null;
    this.unlocked = false;
    this.gain = null;
    /** @type {(() => void)|null} */
    this._loopStop = null;
    /** Session settings reader — set via bindSession */
    this._getSettings = () => ({ muted: false, ringtoneId: "classic", smsSound: true });
  }

  /**
   * @param {() => { muted?: boolean, ringtoneId?: string, smsSound?: boolean }} getter
   */
  bindSettings(getter) {
    this._getSettings = getter;
  }

  unlock() {
    if (this.unlocked) return;
    const AC = typeof window !== "undefined"
      ? (window.AudioContext || window.webkitAudioContext)
      : null;
    if (!AC) return;
    this.ctx = new AC();
    this.gain = this.ctx.createGain();
    this.gain.gain.value = 0.14;
    this.gain.connect(this.ctx.destination);
    this.unlocked = true;
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  _settings() {
    try {
      return this._getSettings() ?? {};
    } catch {
      return {};
    }
  }

  get muted() {
    return Boolean(this._settings().muted);
  }

  get smsSoundEnabled() {
    const s = this._settings();
    return s.smsSound !== false;
  }

  /** @returns {RingtoneId} */
  get ringtoneId() {
    const id = this._settings().ringtoneId ?? "classic";
    return RINGTONE_CATALOG.some((r) => r.id === id) ? id : "classic";
  }

  stopLoops() {
    if (this._loopStop) {
      this._loopStop();
      this._loopStop = null;
    }
  }

  /**
   * @param {number} freq
   * @param {number} duration
   * @param {OscillatorType} [type]
   * @param {number} [when]
   * @param {number} [volume]
   */
  _beep(freq, duration, type = "sine", when = 0, volume = 0.09) {
    if (!this.unlocked || !this.ctx || !this.gain || this.muted) return;
    const now = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(volume, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(g);
    g.connect(this.gain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  /**
   * Dual-tone multifrequency keypad beep.
   * @param {number} [digitIndex]
   */
  dtmf(digitIndex = 0) {
    if (!this.unlocked || !this.ctx || !this.gain || this.muted) return;
    const pair = DTMF_FREQS[digitIndex % DTMF_FREQS.length];
    const now = this.ctx.currentTime;
    for (const f of pair) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      g.gain.setValueAtTime(0.05, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(g);
      g.connect(this.gain);
      osc.start(now);
      osc.stop(now + 0.14);
    }
  }

  dialTone() {
    this.stopLoops();
    if (!this.unlocked || !this.ctx || !this.gain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 350;
    g.gain.setValueAtTime(0.05, now);
    osc.connect(g);
    g.connect(this.gain);
    osc.start(now);
    const osc2 = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.value = 440;
    g2.gain.setValueAtTime(0.04, now);
    osc2.connect(g2);
    g2.connect(this.gain);
    osc2.start(now);
    const stopAt = now + 0.55;
    g.gain.setValueAtTime(0.05, stopAt - 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, stopAt);
    g2.gain.setValueAtTime(0.04, stopAt - 0.08);
    g2.gain.exponentialRampToValueAtTime(0.001, stopAt);
    osc.stop(stopAt + 0.02);
    osc2.stop(stopAt + 0.02);
  }

  /** Caller-side ringback (US-style cadence). */
  startRingback() {
    this.stopLoops();
    if (!this.unlocked || !this.ctx || !this.gain || this.muted) return;
    const playBurst = () => {
      if (!this.ctx || this.muted) return;
      this._beep(440, 0.35, "sine", 0, 0.06);
      this._beep(480, 0.35, "sine", 0, 0.05);
    };
    playBurst();
    const timer = setInterval(playBurst, 2000);
    this._loopStop = () => clearInterval(timer);
  }

  /** Play selected ringtone preset (preview or incoming flavor). */
  playRingtone(ringtoneId = null) {
    this.stopLoops();
    if (!this.unlocked || !this.ctx || !this.gain || this.muted) return;
    const id = ringtoneId ?? this.ringtoneId;
    const preset = RINGTONE_CATALOG.find((r) => r.id === id) ?? RINGTONE_CATALOG[0];
    let t = 0;
    for (const step of preset.pattern) {
      t += step.gap ?? 0;
      this._beep(step.f, step.d, step.type ?? "sine", t, 0.1);
      t += step.d;
    }
  }

  connect() {
    this.stopLoops();
    this._beep(620, 0.08, "sine", 0, 0.07);
    this._beep(820, 0.1, "triangle", 0.09, 0.06);
  }

  hangup() {
    this.stopLoops();
    this._beep(300, 0.08, "triangle", 0, 0.07);
    this._beep(180, 0.16, "sine", 0.1, 0.05);
  }

  busy() {
    this.stopLoops();
    for (let i = 0; i < 4; i += 1) {
      this._beep(480, 0.2, "square", i * 0.45, 0.05);
    }
  }

  smsSend() {
    if (!this.smsSoundEnabled) return;
    this._beep(980, 0.05, "square", 0, 0.06);
    this._beep(1200, 0.06, "sine", 0.06, 0.05);
  }

  smsReceive() {
    if (!this.smsSoundEnabled) return;
    this._beep(660, 0.07, "sine", 0, 0.07);
    this._beep(880, 0.1, "triangle", 0.08, 0.06);
  }

  /**
   * Full outbound dial sequence: dial tone → DTMF → ringback.
   * Call connect() when the remote party answers.
   */
  playOutboundDialSequence() {
    this.unlock();
    this.dialTone();
    setTimeout(() => {
      this.dtmf(0);
      this.dtmf(2);
      this.dtmf(4);
    }, 400);
    setTimeout(() => this.startRingback(), 750);
  }
}

/** Shared singleton for Rewards Phone hosts. */
export const phoneAudio = new PhoneAudio();
