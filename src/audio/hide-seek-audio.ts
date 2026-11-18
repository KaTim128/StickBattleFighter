import type { GameEvent } from '../modes/hide-seek/game';
import { heardStrength } from '../modes/hide-seek/perception';
import type { HouseWorld, Point } from '../modes/hide-seek/world';

/**
 * Horror sound for Hide and Seek (Phase 2, master plan section J): positional footsteps, doors,
 * hiding places, thrown objects, the hunter's heartbeat tension and the round stingers. All of it is
 * original and synthesised at runtime (no audio files): the ambience bed itself is the `house-night`
 * soundscape played by `AmbiencePlayer`.
 */
export interface Spatial {
  /** -1 (left) .. 1 (right) on screen. */
  readonly pan: number;
  /** 0..1 loudness at the listener's ears. */
  readonly gain: number;
  /** 0..1 how muffled it is (through walls and shut doors, and across floors). */
  readonly muffle: number;
}

const PAN_REACH_M = 9;

/**
 * Where a sound seems to come from and how loud it is to a listener: the louder of its own loudness
 * and what actually reaches the listener through walls, doors and floors (the same rule the hunter's
 * ears use, so what you hear is what he hears). Pure.
 */
export function spatialise(
  world: HouseWorld,
  listener: { floor: 0 | 1; x: number; y: number },
  source: { floor: 0 | 1; x: number; y: number; loudness: number },
): Spatial {
  const strength = heardStrength(world, listener, source);
  // Screen-horizontal offset in the isometric view is (dx - dy).
  const across = (source.x - listener.x - (source.y - listener.y)) * Math.SQRT1_2;
  const pan = Math.max(-1, Math.min(1, across / PAN_REACH_M));
  const dry = source.loudness > 0 ? strength / source.loudness : 0;
  return { pan, gain: Math.min(1, strength * 1.6), muffle: Math.min(1, 1 - Math.min(1, dry * 1.4)) };
}

/** Distance in metres between two points (for the tension heartbeat). */
export const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

/** Heartbeats per second for a tension level 0..1 (silent below a small threshold). */
export function heartRateHz(tension: number): number {
  return tension < 0.15 ? 0 : 0.9 + tension * 1.9;
}

export class HideSeekAudio {
  private ctx: AudioContext | null = null;
  private out: AudioNode | null = null;
  private noise: AudioBuffer | null = null;
  muted = false;
  private beatIn = 0;
  private tension = 0;
  private seed = 99;

  attach(ctx: AudioContext, destination: AudioNode): void {
    if (this.ctx) return;
    this.ctx = ctx;
    this.out = destination;
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = buffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = this.rand() * 2 - 1;
    this.noise = buffer;
  }

