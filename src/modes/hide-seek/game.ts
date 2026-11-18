import { HOUSE } from '../../data/arenas/house';
import { exitPoint, type HideSpot, hideSpots, nearestHideSpot } from './hiding';
import type { HouseDef } from './house-types';
import { HUNTER_STEP_LOUDNESS, Hunter } from './hunter';
import { type KillEvent, type KillFrame, KillSequence } from './kill-sequence';
import { flyStep, IMPACT_LOUDNESS, initialProps, launch, PICKUP_REACH_M, type PropState } from './props';
import { Round, type RoundPhase } from './rules';
import type { Viewer } from './visibility';
import { BODY_RADIUS_M, HouseWorld, type Placed, type Point } from './world';

/**
 * The Hide and Seek game state (Phase 2, TD-095): the world, the round, the player and (later) the
 * hunter, advanced by fixed steps from the player's input. Pure and deterministic; the scene only
 * reads it to draw, and tests drive it directly.
 */
/**
 * Hiding in a place with a door, a lid or a curtain gives the small view circle automatically (owner, 19/11/2026);
 * under the table there is nothing to shut, so the view stays as it is.
 */
export function blindsWhenHidden(spot: { spec: { kind: string } } | undefined): boolean {
  return spot !== undefined && spot.spec.kind !== 'under-table';
}

/** How fast Shroud walks in through the front door: slow and deliberate. */
export const ENTRANCE_MPS = 2.0;
export const WALK_MPS = 2.4;
export const RUN_MPS = 4.4;
export const CROUCH_MPS = 1.2;
/** How close a door has to be for the interact key to work on it, metres. */
export const DOOR_REACH_M = 1.3;
/** The most a peek leans the view away from the body, metres. */
export const PEEK_M = 0.9;
const PEEK_RATE = 7;

export type Posture = 'walk' | 'run' | 'crouch' | 'hidden';

export interface PlayerInput {
  /** The way to walk in the world (length 0 to 1). */
  readonly move: Point;
  /** Hold to run (faster, louder). */
  readonly run: boolean;
  /** Toggle crouching (pressed this step). */
  readonly crouchPress: boolean;
  /** Interact pressed this step: open or close a door, enter or leave a hiding place, pick up or throw. */
  readonly interactPress: boolean;
  /** Peeking: hold to lean the view (camera only) instead of walking. */
  readonly peek: boolean;
}

export const NO_INPUT: PlayerInput = {
  move: { x: 0, y: 0 },
  run: false,
  crouchPress: false,
  interactPress: false,
  peek: false,
};

export interface PlayerState extends Placed {
  posture: Posture;
  crouching: boolean;
  /** Facing on screen: +1 right, -1 left. */
  facing: 1 | -1;
  /** Speed this step, m/s. */
  speedMps: number;
  /** Walked distance since the last footstep, metres. */
  stepM: number;
  /**
   * How far the view leans away from the body (peeking). Camera and visibility only: the hunter's
   * senses read the body, never this (section C: peeking never reveals the player).
   */
  peekX: number;
  peekY: number;
  /** The hiding place the player is in (furniture id), or null. */
  hidingIn: string | null;
  /** The peek key is held (leans the view round a door while walking; never used while hiding). */
  peeking: boolean;
  /** The thrown-object id being carried, or null. */
  carrying: string | null;
  /** The way the player last headed, a unit vector in the world (the direction of a throw). */
  dirX: number;
  dirY: number;
}

export interface GameEvent {
  readonly kind: 'door' | 'footstep' | 'hide-enter' | 'hide-exit' | 'impact' | 'pickup' | 'throw' | 'inspect';
  /** The hiding place's kind or the thrown object's kind, for the sound. */
  readonly detail?: string;
  readonly at: Point;
  readonly floor: 0 | 1;
  /** Loudness 0..1 (footsteps follow the posture; a door depends on whether it is an outside door). */
  readonly loudness: number;
  readonly id?: string;
  readonly open?: boolean;
  /** Made by the hunter (he never hears himself). */
  readonly by?: 'hunter';
}

