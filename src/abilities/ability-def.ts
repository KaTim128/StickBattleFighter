import type { ImpactId } from '../data/combat/impacts';

/**
 * Ability data (REQ-ABL-1..6, TD-032). Every fighter's three abilities and
 * ultimate are plain data run by one shared framework: the caster (stamina,
 * cooldown, ultimate meter, cast phases, interruption) and the delivery world
 * (projectiles, dashes, telegraphed areas, leaps). Delivery types follow the
 * Creature Clash *categories* as a design reference only (REQ-ABL-5); the
 * abilities themselves are original.
 */

/** Four abilities and the ultimate (owner, 12/11/2026: a fourth ability on R for every fighter). */
export type AbilitySlot = 'a1' | 'a2' | 'a3' | 'a4' | 'ult';
export const ABILITY_SLOTS: readonly AbilitySlot[] = ['a1', 'a2', 'a3', 'a4', 'ult'];

/** Damage-over-time on fighters (and burning on flammable props). */
export interface Burn {
  readonly dps: number;
  readonly durationS: number;
}

/** What an ability does to whatever it hits. */
export interface AbilityPayload {
  readonly damage: number;
  readonly knockbackMps: number;
  /** Knocks down (like the combo finisher) instead of a flinch. */
  readonly heavy: boolean;
  /** Impact strength for furniture and doors (same scale as melee `strength`). */
  readonly strength: number;
  readonly burn?: Burn;
  /** Sets flammable props alight (Inferno, spec §8.3). */
  readonly ignites?: boolean;
  /** How a hit feels (flash, sparks, hit-stop); defaults to 'fire', or 'fire-heavy' when heavy. */
  readonly impact?: ImpactId;
  /** Closer hits deal more (owner, 11/11/2026): see `falloffFactor`. Absent = the same at any range. */
  readonly falloff?: DamageFalloff;
  /** Stuns the target this long after it lands (Crushing Strike). */
  readonly stunS?: number;
  /**
   * Smashes through obstacles (Rampage Charge): breakable wall sections take this much damage, and
   * furniture and doors in the way are hit with the payload's full strength. Solid walls still stop it.
   */
  readonly wallDamage?: number;
  /** Restores this fraction of the damage to the caster when it lands (Soul Drain, owner 12/11/2026). */
  readonly lifesteal?: number;
  /**
   * Blinds the target this long when it lands (Soul Drain, owner 12/11/2026): it cannot lock on
   * to anyone; a computer-controlled fighter cannot find its target; a player's view goes dark.
   */
  readonly blindS?: number;
  /**
   * Drags the target toward the caster when it lands (Grave Chains, owner 12/11/2026), at
   * `speedMps`, stopping `stopM` in front of the caster or at anything solid in the way.
   */
  readonly pull?: { readonly speedMps: number; readonly stopM: number };
}

/**
 * Distance-based damage (owner, 11/11/2026, Fire Beam and Eruption): full damage within
 * `fullWithinM` of the source, easing down linearly to `minFactor` of it at the ability's reach.
 * Knockback eases the same way (but never below half). Bounded both ways, so point-blank hits
 * are never more than the listed damage and edge hits never less than `minFactor` of it.
 */
export interface DamageFalloff {
  readonly fullWithinM: number;
  readonly minFactor: number;
}

/** 0..1 damage factor at `distanceM` from the source, for an ability reaching `reachM`. */
export function falloffFactor(distanceM: number, falloff: DamageFalloff | undefined, reachM: number): number {
  if (!falloff) return 1;
  const span = Math.max(1e-6, reachM - falloff.fullWithinM);
  const t = Math.min(1, Math.max(0, (distanceM - falloff.fullWithinM) / span));
  return 1 - (1 - falloff.minFactor) * t;
}

/** The payload as it lands at this distance (damage and knockback scaled by its falloff). */
export function payloadAt(payload: AbilityPayload, distanceM: number, reachM: number): AbilityPayload {
  if (!payload.falloff) return payload;
  const k = falloffFactor(distanceM, payload.falloff, reachM);
  return {
    ...payload,
    damage: Math.round(payload.damage * k),
    knockbackMps: payload.knockbackMps * (0.5 + 0.5 * k),
  };
}

/** A shot that flies until it hits a fighter, a wall or solid furniture, or runs out of range. */
export interface ProjectileDelivery {
  readonly type: 'projectile';
  readonly speedMps: number;
  readonly radiusM: number;
  readonly maxRangeM: number;
}

/** The caster rushes forward, hitting fighters in the way, optionally leaving a burning trail. */
export interface DashDelivery {
  readonly type: 'dash';
  readonly distanceM: number;
  readonly speedMps: number;
  readonly hitRadiusM: number;
  readonly trail?: { readonly lifeS: number; readonly radiusM: number; readonly burn: Burn };
  /**
   * A body charge (Rampage Charge, owner 12/11/2026): it stops dead on the first fighter it hits
   * or when it slams into something that does not give (a wall), with a collision burst of this
   * radius (2 m or more also shakes the screen). Absent = the dash passes through.
   */
  readonly collision?: { readonly radiusM: number };
}

