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
   * The hit deals its damage (and push) without the usual flinch or fall: Shroud's stabs never stun
   * or knock down, so repeated stabbing cannot lock a target (master plan B6).
   */
  readonly noFlinch?: boolean;
  /** A sword ability (Kenshiro): eligible for Sword Mastery's enhancement. */
  readonly sword?: boolean;
  /** A psychic ability (Psion): eligible for Mental Focus's enhancement. */
  readonly psi?: boolean;
  /** A gadget (Geargrind): eligible for Mechanical Efficiency's enhancement. */
  readonly gadget?: boolean;
  /** A sonic ability (Reson): eligible for Resonance's enhancement. */
  readonly sonic?: boolean;
  /** Mutes the target for `durationS`: it cannot use abilities (blows, blocking and dodging still work). */
  readonly mute?: { readonly durationS: number };
  /** Shatters the target's defence: its defence is multiplied by `defenceFactor` for `durationS` (Resonance Break). */
  readonly shatter?: { readonly durationS: number; readonly defenceFactor: number };
  /**
   * Knockback scales with the target's weight (Vibration Punch): `knockbackMps` is for a body of `refKg`; a lighter one
   * flies further, a heavier one less, never below `minK` or above `maxK` of the base.
   */
  readonly knockbackByWeight?: { readonly refKg: number; readonly minK: number; readonly maxK: number };
  /** A temporal ability (Chronos): eligible for Temporal Momentum's enhancement. */
  readonly temporal?: boolean;
  /**
   * Feedback Pulse (Reson): the target's movement direction wobbles for `durationS` seconds and its facing drifts. It
   * never stuns and never cancels an attack.
   */
  readonly disrupt?: { readonly durationS: number };
  /** Slows the target's movement by `speedFactor` and its ability use (wind-ups and cooldowns) for `durationS` (Chronos's Afterimage). */
  readonly slow?: { readonly durationS: number; readonly speedFactor: number };
  /** Aging (Chronos's Age Acceleration): damage over time and a defence cut for `durationS`. */
  readonly aging?: { readonly durationS: number; readonly dps: number; readonly defenceFactor: number };
  /**
   * Finishing bonus (Kenshiro's Sliding Slice): against a target at or below `belowHp` of its health (0..1) the blow
   * deals `bonus` more damage (0.6 = 60% more).
   */
  readonly finisher?: { readonly belowHp: number; readonly bonus: number };
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
   * Curse of Decay (owner, 12/11/2026): for `durationS` the target deals `attackFactor` of its
   * damage and its defence is multiplied by `defenceFactor`. Refreshes, never stacks.
   */
  readonly decay?: { readonly durationS: number; readonly attackFactor: number; readonly defenceFactor: number };
  /** Deep cuts: the target bleeds (takes 10% more damage for 6 s, `BLEED`; Shroud's knife). */
  readonly bleed?: boolean;
  /** Toxicity stacks the target gets when it lands (Vexoris, TD-115). One application per target per hit event. */
  readonly poison?: number;
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

/** The damage factor of a payload's finishing bonus against a target with `hpFraction` (0..1) of its health left (1 = none). */
export function finisherFactor(payload: AbilityPayload, hpFraction: number): number {
  const f = payload.finisher;
  return f && hpFraction <= f.belowHp ? 1 + f.bonus : 1;
}

/**
 * A lingering cloud (Vexoris, TD-115): the ability's payload lands on each fighter inside it ONCE per cloud (a fighter
 * who stays, or leaves and returns, is not hit again), so a cloud can never apply poison every frame.
 */
