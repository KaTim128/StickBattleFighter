import { describe, expect, it } from 'vitest';
import { circleTouchesRect, impactBreaksDoor } from '../../../src/environment/breakable-door';

const dir = { x: 1, y: 0 };

describe('door break rule (owner request)', () => {
  it('walking, pushing or brushing against it never BREAKS it, however hard (walking swings it open instead, REQ-ENV-13)', () => {
    expect(impactBreaksDoor({ kind: 'contact', strength: 1e9, direction: dir }, 500)).toBe(false);
  });

  it('light strikes (jab, hook) do not break it', () => {
    expect(impactBreaksDoor({ kind: 'strike', strength: 150, direction: dir }, 500)).toBe(false);
    expect(impactBreaksDoor({ kind: 'strike', strength: 230, direction: dir }, 500)).toBe(false);
  });

  it('a kick, a heavy strike or a heavy knockback at or above its strength breaks it', () => {
    expect(impactBreaksDoor({ kind: 'kick', strength: 820, direction: dir }, 500)).toBe(true);
    expect(impactBreaksDoor({ kind: 'strike', strength: 720, direction: dir }, 500)).toBe(true);
    expect(impactBreaksDoor({ kind: 'knockback', strength: 140 * 7, direction: dir }, 500)).toBe(true);
    expect(impactBreaksDoor({ kind: 'knockback', strength: 140 * 2, direction: dir }, 500)).toBe(false);
  });

  it('circleTouchesRect detects overlap at edges and corners', () => {
    const r = { x0: 0, y0: 0, x1: 1, y1: 2 };
    expect(circleTouchesRect({ x: 1.3, y: 1 }, 0.35, r)).toBe(true);
    expect(circleTouchesRect({ x: 1.4, y: 1 }, 0.35, r)).toBe(false);
    expect(circleTouchesRect({ x: 1.2, y: 2.2 }, 0.3, r)).toBe(true);
    expect(circleTouchesRect({ x: 1.3, y: 2.3 }, 0.3, r)).toBe(false);
  });
});
