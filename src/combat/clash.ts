import { CLASH } from '../data/combat/clash';

/**
 * Punch Clash rules (owner request 11/11/2026). Pure state, no physics or
 * rendering, so every rule is unit-tested; the scene drives it and presents it.
 *
 * Flow: repeated punches/blocks → trigger → intro (lock up) → mash (both build
 * Clash Power; exchanges speed up, the final stretch spikes) → result
 * (winner by power, or a stalemate when within 5%) → the scene plays the
 * finisher and returns the camera.
 *
 * Side 'a' is the player, side 'b' the opponent.
 */
export type ClashSide = 'a' | 'b';

/** Watches melee contacts for a sustained exchange that should become a clash. */
export class ClashTrigger {
  private readonly contacts: { side: ClashSide; t: number }[] = [];
  private cooldownUntil = -Infinity;

  /** A melee contact (hit or block) by this side at time t. */
  record(side: ClashSide, t: number): void {
    this.contacts.push({ side, t });
    while (this.contacts.length > 0 && this.contacts[0]!.t < t - CLASH.triggerWindowS) this.contacts.shift();
  }

  /** Should a clash start now (fighters this far apart)? */
  ready(t: number, distanceM: number): boolean {
    if (t < this.cooldownUntil || distanceM > CLASH.triggerRangeM) return false;
    const recent = this.contacts.filter((c) => c.t >= t - CLASH.triggerWindowS);
    if (recent.length < CLASH.triggerContacts) return false;
    const a = recent.filter((c) => c.side === 'a').length;
    return a >= CLASH.minEachSide && recent.length - a >= CLASH.minEachSide;
  }

  /** A clash ended at time t: forget the exchange and start the cooldown. */
  ended(t: number): void {
    this.contacts.length = 0;
    this.cooldownUntil = t + CLASH.cooldownS;
  }
}

export type ClashPhase = 'intro' | 'mash' | 'done';

export interface ClashResult {
  /** The winner, or null for a stalemate. */
  readonly winner: ClashSide | null;
  /** Power gap as a fraction of the larger score, 0..1. */
  readonly gap: number;
  readonly powerA: number;
  readonly powerB: number;
}

export interface ClashStep {
  /** Exchanges (punch/block/deflect beats) that happen this step. */
  readonly exchanges: number;
  /** Set on the step the timer runs out. */
  readonly result: ClashResult | null;
}

/** Decide a finished clash (exported for tests). */
export function decideClash(powerA: number, powerB: number): ClashResult {
  const top = Math.max(powerA, powerB);
  const gap = top > 0 ? Math.abs(powerA - powerB) / top : 0;
  const winner = gap <= CLASH.tieFraction ? null : powerA > powerB ? 'a' : 'b';
  return { winner, gap, powerA, powerB };
}

export class PunchClash {
  powerA = 0;
  powerB = 0;
  phase: ClashPhase = 'intro';
  /** Seconds since the clash started (intro included). */
  t = 0;
  private exchangeAcc = 0;
  private aiAcc = 0;
  result: ClashResult | null = null;

  /**
   * @param opponentRate presses per second the opponent manages (from its data)
   * @param random seeded 0..1 source for the opponent's rhythm
   */
  constructor(
    private readonly opponentRate: number,
    private readonly random: () => number,
  ) {}

  /** Seconds of mashing left (the HUD timer). */
  get remainingS(): number {
    if (this.phase === 'intro') return CLASH.mashS;
    return Math.max(0, CLASH.introS + CLASH.mashS - this.t);
  }

  /** In the last, most intense stretch. */
  get final(): boolean {
    return this.phase === 'mash' && this.remainingS <= CLASH.finalS;
  }

  /** 0..1 build-up of the clash: time through it, nudged up by the combined power. */
  get intensity(): number {
    if (this.phase === 'intro') return 0;
    const time = Math.min(1, (this.t - CLASH.introS) / CLASH.mashS);
    const power = Math.min(1, (this.powerA + this.powerB) / 70);
    return Math.min(1, time * 0.8 + power * 0.2);
  }

  /** A mash press from a side (only counts while mashing). */
  press(side: ClashSide): void {
    if (this.phase !== 'mash') return;
    if (side === 'a') this.powerA++;
    else this.powerB++;
  }

  update(dtS: number): ClashStep {
    if (this.phase === 'done') return { exchanges: 0, result: null };
    this.t += dtS;
    if (this.phase === 'intro') {
      if (this.t < CLASH.introS) return { exchanges: 0, result: null };
      this.phase = 'mash';
    }
    // The opponent mashes in an uneven human-like rhythm, a little faster at the end.
    const rate = this.opponentRate * (0.75 + this.random() * 0.5) * (this.final ? 1.15 : 1);
    this.aiAcc += rate * dtS;
    while (this.aiAcc >= 1) {
      this.aiAcc -= 1;
      this.powerB++;
    }
    // The exchange speeds up through the clash and spikes in the final stretch.
    const k = Math.min(1, (this.t - CLASH.introS) / CLASH.mashS);
    const exRate = this.final
      ? CLASH.exchangeRateFinal
      : CLASH.exchangeRateStart + (CLASH.exchangeRateEnd - CLASH.exchangeRateStart) * k;
    this.exchangeAcc += exRate * dtS;
    let exchanges = 0;
    while (this.exchangeAcc >= 1) {
      this.exchangeAcc -= 1;
      exchanges++;
    }
    if (this.t >= CLASH.introS + CLASH.mashS) {
      this.phase = 'done';
      this.result = decideClash(this.powerA, this.powerB);
      return { exchanges, result: this.result };
    }
    return { exchanges, result: null };
  }
}
