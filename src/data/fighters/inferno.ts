import { BUILT_IN_LIBRARY } from '../../characters/library';
import { resolveCharacter } from '../../characters/resolve';

/** Inferno as a runtime fighter, resolved from `src/data/characters/inferno/*.json` (TD-039). */
export const INFERNO = resolveCharacter('inferno', BUILT_IN_LIBRARY);
