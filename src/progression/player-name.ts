/**
 * The player's name (owner, 13/11/2026): registered before Story Mode or Game Modes, at most 10
 * characters, kept in this browser and changeable in Settings. It is the player's identity on
 * screen (HUD, tournament draw, fighter select) next to the fighter's own name. Display only:
 * until server accounts exist (REQ-BE) it proves nothing about who the player is.
 */
export const PLAYER_NAME_MAX = 10;
export const PLAYER_NAME_KEY = 'stickman-arena.player-name.v1';

export type NameCheck = { ok: true; name: string } | { ok: false; error: string };

/** Letters (any language), digits, spaces, `_`, `-` and `.`; trimmed, inner spaces collapsed. */
export function validatePlayerName(raw: string): NameCheck {
  const name = raw.normalize('NFC').trim().replace(/\s+/g, ' ');
  if (name.length === 0) return { ok: false, error: 'Enter a name.' };
  if ([...name].length > PLAYER_NAME_MAX) return { ok: false, error: `At most ${PLAYER_NAME_MAX} characters.` };
  if (!/^[\p{L}\p{N} _.-]+$/u.test(name)) return { ok: false, error: 'Use letters, numbers, spaces, - _ or . only.' };
  return { ok: true, name };
}

type NameStorage = Pick<Storage, 'getItem' | 'setItem'>;

function store(): NameStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** The saved name, or null if none (or the saved one is no longer valid). */
export function loadPlayerName(storage: NameStorage | null = store()): string | null {
  const raw = storage?.getItem(PLAYER_NAME_KEY);
  if (!raw) return null;
  const check = validatePlayerName(raw);
  return check.ok ? check.name : null;
}

/** Validate and save; the result says what was saved or why not. */
export function savePlayerName(raw: string, storage: NameStorage | null = store()): NameCheck {
  const check = validatePlayerName(raw);
  if (!check.ok) return check;
  try {
    storage?.setItem(PLAYER_NAME_KEY, check.name);
  } catch (error) {
    console.warn('[profile] could not save the player name (it lasts this session only)', error);
  }
  return check;
}
