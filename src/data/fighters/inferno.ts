import { INFERNO_KIT } from '../abilities/inferno';
import type { FighterDef } from './fighter-def';
import { GREYBOX_STICKMAN } from './greybox-stickman';

/**
 * Inferno, fire elemental (spec §5 roster): the first fighter with a full kit
 * (Phase 6, owner choice 11/11/2026). For now it shares the greybox
 * stickman's body, boxer stance and combo; its own idle and movement style
 * (REQ-ANI-7: "bouncy, restless boxer stance") and final art come in Phase 8.
 */
export const INFERNO = {
  ...GREYBOX_STICKMAN,
  id: 'inferno',
  abilities: INFERNO_KIT,
  look: {
    ...GREYBOX_STICKMAN.look,
    limb: 0xff5a1f,
    limbBack: 0xb83a12,
  },
} satisfies FighterDef;
