import type { AbilityKit } from '../../abilities/ability-def';
import { chargeFor } from '../../abilities/ultimate-charge';

/**
 * Chronos's kit (master plan section 4, fighter 11; reworked by the owner 21/11/2026): a time-manipulation specialist in blue and gold.
 * Only Rewind Time heals, and only a share of damage he really dealt; nothing grants invulnerability or shortens a cooldown. Values are PROVISIONAL (OQ-05).
 */
const TIME = { deep: 0x0b2a5a, hot: 0x2f7bff, bright: 0xffd36a, core: 0xfff4cf } as const;

/** A slow field: enemies inside move slower and nothing else (an unlimited sight and no damage over time). */
const SLOW = { sightM: Number.POSITIVE_INFINITY, speedFactor: 0.4, chipDps: 0, stackAfterS: 1e9 } as const;

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
  // A1 (Q): Rewind Time. A blow now, then four seconds of remembered time: whatever he really deals is counted, and at the end time
  // runs back, he returns to where he started and recovers half of it.
  a1: {
    id: 'rewindTime',
    name: 'Rewind Time',
    label: 'REWIND',
    holdsCooldown: true,
    description:
      'Strikes ahead and marks where he stands. For 4 seconds, every point of damage he actually deals is counted. Then time runs backwards: he is pulled back to the marked spot, undoing every step he took, and recovers 50% of the damage he really dealt in that time.',
    icon: 'rewind-time',
    slot: 'a1',
    staminaCost: 24,
    cooldownS: 22,
    castS: 0.3,
    recoveryS: 0.35,
    aimRangeM: 2,
    moveFactor: 0.2,
    interruptible: true,
    payload: { damage: 36, knockbackMps: 4, heavy: true, strength: 480, impact: 'knuckle-heavy', temporal: true },
    delivery: { type: 'rewindTime', durationS: 4, healFactor: 0.5, reachM: 1.9, radiusM: 0.75 },
    vfx: 'rewind-time',
    sfx: { cast: 'time-wind', release: 'rewind-mark', impact: 'rewind-snap' },
    look: {
      palette: TIME,
      afterimages: true,
      impact: { flashM: 1.0, sparks: 14, motes: 16, ringM: 1.6, smoke: 0, groundFire: false, shake: 0.25 },
      hitFlash: 0xfff4cf,
    },
  },
  // A2 (E): Time Snare. A circular field of dragging time where he aims: enemies in it move 60% slower for 3 seconds.
  a2: {
    id: 'timeSnare',
    name: 'Time Snare',
    label: 'SNARE',
    holdsCooldown: true,
    description:
      'Creates a circular temporal field where he aims. Opponents inside it move 60% slower for 3 seconds. Their controls stay as responsive as ever; they just cover far less ground.',
    icon: 'time-snare',
    slot: 'a2',
    staminaCost: 24,
    cooldownS: 14,
    castS: 0.35,
    recoveryS: 0.35,
    aimRangeM: 6,
    moveFactor: 0.3,
    interruptible: true,
    payload: { damage: 0, knockbackMps: 0, heavy: false, strength: 0, noFlinch: true },
    delivery: { type: 'cloud', radiusM: 2.6, lifeS: 3, armS: 0.2, fog: SLOW },
    vfx: 'time-snare',
    sfx: { cast: 'time-wind', release: 'snare-open', impact: 'snare-tick' },
    look: {
      palette: TIME,
      field: 'clock',
      impact: { flashM: 0.9, sparks: 8, motes: 20, ringM: 2.6, smoke: 0, groundFire: false },
    },
  },
  // A3 (F): Chrono Slash. His arm swings across and a wide crescent of time cuts out along the floor toward the enemy.
  a3: {
    id: 'chronoSlash',
    name: 'Chrono Slash',
    label: 'SLASH',
    holdsCooldown: true,
    description:
      'Swings his arm forward and releases a wide horizontal crescent-shaped slash of time that travels toward opponents. Enemies it hits take damage and are staggered for a moment.',
    icon: 'chrono-slash',
    slot: 'a3',
    staminaCost: 24,
    cooldownS: 8,
    castS: 0.3,
    recoveryS: 0.4,
    aimRangeM: 8,
    moveFactor: 0.2,
    interruptible: true,
    payload: {
      damage: 36,
      knockbackMps: 4,
      heavy: true,
      strength: 520,
      impact: 'knuckle-heavy',
      stunS: 0.45,
      temporal: true,
    },
    delivery: { type: 'projectile', speedMps: 14, radiusM: 0.8, maxRangeM: 8 },
    vfx: 'chrono-slash',
    sfx: { cast: 'time-wind', release: 'slash-cut', impact: 'slash-land' },
    look: {
      palette: TIME,
      flight: { trailPerS: 50, sparksPerS: 14, shimmer: true, crescent: true },
      impact: { flashM: 1.1, sparks: 22, motes: 16, ringM: 1.6, smoke: 0, groundFire: false, shake: 0.3 },
      hitFlash: 0xfff4cf,
    },
  },
  // A4 (R): Afterimage. A very fast dash that leaves afterimages along its path; anyone he runs through is hurt and slowed.
  a4: {
    id: 'afterimage',
    name: 'Afterimage',
    label: 'IMAGE',
    holdsCooldown: true,
    description:
      'Dashes forward very fast, leaving afterimages along the exact path he ran. Afterimages cannot hurt him and swallow enemy shots. Anyone he passes through takes damage and is slowed, in movement and ability use, for 1 second.',
    icon: 'afterimage',
    slot: 'a4',
    staminaCost: 24,
    cooldownS: 12,
    castS: 0.2,
    recoveryS: 0.3,
    aimRangeM: 6,
    moveFactor: 0,
    interruptible: true,
    payload: {
      damage: 26,
      knockbackMps: 2,
      heavy: false,
      strength: 260,
      impact: 'knuckle-light',
      noFlinch: true,
      temporal: true,
      slow: { durationS: 1, speedFactor: 0.6 },
    },
    delivery: {
      type: 'dash',
      distanceM: 5.5,
      speedMps: 20,
      hitRadiusM: 0.8,
      afterimages: { spacingM: 0.9, lifeS: 2.5 },
    },
    vfx: 'afterimage',
    sfx: { cast: 'time-wind', release: 'image-dash', impact: 'image-cut' },
    look: {
      palette: TIME,
      afterimages: true,
      flight: { trailPerS: 40, sparksPerS: 10, shimmer: true },
      impact: { flashM: 0.7, sparks: 12, motes: 12, ringM: 1.2, smoke: 0, groundFire: false },
      hitFlash: 0xfff4cf,
    },
  },
  // A5 (slot F): Age Acceleration. The nearest enemy's own time is sped up: it ages in front of you, wears down for 4 seconds and its
  // defence drops by a quarter.
  a5: {
    id: 'ageAcceleration',
    name: 'Age Acceleration',
    label: 'AGE',
    holdsCooldown: true,
    description:
      "Speeds up an opponent's perception of time so their body ages rapidly. For 4 seconds they take damage over time and their defence is 25% lower. They visibly age, then return to normal.",
    icon: 'age-acceleration',
    slot: 'a3',
    staminaCost: 26,
    cooldownS: 16,
    castS: 0.35,
    recoveryS: 0.4,
    aimRangeM: 6,
    moveFactor: 0.2,
    interruptible: true,
    payload: {
      damage: 8,
      knockbackMps: 0,
      heavy: false,
      strength: 0,
      noFlinch: true,
      temporal: true,
      aging: { durationS: 4, dps: 14, defenceFactor: 0.75 },
    },
    delivery: { type: 'age', rangeM: 6 },
    vfx: 'age-acceleration',
    sfx: { cast: 'time-wind', release: 'age-rush', impact: 'age-creak' },
    look: {
      palette: TIME,
      impact: { flashM: 1.0, sparks: 10, motes: 26, ringM: 1.8, smoke: 0, groundFire: false },
      hitFlash: 0xfff4cf,
    },
  },
  // Ultimate: Time Stop. The whole arena stops for four seconds. He moves and strikes in it; nothing he does lands until time resumes,
  // and then it all lands at once.
  ult: {
    id: 'timeStop',
    name: 'Time Stop',
    label: 'TIME STOP',
    description:
      'Freezes the entire arena for 4 seconds: opponents and their cooldowns, furniture, objects and physics all stop. Only Chronos can move. Everything he hits while time is stopped is held back, and when time resumes every blow, push and break lands at once. Blows on the same opponent stack: each one lands 12% harder than the last, up to double.',
    icon: 'time-stop',
    slot: 'ult',
    staminaCost: 0,
    cooldownS: 0,
    castS: 0.6,
    recoveryS: 0.5,
    aimRangeM: 0,
    moveFactor: 0,
    interruptible: false,
    payload: { damage: 0, knockbackMps: 0, heavy: false, strength: 0 },
    delivery: { type: 'timeStop', durationS: 4 },
    vfx: 'time-stop',
    sfx: { cast: 'time-wind', release: 'time-stop-start', impact: 'time-resume' },
    look: {
      palette: TIME,
      impact: { flashM: 2.4, sparks: 40, motes: 40, ringM: 6, smoke: 0, groundFire: false, shake: 0.7, rings: 4 },
      hitFlash: 0xfff4cf,
    },
  },
  charge: chargeFor('timeStop'),
};
