/**
 * AI difficulty levels (owner, 13/11/2026; REQ-AI-4): how quickly and how hard an AI opponent
 * plays. Behaviour only: the fighters' damage and stats never change with difficulty.
 */
export type DifficultyId = 'easy' | 'normal' | 'hard';

export interface Difficulty {
  readonly id: DifficultyId;
  readonly label: string;
  /** Multiplies the pauses between decisions (abilities, punch strings, heavies): bigger = slower. */
  readonly tempo: number;
  /** Multiplies the chance of using an ability or heavy attack when one fits. */
  readonly boldness: number;
  /** Chance, each second, of hesitating for a moment (standing still, guard down). */
  readonly hesitatePerS: number;
  /** Longest punch string it strings together. */
  readonly maxString: number;
}

export const DIFFICULTIES: Readonly<Record<DifficultyId, Difficulty>> = {
  easy: { id: 'easy', label: 'Easy', tempo: 1.8, boldness: 0.45, hesitatePerS: 0.35, maxString: 2 },
  normal: { id: 'normal', label: 'Normal', tempo: 1, boldness: 1, hesitatePerS: 0.08, maxString: 4 },
  hard: { id: 'hard', label: 'Hard', tempo: 0.6, boldness: 1.4, hesitatePerS: 0, maxString: 5 },
};

export const DEFAULT_DIFFICULTY: DifficultyId = 'normal';

export function difficultyFor(id: string | null | undefined): Difficulty {
  return id && id in DIFFICULTIES ? DIFFICULTIES[id as DifficultyId] : DIFFICULTIES[DEFAULT_DIFFICULTY];
}
