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
  /** Chance (0..1) that a landed blow applies `blindS` (default: always). Ink Slash blinds only some of the time. */
  readonly blindChance?: number;
  /** Wand of Misfortune (Magix): on a hit, one random ability of the target is locked for `durationS` (never two at once). */
  readonly lockAbility?: { readonly durationS: number };
  /** Ink splashed over the middle of the target's screen for this long (Ink Dragon). */
  readonly inkSplatS?: number;
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
  readonly pull?: {
    readonly speedMps: number;
    readonly stopM: number;
    /** Heavier targets are dragged slower: speed x clamp(refKg / mass, 0.5, 1) (Bohemeth's Chain Grab). */
    readonly refKg?: number;
    /** What the caster does the moment the target arrives: a punch with this payload (Chain Grab's finishing blow). */
    readonly followUp?: AbilityPayload;
  };
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
    /** Chip damage ramps with continuous exposure: x(1 + perS per second inside), up to `maxFactor`; leaving for `resetS` resets it. */
    readonly ramp?: { readonly perS: number; readonly maxFactor: number; readonly resetS: number };
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
  /**
   * Arc Lash (Voltar): on contact the caster turns to lightning and streaks straight through the target, emerging `exitM` behind it
   * (never through a wall: the nearest free spot is used).
   */
  readonly passThrough?: { readonly exitM: number };
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
   * Thunder Clap (Bohemeth): every enemy within `rangeM` that is in the middle of a charge (a dash) is stopped dead and staggered for
   * `staggerS`, even from beyond the ring's own radius. Only charges are stopped; nothing else is cancelled.
   */
  readonly interruptsCharges?: { readonly rangeM: number; readonly staggerS: number };
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
  /**
   * Instead of `character`, one of these is picked at random each cast and stays fixed for that summon (Inkmaster's
   * Ink Clone: a sword clone or a bow clone).
   */
  readonly variants?: readonly string[];
  readonly count: number;
  /** Seconds before they crumble; null = they stay until killed (owner, 12/11/2026). */
  readonly lifeS: number | null;
  readonly maxAlive: number;
  /** Where they rise: around the caster (default) or in a fan in front of the nearest enemy, 2.6–3.6 m off. */
  readonly near?: 'caster' | 'enemy';
  /** They stay even if the summoner falls. */
  readonly persistent?: boolean;
  /**
   * Magix's rabbit: it hops at the nearest enemy and, within `armRangeM` of it, a fuse of `fuseS` begins; at the end (or the moment anything
   * hits it) it bursts in confetti, hurting and pushing everyone within `radiusM`.
   */
  readonly rabbit?: {
    readonly fuseS: number;
    readonly armRangeM: number;
    readonly radiusM: number;
    readonly damage: number;
    readonly knockbackMps: number;
    readonly hopSpeedMps: number;
  };
  /** Seconds the summoner spends drawing them before they appear (Ink Clone: a stick figure is brushed on the floor, then it rises). */
  readonly drawS?: number;
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
  /**
   * Flashstep (Voltar), with `behindTargetM`: the caster streaks THROUGH the nearest enemy (never through a wall or furniture: it stops
   * short of one and the punch is lost), leaves an afterimage at the start for `lifeS`, reappears behind them and punches with the payload.
   * While the caster's buff has `flashChain`, up to `chainMax` more flashes follow, 0.25 s apart.
   */
  readonly flash?: { readonly lifeS: number; readonly chainMax: number };
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
/** The range, air time and height a leap really has: its empowered form while the caster's buff allows it. */
export function leapForm(d: LeapDelivery, empowered: boolean): { maxRangeM: number; airS: number; peakM: number } {
  const e = empowered ? d.empowered : undefined;
  return { maxRangeM: e?.maxRangeM ?? d.maxRangeM, airS: e?.airS ?? d.airS, peakM: e?.peakM ?? d.peakM };
}

