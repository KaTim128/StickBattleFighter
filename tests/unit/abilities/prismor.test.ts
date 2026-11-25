import { describe, expect, it } from 'vitest';
import { type AbilityHost, type AbilityTarget, AbilityWorld } from '../../../src/abilities/ability-world';
import { BUILT_IN_LIBRARY } from '../../../src/characters/library';
import { resolveCharacter } from '../../../src/characters/resolve';
import { type AttackDef, blowBox, blowTouches, hitCapsule } from '../../../src/combat/attacks';
import { MoveController } from '../../../src/combat/moves';
import { PRISMOR_KIT } from '../../../src/data/abilities/prismor';
import { SHARD_BLADE_MOVESET } from '../../../src/data/abilities/shard-blade';
import prismorMoveset from '../../../src/data/characters/prismor/moveset.json';

/** Owner, 22/11/2026: Crystal Arsenal, Slide, Shard Volley, Crystal Prison, Crystal Groundstrike and the unarmed taps. */

/** A scripted arena: Prismor ("me") at the origin and one enemy, with every host call recorded. */
function arena(opts: { foe?: Partial<AbilityTarget> & { heightM?: number; flies?: boolean } } = {}) {
  const log = {
    armed: [] as number[],
    hits: [] as { target: string; damage: number }[],
    trapped: [] as number[],
    fx: [] as string[],
    me: { x: 0, y: 0 },
    foeHeight: opts.foe?.heightM ?? 0,
    trapLeft: 0,
  };
  const foe = { id: 'foe', x: 3, y: 0, radiusM: 0.3, hittable: true, ...opts.foe };
  const host: AbilityHost = {
    fighters: () => [{ id: 'me', x: log.me.x, y: log.me.y, radiusM: 0.3, hittable: true }, foe],
    hitFighter: (_c, t, payload) => {
      log.hits.push({ target: t, damage: payload.damage });
      return true;
    },
    hitEnvironment: () => {},
    blocked: () => null,
    position: () => log.me,
    drive: (_id, v) => {
      if (v) {
        log.me.x += v.x / 60;
        log.me.y += v.y / 60;
      }
    },
    burnFighter: () => {},
    buff: () => {},
    emit: (fx) => log.fx.push(fx.vfx),
    arm: (_id, durationS) => log.armed.push(durationS),
    trap: (_id, seconds) => {
      log.trapped.push(seconds);
      log.trapLeft = seconds;
    },
    legTrapState: () => ({ heightM: log.foeHeight, trappedS: log.trapLeft }),
    standable: (p) => p.x > 0.5 && p.x < 12 && p.y > 0.5 && p.y < 12,
  };
  return { host, log, foe };
}
const run = (w: AbilityWorld, h: AbilityHost, s: number, onStep?: () => void) => {
  for (let i = 0; i < Math.round(s * 60); i++) {
    w.update(1 / 60, h);
    onStep?.();
  }
};

