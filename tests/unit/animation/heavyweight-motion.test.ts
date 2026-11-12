import { describe, expect, it } from 'vitest';
import { idlePose, idleStyleFor, runPose, walkPose } from '../../../src/animation/greybox-motion';
import { type BoneLengths, solveSkeleton } from '../../../src/animation/skeleton';
import rampage from '../../../src/data/characters/rampage/character.json';

const BONES = rampage.rig.bones as BoneLengths;
const sample = (f: (phase: number) => ReturnType<typeof walkPose>, n = 40) =>
  Array.from({ length: n }, (_, i) => ({ pose: f(i / n), s: solveSkeleton(f(i / n), BONES) }));
const range = (xs: number[]) => Math.max(...xs) - Math.min(...xs);

describe('heavyweight movement (owner, 12/11/2026: Rampage Buffer walks like a massive heavyweight)', () => {
  it('is picked by the Idle clip proc.idle.heavyweight; anything else stays the boxer default', () => {
    expect(idleStyleFor('proc.idle.heavyweight')).toBe('heavyweight');
    expect(idleStyleFor('proc.idle.taekwondo')).toBe('taekwondo');
    expect(idleStyleFor(undefined)).toBe('boxer');
  });

  it('walks leaning forward, with less bounce than the standard walk and low, planted feet', () => {
    const heavy = sample((p) => walkPose(p, BONES, 'heavyweight'));
    const normal = sample((p) => walkPose(p, BONES));
    const meanLean = (xs: typeof heavy) => xs.reduce((a, x) => a + x.pose.lean, 0) / xs.length;
    expect(meanLean(heavy)).toBeLessThan(meanLean(normal) - 0.08); // clearly further forward
    expect(range(heavy.map((x) => x.s.pelvis.y))).toBeLessThan(range(normal.map((x) => x.s.pelvis.y))); // not bouncy
    // Feet stay low: the swinging foot lifts less than in the standard walk.
    const lift = (xs: typeof heavy) => Math.max(...xs.map((x) => -Math.min(x.s.legFront[2].y, x.s.legBack[2].y)));
    expect(lift(heavy)).toBeLessThanOrEqual(lift(normal) + 1e-9);
  });

  it('plants each step: the hips sink hardest when the stride is widest (heel strike)', () => {
    const at = (p: number) => solveSkeleton(walkPose(p, BONES, 'heavyweight'), BONES).pelvis.y;
    // phase 0.25 = widest stride (heel strike), 0 = feet passing under the body. +y is down.
    expect(at(0.25)).toBeGreaterThan(at(0));
  });

  it('swings each clenched fist opposite its leg', () => {
    const a = walkPose(0.25, BONES, 'heavyweight');
    const b = walkPose(0.75, BONES, 'heavyweight');
    // Lead leg forward at 0.25 → lead arm back (smaller shoulder angle) than at 0.75.
    expect(a.legFront.root).toBeGreaterThan(b.legFront.root);
    expect(a.armFront.root).toBeLessThan(b.armFront.root);
  });

  it('runs grounded and leaning hard in, and idles in a planted, forward-leaning stance with no bounce', () => {
    const heavy = sample((p) => runPose(p, BONES, 'heavyweight'));
    const normal = sample((p) => runPose(p, BONES));
    expect(Math.max(...heavy.map((x) => x.pose.liftM ?? 0))).toBeLessThan(
      Math.max(...normal.map((x) => x.pose.liftM ?? 0)),
    ); // less flight
    expect(heavy[0]!.pose.lean).toBeLessThan(normal[0]!.pose.lean);
    const idle = Array.from({ length: 30 }, (_, i) => solveSkeleton(idlePose(i * 0.1, BONES, 'heavyweight'), BONES));
    const boxer = Array.from({ length: 30 }, (_, i) => solveSkeleton(idlePose(i * 0.1, BONES), BONES));
    expect(range(idle.map((s) => s.pelvis.y))).toBeLessThan(range(boxer.map((s) => s.pelvis.y)));
  });
});
