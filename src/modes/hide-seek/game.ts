import { HOUSE } from '../../data/arenas/house';
import type { HouseDef } from './house-types';
import { Round } from './rules';
import { BODY_RADIUS_M, HouseWorld, type Placed, type Point } from './world';

/**
 * The Hide and Seek game state (Phase 2, TD-095): the world, the round, the player and (later) the
 * hunter, advanced by fixed steps from the player's input. Pure and deterministic; the scene only
 * reads it to draw, and tests drive it directly.
 */
export const WALK_MPS = 2.4;
export const RUN_MPS = 4.4;
export const CROUCH_MPS = 1.2;
/** How close a door has to be for the interact key to work on it, metres. */
export const DOOR_REACH_M = 1.3;

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
}

export interface GameEvent {
  readonly kind: 'door' | 'footstep';
  readonly at: Point;
  readonly floor: 0 | 1;
  /** Loudness 0..1 (footsteps follow the posture; a door depends on whether it is an outside door). */
  readonly loudness: number;
  readonly id?: string;
  readonly open?: boolean;
}

export class HideSeekGame {
  readonly world: HouseWorld;
  readonly round = new Round();
  readonly player: PlayerState;
  private events: GameEvent[] = [];
  /** The sim clock, seconds. */
  timeS = 0;

  constructor(readonly house: HouseDef = HOUSE) {
    this.world = new HouseWorld(house);
    this.player = this.freshPlayer();
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
    };
  }

  /** Everything is back to the start: doors shut as authored, the player at the start, the round reset. */
  restart(): void {
    for (const d of this.house.doors) this.world.setDoor(d.id, d.open);
    Object.assign(this.player, this.freshPlayer());
    this.round.reset();
    this.events = [];
    this.timeS = 0;
  }

  takeEvents(): GameEvent[] {
    return this.events.splice(0, this.events.length);
  }

  /** The player's walking speed for a posture. */
  static speedFor(posture: Posture): number {
    return posture === 'run' ? RUN_MPS : posture === 'crouch' ? CROUCH_MPS : posture === 'hidden' ? 0 : WALK_MPS;
  }

  step(dtS: number, input: PlayerInput): void {
    this.timeS += dtS;
    this.round.update(dtS);
    if (this.round.over || this.round.phase === 'killing') {
      this.player.speedMps = 0;
      return;
    }
    this.stepPlayer(dtS, input);
  }

  private stepPlayer(dtS: number, input: PlayerInput): void {
    const p = this.player;
    if (input.crouchPress) p.crouching = !p.crouching;
    const wants = Math.hypot(input.move.x, input.move.y) > 0.05 && !input.peek;
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

  /** The nearest door within reach on the player's floor. */
  doorNear(): { id: string; open: boolean } | null {
    const p = this.player;
    let best: { id: string; open: boolean; d: number } | null = null;
    for (const d of this.house.doors) {
      if (d.floor !== p.floor || d.kind === 'arch') continue;
      const cx = (d.rect.x0 + d.rect.x1) / 2;
      const cy = (d.rect.y0 + d.rect.y1) / 2;
      const dist = Math.hypot(cx - p.x, cy - p.y);
      if (dist <= DOOR_REACH_M && (!best || dist < best.d)) best = { id: d.id, open: this.world.isOpen(d.id), d: dist };
    }
    return best ? { id: best.id, open: best.open } : null;
  }

  private interact(): void {
    const door = this.doorNear();
    if (door) this.setDoor(door.id, !door.open);
  }

  /** Open or close a door and make the noise of it. */
  setDoor(id: string, open: boolean): void {
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
    });
  }
}

/** How loud each posture's footsteps are, 0..1 (running carries, crouching hardly does; section D). */
export const FOOTSTEP_LOUDNESS: Readonly<Record<Posture, number>> = { run: 0.9, walk: 0.45, crouch: 0.12, hidden: 0 };
