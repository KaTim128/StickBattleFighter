import type { Container } from 'pixi.js';
import { StickmanAnimator } from '../../animation/animator';
import { addGreyboxArenaColliders } from '../../arenas/greybox-arena-colliders';
import { FollowCamera } from '../../camera/follow-camera';
import { TRAINING_YARD } from '../../data/arenas/training-yard';
import { GREYBOX_STICKMAN } from '../../data/fighters/greybox-stickman';
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
  private view: GreyboxArenaView | null = null;
  private stickman: StickmanView | null = null;
  private body: ReturnType<PhysicsWorld['addCharacterBody']> | null = null;
  private readonly animator = new StickmanAnimator();
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

    this.view = buildGreyboxArenaView(arena);
    this.stickman = new StickmanView(GREYBOX_STICKMAN.bones, GREYBOX_STICKMAN.look);
    this.view.actors.add(this.stickman.root, 0);
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
    this.view.actors.update();

    const { width, height } = this.viewport();
    const cam = this.camera.update({ x, y: y - 0.8 }, frameDtS, width, height); // aim at the torso
    this.view.world.scale.set(cam.scale);
    this.view.world.position.set(width / 2 - cam.x * cam.scale, height / 2 - cam.y * cam.scale);
  }

  debugStats(): Record<string, string | number> {
    return {
      pos: `${this.player.x.toFixed(1)}, ${this.player.y.toFixed(1)}`,
      speed: this.player.speed.toFixed(2),
      hop: this.player.heightM.toFixed(2),
    };
  }

  unload(): void {
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
