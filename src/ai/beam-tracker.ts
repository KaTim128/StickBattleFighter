/**
 * How an AI aims a Fire Beam (master plan Phase 1 B4): it is not a perfect lock. The AI re-reads the
 * target's bearing only every `reactionS` seconds and turns its aim toward that reading no faster
 * than `trackRadPerS`, so a player who keeps moving, especially circling or changing direction, has
 * room to leave the beam, more on Easy than on Expert. Pure and deterministic: no randomness.
 */

export interface BeamAimTuning {
  /** Seconds between fresh readings of where the target is (the AI's reaction time). */
  readonly reactionS: number;
  /** The fastest the AI can swing its aim, radians per second. */
  readonly trackRadPerS: number;
}

const TWO_PI = Math.PI * 2;

/** The shortest signed turn from `from` to `to`, in -PI..PI. */
export function angleDelta(from: number, to: number): number {
  let d = (to - from) % TWO_PI;
  if (d > Math.PI) d -= TWO_PI;
  else if (d < -Math.PI) d += TWO_PI;
  return d;
}

export class BeamTracker {
  /** Whether a beam (its charge or its pour) is being aimed. */
  active = false;
  /** Where the aim points now, radians. */
  angle = 0;
  private reading = 0;
  private sinceReadingS = 0;

  /** Begin aiming at `bearing` (the AI has just decided to cast at the target). */
  start(bearing: number): void {
    this.active = true;
    this.angle = bearing;
    this.reading = bearing;
    this.sinceReadingS = 0;
  }

  stop(): void {
    this.active = false;
  }

  /**
   * Advance by `dtS`. `trueBearing` is the target's real bearing right now (null when it cannot be
   * seen: the aim holds). Returns the aim angle.
   */
  step(dtS: number, trueBearing: number | null, tuning: BeamAimTuning): number {
    if (!this.active) return this.angle;
    this.sinceReadingS += dtS;
    if (trueBearing !== null && this.sinceReadingS >= tuning.reactionS) {
      this.reading = trueBearing;
      this.sinceReadingS = 0;
    }
    const maxStep = tuning.trackRadPerS * dtS;
    const turn = angleDelta(this.angle, this.reading);
    this.angle += Math.max(-maxStep, Math.min(maxStep, turn));
    return this.angle;
  }
}
