import { describe, expect, it } from 'vitest';
import type { Limb, Pose } from '../../../src/animation/skeleton';
import type { HideKind } from '../../../src/modes/hide-seek/house-types';
import {
  ACTION_DURATION_S,
  actionFor,
  actionPose,
  type HunterActionKind,
  lookBoost,
  NEUTRAL,
  NOISE_AT,
  openAmount,
} from '../../../src/modes/hide-seek/hunter-actions';

const KINDS = Object.keys(ACTION_DURATION_S) as HunterActionKind[];
const HIDE_KINDS: HideKind[] = [
  'under-bed',
  'wardrobe',
  'cupboard',
  'chest',
  'box',
  'behind-sofa',
  'curtain',
  'shower-curtain',
  'bush',
  'under-table',
  'shed-cabinet',
];
const joints = (p: Pose): number[] => {
  const l = (x: Limb) => [x.root, x.bend];
  return [p.lean, p.head, ...l(p.armFront), ...l(p.armBack), ...l(p.legFront), ...l(p.legBack)];
};
const deg = (r: number) => (r * 180) / Math.PI;

describe("the hunter's search animations", () => {
  it('every kind of hiding place has a thorough way to check it and a quick glance', () => {
    for (const k of HIDE_KINDS) {
      expect(actionFor(k, false)).toBe('glance');
      expect(actionFor(k, true), k).not.toBe('glance');
    }
    expect(actionFor('wardrobe', true)).toBe('open-door');
    expect(actionFor('cupboard', true)).toBe('open-door');
    expect(actionFor('under-bed', true)).toBe('look-under');
    expect(actionFor('chest', true)).toBe('lift-lid');
    expect(actionFor('curtain', true)).toBe('pull-curtain');
    expect(actionFor('bush', true)).toBe('part-bush');
  });

  it('each starts from the neutral stance and (but the strike) eases back to it', () => {
    for (const k of KINDS) {
      const close = (a: number[], b: number[]) => {
        for (let i = 0; i < a.length; i++) expect(a[i], k).toBeCloseTo(b[i]!, 6);
      };
      close(joints(actionPose(k, 0)), joints(NEUTRAL));
      if (k !== 'strike') close(joints(actionPose(k, 1)), joints(NEUTRAL));
      expect(ACTION_DURATION_S[k]).toBeGreaterThan(0.5);
    }
  });

  it('moves smoothly: no joint jumps between neighbouring instants (natural transitions, not snaps)', () => {
    for (const k of KINDS) {
      let prev = joints(actionPose(k, 0));
      for (let i = 1; i <= 240; i++) {
        const now = joints(actionPose(k, i / 240));
        // The strike is a deliberate lunge: allowed a faster move.
        const limit = k === 'strike' ? 0.2 : 0.09;
        for (let j = 0; j < now.length; j++)
          expect(Math.abs(now[j]! - prev[j]!), `${k} joint ${j} at ${i}/240`).toBeLessThan(limit);
        prev = now;
      }
    }
  });

  it('kneeling to look under a bed really kneels: bent right over, knees deeply bent', () => {
    const look = actionPose('look-under', 0.62);
    expect(deg(look.lean)).toBeLessThan(-65); // bent far forward
    expect(deg(look.legFront.bend)).toBeLessThan(-110); // front knee folded
    expect(deg(look.legBack.bend)).toBeLessThan(-100); // back knee folded (almost on the floor)
    expect(deg(look.armFront.root)).toBeGreaterThan(40); // a hand reaches down and out
  });

  it('opening a cupboard reaches out to the handle, then pulls, then leans in', () => {
    const reach = actionPose('open-door', 0.46);
    expect(deg(reach.armFront.root)).toBeGreaterThan(75); // arm out to the handle
    const pull = actionPose('open-door', 0.58);
    expect(deg(pull.armFront.root)).toBeLessThan(deg(reach.armFront.root) - 25); // drawn back
    const look = actionPose('open-door', 0.82);
    expect(deg(look.lean)).toBeLessThan(-25); // leaning in to look
  });

  it('lifting a lid uses both hands; a curtain is reached for high; listening puts a hand up to the head', () => {
    const lid = actionPose('lift-lid', 0.42);
    expect(deg(lid.armFront.root)).toBeGreaterThan(90);
    expect(deg(lid.armBack.root)).toBeGreaterThan(50);
    expect(deg(actionPose('pull-curtain', 0.5).armFront.root)).toBeGreaterThan(100);
    const listen = actionPose('listen', 0.5);
    expect(deg(listen.armFront.root)).toBeGreaterThan(140);
    expect(Math.abs(deg(listen.head))).toBeGreaterThan(15); // head cocked
  });

  it('things open as he pulls and stay open; a bush shakes and settles', () => {
    for (const k of ['open-door', 'lift-lid', 'pull-curtain'] as const) {
      let prev = 0;
      for (let i = 0; i <= 100; i++) {
        const a = openAmount(k, i / 100);
        expect(a, k).toBeGreaterThanOrEqual(prev - 1e-9);
        prev = a;
      }
      expect(openAmount(k, 0)).toBe(0);
      expect(openAmount(k, 1)).toBeCloseTo(1, 5);
    }
    expect(openAmount('part-bush', 0)).toBeCloseTo(0, 5);
    expect(openAmount('part-bush', 0.5)).toBeGreaterThan(0.8);
    expect(openAmount('part-bush', 1)).toBeCloseTo(0, 5);
  });

  it('makes its noise at a moment inside the action, and sees most while he is looking in', () => {
    for (const k of ['open-door', 'lift-lid', 'pull-curtain', 'part-bush', 'knife-scrape', 'look-under'] as const)
      expect(NOISE_AT[k]).toBeGreaterThan(0);
    expect(lookBoost('open-door', 0.7)).toBeGreaterThanOrEqual(3);
    expect(lookBoost('open-door', 0.2)).toBe(1);
    expect(lookBoost('look-under', 0.6)).toBeGreaterThanOrEqual(3);
    expect(lookBoost('glance', 0.5)).toBe(1); // a glance never sees inside
  });
});
