import { describe, expect, it } from 'vitest';
import { abilityPose } from '../../../src/animation/ability-poses';
import { idlePose, idleStyleFor } from '../../../src/animation/greybox-motion';
import { type BoneLengths, solveSkeleton } from '../../../src/animation/skeleton';
import necro from '../../../src/data/characters/necro/character.json';

const BONES = necro.rig.bones as BoneLengths;
const deg = (r: number) => (r * 180) / Math.PI;

describe('Necro motion (owner, 12/11/2026)', () => {
  it('stands straight and confident at rest: upright torso, nearly straight legs, staff hand at chest height', () => {
    expect(idleStyleFor('proc.idle.mage')).toBe('mage');
    for (const t of [0, 0.7, 1.4, 2.1]) {
      const p = idlePose(t, BONES, 'mage');
      expect(Math.abs(deg(p.lean))).toBeLessThan(4); // upright, no fighting crouch
      expect(Math.abs(deg(p.legFront.bend))).toBeLessThan(25);
      expect(Math.abs(deg(p.legBack.bend))).toBeLessThan(25);
      const s = solveSkeleton(p, BONES);
      expect(s.armBack[2].y).toBeLessThan(s.pelvis.y); // the staff hand is above the hips
    }
  });

  it('summons with the free arm raised overhead, levitating off the floor, without flailing', () => {
    const base = idlePose(0, BONES, 'mage');
    for (const id of ['undeadArmy']) {
      const p = abilityPose(base, id, 'recovery', 0.3, false);
      expect(deg(p.armFront.root)).toBeGreaterThan(150); // free arm up
      expect(p.liftM ?? 0).toBeGreaterThan(0.2); // off the ground
      expect(Math.abs(deg(p.lean))).toBeLessThan(10); // controlled, upright
    }
  });
});
