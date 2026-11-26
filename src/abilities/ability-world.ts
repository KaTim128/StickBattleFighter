import {
  type AbilityDef,
  type AbilityPayload,
  type BuffEffect,
  type Burn,
  beamRampFactor,
  type CloudSpec,
  leapForm,
  type MagicLook,
  type MirrorDelivery,
  payloadAt,
  type SpinDelivery,
  type StrikeDelivery,
  type TeleportDelivery,
  type SummonSpec,
  type TossDelivery,
} from './ability-def';

import type { FlurryHit } from './ability-def';
import { InkWorld } from './ink-world';
import { MagixWorld } from './magix-world';
/**
 * Ability deliveries in the arena (REQ-ABL-1): projectiles, dashes with fire
 * trails, telegraphed rings and leaps. The world owns their motion and timing;
 * everything it touches goes through the `AbilityHost` (the scene), so hits use
 * the same combat rules as melee (INV-5) and the world stays testable.
 * Presentation is driven by `AbilityFx` events (VFX and sound hooks) plus the
 * live lists below, which the VFX layer reads every frame.
 */
export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface AbilityTarget {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly radiusM: number;
  /** Can be hit (not KO). */
  readonly hittable: boolean;
  /** Side it fights for: abilities never hit the caster's own team (summons, owner 12/11/2026). */
  readonly team?: string;
  /** Body weight, kilograms (weight-scaled launches and pulls). */
  readonly massKg?: number;
}

export type FxKind = 'cast' | 'release' | 'impact' | 'telegraph' | 'fizzle';

/** A presentation hook: VFX profile and sound id at a place (REQ-ABL-1, REQ-ANI-4). */
export interface AbilityFx {
  readonly kind: FxKind;
  readonly ability: string;
  readonly vfx: string;
  readonly sfx: string | null;
  readonly x: number;
  readonly y: number;
  readonly radiusM?: number;
  /** The ability's look (Magic Attack VFX Standard), so effects match the element. */
  readonly look?: MagicLook;
  /** Which stab of a knife assault this is (1, 2, 3), for its own blood spray and sound. */
  readonly stab?: number;
  /** The direction of the blow (blood sprays along it). */
  readonly dirX?: number;
  readonly dirY?: number;
}

export interface AbilityHost {
  fighters(): readonly AbilityTarget[];
  /**
   * Can the caster see this fighter (not blinded, inside its sight in the dark)? Abilities that
   * pick their own target (Behind You, Bloodfade, a retreat) only pick one it can see.
   */
  sees?(casterId: string, targetId: string): boolean;
  /**
   * Apply an ability hit to a fighter. Returns true if it connected (not dodged or ignored).
   * `hitFlash` = the colour the target's body flashes (the ability's look; default the caster's).
   */
  hitFighter(casterId: string, targetId: string, payload: AbilityPayload, dir: Vec2, hitFlash?: number): boolean;
  /**
   * Hit furniture and doors touching a circle. `continuous` = a body brushing
   * past (one blow per prop per moment), otherwise a single impact.
   */
  hitEnvironment(
    casterId: string,
    at: Vec2,
    radiusM: number,
    payload: AbilityPayload,
    dir: Vec2,
    continuous: boolean,
  ): void;
  /** Fraction 0..1 along the segment where a wall, door or furniture blocks it, or null. */
  blocked(from: Vec2, to: Vec2): number | null;
  /** Where a caster stands now. */
  position(casterId: string): Vec2;
  /** Drive a caster's body this step (dash or leap), or release it (null). Height lifts it off the floor. */
  drive(casterId: string, velocity: Vec2 | null, heightM: number): void;
  /** Set fighters standing in a fire trail alight. */
  burnFighter(targetId: string, burn: Burn): void;
  /**
   * Where a caster is steering its beam: a world direction, or null to hold it. `fresh` = the
   * beam has just started (the host can ignore a stale mouse position). Optional.
   */
  steer?(casterId: string, fresh: boolean): Vec2 | null;
  /**
   * Where a caster wants to move right now (the player's movement keys or stick; a computer-controlled fighter heads for its enemy): a vector of
   * length 0..1, or null. Steers a flurry or a spin that runs across the floor (Kamaw). Optional.
   */
  moveInput?(casterId: string): Vec2 | null;
  /** Turn a caster to face a direction (it follows its steered beam). Optional. */
  face?(casterId: string, dir: Vec2): void;
  /** Start (or end, null) a timed self-buff on a caster. */
  buff(casterId: string, buff: BuffEffect | null, abilityId?: string): void;
  /** Raise minions for the caster (summons, owner 12/11/2026). Optional (hosts without summons ignore it). */
  summon?(casterId: string, spec: SummonSpec): void;
  /**
   * Move the caster to `to` (Teleport): the host picks the nearest spot a body can stand on and
   * returns it, or null if there is none (the cast fizzles). Optional.
   */
  teleport?(casterId: string, to: Vec2): Vec2 | null;
  /** Keep a fighter helpless for this long (seized by a grab). Optional. */
  hold?(targetId: string, seconds: number): void;
  /** Put a telekinetic barrier round a caster: it absorbs `hp` damage over at most `durationS` seconds. Optional. */
  barrier?(casterId: string, hp: number, durationS: number, reflect?: number): void;
  /** Hold a target in a scream: for `seconds` it cannot walk toward the caster (`awayX/awayY` is the direction from the caster). Optional. */
  pin?(targetId: string, away: Vec2, seconds: number): void;
  /** Crystal Arsenal: the caster's fists turn to crystal for `durationS` seconds (replacing its unarmed moves). Optional. */
  arm?(casterId: string, durationS: number, weapon?: 'blades' | 'spear'): void;
  /** Mirror Act: the caster becomes a copy of its nearest opponent (see the scene); false if there is nobody to copy. Optional. */
  mirror?(casterId: string, spec: MirrorDelivery): boolean;
  /** Hold a fighter's legs in crystal for `seconds` (0 frees them): no walking, jumping, dodging or flying, and a flier is dragged down. Optional. */
  trap?(targetId: string, seconds: number): void;
  /** A gentle current: add this velocity to a fighter's own movement for this step only (Ink Cyclone; they can still walk or dodge out). Optional. */
  nudge?(targetId: string, velocity: Vec2): void;
  /** What Crystal Prison needs to know about a fighter: its height off the floor, whether it flies, and how long its legs are still held. Optional. */
  /** Ink Serpent: bind the target (no abilities, attacks, jumps or dodges; walking stays free) for `seconds`; 0 frees it. */
  bind?(targetId: string, seconds: number): void;
  legTrapState?(targetId: string): { heightM: number; trappedS: number };
  /** Telekinetic Toss: raise the nearest prop within reach where it stands and throw it at the opponent; false if there is none. */
  telekineticToss?(casterId: string, spec: TossDelivery): boolean;
  /** Can a body stand here (inside the arena, clear of walls and furniture)? Optional (everywhere counts when absent). */
  standable?(at: Vec2): boolean;
  /** The size of the arena floor, metres (a flying creature stays inside it). Optional (unbounded when absent). */
  bounds?(): { readonly w: number; readonly h: number };
  /** Is the caster holding an object, fully lifted? (Spin Cycle's object form.) Optional. */
  carryingObject?(casterId: string): boolean;
  /** Swing the caster's held object to this spot and height; `null` ends the swing (the object goes back to its usual hold point). Optional. */
  swingHeld?(casterId: string, at: Vec2 | null, heightM: number): void;
  /** Throw the held object level and fast along `dir`, not overhead. Optional. */
  throwHeldFlat?(casterId: string, dir: Vec2, spec: { speedMps: number; powerFactor: number; heightM: number }): void;
  /** How many extra Flashstep dashes the caster's buff allows (Voltar's Overdrive); 0 when none. Optional. */
  flashChain?(casterId: string): number;
  /** Does the caster's buff empower its leaps right now (Bohemeth's ultimate)? Optional. */
  empowersLeap?(casterId: string): boolean;
  /** Heal a fighter by `amount` (never above its maximum); returns false if it is down and nothing was done. Optional. */
  heal?(targetId: string, amount: number): boolean;
  /** Time Stop begins (`true`) or ends (`false`): the host freezes or releases everything but the caster. Optional. */
  timeStop?(casterId: string, on: boolean): void;
  /** Tug loose metal props within `radiusM` of `at` toward it (a magnetic mine, one step's worth). Optional. */
  attract?(at: Vec2, radiusM: number, strength: number): void;
  /** How much longer this caster's parry stance lasts right now (Focus Stance: 1.5); 1 when nothing changes it. */
  parryWindowFactor?(casterId: string): number;
  /**
   * Choke a fighter standing in a fog this step (Plague Bloom): short sight, slowed, chip damage, and `stack` = true
   * the one time it earns a stack of poison. Optional.
   */
  fogFighter?(targetId: string, fog: { sightM: number; speedFactor: number; chipDps: number; stack: boolean }): void;
  emit(fx: AbilityFx): void;
}

export interface Projectile {
  readonly casterId: string;
  readonly def: AbilityDef;
  x: number;
  y: number;
  dir: Vec2;
  travelledM: number;
  /** Ricochet bounces still to come, and a damage multiplier for a final shot (Gunsmith). */
  bouncesLeft?: number;
  /** A curved throw: how far the direction turns per metre travelled (radians). */
  arcPerM?: number;
  /** Flies this many times the delivery's speed (a quicker second throw). */
  speedFactor?: number;
  damageFactor?: number;
  /** Recent positions for the trail (newest last). */
  readonly trail: Vec2[];
}

/** A continuous beam pouring from a caster (Fire Beam). Origin and end are refreshed every step. */
export interface Beam {
  readonly casterId: string;
  readonly def: AbilityDef;
  /** Where it points (turns while steered). */
  dir: Vec2;
  ageS: number;
  /** Time since the last damage tick. */
  sinceTickS: number;
  /** Where it starts (in front of the caster's hands) and where it ends (its reach, or a wall). */
  from: Vec2;
  to: Vec2;
  /** Fighters it touched on the last tick (presentation: burning contact points). */
  touching: string[];
  /** It has hit someone already (the first contact plays the impact sound). */
  landed: boolean;
  /** Seconds of unbroken contact per fighter (the damage build-up); dropped when contact breaks. */
  contact: Map<string, number>;
}

export interface FireZone {
  readonly casterId: string;
  readonly x: number;
  readonly y: number;
  readonly radiusM: number;
  readonly lifeS: number;
  ageS: number;
  readonly burn: Burn;
}

/** A lingering gas cloud: each target is hit once while it is armed (see `CloudSpec`). */
export interface Cloud {
  readonly casterId: string;
  readonly def: AbilityDef;
  readonly x: number;
  readonly y: number;
  readonly radiusM: number;
  readonly lifeS: number;
  armS: number;
  ageS: number;
  /** Fighters already hit by this cloud. */
  readonly hit: Set<string>;
  /** A landmine that has not gone off yet (Chemical Trap): drawn as a mine, no gas, no effect. */
  mine?: NonNullable<CloudSpec['mine']> & { dormantS: number };
  /** The burst of a magnetic mine drags its victims in instead of pushing them out. */
  pullIn?: boolean;
  /** A fog (Plague Bloom): its per-fighter seconds spent inside, and its rules. */
  fog?: NonNullable<CloudSpec['fog']>;
  readonly dwellS: Map<string, number>;
  /** Seconds each target has spent outside a fog since leaving it (its damage ramp resets after the fog's `ramp.resetS`). */
  readonly outS: Map<string, number>;
}

/** A lobbed grenade in flight, lying where it landed, or stuck to an enemy (see `GrenadeDelivery`). */
export interface Grenade {
  readonly casterId: string;
  readonly def: AbilityDef;
  readonly from: Vec2;
  readonly to: Vec2;
  x: number;
  y: number;
  /** Height above the floor, metres. */
  z: number;
  /** 0..1 along its arc while flying. */
  k: number;
  state: 'flying' | 'landed' | 'stuck';
  /** Seconds until it goes off (counting only once landed or stuck). */
  fuseLeftS: number;
  /** The fighter it is stuck to. */
  stuckTo?: string;
  ageS: number;
}

/** A target swept up by a tornado (see `ProjectileDelivery.lift`): rising, then falling to take the fall damage. */
interface LiftAction {
  readonly kind: 'lift';
  readonly casterId: string;
  readonly targetId: string;
  readonly def: AbilityDef;
  readonly dir: Vec2;
  ageS: number;
  /** Where the target is, for the funnel. */
  x: number;
  y: number;
  readonly spec: {
    readonly liftS: number;
    readonly liftM: number;
    readonly fallDamage: number;
    readonly immuneS: number;
    /** Uppercut Combo: the other hand's punch while the target is still rising, which sends it straight back down. */
    readonly followUp?: { readonly atS: number; readonly payload: AbilityPayload };
  };
  /** Set once the follow-up has landed: when, and how high the target was. */
  punched?: { readonly atS: number; readonly fromM: number };
}

/** A rocket fist flying out and back (see `FistDelivery`). */
interface FistAction {
  readonly kind: 'fist';
  readonly casterId: string;
  readonly def: AbilityDef;
  readonly dir: Vec2;
  ageS: number;
  /** How far out the fist is now, metres. */
  extentM: number;
  readonly hit: Set<string>;
}

/** A combat drone hovering by its owner (see `DroneDelivery`). */
/** A harmless afterimage left behind (see `DashDelivery.decoy`). */
export interface Decoy {
  readonly casterId: string;
  readonly def: AbilityDef;
  readonly x: number;
  readonly y: number;
  readonly dir: Vec2;
  ageS: number;
  readonly lifeS: number;
}

export interface Drone {
  readonly casterId: string;
  readonly def: AbilityDef;
  x: number;
  y: number;
  hp: number;
  ageS: number;
  fireInS: number;
  /** Where it last aimed, for the view. */
  aimX: number;
  aimY: number;
}

/** A spin in progress (see `WhirlDelivery`). */
interface WhirlAction {
  readonly kind: 'whirl';
  readonly casterId: string;
  readonly def: AbilityDef;
  ageS: number;
  sinceTickS: number;
  /** A steered spin: where it is moving now, and the time left in its winding down once ended (null while it spins). */
  vel: Vec2;
  endLeftS: number | null;
}

/** A timed run of blows (see `FlurryDelivery`). */
interface FlurryAction {
  readonly kind: 'flurry';
  readonly casterId: string;
  readonly def: AbilityDef;
  ageS: number;
  dir: Vec2;
  /** Index of the next blow to land, and the leap in progress (metres left). */
  next: number;
  leapLeftM: number;
  /** The blow that just landed and how long ago, for the caster's animation. */
  lastHit: number;
  sinceHitS: number;
}

/** A parry stance up (see `ParryDelivery`): the next attack from the front is deflected and answered. */
export interface Parry {
  readonly casterId: string;
  readonly def: AbilityDef;
  leftS: number;
  readonly totalS: number;
}

interface JudgementAction {
  readonly kind: 'judgement';
  readonly casterId: string;
  readonly def: AbilityDef;
  readonly origin: Vec2;
  readonly targetId: string | null;
  /** 'rush' to the target, 'cut' the strikes, 'wait' for the blow to land after returning. */
  phase: 'rush' | 'cut' | 'wait';
  t: number;
  cuts: number;
}

/** A Death Mark in progress (see `MarkDelivery`). */
export interface DeathMark {
  readonly casterId: string;
  readonly targetId: string;
  readonly def: AbilityDef;
  /** Stalking (the charge) or ready (the next landed attack is multiplied). */
  phase: 'stalk' | 'ready';
  leftS: number;
  ageS: number;
}

export interface Telegraph {
  readonly casterId: string;
  readonly def: AbilityDef;
  x: number;
  y: number;
  readonly radiusM: number;
  readonly durationS: number;
  ageS: number;
  /** Follows the caster (a ring around it) instead of staying put. */
  readonly onCaster: boolean;
  /** A ring placed at a spot (aimed nova): it erupts there when its warning ends. */
  readonly erupts?: boolean;
  /** Shots already loosed while this ring built (Mindstorm). */
  volleysFired?: number;
}

/** Crystal Prison in progress (see `LegTrapDelivery`): the crystals forming, then the legs held until the host says they are free. */
export interface PrisonTrack {
  readonly casterId: string;
  readonly targetId: string;
  readonly def: AbilityDef;
  phase: 'form' | 'held';
  ageS: number;
  /** A grounded target left the floor while the crystals formed (it escapes). */
  jumped: boolean;
}

/** A patch of glowing crystal laid under a Crystal Slide. */
export interface SlideMark {
  readonly casterId: string;
  readonly x: number;
  readonly y: number;
  ageS: number;
  readonly lifeS: number;
}

/** Rewind Time in progress (see `RewindTimeDelivery`): where he started, the damage really dealt since, and the path walked. */
export interface RewindTrack {
  readonly casterId: string;
  readonly def: AbilityDef;
  readonly origin: Vec2;
  ageS: number;
  dealt: number;
  readonly path: Vec2[];
  sinceSampleS: number;
  /** After the rewind: the path replays backwards over this long, for the effect and the cooldown. */
  replayLeftS: number;
  replayTotalS: number;
}

/** Age Acceleration running on a target (for the effect, and so the ability's cooldown waits for it). */
export interface AgeTrack {
  readonly casterId: string;
  readonly targetId: string;
  readonly def: AbilityDef;
  ageS: number;
  readonly durationS: number;
}

/** Time Stop running (see `TimeStopDelivery`). */
export interface TimeStopState {
  readonly casterId: string;
  readonly def: AbilityDef;
  leftS: number;
  readonly totalS: number;
}

interface DashAction {
  readonly kind: 'dash';
  readonly casterId: string;
  readonly def: AbilityDef;
  readonly dir: Vec2;
  remainingS: number;
  /** Time since the dash started. */
  ageS: number;
  readonly hit: Set<string>;
  sinceTrailM: number;
  /** Metres since the last afterimage was left (Chronos's Afterimage). */
  sinceImageM: number;
  lastX: number;
  lastY: number;
  /** How long the charge has been held up by something it is smashing (it stops if it never gives). */
  stuckS: number;
}

/** A charge held up this long by something that will not give stops against it. */
const CHARGE_STUCK_S = 0.12;

interface LeapAction {
  readonly kind: 'leap';
  readonly casterId: string;
  readonly def: AbilityDef;
  readonly from: Vec2;
  readonly to: Vec2;
  t: number;
  readonly telegraph: Telegraph;
  /** Volleys already loosed (Celestial Tempest). */
  volleysFired: number;
  /** The shots a volley carries: the ability with a projectile delivery and the volley's payload. */
  readonly volleyDef?: AbilityDef;
  /** Gravehook Launch: seconds the sickle takes to embed before the pull begins, and where it is anchored. */
  delayS: number;
  readonly anchor?: Vec2;
  /** Cast while the caster's buff empowers leaps (Bohemeth's ultimate): flies further, lands harder and looks different. */
  readonly empowered: boolean;
  /** The range, air time and peak this leap really has. */
  readonly form: { readonly maxRangeM: number; readonly airS: number; readonly peakM: number };
  /** The direction the first volley points (towards where the leap was aimed). */
  readonly baseDir: Vec2;
}

/** A target being dragged to its caster (Grave Chains). */
interface PullAction {
  readonly kind: 'pull';
  readonly casterId: string;
  readonly targetId: string;
  /** The ability that set this pull going (its cooldown waits for the pull to finish). */
  readonly abilityId?: string;
  readonly speedMps: number;
  readonly stopM: number;
  /** What the caster does when the target arrives (Chain Grab's punch), and from which ability. */
  readonly followUp?: AbilityPayload;
  readonly followFx?: { readonly def: AbilityDef };
  /** Drag the target to this spot instead of to the caster (Temporal Echo). */
  readonly toPoint?: Vec2;
  ageS: number;
}

/** A seized target hoisted overhead, then slammed down (Grapple Slam). */
interface GrabAction {
  readonly kind: 'grab';
  readonly casterId: string;
  readonly targetId: string;
  readonly def: AbilityDef;
  readonly dir: Vec2;
  ageS: number;
}

/** Spin Cycle under way (see `SpinDelivery`): the clap, the leg grab and the swing, or the swing of a held object. */
interface SpinAction {
  readonly kind: 'spin';
  readonly casterId: string;
  readonly def: AbilityDef;
  readonly dir: Vec2;
  readonly variant: 'object' | 'opponent';
  readonly targetId: string | null;
  phase: 'clap' | 'grab' | 'spin';
  /** Seconds in the current phase, and since the ability's delivery began. */
  t: number;
  elapsedS: number;
  readonly turns: number;
  /** Seconds the swing lasts. */
  readonly spinS: number;
  /** The angle the target (or object) starts at, round the caster. */
  readonly angle0: number;
  clapped: boolean;
  /** Fighters already struck by the swinging object. */
  readonly struck: Set<string>;
}

/** Quake Barrage under way (see `BarrageDelivery`). */
interface BarrageAction {
  readonly kind: 'barrage';
  readonly casterId: string;
  readonly def: AbilityDef;
  /** Seconds since it began, since the last punch, and how long no enemy has been in reach. */
  ageS: number;
  sinceS: number;
  lostS: number;
  /** Punches thrown so far (landed or not), landed ones, and the finisher's wind-up (null until it starts). */
  thrown: number;
  landed: number;
  finisherS: number | null;
}

