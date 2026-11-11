import { AIR_FALL_POSE, AIR_RISE_POSE, idlePose, landingPose, WALK_STRIDE_M, walkPose } from './greybox-motion';
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
 * switches): idle ↔ walk by speed, then towards the airborne pose by hop
 * height. Weights ease over time so transitions never snap.
 */
export class StickmanAnimator {
  private timeS = 0;
  private walkPhase = 0;
  private walkWeight = 0;
  private airWeight = 0;
  private riseWeight = 0;
  private landWeight = 0;
  private wasAirborne = false;

  constructor(private readonly bones: BoneLengths) {}

  /** Advance by a time step and return the pose to draw. */
  update(dtS: number, motion: MotionInput): Pose {
    this.timeS += dtS;
    this.walkPhase = (this.walkPhase + (motion.speedMps * dtS) / WALK_STRIDE_M) % 1;

    const walkTarget = Math.min(1, motion.speedMps / (motion.maxSpeedMps * 0.35));
    this.walkWeight += (walkTarget - this.walkWeight) * smoothing(12, dtS);
    const airTarget = motion.peakHeightM > 0 ? Math.min(1, motion.heightM / (motion.peakHeightM * 0.4)) : 0;
    this.airWeight += (airTarget - this.airWeight) * smoothing(18, dtS);

    const airborne = motion.heightM > 0.01;
    if (this.wasAirborne && !airborne) this.landWeight = 1; // touchdown: absorb
    this.wasAirborne = airborne;
    this.landWeight *= Math.exp(-9 * dtS);
    const riseTarget = (motion.verticalSpeedMps ?? 0) > 0 ? 1 : 0;
    this.riseWeight += (riseTarget - this.riseWeight) * smoothing(10, dtS);

    const stance = blendPose(idlePose(this.timeS, this.bones), walkPose(this.walkPhase, this.bones), this.walkWeight);
    const grounded = blendPose(stance, landingPose(this.bones), this.landWeight * 0.8);
    const air = blendPose(AIR_FALL_POSE, AIR_RISE_POSE, this.riseWeight);
    return blendPose(grounded, air, this.airWeight);
  }

  get weights(): { walk: number; air: number; rise: number; land: number } {
    return { walk: this.walkWeight, air: this.airWeight, rise: this.riseWeight, land: this.landWeight };
  }
}
