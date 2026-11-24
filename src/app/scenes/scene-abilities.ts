import type { AbilityHudState, CastBlock } from '../../abilities/ability-caster';
import {
  type AbilityDef,
  type AbilityPayload,
  type AbilitySlot,
  type BuffEffect,
  type Burn,
  finisherFactor,
  type SummonSpec,
} from '../../abilities/ability-def';
import {
  type AbilityFx,
  type AbilityHost,
  type AbilityTarget,
  AbilityWorld,
  type Vec2,
} from '../../abilities/ability-world';
import { SHARD_BLADE_MOVESET } from '../../data/abilities/shard-blade';
import type { ImpactId } from '../../data/combat/impacts';
import type { ArenaProps } from '../../environment/arena-props';
import { type BreakableDoor, circleTouchesRect } from '../../environment/breakable-door';
import type { BreakableWalls } from '../../environment/breakable-wall';
import type { PhysicsWorld } from '../../physics/physics-world';
import type { FighterEntity } from './fighter-entity';

/** The scene's shared hit path (melee and abilities use the same rules, INV-5). */
export type StrikeFn = (
  attacker: FighterEntity,
  target: FighterEntity,
  strike: {
    damage: number;
    heavy: boolean;
    knockbackMps: number;
    dir: Vec2;
    melee: boolean;
    burn?: Burn;
    impact: ImpactId;
    /** The target's body flashes this colour (magic attacks: white), instead of the attacker's. */
    flashColour?: number;
    /** Stun the target this long if the blow lands unguarded. */
    stunS?: number;
    /** No flinch or knockdown from this blow (Shroud's stabs). */
    noFlinch?: boolean;
  },
) => boolean;

const MAX_FX_LOG = 60;

/**
 * Connects the shared ability framework to a fight scene: casting from player
 * input, soft-lock aiming (CONTROL_SCHEME §2), the AbilityHost (hits through the
 * scene's strike path, furniture, doors, walls) and the FX event queue for VFX
 * and sound hooks.
 */
/** Deliveries that move the caster's own body: refused while his legs are held (Crystal Prison). */
const MOVEMENT_DELIVERIES: ReadonlySet<string> = new Set([
  'dash',
  'leap',
  'teleport',
  'rewindTime',
  'assault',
  'judgement',
]);

export class SceneAbilities implements AbilityHost {
  readonly world = new AbilityWorld();
  /** Spots chosen by aiming (the ultimate), used at release instead of the soft lock. */
  private readonly aimOverrides = new Map<string, Vec2>();
  /** FX events not yet consumed by the VFX layer. */
  private readonly pending: AbilityFx[] = [];
  /** Recent sound-hook ids, newest last (tests and the debug hook; audio arrives with OQ-17). */
  readonly sfxLog: string[] = [];
  /** Recent FX events, newest last (tests and the debug hook; the VFX layer drains `pending`). */
  readonly recentFx: AbilityFx[] = [];
  /** Moves a caster to the nearest free spot (set by the scene, which owns the physics). */
  teleportSource: (f: FighterEntity, to: Vec2) => Vec2 | null = () => null;
  /** Can a body stand at this spot (inside the arena, clear of walls and furniture)? Set by the scene, which owns the physics. */
  standableSource: (at: Vec2) => boolean = () => true;
  /** Raises a caster's minions (set by the scene, which owns the fighters). */
  summonSource: (f: FighterEntity, spec: SummonSpec) => void = () => {};
  /** How many more minions this fighter may raise right now (the scene counts the living ones). */
  summonRoom: (f: FighterEntity, spec: SummonSpec) => number = () => Number.POSITIVE_INFINITY;
  /** Where a fighter is steering its beam (set by the scene: player input or the AI's target). */
  steerSource: (f: FighterEntity, fresh: boolean) => Vec2 | null = () => null;
  /**
   * Where an AI aims an ability at its release, when it aims imperfectly (the scene's beam tracker,
   * master plan B4); null means the usual aim at the nearest enemy.
   */
  releaseAimSource: (f: FighterEntity, def: AbilityDef) => Vec2 | null = () => null;
  /** Sound ids not yet played (the sound board drains them every frame). */
  private readonly sounds: string[] = [];

