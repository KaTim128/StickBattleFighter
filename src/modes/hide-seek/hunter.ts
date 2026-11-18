import type { GameEvent } from './game';
import type { HideSpot } from './hiding';
import type { FloorIndex, HouseDef } from './house-types';
import { ALARMING, type BodyView, type Eyes, type Gait, heardStrength, SUSPICIOUS, sightRate } from './perception';
import { BODY_RADIUS_M, type HouseWorld, type Placed, type Point, type Waypoint } from './world';

/**
 * The hunter's brain (Phase 2, master plan section I): patrols, investigates sounds, searches room by
 * room (inspecting hiding places), changes floors, remembers where he has looked and chases what he
 * sees. Pure and deterministic. He senses only through `perception.ts`, from the player's BODY: the
 * peeking camera never reaches him (section C).
 */
export type HunterMode = 'patrol' | 'investigate' | 'search' | 'chase';

export const HUNTER_SPEED_MPS: Readonly<Record<Gait, number>> = { walk: 2.3, tiptoe: 1.1, run: 4.1 };
/** How loud his own steps are (the player hears him coming, positionally; P2-5). */
export const HUNTER_STEP_LOUDNESS: Readonly<Record<Gait, number>> = { walk: 0.4, tiptoe: 0.1, run: 0.85 };

const TURN_RAD_S = 5;
const CHASE_TURN_RAD_S = 9;
const CATCH_M = 0.85;
const CATCH_HIDDEN_M = 1.8;
/** Awareness above this makes him stop and look at the player; at 1 he gives chase. */
const SUSPECT = 0.3;
const AWARENESS_DECAY_S = 0.3;
const LOSE_SIGHT_S = 1.4;
const DWELL_S = 1.0;
const INSPECT_S = 1.3;
/** A room or hiding place he checked is not checked again for this long, seconds. */
const FORGET_S = 70;
const SPOT_NEAR_LAST_M = 5;
const REPATH_S = 0.4;
const ARRIVE_M = 0.45;

interface Goal {
  readonly kind: 'patrol' | 'sound' | 'room' | 'spot' | 'chase';
  readonly to: Waypoint;
  readonly roomId?: string;
  readonly spot?: HideSpot;
  /** The point he looks at once there (a hiding place, a sound). */
  readonly look?: Point;
}

export interface HunterContext {
  readonly world: HouseWorld;
  readonly spots: readonly HideSpot[];
  readonly body: BodyView;
  /** What the player and the props made this step (his own noises are never passed back to him). */
  readonly events: readonly GameEvent[];
  readonly timeS: number;
  /** He opens a shut door he walks into (the game makes the noise). */
  openDoor(id: string): void;
  /** He steps: the game turns it into a positional sound. */
  step(at: Point, floor: FloorIndex, gait: Gait): void;
}

export class Hunter implements Placed {
  floor: FloorIndex;
  x: number;
  y: number;
  z = 0;
  onStairs: string | null = null;
  facing = Math.PI / 2;
  gait: Gait = 'walk';
  mode: HunterMode = 'patrol';
  /** 0..1 how sure he is something is there (1 = he has the player). */
  awareness = 0;
  /** Where he last saw or heard the player, and how sure that is. */
  lastKnown: { floor: FloorIndex; x: number; y: number; sure: boolean } | null = null;
  readonly searched = new Map<string, number>();
  readonly inspected = new Map<string, number>();

  private goal: Goal | null = null;
  private route: Waypoint[] = [];
  private routeI = 0;
  private dwellS = 0;
  private dwellAt: Point | null = null;
  private patrolI = 0;
  private soundStrength = 0;
  private unseenS = 0;
  private repathS = 0;
  private stuckS = 0;
  private replans = 0;
  private stepM = 0;
  private scanPhase = 0;