describe('Shard Blade', () => {
  it('has the five abilities and the ultimate, none of them an unarmed tap', () => {
    const ids = [PRISMOR_KIT.a1, PRISMOR_KIT.a2, PRISMOR_KIT.a3, PRISMOR_KIT.a4, PRISMOR_KIT.a5!].map((a) => a.id);
    expect(ids).toEqual(['shardBlade', 'crystalSlide', 'shardVolley', 'crystalPrison', 'crystalGroundstrike']);
    expect(PRISMOR_KIT.ult.id).toBe('crystalSovereign');
  });

  it('casting it grows the crystal swords for 10 seconds', () => {
    const { host, log } = arena();
    const w = new AbilityWorld();
    w.release('me', PRISMOR_KIT.a1, { x: 3, y: 0 }, host);
    expect(log.armed).toEqual([10]);
    const d = PRISMOR_KIT.a1.delivery;
    expect(d.type === 'arsenal' && d.durationS).toBe(10);
  });

  it('the swords bring a tap chain ending in a heavy blow and a heavy hammer slam, each hitting hard', () => {
    const m = SHARD_BLADE_MOVESET.moves;
    let id: string | undefined = SHARD_BLADE_MOVESET.starters.tap;
    const chain: string[] = [];
    while (id) {
      chain.push(id);
      id = m[id]?.next.tap;
    }
    // PR2: five taps, the fifth being the crystal piercing punch; the heavy is the crystal hammer.
    expect(chain).toEqual(['shard-slash-r', 'shard-slash-l', 'shard-cross', 'shard-thrust', 'shard-finale']);
    expect(SHARD_BLADE_MOVESET.starters.heavy).toBe('shard-hammer');
    const heavy = m[SHARD_BLADE_MOVESET.starters.heavy!]!;
    expect(heavy.heavy).toBe(true);
    for (const id of chain) expect(m[id]!.damage).toBeGreaterThanOrEqual(20);
    expect(heavy.damage).toBeGreaterThan(m[chain[0]!]!.damage * 2);
  });

  it('sword moves only hit on contact with a body', () => {
    for (const mv of Object.values(SHARD_BLADE_MOVESET.moves)) expect(mv.contact, mv.id).toBe(true);
  });

  it('a held sword moveset replaces his unarmed taps, and ending it brings the punches straight back', () => {
    const own = resolveCharacter('prismor', BUILT_IN_LIBRARY) as unknown as {
      moves: Record<string, never>;
      starters: Record<string, string>;
    };
    const c = new MoveController(own.moves, own.starters);
    const ctx = { airborne: false, falling: false, forward: false };
    c.press(ctx);
    expect(c.attack?.id).toBe('lead-punch');
    c.useMoveset(SHARD_BLADE_MOVESET.moves, SHARD_BLADE_MOVESET.starters);
    expect(c.attack).toBeNull();
    c.press(ctx);
    expect(c.attack?.id).toBe('shard-slash-r');
    c.resetMoveset();
    c.press(ctx);
    expect(c.attack?.id).toBe('lead-punch');
  });
});

describe('unarmed taps are standard combat controls, never an ability', () => {
  const unarmed = prismorMoveset as {
    starters: Record<string, string>;
    moves: { id: string; damage: number; displayName: string }[];
  };

  it('the moveset is plain punches, with no oversized-arm move and no slot, cost or cooldown', () => {
    const names = unarmed.moves.map((m) => m.displayName.toLowerCase()).join(' ');
    expect(names).not.toMatch(/oversized|crystal|geode|facet/);
    expect(unarmed.starters.tap).toBe('lead-punch');
    for (const a of [PRISMOR_KIT.a1, PRISMOR_KIT.a2, PRISMOR_KIT.a3, PRISMOR_KIT.a4, PRISMOR_KIT.a5!])
      expect(unarmed.moves.some((m) => m.id === a.id)).toBe(false);
  });

  it('his buffed taps are on par with the roster: no lighter than the lightest of the others', () => {
    const taps = ['lead-punch', 'rear-cross', 'swinging-hook'].map(
      (id) => unarmed.moves.find((m) => m.id === id)!.damage,
    );
    const others = ['chronos', 'psion', 'reson', 'geargrind'].map((id) => {
      const d = resolveCharacter(id, BUILT_IN_LIBRARY) as unknown as {
        moves: Record<string, { damage: number }>;
        starters: { tap: string };
      };
      return d.moves[d.starters.tap]!.damage;
    });
    expect(Math.min(...taps)).toBeGreaterThanOrEqual(Math.min(...others));
  });

  it('every unarmed tap and heavy counts only on contact with the body', () => {
    for (const m of unarmed.moves.filter((x) =>
      ['lead-punch', 'rear-cross', 'swinging-hook', 'heavy-overhand'].includes(x.id),
    ))
      expect((m as { contact?: boolean }).contact, m.id).toBe(true);
  });
});

