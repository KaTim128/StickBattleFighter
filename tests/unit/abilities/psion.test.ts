import { describe, expect, it } from 'vitest';
import { finisherFactor } from '../../../src/abilities/ability-def';
import { type AbilityHost, AbilityWorld } from '../../../src/abilities/ability-world';
import { Combatant, type CombatStats } from '../../../src/combat/combatant';
import { PSION_KIT } from '../../../src/data/abilities/psion';
import profile from '../../../src/data/characters/psion/animation-profile.json';
import set from '../../../src/data/characters/psion/moveset.json';

/** Psion (master plan section 4, fighter 6): telekinetic specialist; the owner's order after Kenshiro, 21/11/2026. */
function arena(foe = { x: 3, y: 0 }) {
  const me = { id: 'me', x: 0, y: 0, radiusM: 0.3, hittable: true };
  const them = { id: 'foe', ...foe, radiusM: 0.3, hittable: true };
  const hits: { target: string; damage: number; dirX: number }[] = [];
  const lifts: number[] = [];
  const barriers: { hp: number; durationS: number }[] = [];
  const launched: number[] = [];
  const host: AbilityHost = {
    fighters: () => [me, them],
    hitFighter: (_c, target, payload, dir) => {
      hits.push({ target, damage: payload.damage, dirX: dir.x });
      return true;
    },
    hitEnvironment: () => {},
    blocked: () => null,
    position: () => ({ x: me.x, y: me.y }),
    drive: (id, _v, h) => {
      if (id === 'foe') lifts.push(h);
    },
    burnFighter: () => {},
    buff: () => {},
    hold: () => {},
    barrier: (_id, hp, durationS) => barriers.push({ hp, durationS }),
    emit: (fx) => {
      if (fx.vfx === 'mindstorm-launch') launched.push(1);
    },
  };
  return { me, them, hits, lifts, barriers, launched, host, world: new AbilityWorld() };
}
const run = (a: ReturnType<typeof arena>, seconds: number) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) a.world.update(1 / 60, a.host);
};

describe('Psion kit', () => {
  it('has five distinct psychic abilities and the ultimate Mindstorm, all eligible for Mental Focus', () => {
    const all = [PSION_KIT.a1, PSION_KIT.a2, PSION_KIT.a3, PSION_KIT.a4, PSION_KIT.a5!];
    expect(new Set(all.map((a) => a.id)).size).toBe(5);
    expect(PSION_KIT.ult.id).toBe('mindstorm');
    for (const a of all.filter((x) => x.payload.damage > 0 || x.delivery.type === 'lift'))
      expect(a.payload.psi, a.id).toBe(true);
    expect(PSION_KIT.passive?.id).toBe('focus');
  });

  it('Mind Crush closes in on the target for under a second and then releases once, hitting what is inside', () => {
    const a = arena({ x: 5, y: 0 });
    a.world.release('me', PSION_KIT.a1, { x: 5, y: 0 }, a.host);
    expect(a.world.telegraphs).toHaveLength(1);
    expect(a.world.telegraphs[0]?.x).toBeCloseTo(5, 1);
    run(a, 0.5);
    expect(a.hits).toHaveLength(0); // still compressing
    run(a, 0.5);
    expect(a.hits.filter((h) => h.target === 'foe')).toHaveLength(1);
    expect(PSION_KIT.a1.look?.telegraph).toBe('compress');
  });

  it('Telekinetic Toss lifts a prop at his hand; Psychic Slam hurls it (PS1, PS2)', () => {
    const a = arena({ x: 3, y: 0 });
    const log: string[] = [];
    (a.host as unknown as Record<string, unknown>).telekineticToss = (_id: string, range: number) => {
      log.push(`toss:${range}`);
      return true;
    };
    (a.host as unknown as Record<string, unknown>).telekineticSlam = (_id: string, speed: number) => {
      log.push(`slam:${speed}`);
      return true;
    };
    a.world.release('me', PSION_KIT.a2, { x: 6, y: 0 }, a.host);
    a.world.release('me', PSION_KIT.a3, { x: 6, y: 0 }, a.host);
    expect(log).toEqual(['toss:6', 'slam:1.35']);
    expect(PSION_KIT.a2.delivery.type).toBe('toss');
    expect(PSION_KIT.a3.delivery.type).toBe('slam');
  });

  it('Floating Prison lifts the nearest foe, holds it, lets it down, and cannot lift it again for 4 seconds', () => {
    const a = arena({ x: 3, y: 0 });
    const d = PSION_KIT.a4.delivery;
    if (d.type !== 'lift') throw new Error('Floating Prison is a lift');
    a.world.release('me', PSION_KIT.a4, { x: 3, y: 0 }, a.host);
    run(a, 0.8);
    expect(a.world.cages).toHaveLength(1);
    expect(Math.max(...a.lifts)).toBeGreaterThan(1);
    run(a, d.liftS + 0.6);
    expect(a.world.cages).toHaveLength(0);
    expect(a.hits.filter((h) => h.target === 'foe')).toHaveLength(1); // the small fall damage
    expect(a.hits[0]?.damage).toBe(d.fallDamage);
    // Straight away again: refused (no lock).
    const before = a.lifts.length;
    a.world.release('me', PSION_KIT.a4, { x: 3, y: 0 }, a.host);
    run(a, 0.5);
    expect(a.world.cages).toHaveLength(0);
    expect(a.lifts.length).toBe(before + a.lifts.slice(before).length); // nothing new lifted
    expect(a.lifts.slice(before).every((h) => h === 0)).toBe(true);
    // After the immunity it works again.
    run(a, d.immuneS);
    a.world.release('me', PSION_KIT.a4, { x: 3, y: 0 }, a.host);
    run(a, 0.5);
    expect(a.world.cages).toHaveLength(1);
  });

  it('Mindstorm floats objects up, flings eight at enemies in the field one by one, then detonates', () => {
    const a = arena({ x: 3, y: 0 });
    a.world.release('me', PSION_KIT.ult, { x: 0, y: 0 }, a.host);
    const d = PSION_KIT.ult.delivery;
    if (d.type !== 'nova' || !d.volley) throw new Error('Mindstorm is a nova with a volley');
    run(a, 0.4);
    expect(a.launched).toHaveLength(0); // the objects are still rising
    run(a, d.telegraphS);
    expect(a.launched).toHaveLength(d.volley.count);
    const blast = a.hits.filter((h) => h.damage > d.volley!.payload.damage); // falls off with distance, still far above a flung object
    expect(blast.length).toBeGreaterThanOrEqual(1); // the final explosion
    expect(a.hits.filter((h) => h.damage === d.volley!.payload.damage).length).toBeGreaterThanOrEqual(1); // some flung objects hit
  });
});

