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
export type AbilityPress = 'a1' | 'a2' | 'a3' | 'a4' | 'ult';

export class PlayerIntents {
  private readonly sources = new Map<string, Vec2>();
  private jumpQueued = false;

  /**
   * How a direction on screen maps to the world. Movement intents are WORLD directions (what the
   * simulation uses); devices report SCREEN directions through `setMoveFromScreen`, which this
   * maps. Identity for a top-down view; the 2.5D view turns it (TD-045) so W walks up the screen.
   */
  screenToWorld: (v: Vec2) => Vec2 = (v) => v;

  /** A device's stick or keys, as a screen direction (+x right, +y down the screen). */
  setMoveFromScreen(source: string, v: Vec2): void {
    this.setMove(source, this.screenToWorld(clampToUnit(v)));
  }

  /** Each source's movement as a world direction (devices use `setMoveFromScreen`; tests may set this directly). */
  setMove(source: string, v: Vec2): void {
    if (v.x === 0 && v.y === 0) this.sources.delete(source);
    else this.sources.set(source, clampToUnit(v));
  }

  /** One device's movement (world direction), or null when it is idle. */
  moveFrom(source: string): Vec2 | null {
    return this.sources.get(source) ?? null;
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

  // ---- Heavy Attack (owner, 12/11/2026): each fighter's own heavy blow. One press queued at most.
  private heavyQueued = false;

  pressHeavy(): void {
    this.heavyQueued = true;
  }

  consumeHeavy(): boolean {
    const queued = this.heavyQueued;
    this.heavyQueued = false;
    return queued;
  }

  // ---- Fire Beam rotation (owner, 12/11/2026): while a beam pours, held keys sweep it left (−1)
  // or right (+1). Outside a beam these keys do their normal jobs.
  beamTurnLeft = false;
  beamTurnRight = false;

  /** −1 sweeping left, +1 right, 0 neither or both. */
  get beamTurn(): number {
    return (this.beamTurnRight ? 1 : 0) - (this.beamTurnLeft ? 1 : 0);
  }

  // ---- Cancel targeting (owner, 12/11/2026): Escape on desktop, the ✕ button on touch. While an
  // ability is being aimed this calls it off without casting; otherwise it is ignored.
  private aimCancelQueued = false;

  pressAimCancel(): void {
    this.aimCancelQueued = true;
  }

  consumeAimCancel(): boolean {
    const queued = this.aimCancelQueued;
    this.aimCancelQueued = false;
    return queued;
  }

  // ---- Swipe on the empty part of the screen (touch, owner 12/11/2026): steers a beam. The
  // direction the finger is moving, as a world direction, or null with no swipe.
  private swipeValue: Vec2 | null = null;

  setSwipeFromScreen(v: Vec2 | null): void {
    const len = v ? Math.hypot(v.x, v.y) : 0;
    this.swipeValue = v && len > 0 ? this.screenToWorld({ x: v.x / len, y: v.y / len }) : null;
  }

  get swipe(): Vec2 | null {
    return this.swipeValue;
  }

  // ---- Mouse pointer (desktop): where the cursor is over the game, in CSS pixels of the game
  // area. `pointerMoves` counts moves so the game can tell a fresh hover from a stale one.
  private pointerAt: Vec2 | null = null;
  private pointerMoveCount = 0;

  setPointer(p: Vec2 | null): void {
    this.pointerAt = p ? { x: p.x, y: p.y } : null;
    if (p) this.pointerMoveCount++;
  }

  get pointer(): Vec2 | null {
    return this.pointerAt;
  }

  get pointerMoves(): number {
    return this.pointerMoveCount;
  }

  // ---- Sprint (hold Shift by default): faster running while held.
  sprint = false;

  // ---- Dodge (right click, double-tap or joystick flick; REQ-CTL-12).
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
    this.aimCancelQueued = false;
    this.heavyQueued = false;
    this.beamTurnLeft = false;
    this.beamTurnRight = false;
    this.sprint = false;
    this.abilityQueue.length = 0;
  }
}
