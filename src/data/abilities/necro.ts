import type { AbilityKit } from '../../abilities/ability-def';

/**
 * Necro's kit (owner, 12/11/2026): a hooded death mage. Q Soul Drain (blinds), E Death Eruption,
 * F Teleport (one press away from the opponent, two presses in close, SUP-24) and the ultimate Undead
 * Army (4 skeletons near the enemy for 10 s; replaced Death's Dominion, SUP-19/SUP-24). His magic is in the violet of drawn souls and the
 * bone-white of the dead (Magic Attack VFX Standard: each fighter in his own colours). All his magic
 * glows in the violet soul palette (the bone spikes and skeletons are drawn in bone by their own art),
 * and the energy gathering round him is subtle so it never hides him (CHARACTER_STYLE_QA S7). All numbers
 * PROVISIONAL (OQ-05).
 */
const SOUL = { deep: 0x2a0d3d, hot: 0x6a2bb0, bright: 0xa970ff, core: 0xeee2ff } as const;
/** The aggressive Teleport's colours: the same soul violet run hot into crimson. */
const STRIKE = { deep: 0x3a0a24, hot: 0xb0205a, bright: 0xff4f9a, core: 0xffe2f0 } as const;

export const NECRO_KIT: AbilityKit = {
  comboIcon: 'staff-swing',
  heavyIcon: 'soul-rend',
  // A1: Soul Drain. A dark bolt of drawn souls flies from the staff; when it lands it tears life out
  // of the target (half of it flows back to Necro) and blinds it for 3 s (owner, 12/11/2026).
  a1: {
    id: 'soulDrain',
    name: 'Soul Drain',
    label: 'DRAIN',
    icon: 'soul-drain',
    description:
      'A bolt of drawn souls. It drains life from the target, giving half back to Necro, and blinds it for 3 seconds.',
    slot: 'a1',
    staminaCost: 20,
    cooldownS: 4.5,
    castS: 0.35,
    recoveryS: 0.3,
    aimRangeM: 10,
    moveFactor: 0.3,
    interruptible: true,
    payload: {
      damage: 60,
      knockbackMps: 2,
      heavy: false,
      strength: 200,
      impact: 'knuckle-light',
      lifesteal: 0.5,
      blindS: 3,
    },
    delivery: { type: 'projectile', speedMps: 14, radiusM: 0.3, maxRangeM: 10 },
    vfx: 'soul-drain',
    sfx: { cast: 'soul-gather', release: 'soul-cast', impact: 'soul-drain-hit' },
    look: {
      palette: SOUL,
      charge: { gatherRadiusM: 0.9, motesPerS: 45, coreMaxM: 0.2 },
      flight: { trailPerS: 100, sparksPerS: 26, shimmer: true },
      impact: { flashM: 0.8, sparks: 26, motes: 34, ringM: 1.1, smoke: 10, groundFire: false, smokeColour: 0x3a2850 },
      hitFlash: 0xd9c8ff,
    },
  },
  // A2: Death Eruption. Where he points, the ground darkens; then skeletal hands and bone spikes
  // burst up, hurting everyone inside and holding them in place for a moment.
  a2: {
    id: 'deathEruption',
    name: 'Death Eruption',
    label: 'ERUPT',
    icon: 'death-eruption',
    description:
      'Marks the ground where he aims; a moment later bone spikes and skeletal hands burst up, hurting and trapping everyone inside.',
    slot: 'a2',
    staminaCost: 30,
    cooldownS: 7,
    castS: 0.4,
    recoveryS: 0.45,
    aimRangeM: 7,
    moveFactor: 0,
    interruptible: true,
    payload: { damage: 110, knockbackMps: 0.5, heavy: false, strength: 600, impact: 'knuckle-heavy', stunS: 1.2 },
    delivery: { type: 'nova', radiusM: 1.6, telegraphS: 0.6, atTarget: true },
    vfx: 'death-eruption',
    sfx: { cast: 'grave-call', release: 'grave-rumble', impact: 'bone-eruption' },
    look: {
      palette: SOUL,
      charge: { gatherRadiusM: 0.8, motesPerS: 35, coreMaxM: 0 },
      impact: { flashM: 1, sparks: 40, motes: 50, ringM: 1.8, smoke: 18, groundFire: false, smokeColour: 0x2e2438 },
      hitFlash: 0xd9c8ff,
    },
  },
  // A3: Teleport (owner, 12/11/2026, SUP-24: no longer aimed). One press: he sinks into violet
  // smoke and reforms 7 m away from the opponent to make distance (turned aside from walls). Press
  // again during that 0.3 s wind-up for the aggressive form: a quick crimson rush that reforms him
  // just in front of the opponent. Never inside walls, furniture or outside the arena.
  a3: {
    id: 'teleport',
    name: 'Teleport',
    label: 'BLINK',
    icon: 'teleport',
    description:
      'Press once to dissolve into violet smoke and reform away from the opponent. Press twice quickly to rush in through crimson shadow and reform right in front of them.',
    slot: 'a3',
    staminaCost: 30,
    cooldownS: 7,
    castS: 0.3,
    recoveryS: 0.2,
    aimRangeM: 9,
    moveFactor: 0,
    interruptible: true,
    payload: { damage: 0, knockbackMps: 0, heavy: false, strength: 0 },
    delivery: { type: 'teleport', maxRangeM: 9, retreatM: 7 },
    vfx: 'teleport',
    sfx: { cast: 'soul-gather', release: 'teleport-out', impact: 'teleport-in' },
    look: {
      palette: SOUL,
      impact: { flashM: 0.7, sparks: 14, motes: 30, ringM: 1.1, smoke: 8, groundFire: false, smokeColour: 0x2e2438 },
    },
    // Double press: Shadow Step in. Quicker (0.12 s), and a second longer to come back.
    doubleTap: {
      id: 'teleportStrike',
      name: 'Teleport (rush in)',
      label: 'BLINK',
      icon: 'teleport',
      slot: 'a3',
      staminaCost: 30,
      cooldownS: 8,
      castS: 0.12,
      recoveryS: 0.25,
      aimRangeM: 12,
      moveFactor: 0,
      interruptible: true,
      payload: { damage: 0, knockbackMps: 0, heavy: false, strength: 0 },
      delivery: { type: 'teleport', maxRangeM: 12, approachGapM: 0.9 },
      vfx: 'teleport-strike',
      sfx: { cast: 'blink-rush', release: 'blink-tear', impact: 'blink-arrive' },
      look: {
        palette: STRIKE,
        impact: { flashM: 0.9, sparks: 22, motes: 18, ringM: 1.5, smoke: 4, groundFire: false, smokeColour: 0x3a1024 },
      },
    },
  },
  // A4 (R): Grave Chains (owner, 12/11/2026). He thrusts the staff forward and spectral chains lash
  // out (16 m/s, up to 8 m); the first enemy they catch is dragged back to his feet and held for a
  // moment, set up for his staff combo.
  a4: {
    id: 'graveChains',
    name: 'Grave Chains',
    label: 'CHAIN',
    description:
      'Spectral chains lash out from his staff; the first enemy caught is dragged back to him and held for a moment.',
    icon: 'grave-chains',
    slot: 'a4',
    staminaCost: 25,
    cooldownS: 8,
    castS: 0.3,
    recoveryS: 0.3,
    aimRangeM: 8,
    moveFactor: 0.2,
    interruptible: true,
    payload: {
      damage: 40,
      knockbackMps: 0,
      heavy: false,
      strength: 150,
      impact: 'knuckle-light',
      stunS: 0.8,
      pull: { speedMps: 16, stopM: 0.9 },
    },
    delivery: { type: 'projectile', speedMps: 16, radiusM: 0.3, maxRangeM: 8 },
    vfx: 'grave-chains',
    sfx: { cast: 'soul-gather', release: 'chain-lash', impact: 'chain-catch' },
    look: {
      palette: SOUL,
      flight: { trailPerS: 70, sparksPerS: 16, shimmer: false },
      impact: { flashM: 0.6, sparks: 16, motes: 16, ringM: 0.8, groundFire: false, smokeColour: 0x3a2050 },
      hitFlash: 0xd9c2ff,
    },
  },
  // ULTIMATE: Undead Army (owner, 12/11/2026, replacing Death's Dominion). He rises off the ground
  // with his free arm raised and four skeleton warriors claw up at random spots around the enemy.
  // They fight for 10 s (owner, SUP-24: the timer is back), then crumble; they also fall with him.
  ult: {
    id: 'undeadArmy',
    name: 'Undead Army',
    label: 'ULT',
    icon: 'undead-army',
    description:
      'Four skeleton warriors claw out of the ground around the enemy and fight for Necro for 10 seconds, then crumble.',
    slot: 'ult',
    staminaCost: 0,
    cooldownS: 1,
    castS: 0.9,
    recoveryS: 0.4,
    aimRangeM: 0,
    moveFactor: 0,
    interruptible: false,
    payload: { damage: 0, knockbackMps: 0, heavy: false, strength: 0 },
    delivery: {
      type: 'summon',
      character: 'skeleton-warrior',
      count: 4,
      // Owner, 12/11/2026 (SUP-24): the skeletons are on a timer again, as Undead Army first was.
      lifeS: 10,
      maxAlive: 8,
      near: 'enemy',
    },
    vfx: 'undead-army',
    sfx: { cast: 'dominion-rise', release: 'grave-call', impact: 'summon-rise' },
    look: {
      palette: SOUL,
      // A low ring of grave energy at his feet; it never hides him (CHARACTER_STYLE_QA S7).
      impact: { flashM: 0.4, sparks: 6, motes: 16, ringM: 2, smoke: 5, groundFire: false, smokeColour: 0x2e2438 },
    },
  },
  charge: { max: 100, perDamageDealt: 0.25, perDamageTaken: 0.2, perSecond: 1 },
};
