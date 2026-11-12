import type { AmbienceDef, AmbientBed, AmbientCue, AmbientEventId, NoiseColour, Swell } from '../data/audio/ambiences';

/**
 * Background ambience (owner, 12/11/2026): soundscapes, not music. Plays an AmbienceDef on the
 * Web Audio clock:
 * - continuous beds (looping filtered noise, hums, a crowd's murmur) whose levels drift and swell;
 * - random one-off events (a creak, a cheer) synthesised on the spot;
 * - everything sent through a generated reverb sized to the space, optionally muffled.
 * No notes, melodies, beats or audio files. A light scheduler wakes a few times a second (never
 * on the game loop).
 */

/** Seconds until the next occurrence, uniformly in [min, max]. Pure (tests). */
export function nextDelayS(range: readonly [number, number], rand: () => number): number {
  return range[0] + (range[1] - range[0]) * rand();
}

/** How often the scheduler wakes, and how far ahead it schedules (seconds). */
const TICK_MS = 120;
const LOOKAHEAD_S = 0.4;
/** Ambience sits under the effects. */
const AMBIENCE_LEVEL = 0.5;
/** A new soundscape fades in over this long; the old one fades out. */
const FADE_S = 1.2;

interface LiveBed {
  readonly bed: AmbientBed;
  readonly gain: GainNode;
  /** Crowd bands: each band's own level, moved at its chatter rate. */
  readonly bands: GainNode[];
  nextChatter: number[];
  nextSwell: number;
  readonly stops: (() => void)[];
}

interface LiveScape {
  readonly def: AmbienceDef;
  readonly out: GainNode;
  readonly dry: GainNode;
  readonly beds: LiveBed[];
  readonly nextEvent: number[];
  readonly stops: (() => void)[];
}

export class AmbiencePlayer {
  private ctx: BaseAudioContext | null = null;
  private out: GainNode | null = null;
  private wanted: AmbienceDef | null = null;
  private live: LiveScape | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private muted = false;
  /** Ambience volume from the settings, 0..1. */
  private volume = 1;
  private readonly noise = new Map<NoiseColour, AudioBuffer>();
  private seed = 4242;

  /**
   * @param lookaheadS how far ahead events are scheduled. Live play keeps it short; an offline
   * render (OfflineAudioContext, e.g. a preview clip) passes its whole length so everything is
   * laid out before rendering.
   */
  constructor(private readonly lookaheadS = LOOKAHEAD_S) {}

  /** The soundscape that is (or will be, once audio unlocks) playing. */
  get current(): string | null {
    return this.wanted?.id ?? null;
  }

  /** Connect to the shared audio context (after the first user input), or an offline one. */
  attach(ctx: BaseAudioContext, destination: AudioNode): void {
    if (this.ctx) return;
    this.ctx = ctx;
    const out = ctx.createGain();
    out.gain.value = this.level;
    out.connect(destination);
    this.out = out;
    for (const colour of ['white', 'pink', 'brown'] as const) this.noise.set(colour, this.makeNoise(ctx, colour));
    if (this.wanted) this.start(this.wanted);
  }

  play(def: AmbienceDef | null): void {
    if (def?.id === this.wanted?.id) return;
    this.wanted = def;
    if (this.ctx) this.start(def);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyLevel();
  }

  /** Ambience volume 0..1 (settings); takes effect immediately. */
  setVolume(v: number): void {
    this.volume = Math.min(1, Math.max(0, v));
    this.applyLevel();
  }

  get musicVolume(): number {
    return this.volume;
  }

  /** Something happened in the fight: the soundscape answers if it has a reaction (a crowd). */
  react(cue: AmbientCue): void {
    const scape = this.live;
    const ctx = this.ctx;
    const id = scape?.def.reactions?.[cue];
    if (!scape || !ctx || !id) return;
    const ev = scape.def.events.find((e) => e.id === id);
    this.event(scape, id, ctx.currentTime + 0.05, (ev?.gain ?? 0.5) * 1.8);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.fadeOut(this.live);
    this.live = null;
  }

