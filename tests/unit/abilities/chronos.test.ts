import { describe, expect, it } from 'vitest';
import { type AbilityHost, AbilityWorld } from '../../../src/abilities/ability-world';
import { Combatant, type CombatStats } from '../../../src/combat/combatant';
import { CHRONOS_KIT } from '../../../src/data/abilities/chronos';
import profile from '../../../src/data/characters/chronos/animation-profile.json';
import set from '../../../src/data/characters/chronos/moveset.json';

/** Chronos (master plan section 4, fighter 11), reworked by the owner 21/11/2026. */
function arena(foe = { x: 1.5, y: 0 }) {
  const me = { id: 'me', x: 0, y: 0, radiusM: 0.3, hittable: true };
  const them = { id: 'foe', ...foe, radiusM: 0.3, hittable: true };
  const hits: { target: string; damage: number; slow: boolean; aging: boolean; stun: boolean }[] = [];
  const healed: number[] = [];
  const stops: boolean[] = [];
  const fogged: number[] = [];
  const host: AbilityHost = {
    fighters: () => [me, them],
    hitFighter: (_c, target, payload) => {
      hits.push({
        target,
        damage: payload.damage,
        slow: payload.slow !== undefined,
        aging: payload.aging !== undefined,
        stun: (payload.stunS ?? 0) > 0,
      });
      return true;
    },
    hitEnvironment: () => {},
    blocked: () => null,
    position: () => ({ x: me.x, y: me.y }),
    drive: (id, v) => {
      if (id === 'me' && v) me.x += v.x / 60;
    },
    burnFighter: () => {},
    buff: () => {},
    teleport: (_id, to) => {
      me.x = to.x;
      me.y = to.y;
      return to;
    },
    heal: (_id, amount) => {
      healed.push(amount);
      return true;
    },
    timeStop: (_id, on) => stops.push(on),
    fogFighter: (_id, f) => fogged.push(f.speedFactor),
    emit: () => {},
  };
  const world = new AbilityWorld();
  const run = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds * 60); i++) world.update(1 / 60, host);
  };
  return { me, them, hits, healed, stops, fogged, host, world, run };
}

