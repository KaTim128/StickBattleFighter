import type { RigidBody } from '@dimforge/rapier2d';
import { ENGINE_CHECK } from '../data/arenas/engine-check';
import type { PhysicsWorld } from '../physics/physics-world';

/** Build the engine-check arena's colliders: four walls, the pillar footprints and the crate. */
export function addEngineCheckColliders(physics: PhysicsWorld): { crate: RigidBody } {
  const { arenaWidthM: w, arenaHeightM: h, wallThicknessM: t, crateHalfSizeM: c } = ENGINE_CHECK;
  // Walls sit just outside the floor rectangle (0,0)–(w,h), matching the drawing.
  physics.addStaticBox({ halfExtents: { x: w / 2 + t, y: t / 2 }, position: { x: w / 2, y: -t / 2 } });
  physics.addStaticBox({ halfExtents: { x: w / 2 + t, y: t / 2 }, position: { x: w / 2, y: h + t / 2 } });
  physics.addStaticBox({ halfExtents: { x: t / 2, y: h / 2 }, position: { x: -t / 2, y: h / 2 } });
  physics.addStaticBox({ halfExtents: { x: t / 2, y: h / 2 }, position: { x: w + t / 2, y: h / 2 } });
  for (const pillar of ENGINE_CHECK.pillars) {
    physics.addStaticBox({ halfExtents: ENGINE_CHECK.pillarFootprintHalf, position: pillar });
  }
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