  constructor(
    private readonly fightersOf: () => readonly FighterEntity[],
    private readonly strike: StrikeFn,
    private readonly physics: PhysicsWorld,
    private readonly props: ArenaProps | null,
    private readonly doors: readonly BreakableDoor[],
    private readonly onEnvironmentBreak: () => void,
    private readonly walls: BreakableWalls | null = null,
  ) {}

  /** Try to cast from a fighter; returns why it could not, or null when the cast started. */
  tryCast(f: FighterEntity, slot: AbilitySlot, aimAt?: Vec2): CastBlock | null {
    const caster = f.caster;
    if (!caster) return 'unavailable';
    const c = f.combatant;
    // Time Stop: nobody casts while the world is stopped.
    if (this.world.stopOf()) return 'busy';
    // Resonance Break: a muted fighter cannot use abilities (blows, blocks and dodges are unaffected).
    if (c.muted) return 'muted';
    // Crystal Prison: legs held in crystal, so no ability that moves the body.
    if (c.trapped && MOVEMENT_DELIVERIES.has(caster.def(slot).delivery.type)) return 'trapped';
    const block = caster.check(slot, {
      canAct: c.canAct && !f.combo.attack,
      stamina: c.stamina,
      airborne: f.airborne,
    });
    if (block) return block;
    const def = caster.def(slot);
    // A fifth skeleton is refused before anything is spent (master plan B5).
    if (def.delivery.type === 'summon' && this.summonRoom(f, def.delivery) <= 0) return 'limit';
    if (slot !== 'ult' && !c.spendStamina(def.staminaCost)) return 'stamina';
    c.setGuard(false);
    caster.start(slot);
    if (aimAt) this.aimOverrides.set(f.name, aimAt);
    // Face the aimed spot (or the soft-locked target) as the wind-up begins.
    const aim = aimAt ?? this.aimFor(f, def);
    if (Math.hypot(aim.x - f.x, aim.y - f.y) > 0.05) f.faceToward(aim.x - f.x, aim.y - f.y);
    this.emit({ kind: 'cast', ability: def.id, vfx: def.vfx, sfx: def.sfx.cast, x: f.x, y: f.y });
    return null;
  }

  /** Advance a fighter's cast; start the delivery at the release event. */
  stepCaster(f: FighterEntity, stepS: number): void {
    const caster = f.caster;
    if (!caster) return;
    // A channelled ability (Fire Beam) also ends when its caster is stunned, knocked down or grabbed
    // by anything, not only by a blow: it never pours through a hit reaction (master plan B4).
    if (caster.cast?.def.breaksOnHit && !f.combatant.canAct) this.interrupt(f, true);
    // A stalk (Death Mark) breaks when its caster attacks: a melee blow, or any ability but the mark itself.
    const stalking = this.world.markOf(f.name)?.phase === 'stalk';
    if (stalking && (f.combo.attack !== null || (caster.cast && caster.cast.def.delivery.type !== 'mark')))
      this.world.cancelStalk(f.name, this);
    // Cooldowns, and the ultimate's recharge, wait for everything an ability set going to finish (owner, 20/11/2026).
    const ongoing = this.world.executingIds(f.name);
    if (f.buff && f.buffSourceId) ongoing.add(f.buffSourceId);
    // Chronos's Afterimage slows a target's ability use: its wind-ups and its cooldowns run slower for a moment.
    const ev = caster.update(stepS * f.combatant.abilityPace, this.world.driving(f.name), ongoing);
    if (ev.released) {
      const def = ev.released;
      if (def.delivery.type === 'leap') f.combatant.grantInvulnerability(def.delivery.airS + 0.1); // airborne: untouchable
      if (def.delivery.type === 'judgement')
        f.combatant.grantInvulnerability(
          def.delivery.strikes * def.delivery.strikeIntervalS + def.delivery.resolveDelayS + 0.6,
        ); // unseen until the blow lands
      const aim = this.aimOverrides.get(f.name) ?? this.releaseAimSource(f, def) ?? this.aimFor(f, def);
      this.aimOverrides.delete(f.name);
      this.world.release(f.name, def, aim, this);
    }
  }