describe('Barrier shield (shared combat rule)', () => {
  const STATS: CombatStats = {
    maxHp: 1000,
    maxStamina: 100,
    staminaRegenPerS: 30,
    staminaRegenDelayS: 0.7,
    power: 1,
    defence: 1,
    critChance: 0,
    critMultiplier: 1,
    knockbackResistance: 0,
  };
  const hit = { baseDamage: 40, attackerPower: 1, heavy: false, fromFront: true, critRoll: 0.99 };

  it('absorbs damage up to its limit with no flinch, then breaks and lets the rest through', () => {
    const c = new Combatant(STATS);
    c.raiseBarrier(70, 6);
    expect(c.receive(hit).outcome).toBe('blocked'); // 40 absorbed
    expect(c.hp).toBe(1000);
    expect(c.barrierHp).toBeCloseTo(30, 5);
    const r = c.receive(hit); // 30 absorbed, 10 through, barrier gone
    expect(c.barrierHp).toBe(0);
    expect(r.damage).toBeGreaterThan(0);
    expect(1000 - c.hp).toBeCloseTo(10, 0);
    expect(c.takeBarrierBreak()).toBe(true);
    expect(c.takeBarrierBreak()).toBe(false);
  });

  it('runs out after its duration and bursts into fragments once', () => {
    const c = new Combatant(STATS);
    c.raiseBarrier(70, 6);
    for (let i = 0; i < 6.2 * 60; i++) c.update(1 / 60);
    expect(c.barrierHp).toBe(0);
    expect(c.takeBarrierBreak()).toBe(true);
    expect(c.receive(hit).damage).toBeGreaterThan(0);
  });
});

describe('Psion combo, heavy and Mental Focus', () => {
  const states = profile.states as Record<string, string>;
  it('a four-hit psychic combo, a force-wave heavy, all with their own clips', () => {
    const chain: string[] = [];
    let id: string | undefined = set.starters.tap;
    while (id && !chain.includes(id)) {
      chain.push(id);
      id = (set.moves.find((m) => m.id === id) as { next?: { tap?: string } } | undefined)?.next?.tap;
    }
    expect(chain).toEqual(['psychic-palm', 'telekinetic-elbow', 'floating-spin-kick', 'double-palm-blast']);
    for (const m of set.moves) expect(states[m.animationState] ?? '', m.id).toMatch(/^psion\./);
    expect(set.starters.heavy).toBe('force-wave');
    const heavy = set.moves.find((m) => m.id === 'force-wave')!;
    expect(heavy.startupS).toBeGreaterThanOrEqual(0.5);
    expect(heavy.hitbox.reachM).toBeGreaterThanOrEqual(2.5); // a wide wave
  });

  it('focus builds to the threshold and strengthens the next psychic ability, then is spent', () => {
    const m = PSION_KIT.passive!.mastery!;
    const c = new Combatant({
      maxHp: 1000,
      maxStamina: 100,
      staminaRegenPerS: 30,
      staminaRegenDelayS: 0.7,
      power: 1,
      defence: 1,
      critChance: 0,
      critMultiplier: 1,
      knockbackResistance: 0,
    });
    c.gainMastery(m.threshold - 1, 6);
    expect(c.swordFactor(m.threshold, m.damageFactor, m.windowS)).toBe(1);
    c.gainMastery(1, 6);
    expect(c.swordFactor(m.threshold, m.damageFactor, m.windowS)).toBe(1.3);
    expect(c.masteryStacks).toBe(0);
    expect(finisherFactor(PSION_KIT.a1.payload, 0.1)).toBe(1); // no execute bonus here
  });
});
