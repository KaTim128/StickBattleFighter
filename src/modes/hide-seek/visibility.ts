import type { FloorIndex, FurnitureDef, Rect, RoomDef } from './house-types';
import type { HouseWorld, Point } from './world';

/**
 * Room-based visibility for Hide and Seek (Phase 2, master plan section C). Not a radius: it uses the
 * house's rooms, floors, doors and walls. The viewer sees
 *   - the room they stand in, lit;
 *   - other rooms (and the furniture in them) only through genuine sightlines: open doorways and
 *     arches, never through walls or shut doors;
 *   - rooms they have already been in, dimly, as a memory (never what is in them now: only things
 *     the viewer can see this moment are shown as they are);
 *   - the other floor only through the staircase while the viewer is on it.
 * Everything fades smoothly. The peeking view origin is separate from the body: this module never
 * touches what the hunter detects.
 */
export const VIEW_DISTANCE_M = 17;
/** How dim a remembered (explored but not currently visible) room is. */
export const MEMORY_LIGHT = 0.3;
/** Seconds to fade fully in or out. */
const FADE_S = 0.35;
/** The sightlines are recomputed this often (they depend only on position and doors, not on frames). */
const REFRESH_S = 0.1;
/** Room sampling grid, metres. */
const SAMPLE_M = 1.4;

export interface Viewer {
  readonly floor: FloorIndex;
  /** The view origin: the body, or where a peek leans to. */
  readonly x: number;
  readonly y: number;
  /** On the stairs: which, and how far up (0 to 1). Reveals the other floor. */
  readonly onStairs: string | null;
  readonly stairT: number;
}

interface Target {
  readonly id: string;
  readonly floor: FloorIndex;
  readonly room: string | null;
  readonly rect: Rect;
  /** The point sightlines are drawn to. */
  readonly at: Point;
}

export class Visibility {
  /** Rooms the viewer has stood in or seen up close (by id). */
  readonly explored = new Set<string>();
  /** Current (smoothed) light of each room, 0..1. */
  private readonly roomNow = new Map<string, number>();
  private readonly roomGoal = new Map<string, number>();
  private readonly objNow = new Map<string, number>();
  private readonly objGoal = new Map<string, number>();
  private readonly floorNow: [number, number] = [1, 0];
  private floorGoal: [number, number] = [1, 0];
  private sinceS = REFRESH_S;
  private viewerRoom: string | null = null;
  private readonly objects: Target[] = [];

  constructor(
    private readonly world: HouseWorld,
    extra: readonly { id: string; floor: FloorIndex; rect: Rect }[] = [],
  ) {
    for (const f of world.house.furniture) this.add(f);
    for (const e of extra) this.objects.push({ ...e, room: this.roomOf(e.floor, e.rect), at: centre(e.rect) });
  }

  private roomOf(floor: FloorIndex, r: Rect): string | null {
    const c = centre(r);
    return this.world.roomAt(floor, c.x, c.y)?.id ?? null;
  }

  private add(f: FurnitureDef): void {
    if (f.kind === 'lawn' || f.kind === 'path' || f.kind === 'rug') return;
    this.objects.push({ id: f.id, floor: f.floor, room: this.roomOf(f.floor, f), rect: f, at: centre(f) });
  }

  /** The room the viewer's body is in. */
  get occupiedRoom(): string | null {
    return this.viewerRoom;
  }

  /** 0..1 how lit a room looks now. */
  roomLight(id: string): number {
    return this.roomNow.get(id) ?? 0;
  }

  /** 0..1 how visible a piece of furniture (or any registered thing) is now. */
  objectAlpha(id: string): number {
    return this.objNow.get(id) ?? 0;
  }

  /** 0..1 how visible a whole floor is (the viewer's floor 1; the other only on the stairs). */
  floorOpacity(floor: FloorIndex): number {
    return this.floorNow[floor];
  }

