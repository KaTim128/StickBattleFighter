/**
 * The player's name (owner, 13/11/2026): registered before Story Mode or Game Modes, at most 10
 * characters (an emoji counts as one), any letters, numbers, symbols or emojis (owner, 13/11/2026:
 * "remove restrictive character validation"), kept in this browser and changeable in Settings. It is the player's identity on
 * screen (HUD, tournament draw, fighter select) next to the fighter's own name. Display only:
 * until server accounts exist (REQ-BE) it proves nothing about who the player is.
 */
export const PLAYER_NAME_MAX = 10;
export const PLAYER_NAME_KEY = 'stickman-arena.player-name.v1';

export type NameCheck = { ok: true; name: string } | { ok: false; error: string };

/**
 * Any characters at all: letters in any language, numbers, symbols and emojis. Only invisible
 * control characters (line breaks, tabs and the like) are removed; spaces are trimmed and inner
 * runs collapsed. Length counts what the player sees: an emoji, even a combined one, is one.
 */
export function validatePlayerName(raw: string): NameCheck {
  const name = raw
    .normalize('NFC')
    .replace(/\p{Cc}/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  if (name.length === 0) return { ok: false, error: 'Enter a name.' };
  if (nameLength(name) > PLAYER_NAME_MAX) return { ok: false, error: `At most ${PLAYER_NAME_MAX} characters.` };
  return { ok: true, name };
}

/** Characters as the player sees them (grapheme clusters: 👍🏽 or 👨‍👩‍👧 is one). */
export function nameLength(text: string): number {
  const Seg = (
    Intl as unknown as {
      Segmenter?: new (l?: string, o?: { granularity: string }) => { segment(t: string): Iterable<unknown> };
    }
  ).Segmenter;
  if (Seg) return [...new Seg(undefined, { granularity: 'grapheme' }).segment(text)].length;
  return [...text].length;
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