export interface CloudSpec {
  readonly radiusM: number;
  readonly lifeS: number;
  /** Seconds before it starts to take effect (a trap arming); it is drawn from the start. */
  readonly armS?: number;
  /**
   * A landmine (Chemical Trap): the cloud lies dormant, drawn as a mine on the floor, until an enemy steps within
   * `triggerRadiusM` of it (after `armS`); then it bursts and the cloud begins. It is removed after `waitS` unused.
   */
  readonly mine?: {
    readonly triggerRadiusM: number;
    readonly waitS: number;
    readonly maxPerCaster: number;
    /**
     * A magnetic mine (Geargrind): while it lies armed it tugs loose metal props within `radiusM` toward itself, and
     * when it goes off every enemy it catches is dragged in and held `holdS` seconds before the burst lands.
     */
    readonly magnet?: { readonly radiusM: number; readonly pullStrength: number; readonly holdS: number };
  };
  /**
   * A choking fog (Plague Bloom): every enemy inside sees only `sightM`, is slowed to `speedFactor`, takes `chipDps`
   * damage per second and, after `stackAfterS` seconds inside, one stack of poison. The caster is immune and sees clearly.
   */
  readonly fog?: {
    readonly sightM: number;
    readonly speedFactor: number;
    readonly chipDps: number;
    readonly stackAfterS: number;
  };
}

/** A cloud or hazard placed where the caster aims (within range, short of walls): Chemical Trap. */
export interface CloudDelivery extends CloudSpec {
  readonly type: 'cloud';
}

/** A shot that flies until it hits a fighter, a wall or solid furniture, or runs out of range. */
export interface ProjectileDelivery {
  readonly type: 'projectile';
  /** Shatters into a cloud where it lands (Toxic Jar). */
  readonly cloud?: CloudSpec;
  readonly speedMps: number;
  readonly radiusM: number;
  readonly maxRangeM: number;
  /**
   * A tornado (Aerion's Tornado Surge): on contact the target takes the payload's contact hit, is swept up `liftM` over
   * `liftS` seconds, and the tornado disappears; the target then falls and takes `fallDamage`.
   */
  readonly lift?: { readonly liftS: number; readonly liftM: number; readonly fallDamage: number };
  /** Shard Volley: `count` shots leave at once, spread evenly across `spreadRad` radians round the aim. */
  readonly fan?: { readonly count: number; readonly spreadRad: number };
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
  /**
   * Keeps charging in a straight line until something stops it (owner, 12/11/2026: "continue
   * travelling in a straight line until he hits a wall"): `distanceM` is then only a safety
   * limit. Furniture and breakable wall sections in the way are smashed and the charge runs on;
   * a solid wall (or the first enemy, with `collision`) stops it.
   */
  readonly untilBlocked?: boolean;
  /** Dashes directly away from where the caster aims (Vapour Step). */
  readonly backwards?: boolean;
  /** Leaves this cloud at the starting position (Vapour Step's mist); a dash with no hit radius hits nobody on the way. */
  readonly leavesCloud?: CloudSpec;
  /**
   * Leaves harmless afterimages along the path (Chronos's Afterimage): one every `spacingM` metres travelled, each lasting
   * `lifeS`. They deal no damage, cannot be hurt, and enemy shots that reach one are spent on it.
   */
  readonly afterimages?: { readonly spacingM: number; readonly lifeS: number };
  /**
   * Crystal Slide (Prismor): a glowing crystal trail lies under the path for `trailLifeS`, and where the slide stops crystal
   * thorns erupt after a short `warnS` warning: a blast of `radiusM` that deals `payload`.
   */
  readonly slide?: {
    readonly trailLifeS: number;
    readonly thorns: { readonly radiusM: number; readonly warnS: number; readonly payload: AbilityPayload };
  };
}

/**
 * A lobbed grenade (Vexoris): it flies in a curved arc to where the caster aims (short of walls). Passing through an
 * enemy it sticks to them and goes off `stickFuseS` later; otherwise it lands and goes off `fuseS` after landing. The
 * blast hits every enemy within `blastRadiusM` once with the payload (distance falloff applies) and never the caster.
 */
