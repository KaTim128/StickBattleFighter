import { describe, expect, it } from 'vitest';
import {
  FLOOR_MATRIX,
  ISO_C,
  ISO_T,
  iso,
  isoToWorld,
  screenDirToWorld,
  screenSideToWorld,
} from '../../../src/rendering/projection';

describe('2.5D projection (TD-045)', () => {
  it('floor points round-trip, and the floor matrix matches the projection', () => {
    for (const [x, y] of [
      [0, 0],
      [3, 1],
      [-2, 7.5],
      [33, 12],
    ] as const) {
      const s = iso(x, y);
      const w = isoToWorld(s.x, s.y);
      expect(w.x).toBeCloseTo(x, 9);
      expect(w.y).toBeCloseTo(y, 9);
      const m = FLOOR_MATRIX.apply({ x, y });
      expect(m.x).toBeCloseTo(s.x, 9);
      expect(m.y).toBeCloseTo(s.y, 9);
    }
  });

  it('height rises straight up the screen, one unit per metre', () => {
    expect(iso(2, 3, 1.5).x).toBeCloseTo(iso(2, 3).x, 9);
    expect(iso(2, 3, 1.5).y).toBeCloseTo(iso(2, 3).y - 1.5, 9);
  });

  it('nearer the viewer (larger x + y) is lower on screen, so y-sorting draws it in front', () => {
    expect(iso(5, 5).y).toBeGreaterThan(iso(4, 5).y);
    expect(iso(5, 5).y).toBeCloseTo(iso(6, 4).y, 9); // same depth, side by side
  });

  it('keys and the joystick move along the screen: W up, D right, at full speed', () => {
    for (const [dx, dy] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
      [Math.SQRT1_2, -Math.SQRT1_2],
    ] as const) {
      const w = screenDirToWorld(dx, dy);
      expect(Math.hypot(w.x, w.y)).toBeCloseTo(1, 9);
      const s = iso(w.x, w.y);
      const len = Math.hypot(s.x, s.y);
      expect(s.x / len).toBeCloseTo(dx, 9);
      expect(s.y / len).toBeCloseTo(dy, 9);
    }
    expect(screenDirToWorld(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it('a sideways offset on screen stays at the same depth', () => {
    const o = screenSideToWorld(0.4);
    const s = iso(o.x, o.y);
    expect(s.x).toBeCloseTo(0.4, 9);
    expect(s.y).toBeCloseTo(0, 9);
    expect(ISO_C * ISO_T).toBeGreaterThan(0);
  });
});