describe('contact moves touch the body, not the air beside it', () => {
  // A fist reaching 1.3 m from the caster's centre (Prismor's lead punch), with a 0.5 m half-width.
  const fist = prismorLeadPunch();
  const capsule = hitCapsule({ x: 0, y: 0 }, { x: 1, y: 0 }, fist);
  const foot = 0.3;

  it('hits a body the fist reaches', () => {
    expect(blowTouches(capsule, fist, 1.3, 0, foot)).toBe(true);
    expect(blowTouches(capsule, fist, 1.5, 0.1, foot)).toBe(true);
  });

  it('does not hit a body standing beyond the fist (the old swept area reached about 2 m)', () => {
    expect(blowTouches(capsule, fist, 2.0, 0, foot)).toBe(false);
    expect(blowTouches(capsule, fist, 1.9, 0.6, foot)).toBe(false);
  });

  it('does not touch walls, doors or furniture beyond the fist either', () => {
    const box = blowBox(capsule, fist);
    expect(box.ax).toBeCloseTo(1.3);
    expect(box.radius).toBeLessThan(fist.hitRadiusM);
  });
});

describe('Crystal Slide', () => {
  it('slides along the ground, hits what it touches, and thorns erupt where it stops and hurt anyone caught there', () => {
    const { host, log } = arena({ foe: { x: 9, y: 0 } });
    const w = new AbilityWorld();
    const slide = PRISMOR_KIT.a2;
    w.release('me', slide, { x: 9, y: 0 }, host);
    // The thorns come up right as the slide stops: the moment the slide ends, they are already warning (a short beat, then they erupt).
    let thorn: (typeof w.telegraphs)[number] | undefined;
    for (let i = 0; i < 120 && !thorn; i++) {
      w.update(1 / 60, host);
      thorn = w.telegraphs[0];
    }
    expect(thorn).toBeDefined();
    expect(log.me.x).toBeGreaterThan(6); // it covered the ground
    expect(w.slideTrail.length).toBeGreaterThan(3); // and left a trail
    expect(Math.hypot(thorn!.x - log.me.x, thorn!.y - log.me.y)).toBeLessThan(0.5);
    expect(thorn!.durationS).toBeLessThanOrEqual(0.15);
    log.hits.length = 0;
    // The foe stands at the stopping point: the thorns are a real blast with their own damage.
    run(w, host, 0.6);
    expect(w.telegraphs).toHaveLength(0);
    const d = slide.delivery;
    expect(d.type === 'dash' && d.slide?.thorns.payload.damage).toBeGreaterThan(0);
    expect(log.fx).toContain('crystal-thorns');
  });
});

describe('Crystal Groundstrike', () => {
  it('marks exactly four separate zones inside the arena, apart from each other, and each erupts as its own blast', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { host, log } = arena({ foe: { x: 4, y: 3 } });
      const w = new AbilityWorld(mulberry(seed));
      w.release('me', PRISMOR_KIT.a5!, { x: 4, y: 3 }, host);
      expect(w.telegraphs, `seed ${seed}`).toHaveLength(4);
      for (const t of w.telegraphs) {
        expect(host.standable?.({ x: t.x, y: t.y }), `seed ${seed} inside the arena`).toBe(true);
        expect(Math.hypot(t.x - 4, t.y - 3), `seed ${seed} near the opponent`).toBeLessThanOrEqual(5);
        expect(Math.hypot(t.x, t.y), `seed ${seed} within his attack range`).toBeLessThanOrEqual(7.6);
      }
      const centres = w.telegraphs.map((t) => `${t.x.toFixed(2)},${t.y.toFixed(2)}`);
      expect(new Set(centres).size).toBe(4);
      log.fx.length = 0;
      run(w, host, 1.6);
      expect(log.fx.filter((v) => v === 'crystal-groundstrike').length).toBe(4); // four impacts, never one big one
      expect(w.telegraphs).toHaveLength(0);
    }
  });
});