export class HideSeekGame {
  readonly world: HouseWorld;
  readonly round = new Round();
  readonly player: PlayerState;
  readonly hunter: Hunter;
  private events: GameEvent[] = [];
  readonly spots: readonly HideSpot[];
  /** The execution under way (the hunter caught the player), or null. */
  kill: KillSequence | null = null;
  private killT = 0;
  private killEvents: KillEvent[] = [];
  /** The hunter walking in through the front door as the hunt begins, or null. */
  private entrance: { from: Point; to: Point; walkedM: number; lenM: number; closeAtM: number; stepM: number } | null =
    null;
  private lastPhase: RoundPhase = 'prep';
  /** The throwable objects and where they are. */
  props: PropState[];
  /** The sim clock, seconds. */
  timeS = 0;

  constructor(readonly house: HouseDef = HOUSE) {
    this.world = new HouseWorld(house);
    this.spots = hideSpots(house);
    this.props = initialProps(house.throwables);
    this.player = this.freshPlayer();
    this.hunter = new Hunter(house);
  }

  private freshPlayer(): PlayerState {
    const s = this.house.playerStart;
    return {
      floor: s.floor,
      x: s.x,
      y: s.y,
      z: 0,
      onStairs: null,
      posture: 'walk',
      crouching: false,
      facing: 1,
      speedMps: 0,
      stepM: 0,
      peekX: 0,
      peekY: 0,
      hidingIn: null,
      peeking: false,
      carrying: null,
      dirX: 1,
      dirY: 0,
    };
  }

  /** Everything is back to the start: doors shut as authored, the player at the start, the round reset. */
  restart(): void {
    this.world.resetDoors();
    this.entrance = null;
    this.lastPhase = 'prep';
    Object.assign(this.player, this.freshPlayer());
    this.props = initialProps(this.house.throwables);
    this.round.reset();
    this.hunter.reset();
    this.events = [];
    this.kill = null;
    this.killT = 0;
    this.killEvents = [];
    this.timeS = 0;
  }

  takeEvents(): GameEvent[] {
    return this.events.splice(0, this.events.length);
  }

  /** What happened in the execution since last asked (stages beginning, blows landing), for the sound and effects. */
  takeKillEvents(): KillEvent[] {
    return this.killEvents.splice(0, this.killEvents.length);
  }

  /** The whole scene of the execution now (positions, poses, camera), or null when there is none. */
  get killFrame(): KillFrame | null {
    return this.kill ? this.kill.frame(Math.min(this.killT, this.kill.durationS)) : null;
  }

  /** Is this body outside the house (in a yard or on the street)? The player may not go there. */
  private outdoors(p: Placed): boolean {
    const room = this.world.roomAt(p.floor, p.x, p.y);
    return room === null || room.outdoors === true;
  }

  /** The player's walking speed for a posture. */
  static speedFor(posture: Posture): number {
    return posture === 'run' ? RUN_MPS : posture === 'crouch' ? CROUCH_MPS : posture === 'hidden' ? 0 : WALK_MPS;
  }

  step(dtS: number, input: PlayerInput): void {
    this.timeS += dtS;
    this.round.update(dtS);
    if (this.round.phase === 'hunt' && this.lastPhase === 'prep') this.beginEntrance();
    this.lastPhase = this.round.phase;
    if (this.kill) this.stepKill(dtS);
    if (this.round.over || this.round.phase === 'killing') {
      this.player.speedMps = 0;
      return;
    }
    const mark = this.events.length;
    this.stepPlayer(dtS, input);
    this.stepProps(dtS);
    if (this.round.phase === 'hunt') this.stepHunter(dtS, this.events.slice(mark));
  }

  /** The hunter thinks and moves; he reads the player's body and the noises just made, never the peeking view. */
  private stepHunter(dtS: number, heard: GameEvent[]): void {
    if (this.entrance) {
      this.stepEntrance(dtS);
      return;
    }
    const p = this.player;
    const caught = this.hunter.step(dtS, {
      world: this.world,
      spots: this.spots,
      body: {
        floor: p.floor,
        x: p.x,
        y: p.y,
        crouching: p.crouching,
        hiding: this.spots.find((s) => s.id === p.hidingIn) ?? null,
      },
      events: heard,
      timeS: this.timeS,
      openDoor: (id) => this.setDoor(id, true, 'hunter'),
      step: (at, floor, gait) =>
        this.events.push({ kind: 'footstep', at, floor, loudness: HUNTER_STEP_LOUDNESS[gait], by: 'hunter' }),
      noise: (at, floor, loudness, detail) =>
        this.events.push({ kind: 'inspect', at, floor, loudness, detail, by: 'hunter' }),
    });
    if (caught) this.beginKill();
  }

