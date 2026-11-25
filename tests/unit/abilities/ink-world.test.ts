import { describe, expect, it } from 'vitest';
import type { AbilityPayload } from '../../../src/abilities/ability-def';
import { type AbilityHost, AbilityWorld } from '../../../src/abilities/ability-world';
import { INKMASTER_KIT } from '../../../src/data/abilities/inkmaster';

/** Inkmaster's ink deliveries against a fake host: the rules that keep them fair, without the scene. */
function arena(foes: { x: number; y: number }[]) {
  const me = { id: 'me', x: 0, y: 0, radiusM: 0.3, hittable: true, team: 'a' };
  const them = foes.map((f, i) => ({ id: `foe${i}`, ...f, radiusM: 0.3, hittable: true, team: 'b' }));
  const hits: { target: string; damage: number }[] = [];
  const nudges: { id: string; speed: number }[] = [];
  const traps: { id: string; s: number }[] = [];
  const summons: string[] = [];
  const host: AbilityHost = {
    fighters: () => [me, ...them],
    hitFighter: (_c, target, payload: AbilityPayload) => {
      hits.push({ target, damage: payload.damage });
      return true;
    },
    hitEnvironment: () => {},
    blocked: () => null,
    position: () => ({ x: me.x, y: me.y }),
    drive: () => {},
    burnFighter: () => {},
    buff: () => {},
    emit: () => {},
    nudge: (id, v) => nudges.push({ id, speed: Math.hypot(v.x, v.y) }),
    trap: (id, s) => traps.push({ id, s }),
    summon: (_c, spec) => summons.push(spec.character),
  };
  return { me, them, hits, nudges, traps, summons, host, world: new AbilityWorld() };
}
const run = (a: ReturnType<typeof arena>, seconds: number) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) a.world.update(1 / 60, a.host);
};

describe('Ink Serpent', () => {
  it('does nothing while it is drawn, then bites once and holds the legs for the short restrain time only', () => {
    const a = arena([{ x: 4, y: 0 }]);
    a.world.release('me', INKMASTER_KIT.a2, { x: 4, y: 0 }, a.host);
    run(a, 0.6);
    expect(a.hits).toHaveLength(0);
    run(a, 3);
    expect(a.hits).toHaveLength(1);
    expect(a.traps).toEqual([{ id: 'foe0', s: 5 }]); // held for 5 seconds
    expect(INKMASTER_KIT.a2.delivery).toMatchObject({ restrainS: 5 });
  });
  it('turns slowly: a target far off to the side is not caught at once', () => {
    const a = arena([{ x: 0, y: 6 }]);
    a.world.release('me', INKMASTER_KIT.a2, { x: 6, y: 0 }, a.host);
    run(a, 1);
    expect(a.hits).toHaveLength(0);
  });
});

describe('Ink Dragon', () => {
  it('flies round, warns, lunges once at the opponent, bites them with the slow and ink splash, then vanishes', () => {
    const a = arena([{ x: 5, y: 0 }]);
    a.world.release('me', INKMASTER_KIT.a3, { x: 5, y: 0 }, a.host);
    const phases: string[] = [];
    for (let i = 0; i < 14 * 60; i++) {
      a.world.update(1 / 60, a.host);
      const d = a.world.ink.dragons[0];
      if (!d) break;
      if (phases[phases.length - 1] !== d.phase) phases.push(d.phase);
    }
    expect(phases.indexOf('rear')).toBeGreaterThan(-1); // the warning
    expect(phases.indexOf('lunge')).toBeGreaterThan(phases.indexOf('rear'));
    expect(phases.filter((p) => p === 'lunge')).toHaveLength(1); // it charges once
    run(a, 2);
    expect(a.world.ink.dragons).toHaveLength(0);
  });
  it('a bite deals the payload once, with a 1.5 s slow and ink splash, and bursts the dragon', () => {
    const a = arena([{ x: 5, y: 0 }]);
    a.world.release('me', INKMASTER_KIT.a3, { x: 5, y: 0 }, a.host);
    const p = INKMASTER_KIT.a3.payload;
    expect(p.inkSplatS).toBe(1.5);
    expect(p.slow).toEqual({ durationS: 1.5, speedFactor: 0.6 });
    let burst = false;
    for (let i = 0; i < 14 * 60; i++) {
      a.world.update(1 / 60, a.host);
      const d = a.world.ink.dragons[0];
      if (!d) break;
      if (d.phase === 'burst') burst = true;
    }
    expect(burst).toBe(true);
    expect(a.hits).toHaveLength(1);
  });
  it('a lunge that finds nobody in the lane hits nobody and dissolves', () => {
    const a = arena([{ x: 5, y: 0 }]);
    a.world.release('me', INKMASTER_KIT.a3, { x: 5, y: 0 }, a.host);
    let rearing = false;
    for (let i = 0; i < 14 * 60; i++) {
      a.world.update(1 / 60, a.host);
      const d = a.world.ink.dragons[0];
      if (!d) break;
      if (d.phase === 'rear' && !rearing) {
        rearing = true;
        a.them[0]!.y = 6; // steps out of the locked lane during the warning
      }
    }
    expect(a.hits).toHaveLength(0);
  });
  it('its head always faces the opponent while its trail follows the path it flew', () => {
    const a = arena([{ x: 5, y: 0 }]);
    a.world.release('me', INKMASTER_KIT.a3, { x: 5, y: 0 }, a.host);
    run(a, 1.2);
    let trailMoved = false;
    for (let i = 0; i < 3 * 60; i++) {
      a.world.update(1 / 60, a.host);
      const d = a.world.ink.dragons[0]!;
      if (d.phase !== 'fly') continue;
      const want = Math.atan2(a.them[0]!.y - d.y, a.them[0]!.x - d.x);
      expect(Math.abs(Math.atan2(Math.sin(d.heading - want), Math.cos(d.heading - want)))).toBeLessThan(0.05);
      if (d.trail.length > 5) trailMoved = true;
    }
    expect(trailMoved).toBe(true);
  });
  it('a new dragon replaces the old one (one at a time)', () => {
    const a = arena([{ x: 5, y: 0 }]);
    a.world.release('me', INKMASTER_KIT.a3, { x: 5, y: 0 }, a.host);
    a.world.release('me', INKMASTER_KIT.a3, { x: 5, y: 0 }, a.host);
    expect(a.world.ink.dragons).toHaveLength(1);
  });
});

