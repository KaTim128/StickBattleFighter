import type { RigidBody } from '@dimforge/rapier2d';
import type { Container } from 'pixi.js';
import { AbilityCaster } from '../../abilities/ability-caster';
import { StickmanAnimator } from '../../animation/animator';
import type { Clip, StrikeClip } from '../../animation/clips';
import { CLIPS } from '../../animation/clips';
import type { AnimationState } from '../../characters/schema';
import { Combatant, seededRandom } from '../../combat/combatant';
import { MoveController } from '../../combat/moves';
import type { FighterDef } from '../../data/fighters/fighter-def';
import type { ArenaProp } from '../../environment/arena-props';
import { type HopState, isAirborne } from '../../physics/movement';
import type { PhysicsWorld } from '../../physics/physics-world';
import { FighterBars } from '../../rendering/fighter-bars';
import { StickmanView } from '../../rendering/stickman-view';
import type { YSortLayer } from '../../rendering/y-sort-layer';

/**
 * One fighter in a scene (the shared character controller, TD-039): the
 * shared combat engine (Combatant, MoveController) configured from its
 * resolved Character Definition,
 * its physics body, animation and views. The player and the dummy are both
 * FighterEntities, so every fighter plays by exactly the same rules (INV-5).
 */
const SAFE_STRIKE = CLIPS['safe.strike'] as StrikeClip;

export class FighterEntity {
  readonly combatant: Combatant;
  readonly combo: MoveController;
  readonly animator: StickmanAnimator;
  /** Abilities and the ultimate meter (null for fighters without a kit, e.g. the training dummy). */
  readonly caster: AbilityCaster | null;
  /** Velocity forced by a dash or leap this step, or null. */
  driveVelocity: { x: number; y: number } | null = null;
  /** Height off the floor during a leap, metres. */
  abilityLift = 0;
  /** Burn damage not yet shown as a floating number. */
  burnShown = 0;
  /** An attack animation played outside the combo (the Punch Clash finisher). */
  scriptedAttack: {
    clip: StrikeClip;
    timing: { windupS: number; activeS: number; recoveryS: number };
    t: number;
  } | null = null;
  /** A second jump is still available (capability canDoubleJump). */
  airJumpReady = false;
  /** Hit flash time left, seconds, and the colour it flashes (the striker's Effects Profile). */
  flashS = 0;
  flashColour = 0xffffff;
  /** Recoil bounce time left after landing a blow, seconds. */
  recoilS = 0;
  /** KO presentation: the boom and the dusting sound play once per KO. */
  koSounded = false;
  dustSounded = false;
  /** KO'd by fire (a fire hit or the burn): the body burns away to ash instead of dust. */
  koByFire = false;
  /** Seconds of smoke still rising after a burn went out. */
  smokeS = 0;
  /** The burn's starting length, so the flames can shrink as it runs out. */
  burnTotalS = 0;
  burnTextS = 0;
  body: RigidBody | null = null;
  view: StickmanView | null = null;
  bars: FighterBars | null = null;
  /**
   * Where the fighter faces: a world unit vector, any direction (TD-045: in the 2.5D view fighters
   * turn freely; attacks, lunges, knockback, blocks and throws all go this way).
   */
  readonly aim = { x: 1, y: 0 };
  /** Which way the drawn figure looks on screen: +1 right, −1 left (follows `aim`). */
  facing: 1 | -1 = 1;

