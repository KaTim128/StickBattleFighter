import { describe, expect, it } from 'vitest';
import type { AbilityPayload } from '../../../src/abilities/ability-def';
import { type AbilityHost, AbilityWorld } from '../../../src/abilities/ability-world';
import { INK_SPEAR_MOVESET } from '../../../src/data/abilities/ink-spear';
import { INKMASTER_KIT } from '../../../src/data/abilities/inkmaster';

/** Inkmaster's ink deliveries against a fake host: the rules that keep them fair, without the scene. */
function arena(foes: { x: number; y: number }[]) {
  const me = { id: 'me', x: 0, y: 0, radiusM: 0.3, hittable: true, team: 'a' };
  const them = foes.map((f, i) => ({ id: `foe${i}`, ...f, radiusM: 0.3, hittable: true, team: 'b' }));
  const hits: { target: string; damage: number }[] = [];
  const nudges: { id: string; speed: number }[] = [];
  const binds: { id: string; s: number }[] = [];
  const state = { dodge: false };
  const summons: string[] = [];
  const host: AbilityHost = {
    fighters: () => [me, ...them],
    hitFighter: (_c, target, payload: AbilityPayload) => {
      if (state.dodge) return false; // a dodged blow lands nothing
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
    bind: (id, s) => binds.push({ id, s }),
    summon: (_c, spec) => summons.push(spec.character),
  };
  return { me, them, hits, nudges, binds, state, summons, host, world: new AbilityWorld() };
}
const run = (a: ReturnType<typeof arena>, seconds: number) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) a.world.update(1 / 60, a.host);
};

describe('Ink Serpent', () => {
  it('does nothing while it is drawn, then bites once and binds the target for exactly 4 seconds', () => {
    const a = arena([{ x: 4, y: 0 }]);
    a.world.release('me', INKMASTER_KIT.a2, { x: 4, y: 0 }, a.host);
    run(a, 0.6);
    expect(a.hits).toHaveLength(0);
    run(a, 3);
    expect(a.hits).toHaveLength(1);
    expect(a.binds[0]).toEqual({ id: 'foe0', s: 4 }); // bound for 4 seconds
    expect(INKMASTER_KIT.a2.delivery).toMatchObject({ restrainS: 4 });
  });
  it('lets go on its own after the hold: the binding is lifted and the serpent scatters', () => {
    const a = arena([{ x: 4, y: 0 }]);
    a.world.release('me', INKMASTER_KIT.a2, { x: 4, y: 0 }, a.host);
    run(a, 3.6);
    expect(a.world.ink.serpents[0]?.phase).toBe('wrap');
    run(a, 4.2);
    expect(a.binds.at(-1)).toEqual({ id: 'foe0', s: 0 }); // released
    run(a, 1);
    expect(a.world.ink.serpents).toHaveLength(0);
  });
  it('a dodged bite binds nobody, and a target is never re-bound while it is still held or just freed', () => {
    const dodged = arena([{ x: 4, y: 0 }]);
    dodged.state.dodge = true;
    dodged.world.release('me', INKMASTER_KIT.a2, { x: 4, y: 0 }, dodged.host);
    run(dodged, 4);
    expect(dodged.binds).toEqual([]);
    // Two serpents in a row on the same target: only the first binds it.
    const a = arena([{ x: 4, y: 0 }]);
    a.world.release('me', INKMASTER_KIT.a2, { x: 4, y: 0 }, a.host);
    run(a, 3.6);
    a.world.release('me', INKMASTER_KIT.a2, { x: 4, y: 0 }, a.host);
    run(a, 9);
    expect(a.binds.filter((b) => b.s > 0)).toHaveLength(1);
  });
  it('turns slowly: a target far off to the side is not caught at once', () => {
    const a = arena([{ x: 0, y: 6 }]);
    a.world.release('me', INKMASTER_KIT.a2, { x: 6, y: 0 }, a.host);
    run(a, 1);
    expect(a.hits).toHaveLength(0);
  });
});

