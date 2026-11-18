import { describe, expect, it } from 'vitest';
import { HOUSE_PLAN } from '../../../src/data/arenas/house';
import { HideSeekGame, NO_INPUT, type PlayerInput } from '../../../src/modes/hide-seek/game';
import { exitPoint } from '../../../src/modes/hide-seek/hiding';
import { Hunter, seeded } from '../../../src/modes/hide-seek/hunter';
import { ACTION_DURATION_S } from '../../../src/modes/hide-seek/hunter-actions';
import { heardStrength, sightRate, visionPolygon } from '../../../src/modes/hide-seek/perception';

const DT = 1 / 30;

function run(g: HideSeekGame, seconds: number, input: PlayerInput = NO_INPUT, until?: () => boolean): void {
  for (let t = 0; t < seconds && !(until?.() ?? false); t += DT) g.step(DT, input);
}

/** A game already in the hunt with the player standing at a spot. */
function hunting(at: { floor: 0 | 1; x: number; y: number }): HideSeekGame {
  const g = new HideSeekGame(HOUSE_PLAN);
  Object.assign(g.player, { floor: at.floor, x: at.x, y: at.y });
  run(g, 20.2);
  return g;
}

/** Let the hunter search for `seconds` with nobody to find (the player is far outside the house). */
function scout(g: HideSeekGame, seconds: number): void {
  const ctx = {
    world: g.world,
    spots: g.spots,
    body: { floor: 1 as const, x: -50, y: -50, crouching: false, hiding: null },
    events: [],
    timeS: 0,
    openDoor: (id: string) => g.setDoor(id, true, 'hunter'),
    step: () => {},
    noise: () => {},
  };
  for (let t = 0; t < seconds; t += DT) g.hunter.step(DT, { ...ctx, timeS: t });
}

/** The upstairs wardrobe's id (ids are numbered in layout order, so look it up rather than name it). */
function wardrobeId(g: HideSeekGame): string {
  return g.spots.find((s) => s.floor === 1 && s.spec.kind === 'wardrobe')!.id;
}

function hide(g: HideSeekGame, id: string): void {
  const spot = g.spots.find((s) => s.id === id);
  if (!spot) throw new Error(`no spot ${id}`);
  g.player.floor = spot.floor;
  // The game's own hiding entry (the same path the interact key takes).
  (g as unknown as { enterHiding(s: typeof spot): void }).enterHiding(spot);
}

describe('hunter perception', () => {
  it('cannot see through a wall', () => {
    const g = new HideSeekGame(HOUSE_PLAN);
    // The toilet and the living room are separate rooms; the player stands in the toilet.
    const eyes = { floor: 0 as const, x: 14.3, y: 15, facing: -Math.PI / 2, gait: 'walk' as const };
    const body = { floor: 0 as const, x: 11.5, y: 11.5, crouching: false, hiding: null };
    expect(sightRate(g.world, eyes, body)).toBe(0);
  });

  it('sees a player in the open, and crouching is slower to notice', () => {
    const g = new HideSeekGame(HOUSE_PLAN);
    const eyes = { floor: 0 as const, x: 14, y: 17.5, facing: -Math.PI / 2, gait: 'walk' as const };
    const standing = sightRate(g.world, eyes, { floor: 0, x: 14, y: 15, crouching: false, hiding: null });
    const crouched = sightRate(g.world, eyes, { floor: 0, x: 14, y: 15, crouching: true, hiding: null });
    expect(standing).toBeGreaterThan(1);
    expect(crouched).toBeLessThan(standing);
  });

  it('does not see behind him', () => {
    const g = new HideSeekGame(HOUSE_PLAN);
    const eyes = { floor: 0 as const, x: 14, y: 17.5, facing: Math.PI / 2, gait: 'walk' as const };
    expect(sightRate(g.world, eyes, { floor: 0, x: 14, y: 14, crouching: false, hiding: null })).toBe(0);
  });

  it('hears loud sounds further than quiet ones, and less through walls', () => {
    const g = new HideSeekGame(HOUSE_PLAN);
    const ear = { floor: 0 as const, x: 14, y: 15 };
    const at = (loudness: number, x: number, y: number) => heardStrength(g.world, ear, { floor: 0, x, y, loudness });
    expect(at(0.9, 20, 15)).toBeGreaterThan(at(0.12, 20, 15));
    expect(at(0.12, 20, 15)).toBe(0);
    expect(at(0.9, 14, 15.5)).toBeGreaterThan(at(0.9, 14, 20));
  });

  it('draws a vision cone clipped by walls', () => {
    const g = new HideSeekGame(HOUSE_PLAN);
    const eyes = { floor: 0 as const, x: 14, y: 15, facing: -Math.PI / 2, gait: 'walk' as const };
    const poly = visionPolygon(g.world, eyes);
    expect(poly.length).toBeGreaterThan(10);
    for (const p of poly) expect(Math.hypot(p.x - eyes.x, p.y - eyes.y)).toBeLessThanOrEqual(10.01);
  });
});

