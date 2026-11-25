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
    expect(a.traps).toEqual([{ id: 'foe0', s: 1.1 }]);
    expect(a.traps[0]!.s).toBeLessThanOrEqual(1.5);
  });
  it('turns slowly: a target far off to the side is not caught at once', () => {
    const a = arena([{ x: 0, y: 6 }]);
    a.world.release('me', INKMASTER_KIT.a2, { x: 6, y: 0 }, a.host);
    run(a, 1);
    expect(a.hits).toHaveLength(0);
  });
});

describe('Ink Dragon', () => {
  it('breathes at most once per warning, hits each fighter once per breath, and leaves when its time is up', () => {
    const a = arena([{ x: 5, y: 0 }]);
    a.world.release('me', INKMASTER_KIT.a3, { x: 5, y: 0 }, a.host);
    run(a, 4.2);
    expect(a.hits.length).toBeLessThanOrEqual(1);
    run(a, 14);
    expect(a.world.ink.dragons).toHaveLength(0);
    expect(a.hits.length).toBeLessThanOrEqual(4);
  });
  it('a new dragon replaces the old one (one at a time)', () => {
    const a = arena([{ x: 5, y: 0 }]);
    a.world.release('me', INKMASTER_KIT.a3, { x: 5, y: 0 }, a.host);
    a.world.release('me', INKMASTER_KIT.a3, { x: 5, y: 0 }, a.host);
    expect(a.world.ink.dragons).toHaveLength(1);
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