  /** The fighter was hit: cancel its wind-up (interruptible abilities only), or everything when KO. */
  interrupt(f: FighterEntity, ko: boolean): void {
    if (f.caster?.interrupt(ko)) this.world.cancel(f.name, this);
    else if (ko) this.world.cancel(f.name, this);
  }

  /** FX events since the last call (VFX layer). */
  drainFx(): AbilityFx[] {
    return this.pending.splice(0, this.pending.length);
  }

  drainSounds(): string[] {
    return this.sounds.splice(0, this.sounds.length);
  }

  hud(f: FighterEntity): AbilityHudState | null {
    const caster = f.caster;
    if (!caster) return null;
    const ctx = { canAct: f.combatant.canAct && !f.combo.attack, stamina: f.combatant.stamina, airborne: f.airborne };
    const slots = (['a1', 'a2', 'a3', 'a4', 'ult'] as const).map((slot) => {
      const def = caster.def(slot);
      return {
        slot,
        id: def.id,
        description: def.description ?? '',
        label: def.label,
        icon: def.icon,
        name: def.name,
        cooldownS: caster.cooldown(slot),
        cooldownMaxS: def.cooldownS,
        staminaCost: slot === 'ult' ? 0 : def.staminaCost,
        block: caster.check(slot, ctx),
      };
    });
    return { slots, meter: caster.meter, meterMax: caster.kit.charge.max, casting: caster.cast?.def.id ?? null };
  }

  /** Soft lock (CONTROL_SCHEME §2): the nearest opponent within the ability's range, else straight ahead. */
  aimFor(f: FighterEntity, def: AbilityDef): Vec2 {
    let best: FighterEntity | null = null;
    // Blinded: no aim help at all; in the dark, only someone inside its circle of sight (owner, 13/11/2026).
    let bestD = f.combatant.blinded ? -1 : Math.min(def.aimRangeM, f.combatant.sightM);
    for (const o of this.fightersOf()) {
      if (o === f || o.combatant.isKo || o.team === f.team) continue;
      const d = Math.hypot(o.x - f.x, o.y - f.y);
      if (d <= bestD) {
        best = o;
        bestD = d;
      }
    }
    if (best) return { x: best.x, y: best.y };
    const ahead = def.delivery.type === 'leap' ? def.delivery.maxRangeM * 0.6 : 5;
    return { x: f.x + f.aim.x * ahead, y: f.y + f.aim.y * ahead };
  }

  // ---- AbilityHost

  fighters(): readonly AbilityTarget[] {
    return this.fightersOf().map((f) => ({
      id: f.name,
      x: f.x,
      y: f.y,
      radiusM: f.def.body.footRadiusM,
      hittable: !f.combatant.isKo && f.body !== null,
      team: f.team,
    }));
  }

  sees(casterId: string, targetId: string): boolean {
    const f = this.byName(casterId);
    const o = this.byName(targetId);
    if (!f || !o) return false;
    return !f.combatant.blinded && Math.hypot(o.x - f.x, o.y - f.y) <= f.combatant.sightM;
  }

