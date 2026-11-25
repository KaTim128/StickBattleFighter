import type { MusicLoop } from './music';

/**
 * The one owner of a page's background music. Every track is registered here under an id and the rest of the game only ever says which
 * one it wants (`request`); the director makes that true: it stops every other track (fading it out), starts the wanted one once audio
 * is available, and never plays two copies. Calling `request` again with the same id, or flipping between ids many times in a row,
 * is safe: the last request wins and nothing overlaps for longer than a fade.
 *
 * Sound effects, the ambience bed and the volume settings are not touched: volume, mute and duck are only forwarded to the tracks.
 */
export interface MusicOutput {
  readonly ctx: AudioContext;
  readonly out: AudioNode;
}

export interface MusicRequestOptions {
  /** Fade-in for the wanted track, seconds (default: the track's own). */
  readonly fadeInS?: number;
  /** Fade-out for the tracks that give way, seconds (default 0.8). */
  readonly fadeOutS?: number;
}

export class MusicDirector {
  private readonly loops = new Map<string, MusicLoop>();
  private wanted: string | null = null;
  private options: MusicRequestOptions = {};
  /** The page is hidden for good (navigating away or entering the back-forward cache): nothing may play. */
  private suspended = false;

  constructor(private readonly output: () => MusicOutput | null) {}

  register(id: string, loop: MusicLoop): void {
    this.loops.set(id, loop);
  }

  /** The track that should be playing now (null: silence). */
  get want(): string | null {
    return this.wanted;
  }

  /** Is this track producing sound right now (a fade-out counts)? */
  isAudible(id: string): boolean {
    return this.loops.get(id)?.audible ?? false;
  }

  /** Is this track playing and not fading out? */
  isPlaying(id: string): boolean {
    return this.loops.get(id)?.playing ?? false;
  }

  /** The ids of every track making sound (more than one only during a short crossfade). */
  get audibleIds(): string[] {
    return [...this.loops].filter(([, l]) => l.audible).map(([id]) => id);
  }

  /** Say which track should play (null: none). Idempotent. */
  request(id: string | null, options: MusicRequestOptions = {}): void {
    this.wanted = id;
    this.options = options;
    this.sync();
  }

  /** Make the sound match the request: call it again whenever audio becomes available. */
  sync(): void {
    const fadeOut = this.options.fadeOutS ?? 0.8;
    for (const [id, loop] of this.loops) {
      if (id !== this.wanted || this.suspended) loop.stop(fadeOut);
    }
    if (this.suspended || this.wanted === null) return;
    const loop = this.loops.get(this.wanted);
    const out = this.output();
    if (loop && out) loop.start(out.ctx, out.out, this.options.fadeInS);
  }

  setVolume(v: number): void {
    for (const l of this.loops.values()) l.setVolume(v);
  }

  setMuted(m: boolean): void {
    for (const l of this.loops.values()) l.setMuted(m);
  }

  setDuck(id: string, k: number): void {
    this.loops.get(id)?.setDuck(k);
  }

  /** Silence everything at once (the page is being left). The request is kept, so a restored page picks up where it was. */
  suspend(): void {
    this.suspended = true;
    for (const l of this.loops.values()) l.silence();
  }

  resume(): void {
    this.suspended = false;
    this.sync();
  }

  /** Leaving the page, or returning to it from the back-forward cache, must never leave music playing under the wrong screen. */
  attachPageLifecycle(win: Pick<Window, 'addEventListener'>): void {
    win.addEventListener('pagehide', () => this.suspend());
    win.addEventListener('pageshow', () => this.resume());
  }
}
