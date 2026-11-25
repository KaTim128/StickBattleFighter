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
    expect(a.hits[0]?.poison).toBe(2);
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
  it('flies as a thrown jar and shatters on the enemy for damage and two stacks of poison', () => {
    const a = arena({ x: 4, y: 0 });
    a.world.release('me', VEXORIS_KIT.a2, { x: 4, y: 0 }, a.host);
    expect(VEXORIS_KIT.a2.look?.flight?.jar).toBe(true);
    run(a, 1);
    const hit = a.hits.find((h) => h.target === 'foe');
    expect(hit?.damage).toBeGreaterThanOrEqual(20);
    expect(hit?.poison).toBe(2);
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
    // Chip damage: a steady stream, never a burst; slowed by 40 percent.
    expect(d.fog?.chipDps).toBeGreaterThan(5);
    expect(d.fog?.chipDps).toBeLessThanOrEqual(15);
    expect(d.fog?.speedFactor).toBe(0.6);
  });

  it('never affects its caster, and leaving the fog resets the three-second count', () => {
    const a = arena({ x: 2, y: 0 });
    a.world.release('me', VEXORIS_KIT.ult, { x: 0, y: 0 }, a.host);
    run(a, 2.5);
    a.them.x = 20; // out of the fog for longer than the ramp's 1 s reset
    run(a, 1.2);
    a.them.x = 2; // back in
    run(a, 2.5);
    expect(a.fog.some((f) => f.stack)).toBe(false);
    expect(a.fog.every((f) => f.target !== 'me')).toBe(true);
  });

  it('chip damage ramps with continuous exposure and resets only after a full second outside (VX3)', () => {
    const a = arena({ x: 2, y: 0 });
    a.world.release('me', VEXORIS_KIT.ult, { x: 0, y: 0 }, a.host);
    run(a, 1);
    const early = a.fog.at(-1)!.chipDps;
    run(a, 4);
    const late = a.fog.at(-1)!.chipDps;
    expect(late).toBeGreaterThan(early * 1.3);
    expect(late).toBeLessThanOrEqual(8 * 2 + 0.001); // capped at x2
    a.them.x = 20;
    run(a, 0.5); // a short step out keeps the ramp
    a.them.x = 2;
    run(a, 0.1);
    expect(a.fog.at(-1)!.chipDps).toBeGreaterThanOrEqual(late);
  });
});

describe('Grenade (replaces Hardened Filter)', () => {
  const fuse = () => {
    const d = VEXORIS_KIT.a5?.delivery;
    if (d?.type !== 'grenade') throw new Error('the fifth ability is a grenade');
    return d;
  };

  it('is the fifth ability in the E slot, with high damage and knockback and no poison', () => {
    const a5 = VEXORIS_KIT.a5;
    expect(a5?.id).toBe('grenade');
    expect(a5?.slot).toBe('a2');
    expect(a5?.payload.poison).toBeUndefined();
    expect(a5?.payload.damage).toBeGreaterThanOrEqual(60);
    expect(a5?.payload.knockbackMps).toBeGreaterThanOrEqual(6);
  });

  it('arcs over the ground, lands where aimed and explodes 1 second later', () => {
    const a = arena({ x: 30, y: 30 });
    a.world.release('me', VEXORIS_KIT.a5!, { x: 6, y: 0 }, a.host);
    let peak = 0;
    for (let i = 0; i < 60; i++) {
      a.world.update(1 / 60, a.host);
      peak = Math.max(peak, a.world.grenades[0]?.z ?? 0);
    }
    expect(peak).toBeGreaterThan(1.5); // a curved arc, not a flat shot
    const g = a.world.grenades[0];
    expect(g?.state).toBe('landed');
    expect(g?.x).toBeCloseTo(6, 1);
    run(a, fuse().fuseS - 0.5);
    expect(a.world.grenades).toHaveLength(1);
    run(a, 0.3);
    expect(a.world.grenades).toHaveLength(0);
  });

  it('sticks to an enemy it passes through and explodes 0.5 s later, hitting for the full payload once', () => {
    const a = arena({ x: 4, y: 0 });
    a.world.release('me', VEXORIS_KIT.a5!, { x: 4, y: 0 }, a.host);
    let stuckAt = -1;
    for (let i = 0; i < 180 && stuckAt < 0; i++) {
      a.world.update(1 / 60, a.host);
      if (a.world.grenades[0]?.state === 'stuck') stuckAt = i;
    }
    expect(stuckAt).toBeGreaterThan(0);
    a.them.x = 4.5; // walks off: it goes with them
    run(a, 0.2);
    expect(a.world.grenades[0]?.x).toBeCloseTo(4.5, 1);
    expect(a.hits).toHaveLength(0);
    run(a, 0.5);
    expect(a.world.grenades).toHaveLength(0);
    const hits = a.hits.filter((h) => h.target === 'foe');
    expect(hits).toHaveLength(1);
    expect(hits[0]?.damage).toBeGreaterThanOrEqual(60);
    expect(hits[0]?.poison).toBeUndefined();
  });

  it('hurts only enemies within the blast radius, never the thrower, and nobody outside it', () => {
    const a = arena({ x: 6 + fuse().blastRadiusM + 2, y: 0 });
    a.me.x = 5;
    a.world.release('me', VEXORIS_KIT.a5!, { x: 6, y: 0 }, a.host);
    run(a, 2.5);
    expect(a.hits).toHaveLength(0);
  });
});

