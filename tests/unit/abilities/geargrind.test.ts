import { describe, expect, it } from 'vitest';
import { type AbilityHost, AbilityWorld } from '../../../src/abilities/ability-world';
import { GEARGRIND_KIT } from '../../../src/data/abilities/geargrind';
import profile from '../../../src/data/characters/geargrind/animation-profile.json';
import set from '../../../src/data/characters/geargrind/moveset.json';

/** Geargrind (master plan section 4, fighter 5): the combat engineer; the owner's order after Psion, 21/11/2026. */
function arena(foe = { x: 3, y: 0 }) {
  const me = { id: 'me', x: 0, y: 0, radiusM: 0.3, hittable: true };
  const them = { id: 'foe', ...foe, radiusM: 0.3, hittable: true };
  const hits: { target: string; damage: number; dirX: number }[] = [];
  const holds: number[] = [];
  const pulls: { radiusM: number; strength: number }[] = [];
  const host: AbilityHost = {
    fighters: () => [me, them],
    hitFighter: (_c, target, payload, dir) => {
      hits.push({ target, damage: payload.damage, dirX: dir.x });
      return true;
    },
    hitEnvironment: () => {},
    blocked: () => null,
    position: () => ({ x: me.x, y: me.y }),
    drive: (id, v) => {
      if (id === 'me' && v) me.x += v.x / 60; // the world steps at 60 Hz in these tests
    },
    burnFighter: () => {},
    buff: () => {},
    hold: (_id, s) => holds.push(s),
    attract: (_at, radiusM, strength) => pulls.push({ radiusM, strength }),
    emit: () => {},
  };
  return { me, them, hits, holds, pulls, host, world: new AbilityWorld() };
}
const run = (a: ReturnType<typeof arena>, seconds: number) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) a.world.update(1 / 60, a.host);
};

