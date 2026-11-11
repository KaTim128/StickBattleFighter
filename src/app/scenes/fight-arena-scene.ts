import type { Container } from 'pixi.js';
import { StickmanAnimator } from '../../animation/animator';
import { attackPose } from '../../animation/attack-poses';
import { addArenaColliders } from '../../arenas/arena-colliders';
import { CameraShake } from '../../camera/camera-shake';
import { fitRectToView } from '../../camera/fit-view';
import { type CameraView, FollowCamera } from '../../camera/follow-camera';
import { type AttackDef, capsuleTouchesRect, distanceToCapsule, hitCapsule } from '../../combat/attacks';
import { ComboController } from '../../combat/combo';
import type { ArenaLayout } from '../../data/arenas/arena-layout';
import { GREYBOX_STICKMAN } from '../../data/fighters/greybox-stickman';
import { TRAINING_DUMMY } from '../../data/fighters/training-dummy';
import { BreakableDoor, circleTouchesRect } from '../../environment/breakable-door';
import type { PlayerIntents } from '../../input/intents';
import { type HopState, isAirborne, stepHop, stepVelocity } from '../../physics/movement';
import { PhysicsWorld } from '../../physics/physics-world';
import { type ArenaView, buildArenaView } from '../../rendering/arena-view';
import { tallestPropM } from '../../rendering/prop-view';
import { StickmanView } from '../../rendering/stickman-view';
import type { ArenaScene, Viewport } from './arena-scene';

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
}

const DUMMY_KNOCKBACK_S = 0.8;
/** While knocked back the dummy slides further before stopping. */
const DUMMY_KNOCKBACK_DECEL = 5;
/** Knockback at or above this speed counts as a heavy (door-smashing) knockback. */
const HEAVY_KNOCKBACK_MPS = 6;

/**
 * Plays any arena layout (training yard, office, ...): the jointed test
 * stickman with movement, jump and Button 1 attacks, the training dummy,
 * props, breakable doors and the framing camera. Owns and frees its physics
 * world and display objects.
 */
export class FightArenaScene implements ArenaScene {
  readonly name: string;
  physics: PhysicsWorld | null = null;
  readonly player: PlayerState = {
    x: 0,
    y: 0,
    speed: 0,
    heightM: 0,
    airborne: false,
    facing: 1,
    jumps: 0,
    attack: null,
    comboStep: 0,
    hits: 0,
  };
  camera: FollowCamera | null = null;
  readonly dummy = { x: 0, y: 0, speed: 0, knockedBack: false };
  cameraState: CameraState | null = null;
  doors: BreakableDoor[] = [];
  private readonly shake = new CameraShake();
  private readonly combo = new ComboController(GREYBOX_STICKMAN.attacks);
  private dummyBody: ReturnType<PhysicsWorld['addCharacterBody']> | null = null;
  private dummyView: StickmanView | null = null;
  private dummyKnockS = 0;
  private readonly dummyAnimator = new StickmanAnimator(TRAINING_DUMMY.bones);
  private readonly dummyPrev = { x: 0, y: 0 };
  private readonly dummyCurr = { x: 0, y: 0 };
  private view: ArenaView | null = null;
  private stickman: StickmanView | null = null;
  private body: ReturnType<PhysicsWorld['addCharacterBody']> | null = null;
  private readonly animator = new StickmanAnimator(GREYBOX_STICKMAN.bones);
  private hop: HopState = { heightM: 0, verticalSpeedMps: 0 };
  private prevHop = 0;
  private readonly prev = { x: 0, y: 0 };
  private readonly curr = { x: 0, y: 0 };
  private readonly peakHopM =
    GREYBOX_STICKMAN.movement.jumpSpeedMps ** 2 / (2 * GREYBOX_STICKMAN.movement.hopGravityMps2);

  constructor(
    readonly arena: ArenaLayout,
    private readonly parent: Container,
    private readonly intents: PlayerIntents,
    private readonly viewport: Viewport,
    /** Show the whole arena at once (layout review, `?overview`), instead of the follow camera. */
    private readonly overview = false,
  ) {
    this.name = arena.id;
  }

  get world(): Container | null {
    return this.view?.world ?? null;
  }

  get doorStates(): DoorState[] {
    return this.doors.map((d) => ({ id: d.spec.id, broken: d.broken, brokenBy: d.brokenBy }));
  }

