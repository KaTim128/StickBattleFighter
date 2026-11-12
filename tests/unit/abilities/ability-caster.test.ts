import { describe, expect, it } from 'vitest';
import { AbilityCaster } from '../../../src/abilities/ability-caster';
import { ABILITY_SLOTS } from '../../../src/abilities/ability-def';
import { hasAbilityPose } from '../../../src/animation/ability-poses';
import { INFERNO_KIT } from '../../../src/data/abilities/inferno';
import { NECRO_KIT } from '../../../src/data/abilities/necro';

const READY = { canAct: true, stamina: 100, airborne: false };
const run = (c: AbilityCaster, s: number) => {
  const all = { released: [] as string[], ended: [] as string[] };
  for (let i = 0; i < Math.round(s * 60); i++) {
    const ev = c.update(1 / 60);
    if (ev.released) all.released.push(ev.released.id);
    if (ev.ended) all.ended.push(ev.ended.id);
  }
  return all;
};

describe('Inferno kit data (REQ-ABL-2)', () => {
  it('has four abilities and one ultimate (owner, 12/11/2026), each with VFX and SFX hooks', () => {
    for (const slot of ABILITY_SLOTS) {
      const d = INFERNO_KIT[slot];
      expect(d.slot).toBe(slot);
      expect(d.vfx).not.toBe('');
      expect(d.sfx.cast && d.sfx.release && d.sfx.impact).toBeTruthy();
    }
    expect(new Set(ABILITY_SLOTS.map((s) => INFERNO_KIT[s].id)).size).toBe(5);
    expect(INFERNO_KIT.ult.interruptible).toBe(false);
  });

  it('telegraphed areas warn before they land (REQ-ABL-6); the beam charges for 1 s first (owner, 12/11/2026)', () => {
    const a3 = INFERNO_KIT.a3;
    expect(a3.delivery.type).toBe('beam');
    expect(a3.castS).toBe(1);
    const ult = INFERNO_KIT.ult.delivery;
    expect(ult.type === 'leap' && ult.airS >= 0.5).toBe(true);
  });
});

describe('AbilityCaster', () => {
  it('runs wind-up → release → recovery → end, firing the release event once', () => {
    const c = new AbilityCaster(INFERNO_KIT);
    expect(c.check('a1', READY)).toBeNull();
    c.start('a1');
    const ev = run(c, INFERNO_KIT.a1.castS + INFERNO_KIT.a1.recoveryS + 0.05);
    expect(ev.released).toEqual(['fireball']);
    expect(ev.ended).toEqual(['fireball']);
    expect(c.cast).toBeNull();
  });

  it('blocks casting on cooldown, without stamina, while busy, or in the air', () => {
    const c = new AbilityCaster(INFERNO_KIT);
    expect(c.check('a3', { ...READY, stamina: 10 })).toBe('stamina');
    expect(c.check('a1', { ...READY, canAct: false })).toBe('busy');
    expect(c.check('a1', { ...READY, airborne: true })).toBe('airborne');
    c.start('a1');
    expect(c.check('a2', READY)).toBe('busy'); // one cast at a time
    run(c, INFERNO_KIT.a1.castS + INFERNO_KIT.a1.recoveryS + 0.05); // the cast is over, the cooldown is not
    expect(c.check('a1', READY)).toBe('cooldown');
    run(c, INFERNO_KIT.a1.cooldownS);
    expect(c.check('a1', READY)).toBeNull();
  });

  it('the ultimate needs a full meter (OQ-04: charge meter), which empties on use', () => {
    const c = new AbilityCaster(INFERNO_KIT);
    expect(c.check('ult', READY)).toBe('meter');
    c.onDamage(200, 0); // 50
    c.onDamage(0, 200); // +30
    expect(c.meter).toBeCloseTo(80, 5);
    run(c, 20.5); // passive 1/s
    expect(c.meterFull).toBe(true);
    expect(c.check('ult', READY)).toBeNull();
    c.start('ult');
    expect(c.meter).toBe(0);
  });

  it('a hit during the wind-up interrupts a normal ability, but never the ultimate', () => {
    const c = new AbilityCaster(INFERNO_KIT);
    c.start('a1');
    expect(c.interrupt()).toBe(true);
    expect(c.cast).toBeNull();
    expect(c.cooldown('a1')).toBeGreaterThan(0); // the cooldown is still spent
    c.fillMeter();
    c.start('ult');
    expect(c.interrupt()).toBe(false);
    expect(c.cast?.def.id).toBe('eruption');
  });

  it('once released, an ability cannot be interrupted (the shot is already out)', () => {
    const c = new AbilityCaster(INFERNO_KIT);
    c.start('a1');
    run(c, INFERNO_KIT.a1.castS + 0.02);
    expect(c.cast?.phase).toBe('recovery');
    expect(c.interrupt()).toBe(false);
  });
});

