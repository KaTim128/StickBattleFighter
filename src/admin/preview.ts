import { Application, Container, Graphics } from 'pixi.js';
import { StickmanAnimator } from '../animation/animator';
import { strikePose } from '../animation/clips';
import { idleStyleFor } from '../animation/greybox-motion';
import { blockPose, flinchPose, getUpFrame, knockdownFrame } from '../animation/reaction-poses';
import type { Pose } from '../animation/skeleton';
import { STRIKE_STATES } from '../characters/resolve';
import type { AnimationState } from '../characters/schema';
import type { FighterDef } from '../data/fighters/fighter-def';
import { installMetreScaleCurves } from '../rendering/metre-scale-curves';
import { StickmanView } from '../rendering/stickman-view';

/** Default phase lengths for previewing a strike state no move uses. */
const PREVIEW_TIMING = { windupS: 0.12, activeS: 0.1, recoveryS: 0.3 } as const;
const PX_PER_M = 120;

/**
 * The editor's animation preview (TD-039): draws the character with the same
 * view and clips the game uses, looping any animation state, and shows the hit
 * area of the selected move (brighter during its active window).
 */
export class CharacterPreview {
  private readonly app = new Application();
  private readonly world = new Container();
  private readonly hitArea = new Graphics();
  private view: StickmanView | null = null;
  private animator: StickmanAnimator | null = null;
  private def: FighterDef | null = null;
  private state: AnimationState = 'Idle';
  private moveId: string | null = null;
  private t = 0;
  private loops = 0;
  private showHitbox = true;

  constructor(private readonly canvas: HTMLCanvasElement) {}

  async init(): Promise<void> {
    installMetreScaleCurves();
    await this.app.init({
      canvas: this.canvas,
      width: this.canvas.clientWidth || 360,
      height: this.canvas.clientHeight || 300,
      background: 0x1c222c,
      antialias: true,
    });
    this.app.stage.addChild(this.world);
    const floor = new Graphics().rect(-2, 0, 4, 0.02).fill(0x3a4250);
    this.world.addChild(floor, this.hitArea);
    this.world.scale.set(PX_PER_M);
    this.world.position.set(this.app.screen.width * 0.42, this.app.screen.height * 0.82);
    this.app.ticker.add((tk) => this.tick(tk.deltaMS / 1000));
  }

  setCharacter(def: FighterDef): void {
    this.def = def;
    this.view?.destroy();
    this.view = new StickmanView(
      def.bones,
      def.look,
      def.effects.head ?? 'round',
      def.effects.body ?? 'solid',
      def.sizeScale ?? 1,
      def.effects.held ?? null,
    );
    this.world.addChild(this.view.root);
    const idle = def.animation.clips.Idle[0];
    this.animator = new StickmanAnimator(def.bones, idleStyleFor(idle?.kind === 'procedural' ? idle.id : undefined));
    if (this.moveId && !def.moves[this.moveId]) this.moveId = null;
  }

  showState(state: AnimationState): void {
    this.state = state;
    this.moveId = this.def ? (Object.values(this.def.moves).find((m) => m.animationState === state)?.id ?? null) : null;
    this.t = 0;
  }

  showMove(id: string): void {
    const m = this.def?.moves[id];
    if (!m) return;
    this.moveId = id;
    this.state = m.animationState;
    this.t = 0;
  }

  setShowHitbox(on: boolean): void {
    this.showHitbox = on;
  }

  private tick(dtS: number): void {
    const def = this.def;
    const view = this.view;
    const animator = this.animator;
    if (!def || !view || !animator) return;
    this.t += dtS;
    const s = this.state;
    const speed =
      s === 'Walk' || s === 'StopRun' ? 1.8 : s === 'Run' || s === 'StartRun' ? def.movement.maxSpeedMps : 0;
    const airPhase = (this.t % 1.2) / 1.2;
    const air = s === 'JumpRise' || s === 'JumpTakeoff' || s === 'JumpApex' || s === 'Fall';
    const heightM = air ? Math.sin(airPhase * Math.PI) * 0.9 : 0;
    let pose: Pose = animator.update(dtS, {
      speedMps: speed,
      maxSpeedMps: def.movement.maxSpeedMps,
      heightM,
      peakHeightM: 1,
      verticalSpeedMps: s === 'Fall' ? -1 : air ? Math.cos(airPhase * Math.PI) : 0,
    });
    let tilt = 0;
    let lift = 0;
    this.hitArea.clear();
    const clip = def.animation.clips[s][this.loops % def.animation.clips[s].length]!;
    if (STRIKE_STATES.has(s) && clip.kind === 'strike') {
      const move = this.moveId ? def.moves[this.moveId] : undefined;
      const timing = move ?? PREVIEW_TIMING;
      const dur = timing.windupS + timing.activeS + timing.recoveryS;
      const period = dur + 0.5;
      if (this.t >= period) {
        this.t -= period;
        this.loops++;
      }
      const p = Math.min(1, this.t / dur);
      pose = strikePose(pose, clip, p, timing);
      if (move && this.showHitbox) {
        const active = this.t >= move.windupS && this.t <= move.windupS + move.activeS;
        // The capsule the game tests: from just in front of the body out to full reach.
        this.hitArea
          .roundRect(
            0.15 - move.hitRadiusM,
            -1.1 - move.hitRadiusM,
            move.reachM - 0.15 + move.hitRadiusM * 2,
            move.hitRadiusM * 2,
            move.hitRadiusM,
          )
          .fill({ color: active ? 0xff4d4d : 0xff9a4d, alpha: active ? 0.4 : 0.15 })
          .stroke({ width: 0.01, color: 0xff4d4d, alpha: 0.8 });
      }
    } else if (s.startsWith('Block') || s === 'Parry' || s === 'ClashEntry') {
      pose = blockPose(pose);
    } else if (
      s === 'LightHit' ||
      s === 'HeavyHit' ||
      s === 'AirborneHit' ||
      s === 'Knockback' ||
      s === 'WallImpact' ||
      s === 'ClashLose' ||
      s === 'ClashStalemate'
    ) {
      pose = flinchPose(pose);
    } else if (s === 'Knockdown' || s === 'Faint' || s === 'Defeat' || s === 'Disintegration') {
      const f = knockdownFrame(pose, this.t % 2);
      pose = f.pose;
      tilt = f.tiltRad;
      lift = f.liftM;
    } else if (s === 'GetUp') {
      const f = getUpFrame(pose, (this.t % 1.2) / 1.2);
      pose = f.pose;
      tilt = f.tiltRad;
    }
    view.draw(pose, 1, heightM + lift, tilt);
    view.root.alpha = s === 'Disintegration' ? Math.max(0, 1 - (this.t % 2) / 2) : 1;
  }
}
