import type { AbilityKit } from '../../abilities/ability-def';

/**
 * Inferno's kit (owner chose Inferno as the first full kit, 11/11/2026).
 * Original fire abilities; delivery categories (projectile, dash, ring, leap)
 * follow the Creature Clash catalogue only as a design reference (REQ-ABL-5).
 * All numbers are PROVISIONAL pending OQ-05 (TD-032).
 */
export const INFERNO_KIT: AbilityKit = {
  // A1: a fast fireball from both palms; sets the target (and furniture) alight.
  a1: {
    id: 'fireBolt',
    name: 'Fire Bolt',
    label: 'BOLT',
    slot: 'a1',
    staminaCost: 20,
    cooldownS: 2.5,
    castS: 0.18,
    recoveryS: 0.22,
    aimRangeM: 10,
    moveFactor: 0.3,
    interruptible: true,
    payload: {
      damage: 70,
      knockbackMps: 3,
      heavy: false,
      strength: 220,
      burn: { dps: 12, durationS: 2 },
      ignites: true,
    },
    delivery: { type: 'projectile', speedMps: 15, radiusM: 0.28, maxRangeM: 10 },
    vfx: 'fire-bolt',
    sfx: { cast: 'fire-charge', release: 'fireball-cast', impact: 'fireball-impact' },
  },
  // A2: a burst forward wrapped in flame, scorching the floor behind.
  a2: {
    id: 'flameDash',
    name: 'Flame Dash',
    label: 'DASH',
    slot: 'a2',
    staminaCost: 30,
    cooldownS: 5,
    castS: 0.08,
    recoveryS: 0.4,
    aimRangeM: 6,
    moveFactor: 0,
    interruptible: true,
    payload: {
      damage: 60,
      knockbackMps: 5,
      heavy: false,
      strength: 320,
      burn: { dps: 10, durationS: 1.5 },
      ignites: true,
    },
    delivery: {
      type: 'dash',
      distanceM: 4.5,
      speedMps: 15,
      hitRadiusM: 0.65,
      trail: { lifeS: 2.2, radiusM: 0.45, burn: { dps: 18, durationS: 1 } },
    },
    vfx: 'flame-dash',
    sfx: { cast: 'fire-charge', release: 'fire-rush', impact: 'fire-burst-small' },
  },
  // A3: slam both fists into the floor; a ring of fire erupts around Inferno after a warning.
  a3: {
    id: 'eruption',
    name: 'Eruption',
    label: 'ERUPT',
    slot: 'a3',
    staminaCost: 35,
    cooldownS: 7,
    castS: 0.16,
    recoveryS: 0.75,
    aimRangeM: 0,
    moveFactor: 0,
    interruptible: true,
    payload: {
      damage: 110,
      knockbackMps: 7,
      heavy: true,
      strength: 600,
      burn: { dps: 15, durationS: 2 },
      ignites: true,
    },
    delivery: { type: 'nova', radiusM: 2.3, telegraphS: 0.5 },
    vfx: 'eruption',
    sfx: { cast: 'ground-rumble', release: 'fire-warning', impact: 'fire-eruption' },
  },
  // ULT: leap high and crash down fist-first like a meteor; a big telegraphed blast.
  ult: {
    id: 'meteorFist',
    name: 'Meteor Fist',
    label: 'ULT',
    slot: 'ult',
    staminaCost: 0,
    cooldownS: 1,
    castS: 0.22,
    recoveryS: 1.15,
    aimRangeM: 8,
    moveFactor: 0,
    interruptible: false,
    payload: {
      damage: 260,
      knockbackMps: 9,
      heavy: true,
      strength: 900,
      burn: { dps: 20, durationS: 3 },
      ignites: true,
    },
    delivery: { type: 'leap', maxRangeM: 8, airS: 0.75, peakM: 2.2, radiusM: 3 },
    vfx: 'meteor-fist',
    sfx: { cast: 'fire-roar', release: 'leap-whoosh', impact: 'meteor-impact' },
  },
  // OQ-04 (owner): a charge meter. A full combo (240) fills about 60%; you also gain from being hit.
  charge: { max: 100, perDamageDealt: 0.25, perDamageTaken: 0.15, perSecond: 1 },
};
