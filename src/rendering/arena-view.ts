import { Container, Graphics } from 'pixi.js';
import type { ArenaLayout, Rect } from '../data/arenas/arena-layout';
import { kindOf } from '../data/objects/props';
import { DoorView } from './door-view';
import { buildPropView, propFootOffset } from './prop-view';
import { YSortLayer } from './y-sort-layer';

export interface ArenaView {
  /** Everything in world space (metres); the camera positions and scales it. */
  readonly world: Container;
  /** Props, walls and fighters, drawn in depth order (REQ-VIS-9). */
  readonly actors: YSortLayer;
  readonly doors: ReadonlyMap<string, DoorView>;
  readonly propCount: number;
  /** Standing props' views by their index in `arena.props`, so moving or broken props can follow the simulation. */
  readonly props: Map<number, Container>;
  destroy(): void;
}

export const INTERIOR_WALL_HEIGHT_M = 2.4;
/** Long walls are drawn in short blocks so fighters beside them still depth-sort correctly. */
const WALL_CHUNK_M = 0.5;

function floorLines(g: Graphics, r: Rect, spacing: number, planks: boolean): void {
  if (!planks) for (let x = r.x0 + spacing; x < r.x1; x += spacing) g.moveTo(x, r.y0).lineTo(x, r.y1);
  for (let y = r.y0 + spacing; y < r.y1; y += spacing) g.moveTo(r.x0, y).lineTo(r.x1, y);
  if (planks) {
    // staggered plank ends
    for (let y = r.y0, row = 0; y < r.y1; y += spacing, row++) {
      for (let x = r.x0 + (row % 2 ? 1.1 : 2.2); x < r.x1; x += 2.2)
        g.moveTo(x, y).lineTo(x, Math.min(r.y1, y + spacing));
    }
  }
}

/** Colour of an interior wall: the floor zone it borders may give it its own colour. */
function wallColour(arena: ArenaLayout, r: Rect): number {
  const zone = (arena.floorZones ?? []).find((z) => z.wall !== undefined && Math.abs(z.x0 - r.x1) < 0.05);
  return zone?.wall ?? arena.look.wall;
}

function wallChunk(x: number, y: number, w: number, d: number, top: number, front: number): Container {
  const h = INTERIOR_WALL_HEIGHT_M;
  const g = new Graphics()
    .rect(-w / 2, d / 2 - h, w, h)
    .fill(front)
    .rect(-w / 2, -d / 2 - h, w, d)
    .fill(top)
    .rect(-w / 2, -d / 2 - h, w, d + h)
    .stroke({ width: 0.02, color: 0x14181f, alpha: 0.6 });
  const c = new Container();
  c.label = 'interior-wall';
  c.addChild(g);
  c.position.set(x, y);
  return c;
}

/** Floor, floor zones, outer walls with windows, interior walls, doors and y-sorted props. */
export function buildArenaView(arena: ArenaLayout): ArenaView {
  const { widthM: w, heightM: h, wallThicknessM: t, look } = arena;
  const world = new Container();
  world.label = `world-${arena.id}`;

  const floor = new Graphics().rect(0, 0, w, h).fill(look.floor);
  world.addChild(floor);
  if (look.floorLines !== null) {
    const lines = new Graphics();
    floorLines(lines, { x0: 0, y0: 0, x1: w, y1: h }, look.floorLineSpacingM, false);
    world.addChild(lines.stroke({ width: 0.03, color: look.floorLines }));
  }
  for (const z of arena.floorZones ?? []) {
    world.addChild(new Graphics().rect(z.x0, z.y0, z.x1 - z.x0, z.y1 - z.y0).fill(z.floor));
    if (z.lines !== null) {
      const lines = new Graphics();
      floorLines(lines, z, z.lineSpacingM, z.planks ?? false);
      world.addChild(lines.stroke({ width: 0.025, color: z.lines }));
    }
  }

  // Rugs and other floor decals lie under everything that stands.
  for (const p of arena.props) if (kindOf(p.kind).decal) world.addChild(buildPropView(p));

  const walls = new Graphics()
    .rect(-t, -t, w + 2 * t, t)
    .rect(-t, h, w + 2 * t, t)
    .rect(-t, 0, t, h)
    .rect(w, 0, t, h)
    .fill(look.wall);
  for (const win of arena.windows ?? []) {
    walls.rect(win.x0, -t + 0.08, win.x1 - win.x0, t - 0.16).fill({ color: 0x9fd6ff, alpha: 0.85 });
    for (let x = win.x0 + 1.2; x < win.x1 - 0.1; x += 1.2)
      walls.rect(x - 0.03, -t + 0.08, 0.06, t - 0.16).fill(look.wall);
  }
  walls.rect(0, 0, w, h).stroke({ width: 0.06, color: look.wallEdge });
  world.addChild(walls);

  const actors = new YSortLayer();
  world.addChild(actors.container);
  const props = new Map<number, Container>();
  arena.props.forEach((p, i) => {
    if (kindOf(p.kind).decal) return;
    const view = buildPropView(p);
    props.set(i, view);
    actors.add(view, propFootOffset(p));
  });

  for (const r of arena.interiorWalls ?? []) {
    const front = wallColour(arena, r);
    const top = 0x9aa3b2;
    const ww = r.x1 - r.x0;
    for (let y = r.y0; y < r.y1 - 1e-6; y += WALL_CHUNK_M) {
      const d = Math.min(WALL_CHUNK_M, r.y1 - y);
      actors.add(wallChunk((r.x0 + r.x1) / 2, y + d / 2, ww, d, top, front), d / 2);
    }
  }

  const doors = new Map<string, DoorView>();
  for (const spec of arena.doors ?? []) {
    const view = new DoorView(spec, INTERIOR_WALL_HEIGHT_M);
    doors.set(spec.id, view);
    for (const part of view.parts) actors.add(part.node, part.footOffset);
  }

  return {
    world,
    actors,
    doors,
    propCount: arena.props.length,
    props,
    destroy() {
      for (const d of doors.values()) d.destroy();
      actors.destroy();
      world.destroy({ children: true });
    },
  };
}
