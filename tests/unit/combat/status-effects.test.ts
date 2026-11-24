import { describe, expect, it } from 'vitest';
import { Combatant } from '../../../src/combat/combatant';
import { STATUS_DEFS, type StatusDef, StatusEffects } from '../../../src/combat/status-effects';

type TestId = 'burn' | 'poison' | 'slow' | 'pulse';
const defs: Record<TestId, StatusDef> = {
  burn: STATUS_DEFS.burn,
  poison: { stacking: 'stack', maxStacks: 3, tickIntervalS: 0 },
  slow: STATUS_DEFS.decay,
  pulse: { stacking: 'strongest', tickIntervalS: 0.5 },
};
const sink = () => {
  const dealt: Record<string, number> = {};
  const fn = (id: string, a: number): number => {
    dealt[id] = (dealt[id] ?? 0) + a;
    return a;
  };
  return { dealt, fn };
};

describe('StatusEffects registry (B8)', () => {
  it('survives a damage tick that knocks the fighter out and clears every effect mid-tick (regression)', () => {
    const fx = new StatusEffects<TestId>(defs);
    fx.apply('slow', 2, {});
    fx.apply('pulse', 2, { dps: 5 });
    fx.apply('burn', 2, { dps: 10 }); // the last one applied is visited first
    // The first damage tick is the fatal one: the fighter is down, so every effect is cleared under the loop.
    expect(() =>
      fx.tick(0.1, () => {
        fx.clearAll();
        return 0;
      }),
    ).not.toThrow();
    expect(fx.has('burn')).toBe(false);
  });

  it('deals damage over time continuously and ends on time', () => {
    const fx = new StatusEffects<TestId>(defs);
    const s = sink();
    fx.apply('burn', 2, { dps: 10 });
    for (let t = 0; t < 4; t += 0.1) fx.tick(0.1, s.fn);
    expect(s.dealt.burn).toBeCloseTo(20, 5);
    expect(fx.has('burn')).toBe(false);
  });

  it('refreshes to the longer time and stronger rate, never multiplying', () => {
    const fx = new StatusEffects<TestId>(defs);
    fx.apply('burn', 2, { dps: 10 });
    fx.apply('burn', 1, { dps: 20 });
    expect(fx.leftS('burn')).toBe(2);
    fx.apply('burn', 5, { dps: 5 });
    expect(fx.leftS('burn')).toBe(5);
    const s = sink();
    fx.tick(1, s.fn);
    expect(s.dealt.burn).toBeCloseTo(20, 5); // the 20/s rate stayed
    expect(fx.stacks('burn')).toBe(1);
  });

  it('stacking effects multiply their rate up to the cap', () => {
    const fx = new StatusEffects<TestId>(defs);
    for (let n = 0; n < 5; n++) fx.apply('poison', 4, { dps: 3 });
    expect(fx.stacks('poison')).toBe(3);
    const s = sink();
    fx.tick(1, s.fn);
    expect(s.dealt.poison).toBeCloseTo(9, 5);
  });

  it('lumps damage at the tick interval and still lands the last partial lump', () => {
    const fx = new StatusEffects<TestId>(defs);
    const calls: number[] = [];
    fx.apply('pulse', 1.2, { dps: 10 });
    const record = (_id: string, a: number): number => {
      calls.push(a);
      return a;
    };
    for (let t = 0; t < 1.5; t += 0.1) fx.tick(0.1, record);
    expect(calls.length).toBe(3); // 0.5, 0.5, then the last 0.2 s
    expect(calls.reduce((a, b) => a + b, 0)).toBeCloseTo(12, 5);
  });

  it('combines multipliers and slows across effects', () => {
    const fx = new StatusEffects<TestId>(defs);
    fx.apply('slow', 3, { speedFactor: 0.5, attackFactor: 0.7, defenceFactor: 0.8, damageTakenFactor: 1.1 });
    fx.apply('burn', 3, { dps: 1, damageTakenFactor: 1.1 });
    expect(fx.speedFactor).toBeCloseTo(0.5, 5);
    expect(fx.attackFactor).toBeCloseTo(0.7, 5);
    expect(fx.defenceFactor).toBeCloseTo(0.8, 5);
    expect(fx.damageTakenFactor).toBeCloseTo(1.21, 5);
    fx.apply('slow', 3, { speedFactor: 0.9 }); // a weaker reapplication never softens it
    expect(fx.speedFactor).toBeCloseTo(0.5, 5);
  });

  it('limits sight to the smallest radius and lifts it when the effect ends', () => {
    const fx = new StatusEffects();
    expect(fx.sightM).toBe(Number.POSITIVE_INFINITY);
    fx.apply('dark', 1, { sightM: 3 });
    expect(fx.sightM).toBe(3);
    fx.tick(1.1, () => 0);
    expect(fx.sightM).toBe(Number.POSITIVE_INFINITY);
  });

  it('immunity refuses new applications, clears a running one, and wears off', () => {
    const fx = new StatusEffects<TestId>(defs);
    fx.apply('burn', 5, { dps: 1 });
    fx.grantImmunity('burn', 2);
    expect(fx.has('burn')).toBe(false);
    expect(fx.apply('burn', 5, { dps: 1 })).toBe(false);
    fx.tick(2.1, () => 0);
    expect(fx.apply('burn', 5, { dps: 1 })).toBe(true);
  });

  it('reports ended effects once, lists active ones, and clears everything', () => {
    const fx = new StatusEffects();
    fx.apply('decay', 0.2, { attackFactor: 0.7 });
    fx.apply('blind', 5);
    expect(fx.active).toEqual(['decay', 'blind']);
    fx.tick(0.3, () => 0);
    expect(fx.endedLastTick('decay')).toBe(true);
    fx.tick(0.1, () => 0);
    expect(fx.endedLastTick('decay')).toBe(false);
    fx.clearAll();
    expect(fx.active).toEqual([]);
  });

  it('ignores zero or negative durations', () => {
    const fx = new StatusEffects();
    expect(fx.apply('blind', 0)).toBe(false);
    expect(fx.has('blind')).toBe(false);
  });
});

