import type { AbilityDef, AbilityKit } from '../../abilities/ability-def';
import { chargeFor } from '../../abilities/ultimate-charge';

/**
 * Abilities of Inkmaster's summons: the bow clone's arrow, and the ink monster's ground slam and ink breath. Summons use the shared
 * ability framework like any fighter; their kits fill the slots they do not use with a dormant ability that never becomes ready.
 * Values are PROVISIONAL (OQ-05).
 */
const INK = { deep: 0x050505, hot: 0x24242b, bright: 0x6d6d78, core: 0xf2eee3 } as const;
const impact = (ringM: number, shake = 0) => ({
  flashM: ringM * 0.5,
  sparks: 6,
  motes: 26,
  ringM,
  smoke: 6,
  groundFire: false,
  smokeColour: 0x15151a,
  ...(shake ? { shake } : {}),
});

/** A slot a summon does not use: it can never be cast (its cooldown outlasts any fight). */
const dormant = (slot: AbilityDef['slot']): AbilityDef => ({
  id: `dormant-${slot}`,
  name: 'Dormant',
  label: '-',
  description: 'Not used by this summon.',
  slot,
  staminaCost: 0,
  cooldownS: 9999,
  castS: 0.1,
  recoveryS: 0.1,
  aimRangeM: 0,
  moveFactor: 1,
  interruptible: true,
  payload: { damage: 0, knockbackMps: 0, heavy: false, strength: 0 },
  delivery: { type: 'projectile', speedMps: 1, radiusM: 0.1, maxRangeM: 0.1 },
  vfx: 'none',
  sfx: { cast: 'none', release: 'none', impact: 'none' },
});

/** The bow clone: one physical ink arrow at a time, every 2.4 s. */
export const INK_CLONE_BOW_KIT: AbilityKit = {
  a1: {
    id: 'inkArrow',
    name: 'Ink Arrow',
    label: 'ARROW',
    description: 'Draws the bow and looses a physical arrow of black ink at an opponent.',
    slot: 'a1',
    staminaCost: 0,
    cooldownS: 2.4,
    castS: 0.55,
    recoveryS: 0.3,
    aimRangeM: 11,
    moveFactor: 0.3,
    interruptible: true,
    payload: { damage: 20, knockbackMps: 1.5, heavy: false, strength: 150, impact: 'knuckle-light', noFlinch: true },
    delivery: { type: 'projectile', speedMps: 17, radiusM: 0.18, maxRangeM: 11 },
    vfx: 'ink-arrow',
    sfx: { cast: 'bow-draw', release: 'bow-shot', impact: 'ink-arrow-hit' },
    look: {
      palette: INK,
      flight: { trailPerS: 60, sparksPerS: 0, shimmer: false },
      impact: impact(0.7),
      hitFlash: 0x2a2a30,
    },
  },
  a2: dormant('a2'),
  a3: dormant('a3'),
  a4: dormant('a4'),
  ult: dormant('ult'),
  charge: chargeFor('masterpiece'),
};

/**
 * The ink monster: Ground Slam and Ink Breath (its claw and bite are its basic and heavy attacks). Each has a clear wind-up, its own
 * cooldown and no knockdown, so it can be dodged, blocked or outrun, and neither can chain into itself.
 */
export const INK_MONSTER_KIT: AbilityKit = {
  a1: {
    id: 'monsterSlam',
    name: 'Ground Slam',
    label: 'SLAM',
    description:
      'Rears up, then brings both fists down in a circle of ink that damages and pushes back everyone close.',
    slot: 'a1',
    staminaCost: 0,
    cooldownS: 7,
    castS: 0.5,
    recoveryS: 0.7,
    aimRangeM: 3,
    moveFactor: 0,
    interruptible: false,
    payload: {
      damage: 48,
      knockbackMps: 5,
      heavy: false,
      strength: 700,
      impact: 'knuckle-heavy',
      falloff: { fullWithinM: 1.2, minFactor: 0.6 },
    },
    delivery: { type: 'nova', radiusM: 3.2, telegraphS: 0.85 },
    vfx: 'ink-monster-slam',
    sfx: { cast: 'monster-roar', release: 'monster-slam', impact: 'monster-slam' },
    look: { palette: INK, impact: impact(3.4, 0.5), hitFlash: 0x2a2a30 },
  },
  a2: {
    id: 'monsterBreath',
    name: 'Ink Breath',
    label: 'BREATH',
    description: 'Rears its head, then breathes a short, narrow stream of black ink for a second and a half.',
    slot: 'a2',
    staminaCost: 0,
    cooldownS: 11,
    castS: 0.9,
    recoveryS: 0.6,
    aimRangeM: 6,
    moveFactor: 0,
    interruptible: false,
    payload: { damage: 13, knockbackMps: 0.5, heavy: false, strength: 100, impact: 'knuckle-light', noFlinch: true },
    delivery: { type: 'beam', rangeM: 6, widthM: 1.5, durationS: 1.5, tickS: 0.4 },
    vfx: 'ink-monster-breath',
    sfx: { cast: 'monster-roar', release: 'monster-breath', impact: 'monster-breath-hit' },
    look: { palette: INK, shout: 'scream', impact: impact(1), hitFlash: 0x2a2a30 },
  },
  a3: dormant('a3'),
  a4: dormant('a4'),
  ult: dormant('ult'),
  charge: chargeFor('masterpiece'),
};
