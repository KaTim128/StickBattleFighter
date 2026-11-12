import {
  AIR_FALL_POSE,
  AIR_RISE_POSE,
  type IdleStyle,
  idlePose,
  landingPose,
  RUN_FULL_MPS,
  relaxedPose,
  runAmount,
  runPose,
  sprintAmount,
  sprintPose,
  strideAt,
  walkPose,
  walkStrideAt,
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
  /**
   * Running is only for sprinting (owner, 12/11/2026: "Running should only activate when Shift is
   * held"); otherwise the fighter walks at any speed. Absent = the old speed-based blend.
   */
  sprinting?: boolean;
  /** Out of the fight long enough (3 s) to stand relaxed instead of in the fighting stance. */
  relaxed?: boolean;
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
  private sprintWeight = 0;
  private relaxWeight = 0;
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
    const runTarget = motion.sprinting === undefined ? runAmount(motion.speedMps) : motion.sprinting ? 1 : 0;
    // The walk and the run keep their own strides: blend the cycle length by how much it runs.
    const stride =
      walkStrideAt(motion.speedMps) +
      (strideAt(Math.max(motion.speedMps, RUN_FULL_MPS)) - walkStrideAt(motion.speedMps)) * this.runWeight;
    this.walkPhase = (this.walkPhase + (motion.speedMps * dtS) / stride) % 1;
    // A footfall at the start and middle of each cycle (footstep sounds).
    if (motion.speedMps > 0.5 && (this.walkPhase < before || (before < 0.5 && this.walkPhase >= 0.5))) this.footfalls++;

    // Start stepping almost at once (responsive), and ease into the run as speed builds.
    const walkTarget = Math.min(1, motion.speedMps / (motion.maxSpeedMps * 0.2));
    this.walkWeight += (walkTarget - this.walkWeight) * smoothing(16, dtS);
    this.runWeight += (runTarget - this.runWeight) * smoothing(10, dtS);
    // Settling into the relaxed stand is slow and calm; snapping back to the guard is quick.
    const relaxTarget = motion.relaxed ? 1 : 0;
    this.relaxWeight += (relaxTarget - this.relaxWeight) * smoothing(relaxTarget > this.relaxWeight ? 2.5 : 12, dtS);
    this.sprintWeight += (sprintAmount(motion.speedMps) - this.sprintWeight) * smoothing(8, dtS);
    const airTarget = motion.peakHeightM > 0 ? Math.min(1, motion.heightM / (motion.peakHeightM * 0.4)) : 0;
    this.airWeight += (airTarget - this.airWeight) * smoothing(18, dtS);

    const airborne = motion.heightM > 0.01;
    if (this.wasAirborne && !airborne) this.landWeight = 1; // touchdown: absorb
    this.wasAirborne = airborne;
    this.landWeight *= Math.exp(-9 * dtS);
    const riseTarget = (motion.verticalSpeedMps ?? 0) > 0 ? 1 : 0;
    this.riseWeight += (riseTarget - this.riseWeight) * smoothing(10, dtS);

    const running = blendPose(
      runPose(this.walkPhase, this.bones, this.idleStyle),
      sprintPose(this.walkPhase, this.bones, this.idleStyle),
      this.sprintWeight,
    );
    const walking = walkPose(this.walkPhase, this.bones, this.idleStyle, walkStrideAt(motion.speedMps));
    const gait = blendPose(walking, running, this.runWeight);
    const standing = blendPose(
      idlePose(this.timeS, this.bones, this.idleStyle),
      relaxedPose(this.timeS, this.bones, this.idleStyle),
      this.relaxWeight,
    );
    const stance = blendPose(standing, gait, this.walkWeight);
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

  get weights(): { walk: number; run: number; sprint: number; air: number; rise: number; land: number; relax: number } {
    return {
      relax: this.relaxWeight,
      walk: this.walkWeight,
      run: this.runWeight,
      sprint: this.sprintWeight,
      air: this.airWeight,
      rise: this.riseWeight,
      land: this.landWeight,
    };
  }
}
