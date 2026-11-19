import type { WeaponKind } from '../../abilities/ability-def';
import type { MoveInput } from '../../characters/schema';
import type { AttackDef } from '../../combat/attacks';
import type { ImpactId } from '../combat/impacts';

/**
 * The tap and heavy movesets of Prismor's five generated crystal weapons (Crystal Arsenal, owner 22/11/2026). While a weapon is
 * in his hands the move controller uses its set in place of his unarmed one; when it shatters the unarmed set returns. Every
 * weapon differs in speed, reach, hit area, damage, knockback and the way the body swings (`swing`: a row of the pose table in
 * `src/animation/ability-poses.ts`). Values are PROVISIONAL (OQ-05).
 *
 * Tap counts: Great Sword 2, War Hammer 2, Lance 3, Dual Blades 5, Crystal Guard 2, each with one heavy attack.
 */
export interface WeaponMoveset {
  readonly label: string;
  readonly moves: Readonly<Record<string, AttackDef>>;
  readonly starters: Partial<Record<MoveInput, string>>;
  /** How many taps chain before the string starts over (checked by the tests). */
  readonly taps: number;
}

interface MoveSpec {
  readonly label: string;
  readonly windupS: number;
  readonly activeS: number;
  readonly recoveryS: number;
  readonly reachM: number;
  readonly radiusM: number;
  readonly damage: number;
  readonly knockbackMps: number;
  readonly heavy?: boolean;
  readonly next?: string;
  readonly moveFactor: number;
  readonly lungeMps?: number;
  readonly strength?: number;
  readonly impact?: ImpactId;
  readonly sfx: string;
  readonly effect: string;
  readonly trauma?: number;
  readonly extraHits?: readonly number[];
  readonly index: number;
}

function build(weapon: WeaponKind, specs: Readonly<Record<string, MoveSpec>>): Record<string, AttackDef> {
  const out: Record<string, AttackDef> = {};
  for (const [id, m] of Object.entries(specs))
    out[id] = {
      id,
      label: m.label,
      blow: 'strike',
      windupS: m.windupS,
      activeS: m.activeS,
      recoveryS: m.recoveryS,
      chainAtRecovery: 0.45,
      reachM: m.reachM,
      hitRadiusM: m.radiusM,
      strength: m.strength ?? 600,
      damage: m.damage,
      heavy: m.heavy ?? false,
      knockbackSpeedMps: m.knockbackMps,
      moveFactor: m.moveFactor,
      lungeMps: m.lungeMps ?? 0,
      impact: m.impact ?? (m.heavy ? 'knuckle-heavy' : 'knuckle-light'),
      sfx: m.sfx,
      trauma: m.trauma ?? (m.heavy ? 0.4 : 0.15),
      zoomPunch: m.heavy ? 0.03 : 0.013,
      animationState: m.heavy ? 'HeavyAttack' : 'Jab',
      category: 'punch',
      aerial: false,
      next: m.next ? { tap: m.next } : {},
      effect: m.effect,
      burn: null,
      groundBounce: false,
      ...(m.extraHits ? { extraHits: m.extraHits } : {}),
      swing: { weapon, index: m.index },
    };
  return out;
}

