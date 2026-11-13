import { Container, Graphics } from 'pixi.js';
import { fromBoxFrame } from '../core/oriented-rect';
import type { ArenaLayout, Rect } from '../data/arenas/arena-layout';
import { kindOf } from '../data/objects/props';
import { DoorView } from './door-view';
import { face, faceQuad, isoBlock, shade } from './iso-draw';
import { drawPrism } from './prism';
import { FLOOR_MATRIX, iso } from './projection';
import { buildPropView, propFootOffset } from './prop-view';
import { YSortLayer } from './y-sort-layer';

export interface ArenaView {
  /** Everything in world space (metres); the camera positions and scales it. */
  readonly world: Container;
  /** Props, walls and fighters, drawn in depth order (REQ-VIS-9). */
  readonly actors: YSortLayer;
  readonly doors: ReadonlyMap<string, DoorView>;
  /** Flat things on the floor, in world metres through the floor projection (VFX scorch marks, rings). */
  readonly floor: Container;
  readonly propCount: number;
  /** Standing props' views by their index in `arena.props`, so moving or broken props can follow the simulation. */
  readonly props: Map<number, Container>;
  /** The drawn blocks of each interior wall, by its index in `arena.interiorWalls` (cracks, holes). */
  readonly walls: readonly (readonly Container[])[];
  /** Interior wall sections and door sections that can stand in front of a fighter (wall transparency). */
  readonly occluders: Container[];
  destroy(): void;
}

/**
 * Interior walls stand full height (owner, 11/11/2026: "a short wall makes the player think they can
 * jump over it"). In the 2.5D view a wall shows its face and the door is glass, so the doorway stays
 * easy to find (earlier the same day the walls were cut down to 0.8 m when the old view hid the door).
 */
export const INTERIOR_WALL_HEIGHT_M = 2.2;
/** Long walls are drawn in short blocks so fighters beside them still depth-sort correctly. */
const WALL_CHUNK_M = 0.5;
/** Back walls stand tall (they never hide the fight); front walls are cut to a low ledge. */
const BACK_WALL_M = 2.4;
const FRONT_LEDGE_M = 0.3;
/**
 * The outer walls' full height (owner, 13/11/2026: taller walls for a more enclosed arena, always
 * shown). The back walls stand solid; the front walls are faint glass with a faint top rail, so the
 * room stays readable and a fighter behind them is never hidden.
 */
const TALL_WALL_M = 4.5;
const FRONT_RISE_ALPHA = 0.12;
/** The front walls' solid top band (a rail that marks the enclosure without hiding the room). */
const FRONT_RAIL_M = 0.14;
const FRONT_RAIL_ALPHA = 0.3;
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
    const rel = corners.map((p) => iso(p.x - centre.x, p.y - centre.y));
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
    const at = iso(centre.x, centre.y);
    c.position.set(at.x, at.y);
    blocks.push({ node: c, footOffset: Math.max(...rel.map((p) => p.y)) });
  }
  return blocks;
}