  constructor(
    private readonly house: HouseDef,
    private readonly rng: () => number = () => 0.5,
  ) {
    this.floor = house.hunterStart.floor;
    this.x = house.hunterStart.x;
    this.y = house.hunterStart.y;
  }

  /** Back to the start, forgetting everything (a restart). */
  reset(): void {
    const s = this.house.hunterStart;
    this.floor = s.floor;
    this.x = s.x;
    this.y = s.y;
    this.z = 0;
    this.onStairs = null;
    this.facing = Math.PI / 2;
    this.gait = 'walk';
    this.mode = 'patrol';
    this.awareness = 0;
    this.lastKnown = null;
    this.searched.clear();
    this.inspected.clear();
    this.goal = null;
    this.route = [];
    this.routeI = 0;
    this.dwellS = 0;
    this.dwellAt = null;
    this.patrolI = 0;
    this.soundStrength = 0;
    this.unseenS = 0;
    this.repathS = 0;
    this.stuckS = 0;
    this.replans = 0;
    this.stepM = 0;
    this.scanPhase = 0;
  }

  eyes(): Eyes {
    return { floor: this.floor, x: this.x, y: this.y, facing: this.facing, gait: this.gait };
  }

  /** One step of thinking and moving. Returns true when he has caught the player. */
  step(dtS: number, ctx: HunterContext): boolean {
    this.hear(ctx);
    const rate = sightRate(ctx.world, this.eyes(), ctx.body);
    this.see(dtS, rate, ctx);
    this.decide(ctx);
    this.act(dtS, ctx);
    return this.caught(rate, ctx);
  }

  // ------------------------------------------------------------------ senses
  private hear(ctx: HunterContext): void {
    for (const e of ctx.events) {
      const strength = heardStrength(ctx.world, this, { ...e.at, floor: e.floor, loudness: e.loudness });
      if (strength < SUSPICIOUS) continue;
      // Never drop a sure sighting for a noise; otherwise only a louder sound than the one he follows.
      if (this.mode === 'chase' && this.unseenS < LOSE_SIGHT_S) continue;
      if (strength <= this.soundStrength && this.mode === 'investigate') continue;
      this.soundStrength = strength;
      this.lastKnown = { floor: e.floor, x: e.at.x, y: e.at.y, sure: false };
      this.setGoal({ kind: 'sound', to: { floor: e.floor, x: e.at.x, y: e.at.y }, look: e.at }, ctx);
      this.mode = 'investigate';
      // A loud sound is walked to; a faint one is crept toward.
      this.gait = strength >= ALARMING ? 'walk' : 'tiptoe';
    }
  }

  private see(dtS: number, rate: number, ctx: HunterContext): void {
    if (rate > 0) {
      this.awareness = Math.min(1, this.awareness + rate * dtS);
      this.unseenS = 0;
      if (this.awareness >= SUSPECT)
        this.lastKnown = { floor: ctx.body.floor, x: ctx.body.x, y: ctx.body.y, sure: true };
    } else {
      this.unseenS += dtS;
      this.awareness = Math.max(this.mode === 'chase' ? 0.6 : 0, this.awareness - AWARENESS_DECAY_S * dtS);
    }
  }

  // ------------------------------------------------------------------ decisions
  private decide(ctx: HunterContext): void {
    if (this.awareness >= 1) {
      if (this.mode !== 'chase') this.goal = null;
      this.mode = 'chase';
      this.gait = 'run';
      return;
    }
    if (this.mode === 'chase') {
      // He lost sight of the player: go to where they were last seen, then search from there.
      if (this.unseenS >= LOSE_SIGHT_S) {
        this.awareness = Math.min(this.awareness, 0.5);
        this.mode = 'search';
        this.gait = 'walk';
        this.goal = null;
      }
      return;
    }
    if (this.awareness >= SUSPECT && this.lastKnown?.sure) {
      // He senses something at that spot: stop, look, creep closer.
      this.mode = 'investigate';
      this.gait = 'tiptoe';
      this.setGoal({ kind: 'sound', to: this.lastKnown, look: this.lastKnown }, ctx);
    }
  }

