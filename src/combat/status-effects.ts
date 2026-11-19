/**
 * Status-effect registry (master plan Phase 1 B8, TD-073). One place for every timed effect on a
 * fighter: damage over time, damage-taken and damage-dealt multipliers, slows, sight limits and
 * plain flags (blind). Systems read the aggregates; presentation reads `active`. Nothing else keeps
 * its own status timer, so adding poison, a new slow or a new debuff is a definition, not new state.
 */

import { Toxicity } from './toxicity';

export type StatusId = 'burn' | 'bleed' | 'blind' | 'decay' | 'dark' | 'toxicity' | 'fog' | 'momentum' | 'disrupt';

/** How a new application meets one already running. */
export type StatusStacking =
  /** Refreshes: the longer time and the stronger values win; it never multiplies. */
  | 'strongest'
  /** Adds a stack (up to `maxStacks`); every stack multiplies the factors and adds to the damage rate. */
  | 'stack';

export interface StatusDef {
  readonly stacking: StatusStacking;
  readonly maxStacks?: number;
  /**
   * Damage over time is dealt in lumps this far apart (seconds); 0 deals it continuously every step.
   * Only used by effects applied with a `dps`.
   */
  readonly tickIntervalS: number;
}

/** What one application of an effect does. Absent fields do nothing. */
export interface StatusParams {
  /** Damage per second (a damage-over-time effect). */
  readonly dps?: number;
  /** Multiplies the damage this fighter deals (1 = none). */
  readonly attackFactor?: number;
  /** Multiplies this fighter's defence (1 = none). */
  readonly defenceFactor?: number;
  /** Multiplies the damage this fighter takes (1 = none). */
  readonly damageTakenFactor?: number;
  /** Multiplies this fighter's movement speed (1 = none; a slow is below 1). */
  readonly speedFactor?: number;
  /** The most it can see, metres. */
  readonly sightM?: number;
}

/**
 * Bleeding (owner decision 17/11/2026, TD-072): a bleeding fighter takes 10% more damage from every
 * source for 6 s. Reapplying refreshes the 6 s and never raises the 10%; it deals no damage itself.
 */
export const BLEED = { damageTakenFactor: 1.1, durationS: 6 } as const;

/** Poison fog damage lands in lumps this far apart (seconds): rapid and repeated, never one big hit. */
export const FOG_TICK_S = 0.2;

export const STATUS_DEFS: Record<StatusId, StatusDef> = {
  burn: { stacking: 'strongest', tickIntervalS: 0 },
  bleed: { stacking: 'strongest', tickIntervalS: 0 },
  blind: { stacking: 'strongest', tickIntervalS: 0 },
  // Reson's Feedback Pulse: movement direction wobbles for a moment; no damage, no stun.
  disrupt: { stacking: 'strongest', tickIntervalS: 0 },
  decay: { stacking: 'strongest', tickIntervalS: 0 },
  dark: { stacking: 'strongest', tickIntervalS: 0 },
  // Vexoris's Plague Bloom fog: renewed every step while inside it, so it lapses a moment after leaving.
  fog: { stacking: 'strongest', tickIntervalS: FOG_TICK_S },
  // Aerion's Aerial Momentum: stacks of speed from landed blows, all lapsing together.
  momentum: { stacking: 'stack', maxStacks: 10, tickIntervalS: 0 },
  // Poison keeps its own meter (`Toxicity`); this entry only names it for the registry's indicators.
  toxicity: { stacking: 'stack', tickIntervalS: 0 },
};

interface Instance {
  readonly id: string;
  leftS: number;
  stacks: number;
  dps: number;
  attackFactor: number;
  defenceFactor: number;
  damageTakenFactor: number;
  speedFactor: number;
  sightM: number;
  /** Time banked towards the next lump of damage over time. */
  tickBankS: number;
}

/** Deals `amount` damage from the effect `id`; returns what was really dealt (0 once the target is down). */
export type DotSink = (id: string, amount: number) => number;

export class StatusEffects<Id extends string = StatusId> {
  private readonly list: Instance[] = [];
  private readonly immune = new Map<string, number>();
  private readonly endedIds: string[] = [];
  /** Vexoris's poison (stacking toxicity, one damage sequence, a capped slow); see `toxicity.ts`. */
  readonly toxicity = new Toxicity();

  constructor(private readonly defs: Readonly<Record<Id, StatusDef>> = STATUS_DEFS as Record<Id, StatusDef>) {}

  /**
   * Apply an effect for `durationS`. Refused while the fighter is immune to it or the duration is
   * not positive. Returns whether it took hold.
   */
  apply(id: Id, durationS: number, params: StatusParams = {}): boolean {
    if (durationS <= 0 || this.isImmune(id)) return false;
    const def = this.defs[id];
    const dps = params.dps ?? 0;
    const current = this.find(id);
    if (!current) {
      this.list.push({
        id,
        leftS: durationS,
        stacks: 1,
        dps,
        attackFactor: params.attackFactor ?? 1,
        defenceFactor: params.defenceFactor ?? 1,
        damageTakenFactor: params.damageTakenFactor ?? 1,
        speedFactor: params.speedFactor ?? 1,
        sightM: params.sightM ?? Number.POSITIVE_INFINITY,
        tickBankS: 0,
      });
      return true;
    }
    current.leftS = Math.max(current.leftS, durationS);
    if (def.stacking === 'stack') {
      current.stacks = Math.min(def.maxStacks ?? Number.POSITIVE_INFINITY, current.stacks + 1);
      current.dps = Math.max(current.dps, dps);
    } else {
      // Strongest wins, so a weaker reapplication never softens a running effect.
      current.dps = Math.max(current.dps, dps);
      current.attackFactor = Math.min(current.attackFactor, params.attackFactor ?? 1);
      current.defenceFactor = Math.min(current.defenceFactor, params.defenceFactor ?? 1);
      current.damageTakenFactor = Math.max(current.damageTakenFactor, params.damageTakenFactor ?? 1);
      current.speedFactor = Math.min(current.speedFactor, params.speedFactor ?? 1);
      current.sightM = Math.min(current.sightM, params.sightM ?? Number.POSITIVE_INFINITY);
    }
    return true;
  }