describe('Vapour Step', () => {
  it('dashes backwards, away from the aim, leaving a 3 s poison mist where he stood and hitting nobody on the way', () => {
    const a = arena({ x: 3, y: 0 });
    const step = VEXORIS_KIT.a4;
    expect(step.delivery.type === 'dash' && step.delivery.backwards).toBe(true);
    const driven: { x: number }[] = [];
    a.host.drive = (_id, v) => {
      if (v) driven.push({ x: v.x });
    };
    a.world.release('me', step, { x: 3, y: 0 }, a.host);
    run(a, 0.3);
    expect(driven.length).toBeGreaterThan(0);
    expect(driven.every((v) => v.x < 0)).toBe(true); // away from the foe
    expect(a.hits).toHaveLength(0);
    const mist = a.world.clouds[0];
    expect(mist?.x).toBe(0);
    expect(mist?.lifeS).toBe(3);
  });

  it('poisons an opponent who enters the mist once, never its caster, and the mist ends after 3 s', () => {
    const a = arena({ x: 0.5, y: 0 });
    a.world.release('me', VEXORIS_KIT.a4, { x: 3, y: 0 }, a.host);
    run(a, 0.5);
    expect(a.hits.filter((h) => h.target === 'foe' && h.poison === 1)).toHaveLength(1);
    expect(a.hits.filter((h) => h.target === 'me')).toHaveLength(0);
    run(a, 3);
    expect(a.world.clouds).toHaveLength(0);
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
    const drops: number[] = [];
    for (let i = 0; i < 120; i++) {
      const before = c.hp;
      c.fog(10, 0.6, 3);
      c.update(1 / 60);
      if (c.hp < before) drops.push(before - c.hp);
    }
    expect(c.sightM).toBe(3);
    expect(c.status.speedFactor).toBeCloseTo(0.6, 5);
    expect(1000 - c.hp).toBeGreaterThan(17); // 10 per second over 2 s
    expect(1000 - c.hp).toBeLessThan(21);
    // Rapid, repeated small lumps (about five a second), none large.
    expect(drops.length).toBeGreaterThanOrEqual(8);
    expect(Math.max(...drops)).toBeLessThanOrEqual(2.5);
    for (let i = 0; i < 30; i++) c.update(1 / 60);
    expect(c.sightM).toBe(Number.POSITIVE_INFINITY);
    expect(c.status.speedFactor).toBe(1);
  });
});
