import type { ImpactId } from '../data/combat/impacts';

/**
 * Ability data (REQ-ABL-1..6, TD-032). Every fighter's three abilities and
 * ultimate are plain data run by one shared framework: the caster (stamina,
 * cooldown, ultimate meter, cast phases, interruption) and the delivery world
 * (projectiles, dashes, telegraphed areas, leaps). Delivery types follow the
 * Creature Clash *categories* as a design reference only (REQ-ABL-5); the
 * abilities themselves are original.
 */

/** Buttons 2–5: ability 1, 2, 3 and the ultimate. */
export type AbilitySlot = 'a1' | 'a2' | 'a3' | 'ult';
export const ABILITY_SLOTS: readonly AbilitySlot[] = ['a1', 'a2', 'a3', 'ult'];

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
}

/** A ring around the caster: telegraphed on the floor first (REQ-ABL-6), then it erupts. */
export interface NovaDelivery {
  readonly type: 'nova';
  readonly radiusM: number;
  readonly telegraphS: number;
}

/** The caster leaps to the target spot (telegraphed while airborne) and slams down in an area. */
export interface LeapDelivery {
  readonly type: 'leap';
  readonly maxRangeM: number;
  readonly airS: number;
  readonly peakM: number;
  readonly radiusM: number;
}

export type Delivery = ProjectileDelivery | DashDelivery | NovaDelivery | LeapDelivery;

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
  };
  /** The target's body flashes this colour on contact (white for the Fireball). */
  readonly hitFlash?: number;
}

export interface AbilityDef {
  readonly id: string;
  readonly name: string;
  /** Short label for buttons and the ability bar. */
  readonly label: string;
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
  readonly ult: AbilityDef;
  readonly charge: UltimateCharge;
}
