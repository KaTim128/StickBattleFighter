/**
 * Top-down movement rules (Physics specialist; pure so they are unit-testable).
 * Velocity eases towards the stick direction × top speed: accelerating when
 * speeding up or turning, decelerating when the stick is released.
 */
export interface MovementTuning {
  /** Top speed in m/s (spec stat: Speed). */
  readonly maxSpeedMps: number;
  /** How fast speed builds, m/s² (spec stat: Mobility). */
  readonly accelMps2: number;
  /** How fast the fighter stops when the stick is released, m/s². */
  readonly decelMps2: number;
}

/** Hold sprint (default Shift) to run this much faster (owner, 11/11/2026; REQ-CTL-16). */
export const SPRINT = { speedFactor: 1.45 } as const;

export interface Vel {
  x: number;
  y: number;
}

/** One fixed step of velocity change. `move` must already be clamped to length ≤ 1. */
export function stepVelocity(current: Vel, move: Vel, tuning: MovementTuning, stepS: number): Vel {
  const target = { x: move.x * tuning.maxSpeedMps, y: move.y * tuning.maxSpeedMps };
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const gap = Math.hypot(dx, dy);
  if (gap === 0) return { x: target.x, y: target.y };
  const releasing = move.x === 0 && move.y === 0;
  const maxChange = (releasing ? tuning.decelMps2 : tuning.accelMps2) * stepS;
  if (gap <= maxChange) return { x: target.x, y: target.y };
  return { x: current.x + (dx / gap) * maxChange, y: current.y + (dy / gap) * maxChange };
}

export interface HopTuning {
  /** Launch speed of the jump hop, m/s. */
  readonly jumpSpeedMps: number;
  /** Pull back down during the hop, m/s² (not floor gravity: the floor plane has none). */
  readonly hopGravityMps2: number;
}

export interface HopState {
  /** Height above the floor in metres (drawn as a lifted figure over a ground shadow). */
  heightM: number;
  verticalSpeedMps: number;
  /**
   * What the feet stand on, metres above the floor (owner, 12/11/2026: fighters can stand on
   * furniture). 0 or absent = the floor. Stepping off a higher surface starts a fall.
   */
  floorM?: number;
  /** Seconds of coyote time left while falling (see `COYOTE_S`); absent when grounded or not yet started. */
  coyoteS?: number;
}

export function isAirborne(hop: HopState): boolean {
  return hop.heightM > (hop.floorM ?? 0) + 1e-4 || hop.verticalSpeedMps > 0;
}

/**
 * Coyote time (master plan Phase 1 B11): a jump still registers for this long after the fighter steps
 * off an edge (a furniture top, a ledge), so running off and jumping in the same breath works. It is
 * granted only when the fall begins from walking off, never while rising from a jump or a knock-up and
 * never after a jump, so it cannot become a double jump.
 */
export const COYOTE_S = 0.12;

/**
 * Whether a jump may start from this state: standing on something, or just stepped off it. `coyoteS`
 * is absent on the very first airborne step of a fall that began by walking off (a full window), and
 * counts down after that; it is 0 once a jump has been used or the fighter was launched upward.
 */
export function canStartJump(hop: HopState): boolean {
  if (!isAirborne(hop)) return true;
  if (hop.verticalSpeedMps > 0) return false;
  return hop.coyoteS === undefined || hop.coyoteS > 0;
}

/** One fixed step of the jump hop. A jump only starts from something to stand on (or just stepped off it). */
export function stepHop(hop: HopState, jumpPressed: boolean, tuning: HopTuning, stepS: number): HopState {
  let { heightM, verticalSpeedMps } = hop;
  const floorM = hop.floorM ?? 0;
  const start = jumpPressed && canStartJump(hop);
  if (start) verticalSpeedMps = tuning.jumpSpeedMps;
  if (heightM > floorM || verticalSpeedMps > 0) {
    verticalSpeedMps -= tuning.hopGravityMps2 * stepS;
    heightM += verticalSpeedMps * stepS;
    if (heightM <= floorM) {
      heightM = floorM;
      verticalSpeedMps = 0;
    }
  } else heightM = floorM;
  const next: HopState = floorM > 0 ? { heightM, verticalSpeedMps, floorM } : { heightM, verticalSpeedMps };
  if (isAirborne(next)) {
    // The window opens on the first step of a fall that began by walking off; a jump or an upward launch
    // spends it, and it then counts down.
    next.coyoteS = start
      ? 0
      : hop.coyoteS === undefined
        ? hop.verticalSpeedMps > 0
          ? 0
          : Math.max(0, COYOTE_S - stepS)
        : Math.max(0, hop.coyoteS - stepS);
  }
  return next;
}