  /**
   * The hunt begins (owner, 19/11/2026): the front door is unlocked and opens, and Shroud walks in from outside. He
   * is only driven in if he is still waiting at his start; he is not thinking until he is through, and the door
   * shuts and locks behind him.
   */
  private beginEntrance(): void {
    const e = this.house.hunterEntry;
    const h = this.hunter;
    const start = this.house.hunterStart;
    if (!e || Math.hypot(h.x - start.x, h.y - start.y) > 0.5) return;
    const door = this.world.door(e.doorId);
    if (!door) return;
    const from = { x: h.x, y: h.y };
    const to = { x: e.to.x, y: e.to.y };
    const through = { x: (door.rect.x0 + door.rect.x1) / 2, y: (door.rect.y0 + door.rect.y1) / 2 };
    const lenM = Math.hypot(to.x - from.x, to.y - from.y);
    const doorM = Math.hypot(through.x - from.x, through.y - from.y);
    this.world.setUnlocked(e.doorId, true);
    this.setDoor(e.doorId, true, 'hunter');
    this.entrance = { from, to, walkedM: 0, lenM, closeAtM: Math.min(lenM, doorM + 1.1), stepM: 0 };
  }

  private stepEntrance(dtS: number): void {
    const en = this.entrance;
    const e = this.house.hunterEntry;
    if (!en || !e) return;
    const h = this.hunter;
    const speed = ENTRANCE_MPS * dtS;
    en.walkedM = Math.min(en.lenM, en.walkedM + speed);
    en.stepM += speed;
    const k = en.lenM > 0 ? en.walkedM / en.lenM : 1;
    h.floor = e.to.floor;
    h.x = en.from.x + (en.to.x - en.from.x) * k;
    h.y = en.from.y + (en.to.y - en.from.y) * k;
    h.facing = Math.atan2(en.to.y - en.from.y, en.to.x - en.from.x);
    h.gait = 'walk';
    if (en.stepM >= 1.1) {
      en.stepM = 0;
      this.events.push({
        kind: 'footstep',
        at: { x: h.x, y: h.y },
        floor: h.floor,
        loudness: HUNTER_STEP_LOUDNESS.walk,
        by: 'hunter',
      });
    }
    // Through the doorway: it swings shut behind him and locks for good.
    if (en.walkedM >= en.closeAtM && this.world.isOpen(e.doorId)) {
      this.setDoor(e.doorId, false, 'hunter');
      this.world.setUnlocked(e.doorId, false);
    }
    if (en.walkedM >= en.lenM) {
      this.world.setUnlocked(e.doorId, false);
      this.entrance = null;
    }
  }

  /**
   * The catch (owner, 19/11/2026): the execution starts where he stands. If the player is hiding he opens the place,
   * drags them out and kills them in the room; the round's killing phase lasts as long as that takes.
   */
  private beginKill(): void {
    const p = this.player;
    const h = this.hunter;
    const spot = this.spots.find((s) => s.id === p.hidingIn) ?? null;
    const seq = new KillSequence({
      world: this.world,
      floor: p.floor,
      hunter: { x: h.x, y: h.y },
      player: { x: p.x, y: p.y },
      spot,
    });
    if (!this.round.catchPlayer(seq.durationS)) return;
    h.mode = 'chase';
    this.kill = seq;
    this.killT = 0;
    this.killEvents.push(...seq.eventsBetween(-1, 0));
    this.applyKill();
  }

  private stepKill(dtS: number): void {
    const seq = this.kill;
    if (!seq) return;
    const from = this.killT;
    this.killT = Math.min(seq.durationS, this.killT + dtS);
    this.killEvents.push(...seq.eventsBetween(from, this.killT));
    this.applyKill();
  }

