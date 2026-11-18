import { describe, expect, it } from 'vitest';
import { type AbilityHost, AbilityWorld } from '../../../src/abilities/ability-world';
import { Combatant, type CombatStats } from '../../../src/combat/combatant';
import { VEXORIS_KIT } from '../../../src/data/abilities/vexoris';

/** Chemical Trap (landmine), Toxic Jar and Plague Bloom (poison fog), owner 20/11/2026. */
function arena(foe: { x: number; y: number }) {
  const me = { id: 'me', x: 0, y: 0, radiusM: 0.3, hittable: true };
  const them = { id: 'foe', ...foe, radiusM: 0.3, hittable: true };
  const hits: { target: string; damage: number; poison?: number }[] = [];
  const fog: { target: string; sightM: number; speedFactor: number; chipDps: number; stack: boolean }[] = [];
  const emitted: string[] = [];
  const host: AbilityHost = {
    fighters: () => [me, them],
    hitFighter: (_c, target, payload) => {
      hits.push({ target, damage: payload.damage, ...(payload.poison ? { poison: payload.poison } : {}) });
      return true;
    },
    hitEnvironment: () => {},
    blocked: () => null,
    position: () => ({ x: me.x, y: me.y }),
    drive: () => {},
    burnFighter: () => {},
    buff: () => {},
    fogFighter: (target, f) => fog.push({ target, ...f }),
    emit: (fx) => emitted.push(`${fx.kind}:${fx.vfx}`),
  };
  return { me, them, hits, fog, emitted, host, world: new AbilityWorld() };
}

const run = (a: ReturnType<typeof arena>, seconds: number) => {
  for (let i = 0; i < seconds * 60; i++) a.world.update(1 / 60, a.host);
};

describe('Chemical Trap is a landmine', () => {
  it('lies visible and dormant (no gas, no damage) until an enemy steps on it', () => {
    const a = arena({ x: 5, y: 0 });
    a.world.release('me', VEXORIS_KIT.a3, { x: 3, y: 0 }, a.host);
    expect(a.world.clouds).toHaveLength(1);
    expect(a.world.clouds[0]?.mine).toBeDefined();
    run(a, 5);
    expect(a.world.clouds[0]?.mine).toBeDefined(); // still waiting
    expect(a.hits).toHaveLength(0);
  });

  it('goes off under the first enemy to step on it: one burst of damage and poison, then a gas cloud', () => {
    const a = arena({ x: 5, y: 0 });
    a.world.release('me', VEXORIS_KIT.a3, { x: 3, y: 0 }, a.host);
    run(a, 1.5); // armed
    a.them.x = 3.2; // walks on it
    run(a, 0.1);
    expect(a.world.clouds[0]?.mine).toBeUndefined();
    expect(a.hits.filter((h) => h.target === 'foe')).toHaveLength(1);
    expect(a.hits[0]?.damage).toBeGreaterThan(20);
    expect(a.hits[0]?.poison).toBe(1);
    run(a, 6); // the cloud ends; no second dose for standing in it
    expect(a.hits.filter((h) => h.target === 'foe')).toHaveLength(1);
    expect(a.world.clouds).toHaveLength(0);
  });

  it('never goes off under its own caster, and an enemy just outside the trigger does not set it off', () => {
    const a = arena({ x: 3.0 + 1.4, y: 0 });
    a.world.release('me', VEXORIS_KIT.a3, { x: 3, y: 0 }, a.host);
    a.me.x = 3;
    run(a, 2);
    expect(a.world.clouds[0]?.mine).toBeDefined();
  });

  it('keeps at most two mines per caster (the oldest is taken up)', () => {
    const a = arena({ x: 30, y: 30 });
    for (const x of [2, 3, 4]) a.world.release('me', VEXORIS_KIT.a3, { x, y: 0 }, a.host);
    expect(a.world.clouds).toHaveLength(2);
    expect(a.world.clouds.map((c) => Math.round(c.x))).toEqual([3, 4]);
  });
});

