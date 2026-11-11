import type { MusicTrack } from '../data/audio/music-tracks';

/** One note or drum hit the sequencer plays at a step. */
export type MusicEvent =
  | { voice: 'kick' | 'snare' | 'hat'; velocity: number }
  | { voice: 'bass' | 'lead' | 'arp'; midi: number; steps: number }
  | { voice: 'pad'; midis: number[]; steps: number };

export const STEPS_PER_BAR = 16;

/** MIDI note of a scale degree (degree 7 in a 7-note scale = one octave up). */
export function degreeMidi(track: MusicTrack, degree: number, octave = 0): number {
  const n = track.scale.length;
  const oct = Math.floor(degree / n);
  const idx = ((degree % n) + n) % n;
  return track.rootMidi + 12 * (oct + octave) + (track.scale[idx] ?? 0);
}

function drum(pattern: string, step: number): number {
  const c = pattern[step % STEPS_PER_BAR];
  return c === 'x' ? 1 : c === 'o' ? 0.5 : 0;
}

/**
 * Everything that sounds at `step` (counted from the start of the loop). Pure, so the
 * arrangement is testable without audio.
 */
export function eventsAt(track: MusicTrack, step: number): MusicEvent[] {
  const bars = track.progression.length;
  const loopSteps = bars * STEPS_PER_BAR;
  const s = ((step % loopSteps) + loopSteps) % loopSteps;
  const bar = Math.floor(s / STEPS_PER_BAR);
  const inBar = s % STEPS_PER_BAR;
  const chord = track.progression[bar] ?? 0;
  const out: MusicEvent[] = [];
  for (const voice of ['kick', 'snare', 'hat'] as const) {
    const v = drum(track[voice], inBar);
    if (v > 0) out.push({ voice, velocity: v });
  }
  const b = track.bass[inBar];
  if (b !== null && b !== undefined) out.push({ voice: 'bass', midi: degreeMidi(track, chord + b), steps: 2 });
  const lead = track.lead?.[s];
  if (lead !== null && lead !== undefined) out.push({ voice: 'lead', midi: degreeMidi(track, lead, 2), steps: 2 });
  if (track.pad && inBar === 0) {
    out.push({
      voice: 'pad',
      midis: [0, 2, 4].map((d) => degreeMidi(track, chord + d, 1)),
      steps: STEPS_PER_BAR,
    });
  }
  const arpIndex = track.arpSteps.indexOf(inBar);
  if (arpIndex >= 0) {
    const tones = [0, 2, 4, 7];
    out.push({ voice: 'arp', midi: degreeMidi(track, chord + (tones[arpIndex % tones.length] ?? 0), 2), steps: 1 });
  }
  return out;
}

const hz = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

/** How far ahead notes are scheduled, and how often the scheduler wakes (seconds). */
const LOOKAHEAD_S = 0.15;
const TICK_MS = 30;
/** Music sits under the effects. */
const MUSIC_LEVEL = 0.32;

/**
 * Plays a MusicTrack on the Web Audio clock with a small lookahead scheduler (no per-frame work
 * on the game loop). One track at a time; switching fades the old one out.
 */
export class MusicPlayer {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private track: MusicTrack | null = null;
  private wanted: MusicTrack | null = null;
  private step = 0;
  private nextTime = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private muted = false;

  /** The track that is (or will be, once audio unlocks) playing. */
  get current(): string | null {
    return this.wanted?.id ?? null;
  }

  /** Connect to the shared audio context (after the first user input). */
  attach(ctx: AudioContext, destination: AudioNode): void {
    if (this.ctx) return;
    this.ctx = ctx;
    const out = ctx.createGain();
    out.gain.value = this.muted ? 0 : MUSIC_LEVEL;
    out.connect(destination);
    this.out = out;
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 99;
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      data[i] = (seed / 4294967296) * 2 - 1;
    }
    this.noise = buffer;
    if (this.wanted) this.start(this.wanted);
  }

  play(track: MusicTrack | null): void {
    if (track?.id === this.wanted?.id) return;
    this.wanted = track;
    if (this.ctx) this.start(track);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.out && this.ctx) this.out.gain.setTargetAtTime(muted ? 0 : MUSIC_LEVEL, this.ctx.currentTime, 0.05);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.track = null;
  }

  private start(track: MusicTrack | null): void {
    this.stop();
    if (!track || !this.ctx) return;
    this.track = track;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), TICK_MS);
    this.schedule();
  }

  private schedule(): void {
    const ctx = this.ctx;
    const track = this.track;
    if (!ctx || !track) return;
    const stepS = 60 / track.bpm / 4;
    // After a long pause (tab hidden), jump ahead rather than burst-play the backlog.
    if (this.nextTime < ctx.currentTime - 0.5) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + LOOKAHEAD_S) {
      for (const e of eventsAt(track, this.step)) this.voice(e, this.nextTime, stepS, track.level);
      this.step++;
      this.nextTime += stepS;
    }
  }

  private voice(e: MusicEvent, t: number, stepS: number, level: number): void {
    switch (e.voice) {
      case 'kick':
        this.tone('sine', 120, 42, t, 0.22, 0.9 * e.velocity * level);
        break;
      case 'snare':
        this.hiss(t, 0.14, 0.5 * e.velocity * level, 'bandpass', 1900);
        this.tone('triangle', 220, 150, t, 0.08, 0.25 * e.velocity * level);
        break;
      case 'hat':
        this.hiss(t, 0.035, 0.18 * e.velocity * level, 'highpass', 7000);
        break;
      case 'bass':
        this.note(this.track?.bassWave ?? 'sawtooth', hz(e.midi), t, e.steps * stepS * 0.9, 0.42 * level, 900);
        break;
      case 'lead':
        this.note(this.track?.leadWave ?? 'square', hz(e.midi), t, e.steps * stepS * 0.95, 0.16 * level, 2600);
        break;
      case 'arp':
        this.note('triangle', hz(e.midi), t, stepS * 1.6, 0.1 * level, 3000);
        break;
      case 'pad':
        for (const m of e.midis) {
          for (const detune of [-6, 6])
            this.note('sawtooth', hz(m), t, e.steps * stepS, 0.035 * level, 1100, detune, 0.4);
        }
        break;
    }
  }

  private tone(wave: OscillatorType, f0: number, f1: number, t: number, dur: number, gain: number): void {
    const ctx = this.ctx;
    const out = this.out;
    if (!ctx || !out || gain <= 0) return;
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private note(
    wave: OscillatorType,
    freq: number,
    t: number,
    dur: number,
    gain: number,
    cutoff: number,
    detune = 0,
    attack = 0.008,
  ): void {
    const ctx = this.ctx;
    const out = this.out;
    if (!ctx || !out) return;
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const g = ctx.createGain();
    const a = Math.min(attack, dur * 0.5);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + a);
    g.gain.setValueAtTime(gain, t + Math.max(a, dur * 0.6));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(filter).connect(g).connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private hiss(t: number, dur: number, gain: number, type: BiquadFilterType, freq: number): void {
    const ctx = this.ctx;
    const out = this.out;
    if (!ctx || !out || !this.noise || gain <= 0) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(g).connect(out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }
}
