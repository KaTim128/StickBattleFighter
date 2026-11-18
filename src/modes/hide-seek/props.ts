import type { FloorIndex, PropKind, ThrowableDef } from './house-types';
import { circleHitsRect, type HouseWorld, type Point } from './world';

/**
 * Throwable distractions (Phase 2, master plan section E): bottles, cans and toys the player can pick
 * up and throw. The impact noise draws the hunter. Pure: the game state steps them.
 */
export type PropMode = 'rest' | 'carried' | 'flying';

export interface PropState {
  readonly id: string;
  readonly kind: PropKind;
  floor: FloorIndex;
  x: number;
  y: number;
  mode: PropMode;
  vx: number;
  vy: number;
  /** Distance flown so far this throw, metres. */
  flownM: number;
}

export const THROW_SPEED_MPS = 11;
export const THROW_RANGE_M = 8;
/** How close the player has to be to pick something up, metres. */
export const PICKUP_REACH_M = 1.0;
const PROP_RADIUS_M = 0.1;

/** How loud each lands, 0..1 (glass is loudest, a soft toy barely). */
export const IMPACT_LOUDNESS: Readonly<Record<PropKind, number>> = { bottle: 0.95, can: 0.75, toy: 0.35 };

export function initialProps(throwables: readonly ThrowableDef[]): PropState[] {
  return throwables.map((t) => ({
    id: t.id,
    kind: t.kind,
    floor: t.floor,
    x: t.x,
    y: t.y,
    mode: 'rest',
    vx: 0,
    vy: 0,
    flownM: 0,
  }));
}

/** Start a throw from a point in a direction. */
export function launch(p: PropState, from: Point, dir: Point): void {
  const len = Math.hypot(dir.x, dir.y) || 1;
  p.x = from.x;
  p.y = from.y;
  p.vx = (dir.x / len) * THROW_SPEED_MPS;
  p.vy = (dir.y / len) * THROW_SPEED_MPS;
  p.flownM = 0;
  p.mode = 'flying';
}

/**
 * Fly one step. Walls, shut doors and tall furniture stop it (low furniture it flies over). Returns the
 * spot it landed at when the flight ends this step, else null.
 */
export function flyStep(world: HouseWorld, p: PropState, dtS: number): Point | null {
  if (p.mode !== 'flying') return null;
  const blockers = world.sightBlockers(p.floor);
  const total = Math.hypot(p.vx, p.vy) * dtS;
  const n = Math.max(1, Math.ceil(total / 0.1));
  const sx = (p.vx * dtS) / n;
  const sy = (p.vy * dtS) / n;
  for (let i = 0; i < n; i++) {
    const nx = p.x + sx;
    const ny = p.y + sy;
    if (blockers.some((r) => circleHitsRect(nx, ny, PROP_RADIUS_M, r))) return land(p);
    p.x = nx;
    p.y = ny;
    p.flownM += Math.hypot(sx, sy);
    if (p.flownM >= THROW_RANGE_M) return land(p);
  }
  return null;
}

function land(p: PropState): Point {
  p.mode = 'rest';
  p.vx = 0;
  p.vy = 0;
  return { x: p.x, y: p.y };
}