/** A swung fighter flying off along the aim after the release (Spin Cycle), until it travels its distance or hits something. */
interface FlingAction {
  readonly kind: 'fling';
  readonly casterId: string;
  readonly targetId: string;
  readonly def: AbilityDef;
  readonly dir: Vec2;
  ageS: number;
  travelledM: number;
  lastX: number;
  lastY: number;
  blocked: boolean;
}

/** A knife assault under way: rushing in, stabbing, springing back (Shroud). */
interface AssaultAction {
  readonly kind: 'assault';
  readonly casterId: string;
  readonly def: AbilityDef;
  readonly targetId: string | null;
  dir: Vec2;
  phase: 'approach' | 'stab' | 'retreat';
  /** Seconds in the current phase. */
  t: number;
  /** Stabs made so far. */
  stabs: number;
}

type Action =
  | DashAction
  | LeapAction
  | PullAction
  | GrabAction
  | AssaultAction
  | SpinAction
  | BarrageAction
  | FlingAction
  | JudgementAction
  | LiftAction
  | FistAction
  | WhirlAction
  | FlurryAction;

/** How a grab turned out, for the caster's animation. */
export type GrabOutcome =
  | { readonly state: 'miss' }
  | { readonly state: 'hold' }
  | { readonly state: 'slam'; sinceS: number };

/** A pull never lasts longer than this (it gives up if something holds the target back). */
const PULL_MAX_S = 1.2;

const TRAIL_SPACING_M = 0.45;
const TRAIL_POINTS = 8;
/** A projectile flies at chest height: it starts this far in front of the caster. */
const MUZZLE_M = 0.5;
/** A beam pours from just in front of the caster's hands. */
const BEAM_MUZZLE_M = 0.45;

/** Turns tried, in order, when a retreating blink meets a wall (straight away first). */
const RETREAT_TURNS_DEG = [0, 30, -30, 60, -60, 90, -90, 120, -120] as const;
/** How far short of a wall a blink stops, metres. */
const WALL_CLEARANCE_M = 0.5;
/** A lobbed grenade leaves the hand this high, and only sticks to a body below this height, metres. */
const GRENADE_RELEASE_HEIGHT_M = 1.3;
/** A lifted target falls for this long, seconds. */
const LIFT_FALL_S = 0.4;
const GRENADE_STICK_MAX_Z_M = 1.9;
/** Out of the hand, a grenade ignores bodies for this long a flight (it cannot stick to its own thrower's side). */
const GRENADE_ARM_K = 0.12;

/** How fast a steered flurry can turn to follow its caster's steering, radians per second. */
const FLURRY_TURN_RAD_PER_S = 7;

const rotate = (v: Vec2, rad: number): Vec2 => ({
  x: v.x * Math.cos(rad) - v.y * Math.sin(rad),
  y: v.x * Math.sin(rad) + v.y * Math.cos(rad),
});

/**
 * Sky Dive's flight (an upside-down J): the climb is steep and early (the height peaks a quarter of the way through),
 * the forward travel is saved for the end, so the path rises, bends over the top and drops onto the end point.
 */
const swoopHeight = (u: number, peakM: number): number => {
  const q = u ** 0.55;
  return 4 * peakM * q * (1 - q);
};
const swoopSpeedFactor = (u: number): number => 2.6 * u ** 1.6;

const norm = (v: Vec2): Vec2 => {
  const l = Math.hypot(v.x, v.y);
  return l > 1e-6 ? { x: v.x / l, y: v.y / l } : { x: 1, y: 0 };
};

/** Gap kept between a grabber and the target it holds, metres (they must not touch). */
const GRAB_HOLD_GAP_M = 0.12;
/** Spin Cycle: the swing takes this much longer than its full-speed turns, as it builds up speed. */
const SPIN_RAMP = 1.3;
/** Seconds between a Flashstep and the extra one an Overdrive allows. */
const FLASH_CHAIN_GAP_S = 0.25;
/** How the swing's angle builds with its progress (slow to start, fastest at the release). */
const SPIN_EASE = 1.6;
/** Fastest a swung body is driven to keep its place in the circle, m/s. */
const SPIN_MAX_DRIVE_MPS = 45;

/** Which arm throws punch number `n` of a Quake Barrage: the four in turn, with an occasional double on one pair so it never reads as a fixed count. */
export function barrageArm(n: number): 0 | 1 | 2 | 3 {
  const order = [0, 1, 2, 3, 0, 3, 2, 1, 0, 2, 1, 3] as const;
  return order[n % order.length]!;
}

/** How many times Spin Cycle swings a body of this weight (lighter: more; heavier: fewer). */
export function spinTurns(d: SpinDelivery, massKg: number): number {
  return Math.max(d.turns.min, Math.min(d.turns.max, Math.round((d.turns.base * d.turns.refKg) / Math.max(1, massKg))));
}
/** Within this of the hold point the held target is simply left still, metres. */
const GRAB_SETTLE_M = 0.02;
/** The fastest a held target is carried to its hold point, and how hard it is pulled in per second of distance. */
const GRAB_MAX_SPEED_MPS = 14;
const GRAB_GAIN_PER_S = 16;

export class AbilityWorld {
  readonly projectiles: Projectile[] = [];
  /** Temporal Echo marks waiting to snap their target back (Chronos). */
  readonly echoes: { casterId: string; def: AbilityDef; targetId: string; at: Vec2; leftS: number }[] = [];
  readonly drones: Drone[] = [];
  readonly decoys: Decoy[] = [];
  readonly rewinds: RewindTrack[] = [];
  readonly ages: AgeTrack[] = [];
  stop: TimeStopState | null = null;
  /** Where each fighter stood over the last few seconds (for Rewind Step), newest last. */
  private readonly history = new Map<string, { t: number; x: number; y: number }[]>();
  private historyDueS = 0;
  readonly beams: Beam[] = [];
  readonly zones: FireZone[] = [];
  readonly clouds: Cloud[] = [];
  readonly grenades: Grenade[] = [];
  readonly parries: Parry[] = [];
  readonly prisons: PrisonTrack[] = [];
  readonly slideTrail: SlideMark[] = [];
  /** Inkmaster's living ink: serpent, dragon, cyclone and the Masterpiece ritual. */
  readonly ink = new InkWorld(
    (c, at, r, h) => this.nearestEnemy(c, at, r, h),
    (f, c, h) => this.friendly(f, c, h),
  );
  /** Magix's props: the 52 cards, the hat's sword and bomb, and Mirror Act's dust. */
  readonly magix = new MagixWorld(
    (c, at, r, h) => this.nearestEnemy(c, at, r, h),
    (f, c, h) => this.friendly(f, c, h),
    () => this.rng(),
  );
  /** The dice of Crystal Arsenal and the scatter of Shard Volley and Crystal Groundstrike (seedable for tests). */
  constructor(private readonly rng: () => number = Math.random) {}
  /** A lifted target cannot be lifted again until this time (Floating Prison's anti-lock rule), world seconds. */
  private readonly liftImmuneUntilS = new Map<string, number>();
  private nowS = 0;

  /** World seconds so far. */
  get timeS(): number {
    return this.nowS;
  }

  /** Repeating strikes still to swing (Ink Slash's 2nd and 3rd slash). */
  readonly strikes: { casterId: string; def: AbilityDef; d: StrikeDelivery; nextS: number; done: number; total: number; dir: Vec2 }[] = [];
  /** Extra Flashsteps still to come while an Overdrive lasts. */
  readonly flashChains: { casterId: string; def: AbilityDef; left: number; nextS: number }[] = [];
  /** Gunsmith's volleys still being fired. */
  readonly bursts: { casterId: string; def: AbilityDef; dir: Vec2; fired: number; nextS: number }[] = [];
  readonly marks: DeathMark[] = [];
  readonly telegraphs: Telegraph[] = [];
  private readonly actions: Action[] = [];
  /** Grab outcomes by caster, kept until its next release (see grabOutcome). */
  private readonly grabOutcomes = new Map<string, GrabOutcome>();

  /** Leap height of a caster this step (render lift), or 0. */
  liftOf(casterId: string): number {
    const a = this.actions.find((x) => x.kind === 'leap' && x.casterId === casterId) as LeapAction | undefined;
    if (!a) return 0;
    const d = a.def.delivery;
    if (d.type !== 'leap') return 0;
    const u = Math.min(1, a.t / a.form.airS);
    return d.swoop ? swoopHeight(u, a.form.peakM) : 4 * a.form.peakM * u * (1 - u);
  }

  /**
   * The abilities of `casterId` that are still being executed past their cast: dashes, leaps, assaults, grabs, pulls,
   * beams, rings still warming up, and a Death Mark being stalked or waiting to be spent. Their cooldowns and
   * (for an ultimate) the meter's recharge must not start yet (owner, 20/11/2026).
   */
  /** Damage really dealt by a fighter (hit points actually removed); Rewind Time adds it up while it is running. */
  recordDealt(casterId: string, amount: number): void {
    if (amount <= 0) return;
    for (const r of this.rewinds) if (r.casterId === casterId && r.replayLeftS <= 0) r.dealt += amount;
  }

  /** Whose Time Stop is running, if any. */
  stopOf(): TimeStopState | null {
    return this.stop;
  }

  executingIds(casterId: string): Set<string> {
    const ids = new Set<string>();
    if (this.stop?.casterId === casterId) ids.add(this.stop.def.id);
    for (const r of this.rewinds) if (r.casterId === casterId) ids.add(r.def.id);
    for (const a of this.ages) if (a.casterId === casterId) ids.add(a.def.id);
    // Abilities that hold their cooldown until what they left behind is gone: shots in flight, fields, afterimages.
    for (const p of this.projectiles)
      if (p.casterId === casterId && p.def.holdsCooldown) ids.add(p.def.id.replace(/-shot$/, ''));
    for (const c of this.clouds) if (c.casterId === casterId && c.def.holdsCooldown && !c.mine) ids.add(c.def.id);
    for (const dc of this.decoys) if (dc.casterId === casterId && dc.def.holdsCooldown) ids.add(dc.def.id);
    for (const b of this.beams) if (b.casterId === casterId) ids.add(b.def.id);
    for (const b of this.bursts) if (b.casterId === casterId) ids.add(b.def.id);
    for (const a of this.actions) {
      if (a.casterId !== casterId) continue;
      if (a.kind === 'pull') {
        if (a.abilityId) ids.add(a.abilityId);
      } else ids.add(a.def.id);
    }
    for (const id of this.ink.runningIds(casterId)) ids.add(id);
    for (const id of this.magix.runningIds(casterId)) ids.add(id);
    for (const t of this.telegraphs) if (t.casterId === casterId) ids.add(t.def.id);
    for (const m of this.marks) if (m.casterId === casterId) ids.add(m.def.id);
    for (const p of this.parries) if (p.casterId === casterId) ids.add(p.def.id);
    return ids;
  }

  /** The caster's Death Mark, if it has one. */
  markOf(casterId: string): DeathMark | null {
    return this.marks.find((m) => m.casterId === casterId) ?? null;
  }

  /** The damage factor the caster's next landed attack gets (1 unless a Death Mark is ready). */
  markFactor(casterId: string): number {
    const m = this.markOf(casterId);
    const d = m?.def.delivery;
    return m?.phase === 'ready' && d?.type === 'mark' ? d.damageFactor : 1;
  }

  /** A hit on the caster, or an attack of its own, breaks a stalk in progress (not a ready mark). */
  cancelStalk(casterId: string, host: AbilityHost): boolean {
    const i = this.marks.findIndex((m) => m.casterId === casterId && m.phase === 'stalk');
    if (i < 0) return false;
    const m = this.marks[i]!;
    this.marks.splice(i, 1);
    const at = host.position(casterId);
    host.emit({
      kind: 'fizzle',
      ability: m.def.id,
      look: m.def.look,
      vfx: 'death-mark-broken',
      sfx: 'mark-break',
      x: at.x,
      y: at.y,
    });
    return true;
  }

  /** The ready mark is spent by a landed attack: the glow goes and the ability is finished. */
  consumeMark(casterId: string, host: AbilityHost): void {
    const i = this.marks.findIndex((m) => m.casterId === casterId && m.phase === 'ready');
    if (i < 0) return;
    const m = this.marks[i]!;
    this.marks.splice(i, 1);
    const at = host.position(casterId);
    host.emit({
      kind: 'impact',
      ability: m.def.id,
      look: m.def.look,
      vfx: 'death-mark-spent',
      sfx: 'mark-spent',
      x: at.x,
      y: at.y,
      radiusM: 0.8,
    });
  }

  /** Is this caster mid-dash or mid-leap (its body is driven by the world)? */
  driving(casterId: string): boolean {
    // A beam holds its caster's cast open while it pours, so a hit can still end it (B4).
    return (
      this.beams.some((b) => b.casterId === casterId) ||
      this.bursts.some((b) => b.casterId === casterId) ||
      this.actions.some(
        (a) =>
          (a.kind === 'dash' || a.kind === 'leap' || a.kind === 'assault' || a.kind === 'spin' || a.kind === 'barrage' || a.kind === 'flurry' || (a.kind === 'whirl' && a.def.delivery.type === 'whirl' && a.def.delivery.steered !== undefined)) &&
          a.casterId === casterId,
      )
    );
  }

  /**
   * A knife assault's state for the caster's animation: which stab (0, 1, 2) and how far through
   * it (0..1), or the retreat; null when none is under way.
   */
  assaultOf(casterId: string): { phase: 'approach' | 'stab' | 'retreat'; stab: number; t: number } | null {
    const a = this.actions.find((x) => x.kind === 'assault' && x.casterId === casterId) as AssaultAction | undefined;
    const d = a?.def.delivery;
    if (!a || d?.type !== 'assault') return null;
    if (a.phase === 'stab')
      return { phase: 'stab', stab: Math.max(0, a.stabs - 1), t: Math.min(1, a.t / d.stabIntervalS) };
    return { phase: a.phase, stab: 0, t: a.t };
  }

  /** Who is dragging whom right now (Grave Chains), for the chain drawn between them. */
  forEachPull(visit: (casterId: string, targetId: string) => void): void {
    for (const a of this.actions) if (a.kind === 'pull') visit(a.casterId, a.targetId);
  }

  /**
   * How a caster's grab is going, for its animation (owner, 13/11/2026: hit and miss look
   * different): 'miss' (nobody was in reach), 'hold' (hoisting), or 'slam' with the seconds since
   * the target hit the floor. Undefined when the caster has no grab under way.
   */
  grabOutcome(casterId: string): GrabOutcome | undefined {
    return this.grabOutcomes.get(casterId);
  }

  /** The parry stance this caster has up, if any. */
  parryOf(casterId: string): Parry | undefined {
    return this.parries.find((p) => p.casterId === casterId);
  }

  /** The stance is spent (it deflected something). */
  consumeParry(casterId: string): void {
    const i = this.parries.findIndex((p) => p.casterId === casterId);
    if (i >= 0) this.parries.splice(i, 1);
  }

  /** A caster's Final Judgement, for its animation: which phase, how many cuts so far, and the time into the phase. */
  judgementOf(casterId: string): { phase: 'rush' | 'cut' | 'wait'; cuts: number; t: number } | null {
    const a = this.actions.find((x) => x.kind === 'judgement' && x.casterId === casterId) as
      | JudgementAction
      | undefined;
    return a ? { phase: a.phase, cuts: a.cuts, t: a.t } : null;
  }

  /**
   * Tornado funnels to draw (Tornado Surge): the one flying from his hands (small) and the one lifting a target (full
   * size, only while it rises: it disappears as the target starts to fall).
   */
  get funnels(): { x: number; y: number; ageS: number; size: number; palette: MagicLook['palette'] | null }[] {
    const out: { x: number; y: number; ageS: number; size: number; palette: MagicLook['palette'] | null }[] = [];
    for (const p of this.projectiles) {
      const d = p.def.delivery;
      if (d.type === 'projectile' && p.def.look?.flight?.tornado)
        out.push({ x: p.x, y: p.y, ageS: p.travelledM / d.speedMps, size: 0.6, palette: p.def.look.palette });
    }
    for (const a of this.actions) {
      if (a.kind === 'lift' && a.def.look?.flight?.tornado && a.ageS < a.spec.liftS)
        out.push({ x: a.x, y: a.y, ageS: a.ageS + 0.3, size: 1, palette: a.def.look?.palette ?? null });
    }
    return out;
  }

  /** Cages of turning rings round targets lifted by Floating Prison: where, how far into the lift, and the palette. */
  get cages(): { x: number; y: number; ageS: number; heightM: number; palette: MagicLook['palette'] | null }[] {
    const out: { x: number; y: number; ageS: number; heightM: number; palette: MagicLook['palette'] | null }[] = [];
    for (const a of this.actions) {
      if (a.kind !== 'lift' || !a.def.look?.cage) continue;
      const rise = Math.min(1, a.ageS / a.spec.liftS);
      out.push({
        x: a.x,
        y: a.y,
        ageS: a.ageS,
        heightM: a.spec.liftM * rise * (2 - rise),
        palette: a.def.look.palette,
      });
    }
    return out;
  }

  /** A spin under way (Wind Blade), for the wing blades and the turning body. */
  whirlOf(casterId: string): { ageS: number; durationS: number; radiusM: number; speedMps: number; ending: number | null } | null {
    const a = this.actions.find((x) => x.kind === 'whirl' && x.casterId === casterId) as WhirlAction | undefined;
    const d = a?.def.delivery;
    return a && d?.type === 'whirl'
      ? { ageS: a.ageS, durationS: d.durationS, radiusM: d.radiusM, speedMps: Math.hypot(a.vel.x, a.vel.y), ending: a.endLeftS === null || !d.steered ? null : 1 - a.endLeftS / d.steered.endS }
      : null;
  }

  /** An extended rocket fist (Geargrind): its direction and how far out it is, or null when none is out. */
  fistOf(casterId: string): { dirX: number; dirY: number; extentM: number; ageS: number } | null {
    const a = this.actions.find((x) => x.kind === 'fist' && x.casterId === casterId) as FistAction | undefined;
    return a ? { dirX: a.dir.x, dirY: a.dir.y, extentM: a.extentM, ageS: a.ageS } : null;
  }

  /** How far through a Sky Dive's flight (0..1) the caster is, or null when not diving that way. */
  swoopOf(casterId: string): number | null {
    const a = this.actions.find((x) => x.kind === 'leap' && x.casterId === casterId) as LeapAction | undefined;
    const d = a?.def.delivery;
    return a && d?.type === 'leap' && d.swoop ? Math.min(1, a.t / d.airS) : null;
  }

  /** How high a grabbed fighter is hoisted this step (render lift), or 0. */
  heldLiftOf(targetId: string): number {
    const a = this.actions.find((x) => x.kind === 'grab' && x.targetId === targetId) as GrabAction | undefined;
    const d = a?.def.delivery;
    if (!a || d?.type !== 'grab') return 0;
    if (d.uppercut) return 0.15 * Math.min(1, a.ageS / 0.25);
    return d.liftM * Math.min(1, a.ageS / d.liftS);
  }