  private get level(): number {
    return this.muted ? 0 : AMBIENCE_LEVEL * this.volume;
  }

  private applyLevel(): void {
    if (this.out && this.ctx) this.out.gain.setTargetAtTime(this.level, this.ctx.currentTime, 0.05);
  }

  private rand(): number {
    // Small LCG: sound only (gameplay randomness is seeded separately).
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  private fadeOut(scape: LiveScape | null): void {
    const ctx = this.ctx;
    if (!scape || !ctx) return;
    const t = ctx.currentTime;
    scape.out.gain.cancelScheduledValues(t);
    scape.out.gain.setTargetAtTime(0, t, FADE_S / 3);
    setTimeout(
      () => {
        for (const s of scape.stops) s();
        for (const b of scape.beds) for (const s of b.stops) s();
        scape.out.disconnect();
      },
      FADE_S * 1000 + 200,
    );
  }

  private start(def: AmbienceDef | null): void {
    this.stop();
    const ctx = this.ctx;
    const master = this.out;
    if (!def || !ctx || !master) return;
    const t = ctx.currentTime;
    // out ← (dry + reverb), through an optional muffle.
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(def.level, t + FADE_S);
    let tail: AudioNode = out;
    if (def.muffleHz) {
      const muffle = ctx.createBiquadFilter();
      muffle.type = 'lowpass';
      muffle.frequency.value = def.muffleHz;
      out.connect(muffle);
      tail = muffle;
    }
    tail.connect(master);
    const dry = ctx.createGain();
    dry.gain.value = 1 - def.reverb.wet * 0.6;
    dry.connect(out);
    const verb = ctx.createConvolver();
    verb.buffer = this.makeImpulse(ctx, def.reverb.seconds);
    const wet = ctx.createGain();
    wet.gain.value = def.reverb.wet;
    dry.connect(verb);
    verb.connect(wet).connect(out);

    const scape: LiveScape = {
      def,
      out,
      dry,
      beds: [],
      nextEvent: def.events.map((e) => t + nextDelayS(e.everyS, () => this.rand()) * 0.6),
      stops: [],
    };
    for (const bed of def.beds) scape.beds.push(this.startBed(ctx, bed, dry, t));
    this.live = scape;
    this.timer = setInterval(() => this.schedule(), TICK_MS);
    this.schedule();
  }

  /** A looping noise source starting at a random point (so several beds never line up). */
  private loop(ctx: BaseAudioContext, colour: NoiseColour): AudioBufferSourceNode {
    const src = ctx.createBufferSource();
    src.buffer = this.noise.get(colour) ?? null;
    src.loop = true;
    src.start(ctx.currentTime, this.rand() * 3.5);
    return src;
  }

  private startBed(ctx: BaseAudioContext, bed: AmbientBed, into: AudioNode, t: number): LiveBed {
    const gain = ctx.createGain();
    gain.gain.value = bed.gain;
    gain.connect(into);
    const live: LiveBed = { bed, gain, bands: [], nextChatter: [], nextSwell: t + 1, stops: [] };
    if (bed.kind === 'noise') {
      const src = this.loop(ctx, bed.colour);
      const f = ctx.createBiquadFilter();
      f.type = bed.filter;
      f.frequency.value = bed.freqHz;
      if (bed.q !== undefined) f.Q.value = bed.q;
      src.connect(f).connect(gain);
      live.stops.push(() => src.stop());
    } else if (bed.kind === 'hum') {
      for (const hz of bed.freqsHz) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = hz;
        const g = ctx.createGain();
        g.gain.value = 1 / bed.freqsHz.length;
        osc.connect(g).connect(gain);
        osc.start();
        live.stops.push(() => osc.stop());
      }
    } else {
      // A crowd: bands of noise spread (log-evenly) across the voice range, each its own level.
      const src = this.loop(ctx, 'pink');
      for (let i = 0; i < bed.bands; i++) {
        const k = bed.bands > 1 ? i / (bed.bands - 1) : 0.5;
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = bed.lowHz * (bed.highHz / bed.lowHz) ** k * (0.92 + this.rand() * 0.16);
        f.Q.value = 1.4;
        const g = ctx.createGain();
        g.gain.value = 0.5;
        src.connect(f).connect(g).connect(gain);
        live.bands.push(g);
        live.nextChatter.push(t);
      }
      live.stops.push(() => src.stop());
    }
    return live;
  }

