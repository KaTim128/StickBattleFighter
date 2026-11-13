import type { AbilityKit } from '../../abilities/ability-def';

/**
 * Rampage's kit (owner, 12/11/2026): a heavily muscled brute built on strength and durability.
 * Earth and dust for his blows, blood-red for his rage, never fire (Magic Attack VFX Standard:
 * each fighter in his own colours). His fourth requested ability, Heavy Throw, is his grab and
 * throw (G) with a far heavier lift and harder throws (Stats Profile `objects`), so the kit keeps
 * three abilities and an ultimate (owner's choice). All numbers PROVISIONAL (OQ-05).
 */
const DUST = { deep: 0x4a3a2a, hot: 0x7d6448, bright: 0xb89a74, core: 0xeadcc2 } as const;
const RAGE = { deep: 0x5a0a0a, hot: 0xb3201a, bright: 0xff5a3a, core: 0xffd2c0 } as const;

export const RAMPAGE_KIT: AbilityKit = {
  comboIcon: 'heavy-fist',
  heavyIcon: 'sledgehammer',
  // A1: Ground Smash. Both fists come down on the floor: a shockwave that knocks everyone nearby away.
  a1: {
    id: 'groundSmash',
    name: 'Ground Smash',
    label: 'SMASH',
    description: 'Hammers both fists into the floor: a shockwave that hurts and knocks back everyone around him.',
    icon: 'ground-smash',
    slot: 'a1',
    staminaCost: 25,
    cooldownS: 5,
    castS: 0.35,
    recoveryS: 0.55,
    aimRangeM: 0,
    moveFactor: 0,
    interruptible: true,
    payload: { damage: 120, knockbackMps: 8, heavy: true, strength: 900, impact: 'knuckle-heavy' },
    delivery: { type: 'nova', radiusM: 2.6, telegraphS: 0.12 },
    vfx: 'ground-smash',
    sfx: { cast: 'rampage-grunt', release: 'ground-crack', impact: 'ground-smash' },
    look: {
      palette: DUST,
      charge: { gatherRadiusM: 0.9, motesPerS: 40, coreMaxM: 0 },
      impact: {
        flashM: 1.2,
        sparks: 50,
        motes: 70,
        ringM: 2.6,
        scorchM: 1.6,
        smoke: 22,
        groundFire: false,
        smokeColour: 0x8a7a66,
      },
      hitFlash: 0xffffff,
    },
  },
  // A2: Rampage Charge (owner, 12/11/2026: "extremely powerful, heavy and aggressive", on two legs).
  // Half a second leaning in, shoulders down and arms pulled back, building momentum; then a long,
  // fast, locked-direction charge (it cannot turn) that smashes through breakable walls, doors and
  // furniture and stops dead in the first fighter it hits or in a wall, in a collision burst.
  a2: {
    id: 'rampageCharge',
    name: 'Rampage Charge',
    label: 'CHARGE',
    description:
      'Leans in, then charges in a straight line until a wall stops him, smashing through furniture and breakable walls on the way and stopping dead in the first enemy he hits.',
    icon: 'rampage-charge',
    slot: 'a2',
    staminaCost: 35,
    cooldownS: 7,
    castS: 0.5, // owner 12/11/2026: 0.5 s quicker (was 1 s)
    recoveryS: 1.05,
    aimRangeM: 11,
    moveFactor: 0,
    interruptible: true,
    payload: {
      damage: 150,
      knockbackMps: 11,
      heavy: true,
      strength: 2500,
      impact: 'knuckle-heavy',
      wallDamage: 3000,
    },
    // Owner, 12/11/2026: he runs on in a straight line until he hits a wall (or an enemy); 40 m is
    // only a safety limit, longer than any arena.
    delivery: {
      type: 'dash',
      distanceM: 40,
      speedMps: 15,
      hitRadiusM: 0.85,
      collision: { radiusM: 2.2 },
      untilBlocked: true,
    },
    vfx: 'rampage-charge',
    sfx: { cast: 'charge-stomp', release: 'charge-rush', impact: 'charge-impact' },
    look: {
      palette: DUST,
      charge: { gatherRadiusM: 1.1, motesPerS: 90, coreMaxM: 0 },
      flight: { trailPerS: 160, sparksPerS: 24, shimmer: false },
      impact: { flashM: 1.6, sparks: 55, motes: 70, ringM: 2.6, smoke: 26, groundFire: false, smokeColour: 0x8a7a66 },
      hitFlash: 0xffffff,
    },
  },
  // A3: Crushing Strike. A huge overhead punch: massive damage, and the target is stunned for a moment.
  a3: {
    id: 'crushingStrike',
    name: 'Crushing Strike',
    label: 'CRUSH',
    description: 'A huge overhead blow that deals massive damage and stuns the target for a moment.',
    icon: 'crushing-strike',
    slot: 'a3',
    staminaCost: 30,
    cooldownS: 6,
    castS: 0.45,
    recoveryS: 0.45,
    aimRangeM: 2.5,
    moveFactor: 0.2,
    interruptible: true,
    payload: { damage: 190, knockbackMps: 3, heavy: false, strength: 1200, impact: 'knuckle-heavy', stunS: 1.1 },
    delivery: { type: 'strike', reachM: 1.1, radiusM: 0.55 },
    vfx: 'crushing-strike',
    sfx: { cast: 'rampage-grunt', release: 'heavy-whoosh', impact: 'crushing-impact' },
    look: {
      palette: DUST,
      impact: {
        flashM: 0.9,
        sparks: 30,
        motes: 24,
        ringM: 1.2,
        scorchM: 0.55,
        smoke: 8,
        groundFire: false,
        smokeColour: 0x8a7a66,
      },
      hitFlash: 0xffffff,
    },
  },
  // A4 (R): Grapple Slam (owner, 12/11/2026). He lunges a hand out (0.3 s), seizes the enemy in
  // front, hoists them overhead (0.5 s) and drives them into the floor: heavy damage, a knockdown and
  // a dust blast that shakes the furniture round the impact, the camera and the target's footing
  // (owner, 13/11/2026: a hard slam with screen shake and knockback). Nobody in reach: his hands snap
  // shut on air and he stumbles forward off balance: no slam, no damage.
  a4: {
    id: 'grappleSlam',
    name: 'Grapple Slam',
    label: 'SLAM',
    description:
      'Seizes the enemy in front, hoists them overhead and slams them into the floor for heavy damage and a knockdown.',
    icon: 'grapple-slam',
    slot: 'a4',
    staminaCost: 35,
    cooldownS: 8,
    castS: 0.3,
    recoveryS: 1.05,
    aimRangeM: 2.5,
    moveFactor: 0.3,
    interruptible: true,
    payload: { damage: 150, knockbackMps: 6, heavy: true, strength: 900, impact: 'knuckle-heavy' },
    delivery: { type: 'grab', reachM: 1.2, radiusM: 0.5, liftS: 0.5, liftM: 1.1, slamRadiusM: 1.4 },
    vfx: 'grapple-slam',
    sfx: { cast: 'rampage-grunt', release: 'heavy-whoosh', impact: 'crushing-impact' },
    look: {
      palette: DUST,
      impact: {
        flashM: 1,
        sparks: 26,
        motes: 30,
        ringM: 1.4,
        scorchM: 0.6,
        smoke: 12,
        groundFire: false,
        smokeColour: 0x8a7a66,
        shake: 0.75,
      },
      hitFlash: 0xffffff,
    },
  },
  // ULT: Rampage Mode. A bellowing roar, then 8 s faster (+15%) and tougher (15% less damage taken),
  // wrapped in a red rage aura with steam pouring off him.
  ult: {
    id: 'rampageMode',
    name: 'Rampage Mode',
    label: 'ULT',
    description:
      'Flies into a rage for 8 seconds: faster, taking less damage, and his other abilities come back 25% sooner.',
    icon: 'rampage-mode',
    slot: 'ult',
    staminaCost: 0,
    cooldownS: 1,
    castS: 0.7,
    recoveryS: 0.35,
    aimRangeM: 0,
    moveFactor: 0,
    interruptible: false,
    payload: { damage: 0, knockbackMps: 0, heavy: false, strength: 0 },
    // Owner, 13/11/2026: his other abilities' cooldowns are also 25% shorter while it lasts.
    delivery: { type: 'buff', durationS: 8, speedFactor: 1.15, damageTakenFactor: 0.85, cooldownFactor: 0.75 },
    vfx: 'rampage-mode',
    sfx: { cast: 'rampage-roar', release: 'rage-burst', impact: 'rage-burst' },
    look: {
      palette: RAGE,
      charge: { gatherRadiusM: 1.4, motesPerS: 120, coreMaxM: 0 },
      impact: { flashM: 1.6, sparks: 40, motes: 60, ringM: 2.4, smoke: 16, groundFire: false, smokeColour: 0xd8d0c8 },
    },
  },
  charge: { max: 100, perDamageDealt: 0.25, perDamageTaken: 0.2, perSecond: 1 },
};