  /**
   * The cast's wind-up ended: start the delivery. `aim` is the soft-locked
   * target point (or a point straight ahead when nothing is in range).
   */
  release(casterId: string, def: AbilityDef, aim: Vec2, host: AbilityHost): void {
    this.grabOutcomes.delete(casterId);
    const at = host.position(casterId);
    const dir = norm({ x: aim.x - at.x, y: aim.y - at.y });
    host.emit({
      kind: 'release',
      ability: def.id,
      look: def.look,
      vfx: def.vfx,
      sfx: def.sfx.release,
      x: at.x,
      y: at.y,
    });
    const d = def.delivery;
    switch (d.type) {
      case 'projectile': {
        if (d.roll) {
          // Tactical Roll: a quick roll along the aim, no hit of its own, while the volley below is fired.
          this.actions.push({
            kind: 'dash',
            casterId,
            def: { ...def, delivery: { type: 'dash', distanceM: d.roll.distanceM, speedMps: d.roll.speedMps, hitRadiusM: 0, afterimages: { spacingM: 0.8, lifeS: 0.25 } } },
            dir,
            remainingS: d.roll.distanceM / d.roll.speedMps,
            ageS: 0,
            hit: new Set(),
            sinceTrailM: TRAIL_SPACING_M,
            sinceImageM: 0,
            lastX: at.x,
            lastY: at.y,
            stuckS: 0,
          });
        }
        if (d.burst) {
          this.bursts.push({ casterId, def, dir, fired: 0, nextS: this.nowS });
          break;
        }
        // A fan (Shard Volley): `count` shots spread evenly across the arc, each with a hair of its own angle.
        const shots = d.fan?.count ?? 1;
        for (let k = 0; k < shots; k++) {
          const spread = d.fan ? (k / Math.max(1, shots - 1) - 0.5) * d.fan.spreadRad + (this.rng() - 0.5) * 0.05 : 0;
          const shotDir =
            spread === 0
              ? dir
              : {
                  x: dir.x * Math.cos(spread) - dir.y * Math.sin(spread),
                  y: dir.x * Math.sin(spread) + dir.y * Math.cos(spread),
                };
          this.projectiles.push({
            casterId,
            def,
            x: at.x + shotDir.x * MUZZLE_M,
            y: at.y + shotDir.y * MUZZLE_M,
            dir: shotDir,
            travelledM: 0,
            trail: [],
            ...(d.bounces ? { bouncesLeft: d.bounces } : {}),
          });
        }
        break;
      }
      case 'cloud': {
        // Where it aims, within range and short of any wall in the way.
        const want = Math.min(def.aimRangeM, Math.hypot(aim.x - at.x, aim.y - at.y));
        const end = { x: at.x + dir.x * want, y: at.y + dir.y * want };
        const block = host.blocked(at, end);
        const reach = block === null ? want : Math.max(0, want * block - 0.3);
        this.spawnCloud(casterId, def, { x: at.x + dir.x * reach, y: at.y + dir.y * reach }, d, host);
        break;
      }
      case 'mark': {
        // Mark the nearest enemy in range; nobody there: it fizzles and the cooldown begins.
        const foe = this.nearestEnemy(casterId, at, Math.max(def.aimRangeM, 1), host);
        this.marks.splice(0, this.marks.length, ...this.marks.filter((m) => m.casterId !== casterId));
        if (!foe) {
          host.emit({ kind: 'fizzle', ability: def.id, look: def.look, vfx: def.vfx, sfx: null, x: at.x, y: at.y });
          break;
        }
        this.marks.push({ casterId, targetId: foe.id, def, phase: 'stalk', leftS: d.stalkS, ageS: 0 });
        host.emit({
          kind: 'release',
          ability: def.id,
          look: def.look,
          vfx: def.vfx,
          sfx: def.sfx.release,
          x: foe.x,
          y: foe.y,
        });
        break;
      }
      case 'lift': {
        // The nearest enemy in reach; a target lifted a moment ago cannot be lifted again yet.
        const foe = this.nearestEnemy(casterId, at, d.reachM, host);
        if (!foe || (this.liftImmuneUntilS.get(foe.id) ?? 0) > this.nowS) {
          host.emit({ kind: 'fizzle', ability: def.id, look: def.look, vfx: def.vfx, sfx: null, x: at.x, y: at.y });
          break;
        }
        this.beginLift(
          casterId,
          def,
          dir,
          foe,
          { liftS: d.liftS, liftM: d.liftM, fallDamage: d.fallDamage, immuneS: d.immuneS },
          host,
        );
        break;
      }
      case 'rewindTime': {
        // A blow straight ahead first; then he remembers where he started and counts what he really deals.
        const reach = { x: at.x + dir.x * d.reachM, y: at.y + dir.y * d.reachM };
        for (const f of host.fighters()) {
          if (this.friendly(f, casterId, host) || !f.hittable) continue;
          if (segmentDistance(at, reach, f) > d.radiusM + f.radiusM) continue;
          if (this.hit(host, casterId, f.id, def.payload, dir, def.look?.hitFlash))
            host.emit({
              kind: 'impact',
              ability: def.id,
              look: def.look,
              vfx: def.vfx,
              sfx: def.sfx.impact,
              x: f.x,
              y: f.y,
              radiusM: 0.8,
            });
        }
        host.hitEnvironment(casterId, reach, d.radiusM, def.payload, dir, false);
        this.rewinds.splice(0, this.rewinds.length, ...this.rewinds.filter((r) => r.casterId !== casterId));
        this.rewinds.push({
          casterId,
          def,
          origin: { x: at.x, y: at.y },
          ageS: 0,
          dealt: 0,
          path: [{ x: at.x, y: at.y }],
          sinceSampleS: 0,
          replayLeftS: 0,
          replayTotalS: 0,
        });
        break;
      }
      case 'age': {
        const foe = this.nearestEnemy(casterId, at, d.rangeM, host);
        if (!foe) {
          host.emit({ kind: 'fizzle', ability: def.id, look: def.look, vfx: def.vfx, sfx: null, x: at.x, y: at.y });
          break;
        }
        const toward = norm({ x: foe.x - at.x, y: foe.y - at.y });
        if (!this.hit(host, casterId, foe.id, def.payload, toward, def.look?.hitFlash)) break;
        const aging = def.payload.aging;
        if (aging) this.ages.push({ casterId, targetId: foe.id, def, ageS: 0, durationS: aging.durationS });
        host.emit({
          kind: 'impact',
          ability: def.id,
          look: def.look,
          vfx: def.vfx,
          sfx: def.sfx.impact,
          x: foe.x,
          y: foe.y,
          radiusM: 1.0,
        });
        break;
      }
      case 'timeStop':
        this.stop = { casterId, def, leftS: d.durationS, totalS: d.durationS };
        host.timeStop?.(casterId, true);
        break;
      case 'fist':
        this.actions.push({ kind: 'fist', casterId, def, dir, ageS: 0, extentM: 0, hit: new Set() });
        break;
      case 'drone': {
        // Only so many at once: the oldest is recalled.
        const own = this.drones.filter((x) => x.casterId === casterId);
        for (const old of own.slice(0, Math.max(0, own.length - d.maxAlive + 1)))
          this.drones.splice(this.drones.indexOf(old), 1);
        this.drones.push({
          casterId,
          def,
          x: at.x - dir.x * 0.4,
          y: at.y - dir.y * 0.4,
          hp: d.hp,
          ageS: 0,
          fireInS: 0.5,
          aimX: dir.x,
          aimY: dir.y,
        });
        break;
      }
      case 'echo': {
        const foe = this.nearestEnemy(casterId, at, d.rangeM, host);
        if (!foe) {
          host.emit({ kind: 'fizzle', ability: def.id, look: def.look, vfx: def.vfx, sfx: null, x: at.x, y: at.y });
          break;
        }
        this.echoes.push({ casterId, def, targetId: foe.id, at: { x: foe.x, y: foe.y }, leftS: d.delayS });
        host.emit({
          kind: 'telegraph',
          ability: def.id,
          look: def.look,
          vfx: def.vfx,
          sfx: def.sfx.release,
          x: foe.x,
          y: foe.y,
          radiusM: 0.9,
        });
        break;
      }
      case 'toss': {
        const ok = host.telekineticToss?.(casterId, d) ?? false;
        host.emit({
          kind: ok ? 'release' : 'fizzle',
          ability: def.id,
          look: def.look,
          vfx: def.vfx,
          sfx: ok ? def.sfx.release : null,
          x: at.x,
          y: at.y,
        });
        break;
      }
      case 'barrier':
        host.barrier?.(casterId, d.hp, d.durationS, d.reflect);
        host.emit({
          kind: 'release',
          ability: def.id,
          look: def.look,
          vfx: def.vfx,
          sfx: def.sfx.release,
          x: at.x,
          y: at.y,
        });
        break;
      case 'arsenal':
        host.arm?.(casterId, d.durationS, d.weapon ?? 'blades');
        host.emit({
          kind: 'impact',
          ability: def.id,
          look: def.look,
          vfx: def.vfx,
          sfx: def.sfx.impact,
          x: at.x,
          y: at.y,
          radiusM: 1.2,
        });
        break;
      case 'legTrap': {
        const foe = this.nearestEnemy(casterId, at, d.rangeM, host);
        if (!foe) {
          host.emit({ kind: 'fizzle', ability: def.id, look: def.look, vfx: def.vfx, sfx: null, x: at.x, y: at.y });
          break;
        }
        this.prisons.push({ casterId, targetId: foe.id, def, phase: 'form', ageS: 0, jumped: false });
        host.emit({
          kind: 'telegraph',
          ability: def.id,
          look: def.look,
          vfx: def.vfx,
          sfx: def.sfx.release,
          x: foe.x,
          y: foe.y,
          radiusM: 1,
        });
        break;
      }
      case 'eruptions':
        this.spawnEruptions(casterId, def, d, host, dir);
        break;
      case 'whirl':
        this.actions.push({ kind: 'whirl', casterId, def, ageS: 0, sinceTickS: d.tickS, vel: { x: 0, y: 0 }, endLeftS: null });
        break;
      case 'flurry':
        this.actions.push({ kind: 'flurry', casterId, def, ageS: 0, dir, next: 0, leapLeftM: 0, lastHit: -1, sinceHitS: 99 });
        break;
      case 'parry': {
        // One stance per caster; its window is longer under Focus Stance.
        for (let i = this.parries.length - 1; i >= 0; i--)
          if (this.parries[i]!.casterId === casterId) this.parries.splice(i, 1);
        const total = d.windowS * (host.parryWindowFactor?.(casterId) ?? 1);
        this.parries.push({ casterId, def, leftS: total, totalS: total });
        if (d.evade) {
          // Static Break: a burst of lightning along the movement direction, afterimages in its wake.
          this.actions.push({
            kind: 'dash',
            casterId,
            def: {
              ...def,
              delivery: {
                type: 'dash',
                distanceM: d.evade.distanceM,
                speedMps: d.evade.speedMps,
                hitRadiusM: 0,
                afterimages: { spacingM: 0.55, lifeS: 0.3 },
              },
            },
            dir,
            remainingS: d.evade.distanceM / d.evade.speedMps,
            ageS: 0,
            hit: new Set(),
            sinceTrailM: TRAIL_SPACING_M,
            sinceImageM: 0,
            lastX: at.x,
            lastY: at.y,
            stuckS: 0,
          });
        }
        break;
      }
      case 'judgement': {
        const foe = this.nearestEnemy(casterId, at, d.rangeM, host);
        this.actions.push({
          kind: 'judgement',
          casterId,
          def,
          origin: { x: at.x, y: at.y },
          targetId: foe?.id ?? null,
          phase: foe ? 'rush' : 'cut',
          t: 0,
          cuts: 0,
        });
        break;
      }
      case 'grenade': {
        // Lobbed to where it aims, within range and short of any wall in the way.
        const want = Math.min(def.aimRangeM, Math.hypot(aim.x - at.x, aim.y - at.y));
        const end = { x: at.x + dir.x * want, y: at.y + dir.y * want };
        const block = host.blocked(at, end);
        const reach = block === null ? want : Math.max(0.4, want * block - 0.3);
        const to = { x: at.x + dir.x * reach, y: at.y + dir.y * reach };
        this.grenades.push({
          casterId,
          def,
          from: { x: at.x, y: at.y },
          to,
          x: at.x,
          y: at.y,
          z: GRENADE_RELEASE_HEIGHT_M,
          k: 0,
          state: 'flying',
          fuseLeftS: 0,
          ageS: 0,
        });
        break;
      }
      case 'dash': {
        if (d.leavesCloud) this.spawnCloud(casterId, def, { x: at.x, y: at.y }, d.leavesCloud, host);
        const dashDir = d.backwards ? { x: -dir.x, y: -dir.y } : dir;
        this.actions.push({
          kind: 'dash',
          casterId,
          def,
          dir: dashDir,
          remainingS: d.distanceM / d.speedMps,
          ageS: 0,
          hit: new Set(),
          sinceTrailM: TRAIL_SPACING_M,
          sinceImageM: d.afterimages?.spacingM ?? 0,
          lastX: at.x,
          lastY: at.y,
          stuckS: 0,
        });
        break;
      }
      case 'nova': {
        // Around the caster, or where it aims (within range, short of any wall in the way).
        let spot = at;
        if (d.atTarget) {
          const want = Math.min(def.aimRangeM, Math.hypot(aim.x - at.x, aim.y - at.y));
          const end = { x: at.x + dir.x * want, y: at.y + dir.y * want };
          const block = host.blocked(at, end);
          const reach = block === null ? want : Math.max(0, want * block - 0.3);
          spot = { x: at.x + dir.x * reach, y: at.y + dir.y * reach };
        }
        const t: Telegraph = {
          casterId,
          def,
          x: spot.x,
          y: spot.y,
          radiusM: d.radiusM,
          durationS: d.telegraphS,
          ageS: 0,
          onCaster: !d.atTarget,
          erupts: d.atTarget === true,
        };
        this.telegraphs.push(t);
        host.emit({
          kind: 'telegraph',
          ability: def.id,
          look: def.look,
          vfx: def.vfx,
          sfx: null,
          x: spot.x,
          y: spot.y,
          radiusM: d.radiusM,
        });
        // Thunder Clap stops any charge under way within its reach, wherever the charger is on the way in.
        if (d.interruptsCharges) {
          const { rangeM, staggerS } = d.interruptsCharges;
          for (const a of [...this.actions]) {
            if (a.kind !== 'dash') continue;
            const charger = host.fighters().find((f) => f.id === a.casterId);
            if (!charger || this.friendly(charger, casterId, host)) continue;
            if (Math.hypot(charger.x - at.x, charger.y - at.y) > rangeM + charger.radiusM) continue;
            this.cancel(a.casterId, host);
            host.hold?.(a.casterId, staggerS);
            host.emit({
              kind: 'impact',
              ability: def.id,
              look: def.look,
              vfx: def.vfx,
              sfx: null,
              x: charger.x,
              y: charger.y,
              radiusM: 1.2,
            });
          }
        }
        break;
      }
      case 'teleport': {
        // Vanish here, reappear there (within range); the host finds a free spot to stand on.
        let to: Vec2;
        let face: Vec2 | null = null;
        if (d.retreatM !== undefined) {
          // Away from the nearest enemy (a retreating blink): straight away if the way is clear,
          // otherwise turned aside from the wall, whichever spot ends furthest from the enemy.
          const foe = this.nearestEnemy(casterId, at, Number.POSITIVE_INFINITY, host);
          const away = foe ? norm({ x: at.x - foe.x, y: at.y - foe.y }) : { x: -dir.x, y: -dir.y };
          to = this.retreatSpot(at, away, d.retreatM, foe, host);
          if (foe) face = norm({ x: foe.x - to.x, y: foe.y - to.y });
        } else if (d.behindTargetM !== undefined && d.flash) {
          // Flashstep (Voltar): streak through the nearest enemy, an afterimage left behind, and punch from behind.
          if (!this.flashStep(casterId, def, d, host)) {
            host.emit({ kind: 'fizzle', ability: def.id, look: def.look, vfx: def.vfx, sfx: null, x: at.x, y: at.y });
            break;
          }
          const extra = Math.min(d.flash.chainMax, host.flashChain?.(casterId) ?? 0);
          if (extra > 0) this.flashChains.push({ casterId, def, left: extra, nextS: this.nowS + FLASH_CHAIN_GAP_S });
          break;
        } else if (d.behindTargetM !== undefined) {
          // Behind the nearest enemy in range, on its far side (Shroud's "Behind You").
          const best = this.nearestEnemy(casterId, at, d.maxRangeM, host);
          if (!best) {
            host.emit({ kind: 'fizzle', ability: def.id, look: def.look, vfx: def.vfx, sfx: null, x: at.x, y: at.y });
            break;
          }
          const away = norm({ x: best.x - at.x, y: best.y - at.y });
          const gap = best.radiusM + d.behindTargetM;
          to = { x: best.x + away.x * gap, y: best.y + away.y * gap };
          face = { x: -away.x, y: -away.y };
        } else {
          const want = Math.min(d.maxRangeM, Math.hypot(aim.x - at.x, aim.y - at.y));
          to = { x: at.x + dir.x * want, y: at.y + dir.y * want };
        }
        const landed = host.teleport?.(casterId, to) ?? null;
        if (landed && face) host.face?.(casterId, face);
        if (!landed)
          host.emit({ kind: 'fizzle', ability: def.id, look: def.look, vfx: def.vfx, sfx: null, x: at.x, y: at.y });
        if (landed)
          host.emit({
            kind: 'impact',
            ability: def.id,
            look: def.look,
            vfx: def.vfx,
            sfx: def.sfx.impact,
            x: landed.x,
            y: landed.y,
            radiusM: 0.9,
          });
        break;
      }
      case 'serpent':
      case 'bull':
      case 'vortex':
      case 'masterpiece':
        this.ink.release(casterId, def, aim, host);
        break;
      case 'cards':
      case 'luckyHat':
      case 'mirror':
        this.magix.release(casterId, def, aim, host);
        break;
      case 'summon':
        // A summon that is drawn first (Ink Clone) rises once its figure is finished; others rise at once.
        if (d.drawS && this.ink.release(casterId, def, aim, host)) break;
        host.summon?.(casterId, d);
        host.emit({
          kind: 'impact',
          ability: def.id,
          look: def.look,
          vfx: def.vfx,
          sfx: def.sfx.impact,
          x: at.x,
          y: at.y,
          radiusM: 1.4,
        });
        break;
      case 'beam': {
        const beam: Beam = {
          casterId,
          def,
          dir,
          ageS: 0,
          sinceTickS: d.tickS, // the first tick lands at once
          from: at,
          to: at,
          touching: [],
          landed: false,
          contact: new Map(),
        };
        this.aimBeam(beam, host);
        this.beams.push(beam);
        break;
      }
      case 'assault': {
        // Rush at the nearest enemy in range (or straight ahead), then stab, then maybe spring back.
        const foe = this.nearestEnemy(casterId, at, Math.max(def.aimRangeM, d.reachM), host);
        this.actions.push({
          kind: 'assault',
          casterId,
          def,
          targetId: foe?.id ?? null,
          dir: foe ? norm({ x: foe.x - at.x, y: foe.y - at.y }) : dir,
          phase: 'approach',
          t: 0,
          stabs: 0,
        });
        break;
      }
      case 'strike': {
        this.strikeBlow(casterId, def, d, dir, host, 0);
        if (d.repeat) this.strikes.push({ casterId, def, d, nextS: this.nowS + d.repeat.gapS, done: 1, total: 1 + d.repeat.extra, dir });
        break;
      }
      case 'grab': {
        // Seize the nearest enemy within reach in front; nobody there: a heavy grasp at the air.
        const reach = { x: at.x + dir.x * d.reachM, y: at.y + dir.y * d.reachM };
        let best: AbilityTarget | null = null;
        let bestD = Number.POSITIVE_INFINITY;
        for (const f of host.fighters()) {
          if (this.friendly(f, casterId, host) || !f.hittable) continue;
          if (segmentDistance(at, reach, f) > d.radiusM + f.radiusM) continue;
          const dd = Math.hypot(f.x - at.x, f.y - at.y);
          if (dd < bestD) {
            best = f;
            bestD = dd;
          }
        }
        if (!best) {
          this.grabOutcomes.set(casterId, { state: 'miss' });
          host.emit({
            kind: 'fizzle',
            ability: def.id,
            look: def.look,
            vfx: def.vfx,
            sfx: null,
            x: reach.x,
            y: reach.y,
          });
          break;
        }
        this.grabOutcomes.set(casterId, { state: 'hold' });
        host.hold?.(best.id, d.liftS + 0.5);
        this.actions.push({ kind: 'grab', casterId, targetId: best.id, def, dir, ageS: 0 });
        break;
      }
      case 'barrage':
        this.actions.push({ kind: 'barrage', casterId, def, ageS: 0, sinceS: d.hitIntervalS, lostS: 0, thrown: 0, landed: 0, finisherS: null });
        break;
      case 'spin': {
        const angle0 = Math.atan2(dir.y, dir.x);
        if (host.carryingObject?.(casterId)) {
          // Holding something: swing it round and hurl it level.
          const turns = d.object.turns;
          this.actions.push({
            kind: 'spin',
            casterId,
            def,
            dir,
            variant: 'object',
            targetId: null,
            phase: 'spin',
            t: 0,
            elapsedS: 0,
            turns,
            spinS: turns * d.turnS * SPIN_RAMP,
            angle0,
            clapped: true,
            struck: new Set(),
          });
          break;
        }
        // Otherwise seize the nearest enemy in reach in front; nobody there: a grab at the air.
        const reach = { x: at.x + dir.x * d.reachM, y: at.y + dir.y * d.reachM };
        let best: AbilityTarget | null = null;
        let bestD = Number.POSITIVE_INFINITY;
        for (const f of host.fighters()) {
          if (this.friendly(f, casterId, host) || !f.hittable) continue;
          if (segmentDistance(at, reach, f) > d.radiusM + f.radiusM) continue;
          const dd = Math.hypot(f.x - at.x, f.y - at.y);
          if (dd < bestD) {
            best = f;
            bestD = dd;
          }
        }
        if (!best) {
          this.grabOutcomes.set(casterId, { state: 'miss' });
          host.emit({ kind: 'fizzle', ability: def.id, look: def.look, vfx: def.vfx, sfx: null, x: reach.x, y: reach.y });
          break;
        }
        // Lighter fighters are swung more times, heavier ones fewer.
        const turns = spinTurns(d, best.massKg ?? 70);
        const spinS = turns * d.turnS * SPIN_RAMP;
        host.hold?.(best.id, d.clap.dazeS + d.grabS + spinS + 0.4);
        this.actions.push({
          kind: 'spin',
          casterId,
          def,
          dir,
          variant: 'opponent',
          targetId: best.id,
          phase: 'clap',
          t: 0,
          elapsedS: 0,
          turns,
          spinS,
          angle0,
          clapped: false,
          struck: new Set(),
        });
        break;
      }
      case 'buff':
        {
          const { type: _type, summon: _summon, shockwave: _shockwave, ...effect } = d;
          host.buff(casterId, effect, def.id);
        }
        if (d.summon) host.summon?.(casterId, d.summon);
        if (d.shockwave) {
          // Once, as it begins: everyone close is hit and pushed straight away from the caster.
          for (const f of host.fighters()) {
            if (this.friendly(f, casterId, host) || !f.hittable) continue;
            const gap = Math.hypot(f.x - at.x, f.y - at.y);
            if (gap > d.shockwave.radiusM + f.radiusM) continue;
            const away = gap > 1e-6 ? { x: (f.x - at.x) / gap, y: (f.y - at.y) / gap } : dir;
            this.hit(host, casterId, f.id, d.shockwave.payload, away, def.look?.hitFlash);
          }
        }
        host.emit({
          kind: 'impact',
          ability: def.id,
          look: def.look,
          vfx: def.vfx,
          sfx: def.sfx.impact,
          x: at.x,
          y: at.y,
          radiusM: 2.2,
        });
        break;
      case 'leap': {
        // Land on the target (within range), short of any wall or furniture in the way.
        let anchorAt: Vec2 | undefined;
        if (d.anchor) {
          // The hook goes into the ground ahead; if anything blocks the throw it fails and nothing moves (never a teleport).
          const wantA = Math.min(d.anchor.throwRangeM, Math.hypot(aim.x - at.x, aim.y - at.y) + (d.anchor.pastM ?? 0));
          const A = { x: at.x + dir.x * wantA, y: at.y + dir.y * wantA };
          if (wantA < 1 || host.blocked(at, A) !== null || (host.standable && !host.standable(A))) {
            host.emit({ kind: 'fizzle', ability: def.id, look: def.look, vfx: def.vfx, sfx: null, x: A.x, y: A.y });
            break;
          }
          anchorAt = A;
          host.emit({ kind: 'impact', ability: def.id, look: def.look, vfx: `${def.vfx}-embed`, sfx: def.sfx.release, x: A.x, y: A.y, radiusM: 0.5 });
        }
        const empowered = d.empowered !== undefined && host.empowersLeap?.(casterId) === true;
        const form = leapForm(d, empowered);
        const want = Math.min(form.maxRangeM, Math.hypot(aim.x - at.x, aim.y - at.y));
        const end = { x: at.x + dir.x * want, y: at.y + dir.y * want };
        const block = host.blocked(at, end);
        const reach = block === null ? want : Math.max(0, want * block - 0.5);
        const to = { x: at.x + dir.x * reach, y: at.y + dir.y * reach };
        const telegraph: Telegraph = {
          casterId,
          def,
          x: to.x,
          y: to.y,
          radiusM: d.radiusM,
          durationS: form.airS,
          ageS: 0,
          onCaster: false,
        };
        this.telegraphs.push(telegraph);
        host.emit({
          kind: 'telegraph',
          ability: def.id,
          look: def.look,
          vfx: def.vfx,
          sfx: null,
          x: to.x,
          y: to.y,
          radiusM: d.radiusM,
        });
        const v = d.volley;
        const volleyDef: AbilityDef | undefined = v
          ? {
              ...def,
              payload: v.payload,
              delivery: { type: 'projectile', speedMps: v.speedMps, radiusM: v.radiusM, maxRangeM: v.maxRangeM },
            }
          : undefined;
        this.actions.push({
          kind: 'leap',
          casterId,
          def,
          from: at,
          to,
          t: 0,
          telegraph,
          volleysFired: 0,
          empowered,
          form,
          delayS: d.anchor?.embedS ?? 0,
          ...(anchorAt ? { anchor: anchorAt } : {}),
          ...(volleyDef ? { volleyDef } : {}),
          baseDir: dir,
        });
        break;
      }
    }
  }