  async load(): Promise<void> {
    const arena = this.arena;
    const physics = new PhysicsWorld();
    this.physics = physics;
    addArenaColliders(physics, arena);
    this.doors = (arena.doors ?? []).map((spec) => new BreakableDoor(spec, physics));
    this.body = physics.addCharacterBody({
      position: arena.playerStart,
      radiusM: GREYBOX_STICKMAN.body.footRadiusM,
      massKg: GREYBOX_STICKMAN.body.massKg,
    });
    this.dummyBody = physics.addCharacterBody({
      position: arena.dummyStart,
      radiusM: TRAINING_DUMMY.body.footRadiusM,
      massKg: TRAINING_DUMMY.body.massKg,
    });

    this.view = buildArenaView(arena);
    this.stickman = new StickmanView(GREYBOX_STICKMAN.bones, GREYBOX_STICKMAN.look);
    this.view.actors.add(this.stickman.root, 0);
    this.dummyView = new StickmanView(TRAINING_DUMMY.bones, TRAINING_DUMMY.look);
    this.view.actors.add(this.dummyView.root, 0);
    this.parent.addChild(this.view.world);

    Object.assign(this.prev, arena.playerStart);
    Object.assign(this.curr, arena.playerStart);
    Object.assign(this.player, { x: arena.playerStart.x, y: arena.playerStart.y });
    Object.assign(this.dummyPrev, arena.dummyStart);
    Object.assign(this.dummyCurr, arena.dummyStart);
    Object.assign(this.dummy, arena.dummyStart);
    const t = arena.wallThicknessM;
    this.camera = new FollowCamera(arena.playerStart, {
      minX: -t,
      minY: -t - tallestPropM(arena.props), // room to see tall props along the top wall
      maxX: arena.widthM + t,
      maxY: arena.heightM + t,
    });
  }

  /** Put the dummy back on its feet at a spot, at rest (Practice Zone respawn, REQ-MOD-5; also used by tests). */
  respawnDummy(at: { x: number; y: number }): void {
    if (!this.dummyBody) return;
    this.dummyBody.setTranslation(at, true);
    this.dummyBody.setLinvel({ x: 0, y: 0 }, true);
    this.dummyKnockS = 0;
    Object.assign(this.dummyPrev, at);
    Object.assign(this.dummyCurr, at);
    Object.assign(this.dummy, { ...at, speed: 0, knockedBack: false });
  }

  /** Test impact (debug key P while the overlay is on): shake plus zoom punch. */
  debugImpact(strength = 0.6): void {
    this.shake.addTrauma(strength);
    this.shake.punch(strength * 0.08);
  }

  update(stepS: number): void {
    if (!this.physics || !this.body || !this.dummyBody) return;
    const tuning = GREYBOX_STICKMAN.movement;
    const airborne = isAirborne(this.hop);

    // Button 1: ground combo or flying kick.
    if (this.intents.consumeMelee()) this.combo.press(airborne);
    const ev = this.combo.update(stepS, airborne);
    const attack = this.combo.attack;

    // Movement (slowed while striking on the ground; air attacks keep their momentum).
    let move = this.intents.move;
    if (attack && !airborne) move = { x: move.x * attack.moveFactor, y: move.y * attack.moveFactor };
    const v = stepVelocity(this.body.linvel(), move, tuning, stepS);
    this.body.setLinvel(v, true);
    if (!attack && Math.abs(move.x) > 0.1) this.player.facing = move.x > 0 ? 1 : -1;

    const jump = this.intents.consumeJump() && !(attack && !airborne); // no jumping out of a ground strike
    if (jump && !airborne) this.player.jumps++;
    this.prevHop = this.hop.heightM;
    this.hop = stepHop(this.hop, jump, tuning, stepS);
    if (airborne && !isAirborne(this.hop)) this.combo.landed();

    if (ev.hit) this.resolveHit(ev.hit);
    this.stepDummy(stepS);
    for (const door of this.doors) door.update(stepS);

    Object.assign(this.prev, this.curr);
    Object.assign(this.dummyPrev, this.dummyCurr);
    this.physics.step(stepS);

    const p = this.body.translation();
    const actual = this.body.linvel();
    Object.assign(this.curr, { x: p.x, y: p.y });
    Object.assign(this.player, {
      x: p.x,
      y: p.y,
      speed: Math.hypot(actual.x, actual.y),
      heightM: this.hop.heightM,
      airborne: isAirborne(this.hop),
      attack: this.combo.attack?.id ?? null,
      comboStep: this.combo.step,
    });
    const d = this.dummyBody.translation();
    const dv = this.dummyBody.linvel();
    Object.assign(this.dummyCurr, { x: d.x, y: d.y });
    Object.assign(this.dummy, { x: d.x, y: d.y, speed: Math.hypot(dv.x, dv.y), knockedBack: this.dummyKnockS > 0 });
  }

