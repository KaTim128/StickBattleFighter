import type { AbilityKit } from '../../abilities/ability-def';

/**
 * Inferno's kit (owner chose Inferno as the first full kit, 11/11/2026).
 * Original fire abilities; delivery categories (projectile, dash, ring, leap)
 * follow the Creature Clash catalogue only as a design reference (REQ-ABL-5).
 * All numbers are PROVISIONAL pending OQ-05 (TD-032).
 */
/** Inferno's element colours (Magic Attack VFX Standard). */
const FIRE_PALETTE = { deep: 0xd8320c, hot: 0xff6a00, bright: 0xffa53a, core: 0xfff1a8 } as const;

export const INFERNO_KIT: AbilityKit = {
  comboIcon: 'flaming-fist',
  heavyIcon: 'blazing-axe-kick',
  // A1: Fireball (owner, 11/11/2026: renamed from Fire Bolt and made the Magic Attack VFX
  // benchmark). Inferno pulls fire out of the air into his palm (0.4 s charge, interruptible),
  // hurls a white-hot ball (18 m/s, up to 10 m), and it bursts on contact, setting the target
  // and furniture alight. Damage, burn, stamina and cooldown are unchanged from Fire Bolt.
  a1: {
    id: 'fireball',
    name: 'Fireball',
    label: 'FIRE',
    description:
      'Draws fire into his palm and hurls a blazing ball that bursts on contact, burning the target and setting furniture alight.',
    icon: 'fireball',
    slot: 'a1',
    staminaCost: 20,
    cooldownS: 2.5,
    castS: 0.4,
    recoveryS: 0.25,
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
    delivery: { type: 'projectile', speedMps: 18, radiusM: 0.3, maxRangeM: 10 },
    vfx: 'fireball',
    sfx: { cast: 'fireball-charge', release: 'fireball-cast', impact: 'fireball-boom' },
    look: {
      palette: FIRE_PALETTE,
      charge: { gatherRadiusM: 1.3, motesPerS: 90, coreMaxM: 0.26 },
      flight: { trailPerS: 110, sparksPerS: 40, shimmer: true },
      impact: { flashM: 0.9, sparks: 34, motes: 30, ringM: 1.3, scorchM: 0.45, smoke: 10 },
      hitFlash: 0xffffff,
    },
  },
  // A2: a burst forward wrapped in flame, scorching the floor behind.
  a2: {
    id: 'flameDash',
    name: 'Flame Dash',
    label: 'DASH',
    description:
      'A short burst forward wrapped in flame; anyone in the way is hit and set alight, and the floor behind him burns for a moment.',
    icon: 'flame-dash',
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
  // A3: Fire Beam (owner, 11/11/2026, replacing the old ring-of-fire Eruption). Inferno gathers
  // flames around his body and hands for 1 s (owner, 12/11/2026: was 2 s; interruptible), then pours a concentrated beam of
  // fire straight at the target for 1.4 s: medium reach (6.5 m, stopped by walls), hitting every
  // 0.15 s with a push and a burn. Damage falls off with distance: 15 per tick within 1.5 m
  // (about 135 for the whole beam), easing to 45% (about 60) at the far end.
  a3: {
    id: 'fireBeam',
    name: 'Fire Beam',
    label: 'BEAM',
    description:
      'After a 1-second charge, a roaring beam of fire pours from his hands. It hits again and again, hurts more up close, burns, and hits harder the longer it stays on the same target.',
    icon: 'fire-beam',
    slot: 'a3',
    staminaCost: 35,
    cooldownS: 8,
    castS: 1,
    recoveryS: 1.75,
    aimRangeM: 7,
    moveFactor: 0,
    interruptible: true,
    payload: {
      damage: 15,
      knockbackMps: 1.6,
      heavy: false,
      strength: 160,
      burn: { dps: 10, durationS: 2 },
      ignites: true,
      falloff: { fullWithinM: 1.5, minFactor: 0.45 },
    },
    // Owner, 12/11/2026: holding the beam on someone builds the damage up: after 0.6 s of unbroken
    // contact each tick hits 40% harder, rising 60% a second more, capped at double.
    delivery: {
      type: 'beam',
      rangeM: 6.5,
      widthM: 0.6,
      durationS: 1.4,
      tickS: 0.15,
      turnRadPerS: 3.5,
      ramp: { afterS: 0.6, startFactor: 1.4, perS: 0.6, maxFactor: 2 },
    },
    vfx: 'fire-beam',
    sfx: { cast: 'beam-charge', release: 'beam-roar', impact: 'beam-sear' },
    look: {
      palette: FIRE_PALETTE,
      charge: { gatherRadiusM: 1.6, motesPerS: 120, coreMaxM: 0.22 },
      flight: { trailPerS: 160, sparksPerS: 60, shimmer: true },
      impact: { flashM: 0.5, sparks: 8, motes: 6, ringM: 0.6 },
      hitFlash: 0xffffff,
    },
  },
  // A4 (R): Flame Detonation (owner, 12/11/2026). He cups his hands and gathers a swelling ball of
  // fire between them (0.55 s, interruptible), then thrusts them out: a short-range explosion all
  // round him that hurls enemies backwards. Hardest up close.
  a4: {
    id: 'flameDetonation',
    name: 'Flame Detonation',
    label: 'BLAST',
    description:
      'Gathers fire between his hands, then releases it in a short-range explosion that sends nearby enemies flying backwards.',
    icon: 'flame-detonation',
    slot: 'a4',
    staminaCost: 30,
    cooldownS: 7,
    castS: 0.55,
    recoveryS: 0.35,
    aimRangeM: 3,
    moveFactor: 0,
    interruptible: true,
    payload: {
      damage: 85,
      knockbackMps: 15,
      heavy: true,
      strength: 900,
      burn: { dps: 10, durationS: 1.5 },
      ignites: true,
      falloff: { fullWithinM: 1, minFactor: 0.55 },
      impact: 'fire-heavy',
    },
    delivery: { type: 'nova', radiusM: 2.3, telegraphS: 0.05 },
    vfx: 'flame-detonation',
    sfx: { cast: 'fireball-charge', release: 'detonation-blast', impact: 'fireball-boom' },
    look: {
      palette: FIRE_PALETTE,
      charge: { gatherRadiusM: 1.1, motesPerS: 120, coreMaxM: 0.32 },
      impact: { flashM: 1.6, sparks: 46, motes: 40, ringM: 2.3, scorchM: 0.9, smoke: 14 },
      hitFlash: 0xffffff,
    },
  },
  // ULT: Eruption (owner, 11/11/2026, renamed from Meteor Fist and redesigned as a jumping ground
  // slam). Inferno squats and gathers flames (0.55 s), launches himself into the air wrapped in
  // fire, and crashes down: a fiery explosion with a clearly marked 3.2 m radius. Damage falls off
  // from the landing point: 300 within 1 m, easing to 45% (135) at the edge of the blast.
  ult: {
    id: 'eruption',
    name: 'Eruption',
    label: 'ULT',
    description: 'Leaps to the chosen spot and slams down in an eruption of fire, hardest at the centre.',
    icon: 'eruption',
    slot: 'ult',
    staminaCost: 0,
    cooldownS: 1,
    castS: 0.55,
    recoveryS: 1.2,
    aimRangeM: 8,
    moveFactor: 0,
    interruptible: false,
    payload: {
      damage: 300,
      knockbackMps: 10,
      heavy: true,
      strength: 900,
      burn: { dps: 20, durationS: 3 },
      ignites: true,
      falloff: { fullWithinM: 1, minFactor: 0.45 },
    },
    delivery: { type: 'leap', maxRangeM: 8, airS: 0.75, peakM: 2.4, radiusM: 3.2, aimSpeedMps: 7 },
    vfx: 'eruption-slam',
    sfx: { cast: 'fire-roar', release: 'leap-whoosh', impact: 'meteor-impact' },
    look: {
      palette: FIRE_PALETTE,
      charge: { gatherRadiusM: 1.8, motesPerS: 140, coreMaxM: 0 },
      flight: { trailPerS: 120, sparksPerS: 40, shimmer: false },
      impact: { flashM: 2.2, sparks: 70, motes: 90, ringM: 3.2, scorchM: 2.4, smoke: 24 },
      hitFlash: 0xffffff,
    },
  },
  // OQ-04 (owner): a charge meter. A full combo (240) fills about 60%; you also gain from being hit.
  charge: { max: 100, perDamageDealt: 0.25, perDamageTaken: 0.15, perSecond: 1 },
};
