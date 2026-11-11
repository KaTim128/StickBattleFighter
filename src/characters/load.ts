import type { FighterDef } from '../data/fighters/fighter-def';
import { BUILT_IN_LIBRARY, FALLBACK_CHARACTER } from './library';
import { resolveCharacter } from './resolve';
import type { CharacterLibrary } from './schema';
import { type ValidationReport, validateCharacter } from './validate';

export interface LoadedCharacter {
  readonly def: FighterDef;
  readonly report: ValidationReport;
  /** The requested character was invalid; the Base Stickman is used instead. */
  readonly fellBack: boolean;
}

/**
 * Validate, then resolve. Invalid data never crashes the game: the Base
 * Stickman is used instead and the report says exactly what is wrong.
 * Fallback animations and switched-off moves are reported as warnings
 * (and logged to the console in development builds).
 */
export function loadCharacter(id: string, lib: CharacterLibrary = BUILT_IN_LIBRARY): LoadedCharacter {
  const report = validateCharacter(id, lib);
  if (report.errors.length > 0) {
    console.error(
      `Character "${id}" is invalid; using "${FALLBACK_CHARACTER}" instead:\n- ${report.errors.join('\n- ')}`,
    );
    return { def: resolveCharacter(FALLBACK_CHARACTER, BUILT_IN_LIBRARY), report, fellBack: true };
  }
  const def = resolveCharacter(id, lib);
  for (const w of def.warnings) if (!report.warnings.includes(w)) report.warnings.push(w);
  if (import.meta.env?.DEV && report.warnings.length > 0) {
    console.warn(`Character "${id}": ${report.warnings.length} warning(s):\n- ${report.warnings.join('\n- ')}`);
  }
  return { def, report, fellBack: false };
}
