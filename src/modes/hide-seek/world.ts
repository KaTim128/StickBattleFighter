import { NavGrid } from '../../ai/nav-grid';
import type { DoorDef, FloorIndex, FurnitureDef, HouseDef, Rect, RoomDef, StairDef, WallDef } from './house-types';

/**
 * The Hide and Seek world (Phase 2, TD-095): pure, deterministic collision, stairs, doors, rooms,
 * sightlines and cross-floor routing for the house. No renderer, no physics engine; the scene and
 * the hunter AI both ask this one object, so what the player can walk through is what the hunter
 * can walk through, and what blocks sight blocks it for both.
 */
export const FLOOR_HEIGHT_M = 3;
/** The body's radius, metres (the player and the hunter). */
export const BODY_RADIUS_M = 0.28;

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Where a body is: which floor, where on it, and its height above that floor (negative on a ramp it has not reached the top of). */
export interface Placed {
  floor: FloorIndex;
  x: number;
  y: number;
  /** Height above the floor it stands on (a ramp lifts or lowers it). */
  z: number;
  /** On the staircase ramp now. */
  onStairs: string | null;
}

export interface Waypoint {
  readonly floor: FloorIndex;
  readonly x: number;
  readonly y: number;
  /** This waypoint is a stair end: climbing or descending to the other floor. */
  readonly stairs?: 'up' | 'down';
}

const POP_UP = 0.88; // before the wall block at the ramp's head stops a body (its radius keeps it short of t = 1)
const POP_DOWN = 0.03;

export const insideRect = (r: Rect, x: number, y: number): boolean => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
export const rectArea = (r: Rect): number => (r.x1 - r.x0) * (r.y1 - r.y0);

/** Does a circle overlap a rectangle? */
export function circleHitsRect(x: number, y: number, radius: number, r: Rect): boolean {
  const nx = Math.min(r.x1, Math.max(r.x0, x));
  const ny = Math.min(r.y1, Math.max(r.y0, y));
  return (x - nx) ** 2 + (y - ny) ** 2 < radius * radius;
}

/** Does the segment a to b cross a rectangle (slab test)? */
export function segmentHitsRect(a: Point, b: Point, r: Rect): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  for (const [p, q, lo, hi] of [
    [dx, a.x, r.x0, r.x1],
    [dy, a.y, r.y0, r.y1],
  ] as const) {
    if (Math.abs(p) < 1e-9) {
      if (q < lo || q > hi) return false;
    } else {
      let ta = (lo - q) / p;
      let tb = (hi - q) / p;
      if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta);
      t1 = Math.min(t1, tb);
      if (t0 > t1) return false;
    }
  }
  return true;
}

export interface SightOptions {
  /** Furniture that blocks sight is skipped when the viewer is looking over low things only. */
  readonly ignoreFurniture?: boolean;
}

export class HouseWorld {
  private readonly open = new Map<string, boolean>();
  private readonly unlocked = new Set<string>();
  private readonly navs: [NavGrid, NavGrid];
  private readonly wallsBy: [WallDef[], WallDef[]] = [[], []];
  private readonly furnitureBy: [FurnitureDef[], FurnitureDef[]] = [[], []];
  private readonly doorsBy: [DoorDef[], DoorDef[]] = [[], []];

  constructor(readonly house: HouseDef) {
    for (const w of house.walls) this.wallsBy[w.floor].push(w);
    for (const f of house.furniture) this.furnitureBy[f.floor].push(f);
    for (const d of house.doors) {
      this.doorsBy[d.floor].push(d);
      this.open.set(d.id, d.open);
    }
    this.navs = [new NavGrid(house.widthM, house.heightM, 0.4), new NavGrid(house.widthM, house.heightM, 0.4)];
    this.rebuildNav();
  }

  // ---------------------------------------------------------------- doors
  isOpen(id: string): boolean {
    return this.open.get(id) ?? true;
  }

  /** A door that never opens: locked in its data, unless it has been unlocked for the hunter's entrance. */
  isLocked(id: string): boolean {
    return (this.house.doors.find((x) => x.id === id)?.locked ?? false) && !this.unlocked.has(id);
  }

  /** Unlock a locked door for a moment (the hunter's entrance), or lock it again. */
  setUnlocked(id: string, on: boolean): void {
    if (on) this.unlocked.add(id);
    else this.unlocked.delete(id);
  }

