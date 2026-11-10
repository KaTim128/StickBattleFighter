import { describe, expect, it } from 'vitest';
import { FixedStepAccumulator } from '../../../src/core/fixed-step';

const STEP = 1 / 60;

describe('FixedStepAccumulator (TD-013)', () => {
  it('runs one step per step-length of elapsed time', () => {
    const acc = new FixedStepAccumulator({ stepS: STEP, maxStepsPerFrame: 5 });
    expect(acc.advance(STEP).steps).toBe(1);
    expect(acc.advance(STEP * 3).steps).toBe(3);
  });

  it('carries leftover time into later frames and reports alpha', () => {
    const acc = new FixedStepAccumulator({ stepS: STEP, maxStepsPerFrame: 5 });
    const first = acc.advance(STEP * 0.5);
    expect(first.steps).toBe(0);
    expect(first.alpha).toBeCloseTo(0.5, 6);
    const second = acc.advance(STEP * 0.75);
    expect(second.steps).toBe(1);
    expect(second.alpha).toBeCloseTo(0.25, 6);
  });

  it('gives the same total steps regardless of display frame rate', () => {
    const total = (frameS: number, seconds: number): number => {
      const acc = new FixedStepAccumulator({ stepS: STEP, maxStepsPerFrame: 10 });
      let steps = 0;
      for (let t = 0; t < Math.round(seconds / frameS); t++) steps += acc.advance(frameS).steps;
      return steps;
    };
    expect(total(1 / 30, 2)).toBe(120);
    expect(total(1 / 60, 2)).toBe(120);
    expect(total(1 / 144, 2)).toBe(120);
  });

  it('caps steps per frame and drops the backlog after a long stall', () => {
    const acc = new FixedStepAccumulator({ stepS: STEP, maxStepsPerFrame: 5 });
    const stall = acc.advance(2);
    expect(stall.steps).toBe(5);
    expect(stall.droppedS).toBeCloseTo(2 - 5 * STEP, 6);
    expect(acc.advance(STEP).steps).toBe(1); // no snowballing backlog
  });

  it('treats negative, NaN and infinite elapsed time as zero', () => {
    const acc = new FixedStepAccumulator({ stepS: STEP, maxStepsPerFrame: 5 });
    for (const bad of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(acc.advance(bad)).toEqual({ steps: 0, alpha: 0, droppedS: 0 });
    }
  });

  it('rejects invalid options', () => {
    expect(() => new FixedStepAccumulator({ stepS: 0, maxStepsPerFrame: 5 })).toThrow(RangeError);
    expect(() => new FixedStepAccumulator({ stepS: STEP, maxStepsPerFrame: 0 })).toThrow(RangeError);
  });
});
