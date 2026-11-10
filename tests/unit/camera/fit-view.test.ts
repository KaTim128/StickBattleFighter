import { describe, expect, it } from 'vitest';
import { fitRectToView } from '../../../src/camera/fit-view';

describe('fitRectToView (2D camera framing)', () => {
  it('fits by width on a wide-but-short world and centres vertically', () => {
    const fit = fitRectToView(20, 10, 1000, 800);
    expect(fit.scale).toBe(50);
    expect(fit.offsetX).toBe(0);
    expect(fit.offsetY).toBe(150);
  });

  it('fits by height on a portrait phone screen and centres horizontally', () => {
    const fit = fitRectToView(16, 10, 400, 900, 10);
    expect(fit.scale).toBeCloseTo(380 / 16, 6);
    expect(fit.offsetY).toBeCloseTo((900 - 10 * fit.scale) / 2, 6);
    expect(fit.offsetX).toBeCloseTo(10, 6);
  });

  it('rejects an empty world', () => {
    expect(() => fitRectToView(0, 10, 100, 100)).toThrow(RangeError);
  });
});
