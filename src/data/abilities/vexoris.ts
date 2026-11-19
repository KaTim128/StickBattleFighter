import type { AbilityKit } from '../../abilities/ability-def';
import { chargeFor } from '../../abilities/ultimate-charge';

/**
 * Vexoris's kit (master plan B1 to B9; owner order TD-114): an original gas-mask chemical-warfare soldier whose
 * strength is poison, not fists. His blows are weak; every ability adds ONE toxicity stack per target per hit or
 * cloud event (`payload.poison`), and toxicity itself (stacks, the capped slow, the 1-2-3-4 damage sequence) is the
 * status framework's (`src/combat/toxicity.ts`, TD-115). Values are PROVISIONAL (OQ-05).
 */
const TOXIN = { deep: 0x153a08, hot: 0x3fae14, bright: 0x7dff3a, core: 0xe8ffc8 } as const;
const BLAST = { deep: 0x3a2a08, hot: 0xe08a1a, bright: 0xffc84a, core: 0xfff3c0 } as const;

export const VEXORIS_KIT: AbilityKit = {
  comboIcon: 'karate-combo',
  heavyIcon: 'jar-smash',
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
      damage: 28,
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
  // A2 (E): Toxic Jar. A poison spell: he winds his arm back and hurls a glass jar of glowing poison. It tumbles
  // through the air and shatters on whoever it meets (or on the ground where it lands): damage, glass and green
  // liquid everywhere, one stack of poison, and a thin lingering mist that poisons nobody twice.
  a2: {
    id: 'toxicJar',
    name: 'Toxic Jar',
    label: 'JAR',
    description:
      'Throws a glass jar of poison. It shatters on impact: damage and one stack of poison to whoever it hits, with a small splash where it lands.',
    icon: 'toxic-jar',
    slot: 'a2',
    staminaCost: 28,
    cooldownS: 9,
    castS: 0.34,
    recoveryS: 0.3,
    aimRangeM: 9,
    moveFactor: 0.2,
    interruptible: true,
    payload: {
      damage: 32,
      knockbackMps: 1.2,
      heavy: false,
      strength: 220,
      noFlinch: true,
      poison: 1,
      impact: 'knuckle-light',
    },
    delivery: { type: 'projectile', speedMps: 12, radiusM: 0.35, maxRangeM: 9, cloud: { radiusM: 1.3, lifeS: 1.8 } },
    vfx: 'toxic-jar',
    sfx: { cast: 'jar-lift', release: 'jar-throw', impact: 'jar-shatter' },
    look: {
      palette: TOXIN,
      flight: { trailPerS: 26, sparksPerS: 0, shimmer: false, jar: true },
      impact: {
        flashM: 0.7,
        sparks: 8,
        motes: 22,
        ringM: 1.3,
        smoke: 6,
        groundFire: false,
        smokeColour: 0x2a6a10,
        shards: 18,
        splash: { count: 26, colour: 0x5fe02a },
        mist: 8,
        shake: 0.12,
      },
      hitFlash: 0x7dff3a,
    },
  },
  // A3 (F): Chemical Trap. A landmine: he sets it on the floor where he aims, where everyone can see it. It arms
  // after a moment and lies in wait for 40 seconds; the first enemy to step on it sets it off, a burst of damage and
  // a toxic cloud that lingers for 5 seconds and poisons each enemy in it once. He keeps two mines out at a time.
  a3: {
    id: 'chemicalTrap',
    name: 'Chemical Trap',
    label: 'MINE',
    description:
      'Plants a visible landmine where he aims. When an enemy steps on it, it explodes in a burst of damage and a toxic cloud that poisons everyone in it. Two mines at a time.',
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
      damage: 38,
      knockbackMps: 3,
      heavy: false,
      strength: 300,
      noFlinch: true,
      poison: 1,
      impact: 'knuckle-light',
    },
    delivery: {
      type: 'cloud',
      radiusM: 2,
      lifeS: 5,
      armS: 0.9,
      mine: { triggerRadiusM: 0.7, waitS: 40, maxPerCaster: 2 },
    },
    vfx: 'chemical-trap',
    sfx: { cast: 'jar-lift', release: 'trap-set', impact: 'trap-vent' },
    look: {
      palette: TOXIN,
      impact: {
        flashM: 1.1,
        sparks: 16,
        motes: 36,
        ringM: 2.2,
        smoke: 14,
        groundFire: false,
        smokeColour: 0x2a6a10,
        shake: 0.3,
      },
      hitFlash: 0x7dff3a,
    },
  },
  // A4 (R): Vapour Step. He dissolves into green toxic mist and is instantly a few metres behind where he stood. A
  // small poison mist stays at the spot he left for 3 seconds: any opponent who enters it is poisoned (once). He is
  // unaffected by his own mist. A reposition, never an escape: no invulnerability.
  a4: {
    id: 'vaporStep',
    name: 'Vapour Step',
    label: 'STEP',
    description:
      'Dissolves into green toxic mist and dashes backwards 3.5 metres. A small poison mist stays where he stood for 3 seconds and poisons any opponent who enters it.',
    icon: 'vapor-step',
    slot: 'a4',
    staminaCost: 25,
    cooldownS: 9,
    castS: 0.1,
    recoveryS: 0.2,
    aimRangeM: 3.5,
    moveFactor: 0,
    interruptible: true,
    payload: {
      damage: 2,
      knockbackMps: 0,
      heavy: false,
      strength: 60,
      noFlinch: true,
      poison: 1,
      impact: 'knuckle-light',
    },
    delivery: {
      type: 'dash',
      distanceM: 3.5,
      speedMps: 30,
      hitRadiusM: 0,
      backwards: true,
      leavesCloud: { radiusM: 1.3, lifeS: 3 },
    },
    vfx: 'vapor-step',
    sfx: { cast: 'vapor-puff', release: 'vapor-dash', impact: 'vapor-hit' },
    look: {
      palette: TOXIN,
      impact: { flashM: 0.3, sparks: 0, motes: 30, ringM: 1.3, smoke: 14, groundFire: false, smokeColour: 0x3a6a28 },
      hitFlash: 0x7dff3a,
    },
  },
  // A5 (fifth, B13): Grenade. He lobs a grenade in a curved arc to where he aims. Pass through an enemy and it sticks to
  // them and goes off 0.5 seconds later; otherwise it lands and goes off a second after. The blast deals high damage and
  // knockback to every enemy within 3 metres, and applies no poison. It takes the E slot if equipped.
  a5: {
    id: 'grenade',
    name: 'Grenade',
    label: 'NADE',
    description:
      'Lobs a grenade in a curved arc. If it hits an enemy it sticks and explodes after 0.5 seconds; otherwise it explodes after 1 second. High damage and knockback within 3 metres. No poison.',
    icon: 'grenade',
    slot: 'a2',
    staminaCost: 35,
    cooldownS: 14,
    castS: 0.4,
    recoveryS: 0.35,
    aimRangeM: 8,
    moveFactor: 0.2,
    interruptible: true,
    payload: {
      damage: 80,
      knockbackMps: 8,
      heavy: true,
      strength: 650,
      impact: 'knuckle-heavy',
      falloff: { fullWithinM: 1.2, minFactor: 0.55 },
    },
    delivery: {
      type: 'grenade',
      speedMps: 9,
      arcHeightM: 1.6,
      stickRadiusM: 0.35,
      stickFuseS: 0.5,
      fuseS: 1,
      blastRadiusM: 3,
    },
    vfx: 'grenade',
    sfx: { cast: 'grenade-pin', release: 'grenade-throw', impact: 'grenade-blast' },
    look: {
      palette: BLAST,
      impact: {
        flashM: 2.2,
        sparks: 30,
        motes: 60,
        ringM: 3,
        smoke: 16,
        groundFire: false,
        smokeColour: 0x3a3626,
        shake: 0.45,
      },
      hitFlash: 0xffc84a,
    },
  },
  // ULT (I): Plague Bloom. He vents his whole supply into a huge poison fog that fills the area around him for 10
  // seconds. Enemies inside see only a few metres through a green haze, are slowed, take slow chip damage, and
  // earn one stack of poison after three seconds in it. He is immune and sees clearly through it, tinted green.
  ult: {
    id: 'plagueBloom',
    name: 'Plague Bloom',
    label: 'ULT',
    description:
      'Vents a huge poison fog for 10 seconds. Enemies inside see only about 1 metre through the green haze, move 40% slower and take rapid poison chip damage (a small tick every fifth of a second); after 3 seconds inside they gain a stack of poison. He sees clearly through it.',
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
      damage: 0,
      knockbackMps: 0,
      heavy: false,
      strength: 0,
      noFlinch: true,
      poison: 1,
    },
    delivery: {
      type: 'cloud',
      radiusM: 5.5,
      lifeS: 10,
      armS: 0.8,
      fog: { sightM: 1.2, speedFactor: 0.6, chipDps: 10, stackAfterS: 3 },
    },
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
        shake: 0.3,
      },
      hitFlash: 0x7dff3a,
    },
  },
  charge: chargeFor('plagueBloom'),
};