describe('Crystal Prison', () => {
  const cast = (w: AbilityWorld, h: AbilityHost) => w.release('me', PRISMOR_KIT.a4, { x: 3, y: 0 }, h);
  const react = (PRISMOR_KIT.a4.delivery.type === 'legTrap' && PRISMOR_KIT.a4.delivery.reactS) || 0;

  it('traps a grounded opponent for exactly 6 seconds, and the legs free themselves then', () => {
    const { host, log } = arena();
    const w = new AbilityWorld();
    cast(w, host);
    run(w, host, react + 0.1);
    expect(log.trapped).toEqual([6]);
    expect(w.prisons[0]?.phase).toBe('held');
    // The host counts the time down; while it holds nothing releases it, and when it ends the crystals shatter.
    run(w, host, 3, () => (log.trapLeft = Math.max(0, log.trapLeft - 1 / 60)));
    expect(w.prisons).toHaveLength(1);
    run(w, host, 3.1, () => (log.trapLeft = Math.max(0, log.trapLeft - 1 / 60)));
    expect(w.prisons).toHaveLength(0);
    expect(log.fx).toContain('prison-shatter');
  });

  it('lets a grounded opponent jump clear before the crystals lock', () => {
    const { host, log } = arena();
    const w = new AbilityWorld();
    cast(w, host);
    run(w, host, 0.2);
    log.foeHeight = 0.6; // it jumps
    run(w, host, 0.1);
    log.foeHeight = 0;
    run(w, host, react + 0.3);
    expect(log.trapped).toEqual([]); // never trapped
    expect(w.prisons).toHaveLength(0);
  });

  it('catches a hovering opponent (cosmetic hover is grounded, D3) but misses one launched into the air at activation', () => {
    const hover = arena({ foe: { heightM: 0 } });
    const w1 = new AbilityWorld();
    cast(w1, hover.host);
    run(w1, hover.host, react + 0.1);
    expect(hover.log.trapped).toEqual([6]);
    const launched = arena({ foe: { heightM: 1.4 } });
    const w2 = new AbilityWorld();
    cast(w2, launched.host);
    run(w2, launched.host, react + 0.1);
    expect(launched.log.trapped).toEqual([]); // really off the floor when the crystals lock: missed
  });

  it('cannot be broken by hits: nothing the world does shortens the hold', () => {
    const { host, log } = arena();
    const w = new AbilityWorld();
    cast(w, host);
    run(w, host, react + 0.1);
    for (let i = 0; i < 20; i++)
      host.hitFighter('me', 'foe', { damage: 50, knockbackMps: 5, heavy: true, strength: 900 }, { x: 1, y: 0 });
    run(w, host, 1);
    expect(log.trapped).toEqual([6]); // still the one hold, never released early
    expect(log.trapLeft).toBe(6);
  });
});

describe('Shard Volley', () => {
  it('fires a rapid fan of small shards', () => {
    const { host } = arena();
    const w = new AbilityWorld(mulberry(3));
    w.release('me', PRISMOR_KIT.a3, { x: 5, y: 0 }, host);
    expect(w.projectiles).toHaveLength(11);
    const angles = new Set(w.projectiles.map((p) => Math.round(Math.atan2(p.dir.y, p.dir.x) * 100)));
    expect(angles.size).toBeGreaterThan(5); // spread across the cone
    expect(PRISMOR_KIT.a3.payload.damage).toBeLessThanOrEqual(20); // each one is still small
  });
});

/** Prismor's own lead punch as an attack (a contact move), for the hit-rule tests. */
function prismorLeadPunch(): AttackDef {
  return (resolveCharacter('prismor', BUILT_IN_LIBRARY) as unknown as { moves: Record<string, AttackDef> }).moves[
    'lead-punch'
  ]!;
}

/** A small deterministic random source. */
function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
