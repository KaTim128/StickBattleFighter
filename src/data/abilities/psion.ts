import type { AbilityKit } from '../../abilities/ability-def';
import { chargeFor } from '../../abilities/ultimate-charge';

/**
 * Psion's kit (master plan section 4, fighter 6): a slim psychic warrior who never touches what he fights. His blows are
 * light; everything strong he does is done at range with force: crush, hurl, shield, hold, and one great storm. Every
 * ability is `psi`, so Mental Focus can sharpen the next one. Values are PROVISIONAL (OQ-05).
 */
const PSI = { deep: 0x2a1650, hot: 0x8a4fe0, bright: 0xc7a1ff, core: 0xf4eaff } as const;

export const PSION_KIT: AbilityKit = {
  comboIcon: 'psi-combo',
  heavyIcon: 'force-wave',
  passive: {
    id: 'focus',
    name: 'Mental Focus',
    description:
      'Every attack and ability that lands builds mental focus. At 6, his next ability is 30% stronger, and the focus is spent.',
    maxStacks: 6,
    durationS: 0,
    speedPerStack: 0,
    mastery: { threshold: 6, damageFactor: 1.3, windowS: 2.5 },
  },
  // A1 (Q): Mind Crush. An unseen force closes in round the target (the ring shows it shrinking), then releases in one psychic impact.
  a1: {
    id: 'mindCrush',
    name: 'Mind Crush',
    label: 'CRUSH',
    description:
      'Closes an invisible telekinetic force in round an opponent. The force compresses inward for under a second, then releases in a psychic impact that damages and pushes away everyone in it.',
    icon: 'mind-crush',
    slot: 'a1',
    staminaCost: 28,
    cooldownS: 9,
    castS: 0.25,
    recoveryS: 0.4,
    aimRangeM: 8,
    moveFactor: 0.2,
    interruptible: true,
    payload: {
      damage: 64,
      knockbackMps: 5,
      heavy: true,
      strength: 520,
      impact: 'knuckle-heavy',
      psi: true,
      falloff: { fullWithinM: 0.8, minFactor: 0.6 },
    },
    delivery: { type: 'nova', radiusM: 2, telegraphS: 0.8, atTarget: true },
    vfx: 'mind-crush',
    sfx: { cast: 'psi-gather', release: 'psi-compress', impact: 'psi-crush' },
    look: {
      palette: PSI,
      telegraph: 'compress',
      impact: {
        flashM: 1.2,
        sparks: 18,
        motes: 40,
        ringM: 2.2,
        smoke: 6,
        groundFire: false,
        smokeColour: 0x4a2a80,
        shake: 0.35,
      },
      hitFlash: 0xc7a1ff,
    },
  },
  // A2 (E): Telekinetic Throw. He lifts the nearest enemy in line where they stand and hurls them along his aim.
  a2: {
    id: 'telekineticThrow',
    name: 'Telekinetic Throw',
    label: 'THROW',
    description:
      'Lifts the nearest opponent ahead into the air with his mind, holds them for a moment, then hurls them in the direction he is aiming.',
    icon: 'telekinetic-throw',
    slot: 'a2',
    staminaCost: 30,
    cooldownS: 11,
    castS: 0.3,
    recoveryS: 0.4,
    aimRangeM: 6,
    moveFactor: 0,
    interruptible: true,
    payload: { damage: 56, knockbackMps: 14, heavy: true, strength: 600, impact: 'knuckle-heavy', psi: true },
    delivery: { type: 'grab', reachM: 6, radiusM: 0.8, liftS: 0.7, liftM: 1.5, slamRadiusM: 1.5, telekinetic: true },
    vfx: 'telekinetic-throw',
    sfx: { cast: 'psi-gather', release: 'psi-lift', impact: 'psi-hurl' },
    look: {
      palette: PSI,
      impact: { flashM: 0.9, sparks: 12, motes: 26, ringM: 1.6, smoke: 4, groundFire: false, smokeColour: 0x4a2a80 },
      hitFlash: 0xc7a1ff,
    },
  },
  // A3 (F): Psychic Barrier. A telekinetic shield round his body that soaks 70 damage over 6 seconds, ripples where it is struck, and
  // bursts into floating fragments when it breaks.
  a3: {
    id: 'psychicBarrier',
    name: 'Psychic Barrier',
    label: 'BARRIER',
    description:
      'Wraps himself in a telekinetic shield that absorbs up to 70 damage over 6 seconds. It ripples where it is struck and breaks into floating fragments.',
    icon: 'psychic-barrier',
    slot: 'a3',
    staminaCost: 25,
    cooldownS: 16,
    castS: 0.25,
    recoveryS: 0.3,
    aimRangeM: 0,
    moveFactor: 0.5,
    interruptible: true,
    payload: { damage: 0, knockbackMps: 0, heavy: false, strength: 0 },
    delivery: { type: 'barrier', hp: 70, durationS: 6 },
    vfx: 'psychic-barrier',
    sfx: { cast: 'psi-gather', release: 'barrier-up', impact: 'barrier-hit' },
    look: {
      palette: PSI,
      impact: { flashM: 0.6, sparks: 6, motes: 24, ringM: 1.3, smoke: 2, groundFire: false, smokeColour: 0x4a2a80 },
    },
  },
  // A4 (R): Floating Prison. The nearest enemy in reach is lifted a metre and a half and hangs helpless for a second in a cage of
  // turning rings, then drifts down. They cannot be lifted again for 4 seconds, so it never locks anyone down.
  a4: {
    id: 'floatingPrison',
    name: 'Floating Prison',
    label: 'PRISON',
    description:
      'Lifts the nearest opponent into the air with telekinetic force, holds them helpless for a second, then lets them drift down for a little damage. The same opponent cannot be lifted again for 4 seconds.',
    icon: 'floating-prison',
    slot: 'a4',
    staminaCost: 28,
    cooldownS: 14,
    castS: 0.4,
    recoveryS: 0.4,
    aimRangeM: 6,
    moveFactor: 0.1,
    interruptible: true,
    payload: { damage: 0, knockbackMps: 0, heavy: false, strength: 300, impact: 'knuckle-light', psi: true },
    delivery: { type: 'lift', reachM: 6, liftS: 1, liftM: 1.5, fallDamage: 20, immuneS: 4 },
    vfx: 'floating-prison',
    sfx: { cast: 'psi-gather', release: 'prison-lift', impact: 'psi-drop' },
    look: {
      palette: PSI,
      cage: true,
      impact: { flashM: 0.6, sparks: 8, motes: 18, ringM: 1.2, smoke: 3, groundFire: false, smokeColour: 0x4a2a80 },
      hitFlash: 0xc7a1ff,
    },
  },
  // A5 (fifth, B13): Repulse. A burst of force from his own body that shoves everyone within 3.4 metres away: little damage, a lot of
  // distance. The answer to being crowded; it takes the F slot when equipped.
  a5: {
    id: 'repulse',
    name: 'Repulse',
    label: 'REPULSE',
    description:
      'Releases a burst of force from his own body that throws every opponent within 3.4 metres back with little damage. Makes room when he is crowded.',
    icon: 'repulse',
    slot: 'a3',
    staminaCost: 24,
    cooldownS: 12,
    castS: 0.2,
    recoveryS: 0.3,
    aimRangeM: 0,
    moveFactor: 0.2,
    interruptible: true,
    payload: { damage: 22, knockbackMps: 12, heavy: true, strength: 500, impact: 'knuckle-heavy', psi: true },
    delivery: { type: 'nova', radiusM: 3.4, telegraphS: 0.25 },
    vfx: 'repulse',
    sfx: { cast: 'psi-gather', release: 'repulse-burst', impact: 'repulse-burst' },
    look: {
      palette: PSI,
      impact: {
        flashM: 1.4,
        sparks: 22,
        motes: 40,
        ringM: 3.4,
        smoke: 6,
        groundFire: false,
        smokeColour: 0x4a2a80,
        shake: 0.3,
      },
      hitFlash: 0xc7a1ff,
    },
  },
  // ULT (I): Mindstorm. He rises into stillness and a psychic field spreads 6 metres round him: objects lift from the floor,
  // orbit, and are flung at his enemies one after another, then the whole field detonates in a great telekinetic explosion.
  ult: {
    id: 'mindstorm',
    name: 'Mindstorm',
    label: 'ULT',
    description:
      'Generates a vast psychic field. Nearby objects float into the air and are launched one by one at his opponents, then the field detonates in a large telekinetic explosion.',
    icon: 'mindstorm',
    slot: 'ult',
    staminaCost: 0,
    cooldownS: 1,
    castS: 0.5,
    recoveryS: 2.2,
    aimRangeM: 0,
    moveFactor: 0,
    interruptible: false,
    payload: {
      damage: 70,
      knockbackMps: 12,
      heavy: true,
      strength: 900,
      impact: 'knuckle-heavy',
      psi: true,
      falloff: { fullWithinM: 1.5, minFactor: 0.5 },
    },
    delivery: {
      type: 'nova',
      radiusM: 6,
      telegraphS: 2.2,
      volley: {
        count: 8,
        payload: {
          damage: 14,
          knockbackMps: 2.5,
          heavy: false,
          strength: 220,
          noFlinch: true,
          impact: 'knuckle-light',
        },
        speedMps: 12,
        radiusM: 0.4,
        maxRangeM: 11,
      },
    },
    vfx: 'mindstorm',
    sfx: { cast: 'psi-gather', release: 'mindstorm-launch', impact: 'mindstorm-blast' },
    look: {
      palette: PSI,
      telegraph: 'debris',
      flight: { trailPerS: 20, sparksPerS: 4, shimmer: false, debris: true },
      impact: {
        flashM: 2.4,
        sparks: 36,
        motes: 90,
        ringM: 5.5,
        smoke: 20,
        groundFire: false,
        smokeColour: 0x4a2a80,
        shake: 0.6,
      },
      hitFlash: 0xf4eaff,
    },
  },
  charge: chargeFor('mindstorm'),
};
