import type { GameEvent } from './game';
import { exitPoint, type HideSpot } from './hiding';
import type { FloorIndex, HouseDef } from './house-types';
import {
  ACTION_DURATION_S,
  ACTION_LOUDNESS,
  actionFor,
  type HunterActionKind,
  lookBoost,
  NOISE_AT,
} from './hunter-actions';
import { ALARMING, type BodyView, type Eyes, type Gait, heardStrength, SUSPICIOUS, sightRate } from './perception';
import { BODY_RADIUS_M, type HouseWorld, type Placed, type Point, type Waypoint } from './world';

/**
 * The hunter's brain (Phase 2, master plan section I): patrols, investigates sounds, searches room by
 * room (inspecting hiding places), changes floors, remembers where he has looked and chases what he
 * sees. Pure and deterministic. He senses only through `perception.ts`, from the player's BODY: the
 * peeking camera never reaches him (section C).
 */
export type HunterMode = 'patrol' | 'investigate' | 'search' | 'chase';

/** A tad slower than before (owner, 19/11/2026); still faster than the player's run (4.4 m/s) when he gives chase. */
export const HUNTER_SPEED_MPS: Readonly<Record<Gait, number>> = { walk: 4.3, tiptoe: 1.5, run: 5.0 };
/** How loud his own steps are (the player hears him coming, positionally; P2-5). */
export const HUNTER_STEP_LOUDNESS: Readonly<Record<Gait, number>> = { walk: 0.4, tiptoe: 0.1, run: 0.85 };

const TURN_RAD_S = 5;
const CHASE_TURN_RAD_S = 9;
const CATCH_M = 0.85;
const CATCH_HIDDEN_M = 1.8;
/** Knowing where a hiding player is, he grabs them from this close to the place's edge, metres. */
const CATCH_HIDDEN_REACH_M = 1.1;
/**
 * He does not know where the player is all at once (owner, 19/11/2026): what he sees fills his awareness at this
 * fraction of the raw rate, so noticing takes a few seconds at range and about a second close up...
 */
const DETECT_SCALE = 0.55;
/** ...except by luck: each second he can see the player there is this chance of a sudden hunch, which fills this much. */
const HUNCH_PER_S = 0.04;
const HUNCH_BUMP = 0.4;
/** Awareness above this makes him stop and look at the player; at 1 he gives chase. */
const SUSPECT = 0.3;
const AWARENESS_DECAY_S = 0.3;
const LOSE_SIGHT_S = 1.4;
/** Without a fresh sight or sound he forgets where the player was and searches blind (owner, 18/11/2026). */
const MEMORY_S = 22;
const DWELL_S = 0.7;
const INSPECT_S = 1.1;
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
  /** At a hiding place: check it properly (open it, kneel to look) rather than glance at it. */
  readonly thorough?: boolean;
}

/** What he is doing with his body right now when it is not walking: opening, kneeling, listening. */
export interface ActiveAction {
  readonly kind: HunterActionKind;
  elapsedS: number;
  readonly durS: number;
  /** The hiding place it is aimed at, if any. */
  readonly spot: HideSpot | null;
  /** Its noise has been made. */
  noised: boolean;
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
  /** He makes a noise while searching (a door creaking open, a lid, a knife scraping): the game makes it positional. */
  noise(at: Point, floor: FloorIndex, loudness: number, detail: string): void;
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
  lastKnown: { floor: FloorIndex; x: number; y: number; sure: boolean; atS: number } | null = null;
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
  /** What he is doing with his body (null while he walks or simply stands). */
  action: ActiveAction | null = null;
  /** Hiding places he has reason to suspect (he heard someone get in or out), by when. */
  private readonly suspects = new Map<string, number>();
  /** Hiding places he means to look at again, by when (he did not quite trust the first look). */
  private readonly rechecks = new Map<string, number>();
  /** Seconds until he next stops to listen or drags his knife along a wall. */
  private beatS = 6;
  /** Seconds he listens harder for (hearing is keener right after he has stood still to listen). */
  private attentiveS = 0;

