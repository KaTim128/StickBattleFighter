import { FixedStepAccumulator, type FixedStepOptions } from './fixed-step';

export interface GameLoopCallbacks {
  /** Advance the simulation by exactly one fixed step. */
  update(stepS: number): void;
  /** Draw a frame; `alpha` is the interpolation factor between the last two steps. */
  render(alpha: number): void;
}

/** Scheduler seam so the loop can be driven by tests instead of the browser. */
export interface FrameScheduler {
  request(callback: (timeMs: number) => void): number;
  cancel(handle: number): void;
}

export const browserScheduler: FrameScheduler = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (handle) => cancelAnimationFrame(handle),
};

/** Drives fixed simulation steps and variable-rate rendering (TD-013). */
export class GameLoop {
  private readonly accumulator: FixedStepAccumulator;
  private handle: number | null = null;
  private lastTimeMs: number | null = null;

  constructor(
    private readonly callbacks: GameLoopCallbacks,
    options?: FixedStepOptions,
    private readonly scheduler: FrameScheduler = browserScheduler,
  ) {
    this.accumulator = new FixedStepAccumulator(options);
  }

  get running(): boolean {
    return this.handle !== null;
  }

  start(): void {
    if (this.running) return;
    this.lastTimeMs = null;
    this.accumulator.reset();
    this.handle = this.scheduler.request(this.frame);
  }

  stop(): void {
    if (this.handle !== null) this.scheduler.cancel(this.handle);
    this.handle = null;
  }

  private readonly frame = (timeMs: number): void => {
    const elapsedS = this.lastTimeMs === null ? 0 : (timeMs - this.lastTimeMs) / 1000;
    this.lastTimeMs = timeMs;

    const { steps, alpha } = this.accumulator.advance(elapsedS);
    for (let i = 0; i < steps; i++) this.callbacks.update(this.accumulator.stepS);
    this.callbacks.render(alpha);

    if (this.handle !== null) this.handle = this.scheduler.request(this.frame);
  };
}