  /** The brightness goal of a room right now (before smoothing): what the sightlines decided. */
  roomGoalLight(id: string): number {
    return this.roomGoal.get(id) ?? 0;
  }

  /**
   * Can the viewer see this point right now (a clear sightline, within view distance, in a room that
   * is lit or occupied)? Used for the hunter: he is drawn only when the player could see him.
   */
  canSee(viewer: Viewer, floor: FloorIndex, p: Point): boolean {
    if (floor !== viewer.floor && !this.seesOtherFloor(viewer, floor)) return false;
    const d = Math.hypot(p.x - viewer.x, p.y - viewer.y);
    if (d > VIEW_DISTANCE_M) return false;
    const room = this.world.roomAt(floor, p.x, p.y);
    if (!room) return false;
    if (floor === viewer.floor && room.id === this.viewerRoom) return true;
    if (room.light < 0.2 && d > 4) return false;
    return this.world.lineOfSight(floor, viewer, p, { ignoreFurniture: true });
  }

  private seesOtherFloor(viewer: Viewer, floor: FloorIndex): boolean {
    return viewer.onStairs !== null && floor !== viewer.floor && this.stairReveal(viewer, floor) > 0.05;
  }

  /** How much of the other floor the viewer on a ramp can see, 0..1 (more the nearer the far end). */
  private stairReveal(viewer: Viewer, floor: FloorIndex): number {
    if (!viewer.onStairs) return 0;
    const s = this.world.house.stairs.find((x) => x.id === viewer.onStairs);
    if (!s) return 0;
    // On the lower floor's side climbing up, the upper floor appears as the top nears; descending, the lower.
    const nearTop = viewer.stairT;
    const toward = floor === s.topFloor ? nearTop : 1 - nearTop;
    return smooth(0.3, 0.8, toward);
  }

  /** Recompute sightlines (a few times a second) and ease every light toward its goal. */
  update(dtS: number, viewer: Viewer): void {
    this.sinceS += dtS;
    if (this.sinceS >= REFRESH_S) {
      this.sinceS = 0;
      this.recompute(viewer);
    }
    const k = Math.min(1, dtS / FADE_S);
    ease(this.roomNow, this.roomGoal, k);
    ease(this.objNow, this.objGoal, k);
    for (const f of [0, 1] as const) this.floorNow[f] += (this.floorGoal[f] - this.floorNow[f]) * k;
  }

  /** Jump to the goals at once (a restart, a test). */
  settle(viewer: Viewer): void {
    this.recompute(viewer);
    for (const [k, v] of this.roomGoal) this.roomNow.set(k, v);
    for (const [k, v] of this.objGoal) this.objNow.set(k, v);
    this.floorNow[0] = this.floorGoal[0];
    this.floorNow[1] = this.floorGoal[1];
  }

  reset(): void {
    this.explored.clear();
    this.roomNow.clear();
    this.roomGoal.clear();
    this.objNow.clear();
    this.objGoal.clear();
    this.sinceS = REFRESH_S;
    this.viewerRoom = null;
  }

