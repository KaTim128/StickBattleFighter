import { describe, expect, it } from 'vitest';
import { type AbilityHost, AbilityWorld } from '../../../src/abilities/ability-world';
import { Combatant, type CombatStats } from '../../../src/combat/combatant';
import { AERION_KIT } from '../../../src/data/abilities/aerion';
import profile from '../../../src/data/characters/aerion/animation-profile.json';
import set from '../../../src/data/characters/aerion/moveset.json';

/** Aerion (master plan section 4, fighter 1): winged wind warrior; owner asked for him next, 21/11/2026. */
function arena(foe = { x: 3, y: 0 }) {
  const me = { id: 'me', x: 0, y: 0, radiusM: 0.3, hittable: true };
  const them = { id: 'foe', ...foe, radiusM: 0.3, hittable: true };
  const hits: { target: string; damage: number; dirX: number }[] = [];
  const lifts: number[] = [];
  const host: AbilityHost = {
    fighters: () => [me, them],
    hitFighter: (_c, target, payload, dir) => {
      hits.push({ target, damage: payload.damage, dirX: dir.x });
      return true;
    },
    hitEnvironment: () => {},
    blocked: () => null,
    position: () => ({ x: me.x, y: me.y }),
    drive: (id, v, h) => {
      if (id === 'foe') lifts.push(h);
      if (id === 'me' && v) {
        me.x += v.x / 60;
        me.y += v.y / 60;
      }
    },
    burnFighter: () => {},
    buff: () => {},
    hold: () => {},
    emit: () => {},
  };
  return { me, them, hits, lifts, host, world: new AbilityWorld() };
}
const run = (a: ReturnType<typeof arena>, seconds: number) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) a.world.update(1 / 60, a.host);
};

describe('Aerion kit', () => {
  it('has five normal abilities (one an alternative), a unique ultimate and the Aerial Momentum passive', () => {
    const ids = [AERION_KIT.a1, AERION_KIT.a2, AERION_KIT.a3, AERION_KIT.a4, AERION_KIT.a5!].map((a) => a.id);
    expect(new Set(ids).size).toBe(5);
    expect(AERION_KIT.ult.id).toBe('celestialTempest');
    expect(AERION_KIT.passive?.id).toBe('momentum');
    expect(AERION_KIT.a4.delivery.type === 'buff' && AERION_KIT.a4.delivery.speedFactor).toBeGreaterThan(1); // Tailwind: mobility
    expect(AERION_KIT.a5?.delivery.type === 'buff' && AERION_KIT.a5.delivery.damageTakenFactor).toBeLessThan(1); // Feather Guard
  });

  it('Wind Blade throws a fan of three shots, each its own projectile', () => {
    const a = arena({ x: 6, y: 0 });
    a.world.release('me', AERION_KIT.a2, { x: 6, y: 0 }, a.host);
    expect(a.world.projectiles).toHaveLength(3);
    const angles = a.world.projectiles.map((p) => Math.atan2(p.dir.y, p.dir.x)).sort((x, y) => x - y);
    expect(angles[0]).toBeLessThan(0);
    expect(angles[2]).toBeGreaterThan(0);
    expect(angles[1]).toBeCloseTo(0, 5);
  });

  it('Sky Dive leaps to the aimed spot and lands with a wind burst that hits the foe once', () => {
    const a = arena({ x: 5, y: 0 });
    a.world.release('me', AERION_KIT.a1, { x: 5, y: 0 }, a.host);
    run(a, 0.5);
    expect(a.world.liftOf('me')).toBeGreaterThan(2);
    run(a, 0.6);
    expect(a.hits.filter((h) => h.target === 'foe')).toHaveLength(1);
  });

  it('Cyclone Lift holds the nearest foe up in the tornado for under a second, then flings them away', () => {
    const a = arena({ x: 2.5, y: 0 });
    a.world.release('me', AERION_KIT.a3, { x: 2.5, y: 0 }, a.host);
    run(a, 0.8);
    expect(a.world.cyclones).toHaveLength(1);
    expect(Math.max(...a.lifts)).toBeGreaterThan(1);
    expect(a.hits).toHaveLength(0);
    run(a, 0.3);
    expect(a.world.cyclones).toHaveLength(0);
    expect(a.hits).toHaveLength(1);
    expect(a.hits[0]?.dirX).toBeGreaterThan(0.9); // flung straight away from the caster
    const d = AERION_KIT.a3.delivery;
    expect(d.type === 'grab' && d.liftS).toBeLessThan(1);
  });

  it('Celestial Tempest sends volleys of blades across the battlefield while he is airborne, then dives', () => {
    const a = arena({ x: 5, y: 0 });
    a.world.release('me', AERION_KIT.ult, { x: 5, y: 0 }, a.host);
    const d = AERION_KIT.ult.delivery;
    if (d.type !== 'leap' || !d.volley) throw new Error('the ultimate is a leap with a volley');
    let peak = 0;
    for (let i = 0; i < 100; i++) {
      a.world.update(1 / 60, a.host);
      peak = Math.max(peak, a.world.projectiles.length);
    }
    expect(peak).toBeGreaterThanOrEqual(d.volley.blades);
    run(a, d.airS + 0.2);
    expect(a.hits.length).toBeGreaterThanOrEqual(1); // the dive and the blades that reached him
    expect(a.world.liftOf('me')).toBe(0);
  });
});

