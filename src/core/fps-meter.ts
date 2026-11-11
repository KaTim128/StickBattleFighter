/** Rolling frames-per-second average for the debug overlay. */
export class FpsMeter {
  private readonly samples: number[] = [];
  private sum = 0;

  constructor(private readonly windowSize = 60) {}

  /** Record the real time a frame took, in seconds. Non-positive or invalid values are ignored. */
  addFrame(frameS: number): void {
    if (!Number.isFinite(frameS) || frameS <= 0) return;
    this.samples.push(frameS);
    this.sum += frameS;
    if (this.samples.length > this.windowSize) this.sum -= this.samples.shift() ?? 0;
  }

  get fps(): number {
    return this.samples.length === 0 ? 0 : this.samples.length / this.sum;
  }
}
