import type { GreyboxArena } from '../data/arenas/greybox-arena';
import type { PhysicsWorld } from '../physics/physics-world';

/** Four walls just outside the floor rectangle plus a static footprint per pillar. */
export function addGreyboxArenaColliders(physics: PhysicsWorld, arena: GreyboxArena): void {
  const { arenaWidthM: w, arenaHeightM: h, wallThicknessM: t } = arena;
  physics.addStaticBox({ halfExtents: { x: w / 2 + t, y: t / 2 }, position: { x: w / 2, y: -t / 2 } });
  physics.addStaticBox({ halfExtents: { x: w / 2 + t, y: t / 2 }, position: { x: w / 2, y: h + t / 2 } });
  physics.addStaticBox({ halfExtents: { x: t / 2, y: h / 2 }, position: { x: -t / 2, y: h / 2 } });
  physics.addStaticBox({ halfExtents: { x: t / 2, y: h / 2 }, position: { x: w + t / 2, y: h / 2 } });
  for (const pillar of arena.pillars) {
    physics.addStaticBox({ halfExtents: arena.pillarFootprintHalf, position: pillar });
  }
}