  /** Every door back as authored: shut or open as it started, locked ones locked. */
  resetDoors(): void {
    this.unlocked.clear();
    for (const d of this.house.doors) this.open.set(d.id, d.open);
  }

  /** Set a door open or shut; returns whether anything changed. Arches never close. */
  setDoor(id: string, open: boolean): boolean {
    const d = this.house.doors.find((x) => x.id === id);
    if (!d || d.kind === 'arch' || this.isLocked(id) || this.open.get(id) === open) return false;
    this.open.set(id, open);
    return true;
  }

  door(id: string): DoorDef | undefined {
    return this.house.doors.find((d) => d.id === id);
  }

  /** Closed doors on a floor (they block movement, sight and most sound until opened). */
  closedDoors(floor: FloorIndex): DoorDef[] {
    return this.doorsBy[floor].filter((d) => !this.isOpen(d.id));
  }

  // ---------------------------------------------------------------- rooms
  /** The room a point is in: the smallest one that contains it. */
  roomAt(floor: FloorIndex, x: number, y: number): RoomDef | null {
    let best: RoomDef | null = null;
    for (const r of this.house.rooms) {
      if (r.floor !== floor || !insideRect(r.rect, x, y)) continue;
      if (!best || rectArea(r.rect) < rectArea(best.rect)) best = r;
    }
    return best;
  }

  room(id: string): RoomDef | undefined {
    return this.house.rooms.find((r) => r.id === id);
  }

  /** Rooms reached from `id` through a door or arch (open or shut) or by open lawn (yards). */
  neighbours(id: string): string[] {
    const out = new Set<string>();
    for (const d of this.house.doors) {
      if (d.between[0] === id) out.add(d.between[1]);
      if (d.between[1] === id) out.add(d.between[0]);
    }
    const me = this.room(id);
    if (me?.outdoors) {
      for (const r of this.house.rooms) {
        if (r.id === id || !r.outdoors || r.floor !== me.floor) continue;
        if (rectsTouch(me.rect, r.rect)) out.add(r.id);
      }
    }
    // The stairs join the hall and the upstairs hallway.
    for (const s of this.house.stairs) {
      const bottom = this.roomAt(s.bottomFloor, (s.ramp.x0 + s.ramp.x1) / 2, s.ramp.y1 + 0.3);
      const top = this.roomAt(s.topFloor, (s.ramp.x0 + s.ramp.x1) / 2, s.ramp.y0 - 0.3);
      if (bottom && top && bottom.id === id) out.add(top.id);
      if (bottom && top && top.id === id) out.add(bottom.id);
    }
    return [...out];
  }

  // ---------------------------------------------------------------- obstacles
  /** Everything that stops a body on a floor: walls, rails, solid furniture, shut doors. */
  obstacles(floor: FloorIndex): Rect[] {
    const out: Rect[] = [];
    for (const w of this.wallsBy[floor]) out.push(w);
    for (const f of this.furnitureBy[floor]) if (f.solid) out.push(f);
    for (const d of this.closedDoors(floor)) out.push(d.rect);
    return out;
  }

  furniture(floor: FloorIndex): readonly FurnitureDef[] {
    return this.furnitureBy[floor];
  }

  walls(floor: FloorIndex): readonly WallDef[] {
    return this.wallsBy[floor];
  }

  /** Does a body at (x, y) fit (no overlap with anything solid)? */
  fits(floor: FloorIndex, x: number, y: number, radius = BODY_RADIUS_M, ignore?: ReadonlySet<Rect>): boolean {
    if (x < radius || y < radius || x > this.house.widthM - radius || y > this.house.heightM - radius) return false;
    for (const r of this.obstacles(floor)) {
      if (ignore?.has(r)) continue;
      if (circleHitsRect(x, y, radius, r)) return false;
    }
    return true;
  }