describe('hunter behaviour', () => {
  it('waits during the preparation and then patrols', () => {
    const g = new HideSeekGame(HOUSE_PLAN);
    const start = { x: g.hunter.x, y: g.hunter.y };
    run(g, 15);
    expect({ x: g.hunter.x, y: g.hunter.y }).toEqual(start);
    run(g, 15);
    expect(Math.hypot(g.hunter.x - start.x, g.hunter.y - start.y)).toBeGreaterThan(3);
  });

  it('catches a player standing in plain view, and the round ends once', () => {
    const g = hunting({ floor: 0, x: 14, y: 15 });
    run(g, 60, NO_INPUT, () => g.round.phase !== 'hunt');
    expect(['killing', 'gameover']).toContain(g.round.phase);
    expect(g.hunter.mode).toBe('chase');
  });

  it('investigates a loud noise and walks to where it came from', () => {
    const g = hunting({ floor: 1, x: 12, y: 15 });
    const noise = { x: 20, y: 25.5 };
    g.hunter.x = 26;
    g.hunter.y = 28;
    g.hunter.floor = 0;
    const ctx = {
      world: g.world,
      spots: g.spots,
      body: { floor: 1 as const, x: 12, y: 15, crouching: false, hiding: null },
      events: [{ kind: 'impact' as const, at: noise, floor: 0 as const, loudness: 0.95 }],
      timeS: g.timeS,
      openDoor: () => {},
      step: () => {},
      noise: () => {},
    };
    g.hunter.step(DT, ctx);
    expect(g.hunter.mode).toBe('investigate');
    expect(g.hunter.lastKnown).toMatchObject({ x: noise.x, y: noise.y, sure: false });
    let nearest = Number.POSITIVE_INFINITY;
    for (let t = 0; t < 12; t += DT) {
      g.hunter.step(DT, { ...ctx, events: [] });
      nearest = Math.min(nearest, Math.hypot(g.hunter.x - noise.x, g.hunter.y - noise.y));
    }
    // He goes to the noise (and then searches on from there).
    expect(nearest).toBeLessThan(2);
  });

  it('ignores a sound too faint to carry', () => {
    const g = hunting({ floor: 1, x: 12, y: 15 });
    g.hunter.x = 26;
    g.hunter.y = 28;
    const before = g.hunter.mode;
    g.hunter.step(DT, {
      world: g.world,
      spots: g.spots,
      body: { floor: 1, x: 12, y: 15, crouching: true, hiding: null },
      events: [{ kind: 'footstep', at: { x: 12, y: 15 }, floor: 1, loudness: 0.12 }],
      timeS: g.timeS,
      openDoor: () => {},
      step: () => {},
      noise: () => {},
    });
    expect(g.hunter.mode).toBe(before);
  });

  it('searches the house room by room, upstairs too, and checks hiding places', () => {
    const g = hunting({ floor: 1, x: 12, y: 15 });
    scout(g, 119);
    expect(g.hunter.searched.size).toBeGreaterThan(5);
    expect(g.hunter.inspected.size).toBeGreaterThan(3);
    expect([...g.hunter.searched.keys()].some((id) => g.world.room(id)?.floor === 1)).toBe(true);
  });

  it('never wanders off the floor plan', () => {
    const g = hunting({ floor: 1, x: 12, y: 15 });
    for (let t = 0; t < 119; t += DT) {
      scout(g, DT);
      expect(g.world.fits(g.hunter.floor, g.hunter.x, g.hunter.y, 0.2) || g.hunter.onStairs !== null).toBe(true);
    }
  });

  it('a well-hidden player survives the hunter standing in front of the hiding place for a moment', () => {
    const g = hunting({ floor: 1, x: 12, y: 15 });
    hide(g, wardrobeId(g));
    const spot = g.spots.find((s) => s.id === wardrobeId(g))!;
    g.hunter.floor = 1;
    g.hunter.x = spot.spec.at.x;
    g.hunter.y = spot.spec.at.y + 1.1;
    g.hunter.facing = -Math.PI / 2;
    for (let t = 0; t < 1.2; t += DT)
      g.hunter.step(DT, {
        world: g.world,
        spots: g.spots,
        body: { floor: 1, x: g.player.x, y: g.player.y, crouching: false, hiding: spot },
        events: [],
        timeS: 0,
        openDoor: () => {},
        step: () => {},
        noise: () => {},
      });
    expect(g.hunter.awareness).toBeLessThan(1);
  });

  it('peeking never changes what the hunter notices (the body is what he reads)', () => {
    const peek = { ...NO_INPUT, peek: true, move: { x: 0, y: -1 } };
    const a = hunting({ floor: 0, x: 11.5, y: 11.5 });
    const b = hunting({ floor: 0, x: 11.5, y: 11.5 });
    for (let t = 0; t < 40; t += DT) {
      a.step(DT, NO_INPUT);
      b.step(DT, peek);
      expect(b.hunter.awareness).toBe(a.hunter.awareness);
      expect(b.hunter.mode).toBe(a.hunter.mode);
    }
  });

  it('forgets everything on a restart', () => {
    const g = hunting({ floor: 0, x: 14, y: 15 });
    run(g, 40);
    g.restart();
    expect(g.hunter.mode).toBe('patrol');
    expect(g.hunter.awareness).toBe(0);
    expect(g.hunter.searched.size).toBe(0);
    expect(g.round.phase).toBe('prep');
  });
});

