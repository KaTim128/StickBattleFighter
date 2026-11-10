import { Container, Graphics } from 'pixi.js';
import { ENGINE_CHECK } from '../data/arenas/engine-check';

/**
 * Draws the Phase 0 engine-check arena (2D top-down, GREYBOX ONLY) from the
 * shared data in src/data/arenas/engine-check.ts.
 */

export interface EngineCheckScene {
  /** Everything in world space (metres); position and scale it with the camera. */
  readonly world: Container;
  readonly crate: Container;
}

export function buildEngineCheckScene(): EngineCheckScene {
  const { arenaWidthM: w, arenaHeightM: h, wallThicknessM: t, crateHalfSizeM: c, colours } = ENGINE_CHECK;
  const world = new Container();
  world.label = 'world';

  const floor = new Graphics().rect(0, 0, w, h).fill(colours.floor);
  floor.label = 'greybox-floor';
  world.addChild(floor);

  const grid = new Graphics();
  for (let x = 1; x < w; x++) grid.moveTo(x, 0).lineTo(x, h);
  for (let y = 1; y < h; y++) grid.moveTo(0, y).lineTo(w, y);
  grid.stroke({ width: 0.03, color: colours.grid });
  world.addChild(grid);

  // Walls sit just outside the floor, matching the physics colliders.
  const walls = new Graphics()
    .rect(-t, -t, w + 2 * t, t)
    .rect(-t, h, w + 2 * t, t)
    .rect(-t, 0, t, h)
    .rect(w, 0, t, h)
    .fill(colours.wall)
    .rect(0, 0, w, h)
    .stroke({ width: 0.06, color: colours.wallEdge });
  walls.label = 'greybox-walls';
  world.addChild(walls);

  const crate = new Container();
  crate.label = 'greybox-crate';
  // A soft drop shadow offset "south" gives the top-down view some depth.
  const shadow = new Graphics().rect(-c + 0.12, -c + 0.18, c * 2, c * 2).fill({ color: colours.shadow, alpha: 0.3 });
  const body = new Graphics()
    .rect(-c, -c, c * 2, c * 2)
    .fill(colours.crate)
    .stroke({ width: 0.06, color: colours.crateEdge })
    .moveTo(-c, -c)
    .lineTo(c, c)
    .moveTo(c, -c)
    .lineTo(-c, c)
    .stroke({ width: 0.05, color: colours.crateEdge });
  crate.addChild(shadow, body);
  crate.position.set(ENGINE_CHECK.crateStart.x, ENGINE_CHECK.crateStart.y);
  world.addChild(crate);

  return { world, crate };
}
