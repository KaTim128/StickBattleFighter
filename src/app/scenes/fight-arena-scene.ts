import { Container } from 'pixi.js';
import { smoothing } from '../../animation/animator';
import { attackPose } from '../../animation/attack-poses';
import { blockPose, dashPose, flinchPose, KNOCKDOWN_TILT_RAD } from '../../animation/reaction-poses';
import { blendPose } from '../../animation/skeleton';
import { addArenaColliders } from '../../arenas/arena-colliders';
import { CameraShake } from '../../camera/camera-shake';
import { fitRectToView } from '../../camera/fit-view';
import { type CameraView, FollowCamera } from '../../camera/follow-camera';
import { type AttackDef, capsuleTouchesRect, distanceToCapsule, hitCapsule } from '../../combat/attacks';
import { type CombatState, DEFENCE, seededRandom } from '../../combat/combatant';
import type { CombatEvent } from '../../combat/events';
import type { ArenaLayout } from '../../data/arenas/arena-layout';
import { GREYBOX_STICKMAN } from '../../data/fighters/greybox-stickman';
import { TRAINING_DUMMY } from '../../data/fighters/training-dummy';
import { BreakableDoor, circleTouchesRect } from '../../environment/breakable-door';
import type { PlayerIntents } from '../../input/intents';
import { stepHop, stepVelocity } from '../../physics/movement';
import { PhysicsWorld } from '../../physics/physics-world';
import { type ArenaView, buildArenaView } from '../../rendering/arena-view';
import { tallestPropM } from '../../rendering/prop-view';
import type { ArenaScene, Viewport } from './arena-scene';
import { FighterEntity } from './fighter-entity';

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
}

