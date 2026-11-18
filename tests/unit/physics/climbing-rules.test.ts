import { describe, expect, it } from 'vitest';
import { CLIMBING, canGrab, firmHoldS, landingKind, supportUnder } from '../../../src/physics/climbing';

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
  it('a jump on flat ground is a knee bend; any longer drop a firm squat; never a collapse', () => {
    expect(landingKind(1.06)).toBe('soft'); // Inferno's highest jump
    expect(landingKind(2)).toBe('firm'); // walking off a bookshelf
    expect(landingKind(3.06)).toBe('firm'); // jumping off a bookshelf: a squat, not a collapse (owner, 20/11/2026)
    expect(landingKind(30)).toBe('firm');
  });

  it('bigger drops hold a little longer, up to the maximum', () => {
    expect(firmHoldS(1)).toBe(0);
    expect(firmHoldS(2)).toBeGreaterThan(firmHoldS(1.5));
    expect(firmHoldS(30)).toBe(CLIMBING.firmHoldMaxS);
  });
});

/** Owner, 20/11/2026: only a real, long jump whose head meets the edge grabs; landing on a platform never hangs. */
describe('ledge grabs', () => {
  // A 2 m shelf, 0.45 m deep, seen from the west side.
  const shelf = { x0: 1, y0: 0, x1: 3, y1: 0.45, topM: 2 };
  const base = { radiusM: 0.3, floorM: 0, peakM: 1.06, scale: 1, takeoffM: 0 };
  const at = { x: 0.6, y: 0.2 }; // against the shelf's west side
  const push = { x: 1, y: 0 };

  it('grabs when a long jump brings the head level with the edge and the feet are still below the top', () => {
    // Feet 0.9 m up: the head (1.6 m above them) is at 2.5 m, 0.5 m above the edge: too high. Feet 0.6: head 2.2.
    expect(canGrab(shelf, at, push, { ...base, heightM: 0.6 })).toBe(true);
  });

  it('never grabs with the feet level with or above the top: the fighter lands instead', () => {
    expect(canGrab(shelf, at, push, { ...base, heightM: 1.9 })).toBe(false);
    expect(canGrab(shelf, at, push, { ...base, heightM: 2.2 })).toBe(false);
  });

  it('never grabs when the head is still well below the edge, or has passed far above it', () => {
    expect(canGrab(shelf, at, push, { ...base, heightM: 0.1 })).toBe(false); // short hop: no real jump
    expect(canGrab(shelf, at, push, { ...base, heightM: 0.3 })).toBe(false); // head at 1.9 but the jump has barely begun
    expect(canGrab(shelf, at, push, { ...base, heightM: 1.0 })).toBe(false); // head at 2.6, over the edge by 0.6
  });

  it('a jump from one platform to another of similar height lands, it does not hang', () => {
    // Standing on a 1.2 m platform and jumping at a 1.5 m one: the top is within the jump's reach.
    const low = { x0: 1, y0: 0, x1: 3, y1: 0.45, topM: 1.5 };
    const body = { ...base, floorM: 1.2, takeoffM: 1.2, peakM: 1.06 };
    for (const heightM of [1.3, 1.6, 2, 2.2])
      expect(canGrab(low, at, push, { ...body, heightM }), `at ${heightM}`).toBe(false);
  });

  it('needs the player to be pushing at the edge, close to it', () => {
    expect(canGrab(shelf, at, { x: -1, y: 0 }, { ...base, heightM: 0.6 })).toBe(false);
    expect(canGrab(shelf, { x: -1, y: 0.2 }, push, { ...base, heightM: 0.6 })).toBe(false);
  });
});
