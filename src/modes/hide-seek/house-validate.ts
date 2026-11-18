import { exitPoint, hideSpots } from './hiding';
import type { FloorIndex, HouseDef, Rect } from './house-types';
import { HouseWorld } from './world';

/**
 * One checklist for every house layout (owner, 18/11/2026: consistent standards for geometry,
 * collisions, AI perception and exits). It returns the problems found (an empty list is a sound
 * layout), so the same rules run over the authored plan and the scaled house, and over any house
 * added later. Pure: no renderer.
 */
export interface ValidateOptions {
  /** Clear floor in front of each door on both sides, metres (a hand's breadth either side of it). */
  readonly doorClearM: number;
  /** Least gap between two pieces of furniture, metres. */
  readonly spacingM: number;
}

export const DEFAULT_STANDARDS: ValidateOptions = { doorClearM: 0.75, spacingM: 0.08 };

const FLAT = new Set(['rug', 'lawn', 'path', 'curtain', 'shower-curtain']);
const gap = (a: Rect, b: Rect): number =>
  Math.max(Math.max(a.x0 - b.x1, b.x0 - a.x1), Math.max(a.y0 - b.y1, b.y0 - a.y1));
const overlap = (a: Rect, b: Rect, tol = 0): boolean =>
  Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > tol && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > tol;

export function validateHouse(house: HouseDef, opts: ValidateOptions = DEFAULT_STANDARDS): string[] {
  const problems: string[] = [];
  const world = new HouseWorld(house);
  const indoors = house.rooms.filter((r) => !r.outdoors);
  const outside = (floor: FloorIndex, x: number, y: number): boolean => {
    const r = world.roomAt(floor, x, y);
    return !r || r.outdoors === true;
  };

  // Rooms never overlap on a floor.
  for (const a of house.rooms)
    for (const b of house.rooms)
      if (a.id < b.id && a.floor === b.floor && overlap(a.rect, b.rect))
        problems.push(`rooms ${a.id} and ${b.id} overlap`);

  // Exits: the only way out is locked, so nobody leaves the house.
  for (const d of house.doors) if (d.exterior && !d.locked) problems.push(`exterior door ${d.id} is not locked`);

  // Furniture: inside a room, off the walls, spaced, and out of every doorway and off the stairs.
  const pieces = house.furniture.filter((f) => !FLAT.has(f.kind));
  for (const f of house.furniture) {
    if (f.kind === 'lawn' || f.kind === 'path') continue;
    const cx = (f.x0 + f.x1) / 2;
    const cy = (f.y0 + f.y1) / 2;
    if (!world.roomAt(f.floor, cx, cy)) problems.push(`${f.id} is outside every room`);
    if (f.solid)
      for (const w of house.walls)
        if (w.floor === f.floor && w.kind !== 'rail' && overlap(f, w, 0.02)) problems.push(`${f.id} overlaps a wall`);
  }
  for (let i = 0; i < pieces.length; i++)
    for (let j = i + 1; j < pieces.length; j++) {
      const a = pieces[i]!;
      const b = pieces[j]!;
      if (a.floor === b.floor && gap(a, b) < opts.spacingM) problems.push(`${a.id} and ${b.id} touch or overlap`);
    }
  for (const d of house.doors) {
    const horiz = d.rect.x1 - d.rect.x0 >= d.rect.y1 - d.rect.y0;
    const zone: Rect = horiz
      ? { x0: d.rect.x0 - 0.1, x1: d.rect.x1 + 0.1, y0: d.rect.y0 - opts.doorClearM, y1: d.rect.y1 + opts.doorClearM }
      : { x0: d.rect.x0 - opts.doorClearM, x1: d.rect.x1 + opts.doorClearM, y0: d.rect.y0 - 0.1, y1: d.rect.y1 + 0.1 };
    for (const f of house.furniture)
      if (f.solid && f.floor === d.floor && overlap(f, zone)) problems.push(`${f.id} blocks ${d.id}`);
  }
  for (const f of pieces)
    for (const s of house.stairs)
      if ((f.floor === s.bottomFloor || f.floor === s.topFloor) && gap(f, s.ramp) <= 0)
        problems.push(`${f.id} is on the stairs`);

  // Starts: free floor, indoors, the player by the front door, the hunter inside and apart.
  const free = (label: string, p: { floor: FloorIndex; x: number; y: number }): void => {
    if (!world.fits(p.floor, p.x, p.y)) problems.push(`${label} is not on free floor`);
    if (outside(p.floor, p.x, p.y)) problems.push(`${label} is not inside the house`);
  };
  free('player start', house.playerStart);
  const entry = house.hunterEntry;
  if (entry) {
    // He waits outside and comes in through the (locked, for everyone else) front door.
    const door = house.doors.find((d) => d.id === entry.doorId);
    if (!door?.exterior) problems.push(`the hunter's entrance ${entry.doorId} is not an outside door`);
    if (!world.fits(house.hunterStart.floor, house.hunterStart.x, house.hunterStart.y))
      problems.push('hunter start is not on free floor');
    if (!outside(house.hunterStart.floor, house.hunterStart.x, house.hunterStart.y))
      problems.push('the hunter starts inside although he enters through a door');
    free('hunter entrance end', entry.to);
  } else {
    free('hunter start', house.hunterStart);
  }
  for (const [i, p] of house.patrol.entries()) free(`patrol point ${i}`, p);
  const front = house.doors.find((d) => d.exterior);
  if (front) {
    const c = { x: (front.rect.x0 + front.rect.x1) / 2, y: (front.rect.y0 + front.rect.y1) / 2 };
    if (Math.hypot(house.playerStart.x - c.x, house.playerStart.y - c.y) > 5)
      problems.push('the player does not start near the front door');
  }
  if (Math.hypot(house.hunterStart.x - house.playerStart.x, house.hunterStart.y - house.playerStart.y) < 6)
    problems.push('the hunter starts too close to the player');

  // Every indoor room can be walked to from the start, upstairs too.
  for (const r of indoors) {
    const to = { floor: r.floor, x: (r.rect.x0 + r.rect.x1) / 2, y: (r.rect.y0 + r.rect.y1) / 2 };
    let found = false;
    for (let dy = -2; dy <= 2 && !found; dy += 0.5)
      for (let dx = -3; dx <= 3 && !found; dx += 0.5) {
        const p = { ...to, x: to.x + dx, y: to.y + dy };
        if (world.fits(p.floor, p.x, p.y, 0.4) && world.roomAt(p.floor, p.x, p.y)?.id === r.id) {
          found = world.route(house.playerStart, p) !== null;
          if (!found) break;
        }
      }
    if (!found) problems.push(`room ${r.id} cannot be reached from the player start`);
  }

  // Hiding places: indoors, with a free way out.
  for (const s of hideSpots(house)) {
    if (outside(s.floor, s.spec.at.x, s.spec.at.y)) problems.push(`${s.id} is not indoors`);
    const out = exitPoint(world, s);
    if (!world.fits(s.floor, out.x, out.y)) problems.push(`${s.id} has no free way out`);
  }
  return problems;
}
