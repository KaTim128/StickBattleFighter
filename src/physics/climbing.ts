/**
 * Jumping onto furniture, ledge grabs and fall damage (owner, 12/11/2026). Pure rules, no
 * renderer or physics: the scene feeds them the fighter's height and the furniture around it.
 *
 * - A fighter can land on any CLIMBABLE prop (its data says so: desks, tables, cabinets,
 *   counters, shelves) whose top it reaches in the air; it then stands on that top.
 * - A top too high to land on but within reach of the hands is GRABBED: the fighter hangs from
 *   the edge and pulls up with repeated presses of Jump. A hit while climbing knocks it off.
 * - Landing from high enough hurts: more for a longer drop and for a heavier body.
 *
 * Owner, 13/11/2026 (traversal, falling and recovery): walking along neighbouring tops steps over a
 * small gap or a small height difference instead of dropping and hanging; every landing reacts to
 * the real drop (a knee bend, a firm squat, or a collapse and get-up); walking off the tallest
 * furniture is safe, while jumping from it and falling further hurts, once per fall.
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
  /**
   * Drops shorter than this never hurt: walking off the tallest climbable furniture (a 2.1 m locker,
   * a 2 m bookshelf) is safe; jumping off one adds the jump's height and does hurt.
   */
  safeDropM: 2.2,
  /**
   * A drop this long or longer knocks the fighter flat (a collapse, then a get-up): every fall that
   * hurts, so the damage and the body impact always go together.
   */
  collapseDropM: 2.2,
  /** Below this a landing is only a knee bend; from here up to the collapse, a firm squat that holds briefly. */
  firmDropM: 1.4,
  /** The firm squat holds the fighter this long at the firm height, up to `firmHoldMaxS` just short of a collapse. */
  firmHoldMinS: 0.12,
  firmHoldMaxS: 0.32,
  /** How long a collapsed fighter lies before getting up: base plus per metre over the collapse height. */
  collapseLieS: 0.55,
  collapseLiePerM: 0.25,
  collapseLieMaxS: 1.2,
  /** Walking on a top, the feet still find a neighbouring top this far out (spans a small gap). */
  gapSupportM: 0.25,
  /** ...and step onto (or down to) a neighbour no more than this much higher or lower without a jump. */
  stepHeightM: 0.4,
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

/** How a fighter lands after a drop: a knee bend, a firm squat, or a collapse. */
export type LandingKind = 'soft' | 'firm' | 'collapse';

export function landingKind(dropM: number): LandingKind {
  if (dropM >= CLIMBING.collapseDropM) return 'collapse';
  return dropM >= CLIMBING.firmDropM ? 'firm' : 'soft';
}

/** Seconds a firm squat holds the fighter (0 for a knee bend). */
export function firmHoldS(dropM: number): number {
  if (landingKind(dropM) !== 'firm') return 0;
  const k = (dropM - CLIMBING.firmDropM) / (CLIMBING.collapseDropM - CLIMBING.firmDropM);
  return CLIMBING.firmHoldMinS + (CLIMBING.firmHoldMaxS - CLIMBING.firmHoldMinS) * k;
}

/** Seconds a collapsed fighter lies on the floor before getting up. */
export function collapseLieS(dropM: number): number {
  return Math.min(
    CLIMBING.collapseLieMaxS,
    CLIMBING.collapseLieS + Math.max(0, dropM - CLIMBING.collapseDropM) * CLIMBING.collapseLiePerM,
  );
}

/** Damage for landing after a drop of `dropM`, by body mass. */
export function fallDamage(dropM: number, massKg: number): number {
  if (dropM <= CLIMBING.safeDropM) return 0;
  return Math.round((dropM - CLIMBING.safeDropM) * CLIMBING.damagePerM * (massKg / 70) ** CLIMBING.massExponent);
}