  /**
   * Move a body by (dx, dy) on its floor, sliding along walls. Returns the shut door it pushed
   * against, if any (the caller opens it: a person opens a door by walking into it).
   */
  move(p: Placed, dx: number, dy: number, radius = BODY_RADIUS_M): { pushedDoor: string | null } {
    let pushed: string | null = null;
    const tryAxis = (nx: number, ny: number): boolean => {
      if (this.fits(p.floor, nx, ny, radius)) {
        p.x = nx;
        p.y = ny;
        return true;
      }
      return false;
    };
    if (dx !== 0 && !tryAxis(p.x + dx, p.y)) pushed = this.doorAt(p.floor, p.x + dx, p.y, radius) ?? pushed;
    if (dy !== 0 && !tryAxis(p.x, p.y + dy)) pushed = this.doorAt(p.floor, p.x, p.y + dy, radius) ?? pushed;
    this.updateStairs(p);
    return { pushedDoor: pushed };
  }

  private doorAt(floor: FloorIndex, x: number, y: number, radius: number): string | null {
    for (const d of this.closedDoors(floor))
      if (!this.isLocked(d.id) && circleHitsRect(x, y, radius + 0.05, d.rect)) return d.id;
    return null;
  }

  // ---------------------------------------------------------------- stairs
  stairAt(p: { floor: FloorIndex; x: number; y: number }): StairDef | null {
    for (const s of this.house.stairs) {
      if (p.floor !== s.bottomFloor && p.floor !== s.topFloor) continue;
      if (insideRect(s.ramp, p.x, p.y)) return s;
    }
    return null;
  }

  /** 0 at the bottom of a ramp, 1 at the top. */
  rampT(s: StairDef, x: number, y: number): number {
    const r = s.ramp;
    switch (s.rises) {
      case 'n':
        return (r.y1 - y) / (r.y1 - r.y0);
      case 's':
        return (y - r.y0) / (r.y1 - r.y0);
      case 'w':
        return (r.x1 - x) / (r.x1 - r.x0);
      default:
        return (x - r.x0) / (r.x1 - r.x0);
    }
  }

  /** Where a body stands once it steps off a ramp's end: just beyond the top or the bottom. */
  private rampExit(s: StairDef, top: boolean): Point {
    const r = s.ramp;
    const cx = (r.x0 + r.x1) / 2;
    const cy = (r.y0 + r.y1) / 2;
    const off = top ? 0.5 : 0.45;
    switch (s.rises) {
      case 'n':
        return top ? { x: cx, y: r.y0 - off } : { x: cx, y: r.y1 + off };
      case 's':
        return top ? { x: cx, y: r.y1 + off } : { x: cx, y: r.y0 - off };
      case 'w':
        return top ? { x: r.x0 - off, y: cy } : { x: r.x1 + off, y: cy };
      default:
        return top ? { x: r.x1 + off, y: cy } : { x: r.x0 - off, y: cy };
    }
  }

  /** Lift or lower a body on a ramp, and put it on the other floor once it reaches the far end. */
  updateStairs(p: Placed): void {
    const s = this.stairAt(p);
    if (!s) {
      p.onStairs = null;
      p.z = 0;
      return;
    }
    const t = Math.min(1, Math.max(0, this.rampT(s, p.x, p.y)));
    p.onStairs = s.id;
    p.z = s.riseM * t - (p.floor === s.topFloor ? s.riseM : 0);
    // The floor changes where the ramp's height meets the other floor's (z is continuous across it),
    // so the body keeps its place and climbs smoothly: nothing is teleported.
    if (p.floor === s.bottomFloor && t >= POP_UP) {
      p.floor = s.topFloor;
      p.z = s.riseM * t - s.riseM;
    } else if (p.floor === s.topFloor && t <= POP_DOWN) {
      p.floor = s.bottomFloor;
      p.z = s.riseM * t;
    }
  }

  // ---------------------------------------------------------------- sight
  /** Things that block a line of sight on a floor: walls, shut doors and tall furniture. */
  sightBlockers(floor: FloorIndex, ignoreFurniture = false): Rect[] {
    const out: Rect[] = [];
    for (const w of this.wallsBy[floor]) if (w.blocksSight) out.push(w);
    for (const d of this.closedDoors(floor)) out.push(d.rect);
    if (!ignoreFurniture) for (const f of this.furnitureBy[floor]) if (f.blocksSight) out.push(f);
    return out;
  }

  /** Is there a clear line between two points on a floor? */
  lineOfSight(floor: FloorIndex, a: Point, b: Point, opts: SightOptions = {}, skip?: ReadonlySet<Rect>): boolean {
    for (const r of this.sightBlockers(floor, opts.ignoreFurniture)) {
      if (skip?.has(r)) continue;
      if (segmentHitsRect(a, b, r)) return false;
    }
    return true;
  }

