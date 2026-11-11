import { Container, Graphics } from 'pixi.js';
import { ENGINE_CHECK } from '../data/arenas/engine-check';
import { YSortLayer } from './y-sort-layer';

/**
 * Draws the engine-check arena (2D top-down, GREYBOX ONLY) from the shared
 * data in src/data/arenas/engine-check.ts. World units are metres.
 */
export interface EngineCheckView {
  /** Everything in world space; the camera positions and scales it. */
  readonly world: Container;
  /** Objects that stand on the floor, drawn in depth order. */
  readonly actors: YSortLayer;
  readonly crate: Container;
  destroy(): void;
}

function buildPillar(): Container {
  const { pillarFootprintHalf: f, pillarHeightM: h, colours } = ENGINE_CHECK;
  const pillar = new Container();
  pillar.label = 'greybox-pillar';
  // Origin = centre of the footprint on the floor; the body rises up the screen.
  const shadow = new Graphics()
    .ellipse(0.15, f.y * 0.6, f.x * 1.3, f.y * 0.8)
    .fill({ color: colours.shadow, alpha: 0.3 });
  const front = new Graphics()
    .rect(-f.x, -h + f.y, f.x * 2, h)
    .fill(colours.pillarFront)
    .stroke({ width: 0.05, color: colours.pillarEdge });
  const top = new Graphics()
    .rect(-f.x, -h - f.y, f.x * 2, f.y * 2)
    .fill(colours.pillarTop)
    .stroke({ width: 0.05, color: colours.pillarEdge });
  pillar.addChild(shadow, front, top);
  return pillar;
}

export function buildEngineCheckView(): EngineCheckView {
  const { arenaWidthM: w, arenaHeightM: h, wallThicknessM: t, crateHalfSizeM: c, colours } = ENGINE_CHECK;
  const world = new Container();
  world.label = 'world';

  world.addChild(new Graphics().rect(0, 0, w, h).fill(colours.floor));
  const grid = new Graphics();
  for (let x = 1; x < w; x++) grid.moveTo(x, 0).lineTo(x, h);
  for (let y = 1; y < h; y++) grid.moveTo(0, y).lineTo(w, y);
  world.addChild(grid.stroke({ width: 0.03, color: colours.grid }));

  // Walls sit just outside the floor, matching the physics colliders.
  world.addChild(
    new Graphics()
      .rect(-t, -t, w + 2 * t, t)
      .rect(-t, h, w + 2 * t, t)
      .rect(-t, 0, t, h)
      .rect(w, 0, t, h)
      .fill(colours.wall)
      .rect(0, 0, w, h)
      .stroke({ width: 0.06, color: colours.wallEdge }),
  );

  const actors = new YSortLayer();
  world.addChild(actors.container);

  for (const p of ENGINE_CHECK.pillars) {
    const pillar = buildPillar();
    pillar.position.set(p.x, p.y);
    actors.add(pillar, ENGINE_CHECK.pillarFootprintHalf.y);
  }

  const crate = new Container();
  crate.label = 'greybox-crate';
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
  actors.add(crate, c);

  return {
    world,
    actors,
    crate,
    destroy() {
      actors.destroy();
      world.destroy({ children: true });
    },
  };
}
