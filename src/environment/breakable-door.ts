import type { Collider } from '@dimforge/rapier2d';
import type { DoorSpec, Rect } from '../data/arenas/arena-layout';
import type { PhysicsWorld, Vec2 } from '../physics/physics-world';
import { distanceSqToBox, fromBoxFrame, toBoxFrame } from '../core/oriented-rect';
import { Debris } from './debris';

/**
 * Swinging, breakable door (owner requests, 11/11/2026). Starts closed and solid.
 *  - Walking into it swings it open, away from whoever pushed (REQ-ENV-13): the
 *    collider is removed while it is open, and it swings shut again once nobody
 *    has been near it for a moment. A brush or a shove (`contact` impact) never
 *    BREAKS it.
 *  - A `kick`, a heavy `strike` (combo finisher) or a heavy `knockback` impact at
 *    or above its break strength shatters it, open or shut: splinters fly in the
 *    direction of the blow and never block fighters (collision groups).
 */
export type ImpactKind = 'kick' | 'strike' | 'knockback' | 'contact';

export interface Impact {
  readonly kind: ImpactKind;
  /** Kick strength, or mass × speed for a knocked-back body. */
  readonly strength: number;
  /** Direction of the blow (unit vector). */
  readonly direction: Vec2;
}

/** The rule, on its own so it can be tested directly. */
export function impactBreaksDoor(impact: Impact, breakStrength: number): boolean {
  return impact.kind !== 'contact' && impact.strength >= breakStrength;
}

/** Does a circle (fighter, kick) touch a rectangle (door, prop), turned or not? */
export function circleTouchesRect(c: Vec2, radius: number, r: Rect): boolean {
  return distanceSqToBox(r, c.x, c.y) <= radius * radius;
}

/** Someone near or in the doorway, as the door sees them. */
export interface DoorTraffic {
  readonly x: number;
  readonly y: number;
  readonly radiusM: number;
  /** Where they are trying to move (input direction, length 0..1). */
  readonly moveX: number;
  readonly moveY: number;
}

/** Tuning for walking through (REQ-ENV-13). */
export const DOOR_SWING = {
  /** Push into it this long to swing it open (a brush does nothing). */
  pushToOpenS: 0.12,
  /** How firmly the push must point into the door (cosine). */
  pushDot: 0.4,
  /** It swings shut once nobody has been within this distance for `closeAfterS`. */
  clearanceM: 0.6,
  closeAfterS: 1.4,
  /** Time for a full swing, either way. */
  swingS: 0.22,
} as const;

const SPLINTERS = 7;
const DOOR_WOOD = 0xa8713a;

export class BreakableDoor {
  private collider: Collider | null;
  private readonly splinters: Debris;
  /** How the door broke, for tests and the debug hook. */
  brokenBy: ImpactKind | null = null;
  /** Open (walkable) right now. */
  open = false;
  /** 0 = shut, 1 = swung fully open (the drawn swing follows `open`). */
  swing = 0;
  /** +1 swings towards +normal (away from a pusher on the − side), −1 the other way. */
  swingSide = 1;
  private pushS = 0;
  private clearS = 0;

  constructor(
    readonly spec: DoorSpec,
    private readonly physics: PhysicsWorld,
  ) {
    this.splinters = new Debris(physics);
    this.collider = this.addCollider();
  }

  get broken(): boolean {
    return this.brokenBy !== null;
  }

  /** Does the door run along y (in a vertical wall)? Its normal is then x. */
  private get alongY(): boolean {
    return this.spec.y1 - this.spec.y0 >= this.spec.x1 - this.spec.x0;
  }

