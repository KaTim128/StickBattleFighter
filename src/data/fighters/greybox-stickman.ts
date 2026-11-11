import { BUILT_IN_LIBRARY } from '../../characters/library';
import { resolveCharacter } from '../../characters/resolve';

/**
 * The Base Stickman template as a runtime fighter (TD-039): resolved from
 * `src/data/characters/base-stickman/*.json`. Edit the JSON, not this file.
 */
export const GREYBOX_STICKMAN = resolveCharacter('base-stickman', BUILT_IN_LIBRARY);
