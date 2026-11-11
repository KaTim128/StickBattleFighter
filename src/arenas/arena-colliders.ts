import type { ArenaLayout } from '../data/arenas/arena-layout';
import { footprint, PROP_KINDS } from '../data/objects/props';
import type { PhysicsWorld } from '../physics/physics-world';

/** Walls just outside the floor plus a static box per solid prop footprint (Phase 4; dynamic in Phase 7). */
export function addArenaColliders(physics: PhysicsWorld, arena: ArenaLayout): void {
  const { widthM: w, heightM: h, wallThicknessM: t } = arena;
  physics.addStaticBox({ halfExtents: { x: w / 2 + t, y: t / 2 }, position: { x: w / 2, y: -t / 2 } });
  physics.addStaticBox({ halfExtents: { x: w / 2 + t, y: t / 2 }, position: { x: w / 2, y: h + t / 2 } });
  physics.addStaticBox({ halfExtents: { x: t / 2, y: h / 2 }, position: { x: -t / 2, y: h / 2 } });
  physics.addStaticBox({ halfExtents: { x: t / 2, y: h / 2 }, position: { x: w + t / 2, y: h / 2 } });
  for (const r of arena.interiorWalls ?? []) {
    physics.addStaticBox({
      halfExtents: { x: (r.x1 - r.x0) / 2, y: (r.y1 - r.y0) / 2 },
      position: { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 },
    });
  }
  // Doors are added by BreakableDoor (src/environment) so they can be removed when broken.
  for (const p of arena.props) {
    if (!PROP_KINDS[p.kind].solid || (p.elevationM ?? 0) > 0) continue;
    const f = footprint(p);
    physics.addStaticBox({ halfExtents: { x: f.w / 2, y: f.d / 2 }, position: { x: p.x, y: p.y } });
  }
}
