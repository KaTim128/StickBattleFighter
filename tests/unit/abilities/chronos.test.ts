import { describe, expect, it } from 'vitest';
import { type AbilityHost, AbilityWorld } from '../../../src/abilities/ability-world';
import { Combatant, type CombatStats } from '../../../src/combat/combatant';
import { CHRONOS_KIT } from '../../../src/data/abilities/chronos';
import profile from '../../../src/data/characters/chronos/animation-profile.json';
import set from '../../../src/data/characters/chronos/moveset.json';

/** Chronos (master plan section 4, fighter 11): the time specialist; the owner's order after Reson, 21/11/2026. */
function arena(foe = { x: 1.5, y: 0 }) {
  const me = { id: 'me', x: 0, y: 0, radiusM: 0.3, hittable: true };
  const them = { id: 'foe', ...foe, radiusM: 0.3, hittable: true };
  const hits: { target: string; damage: number; t: number }[] = [];
  const buffs: unknown[] = [];
  const fogged: number[] = [];
  let step = 0;
  const host: AbilityHost = {
    fighters: () => [me, them],
    hitFighter: (_c, target, payload) => {
      hits.push({ target, damage: payload.damage, t: step });
      return true;
    },
    hitEnvironment: () => {},
    blocked: () => null,
    position: () => ({ x: me.x, y: me.y }),
    drive: (id, v) => {
      if (id === 'me' && v) me.x += v.x / 60;
    },
    burnFighter: () => {},
    buff: (_id, b) => buffs.push(b),
    teleport: (_id, to) => {
      me.x = to.x;
      me.y = to.y;
      return to;
    },
    fogFighter: (_id, f) => fogged.push(f.speedFactor),
    emit: () => {},
  };
  const world = new AbilityWorld();
  const run = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds * 60); i++) {
      step++;
      world.update(1 / 60, host);
    }
  };
  return { me, them, hits, buffs, fogged, host, world, run };
}

