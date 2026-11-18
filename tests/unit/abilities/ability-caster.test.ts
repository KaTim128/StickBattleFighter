import { describe, expect, it } from 'vitest';
import { AbilityCaster } from '../../../src/abilities/ability-caster';
import { ABILITY_SLOTS } from '../../../src/abilities/ability-def';
import { INFERNO_KIT } from '../../../src/data/abilities/inferno';

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
    // Eruption (now Inferno's fifth normal ability, TD-080) still leaps: untouchable in the air.
    const eruption = INFERNO_KIT.a5!.delivery;
    expect(eruption.type === 'leap' && eruption.airS >= 0.5).toBe(true);
    expect(INFERNO_KIT.ult.delivery.type).toBe('buff'); // the ultimate is the Blue Inferno transformation
  });
});

describe('AbilityCaster', () => {
  it('a cooldown cut (Rampage Mode, owner 13/11/2026) shortens running and new non-ultimate cooldowns only, and resets', () => {
    const c = new AbilityCaster(INFERNO_KIT);
    c.start('a1');
    run(c, 5);
    const left = c.cooldown('a1');
    c.cooldownScale = 0.75;
    c.scaleCooldowns(0.75);
    expect(c.cooldown('a1')).toBeCloseTo(left * 0.75, 6);
    run(c, 5);
    c.start('a2');
    expect(c.cooldown('a2')).toBeCloseTo(INFERNO_KIT.a2.cooldownS * 0.75, 6);
    run(c, 5);
    c.fillMeter();
    c.start('ult');
    expect(c.cooldown('ult')).toBe(INFERNO_KIT.ult.cooldownS); // the ultimate is never cut
    c.reset();
    expect(c.cooldownScale).toBe(1);
  });

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
    const k = INFERNO_KIT.charge; // the kit's own rates (they scale with the ultimate's strength, B10)
    const c = new AbilityCaster(INFERNO_KIT);
    expect(c.check('ult', READY)).toBe('meter');
    c.onDamage(200, 0);
    c.onDamage(0, 200);
    const gained = 200 * k.perDamageDealt + 200 * k.perDamageTaken;
    expect(c.meter).toBeCloseTo(gained, 5);
    run(c, (k.max - gained) / k.perSecond + 0.5); // then the passive trickle fills the rest
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
    expect(c.cast?.def.id).toBe('blueFire');
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
    for (const slot of ['a1', 'a2', 'a3', 'a5', 'ult'] as const) {
      const def = INFERNO_KIT[slot]!;
      expect(hasAbilityPose(def.id), def.id).toBe(true);
      expect(abilityPose(base, def.id, 'windup', 0.8, false)).not.toEqual(base); // a visible wind-up
    }
    // The leaping ability (Eruption) has its own air pose.
    const leap = INFERNO_KIT.a5!.id;
    expect(abilityPose(base, leap, 'recovery', 0.5, true)).not.toEqual(abilityPose(base, leap, 'recovery', 0.5, false));
  });
});

/** Owner, 20/11/2026: a cooldown or an ultimate recharge starts only once the ability has fully finished. */
describe('cooldowns and recharge wait for the ability to finish', () => {
  const runWith = (c: AbilityCaster, s: number, ongoing: ReadonlySet<string>) => {
    for (let i = 0; i < Math.round(s * 60); i++) c.update(1 / 60, false, ongoing);
  };

  it('a cooldown does not tick during the cast, and starts when the cast ends', () => {
    const c = new AbilityCaster(INFERNO_KIT);
    const full = INFERNO_KIT.a1.cooldownS;
    c.start('a1');
    expect(c.executing('a1')).toBe(true);
    expect(c.check('a1', READY)).toBe('busy');
    run(c, INFERNO_KIT.a1.castS + INFERNO_KIT.a1.recoveryS - 0.1);
    expect(c.cooldown('a1')).toBe(full); // still casting: not a second of it spent
    run(c, 0.2);
    expect(c.executing('a1')).toBe(false);
    run(c, 1);
    expect(c.cooldown('a1')).toBeLessThan(full);
    expect(c.cooldown('a1')).toBeGreaterThan(full - 1.5);
  });

  it('a cooldown also waits while the delivery goes on after the cast (a dash, a beam, a buff, a stalk)', () => {
    const c = new AbilityCaster(INFERNO_KIT);
    const full = INFERNO_KIT.a1.cooldownS;
    c.start('a1');
    const ongoing = new Set([INFERNO_KIT.a1.id]);
    runWith(c, INFERNO_KIT.a1.castS + INFERNO_KIT.a1.recoveryS + 3, ongoing); // cast over, delivery still running
    expect(c.cooldown('a1')).toBe(full);
    expect(c.executing('a1')).toBe(true);
    expect(c.check('a1', READY)).toBe('cooldown');
    runWith(c, 0.5, new Set());
    expect(c.executing('a1')).toBe(false);
    expect(c.cooldown('a1')).toBeLessThan(full);
  });

  it('the ultimate does not recharge while it is being executed, only after it has fully finished', () => {
    const c = new AbilityCaster(INFERNO_KIT);
    c.fillMeter();
    c.start('ult');
    expect(c.meter).toBe(0);
    const ongoing = new Set([INFERNO_KIT.ult.id]);
    runWith(c, INFERNO_KIT.ult.castS + INFERNO_KIT.ult.recoveryS + 5, ongoing);
    expect(c.meter).toBe(0); // the effect is still on: no recharge
    runWith(c, 5, new Set());
    expect(c.meter).toBeGreaterThan(0); // now it fills again
  });

  it('other abilities keep cooling down while one is being executed', () => {
    const c = new AbilityCaster(INFERNO_KIT);
    c.start('a1');
    run(c, INFERNO_KIT.a1.castS + INFERNO_KIT.a1.recoveryS + 0.1);
    c.start('a2');
    const a1 = c.cooldown('a1');
    run(c, 0.5);
    expect(c.cooldown('a1')).toBeLessThan(a1);
    expect(c.cooldown('a2')).toBeGreaterThan(INFERNO_KIT.a2.cooldownS - 1); // its own only starts when it ends
  });
});