  /**
   * Walking through (REQ-ENV-13): a firm push into the closed door swings it
   * open away from the pusher; once open it stays open while anyone is in or
   * near the doorway, then swings shut and blocks again.
   */
  updateTraffic(traffic: readonly DoorTraffic[], stepS: number): void {
    if (this.broken) return;
    const r = this.spec;
    const cx = (r.x0 + r.x1) / 2;
    const cy = (r.y0 + r.y1) / 2;
    if (!this.open) {
      let pushing = 0;
      for (const t of traffic) {
        if (!circleTouchesRect(t, t.radiusM + 0.06, r)) continue;
        // Work in the door's own frame, so a turned door opens the same way.
        const p = toBoxFrame(r, t.x, t.y);
        const m = toBoxFrame(r, cx + t.moveX, cy + t.moveY);
        const toward = this.alongY ? Math.sign(cx - p.x) : Math.sign(cy - p.y);
        const along = this.alongY ? m.x - cx : m.y - cy;
        if (toward !== 0 && along * toward > DOOR_SWING.pushDot) pushing = toward;
      }
      this.pushS = pushing ? this.pushS + stepS : 0;
      if (pushing && this.pushS >= DOOR_SWING.pushToOpenS) {
        this.open = true;
        this.swingSide = pushing;
        this.clearS = 0;
        if (this.collider) this.physics.removeStatic(this.collider);
        this.collider = null;
      }
    } else {
      const near = traffic.some((t) => circleTouchesRect(t, t.radiusM + DOOR_SWING.clearanceM, r));
      this.clearS = near ? 0 : this.clearS + stepS;
      if (this.clearS >= DOOR_SWING.closeAfterS) {
        this.open = false;
        this.pushS = 0;
        this.collider = this.addCollider();
      }
    }
  }

  private addCollider(): Collider {
    const s = this.spec;
    return this.physics.addStaticBox({
      halfExtents: { x: (s.x1 - s.x0) / 2, y: (s.y1 - s.y0) / 2 },
      position: { x: (s.x0 + s.x1) / 2, y: (s.y0 + s.y1) / 2 },
      angleRad: s.angleRad ?? 0,
    });
  }

  /** Apply a blow. Returns true if this impact broke the door. */
  applyImpact(impact: Impact): boolean {
    if (this.broken || !impactBreaksDoor(impact, this.spec.breakStrength)) return false;
    this.brokenBy = impact.kind;
    this.open = false;
    if (this.collider) this.physics.removeStatic(this.collider);
    this.collider = null;

    // Splinters burst out along the blow, spread across the door, spinning, with a little hop.
    const { x0, x1, y0, y1 } = this.spec;
    const power = Math.min(2, impact.strength / this.spec.breakStrength);
    for (let i = 0; i < SPLINTERS; i++) {
      const f = (i + 0.5) / SPLINTERS;
      const spread = (f - 0.5) * 2; // -1..1 along the door
      const speed = (4 + ((i * 37) % 5)) * power;
      this.splinters.add({
        position: fromBoxFrame(this.spec, x0 + (x1 - x0) / 2, y0 + (y1 - y0) * f),
        halfExtents: { x: 0.22 + (i % 3) * 0.06, y: 0.05 },
        velocity: {
          x: impact.direction.x * speed - impact.direction.y * spread * 2,
          y: impact.direction.y * speed + impact.direction.x * spread * 2,
        },
        spin: (i % 2 ? 1 : -1) * (6 + i),
        massKg: 2,
        colour: DOOR_WOOD,
        heightM: 1 + (i % 3) * 0.3,
        verticalSpeedMps: 1.5 + (i % 4) * 0.6,
      });
    }
    return true;
  }

  /** Advance the splinters' fall to the floor (their floor-plane motion is physics). */
  update(stepS: number): void {
    const target = this.open ? 1 : 0;
    const d = stepS / DOOR_SWING.swingS;
    this.swing = this.swing < target ? Math.min(target, this.swing + d) : Math.max(target, this.swing - d);
    this.splinters.update(stepS);
  }

  get pieces(): { x: number; y: number; angle: number; heightM: number }[] {
    return this.splinters.pieces.map((s) => {
      const p = s.body.translation();
      return { x: p.x, y: p.y, angle: s.body.rotation(), heightM: s.heightM };
    });
  }
}