describe('Ink Dragon stays on the map', () => {
  it('never flies outside the arena, even when its opponent stands by a wall', () => {
    const a = arena([{ x: 11.2, y: 0.5 }]);
    a.host.bounds = () => ({ w: 12, h: 8 });
    a.me.x = 6;
    a.me.y = 4;
    a.world.release('me', INKMASTER_KIT.a3, { x: 11, y: 1 }, a.host);
    for (let i = 0; i < 14 * 60; i++) {
      a.world.update(1 / 60, a.host);
      const d = a.world.ink.dragons[0];
      if (!d) break;
      if (d.phase === 'form') continue;
      expect(d.x).toBeGreaterThanOrEqual(1.19);
      expect(d.x).toBeLessThanOrEqual(12 - 1.19);
      expect(d.y).toBeGreaterThanOrEqual(1.19);
      expect(d.y).toBeLessThanOrEqual(8 - 1.19);
    }
  });
});

describe('Ink Clone drawing', () => {
  it('draws the stick figure first, then the clone rises; nothing rises if he falls while drawing', () => {
    const a = arena([{ x: 5, y: 0 }]);
    a.world.release('me', INKMASTER_KIT.a4, { x: 5, y: 0 }, a.host);
    expect(a.world.ink.figures).toHaveLength(1);
    run(a, 0.3);
    expect(a.summons).toEqual([]);
    run(a, 0.4);
    expect(a.summons).toHaveLength(1);
    expect(a.world.ink.figures).toHaveLength(0);
    const b = arena([{ x: 5, y: 0 }]);
    b.world.release('me', INKMASTER_KIT.a4, { x: 5, y: 0 }, b.host);
    b.me.hittable = false;
    run(b, 1);
    expect(b.summons).toEqual([]);
  });
});

describe('Ink Slash', () => {
  it('is a close melee cut (not a projectile) that may blind', () => {
    const d = INKMASTER_KIT.a1.delivery;
    expect(d.type).toBe('strike');
    expect(INKMASTER_KIT.a1.payload.blindS).toBe(3);
    expect(INKMASTER_KIT.a1.payload.slow).toEqual({ durationS: 3, speedFactor: 0.6 });
    const near = arena([{ x: 1.6, y: 0 }]);
    near.world.release('me', INKMASTER_KIT.a1, { x: 1.6, y: 0 }, near.host);
    expect(near.hits).toHaveLength(1);
    expect(near.world.ink.slashes).toHaveLength(1);
    const far = arena([{ x: 5, y: 0 }]);
    far.world.release('me', INKMASTER_KIT.a1, { x: 5, y: 0 }, far.host);
    expect(far.hits).toHaveLength(0); // out of reach
  });
});

describe('Ink Cyclone', () => {
  it('pulls gently (slower than walking), hurts on a tick and collapses once', () => {
    const a = arena([{ x: 4.5, y: 0 }]);
    a.world.release('me', INKMASTER_KIT.a5!, { x: 3, y: 0 }, a.host);
    run(a, 1.2);
    expect(a.nudges.length).toBeGreaterThan(0);
    for (const n of a.nudges) expect(n.speed).toBeLessThan(4.6);
    const ticks = a.hits.length;
    expect(ticks).toBeGreaterThanOrEqual(2);
    run(a, 3);
    expect(a.world.ink.vortices).toHaveLength(0);
    const collapse = a.hits.filter((h) => h.damage === 50);
    expect(collapse).toHaveLength(1);
  });
  it('anyone outside its radius is untouched', () => {
    const a = arena([{ x: 12, y: 0 }]);
    a.world.release('me', INKMASTER_KIT.a5!, { x: 5, y: 0 }, a.host);
    run(a, 5);
    expect(a.hits).toHaveLength(0);
    expect(a.nudges).toHaveLength(0);
  });
});

describe('The Masterpiece', () => {
  it('summons the monster only after the drawing is finished, once', () => {
    const a = arena([{ x: 6, y: 0 }]);
    a.world.release('me', INKMASTER_KIT.ult, { x: 6, y: 0 }, a.host);
    run(a, 2.9);
    expect(a.summons).toEqual([]);
    run(a, 0.3);
    expect(a.summons).toEqual(['ink-monster']);
    run(a, 3);
    expect(a.summons).toEqual(['ink-monster']);
  });
  it('is ruined if the caster falls while drawing', () => {
    const a = arena([{ x: 6, y: 0 }]);
    a.world.release('me', INKMASTER_KIT.ult, { x: 6, y: 0 }, a.host);
    run(a, 1);
    a.me.hittable = false;
    run(a, 3);
    expect(a.summons).toEqual([]);
    expect(a.world.ink.masterpieces).toHaveLength(0);
  });
});
