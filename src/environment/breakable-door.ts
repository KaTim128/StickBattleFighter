import type { Collider, RigidBody } from '@dimforge/rapier2d';
import type { DoorSpec, Rect } from '../data/arenas/arena-layout';
import type { PhysicsWorld, Vec2 } from '../physics/physics-world';

/**
 * Breakable door (owner request, 11/11/2026). Starts closed and solid.
 *  - Walking, pushing or brushing against it (`contact`) never opens it.
 *  - Only a `kick`, a heavy `strike` (combo finisher) or a heavy `knockback`
 *    impact at or above its break
 *    strength shatters it: the collider is removed and splinters fly in the
 *    direction of the blow. Splinters never block fighters (collision groups).
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

/** Does a circle (fighter, kick) touch a rectangle (door)? */
export function circleTouchesRect(c: Vec2, radius: number, r: Rect): boolean {
  const dx = Math.max(r.x0 - c.x, 0, c.x - r.x1);
  const dy = Math.max(r.y0 - c.y, 0, c.y - r.y1);
  return dx * dx + dy * dy <= radius * radius;
}

interface Splinter {
  body: RigidBody;
  heightM: number;
  verticalSpeedMps: number;
}

const SPLINTERS = 7;
const SPLINTER_HOP_GRAVITY = 18;

export class BreakableDoor {
  private collider: Collider | null;
  private readonly splinters: Splinter[] = [];
  /** How the door broke, for tests and the debug hook. */
  brokenBy: ImpactKind | null = null;

  constructor(
    readonly spec: DoorSpec,
    private readonly physics: PhysicsWorld,
  ) {
    this.collider = physics.addStaticBox({
      halfExtents: { x: (spec.x1 - spec.x0) / 2, y: (spec.y1 - spec.y0) / 2 },
      position: { x: (spec.x0 + spec.x1) / 2, y: (spec.y0 + spec.y1) / 2 },
    });
  }

  get broken(): boolean {
    return this.brokenBy !== null;
  }

  /** Apply a blow. Returns true if this impact broke the door. */
  applyImpact(impact: Impact): boolean {
    if (this.broken || !impactBreaksDoor(impact, this.spec.breakStrength)) return false;
    this.brokenBy = impact.kind;
    if (this.collider) this.physics.removeStatic(this.collider);
    this.collider = null;

    // Splinters burst out along the blow, spread across the door, spinning, with a little hop.
    const { x0, x1, y0, y1 } = this.spec;
    const power = Math.min(2, impact.strength / this.spec.breakStrength);
    for (let i = 0; i < SPLINTERS; i++) {
      const f = (i + 0.5) / SPLINTERS;
      const spread = (f - 0.5) * 2; // -1..1 along the door
      const speed = (4 + ((i * 37) % 5)) * power;
      this.splinters.push({
        body: this.physics.addDebris({
          position: { x: x0 + (x1 - x0) / 2, y: y0 + (y1 - y0) * f },
          halfExtents: { x: 0.22 + (i % 3) * 0.06, y: 0.05 },
          velocity: {
            x: impact.direction.x * speed - impact.direction.y * spread * 2,
            y: impact.direction.y * speed + impact.direction.x * spread * 2,
          },
          spin: (i % 2 ? 1 : -1) * (6 + i),
          massKg: 2,
        }),
        heightM: 1 + (i % 3) * 0.3,
        verticalSpeedMps: 1.5 + (i % 4) * 0.6,
      });
    }
    return true;
  }

  /** Advance the splinters' fall to the floor (their floor-plane motion is physics). */
  update(stepS: number): void {
    for (const s of this.splinters) {
      if (s.heightM <= 0 && s.verticalSpeedMps <= 0) continue;
      s.verticalSpeedMps -= SPLINTER_HOP_GRAVITY * stepS;
      s.heightM = Math.max(0, s.heightM + s.verticalSpeedMps * stepS);
      if (s.heightM === 0) s.verticalSpeedMps = 0;
    }
  }

  get pieces(): { x: number; y: number; angle: number; heightM: number }[] {
    return this.splinters.map((s) => {
      const p = s.body.translation();
      return { x: p.x, y: p.y, angle: s.body.rotation(), heightM: s.heightM };
    });
  }
}