  private schedule(): void {
    const ctx = this.ctx;
    const scape = this.live;
    if (!ctx || !scape) return;
    const now = ctx.currentTime;
    const horizon = now + this.lookaheadS;
    for (const b of scape.beds) this.drift(b, now, horizon);
    scape.def.events.forEach((e, i) => {
      // After a long pause (tab hidden), skip ahead rather than play a backlog.
      if ((scape.nextEvent[i] ?? 0) < now - 2) scape.nextEvent[i] = now + nextDelayS(e.everyS, () => this.rand());
      while ((scape.nextEvent[i] ?? Number.POSITIVE_INFINITY) < horizon) {
        this.event(scape, e.id, Math.max(now, scape.nextEvent[i]!), e.gain * (0.75 + this.rand() * 0.5));
        scape.nextEvent[i] = (scape.nextEvent[i] ?? now) + nextDelayS(e.everyS, () => this.rand());
      }
    });
  }

  /** Beds breathe: crowd bands chatter up and down; swells lift the whole bed now and then. */
  private drift(b: LiveBed, now: number, horizon: number): void {
    const bed = b.bed;
    if (bed.kind === 'crowd') {
      b.bands.forEach((g, i) => {
        if ((b.nextChatter[i] ?? 0) < now - 1) b.nextChatter[i] = now;
        while ((b.nextChatter[i] ?? Number.POSITIVE_INFINITY) < horizon) {
          const at = b.nextChatter[i]!;
          g.gain.setTargetAtTime(0.2 + this.rand() * 0.8, at, 0.08);
          b.nextChatter[i] = at + 1 / (bed.chatterHz[0] + (bed.chatterHz[1] - bed.chatterHz[0]) * this.rand());
        }
      });
    }
    const swell: Swell | undefined = bed.kind === 'hum' ? undefined : bed.swell;
    if (!swell) return;
    if (b.nextSwell < now - 2) b.nextSwell = now + 0.5;
    if (b.nextSwell < horizon) {
      const at = b.nextSwell;
      const rise = bed.gain * (1 + swell.depth * (0.5 + this.rand() * 0.5));
      b.gain.gain.setTargetAtTime(rise, at, 0.9);
      b.gain.gain.setTargetAtTime(bed.gain, at + 1.6 + this.rand(), 1.4);
      b.nextSwell = at + nextDelayS(swell.everyS, () => this.rand());
    }
  }

  // ------------------------------------------------------------- one-off events

