/**
 * The shared combat rules for every fighter (INV-5, Phase 5): health, damage,
 * critical hits, block, parry (counter), guard break, dodge with
 * invulnerability, stamina, stun, knockdown and KO. Pure state + rules, no
 * physics or rendering, so every rule is unit-testable.
 *
 * NOTE: all numbers come from data (fighter `stats`, `DEFENCE` below) and are
 * PROVISIONAL baselines pending the owner's stat decision (OQ-05, TD-030).
 */

export interface CombatStats {
  readonly maxHp: number;
  readonly maxStamina: number;
  /** Stamina regained per second once regeneration starts. */
  readonly staminaRegenPerS: number;
  /** Pause after spending stamina (or blocking) before it regenerates. */
  readonly staminaRegenDelayS: number;
  /** Outgoing damage multiplier (spec stat: Power). */
  readonly power: number;
  /** Incoming damage divisor (spec stat: Defence). */
  readonly defence: number;
  /** 0..1 chance a landed hit is critical (spec stat: Critical Chance). */
  readonly critChance: number;
  /** Damage multiplier on a critical hit (spec stat: Critical Damage). */
  readonly critMultiplier: number;
  /** 0..1 fraction of knockback ignored (spec stat: Knockback Resistance). */
  readonly knockbackResistance: number;
}

/** Shared defensive timings and costs (same for every fighter unless a kit overrides them later). */
export const DEFENCE = {
  /** Hold Button 1 this long to raise the guard (CONTROL_SCHEME, REQ-CTL-11). */
  blockHoldS: 0.18,
  /** Fraction of damage that still gets through a block. */
  chipFraction: 0.15,
  /** Stamina lost per point of blocked damage. */
  blockStaminaPerDamage: 0.6,
  /** Knockback kept when blocking. */
  blockKnockbackFraction: 0.2,
  /** Guard raised within this long before a hit = parry (counter). */
  parryWindowS: 0.15,
  parryStunS: 0.7,
  guardBreakStunS: 0.9,
  dodgeCost: 25,
  dodgeDurationS: 0.24,
  dodgeInvulnS: 0.18,
  dodgeSpeedMps: 10,
  dodgeCooldownS: 0.35,
  lightStunS: 0.22,
  heavyKnockdownS: 1.1,
  getUpInvulnS: 0.4,
  koRespawnS: 2.5,
} as const;

export interface IncomingHit {
  readonly baseDamage: number;
  readonly attackerPower: number;
  /** Heavy hits knock down instead of flinching. */
  readonly heavy: boolean;
  /** The attacker is in front of this fighter (blocks only work facing the blow). */
  readonly fromFront: boolean;
  /** Uniform 0..1 random roll for the critical check (seeded by the caller). */
  readonly critRoll: number;
}

export type HitOutcome = 'hit' | 'crit' | 'blocked' | 'parried' | 'guardBreak' | 'dodged' | 'ko' | 'ignored';

export interface HitResult {
  readonly outcome: HitOutcome;
  /** Health actually lost. */
  readonly damage: number;
  /** Multiply the attack's knockback by this (0 = none). */
  readonly knockbackScale: number;
  /** Stun to apply to the ATTACKER (parry). */
  readonly attackerStunS: number;
}

export type CombatState = 'free' | 'guarding' | 'dodging' | 'stunned' | 'knockdown' | 'ko';

export class Combatant {
  hp: number;
  stamina: number;
  private guardUp = false;
  private guardAgeS = 0;
  private stunS = 0;
  private knockdownS = 0;
  private invulnS = 0;
  private dodgeS = 0;
  private dodgeCooldownS = 0;
  private sinceStaminaUseS = 0;
  private koAgeS = -1;

  constructor(readonly stats: CombatStats) {
    this.hp = stats.maxHp;
    this.stamina = stats.maxStamina;
  }

  get state(): CombatState {
    if (this.koAgeS >= 0) return 'ko';
    if (this.knockdownS > 0) return 'knockdown';
    if (this.stunS > 0) return 'stunned';
    if (this.dodgeS > 0) return 'dodging';
    if (this.guardUp) return 'guarding';
    return 'free';
  }

  /** Can start attacks, blocks, dodges and jumps. */
  get canAct(): boolean {
    return this.state === 'free' || this.state === 'guarding';
  }

  get isKo(): boolean {
    return this.koAgeS >= 0;
  }

  /** Seconds since KO (for respawn timing); -1 when not KO. */
  get koAge(): number {
    return this.koAgeS;
  }

  get stunned(): number {
    return Math.max(this.stunS, this.knockdownS);
  }

  /** Raise or lower the guard (ignored while unable to act). */
  setGuard(want: boolean): void {
    if (want && !this.guardUp && this.canAct) {
      this.guardUp = true;
      this.guardAgeS = 0;
    } else if (!want || !this.canAct) {
      this.guardUp = false;
    }
  }

