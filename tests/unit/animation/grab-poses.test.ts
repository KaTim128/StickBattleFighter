import { describe, expect, it } from 'vitest';
import { abilityPose } from '../../../src/animation/ability-poses';
import { idlePose } from '../../../src/animation/greybox-motion';
import type { BoneLengths } from '../../../src/animation/skeleton';
import rampage from '../../../src/data/characters/rampage/character.json';

/** Owner, 13/11/2026: a successful grab and a missed one must animate distinctly. */
describe('Grapple Slam poses', () => {
  const base = idlePose(0.2, rampage.rig.bones as BoneLengths, 'heavyweight');
  const at = (progress: number, grab: Parameters<typeof abilityPose>[6]) =>
    abilityPose(base, 'grappleSlam', 'recovery', progress, false, false, grab);

  it('hoists overhead while holding, then drops hard into the slam', () => {
    const hold = at(0.3, { state: 'hold' });
    const slam = at(0.6, { state: 'slam', sinceS: 0.2 });
    expect(hold.armFront.root).toBeGreaterThan(2.5); // arms high overhead
    expect(slam.armFront.root).toBeLessThan(1.4); // driven down to the floor
    expect(slam.lean).toBeLessThan(hold.lean - 0.6); // the body follows the target down
  });

  it('the slam snaps down within a tenth of a second', () => {
    const start = at(0.5, { state: 'slam', sinceS: 0 });
    const down = at(0.5, { state: 'slam', sinceS: 0.1 });
    expect(start.armFront.root).toBeGreaterThan(2.5);
    expect(down.armFront.root).toBeLessThan(1.4);
  });

  it('a miss never lifts the arms overhead: the hands close on air and he stumbles forward', () => {
    for (const p of [0.2, 0.4, 0.55]) {
      const miss = at(p, { state: 'miss' });
      expect(miss.armFront.root).toBeLessThan(1.8);
      expect(miss.lean).toBeLessThan(-0.5);
    }
  });

  it('both end back in the stance', () => {
    expect(at(1, { state: 'miss' }).lean).toBeCloseTo(base.lean, 5);
    expect(at(1, { state: 'slam', sinceS: 0.5 }).lean).toBeCloseTo(base.lean, 5);
  });
});