  /**
   * How much of a sound's loudness reaches from a to b on a floor, 0..1: every wall in the way
   * lets its `soundPass` through, a shut door a little, an open door everything.
   */
  soundTransmission(floor: FloorIndex, a: Point, b: Point): number {
    let pass = 1;
    for (const w of this.wallsBy[floor]) if (segmentHitsRect(a, b, w)) pass *= w.soundPass;
    for (const d of this.closedDoors(floor)) if (segmentHitsRect(a, b, d.rect)) pass *= 0.3;
    return pass;
  }

  // ---------------------------------------------------------------- navigation
  rebuildNav(): void {
    for (const floor of [0, 1] as const) {
      const solids = [...this.wallsBy[floor], ...this.furnitureBy[floor].filter((f) => f.solid)];
      this.navs[floor].rebuild((at) => solids.some((r) => circleHitsRect(at.x, at.y, 0.3, r)));
    }
  }

  /** A route between two spots on one floor (shut doors do not block it: a person opens them). */
  pathOnFloor(floor: FloorIndex, from: Point, to: Point): Point[] | null {
    // A shortcut is only taken where a whole body fits all along it: the grid alone lets a line clip a corner
    // (a lamp, a table edge) and the walker then snags there for good.
    const doors = new Set<Rect>(this.doorsBy[floor].map((d) => d.rect));
    const walkable = (a: Point, b: Point): boolean => {
      const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.1));
      for (let i = 1; i < n; i++) {
        const t = i / n;
        if (!this.fits(floor, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, BODY_RADIUS_M + 0.02, doors)) return false;
      }
      return true;
    };
    return this.navs[floor].path(from, to, walkable);
  }

  /**
   * A route across floors: walk to the stairs, climb or descend, walk on. Waypoints carry their
   * floor; a `stairs` waypoint is the ramp's far end.
   */
  route(
    from: { floor: FloorIndex; x: number; y: number },
    to: { floor: FloorIndex; x: number; y: number },
  ): Waypoint[] | null {
    if (from.floor === to.floor) {
      const p = this.pathOnFloor(from.floor, from, to);
      return p ? p.map((q) => ({ floor: from.floor, x: q.x, y: q.y })) : null;
    }
    const s = this.house.stairs.find(
      (st) =>
        (st.bottomFloor === from.floor && st.topFloor === to.floor) ||
        (st.topFloor === from.floor && st.bottomFloor === to.floor),
    );
    if (!s) return null;
    const goingUp = from.floor === s.bottomFloor;
    const near = this.rampExit(s, !goingUp); // the end of the ramp on the floor we start on
    const far = this.rampExit(s, goingUp);
    const first = this.pathOnFloor(from.floor, from, near);
    const last = this.pathOnFloor(to.floor, far, to);
    if (!first || !last) return null;
    return [
      ...first.map((q) => ({ floor: from.floor, x: q.x, y: q.y })),
      { floor: from.floor, x: near.x, y: near.y },
      { floor: to.floor, x: far.x, y: far.y, stairs: goingUp ? ('up' as const) : ('down' as const) },
      ...last.map((q) => ({ floor: to.floor, x: q.x, y: q.y })),
    ];
  }

  /** Where a ramp starts or ends on a floor (for walking onto it). */
  rampEnd(s: StairDef, top: boolean): Point {
    const r = s.ramp;
    const cx = (r.x0 + r.x1) / 2;
    const cy = (r.y0 + r.y1) / 2;
    switch (s.rises) {
      case 'n':
        return top ? { x: cx, y: r.y0 + 0.2 } : { x: cx, y: r.y1 - 0.1 };
      case 's':
        return top ? { x: cx, y: r.y1 - 0.2 } : { x: cx, y: r.y0 + 0.1 };
      case 'w':
        return top ? { x: r.x0 + 0.2, y: cy } : { x: r.x1 - 0.1, y: cy };
      default:
        return top ? { x: r.x1 - 0.2, y: cy } : { x: r.x0 + 0.1, y: cy };
    }
  }
}

function rectsTouch(a: Rect, b: Rect): boolean {
  const x = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const y = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  return (x === 0 && y > 0) || (y === 0 && x > 0);
}
