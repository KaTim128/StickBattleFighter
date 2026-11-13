import { describe, expect, it } from 'vitest';
import {
  CLIMBING,
  collapseLieS,
  fallDamage,
  firmHoldS,
  landingKind,
  supportUnder,
} from '../../../src/physics/climbing';

/** Owner, 13/11/2026: traversal across neighbouring tops and landings by the real drop. */
describe('traversal support', () => {
  // Two bookshelves (2 m tall) end to end with a 0.2 m gap, a slightly taller locker beyond, and a
  // bookshelf far away across a 1.5 m gap.
  const a = { x0: 0, y0: 0, x1: 2, y1: 0.45, topM: 2 };
  const b = { x0: 2.2, y0: 0, x1: 4.2, y1: 0.45, topM: 2 };
  const c = { x0: 4.4, y0: 0, x1: 5, y1: 0.45, topM: 2.3 };
  const far = { x0: 6.5, y0: 0, x1: 8.5, y1: 0.45, topM: 2 };
  const tops = [a, b, c, far];

  it('walking over a small gap between tops keeps the feet on top', () => {
    for (const x of [2.05, 2.1, 2.15]) expect(supportUnder(tops, x, 0.2, 2, 2, true)).toBe(2);
  });

  it('steps up onto a slightly taller neighbour without a jump', () => {
    expect(supportUnder(tops, 4.3, 0.2, 2, 2, true)).toBe(2.3);
  });

  it('a gap too wide to step across drops the fighter', () => {
    expect(supportUnder(tops, 5.6, 0.2, 2.3, 2.3, true)).toBe(0);
  });

  it('on the floor, nearby furniture never lifts the fighter (no edge support from below)', () => {
    expect(supportUnder(tops, 2.1, 0.2, 0, 0, true)).toBe(0);
    expect(supportUnder(tops, -0.1, 0.2, 0, 0, true)).toBe(0);
  });

  it('in the air, only a top directly underneath counts', () => {
    expect(supportUnder(tops, 2.1, 0.2, 2.5, 2, false)).toBe(0);
    expect(supportUnder(tops, 1, 0.2, 2.5, 0, false)).toBe(2);
  });
});

describe('landings by the real drop', () => {
  it('a jump on flat ground is a knee bend; walking off tall furniture a firm squat; a jump off it a collapse', () => {
    expect(landingKind(1.06)).toBe('soft'); // Inferno's highest jump
    expect(landingKind(2)).toBe('firm'); // walking off a bookshelf
    expect(landingKind(2.1)).toBe('firm'); // walking off the tallest locker
    expect(landingKind(3.06)).toBe('collapse'); // jumping off a bookshelf
  });

  it('walking off the tallest climbable furniture never hurts; any fall that hurts is a collapse', () => {
    expect(fallDamage(2.1, 140)).toBe(0);
    expect(CLIMBING.collapseDropM).toBeLessThanOrEqual(CLIMBING.safeDropM);
    expect(fallDamage(CLIMBING.safeDropM + 0.5, 70)).toBeGreaterThan(0);
  });

  it('bigger drops hold longer and lie longer', () => {
    expect(firmHoldS(1)).toBe(0);
    expect(firmHoldS(2)).toBeGreaterThan(firmHoldS(1.5));
    expect(collapseLieS(4)).toBeGreaterThan(collapseLieS(2.6));
    expect(collapseLieS(30)).toBe(CLIMBING.collapseLieMaxS);
  });
});
