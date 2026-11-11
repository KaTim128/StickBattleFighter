import type { CharacterLibrary } from './schema';

/**
 * The admin editor's working draft, kept in this browser's local storage so
 * "Try in game" can play it (TD-039). Local testing only: drafts are never
 * sent anywhere; publishing a character means committing its JSON files
 * (server-side admin publishing arrives with the backend, REQ-BE-4).
 */
export interface CharacterDraft {
  readonly characterId: string;
  readonly entries: Partial<{ [K in keyof CharacterLibrary]: readonly unknown[] }>;
}

const KEY = 'stickman-arena.character-draft';

export function saveDraft(draft: CharacterDraft): void {
  localStorage.setItem(KEY, JSON.stringify(draft));
}

export function readDraft(): CharacterDraft | null {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as CharacterDraft;
    return typeof d?.characterId === 'string' && typeof d.entries === 'object' ? d : null;
  } catch {
    return null; // a corrupt draft is ignored, never fatal
  }
}
