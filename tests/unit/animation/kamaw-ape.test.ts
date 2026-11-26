import { describe, expect, it } from 'vitest';
import { idlePose, runPose, walkPose } from '../../../src/animation/greybox-motion';
import { solveSkeleton } from '../../../src/animation/skeleton';
import { BUILT_IN_LIBRARY } from '../../../src/characters/library';
import { loadCharacter } from '../../../src/characters/load';
import { SELECT_STANCES } from '../../../src/data/presentation/select-stances';
import { SICKLE_WIELDER_KIT } from '../../../src/data/abilities/sickle-wielder';

/** Kamaw in battle (owner, 26/11/2026): Shroud's predator crouch, lower and wider; the select-screen pose is a separate stance. */
describe('Kamaw: predator posture', () => {
  const def = loadCharacter('sickle-wielder', BUILT_IN_LIBRARY).def;
  const shroud = loadCharacter('shroud', BUILT_IN_LIBRARY).def;
  const legs = def.bones.thigh + def.bones.shin;

  it('idles lower and wider than Shroud, leaning forward on bent knees', () => {
    const k = solveSkeleton(idlePose(0.3, def.bones, 'crawler'), def.bones);
    const s = solveSkeleton(idlePose(0.3, shroud.bones, 'stalker'), shroud.bones);
    expect(idlePose(0.3, def.bones, 'crawler').lean).toBeLessThan(-(25 * Math.PI) / 180);
    expect(-k.pelvis.y / legs).toBeLessThan(-s.pelvis.y / (shroud.bones.thigh + shroud.bones.shin)); // hips lower
    expect(Math.abs(k.legFront[2].x - k.legBack[2].x) / legs).toBeGreaterThan(
      Math.abs(s.legFront[2].x - s.legBack[2].x) / (shroud.bones.thigh + shroud.bones.shin),
    ); // feet wider apart
  });

  it('walks and runs low with wide steps, leaning further forward as he speeds up', () => {
    let widest = 0;
    for (const p of [0, 0.25, 0.5, 0.75]) {
      const w = solveSkeleton(walkPose(p, def.bones, 'crawler'), def.bones);
      const r = solveSkeleton(runPose(p, def.bones, 'crawler'), def.bones);
      expect(-w.pelvis.y / legs).toBeLessThan(0.7);
      expect(-r.pelvis.y / legs).toBeLessThan(0.7);
      widest = Math.max(widest, Math.abs(r.legFront[2].x - r.legBack[2].x) / legs);
    }
    expect(widest).toBeGreaterThan(0.7);
    expect(runPose(0, def.bones, 'crawler').lean).toBeLessThan(walkPose(0, def.bones, 'crawler').lean);
  });

  it('keeps the select-screen pose: a wind-up with the sickle arm hanging back', () => {
    const s = SELECT_STANCES['sickle-wielder']!;
    expect(s.front.x).toBeLessThan(0);
    expect(s.back.y).toBeGreaterThan(0.9);
    expect(s.lean).toBe(-40);
  });

  it('the chain abilities draw a steel chain; the plain ones never do', () => {
    for (const a of [SICKLE_WIELDER_KIT.a1, SICKLE_WIELDER_KIT.a2, SICKLE_WIELDER_KIT.a4, SICKLE_WIELDER_KIT.ult]) expect(a.look?.steelChain, a.id).toBe(true);
    for (const a of [SICKLE_WIELDER_KIT.a3, SICKLE_WIELDER_KIT.a5!]) expect(a.look?.steelChain, a.id).toBeUndefined();
    const d = SICKLE_WIELDER_KIT.a4.delivery;
    expect(d.type === 'projectile' && d.arcRad).toBeGreaterThan(0.3); // the snare curves in round the legs
  });
});