  constructor(
    private readonly house: HouseDef,
    private readonly rng: () => number = seeded(20261118),
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
    this.action = null;
    this.suspects.clear();
    this.rechecks.clear();
    this.beatS = 6;
    this.attentiveS = 0;
  }

  eyes(): Eyes {
    return { floor: this.floor, x: this.x, y: this.y, facing: this.facing, gait: this.gait };
  }

  /** One step of thinking and moving. Returns true when he has caught the player. */
  step(dtS: number, ctx: HunterContext): boolean {
    this.hear(ctx);
    const rate = sightRate(ctx.world, this.eyes(), ctx.body) * this.lookBoostNow();
    this.see(dtS, rate, ctx);
    if (this.lastKnown && this.mode !== 'chase' && ctx.timeS - this.lastKnown.atS > MEMORY_S) this.lastKnown = null;
    this.decide(ctx);
    this.act(dtS, ctx);
    return this.caught(rate, ctx);
  }

  // ------------------------------------------------------------------ senses
  private hear(ctx: HunterContext): void {
    for (const e of ctx.events) {
      const keen = this.attentiveS > 0 ? 1.5 : 1;
      const strength = heardStrength(ctx.world, this, { ...e.at, floor: e.floor, loudness: e.loudness }) * keen;
      if (strength < SUSPICIOUS) continue;
      // Someone getting in or out of a hiding place: that place is now a suspect, and he will check it properly.
      if ((e.kind === 'hide-enter' || e.kind === 'hide-exit') && e.id) this.suspects.set(e.id, ctx.timeS);
      // Never drop a sure sighting for a noise; otherwise only a louder sound than the one he follows.
      if (this.mode === 'chase' && this.unseenS < LOSE_SIGHT_S) continue;
      if (strength <= this.soundStrength && this.mode === 'investigate') continue;
      this.soundStrength = strength;
      this.action = null;
      this.lastKnown = { floor: e.floor, x: e.at.x, y: e.at.y, sure: false, atS: ctx.timeS };
      this.setGoal({ kind: 'sound', to: { floor: e.floor, x: e.at.x, y: e.at.y }, look: e.at }, ctx);
      this.mode = 'investigate';
      // A loud sound is walked to; a faint one is crept toward.
      this.gait = strength >= ALARMING ? 'walk' : 'tiptoe';
    }
  }

  private see(dtS: number, rate: number, ctx: HunterContext): void {
    if (rate > 0) {
      this.awareness = Math.min(1, this.awareness + rate * DETECT_SCALE * dtS);
      if (this.rng() < HUNCH_PER_S * dtS) this.awareness = Math.min(1, this.awareness + HUNCH_BUMP);
      this.unseenS = 0;
      if (this.awareness >= SUSPECT)
        this.lastKnown = { floor: ctx.body.floor, x: ctx.body.x, y: ctx.body.y, sure: true, atS: ctx.timeS };
    } else {
      this.unseenS += dtS;
      this.awareness = Math.max(this.mode === 'chase' ? 0.6 : 0, this.awareness - AWARENESS_DECAY_S * dtS);
    }
  }