  /** Put both bodies where the execution has them (the hunter and the player are driven, not simulated). */
  private applyKill(): void {
    const f = this.killFrame;
    if (!f) return;
    const h = this.hunter;
    const p = this.player;
    h.x = f.hunter.x;
    h.y = f.hunter.y;
    h.floor = p.floor;
    h.facing = f.hunter.face;
    p.x = f.player.x;
    p.y = f.player.y;
    if (f.player.revealed) p.hidingIn = null;
    p.posture = p.hidingIn ? 'hidden' : 'crouch';
    p.crouching = f.player.limp;
    p.speedMps = 0;
    p.peeking = false;
    p.peekX = 0;
    p.peekY = 0;
    // Facing on screen: away from the hunter, so the body sprawls forward in front of him.
    p.facing = p.x - h.x - (p.y - h.y) >= 0 ? 1 : -1;
  }

  private stepPlayer(dtS: number, input: PlayerInput): void {
    const p = this.player;
    if (p.hidingIn) {
      // Hidden: the body is still (it can lean the view a little and step out).
      this.stepPeek(dtS, input);
      p.posture = 'hidden';
      p.speedMps = 0;
      if (input.interactPress) this.interact();
      return;
    }
    if (input.crouchPress) p.crouching = !p.crouching;
    this.stepPeek(dtS, input);
    const wants = Math.hypot(input.move.x, input.move.y) > 0.05 && !input.peek;
    if (wants) {
      const m = Math.hypot(input.move.x, input.move.y);
      p.dirX = input.move.x / m;
      p.dirY = input.move.y / m;
    }
    p.posture = p.crouching ? 'crouch' : input.run && wants ? 'run' : 'walk';
    if (input.interactPress) this.interact();
    if (!wants) {
      p.speedMps = 0;
      return;
    }
    const speed = HideSeekGame.speedFor(p.posture);
    const dx = input.move.x * speed * dtS;
    const dy = input.move.y * speed * dtS;
    const fromX = p.x;
    const fromY = p.y;
    const r = this.world.move(p, dx, dy, BODY_RADIUS_M);
    // The game is played inside the house (owner, 18/11/2026): a step that would take the player outdoors is undone.
    if (this.outdoors(p)) {
      p.x = fromX;
      p.y = fromY;
      this.world.move(p, dx, 0, BODY_RADIUS_M);
      if (this.outdoors(p)) {
        p.x = fromX;
        p.y = fromY;
        this.world.move(p, 0, dy, BODY_RADIUS_M);
        if (this.outdoors(p)) {
          p.x = fromX;
          p.y = fromY;
        }
      }
    }
    // A person opens a door by walking into it.
    if (r.pushedDoor) this.setDoor(r.pushedDoor, true);
    const moved = Math.hypot(p.x - fromX, p.y - fromY);
    p.speedMps = moved / dtS;
    if (Math.abs(input.move.x - input.move.y) > 0.05) p.facing = input.move.x - input.move.y >= 0 ? 1 : -1;
    p.stepM += moved;
    const stride = p.posture === 'run' ? 1.6 : p.posture === 'crouch' ? 0.8 : 1.1;
    if (p.stepM >= stride) {
      p.stepM = 0;
      this.events.push({
        kind: 'footstep',
        at: { x: p.x, y: p.y },
        floor: p.floor,
        loudness: FOOTSTEP_LOUDNESS[p.posture],
      });
    }
  }

  /** Lean the view toward where the player pushes while peek is held, never through a wall. */
  private stepPeek(dtS: number, input: PlayerInput): void {
    const p = this.player;
    // Hidden, the view is fixed: a small circle round the place, with nothing to hold or lean (owner, 19/11/2026).
    if (p.hidingIn) {
      p.peeking = false;
      p.peekX = 0;
      p.peekY = 0;
      return;
    }
    p.peeking = input.peek;
    const m = Math.hypot(input.move.x, input.move.y);
    let gx = 0;
    let gy = 0;
    if (input.peek && m > 0.05) {
      const reach = PEEK_M;
      gx = (input.move.x / m) * reach;
      gy = (input.move.y / m) * reach;
      // Shorten the lean until the view origin has a clear line from the body (no leaning through a wall).
      for (
        let k = 0;
        k < 6 && !this.world.lineOfSight(p.floor, p, { x: p.x + gx, y: p.y + gy }, { ignoreFurniture: true });
        k++
      ) {
        gx *= 0.6;
        gy *= 0.6;
      }
    }
    const k = Math.min(1, dtS * PEEK_RATE);
    p.peekX += (gx - p.peekX) * k;
    p.peekY += (gy - p.peekY) * k;
    if (Math.hypot(p.peekX, p.peekY) < 0.005 && gx === 0 && gy === 0) {
      p.peekX = 0;
      p.peekY = 0;
    }
  }

