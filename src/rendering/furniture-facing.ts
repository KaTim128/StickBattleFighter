import type { FurnitureDef, Rect } from '../modes/hide-seek/house-types';

/**
 * Which way each piece of furniture faces (owner, 18/11/2026: furniture must not sit at a fixed
 * rotation: a sofa faces the table, a chair its table, a bed has its head to a wall, storage faces
 * into the room). Pure: it reads only the layout, so it works for any house.
 */
export type Facing = 'n' | 's' | 'e' | 'w';

const OPPOSITE: Record<Facing, Facing> = { n: 's', s: 'n', e: 'w', w: 'e' };
/** Seating looks at these, nearest first (a coffee table, else the television). */
const SEAT_FOCUS: readonly FurnitureDef['kind'][] = ['coffee-table', 'tv-console'];
const CHAIR_FOCUS: readonly FurnitureDef['kind'][] = ['dining-table', 'desk', 'garden-table'];
const SEATING = new Set<FurnitureDef['kind']>(['sofa', 'armchair']);

const centre = (r: Rect): { x: number; y: number } => ({ x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 });

/** The facing that points from one thing toward another (the dominant axis). */
export function toward(from: Rect, to: Rect): Facing {
  const a = centre(from);
  const b = centre(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'e' : 'w') : dy > 0 ? 's' : 'n';
}

/**
 * The side of a piece that stands against a wall (the nearest wall within `tol` metres), or null for
 * a free-standing piece.
 */
export function wallSide(f: Rect, walls: readonly Rect[], tol = 0.7): Facing | null {
  let best: { side: Facing; gap: number } | null = null;
  const consider = (side: Facing, gap: number): void => {
    if (gap >= -0.08 && gap <= tol && (!best || gap < best.gap)) best = { side, gap };
  };
  for (const w of walls) {
    const overlapsX = w.x1 > f.x0 + 0.05 && w.x0 < f.x1 - 0.05;
    const overlapsY = w.y1 > f.y0 + 0.05 && w.y0 < f.y1 - 0.05;
    if (overlapsX) {
      if (w.y1 <= f.y0 + 0.08) consider('n', f.y0 - w.y1);
      if (w.y0 >= f.y1 - 0.08) consider('s', w.y0 - f.y1);
    }
    if (overlapsY) {
      if (w.x1 <= f.x0 + 0.08) consider('w', f.x0 - w.x1);
      if (w.x0 >= f.x1 - 0.08) consider('e', w.x0 - f.x1);
    }
  }
  return (best as { side: Facing } | null)?.side ?? null;
}

function nearest(
  f: FurnitureDef,
  all: readonly FurnitureDef[],
  kinds: readonly FurnitureDef['kind'][],
  maxM: number,
): FurnitureDef | null {
  const c = centre(f);
  let best: { o: FurnitureDef; d: number } | null = null;
  for (const o of all) {
    if (o === f || o.floor !== f.floor || !kinds.includes(o.kind)) continue;
    const oc = centre(o);
    const d = Math.hypot(oc.x - c.x, oc.y - c.y);
    // Earlier kinds in the list win when they are in range at all (a coffee table beats the TV).
    const rank = kinds.indexOf(o.kind);
    if (
      d <= maxM &&
      (!best || rank < kinds.indexOf(best.o.kind) || (rank === kinds.indexOf(best.o.kind) && d < best.d))
    )
      best = { o, d };
  }
  return best?.o ?? null;
}

/** Which way a piece faces: toward what it is used with, else away from the wall behind it. */
export function facingFor(f: FurnitureDef, all: readonly FurnitureDef[], walls: readonly Rect[]): Facing {
  if (SEATING.has(f.kind)) {
    const focus = nearest(f, all, SEAT_FOCUS, 8);
    if (focus) return toward(f, focus);
  }
  if (f.kind === 'chair') {
    const focus = nearest(f, all, CHAIR_FOCUS, 4);
    if (focus) return toward(f, focus);
  }
  const wall = wallSide(f, walls);
  // A bed has its head to the wall, so it "faces" away from it like everything else against a wall.
  if (wall) return OPPOSITE[wall];
  if (SEATING.has(f.kind) || f.kind === 'chair') {
    // Free-standing seat with nothing to face: look toward the middle of the house's floor (south by default).
    return 's';
  }
  return 's';
}

/** The camera sees the south and east faces: a front on the north or west side shows only its back. */
export const frontVisible = (facing: Facing): boolean => facing === 's' || facing === 'e';
