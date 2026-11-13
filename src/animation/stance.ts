import type { SelectStance } from '../data/presentation/select-stances';
import { armIk, type BoneLengths, legIk, type Pose } from './skeleton';

const rad = (d: number): number => (d * Math.PI) / 180;

/**
 * A fighter's select-screen stance on its own rig (owner, 13/11/2026). `breath` 0..1 is the
 * breath: the chest rises, the hips lift a little, the hands float up. Feet and hands are placed
 * with IK, so the same stance fits any build.
 */
export function stancePose(s: SelectStance, bones: BoneLengths, breath: number): Pose {
  const leg = bones.thigh + bones.shin;
  const arm = bones.upperArm + bones.foreArm;
  const lean = rad(s.lean + s.breath.lean * breath);
  const pelvisM = (s.pelvis + s.breath.pelvis * breath) * leg;
  // Hands are aimed in world space; the rig hangs arms from the torso, so take the lean back out.
  const hand = (h: { x: number; y: number }) => {
    const ik = armIk(h.x * arm, (h.y - s.breath.hands * breath) * arm, bones.upperArm, bones.foreArm);
    return { root: ik.root - lean, bend: ik.bend };
  };
  return {
    lean,
    head: rad(s.head),
    armFront: hand(s.front),
    armBack: hand(s.back),
    legFront: legIk(s.leadFoot * leg, pelvisM, bones.thigh, bones.shin),
    legBack: legIk(s.rearFoot * leg, pelvisM, bones.thigh, bones.shin),
  };
}
