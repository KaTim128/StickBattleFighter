import { describe, expect, it } from 'vitest';
import { StickmanAnimator } from '../../../src/animation/animator';
import {
  AIR_FALL_POSE,
  AIR_POSE,
  AIR_RISE_POSE,
  BOXER_STANCE,
  idlePose,
  runPose,
  stanceFor,
  strideAt,
  walkPose,
} from '../../../src/animation/greybox-motion';
import { blendPose, legIk, type Pose, solveSkeleton } from '../../../src/animation/skeleton';
import { GREYBOX_STICKMAN } from '../../../src/data/fighters/greybox-stickman';

const BONES = GREYBOX_STICKMAN.bones;
const samplePoses: [string, Pose][] = [
  ['idle 0s', idlePose(0, BONES)],
  ['idle bounce', idlePose(0.14, BONES)],
  ...[0, 0.25, 0.5, 0.75].map((p): [string, Pose] => [`walk ${p}`, walkPose(p, BONES)]),
  ['air', AIR_POSE],
];

describe('jointed skeleton (REQ-ANI-6)', () => {
  it('has a real elbow and knee on every limb, and they actually bend', () => {
    const s = solveSkeleton(walkPose(0.25, BONES), BONES);
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

  // The guard is up whenever standing; the jump has its own stance (owner request). Walking and running
  // swing the arms freely instead (owner, 11/11/2026: "strong and confident", SUP-06).
  it.each(samplePoses.filter(([n]) => n.startsWith('idle')))(
    '%s: guard is up, both fists near the chin, never hanging down',
    (_name, pose) => {
      const s = solveSkeleton(pose, BONES);
      for (const hand of [s.armFront[2], s.armBack[2]]) {
        expect(hand.y).toBeLessThan(s.chest.y + 0.05); // at or above chest height
        expect(hand.x).toBeGreaterThan(s.chest.x); // in front of the body
      }
    },
  );

  it('walking (owner, 11/11/2026): the legs alternate and each arm swings opposite its leg', () => {
    const a = solveSkeleton(walkPose(0.25, BONES), BONES); // lead leg forward
    const b = solveSkeleton(walkPose(0.75, BONES), BONES); // rear leg forward
    // Legs alternate: whichever foot is ahead swaps.
    expect(a.legFront[2].x - a.pelvis.x).toBeGreaterThan(b.legFront[2].x - b.pelvis.x + 0.3);
    expect(b.legBack[2].x - b.pelvis.x).toBeGreaterThan(a.legBack[2].x - a.pelvis.x + 0.3);
    // Arms swing opposite the legs: the lead fist is further forward when the REAR leg is forward.
    expect(b.armFront[2].x).toBeGreaterThan(a.armFront[2].x + 0.05);
    expect(a.armBack[2].x).toBeGreaterThan(b.armBack[2].x + 0.05);
    // The swinging foot is lifted off the floor mid-swing.
    const swing = solveSkeleton(walkPose(0, BONES), BONES); // lead leg passing forward
    expect(swing.legFront[2].y).toBeLessThan(-0.05);
  });

  it('walk and run are strong and confident (owner, 11/11/2026): tall hips, chest up, head level, fists in control', () => {
    const deg = (r: number) => (r * 180) / Math.PI;
    const cases: [typeof walkPose, number, number][] = [
      [walkPose, 0.7, -6], // hips >= 0.7 m on 0.8 m legs, chest within 6 degrees of upright
      [runPose, 0.66, -17], // the run drives from the chest but never hunches over
    ];
    for (const [gait, minHipM, minLeanDeg] of cases) {
      for (let i = 0; i < 40; i++) {
        const pose = gait(i / 40, BONES);
        const s = solveSkeleton(pose, BONES);
        expect(-s.pelvis.y).toBeGreaterThan(minHipM);
        expect(deg(pose.lean)).toBeGreaterThan(minLeanDeg);
        expect(Math.abs(deg(pose.head))).toBeLessThan(10); // chin up, not tucked
        for (const arm of [s.armFront, s.armBack]) {
          const [, , hand] = arm;
          expect(hand.y).toBeLessThan(s.pelvis.y); // fists never hang below the hips
          expect(hand.y).toBeGreaterThan(s.head.y); // nor flail above the head
          expect(Math.abs(hand.x - s.chest.x)).toBeLessThan(0.4); // they swing, controlled
        }
        for (const arm of [pose.armFront, pose.armBack]) expect(deg(arm.bend)).toBeGreaterThan(15); // elbows bent
      }
    }
  });

  it('running: longer strides, higher knees, more lean and a bigger arm pump than walking', () => {
    const span = (pose: (p: number, b: typeof BONES) => Pose) => {
      const xs = Array.from({ length: 40 }, (_, i) => solveSkeleton(pose(i / 40, BONES), BONES).legFront[2].x);
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(span(runPose)).toBeGreaterThan(span(walkPose) + 0.15);
    expect(runPose(0, BONES).lean).toBeLessThan(walkPose(0, BONES).lean);
    const arm = (pose: (p: number, b: typeof BONES) => Pose) =>
      Math.abs(pose(0.25, BONES).armFront.root - pose(0.75, BONES).armFront.root);
    expect(arm(runPose)).toBeGreaterThan(arm(walkPose) * 2);
    for (let i = 0; i < 40; i++) {
      const s = solveSkeleton(runPose(i / 40, BONES), BONES);
      for (const [hip, , foot] of [s.legFront, s.legBack]) {
        expect(Math.hypot(foot.x - hip.x, foot.y - hip.y)).toBeLessThan(BONES.thigh + BONES.shin - 0.012); // no locked knees
      }
    }
  });

  it('idle is a wide, low, planted stance: both feet on the floor about 0.74 m apart, knees bent', () => {
    for (const t of [0, 0.1, 0.2, 0.3, 0.4]) {
      const s = solveSkeleton(idlePose(t, BONES), BONES);
      expect(s.legFront[2].y).toBeCloseTo(0, 3);
      expect(s.legBack[2].y).toBeCloseTo(0, 3);
      expect(s.legFront[2].x - s.legBack[2].x).toBeGreaterThan(0.6);
      // crouched: hips clearly lower than a straight-legged stand
      expect(-s.pelvis.y).toBeLessThan(BONES.thigh + BONES.shin - 0.08);
    }
  });

  it('knees never lock fully straight while standing or shuffling (no stiff legs)', () => {
    const straight = BONES.thigh + BONES.shin;
    const poses = [
      ...[0, 0.1, 0.2, 0.3].map((t) => idlePose(t, BONES)),
      ...Array.from({ length: 40 }, (_, i) => walkPose(i / 40, BONES)),
    ];
    for (const pose of poses) {
      const s = solveSkeleton(pose, BONES);
      for (const [hip, , foot] of [s.legFront, s.legBack]) {
        expect(Math.hypot(foot.x - hip.x, foot.y - hip.y)).toBeLessThan(straight - 0.012);
      }
    }
  });

  it('unarmed default is the boxer stance: knees only slightly bent, feet staggered', () => {
    expect(stanceFor(null)).toBe(BOXER_STANCE);
    const s = solveSkeleton(idlePose(0.35, BONES), BONES); // bounce at its highest point
    const straight = BONES.thigh + BONES.shin;
    const hip = -s.pelvis.y;
    expect(hip).toBeGreaterThan(straight * 0.8); // slightly bent, not a deep crouch
    expect(hip).toBeLessThan(straight - 0.08); // but clearly bent
    expect(s.legFront[2].x - s.legBack[2].x).toBeGreaterThan(0.5);
  });

  it('jump has its own stance: rising drives the lead knee up; falling tucks both legs', () => {
    const rise = solveSkeleton(AIR_RISE_POSE, BONES);
    const fall = solveSkeleton(AIR_FALL_POSE, BONES);
    const stand = solveSkeleton(idlePose(0, BONES), BONES);
    // lead knee well above standing knee height (relative to the hips)
    expect(rise.legFront[1].y - rise.pelvis.y).toBeLessThan(stand.legFront[1].y - stand.pelvis.y - 0.1);
    for (const leg of [AIR_FALL_POSE.legFront, AIR_FALL_POSE.legBack]) expect(leg.bend).toBeLessThan(-1); // tucked
    expect(fall.legFront[2].y).not.toBeCloseTo(rise.legFront[2].y, 2); // visibly different poses
  });

  it('blends joint by joint', () => {
    const mid = blendPose(idlePose(0, BONES), AIR_POSE, 0.5);
    expect(mid.legFront.bend).toBeCloseTo((idlePose(0, BONES).legFront.bend + AIR_POSE.legFront.bend) / 2, 9);
  });
});

describe('legIk', () => {
  it('puts the foot exactly on the target with the knee bent forward', () => {
    const leg = legIk(0.3, 0.6, BONES.thigh, BONES.shin);
    const kneeX = Math.sin(leg.root) * BONES.thigh;
    const kneeY = Math.cos(leg.root) * BONES.thigh;
    const footX = kneeX + Math.sin(leg.root + leg.bend) * BONES.shin;
    const footY = kneeY + Math.cos(leg.root + leg.bend) * BONES.shin;
    expect(footX).toBeCloseTo(0.3, 6);
    expect(footY).toBeCloseTo(0.6, 6);
    expect(leg.bend).toBeLessThan(0); // knee flexes like a real knee
    expect(kneeX).toBeGreaterThan(0.3 * (kneeY / 0.6)); // knee sits forward of the hip–foot line
  });

  it('reaches as far as it can towards an out-of-range target without breaking', () => {
    const leg = legIk(2, 2, BONES.thigh, BONES.shin);
    expect(Number.isFinite(leg.root)).toBe(true);
    expect(Math.abs(leg.bend)).toBeLessThan(0.05); // nearly straight
  });
});

describe('StickmanAnimator', () => {
  const motion = { speedMps: 5, maxSpeedMps: 5, heightM: 0, peakHeightM: 0.4 };

  it('eases into the walk instead of snapping', () => {
    const anim = new StickmanAnimator(BONES);
    anim.update(1 / 60, motion);
    expect(anim.weights.walk).toBeGreaterThan(0);
    expect(anim.weights.walk).toBeLessThan(0.3);
    for (let i = 0; i < 60; i++) anim.update(1 / 60, motion);
    expect(anim.weights.walk).toBeGreaterThan(0.99);
  });

  it('blends towards the airborne pose with hop height and back on landing', () => {
    const anim = new StickmanAnimator(BONES);
    for (let i = 0; i < 30; i++) anim.update(1 / 60, { ...motion, speedMps: 0, heightM: 0.4 });
    expect(anim.weights.air).toBeGreaterThan(0.95);
    for (let i = 0; i < 30; i++) anim.update(1 / 60, { ...motion, speedMps: 0, heightM: 0 });
    expect(anim.weights.air).toBeLessThan(0.05);
  });

  it('one stride of distance advances exactly one gait cycle at any speed (feet keep pace)', () => {
    for (const speedMps of [1.5, 5]) {
      const m = { ...motion, speedMps };
      const a = new StickmanAnimator(BONES);
      const b = new StickmanAnimator(BONES);
      for (let i = 0; i < 120; i++) {
        a.update(1 / 60, m);
        b.update(1 / 60, m);
      }
      for (let i = 0; i < Math.round((strideAt(speedMps) / speedMps) * 60); i++) b.update(1 / 60, m);
      expect(b.update(0, m).legFront.root).toBeCloseTo(a.update(0, m).legFront.root, 1);
    }
    expect(strideAt(5)).toBeGreaterThan(strideAt(1.5)); // running covers more ground per cycle
  });

  it('blends idle → walk → run by speed, without snapping', () => {
    const anim = new StickmanAnimator(BONES);
    const settle = (speedMps: number) => {
      for (let i = 0; i < 60; i++) anim.update(1 / 60, { ...motion, speedMps });
      return anim.weights;
    };
    expect(settle(0).walk).toBeLessThan(0.05);
    const walking = settle(1.8);
    expect(walking.walk).toBeGreaterThan(0.95);
    expect(walking.run).toBeLessThan(0.05);
    expect(settle(5).run).toBeGreaterThan(0.95);
    // One frame after a sudden stop the weights have only moved part of the way (eased, not snapped).
    anim.update(1 / 60, { ...motion, speedMps: 0 });
    expect(anim.weights.walk).toBeGreaterThan(0.5);
  });
});
