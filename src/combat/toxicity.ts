/**
 * Poison toxicity (Vexoris, master plan B4 and B7; owner decision TD-115). One toxicity meter per fighter,
 * owned by the status registry so poison obeys the same rules as every other timed effect.
 *
 * - Stacks add up to `maxStacks` and never lapse until the fighter is defeated or the match is reset.
 * - Movement slows by a step per stack band and never by more than `slowLadder`'s last step (10%).
 * - Damage over time is ONE sequence: it starts at the first application, ticks every `tickIntervalS`
 *   and climbs 1, 2, 3, 4 (in the spec's HP) through `tickDamageSpecHp`. Reapplying only adds stacks; it never starts a
 *   second timer or restarts the climb.
 * Poison never stuns, knocks down or touches attack speed, cooldowns, dodging or input (B4).
 */
export interface PoisonConfig {
  /** Stacks one fighter can carry (OQ-P0-3 proposal: 25, the highest slow band). */
  readonly maxStacks: number;
  /** [stacks, movement reduction]: the highest band reached applies. */
  readonly slowLadder: readonly (readonly [number, number])[];
  readonly tickIntervalS: number;
  /** Damage of tick 1, 2, 3...; the last repeats. In the spec's HP. */
  readonly tickDamageSpecHp: readonly number[];
  /** The project's health runs about ten times the spec's HP numbers (990 base health), so spec HP is scaled. */
  readonly hpPerSpecHp: number;
}

export const POISON: PoisonConfig = {
  maxStacks: 25,
  slowLadder: [
    [1, 0.02],
    [5, 0.04],
    [15, 0.06],
    [20, 0.08],
    [25, 0.1],
  ],
  tickIntervalS: 3,
  tickDamageSpecHp: [1, 2, 3, 4],
  hpPerSpecHp: 10,
};

/** The movement-speed multiplier for a toxicity level (1 = none). */
export function poisonSpeedFactor(stacks: number, config: PoisonConfig = POISON): number {
  let reduction = 0;
  for (const [at, cut] of config.slowLadder) if (stacks >= at) reduction = cut;
  return 1 - reduction;
}

export class Toxicity {
  private stacksNow = 0;
  private timerS = 0;
  private tickIndex = 0;

  constructor(private readonly config: PoisonConfig = POISON) {}

  get stacks(): number {
    return this.stacksNow;
  }

  get active(): boolean {
    return this.stacksNow > 0;
  }

  /** The next tick's damage, in project HP. */
  get nextTickDamage(): number {
    const ladder = this.config.tickDamageSpecHp;
    return (ladder[Math.min(this.tickIndex, ladder.length - 1)] ?? 0) * this.config.hpPerSpecHp;
  }

  get speedFactor(): number {
    return poisonSpeedFactor(this.stacksNow, this.config);
  }

  /** Adds stacks (a no-op for zero or less); starts the damage sequence on the first, never restarts it. */
  apply(stacks: number): boolean {
    if (stacks <= 0) return false;
    this.stacksNow = Math.min(this.config.maxStacks, this.stacksNow + stacks);
    return true;
  }

  /** Advances the one sequence; `sink` receives each tick's damage. Allocates nothing. */
  tick(dtS: number, sink: (amount: number) => number): void {
    if (this.stacksNow <= 0) return;
    this.timerS += dtS;
    while (this.timerS >= this.config.tickIntervalS) {
      this.timerS -= this.config.tickIntervalS;
      const dealt = sink(this.nextTickDamage);
      this.tickIndex++;
      if (dealt <= 0) break; // the fighter is down: nothing left to poison
    }
  }

  clear(): void {
    this.stacksNow = 0;
    this.timerS = 0;
    this.tickIndex = 0;
  }
}
