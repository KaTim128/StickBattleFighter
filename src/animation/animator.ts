import {
  AIR_FALL_POSE,
  AIR_RISE_POSE,
  type IdleStyle,
  idlePose,
  landingPose,
  runAmount,
  runPose,
  strideAt,
  walkPose,
} from './greybox-motion';
import { type BoneLengths, blendPose, type Pose } from './skeleton';

/** Exponential smoothing factor for a time step (frame-rate independent). */
export function smoothing(rate: number, dtS: number): number {
  return 1 - Math.exp(-rate * dtS);
}

export interface MotionInput {
  /** Current ground speed, m/s. */
  speedMps: number;
  maxSpeedMps: number;
  /** Height of the jump hop, m (0 on the floor). */
  heightM: number;
  peakHeightM: number;
  /** Upward speed of the hop, m/s (positive rising, negative falling). */
  verticalSpeedMps?: number;
}

/**
 * Chooses and blends the stickman's animations from its motion (no hard
 * switches): idle ↔ walk ↔ run by speed, then towards the airborne pose by
 * hop height. Weights ease over time so transitions never snap; attacks,
 * blocks and reactions are layered on top by the scene.
 */
export class StickmanAnimator {
  private timeS = 0;
  private walkPhase = 0;
  private walkWeight = 0;
  private runWeight = 0;
  private airWeight = 0;
  private riseWeight = 0;
  private landWeight = 0;
  private wasAirborne = false;
  /** Footfalls since the last `takeFootfalls()`. */
  private footfalls = 0;

  /** @param idleStyle the stance the Animation Profile assigns to Idle (procedural clip). */
  constructor(
    private readonly bones: BoneLengths,
    private readonly idleStyle: IdleStyle = 'boxer',
  ) {}

  /** Advance by a time step and return the pose to draw. */
  update(dtS: number, motion: MotionInput): Pose {
    this.timeS += dtS;
    const before = this.walkPhase;
    this.walkPhase = (this.walkPhase + (motion.speedMps * dtS) / strideAt(motion.speedMps)) % 1;
    // A footfall at the start and middle of each cycle (footstep sounds).
    if (motion.speedMps > 0.5 && (this.walkPhase < before || (before < 0.5 && this.walkPhase >= 0.5))) this.footfalls++;

    // Start stepping almost at once (responsive), and ease into the run as speed builds.
    const walkTarget = Math.min(1, motion.speedMps / (motion.maxSpeedMps * 0.2));
    this.walkWeight += (walkTarget - this.walkWeight) * smoothing(16, dtS);
    this.runWeight += (runAmount(motion.speedMps) - this.runWeight) * smoothing(10, dtS);
    const airTarget = motion.peakHeightM > 0 ? Math.min(1, motion.heightM / (motion.peakHeightM * 0.4)) : 0;
    this.airWeight += (airTarget - this.airWeight) * smoothing(18, dtS);

    const airborne = motion.heightM > 0.01;
    if (this.wasAirborne && !airborne) this.landWeight = 1; // touchdown: absorb
    this.wasAirborne = airborne;
    this.landWeight *= Math.exp(-9 * dtS);
    const riseTarget = (motion.verticalSpeedMps ?? 0) > 0 ? 1 : 0;
    this.riseWeight += (riseTarget - this.riseWeight) * smoothing(10, dtS);

    const gait = blendPose(walkPose(this.walkPhase, this.bones), runPose(this.walkPhase, this.bones), this.runWeight);
    const stance = blendPose(idlePose(this.timeS, this.bones, this.idleStyle), gait, this.walkWeight);
    const grounded = blendPose(stance, landingPose(this.bones), this.landWeight * 0.8);
    const air = blendPose(AIR_FALL_POSE, AIR_RISE_POSE, this.riseWeight);
    return blendPose(grounded, air, this.airWeight);
  }

  /** Footfalls since the last call (for footstep sounds). */
  takeFootfalls(): number {
    const n = this.footfalls;
    this.footfalls = 0;
    return n;
  }

  get weights(): { walk: number; run: number; air: number; rise: number; land: number } {
    return {
      walk: this.walkWeight,
      run: this.runWeight,
      air: this.airWeight,
      rise: this.riseWeight,
      land: this.landWeight,
    };
  }
}
