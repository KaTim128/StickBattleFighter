import { BUILT_IN_LIBRARY } from '../../characters/library';
import { resolveCharacter } from '../../characters/resolve';

/** The Practice training dummy, resolved from `src/data/characters/training-dummy/*.json` (TD-039). */
export const TRAINING_DUMMY = resolveCharacter('training-dummy', BUILT_IN_LIBRARY);