export interface GrenadeDelivery {
  readonly type: 'grenade';
  readonly speedMps: number;
  /** Peak height of the arc above the straight line, metres. */
  readonly arcHeightM: number;
  /** How close to an enemy's body it must pass in flight to stick to them. */
  readonly stickRadiusM: number;
  readonly stickFuseS: number;
  readonly fuseS: number;
  readonly blastRadiusM: number;
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
  /**
   * Shots loosed while the warning builds (Psion's Mindstorm: objects float up, then fly at his enemies): `count`
   * shots between half a second in and the end, each at an enemy inside the ring (or outward if none), carrying
   * `payload`. The ring's own blast at the end is the ability's payload.
   */
  readonly volley?: {
    readonly count: number;
    readonly payload: AbilityPayload;
    readonly speedMps: number;
    readonly radiusM: number;
    readonly maxRangeM: number;
  };
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
  /** Where they rise: around the caster (default) or in a fan in front of the nearest enemy, 2.6–3.6 m off. */
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
  /**
   * Not aimed: the caster reappears this far beyond the nearest enemy within range, on its far
   * side, facing it (Shroud's "Behind You"). Nobody in range: it fizzles.
   */
  readonly behindTargetM?: number;
  /**
   * Not aimed: the caster blinks this far away from the nearest enemy to make distance, turning
   * aside from walls in the way (first used by Shroud's former Shadow Escape, 12/11/2026).
   */
  readonly retreatM?: number;
}

/**
 * Rewind Time (Chronos): a blow straight ahead, and from then on the caster's start position is remembered and every
 * point of damage he really deals (hit points actually removed, never attempted damage) is added up for `durationS`
 * seconds. Then time runs back: he returns to where he started and recovers `healFactor` of that total.
 */
export interface RewindTimeDelivery {
  readonly type: 'rewindTime';
  readonly durationS: number;
  readonly healFactor: number;
  readonly reachM: number;
  readonly radiusM: number;
}

/**
 * Age Acceleration (Chronos): the nearest enemy within `rangeM` is aged: for the payload's `aging` duration it takes
 * damage over time and has its defence cut. The ability is the spell itself; the payload's own damage is the first blow.
 */
export interface AgeDelivery {
  readonly type: 'age';
  readonly rangeM: number;
}

/**
 * Time Stop (Chronos's ultimate): the whole arena stops for `durationS` seconds except the caster. Everything else is held:
 * fighters, their cooldown and ultimate timers, projectiles, furniture, doors, walls and physics. Blows struck meanwhile
 * are not applied but recorded, and when time resumes they all take effect at once.
 */
export interface TimeStopDelivery {
  readonly type: 'timeStop';
  readonly durationS: number;
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
  /**
   * Fly and dive instead of jump and slam (Aerion's Sky Dive): up steeply with little forward travel, over the top in
   * a curve and down onto the end point, the whole path an upside-down J.
   */
  readonly swoop?: boolean;
  /**
   * Shots loosed while the caster hangs in the air (Aerion's Celestial Tempest): `count` volleys between `fromS` and
   * `untilS` into the leap, each of `blades` shots fanned round the caster, sweeping round by `sweepRad` over the
   * whole volley so the storm crosses the battlefield. Each shot carries `payload`.
   */
  readonly volley?: {
    readonly count: number;
    readonly fromS: number;
    readonly untilS: number;
    readonly blades: number;
    readonly sweepRad: number;
    readonly payload: AbilityPayload;
    readonly speedMps: number;
    readonly radiusM: number;
    readonly maxRangeM: number;
  };
}

/**
 * A continuous beam from the caster's hands (Fire Beam, owner 11/11/2026): it fires straight
 * ahead for `durationS` (the caster is rooted), stopped short by walls, doors and furniture,
 * and every `tickS` hits each fighter within `widthM / 2` of it with the payload (scaled by
 * distance if the payload has a falloff).
 */
export interface BeamDelivery {
  readonly type: 'beam';
  /**
   * A scream (Reson's Sonic Boom): the first tick on a target interrupts it (a flinch), and for as long as it stays in
   * the sound it cannot walk toward the caster. Later ticks never flinch, so it cannot stunlock.
   */
  readonly scream?: boolean;
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
  /**
   * Damage build-up (owner, 12/11/2026): after `afterS` of unbroken contact with a fighter, each
   * tick on them is multiplied by `startFactor`, growing by `perS` each further second up to
   * `maxFactor`. Losing contact for a single tick resets it.
   */
  readonly ramp?: {
    readonly afterS: number;
    readonly startFactor: number;
    readonly perS: number;
    readonly maxFactor: number;
  };
}

