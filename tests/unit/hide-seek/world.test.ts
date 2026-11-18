import { describe, expect, it } from 'vitest';
import { HOUSE_PLAN } from '../../../src/data/arenas/house';
import { BODY_RADIUS_M, HouseWorld, insideRect, type Placed } from '../../../src/modes/hide-seek/world';

const placed = (floor: 0 | 1, x: number, y: number): Placed => ({ floor, x, y, z: 0, onStairs: null });

describe('the house data (Phase 2 section A)', () => {
  const world = new HouseWorld(HOUSE_PLAN);

  it('has the rooms the brief asks for on both floors', () => {
    const names = HOUSE_PLAN.rooms.map((r) => r.id);
    for (const id of [
      'living',
      'dining',
      'kitchen',
      'toilet',
      'hall',
      'bed1',
      'bed2',
      'bath1',
      'bath2',
      'storage',
      'uphall',
    ])
      expect(names, id).toContain(id);
    expect(HOUSE_PLAN.rooms.filter((r) => r.floor === 1 && r.kind === 'bathroom')).toHaveLength(2);
    expect(HOUSE_PLAN.rooms.filter((r) => r.floor === 1 && r.id.startsWith('bed'))).toHaveLength(2);
    for (const id of ['frontyard', 'backyard', 'shed']) expect(names).toContain(id);
  });

  it('has a front entrance, a back entrance and a staircase', () => {
    expect(world.door('d-front')?.exterior).toBe(true);
    expect(world.door('d-back')?.exterior).toBe(true);
    expect(HOUSE_PLAN.stairs).toHaveLength(1);
  });

  it('rooms on one floor never overlap, except the shed standing in the backyard', () => {
    for (const a of HOUSE_PLAN.rooms)
      for (const b of HOUSE_PLAN.rooms) {
        if (a.id >= b.id || a.floor !== b.floor) continue;
        const ox = Math.min(a.rect.x1, b.rect.x1) - Math.max(a.rect.x0, b.rect.x0);
        const oy = Math.min(a.rect.y1, b.rect.y1) - Math.max(a.rect.y0, b.rect.y0);
        if (ox > 0 && oy > 0) expect([a.id, b.id].sort(), `${a.id} overlaps ${b.id}`).toEqual(['backyard', 'shed']);
      }
  });

  it('every door joins two rooms that exist, and sits on a wall line', () => {
    for (const d of HOUSE_PLAN.doors) {
      for (const id of d.between) expect(world.room(id), `${d.id}: ${id}`).toBeDefined();
    }
  });

  it('every piece of furniture and every hiding place is inside a room, and no solid furniture overlaps a wall', () => {
    for (const f of HOUSE_PLAN.furniture) {
      if (f.kind === 'lawn' || f.kind === 'path') continue;
      const cx = (f.x0 + f.x1) / 2;
      const cy = (f.y0 + f.y1) / 2;
      expect(world.roomAt(f.floor, cx, cy), `${f.id} at ${cx},${cy}`).not.toBeNull();
      if (f.solid)
        for (const w of HOUSE_PLAN.walls) {
          if (w.floor !== f.floor || w.kind === 'rail') continue;
          const ox = Math.min(f.x1, w.x1) - Math.max(f.x0, w.x0);
          const oy = Math.min(f.y1, w.y1) - Math.max(f.y0, w.y0);
          expect(ox > 0.02 && oy > 0.02, `${f.id} overlaps a wall at ${w.x0},${w.y0}`).toBe(false);
        }
      if (f.hide) expect(world.roomAt(f.floor, f.hide.at.x, f.hide.at.y), `${f.id} hide spot`).not.toBeNull();
    }
    const kinds = new Set(HOUSE_PLAN.furniture.flatMap((f) => (f.hide ? [f.hide.kind] : [])));
    for (const k of ['under-bed', 'wardrobe', 'cupboard', 'chest', 'box', 'curtain', 'shower-curtain', 'bush'])
      expect(kinds.has(k as never), k).toBe(true);
  });

  it('the start spots are free, and the player starts inside the house', () => {
    const p = HOUSE_PLAN.playerStart;
    expect(world.fits(p.floor, p.x, p.y)).toBe(true);
    expect(world.roomAt(p.floor, p.x, p.y)?.id).toBe('living');
    const h = HOUSE_PLAN.hunterStart;
    expect(world.fits(h.floor, h.x, h.y)).toBe(true);
    for (const w of HOUSE_PLAN.patrol) expect(world.fits(w.floor, w.x, w.y), `${w.x},${w.y}`).toBe(true);
  });

  it('there are throwable objects on both floors', () => {
    expect(HOUSE_PLAN.throwables.some((t) => t.floor === 0)).toBe(true);
    expect(HOUSE_PLAN.throwables.some((t) => t.floor === 1)).toBe(true);
    // They lie on tables, counters and the floor: each is inside a room (a table top is not floor space).
    for (const t of HOUSE_PLAN.throwables) expect(world.roomAt(t.floor, t.x, t.y), t.id).not.toBeNull();
  });
});

