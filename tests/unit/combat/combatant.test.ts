import { describe, expect, it } from 'vitest';
import { Combatant, type CombatStats, DEFENCE, dodgeCooldownFor, seededRandom } from '../../../src/combat/combatant';

const STATS: CombatStats = {
  maxHp: 1000,
  maxStamina: 100,
  staminaRegenPerS: 30,
  staminaRegenDelayS: 0.7,
  power: 1,
  defence: 1,
  critChance: 0.05,
  critMultiplier: 1.5,
  knockbackResistance: 0,
};
const HIT = { baseDamage: 100, attackerPower: 1, heavy: false, fromFront: true, critRoll: 0.99 };
const tick = (c: Combatant, s: number) => {
  for (let i = 0; i < Math.round(s * 60); i++) c.update(1 / 60);
};

describe('Combatant: damage', () => {
  it('a landed hit deducts damage scaled by Power and Defence, and makes the target flinch', () => {
    const c = new Combatant({ ...STATS, defence: 2 });
    const r = c.receive({ ...HIT, attackerPower: 1.5 });
    expect(r).toEqual({ outcome: 'hit', damage: 75, knockbackScale: 1, attackerStunS: 0 });
    expect(c.hp).toBe(925);
    expect(c.state).toBe('stunned');
    tick(c, DEFENCE.lightStunS + 0.02);
    expect(c.state).toBe('free');
  });

  it('critical hits multiply damage on a low roll', () => {
    const c = new Combatant(STATS);
    const r = c.receive({ ...HIT, critRoll: 0.01 }, STATS.critChance, STATS.critMultiplier);
    expect(r.outcome).toBe('crit');
    expect(r.damage).toBe(150);
  });

  it('heavy hits knock down; getting up gives brief invulnerability', () => {
    const c = new Combatant(STATS);
    c.receive({ ...HIT, heavy: true });
    expect(c.state).toBe('knockdown');
    expect(c.canAct).toBe(false);
    tick(c, DEFENCE.heavyKnockdownS + 0.02);
    expect(c.state).toBe('gettingUp'); // animated get-up: still cannot act
    expect(c.canAct).toBe(false);
    expect(c.getUpProgress).toBeGreaterThan(0);
    expect(c.receive(HIT).outcome).toBe('dodged'); // safe while getting up
    tick(c, DEFENCE.getUpS);
    expect(c.state).toBe('free');
    expect(c.downTimeS).toBe(0);
    expect(c.receive(HIT).outcome).toBe('dodged'); // and a moment after standing
    tick(c, DEFENCE.getUpInvulnS + 0.02);
    expect(c.receive(HIT).outcome).toBe('hit');
  });

  it('tracks time on the floor for the fall animation', () => {
    const c = new Combatant(STATS);
    expect(c.downTimeS).toBe(0);
    c.receive({ ...HIT, heavy: true });
    tick(c, 0.5);
    expect(c.downTimeS).toBeCloseTo(0.5, 1);
  });

  it('knockback resistance reduces knockback', () => {
    const c = new Combatant({ ...STATS, knockbackResistance: 0.6 });
    expect(c.receive(HIT).knockbackScale).toBeCloseTo(0.4, 6);
  });

  it('reaching 0 health is a KO; further hits are ignored; reset restores everything', () => {
    const c = new Combatant(STATS);
    const r = c.receive({ ...HIT, baseDamage: 5000 });
    expect(r.outcome).toBe('ko');
    expect(c.hp).toBe(0);
    expect(c.isKo).toBe(true);
    expect(c.receive(HIT).outcome).toBe('ignored');
    tick(c, 1);
    expect(c.koAge).toBeGreaterThan(0.9);
    c.reset();
    expect(c.hp).toBe(1000);
    expect(c.isKo).toBe(false);
  });
});

