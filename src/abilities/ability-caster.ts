import { ABILITY_SLOTS, type AbilityDef, type AbilityKit, type AbilitySlot } from './ability-def';

/**
 * One fighter's abilities (REQ-ABL-1..3): cooldowns, the ultimate charge meter,
 * and the cast in progress. Pure rules, no physics or rendering, so every rule
 * is unit-tested. The scene asks `check` before casting, spends stamina, then
 * calls `start`; `update` reports when the ability is released (the animation
 * event where the delivery begins) and when the cast is over.
 */
export type CastBlock = 'unavailable' | 'busy' | 'cooldown' | 'stamina' | 'meter' | 'airborne';

export interface CastContext {
  /** The fighter can act (free or guarding) and is not mid-attack. */
  readonly canAct: boolean;
  readonly stamina: number;
  readonly airborne: boolean;
}

export type CastPhase = 'windup' | 'recovery';

export interface ActiveCast {
  readonly def: AbilityDef;
  phase: CastPhase;
  /** Seconds into the current phase. */
  t: number;
}

export interface CastEvents {
  /** The wind-up finished this step: start the delivery now. */
  released: AbilityDef | null;
  /** The cast finished this step. */
  ended: AbilityDef | null;
}

/** One ability slot as the HUD and tests see it. */
export interface AbilitySlotState {
  readonly slot: AbilitySlot;
  readonly label: string;
  readonly name: string;
  readonly cooldownS: number;
  readonly cooldownMaxS: number;
  readonly staminaCost: number;
  /** Why it cannot be cast now, or null if ready. */
  readonly block: CastBlock | null;
}

export interface AbilityHudState {
  readonly slots: readonly AbilitySlotState[];
  readonly meter: number;
  readonly meterMax: number;
  readonly casting: string | null;
}

export class AbilityCaster {
  private readonly cooldowns = new Map<AbilitySlot, number>();
  private meterValue = 0;
  private active: ActiveCast | null = null;

  constructor(readonly kit: AbilityKit) {
    for (const s of ABILITY_SLOTS) this.cooldowns.set(s, 0);
  }

  def(slot: AbilitySlot): AbilityDef {
    return this.kit[slot];
  }

  cooldown(slot: AbilitySlot): number {
    return this.cooldowns.get(slot) ?? 0;
  }

  get meter(): number {
    return this.meterValue;
  }

  get meterFull(): boolean {
    return this.meterValue >= this.kit.charge.max;
  }

  get cast(): ActiveCast | null {
    return this.active;
  }

  /** 0..1 through the current phase (animation). */
  get phaseProgress(): number {
    const c = this.active;
    if (!c) return 0;
    const length = c.phase === 'windup' ? c.def.castS : c.def.recoveryS;
    return length > 0 ? Math.min(1, c.t / length) : 1;
  }

  /** Why this ability cannot be cast right now, or null if it can. */
  check(slot: AbilitySlot, ctx: CastContext): CastBlock | null {
    const def = this.kit[slot];
    if (this.active || !ctx.canAct) return 'busy';
    if (ctx.airborne) return 'airborne';
    if (this.cooldown(slot) > 0) return 'cooldown';
    if (slot === 'ult') return this.meterFull ? null : 'meter';
    if (ctx.stamina < def.staminaCost) return 'stamina';
    return null;
  }

  /** Begin a cast the caller has already checked (and paid stamina for). */
  start(slot: AbilitySlot): AbilityDef {
    const def = this.kit[slot];
    this.active = { def, phase: 'windup', t: 0 };
    this.cooldowns.set(slot, def.cooldownS);
    if (slot === 'ult') this.meterValue = 0;
    return def;
  }

  /** A hit landed on this fighter during the cast. Returns true if the cast was cancelled. */
  interrupt(force = false): boolean {
    const c = this.active;
    if (!c) return false;
    if (!force && (c.phase !== 'windup' || !c.def.interruptible)) return false;
    this.active = null;
    return true;
  }

  /** Damage dealt or taken fills the ultimate meter. */
  onDamage(dealt: number, taken: number): void {
    const ch = this.kit.charge;
    this.meterValue = Math.min(ch.max, this.meterValue + dealt * ch.perDamageDealt + taken * ch.perDamageTaken);
  }

  /** Fill the meter (Practice Zone, tests). */
  fillMeter(): void {
    this.meterValue = this.kit.charge.max;
  }

  reset(): void {
    for (const s of ABILITY_SLOTS) this.cooldowns.set(s, 0);
    this.meterValue = 0;
    this.active = null;
  }

  update(dtS: number): CastEvents {
    for (const s of ABILITY_SLOTS) this.cooldowns.set(s, Math.max(0, this.cooldown(s) - dtS));
    // Passive charge only between ultimates' casts.
    if (!(this.active && this.active.def.slot === 'ult')) {
      this.meterValue = Math.min(this.kit.charge.max, this.meterValue + this.kit.charge.perSecond * dtS);
    }
    const events: CastEvents = { released: null, ended: null };
    const c = this.active;
    if (!c) return events;
    c.t += dtS;
    if (c.phase === 'windup' && c.t >= c.def.castS) {
      events.released = c.def;
      c.phase = 'recovery';
      c.t -= c.def.castS;
    }
    if (c.phase === 'recovery' && c.t >= c.def.recoveryS) {
      events.ended = c.def;
      this.active = null;
    }
    return events;
  }
}
