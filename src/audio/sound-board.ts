/**
 * Sound effects, synthesised in the browser with the Web Audio API (TD-033).
 * Every sound is ORIGINAL: built at runtime from noise bursts, filtered
 * sweeps and pitch-dropping thumps, in the punchy style the owner wants from
 * the Stickman Kombat 2D reference (spec §2) without using any of its audio.
 * No audio files, nothing to license. A small random pitch and level spread
 * keeps repeated hits from sounding identical.
 *
 * Browsers only allow audio after the first user input, so `unlock()` is
 * called on the first key or pointer press. Without Web Audio (tests, old
 * browsers) everything is a silent no-op.
 */
type Ctx = AudioContext;

interface NoiseSpec {
  dur: number;
  gain: number;
  type: BiquadFilterType;
  freq: number;
  freqEnd?: number;
  q?: number;
  attack?: number;
  delay?: number;
}

interface ToneSpec {
  wave: OscillatorType;
  f0: number;
  f1: number;
  dur: number;
  gain: number;
  attack?: number;
  delay?: number;
}

type Layer = { noise: NoiseSpec } | { tone: ToneSpec } | { crackle: { dur: number; gain: number; count: number } };

/** Recipes by sound id (the ids attacks, impact profiles and abilities name). */
const RECIPES: Readonly<Record<string, readonly Layer[]>> = {
  // Bare knuckles, light: a tight slap-crack over a short body thump.
  'punch-light': [
    { tone: { wave: 'sine', f0: 170, f1: 70, dur: 0.07, gain: 0.55 } },
    { noise: { dur: 0.05, gain: 0.55, type: 'bandpass', freq: 2300, q: 1.1 } },
    { noise: { dur: 0.012, gain: 0.3, type: 'highpass', freq: 5000 } },
  ],
  // Bare knuckles, heavy: a deep thud with a crunchy snap on top.
  'punch-heavy': [
    { tone: { wave: 'sine', f0: 125, f1: 38, dur: 0.24, gain: 0.95 } },
    { tone: { wave: 'triangle', f0: 260, f1: 80, dur: 0.1, gain: 0.25 } },
    { noise: { dur: 0.15, gain: 0.7, type: 'lowpass', freq: 1500, freqEnd: 400 } },
    { noise: { dur: 0.035, gain: 0.4, type: 'bandpass', freq: 3200, q: 1.4 } },
  ],
  'kick-heavy': [
    { tone: { wave: 'sine', f0: 105, f1: 36, dur: 0.28, gain: 1 } },
    { noise: { dur: 0.2, gain: 0.6, type: 'lowpass', freq: 1000, freqEnd: 300 } },
    { noise: { dur: 0.05, gain: 0.32, type: 'bandpass', freq: 1900, q: 1.2 } },
  ],
  // Fist on forearms: a dull knock with a hard tick.
  block: [
    { tone: { wave: 'sine', f0: 210, f1: 130, dur: 0.06, gain: 0.35 } },
    { noise: { dur: 0.04, gain: 0.35, type: 'bandpass', freq: 3600, q: 2 } },
  ],
  'fire-hit': [
    { noise: { dur: 0.22, gain: 0.45, type: 'bandpass', freq: 1300, freqEnd: 600, q: 0.8 } },
    { tone: { wave: 'sine', f0: 140, f1: 60, dur: 0.1, gain: 0.4 } },
    { crackle: { dur: 0.25, gain: 0.25, count: 6 } },
  ],
  'fire-charge': [
    { noise: { dur: 0.28, gain: 0.22, type: 'bandpass', freq: 400, freqEnd: 1700, q: 1.5, attack: 0.16 } },
  ],
  'fire-whoosh': [{ noise: { dur: 0.32, gain: 0.38, type: 'lowpass', freq: 350, freqEnd: 2600, attack: 0.05 } }],
  'fire-rush': [
    { noise: { dur: 0.48, gain: 0.42, type: 'lowpass', freq: 300, freqEnd: 2200, attack: 0.06 } },
    { crackle: { dur: 0.45, gain: 0.18, count: 8 } },
  ],
  'fire-burst-small': [
    { noise: { dur: 0.26, gain: 0.5, type: 'lowpass', freq: 2200, freqEnd: 500 } },
    { tone: { wave: 'sine', f0: 95, f1: 48, dur: 0.16, gain: 0.45 } },
    { crackle: { dur: 0.3, gain: 0.2, count: 5 } },
  ],
  'ground-rumble': [
    { noise: { dur: 0.5, gain: 0.5, type: 'lowpass', freq: 320 } },
    { tone: { wave: 'sine', f0: 58, f1: 40, dur: 0.5, gain: 0.4 } },
  ],
  'fire-warning': [{ tone: { wave: 'sawtooth', f0: 280, f1: 640, dur: 0.42, gain: 0.07, attack: 0.1 } }],
  'fire-eruption': [
    { tone: { wave: 'sine', f0: 85, f1: 28, dur: 0.65, gain: 1 } },
    { noise: { dur: 0.75, gain: 0.8, type: 'lowpass', freq: 1400, freqEnd: 300 } },
    { crackle: { dur: 0.7, gain: 0.3, count: 12 } },
  ],
  'fire-roar': [{ noise: { dur: 0.5, gain: 0.42, type: 'bandpass', freq: 500, freqEnd: 900, q: 0.9, attack: 0.2 } }],
  'leap-whoosh': [{ noise: { dur: 0.55, gain: 0.32, type: 'bandpass', freq: 2200, freqEnd: 450, q: 1 } }],
  'meteor-impact': [
    { tone: { wave: 'sine', f0: 75, f1: 24, dur: 1.05, gain: 1.2 } },
    { noise: { dur: 1.1, gain: 1, type: 'lowpass', freq: 1000, freqEnd: 200 } },
    { noise: { dur: 0.08, gain: 0.6, type: 'bandpass', freq: 3000, q: 1 } },
    { crackle: { dur: 1, gain: 0.3, count: 16 } },
  ],
  // KO: a heavy, final boom.
  ko: [
    { tone: { wave: 'sine', f0: 95, f1: 28, dur: 0.65, gain: 1 } },
    { noise: { dur: 0.45, gain: 0.5, type: 'lowpass', freq: 700, freqEnd: 150 } },
  ],
  // Dissolving into dust: a soft rising shimmer of sand.
  dust: [
    { noise: { dur: 1.3, gain: 0.13, type: 'highpass', freq: 3500, freqEnd: 7000, attack: 0.45 } },
    { tone: { wave: 'sine', f0: 900, f1: 2100, dur: 1.0, gain: 0.025, attack: 0.3, delay: 0.1 } },
  ],
};

