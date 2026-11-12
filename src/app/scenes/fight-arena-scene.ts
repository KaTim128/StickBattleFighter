import { Container, Graphics } from 'pixi.js';
import type { AbilityHudState, CastBlock } from '../../abilities/ability-caster';
import { ABILITY_SLOTS, type AbilitySlot, type Burn, type MagicLook } from '../../abilities/ability-def';
import { abilityPose } from '../../animation/ability-poses';
import { smoothing } from '../../animation/animator';
import { strikePose } from '../../animation/clips';
import {
  blockPose,
  carryPose,
  flinchPose,
  getUpFrame,
  knockdownFrame,
  quickDodgePose,
  throwPose,
  tuckPose,
} from '../../animation/reaction-poses';
import { blendPose, type Pose } from '../../animation/skeleton';
import { addArenaColliders } from '../../arenas/arena-colliders';
import { CameraShake } from '../../camera/camera-shake';
import { fitRectToView } from '../../camera/fit-view';
import { type CameraView, FollowCamera } from '../../camera/follow-camera';
import { DEFAULT_CAST } from '../../characters/library';
import { type LoadedCharacter, loadCharacter } from '../../characters/load';
import type { AudioProfile, CharacterLibrary } from '../../characters/schema';
import {
  type AttackDef,
  attackDuration,
  capsuleTouchesRect,
  distanceToCapsule,
  hitCapsule,
} from '../../combat/attacks';
import { type CombatState, DEFENCE, type HitOutcome, seededRandom } from '../../combat/combatant';
import type { CombatEvent } from '../../combat/events';
import type { ArenaLayout } from '../../data/arenas/arena-layout';
import { IMPACTS, type ImpactId, type ImpactProfile } from '../../data/combat/impacts';
import { THROWING } from '../../data/combat/throwing';
import type { Material } from '../../data/objects/props';
import type { ArenaProp } from '../../environment/arena-props';
import { ArenaProps, type PropState } from '../../environment/arena-props';
import { BreakableDoor, circleTouchesRect } from '../../environment/breakable-door';
import { BreakableWalls } from '../../environment/breakable-wall';
import type { PlayerIntents } from '../../input/intents';
import type { HudFighter, TopHudState } from '../../interface/top-hud';
import { SPRINT, stepHop, stepVelocity } from '../../physics/movement';
import { PhysicsWorld } from '../../physics/physics-world';
import { type ArenaView, buildArenaView } from '../../rendering/arena-view';
import { DebrisView } from '../../rendering/debris-view';
import { OcclusionFader } from '../../rendering/occlusion-fader';
import { ISO_C, ISO_T, iso, isoBounds, isoToWorld, screenSideToWorld } from '../../rendering/projection';
import { tallestPropM } from '../../rendering/prop-view';
import type { DodgeLook } from '../../rendering/stickman-view';
import { drawWallDamage } from '../../rendering/wall-damage';
import {
  AbilityVfx,
  type AuraFx,
  type BurningThing,
  type ChargeFx,
  type DashTrailFx,
  type DustSource,
  type ImpactBurst,
  type LimbFlames,
} from '../../vfx/ability-vfx';
import { EFFECTS, type EffectDef } from '../../vfx/effects-library';
import type { ArenaScene, Viewport } from './arena-scene';
import { FighterEntity } from './fighter-entity';
import { SceneAbilities } from './scene-abilities';
import { type ClashBanner, type ClashHudState, SceneClash } from './scene-clash';
import { SceneSummons } from './scene-summons';

/** Live player state for the debug overlay and browser tests. */
export interface PlayerState {
  x: number;
  y: number;
  speed: number;
  heightM: number;
  airborne: boolean;
  facing: 1 | -1;
  jumps: number;
  /** Current attack id, or null. */
  attack: string | null;
  /** 1–3 during the ground combo, 0 otherwise. */
  comboStep: number;
  /** Attacks that connected with something. */
  hits: number;
  hp: number;
  stamina: number;
  state: CombatState;
  /** Ability being cast (id), or null. */
  ability: string | null;
  /** Ultimate meter, 0..100. */
  meter: number;
  burning: boolean;
  /** Kind of object carried overhead (Phase 7), or null. */
  carrying: string | null;
  /** Still heaving the carried object up (heavier takes longer). */
  lifting: boolean;
  /** Seconds of blindness left (Soul Drain): the player's view darkens. */
  blindS: number;
  /** The player's beam is pouring: the touch joystick aims it instead of moving. */
  beamAiming: boolean;
  /** What the contextual utility button does now: jump, pick up or throw. */
  utility: 'jump' | 'pickup' | 'throw';
  /** 1 = a dodge is ready, falling to 0 just after one (weight-based cooldown). */
  dodgeReady: number;
}

export interface DummyState {
  x: number;
  y: number;
  speed: number;
  knockedBack: boolean;
  hp: number;
  state: CombatState;
  attack: string | null;
  burning: boolean;
  /** Seconds on the floor (fall animation); 0 when standing. */
  downTimeS: number;
  /** 0..1 through getting up. */
  getUpProgress: number;
}

/** Live camera state for the debug overlay and browser tests. */
export interface CameraState extends CameraView {
  trauma: number;
  shakeOffset: number;
  zoom: number;
}

export interface DoorState {
  id: string;
  broken: boolean;
  brokenBy: string | null;
  /** Swung open by someone walking through (REQ-ENV-13). */
  open: boolean;
}

const KNOCK_FLIGHT_S = 0.8;
/** Starting an attack turns toward an opponent within this distance (soft lock, TD-016). */
const SOFT_LOCK_M = 2.8;
/** A fighter knocked into a breakable wall chips it by this much per unit of slam (mass × speed). */
const WALL_SLAM_PER_STRENGTH = 0.1;
/** A burning object thrown by a fire fighter sets whoever it hits alight (TD-047). */
const THROWN_FIRE_BURN = { dps: 12, durationS: 2 } as const;
/** While flying from a heavy knockback a fighter slides further before stopping. */
const KNOCK_FLIGHT_DECEL = 9; // was 5: knockdowns slid 10 m+, too far for the compact office
/** Knockback at or above this speed counts as heavy (door-smashing) knockback. */
const HEAVY_KNOCKBACK_MPS = 6;
/** Sliding to a stop after a light knockback or while stunned. */
const SETTLE_DECEL = 14;
/** Durability a knocked-back body takes off a prop it crashes into, per unit of mass × speed. */
const KNOCK_PROP_DAMAGE = 0.1;
const HITSTOP_HEAVY_S = 0.09;
/** The final blow freezes longer: a cinematic beat before the faint. */
const HITSTOP_KO_S = 0.18;
/** A striker's little bounce back off a landed blow, seconds. */
const RECOIL_BOUNCE_S = 0.14;
/** KO: lie still, then dissolve into dust over this window (seconds after the KO), then respawn. */
const KO_DISSOLVE_FROM_S = 1.0;
/** Landed hits this close together (seconds) count as one combo (PRS-4). */
const COMBO_WINDOW_S = 1.0;
/** A whiff calls out MISS only if an opponent stood this close (metres). */
const MISS_CALLOUT_RANGE_M = 2.4;
/** The guard's shield flares this long after it takes a blow (PRS-5). */
const SHIELD_FLARE_S = 0.35;
/** A body burned by fire chars to this before it crumbles to ash. */
const CHARCOAL = 0x2a1c14;
/** Every fighter killed by fire crumbles into embers and ash (Effects library id). */
const FIRE_DEATH_EFFECT = 'ember-ash';
/** Smoke keeps rising this long after a burn goes out. */
const BURN_SMOKE_S = 1.2;
const KO_DISSOLVE_S = 1.6;
type AudioKey = Exclude<keyof AudioProfile, 'id' | 'voice'>;

const colourOf = (hex: string): number => Number.parseInt(hex.replace('#', ''), 16);

/** The non-elemental version of an effect (no embers or scorch) for fighters without elemental effects. */
function withoutElements(e: EffectDef): EffectDef {
  return { sparks: e.sparks, ring: e.ring };
}

/** Crack lines drawn over a weakened wall block (deterministic per section, deeper at level 2). */
/** A world point that sits `side` metres beside (x, y) on screen, `z` up: effects on a billboarded fighter. */
function besideOnScreen(x: number, y: number, side: number, z: number): { x: number; y: number; z: number } {
  const o = screenSideToWorld(side);
  return { x: x + o.x, y: y + o.y, z };
}

/** An impact profile's sparks and ring as a VFX burst. */
function burstFromProfile(x: number, y: number, dir: { x: number; y: number }, p: ImpactProfile): ImpactBurst {
  return { x, y, dir, sparks: p.sparks, speedMps: p.sparkSpeedMps, colour: p.sparkColour, burstM: p.burstM };
}

/** Phase shape for a Punch Clash exchange beat (the clip is scaled to fit the beat). */
const GROUND = { airborne: false, falling: false, forward: false } as const;
const CLASH_BEAT_TIMING = { windupS: 0.06, activeS: 0.07, recoveryS: 0.17 } as const;
/** Sound for a prop being hit or breaking, by material (src/audio recipes). */
const PROP_SOUNDS: Partial<Record<Material, { hit: string; break: string }>> = {
  wood: { hit: 'hit-wood', break: 'break-wood' },
  metal: { hit: 'hit-metal', break: 'break-metal' },
  glass: { hit: 'hit-plastic', break: 'break-glass' },
  plastic: { hit: 'hit-plastic', break: 'break-plastic' },
  ceramic: { hit: 'hit-plastic', break: 'break-glass' },
  fabric: { hit: 'hit-soft', break: 'break-soft' },
  plant: { hit: 'hit-soft', break: 'break-soft' },
};
/** How fast WASD slides the ultimate's landing spot while aiming, m/s. */
/** Target speed under WASD or the joystick when an ability's data sets none (Inferno's leap, owner 11/11/2026). */
const DEFAULT_AIM_SPEED_MPS = 7;
/** Approximate height of a fighter's head top above its feet (for bars and callouts). */
const HEAD_TOP_M = 1.75;
/** After a teleport the body fades back in over this long, seconds. */
const TELEPORT_APPEAR_S = 0.3;
/** The top of a fighter's head over its feet (big fighters are drawn bigger: rig.scale). */
const headTop = (f: FighterEntity): number => HEAD_TOP_M * (f.def.sizeScale ?? 1);

/**
 * Plays any arena layout (training yard, office, ...): the player and the
 * training dummy (two FighterEntities on one combat engine), props,
 * breakable doors and the framing camera. Owns and frees its physics world
 * and display objects.
 */
export class FightArenaScene implements ArenaScene {
  readonly name: string;
  physics: PhysicsWorld | null = null;
  camera: FollowCamera | null = null;
  cameraState: CameraState | null = null;
  doors: BreakableDoor[] = [];
  /** Furniture that moves or breaks when hit (owner, 11/11/2026). */
  props: ArenaProps | null = null;
  private debrisView: DebrisView | null = null;
  private fireLight: Graphics | null = null;
  /** Breakable interior wall sections (owner, 11/11/2026). */
  walls: BreakableWalls | null = null;
  /** Cracks already drawn per wall section (0, 1 or 2 levels). */
  /** Visible damage per breakable wall section (index): how worn and how scorched, and its overlays. */
  private readonly wallDamage = new Map<number, { damage: number; scorch: number; overlays: Graphics[] }>();
  /** The shared ability framework in this arena (Phase 6). */
  abilities: SceneAbilities | null = null;
  private vfx: AbilityVfx | null = null;
  /** Fades walls and tall props that stand in front of a fighter (owner, 11/11/2026). */
  occlusion: OcclusionFader | null = null;
  /** Desk items that fell to the floor and now depth-sort as floor objects. */
  private readonly grounded = new Set<number>();
  /** Practice option: the dummy jabs back when you are close (REQ-MOD-5). */
  dummyAttacks = false;
  readonly playerFighter: FighterEntity;
  readonly dummyFighter: FighterEntity;
  private readonly events: CombatEvent[] = [];
  /** Contacts this frame, for sparks and bursts (presentation). */
  private readonly impacts: ImpactBurst[] = [];
  /** Limb flames and aura embers this frame (filled while drawing fighters). */
  private readonly frameFlames: LimbFlames[] = [];
  /** KO dust to release this frame (filled while drawing fighters, used by the VFX). */
  private readonly frameDust: DustSource[] = [];
  /** Flames burning on bodies this frame (a fighter burning away to ash). */
  private readonly frameBurning: BurningThing[] = [];
  private readonly frameSmoke: { x: number; y: number; z: number; count: number }[] = [];
  /** Strongest limb flame drawn last frame (0 = none): Effects Profile trails (tests, debug hook). */
  limbFlameStrength = 0;
  /** Knocked-back fighters that hit a wall (tests and the debug hook). */
  wallHits = 0;
  /** Sounds waiting to be played by the sound board (with loudness). */
  private readonly sounds: { id: string; gain: number }[] = [];
  /** Simulation time (hit-stop excluded), seconds. */
  private simTimeS = 0;
  /** The name of the player's last attack or ability (top HUD). */
  private lastActionName: string | null = null;
  private lastActionKey: string | null = null;
  private showcases = 0;
  /** The Punch Clash (owner, 11/11/2026). */
  readonly clashes: SceneClash;
  private readonly shake = new CameraShake();
  private readonly rng = seededRandom(1234);
  private hitstopS = 0;
  /** Where the player is aiming the leaping ultimate, while aiming (else null). */
  private ultAimPoint: { x: number; y: number } | null = null;
  /** The pointer's move count when the aim last followed it (a hover only steers when it moves). */
  private aimPrepT = 0;
  /** Why the player's last ability press did not cast (HUD feedback), or null. */
  lastAbilityBlock: CastBlock | null = null;
  private view: ArenaView | null = null;
  private overlay: Container | null = null;
  /** Validation reports for the fighters in this scene (shown when a character fell back). */
  readonly characters: { readonly player: LoadedCharacter; readonly opponent: LoadedCharacter };
  /** Where this fight's characters come from (summons load from it too). */
  private readonly library: CharacterLibrary | undefined;
  /** Presentation-only randomness (sound and effect variations), separate from combat rolls. */
  private readonly fxRng = seededRandom(98765);