  hitFighter(casterId: string, targetId: string, payload: AbilityPayload, dir: Vec2, hitFlash?: number): boolean {
    const attacker = this.byName(casterId);
    const target = this.byName(targetId);
    if (!attacker || !target) return false;
    // A power buff (Death's Dominion) strengthens the caster's abilities while it lasts.
    let damage = payload.damage * (attacker.buff?.abilityDamageFactor ?? 1);
    // Sword Mastery (Kenshiro): enough stacks make the next sword ability stronger, every hit of it.
    const mastery = attacker.caster?.kit.passive?.mastery;
    // Finishing bonus (Sliding Slice): a target already nearly beaten takes more.
    damage *= finisherFactor(payload, target.combatant.hp / Math.max(1, target.combatant.stats.maxHp));
    if ((payload.sword || payload.psi || payload.gadget || payload.sonic || payload.temporal) && mastery)
      damage *= attacker.combatant.swordFactor(mastery.threshold, mastery.damageFactor, mastery.windowS);
    // Vibration Punch: lighter bodies fly further than heavier ones.
    const byWeight = payload.knockbackByWeight;
    const knockback = byWeight
      ? payload.knockbackMps *
        Math.min(byWeight.maxK, Math.max(byWeight.minK, byWeight.refKg / Math.max(1, target.def.body.massKg)))
      : payload.knockbackMps;
    const hpBefore = target.combatant.hp;
    const landed = this.strike(attacker, target, {
      damage,
      heavy: payload.heavy,
      knockbackMps: knockback,
      dir,
      melee: false,
      burn: payload.burn,
      impact: payload.impact ?? (payload.heavy ? 'fire-heavy' : 'fire'),
      flashColour: hitFlash,
      stunS: payload.stunS,
      noFlinch: payload.noFlinch,
    });
    // Shroud's knife: deep cuts bleed.
    if (landed && payload.bleed) target.combatant.bleed();
    // Vexoris's poison: toxicity stacks.
    if (landed && payload.poison) target.combatant.poison(payload.poison);
    // Mental Focus (Psion): every ability that lands builds focus.
    if (
      landed &&
      (attacker.caster?.kit.passive?.id === 'focus' ||
        attacker.caster?.kit.passive?.id === 'efficiency' ||
        attacker.caster?.kit.passive?.id === 'resonance' ||
        attacker.caster?.kit.passive?.id === 'temporal')
    )
      attacker.combatant.gainMastery(1, attacker.caster.kit.passive.maxStacks);
    // Soul Drain: the target is blinded for a while.
    if (landed && payload.blindS) target.combatant.blind(payload.blindS);
    if (landed && payload.slow) target.combatant.slow(payload.slow.durationS, payload.slow.speedFactor);
    if (landed && payload.aging)
      target.combatant.age(payload.aging.durationS, payload.aging.dps, payload.aging.defenceFactor);
    if (landed && payload.mute) target.combatant.mute(payload.mute.durationS);
    if (landed && payload.shatter) target.combatant.shatter(payload.shatter.durationS, payload.shatter.defenceFactor);
    if (landed && payload.disrupt) target.combatant.disrupt(payload.disrupt.durationS);
    // Curse of Decay: weaker blows and weaker defence for a while.
    if (landed && payload.decay) {
      const d = payload.decay;
      target.combatant.decay(d.durationS, d.attackFactor, d.defenceFactor);
    }
    // Soul Drain (HL, N2): the caster takes back a share of the HP the blow actually removed; a blocked,
    // absorbed or missed blow removes none, so it heals none.
    if (landed && payload.lifesteal && !attacker.combatant.isKo) {
      attacker.combatant.heal((hpBefore - target.combatant.hp) * payload.lifesteal);
    }
    return landed;
  }

  heal(targetId: string, amount: number): boolean {
    const f = this.byName(targetId);
    if (!f || f.combatant.isKo) return false;
    f.combatant.heal(amount);
    return true;
  }

  /** Set by the scene: Time Stop begins or ends. */
  onTimeStop: ((casterId: string, on: boolean) => void) | null = null;

  timeStop(casterId: string, on: boolean): void {
    this.onTimeStop?.(casterId, on);
  }

  pin(targetId: string, away: Vec2, seconds: number): void {
    const t = this.byName(targetId);
    if (t) t.pinned = { awayX: away.x, awayY: away.y, leftS: seconds };
  }

  barrier(casterId: string, hp: number, durationS: number): void {
    this.byName(casterId)?.combatant.raiseBarrier(hp, durationS);
  }

  parryWindowFactor(casterId: string): number {
    return this.byName(casterId)?.buff?.parryWindowFactor ?? 1;
  }

