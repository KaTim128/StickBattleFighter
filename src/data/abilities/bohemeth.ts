import type { AbilityKit } from '../../abilities/ability-def';
import { chargeFor } from '../../abilities/ultimate-charge';

/**
 * Bohemeth's kit (owner, 25/11/2026; reworked 26/11/2026): a four-armed, chain-wrapped heavyweight. His extra arms create mechanics
 * rather than multiplying damage: Spin Cycle (swing a held object, or a seized opponent, round and let go), an Uppercut Combo
 * (upper hands seize, one hand uppercuts, the other punches them back down), a huge Thunder Clap that stops charges, a long Ground
 * Smash leap, and a chain that drags opponents in for a punch. The ultimate sets all four fists alight: 20% faster attacks, heavier
 * knockback, 5% more size, stronger than Titan with heavy objects, and a Ground Smash that crosses almost the whole arena.
 * Values are PROVISIONAL (OQ-05).
 */
const IRON = { deep: 0x3a2018, hot: 0x8a4a30, bright: 0xc8855a, core: 0xf2dcc4 } as const;
const FIRE = { deep: 0x5a1004, hot: 0xe8540f, bright: 0xffa233, core: 0xfff0b0 } as const;
const dust = (ringM: number, shake: number) => ({
  flashM: ringM * 0.45,
  sparks: 24,
  motes: 44,
  ringM,
  smoke: 18,
  groundFire: false,
  smokeColour: 0x8a6a52,
  shake,
});