describe('Chronos kit', () => {
  it('has five distinct abilities and End of Time, with Temporal Momentum', () => {
    const all = [CHRONOS_KIT.a1, CHRONOS_KIT.a2, CHRONOS_KIT.a3, CHRONOS_KIT.a4, CHRONOS_KIT.a5!];
    expect(new Set(all.map((a) => a.id)).size).toBe(5);
    expect(CHRONOS_KIT.ult.id).toBe('endOfTime');
    expect(CHRONOS_KIT.passive?.id).toBe('temporal');
  });

  it('Temporal Acceleration speeds him up and shortens dodge recovery, but never protects him or shortens cooldowns', () => {
    const d = CHRONOS_KIT.a1.delivery;
    if (d.type !== 'buff') throw new Error('a buff');
    expect(d.speedFactor).toBeGreaterThan(1.2);
    expect(d.dodgeRecoveryFactor).toBeLessThan(1);
    expect(d.damageTakenFactor).toBe(1);
    expect(d.cooldownFactor).toBeUndefined();
    expect(d.afterimages).toBe(true);
  });

  it('Echo Strike hits now and again 0.6 s later, with its own hit registration', () => {
    const a = arena({ x: 1.5, y: 0 });
    a.world.release('me', CHRONOS_KIT.a2, { x: 1.5, y: 0 }, a.host);
    expect(a.hits).toHaveLength(1);
    a.run(0.4);
    expect(a.hits).toHaveLength(1); // not yet
    a.run(0.3);
    expect(a.hits).toHaveLength(2);
    expect(a.hits[1]!.damage).toBe(Math.round(CHRONOS_KIT.a2.payload.damage * 0.8));
    a.run(1);
    expect(a.hits).toHaveLength(2); // exactly one echo
  });

  it('the echo lands from where the blow was thrown, even if he has moved, and misses someone who has stepped out of reach', () => {
    const a = arena({ x: 1.5, y: 0 });
    a.world.release('me', CHRONOS_KIT.a2, { x: 1.5, y: 0 }, a.host);
    a.me.x = -4; // he has moved away
    a.them.x = 5; // and the foe has left
    a.run(0.8);
    expect(a.hits).toHaveLength(1); // only the first blow
  });

  it('Temporal Collapse lays a slow field that only slows (no damage, no sight loss)', () => {
    const a = arena({ x: 3, y: 0 });
    a.world.release('me', CHRONOS_KIT.a3, { x: 3, y: 0 }, a.host);
    a.run(1);
    expect(a.fogged.length).toBeGreaterThan(0);
    expect(a.fogged.every((s) => s < 0.7)).toBe(true);
    expect(a.hits).toHaveLength(0);
    const d = CHRONOS_KIT.a3.delivery;
    expect(d.type === 'cloud' && d.fog?.chipDps).toBe(0);
    expect(d.type === 'cloud' && d.fog?.sightM).toBe(Number.POSITIVE_INFINITY);
  });

  it('Rewind Step returns him to where he stood about 2.5 s ago and does nothing else', () => {
    const a = arena({ x: 40, y: 0 });
    for (let k = 0; k < 6; k++) {
      a.me.x = k * 1; // walks right, a metre every half second
      a.run(0.5);
    }
    const before = a.me.x;
    a.world.release('me', CHRONOS_KIT.a4, { x: 0, y: 0 }, a.host);
    expect(a.me.x).toBeLessThan(before - 1.5);
    expect(a.me.x).toBeGreaterThanOrEqual(0);
    expect(a.hits).toHaveLength(0);
    expect(CHRONOS_KIT.a4.payload.damage).toBe(0);
  });

  it('Rewind Step does nothing when he has no recent past to return to', () => {
    const a = arena({ x: 40, y: 0 });
    a.world.release('me', CHRONOS_KIT.a4, { x: 0, y: 0 }, a.host);
    expect(a.me.x).toBe(0);
  });

  it('Afterimage Decoy shifts him and leaves a decoy that lasts 3 s and never deals damage', () => {
    const a = arena({ x: 1, y: 0 });
    a.world.release('me', CHRONOS_KIT.a5!, { x: 4, y: 0 }, a.host);
    expect(a.world.decoys).toHaveLength(1);
    a.run(0.5);
    expect(a.me.x).toBeGreaterThan(2);
    expect(a.world.decoys).toHaveLength(1);
    a.run(3);
    expect(a.world.decoys).toHaveLength(0);
    expect(a.hits).toHaveLength(0);
  });

  it('End of Time lays a slow field, hits six times, and ends with a far bigger shockwave', () => {
    const a = arena({ x: 4, y: 0 });
    a.world.release('me', CHRONOS_KIT.ult, { x: 4, y: 0 }, a.host);
    a.run(0.3);
    expect(a.world.clouds.some((c) => c.fog)).toBe(true);
    a.run(4);
    expect(a.hits).toHaveLength(6);
    expect(a.hits[5]!.damage).toBeGreaterThanOrEqual(a.hits[0]!.damage * 2.4);
  });
});

describe('Dodge recovery and the passive', () => {
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
  it('a faster dodge recovery shortens the cooldown after a dodge', () => {
    const slow = new Combatant(STATS);
    const fast = new Combatant(STATS);
    fast.dodgeRecoveryScale = 0.6;
    slow.tryDodge();
    fast.tryDodge();
    const total = (c: Combatant): number => {
      let n = 0;
      for (let i = 0; i < 600 && c.dodgeReadiness < 1; i++) {
        c.update(1 / 60);
        n++;
      }
      return n;
    };
    expect(total(fast)).toBeLessThan(total(slow));
  });

  it('five landed hits sharpen the next temporal ability by 25%, then it is spent', () => {
    const m = CHRONOS_KIT.passive!.mastery!;
    const c = new Combatant(STATS);
    c.gainMastery(m.threshold, 5);
    expect(c.swordFactor(m.threshold, m.damageFactor, m.windowS)).toBe(1.25);
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