  // ------------------------------------------------------------------ decisions
  private decide(ctx: HunterContext): void {
    if (this.awareness >= 1) {
      if (this.mode !== 'chase') this.goal = null;
      this.action = null;
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
    // What he is looking into is what he suspects: carry on looking (that is how he finds them), do not break off.
    const a = this.action;
    const last = this.lastKnown;
    const lookingAtIt =
      a?.spot &&
      last &&
      Math.hypot(last.x - a.spot.spec.at.x, last.y - a.spot.spec.at.y) < 1.8 &&
      last.floor === a.spot.floor;
    if (this.awareness >= SUSPECT && last?.sure && !lookingAtIt) {
      // He senses something at that spot: break off whatever he is doing, look, creep closer.
      this.action = null;
      this.mode = 'investigate';
      this.gait = 'tiptoe';
      this.setGoal({ kind: 'sound', to: last, look: last }, ctx);
    }
  }

  private act(dtS: number, ctx: HunterContext): void {
    this.attentiveS = Math.max(0, this.attentiveS - dtS);
    if (this.action) {
      this.runAction(dtS, ctx);
      return;
    }
    if (this.dwellS > 0) {
      this.dwell(dtS);
      return;
    }
    if (this.mode === 'chase') this.chase(dtS, ctx);
    else if (!this.goal || this.arrivedAtGoal()) {
      if (this.goal) this.onArrive(ctx);
      else this.pickGoal(ctx);
    }
    if (this.goal && this.mode !== 'chase') this.maybeBeat(dtS, ctx);
    if (this.goal && !this.action) this.follow(dtS, ctx);
  }

  /** Now and then, while he searches, he stops to listen or drags his knife along a wall: never at a predictable time. */
  private maybeBeat(dtS: number, ctx: HunterContext): void {
    if (this.mode === 'patrol' || this.goal?.kind === 'spot') return;
    this.beatS -= dtS;
    if (this.beatS > 0) return;
    this.beatS = 7 + this.rng() * 10;
    const r = this.rng();
    if (r < 0.4) this.beginAction('listen', null, ctx);
    else if (r < 0.75 && this.nearWall(ctx)) this.beginAction('knife-scrape', null, ctx);
  }

  /** Is there a wall (or something solid) within arm's reach beside him? */
  private nearWall(ctx: HunterContext): boolean {
    return [
      [0.8, 0],
      [-0.8, 0],
      [0, 0.8],
      [0, -0.8],
    ].some(([dx, dy]) => !ctx.world.fits(this.floor, this.x + dx!, this.y + dy!, 0.25));
  }

  // ------------------------------------------------------------------ body actions
  private beginAction(kind: HunterActionKind, spot: HideSpot | null, ctx: HunterContext): void {
    this.action = { kind, elapsedS: 0, durS: ACTION_DURATION_S[kind] * (0.9 + this.rng() * 0.25), spot, noised: false };
    this.dwellAt = spot ? spot.spec.at : null;
    void ctx;
  }

  private runAction(dtS: number, ctx: HunterContext): void {
    const a = this.action;
    if (!a) return;
    a.elapsedS += dtS;
    const progress = Math.min(1, a.elapsedS / a.durS);
    // He turns to face what he is looking at; listening, he turns his head slowly about.
    if (a.spot) this.turnToward(Math.atan2(a.spot.spec.at.y - this.y, a.spot.spec.at.x - this.x), dtS, TURN_RAD_S);
    else if (a.kind === 'listen') this.facing += dtS * 0.5;
    // The noise of the thing he does, once, at its moment.
    const at = NOISE_AT[a.kind];
    if (!a.noised && at !== undefined && progress >= at) {
      a.noised = true;
      const where = a.spot ? { x: a.spot.spec.at.x, y: a.spot.spec.at.y } : { x: this.x, y: this.y };
      ctx.noise(where, this.floor, ACTION_LOUDNESS[a.kind] ?? 0.2, a.kind);
    }
    if (progress < 1) return;
    this.action = null;
    if (a.kind === 'listen') this.attentiveS = 6;
    // A good hiding place he cannot quite dismiss: he may come back to it in a few seconds.
    if (a.spot && a.kind !== 'glance' && a.spot.spec.concealment >= 0.85 && this.rng() < 0.3)
      this.rechecks.set(a.spot.id, ctx.timeS + 8 + this.rng() * 8);
    else if (a.spot) this.rechecks.delete(a.spot.id);
    // After checking somewhere he sometimes stops dead to listen.
    if (a.spot && this.rng() < 0.25) this.beginAction('listen', null, ctx);
  }

  /** How much faster he notices the player now: when his eyes are right at the open door or under the bed. */
  private lookBoostNow(): number {
    const a = this.action;
    return a?.spot ? lookBoost(a.kind, Math.min(1, a.elapsedS / a.durS)) : 1;
  }

  private chase(dtS: number, ctx: HunterContext): void {
    const last = this.lastKnown;
    if (!last) return;
    this.repathS -= dtS;
    if (!this.goal || this.repathS <= 0) {
      this.repathS = REPATH_S;
      // Knowing the player is in a hiding place, he goes to its opening: the place itself is solid, so a goal
      // inside it could never be reached (he would push at it for ever).
      const hiding = ctx.body.hiding;
      const to = hiding ? { floor: hiding.floor, ...exitPoint(ctx.world, hiding) } : last;
      this.setGoal({ kind: 'chase', to }, ctx);
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
        if (g.spot) {
          this.inspected.set(g.spot.id, ctx.timeS);
          this.suspects.delete(g.spot.id);
          // Thorough: open it, kneel and look. Otherwise a glance: someone good at hiding can slip past.
          this.beginAction(actionFor(g.spot.spec.kind, g.thorough ?? true), g.spot, ctx);
        } else this.startDwell(INSPECT_S, g.look ?? null);
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

  /**
   * The hiding place to check next. Places near where the player was last known come first, and so do places he
   * heard someone use or means to look at again; the rest are checked as he goes through their room. How closely
   * he checks varies: an obvious suspect is always opened, a quiet corner often only glanced at.
   */
  private nextSpot(ctx: HunterContext): Goal | null {
    const here = ctx.world.roomAt(this.floor, this.x, this.y);
    const last = this.lastKnown;
    let best: { spot: HideSpot; cost: number; thorough: boolean } | null = null;
    for (const s of ctx.spots) {
      const suspect = ctx.timeS - (this.suspects.get(s.id) ?? -1e9) < 25;
      const dueAt = this.rechecks.get(s.id);
      const due = dueAt !== undefined && ctx.timeS >= dueAt;
      if (!suspect && !due && ctx.timeS - (this.inspected.get(s.id) ?? -1e9) < FORGET_S) continue;
      const room = ctx.world.roomAt(s.floor, s.spec.at.x, s.spec.at.y);
      const nearLast =
        last && last.floor === s.floor && Math.hypot(s.spec.at.x - last.x, s.spec.at.y - last.y) < SPOT_NEAR_LAST_M;
      const inHere = s.floor === this.floor && room?.id === here?.id;
      // Only places beside him or near where the player vanished (or that he has reason to suspect): the rest come with their room.
      if (!nearLast && !inHere && !suspect && !due) continue;
      if (inHere && !this.searched.has(room?.id ?? '') && !nearLast && !suspect && !due) continue;
      const d = (s.floor === this.floor ? 0 : 20) + Math.hypot(s.spec.at.x - this.x, s.spec.at.y - this.y);
      const cost = d - (nearLast ? 6 : 0) - (suspect ? 30 : 0) - (due ? 15 : 0) + this.rng() * 2.5;
      if (best && cost >= best.cost) continue;
      const p = 0.5 + (nearLast ? 0.3 : 0) + (s.spec.concealment >= 0.85 ? 0.15 : 0) + (suspect || due ? 1 : 0);
      best = { spot: s, cost, thorough: this.rng() < p };
    }
    if (!best) return null;
    // He stands where a person would step out of it: in front of the opening, on free floor.
    const front = exitPoint(ctx.world, best.spot);
    return {
      kind: 'spot',
      to: { floor: best.spot.floor, ...front },
      spot: best.spot,
      look: best.spot.spec.at,
      thorough: best.thorough,
    };
  }

  /** The room he has not searched lately that is cheapest to reach, preferring those near the last known spot. */
  private nextRoom(ctx: HunterContext): Goal | null {
    const last = this.lastKnown;
    let best: { room: string; to: Waypoint; cost: number } | null = null;
    for (const r of this.house.rooms) {
      // The player never goes outside, so he does not waste time searching the yards.
      if (r.outdoors) continue;
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
    if (b.hiding) {
      // He knows (he is chasing) and is at the place: he reaches in. Distance to the place's edge, not its middle.
      const r = b.hiding.rect;
      const edge = Math.hypot(Math.max(r.x0 - this.x, 0, this.x - r.x1), Math.max(r.y0 - this.y, 0, this.y - r.y1));
      if (this.mode === 'chase' && edge <= CATCH_HIDDEN_REACH_M) return true;
      return this.awareness >= 1 && rate > 0 && d <= CATCH_HIDDEN_M;
    }
    return this.mode === 'chase' && rate > 0 && d <= CATCH_M;
  }
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

/** A small seeded generator (deterministic, so tests and replays see the same hunter). */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