export interface LeapDelivery {
  readonly type: 'leap';
  readonly maxRangeM: number;
  readonly airS: number;
  readonly peakM: number;
  readonly radiusM: number;
  /** How fast WASD or the joystick moves the landing spot while aiming (owner, 12/11/2026). */
  readonly aimSpeedMps?: number;
  /**
   * The form it takes while the caster's buff `empowersLeap` (Bohemeth's ultimate): it carries him further, hits harder
   * (`damageFactor`) and lands with its own, hotter look, but keeps the same landing radius.
   */
  readonly empowered?: {
    readonly maxRangeM: number;
    readonly airS: number;
    readonly peakM: number;
    readonly damageFactor: number;
    readonly vfx: string;
    readonly look: MagicLook;
  };
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
   * A scream (Reson's Sonic Boom, Inferno's Fire Beam): no tick stuns or interrupts the target (owner,
   * 25/11/2026), so it can keep walking; the beam only hurts, and pushes where its knockback says so.
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
  /**
   * Voltage Rush (Voltar): before every blow he streaks to a different spot `radiusM` round the target (leaving an afterimage that lasts
   * `lifeS`), so the blows come from different directions.
   */
  readonly zigzag?: { readonly radiusM: number; readonly lifeS: number };
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
  /** Share of the damage it absorbs that is thrown back at the attacker (Reson's Harmonic Shield). */
  readonly reflect?: number;
}

/**
 * Crystal Arsenal (Prismor): his fists turn to crystal for `durationS` seconds, every punch heavy (src/data/abilities/crystal-arsenal.ts).
 * A hit does not end it; the time running out, a KO or another ability does.
 */