describe('Combatant: defence', () => {
  it('blocking a frontal hit takes only chip damage and stamina, with little knockback', () => {
    const c = new Combatant(STATS);
    c.setGuard(true);
    tick(c, DEFENCE.parryWindowS + 0.05); // past the parry window
    const r = c.receive(HIT);
    expect(r.outcome).toBe('blocked');
    expect(r.damage).toBe(15);
    expect(c.stamina).toBeCloseTo(100 - 60, 6);
    expect(r.knockbackScale).toBeCloseTo(DEFENCE.blockKnockbackFraction, 6);
  });

  it('blocks only work against hits from the front', () => {
    const c = new Combatant(STATS);
    c.setGuard(true);
    tick(c, 0.3);
    expect(c.receive({ ...HIT, fromFront: false }).outcome).toBe('hit');
  });

  it('raising the guard just before the hit is a parry: no damage, and the attacker is stunned', () => {
    const c = new Combatant(STATS);
    c.setGuard(true);
    tick(c, 0.05);
    const r = c.receive(HIT);
    expect(r).toEqual({ outcome: 'parried', damage: 0, knockbackScale: 0, attackerStunS: DEFENCE.parryStunS });
    expect(c.hp).toBe(1000);
  });

  it('blocking until stamina runs out breaks the guard and stuns', () => {
    const c = new Combatant(STATS);
    c.setGuard(true);
    tick(c, 0.3);
    expect(c.receive(HIT).outcome).toBe('blocked');
    const r = c.receive(HIT); // 60 + 60 > 100 stamina
    expect(r.outcome).toBe('guardBreak');
    expect(c.stamina).toBe(0);
    expect(c.state).toBe('stunned');
  });

  it('chip damage never KOs', () => {
    const c = new Combatant({ ...STATS, maxHp: 5 });
    c.setGuard(true);
    tick(c, 0.3);
    c.receive(HIT);
    expect(c.hp).toBe(1);
  });

  it('dodging costs stamina, grants brief invulnerability, then has a cooldown', () => {
    const c = new Combatant(STATS);
    expect(c.tryDodge()).toBe(true);
    expect(c.stamina).toBe(100 - DEFENCE.dodgeCost);
    expect(c.state).toBe('dodging');
    expect(c.receive(HIT).outcome).toBe('dodged');
    expect(c.tryDodge()).toBe(false); // cooldown
    tick(c, c.dodgeCooldownTotalS + 0.02);
    expect(c.tryDodge()).toBe(true);
  });

  it('dodge cooldown depends on body weight (owner, 11/11/2026): heavier fighters wait longer', () => {
    const light = new Combatant({ ...STATS, massKg: 55 });
    const mid = new Combatant({ ...STATS, massKg: 70 });
    const heavy = new Combatant({ ...STATS, massKg: 140 });
    expect(light.dodgeCooldownTotalS).toBeLessThan(mid.dodgeCooldownTotalS);
    expect(mid.dodgeCooldownTotalS).toBeLessThan(heavy.dodgeCooldownTotalS);
    expect(dodgeCooldownFor(70)).toBeCloseTo(0.535, 3);
    expect(dodgeCooldownFor(140)).toBeCloseTo(0.92, 3);
    // The heavy fighter is still waiting when the light one can already dodge again.
    for (const c of [light, heavy]) c.tryDodge();
    tick(light, light.dodgeCooldownTotalS + 0.02);
    tick(heavy, light.dodgeCooldownTotalS + 0.02);
    expect(light.tryDodge()).toBe(true);
    expect(heavy.tryDodge()).toBe(false);
  });

  it('cannot dodge without enough stamina', () => {
    const c = new Combatant({ ...STATS, maxStamina: 10 });
    expect(c.tryDodge()).toBe(false);
  });
});

describe('Combatant: stamina', () => {
  it('regenerates after a pause, but not while guarding', () => {
    const c = new Combatant(STATS);
    c.tryDodge();
    tick(c, 0.5);
    expect(c.stamina).toBe(75); // still in the pause
    tick(c, 0.5);
    expect(c.stamina).toBeGreaterThan(75);
    const before = c.stamina;
    c.setGuard(true);
    tick(c, 1);
    expect(c.stamina).toBeCloseTo(before, 6);
  });

  it('a stunned fighter cannot raise a guard or dodge', () => {
    const c = new Combatant(STATS);
    c.stun(1);
    c.setGuard(true);
    expect(c.state).toBe('stunned');
    expect(c.tryDodge()).toBe(false);
  });
});

describe('seededRandom', () => {
  it('is reproducible and in 0..1', () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    const xs = Array.from({ length: 100 }, () => a());
    expect(xs).toEqual(Array.from({ length: 100 }, () => b()));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThan(1);
  });
});

describe('Combatant: abilities support', () => {
  it('spends stamina only when there is enough', () => {
    const c = new Combatant(STATS);
    expect(c.spendStamina(30)).toBe(true);
    expect(c.stamina).toBe(STATS.maxStamina - 30);
    expect(c.spendStamina(1000)).toBe(false);
    expect(c.stamina).toBe(STATS.maxStamina - 30);
  });

  it('burning deals damage over time, then stops', () => {
    const c = new Combatant(STATS);
    c.ignite(20, 1);
    let total = 0;
    for (let i = 0; i < 120; i++) total += c.update(1 / 60);
    expect(total).toBeCloseTo(20, 1);
    expect(c.hp).toBeCloseTo(STATS.maxHp - 20, 1);
    expect(c.burning).toBe(false);
  });

  it('burning can KO', () => {
    const c = new Combatant(STATS);
    c.hp = 5;
    c.ignite(20, 2);
    for (let i = 0; i < 60; i++) c.update(1 / 60);
    expect(c.state).toBe('ko');
  });

  it('granted invulnerability makes hits miss', () => {
    const c = new Combatant(STATS);
    c.grantInvulnerability(0.5);
    expect(c.receive(HIT).outcome).toBe('dodged');
  });
});
