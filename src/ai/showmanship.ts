import { DIFFICULTIES, type Difficulty } from '../data/ai/difficulty';

/**
 * Watched AI battles are close and exciting (owner, 13/11/2026: "for AI vs AI in tournament
 * battles, their battles must be close and interesting and also exciting"). Two things, both about
 * how the AI decides, never damage, health or speed:
 * - both fighters play sharp, at least at Hard: full kits, combos, punishes and defence, so a
 *   watched battle is full of action;
 * - momentum: the fighter clearly ahead on health eases off (more hesitation and mistakes, fewer
 *   punishes and combo chains, a slower tempo), so the one behind can fight back and battles
 *   stay tense to the end. Level fights are untouched.
 */
export const SHOWMANSHIP = {
  /** A lead of health (share of the maximum) below this changes nothing. */
  leadFree: 0.05,
  /** The lead at which the easing off is full. */
  leadFull: 0.3,
} as const;

const ORDER = ['easy', 'normal', 'hard', 'expert'] as const;

export function showmanship(base: Difficulty, selfHpFrac: number, targetHpFrac: number | null): Difficulty {
  const d = ORDER.indexOf(base.id) < ORDER.indexOf('hard') ? DIFFICULTIES.hard : base;
  if (targetHpFrac === null) return d;
  const lead = selfHpFrac - targetHpFrac;
  const k = Math.min(1, Math.max(0, (lead - SHOWMANSHIP.leadFree) / (SHOWMANSHIP.leadFull - SHOWMANSHIP.leadFree)));
  if (k === 0) return d;
  return {
    ...d,
    tempo: d.tempo * (1 + 1.1 * k),
    reactionS: d.reactionS + 0.4 * k,
    mistakeChance: Math.min(0.7, d.mistakeChance + 0.45 * k),
    hesitatePerS: d.hesitatePerS + 1.0 * k,
    comboSkill: d.comboSkill * (1 - 0.8 * k),
    punishSkill: d.punishSkill * (1 - 0.85 * k),
    defendSkill: d.defendSkill * (1 - 0.6 * k),
  };
}
