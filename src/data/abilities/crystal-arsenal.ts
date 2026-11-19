import type { MoveInput } from '../../characters/schema';
import type { AttackDef } from '../../combat/attacks';

/**
 * Crystal Fists (Crystal Arsenal, owner 22/11/2026): for a few seconds his fists are crystal, with sharp crystal knuckles, and
 * every punch is heavy. While it lasts the fists' moves replace his unarmed taps and heavy. A hit does not end it; the time
 * running out, a KO or using another ability does. Values are PROVISIONAL (OQ-05).
 */
export interface FistsMoveset {
  readonly moves: Readonly<Record<string, AttackDef>>;
  readonly starters: Partial<Record<MoveInput, string>>;
}

const base = {
  blow: 'strike',
  chainAtRecovery: 0.5,
  aerial: false,
  sfx: null,
  burn: null,
  groundBounce: false,
  category: 'punch',
  contact: true,
} as const;

export const FISTS_MOVESET: FistsMoveset = {
  starters: { tap: 'fist-jab', heavy: 'fist-smash' },
  moves: {
    'fist-jab': {
      ...base,
      id: 'fist-jab',
      label: 'Crystal jab',
      windupS: 0.08,
      activeS: 0.07,
      recoveryS: 0.18,
      reachM: 1.25,
      hitRadiusM: 0.5,
      strength: 700,
      damage: 26,
      heavy: false,
      knockbackSpeedMps: 3.5,
      moveFactor: 0.45,
      lungeMps: 1.0,
      impact: 'knuckle-heavy',
      trauma: 0.2,
      zoomPunch: 0.015,
      animationState: 'Jab',
      next: { tap: 'fist-cross' },
      effect: 'crystal-hit',
    },
    'fist-cross': {
      ...base,
      id: 'fist-cross',
      label: 'Crystal cross',
      windupS: 0.09,
      activeS: 0.08,
      recoveryS: 0.2,
      reachM: 1.3,
      hitRadiusM: 0.5,
      strength: 800,
      damage: 32,
      heavy: false,
      knockbackSpeedMps: 4.5,
      moveFactor: 0.4,
      lungeMps: 1.2,
      impact: 'knuckle-heavy',
      trauma: 0.25,
      zoomPunch: 0.018,
      animationState: 'Hook',
      next: {},
      effect: 'crystal-hit',
    },
    'fist-smash': {
      ...base,
      id: 'fist-smash',
      label: 'Crystal smash',
      windupS: 0.22,
      activeS: 0.1,
      recoveryS: 0.4,
      reachM: 1.45,
      hitRadiusM: 0.55,
      strength: 1000,
      damage: 64,
      heavy: true,
      knockbackSpeedMps: 9,
      moveFactor: 0.2,
      lungeMps: 1.5,
      impact: 'knuckle-heavy',
      trauma: 0.45,
      zoomPunch: 0.03,
      animationState: 'HeavyAttack',
      next: {},
      effect: 'crystal-wave',
    },
  },
};