describe('Toxic Jar', () => {
  it('flies as a thrown jar and shatters on the enemy for damage and one stack of poison', () => {
    const a = arena({ x: 4, y: 0 });
    a.world.release('me', VEXORIS_KIT.a2, { x: 4, y: 0 }, a.host);
    expect(VEXORIS_KIT.a2.look?.flight?.jar).toBe(true);
    run(a, 1);
    const hit = a.hits.find((h) => h.target === 'foe');
    expect(hit?.damage).toBeGreaterThanOrEqual(20);
    expect(hit?.poison).toBe(1);
    expect(VEXORIS_KIT.a2.look?.impact?.shards).toBeGreaterThan(0);
  });
});

describe('Plague Bloom fog', () => {
  const fogSpec = () => {
    const d = VEXORIS_KIT.ult.delivery;
    if (d.type !== 'cloud' || !d.fog) throw new Error('the ultimate is a fog cloud');
    return d;
  };

  it('lasts 10 seconds, covers a wide area and never bursts for damage', () => {
    const d = fogSpec();
    expect(d.lifeS).toBe(10);
    expect(d.radiusM).toBeGreaterThanOrEqual(5);
    const a = arena({ x: 2, y: 0 });
    a.world.release('me', VEXORIS_KIT.ult, { x: 0, y: 0 }, a.host);
    run(a, 9.5);
    expect(a.world.clouds).toHaveLength(1);
    run(a, 1);
    expect(a.world.clouds).toHaveLength(0);
    expect(a.hits).toHaveLength(0);
  });

  it('chokes an enemy inside: short sight, slowed, chip damage every step, and one stack after 3 seconds, once', () => {
    const d = fogSpec();
    const a = arena({ x: 2, y: 0 });
    a.world.release('me', VEXORIS_KIT.ult, { x: 0, y: 0 }, a.host);
    run(a, 2.5);
    expect(a.fog.length).toBeGreaterThan(60);
    expect(a.fog.every((f) => f.target === 'foe' && f.sightM === d.fog?.sightM && f.speedFactor < 1)).toBe(true);
    expect(a.fog.some((f) => f.stack)).toBe(false); // not yet
    run(a, 1.5);
    expect(a.fog.filter((f) => f.stack)).toHaveLength(1);
    run(a, 5);
    expect(a.fog.filter((f) => f.stack)).toHaveLength(1); // once per stay
    // Slow chip damage: a few per second, not a burst.
    expect(d.fog?.chipDps).toBeGreaterThan(0);
    expect(d.fog?.chipDps).toBeLessThanOrEqual(5);
  });

  it('never affects its caster, and leaving the fog resets the three-second count', () => {
    const a = arena({ x: 2, y: 0 });
    a.world.release('me', VEXORIS_KIT.ult, { x: 0, y: 0 }, a.host);
    run(a, 2.5);
    a.them.x = 20; // out of the fog
    run(a, 0.5);
    a.them.x = 2; // back in
    run(a, 2.5);
    expect(a.fog.some((f) => f.stack)).toBe(false);
    expect(a.fog.every((f) => f.target !== 'me')).toBe(true);
  });
});

describe('fog on a fighter', () => {
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

  it('slows, limits sight and drains health slowly while renewed, and wears off a moment after leaving', () => {
    const c = new Combatant(STATS);
    expect(c.sightM).toBe(Number.POSITIVE_INFINITY);
    for (let i = 0; i < 120; i++) {
      c.fog(3, 0.8, 3);
      c.update(1 / 60);
    }
    expect(c.sightM).toBe(3);
    expect(c.status.speedFactor).toBeCloseTo(0.8, 5);
    expect(1000 - c.hp).toBeGreaterThan(5);
    expect(1000 - c.hp).toBeLessThan(7);
    for (let i = 0; i < 30; i++) c.update(1 / 60);
    expect(c.sightM).toBe(Number.POSITIVE_INFINITY);
    expect(c.status.speedFactor).toBe(1);
  });
});
