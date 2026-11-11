import { type AttackDef, type AttackId, attackDuration } from './attacks';

/**
 * Button 1 attack controller (owner request, 11/11/2026):
 *  - On the ground, repeated presses run the 1-2-3 combo: jab → hook → heavy finisher.
 *    A press during an attack is buffered; at the chain point it flows straight
 *    into the next strike. No press → the combo ends and resets to the jab.
 *  - In the air, a press does the flying kick (once per jump).
 */
export interface ComboSet {
  readonly jab: AttackDef;
  readonly hook: AttackDef;
  readonly heavy: AttackDef;
  readonly flyingKick: AttackDef;
}

const GROUND_STRING: readonly AttackId[] = ['jab', 'hook', 'heavy'];

export interface AttackEvent {
  /** The attack reached its active window: check hits now (fires once per attack). */
  readonly hit: AttackDef | null;
  /** An attack started this step. */
  readonly started: AttackDef | null;
}

export class ComboController {
  private current: AttackDef | null = null;
  private t = 0;
  private hitDone = false;
  private buffered = false;
  private comboStep = 0; // index into GROUND_STRING of the current ground attack
  private airKickUsed = false;

  constructor(private readonly set: ComboSet) {}

  get attack(): AttackDef | null {
    return this.current;
  }

  /** 0..1 through the current attack (for animation); 0 when idle. */
  get progress(): number {
    return this.current ? Math.min(1, this.t / attackDuration(this.current)) : 0;
  }

  /** 1, 2 or 3 during the ground combo; 0 otherwise. */
  get step(): number {
    return this.current && this.current.id !== 'flyingKick' ? this.comboStep + 1 : 0;
  }

  /** The attack button was pressed this step. */
  press(airborne: boolean): void {
    if (this.current) {
      this.buffered = true; // remembered until the chain point
      return;
    }
    if (airborne) {
      if (!this.airKickUsed) this.begin(this.set.flyingKick);
      if (this.current) this.airKickUsed = true;
      return;
    }
    this.comboStep = 0;
    this.begin(this.set.jab);
  }

  /** Cancel the current attack (the fighter was hit, parried, or dodged). */
  interrupt(): void {
    this.current = null;
    this.t = 0;
    this.buffered = false;
    this.comboStep = 0;
  }

  /** Call when the fighter lands, so the next jump allows another flying kick. */
  landed(): void {
    this.airKickUsed = false;
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

    const chainPoint = a.windupS + a.activeS + a.recoveryS * a.chainAtRecovery;
    const end = attackDuration(a);
    const canChain = a.id !== 'flyingKick' && this.comboStep < GROUND_STRING.length - 1 && !airborne;
    if (this.buffered && canChain && this.t >= chainPoint) {
      this.comboStep++;
      const next = this.set[GROUND_STRING[this.comboStep]!];
      this.begin(next);
      started = next;
    } else if (this.t >= end) {
      this.current = null;
      this.buffered = false;
      this.comboStep = 0;
    }
    return { hit, started };
  }

  private begin(a: AttackDef): void {
    this.current = a;
    this.t = 0;
    this.hitDone = false;
    this.buffered = false;
  }
}