  private act(dtS: number, ctx: HunterContext): void {
    if (this.dwellS > 0) {
      this.dwell(dtS);
      return;
    }
    if (this.mode === 'chase') this.chase(dtS, ctx);
    else if (!this.goal || this.arrivedAtGoal()) {
      if (this.goal) this.onArrive(ctx);
      else this.pickGoal(ctx);
    }
    if (this.goal) this.follow(dtS, ctx);
  }

  private chase(dtS: number, ctx: HunterContext): void {
    const last = this.lastKnown;
    if (!last) return;
    this.repathS -= dtS;
    if (!this.goal || this.repathS <= 0) {
      this.repathS = REPATH_S;
      this.setGoal({ kind: 'chase', to: last }, ctx);
    }
    if (this.arrivedAtGoal() && this.unseenS >= LOSE_SIGHT_S) this.goal = null;
  }

  private arrivedAtGoal(): boolean {
    const g = this.goal;
    if (!g) return false;
    return (
      this.floor === g.to.floor &&
      Math.hypot(g.to.x - this.x, g.to.y - this.y) < ARRIVE_M + (g.kind === 'chase' ? 0.3 : 0)
    );
  }

  private onArrive(ctx: HunterContext): void {
    const g = this.goal;
    if (!g) return;
    this.goal = null;
    this.route = [];
    switch (g.kind) {
      case 'patrol':
        this.patrolI = (this.patrolI + 1) % Math.max(1, this.house.patrol.length);
        this.startDwell(DWELL_S, g.to);
        // A full round of his beat with nothing found: he starts going through the house room by room.
        if (this.patrolI === 0) {
          this.mode = 'search';
          this.gait = 'walk';
        }
        break;
      case 'sound':
        // He has reached the noise: look about, then search the area it came from.
        this.mode = 'search';
        this.gait = 'walk';
        this.soundStrength = 0;
        this.startDwell(DWELL_S, g.look ?? g.to);
        break;
      case 'room':
        if (g.roomId) this.searched.set(g.roomId, ctx.timeS);
        this.startDwell(DWELL_S, null);
        break;
      case 'spot':
        if (g.spot) this.inspected.set(g.spot.id, ctx.timeS);
        this.startDwell(INSPECT_S, g.look ?? null);
        break;
      case 'chase':
        // At the place he last saw them and nothing there: search around it.
        this.mode = 'search';
        this.gait = 'walk';
        break;
    }
  }

  private startDwell(s: number, look: Point | null): void {
    this.dwellS = s;
    this.dwellAt = look;
    this.scanPhase = 0;
  }

  private dwell(dtS: number): void {
    this.dwellS -= dtS;
    this.scanPhase += dtS;
    if (this.dwellAt) this.turnToward(Math.atan2(this.dwellAt.y - this.y, this.dwellAt.x - this.x), dtS, TURN_RAD_S);
    else this.facing += dtS * 1.6; // a slow look around the room
    if (this.dwellS <= 0 && this.mode === 'investigate' && !this.goal) this.mode = 'search';
  }

  // ------------------------------------------------------------------ choosing where to go
  private pickGoal(ctx: HunterContext): void {
    if (this.mode === 'patrol') {
      const p = this.house.patrol[this.patrolI % this.house.patrol.length];
      if (p) this.setGoal({ kind: 'patrol', to: p }, ctx);
      return;
    }
    if (this.mode === 'investigate') {
      this.mode = 'search';
      return;
    }
    // search
    const spot = this.nextSpot(ctx);
    if (spot) {
      this.setGoal(spot, ctx);
      return;
    }
    const room = this.nextRoom(ctx);
    if (room) {
      this.setGoal(room, ctx);
      return;
    }
    // Everywhere looked at: forget and go back to patrolling.
    this.searched.clear();
    this.inspected.clear();
    this.lastKnown = null;
    this.mode = 'patrol';
    this.gait = 'walk';
  }

