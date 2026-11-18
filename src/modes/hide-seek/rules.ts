/**
 * Hide and Seek round rules (Phase 2, master plan section H): exactly 20 s of preparation, then the
 * hunt; survive two minutes to win; if the hunter catches the player a one-time killing animation
 * plays and then Game Over shows. Pure and deterministic: the scene feeds it time and events.
 */
export const PREP_S = 20;
export const SURVIVE_S = 120;
/** How long the killing animation runs before Game Over shows, seconds. */
export const KILL_ANIMATION_S = 2.4;

export type RoundPhase = 'prep' | 'hunt' | 'victory' | 'killing' | 'gameover';

export class Round {
  phase: RoundPhase = 'prep';
  private clockS = 0;
  private huntS = 0;
  private killS = 0;
  private killStarted = 0;
  /** Phase changes this step, for the scene (sounds, screens): consumed by `takeEvents`. */
  private events: string[] = [];

  /** Seconds of preparation left (20 down to 0); 0 once the hunt has begun. */
  get prepLeftS(): number {
    return this.phase === 'prep' ? Math.max(0, PREP_S - this.clockS) : 0;
  }

  /** Seconds of the hunt survived so far. */
  get survivedS(): number {
    return Math.min(SURVIVE_S, this.huntS);
  }

  /** Seconds of survival left in the hunt (2:00 down to 0). */
  get survivalLeftS(): number {
    return this.phase === 'prep' ? SURVIVE_S : Math.max(0, SURVIVE_S - this.huntS);
  }

  /** The hunter is hunting now (never during preparation). */
  get hunting(): boolean {
    return this.phase === 'hunt';
  }

  /** The round is over (won, or caught and the animation finished). */
  get over(): boolean {
    return this.phase === 'victory' || this.phase === 'gameover';
  }

  /** How many times the killing animation has been started (always 0 or 1). */
  get killsStarted(): number {
    return this.killStarted;
  }

  /** How far through the killing animation, 0..1. */
  get killProgress(): number {
    return this.phase === 'killing' ? Math.min(1, this.killS / KILL_ANIMATION_S) : this.phase === 'gameover' ? 1 : 0;
  }

  update(dtS: number): void {
    switch (this.phase) {
      case 'prep':
        this.clockS += dtS;
        if (this.clockS >= PREP_S - 1e-9) {
          this.phase = 'hunt';
          this.events.push('hunt');
        }
        break;
      case 'hunt':
        this.huntS += dtS;
        if (this.huntS >= SURVIVE_S - 1e-9) {
          this.phase = 'victory';
          this.events.push('victory');
        }
        break;
      case 'killing':
        this.killS += dtS;
        if (this.killS >= KILL_ANIMATION_S) {
          this.phase = 'gameover';
          this.events.push('gameover');
        }
        break;
      default:
        break;
    }
  }

  /**
   * The hunter has caught the player. Only counts during the hunt, and only once: the killing
   * animation can never start twice or after a win. Returns whether it started.
   */
  catchPlayer(): boolean {
    if (this.phase !== 'hunt') return false;
    this.phase = 'killing';
    this.killStarted++;
    this.events.push('killing');
    return true;
  }

  takeEvents(): string[] {
    return this.events.splice(0, this.events.length);
  }

  /** Back to the start: the countdown, the clock and the kill state all reset. */
  reset(): void {
    this.phase = 'prep';
    this.clockS = 0;
    this.huntS = 0;
    this.killS = 0;
    this.killStarted = 0;
    this.events = [];
  }
}

/** M:SS for a number of seconds, rounded up (so 119.2 s reads 2:00 until the last second starts). */
export function clockText(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds - 1e-9));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
