import type { Container } from 'pixi.js';
import { StickmanAnimator } from '../../animation/animator';
import { addGreyboxArenaColliders } from '../../arenas/greybox-arena-colliders';
import { CameraShake } from '../../camera/camera-shake';
import { type CameraView, FollowCamera } from '../../camera/follow-camera';
import { TRAINING_YARD, TRAINING_YARD_DUMMY_START } from '../../data/arenas/training-yard';
import { GREYBOX_STICKMAN } from '../../data/fighters/greybox-stickman';
import { TRAINING_DUMMY } from '../../data/fighters/training-dummy';
import type { PlayerIntents } from '../../input/intents';
import { type HopState, isAirborne, stepHop, stepVelocity } from '../../physics/movement';
import { PhysicsWorld } from '../../physics/physics-world';
import { buildGreyboxArenaView, type GreyboxArenaView } from '../../rendering/greybox-arena-view';
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
}

/** Live camera state for the debug overlay and browser tests. */
export interface CameraState extends CameraView {
  trauma: number;
  shakeOffset: number;
  zoom: number;
}

/**
 * Phase 2 training yard (GREYBOX): one jointed test stickman moving freely in
 * a walled arena with pillars, followed by the camera. Owns and frees its
 * physics world and display objects.
 */
export class TrainingYardScene implements ArenaScene {
  readonly name = 'training-yard';
  physics: PhysicsWorld | null = null;
  readonly player: PlayerState = { x: 0, y: 0, speed: 0, heightM: 0, airborne: false, facing: 1, jumps: 0 };
  camera: FollowCamera | null = null;
  readonly dummy = { x: 0, y: 0, speed: 0 };
  cameraState: CameraState | null = null;
  private readonly shake = new CameraShake();
  private dummyBody: ReturnType<PhysicsWorld['addCharacterBody']> | null = null;
  private dummyView: StickmanView | null = null;
  private readonly dummyAnimator = new StickmanAnimator(TRAINING_DUMMY.bones);
  private readonly dummyPrev = { x: 0, y: 0 };
  private readonly dummyCurr = { x: 0, y: 0 };
  private view: GreyboxArenaView | null = null;
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
    private readonly parent: Container,
    private readonly intents: PlayerIntents,
    private readonly viewport: Viewport,
  ) {}

  get world(): Container | null {
    return this.view?.world ?? null;
  }

  async load(): Promise<void> {
    const arena = TRAINING_YARD;
    this.physics = new PhysicsWorld();
    addGreyboxArenaColliders(this.physics, arena);
    this.body = this.physics.addCharacterBody({
      position: arena.playerStart,
      radiusM: GREYBOX_STICKMAN.body.footRadiusM,
      massKg: GREYBOX_STICKMAN.body.massKg,
    });

    this.dummyBody = this.physics.addCharacterBody({
      position: TRAINING_YARD_DUMMY_START,
      radiusM: TRAINING_DUMMY.body.footRadiusM,
      massKg: TRAINING_DUMMY.body.massKg,
    });

    this.view = buildGreyboxArenaView(arena);
    this.stickman = new StickmanView(GREYBOX_STICKMAN.bones, GREYBOX_STICKMAN.look);
    this.view.actors.add(this.stickman.root, 0);
    this.dummyView = new StickmanView(TRAINING_DUMMY.bones, TRAINING_DUMMY.look);
    this.view.actors.add(this.dummyView.root, 0);
    Object.assign(this.dummyPrev, TRAINING_YARD_DUMMY_START);
    Object.assign(this.dummyCurr, TRAINING_YARD_DUMMY_START);
    Object.assign(this.dummy, TRAINING_YARD_DUMMY_START);
    this.parent.addChild(this.view.world);

    Object.assign(this.prev, arena.playerStart);
    Object.assign(this.curr, arena.playerStart);
    Object.assign(this.player, { x: arena.playerStart.x, y: arena.playerStart.y });
    const t = arena.wallThicknessM;
    this.camera = new FollowCamera(arena.playerStart, {
      minX: -t,
      minY: -t - arena.pillarHeightM, // room to see pillars along the top wall
      maxX: arena.arenaWidthM + t,
      maxY: arena.arenaHeightM + t,
    });
  }

  /** Test impact until combat exists (debug key P): shake plus zoom punch. */
  debugImpact(strength = 0.6): void {
    this.shake.addTrauma(strength);
    this.shake.punch(strength * 0.08);
  }

  update(stepS: number): void {
    if (!this.physics || !this.body) return;
    const tuning = GREYBOX_STICKMAN.movement;
    const move = this.intents.move;

    // Steer from the body's actual velocity, so walls and shoves are respected.
    const v = stepVelocity(this.body.linvel(), move, tuning, stepS);
    this.body.setLinvel(v, true);
    const jump = this.intents.consumeJump();
    if (jump && !isAirborne(this.hop)) this.player.jumps++;
    this.prevHop = this.hop.heightM;
    this.hop = stepHop(this.hop, jump, tuning, stepS);
    if (Math.abs(move.x) > 0.1) this.player.facing = move.x > 0 ? 1 : -1;

    // The dummy holds its ground: after a shove it eases back to a stop.
    if (this.dummyBody) {
      const settle = { maxSpeedMps: 0, accelMps2: 0, decelMps2: TRAINING_DUMMY.settleDecelMps2 };
      this.dummyBody.setLinvel(stepVelocity(this.dummyBody.linvel(), { x: 0, y: 0 }, settle, stepS), true);
      Object.assign(this.dummyPrev, this.dummyCurr);
    }

    Object.assign(this.prev, this.curr);
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
    });
    if (this.dummyBody) {
      const d = this.dummyBody.translation();
      const dv = this.dummyBody.linvel();
      Object.assign(this.dummyCurr, { x: d.x, y: d.y });
      Object.assign(this.dummy, { x: d.x, y: d.y, speed: Math.hypot(dv.x, dv.y) });
    }
  }

  render(alpha: number, frameDtS: number): void {
    if (!this.view || !this.stickman || !this.camera) return;
    const x = this.prev.x + (this.curr.x - this.prev.x) * alpha;
    const y = this.prev.y + (this.curr.y - this.prev.y) * alpha;
    const heightM = this.prevHop + (this.hop.heightM - this.prevHop) * alpha;

    const pose = this.animator.update(frameDtS, {
      speedMps: this.player.speed,
      maxSpeedMps: GREYBOX_STICKMAN.movement.maxSpeedMps,
      heightM,
      peakHeightM: this.peakHopM,
    });
    this.stickman.draw(pose, this.player.facing, heightM);
    this.stickman.root.position.set(x, y);

    const dx = this.dummyPrev.x + (this.dummyCurr.x - this.dummyPrev.x) * alpha;
    const dy = this.dummyPrev.y + (this.dummyCurr.y - this.dummyPrev.y) * alpha;
    if (this.dummyView) {
      const dummyPose = this.dummyAnimator.update(frameDtS, {
        speedMps: this.dummy.speed,
        maxSpeedMps: GREYBOX_STICKMAN.movement.maxSpeedMps,
        heightM: 0,
        peakHeightM: 0,
      });
      this.dummyView.draw(dummyPose, x >= dx ? 1 : -1, 0); // always faces the player
      this.dummyView.root.position.set(dx, dy);
    }
    this.view.actors.update();

    // Frame the player and the dummy (aiming at torsos), then apply impact shake.
    const { width, height } = this.viewport();
    const cam = this.camera.update({ x, y: y - 0.8 }, [{ x: dx, y: dy - 0.8 }], frameDtS, width, height);
    const shake = this.shake.update(frameDtS);
    const scale = cam.scale * shake.zoom;
    const cx = cam.x + shake.offsetX;
    const cy = cam.y + shake.offsetY;
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
      zoom: this.cameraState ? `${this.cameraState.shortSideM.toFixed(1)} m` : '-',
      trauma: this.shake.trauma.toFixed(2),
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
  }
}
