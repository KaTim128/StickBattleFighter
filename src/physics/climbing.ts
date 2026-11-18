/**
 * Jumping onto furniture, ledge grabs and fall damage (owner, 12/11/2026). Pure rules, no
 * renderer or physics: the scene feeds them the fighter's height and the furniture around it.
 *
 * - A fighter can land on any CLIMBABLE prop (its data says so: desks, tables, cabinets,
 *   counters, shelves) whose top it reaches in the air; it then stands on that top.
 * - A top too high to land on is GRABBED only by a real, long jump whose HEAD reaches the platform's edge, about
 *   halfway against its side (owner, 20/11/2026); the fighter then hangs and pulls up with repeated presses of Jump. A
 *   hit while climbing knocks it off. Jumping onto or between platforms never hangs: it lands.
 * - Falling never hurts (owner, 20/11/2026): a landing is only an animation, a knee bend or a firm squat.
 *
 * Owner, 13/11/2026 (traversal, falling and recovery): walking along neighbouring tops steps over a
 * small gap or a small height difference instead of dropping and hanging; every landing reacts to
 * the real drop (a knee bend, or a firm squat).
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
  /** Where the head is, above the feet, per metre of fighter scale (a grab happens when it meets the edge)... */
  headM: 1.6,
  /** ...but a giant's head is counted no higher than this above his feet (a 2 m shelf is waist-high to him). */
  headMaxM: 2,
  /** The head must be at least this far below the edge... */
  headBelowEdgeM: 0.45,
  /** ...and no further above it than this (about halfway up the platform's side, the edge at the head). */
  headAboveEdgeM: 0.3,
  /** The feet must still be this far below the top: with them level or above it, the fighter lands instead. */
  feetBelowTopM: 0.25,
  /** A grab needs a real jump: the body must have risen this far above where it took off (or half the jump's peak, if less). */
  minRiseM: 0.35,
  /** How close to the edge (beyond the body radius) a fighter must be to grab it. */
  grabGapM: 0.15,
  /** Each Jump press pulls this much of the way up; idle hands slip back slowly. */
  pullPerPress: 0.2,
  slipPerS: 0.08,
  /** Hanging: the feet sit this far below the top (per metre of fighter scale). */
  hangDepthM: 1.8,
  /** Below this a landing is only a knee bend; from here, a firm squat that holds briefly. */
  firmDropM: 1.4,
  /** The firm squat holds the fighter this long at the firm height, up to `firmHoldMaxS` for a long drop. */
  firmHoldMinS: 0.12,
  firmHoldMaxS: 0.32,
  /** Walking on a top, the feet still find a neighbouring top this far out (spans a small gap). */
  gapSupportM: 0.25,
  /** ...and step onto (or down to) a neighbour no more than this much higher or lower without a jump. */
  stepHeightM: 0.4,
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
 * Only after a real jump, with the feet below the top and the head at its edge (see `CLIMBING`).
 */
export function canGrab(
  s: ClimbSurface,
  at: { x: number; y: number },
  move: { x: number; y: number },
  body: { radiusM: number; heightM: number; floorM: number; peakM: number; scale: number; takeoffM: number },
): boolean {
  if (s.topM <= body.floorM + body.peakM + CLIMBING.stepUpM) return false; // just jump onto it
  // Only a real, long jump grabs: a short hop beside a platform just bumps it.
  if (body.heightM - body.takeoffM < Math.min(CLIMBING.minRiseM, body.peakM * 0.5)) return false;
  // The feet are still below the top (level with it or above, the fighter lands on it, never hangs)...
  if (body.heightM > s.topM - CLIMBING.feetBelowTopM) return false;
  // ...and the head has reached the edge: about halfway against the side of the platform.
  const head = body.heightM + Math.min(CLIMBING.headM * body.scale, CLIMBING.headMaxM);
  if (head < s.topM - CLIMBING.headBelowEdgeM) return false;
  if (head > s.topM + CLIMBING.headAboveEdgeM) return false;
  if (distanceTo(s, at.x, at.y) > body.radiusM + CLIMBING.grabGapM) return false;
  // Pushing towards it.
  const cx = Math.min(s.x1, Math.max(s.x0, at.x));
  const cy = Math.min(s.y1, Math.max(s.y0, at.y));
  const tx = cx - at.x;
  const ty = cy - at.y;
  const len = Math.hypot(tx, ty) || 1;
  return (move.x * tx + move.y * ty) / len > 0.5;
}

/**
 * What carries a walking fighter, `heightM` up and standing on `floorM`: the highest top under the
 * feet not above them; while on furniture, also a neighbouring top within `gapSupportM` and
 * `stepHeightM` (a small gap or step, so it walks across instead of dropping into the gap).
 */
export function supportUnder(
  surfaces: readonly ClimbSurface[],
  x: number,
  y: number,
  heightM: number,
  floorM: number,
  grounded: boolean,
): number {
  const onFurniture = grounded && floorM > 0;
  let best = 0;
  for (const s of surfaces) {
    const near = distanceTo(s, x, y);
    if (near === 0) {
      if (s.topM <= heightM + 0.02 && s.topM > best) best = s.topM;
      continue;
    }
    if (!onFurniture || near > CLIMBING.gapSupportM) continue;
    if (Math.abs(s.topM - floorM) > CLIMBING.stepHeightM) continue;
    if (s.topM > best) best = s.topM;
  }
  return best;
}

/** How a fighter lands after a drop: a knee bend, or a firm squat (never a collapse, never damage). */
export type LandingKind = 'soft' | 'firm';

export function landingKind(dropM: number): LandingKind {
  return dropM >= CLIMBING.firmDropM ? 'firm' : 'soft';
}

/** Seconds a firm squat holds the fighter (0 for a knee bend): longer for a longer drop, up to the maximum. */
export function firmHoldS(dropM: number): number {
  if (landingKind(dropM) !== 'firm') return 0;
  const k = Math.min(1, (dropM - CLIMBING.firmDropM) / FIRM_RANGE_M);
  return CLIMBING.firmHoldMinS + (CLIMBING.firmHoldMaxS - CLIMBING.firmHoldMinS) * k;
}

/** The drop over which a firm squat grows from its shortest hold to its longest. */
const FIRM_RANGE_M = 0.8;
