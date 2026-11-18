import { describe, expect, it } from 'vitest';
import { HideSeekGame, NO_INPUT, type PlayerInput } from '../../../src/modes/hide-seek/game';
import { heardStrength, sightRate, visionPolygon } from '../../../src/modes/hide-seek/perception';

const DT = 1 / 30;

function run(g: HideSeekGame, seconds: number, input: PlayerInput = NO_INPUT, until?: () => boolean): void {
  for (let t = 0; t < seconds && !(until?.() ?? false); t += DT) g.step(DT, input);
}

/** A game already in the hunt with the player standing at a spot. */
function hunting(at: { floor: 0 | 1; x: number; y: number }): HideSeekGame {
  const g = new HideSeekGame();
  Object.assign(g.player, { floor: at.floor, x: at.x, y: at.y });
  run(g, 20.2);
  return g;
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
    const g = new HideSeekGame();
    // The toilet and the living room are separate rooms; the player stands in the toilet.
    const eyes = { floor: 0 as const, x: 14.3, y: 15, facing: -Math.PI / 2, gait: 'walk' as const };
    const body = { floor: 0 as const, x: 11.5, y: 11.5, crouching: false, hiding: null };
    expect(sightRate(g.world, eyes, body)).toBe(0);
  });

  it('sees a player in the open, and crouching is slower to notice', () => {
    const g = new HideSeekGame();
    const eyes = { floor: 0 as const, x: 14, y: 17.5, facing: -Math.PI / 2, gait: 'walk' as const };
    const standing = sightRate(g.world, eyes, { floor: 0, x: 14, y: 15, crouching: false, hiding: null });
    const crouched = sightRate(g.world, eyes, { floor: 0, x: 14, y: 15, crouching: true, hiding: null });
    expect(standing).toBeGreaterThan(1);
    expect(crouched).toBeLessThan(standing);
  });

  it('does not see behind him', () => {
    const g = new HideSeekGame();
    const eyes = { floor: 0 as const, x: 14, y: 17.5, facing: Math.PI / 2, gait: 'walk' as const };
    expect(sightRate(g.world, eyes, { floor: 0, x: 14, y: 14, crouching: false, hiding: null })).toBe(0);
  });

  it('hears loud sounds further than quiet ones, and less through walls', () => {
    const g = new HideSeekGame();
    const ear = { floor: 0 as const, x: 14, y: 15 };
    const at = (loudness: number, x: number, y: number) => heardStrength(g.world, ear, { floor: 0, x, y, loudness });
    expect(at(0.9, 20, 15)).toBeGreaterThan(at(0.12, 20, 15));
    expect(at(0.12, 20, 15)).toBe(0);
    expect(at(0.9, 14, 15.5)).toBeGreaterThan(at(0.9, 14, 20));
  });

  it('draws a vision cone clipped by walls', () => {
    const g = new HideSeekGame();
    const eyes = { floor: 0 as const, x: 14, y: 15, facing: -Math.PI / 2, gait: 'walk' as const };
    const poly = visionPolygon(g.world, eyes);
    expect(poly.length).toBeGreaterThan(10);
    for (const p of poly) expect(Math.hypot(p.x - eyes.x, p.y - eyes.y)).toBeLessThanOrEqual(10.01);
  });
});

describe('hunter behaviour', () => {
  it('waits during the preparation and then patrols', () => {
    const g = new HideSeekGame();
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
    });
    expect(g.hunter.mode).toBe(before);
  });

  it('searches the whole house, upstairs too, and checks hiding places', () => {
    const g = hunting({ floor: 1, x: 12, y: 15 });
    hide(g, 'wardrobe-30');
    run(g, 119);
    expect(g.round.phase).toBe('hunt');
    expect(g.hunter.searched.size).toBeGreaterThan(5);
    expect(g.hunter.inspected.size).toBeGreaterThan(3);
  });

  it('never wanders off the floor plan', () => {
    const g = hunting({ floor: 1, x: 12, y: 15 });
    hide(g, 'wardrobe-30');
    for (let t = 0; t < 119; t += DT) {
      g.step(DT, NO_INPUT);
      expect(g.world.fits(g.hunter.floor, g.hunter.x, g.hunter.y, 0.2) || g.hunter.onStairs !== null).toBe(true);
    }
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
