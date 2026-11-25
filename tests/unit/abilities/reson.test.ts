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

  it('Sonic Boom (RS1) is a wide, steerable 3 second scream that never pins what it hits, interrupting it once only', () => {
    const a = arena([{ x: 3, y: 0 }]);
    const pins: number[] = [];
    const flinch: boolean[] = [];
    a.host.pin = (_id, away, secs) => pins.push(away.x * secs); // must never be called
    a.host.hitFighter = (_c, target, payload) => {
      a.hits.push({ target, damage: payload.damage, disrupt: false });
      flinch.push(payload.noFlinch !== true);
      return true;
    };
    const d = RESON_KIT.a1.delivery;
    if (d.type !== 'beam') throw new Error('a beam');
    expect(d.durationS).toBe(3);
    expect(d.scream).toBe(true);
    a.world.release('me', RESON_KIT.a1, { x: 7, y: 0 }, a.host);
    run(a, 3.5);
    expect(a.hits.length).toBeGreaterThanOrEqual(8);
    expect(pins).toEqual([]); // nothing is immobilised
    expect(d.widthM).toBeGreaterThanOrEqual(4.5);
    expect(d.turnRadPerS).toBeGreaterThan(0); // steerable like Fire Beam
    expect(flinch[0]).toBe(true);
    expect(flinch.slice(1).every((x) => !x)).toBe(true);
    expect(a.world.beams).toHaveLength(0); // it ends on time
  });

  it('the scream does not reach beyond its range', () => {
    const a = arena([{ x: 12, y: 0 }]);
    a.world.release('me', RESON_KIT.a1, { x: 7, y: 0 }, a.host);
    run(a, 3.5);
    expect(a.hits).toHaveLength(0);
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

  it('Resonance Break is a fast screech that mutes and shatters the defence of what it hits, for 4 seconds', () => {
    const p = RESON_KIT.a4.payload;
    expect(p.mute).toEqual({ durationS: 4 });
    expect(p.shatter).toEqual({ durationS: 4, defenceFactor: 0.7 });
    const a = arena([{ x: 4, y: 0 }]);
    a.world.release('me', RESON_KIT.a4, { x: 4, y: 0 }, a.host);
    run(a, 0.5);
    expect(a.hits).toHaveLength(1);
    expect(a.hits[0]!.damage).toBe(p.damage);
  });

  it('Dissonance never pushes or stuns: it only makes the way they move wobble, for 3.5 s (no copy of a shove)', () => {
    const a = arena([{ x: 1.5, y: 0 }]);
    a.world.release('me', RESON_KIT.a5!, { x: 0, y: 0 }, a.host);
    run(a, 0.5);
    expect(a.hits).toHaveLength(1);
    expect(a.hits[0]).toMatchObject({ disrupt: true });
    expect(a.hits[0]!.damage).toBe(55); // buffed from 24 (25/11/2026): it hurts as well as scrambles
    expect(a.hits[0]!.damage).toBeLessThan(RESON_KIT.a4.payload.damage + 20); // still no stronger than his Vibration Punch can be
    expect(RESON_KIT.a5!.payload.stunS).toBeUndefined();
    expect(RESON_KIT.a5!.payload.knockbackMps).toBe(0);
    expect(RESON_KIT.a5!.payload.disrupt?.durationS).toBeGreaterThanOrEqual(3);
  });

  it('Shatterwave is a line of fractures racing away in front of him, not a ring: only enemies on the line are hit, in order', () => {
    const a = arena([
      { x: 2.5, y: 0 },
      { x: 6.5, y: 0 },
      { x: 2.5, y: 5 }, // well off the line
    ]);
    a.world.release('me', RESON_KIT.ult, { x: 8, y: 0 }, a.host);
    run(a, 0.5);
    expect(a.hits).toHaveLength(0); // the fractures are still building
    run(a, 2);
    const hit = new Set(a.hits.map((h) => h.target));
    expect(hit.has('foe0')).toBe(true);
    expect(hit.has('foe1')).toBe(true);
    expect(hit.has('foe2')).toBe(false);
    expect(a.hits.every((h) => h.damage >= 40)).toBe(true);
    expect(RESON_KIT.ult.delivery.type).toBe('eruptions');
  });
});