describe('Geargrind kit', () => {
  it('has five distinct gadget abilities and Overdrive Protocol, with Mechanical Efficiency to sharpen the next gadget', () => {
    const all = [GEARGRIND_KIT.a1, GEARGRIND_KIT.a2, GEARGRIND_KIT.a3, GEARGRIND_KIT.a4, GEARGRIND_KIT.a5!];
    expect(new Set(all.map((a) => a.id)).size).toBe(5);
    expect(GEARGRIND_KIT.ult.id).toBe('overdrive');
    expect(GEARGRIND_KIT.passive?.id).toBe('efficiency');
    for (const a of [GEARGRIND_KIT.a1, GEARGRIND_KIT.a2, GEARGRIND_KIT.a3, GEARGRIND_KIT.a5!, GEARGRIND_KIT.ult])
      expect(a.payload.gadget, a.id).toBe(true);
  });

  it('Rocket Fist extends, hits the first foe once, and comes back', () => {
    const a = arena({ x: 3, y: 0 });
    a.world.release('me', GEARGRIND_KIT.a1, { x: 5, y: 0 }, a.host);
    run(a, 0.1);
    expect(a.world.fistOf('me')?.extentM).toBeGreaterThan(0);
    run(a, 0.3);
    expect(a.hits.filter((h) => h.target === 'foe')).toHaveLength(1);
    run(a, 1);
    expect(a.world.fistOf('me')).toBeNull();
    expect(a.hits).toHaveLength(1); // retracting never hits again
  });

  it('Rocket Fist does not reach beyond its arm', () => {
    const a = arena({ x: 7, y: 0 });
    a.world.release('me', GEARGRIND_KIT.a1, { x: 7, y: 0 }, a.host);
    run(a, 1.2);
    expect(a.hits).toHaveLength(0);
  });

  it('Combat Drone shoots the nearest foe, lasts 10 seconds, is limited to one, and is worn down by enemy shots', () => {
    const a = arena({ x: 4, y: 0 });
    const d = GEARGRIND_KIT.a2.delivery;
    if (d.type !== 'drone') throw new Error('Combat Drone is a drone');
    a.world.release('me', GEARGRIND_KIT.a2, { x: 4, y: 0 }, a.host);
    a.world.release('me', GEARGRIND_KIT.a2, { x: 4, y: 0 }, a.host);
    expect(a.world.drones).toHaveLength(1);
    run(a, 3);
    const shots = a.hits.filter((h) => h.damage === d.shot.payload.damage);
    expect(shots.length).toBeGreaterThanOrEqual(2);
    run(a, d.durationS);
    expect(a.world.drones).toHaveLength(0);
  });

  it('an enemy shot that reaches the drone damages it, and enough of them bring it down', () => {
    const a = arena({ x: 40, y: 0 }); // out of range: it never fires
    const d = GEARGRIND_KIT.a2.delivery;
    if (d.type !== 'drone') throw new Error('drone');
    a.world.release('me', GEARGRIND_KIT.a2, { x: 3, y: 0 }, a.host);
    run(a, 1);
    const drone = a.world.drones[0]!;
    for (let i = 0; i < 6 && a.world.drones.length > 0; i++) {
      a.world.projectiles.push({
        casterId: 'foe',
        def: { ...GEARGRIND_KIT.a1, payload: { ...GEARGRIND_KIT.a1.payload, damage: 12 } },
        x: drone.x,
        y: drone.y,
        dir: { x: 1, y: 0 },
        travelledM: 0,
        trail: [],
      });
      run(a, 0.05);
    }
    expect(a.world.drones).toHaveLength(0);
    expect(drone.hp).toBeLessThanOrEqual(0);
  });

  it('Magnetic Mine tugs metal while armed, and when a foe comes close it holds them and drags them in before it bursts', () => {
    const a = arena({ x: 6, y: 0 });
    a.world.release('me', GEARGRIND_KIT.a3, { x: 3, y: 0 }, a.host);
    run(a, 1.2);
    expect(a.pulls.length).toBeGreaterThan(0);
    expect(a.holds).toHaveLength(0); // nobody near yet
    a.them.x = 3.4; // walks up to it
    run(a, 0.1);
    expect(a.holds).toEqual([0.5]);
    run(a, 0.2);
    const hit = a.hits.find((h) => h.target === 'foe');
    expect(hit?.damage).toBe(GEARGRIND_KIT.a3.payload.damage);
    expect(hit?.dirX).toBeLessThan(0); // pulled toward the mine, not away
  });

  it('Reinforced Plating is a timed armour buff that cuts damage taken', () => {
    const d = GEARGRIND_KIT.a4.delivery;
    expect(d.type === 'buff' && d.plating).toBe(true);
    expect(d.type === 'buff' && d.damageTakenFactor).toBeLessThan(0.7);
    expect(d.type === 'buff' && d.durationS).toBeGreaterThanOrEqual(6);
  });

  it('Overdrive Protocol rushes in, lands four blows and finishes with a far bigger hydraulic blast', () => {
    const a = arena({ x: 4, y: 0 });
    a.world.release('me', GEARGRIND_KIT.ult, { x: 4, y: 0 }, a.host);
    run(a, 4);
    const foe = a.hits.filter((h) => h.target === 'foe');
    expect(foe).toHaveLength(4);
    expect(foe[3]!.damage).toBeGreaterThanOrEqual(foe[0]!.damage * 2.5);
  });
});

describe('Geargrind combo and heavy', () => {
  it('a four-hit mechanical combo, a hydraulic smash heavy, each with its own clip', () => {
    const chain: string[] = [];
    let id: string | undefined = set.starters.tap;
    while (id && !chain.includes(id)) {
      chain.push(id);
      id = (set.moves.find((m) => m.id === id) as { next?: { tap?: string } } | undefined)?.next?.tap;
    }
    expect(chain).toEqual(['mechanical-jab', 'reinforced-cross', 'rotating-elbow', 'hydraulic-uppercut']);
    const states = profile.states as Record<string, string>;
    for (const m of set.moves) expect(states[m.animationState] ?? '', m.id).toMatch(/^gear\./);
    const heavy = set.moves.find((m) => m.id === set.starters.heavy)!;
    expect(heavy.id).toBe('hydraulic-smash');
    expect(heavy.startupS).toBeGreaterThanOrEqual(0.5); // the hydraulic fist compresses first
  });
});