  private event(scape: LiveScape, id: AmbientEventId, t: number, gain: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    // Each event comes from somewhere in the space (left or right).
    const pan = ctx.createStereoPanner();
    pan.pan.value = (this.rand() - 0.5) * 1.4;
    pan.connect(scape.dry);
    const r = () => this.rand();
    switch (id) {
      case 'creak': {
        // Wood or a ceiling tile settling: a slow, rough, falling groan through a narrow resonance.
        const dur = 0.6 + r() * 0.7;
        const src = this.toneAt(ctx, 'sawtooth', 120 + r() * 60, 90 + r() * 30, t, dur);
        const f = this.filter(ctx, 'bandpass', 600 + r() * 500, 7);
        src.connect(f).connect(this.env(ctx, pan, t, dur, gain * 0.25, 0.15));
        break;
      }
      case 'thump': {
        // A door closing somewhere far off in the building: a dull low knock, mostly reverb.
        this.toneAt(ctx, 'sine', 75, 42, t, 0.3).connect(this.env(ctx, pan, t, 0.3, gain * 0.7, 0.005));
        this.noiseAt(ctx, 'brown', t, 0.35, 'lowpass', 180, gain * 0.6, pan, 0.005);
        break;
      }
      case 'tick': {
        // Electrical: one to three tiny clicks.
        const n = 1 + Math.floor(r() * 3);
        for (let i = 0; i < n; i++)
          this.noiseAt(ctx, 'white', t + i * (0.03 + r() * 0.05), 0.008, 'highpass', 5000, gain, pan, 0.001);
        break;
      }
      case 'knock': {
        // A pipe ticking as it cools: two or three soft metallic knocks.
        const n = 2 + Math.floor(r() * 2);
        for (let i = 0; i < n; i++) {
          const at = t + i * (0.16 + r() * 0.1);
          this.toneAt(ctx, 'sine', 900 + r() * 200, 860, at, 0.07).connect(
            this.env(ctx, pan, at, 0.07, gain * 0.3, 0.002),
          );
          this.noiseAt(ctx, 'white', at, 0.04, 'bandpass', 1600, gain * 0.4, pan, 0.002);
        }
        break;
      }
      case 'flicker': {
        // A fluorescent tube stuttering: a buzzy 100 Hz rattle that cuts in and out.
        const dur = 0.4 + r() * 0.5;
        const src = this.toneAt(ctx, 'square', 100, 100, t, dur);
        const f = this.filter(ctx, 'bandpass', 2400, 3);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        let at = t;
        while (at < t + dur) {
          g.gain.setValueAtTime(r() < 0.6 ? gain * 0.12 : 0, at);
          at += 0.03 + r() * 0.07;
        }
        g.gain.setValueAtTime(0, t + dur);
        src.connect(f).connect(g).connect(pan);
        break;
      }
      case 'vent-click': {
        // The air handling cycling: a click, then the air surging a little.
        this.noiseAt(ctx, 'white', t, 0.01, 'bandpass', 2500, gain, pan, 0.001);
        this.noiseAt(ctx, 'brown', t + 0.05, 2.5, 'lowpass', 400, gain * 0.5, pan, 0.8);
        break;
      }
      case 'cheer': {
        // A section of the stands cheering: a bright swell of many voices, rising then falling away.
        const dur = 1.6 + r() * 1.4;
        for (const [hz, k] of [
          [550, 1],
          [1100, 0.8],
          [2300, 0.45],
        ] as const) {
          this.noiseAt(ctx, 'pink', t, dur, 'bandpass', hz * (0.9 + r() * 0.2), gain * k, pan, dur * 0.3, 1.2);
        }
        break;
      }
      case 'applause': {
        // Thousands of hands: dense tiny claps swelling in and dying away.
        const dur = 2 + r() * 1.5;
        const claps = Math.round(dur * 80);
        for (let i = 0; i < claps; i++) {
          const u = r();
          const at = t + u * dur;
          const shape = Math.sin(Math.PI * Math.min(1, u * 1.4)); // swells in, tails away
          this.noiseAt(
            ctx,
            'white',
            at,
            0.012,
            'bandpass',
            1500 + r() * 2500,
            gain * 0.35 * shape * (0.4 + r() * 0.6),
            pan,
            0.001,
            0.8,
          );
        }
        break;
      }
      case 'whistle': {
        // A fan's sharp whistle: a quick upward glide, sometimes falling again (a call, not a tune).
        const dur = 0.35 + r() * 0.4;
        const f0 = 1800 + r() * 700;
        const osc = this.toneAt(ctx, 'sine', f0, f0 * (1.15 + r() * 0.2), t, dur);
        if (r() < 0.5) osc.frequency.exponentialRampToValueAtTime(f0 * 0.85, t + dur);
        osc.connect(this.env(ctx, pan, t, dur, gain * 0.25, 0.03));
        break;
      }
      case 'ooh': {
        // The crowd wincing at a big blow: a vowel-like swell sliding down.
        const dur = 1.1 + r() * 0.6;
        for (const [a, b, k] of [
          [560, 380, 1],
          [980, 720, 0.6],
        ] as const) {
          const src = this.loop(ctx, 'pink');
          const f = this.filter(ctx, 'bandpass', a, 5);
          f.frequency.setValueAtTime(a, t);
          f.frequency.exponentialRampToValueAtTime(b, t + dur);
          src.connect(f).connect(this.env(ctx, pan, t, dur, gain * k * 1.6, dur * 0.25));
          src.stop(t + dur + 0.1);
        }
        break;
      }
      case 'roar': {
        // The whole bowl erupting: a huge swell of cheering, applause and whistles together.
        const dur = 3 + r() * 1.5;
        for (const [hz, k] of [
          [300, 0.9],
          [700, 1],
          [1400, 0.8],
          [2800, 0.4],
        ] as const) {
          this.noiseAt(ctx, 'pink', t, dur, 'bandpass', hz, gain * k, pan, 0.35, 1.1);
        }
        this.event(scape, 'applause', t + 0.4, gain * 0.8);
        for (let i = 0; i < 3; i++) this.event(scape, 'whistle', t + 0.3 + r() * 2, gain * 0.5);
        break;
      }
    }
    setTimeout(() => pan.disconnect(), 8000);
  }