  /** What the player's eyes see from: the body plus any peek lean. The visibility system reads this; the hunter never does. */
  viewer(): Viewer {
    const p = this.player;
    const stair = p.onStairs ? this.house.stairs.find((s) => s.id === p.onStairs) : undefined;
    const t = stair ? Math.min(1, Math.max(0, this.world.rampT(stair, p.x, p.y))) : 0;
    const spot = p.hidingIn ? this.spots.find((s) => s.id === p.hidingIn) : undefined;
    return {
      floor: p.floor,
      x: p.x + p.peekX,
      y: p.y + p.peekY,
      onStairs: p.onStairs,
      stairT: t,
      // A hiding place with a door, a lid or a curtain shows the small view circle by itself; under the table does not.
      // In the execution the whole scene is shown: the view circle is gone.
      ...(spot && !this.kill && blindsWhenHidden(spot) ? { viewM: spot.spec.viewM, hiddenView: 'peek' as const } : {}),
    };
  }

  /** The nearest door within reach on the player's floor. */
  doorNear(): { id: string; open: boolean } | null {
    const p = this.player;
    let best: { id: string; open: boolean; d: number } | null = null;
    for (const d of this.house.doors) {
      if (d.floor !== p.floor || d.kind === 'arch' || this.world.isLocked(d.id)) continue;
      const cx = (d.rect.x0 + d.rect.x1) / 2;
      const cy = (d.rect.y0 + d.rect.y1) / 2;
      const dist = Math.hypot(cx - p.x, cy - p.y);
      if (dist <= DOOR_REACH_M && (!best || dist < best.d)) best = { id: d.id, open: this.world.isOpen(d.id), d: dist };
    }
    return best ? { id: best.id, open: best.open } : null;
  }

  /**
   * The interact key does the most specific thing at hand: leave the hiding place; throw what is
   * carried; pick up something close; get into a hiding place; open or close a door.
   */
  private interact(): void {
    const p = this.player;
    if (p.hidingIn) {
      this.leaveHiding();
      return;
    }
    // A hiding place within reach always wins (owner, 20/11/2026): an item on the floor beside it, or one in the
    // player's hands, never stops them getting in.
    const spot = nearestHideSpot(this.spots, p.floor, p);
    if (spot) {
      this.enterHiding(spot);
      return;
    }
    if (p.carrying) {
      this.throwCarried();
      return;
    }
    const prop = this.propNear();
    if (prop) {
      this.pickUp(prop);
      return;
    }
    const door = this.doorNear();
    if (door) this.setDoor(door.id, !door.open);
  }

  /** What pressing interact would do now, as words for the prompt (null when nothing). */
  prompt(): string | null {
    const p = this.player;
    if (p.hidingIn) return 'Leave the hiding place';
    const spot = nearestHideSpot(this.spots, p.floor, p);
    if (spot) return `Hide (${HIDE_NAMES[spot.spec.kind]})`;
    if (p.carrying) return 'Throw';
    const prop = this.propNear();
    if (prop) return `Pick up the ${prop.kind}`;
    const door = this.doorNear();
    return door ? (door.open ? 'Close the door' : 'Open the door') : null;
  }

  private propNear(): PropState | null {
    const p = this.player;
    let best: { prop: PropState; d: number } | null = null;
    for (const o of this.props) {
      if (o.mode !== 'rest' || o.floor !== p.floor) continue;
      const d = Math.hypot(o.x - p.x, o.y - p.y);
      if (d <= PICKUP_REACH_M && (!best || d < best.d)) best = { prop: o, d };
    }
    return best?.prop ?? null;
  }

