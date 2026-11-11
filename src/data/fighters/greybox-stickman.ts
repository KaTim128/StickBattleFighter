/**
 * GREYBOX test fighter for Phase 2 movement. Not one of the roster fighters
 * (Inferno, Shadowfang, Ronin, Titan, Phantom arrive in Phases 8–9 with their
 * own stances, gaits and attacks, REQ-ANI-7). Values are placeholders pending
 * the stat baselines (OQ-05).
 */
import type { CombatStats } from '../../combat/combatant';
import type { ComboSet } from '../../combat/combo';

export const GREYBOX_STICKMAN = {
  id: 'greybox-stickman',
  /** No weapon: fights in the unarmed boxer stance (owner, 11/11/2026). */
  weapon: null,
  movement: {
    maxSpeedMps: 5,
    accelMps2: 32,
    decelMps2: 40,
    jumpSpeedMps: 6.5,
    hopGravityMps2: 20,
  },
  /** Combat stats (PROVISIONAL baselines pending OQ-05, TD-030). */
  stats: {
    maxHp: 1000,
    maxStamina: 100,
    staminaRegenPerS: 30,
    staminaRegenDelayS: 0.7,
    power: 1,
    defence: 1,
    critChance: 0.05,
    critMultiplier: 1.5,
    knockbackResistance: 0,
  } satisfies CombatStats,
  /**
   * Button 1 attacks (owner request, 11/11/2026): ground 1-2-3 combo
   * (jab → hook → heavy finisher) and an aerial flying kick. Stamina-free (REQ-CMB-4).
   * Strength vs the office door (breaks at 500): jab and hook cannot break it;
   * the heavy finisher and the flying kick can.
   */
  attacks: {
    jab: {
      id: 'jab',
      label: 'Left jab',
      blow: 'strike',
      windupS: 0.06,
      activeS: 0.07,
      recoveryS: 0.17,
      chainAtRecovery: 0.25,
      reachM: 0.72,
      hitRadiusM: 0.4,
      damage: 40,
      heavy: false,
      strength: 150,
      knockbackSpeedMps: 1.5,
      moveFactor: 0.45,
      lungeMps: 0,
      trauma: 0.12,
      zoomPunch: 0,
    },
    hook: {
      id: 'hook',
      label: 'Right hook',
      blow: 'strike',
      windupS: 0.08,
      activeS: 0.08,
      recoveryS: 0.19,
      chainAtRecovery: 0.25,
      reachM: 0.74,
      hitRadiusM: 0.45,
      damage: 60,
      heavy: false,
      strength: 230,
      knockbackSpeedMps: 2.5,
      moveFactor: 0.4,
      lungeMps: 0,
      trauma: 0.2,
      zoomPunch: 0.01,
    },
    heavy: {
      id: 'heavy',
      label: 'Heavy finisher',
      blow: 'strike',
      windupS: 0.17,
      activeS: 0.1,
      recoveryS: 0.34,
      chainAtRecovery: 1,
      reachM: 1,
      hitRadiusM: 0.5,
      damage: 140,
      heavy: true,
      strength: 720,
      knockbackSpeedMps: 11,
      moveFactor: 0.2,
      lungeMps: 0,
      trauma: 0.6,
      zoomPunch: 0.06,
    },
    flyingKick: {
      id: 'flyingKick',
      label: 'Flying kick',
      blow: 'kick',
      windupS: 0.07,
      activeS: 0.2,
      recoveryS: 0.22,
      chainAtRecovery: 1,
      reachM: 0.9,
      hitRadiusM: 0.55,
      damage: 120,
      heavy: true,
      strength: 820,
      knockbackSpeedMps: 10,
      moveFactor: 1,
      lungeMps: 3.5,
      trauma: 0.55,
      zoomPunch: 0.05,
    },
  } satisfies ComboSet,
  body: {
    /** Collision footprint on the floor (a circle around the feet). */
    footRadiusM: 0.32,
    massKg: 70,
  },
  /** Bone lengths in metres for the jointed rig (REQ-ANI-6). */
  bones: {
    spine: 0.5,
    neck: 0.08,
    headRadius: 0.16,
    upperArm: 0.28,
    foreArm: 0.26,
    thigh: 0.4,
    shin: 0.4,
  },
  look: {
    limb: 0xff7a2e,
    limbBack: 0xc4581f,
    outline: 0x1b1b1f,
    limbWidthM: 0.075,
    outlineWidthM: 0.035,
  },
} as const;
