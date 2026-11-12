import type { AbilityKit } from '../../abilities/ability-def';

/**
 * Necro's kit (owner, 12/11/2026): a hooded death mage. Soul Drain, Death Eruption and Undead
 * Army are his three abilities and Death's Dominion his ultimate; the owner chose to drop the
 * fourth requested ability, Zombie Summon. His magic is in the violet of drawn souls and the
 * bone-white of the dead (Magic Attack VFX Standard: each fighter in his own colours). All numbers
 * PROVISIONAL (OQ-05).
 */
const SOUL = { deep: 0x2a0d3d, hot: 0x6a2bb0, bright: 0xa970ff, core: 0xeee2ff } as const;
const BONE = { deep: 0x3a2f45, hot: 0x7b6a8f, bright: 0xd8cfe6, core: 0xf6f0e4 } as const;

export const NECRO_KIT: AbilityKit = {
  // A1: Soul Drain. A dark bolt of drawn souls flies from the staff; when it lands it tears life out
  // of the target and half of it flows back to Necro.
  a1: {
    id: 'soulDrain',
    name: 'Soul Drain',
    label: 'DRAIN',
    icon: 'soul-drain',
    slot: 'a1',
    staminaCost: 20,
    cooldownS: 3.5,
    castS: 0.35,
    recoveryS: 0.3,
    aimRangeM: 10,
    moveFactor: 0.3,
    interruptible: true,
    payload: { damage: 70, knockbackMps: 2, heavy: false, strength: 200, impact: 'knuckle-light', lifesteal: 0.5 },
    delivery: { type: 'projectile', speedMps: 14, radiusM: 0.3, maxRangeM: 10 },
    vfx: 'soul-drain',
    sfx: { cast: 'soul-gather', release: 'soul-cast', impact: 'soul-drain-hit' },
    look: {
      palette: SOUL,
      charge: { gatherRadiusM: 1.1, motesPerS: 80, coreMaxM: 0.22 },
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
      palette: BONE,
      charge: { gatherRadiusM: 0.9, motesPerS: 60, coreMaxM: 0 },
      impact: { flashM: 1, sparks: 40, motes: 50, ringM: 1.8, smoke: 18, groundFire: false, smokeColour: 0x2e2438 },
      hitFlash: 0xd9c8ff,
    },
  },
  // A3: Undead Army. Three skeleton warriors claw out of the ground around him and hunt the nearest
  // enemies for 10 s, then crumble. Never more than four of his at once.
  a3: {
    id: 'undeadArmy',
    name: 'Undead Army',
    label: 'ARMY',
    icon: 'undead-army',
    slot: 'a3',
    staminaCost: 40,
    cooldownS: 14,
    castS: 0.8,
    recoveryS: 0.4,
    aimRangeM: 0,
    moveFactor: 0,
    interruptible: true,
    payload: { damage: 0, knockbackMps: 0, heavy: false, strength: 0 },
    delivery: { type: 'summon', character: 'skeleton-warrior', count: 3, lifeS: 10, maxAlive: 4 },
    vfx: 'undead-army',
    sfx: { cast: 'grave-call', release: 'summon-rise', impact: 'summon-rise' },
    look: {
      palette: BONE,
      charge: { gatherRadiusM: 1.4, motesPerS: 90, coreMaxM: 0 },
      // A low ring of grave energy at his feet; it never hides him (owner, 12/11/2026).
      impact: { flashM: 0.4, sparks: 6, motes: 16, ringM: 2, smoke: 5, groundFire: false, smokeColour: 0x2e2438 },
    },
  },
  // ULTIMATE: Death's Dominion. A necromantic transformation for 8 s: dark energy swirls round him,
  // two more skeletons rise, his magic hits 50% harder, and he moves a little faster and takes a
  // little less damage.
  ult: {
    id: 'deathsDominion',
    name: "Death's Dominion",
    label: 'ULT',
    icon: 'deaths-dominion',
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
      type: 'buff',
      durationS: 8,
      speedFactor: 1.1,
      damageTakenFactor: 0.85,
      abilityDamageFactor: 1.5,
      summon: { character: 'skeleton-warrior', count: 2, lifeS: 8, maxAlive: 6 },
    },
    vfx: 'deaths-dominion',
    sfx: { cast: 'dominion-rise', release: 'dominion-burst', impact: 'dominion-burst' },
    look: {
      palette: SOUL,
      charge: { gatherRadiusM: 1.6, motesPerS: 140, coreMaxM: 0 },
      impact: { flashM: 1.8, sparks: 50, motes: 80, ringM: 2.8, smoke: 24, groundFire: false, smokeColour: 0x2a1e38 },
    },
  },
  charge: { max: 100, perDamageDealt: 0.25, perDamageTaken: 0.2, perSecond: 1 },
};