describe('Resonance Barrier and Dissonance effects', () => {
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
  it('the barrier is a sonic one that soaks 90 damage for 5 seconds', () => {
    expect(RESON_KIT.a3.look?.barrierStyle).toBe('sonic');
    expect(RESON_KIT.a3.delivery).toMatchObject({ type: 'barrier', hp: 90, durationS: 5 });
  });
  it('Harmonic Shield throws 40% of what it soaks back at the attacker, and never more than it soaked (no other fighter reflects damage)', () => {
    const c = new Combatant(STATS);
    c.raiseBarrier(90, 5, 0.4);
    const hit = { baseDamage: 50, attackerPower: 1, heavy: false, fromFront: true, critRoll: 0.99 };
    c.receive(hit, 0, 1);
    expect(c.takeBarrierReflect()).toBeCloseTo(20, 5); // 40 % of the 50 absorbed
    expect(c.takeBarrierReflect()).toBe(0); // returned once
    c.receive({ ...hit, baseDamage: 200 }, 0, 1); // only the 40 left is soaked and reflected
    expect(c.takeBarrierReflect()).toBeCloseTo(16, 5);
    expect((RESON_KIT.a3.delivery as { reflect?: number }).reflect).toBe(0.4);
    const plain = new Combatant(STATS);
    plain.raiseBarrier(90, 5);
    plain.receive(hit, 0, 1);
    expect(plain.takeBarrierReflect()).toBe(0);
  });
  it('Resonance Break mutes: a muted fighter cannot cast, for exactly 4 seconds', () => {
    const c = new Combatant(STATS);
    c.mute(4);
    expect(c.muted).toBe(true);
    for (let i = 0; i < 3.9 * 60; i++) c.update(1 / 60);
    expect(c.muted).toBe(true);
    for (let i = 0; i < 0.3 * 60; i++) c.update(1 / 60);
    expect(c.muted).toBe(false);
  });

  it('Resonance Break cuts defence by 30%: real hits then do 1/0.7 as much damage, until it ends', () => {
    const hit = { baseDamage: 40, attackerPower: 1, heavy: false, fromFront: true, critRoll: 0.99 };
    const plain = new Combatant(STATS);
    const broken = new Combatant(STATS);
    broken.shatter(4, 0.7);
    const before = plain.receive(hit).damage;
    const after = broken.receive(hit).damage;
    expect(after / before).toBeCloseTo(1 / 0.7, 1);
    for (let i = 0; i < 4.2 * 60; i++) broken.update(1 / 60);
    const later = new Combatant(STATS);
    later.shatter(4, 0.7);
    for (let i = 0; i < 4.2 * 60; i++) later.update(1 / 60);
    expect(later.receive(hit).damage).toBe(before);
  });

  it('a stronger or other defence effect is never overwritten or stacked by Resonance Break', () => {
    const c = new Combatant(STATS);
    c.decay(5, 1, 0.5); // Curse of Decay keeps its own timer
    c.shatter(4, 0.7);
    expect(c.defenceFactor).toBeCloseTo(0.5 * 0.7, 5);
    c.shatter(4, 0.7);
    expect(c.defenceFactor).toBeCloseTo(0.5 * 0.7, 5); // refreshed, not squared
  });

  it('Vibration Punch launches lighter bodies further than heavier ones', () => {
    const k = RESON_KIT.a2.payload.knockbackByWeight!;
    const launch = (kg: number) => RESON_KIT.a2.payload.knockbackMps * Math.min(k.maxK, Math.max(k.minK, k.refKg / kg));
    expect(launch(58)).toBeGreaterThan(launch(70));
    expect(launch(70)).toBeGreaterThan(launch(110));
    expect(launch(300)).toBe(RESON_KIT.a2.payload.knockbackMps * k.minK);
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
