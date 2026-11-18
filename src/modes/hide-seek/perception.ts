import { exposure, type HideSpot } from './hiding';
import type { FloorIndex, Rect } from './house-types';
import type { HouseWorld, Point } from './world';

/**
 * What the hunter can see and hear (Phase 2, master plan sections G and I). Sight needs a clear line
 * inside a view cone; hiding, crouching and distance cut how much of the player he makes out; sounds
 * are quieter through walls and shut doors and across floors. Everything here reads the player's
 * BODY only: the peeking view origin never reaches this module (section C).
 */
export type Gait = 'walk' | 'tiptoe' | 'run';

export interface Vision {
  readonly rangeM: number;
  /** Half the width of the cone, radians. */
  readonly halfAngle: number;
}

/** Walking scans a broad cone; tiptoeing looks harder (wider, a bit closer); running has tunnel vision. */
export const VISION: Readonly<Record<Gait, Vision>> = {
  walk: { rangeM: 10, halfAngle: 0.95 },
  tiptoe: { rangeM: 8, halfAngle: 1.2 },
  run: { rangeM: 7, halfAngle: 0.7 },
};
/** Anything this close is sensed whichever way he faces (he feels it, hears it breathe). */
export const CLOSE_SENSE_M = 1.2;

export interface Eyes {
  readonly floor: FloorIndex;
  readonly x: number;
  readonly y: number;
  /** The direction he faces, radians (0 = +x). */
  readonly facing: number;
  readonly gait: Gait;
}

export interface BodyView {
  readonly floor: FloorIndex;
  readonly x: number;
  readonly y: number;
  readonly crouching: boolean;
  /** The hiding place the player is in, or null. */
  readonly hiding: HideSpot | null;
}

const wrap = (a: number): number => {
  let v = a;
  while (v > Math.PI) v -= Math.PI * 2;
  while (v < -Math.PI) v += Math.PI * 2;
  return v;
};

/**
 * Is this point inside the part of the house his eyes cover right now (range, cone and a clear line)?
 * The same test draws the vision cone, so what the player sees is what the hunter checks.
 */
export function coversPoint(
  world: HouseWorld,
  eyes: Eyes,
  floor: FloorIndex,
  p: Point,
  skip?: ReadonlySet<Rect>,
): boolean {
  if (floor !== eyes.floor) return false;
  const v = VISION[eyes.gait];
  const dx = p.x - eyes.x;
  const dy = p.y - eyes.y;
  const d = Math.hypot(dx, dy);
  if (d > v.rangeM) return false;
  if (d > CLOSE_SENSE_M && Math.abs(wrap(Math.atan2(dy, dx) - eyes.facing)) > v.halfAngle) return false;
  return world.lineOfSight(floor, eyes, p, {}, skip);
}

/**
 * How fast his awareness of the player fills this moment, per second (1 fills it in a second). Zero
 * when he cannot see the body. In the open at close range it fills in well under a second; crouching
 * and distance slow it; a hiding place cuts it by its concealment and by how he stands to its opening.
 */
export function sightRate(world: HouseWorld, eyes: Eyes, body: BodyView): number {
  // A hiding place's own walls do not hide its occupant from the sightline: its concealment does (below).
  const skip = body.hiding ? new Set<Rect>([body.hiding.rect]) : undefined;
  if (!coversPoint(world, eyes, body.floor, body, skip)) return 0;
  // Exposure already weighs distance and the side he looks from; in the open distance is weighed here.
  if (body.hiding) return exposure(body.hiding, eyes) * 1.2;
  const d = Math.hypot(body.x - eyes.x, body.y - eyes.y);
  const distance = d < 2.5 ? 2.4 : d < 5 ? 1.5 : d < 8 ? 0.8 : 0.4;
  return distance * (body.crouching ? 0.6 : 1);
}

/** How a sound reaches him: its strength at his ears (0 = nothing), after distance, walls, doors and floors. */
export function heardStrength(
  world: HouseWorld,
  ear: { floor: FloorIndex; x: number; y: number },
  source: { floor: FloorIndex; x: number; y: number; loudness: number },
): number {
  // A loud sound carries further: loudness 1 reaches about 18 m, 0.45 about 8 m, a crouching step about 2 m.
  const reachM = 18 * source.loudness;
  if (reachM <= 0) return 0;
  const d = Math.hypot(source.x - ear.x, source.y - ear.y);
  if (d >= reachM) return 0;
  const falloff = 1 - d / reachM;
  const sameFloor = source.floor === ear.floor;
  const pass = sameFloor ? world.soundTransmission(ear.floor, ear, source) : 0.4;
  return source.loudness * falloff * pass;
}

/** Quiet sounds are noticed but not acted on; louder ones are investigated. */
export const SUSPICIOUS = 0.07;
export const ALARMING = 0.3;

/**
 * The cone drawn on the floor: the real field he sees, clipped by walls and furniture along each
 * ray (so it never shows him seeing through them).
 */
export function visionPolygon(world: HouseWorld, eyes: Eyes, rays = 36): Point[] {
  const v = VISION[eyes.gait];
  const out: Point[] = [{ x: eyes.x, y: eyes.y }];
  for (let i = 0; i <= rays; i++) {
    const a = eyes.facing - v.halfAngle + (i / rays) * v.halfAngle * 2;
    const dir = { x: Math.cos(a), y: Math.sin(a) };
    let lo = 0;
    let hi = v.rangeM;
    // How far along this ray the line of sight reaches (bisection on the world's own sight test).
    if (world.lineOfSight(eyes.floor, eyes, { x: eyes.x + dir.x * hi, y: eyes.y + dir.y * hi })) lo = hi;
    else
      for (let k = 0; k < 10; k++) {
        const mid = (lo + hi) / 2;
        if (world.lineOfSight(eyes.floor, eyes, { x: eyes.x + dir.x * mid, y: eyes.y + dir.y * mid })) lo = mid;
        else hi = mid;
      }
    out.push({ x: eyes.x + dir.x * lo, y: eyes.y + dir.y * lo });
  }
  return out;
}