  // ---------------------------------------------------------------- the computation
  private recompute(viewer: Viewer): void {
    const world = this.world;
    const here = world.roomAt(viewer.floor, viewer.x, viewer.y);
    this.viewerRoom = here?.id ?? null;
    if (here) this.explored.add(here.id);

    this.roomGoal.clear();
    this.objGoal.clear();
    const floors: FloorIndex[] = [viewer.floor];
    const other = (1 - viewer.floor) as FloorIndex;
    const reveal = this.stairReveal(viewer, other);
    if (reveal > 0) floors.push(other);
    this.floorGoal = [0, 0];
    this.floorGoal[viewer.floor] = 1;
    if (reveal > 0) this.floorGoal[other] = reveal;

    for (const floor of floors) {
      const scale = floor === viewer.floor ? 1 : reveal;
      for (const room of world.house.rooms) {
        if (room.floor !== floor) continue;
        let light = 0;
        if (floor === viewer.floor && room.id === here?.id) light = 1;
        else {
          const seen = this.roomSeen(viewer, room, floor);
          light = seen * room.light;
          // Rooms entered before stay as a dim memory; unexplored rooms stay black until seen.
          if (this.explored.has(room.id)) light = Math.max(light, MEMORY_LIGHT * (floor === viewer.floor ? 1 : 0.6));
          if (seen > 0.05) this.explored.add(room.id);
        }
        this.roomGoal.set(room.id, light * scale);
      }
      for (const o of this.objects) {
        if (o.floor !== floor) continue;
        const roomLight = o.room ? (this.roomGoal.get(o.room) ?? 0) : 0;
        let a = 0;
        if (o.room && floor === viewer.floor && o.room === here?.id) a = 1;
        else if (roomLight > 0.01 && this.objectSeen(viewer, o, floor)) a = Math.min(1, roomLight + 0.2) * scale;
        else if (o.room && this.explored.has(o.room)) a = MEMORY_LIGHT * 0.9 * scale; // remembered shape of the room
        this.objGoal.set(o.id, a);
      }
    }
  }

  /** What share of a room the viewer can see, 0..1 (sampled on a grid; walls and shut doors block). */
  private roomSeen(viewer: Viewer, room: RoomDef, floor: FloorIndex): number {
    const r = room.rect;
    let seen = 0;
    let total = 0;
    for (let y = r.y0 + SAMPLE_M / 2; y < r.y1; y += SAMPLE_M)
      for (let x = r.x0 + SAMPLE_M / 2; x < r.x1; x += SAMPLE_M) {
        total++;
        const d = Math.hypot(x - viewer.x, y - viewer.y);
        if (d > VIEW_DISTANCE_M) continue;
        if (this.world.lineOfSight(floor, viewer, { x, y }, { ignoreFurniture: true }))
          seen += 1 - (d / VIEW_DISTANCE_M) * 0.5;
      }
    return total === 0 ? 0 : Math.min(1, seen / total);
  }

  /** Does a clear line reach the object's centre or any of its corners (so a big thing half behind a door still shows)? */
  private objectSeen(viewer: Viewer, o: Target, floor: FloorIndex): boolean {
    const r = o.rect;
    const pts: Point[] = [o.at, { x: r.x0, y: r.y0 }, { x: r.x1, y: r.y0 }, { x: r.x1, y: r.y1 }, { x: r.x0, y: r.y1 }];
    const skip = new Set<Rect>([r]);
    for (const p of pts) {
      if (Math.hypot(p.x - viewer.x, p.y - viewer.y) > VIEW_DISTANCE_M) continue;
      // Pull the target point a little off the object so the object does not block the sightline to itself.
      const dx = viewer.x - p.x;
      const dy = viewer.y - p.y;
      const len = Math.hypot(dx, dy) || 1;
      const q = { x: p.x + (dx / len) * 0.15, y: p.y + (dy / len) * 0.15 };
      if (this.world.lineOfSight(floor, viewer, q, {}, skip)) return true;
    }
    return false;
  }

  /** The light at a point (for walls and doors): the best of the two rooms on either side. */
  lightAt(floor: FloorIndex, p: Point): number {
    const room = this.world.roomAt(floor, p.x, p.y);
    return room ? this.roomLight(room.id) : 0;
  }
}

const centre = (r: Rect): Point => ({ x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 });

function smooth(lo: number, hi: number, v: number): number {
  const t = Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
}

function ease(now: Map<string, number>, goal: Map<string, number>, k: number): void {
  for (const [id, g] of goal) {
    const v = now.get(id) ?? 0;
    now.set(id, v + (g - v) * k);
  }
  for (const [id, v] of now) if (!goal.has(id)) now.set(id, v + (0 - v) * k);
}
