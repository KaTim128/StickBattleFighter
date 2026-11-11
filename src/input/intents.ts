/**
 * Device-independent player intents (INV-6, CONTROL_SCHEME §5). Devices write
 * here; gameplay reads here and never touches keyboards or touchscreens.
 * Phase 2 covers movement and jump; combat intents arrive in Phase 5+.
 */
export interface Vec2 {
  x: number;
  y: number;
}

/** Clamp a stick/keyboard vector to length ≤ 1 so diagonals are never faster. */
export function clampToUnit(v: Vec2): Vec2 {
  const len = Math.hypot(v.x, v.y);
  return len > 1 ? { x: v.x / len, y: v.y / len } : { x: v.x, y: v.y };
}

/** Up to three taps can wait for the fixed step. */
const MAX_QUEUED_MELEE_EDGES = 6;

/** Which ability button was pressed (the same ids as the ability framework's slots). */
export type AbilityPress = 'a1' | 'a2' | 'a3' | 'ult';

export class PlayerIntents {
  private readonly sources = new Map<string, Vec2>();
  private jumpQueued = false;

  /** Each device reports its own movement vector (+x right, +y down the screen). */
  setMove(source: string, v: Vec2): void {
    if (v.x === 0 && v.y === 0) this.sources.delete(source);
    else this.sources.set(source, clampToUnit(v));
  }

  /** Combined movement from all devices, never longer than 1. */
  get move(): Vec2 {
    let x = 0;
    let y = 0;
    for (const v of this.sources.values()) {
      x += v.x;
      y += v.y;
    }
    return clampToUnit({ x, y });
  }

  /** A press is remembered until one simulation step consumes it, so short taps are never lost. */
  pressJump(): void {
    this.jumpQueued = true;
  }

  consumeJump(): boolean {
    const queued = this.jumpQueued;
    this.jumpQueued = false;
    return queued;
  }

  // ---- Button 1 (melee). Tap = attack, hold = block (CONTROL_SCHEME, REQ-CTL-11).
  // Devices report press and release; the game decides tap vs hold on its fixed step.
  // Edges are queued, not flags, so two quick taps landing between two steps (a slow frame
  // or hit-stop) are both kept: each step consumes at most one press-and-release.
  private meleeDown = false;
  private meleeEdges: ('down' | 'up')[] = [];

  meleePress(): void {
    if (!this.meleeDown) this.queueEdge('down');
    this.meleeDown = true;
  }

  meleeRelease(): void {
    if (this.meleeDown) this.queueEdge('up');
    this.meleeDown = false;
  }

  /** A quick tap (press and release), e.g. from tests or a tap faster than one step. */
  pressMelee(): void {
    this.meleePress();
    this.meleeRelease();
  }

  get meleeHeld(): boolean {
    return this.meleeDown;
  }

  /** The next press and/or release edge, one tap per step; later taps wait for later steps. */
  consumeMeleeEdges(): { pressed: boolean; released: boolean } {
    const pressed = this.meleeEdges[0] === 'down';
    if (pressed) this.meleeEdges.shift();
    const released = this.meleeEdges[0] === 'up';
    if (released) this.meleeEdges.shift();
    return { pressed, released };
  }

  private queueEdge(edge: 'down' | 'up'): void {
    if (this.meleeEdges.length >= MAX_QUEUED_MELEE_EDGES) return; // ignore mashing beyond a few taps
    this.meleeEdges.push(edge);
  }

  // ---- Buttons 2–5: abilities 1–3 and the ultimate (CONTROL_SCHEME §3–4). Queued so a press
  // between steps is never lost; at most two wait (no buffering a whole rotation).
  private readonly abilityQueue: AbilityPress[] = [];

  pressAbility(slot: AbilityPress): void {
    if (this.abilityQueue.length < 2) this.abilityQueue.push(slot);
  }

  consumeAbility(): AbilityPress | null {
    return this.abilityQueue.shift() ?? null;
  }

  // ---- Ultimate aiming by drag (touch: hold ULT and drag). A vector of length ≤ 1:
  // its direction is where to land, its length the fraction of the maximum range.
  private ultDragValue: Vec2 | null = null;

  setUltDrag(v: Vec2 | null): void {
    this.ultDragValue = v ? clampToUnit(v) : null;
  }

  get ultDrag(): Vec2 | null {
    return this.ultDragValue;
  }

  // ---- Dodge (Shift, double-tap or joystick flick; REQ-CTL-12).
  private dodgeQueued = false;

  pressDodge(): void {
    this.dodgeQueued = true;
  }

  consumeDodge(): boolean {
    const queued = this.dodgeQueued;
    this.dodgeQueued = false;
    return queued;
  }

  // ---- Pick up / throw (REQ-CTL-13, TD-016): one contextual button. Desktop G or U is a pure
  // interact key; the touch utility button also jumps when there is nothing to pick up or throw.
  // Press = pick up or (on release) throw; hold while carrying = put down. Edges are queued.
  private interactDown = false;
  private readonly interactEdges: { down: boolean; orJump: boolean }[] = [];

  interactPress(orJump = false): void {
    if (!this.interactDown && this.interactEdges.length < 4) this.interactEdges.push({ down: true, orJump });
    this.interactDown = true;
  }

  interactRelease(): void {
    if (this.interactDown && this.interactEdges.length < 4) this.interactEdges.push({ down: false, orJump: false });
    this.interactDown = false;
  }

  get interactHeld(): boolean {
    return this.interactDown;
  }

  /** The next press or release, one per step. */
  consumeInteract(): { down: boolean; orJump: boolean } | null {
    return this.interactEdges.shift() ?? null;
  }

  clear(): void {
    this.interactDown = false;
    this.interactEdges.length = 0;
    this.sources.clear();
    this.jumpQueued = false;
    this.meleeDown = false;
    this.meleeEdges.length = 0;
    this.dodgeQueued = false;
    this.abilityQueue.length = 0;
    this.ultDragValue = null;
  }
}
