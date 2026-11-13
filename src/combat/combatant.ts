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
  /** 0..1: shortens hit stun (character data). */
  readonly hitStunResistance?: number;
  /** False: a well-timed block is only a block, never a parry (character capability). */
  readonly canParry?: boolean;
  /** Body weight: heavier fighters recover from a dodge more slowly (owner, 11/11/2026). */
  readonly massKg?: number;
}

/**
 * Dodge cooldown by weight (owner, 11/11/2026: "the dodge cooldown depends on the weight of the
 * stickman"): a light 55 kg fighter waits about 0.45 s, a 70 kg one 0.54 s, a 140 kg one 0.92 s.
 */
export function dodgeCooldownFor(massKg: number): number {
  return Math.min(1.5, Math.max(0.3, DEFENCE.dodgeCooldownBaseS + massKg * DEFENCE.dodgeCooldownPerKgS));
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
  /** Cooldown after a dodge = base + per-kilogram × body weight (see dodgeCooldownFor). */
  dodgeCooldownBaseS: 0.15,
  dodgeCooldownPerKgS: 0.0055,
  lightStunS: 0.22,
  /** Time on the floor after a heavy hit (the fall plus lying still). */
  heavyKnockdownS: 1.1,
  /** Getting back up (animated; cannot act, cannot be hit). */
  getUpS: 0.55,
  /** Extra invulnerability once standing again (and after a respawn). */
  getUpInvulnS: 0.2,
  /** KO: faint, lie still, dissolve into dust (presentation), then respawn (Practice). */
  koRespawnS: 3,
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

export type CombatState = 'free' | 'guarding' | 'dodging' | 'stunned' | 'knockdown' | 'gettingUp' | 'ko';

export class Combatant {
  hp: number;
  stamina: number;
  private guardUp = false;
  private guardAgeS = 0;
  private stunS = 0;
  private knockdownS = 0;
  private getUpS = 0;
  private downS = 0;
  private invulnS = 0;
  /** Seconds of blindness left (Soul Drain, owner 12/11/2026). */
  private blindS = 0;
  /** Curse of Decay (owner, 12/11/2026): seconds left, and what it does to attack and defence. */
  private decayS = 0;
  private decayAttack = 1;
  private decayDefence = 1;
  /** The curse ran out during the last update (the scene plays its fading effect once). */
  decayEnded = false;
  /** Lights out (Shroud's Hunting Frenzy): seconds left, and how far it can still see. */
  private darkS = 0;
  private darkSightM = Number.POSITIVE_INFINITY;
  private dodgeS = 0;
  private dodgeCooldownS = 0;
  private sinceStaminaUseS = 0;
  private koAgeS = -1;
  private burnS = 0;
  private bleedS = 0;
  private bleedDps = 0;
  private burnKo = false;
  /** Multiplies damage taken (a durability buff such as Rampage Mode sets 0.85). */
  damageTakenScale = 1;
  private burnDps = 0;

  constructor(readonly stats: CombatStats) {
    this.hp = stats.maxHp;
    this.stamina = stats.maxStamina;
  }

  get state(): CombatState {
    if (this.koAgeS >= 0) return 'ko';
    if (this.knockdownS > 0) return 'knockdown';
    if (this.getUpS > 0) return 'gettingUp';
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

  /** Seconds since the fighter was knocked down or KO'd (drives the fall animation); 0 when standing. */
  get downTimeS(): number {
    return this.downS;
  }

  /** 0..1 through getting back up; 0 when not getting up. */
  get getUpProgress(): number {
    return this.getUpS > 0 ? 1 - this.getUpS / DEFENCE.getUpS : 0;
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
    this.dodgeCooldownS = this.dodgeCooldownTotalS;
    return true;
  }

  /** Full cooldown after starting a dodge (its own duration plus the weight-based wait). */
  get dodgeCooldownTotalS(): number {
    return DEFENCE.dodgeDurationS + dodgeCooldownFor(this.stats.massKg ?? 70);
  }

  /** Seconds until the next dodge is allowed (HUD). */
  get dodgeCooldownLeftS(): number {
    return this.dodgeCooldownS;
  }

  /** 0..1 through the current dodge (animation); 0 when not dodging. */
  get dodgeProgress(): number {
    return this.dodgeS > 0 ? 1 - this.dodgeS / DEFENCE.dodgeDurationS : 0;
  }

  /** Spend stamina for an ability (REQ-ABL-1). Returns false, spending nothing, if there is not enough. */
  spendStamina(cost: number): boolean {
    if (this.stamina < cost) return false;
    this.stamina -= cost;
    this.sinceStaminaUseS = 0;
    return true;
  }

  /** Cannot be hit for a while (e.g. airborne during an ultimate's leap). */
  grantInvulnerability(seconds: number): void {
    this.invulnS = Math.max(this.invulnS, seconds);
  }

  /** End any invulnerability now (a Punch Clash ends: the finisher must land). */
  clearInvulnerability(): void {
    this.invulnS = 0;
  }

  /** Set on fire: damage over time; a new burn refreshes the timer and keeps the stronger rate. */
  ignite(dps: number, durationS: number): void {
    if (this.isKo) return;
    this.burnDps = Math.max(this.burnS > 0 ? this.burnDps : 0, dps);
    this.burnS = Math.max(this.burnS, durationS);
  }

  /**
   * Bleeding (owner, 12/11/2026, Shroud's knife): damage over time like a burn, but from deep cuts;
   * a new cut refreshes the timer and keeps the stronger rate. Runs alongside a burn.
   */
  bleed(dps: number, durationS: number): void {
    if (this.isKo || dps <= 0 || durationS <= 0) return;
    this.bleedDps = Math.max(this.bleedS > 0 ? this.bleedDps : 0, dps);
    this.bleedS = Math.max(this.bleedS, durationS);
  }

  get bleeding(): boolean {
    return this.bleedS > 0;
  }

  get burning(): boolean {
    return this.burnS > 0;
  }

  /** Seconds of burning left (flames shrink as it runs out). */
  get burnLeftS(): number {
    return this.burnS;
  }

  /** The KO came from burning (the burn finished the fighter off). */
  get koByBurn(): boolean {
    return this.burnKo;
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

    const raw =
      ((hit.baseDamage * hit.attackerPower) / (this.stats.defence * this.defenceFactor)) * this.damageTakenScale;
    const kbKeep = 1 - this.stats.knockbackResistance;

    if (this.guardUp && hit.fromFront) {
      if (this.stats.canParry !== false && this.guardAgeS <= DEFENCE.parryWindowS) {
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
      if (this.knockdownS === 0) this.downS = 0; // the KO fall starts now (or continues one already under way)
      this.koAgeS = 0;
      this.stunS = 0;
      this.knockdownS = 0;
      this.getUpS = 0;
      return { outcome: 'ko', damage, knockbackScale: kbKeep, attackerStunS: 0 };
    }
    if (hit.heavy) {
      if (this.knockdownS === 0) this.downS = 0; // a fresh fall (a hit while already down keeps the fall going)
      this.knockdownS = DEFENCE.heavyKnockdownS;
    } else this.stunS = Math.max(this.stunS, DEFENCE.lightStunS * (1 - (this.stats.hitStunResistance ?? 0)));
    return { outcome: crit ? 'crit' : 'hit', damage, knockbackScale: kbKeep, attackerStunS: 0 };
  }

  /**
   * Fall damage (owner, 12/11/2026, by height and weight). Ignores guard and dodge (nobody blocks
   * the floor). Can KO. The landing's reaction (squat or collapse) is decided by the drop, not here.
   */
  takeFall(damage: number): void {
    if (this.isKo || damage <= 0) return;
    this.hp = Math.max(0, this.hp - damage);
    this.guardUp = false;
    if (this.hp === 0) {
      this.downS = 0;
      this.koAgeS = 0;
      this.stunS = 0;
      this.knockdownS = 0;
      this.getUpS = 0;
    }
  }

  /**
   * A body-slam landing from a big fall (owner, 13/11/2026): flat on the floor for `lieS`, then the
   * usual animated get-up; no acting until it finishes. Never dizzy (no stun).
   */
  collapse(lieS: number): void {
    if (this.isKo) return;
    this.guardUp = false;
    this.stunS = 0;
    this.dodgeS = 0;
    this.downS = 0;
    this.getUpS = 0;
    this.knockdownS = Math.max(this.knockdownS, lieS);
  }

  /** Fall at once, as at a KO (a summoned minion whose time is up crumbles). */
  expire(): void {
    if (this.hp === 0) return;
    this.hp = 0;
    this.guardUp = false;
    this.downS = 0;
    this.koAgeS = 0;
    this.stunS = 0;
    this.knockdownS = 0;
    this.getUpS = 0;
  }

  /** Advance timers. Returns burn damage taken this step (for floating numbers and the ultimate meter). */
  /** Blinded (it cannot lock on to anyone; the AI cannot find its target; a player's view darkens). */
  get blinded(): boolean {
    return this.blindS > 0;
  }

  /** 0..1 how much blindness is left (presentation: the smoke over the eyes thins as it ends). */
  get blindLeftS(): number {
    return this.blindS;
  }

  /** Seconds of Curse of Decay left (0 = none). */
  get decayLeftS(): number {
    return this.decayS;
  }

  /** Multiplier on the damage this fighter deals (Curse of Decay: 0.7 while it lasts). */
  get attackFactor(): number {
    return this.decayS > 0 ? this.decayAttack : 1;
  }

  /** Multiplier on this fighter's defence (Curse of Decay: 0.8 while it lasts). */
  get defenceFactor(): number {
    return this.decayS > 0 ? this.decayDefence : 1;
  }

  /** Cursed for `seconds`: a new curse refreshes the time; the weakening never stacks. */
  decay(seconds: number, attackFactor: number, defenceFactor: number): void {
    if (this.koAgeS >= 0) return;
    this.decayS = Math.max(this.decayS, seconds);
    this.decayAttack = attackFactor;
    this.decayDefence = defenceFactor;
  }

  /** Seconds of darkness left (0 = it sees normally). */
  get darkLeftS(): number {
    return this.darkS;
  }

  /** How far it can see, metres: unlimited, or the small circle left to it in the dark. */
  get sightM(): number {
    return this.darkS > 0 ? this.darkSightM : Number.POSITIVE_INFINITY;
  }

  /** Plunged into darkness for `seconds`, seeing only `sightM` round itself. Refreshes, never stacks. */
  darken(seconds: number, sightM: number): void {
    if (this.koAgeS >= 0) return;
    this.darkS = Math.max(this.darkS, seconds);
    this.darkSightM = sightM;
  }

  /** Blind for `seconds` (a longer blind replaces a shorter one; never stacks). */
  blind(seconds: number): void {
    if (this.koAgeS >= 0) return;
    this.blindS = Math.max(this.blindS, seconds);
  }

  update(dtS: number): number {
    this.blindS = Math.max(0, this.blindS - dtS);
    const cursed = this.decayS > 0;
    this.decayS = Math.max(0, this.decayS - dtS);
    this.decayEnded = cursed && this.decayS === 0;
    this.darkS = Math.max(0, this.darkS - dtS);
    const burned = this.tickBurn(dtS) + this.tickBleed(dtS);
    if (this.koAgeS >= 0) {
      this.koAgeS += dtS;
      this.downS += dtS;
      return burned;
    }
    if (this.guardUp) this.guardAgeS += dtS;
    this.stunS = Math.max(0, this.stunS - dtS);
    if (this.knockdownS > 0) {
      this.downS += dtS;
      this.knockdownS = Math.max(0, this.knockdownS - dtS);
      if (this.knockdownS === 0) {
        // Get up: animated, and safe from hits until a moment after standing.
        this.getUpS = DEFENCE.getUpS;
        this.invulnS = DEFENCE.getUpS + DEFENCE.getUpInvulnS;
      }
    } else if (this.getUpS > 0) {
      this.getUpS = Math.max(0, this.getUpS - dtS);
      if (this.getUpS === 0) this.downS = 0;
    }
    this.invulnS = Math.max(0, this.invulnS - dtS);
    this.dodgeS = Math.max(0, this.dodgeS - dtS);
    this.dodgeCooldownS = Math.max(0, this.dodgeCooldownS - dtS);

    // Stamina regenerates after a pause, but not while holding the guard.
    this.sinceStaminaUseS += dtS;
    if (!this.guardUp && this.sinceStaminaUseS >= this.stats.staminaRegenDelayS) {
      this.stamina = Math.min(this.stats.maxStamina, this.stamina + this.stats.staminaRegenPerS * dtS);
    }
    return burned;
  }

  private tickBurn(dtS: number): number {
    if (this.burnS <= 0 || this.isKo) {
      this.burnS = 0;
      return 0;
    }
    const step = Math.min(dtS, this.burnS);
    this.burnS -= step;
    const damage = Math.min(this.hp, this.burnDps * step);
    this.hp -= damage;
    if (this.hp <= 0) {
      this.hp = 0;
      if (this.knockdownS === 0) this.downS = 0;
      this.koAgeS = 0;
      this.stunS = 0;
      this.knockdownS = 0;
      this.getUpS = 0;
      this.burnS = 0;
      this.burnKo = true;
    }
    return damage;
  }

  private tickBleed(dtS: number): number {
    if (this.bleedS <= 0 || this.isKo) {
      this.bleedS = 0;
      return 0;
    }
    const step = Math.min(dtS, this.bleedS);
    this.bleedS -= step;
    const damage = Math.min(this.hp, this.bleedDps * step);
    this.hp -= damage;
    if (this.hp <= 0) {
      this.hp = 0;
      if (this.knockdownS === 0) this.downS = 0;
      this.koAgeS = 0;
      this.stunS = 0;
      this.knockdownS = 0;
      this.getUpS = 0;
      this.bleedS = 0;
    }
    return damage;
  }

  /** Back on its feet at full health and stamina (KO respawn, Practice Zone). */
  reset(): void {
    this.bleedS = 0;
    this.blindS = 0;
    this.decayS = 0;
    this.darkS = 0;
    this.hp = this.stats.maxHp;
    this.stamina = this.stats.maxStamina;
    this.guardUp = false;
    this.stunS = 0;
    this.knockdownS = 0;
    this.getUpS = 0;
    this.downS = 0;
    this.invulnS = DEFENCE.getUpInvulnS;
    this.dodgeS = 0;
    this.dodgeCooldownS = 0;
    this.koAgeS = -1;
    this.burnS = 0;
    this.burnDps = 0;
    this.burnKo = false;
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