export const ARSENAL_MOVESETS: Readonly<Record<WeaponKind, WeaponMoveset>> = {
  // Great Sword: slow, wide and heavy. A sweep, a backswing, and a huge overhead chop that hurls them.
  greatsword: {
    label: 'Crystal Great Sword',
    taps: 2,
    starters: { tap: 'gs-sweep', heavy: 'gs-overhead' },
    moves: build('greatsword', {
      'gs-sweep': {
        label: 'Great sweep',
        windupS: 0.42,
        activeS: 0.12,
        recoveryS: 0.36,
        reachM: 2.2,
        radiusM: 1.0,
        damage: 34,
        knockbackMps: 4.5,
        moveFactor: 0.3,
        lungeMps: 1.2,
        sfx: 'greatsword-hit',
        effect: 'crystal-slash',
        next: 'gs-backswing',
        index: 0,
      },
      'gs-backswing': {
        label: 'Backswing',
        windupS: 0.4,
        activeS: 0.12,
        recoveryS: 0.42,
        reachM: 2.3,
        radiusM: 1.0,
        damage: 38,
        knockbackMps: 5.5,
        moveFactor: 0.3,
        lungeMps: 1.2,
        sfx: 'greatsword-hit',
        effect: 'crystal-slash',
        index: 1,
      },
      'gs-overhead': {
        label: 'Overhead chop',
        windupS: 0.62,
        activeS: 0.12,
        recoveryS: 0.55,
        reachM: 2.5,
        radiusM: 1.15,
        damage: 74,
        knockbackMps: 13,
        heavy: true,
        moveFactor: 0.15,
        lungeMps: 2.2,
        strength: 900,
        sfx: 'greatsword-hit',
        effect: 'crystal-smash',
        index: 2,
      },
    }),
  },
  // War Hammer: the slowest and heaviest. Two crushing swings, and a ground smash that cracks the floor round the head.
  warhammer: {
    label: 'Crystal War Hammer',
    taps: 2,
    starters: { tap: 'wh-swing', heavy: 'wh-groundsmash' },
    moves: build('warhammer', {
      'wh-swing': {
        label: 'Hammer swing',
        windupS: 0.6,
        activeS: 0.14,
        recoveryS: 0.5,
        reachM: 1.8,
        radiusM: 0.95,
        damage: 46,
        knockbackMps: 7,
        moveFactor: 0.2,
        lungeMps: 0.8,
        strength: 1000,
        sfx: 'hammer-smash',
        effect: 'crystal-smash',
        next: 'wh-return',
        index: 0,
      },
      'wh-return': {
        label: 'Return smash',
        windupS: 0.65,
        activeS: 0.14,
        recoveryS: 0.55,
        reachM: 1.8,
        radiusM: 1.0,
        damage: 52,
        knockbackMps: 8,
        moveFactor: 0.2,
        lungeMps: 0.8,
        strength: 1100,
        sfx: 'hammer-smash',
        effect: 'crystal-smash',
        index: 1,
      },
      'wh-groundsmash': {
        label: 'Ground smash',
        windupS: 0.9,
        activeS: 0.16,
        recoveryS: 0.7,
        reachM: 1.6,
        radiusM: 1.9,
        damage: 96,
        knockbackMps: 15,
        heavy: true,
        moveFactor: 0.1,
        strength: 1800,
        trauma: 0.7,
        sfx: 'hammer-smash',
        effect: 'crystal-quake',
        index: 2,
      },
    }),
  },
  // Lance: long and precise. Three forward thrusts (straight, low, high) and a lunging heavy thrust.
  lance: {
    label: 'Crystal Lance',
    taps: 3,
    starters: { tap: 'lc-thrust', heavy: 'lc-lunge' },
    moves: build('lance', {
      'lc-thrust': {
        label: 'Thrust',
        windupS: 0.16,
        activeS: 0.08,
        recoveryS: 0.24,
        reachM: 3.0,
        radiusM: 0.42,
        damage: 24,
        knockbackMps: 3,
        moveFactor: 0.45,
        lungeMps: 1.8,
        sfx: 'lance-pierce',
        effect: 'crystal-pierce',
        next: 'lc-low',
        index: 0,
      },
      'lc-low': {
        label: 'Low thrust',
        windupS: 0.17,
        activeS: 0.08,
        recoveryS: 0.26,
        reachM: 3.0,
        radiusM: 0.42,
        damage: 26,
        knockbackMps: 3.4,
        moveFactor: 0.45,
        lungeMps: 1.8,
        sfx: 'lance-pierce',
        effect: 'crystal-pierce',
        next: 'lc-high',
        index: 1,
      },
      'lc-high': {
        label: 'High thrust',
        windupS: 0.2,
        activeS: 0.09,
        recoveryS: 0.34,
        reachM: 3.3,
        radiusM: 0.45,
        damage: 32,
        knockbackMps: 5,
        moveFactor: 0.4,
        lungeMps: 2.4,
        sfx: 'lance-pierce',
        effect: 'crystal-pierce',
        index: 2,
      },
      'lc-lunge': {
        label: 'Lunging pierce',
        windupS: 0.34,
        activeS: 0.1,
        recoveryS: 0.5,
        reachM: 4.2,
        radiusM: 0.5,
        damage: 58,
        knockbackMps: 9,
        heavy: true,
        moveFactor: 0.2,
        lungeMps: 4.5,
        strength: 900,
        sfx: 'lance-pierce',
        effect: 'crystal-pierce',
        index: 3,
      },
    }),
  },
  // Dual Blades: fast and fluid. Five quick slashes alternating hands, and a heavy multi-slash flurry.
  dualBlades: {
    label: 'Crystal Dual Blades',
    taps: 5,
    starters: { tap: 'db-slash-1', heavy: 'db-flurry' },
    moves: build('dualBlades', {
      'db-slash-1': {
        label: 'Right slash',
        windupS: 0.06,
        activeS: 0.05,
        recoveryS: 0.13,
        reachM: 1.35,
        radiusM: 0.7,
        damage: 9,
        knockbackMps: 1.2,
        moveFactor: 0.6,
        lungeMps: 1.0,
        sfx: 'blades-cut',
        effect: 'crystal-cut',
        next: 'db-slash-2',
        index: 0,
      },
      'db-slash-2': {
        label: 'Left slash',
        windupS: 0.06,
        activeS: 0.05,
        recoveryS: 0.13,
        reachM: 1.35,
        radiusM: 0.7,
        damage: 9,
        knockbackMps: 1.2,
        moveFactor: 0.6,
        lungeMps: 1.0,
        sfx: 'blades-cut',
        effect: 'crystal-cut',
        next: 'db-slash-3',
        index: 1,
      },
      'db-slash-3': {
        label: 'Crossing slash',
        windupS: 0.07,
        activeS: 0.05,
        recoveryS: 0.14,
        reachM: 1.4,
        radiusM: 0.75,
        damage: 10,
        knockbackMps: 1.5,
        moveFactor: 0.6,
        lungeMps: 1.0,
        sfx: 'blades-cut',
        effect: 'crystal-cut',
        next: 'db-slash-4',
        index: 2,
      },
      'db-slash-4': {
        label: 'Rising slash',
        windupS: 0.07,
        activeS: 0.05,
        recoveryS: 0.14,
        reachM: 1.4,
        radiusM: 0.75,
        damage: 10,
        knockbackMps: 1.5,
        moveFactor: 0.6,
        lungeMps: 1.0,
        sfx: 'blades-cut',
        effect: 'crystal-cut',
        next: 'db-slash-5',
        index: 3,
      },
      'db-slash-5': {
        label: 'Spinning cross',
        windupS: 0.1,
        activeS: 0.07,
        recoveryS: 0.22,
        reachM: 1.3,
        radiusM: 1.05,
        damage: 15,
        knockbackMps: 3.2,
        moveFactor: 0.5,
        lungeMps: 0.6,
        sfx: 'blades-cut',
        effect: 'crystal-cut',
        index: 4,
      },
      'db-flurry': {
        label: 'Crystal flurry',
        windupS: 0.14,
        activeS: 0.5,
        recoveryS: 0.3,
        reachM: 1.45,
        radiusM: 0.9,
        damage: 10,
        knockbackMps: 1.6,
        heavy: false,
        moveFactor: 0.45,
        lungeMps: 1.5,
        sfx: 'blades-flash',
        effect: 'crystal-cut',
        extraHits: [0.24, 0.34, 0.44, 0.54, 0.64],
        index: 5,
      },
    }),
  },
  // Crystal Guard: a shield held in front of the body (it blocks as long as it lasts). A shield jab, a shield bash that throws
  // them back, and a shield slam.
  guard: {
    label: 'Crystal Guard',
    taps: 2,
    starters: { tap: 'cg-jab', heavy: 'cg-slam' },
    moves: build('guard', {
      'cg-jab': {
        label: 'Shield jab',
        windupS: 0.14,
        activeS: 0.08,
        recoveryS: 0.22,
        reachM: 1.25,
        radiusM: 0.7,
        damage: 18,
        knockbackMps: 3,
        moveFactor: 0.5,
        lungeMps: 1.0,
        sfx: 'shield-hit',
        effect: 'crystal-hit',
        next: 'cg-bash',
        index: 0,
      },
      'cg-bash': {
        label: 'Shield bash',
        windupS: 0.2,
        activeS: 0.1,
        recoveryS: 0.3,
        reachM: 1.35,
        radiusM: 0.85,
        damage: 24,
        knockbackMps: 11,
        moveFactor: 0.4,
        lungeMps: 2.2,
        sfx: 'shield-bash',
        effect: 'crystal-bash',
        impact: 'knuckle-heavy',
        index: 1,
      },
      'cg-slam': {
        label: 'Shield slam',
        windupS: 0.34,
        activeS: 0.1,
        recoveryS: 0.45,
        reachM: 1.4,
        radiusM: 1.0,
        damage: 42,
        knockbackMps: 9,
        heavy: true,
        moveFactor: 0.25,
        lungeMps: 1.6,
        sfx: 'shield-bash',
        effect: 'crystal-bash',
        index: 2,
      },
    }),
  },
};