/** A ring around the caster: telegraphed on the floor first (REQ-ABL-6), then it erupts. */
export interface NovaDelivery {
  readonly type: 'nova';
  readonly radiusM: number;
  readonly telegraphS: number;
  /**
   * Erupts where the caster aims (the soft-locked target, within `aimRangeM`, short of walls)
   * instead of around the caster (Death Eruption, owner 12/11/2026).
   */
  readonly atTarget?: boolean;
}

/**
 * Raise summoned minions (Undead Army, owner 12/11/2026): `count` of the character `character`
 * appear around the caster, fight for its side under their own AI for `lifeS`, then crumble.
 * Never more than `maxAlive` of the caster's summons at once (the oldest crumble first); they
 * never appear inside walls or furniture.
 */
export interface SummonSpec {
  readonly character: string;
  readonly count: number;
  /** Seconds before they crumble; null = they stay until killed (owner, 12/11/2026). */
  readonly lifeS: number | null;
  readonly maxAlive: number;
  /** Where they rise: around the caster (default) or at random spots near the nearest enemy. */
  readonly near?: 'caster' | 'enemy';
  /** They stay even if the summoner falls. */
  readonly persistent?: boolean;
}

/**
 * Teleport (Necro, owner 12/11/2026): the caster vanishes and reappears at the chosen spot, within
 * `maxRangeM`, anywhere on the map that a body can stand (never inside walls or furniture). The
 * spot is picked by the player: on desktop press the ability, then left click the destination; on
 * touch tap the ability button, then tap the destination.
 */
export interface TeleportDelivery {
  readonly type: 'teleport';
  readonly maxRangeM: number;
  /** How fast WASD or the joystick moves the destination while aiming (owner, 12/11/2026). */
  readonly aimSpeedMps?: number;
}

export interface SummonDelivery extends SummonSpec {
  readonly type: 'summon';
}

/** The caster leaps to the target spot (telegraphed while airborne) and slams down in an area. */
export interface LeapDelivery {
  readonly type: 'leap';
  readonly maxRangeM: number;
  readonly airS: number;
  readonly peakM: number;
  readonly radiusM: number;
  /** How fast WASD or the joystick moves the landing spot while aiming (owner, 12/11/2026). */
  readonly aimSpeedMps?: number;
}

/**
 * A continuous beam from the caster's hands (Fire Beam, owner 11/11/2026): it fires straight
 * ahead for `durationS` (the caster is rooted), stopped short by walls, doors and furniture,
 * and every `tickS` hits each fighter within `widthM / 2` of it with the payload (scaled by
 * distance if the payload has a falloff).
 */
export interface BeamDelivery {
  readonly type: 'beam';
  readonly rangeM: number;
  readonly widthM: number;
  readonly durationS: number;
  readonly tickS: number;
  /**
   * Steering (owner, 12/11/2026): while the beam pours, it turns toward where the caster
   * steers it (the mouse on desktop, a swipe on touch) at up to this rate, radians per second.
   * Absent or 0 = it fires straight ahead.
   */
  readonly turnRadPerS?: number;
}

/** A close, heavy blow straight ahead at release (Crushing Strike): hits fighters, furniture and doors in reach. */
export interface StrikeDelivery {
  readonly type: 'strike';
  readonly reachM: number;
  readonly radiusM: number;
}

/**
 * A timed self-buff (Rampage Mode): faster movement and less damage taken for `durationS`. No
 * hit; the release is the activation (roar, shockwave look) and the aura lasts while it runs.
 */
export interface BuffDelivery {
  readonly type: 'buff';
  readonly durationS: number;
  /** Multiplies movement speed (1.15 = 15% faster). */
  readonly speedFactor: number;
  /** Multiplies damage taken (0.85 = 15% more durable). */
  readonly damageTakenFactor: number;
  /** Multiplies the damage of the caster's abilities while it lasts (Death's Dominion). */
  readonly abilityDamageFactor?: number;
  /** Raises minions as it begins (Death's Dominion's extra undead). */
  readonly summon?: SummonSpec;
}

/**
 * A grab and slam (Braxon's Grapple Slam, owner 12/11/2026): at release the nearest enemy within
 * `reachM` (and `radiusM` either side) is seized, hoisted overhead over `liftS` to `liftM`, held,
 * then slammed into the floor in front of the caster with the payload, a dust blast of `slamRadiusM`
 * hitting furniture around it. Nobody in reach: a heavy grasp at the air.
 */
