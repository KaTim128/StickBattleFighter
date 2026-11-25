import type { AudioTrackDef } from '../data/audio/music';

/**
 * Recorded music and stingers (owner, 12/11/2026). Fetches and decodes a track (Ogg Vorbis where the
 * browser plays it, MP3 otherwise) and plays it through the given output:
 * - a loop runs gaplessly on the Web Audio clock: the intro once, then its loop section forever.
 *   Times are measured from the first sound, so an encoder's leading silence (MP3) never opens a gap;
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

/**
 * Where to start and loop in a decoded buffer: the track's times are counted from its first sound,
 * so any encoder padding before it (`leadS`) shifts them all. Never past what was decoded.
 */
export function loopPoints(
  durationS: number,
  leadS: number,
  loop: AudioTrackDef['loop'],
): { offset: number; start: number; end: number } {
  const clamp = (t: number) => Math.min(durationS, Math.max(0, t));
  const offset = clamp(leadS);
  if (!loop) return { offset, start: offset, end: durationS };
  return { offset, start: clamp(leadS + loop.startS), end: clamp(leadS + loop.endS) };
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
  /** A source that is fading out: it is stopped when the fade ends, or taken back if the track is wanted again. */
  private fading: { src: AudioBufferSourceNode; gain: GainNode; timer: ReturnType<typeof setTimeout> } | null = null;
  private volume = 1;
  private duck = 1;
  private muted = false;
  private wantPlaying = false;

  constructor(
    private readonly clip: Pick<AudioClip, 'load' | 'def'>,
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

  /** Lower the track under something (0..1 of its level), easing there over `timeS`. */
  setDuck(k: number, timeS = 0.6): void {
    this.duck = Math.min(1, Math.max(0, k));
    this.applyLevel(timeS);
  }

  /** Playing, and not on its way out. */
  get playing(): boolean {
    return this.source !== null;
  }

  /** Any sound at all from this track, including a fade-out still running. */
  get audible(): boolean {
    return this.source !== null || this.fading !== null;
  }

  /**
   * Start (once loaded) on the given context and output. Safe to call again at any moment: it never plays the same track twice. If the
   * track is still fading out it is taken back (no second copy starts).
   */
  start(ctx: AudioContext, out: AudioNode, fadeInS = this.fadeInS): void {
    this.wantPlaying = true;
    if (this.source) return;
    if (this.fading) {
      clearTimeout(this.fading.timer);
      this.source = this.fading.src;
      this.gain = this.fading.gain;
      this.fading = null;
      this.applyLevel(fadeInS);
      return;
    }
    void this.clip.load(ctx).then((buffer) => {
      if (!buffer || !this.wantPlaying || this.source || this.fading) return;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(out);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const lp = loopPoints(
        buffer.duration,
        leadingSilenceS(buffer.getChannelData(0), buffer.sampleRate),
        this.clip.def.loop,
      );
      src.loopStart = lp.start;
      src.loopEnd = lp.end;
      src.connect(gain);
      src.start(ctx.currentTime, lp.offset); // the intro once, then the loop
      this.source = src;
      this.gain = gain;
      this.applyLevel(fadeInS);
    });
  }

  /** Fade out and stop. Idempotent: stopping a track that is stopped (or already fading) changes nothing. */
  stop(fadeS = 1): void {
    this.wantPlaying = false;
    const src = this.source;
    const gain = this.gain;
    if (!src || !gain) return;
    const ctx = gain.context;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setTargetAtTime(0, ctx.currentTime, Math.max(0.01, fadeS / 4));
    const timer = setTimeout(
      () => {
        try {
          src.stop();
        } catch {
          // already stopped
        }
        gain.disconnect();
        if (this.fading?.src === src) this.fading = null;
      },
      fadeS * 1000 + 100,
    );
    this.fading = { src, gain, timer };
    this.source = null;
    this.gain = null;
  }

  /** Stop at once, with no fade (the page is going away). */
  silence(): void {
    this.wantPlaying = false;
    const gone = [
      this.fading,
      this.source && this.gain ? { src: this.source, gain: this.gain, timer: undefined } : null,
    ];
    for (const f of gone) {
      if (!f) continue;
      if (f.timer) clearTimeout(f.timer);
      try {
        f.src.stop();
      } catch {
        // already stopped
      }
      f.gain.disconnect();
    }
    this.fading = null;
    this.source = null;
    this.gain = null;
  }

  private applyLevel(timeS: number): void {
    const g = this.gain;
    if (!g) return;
    const level = this.muted ? 0 : this.clip.def.level * this.volume * this.duck;
    g.gain.cancelScheduledValues(g.context.currentTime);
    g.gain.setTargetAtTime(level, g.context.currentTime, timeS / 3);
  }
}

/**
 * Which music plays (owner, 13/11/2026): the menu music through every menu (title, Game Modes,
 * fighter select, the tournament draw, settings over a menu), the battle music once a fight has
 * started, and the menu music again, slowly, once the battle is over. Fighter select lowers it.
 */
export function musicFor(s: {
  menusUp: boolean;
  fightStarted: boolean;
  battleOver: boolean;
}): 'menu' | 'battle' | 'none' {
  if (s.menusUp || s.battleOver) return 'menu';
  return s.fightStarted ? 'battle' : 'none';
}
