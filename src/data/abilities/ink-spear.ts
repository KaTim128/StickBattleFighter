import type { MoveInput } from '../../characters/schema';
import type { AttackDef } from '../../combat/attacks';

/**
 * Ink Spear (Inkmaster, owner 25/11/2026): his calligraphy brush turns into a long spear for 8 seconds. While it lasts the spear moves
 * replace his taps and heavy: quick forward thrusts that reach well past a fist, a driving lunge, and a heavy impaling stab. Every
 * thrust counts only where the tip actually touches a body (`contact`), so they need aim and spacing. Values are PROVISIONAL (OQ-05).
 */
export interface InkSpearMoveset {
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
  effect: null,
} as const;

export const INK_SPEAR_MOVESET: InkSpearMoveset = {
  starters: { tap: 'spear-thrust', heavy: 'spear-impale' },
  moves: {
    'spear-thrust': {
      ...base,
      id: 'spear-thrust',
      label: 'Spear thrust',
      windupS: 0.12,
      activeS: 0.07,
      recoveryS: 0.22,
      reachM: 2.3,
      hitRadiusM: 0.3,
      strength: 760,
      damage: 30,
      heavy: false,
      knockbackSpeedMps: 3.5,
      moveFactor: 0.5,
      lungeMps: 1.2,
      impact: 'knuckle-light',
      trauma: 0.18,
      zoomPunch: 0.014,
      animationState: 'BladeThrust',
      next: { tap: 'spear-thrust-2' },
    },
    'spear-thrust-2': {
      ...base,
      id: 'spear-thrust-2',
      label: 'Second thrust',
      windupS: 0.1,
      activeS: 0.07,
      recoveryS: 0.22,
      reachM: 2.4,
      hitRadiusM: 0.3,
      strength: 800,
      damage: 32,
      heavy: false,
      knockbackSpeedMps: 4,
      moveFactor: 0.5,
      lungeMps: 1.4,
      impact: 'knuckle-light',
      trauma: 0.2,
      zoomPunch: 0.014,
      animationState: 'BladeSlashA',
      next: { tap: 'spear-lunge' },
    },
    'spear-lunge': {
      ...base,
      id: 'spear-lunge',
      label: 'Driving lunge',
      windupS: 0.16,
      activeS: 0.09,
      recoveryS: 0.34,
      reachM: 2.6,
      hitRadiusM: 0.34,
      strength: 980,
      damage: 46,
      heavy: false,
      knockbackSpeedMps: 9,
      moveFactor: 0.35,
      lungeMps: 2.6,
      impact: 'knuckle-heavy',
      trauma: 0.3,
      zoomPunch: 0.022,
      animationState: 'BladeFinale',
      next: {},
    },
    'spear-impale': {
      ...base,
      id: 'spear-impale',
      label: 'Impaling stab',
      windupS: 0.3,
      activeS: 0.1,
      recoveryS: 0.45,
      reachM: 2.7,
      hitRadiusM: 0.36,
      strength: 1200,
      damage: 62,
      heavy: true,
      knockbackSpeedMps: 11,
      moveFactor: 0.25,
      lungeMps: 3,
      impact: 'knuckle-heavy',
      trauma: 0.38,
      zoomPunch: 0.026,
      animationState: 'BladeHammer',
      next: {},
    },
  },
};
