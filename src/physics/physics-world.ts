import RAPIER from '@dimforge/rapier2d-compat';

/**
 * 2D top-down physics (TD-021). The arena is seen from above, so there is no
 * gravity in the plane: fighters move freely up/down/left/right (front/back/
 * left/right) like Creature Clash. Units are metres and seconds.
 * Axes match the screen: +x = right, +y = down (towards the viewer's side).
 */

let initPromise: Promise<void> | null = null;

/** Load Rapier's WASM module once; safe to call repeatedly. */
export function initPhysics(): Promise<void> {
  initPromise ??= RAPIER.init();
  return initPromise;
}

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface BoxSpec {
  /** Half extents in metres. */
  readonly halfExtents: Vec2;
  readonly position: Vec2;
}

export interface DynamicBoxSpec extends BoxSpec {
  /** Initial velocity in m/s. */
  readonly velocity?: Vec2;
  /** Ground friction stand-in for top-down sliding (higher = stops sooner). */
  readonly linearDamping?: number;
  readonly angularDamping?: number;
  /** Bounciness against walls, 0..1. */
  readonly restitution?: number;
  /** Sliding friction against walls and other bodies (Rapier default 0.5). */
  readonly friction?: number;
}

/** Thin wrapper around a Rapier 2D world. Owned by the Physics specialist. */
export class PhysicsWorld {
  readonly world: RAPIER.World;

  constructor() {
    this.world = new RAPIER.World({ x: 0, y: 0 });
  }

  /** A static, immovable box (walls, furniture). */
  addStaticBox(spec: BoxSpec): RAPIER.Collider {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(spec.position.x, spec.position.y),
    );
    return this.world.createCollider(RAPIER.ColliderDesc.cuboid(spec.halfExtents.x, spec.halfExtents.y), body);
  }

  /** A dynamic box that slides, spins and bounces off walls. */
  addDynamicBox(spec: DynamicBoxSpec): RAPIER.RigidBody {
    const desc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(spec.position.x, spec.position.y)
      .setLinearDamping(spec.linearDamping ?? 0)
      .setAngularDamping(spec.angularDamping ?? 0)
      // Fast objects must not tunnel through thin walls.
      .setCcdEnabled(true);
    if (spec.velocity) desc.setLinvel(spec.velocity.x, spec.velocity.y);
    const body = this.world.createRigidBody(desc);
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(spec.halfExtents.x, spec.halfExtents.y).setRestitution(spec.restitution ?? 0)
        .setFriction(spec.friction ?? 0.5),
      body,
    );
    return body;
  }

  /** Advance the simulation by one fixed step. */
  step(stepS: number): void {
    this.world.timestep = stepS;
    this.world.step();
  }

  dispose(): void {
    this.world.free();
  }
}