describe('how he searches a hiding place (owner, 18/11/2026)', () => {
  /** Drive the hunter alone, like `scout`, recording what he does with his body. */
  function watch(rng: () => number, seconds = 119) {
    const g = new HideSeekGame(HOUSE_PLAN);
    const h = new Hunter(HOUSE_PLAN, rng);
    const kinds = new Set<string>();
    const noises: string[] = [];
    const ctx = {
      world: g.world,
      spots: g.spots,
      body: { floor: 1 as const, x: -50, y: -50, crouching: false, hiding: null },
      events: [] as never[],
      timeS: 0,
      openDoor: (id: string) => g.setDoor(id, true, 'hunter'),
      step: () => {},
      noise: (_a: unknown, _f: unknown, _l: number, d: string) => noises.push(d),
    };
    for (let t = 0; t < seconds; t += DT) {
      h.step(DT, { ...ctx, timeS: t });
      if (h.action) kinds.add(h.action.kind);
    }
    return { kinds, noises, h };
  }

  it('opens cupboards, lifts lids and kneels to look under beds when he is thorough', () => {
    const { kinds, noises } = watch(() => 0.05);
    expect(kinds.has('open-door')).toBe(true);
    expect(kinds.has('lift-lid') || kinds.has('look-under')).toBe(true);
    expect(noises).toContain('open-door'); // the door creaks as he opens it
  });

  it('only glances when he is not suspicious, so a good hiding place can slip past', () => {
    const { kinds, noises } = watch(() => 0.99);
    expect(kinds.has('glance')).toBe(true);
    expect(kinds.has('open-door')).toBe(false);
    expect(noises).not.toContain('open-door');
  });

  it('varies what he does, but identically for the same seed', () => {
    const a = watch(seeded(1));
    const b = watch(seeded(1));
    const c = watch(seeded(2));
    expect([...a.kinds]).toEqual([...b.kinds]);
    expect(a.noises).toEqual(b.noises);
    expect(a.kinds.size).toBeGreaterThanOrEqual(3);
    expect(JSON.stringify(a.noises) === JSON.stringify(c.noises) && a.noises.length > 3).toBe(false);
  });

  it('listens with his head cocked now and then, and drags his knife along a wall', () => {
    // Over several different hunters (seeds), since when exactly he does either is left to chance.
    const kinds = new Set<string>();
    for (const seed of [3, 7, 11, 19]) for (const k of watch(seeded(seed), 240).kinds) kinds.add(k);
    expect(kinds.has('listen')).toBe(true);
    expect(kinds.has('knife-scrape')).toBe(true);
  });

  it('opens the place he heard someone use, properly, even if he would otherwise only glance', () => {
    const g = new HideSeekGame(HOUSE_PLAN);
    const h = new Hunter(HOUSE_PLAN, () => 0.99);
    const spot = g.spots.find((s) => s.floor === 0 && s.spec.kind === 'cupboard')!;
    h.floor = 0;
    h.x = spot.spec.at.x + 3;
    h.y = spot.spec.at.y + 2;
    const ctx = (events: never[]) => ({
      world: g.world,
      spots: g.spots,
      body: { floor: 1 as const, x: -50, y: -50, crouching: false, hiding: null },
      events,
      timeS: 0,
      openDoor: () => {},
      step: () => {},
      noise: () => {},
    });
    // He hears a creak from that cupboard (someone got into it).
    h.step(
      DT,
      ctx([
        { kind: 'hide-enter', at: spot.spec.at, floor: 0, loudness: 0.9, id: spot.id, detail: 'cupboard' },
      ] as never[]),
    );
    let first: string | null = null;
    for (let t = 0; t < 60 && !first; t += DT) {
      h.step(DT, { ...ctx([]), timeS: t });
      if (h.action?.spot?.id === spot.id) first = h.action.kind;
    }
    expect(first).toBe('open-door');
  });

  it('finds a player in a cupboard he opens, but not one he merely glances at', () => {
    const g = new HideSeekGame(HOUSE_PLAN);
    const spot = g.spots.find((s) => s.spec.kind === 'wardrobe')!;
    const mk = (kind: 'open-door' | 'glance') => {
      const h = new Hunter(HOUSE_PLAN);
      const out = exitPoint(g.world, spot);
      h.floor = spot.floor;
      h.x = out.x;
      h.y = out.y;
      h.facing = Math.atan2(spot.spec.at.y - out.y, spot.spec.at.x - out.x);
      const ctx = {
        world: g.world,
        spots: g.spots,
        body: { floor: spot.floor, x: spot.spec.at.x, y: spot.spec.at.y, crouching: false, hiding: spot },
        events: [] as never[],
        timeS: 0,
        openDoor: () => {},
        step: () => {},
        noise: () => {},
      };
      (h as unknown as { beginAction(k: string, s: unknown, c: unknown): void }).beginAction(kind, spot, ctx);
      let peak = 0;
      // Only while the action lasts (then he would walk on): the look is what finds, or does not.
      for (let t = 0; t < ACTION_DURATION_S[kind] * 1.25 + 0.1; t += DT) {
        h.step(DT, { ...ctx, timeS: t });
        peak = Math.max(peak, h.awareness);
      }
      return peak;
    };
    expect(mk('open-door')).toBeGreaterThanOrEqual(1);
    expect(mk('glance')).toBeLessThan(1);
  });

  it('drops what he is doing the moment he sees the player in the open', () => {
    const g = new HideSeekGame(HOUSE_PLAN);
    const h = new Hunter(HOUSE_PLAN);
    const spot = g.spots[0]!;
    h.floor = 0;
    h.x = 14;
    h.y = 17.5;
    h.facing = -Math.PI / 2;
    (h as unknown as { beginAction(k: string, s: unknown, c: unknown): void }).beginAction('look-under', spot, {});
    expect(h.action).not.toBeNull();
    const ctx = {
      world: g.world,
      spots: g.spots,
      body: { floor: 0 as const, x: 14, y: 16.2, crouching: false, hiding: null },
      events: [] as never[],
      timeS: 0,
      openDoor: () => {},
      step: () => {},
      noise: () => {},
    };
    for (let t = 0; t < 2 && h.mode !== 'chase'; t += DT) h.step(DT, ctx);
    expect(h.mode).toBe('chase');
    expect(h.action).toBeNull();
  });
});