  private rand(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  /** A game event, heard from where the player is. */
  event(e: GameEvent, world: HouseWorld, listener: { floor: 0 | 1; x: number; y: number }): void {
    if (!this.ctx || this.muted) return;
    const sp = spatialise(world, listener, { ...e.at, floor: e.floor, loudness: e.loudness });
    if (sp.gain < 0.02) return;
    const hunter = e.by === 'hunter';
    switch (e.kind) {
      case 'footstep':
        this.step(sp, hunter ? 95 : 150, hunter ? 0.8 : 0.55, hunter ? 0.1 : 0.07);
        break;
      case 'door':
        if (e.open) this.creak(sp, 0.55);
        else this.thud(sp, 110, 0.16);
        break;
      case 'hide-enter':
      case 'hide-exit':
        this.creak(sp, e.detail === 'wardrobe' || e.detail === 'cupboard' ? 0.4 : 0.22);
        this.thud(sp, 140, 0.08);
        break;
      case 'impact':
        if (e.detail === 'bottle') this.shatter(sp);
        else if (e.detail === 'can') this.clang(sp);
        else this.thud(sp, 180, 0.12);
        break;
      case 'throw':
        this.whoosh(sp);
        break;
      case 'pickup':
        this.thud(sp, 220, 0.05);
        break;
      case 'inspect':
        this.inspect(sp, e.detail ?? '');
        break;
    }
  }

  /** The hunter's nearness and alertness, 0..1: drives the heartbeat. Call every frame. */
  update(dtS: number, tension: number): void {
    this.tension += (tension - this.tension) * Math.min(1, dtS * 3);
    const hz = heartRateHz(this.tension);
    if (!this.ctx || this.muted || hz === 0) return;
    this.beatIn -= dtS;
    if (this.beatIn <= 0) {
      this.beatIn = 1 / hz;
      const g = 0.12 + this.tension * 0.3;
      this.thud({ pan: 0, gain: 1, muffle: 0 }, 55, g);
      this.thud({ pan: 0, gain: 1, muffle: 0 }, 48, g * 0.7, 0.16);
    }
  }

  /** The hunter has seen the player and gives chase: a low rising sting. */
  alert(): void {
    this.sweep(70, 150, 1.1, 0.22);
  }

  /** The catch: a harsh descending shriek and a heavy hit. */
  kill(): void {
    this.sweep(900, 120, 0.9, 0.3, 'sawtooth');
    this.thud({ pan: 0, gain: 1, muffle: 0 }, 60, 0.5, 0.35);
  }

  /** Survived: a calm, low, lifting tone. */
  victory(): void {
    this.sweep(110, 220, 1.6, 0.14, 'sine');
  }

  // ------------------------------------------------------------------ synthesis
  private chain(sp: Spatial, extraGain = 1): { input: GainNode; t: number } | null {
    const ctx = this.ctx;
    const out = this.out;
    if (!ctx || !out) return null;
    const input = ctx.createGain();
    input.gain.value = sp.gain * extraGain;
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 18000 - sp.muffle * 17000;
    const pan = ctx.createStereoPanner();
    pan.pan.value = sp.pan;
    input.connect(low).connect(pan).connect(out);
    return { input, t: ctx.currentTime + 0.005 };
  }

  private burst(
    sp: Spatial,
    opts: { durS: number; freq: number; q?: number; type: BiquadFilterType; gain: number; delayS?: number },
  ): void {
    const ctx = this.ctx;
    const c = this.chain(sp);
    if (!ctx || !c || !this.noise) return;
    const t = c.t + (opts.delayS ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = opts.type;
    f.frequency.value = opts.freq;
    f.Q.value = opts.q ?? 0.8;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(opts.gain, t + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, t + opts.durS);
    src.connect(f).connect(env).connect(c.input);
    src.start(t);
    src.stop(t + opts.durS + 0.05);
  }

  private tone(
    sp: Spatial,
    wave: OscillatorType,
    f0: number,
    f1: number,
    durS: number,
    gain: number,
    delayS = 0,
  ): void {
    const ctx = this.ctx;
    const c = this.chain(sp);
    if (!ctx || !c) return;
    const t = c.t + delayS;
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + durS);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.03, durS / 4));
    env.gain.exponentialRampToValueAtTime(0.0001, t + durS);
    osc.connect(env).connect(c.input);
    osc.start(t);
    osc.stop(t + durS + 0.05);
  }

  private step(sp: Spatial, freq: number, gain: number, durS: number): void {
    this.burst(sp, { durS, freq, type: 'lowpass', gain: gain * 0.9 });
    this.tone(sp, 'sine', freq * 0.7, freq * 0.4, durS * 1.4, gain * 0.5);
  }

  private thud(sp: Spatial, freq: number, gain: number, delayS = 0): void {
    this.tone(sp, 'sine', freq, freq * 0.45, 0.16, gain, delayS);
    this.burst(sp, { durS: 0.07, freq: freq * 3, type: 'lowpass', gain: gain * 0.5, delayS });
  }

  private creak(sp: Spatial, gain: number): void {
    this.tone(sp, 'sawtooth', 150 + this.rand() * 40, 95, 0.55, gain * 0.25);
    this.burst(sp, { durS: 0.5, freq: 900, q: 6, type: 'bandpass', gain: gain * 0.18 });
  }

  /** The sounds of the hunter's search: he opens a cupboard, lifts a lid, drags a curtain, shakes a bush, drags his knife. */
  private inspect(sp: Spatial, what: string): void {
    switch (what) {
      case 'open-door':
        this.creak(sp, 0.9); // a long, slow door
        this.thud(sp, 130, 0.12, 0.45);
        break;
      case 'lift-lid':
        this.thud(sp, 150, 0.22);
        this.creak(sp, 0.5);
        break;
      case 'pull-curtain':
        this.burst(sp, { durS: 0.35, freq: 3200, q: 0.9, type: 'highpass', gain: 0.22 });
        this.burst(sp, { durS: 0.2, freq: 5200, q: 4, type: 'bandpass', gain: 0.1, delayS: 0.08 }); // rings on the rail
        break;
      case 'part-bush':
        this.burst(sp, { durS: 0.7, freq: 2600, q: 0.7, type: 'bandpass', gain: 0.3 });
        break;
      case 'knife-scrape':
        this.burst(sp, { durS: 0.9, freq: 4200, q: 1.2, type: 'highpass', gain: 0.22 });
        this.tone(sp, 'sawtooth', 2400, 1500, 0.8, 0.05);
        break;
      case 'look-under':
        this.thud(sp, 120, 0.12); // a knee on the floorboards
        break;
    }
  }

  private shatter(sp: Spatial): void {
    this.burst(sp, { durS: 0.45, freq: 5200, type: 'highpass', gain: 0.6 });
    for (let i = 0; i < 4; i++)
      this.tone(sp, 'triangle', 2600 + this.rand() * 2400, 1800, 0.12, 0.12, 0.03 + i * 0.045);
  }

  private clang(sp: Spatial): void {
    this.tone(sp, 'square', 820, 700, 0.4, 0.2);
    this.burst(sp, { durS: 0.3, freq: 2400, q: 4, type: 'bandpass', gain: 0.25 });
  }

  private whoosh(sp: Spatial): void {
    this.burst(sp, { durS: 0.25, freq: 1200, q: 1.2, type: 'bandpass', gain: 0.18 });
  }

  private sweep(f0: number, f1: number, durS: number, gain: number, wave: OscillatorType = 'sawtooth'): void {
    if (!this.ctx || this.muted) return;
    this.tone({ pan: 0, gain: 1, muffle: 0.3 }, wave, f0, f1, durS, gain);
  }
}
