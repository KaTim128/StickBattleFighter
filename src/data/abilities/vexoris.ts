import type { AbilityKit } from '../../abilities/ability-def';
import { chargeFor } from '../../abilities/ultimate-charge';

/**
 * Vexoris's kit (master plan B1 to B9; owner order TD-114): an original gas-mask chemical-warfare soldier whose
 * strength is poison, not fists. His blows are weak; every ability adds ONE toxicity stack per target per hit or
 * cloud event (`payload.poison`), and toxicity itself (stacks, the capped slow, the 1-2-3-4 damage sequence) is the
 * status framework's (`src/combat/toxicity.ts`, TD-115). Values are PROVISIONAL (OQ-05).
 */
const TOXIN = { deep: 0x153a08, hot: 0x3fae14, bright: 0x7dff3a, core: 0xe8ffc8 } as const;
const SMOKE = { deep: 0x1c2a14, hot: 0x4c6a34, bright: 0x9ab87a, core: 0xdde8cc } as const;

export const VEXORIS_KIT: AbilityKit = {
  comboIcon: 'karate-combo',
  heavyIcon: 'axe-kick',
  // A1 (Q): Venom Spray. A short, wide blast of toxic spray from the tank on his back: modest damage, one stack.
  a1: {
    id: 'venomSpray',
    name: 'Venom Spray',
    label: 'SPRAY',
    description: 'A short blast of pressurised toxic spray from his tank: modest damage and one stack of poison.',
    icon: 'venom-spray',
    slot: 'a1',
    staminaCost: 22,
    cooldownS: 5,
    castS: 0.18,
    recoveryS: 0.32,
    aimRangeM: 3,
    moveFactor: 0,
    interruptible: true,
    payload: {
      damage: 22,
      knockbackMps: 1,
      heavy: false,
      strength: 200,
      noFlinch: true,
      poison: 1,
      impact: 'knuckle-light',
    },
    delivery: { type: 'strike', reachM: 2.6, radiusM: 0.9 },
    vfx: 'venom-spray',
    sfx: { cast: 'venom-hiss', release: 'venom-spray-burst', impact: 'toxin-splat' },
    look: {
      palette: TOXIN,
      impact: { flashM: 0.5, sparks: 6, motes: 22, ringM: 0.9, groundFire: false, smokeColour: 0x2a6a10 },
      hitFlash: 0x7dff3a,
    },
  },
  // A2 (E): Toxic Jar. He lobs his signature glass jar; it shatters where it lands (on a foe or the ground) into a
  // poison cloud. Each target is poisoned once by one jar, never again by staying in the cloud.
  a2: {
    id: 'toxicJar',
    name: 'Toxic Jar',
    label: 'JAR',
    description:
      'Throws his glass poison jar. It shatters into a green cloud for 4 seconds; each enemy it touches is poisoned once.',
    icon: 'toxic-jar',
    slot: 'a2',
    staminaCost: 28,
    cooldownS: 9,
    castS: 0.3,
    recoveryS: 0.3,
    aimRangeM: 9,
    moveFactor: 0.2,
    interruptible: true,
    payload: {
      damage: 16,
      knockbackMps: 0.5,
      heavy: false,
      strength: 150,
      noFlinch: true,
      poison: 1,
      impact: 'knuckle-light',
    },
    delivery: { type: 'projectile', speedMps: 11, radiusM: 0.35, maxRangeM: 9, cloud: { radiusM: 2, lifeS: 4 } },
    vfx: 'toxic-jar',
    sfx: { cast: 'jar-lift', release: 'jar-throw', impact: 'jar-shatter' },
    look: {
      palette: TOXIN,
      flight: { trailPerS: 40, sparksPerS: 0, shimmer: false },
      impact: { flashM: 0.6, sparks: 10, motes: 30, ringM: 1.2, smoke: 8, groundFire: false, smokeColour: 0x2a6a10 },
      hitFlash: 0x7dff3a,
    },
  },
  // A3 (F): Chemical Trap. A canister set where he aims: after a short arming it spews a toxic cloud for 8 seconds.
  // Anyone entering is poisoned once. Area denial that never traps or stuns anyone.
  a3: {
    id: 'chemicalTrap',
    name: 'Chemical Trap',
    label: 'TRAP',
    description:
      'Sets a pressurised canister where he aims. After a moment it vents toxic gas for 8 seconds; each enemy who walks in is poisoned once.',
    icon: 'chemical-trap',
    slot: 'a3',
    staminaCost: 30,
    cooldownS: 12,
    castS: 0.35,
    recoveryS: 0.25,
    aimRangeM: 6,
    moveFactor: 0.2,
    interruptible: true,
    payload: {
      damage: 10,
      knockbackMps: 0,
      heavy: false,
      strength: 100,
      noFlinch: true,
      poison: 1,
      impact: 'knuckle-light',
    },
    delivery: { type: 'cloud', radiusM: 1.7, lifeS: 8, armS: 0.6 },
    vfx: 'chemical-trap',
    sfx: { cast: 'jar-lift', release: 'trap-set', impact: 'trap-vent' },
    look: {
      palette: TOXIN,
      impact: { flashM: 0.4, sparks: 4, motes: 26, ringM: 1.4, smoke: 10, groundFire: false, smokeColour: 0x2a6a10 },
      hitFlash: 0x7dff3a,
    },
  },
  // A4 (R): Vapor Step. A burst of smoke and a quick evasive dash through it: no invulnerability, only a reposition
  // and a veil. Anyone he brushes past is poisoned once.
  a4: {
    id: 'vaporStep',
    name: 'Vapor Step',
    label: 'STEP',
    description:
      'Bursts into toxic smoke and darts 4.5 metres. A distraction and a reposition, not an escape: anyone he passes is poisoned once.',
    icon: 'vapor-step',
    slot: 'a4',
    staminaCost: 25,
    cooldownS: 9,
    castS: 0.12,
    recoveryS: 0.25,
    aimRangeM: 4.5,
    moveFactor: 0,
    interruptible: true,
    payload: {
      damage: 6,
      knockbackMps: 1,
      heavy: false,
      strength: 100,
      noFlinch: true,
      poison: 1,
      impact: 'knuckle-light',
    },
    delivery: { type: 'dash', distanceM: 4.5, speedMps: 18, hitRadiusM: 1 },
    vfx: 'vapor-step',
    sfx: { cast: 'vapor-puff', release: 'vapor-dash', impact: 'vapor-hit' },
    look: {
      palette: SMOKE,
      impact: { flashM: 0.3, sparks: 0, motes: 24, ringM: 1.3, smoke: 12, groundFire: false, smokeColour: 0x3a5a28 },
      hitFlash: 0x9ab87a,
    },
  },
  // A5 (fifth, B13): Hardened Filter. He seals his mask and braces for 4 seconds: 20% less damage taken and 12% faster.
  // A defensive tool with no poison of its own, so it never bypasses the poison limits; it takes the E slot if equipped.
  a5: {
    id: 'hardenedFilter',
    name: 'Hardened Filter',
    label: 'FILTER',
    description:
      'Seals his mask and braces for 4 seconds: 20% less damage taken and 12% faster. Adds no poison itself.',
    icon: 'hardened-filter',
    slot: 'a2',
    staminaCost: 20,
    cooldownS: 14,
    castS: 0.2,
    recoveryS: 0.2,
    aimRangeM: 0,
    moveFactor: 0.5,
    interruptible: true,
    payload: { damage: 0, knockbackMps: 0, heavy: false, strength: 0 },
    delivery: { type: 'buff', durationS: 4, speedFactor: 1.12, damageTakenFactor: 0.8 },
    vfx: 'hardened-filter',
    sfx: { cast: 'filter-hum', release: 'filter-seal', impact: 'filter-lock' },
    look: {
      palette: TOXIN,
      impact: { flashM: 0.4, sparks: 4, motes: 18, ringM: 1.2, smoke: 4, groundFire: false, smokeColour: 0x2a6a10 },
      aura: 'quiet',
    },
  },
  // ULT (I): Plague Bloom. He vents his whole supply: a wide green ring warns the floor for a full second, then a huge
  // toxic bloom bursts out. Its strength is spread poison (two stacks), not damage; the warning and long recovery are
  // the counterplay.
  ult: {
    id: 'plagueBloom',
    name: 'Plague Bloom',
    label: 'ULT',
    description:
      'Vents all his concentrated poison: after a clear one-second warning, a huge toxic bloom bursts around him. Everyone caught takes little damage but two stacks of poison.',
    icon: 'plague-bloom',
    slot: 'ult',
    staminaCost: 0,
    cooldownS: 1,
    castS: 0.7,
    recoveryS: 0.7,
    aimRangeM: 0,
    moveFactor: 0,
    interruptible: false,
    payload: {
      damage: 28,
      knockbackMps: 2,
      heavy: false,
      strength: 300,
      noFlinch: true,
      poison: 2,
      impact: 'knuckle-light',
    },
    delivery: { type: 'nova', radiusM: 5, telegraphS: 1 },
    vfx: 'plague-bloom',
    sfx: { cast: 'bloom-build', release: 'bloom-vent', impact: 'bloom-burst' },
    look: {
      palette: TOXIN,
      charge: { gatherRadiusM: 1.6, motesPerS: 120, coreMaxM: 0 },
      impact: {
        flashM: 1.6,
        sparks: 24,
        motes: 70,
        ringM: 4.5,
        smoke: 18,
        groundFire: false,
        smokeColour: 0x2a6a10,
        shake: 0.35,
      },
      hitFlash: 0x7dff3a,
    },
  },
  charge: chargeFor('plagueBloom'),
};