  fogFighter(targetId: string, fog: { sightM: number; speedFactor: number; chipDps: number; stack: boolean }): void {
    const t = this.byName(targetId);
    if (!t || t.combatant.isKo) return;
    t.combatant.fog(fog.chipDps, fog.speedFactor, fog.sightM);
    if (fog.stack) t.combatant.poison(1);
  }

  teleport(casterId: string, to: Vec2): Vec2 | null {
    const f = this.byName(casterId);
    return f ? this.teleportSource(f, to) : null;
  }

  hold(targetId: string, seconds: number): void {
    const f = this.byName(targetId);
    if (!f) return;
    // Seized (owner, 13/11/2026): whatever it was doing stops at once, a charge or a dash included,
    // or its own drive and the grab's would fight and fling both round the arena. The stun keeps it
    // from starting anything new until it is slammed down.
    f.caster?.interrupt(true);
    f.combatant.dropCrystalShield(); // a grab ignores a shield: it shatters
    this.world.cancel(f.name, this);
    f.scriptedAttack = null;
    f.combo.interrupt();
    f.combatant.setGuard(false);
    f.combatant.stun(seconds);
  }

  summon(casterId: string, spec: SummonSpec): void {
    const f = this.byName(casterId);
    if (f) this.summonSource(f, spec);
  }

  hitEnvironment(
    casterId: string,
    at: Vec2,
    radiusM: number,
    payload: AbilityPayload,
    dir: Vec2,
    continuous: boolean,
  ): void {
    const radial = dir.x === 0 && dir.y === 0;
    const result = this.props?.hitWhere((r) => circleTouchesRect(at, radiusM, r), {
      blow: continuous ? 'knockback' : 'strike',
      damage: payload.damage,
      strength: payload.strength,
      direction: dir,
      origin: radial ? at : undefined,
      ignites: payload.ignites,
    });
    let broke = (result?.broke ?? 0) > 0;
    for (const door of this.doors) {
      if (door.broken || !circleTouchesRect(at, radiusM, door.spec)) continue;
      const cx = (door.spec.x0 + door.spec.x1) / 2;
      const away = radial ? { x: Math.sign(cx - at.x) || 1, y: 0 } : dir;
      if (door.applyImpact({ kind: 'strike', strength: payload.strength, direction: away })) broke = true;
    }
    // Breakable wall sections: blasts chip them harder than fists, but only the sections in reach.
    const power = this.byName(casterId)?.def.objects.wallBreakPower ?? 1;
    const w = this.walls?.hitWhere((r) => circleTouchesRect(at, radiusM, r), {
      damage: (payload.wallDamage ?? payload.damage) * power,
      fire: payload.burn !== undefined || payload.ignites === true,
      blast: !continuous && payload.wallDamage === undefined,
      direction: radial ? { x: 0, y: 1 } : dir,
      at, // the blast cracks the section nearest its centre, never the whole wall
    });
    if (w && w.broke > 0) broke = true;
    if (broke) this.onEnvironmentBreak();
  }

  attract(at: Vec2, radiusM: number, strength: number): void {
    this.props?.attract(at, radiusM, strength);
  }

  blocked(from: Vec2, to: Vec2): number | null {
    return this.physics.castWorldRay(from, to)?.fraction ?? null;
  }

  steer(casterId: string, fresh: boolean): Vec2 | null {
    const f = this.byName(casterId);
    return f ? this.steerSource(f, fresh) : null;
  }

  face(casterId: string, dir: Vec2): void {
    this.byName(casterId)?.faceToward(dir.x, dir.y);
  }

  position(casterId: string): Vec2 {
    const f = this.byName(casterId);
    return f ? { x: f.x, y: f.y } : { x: 0, y: 0 };
  }

  drive(casterId: string, velocity: Vec2 | null, heightM: number): void {
    const f = this.byName(casterId);
    if (!f) return;
    // Released (a dash or leap ended): stop on the spot instead of sliding on, so the leap lands where it was aimed.
    if (!velocity && f.driveVelocity) f.body?.setLinvel({ x: 0, y: 0 }, true);
    f.driveVelocity = velocity ? { x: velocity.x, y: velocity.y } : null;
    f.abilityLift = heightM;
  }

