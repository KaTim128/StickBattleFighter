import { Container } from 'pixi.js';
import type { AbilityHudState, CastBlock } from '../../abilities/ability-caster';
import type { Burn } from '../../abilities/ability-def';
import { abilityPose } from '../../animation/ability-poses';
import { smoothing } from '../../animation/animator';
import { strikePose } from '../../animation/clips';
import {
  blockPose,
  carryPose,
  dashPose,
  flinchPose,
  getUpFrame,
  knockdownFrame,
  throwPose,
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
import type { PlayerIntents } from '../../input/intents';
import { stepHop, stepVelocity } from '../../physics/movement';
import { PhysicsWorld } from '../../physics/physics-world';
import { type ArenaView, buildArenaView } from '../../rendering/arena-view';
import { DebrisView } from '../../rendering/debris-view';
import { OcclusionFader } from '../../rendering/occlusion-fader';
import { tallestPropM } from '../../rendering/prop-view';
import {
  AbilityVfx,
  type BurningThing,
  type DustSource,
  type ImpactBurst,
  type LimbFlames,
} from '../../vfx/ability-vfx';
import { EFFECTS, type EffectDef } from '../../vfx/effects-library';
import type { ArenaScene, Viewport } from './arena-scene';
import { FighterEntity } from './fighter-entity';
import { SceneAbilities } from './scene-abilities';
import { type ClashBanner, type ClashHudState, SceneClash } from './scene-clash';

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
  /** What the contextual utility button does now: jump, pick up or throw. */
  utility: 'jump' | 'pickup' | 'throw';
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
const KO_DISSOLVE_S = 1.6;
type AudioKey = Exclude<keyof AudioProfile, 'id' | 'voice'>;

const colourOf = (hex: string): number => Number.parseInt(hex.replace('#', ''), 16);

/** The non-elemental version of an effect (no embers or scorch) for fighters without elemental effects. */
function withoutElements(e: EffectDef): EffectDef {
  return { sparks: e.sparks, ring: e.ring };
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
const ULT_AIM_SPEED_MPS = 7;
/** Approximate height of a fighter's head top above its feet (for bars and callouts). */
const HEAD_TOP_M = 1.75;

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
  /** Strongest limb flame drawn last frame (0 = none): Effects Profile trails (tests, debug hook). */
  limbFlameStrength = 0;
  /** Knocked-back fighters that hit a wall (tests and the debug hook). */
  wallHits = 0;
  /** Sounds waiting to be played by the sound board (with loudness). */
  private readonly sounds: { id: string; gain: number }[] = [];
  /** Simulation time (hit-stop excluded), seconds. */
  private simTimeS = 0;
  /** The Punch Clash (owner, 11/11/2026). */
  readonly clashes: SceneClash;
  private readonly shake = new CameraShake();
  private readonly rng = seededRandom(1234);
  private hitstopS = 0;
  /** Where the player is aiming the leaping ultimate, while aiming (else null). */
  private ultAimPoint: { x: number; y: number } | null = null;
  private aimPrepT = 0;
  /** Why the player's last ability press did not cast (HUD feedback), or null. */
  lastAbilityBlock: CastBlock | null = null;
  private view: ArenaView | null = null;
  private overlay: Container | null = null;
  /** Validation reports for the fighters in this scene (shown when a character fell back). */
  readonly characters: { readonly player: LoadedCharacter; readonly opponent: LoadedCharacter };
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
    const player = loadCharacter(cast.player ?? DEFAULT_CAST.player, cast.library);
    const opponent = loadCharacter(cast.opponent ?? DEFAULT_CAST.opponent, cast.library);
    this.characters = { player, opponent };
    this.playerFighter = new FighterEntity('player', player.def, arena.playerStart, true);
    this.dummyFighter = new FighterEntity('dummy', opponent.def, arena.dummyStart, false);
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
        return pressed ? 1 : 0;
      },
      finisher: (winner, loser, f) =>
        this.applyStrike(winner, loser, {
          damage: f.damage,
          heavy: true,
          knockbackMps: f.knockbackMps,
          dir: { x: winner.facing, y: 0 },
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

  private get fighters(): FighterEntity[] {
    return [this.playerFighter, this.dummyFighter];
  }

  /** The arena's display objects (tests and tools inspect props and wall sections). */
  get arenaView(): ArenaView | null {
    return this.view;
  }

  get world(): Container | null {
    return this.view?.world ?? null;
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
      utility: f.carrying ? 'throw' : this.pickupFor(f) ? 'pickup' : 'jump',
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

  /** Screen position (CSS px) of a world point under the current camera. */
  worldToScreen(x: number, y: number): { x: number; y: number } | null {
    const w = this.view?.world;
    if (!w) return null;
    return { x: w.position.x + x * w.scale.x, y: w.position.y + y * w.scale.y };
  }

  async load(): Promise<void> {
    const arena = this.arena;
    const physics = new PhysicsWorld();
    this.physics = physics;
    addArenaColliders(physics, arena, false); // props get their own bodies: they move and break
    this.props = new ArenaProps(arena, physics);
    this.doors = (arena.doors ?? []).map((spec) => new BreakableDoor(spec, physics));
    this.abilities = new SceneAbilities(
      () => this.fighters,
      (attacker, target, strike) => this.applyStrike(attacker, target, strike),
      physics,
      this.props,
      this.doors,
      () => this.shake.addTrauma(0.35),
    );
    this.view = buildArenaView(arena);
    this.debrisView = new DebrisView(this.view.actors);
    this.occlusion = new OcclusionFader();
    for (const node of this.view.occluders) this.occlusion.add(node);
    for (const node of this.view.props.values()) this.occlusion.add(node);
    this.vfx = new AbilityVfx();
    this.vfx.attach(this.view.world, this.view.actors.container);
    this.overlay = new Container();
    this.overlay.label = 'fighter-overlay';
    for (const f of this.fighters) f.attach(physics, this.view.actors, this.overlay);
    this.view.world.addChild(this.overlay);
    this.parent.addChild(this.view.world);

    const t = arena.wallThicknessM;
    this.camera = new FollowCamera(arena.playerStart, {
      minX: -t,
      minY: -t - tallestPropM(arena.props), // room to see tall props along the top wall
      maxX: arena.widthM + t,
      maxY: arena.heightM + t,
    });
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
      f.recoilS = Math.max(0, f.recoilS - stepS);
      f.knockFlightS = Math.max(0, f.knockFlightS - stepS);
      f.attackCooldownS = Math.max(0, f.attackCooldownS - stepS);
      if (f.combatant.isKo && f.combatant.koAge >= DEFENCE.koRespawnS) f.respawn();
    }

    // A Punch Clash takes over both fighters while it runs.
    if (!this.clashes.step(stepS, this.simTimeS)) {
      this.controlPlayer(this.playerFighter, stepS);
      this.controlDummy(this.dummyFighter, stepS);
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
      if (c.state === 'guarding') c.setGuard(false);
      f.meleeTracking = false;
      if (this.intents.consumeDodge() && !air && c.tryDodge()) {
        const m = this.intents.move;
        const len = Math.hypot(m.x, m.y);
        Object.assign(f.dodgeDir, len > 0.1 ? { x: m.x / len, y: m.y / len } : { x: -f.facing, y: 0 });
      }
      const slow = THROWING.carrySpeedFactor(f.carrying.kind.massKg);
      const m = this.intents.move;
      const jump = (this.intents.consumeJump() || jumpFromUtility) && f.def.capabilities.canJump && c.canAct;
      this.stepFighter(f, stepS, { x: m.x * slow, y: m.y * slow }, jump);
      return;
    }

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
        f.combo.press({ airborne: air, falling: air && f.hop.verticalSpeedMps < 0, forward: m.x * f.facing > 0.7 });
      }
      f.meleeTracking = false;
    }
    if (!this.intents.meleeHeld && c.state === 'guarding') c.setGuard(false);

    // Buttons 2–5: abilities and the ultimate (a leaping ultimate is aimed first).
    const slot = this.intents.consumeAbility();
    if (slot === 'ult' && f.caster?.def('ult').delivery.type === 'leap') this.ultimatePress(f);
    else if (slot && this.abilities) this.lastAbilityBlock = this.abilities.tryCast(f, slot);
    if (this.ultAimPoint) {
      // Aiming: Inferno crouches to spring; WASD (or a drag) moves the landing spot instead of the fighter.
      this.steerUltimateAim(f, stepS);
      this.stepFighter(f, stepS, { x: 0, y: 0 }, false);
      return;
    }

    // Dodge (Shift / flick): a quick invulnerable dash, cancelling an attack (not an ability already cast).
    if (this.intents.consumeDodge() && !air && !f.caster?.cast && c.tryDodge()) {
      f.combo.interrupt();
      const m = this.intents.move;
      const len = Math.hypot(m.x, m.y);
      Object.assign(f.dodgeDir, len > 0.1 ? { x: m.x / len, y: m.y / len } : { x: -f.facing, y: 0 });
    }

    const jump =
      (this.intents.consumeJump() || jumpFromUtility) &&
      f.def.capabilities.canJump &&
      c.canAct &&
      c.state !== 'guarding' &&
      !(f.combo.attack && !air) &&
      !f.caster?.cast;
    this.stepFighter(f, stepS, this.intents.move, jump);
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
        f.interactTracking = true;
        f.interactHoldS = 0;
      } else {
        const grab = this.pickupFor(f);
        if (grab && props && !f.airborne && !f.combo.attack && !f.caster?.cast) {
          props.pickUp(grab, this.fighters.indexOf(f), this.holdPoint(f));
          f.carrying = grab;
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
    return { x: f.x + f.facing * 0.08, y: f.y + 0.02, heightM: THROWING.holdHeightM + f.hop.heightM };
  }

  private pickupFor(f: FighterEntity): ArenaProp | null {
    return (
      this.props?.pickupCandidate(f.x, f.y, f.facing, THROWING.reachM + f.def.body.footRadiusM, THROWING.behindM) ??
      null
    );
  }

  /** Throw at the locked target if it is roughly ahead and in range, else the way the fighter faces or moves. */
  private throwCarried(f: FighterEntity): void {
    const prop = f.carrying;
    if (!prop || !this.props) return;
    const target = this.fighters.find((o) => o !== f && !o.combatant.isKo);
    const m = this.intents.move;
    let dir = Math.hypot(m.x, m.y) > 0.3 ? { x: m.x, y: m.y } : { x: f.facing, y: 0 };
    if (target) {
      const dx = target.x - f.x;
      const dy = target.y - f.y;
      const d = Math.hypot(dx, dy);
      if (d > 0.01 && d < THROWING.aimRangeM && dx * f.facing > -0.2) dir = { x: dx, y: dy };
    }
    const len = Math.hypot(dir.x, dir.y) || 1;
    const speed = THROWING.speedFor(prop.kind.massKg);
    if (Math.abs(dir.x) > 0.1) f.facing = dir.x > 0 ? 1 : -1;
    this.props.release(
      prop,
      { x: (dir.x / len) * speed, y: (dir.y / len) * speed },
      THROWING.launchHeightM,
      THROWING.launchUpMps,
      true,
    );
    f.carrying = null;
    f.interactTracking = false;
    f.throwFollowS = 0.28;
    this.characterSound(f, 'jump', 0.8);
  }

  /** Put it down in front (or let it fall when hit). */
  private dropCarried(f: FighterEntity, forwardMps: number): void {
    const prop = f.carrying;
    f.carrying = null;
    f.interactTracking = false;
    if (!prop || !this.props || prop.broken) return;
    this.props.release(prop, { x: f.facing * forwardMps, y: 0 }, THROWING.holdHeightM * 0.6, 0, false);
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
        if (!circleTouchesRect(target, target.def.body.footRadiusM + 0.1, prop.rect)) continue;
        const thrower = this.fighters[flight.by] ?? target;
        const mass = prop.kind.massKg;
        const dir = { x: v.x / speed, y: v.y / speed };
        this.applyStrike(thrower, target, {
          damage: THROWING.damageFor(mass, speed),
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
    const start = this.abilities.aimFor(f, f.caster.def('ult'));
    this.ultAimPoint = this.clampToRange(f, start);
  }

  /** Move the aimed spot: a touch drag places it directly; keys slide it; always within the leap's range. */
  private steerUltimateAim(f: FighterEntity, stepS: number): void {
    const aim = this.ultAimPoint;
    const caster = f.caster;
    if (!aim || !caster) return;
    if (!f.combatant.canAct) {
      this.ultAimPoint = null; // hit while aiming: the jump is called off (the meter is kept)
      return;
    }
    const range = this.ultRange(f);
    const drag = this.intents.ultDrag;
    let next = aim;
    if (drag) {
      next = { x: f.x + drag.x * range, y: f.y + drag.y * range };
    } else {
      const m = this.intents.move;
      next = { x: aim.x + m.x * ULT_AIM_SPEED_MPS * stepS, y: aim.y + m.y * ULT_AIM_SPEED_MPS * stepS };
    }
    this.ultAimPoint = this.clampToRange(f, next);
    if (Math.abs(this.ultAimPoint.x - f.x) > 0.1) f.facing = this.ultAimPoint.x > f.x ? 1 : -1;
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
    if (c.canAct && !f.combo.attack) f.facing = p.x >= f.x ? 1 : -1;
    if (
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
      next = { x: f.dodgeDir.x * DEFENCE.dodgeSpeedMps, y: f.dodgeDir.y * DEFENCE.dodgeSpeedMps };
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
      next = stepVelocity(v, move, { ...tuning, decelMps2: decel }, stepS);
      if (!attack && !cast && Math.abs(moveIn.x) > 0.1 && f === this.playerFighter) f.facing = moveIn.x > 0 ? 1 : -1;
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
    },
  ): boolean {
    if (!target.body || target.combatant.isKo) return false;
    const t = target.body.translation();
    // A block only works when facing the attacker.
    const fromFront = !s.unblockable && target.facing === (attacker.x >= t.x ? 1 : -1);
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
    this.events.push({ kind: result.outcome, target: target.name, x: t.x, y: t.y - HEAD_TOP_M, amount: result.damage });

    if (result.outcome === 'dodged') return false;
    const guarded = result.outcome === 'blocked' || result.outcome === 'parried';
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
    }

    const speed = s.knockbackMps * result.knockbackScale;
    target.body.setLinvel({ x: s.dir.x * speed, y: s.dir.y * speed }, true);
    target.knockFlightS = speed >= HEAVY_KNOCKBACK_MPS ? KNOCK_FLIGHT_S : 0;
    if (result.outcome === 'ko') {
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
    },
    profile: ImpactProfile,
    outcome: HitOutcome,
    guarded: boolean,
  ): void {
    const len = Math.hypot(s.dir.x, s.dir.y) || 1;
    const dir = { x: s.dir.x / len, y: s.dir.y / len };
    const fx = attacker.def.effects;
    if (!guarded) {
      target.flashS = Math.max(target.flashS, profile.flashS);
      target.flashColour = colourOf(fx.flashColour);
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
    this.events.push({ kind: 'burn', target: f.name, x: f.x, y: f.y - HEAD_TOP_M, amount: Math.round(f.burnShown) });
    f.burnShown = 0;
    f.burnTextS = 0.5;
  }

  /** An attack reached its active window: check its hit capsule against other fighters and doors. */
  private resolveHit(attacker: FighterEntity, a: AttackDef): void {
    const body = attacker.body;
    if (!body) return;
    const facing = attacker.facing;
    const p = body.translation();
    const capsule = hitCapsule(p, facing, a);
    let connected = false;
    let hitFighter = false; // fighter contacts shake through their impact profile

    if (a.lungeMps > 0) {
      const v = body.linvel();
      body.setLinvel({ x: v.x + facing * a.lungeMps, y: v.y }, true);
    }

    for (const target of this.fighters) {
      if (target === attacker || !target.body || target.combatant.isKo) continue;
      const t = target.body.translation();
      if (distanceToCapsule(capsule, t.x, t.y) > a.hitRadiusM + target.def.body.footRadiusM) continue;
      const sideways = Math.max(-0.4, Math.min(0.4, t.y - p.y));
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
      if (this.applyStrike(attacker, target, { ...strike, dir: { x: facing, y: sideways } })) {
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
        direction: { x: facing, y: 0 },
      });
      if (broke) {
        this.shake.addTrauma(0.75);
        this.shake.punch(0.08);
      }
    }

    // Furniture: moves or breaks depending on its durability.
    const props = this.props?.hitWhere((r) => capsuleTouchesRect(capsule, r), {
      blow: a.blow === 'kick' ? 'kick' : 'strike',
      damage: a.damage * attacker.def.stats.power,
      strength: a.strength,
      direction: { x: facing, y: 0 },
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
    this.renderAbilityFx(frameDtS);
    this.view.actors.update();
    // Keep both fighters visible: fade whatever stands in front of them.
    const viewers = this.fighters.flatMap((f) =>
      f.view ? [{ node: f.view.root, depth: () => f.view?.root.zIndex ?? 0 }] : [],
    );
    this.occlusion?.update(viewers, frameDtS);

    // Frame the player and the dummy (aiming at torsos), then apply impact shake.
    const { width, height } = this.viewport();
    const cam = this.camera.update(
      { x: me.x, y: me.y - 0.8 },
      [{ x: other.x, y: other.y - 0.8 }],
      frameDtS,
      width,
      height,
      this.clashes.focus(),
    );
    const shake = this.shake.update(frameDtS);
    let scale = cam.scale * shake.zoom;
    let cx = cam.x + shake.offsetX;
    let cy = cam.y + shake.offsetY;
    if (this.overview) {
      const t = this.arena.wallThicknessM;
      const top = t + tallestPropM(this.arena.props);
      const fit = fitRectToView(this.arena.widthM + 2 * t, this.arena.heightM + t + top, width, height, 8);
      scale = fit.scale;
      cx = this.arena.widthM / 2;
      cy = (this.arena.heightM + t - top) / 2;
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

  /** Furniture sounds and particles by material: splinters and sawdust, sparks off steel, glints off glass. */
  private propFeedback(): void {
    for (const e of this.props?.drainEvents() ?? []) {
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
      node.position.set(pose.x, pose.y);
      node.rotation = pose.angle;
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
      this.shake.addTrauma((e.radiusM ?? 0) >= 2.8 ? 0.85 : 0.5); // Meteor Fist hits hardest
      this.shake.punch(0.06);
    }
    const burning: BurningThing[] = [];
    for (const f of this.fighters) {
      if (f.combatant.burning) burning.push({ x: f.x, y: f.y, heightM: 1.4 });
    }
    for (const p of this.props?.props ?? []) {
      if (p.burnS > 0 && !p.broken) burning.push({ x: p.pose.x, y: p.pose.y, heightM: p.size.h + 0.35 });
    }
    const world = this.abilities.world;
    const impacts = this.impacts.splice(0, this.impacts.length);
    const dust = this.frameDust.splice(0, this.frameDust.length);
    const limbFlames = this.frameFlames.splice(0, this.frameFlames.length);
    this.limbFlameStrength = limbFlames.reduce((m, l) => Math.max(m, l.strength), 0);
    this.vfx.update(frameDtS, {
      limbFlames,
      aim: this.ultAim,
      impacts,
      dust,
      projectiles: world.projectiles,
      zones: world.zones,
      telegraphs: world.telegraphs,
      fx,
      burning,
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
      pose = abilityPose(pose, 'meteorFist', 'windup', 0.85 + 0.15 * Math.sin(this.aimPrepT * 7), false);
    }
    const cast = f.caster?.cast;
    if (cast && f.caster) {
      pose = abilityPose(pose, cast.def.id, cast.phase, f.caster.phaseProgress, f.abilityLift > 0.05);
    }

    // Carrying overhead: arms up (blended); a throw whips them forward for a moment.
    f.carryWeight += ((f.carrying ? 1 : 0) - f.carryWeight) * smoothing(16, frameDtS);
    if (f.carryWeight > 0.01) pose = blendPose(pose, carryPose(pose), f.carryWeight);
    if (f.throwFollowS > 0) {
      f.throwFollowS = Math.max(0, f.throwFollowS - frameDtS);
      pose = blendPose(pose, throwPose(pose), Math.min(1, f.throwFollowS / 0.12));
    }

    // Reactions blend in and out smoothly.
    const reaction =
      c.state === 'guarding' ? 'block' : c.state === 'stunned' ? 'flinch' : c.state === 'dodging' ? 'dash' : null;
    if (reaction) f.lastReaction = reaction;
    f.reactWeight += ((reaction ? 1 : 0) - f.reactWeight) * smoothing(reaction === 'flinch' ? 30 : 18, frameDtS);
    if (f.lastReaction && f.reactWeight > 0.01) {
      const fn = f.lastReaction === 'block' ? blockPose : f.lastReaction === 'flinch' ? flinchPose : dashPose;
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
    const flash = f.flashS > 0 ? Math.min(1, f.flashS / 0.04) : 0;
    // The striker's little bounce off a landed blow.
    const bounce = f.recoilS > 0 ? 0.07 * Math.sin(Math.PI * (1 - f.recoilS / RECOIL_BOUNCE_S)) : 0;
    const drawnHeight = heightM + lift + f.abilityLift + bounce;
    f.view.draw(pose, f.facing, drawnHeight, f.tilt, flash, f.flashColour);
    this.limbEffects(f, x, y);
    for (let n = f.animator.takeFootfalls(); n > 0; n--) this.characterSound(f, 'footstep', 0.5);
    f.view.root.position.set(x, y);
    this.koDissolve(f, x, y, drawnHeight, frameDtS);
    f.bars?.draw(
      x,
      y - heightM - HEAD_TOP_M * Math.cos(f.tilt),
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
      this.frameFlames.push({ points: limbs.map((p) => ({ x: x + p.x, y: y + p.y, z: p.z })), strength });
    } else if (trail?.limbFlames && f.def.capabilities.usesFireEffects) {
      // A faint glow on the fists in the guard.
      const tips = f.view.limbTips();
      this.frameFlames.push({ points: tips.fists.map((p) => ({ x: x + p.x, y: y + p.y, z: p.z })), strength: 0.05 });
    }
    if (aura?.bodyEmbers && this.fxRng() < 0.12) {
      this.frameFlames.push({
        points: [{ x: x + (this.fxRng() - 0.5) * 0.5, y, z: 0.3 + this.fxRng() * 1.3 }],
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
      view.root.alpha = 1;
      return;
    }
    if (!f.def.capabilities.canDisintegrate) {
      view.root.alpha = 1; // stays down until it gets up again (capability off)
      return;
    }
    const k = Math.min(1, Math.max(0, (c.koAge - KO_DISSOLVE_FROM_S) / KO_DISSOLVE_S));
    view.root.alpha = 1 - k * k * (3 - 2 * k);
    if (k <= 0 || k >= 1) return;
    if (!f.dustSounded) {
      f.dustSounded = true;
      this.characterSound(f, 'disintegration');
    }
    // Points along the (tilted) body from the feet to the head, as floor position plus height.
    const rot = -f.facing * f.tilt;
    const points: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i <= 6; i++) {
      const d = (HEAD_TOP_M * i) / 6;
      points.push({ x: x + d * Math.sin(rot), y, z: Math.max(0, heightM + d * Math.cos(rot)) });
    }
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
    this.debrisView?.destroy();
    this.debrisView = null;
    this.grounded.clear();
  }
}