  /** A hiding place he has not looked in lately: those near where the player was last known come first. */
  private nextSpot(ctx: HunterContext): Goal | null {
    const here = ctx.world.roomAt(this.floor, this.x, this.y);
    const last = this.lastKnown;
    let best: { spot: HideSpot; cost: number } | null = null;
    for (const s of ctx.spots) {
      if (ctx.timeS - (this.inspected.get(s.id) ?? -1e9) < FORGET_S) continue;
      const room = ctx.world.roomAt(s.floor, s.spec.at.x, s.spec.at.y);
      const nearLast =
        last && last.floor === s.floor && Math.hypot(s.spec.at.x - last.x, s.spec.at.y - last.y) < SPOT_NEAR_LAST_M;
      const inHere = s.floor === this.floor && room?.id === here?.id;
      // Only places beside him or near where the player vanished: the rest come with their room.
      if (!nearLast && !inHere) continue;
      if (inHere && !this.searched.has(room?.id ?? '') && !nearLast) continue;
      const d = (s.floor === this.floor ? 0 : 20) + Math.hypot(s.spec.at.x - this.x, s.spec.at.y - this.y);
      const cost = d - (nearLast ? 6 : 0);
      if (!best || cost < best.cost) best = { spot: s, cost };
    }
    if (!best) return null;
    const front = standPoint(best.spot);
    return { kind: 'spot', to: { floor: best.spot.floor, ...front }, spot: best.spot, look: best.spot.spec.at };
  }

  /** The room he has not searched lately that is cheapest to reach, preferring those near the last known spot. */
  private nextRoom(ctx: HunterContext): Goal | null {
    const last = this.lastKnown;
    let best: { room: string; to: Waypoint; cost: number } | null = null;
    for (const r of this.house.rooms) {
      if (ctx.timeS - (this.searched.get(r.id) ?? -1e9) < FORGET_S) continue;
      const to = {
        floor: r.floor,
        ...openSpotNear(ctx.world, r.floor, { x: (r.rect.x0 + r.rect.x1) / 2, y: (r.rect.y0 + r.rect.y1) / 2 }),
      };
      const walk = ctx.world.route(this, to);
      if (!walk) {
        this.searched.set(r.id, ctx.timeS);
        continue;
      }
      let len = 0;
      let prev: Point = this;
      for (const w of walk) {
        len += Math.hypot(w.x - prev.x, w.y - prev.y);
        prev = w;
      }
      const away = last ? Math.hypot(to.x - last.x, to.y - last.y) + (last.floor === r.floor ? 0 : 8) : 0;
      // Yards are looked at last unless the trail leads there.
      const cost = len + away * 0.8 + (r.outdoors ? 12 : 0) + this.rng() * 0.5;
      if (!best || cost < best.cost) best = { room: r.id, to, cost };
    }
    return best ? { kind: 'room', to: best.to, roomId: best.room } : null;
  }

  // ------------------------------------------------------------------ moving
  private setGoal(g: Goal, ctx: HunterContext): void {
    this.goal = g;
    const r = ctx.world.route(this, g.to);
    this.route = r ?? [];
    this.routeI = 0;
    this.stuckS = 0;
    this.replans = 0;
    if (!r) {
      // Unreachable: give up on it (a room is marked searched so he does not keep trying).
      if (g.roomId) this.searched.set(g.roomId, ctx.timeS);
      if (g.spot) this.inspected.set(g.spot.id, ctx.timeS);
      this.goal = null;
    }
  }