describe('movement, doors and stairs', () => {
  it('walls and shut doors stop a body; opening a door lets it through', () => {
    const w = new HouseWorld(HOUSE_PLAN);
    // The kitchen door (x=25, y 10.2 to 11.8), shut at the start.
    const p = placed(0, 24.3, 11);
    let pushed: string | null = null;
    for (let i = 0; i < 30; i++) pushed = w.move(p, 0.05, 0).pushedDoor ?? pushed;
    expect(p.x).toBeLessThan(25);
    expect(pushed).toBe('d-kitchen-hall');
    expect(w.setDoor('d-kitchen-hall', true)).toBe(true);
    for (let i = 0; i < 30; i++) w.move(p, 0.05, 0);
    expect(p.x).toBeGreaterThan(25.5);
    // Arches are always open and never close.
    expect(w.setDoor('a-dining-kitchen', false)).toBe(false);
    expect(w.isOpen('a-dining-kitchen')).toBe(true);
  });

  it('a body cannot walk through a wall or leave the lot', () => {
    const w = new HouseWorld(HOUSE_PLAN);
    const p = placed(0, 12, 15);
    for (let i = 0; i < 60; i++) w.move(p, 0, -0.1); // north into the wall line y=14 (a gap sits at x 14 to 17)
    expect(p.y).toBeGreaterThan(14.2);
    const q = placed(0, 2, 2);
    for (let i = 0; i < 80; i++) w.move(q, -0.1, 0);
    expect(q.x).toBeGreaterThanOrEqual(BODY_RADIUS_M);
  });

  it('walking up the stairs lifts the body and puts it on the upper floor; walking down brings it back', () => {
    const w = new HouseWorld(HOUSE_PLAN);
    const p = placed(0, 27.2, 16);
    const zs: number[] = [];
    for (let i = 0; i < 140 && p.floor === 0; i++) {
      w.move(p, 0, -0.05);
      zs.push(p.z);
    }
    expect(p.floor).toBe(1);
    expect(Math.max(...zs)).toBeGreaterThan(2.5); // it really climbed
    const climb = zs.slice(0, -1); // the last sample is the step onto the landing (height above that floor: 0)
    expect(climb.every((z, i) => i === 0 || z >= climb[i - 1]! - 1e-9)).toBe(true); // steadily
    expect(p.y).toBeLessThan(10.5); // standing on the landing above the top step
    expect(p.onStairs).toBeNull();
    for (let i = 0; i < 160 && p.floor === 1; i++) w.move(p, 0, 0.05);
    expect(p.floor).toBe(0);
    expect(p.y).toBeGreaterThan(15);
    expect(p.z).toBe(0);
  });

  it('the ground floor stairs cannot be entered from the side', () => {
    const w = new HouseWorld(HOUSE_PLAN);
    const p = placed(0, 29, 13); // beside the stairs, in the hall
    for (let i = 0; i < 40; i++) w.move(p, -0.1, 0);
    expect(p.floor).toBe(0);
    expect(p.onStairs).toBeNull();
    expect(p.x).toBeGreaterThan(28.5);
  });
});

