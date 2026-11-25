import type { ArenaLayout, DoorSpec, FloorZone, WallRect } from '../data/arenas/arena-layout';
import { HOUSE_DOORS, HOUSE_FURNITURE, HOUSE_ROOMS, HOUSE_WALLS } from '../data/arenas/house';
import type { PropKindId, PropPlacement } from '../data/objects/props';
import { facingFor } from '../rendering/furniture-facing';
import { PLASTER_AGED } from '../rendering/house-decor';
import { floorColour } from '../rendering/house-view';

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

/**
 * Each house furniture kind becomes a real prop of the matching house kind. The prop is drawn with the house's own art (same drawings,
 * colours and facing as in Hide and Seek) and fights can move, throw and break it where its kind allows.
 */
const KIND_MAP: Readonly<Record<string, PropKindId>> = {
  sofa: 'house-sofa',
  armchair: 'house-armchair',
  'coffee-table': 'house-small-table',
  'side-table': 'house-small-table',
  'tv-console': 'house-storage',
  rug: 'house-rug',
  'floor-lamp': 'house-lamp',
  bookshelf: 'house-storage',
  cupboard: 'house-storage',
  chest: 'house-chest',
  sink: 'house-counter',
  stove: 'house-counter',
  counter: 'house-counter',
  fridge: 'house-storage',
  chair: 'house-chair',
  'dining-table': 'house-table',
};

const inside = (x0: number, y0: number, x1: number, y1: number): boolean =>
  x0 >= OX - EPS && y0 >= OY - EPS && x1 <= OX + W + EPS && y1 <= OY + H + EPS;

const GROUND_WALLS = HOUSE_WALLS.filter((w) => w.floor === 0);

function props(): PropPlacement[] {
  const out: PropPlacement[] = [];
  for (const f of HOUSE_FURNITURE) {
    if (f.floor !== 0 || !inside(f.x0, f.y0, f.x1, f.y1)) continue;
    const kind = KIND_MAP[f.kind];
    if (!kind) continue;
    out.push({
      kind,
      x: (f.x0 + f.x1) / 2 - OX,
      y: (f.y0 + f.y1) / 2 - OY,
      w: f.x1 - f.x0,
      d: f.y1 - f.y0,
      h: f.heightM,
      // The same facing the house gives it (a sofa faces its table, a chair its table, storage faces into the room).
      facing: facingFor(f, HOUSE_FURNITURE, GROUND_WALLS),
      house: { kind: f.kind, colour: f.colour, id: f.id },
    });
  }
  return out;
}

/** The inner walls of the ground floor: everything that is not the outer shell (the arena draws that) or the lot's fence. */
function walls(): WallRect[] {
  const out: WallRect[] = [];
  for (const wd of HOUSE_WALLS) {
    // The staircase's rail and the block under its landing are collision only in the house; the staircase prop replaces them.
    if (wd.floor !== 0 || wd.kind === 'fence' || wd.kind === 'rail' || wd.heightM === 3) continue;
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

/** The rooms keep the house's own floors: the same colours and board or tile lines as in Hide and Seek. */
function zones(): FloorZone[] {
  return HOUSE_ROOMS.filter((r) => r.floor === 0 && !r.outdoors).map((r) => {
    const tiled = r.id === 'kitchen';
    return {
      x0: r.rect.x0 - OX,
      y0: r.rect.y0 - OY,
      x1: r.rect.x1 - OX,
      y1: r.rect.y1 - OY,
      floor: floorColour(r),
      lines: shadeLine(floorColour(r)),
      lineSpacingM: tiled ? 0.9 : 0.55,
      ...(tiled ? {} : { planks: true }),
      wall: PLASTER_AGED,
    };
  });
}

const shadeLine = (c: number): number => {
  const ch = (s: number) => Math.round(((c >> s) & 0xff) * 0.78);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

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
    floor: 0x7a5f44,
    floorLines: 0x5f4a35,
    floorLineSpacingM: 0.5,
    wall: PLASTER_AGED,
    wallEdge: 0x6e6254,
  },
  greybox: true,
  floorZones: zones(),
  interiorWalls: walls(),
  doors: doors(),
};