/** Floor, floor zones, outer walls with windows, interior walls, doors and y-sorted props. */
export function buildArenaView(arena: ArenaLayout): ArenaView {
  const { widthM: w, heightM: h, wallThicknessM: t, look } = arena;
  const world = new Container();
  world.label = `world-${arena.id}`;
  // Everything flat on the floor is drawn in world metres through the floor projection (TD-045).
  const floorLayer = new Container();
  floorLayer.label = 'floor';
  floorLayer.setFromMatrix(FLOOR_MATRIX);
  world.addChild(floorLayer);

  // The base floor (skipped when a floor zone already covers the whole room: no double overdraw).
  const covered = (arena.floorZones ?? []).some((z) => !z.polygon && z.x0 <= 0 && z.y0 <= 0 && z.x1 >= w && z.y1 >= h);
  if (!covered) floorLayer.addChild(new Graphics().rect(0, 0, w, h).fill(look.floor));
  if (look.floorLines !== null) {
    const lines = new Graphics();
    floorLines(lines, { x0: 0, y0: 0, x1: w, y1: h }, look.floorLineSpacingM, false);
    floorLayer.addChild(lines.stroke({ width: 0.03, color: look.floorLines }));
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
    floorLayer.addChild(zone);
  }
  // Ambient occlusion where the floor meets the back walls: two thin bands (cheap: no full-floor overdraw).
  const ao = new Graphics()
    .rect(0, 0, w, 0.45)
    .fill({ color: 0x000000, alpha: 0.06 })
    .rect(0, 0, 0.45, h)
    .fill({ color: 0x000000, alpha: 0.06 })
    .rect(0, 0, w, 0.18)
    .fill({ color: 0x000000, alpha: 0.07 })
    .rect(0, 0, 0.18, h)
    .fill({ color: 0x000000, alpha: 0.07 });
  floorLayer.addChild(ao);

  // Rugs and other floor decals lie under everything that stands.
  for (const p of arena.props) if (kindOf(p.kind).decal) floorLayer.addChild(buildPropView(p));

  // Outer walls: the two at the back (north, west) stand tall with windows; the two in front are
  // cut down to a low ledge so they never hide the fight.
  const walls = new Graphics();
  isoBlock(walls, -t, -t, w + t, 0, 0, BACK_WALL_M, { colour: look.wall, top: look.wallEdge, edge: 0.4 });
  isoBlock(walls, -t, 0, 0, h + t, 0, BACK_WALL_M, { colour: look.wall, top: look.wallEdge, edge: 0.4 });
  for (const win of arena.windows ?? []) {
    const at = face.left(0);
    faceQuad(walls, at, win.x0, 0.9, win.x1, 2.0)
      .fill({ color: 0xbfe6ff, alpha: 0.9 })
      .stroke({ width: 0.04, color: 0xf2f6fa });
    for (let x = win.x0 + 1.2; x < win.x1 - 0.1; x += 1.2)
      faceQuad(walls, at, x - 0.03, 0.9, x + 0.03, 2.0).fill(0xf2f6fa);
    faceQuad(walls, at, win.x0 + 0.15, 1.75, win.x0 + 0.6, 1.95).fill({ color: 0xffffff, alpha: 0.45 }); // glint
  }
  // Skirting along the back walls' room faces.
  faceQuad(walls, face.left(0), 0, 0, w, SKIRTING_M).fill(SKIRTING);
  faceQuad(walls, face.right(0), 0, 0, h, SKIRTING_M).fill(shade(SKIRTING, 0.85));
  world.addChild(walls);
  const front = new Graphics();
  isoBlock(front, -t, h, w + t, h + t, 0, FRONT_LEDGE_M, { colour: look.wall, top: look.wallEdge, edge: 0.4 });
  isoBlock(front, w, -t, w + t, h, 0, FRONT_LEDGE_M, { colour: look.wall, top: look.wallEdge, edge: 0.4 });

  // The upper walls: the back walls extend upwards behind the room; the front walls rise over it.
  const backRise = new Graphics();
  world.addChildAt(backRise, world.getChildIndex(walls) + 1);
  const frontRise = new Graphics();
  const wallLook = { colour: look.wall, top: look.wallEdge, edge: 0.4 };
  isoBlock(backRise, -t, -t, w + t, 0, BACK_WALL_M, TALL_WALL_M, wallLook);
  isoBlock(backRise, -t, 0, 0, h + t, BACK_WALL_M, TALL_WALL_M, wallLook);
  const glass = { colour: look.wall, top: look.wallEdge, edge: 0.6, alpha: FRONT_RISE_ALPHA };
  isoBlock(frontRise, -t, h, w + t, h + t, FRONT_LEDGE_M, TALL_WALL_M, glass);
  isoBlock(frontRise, w, -t, w + t, h, FRONT_LEDGE_M, TALL_WALL_M, glass);
  const rail = { colour: look.wall, top: look.wallEdge, edge: 0.5, alpha: FRONT_RAIL_ALPHA };
  isoBlock(frontRise, -t, h, w + t, h + t, TALL_WALL_M - FRONT_RAIL_M, TALL_WALL_M, rail);
  isoBlock(frontRise, w, -t, w + t, h, TALL_WALL_M - FRONT_RAIL_M, TALL_WALL_M, rail);

  const actors = new YSortLayer();
  world.addChild(actors.container);
  world.addChild(front); // the low front ledges draw over everything standing inside the room
  world.addChild(frontRise);
  const props = new Map<number, Container>();
  arena.props.forEach((p, i) => {
    if (kindOf(p.kind).decal) return;
    const view = buildPropView(p);
    props.set(i, view);
    actors.add(view, propFootOffset(p, arena.props));
  });

  const occluders: Container[] = [];
  const wallNodes: Container[][] = [];
  for (const r of arena.interiorWalls ?? []) {
    const nodes: Container[] = [];
    for (const b of wallBlocks(r, 0xf4f0ea, r.colour ?? wallColour(arena, r))) {
      actors.add(b.node, b.footOffset);
      occluders.push(b.node);
      nodes.push(b.node);
    }
    wallNodes.push(nodes);
  }

  const doors = new Map<string, DoorView>();
  for (const spec of arena.doors ?? []) {
    const view = new DoorView(spec, INTERIOR_WALL_HEIGHT_M);
    doors.set(spec.id, view);
    floorLayer.addChild(view.floor); // mats lie on the floor
    for (const part of view.parts) {
      actors.add(part.node, part.footOffset);
      occluders.push(part.node);
    }
  }

  return {
    world,
    actors,
    floor: floorLayer,
    walls: wallNodes,
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