  constructor(
    readonly arena: ArenaLayout,
    private readonly parent: Container,
    private readonly intents: PlayerIntents,
    private readonly viewport: Viewport,
    /** Show the whole arena at once (layout review, `?overview`), instead of the follow camera. */
    private readonly overview = false,
    /** Which characters fight (Character Definition ids, TD-039) and where their data comes from. */
    cast: { player?: string; opponent?: string; library?: CharacterLibrary } = {},
  ) {
    this.name = arena.id;
    this.library = cast.library;
    const player = loadCharacter(cast.player ?? DEFAULT_CAST.player, cast.library);
    const opponent = loadCharacter(cast.opponent ?? DEFAULT_CAST.opponent, cast.library);
    this.characters = { player, opponent };
    this.playerFighter = new FighterEntity('player', player.def, arena.playerStart, true);
    this.dummyFighter = new FighterEntity('dummy', opponent.def, arena.dummyStart, false);
    this.dummyFighter.team = 'opponent';
    this.clashes = new SceneClash({
      player: this.playerFighter,
      opponent: this.dummyFighter,
      opponentMashRate: opponent.def.ai.clashMashRate * opponent.def.multipliers.clashPower,
      random: () => this.rng(),
      takeMashPresses: () => {
        // During a clash Button 1 is the mash button; other buttons do nothing.
        const { pressed } = this.intents.consumeMeleeEdges();
        while (this.intents.consumeAbility()) {
          /* ignored during a clash */
        }
        this.intents.consumeDodge();
        this.intents.consumeJump();
        this.intents.consumeAimCancel();
        return pressed ? 1 : 0;
      },
      finisher: (winner, loser, f) =>
        this.applyStrike(winner, loser, {
          damage: f.damage,
          heavy: true,
          knockbackMps: f.knockbackMps,
          dir: { x: winner.aim.x, y: winner.aim.y },
          melee: true,
          impact: 'knuckle-heavy',
          unblockable: true,
          profile: f.profile,
        }),
      sound: (id, gain) => this.queueSound(id, gain),
      impact: (x, y, dir, profile) => this.impacts.push(burstFromProfile(x, y, dir, profile)),
      effect: (f, key, x, y, dir, scale) => this.pushEffect(x, y, dir, f.def.effects[key], scale),
      characterSound: (f, key, gain) => this.characterSound(f, key, gain),
      shake: (trauma, punch) => {
        this.shake.addTrauma(trauma);
        if (punch > 0) this.shake.punch(punch);
      },
      hitstop: (seconds) => {
        this.hitstopS = Math.max(this.hitstopS, seconds);
      },
      lockUp: (f) => {
        f.combo.interrupt();
        this.abilities?.interrupt(f, true);
        f.combatant.setGuard(false);
        f.driveVelocity = null;
        f.knockFlightS = 0;
      },
    });
  }

  private fighterByName(name: string): FighterEntity | undefined {
    return this.fighters.find((f) => f.name === name);
  }

  private get fighters(): FighterEntity[] {
    return this.summons.list.length > 0
      ? [this.playerFighter, this.dummyFighter, ...this.summons.list]
      : [this.playerFighter, this.dummyFighter];
  }

  /** Summoned minions now in the fight (tests and the debug hook). */
  get summonStates(): { name: string; team: string; x: number; y: number; hp: number; ko: boolean; leftS: number }[] {
    return this.summons.list.map((f) => ({
      name: f.name,
      team: f.team,
      x: f.x,
      y: f.y,
      hp: f.combatant.hp,
      ko: f.combatant.isKo,
      leftS: f.summon?.leftS ?? Number.POSITIVE_INFINITY,
    }));
  }

  /** Summoned minions (Undead Army, owner 12/11/2026): fighters on their summoner's team with their own AI. */
  private readonly summons = new SceneSummons({
    loadDef: (id) => loadCharacter(id, this.library).def,
    attach: (f) => {
      if (this.physics && this.view && this.overlay) f.attach(this.physics, this.view.actors, this.overlay);
    },
    detach: (f) => {
      // Out of the depth sort first (it keeps a reference), then the body, view and bars go.
      if (f.view) this.view?.actors.remove(f.view.root);
      f.detach();
    },
    blocked: (from, to) => this.physics?.castWorldRay(from, to)?.fraction ?? null,
    isFree: (at, r) =>
      (this.physics?.isFree(at, r) ?? false) &&
      at.x > r &&
      at.y > r &&
      at.x < this.arena.widthM - r &&
      at.y < this.arena.heightM - r,
    fighters: () => this.fighters,
    step: (f, stepS, move) => this.stepFighter(f, stepS, move, false),
    attack: (f) => f.combo.press(GROUND),
    risen: (f) => {
      this.frameDust.push({
        points: [0, 1, 2].map((k) => ({ x: f.x + (k - 1) * 0.15, y: f.y, z: 0.1 + k * 0.2 })),
        colour: 0x6b5b7a,
        colours: [0x4a3d58, 0x8a7a9c, 0x2a2230],
        count: 12, // a light puff of grave dirt: the summoner stays in view
      });
      this.queueSound('summon-rise', 0.7);
    },
    random: () => this.rng(),
  });

  /** The arena's display objects (tests and tools inspect props and wall sections). */
  get arenaView(): ArenaView | null {
    return this.view;
  }

  get world(): Container | null {
    return this.view?.world ?? null;
  }

  /** The floor layer (world metres through the floor projection): debug collider outlines go here. */
  get floorLayer(): Container | null {
    return this.view?.floor ?? null;
  }

  /** Top HUD (PRS-10): both fighters, the match clock and the player's last action. */
  get topHud(): TopHudState {
    const side = (f: FighterEntity): HudFighter => {
      const c = f.combatant;
      const status: string[] = [];
      if (c.isKo) status.push('ko');
      else {
        if (c.burning) status.push('burning');
        if (c.state === 'stunned') status.push('stunned');
        if (c.state === 'knockdown' || c.state === 'gettingUp') status.push('down');
        if (c.state === 'guarding') status.push('guarding');
      }
      return {
        name: f.def.displayName,
        hp: c.hp,
        maxHp: c.stats.maxHp,
        stamina: c.stamina,
        maxStamina: c.stats.maxStamina,
        status,
        portrait:
          f.def.effects.head === 'brute'
            ? 'brute'
            : f.def.capabilities.usesFireEffects && f.def.effects.head === 'flame'
              ? 'flame'
              : 'round',
        colour: `#${f.def.look.limb.toString(16).padStart(6, '0')}`,
      };
    };
    return {
      left: side(this.playerFighter),
      right: side(this.dummyFighter),
      timerS: this.simTimeS,
      lastAction: this.lastActionName,
    };
  }

  /** Ultimates that landed since the last call (the HUD plays the showcase, PRS-8). */
  drainShowcases(): number {
    const n = this.showcases;
    this.showcases = 0;
    return n;
  }

  get player(): PlayerState {
    const f = this.playerFighter;
    const v = f.body?.linvel() ?? { x: 0, y: 0 };
    return {
      x: f.x,
      y: f.y,
      speed: Math.hypot(v.x, v.y),
      heightM: f.hop.heightM,
      airborne: f.airborne,
      facing: f.facing,
      jumps: f.jumps,
      attack: f.combo.attack?.id ?? null,
      comboStep: f.combo.step,
      hits: f.hits,
      hp: f.combatant.hp,
      stamina: f.combatant.stamina,
      state: f.combatant.state,
      ability: f.caster?.cast?.def.id ?? null,
      meter: f.caster?.meter ?? 0,
      burning: f.combatant.burning,
      carrying: f.carrying?.placement.kind ?? null,
      lifting: f.liftS > 0,
      blindS: f.combatant.blindLeftS,
      beamAiming: this.abilities?.world.beams.some((b) => b.casterId === f.name) ?? false,
      utility: f.carrying ? 'throw' : this.pickupFor(f) ? 'pickup' : 'jump',
      dodgeReady: 1 - f.combatant.dodgeCooldownLeftS / f.combatant.dodgeCooldownTotalS,
    };
  }

  /** The player's ability buttons for the HUD (cooldowns, costs, meter). */
  get abilityHud(): AbilityHudState | null {
    return this.abilities?.hud(this.playerFighter) ?? null;
  }

  get dummy(): DummyState {
    const f = this.dummyFighter;
    const v = f.body?.linvel() ?? { x: 0, y: 0 };
    return {
      x: f.x,
      y: f.y,
      speed: Math.hypot(v.x, v.y),
      knockedBack: f.knockFlightS > 0,
      burning: f.combatant.burning,
      hp: f.combatant.hp,
      downTimeS: f.combatant.downTimeS,
      getUpProgress: f.combatant.getUpProgress,
      state: f.combatant.state,
      attack: f.combo.attack?.id ?? null,
    };
  }

  get doorStates(): DoorState[] {
    return this.doors.map((d) => ({ id: d.spec.id, broken: d.broken, brokenBy: d.brokenBy, open: d.open }));
  }

  /** Combat events since the last call (for floating numbers and callouts). */
  drainEvents(): CombatEvent[] {
    return this.events.splice(0, this.events.length);
  }

  /** Screen position (CSS px) of a world point (z metres up) under the current camera. */
  worldToScreen(x: number, y: number, z = 0): { x: number; y: number } | null {
    const w = this.view?.world;
    if (!w) return null;
    const p = iso(x, y, z);
    return { x: w.position.x + p.x * w.scale.x, y: w.position.y + p.y * w.scale.y };
  }

