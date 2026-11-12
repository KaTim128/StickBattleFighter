import type { AbilityKit } from '../../abilities/ability-def';

/**
 * Necro's kit (owner, 12/11/2026): a hooded death mage. Q Soul Drain (blinds), E Death Eruption,
 * R Teleport (replaced Undead Army) and the ultimate Undead Army (4 skeletons near the enemy that
 * stay until killed; replaced Death's Dominion, SUP-19). His magic is in the violet of drawn souls and the
 * bone-white of the dead (Magic Attack VFX Standard: each fighter in his own colours). All his magic
 * glows in the violet soul palette (the bone spikes and skeletons are drawn in bone by their own art),
 * and the energy gathering round him is subtle so it never hides him (CHARACTER_STYLE_QA S7). All numbers
 * PROVISIONAL (OQ-05).
 */
const SOUL = { deep: 0x2a0d3d, hot: 0x6a2bb0, bright: 0xa970ff, core: 0xeee2ff } as const;

export const NECRO_KIT: AbilityKit = {
  comboIcon: 'staff-swing',
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
  // A3: Teleport (owner, 12/11/2026, replacing Undead Army). He dissolves into violet smoke and
  // reforms at the chosen spot (desktop: R, then left click; touch: R, then tap the spot).
  a3: {
    id: 'teleport',
    name: 'Teleport',
    label: 'BLINK',
    icon: 'teleport',
    description: 'Dissolves into violet smoke and reforms at the chosen spot, up to 9 metres away, even past walls.',
    slot: 'a3',
    staminaCost: 30,
    cooldownS: 7,
    castS: 0.25,
    recoveryS: 0.2,
    aimRangeM: 9,
    moveFactor: 0,
    interruptible: true,
    payload: { damage: 0, knockbackMps: 0, heavy: false, strength: 0 },
    delivery: { type: 'teleport', maxRangeM: 9, aimSpeedMps: 18 },
    vfx: 'teleport',
    sfx: { cast: 'soul-gather', release: 'teleport-out', impact: 'teleport-in' },
    look: {
      palette: SOUL,
      impact: { flashM: 0.7, sparks: 14, motes: 30, ringM: 1.1, smoke: 8, groundFire: false, smokeColour: 0x2e2438 },
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
  // They fight until they are destroyed: no timer, and they stay even if he falls.
  ult: {
    id: 'undeadArmy',
    name: 'Undead Army',
    label: 'ULT',
    icon: 'undead-army',
    description:
      'Four skeleton warriors claw out of the ground around the enemy and fight for Necro until they are destroyed.',
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
      lifeS: null,
      maxAlive: 8,
      near: 'enemy',
      persistent: true,
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
