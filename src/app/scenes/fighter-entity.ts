import type { RigidBody } from '@dimforge/rapier2d';
import type { Container } from 'pixi.js';
import { AbilityCaster } from '../../abilities/ability-caster';
import { StickmanAnimator } from '../../animation/animator';
import type { AttackDef } from '../../combat/attacks';
import { Combatant, seededRandom } from '../../combat/combatant';
import { ComboController } from '../../combat/combo';
import type { FighterDef } from '../../data/fighters/fighter-def';
import { type HopState, isAirborne } from '../../physics/movement';
import type { PhysicsWorld } from '../../physics/physics-world';
import { FighterBars } from '../../rendering/fighter-bars';
import { StickmanView } from '../../rendering/stickman-view';
import type { YSortLayer } from '../../rendering/y-sort-layer';

/**
 * One fighter in a scene: the shared combat engine (Combatant, ComboController),
 * its physics body, animation and views. The player and the dummy are both
 * FighterEntities, so every fighter plays by exactly the same rules (INV-5).
 */
export class FighterEntity {
  readonly combatant: Combatant;
  readonly combo: ComboController;
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
  scriptedAttack: { def: AttackDef; t: number } | null = null;
  /** Hit flash time left (white figure), seconds. */
  flashS = 0;
  /** Recoil bounce time left after landing a blow, seconds. */
  recoilS = 0;
  /** KO presentation: the boom and the dusting sound play once per KO. */
  koSounded = false;
  dustSounded = false;
  burnTextS = 0;
  body: RigidBody | null = null;
  view: StickmanView | null = null;
  bars: FighterBars | null = null;
  facing: 1 | -1 = 1;
  hop: HopState = { heightM: 0, verticalSpeedMps: 0 };
  prevHop = 0;
  readonly prev = { x: 0, y: 0 };
  readonly curr = { x: 0, y: 0 };
  /** Time left flying from a heavy knockback (can smash doors). */
  knockFlightS = 0;
  readonly dodgeDir = { x: 0, y: 0 };
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
    this.combo = new ComboController(def.attacks, seededRandom(name.length * 7919 + 17));
    this.animator = new StickmanAnimator(def.bones);
    this.caster = def.abilities ? new AbilityCaster(def.abilities) : null;
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
    this.view = new StickmanView(this.def.bones, this.def.look);
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
    if (this.view) this.view.root.alpha = 1;
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
