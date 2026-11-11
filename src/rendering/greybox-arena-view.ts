import { Container, Graphics } from 'pixi.js';
import type { GreyboxArena } from '../data/arenas/greybox-arena';
import { YSortLayer } from './y-sort-layer';

export interface GreyboxArenaView {
  /** Everything in world space (metres); the camera positions and scales it. */
  readonly world: Container;
  /** Objects standing on the floor, drawn in depth order (REQ-VIS-9). */
  readonly actors: YSortLayer;
  destroy(): void;
}

function buildPillar(arena: GreyboxArena): Container {
  const { pillarFootprintHalf: f, pillarHeightM: h, colours } = arena;
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

/** Floor, 1 m grid, walls and y-sorted pillars for any greybox arena. */
export function buildGreyboxArenaView(arena: GreyboxArena): GreyboxArenaView {
  const { arenaWidthM: w, arenaHeightM: h, wallThicknessM: t, colours } = arena;
  const world = new Container();
  world.label = 'world';

  world.addChild(new Graphics().rect(0, 0, w, h).fill(colours.floor));
  const grid = new Graphics();
  for (let x = 1; x < w; x++) grid.moveTo(x, 0).lineTo(x, h);
  for (let y = 1; y < h; y++) grid.moveTo(0, y).lineTo(w, y);
  world.addChild(grid.stroke({ width: 0.03, color: colours.grid }));

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
  for (const p of arena.pillars) {
    const pillar = buildPillar(arena);
    pillar.position.set(p.x, p.y);
    actors.add(pillar, arena.pillarFootprintHalf.y);
  }

  return {
    world,
    actors,
    destroy() {
      actors.destroy();
      world.destroy({ children: true });
    },
  };
}
