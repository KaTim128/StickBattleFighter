import { describe, expect, it } from 'vitest';
import { clampPixelRatio, MAX_PIXEL_RATIO } from '../../../src/rendering/renderer';

describe('clampPixelRatio', () => {
  it('passes normal ratios through and caps high-DPI screens', () => {
    expect(clampPixelRatio(1)).toBe(1);
    expect(clampPixelRatio(1.5)).toBe(1.5);
    expect(clampPixelRatio(3)).toBe(MAX_PIXEL_RATIO);
  });

  it('falls back to 1 for invalid values', () => {
    expect(clampPixelRatio(0)).toBe(1);
    expect(clampPixelRatio(Number.NaN)).toBe(1);
  });
});
