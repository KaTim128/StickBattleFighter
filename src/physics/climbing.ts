/**
 * Jumping onto furniture, ledge grabs and fall damage (owner, 12/11/2026). Pure rules, no
 * renderer or physics: the scene feeds them the fighter's height and the furniture around it.
 *
 * - A fighter can land on any CLIMBABLE prop (its data says so: desks, tables, cabinets,
 *   counters, shelves) whose top it reaches in the air; it then stands on that top.
 * - A top too high to land on but within reach of the hands is GRABBED: the fighter hangs from
 *   the edge and pulls up with repeated presses of Jump. A hit while climbing knocks it off.
 * - Landing from high enough hurts: more for a longer drop and for a heavier body.
 */

/** A climbable top: its footprint (axis-aligned, metres) and height. */
export interface ClimbSurface {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly topM: number;
}

export const CLIMBING = {
  /** A top this little above the jump's peak can still be landed on (the feet hook the edge). */
  stepUpM: 0.15,
  /** How far above the fighter's own height (feet) the hands reach, per metre of fighter scale. */
  reachM: 1.85,
  /** How close to the edge (beyond the body radius) a fighter must be to grab it. */
  grabGapM: 0.15,
  /** Each Jump press pulls this much of the way up; idle hands slip back slowly. */
  pullPerPress: 0.2,
  slipPerS: 0.08,
  /** Hanging: the feet sit this far below the top (per metre of fighter scale). */
  hangDepthM: 1.8,
  /** Drops shorter than this never hurt. */
  safeDropM: 1.3,
  /** Damage per metre of drop beyond the safe height, for a 70 kg fighter. */
  damagePerM: 70,
  /** Weight scaling: heavier bodies land harder (mass / 70 kg, to this power). */
  massExponent: 0.8,
  /** Above the floor this high, a fighter no longer bumps into furniture lower than its feet. */
  overFurnitureM: 0.3,
} as const;

/** The highest jump of a hop (v² / 2g). */
export function jumpPeakM(jumpSpeedMps: number, gravityMps2: number): number {
  return (jumpSpeedMps * jumpSpeedMps) / (2 * gravityMps2);
}

/** The highest surface whose footprint holds the point (the floor, 0, when none does). */
export function floorUnder(
  surfaces: readonly ClimbSurface[],
  x: number,
  y: number,
  belowM = Number.POSITIVE_INFINITY,
): number {
  let best = 0;
  for (const s of surfaces) {
    if (x < s.x0 || x > s.x1 || y < s.y0 || y > s.y1) continue;
    if (s.topM > best && s.topM <= belowM) best = s.topM;
  }
  return best;
}

/** Distance from a point to a footprint (0 inside). */
export function distanceTo(s: ClimbSurface, x: number, y: number): number {
  const dx = Math.max(s.x0 - x, 0, x - s.x1);
  const dy = Math.max(s.y0 - y, 0, y - s.y1);
  return Math.hypot(dx, dy);
}

/**
 * Can a fighter in the air, `heightM` up and pushing in direction `move`, grab this surface's edge?
 * Only when the top is too high to land on from this jump and within reach of the hands.
 */
export function canGrab(
  s: ClimbSurface,
  at: { x: number; y: number },
  move: { x: number; y: number },
  body: { radiusM: number; heightM: number; floorM: number; peakM: number; scale: number },
): boolean {
  if (s.topM <= body.floorM + body.peakM + CLIMBING.stepUpM) return false; // just jump onto it
  if (s.topM > body.heightM + CLIMBING.reachM * body.scale) return false; // out of reach
  if (distanceTo(s, at.x, at.y) > body.radiusM + CLIMBING.grabGapM) return false;
  // Pushing towards it.
  const cx = Math.min(s.x1, Math.max(s.x0, at.x));
  const cy = Math.min(s.y1, Math.max(s.y0, at.y));
  const tx = cx - at.x;
  const ty = cy - at.y;
  const len = Math.hypot(tx, ty) || 1;
  return (move.x * tx + move.y * ty) / len > 0.5;
}

/** Damage for landing after a drop of `dropM`, by body mass. */
export function fallDamage(dropM: number, massKg: number): number {
  if (dropM <= CLIMBING.safeDropM) return 0;
  return Math.round((dropM - CLIMBING.safeDropM) * CLIMBING.damagePerM * (massKg / 70) ** CLIMBING.massExponent);
}

/** How long a hard landing keeps the fighter down recovering, seconds. */
export function landingRecoveryS(dropM: number): number {
  return dropM <= CLIMBING.safeDropM ? 0 : Math.min(0.9, 0.25 + (dropM - CLIMBING.safeDropM) * 0.35);
}