/** The damage factor a beam's build-up gives after `contactS` of unbroken contact. */
export function beamRampFactor(ramp: BeamDelivery['ramp'], contactS: number): number {
  if (!ramp || contactS < ramp.afterS) return 1;
  return Math.min(ramp.maxFactor, ramp.startFactor + (contactS - ramp.afterS) * ramp.perS);
}

/**
 * A knife assault (Shroud, owner 13/11/2026): he rushes at the nearest enemy within the ability's
 * range, stopping at knife's reach, then stabs `stabs` times, `stabIntervalS` apart: each stab is
 * a real hit with the payload (direct damage, bleeding, a flinch), with its own knife motion and
 * blood. With `retreat`, he then springs straight back, away from the enemy (Bloodfade).
 */
export interface AssaultDelivery {
  readonly type: 'assault';
  readonly approachSpeedMps: number;
  /** The rush gives up after this long (nobody reached): the stabs still come, at the air. */
  readonly maxApproachS: number;
  readonly reachM: number;
  readonly radiusM: number;
  readonly stabs: number;
  readonly stabIntervalS: number;
  readonly retreat?: { readonly distanceM: number; readonly speedMps: number };
  /** A sound per stab (cycled), so each reads as its own blow; defaults to the impact sound. */
  readonly stabSfx?: readonly string[];
  /** The last stab's damage and knockback are this many times the others' (a finishing slash). Default 1. */
  readonly finalFactor?: number;
}

/**
 * Death Mark (Shroud, owner 20/11/2026): the caster marks the nearest enemy and stalks it for `stalkS` seconds,
 * crouched and slowed to `moveFactor`. A hit on the caster, or an attack of its own, breaks the stalk. If it
 * holds, the caster's next landed attack deals `damageFactor` times its damage, then the mark is spent.
 */
export interface MarkDelivery {
  readonly type: 'mark';
  readonly stalkS: number;
  readonly damageFactor: number;
  /** Walking speed while stalking, as a fraction of normal. */
  readonly moveFactor: number;
}

/**
 * Lifts the nearest enemy in reach into the air without touching them (Psion's Floating Prison): they rise `liftM` over
 * `liftS`, hang helpless, then drift down over a short fall and take `fallDamage`. The same enemy cannot be lifted
 * again for `immuneS` after landing, so it can never be chained into a lock.
 */
export interface LiftDelivery {
  readonly type: 'lift';
  readonly reachM: number;
  readonly liftS: number;
  readonly liftM: number;
  readonly fallDamage: number;
  readonly immuneS: number;
}

/**
 * An extending rocket fist (Geargrind's Rocket Fist): the fist flies out along the aim over `outS`, hitting each enemy
 * it passes once, holds a moment at full reach, then retracts over `backS`. The caster stays where he stands.
 */
export interface FistDelivery {
  readonly type: 'fist';
  readonly reachM: number;
  readonly outS: number;
  readonly backS: number;
  readonly radiusM: number;
}

/**
 * A combat drone (Geargrind): it hovers beside the caster for `durationS` and fires `shot` at the nearest enemy within
 * `rangeM` every `intervalS`. It has `hp` of durability: enemy projectiles that hit it wear it down; at zero it falls.
 * Only `maxAlive` of the caster's drones exist at once (the oldest is recalled).
 */
export interface DroneDelivery {
  readonly type: 'drone';
  readonly durationS: number;
  readonly hp: number;
  readonly rangeM: number;
  readonly intervalS: number;
  readonly maxAlive: number;
  readonly shot: {
    readonly payload: AbilityPayload;
    readonly speedMps: number;
    readonly radiusM: number;
  };
}

/**
 * A telekinetic shield round the caster (Psion's Psychic Barrier): it absorbs up to `hp` damage and lasts `durationS`.
 * When it is spent or runs out it breaks into floating fragments.
 */
export interface BarrierDelivery {
  readonly type: 'barrier';
  readonly hp: number;
  readonly durationS: number;
}

/**
 * Crystal Arsenal (Prismor): his fists turn to crystal for `durationS` seconds, every punch heavy (src/data/abilities/crystal-arsenal.ts).
 * A hit does not end it; the time running out, a KO or another ability does.
 */
