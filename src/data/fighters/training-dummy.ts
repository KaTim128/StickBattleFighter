import type { FighterDef } from './fighter-def';
import { GREYBOX_STICKMAN } from './greybox-stickman';

/**
 * GREYBOX training dummy: a second fighter on the same engine as the player
 * (same skeleton, stance and attacks), in grey and heavier. It holds its
 * ground; with "dummy attacks" on (Practice Zone option, REQ-MOD-5) it jabs
 * back when you are close. Stats are PROVISIONAL (OQ-05).
 */
export const TRAINING_DUMMY = {
  ...GREYBOX_STICKMAN,
  id: 'training-dummy',
  body: { footRadiusM: GREYBOX_STICKMAN.body.footRadiusM, massKg: 140 },
  stats: { ...GREYBOX_STICKMAN.stats, critChance: 0 },
  /** How quickly it stops after being shoved, m/s². */
  settleDecelMps2: 14,
  /** How often it may attack when "dummy attacks" are on, seconds. */
  attackEveryS: 1.6,
  look: {
    limb: 0xb9c0cc,
    limbBack: 0x8a919d,
    outline: 0x1b1b1f,
    limbWidthM: GREYBOX_STICKMAN.look.limbWidthM,
    outlineWidthM: GREYBOX_STICKMAN.look.outlineWidthM,
  },
} satisfies FighterDef & Record<string, unknown>;