describe('Chronos kit', () => {
  it('has the owners five abilities and Time Stop, and every ability holds its cooldown until its effects end', () => {
    const all = [CHRONOS_KIT.a1, CHRONOS_KIT.a2, CHRONOS_KIT.a3, CHRONOS_KIT.a4, CHRONOS_KIT.a5!];
    expect(all.map((a) => a.id)).toEqual([
      'rewindTime',
      'temporalEcho',
      'chronoSlash',
      'afterimage',
      'ageAcceleration',
    ]);
    expect(CHRONOS_KIT.ult.id).toBe('timeStop');
    for (const a of all) expect(a.holdsCooldown, a.id).toBe(true);
    expect(CHRONOS_KIT.passive?.id).toBe('temporal');
  });

  it('Rewind Time returns him to where he started after 4 s and heals 50% of the damage really dealt, never attempted damage', () => {
    const a = arena({ x: 1.5, y: 0 });
    a.world.release('me', CHRONOS_KIT.a1, { x: 1.5, y: 0 }, a.host);
    expect(a.hits).toHaveLength(1); // the blow
    a.me.x = 5;
    a.world.recordDealt('me', 30); // the host reports hit points actually removed
    a.run(1);
    a.world.recordDealt('me', 20);
    a.run(2.8);
    expect(a.healed).toHaveLength(0); // not yet
    expect(a.me.x).toBeGreaterThan(4);
    a.run(0.5);
    expect(a.me.x).toBe(0); // back where he started
    expect(a.healed).toEqual([25]); // 50% of 50
  });

  it('Rewind Time heals nothing when nothing was really dealt, and its blow is the only attempt counted by the host, not the world', () => {
    const a = arena({ x: 40, y: 0 });
    a.world.release('me', CHRONOS_KIT.a1, { x: 40, y: 0 }, a.host);
    a.run(4.2);
    expect(a.healed).toEqual([0]);
  });

  it('Rewind Time holds the ability open for the 4 s and the replay, then lets the cooldown start', () => {
    const a = arena({ x: 40, y: 0 });
    a.world.release('me', CHRONOS_KIT.a1, { x: 40, y: 0 }, a.host);
    a.run(3.5);
    expect(a.world.executingIds('me').has('rewindTime')).toBe(true);
    a.run(0.6); // 4.1 s: rewound, replay still showing
    expect(a.world.executingIds('me').has('rewindTime')).toBe(true);
    a.run(1);
    expect(a.world.executingIds('me').has('rewindTime')).toBe(false);
  });

  it('Temporal Echo marks the foe, then after 2 s hits it and drags it back to the marked spot (a snap-back no other fighter has)', () => {
    const a = arena({ x: 3, y: 0 });
    const drives: { id: string; x: number }[] = [];
    const orig = a.host.drive;
    a.host.drive = (id, v, h) => {
      if (id === 'foe' && v) drives.push({ id, x: v.x });
      return orig(id, v, h);
    };
    a.world.release('me', CHRONOS_KIT.a2, { x: 3, y: 0 }, a.host);
    a.run(1);
    expect(a.hits).toHaveLength(0); // still only a mark
    expect(a.world.echoes).toHaveLength(1);
    a.them.x = 6; // it runs away
    a.run(1.2);
    expect(a.hits.filter((h) => h.target === 'foe')).toHaveLength(1);
    expect(a.hits[0]!.slow).toBe(true);
    expect(a.world.echoes).toHaveLength(0);
    a.run(0.3);
    expect(drives.some((d) => d.x < 0)).toBe(true); // dragged back toward the marked spot
    expect(CHRONOS_KIT.a2.delivery.type).toBe('echo');
  });

  it('Temporal Echo does nothing if nobody is in reach', () => {
    const a = arena({ x: 20, y: 0 });
    a.world.release('me', CHRONOS_KIT.a2, { x: 3, y: 0 }, a.host);
    a.run(3);
    expect(a.hits).toHaveLength(0);
    expect(a.world.echoes).toHaveLength(0);
  });

  it('Chrono Slash is a travelling slash that staggers what it hits', () => {
    const a = arena({ x: 4, y: 0 });
    a.world.release('me', CHRONOS_KIT.a3, { x: 4, y: 0 }, a.host);
    expect(a.world.executingIds('me').has('chronoSlash')).toBe(true); // in flight
    a.run(1);
    expect(a.hits).toHaveLength(1);
    expect(a.hits[0]!.stun).toBe(true);
    expect(a.hits[0]!.damage).toBe(CHRONOS_KIT.a3.payload.damage);
    expect(CHRONOS_KIT.a3.look?.flight?.crescent).toBe(true);
  });

  it('Afterimage leaves afterimages along the path he really ran, and hurts and slows whoever he passes through once', () => {
    const a = arena({ x: 2.5, y: 0 });
    a.world.release('me', CHRONOS_KIT.a4, { x: 6, y: 0 }, a.host);
    a.run(0.6);
    expect(a.world.decoys.length).toBeGreaterThanOrEqual(4);
    for (let i = 1; i < a.world.decoys.length; i++) {
      expect(a.world.decoys[i]!.x).toBeGreaterThan(a.world.decoys[i - 1]!.x); // in order along his path
      expect(Math.abs(a.world.decoys[i]!.y)).toBeLessThan(0.01); // exactly on it
    }
    expect(a.hits).toHaveLength(1);
    expect(a.hits[0]).toMatchObject({ slow: true });
    expect(CHRONOS_KIT.a4.payload.slow).toEqual({ durationS: 1, speedFactor: 0.6 });
  });

  it('an enemy shot that reaches an afterimage is spent on it, and the afterimage cannot hurt anyone', () => {
    const a = arena({ x: 40, y: 0 });
    a.world.release('me', CHRONOS_KIT.a4, { x: 5, y: 0 }, a.host);
    a.run(0.4);
    const image = a.world.decoys[0]!;
    a.world.projectiles.push({
      casterId: 'foe',
      def: { ...CHRONOS_KIT.a3, payload: { ...CHRONOS_KIT.a3.payload, damage: 30 } },
      x: image.x,
      y: image.y,
      dir: { x: -1, y: 0 },
      travelledM: 0,
      trail: [],
    });
    const before = a.hits.length;
    a.run(0.05);
    expect(a.world.projectiles.filter((p) => p.casterId === 'foe')).toHaveLength(0);
    expect(a.hits.length).toBe(before);
  });

  it('Age Acceleration ages the nearest enemy: damage over time and a 25% defence cut for 4 seconds', () => {
    const a = arena({ x: 4, y: 0 });
    a.world.release('me', CHRONOS_KIT.a5!, { x: 4, y: 0 }, a.host);
    expect(a.hits).toHaveLength(1);
    expect(a.hits[0]!.aging).toBe(true);
    expect(CHRONOS_KIT.a5!.payload.aging).toEqual({ durationS: 4, dps: 22, defenceFactor: 0.75 });
    expect(a.world.executingIds('me').has('ageAcceleration')).toBe(true);
    a.run(4.2);
    expect(a.world.executingIds('me').has('ageAcceleration')).toBe(false);
  });

  it('Age Acceleration fizzles with nobody in range', () => {
    const a = arena({ x: 40, y: 0 });
    a.world.release('me', CHRONOS_KIT.a5!, { x: 0, y: 0 }, a.host);
    expect(a.hits).toHaveLength(0);
  });

  it('Time Stop holds the ability world for 4 seconds, keeps its cooldown closed, and then resumes everything', () => {
    const a = arena({ x: 8, y: 0 });
    a.world.release('me', CHRONOS_KIT.a3, { x: 8, y: 0 }, a.host); // a slash in flight
    const shot = a.world.projectiles[0]!;
    a.world.release('me', CHRONOS_KIT.ult, { x: 0, y: 0 }, a.host);
    expect(a.stops).toEqual([true]);
    const x = shot.x;
    a.run(3.9);
    expect(a.stops).toEqual([true]); // still stopped
    expect(shot.x).toBe(x); // the shot has not moved
    expect(a.world.executingIds('me').has('timeStop')).toBe(true);
    a.run(0.2);
    expect(a.stops).toEqual([true, false]); // exactly one resume
    expect(a.world.stopOf()).toBeNull();
    a.run(0.1);
    expect(shot.x).toBeGreaterThan(x); // it flies on from exactly where it was
  });
});

