import { describe, expect, it } from 'vitest';
import { solveSkeleton } from '../../../src/animation/skeleton';
import { stancePose } from '../../../src/animation/stance';
import { BUILT_IN_LIBRARY } from '../../../src/characters/library';
import { resolveCharacter } from '../../../src/characters/resolve';
import { SELECT_STANCES } from '../../../src/data/presentation/select-stances';

const playable = Object.values(BUILT_IN_LIBRARY.characters).filter(
  (c) => c.template !== undefined && c.capabilities.isPlayable && c.characterType === 'fighter',
);

/** Fighter select stances (owner, 13/11/2026: a unique 2.5D stance for every fighter). */
describe('select stances', () => {
  it('every playable fighter has its own stance, title and style', () => {
    expect(playable.length).toBeGreaterThanOrEqual(4);
    for (const c of playable) {
      const s = SELECT_STANCES[c.id];
      expect(s, c.id).toBeDefined();
      expect(s!.title.length).toBeGreaterThan(3);
      expect(s!.style.length).toBeGreaterThan(10);
    }
  });

  it('no two fighters share a stance or a silhouette', () => {
    const keys = playable.map((c) => {
      const s = SELECT_STANCES[c.id]!;
      return JSON.stringify([s.pelvis, s.leadFoot, s.rearFoot, s.lean, s.front, s.back]);
    });
    expect(new Set(keys).size).toBe(keys.length);
    // Distinct heights: the stalker crouches lowest, the mage stands tallest.
    const pelvis = (id: string) => SELECT_STANCES[id]!.pelvis;
    expect(pelvis('shroud')).toBeLessThan(pelvis('inferno'));
    expect(pelvis('necro')).toBeGreaterThan(pelvis('inferno'));
    expect(SELECT_STANCES.shroud!.lean).toBeLessThan(-25); // hunched
  });

  it("each stance fits its fighter's own rig: both feet on the floor, every limb within reach, breathing", () => {
    for (const c of playable) {
      const def = resolveCharacter(c.id, BUILT_IN_LIBRARY);
      const s = SELECT_STANCES[c.id]!;
      const leg = def.bones.thigh + def.bones.shin;
      for (const foot of [s.leadFoot, s.rearFoot])
        expect(Math.hypot(foot, s.pelvis + s.breath.pelvis), c.id).toBeLessThan(1);
      for (const k of [0, 0.5, 1]) {
        const sk = solveSkeleton(stancePose(s, def.bones, k), def.bones);
        for (const p of [sk.head, ...sk.armFront, ...sk.armBack, ...sk.legFront, ...sk.legBack])
          expect(Number.isFinite(p.x) && Number.isFinite(p.y), c.id).toBe(true);
        expect(Math.abs(sk.legFront[2].y - sk.legBack[2].y), `${c.id} feet level`).toBeLessThan(0.02 * leg);
      }
      const still = solveSkeleton(stancePose(s, def.bones, 0), def.bones).head.y;
      const breath = solveSkeleton(stancePose(s, def.bones, 1), def.bones).head.y;
      expect(Math.abs(breath - still), `${c.id} breathes`).toBeGreaterThan(0.002);
    }
  });

  it('every fighter turns 30-45 degrees towards the camera; Titan is larger with his hands on his hips', () => {
    for (const c of playable) {
      const t = SELECT_STANCES[c.id]!.turn;
      expect(Math.asin(t) * (180 / Math.PI), c.id).toBeGreaterThanOrEqual(29.9);
      expect(Math.asin(t) * (180 / Math.PI), c.id).toBeLessThanOrEqual(45.1);
    }
    const titan = SELECT_STANCES.rampage!;
    for (const c of playable)
      if (c.id !== 'rampage') expect(titan.scale).toBeGreaterThan(SELECT_STANCES[c.id]!.scale * 1.2);
    const def = resolveCharacter('rampage', BUILT_IN_LIBRARY);
    const sk = solveSkeleton(stancePose(titan, def.bones, 0), def.bones);
    for (const arm of [sk.armFront, sk.armBack]) {
      const hand = arm[2]!;
      const waistY = sk.pelvis.y + (sk.chest.y - sk.pelvis.y) * 0.15;
      expect(Math.abs(hand.y - waistY), 'hand at the waist').toBeLessThan(0.15);
      expect(Math.abs(hand.x - sk.pelvis.x), 'hand at the hip').toBeLessThan(0.2);
    }
    // Elbows thrown out to both sides of the body.
    expect(Math.sign(sk.armFront[1]!.x - sk.chest.x)).not.toBe(Math.sign(sk.armBack[1]!.x - sk.chest.x));
  });
});
