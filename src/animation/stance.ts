import type { SelectStance } from '../data/presentation/select-stances';
import { armIk, type BoneLengths, legIk, type Pose } from './skeleton';

const rad = (d: number): number => (d * Math.PI) / 180;

/**
 * A fighter's select-screen stance on its own rig (owner, 13/11/2026). `breath` 0..1 is the
 * breath: the chest rises, the hips lift a little, the hands float up. Feet and hands are placed
 * with IK, so the same stance fits any build.
 */
export function stancePose(s: SelectStance, bones: BoneLengths, breath: number, phase = 0): Pose {
  const leg = bones.thigh + bones.shin;
  const arm = bones.upperArm + bones.foreArm;
  const idle = s.idle;
  const turn = Math.sin(phase * Math.PI * 2);
  const sway = Math.sin(phase * Math.PI * 2 + 1.2);
  const lean = rad(s.lean + s.breath.lean * breath + (idle?.shoulder ?? 0) * sway);
  const pelvisM = (s.pelvis + s.breath.pelvis * breath) * leg;
  const shift = (idle?.weight ?? 0) * turn;
  // The occasional adjustment: one smooth move of the free hand and back, over a fifth of the loop.
  const f = phase > 0.6 && phase < 0.8 ? Math.sin(((phase - 0.6) / 0.2) * Math.PI) ** 2 : 0;
  // Hands are aimed in world space; the rig hangs arms from the torso, so take the lean back out.
  const hand = (h: { x: number; y: number; elbowOut?: boolean }) => {
    const hx = (h.x + (idle?.sway ? idle.sway.x * sway : 0) + (h === s.back && idle?.fidget ? idle.fidget.x * f : 0)) * arm;
    const hy = (h.y - s.breath.hands * breath + (idle?.sway ? idle.sway.y * sway : 0) + (h === s.back && idle?.fidget ? idle.fidget.y * f : 0)) * arm;
    const ik = armIk(hx, hy, bones.upperArm, bones.foreArm);
    if (!h.elbowOut) return { root: ik.root - lean, bend: ik.bend };
    // The other elbow solution: mirror the upper arm about the shoulder-to-hand line.
    const toHand = Math.atan2(hx, hy);
    return { root: 2 * toHand - ik.root - lean, bend: -ik.bend };
  };
  return {
    lean,
    head: rad(s.head + (idle?.head ?? 0) * Math.sin(phase * Math.PI * 2 + 0.6)),
    armFront: hand(s.front),
    armBack: hand(s.back),
    ...(s.front2 ? { armFront2: hand(s.front2) } : {}),
    ...(s.back2 ? { armBack2: hand(s.back2) } : {}),
    legFront: legIk((s.leadFoot + shift) * leg, pelvisM, bones.thigh, bones.shin),
    legBack: legIk((s.rearFoot + shift) * leg, pelvisM, bones.thigh, bones.shin),
  };
}
