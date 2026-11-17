import type { CharacterDefinition, CharacterLibrary } from './schema';

/**
 * Which characters appear where (owner, master plan 16/11/2026: "the Admin Panel displays all
 * available fighters, including every skeleton variant and special fighter").
 * - Players see the **playable fighters** (the main combat roster).
 * - The Admin Panel sees **every character built from the base template**: the playable fighters
 *   plus summons (skeleton variants) and special characters (the training dummy). Only the bare
 *   base template itself is left out, since it is the shared starting point, not a fighter.
 */
export function playableFighters(lib: CharacterLibrary): CharacterDefinition[] {
  return Object.values(lib.characters).filter(
    (c) => c.template !== undefined && c.capabilities.isPlayable && c.characterType === 'fighter',
  );
}

export function adminCharacters(lib: CharacterLibrary): CharacterDefinition[] {
  const main = playableFighters(lib);
  const others = Object.values(lib.characters).filter((c) => c.template !== undefined && !main.includes(c));
  return [...main, ...others];
}