export function hasSound(id: string): boolean {
  return id in RECIPES;
}

export class SoundBoard {
  private ctx: Ctx | null = null;
  private out: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private unlocked = false;
  muted = false;
  private seed = 7;

  /** Call from a user input event (browsers block audio before one). */
  unlock(): void {
    if (this.unlocked) return;
    const Ctor = typeof window === 'undefined' ? undefined : window.AudioContext;
    if (!Ctor) return;
    this.unlocked = true;
    const ctx = new Ctor();
    const comp = ctx.createDynamicsCompressor(); // stacked hits must not clip
    const master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(comp).connect(ctx.destination);
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = this.rand() * 2 - 1;
    this.ctx = ctx;
    this.out = master;
    this.noise = buffer;
    void ctx.resume();
  }

  play(id: string): void {
    const ctx = this.ctx;
    const out = this.out;
    const recipe = RECIPES[id];
    if (!ctx || !out || !recipe || this.muted) return;
    const t = ctx.currentTime + 0.005;
    const pitch = 0.94 + this.rand() * 0.12;
    const level = 0.88 + this.rand() * 0.24;
    for (const layer of recipe) {
      if ('tone' in layer) this.tone(ctx, out, t, layer.tone, pitch, level);
      else if ('noise' in layer) this.noiseLayer(ctx, out, t, layer.noise, pitch, level);
      else this.crackle(ctx, out, t, layer.crackle, level);
    }
  }

  private envelope(ctx: Ctx, t: number, dur: number, gain: number, attack = 0.002): GainNode {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    return g;
  }

  private tone(ctx: Ctx, out: AudioNode, t0: number, s: ToneSpec, pitch: number, level: number): void {
    const t = t0 + (s.delay ?? 0);
    const osc = ctx.createOscillator();
    osc.type = s.wave;
    osc.frequency.setValueAtTime(s.f0 * pitch, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, s.f1 * pitch), t + s.dur);
    osc.connect(this.envelope(ctx, t, s.dur, s.gain * level, s.attack)).connect(out);
    osc.start(t);
    osc.stop(t + s.dur + 0.02);
  }

  private noiseLayer(ctx: Ctx, out: AudioNode, t0: number, s: NoiseSpec, pitch: number, level: number): void {
    if (!this.noise) return;
    const t = t0 + (s.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = s.type;
    filter.Q.value = s.q ?? 0.7;
    filter.frequency.setValueAtTime(s.freq * pitch, t);
    if (s.freqEnd) filter.frequency.exponentialRampToValueAtTime(s.freqEnd * pitch, t + s.dur);
    src
      .connect(filter)
      .connect(this.envelope(ctx, t, s.dur, s.gain * level, s.attack))
      .connect(out);
    src.start(t, this.rand() * 0.5);
    src.stop(t + s.dur + 0.02);
  }

  /** Fire crackle: a scatter of tiny high clicks. */
  private crackle(
    ctx: Ctx,
    out: AudioNode,
    t0: number,
    s: { dur: number; gain: number; count: number },
    level: number,
  ): void {
    for (let i = 0; i < s.count; i++) {
      this.noiseLayer(
        ctx,
        out,
        t0,
        {
          dur: 0.012 + this.rand() * 0.015,
          gain: s.gain * (0.5 + this.rand()),
          type: 'highpass',
          freq: 3000 + this.rand() * 4000,
          delay: this.rand() * s.dur,
        },
        1,
        level,
      );
    }
  }

  private rand(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
}
