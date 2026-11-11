import { GREYBOX_STICKMAN } from './greybox-stickman';

/**
 * GREYBOX training dummy (Phase 3): a second body for the camera to frame and
 * for the player to shove. Same skeleton system and stance as the test
 * stickman, in grey; heavier, so it gives ground slowly. It does not move or
 * fight on its own (Practice Zone dummies with options arrive in Phase 10).
 */
export const TRAINING_DUMMY = {
  id: 'training-dummy',
  bones: GREYBOX_STICKMAN.bones,
  body: { footRadiusM: GREYBOX_STICKMAN.body.footRadiusM, massKg: 140 },
  /** How quickly it stops after being shoved, m/s². */
  settleDecelMps2: 14,
  look: {
    limb: 0xb9c0cc,
    limbBack: 0x8a919d,
    outline: 0x1b1b1f,
    limbWidthM: GREYBOX_STICKMAN.look.limbWidthM,
    outlineWidthM: GREYBOX_STICKMAN.look.outlineWidthM,
  },
} as const;
