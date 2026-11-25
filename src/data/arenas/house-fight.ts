import type { PropKindId, PropPlacement } from '../objects/props';
import type { ArenaLayout, DoorSpec, FloorZone, WallRect } from './arena-layout';
import { HOUSE_DOORS, HOUSE_FURNITURE, HOUSE_ROOMS, HOUSE_WALLS } from './house';

/**
 * House of Nightmare, Fight mode (master spec 6, owner decision D6, 24/11/2026): the Hide and Seek house's GROUND FLOOR as an ordinary
 * fighting arena. The house's own data (rooms, walls, doors, furniture) is converted, so there is one source for both modes. The
 * staircase is closed, so fights stay on the ground floor (upstairs fighting is a later task), the front door stays locked, and the
 * furniture is real, breakable props. Hide and Seek itself is untouched.
 */
const OX = 15;
const OY = 9;
const W = 14;
const H = 12;
const T = 0.25;
const EPS = 0.02;

/** House furniture kinds mapped to the nearest real prop kind (movable, breakable and throwable where the prop says so). */
const KIND_MAP: Readonly<Record<string, PropKindId>> = {
  sofa: 'sofa',
  armchair: 'visitor-chair',
  'coffee-table': 'meeting-table',
  'tv-console': 'drawer-unit',
  rug: 'rug',
  'side-table': 'drawer-unit',
  'floor-lamp': 'plant',
  bookshelf: 'bookshelf',
  cupboard: 'cabinet',
  chest: 'drawer-unit',
  sink: 'kitchen-counter',
  stove: 'kitchen-counter',
  counter: 'kitchen-counter',
  fridge: 'cabinet',
  chair: 'office-chair',
  'dining-table': 'meeting-table',
};

const inside = (x0: number, y0: number, x1: number, y1: number): boolean =>
  x0 >= OX - EPS && y0 >= OY - EPS && x1 <= OX + W + EPS && y1 <= OY + H + EPS;

function props(): PropPlacement[] {
  const out: PropPlacement[] = [];
  for (const f of HOUSE_FURNITURE) {
    if (f.floor !== 0 || !inside(f.x0, f.y0, f.x1, f.y1)) continue;
    const kind = KIND_MAP[f.kind];
    if (!kind) continue;
    const w = f.x1 - f.x0;
    const d = f.y1 - f.y0;
    out.push({
      kind,
      x: (f.x0 + f.x1) / 2 - OX,
      y: (f.y0 + f.y1) / 2 - OY,
      w: Math.max(w, d),
      ...(d > w ? { rotated: true } : {}),
    });
  }
  return out;
}

/** The inner walls of the ground floor: everything that is not the outer shell (the arena draws that) or the lot's fence. */
function walls(): WallRect[] {
  const out: WallRect[] = [];
  for (const wd of HOUSE_WALLS) {
    if (wd.floor !== 0 || wd.kind === 'fence') continue;
    if (!inside(wd.x0, wd.y0, wd.x1, wd.y1)) continue;
    const onBoundary =
      (Math.abs((wd.x0 + wd.x1) / 2 - OX) < T && wd.y1 - wd.y0 > 1) ||
      (Math.abs((wd.x0 + wd.x1) / 2 - (OX + W)) < T && wd.y1 - wd.y0 > 1) ||
      (Math.abs((wd.y0 + wd.y1) / 2 - OY) < T && wd.x1 - wd.x0 > 1) ||
      (Math.abs((wd.y0 + wd.y1) / 2 - (OY + H)) < T && wd.x1 - wd.x0 > 1);
    if (onBoundary) continue;
    out.push({ x0: wd.x0 - OX, y0: wd.y0 - OY, x1: wd.x1 - OX, y1: wd.y1 - OY });
  }
  return out;
}

/** The stairwell, closed off: nobody can climb or fall through it (D6). */
const STAIRS_CLOSED: WallRect = { x0: 27.3 - OX, y0: 10.3 - OY, x1: 28.7 - OX, y1: 13.8 - OY };

function doors(): DoorSpec[] {
  return HOUSE_DOORS.filter((d) => d.floor === 0 && d.kind === 'door' && !d.locked).map((d) => ({
    id: d.id,
    x0: d.rect.x0 - OX,
    y0: d.rect.y0 - OY,
    x1: d.rect.x1 - OX,
    y1: d.rect.y1 - OY,
    breakStrength: 700,
  }));
}

function zones(): FloorZone[] {
  const style: Record<string, Pick<FloorZone, 'lines' | 'lineSpacingM' | 'planks' | 'wall'> & { floor: number }> = {
    kitchen: { floor: 0x8a9096, lines: 0x6a7076, lineSpacingM: 0.6, wall: 0xb8b2a4 },
    dining: { floor: 0x7a5a3a, lines: 0x5a4228, lineSpacingM: 0.4, planks: true, wall: 0xa89a86 },
    living: { floor: 0x6f5238, lines: 0x52391f, lineSpacingM: 0.4, planks: true, wall: 0x9a8a78 },
    hall: { floor: 0x5c574e, lines: 0x45413a, lineSpacingM: 0.6, wall: 0xa39a8c },
  };
  return HOUSE_ROOMS.filter((r) => r.floor === 0 && style[r.id]).map((r) => {
    const s = style[r.id]!;
    return {
      x0: r.rect.x0 - OX,
      y0: r.rect.y0 - OY,
      x1: r.rect.x1 - OX,
      y1: r.rect.y1 - OY,
      floor: s.floor,
      lines: s.lines,
      lineSpacingM: s.lineSpacingM,
      ...(s.planks ? { planks: true } : {}),
      wall: s.wall,
    };
  });
}

export const HOUSE_FIGHT: ArenaLayout = {
  id: 'house',
  name: 'House of Nightmare',
  widthM: W,
  heightM: H,
  wallThicknessM: 0.4,
  props: props(),
  playerStart: { x: 7.5, y: 8.5 },
  dummyStart: { x: 12, y: 8.5 },
  look: {
    background: 0x0d0b10,
    floor: 0x6f5238,
    floorLines: 0x52391f,
    floorLineSpacingM: 0.5,
    wall: 0x9a8a78,
    wallEdge: 0x6e6254,
  },
  greybox: true,
  floorZones: zones(),
  interiorWalls: [...walls(), STAIRS_CLOSED],
  doors: doors(),
};