  // ------------------------------------------------------------- building blocks

  private filter(ctx: BaseAudioContext, type: BiquadFilterType, hz: number, q = 1): BiquadFilterNode {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = hz;
    f.Q.value = q;
    return f;
  }

  /** A gain envelope into `to`: rise over `attack`, then fall away over the rest of `dur`. */
  private env(ctx: BaseAudioContext, to: AudioNode, t: number, dur: number, peak: number, attack: number): GainNode {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + Math.max(0.001, attack));
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(attack + 0.01, dur));
    g.connect(to);
    return g;
  }

  private toneAt(
    ctx: BaseAudioContext,
    wave: OscillatorType,
    f0: number,
    f1: number,
    t: number,
    dur: number,
  ): OscillatorNode {
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    osc.start(t);
    osc.stop(t + dur + 0.05);
    return osc;
  }

  private noiseAt(
    ctx: BaseAudioContext,
    colour: NoiseColour,
    t: number,
    dur: number,
    type: BiquadFilterType,
    hz: number,
    peak: number,
    to: AudioNode,
    attack: number,
    q = 1,
  ): void {
    const src = ctx.createBufferSource();
    src.buffer = this.noise.get(colour) ?? null;
    src.connect(this.filter(ctx, type, hz, q)).connect(this.env(ctx, to, t, dur, peak, attack));
    src.start(t, this.rand() * 3);
    src.stop(t + dur + 0.05);
  }

  /** 4 s of noise of a colour (white flat, pink -3 dB/octave, brown -6 dB/octave), looped by beds. */
  private makeNoise(ctx: BaseAudioContext, colour: NoiseColour): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * 4);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = this.rand() * 2 - 1;
      if (colour === 'white') d[i] = w * 0.5;
      else if (colour === 'pink') {
        b0 = 0.99765 * b0 + w * 0.099046;
        b1 = 0.963 * b1 + w * 0.2965164;
        b2 = 0.57 * b2 + w * 1.0526913;
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11;
      } else {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
    }
    return buffer;
  }

  /** A stereo reverb tail: decaying noise with a few early reflections (a room, or a stone bowl). */
  private makeImpulse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buffer.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const k = i / len;
        d[i] = (this.rand() * 2 - 1) * (1 - k) ** 3 * 0.5;
      }
      for (let e = 0; e < 6; e++) {
        const at = Math.floor(ctx.sampleRate * (0.02 + this.rand() * 0.12));
        if (at < len) d[at] = (d[at] ?? 0) + (this.rand() - 0.5) * 0.8;
      }
    }
    return buffer;
  }
}