export interface ArsenalDelivery {
  readonly type: 'arsenal';
  readonly durationS: number;
}

/**
 * Crystal Prison v2 (Prismor, owner 21/11/2026): two crystal formations rise round both of the nearest enemy's legs, each with a
 * hole the leg passes through. For `reactS` seconds they only form; a target that is really off the floor (a jump, leap or
 * launch) in that window, or when they lock, is missed. Cosmetic hover counts as grounded. Once locked the legs are held for exactly
 * `holdS` seconds and nothing breaks them: no walking, jumping, dodging or movement abilities; other abilities and damage still work.
 */
export interface LegTrapDelivery {
  readonly type: 'legTrap';
  readonly rangeM: number;
  readonly reactS: number;
  readonly holdS: number;
}

/**
 * Crystal Groundstrike (Prismor): he plants a hand and `count` separate eruption zones appear, each at its own random spot
 * within `spreadM` of the nearest enemy (or of him), kept inside the arena and apart from each other. Each shows a warning
 * for `warnS`, then erupts as its own blast with the ability's payload. `staggerS` delays each zone after the last.
 */
export interface EruptionsDelivery {
  readonly type: 'eruptions';
  readonly count: number;
  readonly radiusM: number;
  readonly warnS: number;
  readonly staggerS: number;
  readonly spreadM: number;
}

/**
 * A spinning attack on the spot (Aerion's Wind Blade): for `durationS`, every `tickS` seconds, each enemy within `radiusM`
 * takes the payload, pushed away from the caster. The caster's wings are the blades: the view spreads them and turns him.
 */
export interface WhirlDelivery {
  readonly type: 'whirl';
  readonly radiusM: number;
  readonly durationS: number;
  readonly tickS: number;
}

/**
 * Perfect Parry (Kenshiro): a defensive stance for `windowS` seconds. The first attack from the front that connects in
 * that window is deflected (no damage, the attacker is stunned) and the caster at once strikes back with the
 * ability's payload. The window is short and ends when it is spent; nothing parried can be spammed because the
 * stance only lasts as long as the window and the ability then cools down.
 */
export interface ParryDelivery {
  readonly type: 'parry';
  readonly windowS: number;
  /** How long the attacker is stunned after the deflect. */
  readonly stunS: number;
}

/**
 * Final Judgement (Kenshiro's ultimate): he rushes the nearest enemy within `rangeM` and cuts `strikes` times, `strikeIntervalS`
 * apart, faster than the eye follows, none of which does anything yet. He then returns to where he began; after
 * `resolveDelayS` all the cuts land together as one blow (`payload.damage` per cut) through a finishing flash. He cannot
 * be hit from the rush until the blow lands.
 */
export interface JudgementDelivery {
  readonly type: 'judgement';
  readonly rangeM: number;
  readonly strikes: number;
  readonly strikeIntervalS: number;
  readonly resolveDelayS: number;
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
  /** Melee strikes play this much faster while it lasts (Hunting Frenzy: 1.4 = 40% faster). */
  readonly attackSpeedFactor?: number;
  /** Multiplies melee (knife) damage while it lasts. */
  readonly meleeDamageFactor?: number;
  /** Melee hits make the target bleed while it lasts. */
  readonly meleeBleed?: boolean;
  /**
   * Shorter cooldowns for the caster's other abilities (Rampage Mode, owner 13/11/2026: 0.75 =
   * 25% shorter): cooldowns already running are cut at once, and new ones start shorter while it lasts.
   */
  readonly cooldownFactor?: number;
  /** Perfect Parry stances cast while this lasts are this much longer (Kenshiro's Focus Stance: 1.5). */
  readonly parryWindowFactor?: number;
  /**
   * Lights out (Hunting Frenzy, owner 12/11/2026): as it begins, every enemy's sight shrinks to
   * `visibleM` round itself for the buff's whole duration (everything further is almost black).
   */
  readonly darkensFoes?: { readonly visibleM: number };
  /** The caster is drawn with dark skin and blue flames while it lasts (Inferno's Blue Inferno). */
  readonly blueFlames?: boolean;
  /**
   * Crystal Sovereign (Prismor): a full set of crystal armour that absorbs the next `armourHits` blows of any kind, and a small
   * shield that stops the next `shieldHits` frontal blows; both shatter when they run out or when the buff ends. A balanced
   * one-handed sword is in his hand meanwhile (`meleeDamageFactor` is its edge).
   */
  readonly sovereign?: { readonly armourHits: number; readonly shieldHits: number };
  /** Armour plates extend over the caster while it lasts (Geargrind's Reinforced Plating, Overdrive). */
  readonly plating?: boolean;
  /** The caster is drawn this much bigger while it lasts (Rampage Mode, owner 13/11/2026: 1.1). */
  readonly sizeFactor?: number;
  /**
   * A shockwave as it begins (Rampage Mode, owner 13/11/2026): every enemy within `radiusM` of the
   * caster takes the payload once, pushed straight away from him.
   */
  readonly shockwave?: { readonly radiusM: number; readonly payload: AbilityPayload };
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
  /**
   * Telekinetic (Psion's Telekinetic Throw): the target is raised where it stands (it is not pulled in), held a
   * moment, then hurled along the caster's aim with the payload instead of slammed down.
   */
  readonly telekinetic?: boolean;
}