describe('Ink Bull', () => {
  const phasesOf = (a: ReturnType<typeof arena>, seconds: number, each?: () => void): string[] => {
    const phases: string[] = [];
    for (let i = 0; i < seconds * 60; i++) {
      a.world.update(1 / 60, a.host);
      each?.();
      const b = a.world.ink.bulls[0];
      if (!b) break;
      if (phases[phases.length - 1] !== b.phase) phases.push(b.phase);
    }
    return phases;
  };
  it("a ram that lands covers the target's view in ink for exactly 1.5 seconds", () => {
    expect(INKMASTER_KIT.a3.payload.inkSplatS).toBe(1.5);
  });
  it('rises from the ink, paws the ground, then charges once and rams the opponent, then scatters', () => {
    const a = arena([{ x: 8, y: 0 }]);
    a.world.release('me', INKMASTER_KIT.a3, { x: 8, y: 0 }, a.host);
    const phases = phasesOf(a, 14);
    expect(phases.slice(0, 4)).toEqual(['form', 'paw', 'charge', 'ram']);
    expect(phases.filter((p) => p === 'charge')).toHaveLength(1);
    expect(a.hits).toHaveLength(1);
    expect(a.world.ink.bulls).toHaveLength(0);
  });
  it('does nothing harmful while it forms and paws (the opponent has the whole warning to move)', () => {
    const a = arena([{ x: 8, y: 0 }]);
    a.world.release('me', INKMASTER_KIT.a3, { x: 8, y: 0 }, a.host);
    const spec = INKMASTER_KIT.a3.delivery as { formS: number; pawS: number };
    run(a, spec.formS + spec.pawS - 0.05);
    expect(a.hits).toHaveLength(0);
    expect(a.world.ink.bulls[0]?.phase).toBe('paw');
  });
  it('curves toward an opponent who moves sideways, but never turns faster than its limit', () => {
    const a = arena([{ x: 12, y: 0 }]);
    a.world.release('me', INKMASTER_KIT.a3, { x: 12, y: 0 }, a.host);
    let maxTurn = 0;
    let last: number | null = null;
    let sideways = false;
    const spec = INKMASTER_KIT.a3.delivery as { turnRadPerS: number };
    phasesOf(a, 8, () => {
      const b = a.world.ink.bulls[0];
      if (!b || b.phase !== 'charge') return;
      if (!sideways && b.phaseS > 0.4) {
        sideways = true;
        a.them[0]!.y = 5; // the opponent runs off to the side
      }
      if (last !== null) {
        const d = Math.atan2(Math.sin(b.heading - last), Math.cos(b.heading - last));
        maxTurn = Math.max(maxTurn, Math.abs(d) * 60);
      }
      last = b.heading;
    });
    expect(maxTurn).toBeGreaterThan(0.3); // it does follow
    expect(maxTurn).toBeLessThanOrEqual(spec.turnRadPerS * 1.15 + 1e-6); // but only so fast
  });
  it('can be sidestepped: an opponent who leaves its line at the last moment is missed, and it runs on, slows and scatters', () => {
    const a = arena([{ x: 12, y: 0 }]);
    a.world.release('me', INKMASTER_KIT.a3, { x: 12, y: 0 }, a.host);
    let stepped = false;
    const phases = phasesOf(a, 14, () => {
      const b = a.world.ink.bulls[0];
      if (!b || b.phase !== 'charge') return;
      if (!stepped && Math.hypot(a.them[0]!.x - b.x, a.them[0]!.y - b.y) < 3.2) {
        stepped = true;
        a.them[0]!.y += 3; // a hard sidestep once it has committed
      }
    });
    expect(a.hits).toHaveLength(0);
    expect(phases).toContain('slow');
    expect(phases).not.toContain('ram');
    expect(a.world.ink.bulls).toHaveLength(0);
  });
  it('a dodged hit lands nothing: it thunders past instead of ramming', () => {
    const a = arena([{ x: 8, y: 0 }]);
    a.state.dodge = true;
    a.world.release('me', INKMASTER_KIT.a3, { x: 8, y: 0 }, a.host);
    const phases = phasesOf(a, 14);
    expect(a.hits).toHaveLength(0);
    expect(phases).not.toContain('ram');
  });
  it('rams with heavy knockback, and never more than one opponent per charge', () => {
    const a = arena([
      { x: 8, y: 0 },
      { x: 8.4, y: 0.2 },
    ]);
    a.world.release('me', INKMASTER_KIT.a3, { x: 8, y: 0 }, a.host);
    phasesOf(a, 14);
    expect(a.hits).toHaveLength(1);
    expect(INKMASTER_KIT.a3.payload.heavy).toBe(true);
    expect(INKMASTER_KIT.a3.payload.knockbackMps).toBeGreaterThanOrEqual(9);
  });
  it('splashes against a wall instead of passing through it', () => {
    const a = arena([{ x: 12, y: 0 }]);
    a.host.blocked = (from, to) => (to.x > 9 ? 0.5 : null);
    a.world.release('me', INKMASTER_KIT.a3, { x: 12, y: 0 }, a.host);
    phasesOf(a, 8);
    for (const b of a.world.ink.bulls) expect(b.x).toBeLessThan(9.2);
    expect(a.hits).toHaveLength(0);
  });
  it('a new bull replaces the old one (one at a time) and it never leaves the map', () => {
    const a = arena([{ x: 11.2, y: 0.5 }]);
    a.host.bounds = () => ({ w: 12, h: 8 });
    a.me.x = 6;
    a.me.y = 4;
    a.world.release('me', INKMASTER_KIT.a3, { x: 11, y: 1 }, a.host);
    a.world.release('me', INKMASTER_KIT.a3, { x: 11, y: 1 }, a.host);
    expect(a.world.ink.bulls).toHaveLength(1);
    for (let i = 0; i < 14 * 60; i++) {
      a.world.update(1 / 60, a.host);
      const b = a.world.ink.bulls[0];
      if (!b) break;
      expect(b.x).toBeGreaterThanOrEqual(0.99);
      expect(b.x).toBeLessThanOrEqual(12 - 0.99);
      expect(b.y).toBeGreaterThanOrEqual(0.99);
      expect(b.y).toBeLessThanOrEqual(8 - 0.99);
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

describe('Ink Spear', () => {
  it('is an 8 second transformation that swaps in long, narrow, contact-only thrusts', () => {
    const d = INKMASTER_KIT.a5!.delivery;
    expect(d).toMatchObject({ type: 'arsenal', weapon: 'spear', durationS: 8 });
    const set = INK_SPEAR_MOVESET;
    expect(Object.keys(set.moves).sort()).toEqual(['spear-impale', 'spear-lunge', 'spear-thrust', 'spear-thrust-2']);
    for (const m of Object.values(set.moves)) {
      expect(m.contact).toBe(true);
      expect(m.reachM).toBeGreaterThanOrEqual(2.3); // well past a fist's reach
      expect(m.hitRadiusM).toBeLessThanOrEqual(0.4); // narrow: it must be aimed
    }
    // Poking damage is high but bounded, and the heavy is the hardest hit.
    const dmg = Object.values(set.moves).map((m) => m.damage);
    expect(Math.max(...dmg)).toBeLessThanOrEqual(70);
    expect(set.moves['spear-impale']!.damage).toBe(Math.max(...dmg));
    expect(INKMASTER_KIT.a5!.cooldownS).toBeGreaterThanOrEqual(14);
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
