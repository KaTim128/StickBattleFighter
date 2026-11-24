/**
 * The shared combat rules for every fighter (INV-5, Phase 5): health, damage,
 * critical hits, block, parry (counter), guard break, dodge with
 * invulnerability, stamina, stun, knockdown and KO. Pure state + rules, no
 * physics or rendering, so every rule is unit-testable.
 *
 * NOTE: all numbers come from data (fighter `stats`, `DEFENCE` below) and are
 * PROVISIONAL baselines pending the owner's stat decision (OQ-05, TD-030).
 */

import { BLEED, type DotSink, StatusEffects } from './status-effects';

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
  /**
   * Dodge fatigue (owner, 13/11/2026: "the dodge should not be used as an exploit ... by spamming"):
   * a dodge started within this long of the previous one becoming ready again is part of a chain;
   * every extra link costs more stamina, waits longer and is invulnerable for less (none from the
   * fourth on). Resting this long with the dodge ready resets the chain.
   */
  dodgeChainWindowS: 1.2,
  dodgeChainCostStep: 0.5,
  dodgeChainCooldownStep: 0.6,
  dodgeChainInvuln: [1, 0.55, 0.2, 0] as readonly number[],
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
  /** False: the hit only damages, with no flinch or knockdown (a skeleton's blows; default true). */
  readonly staggers?: boolean;
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
  /**
   * Every timed effect on this fighter (burn, bleed, blind, Curse of Decay, darkness) lives in the
   * status registry (TD-073); the methods below are the stable entry points the abilities use.
   */
  readonly status = new StatusEffects();
  /** The curse ran out during the last update (the scene plays its fading effect once). */
  decayEnded = false;
  private dodgeS = 0;
  private dodgeCooldownS = 0;
  /** Dodges in the current chain (0 when rested) and time since the last one. */
  private dodgeChain = 0;
  private lastDodgeCooldownS = 1;
  /** Seconds the dodge has been ready (off cooldown) since the last one. */
  private sinceDodgeReadyS = Number.POSITIVE_INFINITY;
  private sinceStaminaUseS = 0;
  private koAgeS = -1;
  private burnKo = false;
  private dotTaken = 0;
  /** Built once so the per-step tick allocates nothing (performance rule). */
  private readonly dotSink: DotSink = (id, amount) => {
    const dealt = this.takeDot(id, amount);
    this.dotTaken += dealt;
    return dealt;
  };
  /** Multiplies damage taken (a durability buff such as Rampage Mode sets 0.85). */
  damageTakenScale = 1;

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
    const chain = this.dodgeChainLength;
    const cost = this.dodgeCostFor(chain);
    if (!this.canAct || this.trapped || this.dodgeCooldownS > 0 || this.stamina < cost) return false;
    this.guardUp = false;
    this.stamina -= cost;
    this.sinceStaminaUseS = 0;
    this.dodgeS = DEFENCE.dodgeDurationS;
    const k = DEFENCE.dodgeChainInvuln[Math.min(chain, DEFENCE.dodgeChainInvuln.length - 1)]!;
    if (k > 0) this.invulnS = Math.max(this.invulnS, DEFENCE.dodgeInvulnS * k);
    this.dodgeCooldownS = this.dodgeCooldownTotalS * (1 + DEFENCE.dodgeChainCooldownStep * chain);
    this.lastDodgeCooldownS = this.dodgeCooldownS;
    this.dodgeChain = chain + 1;
    this.sinceDodgeReadyS = 0;
    return true;
  }

  /** Stamina for a dodge that is link `chain` (0 = the first) of a chain. */
  private dodgeCostFor(chain: number): number {
    return DEFENCE.dodgeCost * (1 + DEFENCE.dodgeChainCostStep * chain);
  }

  /** Hits pass through right now (a dodge's protection, getting up, a respawn). */
  get invulnerable(): boolean {
    return this.invulnS > 0;
  }

  /** 0..1 how far through the current dodge cooldown (1 = ready; HUD). */
  get dodgeReadiness(): number {
    return this.dodgeCooldownS <= 0 ? 1 : 1 - this.dodgeCooldownS / this.lastDodgeCooldownS;
  }

  /** How many dodges in a row so far (0 once rested; tests and the HUD). */
  get dodgeChainLength(): number {
    return this.sinceDodgeReadyS < DEFENCE.dodgeChainWindowS ? this.dodgeChain : 0;
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
    this.status.apply('burn', durationS, { dps });
  }

  /**
   * Bleeding (Shroud's knife; owner decision 17/11/2026, TD-072): for `BLEED.durationS` this fighter
   * takes `BLEED.damageTakenFactor` times the damage from every source. A new cut refreshes the time
   * and never raises the factor.
   */
  bleed(): void {
    if (this.isKo) return;
    this.status.apply('bleed', BLEED.durationS, { damageTakenFactor: BLEED.damageTakenFactor });
  }

  /**
   * Poison (Vexoris, TD-115): adds toxicity stacks. One application is one call: the caller makes sure a
   * single attack, cloud or hit event applies it once per target.
   */
  poison(stacks: number): void {
    if (this.isKo) return;
    this.status.toxicity.apply(stacks);
  }

  get toxicityStacks(): number {
    return this.status.toxicity.stacks;
  }

  get bleeding(): boolean {
    return this.status.has('bleed');
  }

  get burning(): boolean {
    return this.status.has('burn');
  }

  /** Seconds of burning left (flames shrink as it runs out). */
  get burnLeftS(): number {
    return this.status.leftS('burn');
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

    let raw =
      ((hit.baseDamage * hit.attackerPower) / (this.stats.defence * this.defenceFactor)) *
      this.damageTakenScale *
      this.status.damageTakenFactor;
    // Psychic Barrier: the shield takes the blow first; a blow it fully absorbs does nothing else (no flinch, no push).
    if (this.barrierHp > 0) {
      const taken = Math.min(this.barrierHp, raw);
      this.barrierHp -= taken;
      raw -= taken;
      this.barrierHitS = 0;
      if (this.barrierHp <= 0) this.endBarrier();
      if (raw <= 0.01) return none('blocked');
    }
    // Crystal shield (Prism Guard, Crystal Sovereign): frontal blows only. A count shield stops whole blows; a Prism Guard soaks
    // damage up to its durability, heavy blows wearing it faster. Blows from behind pass it by.
    if (this.crystalShieldLeftS > 0 && hit.fromFront) {
      this.crystalShieldHitS = 0;
      if (this.crystalShieldHits > 0) {
        this.crystalShieldHits--;
        if (this.crystalShieldHits <= 0) this.endCrystalShield();
        return none('blocked');
      }
      const drain = raw * (hit.heavy ? this.crystalShieldHeavy : 1);
      const taken = Math.min(this.crystalShieldHp, drain);
      this.crystalShieldHp -= taken;
      raw *= drain > 0 ? 1 - taken / drain : 1;
      if (this.crystalShieldHp <= 0) this.endCrystalShield();
      if (raw <= 0.01) return none('blocked');
    }
    // Crystal armour (Crystal Sovereign): the next few blows of any kind and from any side are absorbed whole.
    if (this.crystalArmourHits > 0) {
      this.crystalArmourHits--;
      this.crystalArmourHitS = 0;
      if (this.crystalArmourHits <= 0) this.armourBreakPending = true;
      return none('blocked');
    }
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
    if (hit.staggers === false || this.knockdownS > 0 || this.getUpS > 0) {
      // Damage only: no flinch and no fall (skeletons, B5; no-flinch stabs, B6). A fighter already
      // down or getting up is never knocked down or stunned afresh, so no chain of hits can keep the
      // fall going or restart the get-up (B6).
    } else if (hit.heavy) {
      if (this.knockdownS === 0) this.downS = 0; // a fresh fall (a hit while already down keeps the fall going)
      this.knockdownS = DEFENCE.heavyKnockdownS;
    } else this.stunS = Math.max(this.stunS, DEFENCE.lightStunS * (1 - (this.stats.hitStunResistance ?? 0)));
    return { outcome: crit ? 'crit' : 'hit', damage, knockbackScale: kbKeep, attackerStunS: 0 };
  }

  /**
   * Damage that ignores guard and dodge and flinches nobody (a test or debug hit, a scripted KO). Falling never hurts
   * (owner, 20/11/2026): nothing in the game calls this for a landing. Can KO.
   */
  takeUnguardedDamage(damage: number): void {
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

  /** Blinded (it cannot lock on to anyone; the AI cannot find its target; a player's view darkens). */
  get blinded(): boolean {
    return this.status.has('blind');
  }

  /** Seconds of blindness left (presentation: the smoke over the eyes thins as it ends). */
  get blindLeftS(): number {
    return this.status.leftS('blind');
  }

  /** Seconds of Curse of Decay left (0 = none). */
  get decayLeftS(): number {
    return this.status.leftS('decay');
  }

  /** Multiplier on the damage this fighter deals (Curse of Decay: 0.7 while it lasts). */
  get attackFactor(): number {
    return this.status.attackFactor;
  }

  /** Multiplier on this fighter's defence (Curse of Decay: 0.8 while it lasts). */
  get defenceFactor(): number {
    return this.status.defenceFactor;
  }

  /** Cursed for `seconds`: a new curse refreshes the time; the weakening never stacks. */
  decay(seconds: number, attackFactor: number, defenceFactor: number): void {
    if (this.koAgeS >= 0) return;
    this.status.apply('decay', seconds, { attackFactor, defenceFactor });
  }

  /** Seconds of darkness left (0 = it sees normally). */
  get darkLeftS(): number {
    return this.status.leftS('dark');
  }

  /** How far it can see, metres: unlimited, or the small circle left to it in the dark. */
  get sightM(): number {
    return this.status.sightM;
  }

  /** Plunged into darkness for `seconds`, seeing only `sightM` round itself. Refreshes, never stacks. */
  darken(seconds: number, sightM: number): void {
    if (this.koAgeS >= 0) return;
    this.status.apply('dark', seconds, { sightM });
  }

  /** Choked by a poison fog (Plague Bloom): renewed every step it stands in it, so it ends a moment after leaving. */
  fog(chipDps: number, speedFactor: number, sightM: number): void {
    if (this.koAgeS >= 0) return;
    this.status.apply('fog', 0.35, { dps: chipDps, speedFactor, sightM });
  }

  /** Prismor's crystal shield: durability left (a hit count for the Sovereign's), seconds left, and seconds since it was last struck. */
  crystalShieldHp = 0;
  crystalShieldMaxHp = 0;
  crystalShieldHits = 0;
  crystalShieldLeftS = 0;
  crystalShieldHitS = 9;
  private crystalShieldHeavy = 2;
  private shieldBreakPending = false;
  /** Crystal armour: blows it will still absorb, and seconds since it last took one. */
  crystalArmourHits = 0;
  crystalArmourHitS = 9;
  private armourBreakPending = false;

  /** Grow a crystal shield: `hp` durability (or `hits` blows) for `seconds`, heavy blows costing `heavyFactor` times as much. */
  raiseCrystalShield(spec: { hp: number; hits: number; seconds: number; heavyFactor: number }): void {
    if (this.koAgeS >= 0) return;
    this.crystalShieldHp = spec.hp;
    this.crystalShieldMaxHp = spec.hp;
    this.crystalShieldHits = spec.hits;
    this.crystalShieldLeftS = spec.seconds;
    this.crystalShieldHeavy = spec.heavyFactor;
    this.crystalShieldHitS = 9;
  }

  /** The shield is gone by choice or by force (a grab, another weapon): it shatters. */
  dropCrystalShield(): void {
    if (this.crystalShieldLeftS > 0) this.endCrystalShield();
  }

  private endCrystalShield(): void {
    this.crystalShieldLeftS = 0;
    this.crystalShieldHp = 0;
    this.crystalShieldHits = 0;
    this.shieldBreakPending = true;
  }

  /** Put crystal armour on: it absorbs the next `hits` blows whole. */
  raiseCrystalArmour(hits: number): void {
    if (this.koAgeS >= 0) return;
    this.crystalArmourHits = hits;
    this.crystalArmourHitS = 9;
  }

  /** The armour is taken off (the Sovereign ends): it shatters if it was still on. */
  dropCrystalArmour(): void {
    if (this.crystalArmourHits > 0) this.armourBreakPending = true;
    this.crystalArmourHits = 0;
  }

  /** Whether the shield and the armour broke since the last call (presentation: the shattering burst). */
  takeCrystalBreaks(): { shield: boolean; armour: boolean } {
    const out = { shield: this.shieldBreakPending, armour: this.armourBreakPending };
    this.shieldBreakPending = false;
    this.armourBreakPending = false;
    return out;
  }

  /** Psion's Psychic Barrier: damage it can still absorb, its starting value, seconds left, and seconds since it was last struck. */
  barrierHp = 0;
  barrierMaxHp = 0;
  barrierLeftS = 0;
  barrierHitS = 9;
  private barrierBreakPending = false;

  raiseBarrier(hp: number, seconds: number): void {
    if (this.koAgeS >= 0) return;
    this.barrierHp = hp;
    this.barrierMaxHp = hp;
    this.barrierLeftS = seconds;
    this.barrierHitS = 9;
  }

  /** True once after the barrier broke or ran out (the fragments fly); resets on read. */
  takeBarrierBreak(): boolean {
    const b = this.barrierBreakPending;
    this.barrierBreakPending = false;
    return b;
  }

  private endBarrier(): void {
    this.barrierHp = 0;
    this.barrierLeftS = 0;
    this.barrierBreakPending = true;
  }

  /** Sword Mastery (Kenshiro's passive): stacks built by landed blows and parries; spent by the next sword ability. */
  masteryStacks = 0;
  /** Seconds left of an enhancement already unlocked (it covers all of that ability's hits). */
  masteryEmpoweredS = 0;

  gainMastery(stacks: number, cap: number): void {
    if (this.koAgeS >= 0) return;
    this.masteryStacks = Math.min(cap, this.masteryStacks + stacks);
  }

  /**
   * The damage factor for a sword ability's hit: at the threshold the stacks are spent and the enhancement runs for
   * `windowS` (so every hit of that one ability gets it); otherwise 1.
   */
  swordFactor(threshold: number, factor: number, windowS: number): number {
    if (this.masteryEmpoweredS > 0) return factor;
    if (this.masteryStacks < threshold) return 1;
    this.masteryStacks = 0;
    this.masteryEmpoweredS = windowS;
    return factor;
  }

  /** One more stack of aerial momentum (Aerion's passive): `speedPerStack` faster each, up to `maxStacks`, for `durationS`. */
  gainMomentum(speedPerStack: number, maxStacks: number, durationS: number): void {
    if (this.koAgeS >= 0) return;
    if (this.status.stacks('momentum') >= maxStacks) {
      // At the cap a blow only renews the time.
      this.status.refresh('momentum', durationS);
      return;
    }
    this.status.apply('momentum', durationS, { speedFactor: 1 + speedPerStack });
  }

  get momentumStacks(): number {
    return this.status.stacks('momentum');
  }

  /** Seconds of fog left on it (presentation: the green haze over the view). */
  get fogLeftS(): number {
    return this.status.leftS('fog');
  }

  /** Blind for `seconds` (a longer blind replaces a shorter one; never stacks). */
  blind(seconds: number): void {
    if (this.koAgeS >= 0) return;
    this.status.apply('blind', seconds);
  }

  /** Feedback Pulse (Reson): their movement direction wobbles for `seconds` (a longer one replaces a shorter one). */
  disrupt(seconds: number): void {
    if (this.koAgeS >= 0) return;
    this.status.apply('disrupt', seconds);
  }

  /** Resonance Break: no abilities for `seconds`. */
  /** Crystal Prison: both legs held in crystal for exactly `seconds` (0 frees them). No walking, jumping, dodging or flying; damage still lands. */
  trapLegs(seconds: number): void {
    if (seconds <= 0 || this.koAgeS >= 0) this.status.clear('trap');
    else this.status.apply('trap', seconds);
  }

  get trapped(): boolean {
    return this.status.has('trap');
  }

  get trapLeftS(): number {
    return this.status.leftS('trap');
  }

  mute(seconds: number): void {
    if (this.koAgeS >= 0) return;
    this.status.apply('mute', seconds);
  }

  get muted(): boolean {
    return this.status.has('mute');
  }

  get muteLeftS(): number {
    return this.status.leftS('mute');
  }

  /** Resonance Break: defence multiplied by `defenceFactor` for `seconds` (the lowest factor in force wins; it never stacks). */
  shatter(seconds: number, defenceFactor: number): void {
    if (this.koAgeS >= 0) return;
    this.status.apply('shatter', seconds, { defenceFactor });
  }

  get shatterLeftS(): number {
    return this.status.leftS('shatter');
  }

  /** Afterimage: slowed for `seconds` (movement and ability use); a longer one replaces a shorter one. */
  slow(seconds: number, speedFactor: number): void {
    if (this.koAgeS >= 0) return;
    this.status.apply('slow', seconds, { speedFactor });
  }

  /** How fast its ability wind-ups and cooldowns run: 1 normally, slower while slowed, 0 while time is stopped around it. */
  abilityPace = 1;

  get slowed(): boolean {
    return this.status.has('slow');
  }

  /** Age Acceleration: damage over time and a defence cut for `seconds`. */
  age(seconds: number, dps: number, defenceFactor: number): void {
    if (this.koAgeS >= 0) return;
    this.status.apply('aging', seconds, { dps, defenceFactor });
  }

  get ageLeftS(): number {
    return this.status.leftS('aging');
  }

  get disrupted(): boolean {
    return this.status.has('disrupt');
  }

  /** Advance timers. Returns damage-over-time taken this step (for floating numbers and the ultimate meter). */
  update(dtS: number): number {
    if (this.isKo) {
      this.status.clear('burn');
      this.status.clear('bleed');
      this.status.clear('toxicity');
      this.status.clear('trap');
      this.crystalShieldLeftS = 0;
      this.crystalShieldHp = 0;
      this.crystalShieldHits = 0;
      this.crystalArmourHits = 0;
    }
    this.dotTaken = 0;
    this.masteryEmpoweredS = Math.max(0, this.masteryEmpoweredS - dtS);
    if (this.barrierLeftS > 0) {
      this.barrierHitS += dtS;
      this.barrierLeftS -= dtS;
      if (this.barrierLeftS <= 0) this.endBarrier();
    }
    if (this.crystalShieldLeftS > 0) {
      this.crystalShieldHitS += dtS;
      this.crystalShieldLeftS -= dtS;
      if (this.crystalShieldLeftS <= 0) this.endCrystalShield();
    }
    this.crystalArmourHitS += dtS;
    this.status.tick(dtS, this.dotSink);
    const burned = this.dotTaken;
    this.decayEnded = this.status.endedLastTick('decay');
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
    if (this.dodgeCooldownS <= 0) this.sinceDodgeReadyS += dtS;
    this.dodgeCooldownS = Math.max(0, this.dodgeCooldownS - dtS);

    // Stamina regenerates after a pause, but not while holding the guard.
    this.sinceStaminaUseS += dtS;
    if (!this.guardUp && this.sinceStaminaUseS >= this.stats.staminaRegenDelayS) {
      this.stamina = Math.min(this.stats.maxStamina, this.stamina + this.stats.staminaRegenPerS * dtS);
    }
    return burned;
  }

  /** Damage over time from a burn; a KO by it clears the effects and remembers a burn did it. */
  private takeDot(id: string, amount: number): number {
    if (this.isKo) return 0;
    const damage = Math.min(this.hp, amount * this.status.damageTakenFactor);
    this.hp -= damage;
    if (this.hp <= 0) {
      this.hp = 0;
      if (this.knockdownS === 0) this.downS = 0;
      this.koAgeS = 0;
      this.stunS = 0;
      this.knockdownS = 0;
      this.getUpS = 0;
      this.status.clear('burn');
      this.status.clear('bleed');
      this.status.clear('toxicity');
      if (id === 'burn') this.burnKo = true;
    }
    return damage;
  }

  /**
   * The only way HP goes up during a fight (HL, owner 22/11/2026): nothing heals passively, from waiting
   * or from tagging out. Callers are abilities that are defined as healing, and never revive a KO.
   */
  heal(amount: number): void {
    if (this.hp <= 0 || amount <= 0) return;
    this.hp = Math.min(this.stats.maxHp, this.hp + amount);
  }

  /** Debug hook only (`__stickmanDebug.setDummyHp`): sets HP directly, never below 1 or above the maximum. */
  setHpForDebug(hp: number): void {
    this.hp = Math.max(1, Math.min(this.stats.maxHp, hp));
  }

  /** Back on its feet at full health and stamina (KO respawn, Practice Zone). */
  reset(): void {
    this.status.clearAll();
    this.decayEnded = false;
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