describe('Phase 8: complete animation set for the kit', () => {
  it('every ability and the ultimate has its own cast animation; the leaping ultimate has an air pose', async () => {
    const { hasAbilityPose, abilityPose } = await import('../../../src/animation/ability-poses');
    const { idlePose } = await import('../../../src/animation/greybox-motion');
    const { GREYBOX_STICKMAN } = await import('../../../src/data/fighters/greybox-stickman');
    const base = idlePose(0, GREYBOX_STICKMAN.bones);
    for (const slot of ['a1', 'a2', 'a3', 'ult'] as const) {
      const def = INFERNO_KIT[slot];
      expect(hasAbilityPose(def.id), def.id).toBe(true);
      expect(abilityPose(base, def.id, 'windup', 0.8, false)).not.toEqual(base); // a visible wind-up
    }
    const ult = INFERNO_KIT.ult.id;
    expect(abilityPose(base, ult, 'recovery', 0.5, true)).not.toEqual(abilityPose(base, ult, 'recovery', 0.5, false));
  });
});

describe('double-press forms (owner, 12/11/2026: Necro Teleport)', () => {
  it('a second press during the wind-up switches form, restarts the wind-up and sets that cooldown', () => {
    const c = new AbilityCaster(NECRO_KIT);
    c.start('a3');
    run(c, 0.1);
    const form = c.switchToDoubleTap('a3');
    expect(form?.id).toBe('teleportStrike');
    expect(c.cast?.def.id).toBe('teleportStrike');
    expect(c.cast?.from?.id).toBe('teleport'); // the pose carries on from the first wind-up
    expect(c.cast?.t).toBe(0);
    expect(c.cooldown('a3')).toBe(NECRO_KIT.a3.doubleTap!.cooldownS);
    expect(c.switchToDoubleTap('a3')).toBeNull(); // no third form
    const ev = run(c, 1);
    expect(ev.released).toEqual(['teleportStrike']); // released once, as the rush only
  });

  it('never switches after the wind-up, for another slot, or for abilities without a second form', () => {
    const c = new AbilityCaster(NECRO_KIT);
    expect(c.switchToDoubleTap('a3')).toBeNull(); // nothing casting
    c.start('a3');
    expect(c.switchToDoubleTap('a1')).toBeNull();
    run(c, NECRO_KIT.a3.castS + 0.02);
    expect(c.switchToDoubleTap('a3')).toBeNull(); // too late: already gone
    const i = new AbilityCaster(INFERNO_KIT);
    i.start('a1');
    expect(i.switchToDoubleTap('a1')).toBeNull();
  });

  it('the rush has its own animation, sound and effects', () => {
    const f = NECRO_KIT.a3.doubleTap!;
    expect(hasAbilityPose(f.id)).toBe(true);
    expect(f.sfx.cast && f.sfx.release && f.sfx.impact).toBeTruthy();
    expect(f.vfx).not.toBe(NECRO_KIT.a3.vfx);
  });
});