/** What a running buff does (the buff delivery without its summons). */
export type BuffEffect = Omit<BuffDelivery, 'type' | 'summon' | 'shockwave'>;

export type Delivery =
  | ProjectileDelivery
  | CloudDelivery
  | MarkDelivery
  | DashDelivery
  | NovaDelivery
  | ParryDelivery
  | WhirlDelivery
  | ArsenalDelivery
  | LegTrapDelivery
  | EruptionsDelivery
  | LiftDelivery
  | BarrierDelivery
  | FistDelivery
  | RewindTimeDelivery
  | AgeDelivery
  | TimeStopDelivery
  | DroneDelivery
  | JudgementDelivery
  | GrenadeDelivery
  | LeapDelivery
  | BeamDelivery
  | StrikeDelivery
  | BuffDelivery
  | SummonDelivery
  | TeleportDelivery
  | GrabDelivery
  | AssaultDelivery;

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
  readonly flight?: {
    readonly trailPerS: number;
    readonly sparksPerS: number;
    readonly shimmer: boolean;
    /** Drawn as a tumbling glass jar of glowing liquid instead of a streaming bolt (Vexoris's Toxic Jar). */
    readonly jar?: boolean;
    /** Drawn as a spinning tornado funnel instead of a streaming bolt (Aerion's Tornado Surge). */
    readonly tornado?: boolean;
    /** Drawn as a spinning chunk of debris (Psion's Mindstorm). */
    readonly debris?: boolean;
    /** Drawn as a widening crescent of sound waves (Reson's Sonic Boom). */
    readonly wave?: boolean;
    /** The wave drawn as tight, thin, fast rings (Reson's Resonance Break). */
    readonly screech?: boolean;
    /** Drawn as a wide horizontal crescent of light cutting across the way it travels (Chronos's Chrono Slash). */
    readonly crescent?: boolean;
    /** Drawn as a small spinning crystal shard with a glinting trail (Prismor's Shard Volley). */
    readonly shard?: boolean;
  };
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
    /** Camera shake (trauma 0..1) on contact; default: only wide blasts (radius 2 m or more) shake. */
    readonly shake?: number;
    /** A smashed jar: pale glass shards thrown all round, green liquid droplets, a floor stain, a lingering mist. */
    readonly shards?: number;
    readonly splash?: { readonly count: number; readonly colour: number };
    readonly mist?: number;
    /** Extra expanding rings after the first, each a little behind the last (Reson's Shatterwave). */
    readonly rings?: number;
  };
  /** The target's body flashes this colour on contact (white for the Fireball). */
  readonly hitFlash?: number;
  /** A cage of turning geometric rings round a lifted target (Psion's Floating Prison). */
  readonly cage?: boolean;
  /** The warning ring closes in instead of filling (Psion's Mind Crush), and floating debris rises in a field (Mindstorm). */
  readonly telegraph?: 'compress' | 'debris' | 'rings' | 'crystal';
  /** A barrier drawn as rippling sound-wave rings instead of hexagonal facets (Reson's Resonance Barrier). */
  readonly barrierStyle?: 'sonic';
  /** A slow field drawn as a turning clock face (Chronos's Temporal Collapse). */
  readonly field?: 'clock';
  /** A beam drawn as expanding rings of sound from the caster's mouth (Reson's Sonic Boom). */
  readonly beamStyle?: 'scream';
  /** The caster's mouth opens while the ability runs: a wide roar or a thin high screech (Reson). */
  readonly shout?: 'scream' | 'screech';
  /** Afterimages trail the caster while this ability runs (Chronos). */
  readonly afterimages?: boolean;
  /** What wraps the caster while a leap carries it: flames (default) or streaming wind (Aerion's dives). */
  readonly airBody?: 'flames' | 'wind';
  /**
   * A buff's aura while it lasts: 'full' (default) has rising embers and steam (a fury); 'quiet'
   * keeps only the soft ring on the floor, for casters whose own body glow shows the power
   * (Necro's Death's Dominion, CHARACTER_STYLE_QA S7).
   */
  readonly aura?: 'full' | 'quiet';
  /**
   * A ribbon that follows a knife hand through each slash of an assault (Rending Flurry, owner 20/11/2026): the
   * colours of its body and its hot edge. The last slash draws it wider and longer.
   */
  readonly slash?: { readonly colour: number; readonly edge: number };
}

