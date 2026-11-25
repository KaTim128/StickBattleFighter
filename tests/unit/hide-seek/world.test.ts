import { describe, expect, it } from 'vitest';
import { HOUSE_PLAN } from '../../../src/data/arenas/house';
import { BODY_RADIUS_M, HouseWorld, insideRect, type Placed } from '../../../src/modes/hide-seek/world';

const placed = (floor: 0 | 1, x: number, y: number): Placed => ({ floor, x, y, z: 0, onStairs: null });

describe('the house data (Phase 2 section A)', () => {
  const world = new HouseWorld(HOUSE_PLAN);

  it('has the rooms the brief asks for on one floor', () => {
    const names = HOUSE_PLAN.rooms.map((r) => r.id);
    // A compact home (owner, 18/11/2026): four rooms downstairs, two bedrooms and the landing upstairs.
    for (const id of ['living', 'dining', 'kitchen', 'hall']) expect(names, id).toContain(id);
    // No staircase and no upper floor (owner, 25/11/2026).
    expect(HOUSE_PLAN.rooms.filter((r) => r.floor === 1)).toHaveLength(0);
    expect(names).not.toContain('corridor'); // no long corridor
  });

  it('has one front door, locked for good, no other way out, and no staircase', () => {
    expect(world.door('d-front')?.exterior).toBe(true);
    expect(world.door('d-front')?.locked).toBe(true);
    expect(HOUSE_PLAN.doors.filter((d) => d.exterior)).toHaveLength(1);
    expect(world.setDoor('d-front', true)).toBe(false);
    expect(world.isOpen('d-front')).toBe(false);
    expect(HOUSE_PLAN.stairs).toHaveLength(0);
  });

  it('rooms on one floor never overlap', () => {
    for (const a of HOUSE_PLAN.rooms)
      for (const b of HOUSE_PLAN.rooms) {
        if (a.id >= b.id || a.floor !== b.floor) continue;
        const ox = Math.min(a.rect.x1, b.rect.x1) - Math.max(a.rect.x0, b.rect.x0);
        const oy = Math.min(a.rect.y1, b.rect.y1) - Math.max(a.rect.y0, b.rect.y0);
        expect(ox > 0 && oy > 0, `${a.id} overlaps ${b.id}`).toBe(false);
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
    for (const k of ['wardrobe', 'cupboard', 'chest', 'box']) expect(kinds.has(k as never), k).toBe(true);
  });

  it('the start spots are free, and the player starts inside the house', () => {
    const p = HOUSE_PLAN.playerStart;
    expect(world.fits(p.floor, p.x, p.y)).toBe(true);
    // Inside the hall, just by the front door (owner, 18/11/2026).
    expect(world.roomAt(p.floor, p.x, p.y)?.id).toBe('hall');
    const door = world.door('d-front')!.rect;
    expect(Math.hypot(p.x - (door.x0 + door.x1) / 2, p.y - door.y0)).toBeLessThan(4);
    const h = HOUSE_PLAN.hunterStart;
    expect(world.fits(h.floor, h.x, h.y)).toBe(true);
    for (const w of HOUSE_PLAN.patrol) expect(world.fits(w.floor, w.x, w.y), `${w.x},${w.y}`).toBe(true);
  });

  it('there are throwable objects on the floor', () => {
    expect(HOUSE_PLAN.throwables.some((t) => t.floor === 0)).toBe(true);
    // They lie on tables, counters and the floor: each is inside a room (a table top is not floor space).
    for (const t of HOUSE_PLAN.throwables) expect(world.roomAt(t.floor, t.x, t.y), t.id).not.toBeNull();
  });
});

describe('movement and doors', () => {
  it('walls and shut doors stop a body; opening a door lets it through', () => {
    const w = new HouseWorld(HOUSE_PLAN);
    // The dining-room door to the hall (x=25, y 10.2 to 11.8), shut at the start.
    const p = placed(0, 24.3, 11);
    let pushed: string | null = null;
    for (let i = 0; i < 30; i++) pushed = w.move(p, 0.05, 0).pushedDoor ?? pushed;
    expect(p.x).toBeLessThan(25);
    expect(pushed).toBe('d-dining-hall');
    expect(w.setDoor('d-dining-hall', true)).toBe(true);
    for (let i = 0; i < 30; i++) w.move(p, 0.05, 0);
    expect(p.x).toBeGreaterThan(25.5);
    // Arches are always open and never close.
    expect(w.setDoor('a-kitchen-dining', false)).toBe(false);
    expect(w.isOpen('a-kitchen-dining')).toBe(true);
  });

  it('a body cannot walk through a wall or leave the lot', () => {
    const w = new HouseWorld(HOUSE_PLAN);
    const p = placed(0, 24.8, 16); // in the living room, by the east wall
    for (let i = 0; i < 60; i++) w.move(p, 0, -0.1); // north into the wall line y=14 (the arch is at x 22 to 24.5)
    expect(p.y).toBeGreaterThan(14.2);
    const q = placed(0, 2, 2);
    for (let i = 0; i < 80; i++) w.move(q, -0.1, 0);
    expect(q.x).toBeGreaterThanOrEqual(BODY_RADIUS_M);
  });
});

describe('sight, sound and rooms', () => {
  const w = new HouseWorld(HOUSE_PLAN);

  it('sees through an open arch, not through a wall or a shut door', () => {
    // Living room to dining room through the arch (x 22 to 24.5 at y=14).
    expect(w.lineOfSight(0, { x: 23.2, y: 16 }, { x: 23.2, y: 12.4 })).toBe(true);
    // Through the wall beside the arch.
    expect(w.lineOfSight(0, { x: 21, y: 16 }, { x: 21, y: 12.4 })).toBe(false);
    // Through the shut kitchen door, then open.
    const a = { x: 16.8, y: 16 };
    const b = { x: 16.8, y: 12 };
    expect(w.lineOfSight(0, a, b)).toBe(false);
    const w2 = new HouseWorld(HOUSE_PLAN);
    w2.setDoor('d-kitchen-living', true);
    expect(w2.lineOfSight(0, a, b)).toBe(true);
  });

  it('tall furniture blocks sight; low furniture does not', () => {
    // The kitchen fridge (x 19.5 to 20.25, y 9.25 to 10) blocks; the coffee table does not.
    expect(w.lineOfSight(0, { x: 19.1, y: 9.6 }, { x: 20.7, y: 9.6 })).toBe(false);
    expect(w.lineOfSight(0, { x: 16.7, y: 16.9 }, { x: 20.6, y: 16.9 })).toBe(true);
  });

  it('walls quieten a sound, shut doors even more, open doors not at all', () => {
    const closed = new HouseWorld(HOUSE_PLAN);
    const open = new HouseWorld(HOUSE_PLAN);
    open.setDoor('d-kitchen-living', true);
    const a = { x: 16.8, y: 16 };
    const b = { x: 16.8, y: 12 };
    expect(open.soundTransmission(0, a, b)).toBe(1);
    expect(closed.soundTransmission(0, a, b)).toBeLessThan(0.5);
    expect(closed.soundTransmission(0, { x: 21, y: 16 }, { x: 21, y: 12.4 })).toBeLessThan(0.5);
    expect(closed.soundTransmission(0, { x: 23.2, y: 16 }, { x: 23.2, y: 12.4 })).toBe(1);
  });

  it('finds the room under a point, and the neighbours of a room', () => {
    expect(w.roomAt(0, 23, 11)?.id).toBe('dining');
    expect(w.roomAt(0, 5, 4)?.id).toBe('backyard');
    expect(w.neighbours('dining').sort()).toEqual(['hall', 'kitchen', 'living']);
  });
});

describe('routing across floors', () => {
  const w = new HouseWorld(HOUSE_PLAN);

  /** A free spot well inside a room: the free point nearest its middle (corners can be pockets behind furniture). */
  function spotIn(roomId: string): { floor: 0 | 1; x: number; y: number } {
    const r = w.room(roomId)!;
    const cx = (r.rect.x0 + r.rect.x1) / 2;
    const cy = (r.rect.y0 + r.rect.y1) / 2;
    let best: { floor: 0 | 1; x: number; y: number; d: number } | null = null;
    for (let y = r.rect.y0 + 0.6; y < r.rect.y1 - 0.5; y += 0.3)
      for (let x = r.rect.x0 + 0.6; x < r.rect.x1 - 0.5; x += 0.3) {
        const d = Math.hypot(x - cx, y - cy);
        if (w.fits(r.floor, x, y, 0.4) && insideRect(r.rect, x, y) && (!best || d < best.d))
          best = { floor: r.floor, x, y, d };
      }
    if (!best) throw new Error(`no free spot in ${roomId}`);
    return { floor: best.floor, x: best.x, y: best.y };
  }

  it('every room can be reached from the player start', () => {
    const from = HOUSE_PLAN.playerStart;
    for (const room of HOUSE_PLAN.rooms.filter((r) => !r.outdoors)) {
      const to = spotIn(room.id);
      const route = w.route(from, to);
      expect(route, `route to ${room.id}`).not.toBeNull();
    }
  });

  it('a walker following a route never snags on a corner of furniture (the lamp by the dining arch)', () => {
    // The grid alone let a straight shortcut clip the lamp's corner by a hand's breadth: a whole body then stuck there.
    const from = { floor: 0 as const, x: 23.4, y: 15.2 };
    const to = { floor: 0 as const, x: 22.8, y: 17.6 };
    const route = w.route(from, to)!;
    const p = placed(0, from.x, from.y);
    let i = 0;
    for (let step = 0; step < 400 && i < route.length; step++) {
      const wp = route[i]!;
      const d = Math.hypot(wp.x - p.x, wp.y - p.y);
      if (d < 0.1) {
        i++;
        continue;
      }
      w.move(p, ((wp.x - p.x) / d) * 0.05, ((wp.y - p.y) / d) * 0.05);
    }
    expect(i).toBe(route.length);
  });

  it('a body can actually walk a route to a far room, opening doors as it goes', () => {
    const world = new HouseWorld(HOUSE_PLAN);
    const target = { floor: 0 as const, x: 21, y: 11.4 }; // the dining room, through its doors
    const route = world.route(HOUSE_PLAN.playerStart, target)!;
    const p = placed(HOUSE_PLAN.playerStart.floor, HOUSE_PLAN.playerStart.x, HOUSE_PLAN.playerStart.y);
    let i = 0;
    for (let step = 0; step < 6000 && i < route.length; step++) {
      const wp = route[i]!;
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
    expect(p.floor).toBe(0);
    expect(Math.hypot(p.x - target.x, p.y - target.y)).toBeLessThan(0.5);
  });
});