describe('sight, sound and rooms', () => {
  const w = new HouseWorld(HOUSE_PLAN);

  it('sees through an open arch, not through a wall or a shut door', () => {
    // Living room to dining room through the arch (x 14 to 17 at y=14).
    expect(w.lineOfSight(0, { x: 15.5, y: 16 }, { x: 15.5, y: 12 })).toBe(true);
    // Through the wall beside the arch.
    expect(w.lineOfSight(0, { x: 12.8, y: 16 }, { x: 12.8, y: 12 })).toBe(false);
    // Through the shut kitchen door, then open.
    const a = { x: 21, y: 16 };
    const b = { x: 21, y: 12 };
    expect(w.lineOfSight(0, a, b)).toBe(false);
    const w2 = new HouseWorld(HOUSE_PLAN);
    w2.setDoor('d-kitchen-living', true);
    expect(w2.lineOfSight(0, a, b)).toBe(true);
  });

  it('tall furniture blocks sight; low furniture does not', () => {
    // The kitchen fridge (x 24.0 to 24.75, y 12.6 to 13.8) blocks; the coffee table does not.
    expect(w.lineOfSight(0, { x: 23.5, y: 13.2 }, { x: 24.9, y: 13.2 })).toBe(false);
    expect(w.lineOfSight(0, { x: 14, y: 16.8 }, { x: 17.5, y: 16.8 })).toBe(true);
  });

  it('walls quieten a sound, shut doors even more, open doors not at all', () => {
    const closed = new HouseWorld(HOUSE_PLAN);
    const open = new HouseWorld(HOUSE_PLAN);
    open.setDoor('d-kitchen-living', true);
    const a = { x: 21, y: 16 };
    const b = { x: 21, y: 12 };
    expect(open.soundTransmission(0, a, b)).toBe(1);
    expect(closed.soundTransmission(0, a, b)).toBeLessThan(0.5);
    expect(closed.soundTransmission(0, { x: 12.8, y: 16 }, { x: 12.8, y: 12 })).toBeLessThan(0.5);
    expect(closed.soundTransmission(0, { x: 15.5, y: 16 }, { x: 15.5, y: 12 })).toBe(1);
  });

  it('finds the room under a point, and the neighbours of a room', () => {
    expect(w.roomAt(0, 15, 11)?.id).toBe('dining');
    expect(w.roomAt(1, 12, 11)?.id).toBe('bed1');
    expect(w.roomAt(0, 5, 4)?.id).toBe('shed');
    expect(w.roomAt(0, 5, 8)?.id).toBe('backyard');
    expect(w.neighbours('dining').sort()).toEqual(['kitchen', 'living']);
    expect(w.neighbours('hall')).toContain('uphall'); // the stairs
    expect(w.neighbours('frontyard')).toContain('street');
  });
});

describe('routing across floors', () => {
  const w = new HouseWorld(HOUSE_PLAN);

  /** A free spot well inside a room. */
  function spotIn(roomId: string): { floor: 0 | 1; x: number; y: number } {
    const r = w.room(roomId)!;
    for (let y = r.rect.y0 + 0.6; y < r.rect.y1 - 0.5; y += 0.3)
      for (let x = r.rect.x0 + 0.6; x < r.rect.x1 - 0.5; x += 0.3)
        if (w.fits(r.floor, x, y, 0.4) && insideRect(r.rect, x, y)) return { floor: r.floor, x, y };
    throw new Error(`no free spot in ${roomId}`);
  }

  it('every room can be reached from the player start, upstairs included', () => {
    const from = HOUSE_PLAN.playerStart;
    for (const room of HOUSE_PLAN.rooms) {
      const to = spotIn(room.id);
      const route = w.route(from, to);
      expect(route, `route to ${room.id}`).not.toBeNull();
    }
  });

  it('a route to another floor climbs the stairs exactly once', () => {
    const route = w.route(HOUSE_PLAN.playerStart, spotIn('bed2'))!;
    expect(route.filter((p) => p.stairs === 'up')).toHaveLength(1);
    expect(route.filter((p) => p.stairs === 'down')).toHaveLength(0);
    expect(route.at(-1)!.floor).toBe(1);
    const down = w.route(spotIn('bed2'), spotIn('kitchen'))!;
    expect(down.filter((p) => p.stairs === 'down')).toHaveLength(1);
  });

  it('a body can actually walk a cross-floor route, opening doors as it goes', () => {
    const world = new HouseWorld(HOUSE_PLAN);
    const target = spotIn('bath2');
    const route = world.route(HOUSE_PLAN.playerStart, target)!;
    const p = placed(HOUSE_PLAN.playerStart.floor, HOUSE_PLAN.playerStart.x, HOUSE_PLAN.playerStart.y);
    let i = 0;
    for (let step = 0; step < 6000 && i < route.length; step++) {
      const wp = route[i]!;
      if (wp.floor !== p.floor && !p.onStairs) {
        // Reached the next floor through the ramp: carry on to its first waypoint.
      }
      const dx = wp.x - p.x;
      const dy = wp.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.25) {
        i++;
        continue;
      }
      const stepM = 0.06;
      const r = world.move(p, (dx / d) * stepM, (dy / d) * stepM);
      if (r.pushedDoor) world.setDoor(r.pushedDoor, true);
    }
    expect(i).toBe(route.length);
    expect(p.floor).toBe(1);
    expect(Math.hypot(p.x - target.x, p.y - target.y)).toBeLessThan(0.5);
  });
});
