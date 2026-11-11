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

  clear(): void {
    this.sources.clear();
    this.jumpQueued = false;
  }
}
