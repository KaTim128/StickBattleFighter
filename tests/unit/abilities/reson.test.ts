import { describe, expect, it } from 'vitest';
import { type AbilityHost, AbilityWorld } from '../../../src/abilities/ability-world';
import { Combatant, type CombatStats } from '../../../src/combat/combatant';
import { RESON_KIT } from '../../../src/data/abilities/reson';
import profile from '../../../src/data/characters/reson/animation-profile.json';
import set from '../../../src/data/characters/reson/moveset.json';

/** Reson (master plan section 4, fighter 4): the sonic and vibration specialist; the owner's order after Geargrind, 21/11/2026. */
function arena(foes: { x: number; y: number }[] = [{ x: 3, y: 0 }]) {
  const me = { id: 'me', x: 0, y: 0, radiusM: 0.3, hittable: true };
  const them = foes.map((f, i) => ({ id: `foe${i}`, ...f, radiusM: 0.3, hittable: true }));
  const hits: { target: string; damage: number; disrupt: boolean }[] = [];
  const driven: number[] = [];
  const host: AbilityHost = {
    fighters: () => [me, ...them],
    hitFighter: (_c, target, payload) => {
      hits.push({ target, damage: payload.damage, disrupt: payload.disrupt !== undefined });
      return true;
    },
    hitEnvironment: () => {},
    blocked: () => null,
    position: () => ({ x: me.x, y: me.y }),
    drive: (id, v) => {
      if (id === 'me' && v) {
        me.x += v.x / 60;
        driven.push(v.x);
      }
    },
    burnFighter: () => {},
    buff: () => {},
    emit: () => {},
  };
  return { me, hits, driven, host, world: new AbilityWorld() };
}
const run = (a: ReturnType<typeof arena>, seconds: number) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) a.world.update(1 / 60, a.host);
};

describe('Reson kit', () => {
  it('has five distinct abilities and Shatterwave, with Resonance sharpening the next sonic ability', () => {
    const all = [RESON_KIT.a1, RESON_KIT.a2, RESON_KIT.a3, RESON_KIT.a4, RESON_KIT.a5!];
    expect(new Set(all.map((a) => a.id)).size).toBe(5);
    expect(RESON_KIT.ult.id).toBe('shatterwave');
    expect(RESON_KIT.passive?.id).toBe('resonance');
    for (const a of [RESON_KIT.a1, RESON_KIT.a2, RESON_KIT.a5!, RESON_KIT.ult])
      expect(a.payload.sonic, a.id).toBe(true);
  });

  it('Sonic Boom rolls on through everyone in its path, hitting each once', () => {
    const a = arena([
      { x: 3, y: 0 },
      { x: 6, y: 0 },
    ]);
    a.world.release('me', RESON_KIT.a1, { x: 9, y: 0 }, a.host);
    run(a, 1);
    expect(a.hits.map((h) => h.target).sort()).toEqual(['foe0', 'foe1']);
  });

  it('Vibration Punch hits hard but only at arm length', () => {
    const near = arena([{ x: 1.4, y: 0 }]);
    near.world.release('me', RESON_KIT.a2, { x: 1.4, y: 0 }, near.host);
    expect(near.hits).toHaveLength(1);
    expect(near.hits[0]!.damage).toBeGreaterThanOrEqual(60);
    const far = arena([{ x: 4, y: 0 }]);
    far.world.release('me', RESON_KIT.a2, { x: 4, y: 0 }, far.host);
    expect(far.hits).toHaveLength(0);
  });

  it('Resonance Dash is pure mobility: it carries him forward and hits nobody', () => {
    const a = arena([{ x: 2, y: 0 }]);
    a.world.release('me', RESON_KIT.a4, { x: 6, y: 0 }, a.host);
    run(a, 0.5);
    expect(a.me.x).toBeGreaterThan(4);
    expect(a.hits).toHaveLength(0);
  });

  it('Feedback Pulse pushes everyone near, hurts a little, and disrupts without stunning', () => {
    const a = arena([{ x: 1.5, y: 0 }]);
    a.world.release('me', RESON_KIT.a5!, { x: 0, y: 0 }, a.host);
    run(a, 0.5);
    expect(a.hits).toHaveLength(1);
    expect(a.hits[0]).toMatchObject({ disrupt: true });
    expect(a.hits[0]!.damage).toBeLessThanOrEqual(20);
    expect(RESON_KIT.a5!.payload.stunS).toBeUndefined();
    expect(RESON_KIT.a5!.payload.knockbackMps).toBeGreaterThan(5);
  });

  it('Shatterwave builds, then hits everyone in its ring with the biggest sonic blow', () => {
    const a = arena([{ x: 2, y: 0 }]);
    a.world.release('me', RESON_KIT.ult, { x: 0, y: 0 }, a.host);
    run(a, 0.5);
    expect(a.hits).toHaveLength(0);
    run(a, 1);
    expect(a.hits).toHaveLength(1);
    expect(a.hits[0]!.damage).toBeGreaterThanOrEqual(70);
    expect(RESON_KIT.ult.look?.impact?.rings).toBeGreaterThanOrEqual(3);
  });
});

describe('Resonance Barrier and Feedback Pulse effects', () => {
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
  it('the barrier is a sonic one that soaks 60 damage for 5 seconds', () => {
    expect(RESON_KIT.a3.look?.barrierStyle).toBe('sonic');
    expect(RESON_KIT.a3.delivery).toMatchObject({ type: 'barrier', hp: 60, durationS: 5 });
  });
  it('a disrupted fighter wavers for its duration and is never stunned or made unable to act', () => {
    const c = new Combatant(STATS);
    c.disrupt(1.5);
    expect(c.disrupted).toBe(true);
    expect(c.canAct).toBe(true);
    for (let i = 0; i < 1.6 * 60; i++) c.update(1 / 60);
    expect(c.disrupted).toBe(false);
  });
});

describe('Reson combo and heavy', () => {
  it('a four-hit sonic combo, a gauntlet-blast heavy, each with its own clip', () => {
    const chain: string[] = [];
    let id: string | undefined = set.starters.tap;
    while (id && !chain.includes(id)) {
      chain.push(id);
      id = (set.moves.find((m) => m.id === id) as { next?: { tap?: string } } | undefined)?.next?.tap;
    }
    expect(chain).toEqual(['sonic-jab', 'resonance-cross', 'vibrating-elbow', 'double-palm-shockwave']);
    const states = profile.states as Record<string, string>;
    for (const m of set.moves) expect(states[m.animationState] ?? '', m.id).toMatch(/^reson\./);
    const heavy = set.moves.find((m) => m.id === set.starters.heavy)!;
    expect(heavy.id).toBe('gauntlet-blast');
    expect(heavy.startupS).toBeGreaterThanOrEqual(0.45);
  });
});
