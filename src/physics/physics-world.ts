import RAPIER from '@dimforge/rapier3d-compat';

/** Standard Earth gravity in m/s² (simulation units are metres and seconds). */
export const GRAVITY_MPS2 = 9.81;

let initPromise: Promise<void> | null = null;

/** Load Rapier's WASM module once; safe to call repeatedly (TD-005). */
export function initPhysics(): Promise<void> {
  initPromise ??= RAPIER.init();
  return initPromise;
}

export interface BoxSpec {
  /** Half extents in metres. */
  readonly halfExtents: { x: number; y: number; z: number };
  readonly position: { x: number; y: number; z: number };
}

/**
 * Thin wrapper around a Rapier world. Owned by the Physics specialist; the
 * character controller, collision groups and query API arrive in Phase 1–2.
 */
export class PhysicsWorld {
  readonly world: RAPIER.World;

  constructor() {
    this.world = new RAPIER.World({ x: 0, y: -GRAVITY_MPS2, z: 0 });
  }

  /** A static, immovable box (floors, walls). */
  addStaticBox(spec: BoxSpec): RAPIER.Collider {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(spec.position.x, spec.position.y, spec.position.z),
    );
    const { x, y, z } = spec.halfExtents;
    return this.world.createCollider(RAPIER.ColliderDesc.cuboid(x, y, z), body);
  }

  /** A dynamic box that falls and collides. */
  addDynamicBox(spec: BoxSpec): RAPIER.RigidBody {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(spec.position.x, spec.position.y, spec.position.z),
    );
    const { x, y, z } = spec.halfExtents;
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(x, y, z), body);
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
