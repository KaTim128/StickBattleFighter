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
  /** Flame turbulence: the level trembles this many times a second (fire roars, owner 11/11/2026). */
  flutter?: number;
  /** Grit: overdrive the layer (0..1) for a rougher, angrier roar. */
  drive?: number;
}

interface ToneSpec {
  wave: OscillatorType;
  f0: number;
  f1: number;
  dur: number;
  gain: number;
  attack?: number;
  delay?: number;
  /** Grit: overdrive the tone (0..1), e.g. a growling roar under a meteor. */
  drive?: number;
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
  // A second light punch with a drier, higher slap (variety, TD-039 audio profiles).
  'punch-light-b': [
    { tone: { wave: 'sine', f0: 190, f1: 85, dur: 0.06, gain: 0.5 } },
    { noise: { dur: 0.045, gain: 0.5, type: 'bandpass', freq: 2900, q: 1.4 } },
    { noise: { dur: 0.01, gain: 0.25, type: 'highpass', freq: 6000 } },
  ],
  // A light kick: a flat, slapping thump (shin on body).
  'kick-light': [
    { tone: { wave: 'sine', f0: 140, f1: 60, dur: 0.11, gain: 0.6 } },
    { noise: { dur: 0.07, gain: 0.45, type: 'lowpass', freq: 1800, freqEnd: 600 } },
  ],
  // Parry: a bright, ringing deflection.
  parry: [
    { tone: { wave: 'triangle', f0: 1400, f1: 1350, dur: 0.25, gain: 0.18 } },
    { noise: { dur: 0.03, gain: 0.35, type: 'bandpass', freq: 4000, q: 2 } },
  ],
  // Movement: soft footfalls, a jump push-off and a landing thud.
  footstep: [
    { tone: { wave: 'sine', f0: 95, f1: 60, dur: 0.05, gain: 0.12 } },
    { noise: { dur: 0.03, gain: 0.06, type: 'lowpass', freq: 900 } },
  ],
  jump: [{ noise: { dur: 0.14, gain: 0.16, type: 'bandpass', freq: 700, freqEnd: 1600, q: 1, attack: 0.03 } }],
  land: [
    { tone: { wave: 'sine', f0: 110, f1: 55, dur: 0.1, gain: 0.35 } },
    { noise: { dur: 0.06, gain: 0.18, type: 'lowpass', freq: 800 } },
  ],
  // A body slamming into a wall.
  'wall-thud': [
    { tone: { wave: 'sine', f0: 80, f1: 40, dur: 0.22, gain: 0.8 } },
    { noise: { dur: 0.12, gain: 0.45, type: 'lowpass', freq: 700 } },
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
  /*
   * FIRE (owner, 11/11/2026: "firebolt sounds like a wooden plank"; reference whooshes studied
   * for their shape only, no audio used). A fire sound is a ROAR, not a knock: band-limited noise
   * that swells in over 0.1–0.4 s, sits low (150–700 Hz), trembles like a flame (`flutter`), and
   * leaves a crackle and a sizzling tail. Bigger fury = longer swell, deeper boom, more grit.
   */
  'fire-hit': [
    { tone: { wave: 'sine', f0: 130, f1: 50, dur: 0.16, gain: 0.55 } },
    { noise: { dur: 0.4, gain: 0.55, type: 'bandpass', freq: 650, freqEnd: 240, q: 0.7, attack: 0.02, flutter: 24 } },
    { noise: { dur: 0.3, gain: 0.12, type: 'highpass', freq: 3500, attack: 0.05, delay: 0.08 } },
    { crackle: { dur: 0.4, gain: 0.25, count: 9 } },
  ],
  // Inferno's fists and feet: the body hit, wrapped in a quick flame lick.
  'fire-punch-light': [
    { tone: { wave: 'sine', f0: 175, f1: 75, dur: 0.07, gain: 0.5 } },
    { noise: { dur: 0.04, gain: 0.45, type: 'bandpass', freq: 2400, q: 1.1 } },
    { noise: { dur: 0.2, gain: 0.32, type: 'bandpass', freq: 520, freqEnd: 1300, q: 0.8, attack: 0.015, flutter: 26 } },
    { crackle: { dur: 0.18, gain: 0.16, count: 4 } },
  ],
  'fire-punch-light-b': [
    { tone: { wave: 'sine', f0: 195, f1: 85, dur: 0.06, gain: 0.45 } },
    { noise: { dur: 0.04, gain: 0.42, type: 'bandpass', freq: 2900, q: 1.4 } },
    { noise: { dur: 0.22, gain: 0.3, type: 'bandpass', freq: 700, freqEnd: 1600, q: 0.9, attack: 0.02, flutter: 30 } },
    { crackle: { dur: 0.2, gain: 0.16, count: 5 } },
  ],
  'fire-kick-light': [
    { tone: { wave: 'sine', f0: 140, f1: 58, dur: 0.11, gain: 0.55 } },
    { noise: { dur: 0.26, gain: 0.36, type: 'bandpass', freq: 380, freqEnd: 1100, q: 0.7, attack: 0.02, flutter: 22 } },
    { crackle: { dur: 0.22, gain: 0.17, count: 5 } },
  ],
  'fire-punch-heavy': [
    { tone: { wave: 'sine', f0: 120, f1: 36, dur: 0.28, gain: 0.95, drive: 0.3 } },
    { noise: { dur: 0.03, gain: 0.45, type: 'bandpass', freq: 3200, q: 1.4 } },
    {
      noise: {
        dur: 0.55,
        gain: 0.65,
        type: 'bandpass',
        freq: 900,
        freqEnd: 220,
        q: 0.6,
        attack: 0.02,
        flutter: 20,
        drive: 0.4,
      },
    },
    { noise: { dur: 0.45, gain: 0.12, type: 'highpass', freq: 3800, attack: 0.08, delay: 0.1 } },
    { crackle: { dur: 0.5, gain: 0.26, count: 11 } },
  ],
  'fire-kick-heavy': [
    { tone: { wave: 'sine', f0: 100, f1: 32, dur: 0.32, gain: 1, drive: 0.35 } },
    {
      noise: {
        dur: 0.6,
        gain: 0.7,
        type: 'bandpass',
        freq: 800,
        freqEnd: 180,
        q: 0.6,
        attack: 0.025,
        flutter: 18,
        drive: 0.45,
      },
    },
    { noise: { dur: 0.5, gain: 0.12, type: 'highpass', freq: 3600, attack: 0.08, delay: 0.12 } },
    { crackle: { dur: 0.55, gain: 0.28, count: 12 } },
  ],
  // Fire Bolt: a fireball launched with a swelling whoosh…
  'fireball-cast': [
    { noise: { dur: 0.5, gain: 0.55, type: 'bandpass', freq: 220, freqEnd: 760, q: 0.7, attack: 0.16, flutter: 22 } },
    { noise: { dur: 0.42, gain: 0.14, type: 'highpass', freq: 2600, freqEnd: 4200, attack: 0.12 } },
    { tone: { wave: 'sine', f0: 70, f1: 120, dur: 0.35, gain: 0.25, attack: 0.12 } },
    { crackle: { dur: 0.45, gain: 0.15, count: 6 } },
  ],
  // …and bursting on contact: a whoomph, a roar that rolls out, crackle and sizzle.
  'fireball-impact': [
    { tone: { wave: 'sine', f0: 95, f1: 34, dur: 0.42, gain: 0.95, drive: 0.25 } },
    {
      noise: {
        dur: 0.75,
        gain: 0.75,
        type: 'lowpass',
        freq: 1400,
        freqEnd: 230,
        attack: 0.015,
        flutter: 21,
        drive: 0.35,
      },
    },
    { noise: { dur: 0.12, gain: 0.35, type: 'bandpass', freq: 520, q: 1 } },
    { noise: { dur: 0.6, gain: 0.13, type: 'highpass', freq: 4200, attack: 0.1, delay: 0.15 } },
    { crackle: { dur: 0.8, gain: 0.28, count: 16 } },
  ],
  'fire-charge': [
    { noise: { dur: 0.28, gain: 0.22, type: 'bandpass', freq: 400, freqEnd: 1700, q: 1.5, attack: 0.16 } },
  ],
  'fire-whoosh': [
    { noise: { dur: 0.4, gain: 0.45, type: 'bandpass', freq: 260, freqEnd: 1400, q: 0.7, attack: 0.1, flutter: 24 } },
    { crackle: { dur: 0.35, gain: 0.12, count: 4 } },
  ],
  'fire-rush': [
    {
      noise: {
        dur: 0.55,
        gain: 0.5,
        type: 'bandpass',
        freq: 240,
        freqEnd: 1500,
        q: 0.7,
        attack: 0.08,
        flutter: 26,
        drive: 0.25,
      },
    },
    { noise: { dur: 0.5, gain: 0.12, type: 'highpass', freq: 2800, attack: 0.1 } },
    { crackle: { dur: 0.5, gain: 0.2, count: 10 } },
  ],
  'fire-burst-small': [
    { tone: { wave: 'sine', f0: 110, f1: 42, dur: 0.24, gain: 0.6 } },
    {
      noise: {
        dur: 0.45,
        gain: 0.55,
        type: 'lowpass',
        freq: 1300,
        freqEnd: 260,
        attack: 0.015,
        flutter: 23,
        drive: 0.25,
      },
    },
    { noise: { dur: 0.35, gain: 0.1, type: 'highpass', freq: 4000, attack: 0.08, delay: 0.1 } },
    { crackle: { dur: 0.45, gain: 0.22, count: 9 } },
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
  // Meteor Fist (owner: "doesn't feel that fire, no excitement"): a growling build-up while
  // aiming, a rushing launch, and a double explosion with a long, crackling, sizzling tail.
  'fire-roar': [
    {
      noise: {
        dur: 0.75,
        gain: 0.5,
        type: 'bandpass',
        freq: 260,
        freqEnd: 900,
        q: 0.7,
        attack: 0.45,
        flutter: 16,
        drive: 0.4,
      },
    },
    { tone: { wave: 'sawtooth', f0: 55, f1: 110, dur: 0.7, gain: 0.12, attack: 0.4, drive: 0.6 } },
    { crackle: { dur: 0.7, gain: 0.16, count: 10 } },
  ],
  'leap-whoosh': [
    {
      noise: {
        dur: 0.7,
        gain: 0.55,
        type: 'bandpass',
        freq: 300,
        freqEnd: 1800,
        q: 0.7,
        attack: 0.08,
        flutter: 24,
        drive: 0.3,
      },
    },
    { noise: { dur: 0.6, gain: 0.18, type: 'highpass', freq: 2500, freqEnd: 5000, attack: 0.1 } },
    { crackle: { dur: 0.6, gain: 0.18, count: 10 } },
  ],
  'meteor-impact': [
    { tone: { wave: 'sine', f0: 70, f1: 22, dur: 1.4, gain: 1.3, drive: 0.35 } },
    { noise: { dur: 0.06, gain: 0.7, type: 'bandpass', freq: 3000, q: 1 } },
    { noise: { dur: 1.5, gain: 1, type: 'lowpass', freq: 2000, freqEnd: 160, attack: 0.01, flutter: 17, drive: 0.5 } },
    { tone: { wave: 'sine', f0: 55, f1: 24, dur: 0.9, gain: 0.9, delay: 0.14 } },
    { noise: { dur: 0.9, gain: 0.55, type: 'bandpass', freq: 600, freqEnd: 200, q: 0.6, delay: 0.14, flutter: 14 } },
    { noise: { dur: 1.3, gain: 0.16, type: 'highpass', freq: 4000, attack: 0.15, delay: 0.3 } },
    { crackle: { dur: 1.6, gain: 0.32, count: 30 } },
  ],
  // Punch Clash: a rising rush as the fighters lock up…
  'clash-start': [
    { noise: { dur: 0.45, gain: 0.35, type: 'bandpass', freq: 500, freqEnd: 2600, q: 1.2, attack: 0.3 } },
    { tone: { wave: 'sawtooth', f0: 110, f1: 220, dur: 0.4, gain: 0.08, attack: 0.25 } },
  ],
  // …fists meeting head-on: a bright double crack…
  'clash-collide': [
    { noise: { dur: 0.06, gain: 0.6, type: 'bandpass', freq: 2800, q: 1.5 } },
    { noise: { dur: 0.05, gain: 0.45, type: 'bandpass', freq: 4200, q: 2, delay: 0.025 } },
    { tone: { wave: 'sine', f0: 160, f1: 70, dur: 0.12, gain: 0.5 } },
  ],
  // …and the guard breaking: a huge thump with a cracking tail.
  'clash-break': [
    { tone: { wave: 'sine', f0: 90, f1: 26, dur: 0.7, gain: 1.2 } },
    { noise: { dur: 0.5, gain: 0.8, type: 'lowpass', freq: 1800, freqEnd: 250 } },
    { noise: { dur: 0.05, gain: 0.6, type: 'bandpass', freq: 3500, q: 1.2 } },
    { crackle: { dur: 0.35, gain: 0.2, count: 6 } },
  ],
  // Furniture (owner, 11/11/2026: realistic destruction). Wood: a dry crack and crunch over a thud.
  'hit-wood': [
    { tone: { wave: 'sine', f0: 190, f1: 95, dur: 0.1, gain: 0.45 } },
    { noise: { dur: 0.06, gain: 0.3, type: 'lowpass', freq: 1200 } },
  ],
  'break-wood': [
    { noise: { dur: 0.05, gain: 0.7, type: 'bandpass', freq: 1700, q: 1.5 } },
    { tone: { wave: 'sine', f0: 140, f1: 55, dur: 0.25, gain: 0.6 } },
    { crackle: { dur: 0.35, gain: 0.35, count: 14 } },
    { noise: { dur: 0.3, gain: 0.3, type: 'lowpass', freq: 900, freqEnd: 300, delay: 0.04 } },
  ],
  // Steel: a ringing clang of inharmonic partials.
  'hit-metal': [
    { tone: { wave: 'triangle', f0: 620, f1: 600, dur: 0.35, gain: 0.25 } },
    { tone: { wave: 'sine', f0: 1530, f1: 1500, dur: 0.25, gain: 0.12 } },
    { noise: { dur: 0.03, gain: 0.3, type: 'highpass', freq: 3000 } },
  ],
  'break-metal': [
    { tone: { wave: 'triangle', f0: 410, f1: 380, dur: 0.8, gain: 0.35 } },
    { tone: { wave: 'sine', f0: 1130, f1: 1080, dur: 0.6, gain: 0.18 } },
    { tone: { wave: 'sine', f0: 1870, f1: 1820, dur: 0.45, gain: 0.1 } },
    { noise: { dur: 0.12, gain: 0.5, type: 'bandpass', freq: 2500, q: 0.8 } },
    { tone: { wave: 'sine', f0: 120, f1: 50, dur: 0.3, gain: 0.5 } },
  ],
  // Glass and screens: a bright shatter and a tinkle of falling shards.
  'break-glass': [
    { noise: { dur: 0.18, gain: 0.6, type: 'highpass', freq: 2800 } },
    { crackle: { dur: 0.6, gain: 0.35, count: 18 } },
    { tone: { wave: 'sine', f0: 3200, f1: 2900, dur: 0.12, gain: 0.05, delay: 0.05 } },
  ],
  'hit-plastic': [
    { noise: { dur: 0.04, gain: 0.35, type: 'bandpass', freq: 2200, q: 1.2 } },
    { tone: { wave: 'sine', f0: 300, f1: 180, dur: 0.05, gain: 0.25 } },
  ],
  'break-plastic': [
    { noise: { dur: 0.07, gain: 0.55, type: 'bandpass', freq: 2000, q: 1 } },
    { crackle: { dur: 0.3, gain: 0.25, count: 8 } },
    { tone: { wave: 'sine', f0: 220, f1: 110, dur: 0.12, gain: 0.3 } },
  ],
  // Fabric and plants: a muffled thump and a rip.
  'hit-soft': [{ tone: { wave: 'sine', f0: 130, f1: 80, dur: 0.1, gain: 0.4 } }],
  'break-soft': [
    { tone: { wave: 'sine', f0: 120, f1: 60, dur: 0.18, gain: 0.5 } },
    { noise: { dur: 0.25, gain: 0.35, type: 'bandpass', freq: 900, freqEnd: 1600, q: 1.2 } },
  ],
  // A burst fire extinguisher: a sharp pop and a long, fading hiss of foam.
  'foam-burst': [
    { tone: { wave: 'sine', f0: 160, f1: 60, dur: 0.12, gain: 0.5 } },
    { noise: { dur: 1.2, gain: 0.45, type: 'highpass', freq: 2500, freqEnd: 5000, attack: 0.02 } },
    { noise: { dur: 0.9, gain: 0.2, type: 'bandpass', freq: 900, q: 0.6, attack: 0.05 } },
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
  private readonly curves = new Map<number, Float32Array<ArrayBuffer>>();
  private bus: AudioNode | null = null;

  /** The audio context once unlocked (the music player shares it). */
  get context(): AudioContext | null {
    return this.ctx;
  }

  /** Where music connects: through the same limiter as the effects, at its own level. */
  get musicBus(): AudioNode | null {
    return this.bus;
  }

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
    this.bus = comp;
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = this.rand() * 2 - 1;
    this.ctx = ctx;
    this.out = master;
    this.noise = buffer;
    void ctx.resume();
  }

  /** Play a sound; `gain` scales its loudness (the Punch Clash builds it up). */
  play(id: string, gain = 1): void {
    const ctx = this.ctx;
    const out = this.out;
    const recipe = RECIPES[id];
    if (!ctx || !out || !recipe || this.muted) return;
    const t = ctx.currentTime + 0.005;
    const pitch = 0.94 + this.rand() * 0.12;
    const level = (0.88 + this.rand() * 0.24) * gain;
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
    osc
      .connect(this.shaper(ctx, s.drive))
      .connect(this.envelope(ctx, t, s.dur, s.gain * level, s.attack))
      .connect(out);
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
    const env = this.envelope(ctx, t, s.dur, s.gain * level, s.attack);
    src.connect(filter).connect(this.shaper(ctx, s.drive)).connect(env);
    if (s.flutter) {
      // Flame turbulence: a wobbling gain stage (a slightly random rate so no two roars match).
      const trem = ctx.createGain();
      trem.gain.value = 0.7;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = s.flutter * (0.85 + this.rand() * 0.3);
      const depth = ctx.createGain();
      depth.gain.value = 0.3;
      lfo.connect(depth).connect(trem.gain);
      env.connect(trem).connect(out);
      lfo.start(t);
      lfo.stop(t + s.dur + 0.02);
    } else {
      env.connect(out);
    }
    src.start(t, this.rand() * 0.5);
    src.stop(t + s.dur + 0.02);
  }

  /** Overdrive for grit (`drive` 0..1); a pass-through gain when there is none. Curves are cached. */
  private shaper(ctx: Ctx, drive = 0): AudioNode {
    if (drive <= 0) return ctx.createGain();
    const key = Math.round(drive * 20);
    let curve = this.curves.get(key);
    if (!curve) {
      const k = 1 + key * 2.5;
      curve = new Float32Array(1024);
      for (let i = 0; i < curve.length; i++) {
        const x = (i / (curve.length - 1)) * 2 - 1;
        curve[i] = Math.tanh(k * x) / Math.tanh(k);
      }
      this.curves.set(key, curve);
    }
    const ws = ctx.createWaveShaper();
    ws.curve = curve;
    return ws;
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