  /** Start a dodge if allowed; returns true if it started. */
  tryDodge(): boolean {
    if (!this.canAct || this.dodgeCooldownS > 0 || this.stamina < DEFENCE.dodgeCost) return false;
    this.guardUp = false;
    this.stamina -= DEFENCE.dodgeCost;
    this.sinceStaminaUseS = 0;
    this.dodgeS = DEFENCE.dodgeDurationS;
    this.invulnS = Math.max(this.invulnS, DEFENCE.dodgeInvulnS);
    this.dodgeCooldownS = DEFENCE.dodgeDurationS + DEFENCE.dodgeCooldownS;
    return true;
  }

  /** Stun this fighter (e.g. its attack was parried). */
  stun(seconds: number): void {
    this.guardUp = false;
    this.stunS = Math.max(this.stunS, seconds);
  }

  receive(hit: IncomingHit, critChance = 0, critMultiplier = 1): HitResult {
    const none = (outcome: HitOutcome): HitResult => ({ outcome, damage: 0, knockbackScale: 0, attackerStunS: 0 });
    if (this.isKo) return none('ignored');
    if (this.invulnS > 0) return none('dodged');

    const raw = (hit.baseDamage * hit.attackerPower) / this.stats.defence;
    const kbKeep = 1 - this.stats.knockbackResistance;

    if (this.guardUp && hit.fromFront) {
      if (this.guardAgeS <= DEFENCE.parryWindowS) {
        return { outcome: 'parried', damage: 0, knockbackScale: 0, attackerStunS: DEFENCE.parryStunS };
      }
      const chip = Math.round(raw * DEFENCE.chipFraction);
      this.hp = Math.max(1, this.hp - chip); // chip damage never KOs
      this.stamina -= raw * DEFENCE.blockStaminaPerDamage;
      this.sinceStaminaUseS = 0;
      if (this.stamina <= 0) {
        this.stamina = 0;
        this.guardUp = false;
        this.stunS = DEFENCE.guardBreakStunS;
        return { outcome: 'guardBreak', damage: chip, knockbackScale: kbKeep * 0.6, attackerStunS: 0 };
      }
      return {
        outcome: 'blocked',
        damage: chip,
        knockbackScale: kbKeep * DEFENCE.blockKnockbackFraction,
        attackerStunS: 0,
      };
    }

    const crit = hit.critRoll < critChance;
    const damage = Math.round(crit ? raw * critMultiplier : raw);
    this.hp = Math.max(0, this.hp - damage);
    this.guardUp = false;
    if (this.hp === 0) {
      this.koAgeS = 0;
      this.stunS = 0;
      this.knockdownS = 0;
      return { outcome: 'ko', damage, knockbackScale: kbKeep, attackerStunS: 0 };
    }
    if (hit.heavy) this.knockdownS = DEFENCE.heavyKnockdownS;
    else this.stunS = Math.max(this.stunS, DEFENCE.lightStunS);
    return { outcome: crit ? 'crit' : 'hit', damage, knockbackScale: kbKeep, attackerStunS: 0 };
  }

  update(dtS: number): void {
    if (this.koAgeS >= 0) {
      this.koAgeS += dtS;
      return;
    }
    if (this.guardUp) this.guardAgeS += dtS;
    this.stunS = Math.max(0, this.stunS - dtS);
    if (this.knockdownS > 0) {
      this.knockdownS = Math.max(0, this.knockdownS - dtS);
      if (this.knockdownS === 0) this.invulnS = DEFENCE.getUpInvulnS; // safe while getting up
    }
    this.invulnS = Math.max(0, this.invulnS - dtS);
    this.dodgeS = Math.max(0, this.dodgeS - dtS);
    this.dodgeCooldownS = Math.max(0, this.dodgeCooldownS - dtS);

    // Stamina regenerates after a pause, but not while holding the guard.
    this.sinceStaminaUseS += dtS;
    if (!this.guardUp && this.sinceStaminaUseS >= this.stats.staminaRegenDelayS) {
      this.stamina = Math.min(this.stats.maxStamina, this.stamina + this.stats.staminaRegenPerS * dtS);
    }
  }

  /** Back on its feet at full health and stamina (KO respawn, Practice Zone). */
  reset(): void {
    this.hp = this.stats.maxHp;
    this.stamina = this.stats.maxStamina;
    this.guardUp = false;
    this.stunS = 0;
    this.knockdownS = 0;
    this.invulnS = DEFENCE.getUpInvulnS;
    this.dodgeS = 0;
    this.dodgeCooldownS = 0;
    this.koAgeS = -1;
  }
}

/** Small seeded random generator (mulberry32) so crits and AI choices are reproducible in tests. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
