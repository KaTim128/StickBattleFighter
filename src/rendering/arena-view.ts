import { Container, Graphics } from 'pixi.js';
import { fromBoxFrame } from '../core/oriented-rect';
import type { ArenaLayout, Rect } from '../data/arenas/arena-layout';
import { kindOf } from '../data/objects/props';
import { DoorView } from './door-view';
import { drawPrism } from './prism';
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
  /** Interior wall sections and door sections that can stand in front of a fighter (wall transparency). */
  readonly occluders: Container[];
  destroy(): void;
}

/**
 * Interior walls are drawn CUT AWAY (owner, 11/11/2026: "the player can't find the door"):
 * a top-down view draws height up the screen, so a full 2.4 m wall south of a doorway
 * covered the opening and showed the door 2 m above where you walk through. Low walls
 * keep doorways where they really are on the floor (REQ-ENV-13).
 */
export const INTERIOR_WALL_HEIGHT_M = 0.8;
/** Long walls are drawn in short blocks so fighters beside them still depth-sort correctly. */
const WALL_CHUNK_M = 0.5;
/** A light skirting board along the foot of interior walls. */
const SKIRTING = 0xd8d2c2;
const SKIRTING_M = 0.07;

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

/**
 * Cut an interior wall (turned or not) into short blocks along its length, so
 * fighters beside it still depth-sort correctly. Each block is drawn as a prism
 * on its own footprint, so a turned wall shows its sloping face.
 */
function wallBlocks(r: Rect, top: number, front: number): { node: Container; footOffset: number }[] {
  const alongY = r.y1 - r.y0 >= r.x1 - r.x0;
  const length = alongY ? r.y1 - r.y0 : r.x1 - r.x0;
  const n = Math.max(1, Math.ceil(length / WALL_CHUNK_M - 1e-6));
  const blocks: { node: Container; footOffset: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a0 = (alongY ? r.y0 : r.x0) + (length * i) / n;
    const a1 = (alongY ? r.y0 : r.x0) + (length * (i + 1)) / n;
    const local = alongY ? [r.x0, a0, r.x1, a1] : [a0, r.y0, a1, r.y1];
    const [lx0, ly0, lx1, ly1] = local as [number, number, number, number];
    const corners = [
      fromBoxFrame(r, lx0, ly0),
      fromBoxFrame(r, lx1, ly0),
      fromBoxFrame(r, lx1, ly1),
      fromBoxFrame(r, lx0, ly1),
    ];
    const centre = fromBoxFrame(r, (lx0 + lx1) / 2, (ly0 + ly1) / 2);
    const rel = corners.map((p) => ({ x: p.x - centre.x, y: p.y - centre.y }));
    const c = new Container();
    c.label = 'interior-wall';
    const g = drawPrism(new Graphics(), rel, INTERIOR_WALL_HEIGHT_M, { front, top, edge: 0x14181f, edgeWidth: 0 });
    // Seamless: outline and trim only the wall's long sides, never the joins between blocks.
    const hM = INTERIOR_WALL_HEIGHT_M;
    const long: [number, number][] = alongY
      ? [
          [1, 2],
          [3, 0],
        ]
      : [
          [0, 1],
          [2, 3],
        ];
    for (const [i, j] of long) {
      const p = rel[i]!;
      const q = rel[j]!;
      // The side nearer the camera shows its face: give it a skirting board and a floor line.
      if ((p.y + q.y) / 2 > 0) {
        g.poly([p.x, p.y, q.x, q.y, q.x, q.y - SKIRTING_M, p.x, p.y - SKIRTING_M]).fill(SKIRTING);
        g.moveTo(p.x, p.y).lineTo(q.x, q.y).stroke({ width: 0.02, color: 0x14181f, alpha: 0.6 });
      }
      g.moveTo(p.x, p.y - hM)
        .lineTo(q.x, q.y - hM)
        .stroke({ width: 0.025, color: 0x14181f, alpha: 0.7 });
    }
    c.addChild(g);
    c.position.set(centre.x, centre.y);
    blocks.push({ node: c, footOffset: Math.max(...rel.map((p) => p.y)) });
  }
  return blocks;
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
    const zone = new Container();
    const shape = () =>
      z.polygon ? new Graphics().poly([...z.polygon]) : new Graphics().rect(z.x0, z.y0, z.x1 - z.x0, z.y1 - z.y0);
    zone.addChild(shape().fill(z.floor));
    if (z.lines !== null) {
      const lines = new Graphics();
      floorLines(lines, z, z.lineSpacingM, z.planks ?? false);
      zone.addChild(lines.stroke({ width: 0.025, color: z.lines }));
      if (z.polygon) {
        // Lines are drawn over the bounds; the zone's outline trims them.
        const mask = shape().fill(0xffffff);
        zone.addChild(mask);
        lines.mask = mask;
      }
    }
    world.addChild(zone);
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

  const occluders: Container[] = [];
  for (const r of arena.interiorWalls ?? []) {
    for (const b of wallBlocks(r, 0x9aa3b2, r.colour ?? wallColour(arena, r))) {
      actors.add(b.node, b.footOffset);
      occluders.push(b.node);
    }
  }

  const doors = new Map<string, DoorView>();
  for (const spec of arena.doors ?? []) {
    const view = new DoorView(spec, INTERIOR_WALL_HEIGHT_M);
    doors.set(spec.id, view);
    world.addChildAt(view.floor, world.getChildIndex(actors.container)); // mats lie under everything standing
    for (const part of view.parts) {
      actors.add(part.node, part.footOffset);
      occluders.push(part.node);
    }
  }

  return {
    world,
    actors,
    doors,
    propCount: arena.props.length,
    props,
    occluders,
    destroy() {
      for (const d of doors.values()) d.destroy();
      actors.destroy();
      world.destroy({ children: true });
    },
  };
}