  private follow(dtS: number, ctx: HunterContext): void {
    const g = this.goal;
    if (!g) return;
    let wp = this.route[this.routeI];
    while (
      wp &&
      this.floor === wp.floor &&
      Math.hypot(wp.x - this.x, wp.y - this.y) < ARRIVE_M * 0.8 &&
      this.routeI < this.route.length - 1
    ) {
      this.routeI++;
      wp = this.route[this.routeI];
    }
    const to = wp ?? g.to;
    const dx = to.x - this.x;
    const dy = to.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.05) return;
    const turn = this.mode === 'chase' ? CHASE_TURN_RAD_S : TURN_RAD_S;
    this.turnToward(Math.atan2(dy, dx), dtS, turn);
    const speed = HUNTER_SPEED_MPS[this.gait] * dtS;
    const nx = dx / d;
    const ny = dy / d;
    const fromX = this.x;
    const fromY = this.y;
    const r = ctx.world.move(this, nx * Math.min(speed, d), ny * Math.min(speed, d), BODY_RADIUS_M);
    if (r.pushedDoor) ctx.openDoor(r.pushedDoor);
    const moved = Math.hypot(this.x - fromX, this.y - fromY);
    this.stepM += moved;
    const stride = this.gait === 'run' ? 1.5 : this.gait === 'tiptoe' ? 0.8 : 1.1;
    if (this.stepM >= stride) {
      this.stepM = 0;
      ctx.step({ x: this.x, y: this.y }, this.floor, this.gait);
    }
    // Stuck against something: replan, and after a while give the goal up.
    if (moved < speed * 0.25 && !r.pushedDoor) this.stuckS += dtS;
    else this.stuckS = 0;
    if (this.stuckS > 1.2) {
      this.stuckS = 0;
      this.replans++;
      const again = this.replans < 3 ? ctx.world.route(this, g.to) : null;
      if (again) {
        this.route = again;
        this.routeI = 0;
      } else {
        // He cannot get there: count it as looked at and move on rather than push at it forever.
        this.replans = 0;
        this.onArrive(ctx);
      }
    }
  }

  private turnToward(target: number, dtS: number, rate: number): void {
    let diff = target - this.facing;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const max = rate * dtS;
    this.facing += Math.abs(diff) <= max ? diff : Math.sign(diff) * max;
    while (this.facing > Math.PI) this.facing -= Math.PI * 2;
    while (this.facing < -Math.PI) this.facing += Math.PI * 2;
  }

  // ------------------------------------------------------------------ catching
  private caught(rate: number, ctx: HunterContext): boolean {
    const b = ctx.body;
    if (b.floor !== this.floor) return false;
    const d = Math.hypot(b.x - this.x, b.y - this.y);
    if (b.hiding) return this.awareness >= 1 && rate > 0 && d <= CATCH_HIDDEN_M;
    return this.mode === 'chase' && rate > 0 && d <= CATCH_M;
  }
}

/** Where he stands to look into a hiding place: in front of its opening. */
function standPoint(spot: HideSpot): Point {
  const o = { n: { x: 0, y: -1 }, s: { x: 0, y: 1 }, e: { x: 1, y: 0 }, w: { x: -1, y: 0 } }[spot.spec.opensToward];
  return { x: spot.spec.at.x + o.x * 1.1, y: spot.spec.at.y + o.y * 1.1 };
}

/** The nearest point to `p` where he can stand (the middle of a room can be under a table). */
function openSpotNear(world: HouseWorld, floor: FloorIndex, p: Point): Point {
  if (world.fits(floor, p.x, p.y, 0.4)) return p;
  for (let r = 0.4; r <= 3; r += 0.4)
    for (let a = 0; a < 16; a++) {
      const q = { x: p.x + Math.cos((a / 16) * Math.PI * 2) * r, y: p.y + Math.sin((a / 16) * Math.PI * 2) * r };
      if (world.fits(floor, q.x, q.y, 0.4) && world.roomAt(floor, q.x, q.y)?.id === world.roomAt(floor, p.x, p.y)?.id)
        return q;
    }
  return p;
}