export interface ArsenalDelivery {
  readonly type: 'arsenal';
  readonly durationS: number;
  /** Which weapon grows and whose moveset takes over: Prismor's crystal swords (default) or Inkmaster's ink spear. */
  readonly weapon?: 'blades' | 'spear';
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
 * Temporal Echo (Chronos): the nearest enemy within `rangeM` is marked where it stands. After `delayS` seconds time runs backwards
 * for it: it is dragged at `snapSpeedMps` back to that spot, taking the payload (damage and slow) as it goes. An enemy that has not
 * moved is only hit; one that ran or was knocked away is yanked back into the open.
 */
export interface EchoDelivery {
  readonly type: 'echo';
  readonly rangeM: number;
  readonly delayS: number;
  readonly snapSpeedMps: number;
}

/**
 * Telekinetic Toss (Psion): the nearest real prop within `rangeM` (any mass the props system carries) stays exactly where it is
 * until he takes hold of it. Then it rises straight up from its own spot to `heightM`, taking longer the heavier it is
 * (`riseS + riseSqrtS * sqrt(massKg)`, never more than `riseMaxS`; owner 25/11/2026) with a purple psychic glow beneath
 * it, and is thrown at his opponent as a real thrown body, `speedFactor` times a normal throw's speed and `powerFactor` times its
 * power. Damage and knockback come from its mass and speed through the throwing rules and land only on a real collision. Nothing in
 * reach: the cast is refused before stamina or cooldown is spent ('noObject').
 */
export interface TossDelivery {
  readonly type: 'toss';
  readonly rangeM: number;
  /** The quickest it ever rises (a weightless thing), seconds. */
  readonly riseS: number;
  /** Extra seconds per square root of the object's mass, kg. */
  readonly riseSqrtS: number;
  /** The longest any object takes to rise, seconds. */
  readonly riseMaxS: number;
  readonly heightM: number;
  readonly speedFactor: number;
  readonly powerFactor: number;
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
  /**
   * A straight line of zones instead of random spots (Reson's Shatterwave): the first `startM` metres in front of the caster along
   * the aim, the rest `radiusM * 1.6` apart, each going off `staggerS` after the one before, so a wave runs away across the floor.
   */
  readonly line?: { readonly startM: number };
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
  /**
   * Static Break (Voltar): a reactive dodge. On cast he bursts `distanceM` along his movement direction at `speedMps`; a blow that
   * connects during the window (from any side) is avoided and he reappears behind the attacker for the counter.
   */
  readonly evade?: { readonly distanceM: number; readonly speedMps: number };
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
  /**
   * Lightning Execution (Voltar): instead of returning unseen, he reappears above the target as the strikes land and dives: a blast of
   * `radiusM` on the floor throws everyone in it `knockbackMps` away.
   */
  readonly dive?: { readonly radiusM: number; readonly knockbackMps: number };
}

/** A close, heavy blow straight ahead at release (Crushing Strike): hits fighters, furniture and doors in reach. */
export interface StrikeDelivery {
  readonly type: 'strike';
  readonly reachM: number;
  readonly radiusM: number;
  /** Ink Slash: `extra` more blows follow the first, one every `gapS` seconds, each re-aimed at the nearest enemy; an interruption stops them. */
  readonly repeat?: { readonly extra: number; readonly gapS: number };
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
  /**
   * Disappearing Act (Magix): the caster cannot be seen (the opponent loses track of him unless he is right on top of them; he sees
   * himself faintly). It ends, with the rest of the buff, the moment he lands any attack on an opponent (`endsOnHit`).
   */
  readonly invisible?: boolean;
  /** Multiplies the knockback of everything the caster hits while it lasts (Bohemeth's ultimate: heavier blows). */
  readonly knockbackFactor?: number;
  /** Object handling while it lasts: a heavier lift limit, a quicker heave, an easier carry and a harder throw (Bohemeth's ultimate). */
  readonly objects?: {
    readonly maxLiftKg?: number;
    readonly liftTimeFactor?: number;
    /** Added to the carrying speed factor (0..1), so heavy things slow him less. */
    readonly carrySpeedBonus?: number;
    readonly throwPowerFactor?: number;
  };
  /** The caster's leaps use their `empowered` form while it lasts (Bohemeth's Ground Smash). */
  readonly empowersLeap?: boolean;
  /** Flashstep may chain this many extra flashes while it lasts (Voltar's Overdrive). */
  readonly flashChain?: number;
  /** The caster crackles with lightning while it lasts (Voltar's Overdrive): electrified hands and feet. */
  readonly electrified?: boolean;
  /** All four fists burn (Bohemeth's Fiery Fists): flames round the hands, fire trails on punches and hotter impacts. */
  readonly fireFists?: boolean;
  readonly endsOnHit?: boolean;
  /** Multiplies the reach of the caster's melee blows (Lucky Hat's range stat). */
  readonly rangeFactor?: number;
  /** A temporary shield worth this share of the caster's maximum HP, gone when the buff ends (Lucky Hat's HP stat). */
  readonly shieldFraction?: number;
  /** Shown to the player: which stat Lucky Hat raised, as a short label ("SPEED +25%"). */
  readonly label?: string;
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
  /**
   * Four Arm Uppercut (Bohemeth): the target is held at the upper hands for `holdS`, then the lower hands uppercut it: the payload hits
   * (its `knockbackByWeight` scales the push) and the target is launched up `liftM` metres over `liftS`, scaled by its weight
   * (`refKg / mass`, kept between `minK` and `maxK`), and falls for `fallDamage`.
   */
  readonly uppercut?: {
    readonly holdS: number;
    readonly liftS: number;
    readonly liftM: number;
    readonly refKg: number;
    readonly minK: number;
    readonly maxK: number;
    readonly fallDamage: number;
    /**
     * Uppercut Combo: while the target is still rising, the other hand punches it back down `atS` seconds after the launch;
     * the payload lands (a heavy blow) and the fall is cut short.
     */
    readonly followUp?: { readonly atS: number; readonly payload: AbilityPayload };
  };
}

/**
 * Spin Cycle (Bohemeth), one ability with two forms. Holding an object: he spins `object.turns` times with it at arm's length
 * and hurls it level (flat, fast, not overhead). Otherwise: he seizes the nearest enemy within `reachM`, claps their head between
 * the upper hands (`clap`: slight damage and a daze), takes a leg in the lower hands and swings them round `turns` times (lighter
 * bodies more times, heavier fewer), then lets go: they fly along his aim up to `launch.maxDistM`, hurt more the further they
 * go (`damagePerM`), and extra if they hit furniture or a wall (`collisionDamage`). Nobody in reach and nothing held: a grab at air.
 */
export interface SpinDelivery {
  readonly type: 'spin';
  readonly reachM: number;
  readonly radiusM: number;
  readonly clap: { readonly damage: number; readonly dazeS: number };
  /** Seconds to drop to the leg after the clap. */
  readonly grabS: number;
  /** Seconds per full turn at speed. */
  readonly turnS: number;
  /** Turns by weight: `base * refKg / mass`, rounded and kept between `min` and `max`. */
  readonly turns: { readonly refKg: number; readonly base: number; readonly min: number; readonly max: number };
  /** How far from him the swung fighter circles, and how high they are swung. */
  readonly orbitM: number;
  readonly liftM: number;
  readonly launch: {
    readonly speedMps: number;
    readonly maxDistM: number;
    readonly baseDamage: number;
    readonly damagePerM: number;
    readonly collisionDamage: number;
  };
  readonly object: { readonly turns: number; readonly speedMps: number; readonly powerFactor: number; readonly heightM: number };
}

/**
 * Ink Serpent (Inkmaster): a serpent drawn in the air in `formS` seconds (it does nothing while forming), which then
 * hunts the nearest enemy, turning at up to `turnRadPerS` (so it can be dodged or outrun), and on contact bites with the
 * payload and wraps the target's body for exactly `restrainS` (a `bind`: no abilities, attacks, jumps or dodges; walking and guarding stay
 * free). The same target cannot be wrapped again until `immuneS` after the binding ends, so it can never be chained into a lock.
 */
export interface SerpentDelivery {
  readonly type: 'serpent';
  readonly formS: number;
  readonly speedMps: number;
  readonly turnRadPerS: number;
  /** It dissolves after this long without a target caught. */
  readonly lifeS: number;
  readonly radiusM: number;
  readonly restrainS: number;
  readonly immuneS: number;
}

/**
 * Ink Bull (Inkmaster): a bull of black brush-painted ink bursts up out of the ground `spawnM` in front of the caster (`formS`), lowers
 * its head, paws the ground and snorts (`pawS`), then charges the nearest opponent: it builds to `speedMps` at `accelMps2`, and curves
 * toward them no faster than `turnRadPerS` (less at full speed, and not at all inside `commitM`), so it can be sidestepped or dodged.
 * The first opponent it reaches takes the payload (a heavy ram with strong knockback) and it bursts into ink; a miss runs on for up to
 * `chargeS`, slows over `slowS` and scatters. It charges once and is gone after `durationS` at the latest.
 */
export interface BullDelivery {
  readonly type: 'bull';
  readonly formS: number;
  readonly pawS: number;
  readonly speedMps: number;
  readonly accelMps2: number;
  readonly turnRadPerS: number;
  readonly commitM: number;
  readonly chargeS: number;
  readonly slowS: number;
  readonly durationS: number;
  /** How far in front of the caster it rises, metres. */
  readonly spawnM: number;
  /** How wide the horns' ram is (the body's reach), metres. */
  readonly radiusM: number;
}

/**
 * Ink Cyclone (Inkmaster): a swirling vortex at the aimed spot, `radiusM` wide, for `durationS`. Every `tickS` it damages
 * everyone in it with the payload, and a gentle current (`pullMps`, weaker than walking) draws them toward the centre; dodging
 * or walking out frees them. It ends in a collapse: `collapseDamage` to everyone inside `collapseRadiusM`, with a push.
 */
export interface VortexDelivery {
  readonly type: 'vortex';
  readonly radiusM: number;
  readonly durationS: number;
  readonly tickS: number;
  readonly pullMps: number;
  readonly collapseDamage: number;
  readonly collapseRadiusM: number;
  readonly collapseKnockbackMps: number;
  /** How far ahead of the caster it forms at most (metres). */
  readonly placeM: number;
}

/**
 * The Masterpiece (Inkmaster's ultimate): a ritual of `drawS` seconds in which a scroll appears and the monster is drawn
 * stroke by stroke (the caster is held at his drawing), then the monster tears out of the scroll as a summon. If the caster
 * falls first, the drawing ruins.
 */
export interface MasterpieceDelivery {
  readonly type: 'masterpiece';
  readonly drawS: number;
  readonly summon: SummonSpec;
}

/**
 * Card Barrage (Magix): exactly `count` playing cards, one after another over `durationS`, fan out toward the opponent (each with its own
 * small angle off the aim, speed and spin). Each deals the payload (light) and `knockbackChance` of them push for `knockbackMps`. The
 * barrage stops if the caster is interrupted; cards already thrown keep flying. They are simulated and drawn as one batch.
 */
export interface CardsDelivery {
  readonly type: 'cards';
  readonly count: number;
  readonly durationS: number;
  readonly speedMps: number;
  /** Half-angle of the fan, radians. */
  readonly spreadRad: number;
  readonly radiusM: number;
  readonly rangeM: number;
  readonly knockbackChance: number;
  readonly knockbackMps: number;
}

/**
 * Lucky Hat (Magix): a hand into the hat, and one of seven things comes out at random: +`bonus` to one of five stats for `durationS`
 * (speed, damage, defence, attack range, maximum HP) or a thrown sword or a thrown bomb.
 */
export interface LuckyHatDelivery {
  readonly type: 'luckyHat';
  readonly durationS: number;
  readonly bonus: number;
  readonly sword: { readonly damage: number; readonly knockbackMps: number; readonly speedMps: number };
  readonly bomb: {
    readonly damage: number;
    readonly knockbackMps: number;
    readonly radiusM: number;
    readonly fuseS: number;
  };
}

/**
 * Mirror Act (Magix's ultimate): confetti thrown at the floor bursts into a cloud of dust ( `dustS` ); as it clears he is an exact copy of
 * the opponent for `durationS`: its look, abilities (not its ultimate) and moves at `powerFactor` of its damage, with a temporary shield
 * of `shieldFraction` of his own maximum HP over his own real HP. Cooldowns are the opponent's own at that moment.
 */
export interface MirrorDelivery {
  readonly type: 'mirror';
  readonly dustS: number;
  readonly durationS: number;
  readonly shieldFraction: number;
  readonly powerFactor: number;
}

/** What a running buff does (the buff delivery without its summons). */
export type BuffEffect = Omit<BuffDelivery, 'type' | 'summon' | 'shockwave'>;

export type Delivery =
  | CardsDelivery
  | LuckyHatDelivery
  | MirrorDelivery
  | SerpentDelivery
  | BullDelivery
  | VortexDelivery
  | MasterpieceDelivery
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
  | TossDelivery
  | EchoDelivery
  | AssaultDelivery
  | SpinDelivery;

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
    /** Drawn as a glittering magic trail from a wand (Magix's Wand of Misfortune). */
    readonly wand?: boolean;
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
  /**
   * A slow field drawn as a turning clock face (Chronos's Temporal Collapse), or a field of rippling air held at the punching fist and
   * reaching out to the blow's full reach as it lands (Reson's Vibration Punch; drawn from the fist, never a separate object).
   */
  readonly field?: 'clock' | 'vibration';
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
  /**
   * A finisher pressed on the ultimate button while the ultimate's buff is still running (Voltar: Lightning Execution). It ends the buff,
   * costs no meter and has no cooldown of its own.
   */
  readonly finisher?: AbilityDef;
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
