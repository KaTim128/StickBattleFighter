import { describe, expect, it } from 'vitest';
import { StickmanAnimator } from '../../../src/animation/animator';
import { AIR_POSE, idlePose, WALK_STRIDE_M, walkPose } from '../../../src/animation/greybox-motion';
import { blendPose, type Pose, solveSkeleton } from '../../../src/animation/skeleton';
import { GREYBOX_STICKMAN } from '../../../src/data/fighters/greybox-stickman';

const BONES = GREYBOX_STICKMAN.bones;
const samplePoses: [string, Pose][] = [
  ['idle 0s', idlePose(0)],
  ['idle 1.3s', idlePose(1.3)],
  ...[0, 0.25, 0.5, 0.75].map((p): [string, Pose] => [`walk ${p}`, walkPose(p)]),
  ['air', AIR_POSE],
];

describe('jointed skeleton (REQ-ANI-6)', () => {
  it('has a real elbow and knee on every limb, and they actually bend', () => {
    const s = solveSkeleton(walkPose(0.25), BONES);
    for (const limb of [s.armFront, s.armBack, s.legFront, s.legBack]) {
      expect(limb).toHaveLength(3); // root → middle joint → end
      const [a, b, c] = limb;
      const straight = Math.hypot(c.x - a.x, c.y - a.y);
      const bentLength = Math.hypot(b.x - a.x, b.y - a.y) + Math.hypot(c.x - b.x, c.y - b.y);
      expect(bentLength).toBeGreaterThan(straight + 1e-4); // not a rigid stick
    }
  });

  it.each(samplePoses)('%s: knees bend backwards and elbows forwards, like real joints', (_name, pose) => {
    for (const leg of [pose.legFront, pose.legBack]) expect(leg.bend).toBeLessThanOrEqual(0);
    for (const arm of [pose.armFront, pose.armBack]) expect(arm.bend).toBeGreaterThanOrEqual(0);
  });

  it.each(samplePoses)('%s: the lowest foot rests on the floor line', (_name, pose) => {
    const s = solveSkeleton(pose, BONES);
    expect(Math.max(s.legFront[2].y, s.legBack[2].y)).toBeCloseTo(0, 6);
    expect(s.head.y).toBeLessThan(s.pelvis.y); // head above hips (up the screen)
  });

  it('blends joint by joint', () => {
    const mid = blendPose(idlePose(0), AIR_POSE, 0.5);
    expect(mid.legFront.bend).toBeCloseTo((idlePose(0).legFront.bend + AIR_POSE.legFront.bend) / 2, 9);
  });
});

describe('StickmanAnimator', () => {
  const motion = { speedMps: 5, maxSpeedMps: 5, heightM: 0, peakHeightM: 0.4 };

  it('eases into the walk instead of snapping', () => {
    const anim = new StickmanAnimator();
    anim.update(1 / 60, motion);
    expect(anim.weights.walk).toBeGreaterThan(0);
    expect(anim.weights.walk).toBeLessThan(0.3);
    for (let i = 0; i < 60; i++) anim.update(1 / 60, motion);
    expect(anim.weights.walk).toBeGreaterThan(0.99);
  });

  it('blends towards the airborne pose with hop height and back on landing', () => {
    const anim = new StickmanAnimator();
    for (let i = 0; i < 30; i++) anim.update(1 / 60, { ...motion, speedMps: 0, heightM: 0.4 });
    expect(anim.weights.air).toBeGreaterThan(0.95);
    for (let i = 0; i < 30; i++) anim.update(1 / 60, { ...motion, speedMps: 0, heightM: 0 });
    expect(anim.weights.air).toBeLessThan(0.05);
  });

  it('a stride of walking distance advances exactly one walk cycle (feet keep pace)', () => {
    expect(WALK_STRIDE_M).toBeGreaterThan(0);
    // 0.3 s at 5 m/s = 1.5 m = one stride → the cycle returns to its starting pose.
    const a = new StickmanAnimator();
    const b = new StickmanAnimator();
    for (let i = 0; i < 120; i++) {
      a.update(1 / 60, motion);
      b.update(1 / 60, motion);
    }
    for (let i = 0; i < 18; i++) b.update(1 / 60, motion);
    const pa = a.update(0, motion);
    const pb = b.update(0, motion);
    expect(pb.legFront.root).toBeCloseTo(pa.legFront.root, 1);
  });
});
