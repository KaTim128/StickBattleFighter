import { describe, expect, it } from 'vitest';
import { StickmanAnimator } from '../../../src/animation/animator';
import { idlePose, relaxedPose, runPose, walkPose } from '../../../src/animation/greybox-motion';
import { type BoneLengths, solveSkeleton } from '../../../src/animation/skeleton';
import base from '../../../src/data/characters/base-stickman/character.json';

const BONES = base.rig.bones as BoneLengths;
const STEP = 1 / 60;

const drive = (
  a: StickmanAnimator,
  seconds: number,
  motion: { speedMps: number; sprinting?: boolean; relaxed?: boolean },
) => {
  for (let i = 0; i < seconds / STEP; i++)
    a.update(STEP, { maxSpeedMps: 5, heightM: 0, peakHeightM: 0.6, verticalSpeedMps: 0, ...motion });
};

/** Owner, 12/11/2026: a proper walk unless Shift is held; a relaxed stand after 3 s out of the fight. */
describe('walking, running and the relaxed idle', () => {
  it('moving without Shift walks at any speed; only sprinting runs', () => {
    const a = new StickmanAnimator(BONES);
    drive(a, 1, { speedMps: 5, sprinting: false });
    expect(a.weights.run).toBeLessThan(0.02);
    expect(a.weights.walk).toBeGreaterThan(0.98);
    drive(a, 1, { speedMps: 7, sprinting: true });
    expect(a.weights.run).toBeGreaterThan(0.98);
    drive(a, 1, { speedMps: 5, sprinting: false });
    expect(a.weights.run).toBeLessThan(0.02); // back to walking smoothly, not snapped
  });

  it('the walk is its own cycle: upright, straighter knees, one foot always down, no flight', () => {
    for (let i = 0; i < 40; i++) {
      const walk = walkPose(i / 40, BONES);
      const run = runPose(i / 40, BONES);
      expect(walk.lean).toBeGreaterThan(run.lean); // more upright than the run
      expect(walk.liftM ?? 0).toBe(0); // never airborne
      const s = solveSkeleton(walk, BONES);
      expect(Math.min(-s.legFront[2].y, -s.legBack[2].y)).toBeLessThan(0.01); // a foot on the floor
      // Knees straighter than the fighting stance's.
      expect(Math.abs(walk.legFront.bend) + Math.abs(walk.legBack.bend)).toBeLessThan(
        Math.abs(idlePose(0, BONES).legFront.bend) + Math.abs(idlePose(0, BONES).legBack.bend) + 0.35,
      );
    }
    // Arms swing opposite the legs: the lead fist is back when the lead foot is forward.
    const a = walkPose(0.25, BONES);
    const b = walkPose(0.75, BONES);
    expect(Math.sign(a.armFront.root - b.armFront.root)).toBe(-Math.sign(a.legFront.root - b.legFront.root));
  });

  it('the relaxed stand: tall on straight legs with the hands down at the sides, not the guard', () => {
    const relaxed = solveSkeleton(relaxedPose(1, BONES), BONES);
    const guard = solveSkeleton(idlePose(1, BONES), BONES);
    expect(-relaxed.pelvis.y).toBeGreaterThan(-guard.pelvis.y + 0.05); // standing taller
    for (const arm of [relaxed.armFront, relaxed.armBack]) expect(arm[2].y).toBeGreaterThan(guard.armFront[2].y + 0.25);
  });

  it('settles into the relaxed stand gradually, and snaps back to the guard quickly', () => {
    const a = new StickmanAnimator(BONES);
    drive(a, 0.2, { speedMps: 0, relaxed: true });
    expect(a.weights.relax).toBeGreaterThan(0.2);
    expect(a.weights.relax).toBeLessThan(0.6); // no snap
    drive(a, 2, { speedMps: 0, relaxed: true });
    expect(a.weights.relax).toBeGreaterThan(0.95);
    drive(a, 0.25, { speedMps: 0, relaxed: false });
    expect(a.weights.relax).toBeLessThan(0.1);
  });
});

/** Owner, 12/11/2026: the climb raises one elbow over the ledge and pushes up on it. */
describe('ledge climb poses', () => {
  it('hangs from both hands, hooks the lead elbow up over the edge, then presses down on it', async () => {
    const { climbPose } = await import('../../../src/animation/greybox-motion');
    const at = (p: number) => solveSkeleton(climbPose(p), BONES);
    const hang = at(0);
    // Hanging: both hands above the head.
    for (const arm of [hang.armFront, hang.armBack]) expect(arm[2].y).toBeLessThan(hang.head.y);
    // Elbow over: the lead elbow is higher than its shoulder, while the rear hand still pulls from above.
    const over = at(0.6);
    expect(over.armFront[1].y).toBeLessThan(over.chest.y - 0.05);
    // Press: the lead elbow is above its hand (the hand planted on the top, the arm driving down).
    const press = at(0.82);
    expect(press.armFront[1].y).toBeLessThan(press.armFront[2].y - 0.1);
    // Mantle: both arms nearly straight, hands below the chest, pushing the body up.
    const mantle = at(1);
    for (const arm of [mantle.armFront, mantle.armBack]) expect(arm[2].y).toBeGreaterThan(mantle.chest.y + 0.3);
    // Every stage blends smoothly: no joint jumps more than 30 degrees per 2% of the climb (the
    // lead arm's biggest sweep, forward-up to back-down as the shoulder rises over the elbow, stays under it).
    for (let p = 0; p < 2; p += 0.02) {
      const a = climbPose(p);
      const b = climbPose(p + 0.02);
      for (const k of ['armFront', 'armBack', 'legFront', 'legBack'] as const) {
        expect(Math.abs(a[k].root - b[k].root)).toBeLessThan((30 * Math.PI) / 180);
        expect(Math.abs(a[k].bend - b[k].bend)).toBeLessThan((30 * Math.PI) / 180);
      }
    }
  });
});
