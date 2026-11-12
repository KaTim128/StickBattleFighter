import type { MoveInput } from '../characters/schema';
import { type AttackDef, attackDuration } from './attacks';

/**
 * Button 1 move controller, driven by the fighter's Moveset Profile (TD-039;
 * generalises the original 1-2-3 combo, REQ-CMB-12..14 and REQ-CMB-22):
 *  - A press with nothing running starts the starter move for its input
 *    (tap, tap-forward, air-tap, falling-tap).
 *  - A press during a move is buffered; at the move's cancel point it flows
 *    into the move its combo route names for that input (or its only route).
 *  - No route (or no press) → the string ends and the next press starts over.
 *  - Aerial moves: once per jump.
 * Each strike also picks one of several looks (never the same twice in a row);
 * looks change only the animation, never the move's data.
 */
export interface MoveContext {
  readonly airborne: boolean;
  /** In the air and coming down. */
  readonly falling: boolean;
  /** Pushing firmly towards the facing direction. */
  readonly forward: boolean;
}

export interface AttackEvent {
  /** The move reached its active window: check hits now (fires once per move). */
  readonly hit: AttackDef | null;
  /** A move started this step. */
  readonly started: AttackDef | null;
}

/** Looks per strike to cycle between (the Animation Profile may list fewer clips). */
export const COMBO_VARIANTS = 3;

export class MoveController {
  private current: AttackDef | null = null;
  private t = 0;
  private hitDone = false;
  private buffered: MoveInput | null = null;
  private chainIndex = 0;
  private airMoveUsed = false;
  private variantIndex = 0;

  constructor(
    private readonly moves: Readonly<Record<string, AttackDef>>,
    private readonly starters: Partial<Record<MoveInput, string>>,
    private readonly pick: () => number = () => 0,
  ) {}

  get attack(): AttackDef | null {
    return this.current;
  }

  /** 0..1 through the current move (animation); 0 when idle. */
  get progress(): number {
    return this.current ? Math.min(1, this.t / attackDuration(this.current)) : 0;
  }

  /** 1, 2, 3… through a ground string; 0 otherwise. */
  get step(): number {
    return this.current && !this.current.aerial ? this.chainIndex + 1 : 0;
  }

  /** Which look the current move uses (0..COMBO_VARIANTS-1). */
  get variant(): number {
    return this.variantIndex;
  }

  /** Which input this press means in this context. */
  inputFor(ctx: MoveContext): MoveInput {
    if (ctx.airborne) return ctx.falling && this.starters['falling-tap'] ? 'falling-tap' : 'air-tap';
    return ctx.forward && this.starters['tap-forward'] ? 'tap-forward' : 'tap';
  }

  /** Button 1 was tapped this step. */
  press(ctx: MoveContext): void {
    const input = this.inputFor(ctx);
    if (this.current) {
      this.buffered = input; // remembered until the cancel point
      return;
    }
    const id = this.starters[input] ?? (ctx.airborne ? this.starters['air-tap'] : undefined);
    const move = id ? this.moves[id] : undefined;
    if (!move) return;
    if (move.aerial) {
      if (this.airMoveUsed) return;
      this.airMoveUsed = true;
    }
    this.chainIndex = 0;
    this.begin(move);
  }

  /**
   * The Heavy Attack key (owner, 12/11/2026): the fighter's own heavy blow, from the ground and only
   * when no other move is running (it never chains). Returns whether it started.
   */
  pressHeavy(ctx: MoveContext): boolean {
    if (this.current || ctx.airborne) return false;
    const id = this.starters.heavy;
    const move = id ? this.moves[id] : undefined;
    if (!move) return false;
    this.chainIndex = 0;
    this.begin(move);
    return true;
  }

  /** Cancel the current move (the fighter was hit, parried, or dodged). */
  interrupt(): void {
    this.current = null;
    this.t = 0;
    this.buffered = null;
    this.chainIndex = 0;
  }

  /** Call when the fighter lands, so the next jump allows another aerial move. */
  landed(): void {
    this.airMoveUsed = false;
  }

  update(stepS: number, airborne: boolean): AttackEvent {
    let started: AttackDef | null = null;
    let hit: AttackDef | null = null;
    const a = this.current;
    if (!a) return { hit, started };

    this.t += stepS;
    if (!this.hitDone && this.t >= a.windupS) {
      this.hitDone = true;
      hit = a;
    }

    const cancelPoint = a.windupS + a.activeS + a.recoveryS * a.chainAtRecovery;
    const end = attackDuration(a);
    const next = this.buffered !== null && !airborne ? this.routeFrom(a, this.buffered) : null;
    if (next && this.t >= cancelPoint) {
      this.chainIndex++;
      this.begin(next);
      started = next;
    } else if (this.t >= end) {
      this.current = null;
      this.buffered = null;
      this.chainIndex = 0;
    }
    return { hit, started };
  }

  private routeFrom(a: AttackDef, input: MoveInput): AttackDef | null {
    const routes = a.next;
    const id = routes[input] ?? Object.values(routes)[0];
    return id ? (this.moves[id] ?? null) : null;
  }

  private begin(a: AttackDef): void {
    // A different look from last time: shift by 1..N-1 so it never repeats back to back.
    this.variantIndex = (this.variantIndex + 1 + Math.floor(this.pick() * (COMBO_VARIANTS - 1))) % COMBO_VARIANTS;
    this.current = a;
    this.t = 0;
    this.hitDone = false;
    this.buffered = null;
  }
}
