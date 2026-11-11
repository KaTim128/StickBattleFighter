/**
 * Impact feedback for the camera (REQ-CAM-4, PRS-3/8). "Trauma" (0..1) is added
 * by hits and fades steadily; shake strength grows with trauma², so light hits
 * barely move the view and big ones feel big. Movement uses smooth layered
 * waves, not random jumps, so it never looks jittery. A zoom "punch" briefly
 * pushes in and eases back out.
 */
export interface ShakeState {
  /** World-space offset of the view, metres. */
  offsetX: number;
  offsetY: number;
  /** Zoom multiplier (1 = none). */
  zoom: number;
}

export interface ShakeTuning {
  /** Largest offset at full trauma, metres. */
  readonly maxOffsetM: number;
  /** Trauma lost per second. */
  readonly decayPerS: number;
  /** How quickly the zoom punch settles (higher = faster). */
  readonly punchSettleRate: number;
}

export const DEFAULT_SHAKE: ShakeTuning = { maxOffsetM: 0.45, decayPerS: 1.6, punchSettleRate: 9 };

const wave = (t: number, seed: number): number =>
  (Math.sin(t * 37.1 + seed) * 0.6 + Math.sin(t * 61.7 + seed * 2.3) * 0.3 + Math.sin(t * 97.3 + seed * 5.1) * 0.1) /
  1.0;

export class CameraShake {
  private traumaLevel = 0;
  private punchLevel = 0;
  private timeS = 0;

  constructor(private readonly tuning: ShakeTuning = DEFAULT_SHAKE) {}

  get trauma(): number {
    return this.traumaLevel;
  }

  /** Add trauma from an impact (e.g. 0.2 light hit, 0.6 heavy hit, 1 ultimate). Capped at 1. */
  addTrauma(amount: number): void {
    this.traumaLevel = Math.min(1, this.traumaLevel + Math.max(0, amount));
  }

  /** Brief zoom-in, as a fraction (0.05 = 5% closer). Stronger punches replace weaker ones. */
  punch(amount: number): void {
    this.punchLevel = Math.max(this.punchLevel, Math.max(0, amount));
  }

  update(dtS: number): ShakeState {
    this.timeS += dtS;
    this.traumaLevel = Math.max(0, this.traumaLevel - this.tuning.decayPerS * dtS);
    this.punchLevel *= Math.exp(-this.tuning.punchSettleRate * dtS);
    if (this.punchLevel < 1e-4) this.punchLevel = 0;
    const strength = this.tuning.maxOffsetM * this.traumaLevel * this.traumaLevel;
    if (strength === 0) return { offsetX: 0, offsetY: 0, zoom: 1 + this.punchLevel };
    return {
      offsetX: strength * wave(this.timeS, 1.3),
      offsetY: strength * wave(this.timeS, 4.7),
      zoom: 1 + this.punchLevel,
    };
  }
}