  private pickUp(o: PropState): void {
    const p = this.player;
    o.mode = 'carried';
    p.carrying = o.id;
    this.events.push({ kind: 'pickup', at: { x: p.x, y: p.y }, floor: p.floor, loudness: 0.1, detail: o.kind });
  }

  private throwCarried(): void {
    const p = this.player;
    const o = this.props.find((x) => x.id === p.carrying);
    p.carrying = null;
    if (!o) return;
    launch(o, { x: p.x + p.dirX * 0.4, y: p.y + p.dirY * 0.4 }, { x: p.dirX, y: p.dirY });
    this.events.push({ kind: 'throw', at: { x: p.x, y: p.y }, floor: p.floor, loudness: 0.15, detail: o.kind });
  }

  private stepProps(dtS: number): void {
    const p = this.player;
    for (const o of this.props) {
      if (o.mode === 'carried') {
        o.x = p.x;
        o.y = p.y;
        o.floor = p.floor;
      } else if (o.mode === 'flying') {
        const landed = flyStep(this.world, o, dtS);
        if (landed)
          this.events.push({
            kind: 'impact',
            at: landed,
            floor: o.floor,
            loudness: IMPACT_LOUDNESS[o.kind],
            detail: o.kind,
          });
      }
    }
  }

  private enterHiding(spot: HideSpot): void {
    const p = this.player;
    // Hands are emptied first: what was carried is set down at the way out, on free floor.
    const held = p.carrying ? this.props.find((x) => x.id === p.carrying) : undefined;
    if (held) {
      const out = exitPoint(this.world, spot);
      held.mode = 'rest';
      held.x = out.x;
      held.y = out.y;
      held.floor = spot.floor;
      p.carrying = null;
    }
    p.hidingIn = spot.id;
    p.x = spot.spec.at.x;
    p.y = spot.spec.at.y;
    p.crouching = false;
    p.posture = 'hidden';
    p.speedMps = 0;
    this.events.push({
      kind: 'hide-enter',
      at: { x: p.x, y: p.y },
      floor: p.floor,
      loudness: spot.spec.noise,
      detail: spot.spec.kind,
      id: spot.id,
    });
  }

  private leaveHiding(): void {
    const p = this.player;
    const spot = this.spots.find((s) => s.id === p.hidingIn);
    p.hidingIn = null;
    p.posture = 'walk';
    if (!spot) return;
    const out = exitPoint(this.world, spot);
    p.x = out.x;
    p.y = out.y;
    this.events.push({
      kind: 'hide-exit',
      at: { x: spot.spec.at.x, y: spot.spec.at.y },
      floor: p.floor,
      loudness: spot.spec.noise,
      detail: spot.spec.kind,
      id: spot.id,
    });
  }

  /** Open or close a door and make the noise of it. */
  setDoor(id: string, open: boolean, by?: 'hunter'): void {
    if (!this.world.setDoor(id, open)) return;
    const d = this.world.door(id);
    if (!d) return;
    this.events.push({
      kind: 'door',
      id,
      open,
      at: { x: (d.rect.x0 + d.rect.x1) / 2, y: (d.rect.y0 + d.rect.y1) / 2 },
      floor: d.floor,
      loudness: d.exterior ? 0.7 : 0.5,
      ...(by ? { by } : {}),
    });
  }
}

/** How loud each posture's footsteps are, 0..1 (running carries, crouching hardly does; section D). */
export const FOOTSTEP_LOUDNESS: Readonly<Record<Posture, number>> = { run: 0.9, walk: 0.45, crouch: 0.12, hidden: 0 };

/** Names of the hiding places for the prompt. */
const HIDE_NAMES: Readonly<Record<HideSpot['spec']['kind'], string>> = {
  'under-bed': 'under the bed',
  wardrobe: 'in the wardrobe',
  cupboard: 'in the cupboard',
  chest: 'in the chest',
  box: 'in the box',
  'behind-sofa': 'behind the sofa',
  curtain: 'behind the curtain',
  'shower-curtain': 'behind the shower curtain',
  bush: 'in the bush',
  'under-table': 'under the table',
  'shed-cabinet': 'in the cabinet',
};
