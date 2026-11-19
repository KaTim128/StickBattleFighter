import type { AbilityKit } from '../../abilities/ability-def';
import { chargeFor } from '../../abilities/ultimate-charge';

/**
 * Chronos's kit (master plan section 4, fighter 11): a time-manipulation specialist. None of it heals, undoes damage,
 * grants invulnerability or touches cooldowns. Values are PROVISIONAL (OQ-05).
 */
const TIME = { deep: 0x0a3340, hot: 0x19b8d6, bright: 0x8defff, core: 0xf0fdff } as const;

/** A slow field: enemies inside move slower and nothing else (an unlimited sight and no damage over time). */
const SLOW = { sightM: Number.POSITIVE_INFINITY, speedFactor: 0.55, chipDps: 0, stackAfterS: 1e9 } as const;

export const CHRONOS_KIT: AbilityKit = {
  comboIcon: 'time-combo',
  heavyIcon: 'temporal-fist',
  passive: {
    id: 'temporal',
    name: 'Temporal Momentum',
    description:
      'Every attack and ability that lands builds temporal energy. At 5, his next damaging temporal ability is 25% stronger, and the energy is spent.',
    maxStacks: 5,
    durationS: 0,
    speedPerStack: 0,
    mastery: { threshold: 5, damageFactor: 1.25, windowS: 3 },
  },
  // A1 (Q): Temporal Acceleration. His own time runs faster for four seconds: quicker on his feet, quicker out of a dodge, trailed by
  // afterimages. Nothing else about him changes: he is as easy to hit and his cooldowns run as usual.
  a1: {
    id: 'temporalAcceleration',
    name: 'Temporal Acceleration',
    label: 'HASTE',
    description:
      'Activates his temporal device and speeds up his own time for 4 seconds: he moves 35% faster and recovers from dodges 40% sooner, trailed by afterimages. He does not become harder to hit and no cooldown is shortened.',
    icon: 'temporal-acceleration',
    slot: 'a1',
    staminaCost: 22,
    cooldownS: 16,
    castS: 0.3,
    recoveryS: 0.25,
    aimRangeM: 0,
    moveFactor: 0.5,
    interruptible: true,
    payload: { damage: 0, knockbackMps: 0, heavy: false, strength: 0 },
    delivery: {
      type: 'buff',
      durationS: 4,
      speedFactor: 1.35,
      damageTakenFactor: 1,
      dodgeRecoveryFactor: 0.6,
      afterimages: true,
    },
    vfx: 'temporal-acceleration',
    sfx: { cast: 'time-wind', release: 'haste-start', impact: 'haste-start' },
    look: {
      palette: TIME,
      aura: 'quiet',
      impact: { flashM: 0.8, sparks: 12, motes: 18, ringM: 1.4, smoke: 0, groundFire: false },
    },
  },
  // A2 (E): Echo Strike. A hard blow straight ahead, and a pale copy of it landing again from the same spot 0.6 s later.
  a2: {
    id: 'echoStrike',
    name: 'Echo Strike',
    label: 'ECHO',
    description:
      'Strikes straight ahead, and a delayed temporal copy of the blow lands again from the same spot 0.6 seconds later with 80% of the damage. The copy hits whoever is in reach then, whatever the first blow did.',
    icon: 'echo-strike',
    slot: 'a2',
    staminaCost: 26,
    cooldownS: 8,
    castS: 0.3,
    recoveryS: 0.4,
    aimRangeM: 2,
    moveFactor: 0.1,
    interruptible: true,
    payload: { damage: 52, knockbackMps: 5, heavy: true, strength: 520, impact: 'knuckle-heavy', temporal: true },
    delivery: { type: 'strike', reachM: 1.9, radiusM: 0.75, echo: { delayS: 0.6, factor: 0.8 } },
    vfx: 'echo-strike',
    sfx: { cast: 'time-wind', release: 'echo-throw', impact: 'echo-hit' },
    look: {
      palette: TIME,
      impact: { flashM: 1.0, sparks: 14, motes: 16, ringM: 1.6, smoke: 0, groundFire: false, shake: 0.25 },
      hitFlash: 0xcffaff,
    },
  },
  // A3 (F): Temporal Collapse. A small field where time drags: enemies in it move at 55% speed for 5 seconds.
  a3: {
    id: 'temporalCollapse',
    name: 'Temporal Collapse',
    label: 'COLLAPSE',
    description:
      'Collapses time into a small field where he aims. Opponents inside it move 45% slower for 5 seconds; their controls stay as responsive as ever, they just cover less ground. He is not slowed.',
    icon: 'temporal-collapse',
    slot: 'a3',
    staminaCost: 26,
    cooldownS: 15,
    castS: 0.35,
    recoveryS: 0.35,
    aimRangeM: 6,
    moveFactor: 0.3,
    interruptible: true,
    payload: { damage: 0, knockbackMps: 0, heavy: false, strength: 0, noFlinch: true },
    delivery: { type: 'cloud', radiusM: 2.8, lifeS: 5, armS: 0.3, fog: SLOW },
    vfx: 'temporal-collapse',
    sfx: { cast: 'time-wind', release: 'collapse-open', impact: 'collapse-tick' },
    look: {
      palette: TIME,
      field: 'clock',
      impact: { flashM: 0.9, sparks: 8, motes: 20, ringM: 2.6, smoke: 0, groundFire: false },
    },
  },
  // A4 (R): Rewind Step. Back to where he stood 2.5 seconds ago. Nothing else is rewound.
  a4: {
    id: 'rewindStep',
    name: 'Rewind Step',
    label: 'REWIND',
    description:
      'Returns him to where he stood about 2.5 seconds ago, leaving a pale afterimage where he was. It does not restore health, undo damage or reset any cooldown.',
    icon: 'rewind-step',
    slot: 'a4',
    staminaCost: 20,
    cooldownS: 14,
    castS: 0.2,
    recoveryS: 0.3,
    aimRangeM: 0,
    moveFactor: 0.3,
    interruptible: true,
    payload: { damage: 0, knockbackMps: 0, heavy: false, strength: 0 },
    delivery: { type: 'rewind', windowS: 2.5 },
    vfx: 'rewind-step',
    sfx: { cast: 'time-wind', release: 'rewind-whoosh', impact: 'rewind-land' },
    look: {
      palette: TIME,
      impact: { flashM: 0.8, sparks: 12, motes: 24, ringM: 1.4, smoke: 0, groundFire: false },
    },
  },
  // A5 (slot F): Afterimage Decoy. A short shift in the chosen direction, leaving an afterimage that repeats his blow for show.
  a5: {
    id: 'afterimageDecoy',
    name: 'Afterimage Decoy',
    label: 'DECOY',
    description:
      'Shifts a short way in the direction he aims, leaving a temporal afterimage behind for 3 seconds that repeats his last attack for show. It is only an image: it deals no damage and cannot be hurt.',
    icon: 'afterimage-decoy',
    slot: 'a3',
    staminaCost: 20,
    cooldownS: 12,
    castS: 0.2,
    recoveryS: 0.25,
    aimRangeM: 4,
    moveFactor: 0,
    interruptible: true,
    payload: { damage: 0, knockbackMps: 0, heavy: false, strength: 0 },
    delivery: { type: 'dash', distanceM: 3.2, speedMps: 18, hitRadiusM: 0, decoy: { lifeS: 3 } },
    vfx: 'afterimage-decoy',
    sfx: { cast: 'time-wind', release: 'decoy-shift', impact: 'decoy-fade' },
    look: {
      palette: TIME,
      flight: { trailPerS: 30, sparksPerS: 8, shimmer: true },
      impact: { flashM: 0.6, sparks: 8, motes: 14, ringM: 1.0, smoke: 0, groundFire: false },
    },
  },
  // Ultimate: End of Time. A great slow field, a rush through it with afterimages in his wake, six hits, and a last shockwave that
  // ends the effect.
  ult: {
    id: 'endOfTime',
    name: 'End of Time',
    label: 'END OF TIME',
    description:
      'Stops the world around him in a large slow field, rushes the nearest opponent trailed by afterimages and hits them six times, then ends it all with a powerful temporal shockwave.',
    icon: 'end-of-time',
    slot: 'ult',
    staminaCost: 0,
    cooldownS: 0,
    castS: 0.6,
    recoveryS: 0.8,
    aimRangeM: 7,
    moveFactor: 0,
    interruptible: false,
    payload: { damage: 16, knockbackMps: 2, heavy: true, strength: 500, impact: 'knuckle-heavy', temporal: true },
    delivery: {
      type: 'assault',
      approachSpeedMps: 11,
      maxApproachS: 1.2,
      reachM: 1.7,
      radiusM: 0.8,
      stabs: 6,
      stabIntervalS: 0.2,
      finalFactor: 2.6,
      stabSfx: ['end-hit-1', 'end-hit-2', 'end-hit-3', 'end-hit-1', 'end-hit-2', 'end-shockwave'],
      field: { radiusM: 4.5, lifeS: 5, armS: 0.2, fog: SLOW },
    },
    vfx: 'end-of-time',
    sfx: { cast: 'time-wind', release: 'end-start', impact: 'end-hit-1' },
    look: {
      palette: TIME,
      field: 'clock',
      afterimages: true,
      impact: { flashM: 1.6, sparks: 26, motes: 24, ringM: 2.4, smoke: 0, groundFire: false, shake: 0.4, rings: 3 },
      hitFlash: 0xf0fdff,
    },
  },
  charge: chargeFor('endOfTime'),
};
