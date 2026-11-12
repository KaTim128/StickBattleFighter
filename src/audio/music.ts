import type { AudioTrackDef } from '../data/audio/music';

/**
 * Recorded music and stingers (owner, 12/11/2026). Fetches and decodes a track (Ogg Vorbis where the
 * browser plays it, MP3 otherwise) and plays it through the given output:
 * - a loop runs gaplessly on the Web Audio clock. Its loop points come from the track's musical
 *   length, measured from its first sound, so an encoder's leading silence (MP3) never opens a gap;
 * - a one-shot (the fight stinger) simply plays once.
 * Loading failures are reported once and leave the game silent rather than broken.
 */

/** Pick the format this browser can decode. */
export function trackUrl(def: AudioTrackDef, canPlay: (type: string) => string): string {
  return canPlay('audio/ogg; codecs="vorbis"') ? def.ogg : def.mp3;
}

/** The first sample that is not encoder padding (pure silence), as seconds. Pure (tests). */
export function leadingSilenceS(samples: Float32Array, sampleRate: number, threshold = 1e-4): number {
  for (let i = 0; i < samples.length; i++) if (Math.abs(samples[i]!) > threshold) return i / sampleRate;
  return 0;
}

/** Loop points for a decoded buffer: start at its first sound, run for the musical length. */
export function loopPoints(
  durationS: number,
  leadS: number,
  loopS: number | undefined,
): { start: number; end: number } {
  const start = Math.min(leadS, Math.max(0, durationS - 0.01));
  const end = loopS ? Math.min(durationS, start + loopS) : durationS;
  return { start, end };
}

const canPlayType = (type: string): string =>
  typeof document === 'undefined' ? '' : document.createElement('audio').canPlayType(type);

export class AudioClip {
  private buffer: AudioBuffer | null = null;
  private loading: Promise<AudioBuffer | null> | null = null;

  constructor(readonly def: AudioTrackDef) {}

  /** Fetch and decode once (later calls share the same load). */
  load(ctx: BaseAudioContext): Promise<AudioBuffer | null> {
    this.loading ??= fetch(trackUrl(this.def, canPlayType))
      .then((r) => {
        if (!r.ok) throw new Error(`audio ${r.status}`);
        return r.arrayBuffer();
      })
      .then((data) => ctx.decodeAudioData(data))
      .then((b) => {
        this.buffer = b;
        return b;
      })
      .catch((e: unknown) => {
        console.warn('Audio track unavailable; carrying on without it.', e);
        return null;
      });
    return this.loading;
  }

  get ready(): AudioBuffer | null {
    return this.buffer;
  }
}

/** A looping music track with fades, on its own gain under the music volume. */
export class MusicLoop {
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private volume = 1;
  private muted = false;
  private wantPlaying = false;

  constructor(
    private readonly clip: AudioClip,
    private readonly fadeInS = 1.5,
  ) {}

  setVolume(v: number): void {
    this.volume = Math.min(1, Math.max(0, v));
    this.applyLevel(0.1);
  }

  setMuted(m: boolean): void {
    this.muted = m;
    this.applyLevel(0.1);
  }

  get playing(): boolean {
    return this.source !== null;
  }

  /** Start (once loaded) on the given context and output; a no-op if already playing. */
  start(ctx: AudioContext, out: AudioNode): void {
    this.wantPlaying = true;
    if (this.source) return;
    void this.clip.load(ctx).then((buffer) => {
      if (!buffer || !this.wantPlaying || this.source) return;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(out);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const lp = loopPoints(
        buffer.duration,
        leadingSilenceS(buffer.getChannelData(0), buffer.sampleRate),
        this.clip.def.loopS,
      );
      src.loopStart = lp.start;
      src.loopEnd = lp.end;
      src.connect(gain);
      src.start(ctx.currentTime, lp.start);
      this.source = src;
      this.gain = gain;
      this.applyLevel(this.fadeInS);
    });
  }

  /** Fade out and stop. */
  stop(fadeS = 1): void {
    this.wantPlaying = false;
    const src = this.source;
    const gain = this.gain;
    if (!src || !gain) return;
    const ctx = gain.context;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setTargetAtTime(0, ctx.currentTime, fadeS / 4);
    src.stop(ctx.currentTime + fadeS);
    this.source = null;
    this.gain = null;
  }

  private applyLevel(timeS: number): void {
    const g = this.gain;
    if (!g) return;
    const level = this.muted ? 0 : this.clip.def.level * this.volume;
    g.gain.cancelScheduledValues(g.context.currentTime);
    g.gain.setTargetAtTime(level, g.context.currentTime, timeS / 3);
  }
}
