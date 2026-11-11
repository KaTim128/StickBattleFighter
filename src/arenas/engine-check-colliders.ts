import type { RigidBody } from '@dimforge/rapier2d';
import { ENGINE_CHECK } from '../data/arenas/engine-check';
import type { PhysicsWorld } from '../physics/physics-world';
import { addGreyboxArenaColliders } from './greybox-arena-colliders';

/** Build the engine-check arena's colliders: four walls, the pillar footprints and the crate. */
export function addEngineCheckColliders(physics: PhysicsWorld): { crate: RigidBody } {
  addGreyboxArenaColliders(physics, ENGINE_CHECK);
  const c = ENGINE_CHECK.crateHalfSizeM;
  const crate = physics.addDynamicBox({
    halfExtents: { x: c, y: c },
    position: ENGINE_CHECK.crateStart,
    velocity: ENGINE_CHECK.crateVelocity,
    linearDamping: ENGINE_CHECK.crateDamping,
    angularDamping: ENGINE_CHECK.crateDamping,
    restitution: ENGINE_CHECK.crateRestitution,
    friction: ENGINE_CHECK.crateFriction,
  });
  return { crate };
}