  /** The attack reached its active window: check the hit circle against the dummy and doors. */
  private resolveHit(a: AttackDef): void {
    if (!this.body || !this.dummyBody) return;
    const facing = this.player.facing;
    const p = this.body.translation();
    const hit = hitCapsule(p, facing, a);
    let connected = false;

    if (a.lungeMps > 0) {
      const v = this.body.linvel();
      this.body.setLinvel({ x: v.x + facing * a.lungeMps, y: v.y }, true);
    }

    const d = this.dummyBody.translation();
    if (distanceToCapsule(hit, d.x, d.y) <= a.hitRadiusM + TRAINING_DUMMY.body.footRadiusM) {
      // Knockback along the blow, slightly away from the attacker's line.
      const sideways = Math.max(-0.4, Math.min(0.4, d.y - p.y));
      this.dummyBody.setLinvel({ x: facing * a.knockbackSpeedMps, y: sideways * a.knockbackSpeedMps }, true);
      // Only heavy knockback sends it sliding (and can smash doors); light hits are nudges that settle fast.
      this.dummyKnockS = a.knockbackSpeedMps >= HEAVY_KNOCKBACK_MPS ? DUMMY_KNOCKBACK_S : 0;
      connected = true;
    }

    for (const door of this.doors) {
      if (door.broken || !capsuleTouchesRect(hit, door.spec)) continue;
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

    if (connected) {
      this.player.hits++;
      this.shake.addTrauma(a.trauma);
      this.shake.punch(a.zoomPunch);
    }
  }

  /** The dummy holds its ground, but a knocked-back dummy flies and can smash a door it hits. */
  private stepDummy(stepS: number): void {
    if (!this.dummyBody) return;
    const knocked = this.dummyKnockS > 0;
    this.dummyKnockS = Math.max(0, this.dummyKnockS - stepS);
    const settle = {
      maxSpeedMps: 0,
      accelMps2: 0,
      decelMps2: knocked ? DUMMY_KNOCKBACK_DECEL : TRAINING_DUMMY.settleDecelMps2,
    };
    const v = this.dummyBody.linvel();
    const speed = Math.hypot(v.x, v.y);
    if (knocked && speed > 0) {
      const pos = this.dummyBody.translation();
      const reach = TRAINING_DUMMY.body.footRadiusM + speed * stepS + 0.05;
      for (const door of this.doors) {
        if (door.broken || !circleTouchesRect(pos, reach, door.spec)) continue;
        const broke = door.applyImpact({
          kind: 'knockback',
          strength: TRAINING_DUMMY.body.massKg * speed,
          direction: { x: v.x / speed, y: v.y / speed },
        });
        if (broke) {
          this.shake.addTrauma(0.75);
          this.shake.punch(0.08);
        }
      }
    }
    this.dummyBody.setLinvel(stepVelocity(v, { x: 0, y: 0 }, settle, stepS), true);
  }

  render(alpha: number, frameDtS: number): void {
    if (!this.view || !this.stickman || !this.camera) return;
    const x = this.prev.x + (this.curr.x - this.prev.x) * alpha;
    const y = this.prev.y + (this.curr.y - this.prev.y) * alpha;
    const heightM = this.prevHop + (this.hop.heightM - this.prevHop) * alpha;

    let pose = this.animator.update(frameDtS, {
      speedMps: this.player.speed,
      maxSpeedMps: GREYBOX_STICKMAN.movement.maxSpeedMps,
      heightM,
      peakHeightM: this.peakHopM,
      verticalSpeedMps: this.hop.verticalSpeedMps,
    });
    const attack = this.combo.attack;
    if (attack) pose = attackPose(pose, attack, this.combo.progress);
    this.stickman.draw(pose, this.player.facing, heightM);
    this.stickman.root.position.set(x, y);

    const dx = this.dummyPrev.x + (this.dummyCurr.x - this.dummyPrev.x) * alpha;
    const dy = this.dummyPrev.y + (this.dummyCurr.y - this.dummyPrev.y) * alpha;
    if (this.dummyView) {
      const dummyPose = this.dummyAnimator.update(frameDtS, {
        speedMps: this.dummy.knockedBack ? 0 : this.dummy.speed,
        maxSpeedMps: GREYBOX_STICKMAN.movement.maxSpeedMps,
        heightM: 0,
        peakHeightM: 0,
      });
      this.dummyView.draw(dummyPose, x >= dx ? 1 : -1, 0); // always faces the player
      this.dummyView.root.position.set(dx, dy);
    }

    for (const door of this.doors) {
      const view = this.view.doors.get(door.spec.id);
      if (door.broken && view) view.showBroken(door.pieces, (node) => this.view?.actors.add(node, 0));
    }
    this.view.actors.update();

    // Frame the player and the dummy (aiming at torsos), then apply impact shake.
    const { width, height } = this.viewport();
    const cam = this.camera.update({ x, y: y - 0.8 }, [{ x: dx, y: dy - 0.8 }], frameDtS, width, height);
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

  debugStats(): Record<string, string | number> {
    return {
      pos: `${this.player.x.toFixed(1)}, ${this.player.y.toFixed(1)}`,
      speed: this.player.speed.toFixed(2),
      hop: this.player.heightM.toFixed(2),
      attack: this.player.attack ?? '-',
      zoom: this.cameraState ? `${this.cameraState.shortSideM.toFixed(1)} m` : '-',
      trauma: this.shake.trauma.toFixed(2),
      doors: this.doors.map((d) => (d.broken ? 'broken' : 'closed')).join(',') || '-',
    };
  }

  unload(): void {
    this.dummyView?.destroy();
    this.dummyView = null;
    this.dummyBody = null;
    this.stickman?.destroy();
    this.view?.destroy();
    this.physics?.dispose();
    this.stickman = null;
    this.view = null;
    this.physics = null;
    this.body = null;
    this.camera = null;
    this.doors = [];
  }
}