  has(id: Id): boolean {
    if (id === 'toxicity') return this.toxicity.active;
    return this.find(id) !== undefined;
  }

  /** Seconds left of an effect (0 = not running). */
  leftS(id: Id): number {
    return this.find(id)?.leftS ?? 0;
  }

  /** Renews a running effect's time without adding a stack (a no-op when it is not running). */
  refresh(id: Id, durationS: number): void {
    const i = this.find(id);
    if (i) i.leftS = Math.max(i.leftS, durationS);
  }

  stacks(id: Id): number {
    if (id === 'toxicity') return this.toxicity.stacks;
    return this.find(id)?.stacks ?? 0;
  }

  /** The ids of every running effect (for indicators). */
  get active(): readonly string[] {
    const ids = this.list.map((i) => i.id);
    if (this.toxicity.active) ids.push('toxicity');
    return ids;
  }

  /** Effects that ran out during the last `tick` (the scene plays a fading effect once). */
  endedLastTick(id: Id): boolean {
    return this.endedIds.includes(id);
  }

  /** Product of every running effect's attack factor (damage this fighter deals). */
  get attackFactor(): number {
    return this.product((i) => i.attackFactor ** i.stacks);
  }

  get defenceFactor(): number {
    return this.product((i) => i.defenceFactor ** i.stacks);
  }

  /** Multiplier on all damage taken: bleeding and any later vulnerability. */
  get damageTakenFactor(): number {
    return this.product((i) => i.damageTakenFactor ** i.stacks);
  }

  get speedFactor(): number {
    return this.product((i) => i.speedFactor ** i.stacks) * this.toxicity.speedFactor;
  }

  /** The smallest sight limit of any running effect (infinite when none limits it). */
  get sightM(): number {
    let sight = Number.POSITIVE_INFINITY;
    for (const i of this.list) sight = Math.min(sight, i.sightM);
    return sight;
  }

  /** Cleanse one effect now. */
  clear(id: Id): void {
    if (id === 'toxicity') this.toxicity.clear();
    const at = this.list.findIndex((i) => i.id === id);
    if (at >= 0) this.list.splice(at, 1);
  }

  /** Cleanse everything (KO respawn, Practice reset). Immunities stay unless `immunities` is set. */
  clearAll(immunities = false): void {
    this.list.length = 0;
    this.toxicity.clear();
    this.endedIds.length = 0;
    if (immunities) this.immune.clear();
  }

  /** Immune to `id` for `seconds` (a cleanse that protects, a shield, a boss rule). Clears a running one. */
  grantImmunity(id: Id, seconds: number): void {
    if (seconds <= 0) return;
    this.immune.set(id, Math.max(this.immune.get(id) ?? 0, seconds));
    this.clear(id);
  }

  isImmune(id: Id): boolean {
    return (this.immune.get(id) ?? 0) > 0;
  }

  /**
   * Advance every timer by `dtS` and deal damage over time through `sink`. Effects that finish are
   * recorded for `endedLastTick`. Safe to call every simulation step: it allocates nothing.
   */
  tick(dtS: number, sink: DotSink): void {
    this.endedIds.length = 0;
    this.toxicity.tick(dtS, (amount) => sink('toxicity', amount));
    for (const [id, left] of this.immune) {
      if (left - dtS <= 0) this.immune.delete(id);
      else this.immune.set(id, left - dtS);
    }
    for (let n = this.list.length - 1; n >= 0; n--) {
      const i = this.list[n] as Instance;
      const step = Math.min(dtS, i.leftS);
      i.leftS -= step;
      if (i.dps > 0) this.dealDot(i, step, sink);
      if (i.leftS <= 0) {
        this.endedIds.push(i.id);
        this.list.splice(n, 1);
      }
    }
  }

  private dealDot(i: Instance, step: number, sink: DotSink): void {
    const interval = (this.defs as Record<string, StatusDef>)[i.id]?.tickIntervalS ?? 0;
    const rate = i.dps * i.stacks;
    if (interval <= 0) {
      sink(i.id, rate * step);
      return;
    }
    i.tickBankS += step;
    // A lump at the very end of the effect still lands, so a short effect is not cheated of its last tick.
    while (i.tickBankS >= interval || (i.leftS <= 0 && i.tickBankS > 0)) {
      const lump = Math.min(i.tickBankS, interval);
      i.tickBankS -= lump;
      sink(i.id, rate * lump);
    }
  }

  private find(id: string): Instance | undefined {
    for (const i of this.list) if (i.id === id) return i;
    return undefined;
  }

  private product(of: (i: Instance) => number): number {
    let value = 1;
    for (const i of this.list) value *= of(i);
    return value;
  }
}