  /** The whole arena (walls and the tallest props included) in view units: camera limits and overview. */
  private viewBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    const t = this.arena.wallThicknessM;
    const tall = Math.max(2.4, tallestPropM(this.arena.props));
    return isoBounds(-t, -t, this.arena.widthM + t, this.arena.heightM + t, 0, tall);
  }

  async load(): Promise<void> {
    const arena = this.arena;
    const physics = new PhysicsWorld();
    this.physics = physics;
    addArenaColliders(physics, arena, false); // props get their own bodies: they move and break
    this.props = new ArenaProps(arena, physics);
    this.doors = (arena.doors ?? []).map((spec) => new BreakableDoor(spec, physics));
    this.walls = new BreakableWalls(arena.interiorWalls ?? [], physics);
    this.abilities = new SceneAbilities(
      () => this.fighters,
      (attacker, target, strike) => this.applyStrike(attacker, target, strike),
      physics,
      this.props,
      this.doors,
      () => this.shake.addTrauma(0.35),
      this.walls,
    );
    this.abilities.steerSource = (f, fresh) => this.beamSteer(f, fresh);
    this.abilities.summonSource = (f, spec) => this.summons.spawn(f, spec);
    this.abilities.teleportSource = (f, to) => this.teleportTo(f, to);
    this.view = buildArenaView(arena);
    this.debrisView = new DebrisView(this.view.actors);
    this.occlusion = new OcclusionFader();
    for (const node of this.view.occluders) this.occlusion.add(node);
    for (const node of this.view.props.values()) this.occlusion.add(node);
    this.vfx = new AbilityVfx();
    this.vfx.attach(this.view.floor, this.view.world, this.view.actors.container);
    this.overlay = new Container();
    this.overlay.label = 'fighter-overlay';
    for (const f of this.fighters) f.attach(physics, this.view.actors, this.overlay);
    this.view.world.addChild(this.overlay);
    this.parent.addChild(this.view.world);

    this.camera = new FollowCamera(iso(arena.playerStart.x, arena.playerStart.y), this.viewBounds());
  }

  /** Put the dummy back on its feet at a spot, at rest and healthy (Practice Zone respawn, REQ-MOD-5; tests). */
  respawnDummy(at: { x: number; y: number }): void {
    this.dummyFighter.combatant.reset();
    this.dummyFighter.combo.interrupt();
    this.dummyFighter.placeAt(at);
  }

  /** Test impact (debug key P while the overlay is on): shake plus zoom punch. */
  debugImpact(strength = 0.6): void {
    this.shake.addTrauma(strength);
    this.shake.punch(strength * 0.08);
  }

  update(stepS: number): void {
    if (!this.physics) return;
    // Hit-stop: the whole fight freezes for a few frames on impact (PRS-3).
    if (this.hitstopS > 0) {
      this.hitstopS = Math.max(0, this.hitstopS - stepS);
      return;
    }

    this.simTimeS += stepS;
    for (const f of this.fighters) {
      if (f.scriptedAttack) {
        f.scriptedAttack.t += stepS;
        if (f.scriptedAttack.t >= attackDuration(f.scriptedAttack.timing)) f.scriptedAttack = null;
      }
      const wasKo = f.combatant.isKo;
      const burned = f.combatant.update(stepS);
      if (burned > 0) this.showBurn(f, burned);
      if (!wasKo && f.combatant.isKo) this.abilities?.interrupt(f, true); // burned out
      f.burnTextS = Math.max(0, f.burnTextS - stepS);
      f.flashS = Math.max(0, f.flashS - stepS);
      f.shieldS = Math.max(0, f.shieldS - stepS);
      // A timed self-buff runs out (or ends at a KO).
      if (f.buff) {
        f.buff.leftS -= stepS;
        if (f.buff.leftS <= 0 || f.combatant.isKo) {
          f.buff = null;
          f.combatant.damageTakenScale = 1;
        }
      }
      f.recoilS = Math.max(0, f.recoilS - stepS);
      f.appearS = Math.max(0, f.appearS - stepS);
      f.knockFlightS = Math.max(0, f.knockFlightS - stepS);
      f.attackCooldownS = Math.max(0, f.attackCooldownS - stepS);
      // Fighters get back up; summoned minions crumble away instead (SceneSummons).
      if (f.combatant.isKo && f.combatant.koAge >= DEFENCE.koRespawnS && !f.summon) f.respawn();
    }

    // A Punch Clash takes over both fighters while it runs.
    if (!this.clashes.step(stepS, this.simTimeS)) {
      this.controlPlayer(this.playerFighter, stepS);
      this.trackLastAction();
      this.controlDummy(this.dummyFighter, stepS);
      this.summons.update(stepS);
      this.clashes.maybeStart(this.simTimeS);
    }
    if (this.abilities) this.abilities.world.update(stepS, this.abilities);
    for (const f of this.fighters) this.checkDoorImpact(f, stepS);
    if (this.doors.length > 0) {
      const traffic = this.fighters.map((f) => ({
        x: f.x,
        y: f.y,
        radiusM: f.def.body.footRadiusM,
        // Only a fighter on their feet pushes a door open (a flying kick still smashes it).
        moveX: f.airborne ? 0 : f.moveIntent.x,
        moveY: f.airborne ? 0 : f.moveIntent.y,
      }));
      for (const door of this.doors) door.updateTraffic(traffic, stepS);
    }
    for (const door of this.doors) door.update(stepS);
    this.checkThrownHits();
    this.props?.update(stepS);
    this.propFeedback();

    for (const f of this.fighters) {
      Object.assign(f.prev, f.curr);
      f.prevHop = f.hop.heightM;
    }
    const flying = this.fighters.map((f) => (f.knockFlightS > 0 && f.body ? { f, v: f.body.linvel() } : null));
    this.physics.step(stepS);
    for (const f of this.fighters) {
      const p = f.body?.translation();
      if (p) Object.assign(f.curr, { x: p.x, y: p.y });
    }
    for (const fl of flying) if (fl) this.wallImpact(fl.f, fl.v);
  }

  /** Movement, jump, Button 1 (tap = attack, hold = block) and dodge for the player. */
  private controlPlayer(f: FighterEntity, stepS: number): void {
    const c = f.combatant;
    const air = f.airborne;
    const jumpFromUtility = this.stepInteract(f, stepS);
    if (f.carrying) {
      // Hands full: the combat buttons do nothing until it is thrown or put down (CONTROL_SCHEME §2).
      this.intents.consumeMeleeEdges();
      this.intents.consumeAbility();
      this.intents.consumeAimCancel();
      if (c.state === 'guarding') c.setGuard(false);
      f.meleeTracking = false;
      if (this.intents.consumeDodge() && f.liftS <= 0 && !air && c.tryDodge()) this.startBackDodge(f);
      if (f.liftS > 0) {
        // Still heaving it up: rooted, no jump or dodge until it is overhead.
        f.liftS = Math.max(0, f.liftS - stepS);
        this.intents.consumeJump();
        f.sprinting = false;
        this.stepFighter(f, stepS, { x: 0, y: 0 }, false);
        return;
      }
      const slow = THROWING.carrySpeedFactor(f.carrying.kind.massKg);
      const m = this.intents.move;
      const jump = (this.intents.consumeJump() || jumpFromUtility) && f.def.capabilities.canJump && c.canAct;
      f.sprinting = false; // no sprinting with your hands full
      this.stepFighter(f, stepS, { x: m.x * slow, y: m.y * slow }, jump);
      return;
    }

    if (this.pointAim || this.ultAimPoint) {
      // Targeting (owner, 12/11/2026): the fighter stands still while WASD (or the joystick on touch)
      // moves the target; the ability's own key confirms, Escape (or the touch ✕) cancels. Attacks,
      // jumps and dodges pressed meanwhile are dropped so nothing fires by accident.
      this.intents.consumeMeleeEdges();
      this.intents.consumeJump();
      this.intents.consumeDodge();
      f.meleeTracking = false;
      if (c.state === 'guarding') c.setGuard(false);
      this.stepTargeting(f, stepS);
      f.sprinting = false;
      this.stepFighter(f, stepS, { x: 0, y: 0 }, false);
      return;
    }
    this.intents.consumeAimCancel(); // nothing being aimed: Escape just opens the settings

    // Button 1: decide tap vs hold on the fixed step.
    const { pressed, released } = this.intents.consumeMeleeEdges();
    if (pressed) {
      f.meleeTracking = true;
      f.meleeHoldS = 0;
    }
    if (f.meleeTracking && this.intents.meleeHeld && !released) {
      f.meleeHoldS += stepS;
      const canGuard = f.def.capabilities.canBlock && !air && !f.combo.attack && !f.caster?.cast;
      if (f.meleeHoldS >= DEFENCE.blockHoldS && canGuard) c.setGuard(true);
    }
    if (released && f.meleeTracking) {
      const wasGuarding = c.state === 'guarding' || f.meleeHoldS >= DEFENCE.blockHoldS;
      if (!wasGuarding && c.canAct && !f.caster?.cast) {
        // Which input: a firm push towards where you face is "forward" (kick strings on some movesets).
        const m = this.intents.move;
        this.softLock(f);
        f.combo.press({
          airborne: air,
          falling: air && f.hop.verticalSpeedMps < 0,
          forward: m.x * f.aim.x + m.y * f.aim.y > 0.7,
        });
      }
      f.meleeTracking = false;
    }
    if (!this.intents.meleeHeld && c.state === 'guarding') c.setGuard(false);

    // Buttons 2–5: abilities and the ultimate (a leaping ultimate is aimed first).
    const slot = this.intents.consumeAbility();
    if (slot === 'ult' && f.caster?.def('ult').delivery.type === 'leap') this.ultimatePress(f);
    else if (slot && f.caster?.def(slot).delivery.type === 'teleport') this.beginPointAim(f, slot);
    else if (slot && this.abilities) this.lastAbilityBlock = this.abilities.tryCast(f, slot);
    if (this.pointAim || this.ultAimPoint) {
      // Targeting starts: Inferno crouches to spring, Necro gathers his smoke.
      f.sprinting = false;
      this.stepFighter(f, stepS, { x: 0, y: 0 }, false);
      return;
    }

    // Dodge (right click / flick / DODGE): a quick invulnerable back-step, cancelling an attack (not
    // an ability already cast).
    if (this.intents.consumeDodge() && !air && !f.caster?.cast && c.tryDodge()) {
      f.combo.interrupt();
      this.startBackDodge(f);
    }

    const jump =
      (this.intents.consumeJump() || jumpFromUtility) &&
      f.def.capabilities.canJump &&
      c.canAct &&
      c.state !== 'guarding' &&
      !(f.combo.attack && !air) &&
      !f.caster?.cast;
    f.sprinting = this.intents.sprint;
    this.stepFighter(f, stepS, this.intents.move, jump);
  }

  /**
   * Dodges always go straight back from where the fighter faces, whatever the movement keys or
   * stick say (owner, 12/11/2026, REQ-CTL-20), and the facing does not change during the dodge.
   */
  private startBackDodge(f: FighterEntity): void {
    Object.assign(f.dodgeDir, { x: -f.aim.x, y: -f.aim.y });
  }

  /** Notice when the player starts a new attack or ability, for the top HUD's action name. */
  private trackLastAction(): void {
    const f = this.playerFighter;
    const cast = f.caster?.cast;
    const attack = f.combo.attack;
    const key = cast ? `a:${cast.def.id}` : attack ? `m:${attack.id}:${f.combo.step}` : null;
    if (key && key !== this.lastActionKey) this.lastActionName = cast ? cast.def.name : (attack?.label ?? null);
    this.lastActionKey = key;
  }

  /**
   * Pick up / throw / put down (Phase 7, REQ-PHY-8, TD-016). Press near an object to lift it;
   * while carrying, a short press throws it at the locked target and holding puts it down.
   * The touch utility button jumps when there is nothing to grab or carry: returns true then.
   */
  private stepInteract(f: FighterEntity, stepS: number): boolean {
    let jump = false;
    const edge = this.intents.consumeInteract();
    const props = this.props;
    if (f.carrying && (f.carrying.broken || !f.combatant.canAct)) this.dropCarried(f, 0); // hit while carrying: it falls
    if (edge?.down) {
      if (f.carrying) {
        // A press while still lifting does nothing (it cannot be thrown before it is up).
        f.interactTracking = f.liftS <= 0;
        f.interactHoldS = 0;
      } else {
        const grab = this.pickupFor(f);
        if (grab && props && !f.airborne && !f.combo.attack && !f.caster?.cast) {
          props.pickUp(grab, this.fighters.indexOf(f), this.holdPoint(f));
          f.carrying = grab;
          f.liftTotalS = THROWING.liftTimeFor(grab.kind.massKg);
          f.liftS = f.liftTotalS;
          f.interactTracking = false; // this press was the pickup, not a throw
          this.characterSound(f, 'jump', 0.5);
        } else if (edge.orJump) {
          jump = true;
        }
      }
    }
    if (f.carrying && f.interactTracking) {
      if (this.intents.interactHeld) {
        f.interactHoldS += stepS;
        if (f.interactHoldS >= THROWING.dropHoldS) this.dropCarried(f, 0.8);
      } else if (edge && !edge.down) {
        this.throwCarried(f);
      }
    }
    if (f.carrying && props) props.carry(f.carrying, this.holdPoint(f));
    return jump;
  }

  /** Where a carried object rides: over the head, a touch in front so it draws over the fighter. */
  private holdPoint(f: FighterEntity): { x: number; y: number; heightM: number } {
    // While lifting, it rises from the hands to overhead (eased: slow off the floor, then up).
    const k = this.liftProgress(f);
    const eased = k * k * (3 - 2 * k);
    const k0 = f.def.sizeScale ?? 1; // a bigger fighter holds it higher
    const heightM = (THROWING.liftStartHeightM + (THROWING.holdHeightM - THROWING.liftStartHeightM) * eased) * k0;
    return { x: f.x + f.aim.x * 0.08, y: f.y + f.aim.y * 0.08 + 0.02, heightM: heightM + f.hop.heightM };
  }

  /** 0..1 how far through lifting the carried object (1 = overhead). */
  private liftProgress(f: FighterEntity): number {
    return f.liftS > 0 && f.liftTotalS > 0 ? 1 - f.liftS / f.liftTotalS : 1;
  }

  private pickupFor(f: FighterEntity): ArenaProp | null {
    return (
      this.props?.pickupCandidate(
        f.x,
        f.y,
        f.aim,
        THROWING.reachM + f.def.body.footRadiusM,
        THROWING.behindM,
        f.def.objects.maxLiftKg,
        f.def.objects.liftsFurniture === true,
      ) ?? null
    );
  }

  /** Where a throw goes: the locked target if roughly ahead and in range, else the way the fighter moves or faces. */
  private throwDir(f: FighterEntity): { x: number; y: number } {
    const target = this.fighters.find((o) => o.team !== f.team && !o.combatant.isKo);
    const m = this.intents.move;
    let dir = Math.hypot(m.x, m.y) > 0.3 ? { x: m.x, y: m.y } : { x: f.aim.x, y: f.aim.y };
    if (target) {
      const dx = target.x - f.x;
      const dy = target.y - f.y;
      const d = Math.hypot(dx, dy);
      if (d > 0.01 && d < THROWING.aimRangeM && (dx * f.aim.x + dy * f.aim.y) / d > -0.2) dir = { x: dx, y: dy };
    }
    const len = Math.hypot(dir.x, dir.y) || 1;
    return { x: dir.x / len, y: dir.y / len };
  }

  /** Throw speed for this fighter and object: lighter flies faster; throw power (data) adds. */
  private throwSpeed(f: FighterEntity, prop: ArenaProp): number {
    return THROWING.speedFor(prop.kind.massKg) * Math.sqrt(f.def.objects.throwPower);
  }

  /** Throw the carried object (TD-044) in the fighter's own style (TD-047: power, fire). */
  private throwCarried(f: FighterEntity): void {
    const prop = f.carrying;
    if (!prop || !this.props) return;
    const dir = this.throwDir(f);
    const speed = this.throwSpeed(f, prop);
    f.faceToward(dir.x, dir.y);
    const fire = !!f.def.objects.ignitesThrown && f.def.capabilities.usesFireEffects;
    this.props.release(
      prop,
      { x: dir.x * speed, y: dir.y * speed },
      THROWING.launchHeightM,
      THROWING.launchUpMps,
      true,
      {
        power: f.def.objects.throwPower,
        fire,
      },
    );
    f.carrying = null;
    f.liftS = 0;
    f.interactTracking = false;
    f.throwFollowS = 0.28;
    this.characterSound(f, 'jump', 0.8);
    if (fire) this.queueSound('fire-whoosh', 0.8);
  }

  /**
   * Where the carried object would land if thrown now (the aim indicator): the height arc's flight
   * time times the throw speed, stopping short of walls and furniture.
   */
  get throwAim(): {
    from: { x: number; y: number };
    to: { x: number; y: number };
    radiusM: number;
    maxRangeM: number;
  } | null {
    const f = this.playerFighter;
    const prop = f.carrying;
    if (!prop || !this.physics) return null;
    const dir = this.throwDir(f);
    const g = THROWING.gravityMps2;
    const up = THROWING.launchUpMps;
    const airS = (up + Math.sqrt(up * up + 2 * g * THROWING.launchHeightM)) / g;
    let range = this.throwSpeed(f, prop) * airS;
    const from = { x: f.x, y: f.y };
    // A throw flies over furniture, so only walls and doors cut the arc short.
    const hit = this.physics.castWorldRay(from, { x: f.x + dir.x * range, y: f.y + dir.y * range }, false);
    if (hit) range = Math.max(0.3, range * hit.fraction - 0.2);
    return { from, to: { x: f.x + dir.x * range, y: f.y + dir.y * range }, radiusM: 0.45, maxRangeM: 0 };
  }

  /** Put it down in front (or let it fall when hit). */
  private dropCarried(f: FighterEntity, forwardMps: number): void {
    const prop = f.carrying;
    f.carrying = null;
    f.liftS = 0;
    f.interactTracking = false;
    if (!prop || !this.props || prop.broken) return;
    this.props.release(
      prop,
      { x: f.aim.x * forwardMps, y: f.aim.y * forwardMps },
      THROWING.holdHeightM * 0.6,
      0,
      false,
    );
  }

  /** Thrown objects hit fighters they fly into (not the thrower), once each. */
  private checkThrownHits(): void {
    if (!this.props) return;
    for (const prop of this.props.flying) {
      const fall = prop.looseFall;
      const body = prop.body;
      const flight = prop.flight;
      if (!fall || !body || !flight || fall.heightM > THROWING.hitMaxHeightM) continue;
      const v = body.linvel();
      const speed = Math.hypot(v.x, v.y);
      if (speed < THROWING.hitMinSpeedMps) continue;
      for (let i = 0; i < this.fighters.length; i++) {
        const target = this.fighters[i]!;
        if (i === flight.by || flight.hit.has(i) || target.combatant.isKo || !target.body) continue;
        if (this.fighters[flight.by]?.team === target.team) continue; // never the thrower's own side
        if (!circleTouchesRect(target, target.def.body.footRadiusM + 0.1, prop.rect)) continue;
        const thrower = this.fighters[flight.by] ?? target;
        const mass = prop.kind.massKg;
        const dir = { x: v.x / speed, y: v.y / speed };
        const fire = flight.fire;
        this.applyStrike(thrower, target, {
          damage: THROWING.damageFor(mass, speed) * flight.power,
          burn: fire ? THROWN_FIRE_BURN : undefined,
          heavy: mass >= THROWING.heavyFromKg,
          knockbackMps: THROWING.knockbackFor(mass),
          dir,
          melee: false,
          impact: mass >= THROWING.heavyFromKg ? 'knuckle-heavy' : 'knuckle-light',
        });
        this.props.thrownHit(prop, i, Math.max(5, mass * 3), { x: -dir.x, y: -dir.y });
      }
    }
  }

  /**
   * Soft target lock (TD-016): starting an attack turns the fighter to an opponent close enough to
   * be hit soon, unless they are well behind. Free movement in the 2.5D view needs it: you rarely
   * line up exactly with your opponent.
   */
  private softLock(f: FighterEntity): void {
    if (f.combatant.blinded) return; // blinded: it cannot find anyone to turn to
    let best: FighterEntity | null = null;
    let bestD = SOFT_LOCK_M;
    for (const o of this.fighters) {
      if (o.team === f.team || o.combatant.isKo) continue;
      const dx = o.x - f.x;
      const dy = o.y - f.y;
      const d = Math.hypot(dx, dy);
      if (d < bestD && d > 1e-3 && (dx * f.aim.x + dy * f.aim.y) / d > -0.35) {
        best = o;
        bestD = d;
      }
    }
    if (best) f.faceToward(best.x - f.x, best.y - f.y);
  }

  /** Mouse moves counted when the player's beam started: the beam follows the cursor once it moves. */
  private beamPointerMoves = -1;

  /**
   * Where a fighter steers its beam (owner, 12/11/2026). The player: a swipe on the touch screen,
   * or the mouse cursor once it moves (a cursor left lying somewhere does not yank the beam).
   * Opponents track the nearest standing fighter.
   */
  private beamSteer(f: FighterEntity, fresh: boolean): { x: number; y: number } | null {
    if (f === this.playerFighter) {
      if (fresh) this.beamPointerMoves = this.intents.pointerMoves;
      const swipe = this.intents.swipe;
      if (swipe) return swipe;
      // Touch (owner, 12/11/2026): while the beam pours, the movement joystick aims it (the caster
      // is rooted, so the stick has nothing else to do); it moves the fighter again afterwards.
      const stick = this.intents.moveFrom('touch');
      if (stick && Math.hypot(stick.x, stick.y) > 0.2) return stick;
      if (this.intents.pointerMoves === this.beamPointerMoves) return null;
      const p = this.pointerOnFloor();
      return p ? { x: p.x - f.x, y: p.y - f.y } : null;
    }
    let best: FighterEntity | null = null;
    let bestD = Number.POSITIVE_INFINITY;
    for (const o of this.fighters) {
      if (o.team === f.team || o.combatant.isKo) continue;
      const d = Math.hypot(o.x - f.x, o.y - f.y);
      if (d < bestD) {
        best = o;
        bestD = d;
      }
    }
    return best ? { x: best.x - f.x, y: best.y - f.y } : null;
  }

  /** A point-aimed ability being aimed by the player (Teleport), with the spot it will go to. */
  private pointAim: { slot: AbilitySlot; spot: { x: number; y: number } } | null = null;

  /** Start aiming a point-aimed ability, if it can be cast now: the target starts 3 m ahead. */
  private beginPointAim(f: FighterEntity, slot: AbilitySlot): void {
    if (!f.caster || !this.abilities) return;
    const block = f.caster.check(slot, {
      canAct: f.combatant.canAct && !f.combo.attack,
      stamina: f.combatant.stamina,
      airborne: f.airborne,
    });
    this.lastAbilityBlock = block;
    if (block || (slot !== 'ult' && f.combatant.stamina < f.caster.def(slot).staminaCost)) return;
    const start = { x: f.x + f.aim.x * 3, y: f.y + f.aim.y * 3 };
    this.pointAim = { slot, spot: this.clampToReach(f, slot, this.insideMap(start)) };
  }

  /** How fast WASD or the joystick moves this ability's target (per ability data, owner 12/11/2026). */
  private aimSpeed(f: FighterEntity, slot: AbilitySlot): number {
    const d = f.caster?.def(slot).delivery;
    return (d && 'aimSpeedMps' in d ? d.aimSpeedMps : undefined) ?? DEFAULT_AIM_SPEED_MPS;
  }

  /** Keep a target on the floor of the map. */
  private insideMap(p: { x: number; y: number }): { x: number; y: number } {
    const m = 0.3;
    return {
      x: Math.min(this.arena.widthM - m, Math.max(m, p.x)),
      y: Math.min(this.arena.heightM - m, Math.max(m, p.y)),
    };
  }

  /**
   * One step of targeting (owner, 12/11/2026): the same key confirms, Escape or ✕ cancels, being
   * hit or stunned calls it off, and the move input slides the target at the ability's aim speed.
   */
  private stepTargeting(f: FighterEntity, stepS: number): void {
    const slot = this.pointAim?.slot ?? 'ult';
    const cancel = this.intents.consumeAimCancel();
    let confirm = false;
    for (let press = this.intents.consumeAbility(); press; press = this.intents.consumeAbility())
      if (press === slot) confirm = true; // other ability keys are ignored while aiming
    if (cancel || !f.combatant.canAct) {
      this.pointAim = null;
      this.ultAimPoint = null; // the meter and cooldown are kept
      return;
    }
    const m = this.intents.move;
    const speed = this.aimSpeed(f, slot) * stepS;
    if (this.pointAim) {
      const aim = this.pointAim;
      aim.spot = this.clampToReach(
        f,
        slot,
        this.insideMap({ x: aim.spot.x + m.x * speed, y: aim.spot.y + m.y * speed }),
      );
      if (Math.hypot(aim.spot.x - f.x, aim.spot.y - f.y) > 0.1) f.faceToward(aim.spot.x - f.x, aim.spot.y - f.y);
      if (!confirm || !this.abilities) return;
      this.pointAim = null;
      this.lastAbilityBlock = this.abilities.tryCast(f, aim.slot, aim.spot);
      return;
    }
    if (confirm) {
      this.ultimatePress(f);
      return;
    }
    this.steerUltimateAim(f, stepS);
  }

  /** Is the player choosing a target right now (Escape then cancels instead of opening settings)? */
  get targeting(): { slot: AbilitySlot; name: string } | null {
    const slot = this.pointAim?.slot ?? (this.ultAimPoint ? 'ult' : null);
    const def = slot ? this.playerFighter.caster?.def(slot) : undefined;
    return slot && def ? { slot, name: def.name } : null;
  }

  /** The point-aimed ability's aiming state (indicator and tests). */
  get pointAimState(): {
    from: { x: number; y: number };
    to: { x: number; y: number };
    radiusM: number;
    maxRangeM: number;
  } | null {
    const aim = this.pointAim;
    if (!aim) return null;
    const f = this.playerFighter;
    const d = f.caster?.def(aim.slot).delivery;
    return {
      from: { x: f.x, y: f.y },
      to: aim.spot,
      radiusM: f.def.body.footRadiusM + 0.15,
      maxRangeM: d?.type === 'teleport' ? d.maxRangeM : 0,
    };
  }

  private clampToReach(f: FighterEntity, slot: AbilitySlot, p: { x: number; y: number }): { x: number; y: number } {
    const d = f.caster?.def(slot).delivery;
    const range = d?.type === 'teleport' ? d.maxRangeM : 0;
    const dx = p.x - f.x;
    const dy = p.y - f.y;
    const len = Math.hypot(dx, dy);
    if (len <= range) return p;
    return { x: f.x + (dx / len) * range, y: f.y + (dy / len) * range };
  }

  /**
   * Teleport (owner, 12/11/2026): land on the free spot nearest `to` that a body can stand on (never
   * inside walls or furniture, always inside the map). Returns where it landed, or null if no spot
   * is free nearby (the cast fizzles).
   */
  private teleportTo(f: FighterEntity, to: { x: number; y: number }): { x: number; y: number } | null {
    const physics = this.physics;
    if (!physics) return null;
    const r = f.def.body.footRadiusM;
    const inside = (p: { x: number; y: number }) =>
      p.x > r + 0.05 && p.y > r + 0.05 && p.x < this.arena.widthM - r - 0.05 && p.y < this.arena.heightM - r - 0.05;
    for (const ring of [0, 0.35, 0.7, 1.05, 1.4]) {
      const steps = ring === 0 ? 1 : 12;
      for (let k = 0; k < steps; k++) {
        const a = (k / steps) * Math.PI * 2;
        const p = { x: to.x + Math.cos(a) * ring, y: to.y + Math.sin(a) * ring };
        if (!inside(p) || !physics.isFree(p, r)) continue;
        const crowded = this.fighters.some(
          (o) => o !== f && !o.combatant.isKo && Math.hypot(o.x - p.x, o.y - p.y) < o.def.body.footRadiusM + r,
        );
        if (crowded) continue;
        f.combo.interrupt();
        f.placeAt(p);
        f.appearS = TELEPORT_APPEAR_S;
        return p;
      }
    }
    return null;
  }

  /** I / F / ULT: start aiming the leap, or launch it at the aimed spot (owner, 11/11/2026). */
  private ultimatePress(f: FighterEntity): void {
    if (!this.abilities || !f.caster) return;
    if (this.ultAimPoint) {
      const target = this.ultAim?.to ?? this.ultAimPoint;
      this.ultAimPoint = null;
      this.lastAbilityBlock = this.abilities.tryCast(f, 'ult', target);
      return;
    }
    const block = f.caster.check('ult', {
      canAct: f.combatant.canAct && !f.combo.attack,
      stamina: f.combatant.stamina,
      airborne: f.airborne,
    });
    this.lastAbilityBlock = block;
    if (block) return;
    this.ultAimPoint = this.clampToRange(f, this.insideMap(this.abilities.aimFor(f, f.caster.def('ult'))));
  }

  /** The floor point under the mouse cursor (null without a mouse over the game). */
  private pointerOnFloor(): { x: number; y: number } | null {
    const p = this.intents.pointer;
    const w = this.view?.world;
    if (!p || !w || w.scale.x === 0) return null;
    return isoToWorld((p.x - w.position.x) / w.scale.x, (p.y - w.position.y) / w.scale.y); // inverse of worldToScreen
  }

  /** Slide the aimed landing spot with WASD or the joystick, always within the leap's range. */
  private steerUltimateAim(f: FighterEntity, stepS: number): void {
    const aim = this.ultAimPoint;
    if (!aim || !f.caster) return;
    const m = this.intents.move;
    const speed = this.aimSpeed(f, 'ult') * stepS;
    this.ultAimPoint = this.clampToRange(f, this.insideMap({ x: aim.x + m.x * speed, y: aim.y + m.y * speed }));
    if (Math.hypot(this.ultAimPoint.x - f.x, this.ultAimPoint.y - f.y) > 0.1)
      f.faceToward(this.ultAimPoint.x - f.x, this.ultAimPoint.y - f.y);
  }

  private ultRange(f: FighterEntity): number {
    const d = f.caster?.def('ult').delivery;
    return d?.type === 'leap' ? d.maxRangeM : 0;
  }

  private clampToRange(f: FighterEntity, p: { x: number; y: number }): { x: number; y: number } {
    const range = this.ultRange(f);
    const dx = p.x - f.x;
    const dy = p.y - f.y;
    const len = Math.hypot(dx, dy);
    if (len <= range) return p;
    return { x: f.x + (dx / len) * range, y: f.y + (dy / len) * range };
  }

  /**
   * The ultimate's aiming state (indicator and tests): from the fighter to where it will
   * actually land (short of any wall or furniture in the way), the blast radius and the
   * maximum range.
   */
  get ultAim(): {
    from: { x: number; y: number };
    to: { x: number; y: number };
    radiusM: number;
    maxRangeM: number;
  } | null {
    const aim = this.ultAimPoint;
    const f = this.playerFighter;
    const d = f.caster?.def('ult').delivery;
    if (!aim || d?.type !== 'leap' || !this.physics) return null;
    const from = { x: f.x, y: f.y };
    const want = Math.hypot(aim.x - from.x, aim.y - from.y);
    let to = aim;
    if (want > 0.05) {
      const hit = this.physics.castWorldRay(from, aim);
      if (hit) {
        const reach = Math.max(0, want * hit.fraction - 0.5);
        to = { x: from.x + ((aim.x - from.x) / want) * reach, y: from.y + ((aim.y - from.y) / want) * reach };
      }
    }
    return { from, to, radiusM: d.radiusM, maxRangeM: d.maxRangeM };
  }

  /** The dummy holds its ground and faces you; with "dummy attacks" on it jabs back when you are close. */
  private controlDummy(f: FighterEntity, stepS: number): void {
    const p = this.playerFighter;
    const c = f.combatant;
    if (c.canAct && !f.combo.attack && !c.blinded) f.faceToward(p.x - f.x, p.y - f.y);
    if (
      !c.blinded &&
      this.dummyAttacks &&
      c.state === 'free' &&
      !f.combo.attack &&
      f.attackCooldownS === 0 &&
      !p.combatant.isKo &&
      // Within its jab's reach (reach + hit radius + body radius ≈ 1.4 m ahead, ±0.6 m to the side).
      Math.abs(p.x - f.x) < 1.35 &&
      Math.abs(p.y - f.y) < 0.6
    ) {
      f.combo.press(GROUND);
      if (this.rng() < f.def.ai.aggression) f.combo.press(GROUND); // sometimes a follow-up (AI profile)
      f.attackCooldownS = f.def.ai.attackEveryS;
    }
    this.stepFighter(f, stepS, { x: 0, y: 0 }, false, f.def.ai.settleDecelMps2);
  }

  /** Shared per-fighter step: attacks, movement by state, jump, landing. */
  private stepFighter(
    f: FighterEntity,
    stepS: number,
    moveIn: { x: number; y: number },
    jump: boolean,
    /** Stopping rate with no input (defaults to the fighter's own deceleration; the dummy settles slower). */
    idleDecel?: number,
  ): void {
    const body = f.body;
    if (!body) return;
    const c = f.combatant;
    const air = f.airborne;
    if (!c.canAct) f.combo.interrupt();
    this.abilities?.stepCaster(f, stepS);
    const cast = f.caster?.cast ?? null;

    const ev = f.combo.update(stepS, air);
    const attack = f.combo.attack;
    const tuning = f.def.movement;
    const v = body.linvel();

    let next: { x: number; y: number };
    f.moveIntent.x = 0;
    f.moveIntent.y = 0;
    if (f.driveVelocity) {
      next = f.driveVelocity; // dash or leap: the ability world moves the body
    } else if (c.state === 'dodging') {
      // Fast off the mark, easing to a stop: speed falls linearly over the dodge, averaging
      // dodgeSpeedMps, so every dodge covers the same distance and ends without a slide.
      const speed = DEFENCE.dodgeSpeedMps * 2 * (1 - c.dodgeProgress);
      next = { x: f.dodgeDir.x * speed, y: f.dodgeDir.y * speed };
    } else if (!c.canAct) {
      // Stunned, knocked down or KO: slide to a stop (further while flying from a heavy blow).
      const decel = f.knockFlightS > 0 ? KNOCK_FLIGHT_DECEL : SETTLE_DECEL;
      next = stepVelocity(v, { x: 0, y: 0 }, { maxSpeedMps: 0, accelMps2: 0, decelMps2: decel }, stepS);
    } else {
      let move = moveIn;
      const factor = cast
        ? cast.def.moveFactor
        : c.state === 'guarding'
          ? 0.35
          : attack && !air
            ? attack.moveFactor
            : 1;
      move = { x: move.x * factor, y: move.y * factor };
      f.moveIntent.x = move.x;
      f.moveIntent.y = move.y;
      const isIdle = move.x === 0 && move.y === 0;
      const decel =
        f.knockFlightS > 0 ? KNOCK_FLIGHT_DECEL : isIdle ? (idleDecel ?? tuning.decelMps2) : tuning.decelMps2;
      const sprint = f.sprinting && !attack && !cast && c.state !== 'guarding' && !air ? SPRINT.speedFactor : 1;
      const buffed = f.buff?.speedFactor ?? 1;
      next = stepVelocity(
        v,
        move,
        { ...tuning, maxSpeedMps: tuning.maxSpeedMps * sprint * buffed, decelMps2: decel },
        stepS,
      );
      if (!attack && !cast && Math.hypot(moveIn.x, moveIn.y) > 0.1 && f === this.playerFighter)
        f.faceToward(moveIn.x, moveIn.y);
    }
    body.setLinvel(next, true);

    if (jump && !air) {
      f.jumps++;
      f.airJumpReady = f.def.capabilities.canDoubleJump;
      this.characterSound(f, 'jump', 0.7);
    } else if (jump && air && f.airJumpReady) {
      // Double jump (capability): a second, slightly smaller push in the air.
      f.airJumpReady = false;
      f.jumps++;
      f.hop = { heightM: f.hop.heightM, verticalSpeedMps: tuning.jumpSpeedMps * 0.85 };
      this.characterSound(f, 'jump', 0.7);
    }
    f.hop = stepHop(f.hop, jump, tuning, stepS);
    if (air && !f.airborne) {
      f.combo.landed();
      f.airJumpReady = false;
      this.characterSound(f, 'land', 0.6);
    }

    if (ev.hit) this.resolveHit(f, ev.hit);
  }

  /**
   * The one hit path for melee and abilities (INV-5): combat rules, floating text,
   * parry, interruption, ultimate charge, burn, knockback, and the impact feel
   * (owner, 11/11/2026): white flash, contact sound, sparks along the blow,
   * attacker recoil, shake and hit-stop from the blow's impact profile.
   * `dir` scales the knockback velocity (melee uses facing plus a little sideways).
   * Returns true if the hit connected (anything but a dodge or an ignored hit).
   */
  private applyStrike(
    attacker: FighterEntity,
    target: FighterEntity,
    s: {
      damage: number;
      heavy: boolean;
      knockbackMps: number;
      dir: { x: number; y: number };
      melee: boolean;
      burn?: Burn;
      impact: ImpactId;
      /** Breaks through any guard (the Punch Clash finisher). */
      unblockable?: boolean;
      /** Use this impact feel instead of the blow's profile (scaled finishers). */
      profile?: ImpactProfile;
      /** Punch or kick (picks the attacker's impact effect and sound). */
      category?: 'punch' | 'kick';
      /** An effect on contact instead of the profile's default (Effects library id). */
      effect?: string | null;
      /** The target bounces off the floor. */
      groundBounce?: boolean;
      /** The target's body flashes this colour instead of the attacker's flash colour. */
      flashColour?: number;
      /** Stun the target this long if the blow lands unguarded (Crushing Strike). */
      stunS?: number;
    },
  ): boolean {
    if (!target.body || target.combatant.isKo) return false;
    const t = target.body.translation();
    // A block only works when facing the attacker.
    // In front: the attacker is on the side the target faces (any direction in the 2.5D view).
    const fromFront = !s.unblockable && (attacker.x - t.x) * target.aim.x + (attacker.y - t.y) * target.aim.y > 0;
    const result = target.combatant.receive(
      {
        baseDamage: s.damage,
        attackerPower: attacker.def.stats.power,
        heavy: s.heavy,
        fromFront,
        critRoll: this.rng(),
      },
      attacker.def.stats.critChance,
      attacker.def.stats.critMultiplier,
    );
    if (result.outcome === 'ignored') return false;
    this.events.push({
      kind: result.outcome,
      target: target.name,
      x: t.x,
      y: t.y - headTop(target),
      amount: result.damage,
    });

    if (result.outcome === 'dodged') return false;
    const guarded = result.outcome === 'blocked' || result.outcome === 'parried';
    if (guarded)
      target.shieldS = SHIELD_FLARE_S; // the guard flares where it took the blow (PRS-5)
    else {
      // Combo counter (PRS-4): landed hits close together chain; the second and later call out.
      attacker.comboCount = this.simTimeS - attacker.lastLandS <= COMBO_WINDOW_S ? attacker.comboCount + 1 : 1;
      attacker.lastLandS = this.simTimeS;
      if (attacker.comboCount >= 2) {
        this.events.push({
          kind: 'combo',
          target: target.name,
          x: t.x,
          y: t.y - headTop(target) - 0.45,
          amount: attacker.comboCount,
        });
      }
    }
    const profile = s.profile ?? (guarded ? IMPACTS.blocked : IMPACTS[s.impact]);
    this.impactFeel(attacker, target, s, profile, result.outcome, guarded);
    if (s.groundBounce && !guarded && target.combatant.state !== 'ko') {
      target.hop = { heightM: Math.max(0.02, target.hop.heightM), verticalSpeedMps: 3.6 }; // bounced off the floor
    }
    if (s.melee) this.clashes.contact(attacker, this.simTimeS); // a sustained exchange becomes a Punch Clash

    if (result.outcome === 'parried') {
      if (s.melee) {
        attacker.combatant.stun(result.attackerStunS);
        attacker.combo.interrupt();
        this.abilities?.interrupt(attacker, false);
      }
      this.shake.addTrauma(0.25);
      this.hitstopS = HITSTOP_HEAVY_S;
      return true;
    }

    // Damage dealt and taken fills the ultimate meters (OQ-04: charge meter).
    attacker.caster?.onDamage(result.damage, 0);
    target.caster?.onDamage(0, result.damage);
    if (result.outcome !== 'blocked') {
      target.combo.interrupt();
      this.abilities?.interrupt(target, result.outcome === 'ko');
      if (s.burn && result.outcome !== 'ko') target.combatant.ignite(s.burn.dps, s.burn.durationS);
      if (s.stunS && result.outcome !== 'ko') target.combatant.stun(s.stunS);
    }

    const speed = s.knockbackMps * result.knockbackScale;
    target.body.setLinvel({ x: s.dir.x * speed, y: s.dir.y * speed }, true);
    target.knockFlightS = speed >= HEAVY_KNOCKBACK_MPS ? KNOCK_FLIGHT_S : 0;
    target.wallSlammed = false; // a new flight may chip a wall again
    if (result.outcome === 'ko') {
      // Finished off by fire: the body burns away to ash (owner, 11/11/2026).
      if (s.impact === 'fire' || s.impact === 'fire-heavy' || s.burn) target.koByFire = true;
      this.hitstopS = Math.max(this.hitstopS, HITSTOP_KO_S); // a longer, cinematic freeze on the final blow
      this.shake.addTrauma(0.7);
      this.shake.punch(0.08);
    }
    return true;
  }

  /** Flash, sound, sparks, recoil, shake and hit-stop for one contact. */
  private impactFeel(
    attacker: FighterEntity,
    target: FighterEntity,
    s: {
      dir: { x: number; y: number };
      melee: boolean;
      heavy: boolean;
      category?: 'punch' | 'kick';
      effect?: string | null;
      flashColour?: number;
    },
    profile: ImpactProfile,
    outcome: HitOutcome,
    guarded: boolean,
  ): void {
    const len = Math.hypot(s.dir.x, s.dir.y) || 1;
    const dir = { x: s.dir.x / len, y: s.dir.y / len };
    const fx = attacker.def.effects;
    if (!guarded) {
      // A magic attack flashes the body white a little longer, so the hit reads clearly (owner, 11/11/2026).
      target.flashS = Math.max(
        target.flashS,
        s.flashColour !== undefined ? Math.max(profile.flashS, 0.12) : profile.flashS,
      );
      target.flashColour = s.flashColour ?? colourOf(fx.flashColour);
    }
    this.hitstopS = Math.max(this.hitstopS, profile.hitstopS * fx.hitstopScale);
    this.shake.addTrauma(profile.shake * fx.shakeScale);
    // The look of the contact comes from the attacker's Effects Profile (TD-039).
    const effectId = guarded
      ? fx.blockImpact
      : (s.effect ?? (s.heavy ? fx.heavyImpact : s.category === 'kick' ? fx.kickImpact : fx.punchImpact));
    const elemental = attacker.def.capabilities.usesElementalEffects;
    const effect = EFFECTS[effectId] ?? EFFECTS['impact-light']!;
    this.pushEffect(target.x - dir.x * 0.2, target.y, dir, elemental ? effect : withoutElements(effect));
    // Ability hits already play their own impact sound from the ability's hooks.
    if (s.melee) {
      const key: AudioKey =
        outcome === 'parried'
          ? 'parry'
          : guarded
            ? 'block'
            : s.category === 'kick'
              ? s.heavy
                ? 'heavyKick'
                : 'lightKick'
              : s.heavy
                ? 'heavyPunch'
                : 'lightPunch';
      this.characterSound(guarded ? target : attacker, key);
    }
    if (outcome === 'ko') this.characterSound(target, 'defeat');
    if (s.melee && profile.recoilMps > 0 && attacker.body) {
      // The striker bounces back a little off the contact.
      const v = attacker.body.linvel();
      attacker.body.setLinvel({ x: v.x - dir.x * profile.recoilMps, y: v.y - dir.y * profile.recoilMps }, true);
      attacker.recoilS = RECOIL_BOUNCE_S;
    }
  }

  /**
   * A knocked-back fighter slammed into a wall (its speed collapsed this step):
   * it bounces off (capability canWallBounce) or stops dead, with a thud.
   */
  private wallImpact(f: FighterEntity, before: { x: number; y: number }): void {
    const body = f.body;
    if (!body) return;
    const speed = Math.hypot(before.x, before.y);
    const after = body.linvel();
    if (speed < 3 || Math.hypot(after.x, after.y) > speed * 0.4) return;
    const dir = { x: before.x / speed, y: before.y / speed };
    const ahead = {
      x: f.x + dir.x * (f.def.body.footRadiusM + 0.25),
      y: f.y + dir.y * (f.def.body.footRadiusM + 0.25),
    };
    if (!this.physics?.castWorldRay({ x: f.x, y: f.y }, ahead)) return; // stopped by something else (a fighter)
    if (f.def.capabilities.canWallBounce) {
      body.setLinvel({ x: -before.x * 0.45, y: -before.y * 0.45 }, true);
      f.knockFlightS = Math.max(f.knockFlightS, 0.3);
    } else {
      body.setLinvel({ x: 0, y: 0 }, true);
      f.knockFlightS = 0;
    }
    this.characterSound(f, 'wallImpact', Math.min(1.4, speed / 7));
    this.shake.addTrauma(Math.min(0.5, speed / 20));
    f.flashS = Math.max(f.flashS, 0.06);
    this.pushEffect(ahead.x, ahead.y, { x: -dir.x, y: -dir.y }, 'impact-heavy', 0.7);
    this.wallHits++;
  }

  /** Spawn a library effect (sparks, embers, ring, scorch) at a contact point. */
  private pushEffect(
    x: number,
    y: number,
    dir: { x: number; y: number },
    effectId: string | EffectDef,
    scale = 1,
  ): void {
    const e = typeof effectId === 'string' ? EFFECTS[effectId] : effectId;
    if (!e) return;
    this.impacts.push({
      x,
      y,
      dir,
      sparks: Math.round((e.sparks?.count ?? 0) * scale),
      speedMps: e.sparks?.speedMps ?? 5,
      colour: e.sparks?.colour ?? e.ring?.colour ?? 0xffffff,
      burstM: (e.ring?.sizeM ?? 0.3) * Math.sqrt(scale),
      embers: e.embers ? Math.round(e.embers * scale) : undefined,
      scorchM: e.scorchM,
    });
  }

  /** Play one of a fighter's sounds for an event (its Audio Profile; variations picked at random). */
  private characterSound(f: FighterEntity, key: AudioKey, gain = 1): void {
    const list = f.def.audio[key];
    if (!list || list.length === 0) return;
    this.queueSound(list[Math.floor(this.fxRng() * list.length)]!, gain);
  }

  private queueSound(id: string, gain = 1): void {
    this.sounds.push({ id, gain });
    if (this.sounds.length > 48) this.sounds.shift();
  }

  /** Sounds to play now (melee contacts, clash beats, KOs, dusting and ability hooks), oldest first. */
  drainSoundCues(): { id: string; gain: number }[] {
    const ability = (this.abilities?.drainSounds() ?? []).map((id) => ({ id, gain: 1 }));
    return [...this.sounds.splice(0, this.sounds.length), ...ability];
  }

  /** Sound ids to play now (tests). */
  drainSounds(): string[] {
    return this.drainSoundCues().map((c) => c.id);
  }

  /** The Punch Clash HUD: live power and timer, and the result banner. */
  get clashHud(): { state: ClashHudState | null; banner: ClashBanner | null } {
    return { state: this.clashes.hud(), banner: this.clashes.banner };
  }

  /** Start a Punch Clash now (Practice option and tests). */
  startClash(): void {
    this.clashes.start();
  }

  /** Burn damage shows as small floating numbers, at most twice a second; it also charges the ultimate. */
  private showBurn(f: FighterEntity, damage: number): void {
    f.caster?.onDamage(0, damage);
    f.burnShown += damage;
    if (f.burnShown < 1 || f.burnTextS > 0) return;
    this.events.push({ kind: 'burn', target: f.name, x: f.x, y: f.y - headTop(f), amount: Math.round(f.burnShown) });
    f.burnShown = 0;
    f.burnTextS = 0.5;
  }

  /** An attack reached its active window: check its hit capsule against other fighters and doors. */
  private resolveHit(attacker: FighterEntity, a: AttackDef): void {
    const body = attacker.body;
    if (!body) return;
    const dir = { x: attacker.aim.x, y: attacker.aim.y };
    const p = body.translation();
    const capsule = hitCapsule(p, dir, a);
    let connected = false;
    let hitFighter = false; // fighter contacts shake through their impact profile
    let reachedFighter = false; // the blow reached someone (even if blocked or dodged): not a miss

    if (a.lungeMps > 0) {
      const v = body.linvel();
      body.setLinvel({ x: v.x + dir.x * a.lungeMps, y: v.y + dir.y * a.lungeMps }, true);
    }

    for (const target of this.fighters) {
      if (target.team === attacker.team || !target.body || target.combatant.isKo) continue;
      const t = target.body.translation();
      if (distanceToCapsule(capsule, t.x, t.y) > a.hitRadiusM + target.def.body.footRadiusM) continue;
      reachedFighter = true;
      // Knocked back along the blow, nudged a little toward where the target actually stands.
      const tx = t.x - p.x;
      const ty = t.y - p.y;
      const tl = Math.hypot(tx, ty) || 1;
      const kx = dir.x * 0.75 + (tx / tl) * 0.25;
      const ky = dir.y * 0.75 + (ty / tl) * 0.25;
      const kl = Math.hypot(kx, ky) || 1;
      const strike = {
        damage: a.damage,
        heavy: a.heavy,
        knockbackMps: a.knockbackSpeedMps,
        melee: true,
        impact: a.impact,
        category: a.category,
        effect: a.effect,
        groundBounce: a.groundBounce,
        burn: a.burn ?? undefined,
      };
      if (this.applyStrike(attacker, target, { ...strike, dir: { x: kx / kl, y: ky / kl } })) {
        connected = true;
        hitFighter = true;
      }
    }

    for (const door of this.doors) {
      if (door.broken || !capsuleTouchesRect(capsule, door.spec)) continue;
      connected = true;
      const broke = door.applyImpact({
        kind: a.blow === 'kick' ? 'kick' : 'strike',
        strength: a.strength,
        direction: { x: dir.x, y: dir.y },
      });
      if (broke) {
        this.shake.addTrauma(0.75);
        this.shake.punch(0.08);
      }
    }

    // Breakable wall sections: every blow chips the section it lands on (owner, 11/11/2026).
    // Damage builds up on the one section the blow lands on (wall-break power: Inferno's flaming fists
    // crack stone far faster, owner 12/11/2026).
    const wallHit = this.walls?.hitWhere((r) => capsuleTouchesRect(capsule, r), {
      damage: a.damage * attacker.def.stats.power * (attacker.def.objects.wallBreakPower ?? 1),
      direction: { x: dir.x, y: dir.y },
      at: { x: capsule.bx, y: capsule.by },
      fire: attacker.def.capabilities.usesFireEffects === true,
    });
    if (wallHit && wallHit.hit > 0) connected = true;

    // Furniture: moves or breaks depending on its durability.
    const props = this.props?.hitWhere((r) => capsuleTouchesRect(capsule, r), {
      blow: a.blow === 'kick' ? 'kick' : 'strike',
      damage: a.damage * attacker.def.stats.power,
      strength: a.strength,
      direction: { x: dir.x, y: dir.y },
    });
    if (props && props.hit > 0) {
      connected = true;
      if (props.broke > 0) this.shake.addTrauma(0.35);
    }

    if (connected) {
      attacker.hits++;
      if (!hitFighter) this.shake.addTrauma(a.trauma);
      this.shake.punch(a.zoomPunch);
    }
    if (!reachedFighter) {
      // MISS (PRS-4), only when someone was close enough that the swing was meant for them.
      const near = this.fighters.some(
        (o) => o.team !== attacker.team && !o.combatant.isKo && Math.hypot(o.x - p.x, o.y - p.y) < MISS_CALLOUT_RANGE_M,
      );
      if (near)
        this.events.push({ kind: 'miss', target: attacker.name, x: p.x, y: p.y - headTop(attacker), amount: 0 });
    }
  }

  /** A fighter flying from a heavy knockback smashes a door, and shoves or breaks furniture, that it hits. */
  private checkDoorImpact(f: FighterEntity, stepS: number): void {
    if (f.knockFlightS <= 0 || !f.body) return;
    const v = f.body.linvel();
    const speed = Math.hypot(v.x, v.y);
    if (speed === 0) return;
    const pos = f.body.translation();
    const reach = f.def.body.footRadiusM + speed * stepS + 0.05;
    const strength = f.def.body.massKg * speed;
    const direction = { x: v.x / speed, y: v.y / speed };
    const props = this.props?.hitWhere((r) => circleTouchesRect(pos, reach, r), {
      blow: 'knockback',
      damage: strength * KNOCK_PROP_DAMAGE,
      strength,
      direction,
    });
    if (props && props.broke > 0) this.shake.addTrauma(0.35);
    // A body slammed into the wall chips it too (once per flight).
    if (!f.wallSlammed) {
      const slam = this.walls?.hitWhere((r) => circleTouchesRect(pos, reach, r), {
        damage: strength * WALL_SLAM_PER_STRENGTH,
        direction,
        at: pos,
      });
      if (slam && slam.hit > 0) f.wallSlammed = true;
    }
    for (const door of this.doors) {
      if (door.broken || !circleTouchesRect(pos, reach, door.spec)) continue;
      const broke = door.applyImpact({ kind: 'knockback', strength, direction });
      if (broke) {
        this.shake.addTrauma(0.75);
        this.shake.punch(0.08);
      }
    }
  }

  render(alpha: number, frameDtS: number): void {
    if (!this.view || !this.camera) return;
    const positions = this.fighters.map((f) => this.renderFighter(f, alpha, frameDtS));
    const [me, other] = positions as [{ x: number; y: number }, { x: number; y: number }];

    for (const door of this.doors) {
      const view = this.view.doors.get(door.spec.id);
      if (!view) continue;
      if (door.broken) view.showBroken(door.pieces, (node) => this.view?.actors.add(node, 0));
      else view.showSwing(door.swing, door.swingSide);
    }
    this.renderProps();
    this.renderWalls();
    this.renderFireLight();
    this.renderAbilityFx(frameDtS);
    this.view.actors.update();
    // Keep both fighters visible: fade whatever stands in front of them.
    const viewers = this.fighters.flatMap((f) =>
      f.view ? [{ node: f.view.root, depth: () => f.view?.root.zIndex ?? 0 }] : [],
    );
    this.occlusion?.update(viewers, frameDtS);

    // Frame the player and the dummy (aiming at torsos), then apply impact shake.
    const { width, height } = this.viewport();
    const focus = this.clashes.focus();
    const cam = this.camera.update(
      iso(me.x, me.y, 0.8),
      [iso(other.x, other.y, 0.8)],
      frameDtS,
      width,
      height,
      focus ? { ...focus, ...iso(focus.x, focus.y, 0.9) } : null,
    );
    const shake = this.shake.update(frameDtS);
    let scale = cam.scale * shake.zoom;
    let cx = cam.x + shake.offsetX;
    let cy = cam.y + shake.offsetY;
    if (this.overview) {
      const b = this.viewBounds();
      const fit = fitRectToView(b.maxX - b.minX, b.maxY - b.minY, width, height, 8);
      scale = fit.scale;
      cx = (b.minX + b.maxX) / 2;
      cy = (b.minY + b.maxY) / 2;
    }
    this.view.world.scale.set(scale);
    this.view.world.position.set(width / 2 - cx * scale, height / 2 - cy * scale);
    this.cameraState = {
      ...cam,
      x: cx,
      y: cy,
      scale,
      trauma: this.shake.trauma,
      shakeOffset: Math.hypot(shake.offsetX, shake.offsetY),
      zoom: shake.zoom,
    };
  }

  /**
   * Breakable wall sections: dust and a thud on every chip, cracks as a section weakens, and a hole
   * with rubble when one gives way (owner, 11/11/2026).
   */
  private renderWalls(): void {
    const view = this.view;
    if (!view || !this.walls) return;
    for (const e of this.walls.drainEvents()) {
      const nodes = view.walls[e.index] ?? [];
      const puff = Array.from({ length: 6 }, (_, k) => ({
        x: e.x + ((k % 3) - 1) * 0.12,
        y: e.y,
        z: 0.4 + (k % 3) * 0.45,
      }));
      if (e.kind === 'break') {
        for (const n of nodes) n.visible = false;
        this.queueSound('break-wall', 1.2);
        this.shake.addTrauma(0.4);
        this.frameDust.push({ points: puff, colour: 0xe6ded2, colours: [0xd9d1c4, 0xbfb6a8, 0xf4f0ea], count: 140 });
        this.props?.debris.add({
          position: { x: e.x, y: e.y },
          halfExtents: { x: 0.1, y: 0.06 },
          velocity: { x: e.dir.x * 2.5, y: e.dir.y * 2.5 },
          spin: 5,
          massKg: 3,
          colour: 0xd9d1c4,
          heightM: 1,
          verticalSpeedMps: 1.5,
        });
        for (let k = 0; k < 7; k++) {
          this.props?.debris.add({
            position: { x: e.x + ((k % 3) - 1) * 0.15, y: e.y + ((k % 2) - 0.5) * 0.15 },
            halfExtents: { x: 0.05 + (k % 3) * 0.03, y: 0.04 },
            velocity: {
              x: e.dir.x * (1.5 + k * 0.3) - e.dir.y * ((k % 3) - 1),
              y: e.dir.y * (1.5 + k * 0.3) + e.dir.x * ((k % 3) - 1),
            },
            spin: (k % 2 ? 1 : -1) * (4 + k),
            massKg: 1,
            colour: k % 2 ? 0xbfb6a8 : 0xe6ded2,
            heightM: 0.4 + (k % 4) * 0.4,
            verticalSpeedMps: 1 + (k % 3) * 0.6,
          });
        }
      } else {
        this.queueSound('wall-thud', 0.5);
        // Progressive damage on exactly this section (owner, 12/11/2026): cracks spread, plaster
        // spalls, the face caves in; fire blackens it and leaves the cracks glowing.
        let state = this.wallDamage.get(e.index);
        if (!state) {
          state = { damage: 0, scorch: 0, overlays: nodes.map((n) => n.addChild(new Graphics())) };
          this.wallDamage.set(e.index, state);
        }
        state.damage = 1 - e.left;
        if (e.fire) state.scorch = Math.min(1, state.scorch + 0.2);
        for (const g of state.overlays) drawWallDamage(g, { ...state, seed: e.index });
        // More dust and flying chips the weaker it gets; embers when fire hits it.
        this.frameDust.push({ points: puff.slice(0, 3), colour: 0xe6ded2, count: 14 + Math.round(state.damage * 30) });
        if (state.damage > 0.4) {
          for (let k = 0; k < 2; k++)
            this.props?.debris.add({
              position: { x: e.x, y: e.y },
              halfExtents: { x: 0.03 + k * 0.02, y: 0.025 },
              velocity: { x: e.dir.x * -1.5 + (k - 0.5), y: e.dir.y * -1.5 + (0.5 - k) },
              spin: k ? 6 : -6,
              massKg: 0.3,
              colour: k ? 0xbfb6a8 : 0xe6ded2,
              heightM: 1 + k * 0.2,
              verticalSpeedMps: 1.2,
            });
        }
        if (e.fire) this.frameFlames.push({ points: [{ x: e.x, y: e.y, z: 1.1 }], strength: 0.6 });
      }
    }
  }

  /**
   * Firelight (TD-045, owner-approved mockup): a flame-headed fighter casts a warm, flickering
   * pool of light on the floor around it, drawn additively in the floor layer.
   */
  private renderFireLight(): void {
    const view = this.view;
    if (!view) return;
    if (!this.fireLight) {
      this.fireLight = new Graphics();
      this.fireLight.blendMode = 'add';
      view.floor.addChild(this.fireLight);
    }
    const g = this.fireLight.clear();
    const t = this.simTimeS;
    for (const f of this.fighters) {
      if (!f.view || f.combatant.isKo || !f.def.capabilities.usesFireEffects || f.def.effects.head !== 'flame')
        continue;
      const flick = 0.9 + Math.sin(t * 11) * 0.05 + Math.sin(t * 17.7) * 0.05;
      for (let i = 0; i < 7; i++) {
        g.circle(f.x, f.y, (0.5 + i * 0.42) * flick).fill({ color: 0xff8a2a, alpha: 0.045 });
      }
    }
  }

  /** Furniture sounds and particles by material: splinters and sawdust, sparks off steel, glints off glass. */
  private propFeedback(): void {
    for (const e of this.props?.drainEvents() ?? []) {
      if (e.kind === 'break' && e.prop === 'fire-extinguisher') {
        // A burst extinguisher: a hiss and a big white cloud of foam (Phase 7).
        this.queueSound('foam-burst', 1);
        const pts = Array.from({ length: 10 }, (_, k) => ({
          x: e.x + ((k % 3) - 1) * 0.3,
          y: e.y + ((k % 4) - 1.5) * 0.25,
          z: 0.2 + (k % 5) * 0.25,
        }));
        this.frameDust.push({ points: pts, colour: 0xf4f6f8, colours: [0xffffff, 0xe6ecf2, 0xd9e2ea], count: 160 });
      }
      const sound = PROP_SOUNDS[e.material]?.[e.kind];
      if (sound) this.queueSound(sound, e.kind === 'break' ? Math.min(1.4, 0.8 + e.sizeM * 0.3) : 0.7);
      const len = Math.hypot(e.dir.x, e.dir.y) || 1;
      const dir = { x: e.dir.x / len || 1, y: e.dir.y / len };
      const big = e.kind === 'break';
      if (e.material === 'metal' || e.material === 'glass' || e.material === 'ceramic') {
        const spark: ImpactProfile = {
          ...IMPACTS['knuckle-light'],
          sparks: big ? 22 : 8,
          sparkSpeedMps: big ? 7 : 4,
          sparkColour: e.material === 'metal' ? 0xffd27a : 0xd8f6ff,
          burstM: big ? 0.5 : 0.25,
        };
        this.impacts.push(burstFromProfile(e.x, e.y + (1.1 - e.z), dir, spark));
      }
      if (big && e.material !== 'metal' && e.material !== 'glass') {
        // A puff of sawdust, stuffing or soil where it broke.
        const colour = e.material === 'wood' ? 0xc9a27a : e.material === 'plant' ? 0x7a5a3a : 0xe6e1d6;
        const points = Array.from({ length: 5 }, (_, i) => ({
          x: e.x + (i - 2) * 0.12,
          y: e.y,
          z: e.z * (0.4 + i * 0.15),
        }));
        this.frameDust.push({ points, colour, count: Math.round(10 + e.sizeM * 14) });
      }
    }
  }

  /** Moving props follow their bodies; broken ones are replaced by their pieces; fallen desk items lie on the floor. */
  private renderProps(): void {
    const view = this.view;
    if (!view || !this.props) return;
    for (const prop of this.props.props) {
      const node = view.props.get(prop.index);
      if (!node) continue;
      if (prop.broken) {
        node.visible = false;
        continue;
      }
      const pose = prop.pose;
      const at = iso(pose.x, pose.y);
      node.position.set(at.x, at.y);
      // Furniture keeps its upright drawing when it slides (a spin would tilt the whole picture);
      // small loose items still tumble.
      node.rotation = prop.kind.solid ? 0 : pose.angle * 0.3;
      this.occlusion?.setExempt(node, prop.held !== null || prop.flight !== null);
      const lift = prop.held?.heightM ?? prop.looseFall?.heightM ?? null;
      if (lift === null && this.grounded.has(prop.index)) node.pivot.y = 0; // replanted furniture
      if (lift !== null) {
        // The drawing has its desk height built in: draw it at its carried or falling height instead.
        node.pivot.y = lift - (prop.placement.elevationM ?? 0);
        if (!this.grounded.has(prop.index)) {
          this.grounded.add(prop.index);
          view.actors.remove(node);
          view.actors.add(node, 0);
        }
      }
    }
    this.debrisView?.sync(this.props.debris.pieces);
  }

  /** Fire effects: projectiles, trails, telegraphs, bursts and flames on burning things; big blasts shake the camera. */
  private renderAbilityFx(frameDtS: number): void {
    if (!this.vfx || !this.abilities) return;
    const fx = this.abilities.drainFx();
    for (const e of fx) {
      if (e.kind !== 'impact' || (e.radiusM ?? 0) < 2) continue;
      this.shake.addTrauma((e.radiusM ?? 0) >= 2.8 ? 0.85 : 0.5); // the Eruption slam hits hardest
      if (
        e.ability === this.playerFighter.caster?.def('ult').id ||
        e.ability === this.dummyFighter.caster?.def('ult').id
      ) {
        this.showcases++; // an ultimate landed: the showcase flash (PRS-8)
      }
      this.shake.punch(0.06);
    }
    const charges: ChargeFx[] = [];
    const auras: AuraFx[] = [];
    const trails: DashTrailFx[] = [];
    const burning: BurningThing[] = this.frameBurning.splice(0, this.frameBurning.length);
    const smoke = this.frameSmoke.splice(0, this.frameSmoke.length);
    for (const f of this.fighters) {
      const c = f.combatant;
      if (c.burning) {
        // Burning aftermath (owner, 11/11/2026): flames all over the body, shrinking as the burn
        // runs out, embers flying off, then smoke that fades after it goes out.
        f.burnTotalS = Math.max(f.burnTotalS, c.burnLeftS);
        const left = f.burnTotalS > 0 ? c.burnLeftS / f.burnTotalS : 1;
        const h = f.hop.heightM;
        burning.push({ x: f.x, y: f.y, heightM: h + 0.6 + 0.7 * left, baseM: h, widthM: 0.5 });
        const o = screenSideToWorld(0.18 * f.facing);
        burning.push({ x: f.x + o.x, y: f.y + o.y, heightM: h + 1.0 + 0.6 * left, baseM: h + 0.6, widthM: 0.42 });
        if (this.fxRng() < 0.35) {
          this.frameFlames.push({
            points: [besideOnScreen(f.x, f.y, (this.fxRng() - 0.5) * 0.4, h + 0.3 + this.fxRng() * 1.2)],
            strength: 0.35 * left + 0.1,
          });
        }
        if (this.fxRng() < 0.25) smoke.push({ x: f.x, y: f.y, z: h + 1.4, count: 1 });
        f.smokeS = BURN_SMOKE_S;
      } else {
        f.burnTotalS = 0;
        if (f.smokeS > 0 && !c.isKo) {
          f.smokeS = Math.max(0, f.smokeS - frameDtS);
          if (this.fxRng() < 0.5 * (f.smokeS / BURN_SMOKE_S))
            smoke.push({ x: f.x, y: f.y, z: 1 + this.fxRng() * 0.5, count: 1 });
        }
      }
      // Casts charging (Magic Attack VFX Standard): the element gathers to the hand, and around
      // the body for beams and leaps.
      const cast = f.caster?.cast;
      if (cast?.phase === 'windup' && cast.def.look?.charge && f.view && !c.isKo) {
        const tip = f.view.limbTips().fists[0];
        const hand = tip ? besideOnScreen(f.x, f.y, tip.x, tip.z) : { x: f.x, y: f.y, z: 1 };
        charges.push({
          x: f.x,
          y: f.y,
          hand,
          progress: f.caster!.phaseProgress,
          look: cast.def.look,
          body: cast.def.delivery.type !== 'projectile',
        });
      }
      // A fury buff: red motes and steam rise off the body, with a red glow on the floor.
      if (f.buff && !c.isKo) {
        const look = f.caster?.def('ult').look;
        if (look)
          auras.push({
            x: f.x,
            y: f.y,
            palette: look.palette,
            strength: Math.min(1, f.buff.leftS),
            quiet: look.aura === 'quiet',
          });
      }
      // A charge (a dash with a look): dust kicked up behind the feet.
      if (f.driveVelocity && cast?.def.delivery.type === 'dash' && cast.def.look?.flight) {
        const sp = Math.hypot(f.driveVelocity.x, f.driveVelocity.y) || 1;
        trails.push({
          x: f.x,
          y: f.y,
          dirX: f.driveVelocity.x / sp,
          dirY: f.driveVelocity.y / sp,
          look: cast.def.look,
        });
      }
      // Eruption in the air: the whole body wrapped in flames and glowing embers (only the leaper's
      // own leap; a fighter hoisted by a grab is lifted too, without fire).
      if (f.abilityLift > 0.05 && cast?.def.delivery.type === 'leap') {
        const pts = [0.2, 0.6, 1.0, 1.4].map((z) =>
          besideOnScreen(f.x, f.y, (this.fxRng() - 0.5) * 0.3, f.abilityLift + z),
        );
        this.frameFlames.push({ points: pts, strength: 1 });
        burning.push({ x: f.x, y: f.y, heightM: f.abilityLift + 1.1, baseM: f.abilityLift, widthM: 0.75 });
        burning.push({ x: f.x, y: f.y, heightM: f.abilityLift + 1.8, baseM: f.abilityLift + 0.8, widthM: 0.55 });
      }
    }
    for (const p of this.props?.props ?? []) {
      if (p.burnS > 0 && !p.broken) {
        const lift = p.held?.heightM ?? p.looseFall?.heightM ?? 0;
        burning.push({ x: p.pose.x, y: p.pose.y, heightM: lift + p.size.h + 0.35, baseM: lift });
      }
    }
    const world = this.abilities.world;
    // Grave Chains: from the caster to the flying hook, then to the enemy being dragged in.
    const chains: { from: { x: number; y: number }; to: { x: number; y: number }; palette: MagicLook['palette'] }[] =
      [];
    for (const p of world.projectiles) {
      const caster = p.def.payload.pull && p.def.look ? this.fighterByName(p.casterId) : null;
      if (caster && p.def.look)
        chains.push({ from: { x: caster.x, y: caster.y }, to: { x: p.x, y: p.y }, palette: p.def.look.palette });
    }
    world.forEachPull((casterId, targetId) => {
      const caster = this.fighterByName(casterId);
      const target = this.fighterByName(targetId);
      const kit = caster?.caster;
      const look = kit ? ABILITY_SLOTS.map((s) => kit.def(s)).find((d) => d.payload.pull)?.look : undefined;
      if (caster && target && look)
        chains.push({ from: { x: caster.x, y: caster.y }, to: { x: target.x, y: target.y }, palette: look.palette });
    });
    const impacts = this.impacts.splice(0, this.impacts.length);
    const dust = this.frameDust.splice(0, this.frameDust.length);
    const limbFlames = this.frameFlames.splice(0, this.frameFlames.length);
    this.limbFlameStrength = limbFlames.reduce((m, l) => Math.max(m, l.strength), 0);
    this.vfx.update(frameDtS, {
      limbFlames,
      aim: this.ultAim ?? this.pointAimState ?? this.throwAim,
      impacts,
      dust,
      projectiles: world.projectiles,
      zones: world.zones,
      telegraphs: world.telegraphs,
      fx,
      burning,
      charges,
      auras,
      trails,
      beams: world.beams,
      chains,
      smoke,
    });
  }

  /** Props for tests and the debug hook. */
  get propStates(): PropState[] {
    return this.props?.states ?? [];
  }

  /** Peak jump height (animation blending), from the fighter's own data. */
  private peakHop(f: FighterEntity): number {
    return f.def.movement.jumpSpeedMps ** 2 / (2 * f.def.movement.hopGravityMps2);
  }

  /** Pose, reactions, knockdown tilt and bars for one fighter; returns its drawn position. */
  private renderFighter(f: FighterEntity, alpha: number, frameDtS: number): { x: number; y: number } {
    const x = f.prev.x + (f.curr.x - f.prev.x) * alpha;
    const y = f.prev.y + (f.curr.y - f.prev.y) * alpha;
    const heightM = f.prevHop + (f.hop.heightM - f.prevHop) * alpha;
    if (!f.view) return { x, y };
    const c = f.combatant;
    const v = f.body?.linvel() ?? { x: 0, y: 0 };
    const down = c.state === 'knockdown' || c.state === 'ko';

    let pose = f.animator.update(frameDtS, {
      speedMps: down || c.state === 'stunned' || c.state === 'gettingUp' ? 0 : Math.hypot(v.x, v.y),
      maxSpeedMps: f.def.movement.maxSpeedMps,
      heightM,
      peakHeightM: this.peakHop(f),
      verticalSpeedMps: f.hop.verticalSpeedMps,
    });
    const attack = f.combo.attack;
    if (attack) pose = strikePose(pose, f.strikeClip(attack.animationState, f.combo.variant), f.combo.progress, attack);
    if (f.scriptedAttack) {
      const sa = f.scriptedAttack;
      pose = strikePose(pose, sa.clip, Math.min(1, sa.t / attackDuration(sa.timing)), sa.timing);
    }
    pose = this.clashPose(f, pose);
    if (f === this.playerFighter && this.ultAimPoint) {
      // Jump preparation: a deep, springy crouch held (with a little bounce) while aiming.
      this.aimPrepT += frameDtS;
      pose = abilityPose(
        pose,
        f.caster?.def('ult').id ?? '',
        'windup',
        0.85 + 0.15 * Math.sin(this.aimPrepT * 7),
        false,
      );
    }
    const cast = f.caster?.cast;
    if (cast && f.caster) {
      pose = abilityPose(
        pose,
        cast.def.id,
        cast.phase,
        f.caster.phaseProgress,
        f.abilityLift > 0.05,
        f.driveVelocity !== null,
      );
    }

    // Carrying overhead: arms up (blended); a throw whips them forward for a moment.
    const carryTarget = f.carrying ? this.liftProgress(f) : 0; // the arms rise with the lift
    f.carryWeight += (carryTarget - f.carryWeight) * smoothing(16, frameDtS);
    if (f.carryWeight > 0.01) pose = blendPose(pose, carryPose(pose), f.carryWeight);
    if (f.throwFollowS > 0) {
      f.throwFollowS = Math.max(0, f.throwFollowS - frameDtS);
      pose = blendPose(pose, throwPose(pose), Math.min(1, f.throwFollowS / 0.12));
    }

    // Reactions blend in and out smoothly.
    // Dodging plays the character's own Dodge clip below (roll or flame), not a reaction pose.
    const reaction = c.state === 'guarding' ? 'block' : c.state === 'stunned' ? 'flinch' : null;
    if (reaction) f.lastReaction = reaction;
    f.reactWeight += ((reaction ? 1 : 0) - f.reactWeight) * smoothing(reaction === 'flinch' ? 30 : 18, frameDtS);
    if (f.lastReaction && f.reactWeight > 0.01) {
      const fn = f.lastReaction === 'block' ? blockPose : flinchPose;
      pose = blendPose(pose, fn(pose), f.reactWeight);
    }
    // Falling, lying and getting up are keyed animations (owner, 11/11/2026); tilt is smoothed so a KO from any pose blends in.
    let lift = 0;
    let tiltTarget = 0;
    const frame = down
      ? knockdownFrame(pose, c.downTimeS)
      : c.state === 'gettingUp'
        ? getUpFrame(pose, c.getUpProgress)
        : null;
    if (frame) {
      pose = frame.pose;
      tiltTarget = frame.tiltRad;
      lift = frame.liftM;
    }
    f.tilt += (tiltTarget - f.tilt) * smoothing(frame ? 40 : 12, frameDtS);

    // Hit flash: white for a few frames, fading out at the end.
    let flash = f.flashS > 0 ? Math.min(1, f.flashS / 0.04) : 0;
    let flashColour = f.flashColour;
    if (c.isKo && (f.koByFire || c.koByBurn)) {
      // Death by fire: the body chars dark as the flames take it, before it crumbles to ash.
      const char = Math.min(1, Math.max(0, c.koAge / (KO_DISSOLVE_FROM_S + 0.4)));
      if (char > flash) {
        flash = char * 0.9;
        flashColour = CHARCOAL;
      }
    }
    // The striker's little bounce off a landed blow.
    const bounce = f.recoilS > 0 ? 0.07 * Math.sin(Math.PI * (1 - f.recoilS / RECOIL_BOUNCE_S)) : 0;
    const drawnHeight = heightM + lift + f.abilityLift + bounce;
    // Dodge (owner, 11/11/2026): each character's own Dodge clip from its Animation Profile.
    const dodge: DodgeLook = {};
    if (c.state === 'dodging') {
      const p = c.dodgeProgress;
      const clip = f.def.animation.clips.Dodge[0];
      if (clip?.kind === 'procedural' && clip.id === 'proc.dodge.flame') {
        dodge.flame = Math.min(1, p / 0.2, (1 - p) / 0.2);
        const o = screenSideToWorld(f.facing * 0.3);
        this.frameFlames.push({ points: [{ x: x + o.x, y: y + o.y, z: 0.8 }], strength: 0.9 });
      } else if (clip?.kind === 'procedural' && clip.id === 'proc.dodge.roll') {
        pose = blendPose(pose, tuckPose(pose), Math.min(1, p / 0.15, (1 - p) / 0.15));
        dodge.roll = p;
      } else {
        // Quick dodge (the default): snap into the back-step pose, then ease out of it.
        const sx = (f.dodgeDir.x - f.dodgeDir.y) * ISO_C; // the dash on screen
        const sy = (f.dodgeDir.x + f.dodgeDir.y) * ISO_C * ISO_T;
        const amount = Math.min(1, p / 0.12, (1 - p) / 0.3);
        pose = blendPose(pose, quickDodgePose(pose), amount);
        dodge.dash = { amount, dirX: sx, dirY: sy };
      }
    }
    // Readable defence and status (PRS-5, PRS-6): a shield while guarding that flares on a block,
    // and stars circling the head while stunned.
    f.view.guard = c.state === 'guarding' ? 1 : 0;
    f.view.shieldFlare = f.shieldS / SHIELD_FLARE_S;
    f.view.stunned = c.state === 'stunned';
    // A fury buff (Rampage Mode) flushes the body red, easing off in its last second.
    f.view.rage = f.buff ? Math.min(1, f.buff.leftS) : 0;
    // Blinded (Soul Drain): dark smoke wraps the head, thinning in its last half second.
    f.view.blind = Math.min(1, c.blindLeftS / 0.5);
    // Magic at work (owner, 12/11/2026): casting, or a power buff, lights the staff skull's eyes and
    // gathers violet energy; a staff strike swings the staff with the arm.
    const casting = f.caster?.cast !== null && f.caster?.cast !== undefined;
    const empowered = (f.buff?.abilityDamageFactor ?? 1) > 1;
    f.magicGlow += ((casting || empowered ? 1 : 0) - f.magicGlow) * smoothing(8, frameDtS);
    f.staffSwing += ((f.combo.attack ? 1 : 0) - f.staffSwing) * smoothing(18, frameDtS);
    f.view.magic = f.magicGlow;
    f.view.heldSwing = f.staffSwing;
    f.view.draw(pose, f.facing, drawnHeight, f.tilt, flash, flashColour, dodge);
    this.limbEffects(f, x, y);
    const stepDust = f.def.effects.aura ? EFFECTS[f.def.effects.aura]?.stepDust : undefined;
    for (let n = f.animator.takeFootfalls(); n > 0; n--) {
      this.characterSound(f, 'footstep', 0.5);
      // Heavy feet kick up dust (an Effects Profile aura).
      if (stepDust && !f.airborne)
        this.frameDust.push({
          points: [{ x, y, z: 0.05 }],
          colour: stepDust[0]!,
          colours: stepDust,
          onlyColours: true,
          count: 10,
        });
    }
    const at = iso(x, y);
    f.view.root.position.set(at.x, at.y);
    const vel = f.body?.linvel();
    f.view.motion = vel ? Math.min(1, Math.hypot(vel.x, vel.y) / Math.max(1, f.def.movement.maxSpeedMps)) : 0;
    this.koDissolve(f, x, y, drawnHeight, frameDtS);
    f.bars?.draw(
      at.x,
      at.y - heightM - headTop(f) * Math.cos(f.tilt),
      c.hp / c.stats.maxHp,
      c.stamina / c.stats.maxStamina,
      !c.isKo,
    );
    return { x, y };
  }

  /** During a Punch Clash: the striker punches (jab and hook alternate), the other blocks; both swing on a collision. */
  private clashPose(f: FighterEntity, pose: Pose): Pose {
    const c = this.clashes.clash;
    if (!c) return pose;
    const beat = this.clashes.beat;
    const side = f === this.playerFighter ? 'a' : 'b';
    if (c.phase === 'intro' || !beat) return blockPose(pose);
    if (beat.by !== side && beat.by !== 'both') return blockPose(pose);
    // The Animation Profile's ClashLoop clips alternate beat by beat.
    const clip = f.strikeClip('ClashLoop', beat.index);
    // Fit a whole punch (snap and return) into the beat: faster as the clash speeds up.
    const p = 0.22 + 0.7 * Math.min(1, beat.t / beat.intervalS);
    return strikePose(pose, clip, p, CLASH_BEAT_TIMING);
  }

  /**
   * Effects Profile limb trail and aura (TD-039): flames around the striking
   * fists or feet while attacking (Inferno: owner request "visible flames around
   * Inferno's fists during punches and combos"), and embers drifting off the body.
   */
  private limbEffects(f: FighterEntity, x: number, y: number): void {
    if (!f.view || !f.def.capabilities.usesElementalEffects || f.combatant.isKo) return;
    const trail = f.def.effects.limbTrail ? EFFECTS[f.def.effects.limbTrail] : undefined;
    const aura = f.def.effects.aura ? EFFECTS[f.def.effects.aura] : undefined;
    const attack = f.combo.attack;
    if (trail?.limbFlames && (attack || f.scriptedAttack)) {
      const tips = f.view.limbTips();
      const limbs = attack?.category === 'kick' ? tips.feet : tips.fists;
      // Strongest at the strike, gentler in the wind-up and recovery.
      const pr = attack ? f.combo.progress : 0.5;
      const strength = Math.max(0.25, 1 - Math.abs(pr - 0.4) * 1.6);
      this.frameFlames.push({ points: limbs.map((p) => besideOnScreen(x, y, p.x, p.z)), strength });
    } else if (trail?.limbFlames && f.def.capabilities.usesFireEffects) {
      // A faint glow on the fists in the guard.
      const tips = f.view.limbTips();
      this.frameFlames.push({ points: tips.fists.map((p) => besideOnScreen(x, y, p.x, p.z)), strength: 0.05 });
    }
    if (aura?.bodyEmbers && this.fxRng() < 0.12) {
      this.frameFlames.push({
        points: [besideOnScreen(x, y, (this.fxRng() - 0.5) * 0.5, 0.3 + this.fxRng() * 1.3)],
        strength: 0.1,
      });
    }
  }

  /**
   * KO (owner, 11/11/2026): the fighter faints (the fall), lies still for a beat,
   * then dissolves into dust that drifts away while the figure fades out.
   */
  private koDissolve(f: FighterEntity, x: number, y: number, heightM: number, frameDtS: number): void {
    const view = f.view;
    if (!view) return;
    const c = f.combatant;
    if (!c.isKo) {
      // Reappearing after a teleport: the body fades back in from nothing.
      const k = f.appearS > 0 ? 1 - f.appearS / TELEPORT_APPEAR_S : 1;
      view.root.alpha = k * k * (3 - 2 * k);
      view.burnAway = 0;
      return;
    }
    if (!f.def.capabilities.canDisintegrate) {
      view.root.alpha = 1; // stays down until it gets up again (capability off)
      return;
    }
    const k = Math.min(1, Math.max(0, (c.koAge - KO_DISSOLVE_FROM_S) / KO_DISSOLVE_S));
    // Points along the (tilted) body from the feet to the head, as floor position plus height.
    const rot = -f.facing * f.tilt;
    const along = (d: number) => besideOnScreen(x, y, d * Math.sin(rot), Math.max(0, heightM + d * Math.cos(rot)));
    const byFire = f.koByFire || c.koByBurn;
    if (byFire) {
      // Death by fire (owner, 11/11/2026), its own ending in place of the usual dust fade: a
      // burning edge moves up the charred body from the feet to the head; behind it the body is
      // gone, on it flames lick and only embers, ash and smoke come away. No fade, no grey dust.
      view.root.alpha = 1;
      view.burnAway = k;
      if (k <= 0 || k >= 1) return;
      if (!f.dustSounded) {
        f.dustSounded = true;
        this.characterSound(f, 'disintegration');
      }
      const front = along(HEAD_TOP_M * k);
      this.frameBurning.push({ x: front.x, y: front.y, heightM: front.z + 0.45, baseM: Math.max(0, front.z - 0.1) });
      if (this.fxRng() < 0.7) this.frameSmoke.push({ ...front, z: front.z + 0.2, count: 1 });
      const ash = EFFECTS[FIRE_DEATH_EFFECT];
      this.frameDust.push({
        points: [front, along(HEAD_TOP_M * Math.max(0, k - 0.06))],
        colour: CHARCOAL,
        colours: ash?.dust,
        onlyColours: true,
        embers: ash?.embers ? Math.round((ash.embers * frameDtS) / 0.8) : 0,
        count: Math.round(200 * frameDtS),
      });
      return;
    }
    view.root.alpha = 1 - k * k * (3 - 2 * k);
    if (k <= 0 || k >= 1) return;
    if (!f.dustSounded) {
      f.dustSounded = true;
      this.characterSound(f, 'disintegration');
    }
    const points = Array.from({ length: 7 }, (_, i) => along((HEAD_TOP_M * i) / 6));
    // Most dust leaves early, thinning out as the last of the body fades.
    const count = Math.round(260 * frameDtS * (1.2 - k));
    // The look of the dust comes from the fighter's Effects Profile (grey dust, or embers and ash).
    const fx = EFFECTS[f.def.effects.disintegration];
    this.frameDust.push({
      points,
      colour: f.def.look.limb,
      colours: fx?.dust,
      embers: fx?.embers ? Math.round((fx.embers * frameDtS) / 1.6) : 0,
      count,
    });
  }

  debugStats(): Record<string, string | number> {
    const p = this.player;
    return {
      pos: `${p.x.toFixed(1)}, ${p.y.toFixed(1)}`,
      hp: `${p.hp}/${this.dummy.hp}`,
      stamina: p.stamina.toFixed(0),
      state: `${p.state}/${this.dummy.state}`,
      attack: p.attack ?? '-',
      zoom: this.cameraState ? `${this.cameraState.shortSideM.toFixed(1)} m` : '-',
      doors: this.doors.map((d) => (d.broken ? 'broken' : d.open ? 'open' : 'closed')).join(',') || '-',
      'dummy attacks': this.dummyAttacks ? 'on' : 'off',
    };
  }

  unload(): void {
    for (const f of this.fighters) f.detach();
    this.summons.list.length = 0;
    this.view?.destroy();
    this.physics?.dispose();
    this.view = null;
    this.overlay = null;
    this.physics = null;
    this.camera = null;
    this.doors = [];
    this.props = null;
    this.abilities = null;
    this.occlusion = null;
    this.vfx = null; // destroyed with the arena view
    this.fireLight = null; // destroyed with the arena view
    this.debrisView?.destroy();
    this.debrisView = null;
    this.grounded.clear();
  }
}