  buff(casterId: string, buff: BuffEffect | null, abilityId?: string): void {
    const f = this.byName(casterId);
    if (!f) return;
    f.buff = buff ? { ...buff, leftS: buff.durationS } : null;
    f.buffSourceId = buff ? (abilityId ?? null) : null;
    f.combatant.damageTakenScale = buff ? buff.damageTakenFactor : 1;
    // Rampage Mode: the other abilities come back 25% sooner while it lasts.
    if (f.caster) {
      f.caster.cooldownScale = buff?.cooldownFactor ?? 1;
      if (buff?.cooldownFactor) f.caster.scaleCooldowns(buff.cooldownFactor);
    }
    // Crystal Sovereign: armour that takes the next few blows, and a small shield for the next few frontal ones.
    if (buff?.sovereign) {
      f.combatant.raiseCrystalArmour(buff.sovereign.armourHits);
      f.combatant.raiseCrystalShield({
        hp: 0,
        hits: buff.sovereign.shieldHits,
        seconds: buff.durationS,
        heavyFactor: 1,
      });
    }
    // Hunting Frenzy puts the lights out on every enemy for as long as it lasts.
    if (buff?.darkensFoes)
      for (const o of this.fightersOf())
        if (o.team !== f.team && !o.combatant.isKo) o.combatant.darken(buff.durationS, buff.darkensFoes.visibleM);
  }

  /** Shard Blade: the dual swords grow for `durationS` and their moveset takes over his taps and heavy. */
  arm(casterId: string, durationS: number): void {
    const f = this.byName(casterId);
    if (!f) return;
    f.heldWeapon = 'blades';
    f.weaponLeftS = durationS;
    f.combo.useMoveset(SHARD_BLADE_MOVESET.moves, SHARD_BLADE_MOVESET.starters);
  }

  /** The swords end (time out, a KO, or another ability): his own punches come back at once. */
  disarm(f: FighterEntity): void {
    if (!f.heldWeapon) return;
    f.heldWeapon = null;
    f.weaponLeftS = 0;
    f.combo.resetMoveset();
  }

  trap(targetId: string, seconds: number): void {
    const f = this.byName(targetId);
    if (!f) return;
    f.combatant.trapLegs(seconds);
    if (seconds > 0) {
      // Held where it stands: whatever it was doing with its legs stops (a charge, a dash, a leap).
      this.world.cancel(f.name, this);
      f.combo.interrupt();
    }
  }

  legTrapState(targetId: string): { heightM: number; flies: boolean; trappedS: number } {
    const f = this.byName(targetId);
    if (!f) return { heightM: 0, flies: false, trappedS: 0 };
    return {
      heightM: f.hop.heightM + f.abilityLift,
      flies: (f.view?.hoverM ?? 0) > 0 || f.abilityLift > 0.05,
      trappedS: f.combatant.trapLeftS,
    };
  }

  standable(at: Vec2): boolean {
    return this.standableSource(at);
  }

  burnFighter(targetId: string, burn: Burn): void {
    this.byName(targetId)?.combatant.ignite(burn.dps, burn.durationS);
  }

  emit(fx: AbilityFx): void {
    this.pending.push(fx);
    this.recentFx.push(fx);
    if (this.recentFx.length > MAX_FX_LOG) this.recentFx.shift();
    if (this.pending.length > 200) this.pending.shift(); // nobody draining (headless): keep it bounded
    if (fx.sfx) {
      this.sounds.push(fx.sfx);
      if (this.sounds.length > 32) this.sounds.shift();
      this.sfxLog.push(fx.sfx);
      if (this.sfxLog.length > MAX_FX_LOG) this.sfxLog.shift();
    }
  }

  private byName(name: string): FighterEntity | undefined {
    return this.fightersOf().find((f) => f.name === name);
  }
}