export interface AbilityDef {
  /**
   * Its cooldown waits for everything it left behind to end (a field, a shot in flight, afterimages, a running effect on a
   * target), not only the cast itself. Off by default so older abilities keep their timing.
   */
  readonly holdsCooldown?: boolean;
  readonly id: string;
  readonly name: string;
  /** Short label for buttons and the ability bar. */
  readonly label: string;
  /** What it does, in a sentence or two (the fighter details screen, owner 12/11/2026). */
  readonly description?: string;
  /** Picture shown on the ability bar and touch buttons (src/interface/ability-icons.ts); falls back to the label. */
  readonly icon?: string;
  readonly slot: AbilitySlot;
  /**
   * Where this ability sits in its kit when it is moved to another button by the loadout (B14); the AI
   * uses it to know how the ability is used. Absent on an ability on its own slot.
   */
  readonly homeSlot?: AbilitySlot;
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
  /**
   * A hit on the caster ends the ability at any moment, not only during the wind-up (Fire Beam,
   * master plan B4: a beam stops the instant Inferno is hit, taking its hitbox, damage ticks and
   * effects with it).
   */
  readonly breaksOnHit?: boolean;
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
  /**
   * The fifth normal ability (master plan B13: five abilities, four equipped). In the kit as written it
   * is the unequipped alternative; the loadout (`loadout.ts`) puts any of the five on the bench.
   */
  readonly a5?: AbilityDef;
  readonly ult: AbilityDef;
  readonly charge: UltimateCharge;
  /** The basic combo's picture on the fighter details screen (owner, 12/11/2026: unique per fighter). */
  readonly comboIcon?: string;
  /** The Heavy Attack's picture on the fighter details screen. */
  readonly heavyIcon?: string;
  /**
   * A passive (master plan: each fighter has one). Momentum (Aerion's Aerial Momentum): every melee blow that lands
   * adds a stack for `durationS` (each stack refreshes it) up to `maxStacks`; each stack makes him `speedPerStack`
   * faster. All stacks lapse together when the time runs out.
   */
  readonly passive?: {
    readonly id: 'momentum' | 'mastery' | 'focus' | 'efficiency' | 'resonance' | 'temporal';
    readonly name: string;
    readonly description: string;
    readonly maxStacks: number;
    readonly durationS: number;
    readonly speedPerStack: number;
    /** Sword Mastery: stacks that make the next sword ability stronger, by what factor, for how long. */
    readonly mastery?: { readonly threshold: number; readonly damageFactor: number; readonly windowS: number };
  };
}
