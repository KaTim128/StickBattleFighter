import type { AbilityKit } from '../../abilities/ability-def';

/**
 * Shroud's kit (owner, 12/11/2026): an original masked slasher who hunts with a knife. Cuts bleed;
 * he slips away into shadow, lunges through his prey, appears behind them and, in his ultimate,
 * Hunting Frenzy, puts the lights out on them and cuts faster and bloodier. Values are PROVISIONAL (OQ-05) and balanced by the
 * fighter ratings test (REQ-ABL-16).
 */
/** Blood red (his cuts and frenzy) and shadow (his escapes). */
const BLOOD = { deep: 0x4a0408, hot: 0xa30d16, bright: 0xe5242e, core: 0xff9a9a } as const;
const SHADE = { deep: 0x07070a, hot: 0x1c1c25, bright: 0x3b3b4a, core: 0x9a9aae } as const;

export const SHROUD_KIT: AbilityKit = {
  comboIcon: 'knife-slash',
  heavyIcon: 'gutting-stab',
  // A1 (Q): Shadow Escape (owner, 12/11/2026, SUP-25, replacing Thrown Blade). Strictly a flight,
  // never an attack: he flinches into a crouch, sinks into his own shadow and slips out 7 m away
  // from the opponent (turned aside from walls), back to the wall and facing it. No damage.
  a1: {
    id: 'shadowEscape',
    name: 'Shadow Escape',
    label: 'ESCAPE',
    description:
      'He sinks into his own shadow and slips out well away from the opponent: a way out of trouble, never an attack.',
    icon: 'shadow-escape',
    slot: 'a1',
    staminaCost: 25,
    cooldownS: 9,
    castS: 0.12,
    recoveryS: 0.2,
    aimRangeM: 0,
    moveFactor: 0,
    interruptible: false,
    payload: { damage: 0, knockbackMps: 0, heavy: false, strength: 0 },
    delivery: { type: 'teleport', maxRangeM: 7, retreatM: 7 },
    vfx: 'shadow-escape',
    sfx: { cast: 'shade-gather', release: 'shadow-sink', impact: 'shadow-rise' },
    look: {
      palette: SHADE,
      impact: { flashM: 0.4, sparks: 6, motes: 26, ringM: 1, smoke: 12, groundFire: false, smokeColour: 0x0a0a10 },
    },
  },
  // A2 (E): Stalker Lunge. He coils low, then darts through his prey in a black blur, slashing
  // everyone in the way (it passes through them) and leaving them bleeding.
  a2: {
    id: 'stalkerLunge',
    name: 'Stalker Lunge',
    label: 'LUNGE',
    description: 'Darts forward in a black blur, slashing through everyone in the way; the cuts bleed.',
    icon: 'stalker-lunge',
    slot: 'a2',
    staminaCost: 28,
    cooldownS: 5.5,
    castS: 0.18,
    recoveryS: 0.35,
    aimRangeM: 6,
    moveFactor: 0,
    interruptible: true,
    payload: {
      damage: 65,
      knockbackMps: 3,
      heavy: false,
      strength: 400,
      impact: 'knuckle-light',
      bleed: { dps: 12, durationS: 3 },
    },
    delivery: { type: 'dash', distanceM: 5, speedMps: 17, hitRadiusM: 0.6 },
    vfx: 'stalker-lunge',
    sfx: { cast: 'knife-draw', release: 'shade-rush', impact: 'knife-slash-hit' },
    look: {
      palette: SHADE,
      flight: { trailPerS: 140, sparksPerS: 0, shimmer: false },
      impact: { flashM: 0.6, sparks: 16, motes: 12, ringM: 0.7, groundFire: false, smokeColour: 0x7a0a10 },
      hitFlash: 0xff5a5a,
    },
  },
  // A3 (F): Behind You. He melts into shadow and steps out right behind the nearest enemy within
  // 7 m, already facing their back.
  a3: {
    id: 'behindYou',
    name: 'Behind You',
    label: 'BEHIND',
    description: 'Melts into shadow and appears right behind the nearest enemy within 7 metres, facing their back.',
    icon: 'behind-you',
    slot: 'a3',
    staminaCost: 30,
    cooldownS: 8,
    castS: 0.25,
    recoveryS: 0.15,
    aimRangeM: 7,
    moveFactor: 0,
    interruptible: true,
    payload: { damage: 0, knockbackMps: 0, heavy: false, strength: 0 },
    delivery: { type: 'teleport', maxRangeM: 7, behindTargetM: 0.75 },
    vfx: 'teleport',
    sfx: { cast: 'shade-gather', release: 'teleport-out', impact: 'teleport-in' },
    look: {
      palette: SHADE,
      impact: { flashM: 0.6, sparks: 0, motes: 26, ringM: 0.9, groundFire: false, smokeColour: 0x0b0b10 },
    },
  },
  // A4 (R): Rending Flurry. A frenzied burst of three close slashes in one movement: heavy damage,
  // a short stagger and deep bleeding.
  a4: {
    id: 'rendingFlurry',
    name: 'Rending Flurry',
    label: 'FLURRY',
    description: 'A frenzied burst of slashes at close range: heavy damage, a short stagger and deep bleeding.',
    icon: 'rending-flurry',
    slot: 'a4',
    staminaCost: 32,
    cooldownS: 7,
    castS: 0.22,
    recoveryS: 0.4,
    aimRangeM: 2.2,
    moveFactor: 0.3,
    interruptible: true,
    payload: {
      damage: 105,
      knockbackMps: 2,
      heavy: false,
      strength: 600,
      impact: 'knuckle-heavy',
      stunS: 0.6,
      bleed: { dps: 15, durationS: 4 },
    },
    delivery: { type: 'strike', reachM: 1.15, radiusM: 0.6 },
    vfx: 'rending-flurry',
    sfx: { cast: 'knife-draw', release: 'knife-flurry', impact: 'knife-slash-hit' },
    look: {
      palette: BLOOD,
      impact: { flashM: 0.8, sparks: 26, motes: 26, ringM: 1, groundFire: false, smokeColour: 0x5a0408 },
      hitFlash: 0xff5a5a,
    },
  },
  // ULT (I): Hunting Frenzy. He hunches lower, shaking, then snaps into a frenzy for 8 s: 25% faster,
  // knife strikes 40% quicker and 10% deadlier, every cut bleeding, wrapped in a red aura. As it
  // snaps a light bulb bursts and the lights go out on the opponent: for those 8 s it sees only a
  // small circle (1.6 m) round itself, everything else almost black.
  ult: {
    id: 'huntingFrenzy',
    name: 'Hunting Frenzy',
    label: 'ULT',
    description:
      'A light bulb bursts and the lights go out on the opponent, who can see only a small circle around itself. For 8 seconds he is faster, quicker and deadlier with the knife, and every cut bleeds.',
    icon: 'hunting-frenzy',
    slot: 'ult',
    staminaCost: 0,
    cooldownS: 1,
    castS: 0.6,
    recoveryS: 0.25,
    aimRangeM: 0,
    moveFactor: 0,
    interruptible: false,
    payload: { damage: 0, knockbackMps: 0, heavy: false, strength: 0 },
    delivery: {
      type: 'buff',
      durationS: 8,
      speedFactor: 1.25,
      damageTakenFactor: 1,
      attackSpeedFactor: 1.4,
      // Owner, 12/11/2026: the knife buff is 10% (was 35%); the lights go out on the opponent.
      meleeDamageFactor: 1.1,
      meleeBleed: { dps: 8, durationS: 3 },
      darkensFoes: { visibleM: 1.6 },
    },
    vfx: 'hunting-frenzy',
    // The snap now comes with a light bulb bursting overhead (owner, 12/11/2026).
    sfx: { cast: 'frenzy-build', release: 'bulb-burst', impact: 'frenzy-snap' },
    look: {
      palette: BLOOD,
      charge: { gatherRadiusM: 1.3, motesPerS: 110, coreMaxM: 0 },
      impact: { flashM: 1.4, sparks: 30, motes: 50, ringM: 2.2, smoke: 10, groundFire: false, smokeColour: 0x3a0306 },
    },
  },
  charge: { max: 100, perDamageDealt: 0.25, perDamageTaken: 0.2, perSecond: 1 },
};