export interface DummyState {
  x: number;
  y: number;
  speed: number;
  knockedBack: boolean;
  hp: number;
  state: CombatState;
  attack: string | null;
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

const KNOCK_FLIGHT_S = 0.8;
/** While flying from a heavy knockback a fighter slides further before stopping. */
const KNOCK_FLIGHT_DECEL = 5;
/** Knockback at or above this speed counts as heavy (door-smashing) knockback. */
const HEAVY_KNOCKBACK_MPS = 6;
/** Sliding to a stop after a light knockback or while stunned. */
const SETTLE_DECEL = 14;
const HITSTOP_LIGHT_S = 0.05;
const HITSTOP_HEAVY_S = 0.09;
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
  /** Practice option: the dummy jabs back when you are close (REQ-MOD-5). */
  dummyAttacks = false;
  readonly playerFighter: FighterEntity;
  readonly dummyFighter: FighterEntity;
  private readonly events: CombatEvent[] = [];
  private readonly shake = new CameraShake();
  private readonly rng = seededRandom(1234);
  private hitstopS = 0;
  private view: ArenaView | null = null;
  private overlay: Container | null = null;
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
    this.playerFighter = new FighterEntity('player', GREYBOX_STICKMAN, arena.playerStart, true);
    this.dummyFighter = new FighterEntity('dummy', TRAINING_DUMMY, arena.dummyStart, false);
  }

  private get fighters(): FighterEntity[] {
    return [this.playerFighter, this.dummyFighter];
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
    };
  }

  get dummy(): DummyState {
    const f = this.dummyFighter;
    const v = f.body?.linvel() ?? { x: 0, y: 0 };
    return {
      x: f.x,
      y: f.y,
      speed: Math.hypot(v.x, v.y),
      knockedBack: f.knockFlightS > 0,
      hp: f.combatant.hp,
      state: f.combatant.state,
      attack: f.combo.attack?.id ?? null,
    };
  }

  get doorStates(): DoorState[] {
    return this.doors.map((d) => ({ id: d.spec.id, broken: d.broken, brokenBy: d.brokenBy }));
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
    addArenaColliders(physics, arena);
    this.doors = (arena.doors ?? []).map((spec) => new BreakableDoor(spec, physics));
    this.view = buildArenaView(arena);
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

    for (const f of this.fighters) {
      f.combatant.update(stepS);
      f.knockFlightS = Math.max(0, f.knockFlightS - stepS);
      f.attackCooldownS = Math.max(0, f.attackCooldownS - stepS);
      if (f.combatant.isKo && f.combatant.koAge >= DEFENCE.koRespawnS) f.respawn();
    }

    this.controlPlayer(this.playerFighter, stepS);
    this.controlDummy(this.dummyFighter, stepS);
    for (const f of this.fighters) this.checkDoorImpact(f, stepS);
    for (const door of this.doors) door.update(stepS);

    for (const f of this.fighters) {
      Object.assign(f.prev, f.curr);
      f.prevHop = f.hop.heightM;
    }
    this.physics.step(stepS);
    for (const f of this.fighters) {
      const p = f.body?.translation();
      if (p) Object.assign(f.curr, { x: p.x, y: p.y });
    }
  }

  /** Movement, jump, Button 1 (tap = attack, hold = block) and dodge for the player. */
  private controlPlayer(f: FighterEntity, stepS: number): void {
    const c = f.combatant;
    const air = f.airborne;

    // Button 1: decide tap vs hold on the fixed step.
    const { pressed, released } = this.intents.consumeMeleeEdges();
    if (pressed) {
      f.meleeTracking = true;
      f.meleeHoldS = 0;
    }
    if (f.meleeTracking && this.intents.meleeHeld && !released) {
      f.meleeHoldS += stepS;
      if (f.meleeHoldS >= DEFENCE.blockHoldS && !air && !f.combo.attack) c.setGuard(true);
    }
    if (released && f.meleeTracking) {
      const wasGuarding = c.state === 'guarding' || f.meleeHoldS >= DEFENCE.blockHoldS;
      if (!wasGuarding && c.canAct) f.combo.press(air);
      f.meleeTracking = false;
    }
    if (!this.intents.meleeHeld && c.state === 'guarding') c.setGuard(false);

    // Dodge (Shift / flick): a quick invulnerable dash, cancelling an attack.
    if (this.intents.consumeDodge() && !air && c.tryDodge()) {
      f.combo.interrupt();
      const m = this.intents.move;
      const len = Math.hypot(m.x, m.y);
      Object.assign(f.dodgeDir, len > 0.1 ? { x: m.x / len, y: m.y / len } : { x: -f.facing, y: 0 });
    }

    const jump = this.intents.consumeJump() && c.canAct && c.state !== 'guarding' && !(f.combo.attack && !air);
    this.stepFighter(f, stepS, this.intents.move, jump);
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
      f.combo.press(false);
      if (this.rng() < 0.35) f.combo.press(false); // sometimes a jab–hook pair
      f.attackCooldownS = TRAINING_DUMMY.attackEveryS;
    }
    this.stepFighter(f, stepS, { x: 0, y: 0 }, false, TRAINING_DUMMY.settleDecelMps2);
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

    const ev = f.combo.update(stepS, air);
    const attack = f.combo.attack;
    const tuning = f.def.movement;
    const v = body.linvel();

    let next: { x: number; y: number };
    if (c.state === 'dodging') {
      next = { x: f.dodgeDir.x * DEFENCE.dodgeSpeedMps, y: f.dodgeDir.y * DEFENCE.dodgeSpeedMps };
    } else if (!c.canAct) {
      // Stunned, knocked down or KO: slide to a stop (further while flying from a heavy blow).
      const decel = f.knockFlightS > 0 ? KNOCK_FLIGHT_DECEL : SETTLE_DECEL;
      next = stepVelocity(v, { x: 0, y: 0 }, { maxSpeedMps: 0, accelMps2: 0, decelMps2: decel }, stepS);
    } else {
      let move = moveIn;
      const factor = c.state === 'guarding' ? 0.35 : attack && !air ? attack.moveFactor : 1;
      move = { x: move.x * factor, y: move.y * factor };
      const isIdle = move.x === 0 && move.y === 0;
      const decel =
        f.knockFlightS > 0 ? KNOCK_FLIGHT_DECEL : isIdle ? (idleDecel ?? tuning.decelMps2) : tuning.decelMps2;
      next = stepVelocity(v, move, { ...tuning, decelMps2: decel }, stepS);
      if (!attack && Math.abs(moveIn.x) > 0.1 && f === this.playerFighter) f.facing = moveIn.x > 0 ? 1 : -1;
    }
    body.setLinvel(next, true);

    if (jump && !air) f.jumps++;
    f.hop = stepHop(f.hop, jump, tuning, stepS);
    if (air && !f.airborne) f.combo.landed();

    if (ev.hit) this.resolveHit(f, ev.hit);
  }

  /** An attack reached its active window: check its hit capsule against other fighters and doors. */
  private resolveHit(attacker: FighterEntity, a: AttackDef): void {
    const body = attacker.body;
    if (!body) return;
    const facing = attacker.facing;
    const p = body.translation();
    const capsule = hitCapsule(p, facing, a);
    let connected = false;

    if (a.lungeMps > 0) {
      const v = body.linvel();
      body.setLinvel({ x: v.x + facing * a.lungeMps, y: v.y }, true);
    }

    for (const target of this.fighters) {
      if (target === attacker || !target.body || target.combatant.isKo) continue;
      const t = target.body.translation();
      if (distanceToCapsule(capsule, t.x, t.y) > a.hitRadiusM + target.def.body.footRadiusM) continue;
      // A block only works when facing the attacker.
      const fromFront = target.facing === (p.x >= t.x ? 1 : -1);
      const result = target.combatant.receive(
        {
          baseDamage: a.damage,
          attackerPower: attacker.def.stats.power,
          heavy: a.heavy,
          fromFront,
          critRoll: this.rng(),
        },
        attacker.def.stats.critChance,
        attacker.def.stats.critMultiplier,
      );
      if (result.outcome === 'ignored') continue;
      connected = true;
      this.events.push({
        kind: result.outcome,
        target: target.name,
        x: t.x,
        y: t.y - HEAD_TOP_M,
        amount: result.damage,
      });

      if (result.outcome === 'parried') {
        attacker.combatant.stun(result.attackerStunS);
        attacker.combo.interrupt();
        this.shake.addTrauma(0.25);
        this.hitstopS = HITSTOP_HEAVY_S;
        continue;
      }
      if (result.outcome === 'dodged') continue;
      if (result.outcome !== 'blocked') target.combo.interrupt();

      const speed = a.knockbackSpeedMps * result.knockbackScale;
      const sideways = Math.max(-0.4, Math.min(0.4, t.y - p.y));
      target.body.setLinvel({ x: facing * speed, y: sideways * speed }, true);
      target.knockFlightS = speed >= HEAVY_KNOCKBACK_MPS ? KNOCK_FLIGHT_S : 0;
      this.hitstopS = a.heavy || result.outcome === 'ko' ? HITSTOP_HEAVY_S : HITSTOP_LIGHT_S;
      if (result.outcome === 'ko') {
        this.shake.addTrauma(0.7);
        this.shake.punch(0.08);
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

    if (connected) {
      attacker.hits++;
      this.shake.addTrauma(a.trauma);
      this.shake.punch(a.zoomPunch);
    }
  }

  /** A fighter flying from a heavy knockback smashes a door it hits. */
  private checkDoorImpact(f: FighterEntity, stepS: number): void {
    if (f.knockFlightS <= 0 || !f.body) return;
    const v = f.body.linvel();
    const speed = Math.hypot(v.x, v.y);
    if (speed === 0) return;
    const pos = f.body.translation();
    const reach = f.def.body.footRadiusM + speed * stepS + 0.05;
    for (const door of this.doors) {
      if (door.broken || !circleTouchesRect(pos, reach, door.spec)) continue;
      const broke = door.applyImpact({
        kind: 'knockback',
        strength: f.def.body.massKg * speed,
        direction: { x: v.x / speed, y: v.y / speed },
      });
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
      if (door.broken && view) view.showBroken(door.pieces, (node) => this.view?.actors.add(node, 0));
    }
    this.view.actors.update();

    // Frame the player and the dummy (aiming at torsos), then apply impact shake.
    const { width, height } = this.viewport();
    const cam = this.camera.update(
      { x: me.x, y: me.y - 0.8 },
      [{ x: other.x, y: other.y - 0.8 }],
      frameDtS,
      width,
      height,
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
      speedMps: down || c.state === 'stunned' ? 0 : Math.hypot(v.x, v.y),
      maxSpeedMps: f.def.movement.maxSpeedMps,
      heightM,
      peakHeightM: this.peakHopM,
      verticalSpeedMps: f.hop.verticalSpeedMps,
    });
    const attack = f.combo.attack;
    if (attack) pose = attackPose(pose, attack, f.combo.progress);

    // Reactions blend in and out smoothly.
    const reaction =
      c.state === 'guarding' ? 'block' : c.state === 'stunned' ? 'flinch' : c.state === 'dodging' ? 'dash' : null;
    if (reaction) f.lastReaction = reaction;
    f.reactWeight += ((reaction ? 1 : 0) - f.reactWeight) * smoothing(reaction === 'flinch' ? 30 : 18, frameDtS);
    if (f.lastReaction && f.reactWeight > 0.01) {
      const fn = f.lastReaction === 'block' ? blockPose : f.lastReaction === 'flinch' ? flinchPose : dashPose;
      pose = blendPose(pose, fn(pose), f.reactWeight);
    }
    f.tilt += ((down ? KNOCKDOWN_TILT_RAD : 0) - f.tilt) * smoothing(down ? 16 : 7, frameDtS);

    f.view.draw(pose, f.facing, heightM, f.tilt);
    f.view.root.position.set(x, y);
    f.bars?.draw(
      x,
      y - heightM - HEAD_TOP_M * Math.cos(f.tilt),
      c.hp / c.stats.maxHp,
      c.stamina / c.stats.maxStamina,
      !c.isKo,
    );
    return { x, y };
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
      doors: this.doors.map((d) => (d.broken ? 'broken' : 'closed')).join(',') || '-',
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
  }
}