describe('Combatant on the registry keeps its behaviour', () => {
  const stats = {
    maxHp: 100,
    maxStamina: 100,
    defence: 1,
    knockbackResistance: 0,
    staminaRegenPerS: 10,
    staminaRegenDelayS: 1,
    critChance: 0,
    critMultiplier: 1,
    weight: 1,
  } as unknown as ConstructorParameters<typeof Combatant>[0];

  it('burn ticks, and a burn KO is remembered', () => {
    const c = new Combatant(stats);
    c.ignite(40, 3);
    expect(c.update(1)).toBeCloseTo(40, 5);
    c.update(1);
    c.update(1);
    expect(c.isKo).toBe(true);
    expect(c.koByBurn).toBe(true);
    expect(c.burning).toBe(false);
  });

  it('bleeding (TD-072): x1.1 damage taken for 6 s, refreshed never raised, no damage of its own', () => {
    const c = new Combatant(stats);
    const hit = { baseDamage: 100, attackerPower: 1, fromFront: true } as unknown as Parameters<
      Combatant['receive']
    >[0];
    c.bleed();
    expect(c.update(5)).toBe(0); // it deals nothing itself
    expect(c.hp).toBe(100);
    expect(c.bleeding).toBe(true);
    c.bleed(); // refreshed to the full 6 s
    c.bleed(); // and never multiplied again
    expect(c.status.leftS('bleed')).toBe(6);
    expect(c.status.damageTakenFactor).toBeCloseTo(1.1, 5);
    expect(c.receive(hit).damage).toBe(Math.round((100 / stats.defence) * 1.1));
    c.update(6.1);
    expect(c.bleeding).toBe(false);
    expect(c.status.damageTakenFactor).toBe(1);
  });

  it('a bleeding fighter also takes 10% more burn damage', () => {
    const c = new Combatant(stats);
    c.ignite(10, 2);
    c.bleed();
    expect(c.update(1)).toBeCloseTo(11, 5);
  });

  it('reset cleanses every effect', () => {
    const c = new Combatant(stats);
    c.ignite(5, 5);
    c.bleed();
    c.blind(5);
    c.decay(5, 0.7, 0.8);
    c.darken(5, 2);
    c.reset();
    expect(c.status.active).toEqual([]);
    expect(c.sightM).toBe(Number.POSITIVE_INFINITY);
    expect(c.attackFactor).toBe(1);
  });
});