export interface GrabDelivery {
  readonly type: 'grab';
  readonly reachM: number;
  readonly radiusM: number;
  readonly liftS: number;
  readonly liftM: number;
  readonly slamRadiusM: number;
}

export type Delivery =
  | ProjectileDelivery
  | DashDelivery
  | NovaDelivery
  | LeapDelivery
  | BeamDelivery
  | StrikeDelivery
  | BuffDelivery
  | SummonDelivery
  | TeleportDelivery
  | GrabDelivery;

/**
 * How a magic attack looks and feels, stage by stage (the Magic Attack VFX Standard,
 * `docs/design/MAGIC_VFX_STANDARD.md`; benchmark: Inferno's Fireball, owner 11/11/2026).
 * Every stage is optional: an ability uses the stages that fit its delivery, in its own
 * element's colours. Purely presentation: none of it changes damage or timing.
 */
export interface MagicLook {
  /** The element's colours, darkest to hottest (fire: red, orange, amber, white-yellow). */
  readonly palette: { readonly deep: number; readonly hot: number; readonly bright: number; readonly core: number };
  /** Wind-up: motes drawn in from the air to the casting hand while a core swells in the palm. */
  readonly charge?: {
    /** How far out the motes start, metres. */
    readonly gatherRadiusM: number;
    readonly motesPerS: number;
    /** Core radius in the palm at release, metres. */
    readonly coreMaxM: number;
  };
  /** In flight: a streaming trail of element particles and sparks; heat shimmer around the core. */
  readonly flight?: { readonly trailPerS: number; readonly sparksPerS: number; readonly shimmer: boolean };
  /** On contact: a bright flash, then a burst of sparks and element particles, a ring, a scorch, smoke. */
  readonly impact?: {
    readonly flashM: number;
    readonly sparks: number;
    readonly motes: number;
    readonly ringM: number;
    readonly scorchM?: number;
    readonly smoke?: number;
    /** Big blasts spread fire across the floor; false for non-fire impacts (dust, debris). Default true. */
    readonly groundFire?: boolean;
    /** Smoke or dust colour (default dark smoke). */
    readonly smokeColour?: number;
  };
  /** The target's body flashes this colour on contact (white for the Fireball). */
  readonly hitFlash?: number;
  /**
   * A buff's aura while it lasts: 'full' (default) has rising embers and steam (a fury); 'quiet'
   * keeps only the soft ring on the floor, for casters whose own body glow shows the power
   * (Necro's Death's Dominion, CHARACTER_STYLE_QA S7).
   */
  readonly aura?: 'full' | 'quiet';
}

export interface AbilityDef {
  readonly id: string;
  readonly name: string;
  /** Short label for buttons and the ability bar. */
  readonly label: string;
  /** What it does, in a sentence or two (the fighter details screen, owner 12/11/2026). */
  readonly description?: string;
  /** Picture shown on the ability bar and touch buttons (src/interface/ability-icons.ts); falls back to the label. */
  readonly icon?: string;
  readonly slot: AbilitySlot;
  /** Stamina spent on cast (the ultimate uses its meter instead). */
  readonly staminaCost: number;
  readonly cooldownS: number;
  /** Wind-up before the ability is released (anticipation, interruptible). */
  readonly castS: number;
  /** Time after release before the fighter can act again (covers telegraphs, dashes and leaps). */
  readonly recoveryS: number;
  /** How far the soft lock reaches when aiming at the target (CONTROL_SCHEME §2). */
  readonly aimRangeM: number;
  /** Movement allowed while casting (0 = rooted, 1 = full speed). */
  readonly moveFactor: number;
  /** A hit during the wind-up cancels it (true for normal abilities; the ultimate is uninterruptible). */
  readonly interruptible: boolean;
  readonly payload: AbilityPayload;
  readonly delivery: Delivery;
  /** Presentation hooks (REQ-ABL-1): VFX profile and sound-effect ids fired on cast events. */
  readonly vfx: string;
  readonly sfx: { readonly cast: string; readonly release: string; readonly impact: string };
  /** The ability's look under the Magic Attack VFX Standard (optional: older looks fall back to defaults). */
  readonly look?: MagicLook;
}

/** How the ultimate meter fills (OQ-04 answered by the owner 11/11/2026: a charge meter). */
export interface UltimateCharge {
  readonly max: number;
  readonly perDamageDealt: number;
  readonly perDamageTaken: number;
  readonly perSecond: number;
}

export interface AbilityKit {
  readonly a1: AbilityDef;
  readonly a2: AbilityDef;
  readonly a3: AbilityDef;
  readonly a4: AbilityDef;
  readonly ult: AbilityDef;
  readonly charge: UltimateCharge;
  /** The basic combo's picture on the fighter details screen (owner, 12/11/2026: unique per fighter). */
  readonly comboIcon?: string;
}