describe('Combatant effects', () => {
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

  it('aging wears a target down over 4 seconds and really lowers its defence, then ends', () => {
    const plain = new Combatant(STATS);
    const aged = new Combatant(STATS);
    aged.age(4, 14, 0.75);
    expect(aged.receive(hit).damage / plain.receive(hit).damage).toBeCloseTo(1 / 0.75, 1);
    const before = aged.hp;
    for (let i = 0; i < 4 * 60; i++) aged.update(1 / 60);
    expect(before - aged.hp).toBeGreaterThan(45);
    expect(before - aged.hp).toBeLessThanOrEqual(60);
    expect(aged.ageLeftS).toBeLessThan(0.01);
  });

  it('a slow lasts its duration and is only a slow', () => {
    const c = new Combatant(STATS);
    c.slow(1, 0.6);
    expect(c.slowed).toBe(true);
    expect(c.canAct).toBe(true);
    for (let i = 0; i < 1.1 * 60; i++) c.update(1 / 60);
    expect(c.slowed).toBe(false);
  });

  it('four landed hits sharpen the next temporal ability by 35%, then it is spent', () => {
    const m = CHRONOS_KIT.passive!.mastery!;
    const c = new Combatant(STATS);
    c.gainMastery(m.threshold, 4);
    expect(c.swordFactor(m.threshold, m.damageFactor, m.windowS)).toBe(1.35);
    expect(c.masteryStacks).toBe(0);
  });
});

describe('Chronos combo and heavy', () => {
  it('a four-hit combo ending in a delayed impact, a charged-fist heavy, each with its own clip', () => {
    const chain: string[] = [];
    let id: string | undefined = set.starters.tap;
    while (id && !chain.includes(id)) {
      chain.push(id);
      id = (set.moves.find((m) => m.id === id) as { next?: { tap?: string } } | undefined)?.next?.tap;
    }
    expect(chain).toEqual(['forward-jab', 'reverse-palm-strike', 'temporal-spin-kick', 'delayed-impact']);
    const states = profile.states as Record<string, string>;
    for (const m of set.moves) expect(states[m.animationState] ?? '', m.id).toMatch(/^chrono\./);
    expect(set.moves.find((m) => m.id === set.starters.heavy)?.startupS).toBeGreaterThanOrEqual(0.45);
  });
});
