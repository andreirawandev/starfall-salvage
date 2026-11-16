// Starfall Salvage — synthesized sound effects.
// Every sound is an oscillator (or a short noise burst) built with the
// Web Audio API, so the game ships no audio files at all. Audio starts
// only after the player's first input, as browsers require.

const hasAudio = typeof window !== 'undefined' && (
  typeof window.AudioContext !== 'undefined' ||
  typeof window.webkitAudioContext !== 'undefined'
);

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }

  // Call from the first user gesture; creating the context earlier is
  // refused by browsers and pointless.
  unlock() {
    if (!hasAudio || this.ctx) return;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.32;
    this.master.connect(this.ctx.destination);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.32;
    return this.muted;
  }

  tone({ type = 'sine', from = 440, to = 440, dur = 0.12, vol = 0.5, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise({ dur = 0.25, vol = 0.5, low = 400, high = 2400 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = (low + high) / 2;
    filter.Q.value = 0.8;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  shoot() {
    this.tone({ type: 'square', from: 880, to: 520, dur: 0.07, vol: 0.16 });
  }

  enemyHit() {
    this.tone({ type: 'triangle', from: 320, to: 180, dur: 0.08, vol: 0.25 });
  }

  explosion(big = false) {
    this.noise({ dur: big ? 0.45 : 0.28, vol: big ? 0.6 : 0.4 });
    this.tone({ type: 'sawtooth', from: 160, to: 40, dur: big ? 0.4 : 0.25, vol: 0.3 });
  }

  pickup(combo = 1) {
    const base = 660 * (1 + Math.min(combo, 8) * 0.06);
    this.tone({ type: 'sine', from: base, to: base * 1.5, dur: 0.1, vol: 0.3 });
  }

  hurt() {
    this.tone({ type: 'sawtooth', from: 220, to: 55, dur: 0.35, vol: 0.5 });
    this.noise({ dur: 0.2, vol: 0.3, low: 200, high: 900 });
  }

  waveClear() {
    [523, 659, 784, 1047].forEach((f, i) => {
      this.tone({ type: 'sine', from: f, to: f, dur: 0.16, vol: 0.3, delay: i * 0.09 });
    });
  }

  upgrade() {
    [392, 523, 659].forEach((f, i) => {
      this.tone({ type: 'triangle', from: f, to: f, dur: 0.12, vol: 0.3, delay: i * 0.07 });
    });
  }

  gameOver() {
    [392, 330, 262, 196].forEach((f, i) => {
      this.tone({ type: 'triangle', from: f, to: f * 0.94, dur: 0.28, vol: 0.32, delay: i * 0.16 });
    });
  }

  click() {
    this.tone({ type: 'sine', from: 1200, to: 900, dur: 0.05, vol: 0.2 });
  }
}
