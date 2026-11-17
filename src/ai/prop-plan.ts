/**
 * When an AI fighter picks up, approaches, carries and throws furniture (master plan Phase 1 B9: "AI
 * should also be able to throw furniture during battle"). Pure rules: the scene supplies what it
 * sees and acts on the answer through the same pickup and throw code the player uses.
 */

export type PropAction = 'none' | 'pickup' | 'approach' | 'throw' | 'hold';

export interface PropSituation {
  /** Carrying something now, and it is fully lifted. */
  readonly carryingReady: boolean;
  readonly carrying: boolean;
  /** Seconds it has held what it carries. */
  readonly heldS: number;
  /** Free to act (not stunned, attacking or casting). */
  readonly free: boolean;
  /** Distance to the target it can see, or null when it sees none. */
  readonly targetDistM: number | null;
  /** The target is roughly ahead (a throw goes where it faces). */
  readonly targetAhead: boolean;
  /** Distance to the nearest liftable object, or null when none is near. */
  readonly propDistM: number | null;
  /** Reach for picking something up (the lift reach). */
  readonly reachM: number;
  /** Seconds before it may go for another object. */
  readonly cooldownS: number;
  /** Uniform 0..1 roll. */
  readonly roll: number;
  /** Chance per second it wants to throw something (the difficulty). */
  readonly appetitePerS: number;
  readonly dtS: number;
  /** The furthest a throw reaches, metres. */
  readonly throwRangeM: number;
}

/** Closer than this it fights with its hands instead of reaching for furniture. */
export const PROP_MIN_TARGET_M = 2.6;
/** It will go for an object this far away. */
export const PROP_SEEK_M = 2.5;
/** Throwing closer than this just drops it on its own feet. */
export const THROW_MIN_M = 2;
/** Held this long without a good throw, it throws anyway or puts it down. */
export const HOLD_LIMIT_S = 4;

export function decideProp(s: PropSituation): PropAction {
  if (s.carrying) {
    if (!s.carryingReady) return 'hold';
    const inRange = s.targetDistM !== null && s.targetDistM >= THROW_MIN_M && s.targetDistM <= s.throwRangeM - 0.5;
    if (s.free && inRange && s.targetAhead) return 'throw';
    return s.heldS > HOLD_LIMIT_S ? 'throw' : 'hold';
  }
  if (!s.free || s.cooldownS > 0 || s.targetDistM === null || s.targetDistM < PROP_MIN_TARGET_M) return 'none';
  if (s.propDistM === null || s.propDistM > PROP_SEEK_M) return 'none';
  if (s.roll >= s.appetitePerS * s.dtS) return 'none';
  return s.propDistM <= s.reachM ? 'pickup' : 'approach';
}