  /** Turn to face a world direction (ignored if it is zero). */
  faceToward(dx: number, dy: number): void {
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) return;
    this.aim.x = dx / len;
    this.aim.y = dy / len;
    // On screen, x grows with (x − y) in the 2.5D view.
    const sx = this.aim.x - this.aim.y;
    if (Math.abs(sx) > 1e-3) this.facing = sx > 0 ? 1 : -1;
  }
  hop: HopState = { heightM: 0, verticalSpeedMps: 0 };
  prevHop = 0;
  readonly prev = { x: 0, y: 0 };
  readonly curr = { x: 0, y: 0 };
  /** The move this step asked for (doors swing open for a firm push, REQ-ENV-13). */
  readonly moveIntent = { x: 0, y: 0 };
  /** Already slammed into a breakable wall during this knockback flight (one chip per flight). */
  wallSlammed = false;
  /** The object carried overhead (Phase 7), and how long the interact button has been held. */
  carrying: ArenaProp | null = null;
  /** Presentation: how far into the arms-up carry pose (0..1), and time left in a throw follow-through. */
  carryWeight = 0;
  throwFollowS = 0;
  interactHoldS = 0;
  interactTracking = false;
  /** Time left flying from a heavy knockback (can smash doors). */
  knockFlightS = 0;
  readonly dodgeDir = { x: 0, y: 0 };
  /** Holding sprint (player only): runs faster while moving freely. */
  sprinting = false;
  /** Button 1 tap/hold tracking (player only). */
  meleeHoldS = 0;
  meleeTracking = false;
  /** AI attack timer (dummy only). */
  attackCooldownS = 0;
  /** Smoothed presentation values. */
  tilt = 0;
  reactWeight = 0;
  lastReaction: 'block' | 'flinch' | 'dash' | null = null;
  jumps = 0;
  hits = 0;

  constructor(
    readonly name: string,
    readonly def: FighterDef,
    readonly spawn: { readonly x: number; readonly y: number },
    readonly showStamina: boolean,
  ) {
    this.combatant = new Combatant(def.stats);
    this.combo = new MoveController(def.moves, def.starters, seededRandom(name.length * 7919 + 17));
    const idle = def.animation.clips.Idle[0];
    this.animator = new StickmanAnimator(
      def.bones,
      idle?.kind === 'procedural' && idle.id === 'proc.idle.taekwondo' ? 'taekwondo' : 'boxer',
    );
    this.caster = def.abilities ? new AbilityCaster(def.abilities) : null;
  }

  /** The clip the Animation Profile assigns to a state (varied looks pick by `variant`). */
  clip(state: AnimationState, variant = 0): Clip {
    const list = this.def.animation.clips[state];
    return list[((variant % list.length) + list.length) % list.length]!;
  }

  /** A strike clip for a state (falls back to the safe strike if a profile mapped something else). */
  strikeClip(state: AnimationState, variant = 0): StrikeClip {
    const c = this.clip(state, variant);
    return c.kind === 'strike' ? c : SAFE_STRIKE;
  }

  get airborne(): boolean {
    return isAirborne(this.hop);
  }

  get x(): number {
    return this.curr.x;
  }

  get y(): number {
    return this.curr.y;
  }

  attach(physics: PhysicsWorld, actors: YSortLayer, overlay: Container): void {
    this.body = physics.addCharacterBody({
      position: this.spawn,
      radiusM: this.def.body.footRadiusM,
      massKg: this.def.body.massKg,
    });
    this.view = new StickmanView(
      this.def.bones,
      this.def.look,
      this.def.capabilities.usesFireEffects ? (this.def.effects.head ?? 'round') : 'round',
      this.def.capabilities.usesFireEffects ? (this.def.effects.body ?? 'solid') : 'solid',
    );
    actors.add(this.view.root, 0);
    this.bars = new FighterBars(this.showStamina);
    overlay.addChild(this.bars.node);
    this.placeAt(this.spawn);
  }

  /** Teleport to a spot at rest (spawn, respawn, Practice Zone). */
  placeAt(at: { x: number; y: number }): void {
    this.body?.setTranslation(at, true);
    this.body?.setLinvel({ x: 0, y: 0 }, true);
    Object.assign(this.prev, at);
    Object.assign(this.curr, at);
    this.knockFlightS = 0;
    this.driveVelocity = null;
    this.abilityLift = 0;
    this.hop = { heightM: 0, verticalSpeedMps: 0 };
    this.prevHop = 0;
  }

  /** Back on its feet at full health where it started (KO respawn). */
  respawn(): void {
    this.combatant.reset();
    this.combo.interrupt();
    this.caster?.reset();
    this.koSounded = false;
    this.dustSounded = false;
    this.koByFire = false;
    this.smokeS = 0;
    if (this.view) {
      this.view.root.alpha = 1;
      this.view.burnAway = 0;
    }
    this.placeAt(this.spawn);
  }

  detach(): void {
    this.view?.destroy();
    this.bars?.destroy();
    this.view = null;
    this.bars = null;
    this.body = null;
  }
}
