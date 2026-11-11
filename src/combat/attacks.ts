import type { AnimationState, MoveInput } from '../characters/schema';
import type { ImpactId } from '../data/combat/impacts';
import { distanceSqToBox, type OrientedRect } from '../core/oriented-rect';
/**
 * Attack definitions (data-driven, Combat specialist). An attack has three
 * phases: wind-up (anticipation), a short active window where the hit is
 * checked once, and recovery. Values live in each fighter's data.
 */
/** A move id from the fighter's Moveset Profile (TD-039). */
export type AttackId = string;

/** What kind of blow it is: `kick` and heavy `strike`s can break doors if strong enough. */
export type BlowKind = 'strike' | 'kick';

export interface AttackDef {
  readonly id: AttackId;
  readonly label: string;
  readonly blow: BlowKind;
  readonly windupS: number;
  readonly activeS: number;
  readonly recoveryS: number;
  /**
   * Point in the recovery (0..1) from which a buffered next press chains into
   * the next combo attack, so strings flow without returning to stance.
   */
  readonly chainAtRecovery: number;
  /** Distance from the body to the centre of the hit circle, along the facing direction. */
  readonly reachM: number;
  readonly hitRadiusM: number;
  /** Impact strength against objects (a door breaks at its breakStrength, 500 in the office). */
  readonly strength: number;
  /** Health damage before Power/Defence (PROVISIONAL, OQ-05). */
  readonly damage: number;
  /** Heavy hits knock the target down instead of making it flinch, and hit-stop longer. */
  readonly heavy: boolean;
  /** Speed a struck body is knocked back at, m/s. */
  readonly knockbackSpeedMps: number;
  /** Ground movement multiplier while attacking (air attacks keep their momentum). */
  readonly moveFactor: number;
  /** Forward lunge added at the strike, m/s (flying kick). */
  readonly lungeMps: number;
  /** Camera feedback on a landed hit (REQ-CAM-4, PRS-3). */
  /** How the contact feels and sounds (flash, sparks, recoil, hit-stop, shake): src/data/combat/impacts.ts. */
  readonly impact: ImpactId;
  readonly trauma: number;
  readonly zoomPunch: number;
  /** Which animation state shows it (the fighter's Animation Profile picks the clip). */
  readonly animationState: AnimationState;
  readonly category: 'punch' | 'kick';
  readonly aerial: boolean;
  /** Combo routes: the move that follows on each input. */
  readonly next: Partial<Record<MoveInput, string>>;
  /** Extra effect on contact (Effects library id). */
  readonly effect: string | null;
  /** Burn applied to the target on a clean hit. */
  readonly burn: { readonly dps: number; readonly durationS: number } | null;
  /** The target bounces off the floor. */
  readonly groundBounce: boolean;
}

export function attackDuration(a: {
  readonly windupS: number;
  readonly activeS: number;
  readonly recoveryS: number;
}): number {
  return a.windupS + a.activeS + a.recoveryS;
}

/**
 * An attack's hit area: a capsule from just in front of the body out to full
 * reach, so it hits anything along the strike's path, including things right
 * up against the attacker.
 */
export interface HitCapsule {
  readonly ax: number;
  readonly ay: number;
  readonly bx: number;
  readonly by: number;
  readonly radius: number;
}

export function hitCapsule(pos: { x: number; y: number }, facing: 1 | -1, a: AttackDef): HitCapsule {
  return { ax: pos.x + facing * 0.15, ay: pos.y, bx: pos.x + facing * a.reachM, by: pos.y, radius: a.hitRadiusM };
}

/** Distance from a point to the capsule's centre segment. */
export function distanceToCapsule(c: HitCapsule, x: number, y: number): number {
  const dx = c.bx - c.ax;
  const dy = c.by - c.ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - c.ax) * dx + (y - c.ay) * dy) / len2));
  return Math.hypot(x - (c.ax + dx * t), y - (c.ay + dy * t));
}

/** Does the capsule touch an axis-aligned rectangle? (Sampled along the segment; exact enough for 0.4 m+ radii.) */
export function capsuleTouchesRect(c: HitCapsule, r: OrientedRect): boolean {
  const samples = 6;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const x = c.ax + (c.bx - c.ax) * t;
    const y = c.ay + (c.by - c.ay) * t;
    if (distanceSqToBox(r, x, y) <= c.radius * c.radius) return true;
  }
  return false;
}