  /** The caster was interrupted or KO'd: stop its dash, leap or beam and any ring still warming up. */
  cancel(casterId: string, host: AbilityHost): void {
    // Being hit or knocked out breaks a stalk (a mark already charged survives a flinch).
    this.cancelStalk(casterId, host);
    this.magix.cancel(casterId);
    for (let i = this.strikes.length - 1; i >= 0; i--) if (this.strikes[i]!.casterId === casterId) this.strikes.splice(i, 1);
    for (let i = this.flashChains.length - 1; i >= 0; i--) if (this.flashChains[i]!.casterId === casterId) this.flashChains.splice(i, 1);
    for (let i = this.bursts.length - 1; i >= 0; i--) if (this.bursts[i]!.casterId === casterId) this.bursts.splice(i, 1);
    for (let i = this.beams.length - 1; i >= 0; i--) if (this.beams[i]!.casterId === casterId) this.beams.splice(i, 1);
    for (let i = this.actions.length - 1; i >= 0; i--) {
      if (this.actions[i]!.casterId !== casterId) continue;
      if (this.actions[i]!.kind === 'lift' || this.actions[i]!.kind === 'fling') continue; // a tornado, or a body already in flight, carries on without him
      const gone = this.actions[i]!;
      if (gone.kind === 'spin' && gone.targetId) host.drive(gone.targetId, null, 0); // the swung fighter is dropped
      if (gone.kind === 'spin' && gone.variant === 'object') host.swingHeld?.(casterId, null, 0);
      this.actions.splice(i, 1);
      host.drive(casterId, null, 0);
    }
    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      const t = this.telegraphs[i]!;
      if (t.casterId !== casterId) continue;
      this.telegraphs.splice(i, 1);
      host.emit({ kind: 'fizzle', ability: t.def.id, look: t.def.look, vfx: t.def.vfx, sfx: null, x: t.x, y: t.y });
    }
  }

  /** One blow of a strike ability: everyone in reach in front, then the furniture or door it meets. `index` varies the ink slash's look. */
  private strikeBlow(casterId: string, def: AbilityDef, d: StrikeDelivery, dir: Vec2, host: AbilityHost, index: number): void {
    const at = host.position(casterId);
    if (def.vfx === 'ink-slash') this.ink.slash(at, dir, d.reachM, index);
    const reach = { x: at.x + dir.x * d.reachM, y: at.y + dir.y * d.reachM };
    let landed = false;
    for (const f of host.fighters()) {
      if (this.friendly(f, casterId, host) || !f.hittable) continue;
      if (segmentDistance(at, reach, f) > d.radiusM + f.radiusM) continue;
      if (this.hit(host, casterId, f.id, def.payload, dir, def.look?.hitFlash)) {
        landed = true;
        host.emit({
          kind: 'impact',
          ability: def.id,
          look: def.look,
          vfx: def.vfx,
          sfx: def.sfx.impact,
          x: f.x,
          y: f.y,
          radiusM: 0.8,
        });
      }
    }
    host.hitEnvironment(casterId, reach, d.radiusM, def.payload, dir, false);
    if (!landed) {
      host.emit({ kind: 'impact', ability: def.id, look: def.look, vfx: def.vfx, sfx: def.sfx.impact, x: reach.x, y: reach.y, radiusM: 0.8 });
    }
  }

  /** The follow-up blows of repeating strikes (Ink Slash): each turns to the nearest enemy in reach and swings again. */
  private updateStrikes(host: AbilityHost): void {
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const q = this.strikes[i]!;
      if (this.nowS < q.nextS) continue;
      const at = host.position(q.casterId);
      const foe = this.nearestEnemy(q.casterId, at, q.d.reachM + 1.5, host);
      const dir = foe ? norm({ x: foe.x - at.x, y: foe.y - at.y }) : q.dir;
      host.face?.(q.casterId, dir);
      this.strikeBlow(q.casterId, q.def, q.d, dir, host, q.done);
      host.emit({ kind: 'release', ability: q.def.id, look: q.def.look, vfx: q.def.vfx, sfx: q.def.sfx.release, x: at.x, y: at.y });
      q.done++;
      q.dir = dir;
      if (q.done >= q.total) this.strikes.splice(i, 1);
      else q.nextS = this.nowS + (q.d.repeat?.gapS ?? 0.3);
    }
  }

  /** Everything this caster has set going (shots, clouds, mines, beams, marks, the ink it drew...) ends now. */
  clearOf(casterId: string): void {
    for (const value of Object.values(this)) {
      if (!Array.isArray(value)) continue;
      for (let i = value.length - 1; i >= 0; i--) {
        const item: unknown = value[i];
        if (typeof item === 'object' && item !== null && (item as { casterId?: unknown }).casterId === casterId)
          value.splice(i, 1);
      }
    }
    this.ink.clearOf(casterId);
    this.magix.clearOf(casterId);
  }

  update(dtS: number, host: AbilityHost): void {
    this.nowS += dtS;
    // Time Stop: only its own clock runs. Everything else in the ability world waits where it is.
    if (this.stop) {
      this.stop.leftS -= dtS;
      if (this.stop.leftS <= 0) {
        const st = this.stop;
        this.stop = null;
        host.timeStop?.(st.casterId, false);
        host.emit({
          kind: 'impact',
          ability: st.def.id,
          look: st.def.look,
          vfx: 'time-resume',
          sfx: 'time-resume',
          x: host.position(st.casterId).x,
          y: host.position(st.casterId).y,
          radiusM: 6,
        });
      }
      return;
    }
    for (const g of this.grabOutcomes.values()) if (g.state === 'slam') g.sinceS += dtS;
    this.updateProjectiles(dtS, host);
    this.updateBeams(dtS, host);
    this.updateActions(dtS, host);
    this.updateEchoes(dtS, host);
    this.updateTelegraphs(dtS, host);
    this.updateZones(dtS, host);
    this.updateClouds(dtS, host);
    this.updateDrones(dtS, host);
    this.updateTime(dtS, host);
    this.updateGrenades(dtS, host);
    this.updatePrisons(dtS, host);
    this.ink.update(dtS, host);
    this.updateStrikes(host);
    this.updateFlashChains(host);
    this.updateBursts(host);
    this.magix.update(dtS, host);
    for (let i = this.slideTrail.length - 1; i >= 0; i--) {
      const m = this.slideTrail[i]!;
      m.ageS += dtS;
      if (m.ageS >= m.lifeS) this.slideTrail.splice(i, 1);
    }
    for (let i = this.parries.length - 1; i >= 0; i--) {
      const p = this.parries[i]!;
      p.leftS -= dtS;
      if (p.leftS <= 0) this.parries.splice(i, 1);
    }
    this.updateMarks(dtS, host);
  }

  private updateProjectiles(dtS: number, host: AbilityHost): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]!;
      const d = p.def.delivery;
      if (d.type !== 'projectile') continue;
      const step = d.speedMps * (p.speedFactor ?? 1) * dtS;
      if (d.arcRad && p.arcPerM === undefined) {
        // A curved throw: start turned out to one side by half the arc, then bend back round onto the target (or the end of the range).
        let dist = d.maxRangeM;
        for (const f of host.fighters()) {
          if (this.friendly(f, p.casterId, host) || !f.hittable) continue;
          const dx = f.x - p.x;
          const dy = f.y - p.y;
          const along = dx * p.dir.x + dy * p.dir.y;
          if (along > 0.3 && along < dist && Math.abs(dx * p.dir.y - dy * p.dir.x) < 1.5) dist = Math.hypot(dx, dy);
        }
        p.dir = rotate(p.dir, -d.arcRad / 2);
        p.arcPerM = d.arcRad / Math.max(1, dist);
      }
      const from = { x: p.x, y: p.y };
      const to = { x: p.x + p.dir.x * step, y: p.y + p.dir.y * step };
      if (p.arcPerM) p.dir = rotate(p.dir, p.arcPerM * step);

      // An afterimage spends an enemy shot that reaches it (it is only an image: nothing passes through to hurt anyone).
      const image = this.decoys.find(
        (dc) =>
          !this.friendly({ id: p.casterId, x: 0, y: 0, radiusM: 0, hittable: true }, dc.casterId, host) &&
          Math.hypot(p.x - dc.x, p.y - dc.y) < 0.5,
      );
      if (image) {
        this.projectiles.splice(i, 1);
        host.emit({
          kind: 'impact',
          ability: image.def.id,
          look: image.def.look,
          vfx: 'afterimage-pop',
          sfx: image.def.sfx.impact,
          x: image.x,
          y: image.y,
          radiusM: 0.6,
        });
        image.ageS = image.lifeS; // the image is gone
        continue;
      }
      // Fighters first: anyone (except the caster) the shot passes through this step.
      let done = false;
      for (const f of host.fighters()) {
        if (this.friendly(f, p.casterId, host) || !f.hittable) continue;
        if (segmentDistance(from, to, f) > d.radiusM + f.radiusM) continue;
        const payload = p.damageFactor
          ? { ...p.def.payload, damage: p.def.payload.damage * p.damageFactor, knockbackMps: p.def.payload.knockbackMps * p.damageFactor }
          : p.def.payload;
        if (!this.hit(host, p.casterId, f.id, payload, p.dir, p.def.look?.hitFlash, p.def.id)) continue; // dodged: flies on
        this.impact(p, f, host, f.id);
        if (d.passThrough) this.streakThrough(p.casterId, p.def, f, p.dir, d.passThrough.exitM, host);
        if (d.lift) this.startLift(p, f, host);
        done = true;
        break;
      }
      if (!done) {
        const block = host.blocked(from, to);
        if (block !== null) {
          const at = { x: from.x + (to.x - from.x) * block, y: from.y + (to.y - from.y) * block };
          if (p.bouncesLeft && p.bouncesLeft > 0) {
            // Ricochet: bounce off whichever face it hit (the one it cannot move through), keep going from the contact point.
            const xBlocked = host.blocked(from, { x: to.x, y: from.y }) !== null;
            const yBlocked = host.blocked(from, { x: from.x, y: to.y }) !== null;
            const flipX = xBlocked || !yBlocked;
            const flipY = yBlocked || !xBlocked;
            p.dir = { x: flipX ? -p.dir.x : p.dir.x, y: flipY ? -p.dir.y : p.dir.y };
            p.bouncesLeft--;
            p.x = at.x + p.dir.x * 0.3; // out of the wall, heading away from it
            p.y = at.y + p.dir.y * 0.3;
            host.emit({ kind: 'impact', ability: p.def.id, look: p.def.look, vfx: p.def.vfx, sfx: p.def.sfx.impact, x: at.x, y: at.y, radiusM: 0.3 });
            continue;
          }
          host.hitEnvironment(p.casterId, at, d.radiusM + 0.15, p.def.payload, p.dir, false);
          this.impact(p, at, host);
          done = true;
        }
      }
      if (done) {
        this.projectiles.splice(i, 1);
        continue;
      }
      p.trail.push(from);
      if (p.trail.length > TRAIL_POINTS) p.trail.shift();
      p.x = to.x;
      p.y = to.y;
      p.travelledM += step;
      if (p.travelledM >= d.maxRangeM) {
        this.projectiles.splice(i, 1);
        // A jar that lands on the floor still shatters and splashes (VX1); anything else just fades out.
        if (d.cloud) this.impact(p, { x: p.x, y: p.y }, host);
        else
          host.emit({ kind: 'fizzle', ability: p.def.id, look: p.def.look, vfx: p.def.vfx, sfx: null, x: p.x, y: p.y });
      }
    }
  }

  private impact(p: Projectile, at: Vec2, host: AbilityHost, hitId?: string): void {
    const d = p.def.delivery;
    if (d.type === 'projectile' && d.cloud) this.spawnCloud(p.casterId, p.def, at, d.cloud, host, hitId);
    if (d.type === 'projectile' && d.explode) {
      const e = d.explode;
      const def = { ...p.def, payload: { ...p.def.payload, damage: p.def.payload.damage * e.damageFactor, knockbackMps: e.knockbackMps, heavy: true } };
      this.blast(p.casterId, def, at, e.radiusM, host);
      return;
    }
    host.emit({
      kind: 'impact',
      ability: p.def.id,
      look: p.def.look,
      vfx: p.def.vfx,
      sfx: p.def.sfx.impact,
      x: at.x,
      y: at.y,
      radiusM: 0.6,
    });
  }

  /** The beam starts at the caster's hands and runs to its reach, or to the first wall, door or furniture. */
  private aimBeam(b: Beam, host: AbilityHost): void {
    const d = b.def.delivery;
    if (d.type !== 'beam') return;
    const at = host.position(b.casterId);
    const from = { x: at.x + b.dir.x * BEAM_MUZZLE_M, y: at.y + b.dir.y * BEAM_MUZZLE_M };
    const far = { x: from.x + b.dir.x * d.rangeM, y: from.y + b.dir.y * d.rangeM };
    const block = host.blocked(from, far);
    const reach = d.rangeM * (block ?? 1);
    b.from = from;
    b.to = { x: from.x + b.dir.x * reach, y: from.y + b.dir.y * reach };
  }

  /** Turn a beam toward where its caster steers it, no faster than its turn rate; the caster turns with it. */
  private steerBeam(b: Beam, turnRadPerS: number, dtS: number, host: AbilityHost): void {
    const want = host.steer?.(b.casterId, b.ageS <= dtS);
    if (want && Math.hypot(want.x, want.y) > 1e-6) {
      const now = Math.atan2(b.dir.y, b.dir.x);
      let delta = Math.atan2(want.y, want.x) - now;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta)); // shortest way round
      const step = Math.max(-turnRadPerS * dtS, Math.min(turnRadPerS * dtS, delta));
      b.dir = { x: Math.cos(now + step), y: Math.sin(now + step) };
    }
    host.face?.(b.casterId, b.dir);
  }

  private updateBeams(dtS: number, host: AbilityHost): void {
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      if (!b) continue; // a tick can cancel other beams
      const d = b.def.delivery;
      if (d.type !== 'beam') continue;
      b.ageS += dtS;
      if (b.ageS >= d.durationS) {
        this.beams.splice(i, 1);
        host.emit({
          kind: 'fizzle',
          ability: b.def.id,
          look: b.def.look,
          vfx: b.def.vfx,
          sfx: null,
          x: b.to.x,
          y: b.to.y,
        });
        continue;
      }
      if (d.turnRadPerS) this.steerBeam(b, d.turnRadPerS, dtS, host);
      this.aimBeam(b, host);
      b.sinceTickS += dtS;
      if (b.sinceTickS < d.tickS) continue;
      b.sinceTickS -= d.tickS;
      // A tick: everyone in the beam is hit, harder the closer they stand (distance falloff), and
      // harder the longer the beam has held them (the build-up, reset the moment contact breaks).
      const caster = host.position(b.casterId);
      const was = b.touching;
      b.touching = [];
      for (const f of host.fighters()) {
        if (this.friendly(f, b.casterId, host) || !f.hittable) continue;
        if (segmentDistance(b.from, b.to, f) > d.widthM / 2 + f.radiusM) continue;
        const dist = Math.hypot(f.x - caster.x, f.y - caster.y);
        const contactS = was.includes(f.id) ? (b.contact.get(f.id) ?? 0) + d.tickS : 0;
        const at = payloadAt(b.def.payload, dist, d.rangeM + BEAM_MUZZLE_M);
        const k = beamRampFactor(d.ramp, contactS);
        const scaled = k === 1 ? at : { ...at, damage: Math.round(at.damage * k) };
        // A scream never stuns or interrupts anyone (owner, 25/11/2026): Fire Beam and Sonic Boom only hurt (and Sonic Boom pushes).
        const payload = d.scream ? { ...scaled, noFlinch: true } : scaled;
        if (!this.hit(host, b.casterId, f.id, payload, b.dir, b.def.look?.hitFlash)) {
          b.contact.delete(f.id);
          continue;
        }
        b.contact.set(f.id, contactS);
        b.touching.push(f.id);
        host.emit({
          kind: 'impact',
          ability: b.def.id,
          look: b.def.look,
          vfx: b.def.vfx,
          sfx: b.landed ? null : b.def.sfx.impact,
          x: f.x,
          y: f.y,
          radiusM: 0.35,
        });
        b.landed = true;
      }
      for (const id of [...b.contact.keys()]) if (!b.touching.includes(id)) b.contact.delete(id);
      // The end of the beam scorches whatever stopped it (sets furniture alight, chips doors and walls).
      host.hitEnvironment(b.casterId, b.to, 0.3, b.def.payload, b.dir, true);
    }
  }

  /** The nearest hittable enemy of the caster within `rangeM` of `at`, or null. */
  private nearestEnemy(casterId: string, at: Vec2, rangeM: number, host: AbilityHost): AbilityTarget | null {
    let best: AbilityTarget | null = null;
    let bestD = rangeM;
    for (const f of host.fighters()) {
      if (this.friendly(f, casterId, host) || !f.hittable) continue;
      if (host.sees && !host.sees(casterId, f.id)) continue; // blinded or in the dark: no target found
      const dd = Math.hypot(f.x - at.x, f.y - at.y);
      if (dd <= bestD) {
        best = f;
        bestD = dd;
      }
    }
    return best;
  }

  /**
   * Where a retreating blink lands: up to `distM` along `away`, or turned up to 120° aside when a
   * wall is in the way (short of the wall, never through it), keeping the spot that ends furthest
   * from the enemy. Straight away wins ties, so open floor always gives the plain retreat.
   */
  private retreatSpot(at: Vec2, away: Vec2, distM: number, foe: AbilityTarget | null, host: AbilityHost): Vec2 {
    let best = at;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const deg of RETREAT_TURNS_DEG) {
      const a = (deg * Math.PI) / 180;
      const u = {
        x: away.x * Math.cos(a) - away.y * Math.sin(a),
        y: away.x * Math.sin(a) + away.y * Math.cos(a),
      };
      const block = host.blocked(at, { x: at.x + u.x * distM, y: at.y + u.y * distM });
      const reach = block === null ? distM : Math.max(0, distM * block - WALL_CLEARANCE_M);
      const p = { x: at.x + u.x * reach, y: at.y + u.y * reach };
      // Without an enemy, simply the longest clear blink.
      const score = foe ? Math.hypot(p.x - foe.x, p.y - foe.y) : reach;
      if (score > bestScore + 0.3) {
        best = p;
        bestScore = score;
      }
    }
    return best;
  }

  /** The caster itself, or a fighter on its team (its summons, its summoner): never hit. */
  private friendly(f: AbilityTarget, casterId: string, host: AbilityHost): boolean {
    if (f.id === casterId) return true;
    if (f.team === undefined) return false;
    return host.fighters().find((o) => o.id === casterId)?.team === f.team;
  }

  /** Hit a fighter; a pulling payload then drags it to the caster (Grave Chains). */
  private hit(
    host: AbilityHost,
    casterId: string,
    targetId: string,
    payload: AbilityPayload,
    dir: Vec2,
    hitFlash?: number,
    abilityId?: string,
  ): boolean {
    const landed = host.hitFighter(casterId, targetId, payload, dir, hitFlash);
    if (landed && payload.pull) {
      for (let i = this.actions.length - 1; i >= 0; i--) {
        const a = this.actions[i]!;
        if ((a.kind === 'pull' || a.kind === 'grab' || a.kind === 'lift') && a.targetId === targetId)
          this.actions.splice(i, 1);
      }
      this.actions.push({
        kind: 'pull',
        casterId,
        targetId,
        ...(abilityId ? { abilityId } : {}),
        speedMps:
          payload.pull.speedMps *
          (payload.pull.refKg
            ? Math.max(
                0.5,
                Math.min(
                  1,
                  payload.pull.refKg / Math.max(1, host.fighters().find((f) => f.id === targetId)?.massKg ?? 70),
                ),
              )
            : 1),
        stopM: payload.pull.stopM,
        ...(payload.pull.followUp ? { followUp: payload.pull.followUp } : {}),
        ageS: 0,
      });
    }
    return landed;
  }

  private updateActions(dtS: number, host: AbilityHost): void {
    for (let i = this.actions.length - 1; i >= 0; i--) {
      // A step can cancel other actions (an interrupted caster loses all of its own, a new pull
      // replaces older ones), so the list can shrink by more than the one entry this loop expects.
      const a = this.actions[i];
      if (!a) continue;
      const finished =
        a.kind === 'dash'
          ? this.stepDash(a, dtS, host)
          : a.kind === 'leap'
            ? this.stepLeap(a, dtS, host)
            : a.kind === 'pull'
              ? this.stepPull(a, dtS, host)
              : a.kind === 'assault'
                ? this.stepAssault(a, dtS, host)
                : a.kind === 'judgement'
                  ? this.stepJudgement(a, dtS, host)
                  : a.kind === 'barrage'
                    ? this.stepBarrage(a, dtS, host)
                    : a.kind === 'spin'
                    ? this.stepSpin(a, dtS, host)
                    : a.kind === 'fling'
                      ? this.stepFling(a, dtS, host)
                      : a.kind === 'lift'
                        ? this.stepLift(a, dtS, host)
                    : a.kind === 'fist'
                      ? this.stepFist(a, dtS, host)
                      : a.kind === 'flurry'
                        ? this.stepFlurry(a, dtS, host)
                        : a.kind === 'whirl'
                          ? this.stepWhirl(a, dtS, host)
                        : this.stepGrab(a, dtS, host);
      if (finished) {
        // The action may have been removed meanwhile (a new pull on the same target).
        const at = this.actions.indexOf(a);
        if (at >= 0) this.actions.splice(at, 1);
        if (a.kind === 'dash') this.slideThorns(a, host);
        host.drive(
          a.kind === 'pull' || a.kind === 'grab' || a.kind === 'lift' || a.kind === 'fling' ? a.targetId : a.casterId,
          null,
          0,
        );
      }
    }
  }

  /** Temporal Echo: when the mark's time is up, the target is hit and dragged back to where it was marked. */
  private updateEchoes(dtS: number, host: AbilityHost): void {
    for (let i = this.echoes.length - 1; i >= 0; i--) {
      const e = this.echoes[i]!;
      e.leftS -= dtS;
      if (e.leftS > 0) continue;
      this.echoes.splice(i, 1);
      const d = e.def.delivery;
      const target = host.fighters().find((f) => f.id === e.targetId);
      if (d.type !== 'echo' || !target?.hittable) continue;
      const from = { x: target.x, y: target.y };
      const away = Math.hypot(e.at.x - from.x, e.at.y - from.y);
      this.hit(
        host,
        e.casterId,
        e.targetId,
        e.def.payload,
        norm({ x: e.at.x - from.x, y: e.at.y - from.y }),
        e.def.look?.hitFlash,
      );
      // Time runs backwards for it: back to the marked spot, however far it has gone (a hit that did not move it is only a hit).
      if (away > 0.6) {
        for (let k = this.actions.length - 1; k >= 0; k--) {
          const a = this.actions[k]!;
          if ((a.kind === 'pull' || a.kind === 'grab' || a.kind === 'lift') && a.targetId === e.targetId)
            this.actions.splice(k, 1);
        }
        this.actions.push({
          kind: 'pull',
          casterId: e.casterId,
          targetId: e.targetId,
          abilityId: e.def.id,
          speedMps: d.snapSpeedMps,
          stopM: 0,
          toPoint: e.at,
          ageS: 0,
        });
      }
      host.emit({
        kind: 'impact',
        ability: e.def.id,
        look: e.def.look,
        vfx: e.def.vfx,
        sfx: e.def.sfx.impact,
        x: e.at.x,
        y: e.at.y,
        radiusM: 1,
      });
    }
  }

  /** Drag the target toward the caster until it is `stopM` away, stuck, or out of time. */
  private stepPull(a: PullAction, dtS: number, host: AbilityHost): boolean {
    a.ageS += dtS;
    const target = host.fighters().find((f) => f.id === a.targetId);
    if (!target?.hittable || a.ageS > PULL_MAX_S) return true;
    const c = a.toPoint ?? host.position(a.casterId);
    const dx = c.x - target.x;
    const dy = c.y - target.y;
    const d = Math.hypot(dx, dy);
    const gap = d - a.stopM - target.radiusM;
    if (gap <= 0.05) {
      // Arrived: the caster's finishing blow (Chain Grab), with its own impact.
      if (a.followUp) {
        const dir = d > 1e-6 ? { x: -dx / d, y: -dy / d } : { x: 1, y: 0 };
        host.hitFighter(a.casterId, a.targetId, a.followUp, dir);
        host.emit({
          kind: 'impact',
          ability: a.abilityId ?? 'chainGrab',
          vfx: 'chain-punch',
          sfx: 'chain-punch',
          x: target.x,
          y: target.y,
          radiusM: 1.2,
        });
      }
      return true;
    }
    const speed = Math.min(a.speedMps, gap / dtS);
    host.drive(a.targetId, { x: (dx / d) * speed, y: (dy / d) * speed }, 0);
    return false;
  }

  /** A tornado shot has caught someone: it carries them up (they cannot act), then lets them fall. */
  private startLift(p: Projectile, f: AbilityTarget, host: AbilityHost): void {
    const d = p.def.delivery;
    if (d.type !== 'projectile' || !d.lift) return;
    this.beginLift(p.casterId, p.def, p.dir, f, { ...d.lift, immuneS: 0 }, host);
  }

  /** Carry a target up and, after the rise, let it fall (the shared lift behind Tornado Surge and Floating Prison). */
  private beginLift(
    casterId: string,
    def: AbilityDef,
    dir: Vec2,
    f: AbilityTarget,
    spec: LiftAction['spec'],
    host: AbilityHost,
  ): void {
    for (let i = this.actions.length - 1; i >= 0; i--) {
      const a = this.actions[i]!;
      if (a.kind === 'lift' && a.targetId === f.id) this.actions.splice(i, 1);
    }
    host.hold?.(f.id, spec.liftS + LIFT_FALL_S + 0.2);
    this.actions.push({ kind: 'lift', casterId, targetId: f.id, def, dir, ageS: 0, x: f.x, y: f.y, spec });
  }

  /** Rise for `liftS`, then (the funnel gone) fall over `LIFT_FALL_S`; the fall hurts. */
  private stepLift(a: LiftAction, dtS: number, host: AbilityHost): boolean {
    a.ageS += dtS;
    const target = host.fighters().find((f) => f.id === a.targetId);
    if (!target?.hittable) return true;
    a.x = target.x;
    a.y = target.y;
    const { liftS, liftM, fallDamage, immuneS } = a.spec;
    const rise = Math.min(1, a.ageS / liftS);
    let fall = Math.max(0, (a.ageS - liftS) / LIFT_FALL_S);
    let height = fall > 0 ? liftM * (1 - fall * fall) : liftM * rise * (2 - rise);
    const fu = a.spec.followUp;
    if (fu && !a.punched && a.ageS >= fu.atS && fall === 0) {
      // The second hand punches the rising target back down: a heavy blow, then a fast fall from where it was hit.
      a.punched = { atS: a.ageS, fromM: height };
      this.hit(host, a.casterId, a.targetId, fu.payload, a.dir, a.def.look?.hitFlash);
      host.emit({
        kind: 'impact',
        ability: a.def.id,
        look: a.def.look,
        vfx: a.def.vfx,
        sfx: a.def.sfx.impact,
        x: target.x,
        y: target.y,
        radiusM: 1.4,
      });
    }
    if (a.punched) {
      fall = (a.ageS - a.punched.atS) / (LIFT_FALL_S * 0.55);
      height = a.punched.fromM * (1 - Math.min(1, fall) ** 2);
    }
    host.drive(a.targetId, { x: 0, y: 0 }, Math.max(0, height));
    if (fall < 1) return false;
    host.drive(a.targetId, null, 0);
    if (immuneS > 0) this.liftImmuneUntilS.set(a.targetId, this.nowS + immuneS);
    // The landing: the fall's damage (if any), a knockdown, and a puff where they land.
    if (fallDamage > 0)
      this.hit(
        host,
        a.casterId,
        a.targetId,
        { ...a.def.payload, damage: fallDamage, heavy: true, knockbackMps: 2, noFlinch: false },
        a.dir,
        a.def.look?.hitFlash,
      );
    host.emit({
      kind: 'impact',
      ability: a.def.id,
      look: a.def.look,
      vfx: a.def.vfx,
      sfx: a.def.sfx.impact,
      x: target.x,
      y: target.y,
      radiusM: 1.6,
    });
    return true;
  }

  /** A spin: every tick, each enemy in reach is cut by the wings and pushed away. A steered spin also carries its caster across the floor. */
  private stepWhirl(a: WhirlAction, dtS: number, host: AbilityHost): boolean {
    const d = a.def.delivery;
    if (d.type !== 'whirl') return true;
    a.ageS += dtS;
    a.sinceTickS += dtS;
    const st = d.steered;
    if (st) {
      if (a.endLeftS === null && a.ageS >= d.durationS) a.endLeftS = st.endS;
      // The player's own steering, never a lock-on: nothing held means he coasts to a stop.
      const m = a.endLeftS === null ? host.moveInput?.(a.casterId) : null;
      const len = m ? Math.hypot(m.x, m.y) : 0;
      const want = m && len > 0.15 ? { x: (m.x / Math.max(1, len)) * st.speedMps, y: (m.y / Math.max(1, len)) * st.speedMps } : { x: 0, y: 0 };
      const dx = want.x - a.vel.x;
      const dy = want.y - a.vel.y;
      const dl = Math.hypot(dx, dy);
      const maxDv = st.accelMps2 * dtS;
      if (dl <= maxDv || dl < 1e-6) a.vel = want;
      else a.vel = { x: a.vel.x + (dx / dl) * maxDv, y: a.vel.y + (dy / dl) * maxDv };
      host.drive(a.casterId, a.vel, 0);
      if (Math.hypot(a.vel.x, a.vel.y) > 0.5) host.face?.(a.casterId, a.vel);
      // The whirr of the spin, every little while it runs.
      if (a.endLeftS === null && Math.floor((a.ageS + dtS) / 0.45) > Math.floor(a.ageS / 0.45))
        host.emit({ kind: 'release', ability: a.def.id, look: a.def.look, vfx: a.def.vfx, sfx: a.def.sfx.release, x: host.position(a.casterId).x, y: host.position(a.casterId).y, dirX: 1, dirY: 0 });
    }
    const me = host.position(a.casterId);
    const cutting = !st || a.endLeftS === null || a.endLeftS > st.endS * 0.4;
    while (a.sinceTickS >= d.tickS) {
      a.sinceTickS -= d.tickS;
      if (!cutting) continue;
      for (const f of host.fighters()) {
        if (this.friendly(f, a.casterId, host) || !f.hittable) continue;
        const gap = Math.hypot(f.x - me.x, f.y - me.y);
        if (gap > d.radiusM + f.radiusM) continue;
        const away = gap > 1e-6 ? { x: (f.x - me.x) / gap, y: (f.y - me.y) / gap } : { x: 1, y: 0 };
        if (this.hit(host, a.casterId, f.id, a.def.payload, away, a.def.look?.hitFlash))
          host.emit({
            kind: 'impact',
            ability: a.def.id,
            look: a.def.look,
            vfx: st ? a.def.vfx : 'wing-slash',
            sfx: a.def.sfx.impact,
            x: f.x,
            y: f.y,
            radiusM: 0.5,
          });
      }
      host.hitEnvironment(a.casterId, me, d.radiusM, a.def.payload, { x: 0, y: 0 }, false);
    }
    if (st && a.endLeftS !== null) {
      a.endLeftS -= dtS;
      return a.endLeftS <= 0;
    }
    return !st && a.ageS >= d.durationS;
  }

  /** Ends a steered spin early (the ultimate button pressed again): it winds down and stops. True if there was one to end. */
  endWhirl(casterId: string): boolean {
    const a = this.actions.find((x) => x.kind === 'whirl' && x.casterId === casterId) as WhirlAction | undefined;
    const d = a?.def.delivery;
    if (!a || d?.type !== 'whirl' || !d.steered || a.endLeftS !== null) return false;
    a.endLeftS = d.steered.endS;
    return true;
  }

  /**
   * A flurry: the caster follows the steering, lands each blow at its time on everything inside its shape, throws the leap that comes before
   * a blow, and is carried by `drive` (so walls and furniture stop him).
   */
  private stepFlurry(a: FlurryAction, dtS: number, host: AbilityHost): boolean {
    const d = a.def.delivery;
    if (d.type !== 'flurry') return true;
    a.ageS += dtS;
    a.sinceHitS += dtS;
    if (d.steered) {
      const m = host.moveInput?.(a.casterId);
      const len = m ? Math.hypot(m.x, m.y) : 0;
      if (m && len > 0.2) {
        // Turn towards the steering at a limited rate: he can double back after a runner, but never snaps round.
        const want = Math.atan2(m.y, m.x);
        const cur = Math.atan2(a.dir.y, a.dir.x);
        let diff = want - cur;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const turn = Math.max(-1, Math.min(1, diff / Math.max(1e-6, FLURRY_TURN_RAD_PER_S * dtS))) * FLURRY_TURN_RAD_PER_S * dtS;
        const ang = Math.abs(diff) < Math.abs(turn) ? want : cur + turn;
        a.dir = { x: Math.cos(ang), y: Math.sin(ang) };
      }
      host.face?.(a.casterId, a.dir);
    }
    while (a.next < d.hits.length && a.ageS >= d.hits[a.next]!.atS) {
      this.flurryBlow(a, d.hits[a.next]!, host);
      a.lastHit = a.next;
      a.sinceHitS = 0;
      a.next++;
    }
    // The leap that leads into a blow: faster for the time it needs to cover its distance.
    let speed = d.moveSpeedMps;
    const leapSpeed = d.leapSpeedMps ?? speed;
    for (const h of d.hits) {
      if (h.leapM && a.ageS < h.atS && a.ageS >= h.atS - h.leapM / leapSpeed) speed = leapSpeed;
    }
    host.drive(a.casterId, speed > 0 ? { x: a.dir.x * speed, y: a.dir.y * speed } : { x: 0, y: 0 }, 0);
    return a.ageS >= d.durationS;
  }

  private flurryBlow(a: FlurryAction, h: FlurryHit, host: AbilityHost): void {
    const me = host.position(a.casterId);
    const payload = {
      ...a.def.payload,
      damage: a.def.payload.damage * h.damageFactor,
      knockbackMps: a.def.payload.knockbackMps * h.knockbackFactor,
      heavy: h.heavy ?? a.def.payload.heavy,
    };
    let any = false;
    for (const f of host.fighters()) {
      if (this.friendly(f, a.casterId, host) || !f.hittable) continue;
      const vx = f.x - me.x;
      const vy = f.y - me.y;
      const gap = Math.hypot(vx, vy);
      if (gap > h.reachM + f.radiusM) continue;
      if (h.shape === 'cone' && gap > 0.5) {
        const cos = (vx * a.dir.x + vy * a.dir.y) / gap;
        if (Math.acos(Math.max(-1, Math.min(1, cos))) > (h.halfArcRad ?? 0.9)) continue;
      }
      const away = h.shape === 'cone' || gap < 1e-6 ? a.dir : { x: vx / gap, y: vy / gap };
      if (!this.hit(host, a.casterId, f.id, payload, away, a.def.look?.hitFlash)) continue;
      any = true;
      if (h.lift) this.beginLift(a.casterId, a.def, away, f, { ...h.lift, immuneS: 0 }, host);
      host.emit({
        kind: 'impact',
        ability: a.def.id,
        look: a.def.look,
        vfx: a.def.vfx,
        sfx: h.sfx ?? a.def.sfx.impact,
        x: f.x,
        y: f.y,
        radiusM: 0.7,
      });
    }
    // Furniture and doors in the way take the blow too; a miss still swishes.
    host.hitEnvironment(a.casterId, { x: me.x + a.dir.x * h.reachM * 0.6, y: me.y + a.dir.y * h.reachM * 0.6 }, Math.max(0.6, h.reachM * 0.5), payload, a.dir, false);
    if (!any)
      host.emit({ kind: 'release', ability: a.def.id, look: a.def.look, vfx: a.def.vfx, sfx: h.sfx ?? a.def.sfx.release, x: me.x, y: me.y, dirX: a.dir.x, dirY: a.dir.y });
  }

  /** A flurry's state for the caster's animation: which blow came last, how long ago, and whether it is running. */
  flurryOf(casterId: string): { blow: number; sinceS: number; ageS: number; shape: 'cone' | 'circle' | null } | null {
    const a = this.actions.find((x) => x.kind === 'flurry' && x.casterId === casterId) as FlurryAction | undefined;
    const d = a?.def.delivery;
    if (!a || d?.type !== 'flurry') return null;
    return { blow: a.lastHit, sinceS: a.sinceHitS, ageS: a.ageS, shape: a.lastHit >= 0 ? d.hits[a.lastHit]!.shape : null };
  }

  /** Hoist the seized target overhead in front of the caster, then slam it down. */
  private stepGrab(a: GrabAction, dtS: number, host: AbilityHost): boolean {
    const d = a.def.delivery;
    if (d.type !== 'grab') return true;
    a.ageS += dtS;
    const target = host.fighters().find((f) => f.id === a.targetId);
    const caster = host.fighters().find((f) => f.id === a.casterId);
    if (!target || !caster?.hittable) return true; // the grabber fell: the target drops
    // Keep the target held just in front of the caster, rising overhead.
    // A small gap off the grabber's body, so the two circles never touch: held exactly at the sum of
    // the radii they pushed each other apart every step and the target jittered (master plan B9).
    const gapM = caster.radiusM + target.radiusM + GRAB_HOLD_GAP_M;
    const hold = { x: caster.x + a.dir.x * gapM, y: caster.y + a.dir.y * gapM };
    const lift = d.liftM * Math.min(1, a.ageS / d.liftS);
    if (d.telekinetic) {
      // Raised where it stands, then hurled along the aim: nothing is slammed, nothing is pulled in.
      host.drive(a.targetId, { x: 0, y: 0 }, lift);
      if (a.ageS < d.liftS) return false;
      this.grabOutcomes.set(a.casterId, { state: 'slam', sinceS: 0 });
      host.drive(a.targetId, null, 0);
      host.hitFighter(a.casterId, a.targetId, a.def.payload, a.dir, a.def.look?.hitFlash);
      host.emit({
        kind: 'impact',
        ability: a.def.id,
        look: a.def.look,
        vfx: a.def.vfx,
        sfx: a.def.sfx.impact,
        x: target.x,
        y: target.y,
        radiusM: d.slamRadiusM,
      });
      return true;
    }
    if (d.uppercut) {
      // Held at the upper hands, then thrown up by the lower pair: the launch depends on the target's weight.
      host.drive(a.targetId, { x: 0, y: 0 }, 0.15 * Math.min(1, a.ageS / 0.25));
      const fixX = hold.x - target.x;
      const fixY = hold.y - target.y;
      if (Math.hypot(fixX, fixY) > 0.02)
        host.drive(a.targetId, { x: fixX * 8, y: fixY * 8 }, 0.15 * Math.min(1, a.ageS / 0.25));
      if (a.ageS < d.uppercut.holdS) return false;
      const k = Math.max(
        d.uppercut.minK,
        Math.min(d.uppercut.maxK, d.uppercut.refKg / Math.max(1, target.massKg ?? 70)),
      );
      this.grabOutcomes.set(a.casterId, { state: 'slam', sinceS: 0 });
      host.drive(a.targetId, null, 0);
      host.hitFighter(a.casterId, a.targetId, a.def.payload, a.dir, a.def.look?.hitFlash);
      this.beginLift(
        a.casterId,
        a.def,
        a.dir,
        target,
        {
          liftS: d.uppercut.liftS,
          liftM: d.uppercut.liftM * k,
          fallDamage: d.uppercut.fallDamage * k,
          immuneS: 0,
          ...(d.uppercut.followUp ? { followUp: d.uppercut.followUp } : {}),
        },
        host,
      );
      host.emit({
        kind: 'impact',
        ability: a.def.id,
        look: a.def.look,
        vfx: a.def.vfx,
        sfx: a.def.sfx.impact,
        x: target.x,
        y: target.y,
        radiusM: d.slamRadiusM,
      });
      return true;
    }
    // Close the distance smoothly: a speed that eases off near the hold point and never exceeds the cap.
    const dx = hold.x - target.x;
    const dy = hold.y - target.y;
    const dist = Math.hypot(dx, dy);
    const speed =
      dist < GRAB_SETTLE_M ? 0 : Math.min(GRAB_MAX_SPEED_MPS, dist / Math.max(dtS, 1e-3), dist * GRAB_GAIN_PER_S);
    host.drive(a.targetId, dist > 1e-6 ? { x: (dx / dist) * speed, y: (dy / dist) * speed } : { x: 0, y: 0 }, lift);
    if (a.ageS < d.liftS) return false;
    // The slam: down in front, with the full payload and a dust blast.
    this.grabOutcomes.set(a.casterId, { state: 'slam', sinceS: 0 });
    host.drive(a.targetId, null, 0);
    const land = {
      x: caster.x + a.dir.x * (caster.radiusM + target.radiusM + 0.2),
      y: caster.y + a.dir.y * (caster.radiusM + target.radiusM + 0.2),
    };
    host.hitFighter(a.casterId, a.targetId, a.def.payload, a.dir, a.def.look?.hitFlash);
    host.hitEnvironment(a.casterId, land, d.slamRadiusM, a.def.payload, { x: 0, y: 0 }, false);
    host.emit({
      kind: 'impact',
      ability: a.def.id,
      look: a.def.look,
      vfx: a.def.vfx,
      sfx: a.def.sfx.impact,
      x: land.x,
      y: land.y,
      radiusM: d.slamRadiusM,
    });
    return true;
  }

  /** Where a caster's burst is aimed (its last shot), if one is under way. */
  burstAim(casterId: string): Vec2 | null {
    return this.bursts.find((b) => b.casterId === casterId)?.dir ?? null;
  }

  /** The id of the burst a caster is firing, if any (Gunsmith's machine gun shows its weapon while it lasts). */
  burstOf(casterId: string): string | null {
    return this.bursts.find((b) => b.casterId === casterId)?.def.id ?? null;
  }

  /** Gunsmith's volleys: one shot every `gapS`, from alternating hands, each at the nearest enemy (or along the steered aim). */
  private updateBursts(host: AbilityHost): void {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i]!;
      const d = b.def.delivery;
      if (d.type !== 'projectile' || !d.burst) {
        this.bursts.splice(i, 1);
        continue;
      }
      while (this.bursts[i] === b && this.nowS >= b.nextS && b.fired < d.burst.count) {
        const at = host.position(b.casterId);
        const foe = this.nearestEnemy(b.casterId, at, Math.max(b.def.aimRangeM, d.maxRangeM), host);
        let dir = b.dir;
        if (d.burst.aimable) dir = host.steer?.(b.casterId, b.fired === 0) ?? dir;
        else if (foe) dir = norm({ x: foe.x - at.x, y: foe.y - at.y });
        const jit = ((this.rng() - 0.5) * (d.burst.jitterRad ?? 0));
        const shot = { x: dir.x * Math.cos(jit) - dir.y * Math.sin(jit), y: dir.x * Math.sin(jit) + dir.y * Math.cos(jit) };
        const side = d.burst.aimable ? 0 : b.fired % 2 === 0 ? 1 : -1; // left hand, right hand (a machine gun has one muzzle)
        const last = b.fired === d.burst.count - 1 && d.burst.finalFactor !== undefined;
        host.face?.(b.casterId, shot);
        b.dir = dir; // where the guns point now (the view aims along it); the aim without the shot's own jitter, so the spread never drifts
        this.projectiles.push({
          casterId: b.casterId,
          def: b.def,
          x: at.x + shot.x * MUZZLE_M - shot.y * 0.18 * side,
          y: at.y + shot.y * MUZZLE_M + shot.x * 0.18 * side,
          dir: shot,
          travelledM: 0,
          trail: [],
          ...(d.bounces ? { bouncesLeft: d.bounces } : {}),
          ...(last ? { damageFactor: d.burst.finalFactor } : {}),
          ...(b.fired > 0 && d.burst.laterSpeedFactor ? { speedFactor: d.burst.laterSpeedFactor } : {}),
        });
        // The flash at the muzzle, where the bullet leaves, not at the chest.
        host.emit({ kind: 'release', ability: b.def.id, look: b.def.look, vfx: b.def.vfx, sfx: b.def.sfx.release, x: at.x + shot.x * MUZZLE_M, y: at.y + shot.y * MUZZLE_M, dirX: shot.x, dirY: shot.y });
        b.fired++;
        b.nextS += d.burst.gapS;
      }
      if (this.bursts[i] === b && b.fired >= d.burst.count) this.bursts.splice(i, 1);
    }
  }

  /** Flashstep: through the nearest enemy (never through a wall), an afterimage at the start, a punch from behind. False if nobody is in range. */
  private flashStep(casterId: string, def: AbilityDef, d: TeleportDelivery, host: AbilityHost): boolean {
    const at = host.position(casterId);
    const foe = this.nearestEnemy(casterId, at, d.maxRangeM, host);
    if (!foe) return false;
    const along = norm({ x: foe.x - at.x, y: foe.y - at.y });
    const gap = foe.radiusM + (d.behindTargetM ?? 0.75);
    let to = { x: foe.x + along.x * gap, y: foe.y + along.y * gap };
    let lost = false;
    const wall = host.blocked(at, to);
    if (wall !== null) {
      const reach = Math.max(0, Math.hypot(to.x - at.x, to.y - at.y) * wall - 0.3);
      to = { x: at.x + along.x * reach, y: at.y + along.y * reach };
      lost = true; // stopped short of the wall: no punch
    }
    if (d.flash) this.decoys.push({ casterId, def, x: at.x, y: at.y, dir: along, ageS: 0, lifeS: d.flash.lifeS });
    host.emit({ kind: 'release', ability: def.id, look: def.look, vfx: def.vfx, sfx: def.sfx.release, x: at.x, y: at.y, dirX: along.x, dirY: along.y });
    const landed = host.teleport?.(casterId, to) ?? null;
    if (!landed) return false;
    host.face?.(casterId, along);
    host.emit({ kind: 'impact', ability: def.id, look: def.look, vfx: def.vfx, sfx: def.sfx.impact, x: landed.x, y: landed.y, radiusM: 0.9 });
    if (lost || !foe.hittable) return true;
    if (this.hit(host, casterId, foe.id, def.payload, along, def.look?.hitFlash))
      host.emit({ kind: 'impact', ability: def.id, look: def.look, vfx: def.vfx, sfx: def.sfx.impact, x: foe.x, y: foe.y, radiusM: 1 });
    return true;
  }

  /** The extra Flashsteps an Overdrive allows, each at the nearest enemy, 0.25 s apart. */
  private updateFlashChains(host: AbilityHost): void {
    for (let i = this.flashChains.length - 1; i >= 0; i--) {
      const c = this.flashChains[i]!;
      if (this.nowS < c.nextS) continue;
      const d = c.def.delivery;
      if (d.type !== 'teleport' || !this.flashStep(c.casterId, c.def, d, host) || --c.left <= 0) this.flashChains.splice(i, 1);
      else c.nextS = this.nowS + FLASH_CHAIN_GAP_S;
    }
  }

  /** Arc Lash: the caster turns to lightning and streaks through the struck fighter, leaving an afterimage where he began. */
  private streakThrough(casterId: string, def: AbilityDef, foe: AbilityTarget, dir: Vec2, exitM: number, host: AbilityHost): void {
    const at = host.position(casterId);
    let to = { x: foe.x + dir.x * (foe.radiusM + exitM), y: foe.y + dir.y * (foe.radiusM + exitM) };
    const wall = host.blocked(at, to);
    if (wall !== null) {
      const reach = Math.max(0, Math.hypot(to.x - at.x, to.y - at.y) * wall - 0.3);
      to = { x: at.x + dir.x * reach, y: at.y + dir.y * reach };
    }
    this.decoys.push({ casterId, def, x: at.x, y: at.y, dir, ageS: 0, lifeS: 0.4 });
    const landed = host.teleport?.(casterId, to) ?? null;
    if (!landed) return;
    host.face?.(casterId, dir);
    host.emit({ kind: 'release', ability: def.id, look: def.look, vfx: `${def.vfx}-streak`, sfx: def.sfx.release, x: at.x, y: at.y, dirX: dir.x, dirY: dir.y });
  }

  /** Quake Barrage's state for the caster's animation: which arm pair and punch is out, and whether the four-fist finisher is winding up. */
  barrageOf(casterId: string): {
    /** 0..1 through the current punch. */
    k: number;
    /** Which arm throws it: 0 near upper hook, 1 far lower straight, 2 far upper hook, 3 near lower straight, then varied. */
    arm: 0 | 1 | 2 | 3;
    thrown: number;
    /** 0..1 through the finisher's wind-up, 1 while the four fists land, or null when it is not under way. */
    finisher: number | null;
  } | null {
    const a = this.actions.find((x) => x.kind === 'barrage' && x.casterId === casterId) as BarrageAction | undefined;
    const d = a?.def.delivery;
    if (!a || d?.type !== 'barrage') return null;
    if (a.finisherS !== null) return { k: 0, arm: 0, thrown: a.thrown, finisher: Math.min(1, a.finisherS / d.finisher.windupS) };
    return { k: Math.min(1, a.sinceS / d.hitIntervalS), arm: barrageArm(a.thrown), thrown: a.thrown, finisher: null };
  }

  /** Quake Barrage: punch after punch at the nearest enemy in reach, then, if it is never escaped or broken, the four-fist finisher. */
  private stepBarrage(a: BarrageAction, dtS: number, host: AbilityHost): boolean {
    const d = a.def.delivery;
    if (d.type !== 'barrage') return true;
    const caster = host.fighters().find((f) => f.id === a.casterId);
    if (!caster?.hittable) return true;
    a.ageS += dtS;
    const at = { x: caster.x, y: caster.y };
    const foe = this.nearestEnemy(a.casterId, at, d.reachM + 1.2, host);
    const inReach = foe && Math.hypot(foe.x - at.x, foe.y - at.y) <= d.reachM + foe.radiusM + d.radiusM;
    if (foe) host.face?.(a.casterId, norm({ x: foe.x - at.x, y: foe.y - at.y }));
    // Out of reach for a moment: the barrage stops naturally, nobody is held in it.
    a.lostS = inReach ? 0 : a.lostS + dtS;
    if (a.lostS >= d.loseContactS || a.thrown >= d.maxHits) return true;
    if (a.finisherS !== null) {
      a.finisherS += dtS;
      if (a.finisherS < d.finisher.windupS) return false;
      if (foe?.hittable && inReach) {
        const dir = norm({ x: foe.x - at.x, y: foe.y - at.y });
        if (this.hit(host, a.casterId, foe.id, { ...a.def.payload, damage: d.finisher.damage, knockbackMps: d.finisher.knockbackMps, heavy: true, noFlinch: false }, dir, a.def.look?.hitFlash))
          host.emit({ kind: 'impact', ability: a.def.id, look: a.def.look, vfx: a.def.vfx, sfx: a.def.sfx.impact, x: foe.x, y: foe.y, radiusM: 1.8 });
      }
      return true;
    }
    a.sinceS += dtS;
    if (a.sinceS < d.hitIntervalS) return false;
    a.sinceS = 0;
    if (!foe?.hittable || !inReach) return false;
    if (a.landed >= d.finisherAfterHits) {
      a.finisherS = 0;
      return false;
    }
    const arm = barrageArm(a.thrown);
    const punch = arm === 0 || arm === 2 ? d.hook : d.straight;
    a.thrown++;
    const dir = norm({ x: foe.x - at.x, y: foe.y - at.y });
    if (this.hit(host, a.casterId, foe.id, { ...a.def.payload, damage: punch.damage, knockbackMps: punch.knockbackMps, noFlinch: true }, dir, a.def.look?.hitFlash)) {
      a.landed++;
      host.emit({ kind: 'impact', ability: a.def.id, look: a.def.look, vfx: a.def.vfx, sfx: a.def.sfx.release, x: foe.x, y: foe.y, radiusM: 0.55 });
    }
    return false;
  }

  /** Gravehook Launch tethers in flight: who, where the sickle is anchored, and whether the pull has begun. */
  tethers(): { casterId: string; x: number; y: number; pulling: boolean }[] {
    return this.actions.flatMap((a) => (a.kind === 'leap' && a.anchor ? [{ casterId: a.casterId, x: a.anchor.x, y: a.anchor.y, pulling: a.delayS <= 0 }] : []));
  }

  /** Spin Cycle's state for the caster's animation, or null when none is under way. */
  spinOf(casterId: string): {
    variant: 'object' | 'opponent';
    phase: 'clap' | 'grab' | 'spin';
    /** Seconds since the delivery began, and the lengths of the clap and the leg grab (for keyed animation). */
    elapsedS: number;
    clapS: number;
    grabS: number;
    /** 0..1 through the swing, and how many turns it makes. */
    progress: number;
    turns: number;
  } | null {
    const a = this.actions.find((x) => x.kind === 'spin' && x.casterId === casterId) as SpinAction | undefined;
    const d = a?.def.delivery;
    if (!a || d?.type !== 'spin') return null;
    return {
      variant: a.variant,
      phase: a.phase,
      elapsedS: a.elapsedS,
      clapS: d.clap.dazeS,
      grabS: d.grabS,
      progress: a.phase === 'spin' ? Math.min(1, a.t / a.spinS) : 0,
      turns: a.turns,
    };
  }

  /** A swung body's height this step (render lift) while Spin Cycle flings it, or 0. */
  private flingHeightM(d: SpinDelivery, travelledM: number): number {
    return Math.max(0, d.liftM * 0.6 * (1 - travelledM / d.launch.maxDistM));
  }

  /** Spin Cycle: clap the head, take a leg, swing round, let go (or, holding an object, swing it and hurl it level). */
  private stepSpin(a: SpinAction, dtS: number, host: AbilityHost): boolean {
    const d = a.def.delivery;
    if (d.type !== 'spin') return true;
    const caster = host.fighters().find((f) => f.id === a.casterId);
    if (!caster?.hittable) return true; // the swinger fell: the swung one drops (cancel() clears the rest)
    a.t += dtS;
    a.elapsedS += dtS;
    const me = { x: caster.x, y: caster.y };
    const around = (angle: number, r: number): Vec2 => ({ x: me.x + Math.cos(angle) * r, y: me.y + Math.sin(angle) * r });
    const swingAngle = (): number => {
      const u = Math.min(1, a.t / a.spinS);
      return a.angle0 + Math.PI * 2 * a.turns * u ** SPIN_EASE;
    };
    if (a.variant === 'object') {
      const ang = swingAngle();
      const spot = around(ang, d.orbitM * 0.85);
      host.swingHeld?.(a.casterId, spot, d.object.heightM);
      host.face?.(a.casterId, { x: Math.cos(ang), y: Math.sin(ang) });
      // The swinging object catches anyone it passes (once each).
      for (const f of host.fighters()) {
        if (this.friendly(f, a.casterId, host) || !f.hittable || a.struck.has(f.id)) continue;
        if (Math.hypot(f.x - spot.x, f.y - spot.y) > 0.75 + f.radiusM) continue;
        a.struck.add(f.id);
        const away = norm({ x: f.x - me.x, y: f.y - me.y });
        if (this.hit(host, a.casterId, f.id, a.def.payload, away, a.def.look?.hitFlash))
          host.emit({ kind: 'impact', ability: a.def.id, look: a.def.look, vfx: a.def.vfx, sfx: a.def.sfx.impact, x: f.x, y: f.y, radiusM: 1 });
      }
      if (a.t < a.spinS) return false;
      host.face?.(a.casterId, a.dir);
      host.throwHeldFlat?.(a.casterId, a.dir, {
        speedMps: d.object.speedMps,
        powerFactor: d.object.powerFactor,
        heightM: d.object.heightM,
      });
      host.emit({ kind: 'release', ability: a.def.id, look: a.def.look, vfx: a.def.vfx, sfx: a.def.sfx.release, x: me.x, y: me.y });
      return true;
    }
    const target = host.fighters().find((f) => f.id === a.targetId);
    if (!target?.hittable || !a.targetId) return true; // gone: nothing left to swing
    const front = caster.radiusM + target.radiusM + GRAB_HOLD_GAP_M;
    // Move the swung body to a spot this step (a position, not a push, so it keeps pace however fast the swing).
    const placeAt = (spot: Vec2, liftM: number): void => {
      const v = { x: (spot.x - target.x) / Math.max(dtS, 1e-3), y: (spot.y - target.y) / Math.max(dtS, 1e-3) };
      const sp = Math.hypot(v.x, v.y);
      const k = sp > SPIN_MAX_DRIVE_MPS ? SPIN_MAX_DRIVE_MPS / sp : 1;
      host.drive(a.targetId!, { x: v.x * k, y: v.y * k }, liftM);
    };
    if (a.phase === 'clap') {
      // Held at the front, their head caught between the upper hands.
      placeAt(around(a.angle0, front), 0.15);
      if (!a.clapped && a.t >= d.clap.dazeS * 0.5) {
        a.clapped = true;
        const flash = a.def.look?.hitFlash;
        if (this.hit(host, a.casterId, a.targetId, { ...a.def.payload, damage: d.clap.damage, heavy: false, knockbackMps: 0, stunS: d.clap.dazeS }, a.dir, flash))
          host.emit({ kind: 'impact', ability: a.def.id, look: a.def.look, vfx: a.def.vfx, sfx: a.def.sfx.impact, x: target.x, y: target.y, radiusM: 0.9 });
      }
      if (a.t >= d.clap.dazeS) {
        a.phase = 'grab';
        a.t = 0;
      }
      return false;
    }
    if (a.phase === 'grab') {
      // The lower hands take a leg: the body is drawn out to arm's length and lifted off the floor.
      const k = Math.min(1, a.t / d.grabS);
      placeAt(around(a.angle0, front + (d.orbitM - front) * k), 0.15 + (d.liftM * 0.5 - 0.15) * k);
      if (a.t >= d.grabS) {
        a.phase = 'spin';
        a.t = 0;
      }
      return false;
    }
    const ang = swingAngle();
    const u = Math.min(1, a.t / a.spinS);
    placeAt(around(ang, d.orbitM), d.liftM * (0.5 + 0.5 * Math.min(1, u * 3)));
    host.face?.(a.casterId, { x: Math.cos(ang), y: Math.sin(ang) });
    if (u < 1) return false;
    // Let go: the body flies off along the aim.
    host.face?.(a.casterId, a.dir);
    host.hold?.(a.targetId, d.launch.maxDistM / d.launch.speedMps + 0.5);
    host.emit({ kind: 'release', ability: a.def.id, look: a.def.look, vfx: a.def.vfx, sfx: a.def.sfx.release, x: target.x, y: target.y });
    this.actions.push({
      kind: 'fling',
      casterId: a.casterId,
      targetId: a.targetId,
      def: a.def,
      dir: a.dir,
      ageS: 0,
      travelledM: 0,
      lastX: target.x,
      lastY: target.y,
      blocked: false,
    });
    return true;
  }

  /** The flung body: it flies its distance (or until it hits something), then lands hard for more damage the further it flew. */
  private stepFling(a: FlingAction, dtS: number, host: AbilityHost): boolean {
    const d = a.def.delivery;
    if (d.type !== 'spin') return true;
    const target = host.fighters().find((f) => f.id === a.targetId);
    if (!target?.hittable) return true;
    a.ageS += dtS;
    const moved = Math.hypot(target.x - a.lastX, target.y - a.lastY);
    a.lastX = target.x;
    a.lastY = target.y;
    a.travelledM += moved;
    // It meets a wall or something heavy when it covers well under what it should this step.
    if (a.ageS > 0.1 && moved < d.launch.speedMps * dtS * 0.3) a.blocked = true;
    // Furniture in its way is shoved and broken as it ploughs through.
    host.hitEnvironment(a.casterId, { x: target.x, y: target.y }, 0.8, { ...a.def.payload, heavy: true }, a.dir, true);
    if (!a.blocked && a.travelledM < d.launch.maxDistM && a.ageS < 3) {
      host.drive(
        a.targetId,
        { x: a.dir.x * d.launch.speedMps, y: a.dir.y * d.launch.speedMps },
        this.flingHeightM(d, a.travelledM),
      );
      return false;
    }
    host.drive(a.targetId, null, 0);
    const damage = d.launch.baseDamage + d.launch.damagePerM * a.travelledM + (a.blocked ? d.launch.collisionDamage : 0);
    this.hit(host, a.casterId, a.targetId, { ...a.def.payload, damage, heavy: true, knockbackMps: a.blocked ? 1 : 2.5 }, a.dir, a.def.look?.hitFlash);
    if (a.blocked) host.hitEnvironment(a.casterId, { x: target.x, y: target.y }, 1.3, { ...a.def.payload, damage: d.launch.collisionDamage }, { x: 0, y: 0 }, false);
    host.emit({ kind: 'impact', ability: a.def.id, look: a.def.look, vfx: a.def.vfx, sfx: a.def.sfx.impact, x: target.x, y: target.y, radiusM: a.blocked ? 2 : 1.4 });
    return true;
  }

  private stepDash(a: DashAction, dtS: number, host: AbilityHost): boolean {
    const d = a.def.delivery;
    if (d.type !== 'dash') return true;
    const at = host.position(a.casterId);
    const movedM = Math.hypot(at.x - a.lastX, at.y - a.lastY);
    a.ageS += dtS;
    // Fire trail behind, laid by distance actually travelled (a wall stops the dash; the trail stops too).
    a.sinceTrailM += movedM;
    a.lastX = at.x;
    a.lastY = at.y;
    if (d.trail && a.sinceTrailM >= TRAIL_SPACING_M) {
      a.sinceTrailM = 0;
      this.zones.push({
        casterId: a.casterId,
        x: at.x,
        y: at.y,
        radiusM: d.trail.radiusM,
        lifeS: d.trail.lifeS,
        ageS: 0,
        burn: d.trail.burn,
      });
    }
    if (d.slide && a.sinceTrailM >= TRAIL_SPACING_M * 0.5) {
      a.sinceTrailM = 0;
      this.slideTrail.push({ casterId: a.casterId, x: at.x, y: at.y, ageS: 0, lifeS: d.slide.trailLifeS });
    }
    if (d.afterimages) {
      // Afterimages left exactly along the path he really travels, one every spacingM metres.
      a.sinceImageM += movedM;
      if (a.sinceImageM >= d.afterimages.spacingM) {
        a.sinceImageM = 0;
        this.decoys.push({
          casterId: a.casterId,
          def: a.def,
          x: at.x,
          y: at.y,
          dir: a.dir,
          ageS: 0,
          lifeS: d.afterimages.lifeS,
        });
      }
    }
    // A dash with no hit radius (Vapour Step) is a reposition: it hits nobody and nothing on the way.
    if (d.hitRadiusM <= 0) {
      a.remainingS -= dtS;
      if (a.remainingS <= 0) return true;
      host.drive(a.casterId, { x: a.dir.x * d.speedMps, y: a.dir.y * d.speedMps }, 0);
      return false;
    }
    for (const f of host.fighters()) {
      if (this.friendly(f, a.casterId, host) || !f.hittable || a.hit.has(f.id)) continue;
      if (Math.hypot(f.x - at.x, f.y - at.y) > d.hitRadiusM + f.radiusM) continue;
      a.hit.add(f.id);
      if (this.hit(host, a.casterId, f.id, a.def.payload, a.dir, a.def.look?.hitFlash)) {
        host.emit({
          kind: 'impact',
          ability: a.def.id,
          look: a.def.look,
          vfx: a.def.vfx,
          sfx: a.def.sfx.impact,
          x: f.x,
          y: f.y,
          radiusM: d.collision?.radiusM ?? 0.7,
        });
        if (d.collision) return true; // a body charge stops dead in the target
      }
    }
    // Held up (barely moved last step although driven at full speed): smash what is in front. A
    // charge that runs until blocked keeps going if it gives (furniture, a breakable section); it
    // stops once something has held it for a moment (a solid wall).
    const held = d.collision && a.ageS > 0.1 && movedM < d.speedMps * dtS * 0.3;
    a.stuckS = held ? a.stuckS + dtS : 0;
    if (held && d.untilBlocked && a.stuckS < CHARGE_STUCK_S) {
      const front = { x: at.x + a.dir.x * 0.6, y: at.y + a.dir.y * 0.6 };
      host.hitEnvironment(a.casterId, front, d.hitRadiusM, a.def.payload, a.dir, false);
      host.drive(a.casterId, { x: a.dir.x * d.speedMps, y: a.dir.y * d.speedMps }, 0);
      return false;
    }
    if (held && d.collision) {
      const front = { x: at.x + a.dir.x * 0.6, y: at.y + a.dir.y * 0.6 };
      if (!d.untilBlocked) host.hitEnvironment(a.casterId, front, d.hitRadiusM, a.def.payload, a.dir, false);
      host.emit({
        kind: 'impact',
        ability: a.def.id,
        look: a.def.look,
        vfx: a.def.vfx,
        sfx: a.def.sfx.impact,
        x: front.x,
        y: front.y,
        radiusM: d.collision.radiusM,
      });
      return true;
    }
    host.hitEnvironment(
      a.casterId,
      { x: at.x + a.dir.x * 0.4, y: at.y + a.dir.y * 0.4 },
      d.hitRadiusM,
      a.def.payload,
      a.dir,
      true,
    );
    a.remainingS -= dtS;
    if (a.remainingS <= 0) return true;
    host.drive(a.casterId, { x: a.dir.x * d.speedMps, y: a.dir.y * d.speedMps }, 0);
    return false;
  }

  /**
   * Final Judgement: rush in, cut `strikes` times with nothing landing, return to the start, then after a beat every cut
   * lands at once as one blow with a finishing flash.
   */
  private stepJudgement(a: JudgementAction, dtS: number, host: AbilityHost): boolean {
    const d = a.def.delivery;
    if (d.type !== 'judgement') return true;
    a.t += dtS;
    const me = host.position(a.casterId);
    const foe = a.targetId ? host.fighters().find((f) => f.id === a.targetId) : undefined;
    if (a.phase === 'rush') {
      if (!foe?.hittable) return true;
      const gap = Math.hypot(foe.x - me.x, foe.y - me.y) - foe.radiusM;
      if (gap <= 1.0 || a.t > 0.45) {
        host.drive(a.casterId, null, 0);
        a.phase = 'cut';
        a.t = 0;
        return false;
      }
      const dir = norm({ x: foe.x - me.x, y: foe.y - me.y });
      host.drive(a.casterId, { x: dir.x * 28, y: dir.y * 28 }, 0);
      return false;
    }
    if (a.phase === 'cut') {
      host.face?.(a.casterId, foe ? norm({ x: foe.x - me.x, y: foe.y - me.y }) : { x: 1, y: 0 });
      while (a.cuts < d.strikes && a.t >= a.cuts * d.strikeIntervalS) {
        a.cuts++;
        const at = foe ?? me;
        host.emit({
          kind: 'release',
          ability: a.def.id,
          look: a.def.look,
          vfx: 'judgement-cut',
          sfx: a.def.sfx.release,
          x: at.x,
          y: at.y,
        });
      }
      if (a.cuts < d.strikes || a.t < d.strikes * d.strikeIntervalS) return false;
      // Back to where he began, unseen: the cuts are done and nothing has landed yet (Lightning Execution: he strikes from above next).
      host.teleport?.(a.casterId, a.origin);
      host.drive(a.casterId, null, 0);
      a.phase = 'wait';
      a.t = 0;
      return false;
    }
    if (a.t < d.resolveDelayS) return false;
    if (d.dive && foe?.hittable) {
      // Lightning Execution: he reappears above the target, dives, and the floor blast throws everyone near it away.
      const spot = host.teleport?.(a.casterId, { x: foe.x - 0.9, y: foe.y }) ?? { x: foe.x, y: foe.y };
      host.face?.(a.casterId, norm({ x: foe.x - spot.x, y: foe.y - spot.y }));
      const def = {
        ...a.def,
        payload: {
          ...a.def.payload,
          damage: a.def.payload.damage * d.strikes,
          knockbackMps: d.dive.knockbackMps,
          heavy: true,
        },
      };
      this.blast(a.casterId, def, { x: foe.x, y: foe.y }, d.dive.radiusM, host);
      return true;
    }
    // All the cuts land together.
    if (foe?.hittable) {
      const payload = { ...a.def.payload, damage: a.def.payload.damage * d.strikes };
      this.hit(
        host,
        a.casterId,
        foe.id,
        payload,
        norm({ x: foe.x - a.origin.x, y: foe.y - a.origin.y }),
        a.def.look?.hitFlash,
      );
      host.emit({
        kind: 'impact',
        ability: a.def.id,
        look: a.def.look,
        vfx: a.def.vfx,
        sfx: a.def.sfx.impact,
        x: foe.x,
        y: foe.y,
        radiusM: 2.2,
      });
    }
    return true;
  }

  private stepAssault(a: AssaultAction, dtS: number, host: AbilityHost): boolean {
    const d = a.def.delivery;
    if (d.type !== 'assault') return true;
    a.t += dtS;
    const at = host.position(a.casterId);
    const foe = a.targetId ? host.fighters().find((f) => f.id === a.targetId) : undefined;
    if (foe && a.phase !== 'retreat') a.dir = norm({ x: foe.x - at.x, y: foe.y - at.y });
    if (a.phase === 'approach') {
      const gap = foe ? Math.hypot(foe.x - at.x, foe.y - at.y) - foe.radiusM : 0;
      if ((foe && gap <= d.reachM * 0.8) || a.t >= d.maxApproachS || !foe?.hittable) {
        a.phase = 'stab';
        a.t = d.stabIntervalS; // the first stab lands at once
      } else {
        host.drive(a.casterId, { x: a.dir.x * d.approachSpeedMps, y: a.dir.y * d.approachSpeedMps }, 0);
        return false;
      }
    }
    if (a.phase === 'stab') {
      host.drive(a.casterId, { x: 0, y: 0 }, 0); // planted while he stabs
      if (a.t >= d.stabIntervalS && a.stabs < d.stabs) {
        a.t = 0;
        a.stabs++;
        let from = at;
        if (d.zigzag && foe?.hittable) {
          // Voltage Rush: a different side of the target for every blow, an afterimage where he was.
          const ang = a.stabs * 2.4 + 0.6;
          const r = d.zigzag.radiusM + foe.radiusM;
          let spot = { x: foe.x + Math.cos(ang) * r, y: foe.y + Math.sin(ang) * r };
          const wall = host.blocked({ x: foe.x, y: foe.y }, spot);
          if (wall !== null) spot = { x: foe.x + (spot.x - foe.x) * wall * 0.8, y: foe.y + (spot.y - foe.y) * wall * 0.8 };
          this.decoys.push({ casterId: a.casterId, def: a.def, x: at.x, y: at.y, dir: a.dir, ageS: 0, lifeS: d.zigzag.lifeS });
          const landed = host.teleport?.(a.casterId, spot) ?? null;
          if (landed) {
            from = landed;
            a.dir = norm({ x: foe.x - landed.x, y: foe.y - landed.y });
            host.face?.(a.casterId, a.dir);
          }
        }
        this.stab(a, from, host);
      } else if (a.stabs >= d.stabs && a.t >= d.stabIntervalS * 0.6) {
        if (!d.retreat) return true;
        a.phase = 'retreat';
        a.t = 0;
        a.dir = { x: -a.dir.x, y: -a.dir.y };
      }
      return false;
    }
    // Retreat: straight back, away from the enemy.
    const r = d.retreat!;
    if (a.t >= r.distanceM / r.speedMps) return true;
    host.drive(a.casterId, { x: a.dir.x * r.speedMps, y: a.dir.y * r.speedMps }, 0);
    return false;
  }

  /** One stab of a knife assault: everyone in reach straight ahead is hit (once per stab). */
  private stab(a: AssaultAction, at: Vec2, host: AbilityHost): void {
    const d = a.def.delivery;
    if (d.type !== 'assault') return;
    const reach = { x: at.x + a.dir.x * d.reachM, y: at.y + a.dir.y * d.reachM };
    let landed = false;
    for (const f of host.fighters()) {
      if (this.friendly(f, a.casterId, host) || !f.hittable) continue;
      if (segmentDistance(at, reach, f) > d.radiusM + f.radiusM) continue;
      const last = a.stabs >= d.stabs && d.finalFactor !== undefined;
      const payload = last
        ? {
            ...a.def.payload,
            damage: Math.round(a.def.payload.damage * d.finalFactor!),
            knockbackMps: a.def.payload.knockbackMps * d.finalFactor!,
          }
        : a.def.payload;
      if (this.hit(host, a.casterId, f.id, payload, a.dir, a.def.look?.hitFlash)) {
        landed = true;
        host.emit({
          kind: 'impact',
          ability: a.def.id,
          look: a.def.look,
          vfx: a.def.vfx,
          sfx: d.stabSfx?.[(a.stabs - 1) % d.stabSfx.length] ?? a.def.sfx.impact,
          x: f.x,
          y: f.y,
          radiusM: 0.6,
          stab: a.stabs,
          dirX: a.dir.x,
          dirY: a.dir.y,
        });
      }
    }
    if (!landed)
      host.emit({
        kind: 'release',
        ability: a.def.id,
        look: a.def.look,
        vfx: `${a.def.vfx}-whiff`,
        sfx: d.stabSfx?.[(a.stabs - 1) % d.stabSfx.length] ?? a.def.sfx.release,
        x: reach.x,
        y: reach.y,
      });
  }

  private stepLeap(a: LeapAction, dtS: number, host: AbilityHost): boolean {
    const d = a.def.delivery;
    if (d.type !== 'leap') return true;
    if (a.delayS > 0) {
      a.delayS -= dtS; // the sickle is biting into the ground: nothing moves yet
      return false;
    }
    a.t += dtS;
    const vol = d.volley;
    if (vol && a.volleyDef) {
      // The storm: volleys at even times while he hangs in the air, each fan sweeping a little further round.
      const due = (i: number) => vol.fromS + ((vol.untilS - vol.fromS) * i) / Math.max(1, vol.count - 1);
      while (a.volleysFired < vol.count && a.t >= due(a.volleysFired)) {
        const at = host.position(a.casterId);
        const sweep = vol.count > 1 ? (a.volleysFired / (vol.count - 1)) * vol.sweepRad : 0;
        for (let b = 0; b < vol.blades; b++) {
          const dir = rotate(a.baseDir, sweep + (b / vol.blades) * Math.PI * 2);
          this.projectiles.push({
            casterId: a.casterId,
            def: a.volleyDef,
            x: at.x + dir.x * MUZZLE_M,
            y: at.y + dir.y * MUZZLE_M,
            dir,
            travelledM: 0,
            trail: [],
          });
        }
        host.emit({
          kind: 'release',
          ability: a.def.id,
          look: a.def.look,
          vfx: 'tempest-volley',
          sfx: a.def.sfx.release,
          x: at.x,
          y: at.y,
        });
        a.volleysFired++;
      }
    }
    if (a.t >= a.form.airS) {
      // Slam down where the caster actually is (the telegraph showed the planned spot).
      const at = host.position(a.casterId);
      const e = a.empowered ? d.empowered : undefined;
      // The empowered smash hits harder and lands with its own look, on the same small radius.
      const def = e
        ? { ...a.def, vfx: e.vfx, look: e.look, payload: { ...a.def.payload, damage: a.def.payload.damage * e.damageFactor } }
        : a.def;
      this.blast(a.casterId, def, at, d.radiusM, host);
      const ti = this.telegraphs.indexOf(a.telegraph);
      if (ti >= 0) this.telegraphs.splice(ti, 1);
      return true;
    }
    const k = d.swoop ? swoopSpeedFactor(Math.min(1, a.t / a.form.airS)) : 1;
    const v = { x: ((a.to.x - a.from.x) / a.form.airS) * k, y: ((a.to.y - a.from.y) / a.form.airS) * k };
    host.drive(a.casterId, v, this.liftOf(a.casterId));
    return false;
  }

  /**
   * Mindstorm: while the ring builds, objects hurled from the field fly at enemies inside it, evenly from half a second in
   * to a fifth of a second before the end (each aimed at an enemy in the ring, round by round, or outward if there is none).
   */
  private stepVolley(t: Telegraph, host: AbilityHost): void {
    const d = t.def.delivery;
    if (d.type !== 'nova' || !d.volley) return;
    const v = d.volley;
    const from = 0.5;
    const until = Math.max(from, t.durationS - 0.2);
    while ((t.volleysFired ?? 0) < v.count) {
      const k = t.volleysFired ?? 0;
      if (t.ageS < from + ((until - from) * k) / Math.max(1, v.count - 1)) return;
      t.volleysFired = k + 1;
      const foes = host
        .fighters()
        .filter(
          (f) => !this.friendly(f, t.casterId, host) && f.hittable && Math.hypot(f.x - t.x, f.y - t.y) <= t.radiusM + 1,
        );
      const ang = (k * 2.399) % (Math.PI * 2); // spread the launch points round the ring
      const origin = { x: t.x + Math.cos(ang) * t.radiusM * 0.6, y: t.y + Math.sin(ang) * t.radiusM * 0.6 };
      const target = foes.length > 0 ? foes[k % foes.length]! : undefined;
      const dir = target
        ? norm({ x: target.x - origin.x, y: target.y - origin.y })
        : { x: Math.cos(ang), y: Math.sin(ang) };
      this.projectiles.push({
        casterId: t.casterId,
        def: {
          ...t.def,
          payload: v.payload,
          delivery: { type: 'projectile', speedMps: v.speedMps, radiusM: v.radiusM, maxRangeM: v.maxRangeM },
        },
        x: origin.x,
        y: origin.y,
        dir,
        travelledM: 0,
        trail: [],
      });
      host.emit({
        kind: 'release',
        ability: t.def.id,
        look: t.def.look,
        vfx: 'mindstorm-launch',
        sfx: t.def.sfx.release,
        x: origin.x,
        y: origin.y,
      });
    }
  }

  private updateTelegraphs(dtS: number, host: AbilityHost): void {
    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      // A blast can cancel other casters' telegraphs, so the list may shrink by more than one entry.
      const t = this.telegraphs[i];
      if (!t) continue;
      t.ageS += dtS;
      if (t.onCaster) {
        const at = host.position(t.casterId);
        t.x = at.x;
        t.y = at.y;
      }
      this.stepVolley(t, host);
      // Leap telegraphs are resolved by the leap itself; rings erupt when their warning ends.
      if ((!t.onCaster && !t.erupts) || t.ageS < t.durationS) continue;
      this.telegraphs.splice(i, 1);
      this.blast(t.casterId, t.def, t, t.radiusM, host);
    }
  }

  /** An area impact: every fighter inside (except the caster) and every prop and door touching it. */
  private blast(casterId: string, def: AbilityDef, at: Vec2, radiusM: number, host: AbilityHost): void {
    for (const f of host.fighters()) {
      if (this.friendly(f, casterId, host) || !f.hittable) continue;
      const dist = Math.hypot(f.x - at.x, f.y - at.y);
      if (dist > radiusM + f.radiusM) continue;
      // Closer to the centre of the blast hits harder (distance falloff, owner 11/11/2026).
      const payload = payloadAt(def.payload, dist, radiusM + f.radiusM);
      this.hit(host, casterId, f.id, payload, norm({ x: f.x - at.x, y: f.y - at.y }), def.look?.hitFlash);
    }
    host.hitEnvironment(casterId, at, radiusM, def.payload, { x: 0, y: 0 }, false);
    host.emit({
      kind: 'impact',
      ability: def.id,
      look: def.look,
      vfx: def.vfx,
      sfx: def.sfx.impact,
      x: at.x,
      y: at.y,
      radiusM,
    });
  }

  /** Puts a cloud down. A fighter the shot already struck counts as hit by it (one application per target). */
  private spawnCloud(
    casterId: string,
    def: AbilityDef,
    at: Vec2,
    spec: CloudSpec,
    host: AbilityHost,
    alreadyHitId?: string,
  ): void {
    this.clouds.push({
      casterId,
      def,
      x: at.x,
      y: at.y,
      radiusM: spec.radiusM,
      lifeS: spec.lifeS,
      armS: spec.armS ?? 0,
      ageS: 0,
      hit: new Set(alreadyHitId ? [alreadyHitId] : []),
      dwellS: new Map(),
      outS: new Map(),
      ...(spec.fog ? { fog: spec.fog } : {}),
      ...(spec.mine ? { mine: { ...spec.mine, dormantS: 0 } } : {}),
    });
    if (spec.mine) {
      // A caster keeps only so many mines out: the oldest is taken up.
      const own = this.clouds.filter((c) => c.casterId === casterId && c.mine);
      for (const old of own.slice(0, Math.max(0, own.length - spec.mine.maxPerCaster)))
        this.clouds.splice(this.clouds.indexOf(old), 1);
      host.emit({
        kind: 'release',
        ability: def.id,
        look: def.look,
        vfx: 'mine-set',
        sfx: def.sfx.release,
        x: at.x,
        y: at.y,
      });
      return;
    }
    host.emit({
      kind: 'impact',
      ability: def.id,
      look: def.look,
      vfx: def.vfx,
      sfx: def.sfx.impact,
      x: at.x,
      y: at.y,
      radiusM: spec.radiusM * 0.5,
    });
  }

  private updateMarks(dtS: number, host: AbilityHost): void {
    for (let i = this.marks.length - 1; i >= 0; i--) {
      const m = this.marks[i]!;
      const foe = host.fighters().find((f) => f.id === m.targetId);
      const me = host.fighters().find((f) => f.id === m.casterId);
      // The mark ends with either fighter down or gone.
      if (!foe?.hittable || !me?.hittable) {
        this.marks.splice(i, 1);
        continue;
      }
      m.ageS += dtS;
      if (m.phase !== 'stalk') continue;
      m.leftS -= dtS;
      if (m.leftS <= 0) {
        m.phase = 'ready';
        host.emit({
          kind: 'impact',
          ability: m.def.id,
          look: m.def.look,
          vfx: 'death-mark-ready',
          sfx: 'mark-ready',
          x: me.x,
          y: me.y,
          radiusM: 1,
        });
      }
    }
  }

  /** Where a Crystal Slide stopped, crystal thorns warn and then erupt: a blast with their own payload. */
  private slideThorns(a: Extract<Action, { kind: 'dash' }>, host: AbilityHost): void {
    const d = a.def.delivery;
    if (d.type !== 'dash' || !d.slide) return;
    const at = host.position(a.casterId);
    const thorns = d.slide.thorns;
    const def: AbilityDef = {
      ...a.def,
      payload: thorns.payload,
      vfx: 'crystal-thorns',
      sfx: { ...a.def.sfx, impact: 'thorns-burst' },
    };
    this.telegraphs.push({
      casterId: a.casterId,
      def,
      x: at.x,
      y: at.y,
      radiusM: thorns.radiusM,
      durationS: thorns.warnS,
      ageS: 0,
      onCaster: false,
      erupts: true,
    });
    host.emit({
      kind: 'telegraph',
      ability: def.id,
      look: def.look,
      vfx: def.vfx,
      sfx: null,
      x: at.x,
      y: at.y,
      radiusM: thorns.radiusM,
    });
  }

  /**
   * Crystal Groundstrike: `count` separate zones, each at its own random spot round the nearest enemy (or the caster), inside the
   * arena and apart from each other, each its own telegraph that erupts as its own blast.
   */
  private spawnEruptions(
    casterId: string,
    def: AbilityDef,
    d: Extract<AbilityDef['delivery'], { type: 'eruptions' }>,
    host: AbilityHost,
    dir: Vec2,
  ): void {
    const at = host.position(casterId);
    const foe = this.nearestEnemy(casterId, at, Math.max(def.aimRangeM, d.spreadM), host);
    const centre = foe ? { x: foe.x, y: foe.y } : at;
    const spots: Vec2[] = [];
    const apart = d.radiusM * 1.6;
    if (d.line) {
      // A wave of fractures running straight away from him along his aim, stopping short of any wall.
      for (let k = 0; k < d.count; k++) {
        const reach = d.line.startM + k * apart;
        const p = { x: at.x + dir.x * reach, y: at.y + dir.y * reach };
        if (host.blocked(at, p) !== null || (host.standable && !host.standable(p))) break;
        spots.push(p);
      }
    }
    for (let k = 0; d.line === undefined && k < d.count; k++) {
      let spot: Vec2 | null = null;
      for (let tries = 0; tries < 64 && !spot; tries++) {
        // The first tries stay near the enemy; later ones widen, so four zones always fit.
        const reach = d.spreadM * (0.35 + 0.65 * Math.min(1, tries / 24));
        const ang = this.rng() * Math.PI * 2;
        const r = reach * (0.3 + 0.7 * this.rng());
        const p = { x: centre.x + Math.cos(ang) * r, y: centre.y + Math.sin(ang) * r };
        const fromMe = Math.hypot(p.x - at.x, p.y - at.y);
        if (fromMe < 1.2 || (tries < 56 && fromMe > def.aimRangeM + 1.5)) continue; // within his attack range, never right on top of him
        if (host.standable && !host.standable(p)) continue;
        if (tries < 56 && spots.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < apart)) continue;
        spot = p;
      }
      spots.push(spot ?? { x: centre.x + (k % 2 === 0 ? 1 : -1) * apart, y: centre.y + (k < 2 ? 1 : -1) * apart });
    }
    spots.forEach((p, k) => {
      const delay = k * d.staggerS;
      this.telegraphs.push({
        casterId,
        def,
        x: p.x,
        y: p.y,
        radiusM: d.radiusM,
        durationS: d.warnS + delay,
        ageS: 0,
        onCaster: false,
        erupts: true,
      });
      host.emit({
        kind: 'telegraph',
        ability: def.id,
        look: def.look,
        vfx: def.vfx,
        sfx: null,
        x: p.x,
        y: p.y,
        radiusM: d.radiusM,
      });
    });
  }

  /** Crystal Prison: forming, then locked on (or escaped), then released when the host says the legs are free. */
  private updatePrisons(dtS: number, host: AbilityHost): void {
    for (let i = this.prisons.length - 1; i >= 0; i--) {
      const pr = this.prisons[i]!;
      const d = pr.def.delivery;
      const target = host.fighters().find((f) => f.id === pr.targetId);
      const state = host.legTrapState?.(pr.targetId);
      if (d.type !== 'legTrap' || !target || !target.hittable || !state) {
        host.trap?.(pr.targetId, 0);
        this.prisons.splice(i, 1);
        continue;
      }
      pr.ageS += dtS;
      if (pr.phase === 'form') {
        // PR5 (owner 21/11/2026): grounded targets only. A real jump, leap or launch off the floor during the short
        // activation window (or at the moment the crystals lock) misses; cosmetic hover is not height (D3).
        if (state.heightM > 0.25) pr.jumped = true;
        if (pr.ageS < d.reactS) continue;
        if (pr.jumped) {
          host.emit({
            kind: 'fizzle',
            ability: pr.def.id,
            look: pr.def.look,
            vfx: 'prison-miss',
            sfx: null,
            x: target.x,
            y: target.y,
          });
          this.prisons.splice(i, 1);
          continue;
        }
        pr.phase = 'held';
        host.trap?.(pr.targetId, d.holdS);
        host.emit({
          kind: 'impact',
          ability: pr.def.id,
          look: pr.def.look,
          vfx: 'prison-lock',
          sfx: pr.def.sfx.impact,
          x: target.x,
          y: target.y,
          radiusM: 1.1,
        });
      } else if (state.trappedS <= 0) {
        host.emit({
          kind: 'impact',
          ability: pr.def.id,
          look: pr.def.look,
          vfx: 'prison-shatter',
          sfx: 'prison-shatter',
          x: target.x,
          y: target.y,
          radiusM: 1.3,
        });
        this.prisons.splice(i, 1);
      }
    }
  }

  /** The fist: out along the aim, one blow to each enemy it passes, a beat at full reach, then back. */
  private stepFist(a: FistAction, dtS: number, host: AbilityHost): boolean {
    const d = a.def.delivery;
    if (d.type !== 'fist') return true;
    a.ageS += dtS;
    const hold = 0.12;
    const total = d.outS + hold + d.backS;
    const out = Math.min(1, a.ageS / d.outS);
    const back = a.ageS <= d.outS + hold ? 0 : Math.min(1, (a.ageS - d.outS - hold) / d.backS);
    const prev = a.extentM;
    a.extentM = d.reachM * (out * (1 - back));
    const at = host.position(a.casterId);
    host.drive(a.casterId, { x: 0, y: 0 }, 0); // planted while the fist is out
    if (a.ageS <= d.outS + hold) {
      const from = { x: at.x + a.dir.x * prev, y: at.y + a.dir.y * prev };
      const to = { x: at.x + a.dir.x * a.extentM, y: at.y + a.dir.y * a.extentM };
      for (const f of host.fighters()) {
        if (a.hit.has(f.id) || this.friendly(f, a.casterId, host) || !f.hittable) continue;
        if (segmentDistance(from, to, f) > d.radiusM + f.radiusM) continue;
        if (!this.hit(host, a.casterId, f.id, a.def.payload, a.dir, a.def.look?.hitFlash)) continue;
        a.hit.add(f.id);
        host.emit({
          kind: 'impact',
          ability: a.def.id,
          look: a.def.look,
          vfx: a.def.vfx,
          sfx: a.def.sfx.impact,
          x: f.x,
          y: f.y,
          radiusM: 0.8,
          dirX: a.dir.x,
          dirY: a.dir.y,
        });
      }
      const wall = host.blocked(from, to);
      if (wall !== null) {
        const hitAt = { x: from.x + (to.x - from.x) * wall, y: from.y + (to.y - from.y) * wall };
        host.hitEnvironment(a.casterId, hitAt, d.radiusM, a.def.payload, a.dir, false);
        a.extentM = Math.max(0, prev); // stops against the obstacle and comes back
        a.ageS = Math.max(a.ageS, d.outS + hold);
      }
    }
    return a.ageS >= total;
  }

  /** Time: record where everyone stands, let afterimages fade, and run the Rewind Time and Age Acceleration timers. */
  private updateTime(dtS: number, host: AbilityHost): void {
    this.historyDueS -= dtS;
    if (this.historyDueS <= 0) {
      this.historyDueS = 0.1;
      for (const f of host.fighters()) {
        const trail = this.history.get(f.id) ?? [];
        trail.push({ t: this.nowS, x: f.x, y: f.y });
        while (trail.length > 0 && trail[0]!.t < this.nowS - 6) trail.shift();
        this.history.set(f.id, trail);
      }
    }
    for (let i = this.decoys.length - 1; i >= 0; i--) {
      const dc = this.decoys[i]!;
      dc.ageS += dtS;
      if (dc.ageS >= dc.lifeS) this.decoys.splice(i, 1);
    }
    for (let i = this.ages.length - 1; i >= 0; i--) {
      const ag = this.ages[i]!;
      ag.ageS += dtS;
      const target = host.fighters().find((f) => f.id === ag.targetId);
      if (ag.ageS >= ag.durationS || !target) this.ages.splice(i, 1);
    }
    for (let i = this.rewinds.length - 1; i >= 0; i--) {
      const r = this.rewinds[i]!;
      const d = r.def.delivery;
      if (d.type !== 'rewindTime') continue;
      if (r.replayLeftS > 0) {
        r.replayLeftS -= dtS;
        if (r.replayLeftS <= 0) this.rewinds.splice(i, 1);
        continue;
      }
      r.ageS += dtS;
      r.sinceSampleS += dtS;
      if (r.sinceSampleS >= 0.1) {
        r.sinceSampleS = 0;
        const p = host.position(r.casterId);
        r.path.push({ x: p.x, y: p.y });
      }
      if (r.ageS < d.durationS) continue;
      // Time runs back: if he is still standing he returns to where he started and recovers part of what he dealt.
      const here = host.position(r.casterId);
      const alive = host.heal?.(r.casterId, Math.round(r.dealt * d.healFactor)) ?? false;
      if (!alive) {
        this.rewinds.splice(i, 1);
        continue;
      }
      r.path.push({ x: here.x, y: here.y });
      host.teleport?.(r.casterId, r.origin);
      host.emit({
        kind: 'impact',
        ability: r.def.id,
        look: r.def.look,
        vfx: 'rewind-from',
        sfx: r.def.sfx.impact,
        x: here.x,
        y: here.y,
        radiusM: 1,
      });
      host.emit({
        kind: 'impact',
        ability: r.def.id,
        look: r.def.look,
        vfx: 'rewind-to',
        sfx: null,
        x: r.origin.x,
        y: r.origin.y,
        radiusM: 1,
      });
      r.replayTotalS = 0.7;
      r.replayLeftS = 0.7;
    }
  }

  /** Drones: follow their owner, loose shots at the nearest enemy in range, wear down under enemy fire, expire. */
  private updateDrones(dtS: number, host: AbilityHost): void {
    for (let i = this.drones.length - 1; i >= 0; i--) {
      const dr = this.drones[i]!;
      const d = dr.def.delivery;
      if (d.type !== 'drone') continue;
      dr.ageS += dtS;
      const owner = host.fighters().find((f) => f.id === dr.casterId);
      if (dr.ageS >= d.durationS || dr.hp <= 0 || !owner || !owner.hittable) {
        const fell = dr.hp <= 0;
        this.drones.splice(i, 1);
        host.emit({
          kind: 'impact',
          ability: dr.def.id,
          look: dr.def.look,
          vfx: fell ? 'drone-down' : 'drone-recall',
          sfx: dr.def.sfx.impact,
          x: dr.x,
          y: dr.y,
          radiusM: 0.5,
        });
        continue;
      }
      // Hover to the owner's shoulder, trailing a little.
      const bob = Math.sin(dr.ageS * 3) * 0.08;
      const want = { x: owner.x - 0.5, y: owner.y - 0.9 + bob };
      const k = Math.min(1, dtS * 5);
      dr.x += (want.x - dr.x) * k;
      dr.y += (want.y - dr.y) * k;
      // Enemy shots that reach it wear it down.
      for (let j = this.projectiles.length - 1; j >= 0; j--) {
        const p = this.projectiles[j]!;
        if (this.friendly({ id: p.casterId, x: 0, y: 0, radiusM: 0, hittable: true }, dr.casterId, host)) continue;
        if (Math.hypot(p.x - dr.x, p.y - dr.y) > 0.45) continue;
        dr.hp -= p.def.payload.damage;
        this.projectiles.splice(j, 1);
        host.emit({
          kind: 'impact',
          ability: dr.def.id,
          look: dr.def.look,
          vfx: 'drone-hit',
          sfx: dr.def.sfx.impact,
          x: dr.x,
          y: dr.y,
          radiusM: 0.3,
        });
      }
      dr.fireInS -= dtS;
      if (dr.fireInS > 0) continue;
      const foe = this.nearestEnemy(dr.casterId, dr, d.rangeM, host);
      if (!foe || host.blocked({ x: dr.x, y: dr.y }, foe) !== null) continue;
      dr.fireInS = d.intervalS;
      const dir = norm({ x: foe.x - dr.x, y: foe.y - dr.y });
      dr.aimX = dir.x;
      dr.aimY = dir.y;
      this.projectiles.push({
        casterId: dr.casterId,
        def: {
          ...dr.def,
          id: `${dr.def.id}-shot`,
          payload: d.shot.payload,
          delivery: { type: 'projectile', speedMps: d.shot.speedMps, radiusM: d.shot.radiusM, maxRangeM: d.rangeM + 2 },
        },
        x: dr.x + dir.x * 0.3,
        y: dr.y + dir.y * 0.3,
        dir,
        travelledM: 0,
        trail: [],
      });
      host.emit({
        kind: 'release',
        ability: dr.def.id,
        look: dr.def.look,
        vfx: 'drone-shot',
        sfx: 'drone-fire',
        x: dr.x,
        y: dr.y,
      });
    }
  }

  private updateClouds(dtS: number, host: AbilityHost): void {
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const c = this.clouds[i]!;
      if (c.mine) {
        // Dormant: nobody has stepped on it yet. It waits, arms, then goes off under the first enemy to come close.
        c.mine.dormantS += dtS;
        if (c.mine.dormantS >= c.mine.waitS) {
          this.clouds.splice(i, 1);
          continue;
        }
        if (c.mine.dormantS < c.armS) continue;
        if (c.mine.magnet) host.attract?.({ x: c.x, y: c.y }, c.mine.magnet.radiusM, c.mine.magnet.pullStrength * dtS);
        const foot = host
          .fighters()
          .find(
            (f) =>
              f.hittable &&
              !this.friendly(f, c.casterId, host) &&
              Math.hypot(f.x - c.x, f.y - c.y) <= c.mine!.triggerRadiusM + f.radiusM,
          );
        if (!foot) continue;
        const magnet = c.mine.magnet;
        c.pullIn = magnet !== undefined;
        c.mine = undefined;
        c.armS = 0;
        c.ageS = 0;
        if (magnet) {
          // Everything the mine catches is dragged in and held a moment before the burst.
          for (const f of host.fighters()) {
            if (this.friendly(f, c.casterId, host) || !f.hittable) continue;
            if (Math.hypot(f.x - c.x, f.y - c.y) > magnet.radiusM) continue;
            host.hold?.(f.id, magnet.holdS);
          }
        }
        host.emit({
          kind: 'impact',
          ability: c.def.id,
          look: c.def.look,
          vfx: c.def.vfx,
          sfx: c.def.sfx.impact,
          x: c.x,
          y: c.y,
          radiusM: c.radiusM * 0.6,
        });
        continue;
      }
      c.ageS += dtS;
      if (c.ageS >= c.lifeS) {
        this.clouds.splice(i, 1);
        continue;
      }
      if (c.ageS < c.armS) continue;
      if (c.fog) this.updateFog(c, c.fog, dtS, host);
      for (const f of host.fighters()) {
        if (c.fog) break; // a fog never bursts on anyone; it chokes (see `updateFog`)
        if (c.hit.has(f.id) || this.friendly(f, c.casterId, host) || !f.hittable) continue;
        if (Math.hypot(f.x - c.x, f.y - c.y) > c.radiusM + f.radiusM) continue;
        // Dodged (not landed): it can still catch them once the dodge ends, while they stand in it.
        if (
          this.hit(
            host,
            c.casterId,
            f.id,
            c.def.payload,
            norm(c.pullIn ? { x: c.x - f.x, y: c.y - f.y } : { x: f.x - c.x, y: f.y - c.y }),
            c.def.look?.hitFlash,
          )
        )
          c.hit.add(f.id);
      }
    }
  }

  /** Choking fog: while inside, an enemy sees little, moves slowly and takes chip damage; three seconds in, one stack. */
  private updateFog(c: Cloud, fog: NonNullable<Cloud['fog']>, dtS: number, host: AbilityHost): void {
    for (const f of host.fighters()) {
      if (this.friendly(f, c.casterId, host) || !f.hittable) continue;
      if (Math.hypot(f.x - c.x, f.y - c.y) > c.radiusM + f.radiusM * 0.5) {
        // Out of the fog: the exposure (and its damage ramp) is forgotten only after `resetS` outside (VX3).
        const out = (c.outS.get(f.id) ?? 0) + dtS;
        c.outS.set(f.id, out);
        if (out >= (fog.ramp?.resetS ?? 0)) c.dwellS.delete(f.id);
        continue;
      }
      c.outS.delete(f.id);
      const inside = (c.dwellS.get(f.id) ?? 0) + dtS;
      c.dwellS.set(f.id, inside);
      const stack = inside >= fog.stackAfterS && !c.hit.has(f.id);
      if (stack) c.hit.add(f.id);
      const k = fog.ramp ? Math.min(fog.ramp.maxFactor, 1 + fog.ramp.perS * inside) : 1;
      host.fogFighter?.(f.id, { sightM: fog.sightM, speedFactor: fog.speedFactor, chipDps: fog.chipDps * k, stack });
    }
  }

  /** Grenades: fly the arc, stick to the first enemy passed through, count the fuse, then blast. */
  private updateGrenades(dtS: number, host: AbilityHost): void {
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i]!;
      const d = g.def.delivery;
      if (d.type !== 'grenade') continue;
      g.ageS += dtS;
      if (g.state === 'flying') {
        const total = Math.max(0.01, Math.hypot(g.to.x - g.from.x, g.to.y - g.from.y));
        g.k = Math.min(1, g.k + (d.speedMps * dtS) / total);
        g.x = g.from.x + (g.to.x - g.from.x) * g.k;
        g.y = g.from.y + (g.to.y - g.from.y) * g.k;
        g.z = GRENADE_RELEASE_HEIGHT_M * (1 - g.k) + 4 * d.arcHeightM * g.k * (1 - g.k);
        if (g.k > GRENADE_ARM_K && g.z < GRENADE_STICK_MAX_Z_M) {
          const foe = host
            .fighters()
            .find(
              (f) =>
                f.hittable &&
                !this.friendly(f, g.casterId, host) &&
                Math.hypot(f.x - g.x, f.y - g.y) <= d.stickRadiusM + f.radiusM,
            );
          if (foe) {
            g.state = 'stuck';
            g.stuckTo = foe.id;
            g.fuseLeftS = d.stickFuseS;
            host.emit({
              kind: 'release',
              ability: g.def.id,
              look: g.def.look,
              vfx: 'grenade-stick',
              sfx: g.def.sfx.cast,
              x: foe.x,
              y: foe.y,
            });
          }
        }
        if (g.state === 'flying' && g.k >= 1) {
          g.state = 'landed';
          g.z = 0;
          g.fuseLeftS = d.fuseS;
        }
        continue;
      }
      if (g.state === 'stuck') {
        const foe = host.fighters().find((f) => f.id === g.stuckTo);
        if (foe) {
          g.x = foe.x;
          g.y = foe.y;
          g.z = 0.95;
        }
      }
      g.fuseLeftS -= dtS;
      if (g.fuseLeftS > 0) continue;
      this.grenades.splice(i, 1);
      this.explode(g, d, host);
    }
  }

  /** The blast: every enemy within the radius is hit once with the payload (falling off with distance); props too. */
  private explode(g: Grenade, d: Extract<AbilityDef['delivery'], { type: 'grenade' }>, host: AbilityHost): void {
    const at = { x: g.x, y: g.y };
    for (const f of host.fighters()) {
      if (this.friendly(f, g.casterId, host) || !f.hittable) continue;
      const dist = Math.hypot(f.x - at.x, f.y - at.y);
      if (dist > d.blastRadiusM + f.radiusM) continue;
      this.hit(
        host,
        g.casterId,
        f.id,
        payloadAt(g.def.payload, dist, d.blastRadiusM),
        norm({ x: f.x - at.x, y: f.y - at.y }),
        g.def.look?.hitFlash,
      );
    }
    host.hitEnvironment(g.casterId, at, d.blastRadiusM, g.def.payload, { x: 1, y: 0 }, false);
    host.emit({
      kind: 'impact',
      ability: g.def.id,
      look: g.def.look,
      vfx: g.def.vfx,
      sfx: g.def.sfx.impact,
      x: at.x,
      y: at.y,
      radiusM: d.blastRadiusM,
    });
  }

  private updateZones(dtS: number, host: AbilityHost): void {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i]!;
      z.ageS += dtS;
      if (z.ageS >= z.lifeS) {
        this.zones.splice(i, 1);
        continue;
      }
      for (const f of host.fighters()) {
        if (this.friendly(f, z.casterId, host) || !f.hittable) continue;
        if (Math.hypot(f.x - z.x, f.y - z.y) <= z.radiusM + f.radiusM) host.burnFighter(f.id, z.burn);
      }
    }
  }
}

/** Distance from a point to a segment. */
function segmentDistance(a: Vec2, b: Vec2, p: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}
