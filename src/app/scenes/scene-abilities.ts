import type { AbilityHudState, CastBlock } from '../../abilities/ability-caster';
import type { AbilityDef, AbilityPayload, AbilitySlot, Burn } from '../../abilities/ability-def';
import {
  type AbilityFx,
  type AbilityHost,
  type AbilityTarget,
  AbilityWorld,
  type Vec2,
} from '../../abilities/ability-world';
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
  },
) => boolean;

const MAX_FX_LOG = 60;

/**
 * Connects the shared ability framework to a fight scene: casting from player
 * input, soft-lock aiming (CONTROL_SCHEME §2), the AbilityHost (hits through the
 * scene's strike path, furniture, doors, walls) and the FX event queue for VFX
 * and sound hooks.
 */
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
    const block = caster.check(slot, {
      canAct: c.canAct && !f.combo.attack,
      stamina: c.stamina,
      airborne: f.airborne,
    });
    if (block) return block;
    const def = caster.def(slot);
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
    const ev = caster.update(stepS);
    if (ev.released) {
      const def = ev.released;
      if (def.delivery.type === 'leap') f.combatant.grantInvulnerability(def.delivery.airS + 0.1); // airborne: untouchable
      const aim = this.aimOverrides.get(f.name) ?? this.aimFor(f, def);
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
    const slots = (['a1', 'a2', 'a3', 'ult'] as const).map((slot) => {
      const def = caster.def(slot);
      return {
        slot,
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
    let bestD = def.aimRangeM;
    for (const o of this.fightersOf()) {
      if (o === f || o.combatant.isKo) continue;
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
    }));
  }

  hitFighter(casterId: string, targetId: string, payload: AbilityPayload, dir: Vec2, hitFlash?: number): boolean {
    const attacker = this.byName(casterId);
    const target = this.byName(targetId);
    if (!attacker || !target) return false;
    return this.strike(attacker, target, {
      damage: payload.damage,
      heavy: payload.heavy,
      knockbackMps: payload.knockbackMps,
      dir,
      melee: false,
      burn: payload.burn,
      impact: payload.impact ?? (payload.heavy ? 'fire-heavy' : 'fire'),
      flashColour: hitFlash,
      stunS: payload.stunS,
    });
  }

  hitEnvironment(
    _casterId: string,
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
    const w = this.walls?.hitWhere((r) => circleTouchesRect(at, radiusM, r), {
      damage: payload.wallDamage ?? payload.damage,
      blast: !continuous && payload.wallDamage === undefined,
      direction: radial ? { x: 0, y: 1 } : dir,
      at, // the blast cracks the section nearest its centre, never the whole wall
    });
    if (w && w.broke > 0) broke = true;
    if (broke) this.onEnvironmentBreak();
  }

  blocked(from: Vec2, to: Vec2): number | null {
    return this.physics.castWorldRay(from, to)?.fraction ?? null;
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

  buff(casterId: string, buff: { speedFactor: number; damageTakenFactor: number; durationS: number } | null): void {
    const f = this.byName(casterId);
    if (!f) return;
    f.buff = buff ? { ...buff, leftS: buff.durationS } : null;
    f.combatant.damageTakenScale = buff ? buff.damageTakenFactor : 1;
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
