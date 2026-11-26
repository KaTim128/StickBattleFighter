import { describe, expect, it } from 'vitest';
import { idlePose, runPose, walkPose } from '../../../src/animation/greybox-motion';
import { solveSkeleton } from '../../../src/animation/skeleton';
import { BUILT_IN_LIBRARY } from '../../../src/characters/library';
import { loadCharacter } from '../../../src/characters/load';
import { SICKLE_WIELDER_KIT } from '../../../src/data/abilities/sickle-wielder';

/** Kamaw moves like a human ape (owner, 26/11/2026): never upright, a knuckle on the floor, the sickle hand trailing behind. */
describe('Kamaw: ape posture', () => {
  const def = loadCharacter('sickle-wielder', BUILT_IN_LIBRARY).def;
  const poses = [
    ...[0, 0.4, 0.9, 1.7].map((t) => idlePose(t, def.bones, 'crawler')),
    ...[0, 0.25, 0.5, 0.75].map((p) => walkPose(p, def.bones, 'crawler')),
    ...[0, 0.25, 0.5, 0.75].map((p) => runPose(p, def.bones, 'crawler')),
  ];

  it('leans far forward in idle, walk and run', () => {
    for (const p of poses) expect(p.lean).toBeLessThan(-(50 * Math.PI) / 180);
  });

  it('lets the sickle hand hang down behind him and keeps the other hand down at the floor', () => {
    for (const p of poses) {
      const sk = solveSkeleton(p, def.bones);
      expect(sk.armFront[2].x).toBeLessThan(sk.chest.x); // behind the shoulder
      expect(sk.armFront[2].y).toBeGreaterThan(sk.chest.y + 0.3); // hanging low
      expect(sk.armBack[2].y).toBeGreaterThan(-0.2);
    }
    const still = solveSkeleton(idlePose(0, def.bones, 'crawler'), def.bones);
    expect(Math.abs(still.armBack[2].y)).toBeLessThan(0.06); // the knuckles rest on the floor
  });

  it('throws the chained sickle on a curve and draws a steel chain', () => {
    const d = SICKLE_WIELDER_KIT.a3.delivery;
    expect(d.type === 'projectile' && d.arcRad).toBeGreaterThan(0.5);
    expect(SICKLE_WIELDER_KIT.a3.look?.steelChain).toBe(true);
    expect(SICKLE_WIELDER_KIT.a5?.look?.airBody).toBe('none');
  });
});
