import { describe, expect, it } from 'vitest';
import { HOUSE_PLAN } from '../../../src/data/arenas/house';
import {
  CROUCH_MPS,
  FOOTSTEP_LOUDNESS,
  HideSeekGame,
  NO_INPUT,
  RUN_MPS,
  WALK_MPS,
} from '../../../src/modes/hide-seek/game';

const STEP = 1 / 60;
const walk = (g: HideSeekGame, move: { x: number; y: number }, seconds: number, extra: object = {}) => {
  for (let i = 0; i < Math.round(seconds / STEP); i++) g.step(STEP, { ...NO_INPUT, move, ...extra });
};

describe('player movement and stealth speeds (section D)', () => {
  it('walks at walking pace, runs faster, and crouches slowest', () => {
    const dist = (mode: 'walk' | 'run' | 'crouch') => {
      const g = new HideSeekGame(HOUSE_PLAN);
      if (mode === 'crouch') g.step(STEP, { ...NO_INPUT, crouchPress: true });
      const x0 = g.player.x;
      walk(g, { x: 1, y: 0 }, 0.5, { run: mode === 'run' });
      return (g.player.x - x0) / 0.5;
    };
    expect(dist('walk')).toBeCloseTo(WALK_MPS, 1);
    expect(dist('run')).toBeCloseTo(RUN_MPS, 1);
    expect(dist('crouch')).toBeCloseTo(CROUCH_MPS, 1);
    expect(RUN_MPS).toBeGreaterThan(WALK_MPS);
    expect(CROUCH_MPS).toBeLessThan(WALK_MPS);
  });

  it('crouching toggles, and a crouching body that is told to run still only crouches', () => {
    const g = new HideSeekGame(HOUSE_PLAN);
    g.step(STEP, { ...NO_INPUT, crouchPress: true });
    expect(g.player.crouching).toBe(true);
    walk(g, { x: 1, y: 0 }, 0.2, { run: true });
    expect(g.player.posture).toBe('crouch');
    g.step(STEP, { ...NO_INPUT, crouchPress: true });
    expect(g.player.crouching).toBe(false);
  });

  it('running footsteps are loud, walking ones moderate, crouching ones nearly silent', () => {
    expect(FOOTSTEP_LOUDNESS.run).toBeGreaterThan(FOOTSTEP_LOUDNESS.walk);
    expect(FOOTSTEP_LOUDNESS.walk).toBeGreaterThan(FOOTSTEP_LOUDNESS.crouch);
    const loudest = (run: boolean, crouch: boolean) => {
      const g = new HideSeekGame(HOUSE_PLAN);
      if (crouch) g.step(STEP, { ...NO_INPUT, crouchPress: true });
      walk(g, { x: 1, y: 0 }, 2, { run });
      const steps = g.takeEvents().filter((e) => e.kind === 'footstep');
      return { n: steps.length, loud: Math.max(0, ...steps.map((e) => e.loudness)) };
    };
    const w = loudest(false, false);
    const r = loudest(true, false);
    const c = loudest(false, true);
    expect(r.loud).toBeGreaterThan(w.loud);
    expect(c.loud).toBeLessThan(w.loud);
    expect(w.n).toBeGreaterThan(0);
  });

  it('opens a shut door by walking into it, and the interact key toggles a nearby door', () => {
    const g = new HideSeekGame(HOUSE_PLAN);
    // The kitchen door to the living room (x 20.2 to 21.8, y=14): walk into it from the living room.
    g.player.x = 21;
    g.player.y = 15;
    walk(g, { x: 0, y: -1 }, 1);
    expect(g.world.isOpen('d-kitchen-living')).toBe(true);
    expect(g.takeEvents().some((e) => e.kind === 'door' && e.open === true)).toBe(true);
    // Close it with the interact key (the player stands next to it).
    g.player.x = 21;
    g.player.y = 14.9;
    expect(g.doorNear()?.id).toBe('d-kitchen-living');
    g.step(STEP, { ...NO_INPUT, interactPress: true });
    expect(g.world.isOpen('d-kitchen-living')).toBe(false);
  });

  it('peeking leaves the body where it is', () => {
    const g = new HideSeekGame(HOUSE_PLAN);
    const { x, y } = g.player;
    walk(g, { x: 1, y: 0 }, 1, { peek: true });
    expect(g.player.x).toBe(x);
    expect(g.player.y).toBe(y);
  });

  it('restart puts everything back', () => {
    const g = new HideSeekGame(HOUSE_PLAN);
    g.player.x = 21;
    g.player.y = 15;
    walk(g, { x: 0, y: -1 }, 3);
    expect(g.world.isOpen('d-kitchen-living')).toBe(true);
    // Reach the hunt by the round clock alone: a motionless player would be caught by the faster hunter in this time.
    g.round.update(25);
    expect(g.round.phase).toBe('hunt');
    g.restart();
    expect(g.round.phase).toBe('prep');
    expect(g.world.isOpen('d-kitchen-living')).toBe(false);
    expect(g.player.x).toBe(g.house.playerStart.x);
    expect(g.player.y).toBe(g.house.playerStart.y);
    expect(g.timeS).toBe(0);
  });
});
