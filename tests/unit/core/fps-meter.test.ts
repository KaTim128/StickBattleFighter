import { describe, expect, it } from 'vitest';
import { FpsMeter } from '../../../src/core/fps-meter';

describe('FpsMeter', () => {
  it('averages over the window and ignores invalid frame times', () => {
    const meter = new FpsMeter(4);
    expect(meter.fps).toBe(0);
    for (const s of [1 / 30, 1 / 30, -1, Number.NaN, 0]) meter.addFrame(s);
    expect(meter.fps).toBeCloseTo(30, 6);
    for (let i = 0; i < 4; i++) meter.addFrame(1 / 60); // window rolls over
    expect(meter.fps).toBeCloseTo(60, 6);
  });
});