describe('Aerion combo and heavy', () => {
  const states = profile.states as Record<string, string>;
  it('a four-hit light combo with the owner’s four moves, the last a heavy launcher', () => {
    const chain: string[] = [];
    let id: string | undefined = set.starters.tap;
    while (id && !chain.includes(id)) {
      chain.push(id);
      id = (set.moves.find((m) => m.id === id) as { next?: { tap?: string } } | undefined)?.next?.tap;
    }
    expect(chain).toEqual(['palm-strike', 'spin-kick', 'wing-slash', 'rising-strike']);
    expect(set.moves.find((m) => m.id === 'rising-strike')?.heavy).toBe(true);
    for (const m of set.moves.filter((x) => chain.includes(x.id)))
      expect(states[m.animationState]).toMatch(/^aerion\./);
  });

  it('the heavy is the wing smash with its own clip, effect and sound', () => {
    const heavy = set.moves.find((m) => m.id === set.starters.heavy);
    expect(heavy?.id).toBe('wing-smash');
    expect(states[heavy?.animationState ?? '']).toBe('aerion.wing-smash');
    expect((heavy as { effect?: string }).effect).toBe('wind-smash');
  });
});

describe('Aerial Momentum', () => {
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
  const p = AERION_KIT.passive!;

  it('each landed blow adds a 4% speed stack up to the cap, and all lapse together', () => {
    const c = new Combatant(STATS);
    for (let i = 0; i < 9; i++) c.gainMomentum(p.speedPerStack, p.maxStacks, p.durationS);
    expect(c.momentumStacks).toBe(p.maxStacks);
    expect(c.status.speedFactor).toBeCloseTo(1.04 ** p.maxStacks, 5);
    for (let i = 0; i < Math.round((p.durationS + 0.2) * 60); i++) c.update(1 / 60);
    expect(c.momentumStacks).toBe(0);
    expect(c.status.speedFactor).toBe(1);
  });

  it('blows at the cap keep it alive', () => {
    const c = new Combatant(STATS);
    for (let i = 0; i < p.maxStacks; i++) c.gainMomentum(p.speedPerStack, p.maxStacks, p.durationS);
    for (let k = 0; k < 8; k++) {
      for (let i = 0; i < 120; i++) c.update(1 / 60);
      c.gainMomentum(p.speedPerStack, p.maxStacks, p.durationS);
    }
    expect(c.momentumStacks).toBe(p.maxStacks);
  });
});
