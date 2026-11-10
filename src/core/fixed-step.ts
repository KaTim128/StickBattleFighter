/**
 * Fixed-timestep accumulator (TD-013).
 *
 * Gameplay (physics, combat, AI) advances in equal steps whatever the display
 * frame rate, so timings such as wind-up and hit-stop behave the same on a
 * 30 Hz phone and a 144 Hz monitor. Rendering then interpolates between the
 * last two simulated states using `alpha`.
 */
export interface FixedStepOptions {
  /** Length of one simulation step in seconds (e.g. 1 / 60). */
  readonly stepS: number;
  /**
   * Most steps simulated for a single display frame. Anything beyond this is
   * dropped so a long stall (tab switch, slow device) cannot snowball into an
   * ever-growing backlog (the "spiral of death").
   */
  readonly maxStepsPerFrame: number;
}

export interface FixedStepResult {
  /** Number of fixed steps to simulate now. */
  readonly steps: number;
  /** 0..1: how far real time has progressed into the next, unsimulated step. */
  readonly alpha: number;
  /** Real time discarded because `maxStepsPerFrame` was reached. */
  readonly droppedS: number;
}

export const DEFAULT_FIXED_STEP: FixedStepOptions = { stepS: 1 / 60, maxStepsPerFrame: 5 };

export class FixedStepAccumulator {
  private accumulatorS = 0;

  constructor(private readonly options: FixedStepOptions = DEFAULT_FIXED_STEP) {
    if (!(options.stepS > 0) || !Number.isFinite(options.stepS)) {
      throw new RangeError(`stepS must be a positive finite number, got ${options.stepS}`);
    }
    if (!Number.isInteger(options.maxStepsPerFrame) || options.maxStepsPerFrame < 1) {
      throw new RangeError(`maxStepsPerFrame must be an integer >= 1, got ${options.maxStepsPerFrame}`);
    }
  }

  get stepS(): number {
    return this.options.stepS;
  }

  /** Feed the real time elapsed since the previous display frame. */
  advance(elapsedS: number): FixedStepResult {
    // Negative, NaN or infinite deltas (clock glitches) count as no time passing.
    const safeElapsedS = Number.isFinite(elapsedS) && elapsedS > 0 ? elapsedS : 0;
    this.accumulatorS += safeElapsedS;

    const { stepS, maxStepsPerFrame } = this.options;
    // A tiny epsilon stops float error (e.g. 3 x 1/60 summing to 0.04999…)
    // from losing a whole step.
    const epsilon = stepS * 1e-9;
    let steps = Math.floor((this.accumulatorS + epsilon) / stepS);
    let droppedS = 0;

    if (steps > maxStepsPerFrame) {
      droppedS = this.accumulatorS - maxStepsPerFrame * stepS;
      steps = maxStepsPerFrame;
      this.accumulatorS = 0;
    } else {
      this.accumulatorS = Math.max(0, this.accumulatorS - steps * stepS);
    }

    return { steps, alpha: Math.min(1, this.accumulatorS / stepS), droppedS };
  }

  reset(): void {
    this.accumulatorS = 0;
  }
}
