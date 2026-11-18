import { describe, expect, it } from 'vitest';
import { HOUSE, HOUSE_PLAN } from '../../../src/data/arenas/house';
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
      const y0 = g.player.y;
      walk(g, { x: 0, y: -1 }, 0.5, { run: mode === 'run' }); // north along the hall
      return (y0 - g.player.y) / 0.5;
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
    walk(g, { x: 0, y: -1 }, 0.2, { run: true });
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
      walk(g, { x: 0, y: -1 }, 2, { run });
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
    // The kitchen door to the living room (x 16 to 17.6, y=14): walk into it from the living room.
    g.player.x = 16.8;
    g.player.y = 15;
    walk(g, { x: 0, y: -1 }, 1);
    expect(g.world.isOpen('d-kitchen-living')).toBe(true);
    expect(g.takeEvents().some((e) => e.kind === 'door' && e.open === true)).toBe(true);
    // Close it with the interact key (the player stands next to it).
    g.player.x = 16.8;
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
    g.player.x = 16.8;
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

describe('the game is played inside the house (owner, 18/11/2026)', () => {
  it('the player cannot walk out of the front door or leave the building', () => {
    const g = new HideSeekGame(HOUSE_PLAN);
    // Stand in the hall facing the front door (south wall, x 26.4 to 27.6) and walk straight out.
    g.player.floor = 0;
    g.player.floor = 0;
    g.player.x = 27;
    g.player.y = 19;
    walk(g, { x: 0, y: 1 }, 6);
    expect(g.world.roomAt(0, g.player.x, g.player.y)?.outdoors).not.toBe(true);
    expect(g.player.y).toBeLessThan(21);
    // The front door is locked for good: no prompt, and the interact key does nothing to it.
    expect(g.doorNear()).toBeNull();
    g.step(STEP, { ...NO_INPUT, interactPress: true });
    expect(g.world.isOpen('d-front')).toBe(false);
    expect(g.takeEvents().some((e) => e.kind === 'door')).toBe(false);
  });

  it('the player starts in the hall, just inside the front door; Shroud waits outside it', () => {
    const g = new HideSeekGame(HOUSE);
    const door = g.world.door('d-front')!.rect;
    const p = g.player;
    expect(g.world.roomAt(p.floor, p.x, p.y)?.id).toBe('hall');
    expect(Math.hypot(p.x - (door.x0 + door.x1) / 2, p.y - door.y0)).toBeLessThan(5);
    const h = g.hunter;
    expect(g.world.roomAt(h.floor, h.x, h.y)?.outdoors).toBe(true); // outside, in front of the door
    expect(Math.hypot(h.x - p.x, h.y - p.y)).toBeGreaterThan(8);
    expect(g.world.isOpen('d-front')).toBe(false);
  });

  it('when the hunt begins the front door opens, Shroud walks in, and it shuts and locks behind him (owner, 19/11/2026)', () => {
    for (const house of [HOUSE_PLAN, HOUSE]) {
      const g = new HideSeekGame(house);
      const start = { x: g.hunter.x, y: g.hunter.y };
      // Through the preparation he waits outside and the door stays shut and locked.
      for (let i = 0; i < 60 * 19; i++) g.step(STEP, NO_INPUT);
      expect(g.round.phase).toBe('prep');
      expect({ x: g.hunter.x, y: g.hunter.y }).toEqual(start);
      expect(g.world.isOpen('d-front')).toBe(false);
      // The hunt begins: the door opens (with its noise) and he starts to walk in.
      let opened = false;
      let sawDoorEvent = false;
      let inside = -1;
      const events: { kind: string; open?: boolean; by?: string }[] = [];
      for (let i = 0; i < 60 * 14; i++) {
        g.step(STEP, NO_INPUT);
        for (const e of g.takeEvents()) events.push(e);
        if (g.world.isOpen('d-front')) opened = true;
        const room = g.world.roomAt(g.hunter.floor, g.hunter.x, g.hunter.y);
        if (inside < 0 && room && room.outdoors !== true) inside = i / 60;
      }
      sawDoorEvent = events.some((e) => e.kind === 'door' && e.open === true && e.by === 'hunter');
      expect(opened).toBe(true);
      expect(sawDoorEvent).toBe(true);
      expect(events.some((e) => e.kind === 'door' && e.open === false && e.by === 'hunter')).toBe(true); // it swings shut
      expect(inside).toBeGreaterThan(1); // he does not appear inside: he walks in
      // Afterwards the door is shut and locked for good, and he is inside thinking for himself.
      expect(g.world.isOpen('d-front')).toBe(false);
      expect(g.world.isLocked('d-front')).toBe(true);
      expect(g.world.roomAt(g.hunter.floor, g.hunter.x, g.hunter.y)?.outdoors).not.toBe(true);
      expect(g.world.setDoor('d-front', true)).toBe(false);
      // A restart puts him back outside and the door back as it was.
      g.restart();
      expect({ x: g.hunter.x, y: g.hunter.y }).toEqual(start);
      expect(g.world.isOpen('d-front')).toBe(false);
      expect(g.world.isLocked('d-front')).toBe(true);
    }
  });

  it('there are no hiding places outdoors, and the hunter does not search the yards', () => {
    const g = new HideSeekGame(HOUSE_PLAN);
    for (const s of g.spots) expect(g.world.roomAt(s.floor, s.spec.at.x, s.spec.at.y)?.outdoors, s.id).not.toBe(true);
  });
});

describe('climbing the stairs with a diagonal push (owner, 18/11/2026: the player could not get up)', () => {
  it.each([
    ['the authored plan', HOUSE_PLAN],
    ['the real house', HOUSE],
  ])('pushing straight up, or up and to the right, gets the player upstairs in %s', (_name, house) => {
    for (const move of [
      { x: 0, y: -1 },
      { x: 0.7, y: -0.7 },
      { x: 0.3, y: -0.95 },
    ]) {
      const g = new HideSeekGame(house);
      g.round.update(20.1);
      const r = house.stairs[0]!.ramp;
      g.player.floor = 0;
      g.player.x = (r.x0 + r.x1) / 2;
      g.player.y = r.y1 + 1.5;
      for (let i = 0; i < 60 * 8; i++) {
        g.hunter.x = -99; // keep the hunter out of it
        g.step(STEP, { ...NO_INPUT, move });
      }
      expect(g.player.floor, `pushing ${move.x},${move.y}`).toBe(1);
    }
  });
});