export const BOHEMETH_KIT: AbilityKit = {
  comboIcon: 'four-fists',
  heavyIcon: 'double-fist',
  // A1 (Q): Spin Cycle. Holding an object he swings it round and hurls it level; empty-handed he clap-dazes an opponent, takes a leg
  // and swings them round, then lets go.
  a1: {
    id: 'spinCycle',
    name: 'Spin Cycle',
    label: 'SPIN',
    description:
      'Holding an object, he spins round with it at arm\'s length and hurls it level across the arena. With empty hands he claps an opponent\'s head between his upper hands, dazing them and dealing slight damage, then takes a leg in his lower hands and swings them round in circles: lighter fighters are spun more times than heavy ones. He lets go along his aim, and the further they fly the more it hurts; hitting furniture or a wall hurts more.',
    icon: 'spin-cycle',
    slot: 'a1',
    staminaCost: 30,
    cooldownS: 12,
    castS: 0.35,
    recoveryS: 0.8,
    aimRangeM: 2.2,
    moveFactor: 0,
    interruptible: true,
    payload: { damage: 20, knockbackMps: 3, heavy: true, strength: 1500, impact: 'knuckle-heavy' },
    delivery: {
      type: 'spin',
      reachM: 1.4,
      radiusM: 0.6,
      clap: { damage: 12, dazeS: 0.7 },
      grabS: 0.3,
      turnS: 0.42,
      turns: { refKg: 80, base: 3, min: 2, max: 5 },
      orbitM: 1.7,
      liftM: 0.9,
      launch: { speedMps: 15, maxDistM: 7, baseDamage: 25, damagePerM: 7, collisionDamage: 35 },
      object: { turns: 2, speedMps: 20, powerFactor: 1.2, heightM: 0.9 },
    },
    vfx: 'spin-cycle',
    sfx: { cast: 'bohemeth-grunt', release: 'bohemeth-rush', impact: 'bohemeth-ram' },
    look: {
      palette: IRON,
      charge: { gatherRadiusM: 1.0, motesPerS: 60, coreMaxM: 0 },
      impact: dust(2.2, 0.6),
      hitFlash: 0xffd0a0,
    },
  },
  // A2 (E): Uppercut Combo. The upper hands seize the opponent; one hand uppercuts them up, the other punches them back down.
  a2: {
    id: 'uppercutCombo',
    name: 'Uppercut Combo',
    label: 'UPPERCUT',
    description:
      'Seizes the opponent with both upper hands and holds them, then uppercuts them into the air with one fist and, as they rise, punches them straight back down with the other. The launch depends on weight: light fighters fly high, medium ones moderately, heavy ones barely leave the ground, and the very heaviest mostly just take the damage. If nobody is in reach he closes his hands on air.',
    icon: 'four-arm-uppercut',
    slot: 'a2',
    staminaCost: 32,
    cooldownS: 13,
    castS: 0.3,
    recoveryS: 1.15,
    aimRangeM: 2.5,
    moveFactor: 0.2,
    interruptible: true,
    payload: {
      damage: 50,
      knockbackMps: 6,
      knockbackByWeight: { refKg: 80, minK: 0.3, maxK: 1.4 },
      heavy: true,
      strength: 1400,
      impact: 'knuckle-heavy',
    },
    delivery: {
      type: 'grab',
      reachM: 1.3,
      radiusM: 0.55,
      liftS: 0.7,
      liftM: 0,
      slamRadiusM: 1.4,
      uppercut: {
        holdS: 0.55,
        liftS: 0.7,
        liftM: 2.6,
        refKg: 80,
        minK: 0.25,
        maxK: 1.4,
        fallDamage: 24,
        followUp: {
          atS: 0.3,
          payload: { damage: 40, knockbackMps: 5, heavy: true, strength: 1300, impact: 'knuckle-heavy' },
        },
      },
    },
    vfx: 'four-arm-uppercut',
    sfx: { cast: 'bohemeth-grunt', release: 'uppercut-grab', impact: 'uppercut-launch' },
    look: { palette: IRON, impact: dust(1.8, 0.7), hitFlash: 0xffd0a0 },
  },
  // A3 (F): Thunder Clap. All four hands slam together: a shockwave that hurts, pushes, interrupts and stops charges.
  a3: {
    id: 'thunderClap',
    name: 'Thunder Clap',
    label: 'CLAP',
    description:
      'Raises all four arms and claps all four hands together: a huge thundering shockwave, wider than any ultimate, hurts and throws back everyone within 7.5 metres and breaks their attacks. It also stops any charge coming at him from up to 8 metres away, leaving the charger staggered.',
    icon: 'thunder-clap',
    slot: 'a3',
    staminaCost: 30,
    cooldownS: 16,
    castS: 0.4,
    recoveryS: 0.8,
    aimRangeM: 0,
    moveFactor: 0,
    interruptible: true,
    payload: {
      damage: 55,
      knockbackMps: 12,
      heavy: false,
      strength: 800,
      impact: 'knuckle-heavy',
      falloff: { fullWithinM: 1.5, minFactor: 0.5 },
    },
    delivery: { type: 'nova', radiusM: 7.5, telegraphS: 0.18, interruptsCharges: { rangeM: 8, staggerS: 0.9 } },
    vfx: 'thunder-clap',
    sfx: { cast: 'bohemeth-grunt', release: 'thunder-clap', impact: 'thunder-boom' },
    look: { palette: IRON, impact: { ...dust(7.5, 1.1), flashM: 3.4, sparks: 48, motes: 90 }, hitFlash: 0xffffff },
  },
  // A4 (R): Ground Smash. A long jump, all four fists raised, then down together; a crouch in the dust. In the ultimate it crosses almost the whole arena.
  a4: {
    id: 'bohemethGroundSmash',
    name: 'Ground Smash',
    label: 'SMASH',
    description:
      'Crouches, jumps up to 9 metres with all four arms raised and brings all four fists down onto the floor together. The landing sends out a ground shockwave that hurts and throws back everyone within 2.6 metres, more the closer they are, and he stays crouched with his hands on the ground for a moment afterwards. While his ultimate burns he leaps up to 26 metres, almost across the whole arena, and lands 15% harder, in a burst of fire.',
    icon: 'four-arm-smash',
    slot: 'a4',
    staminaCost: 34,
    cooldownS: 15,
    castS: 0.4,
    recoveryS: 1.0,
    aimRangeM: 3,
    moveFactor: 0.1,
    interruptible: true,
    payload: {
      damage: 80,
      knockbackMps: 9,
      heavy: true,
      strength: 1500,
      impact: 'knuckle-heavy',
      falloff: { fullWithinM: 1, minFactor: 0.45 },
    },
    delivery: {
      type: 'leap',
      maxRangeM: 9,
      airS: 0.95,
      peakM: 2.8,
      radiusM: 2.6,
      aimSpeedMps: 6,
      empowered: {
        maxRangeM: 26,
        airS: 1.4,
        peakM: 4.2,
        damageFactor: 1.15,
        vfx: 'ultimate-smash',
        look: {
          palette: FIRE,
          impact: { ...dust(3.4, 1.4), scorchM: 1.4, groundFire: true, flashM: 2, sparks: 40 },
          hitFlash: 0xffb060,
        },
      },
    },
    vfx: 'four-arm-smash',
    sfx: { cast: 'bohemeth-grunt', release: 'bohemeth-leap', impact: 'bohemeth-quake' },
    look: { palette: IRON, impact: { ...dust(2.6, 0.9), scorchM: 0.8 }, hitFlash: 0xffffff },
  },
  // A5 (fifth): Chain Grab. He frees a length of chain, throws it, drags the opponent in and punches them to the floor.
  a5: {
    id: 'chainGrab',
    name: 'Chain Grab',
    label: 'CHAIN',
    description:
      'Unwinds a length of the chain from his body and throws it at the opponent. If it catches, it wraps round them and he hauls them in, heavier fighters more slowly. They arrive stunned, and he punches them to the floor. A miss rattles back to him.',
    icon: 'chain-grab',
    slot: 'a3',
    staminaCost: 30,
    cooldownS: 17,
    castS: 0.4,
    recoveryS: 0.7,
    aimRangeM: 8.5,
    moveFactor: 0.2,
    interruptible: true,
    payload: {
      damage: 14,
      knockbackMps: 0,
      heavy: false,
      strength: 300,
      impact: 'knuckle-light',
      stunS: 1.4,
      pull: {
        speedMps: 12,
        stopM: 0.9,
        refKg: 100,
        followUp: { damage: 50, knockbackMps: 5, heavy: true, strength: 1200, impact: 'knuckle-heavy' },
      },
    },
    delivery: { type: 'projectile', speedMps: 18, radiusM: 0.35, maxRangeM: 8.5 },
    vfx: 'chain-grab',
    sfx: { cast: 'chain-unwind', release: 'chain-throw', impact: 'chain-snap' },
    look: {
      palette: IRON,
      flight: { trailPerS: 40, sparksPerS: 10, shimmer: false },
      impact: dust(1.2, 0.3),
      hitFlash: 0xffd0a0,
    },
  },
  // ULT (I): Fiery Fists. All four fists catch fire; his attacks are 20% faster until it burns out.
  ult: {
    id: 'fieryFists',
    name: 'Fiery Fists',
    label: 'ULT',
    description:
      'Raises all four arms, clenches his fists and sets all four ablaze. For 12 seconds he grows 5% bigger, every punch is 20% faster and all his blows knock back harder, with flames trailing from the fists and flaring where they land. He lifts and hurls heavy objects better than anyone, and Ground Smash carries him almost across the arena.',
    icon: 'fiery-fists',
    slot: 'ult',
    staminaCost: 0,
    cooldownS: 1,
    castS: 0.9,
    recoveryS: 0.4,
    aimRangeM: 0,
    moveFactor: 0.2,
    interruptible: false,
    payload: { damage: 0, knockbackMps: 0, heavy: false, strength: 0 },
    delivery: {
      type: 'buff',
      durationS: 12,
      speedFactor: 1,
      damageTakenFactor: 1,
      attackSpeedFactor: 1.2,
      fireFists: true,
      sizeFactor: 1.05,
      knockbackFactor: 1.5,
      empowersLeap: true,
      // Stronger than Titan (60 kg, 1.8 power) with heavy things: a heavier lift limit, a quicker heave, an easier carry, a harder throw.
      objects: { maxLiftKg: 80, liftTimeFactor: 0.6, carrySpeedBonus: 0.15, throwPowerFactor: 1.25 },
    },
    vfx: 'fiery-fists',
    sfx: { cast: 'bohemeth-grunt', release: 'fire-ignite', impact: 'fire-fists-hit' },
    look: {
      palette: FIRE,
      charge: { gatherRadiusM: 1.4, motesPerS: 120, coreMaxM: 0.2 },
      impact: dust(2.4, 0.4),
      hitFlash: 0xffb060,
    },
  },
  charge: chargeFor('fieryFists'),
};
