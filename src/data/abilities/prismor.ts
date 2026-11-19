import type { AbilityKit } from '../../abilities/ability-def';
import { chargeFor } from '../../abilities/ultimate-charge';

/**
 * Prismor's kit (owner 21/11/2026, reworked 22/11/2026): a crystal specialist with ordinary hands who grows a random weapon
 * (Crystal Arsenal), slides on crystal, fires shards, traps legs in crystal and splits the ground. A separate fighter from
 * Frostweld (crystal, never ice). No passive. Unarmed taps are standard combat controls, never an ability. Values are
 * PROVISIONAL (OQ-05).
 */
const CRYSTAL = { deep: 0x1b1450, hot: 0x7b5cff, bright: 0x4aa8ff, core: 0xe9e2ff } as const;
const shards = (n: number, ring: number, shake = 0.3) => ({
  flashM: 1.0,
  sparks: 18,
  motes: 12,
  ringM: ring,
  smoke: 0,
  groundFire: false,
  shards: n,
  shake,
});

export const PRISMOR_KIT: AbilityKit = {
  comboIcon: 'crystal-combo',
  heavyIcon: 'crystal-crush',
  // A1 (Q): Crystal Arsenal. His fists turn to crystal for a few seconds: every punch is heavy.
  a1: {
    id: 'crystalArsenal',
    name: 'Crystal Arsenal',
    label: 'ARSENAL',
    description:
      'Turns both of his fists into sharp crystal knuckles for 8 seconds. While they last, every punch and heavy blow hits heavily, and his normal punches are set aside. A hit does not end it. Using another ability, or being knocked out, does.',
    icon: 'crystal-arsenal',
    slot: 'a1',
    staminaCost: 28,
    cooldownS: 7,
    castS: 0.55,
    recoveryS: 0.3,
    aimRangeM: 0,
    moveFactor: 0.5,
    interruptible: true,
    payload: { damage: 0, knockbackMps: 0, heavy: false, strength: 0 },
    delivery: { type: 'arsenal', durationS: 8 },
    vfx: 'crystal-arsenal',
    sfx: { cast: 'crystal-grow', release: 'arsenal-roll', impact: 'arsenal-form' },
    look: { palette: CRYSTAL, impact: shards(14, 1.8), hitFlash: 0xe9e2ff },
  },
  // A2 (E): Crystal Slide. A fast slide along the ground on a glowing crystal trail; thorns erupt where it stops.
  a2: {
    id: 'crystalSlide',
    name: 'Crystal Slide',
    label: 'SLIDE',
    description:
      'Slides rapidly across the ground toward his opponent on a glowing crystal trail. Contact deals damage and knocks them off balance for a moment. Where the slide stops, sharp crystal thorns erupt from the ground and hurt anyone caught in them.',
    icon: 'crystal-slide',
    slot: 'a2',
    staminaCost: 26,
    cooldownS: 11,
    castS: 0.3,
    recoveryS: 0.5,
    aimRangeM: 8,
    moveFactor: 0.4,
    interruptible: true,
    payload: { damage: 26, knockbackMps: 4, heavy: false, strength: 400, impact: 'knuckle-heavy', stunS: 0.6 },
    delivery: {
      type: 'dash',
      distanceM: 7.5,
      speedMps: 17,
      hitRadiusM: 0.85,
      slide: {
        trailLifeS: 2.5,
        thorns: {
          radiusM: 1.7,
          warnS: 0.45,
          payload: { damage: 32, knockbackMps: 6, heavy: false, strength: 500, impact: 'knuckle-heavy' },
        },
      },
    },
    vfx: 'crystal-slide',
    sfx: { cast: 'crystal-grow', release: 'slide-whoosh', impact: 'slide-hit' },
    look: { palette: CRYSTAL, telegraph: 'crystal', impact: shards(10, 1.4, 0.2), hitFlash: 0xe9e2ff },
  },
  // A3 (F): Shard Volley. A rapid fan of crystal shards from both hands.
  a3: {
    id: 'shardVolley',
    name: 'Shard Volley',
    label: 'SHARDS',
    description:
      'Fires a rapid fan of sharp crystal shards from his hands. A mid-range attack: each shard hits for little, but several can land on one target.',
    icon: 'shard-volley',
    slot: 'a3',
    staminaCost: 24,
    cooldownS: 9,
    castS: 0.35,
    recoveryS: 0.3,
    aimRangeM: 8,
    moveFactor: 0.5,
    interruptible: true,
    payload: { damage: 8, knockbackMps: 1.2, heavy: false, strength: 120, impact: 'knuckle-light' },
    delivery: {
      type: 'projectile',
      speedMps: 16,
      radiusM: 0.22,
      maxRangeM: 8.5,
      fan: { count: 9, spreadRad: 0.7 },
    },
    vfx: 'shard-volley',
    sfx: { cast: 'crystal-grow', release: 'volley-fire', impact: 'volley-hit' },
    look: {
      palette: CRYSTAL,
      flight: { trailPerS: 30, sparksPerS: 14, shimmer: false, shard: true },
      impact: shards(4, 0.7, 0.05),
      hitFlash: 0xe9e2ff,
    },
  },
  // A4 (R): Crystal Prison. Thick crystal grows round both legs; a grounded foe can jump clear in time, a flier is dragged down.
  a4: {
    id: 'crystalPrison',
    name: 'Crystal Prison',
    label: 'PRISON',
    description:
      "Thick crystal grows from the ground round both of the nearest enemy's legs, fitted to their size. A grounded enemy that jumps clear before the crystals lock escapes. Fliers and hoverers cannot: the crystals reach their legs and drag them to the ground. Once locked, the legs are held for exactly 4 seconds and nothing breaks them: no walking, jumping, dodging, flying or movement abilities, but they can still be hurt.",
    icon: 'crystal-prison',
    slot: 'a4',
    staminaCost: 34,
    cooldownS: 18,
    castS: 0.5,
    recoveryS: 0.4,
    aimRangeM: 6.5,
    moveFactor: 0.3,
    interruptible: true,
    payload: { damage: 0, knockbackMps: 0, heavy: false, strength: 0 },
    delivery: { type: 'legTrap', rangeM: 6.5, reactS: 0.75, holdS: 4 },
    vfx: 'crystal-prison',
    sfx: { cast: 'prison-grow', release: 'prison-grow', impact: 'prison-lock' },
    look: { palette: CRYSTAL, impact: shards(10, 1.3, 0.2) },
  },
  // A5: Crystal Groundstrike. A hand on the floor and four separate eruption zones.
  a5: {
    id: 'crystalGroundstrike',
    name: 'Crystal Groundstrike',
    label: 'STRIKE',
    description:
      'Plants a hand on the ground and four separate crystal eruptions are marked at random spots around his opponent. Each shows a warning, then bursts upward on its own, hitting hard anyone caught in it.',
    icon: 'crystal-groundstrike',
    slot: 'a4',
    staminaCost: 36,
    cooldownS: 16,
    castS: 0.7,
    recoveryS: 0.6,
    aimRangeM: 6,
    moveFactor: 0,
    interruptible: true,
    payload: { damage: 38, knockbackMps: 5, heavy: true, strength: 800, impact: 'knuckle-heavy', wallDamage: 200 },
    delivery: { type: 'eruptions', count: 4, radiusM: 1.45, warnS: 0.9, staggerS: 0.18, spreadM: 4.6 },
    vfx: 'crystal-groundstrike',
    sfx: { cast: 'ground-plant', release: 'ground-plant', impact: 'ground-erupt' },
    look: { palette: CRYSTAL, telegraph: 'crystal', impact: shards(16, 2.4, 0.4), hitFlash: 0xe9e2ff },
  },
  // Ultimate: Crystal Sovereign. Armour over the whole body, a balanced sword and a small shield; the armour and shield take the first
  // few blows, and everything shatters when it ends.
  ult: {
    id: 'crystalSovereign',
    name: 'Crystal Sovereign',
    label: 'SOVEREIGN',
    description:
      'Grows a full suit of crystal armour over his body for 10 seconds, with a balanced one-handed crystal sword in one hand and a small crystal shield from his oversized forearm. The armour absorbs the next 4 blows from any side and the shield the next 3 from the front, both weaker than a Prism Guard would be. The sword is balanced in damage, speed and reach. When it ends, everything shatters.',
    icon: 'crystal-sovereign',
    slot: 'ult',
    staminaCost: 0,
    cooldownS: 0,
    castS: 0.9,
    recoveryS: 0.5,
    aimRangeM: 0,
    moveFactor: 0,
    interruptible: false,
    payload: { damage: 0, knockbackMps: 0, heavy: false, strength: 0 },
    delivery: {
      type: 'buff',
      durationS: 10,
      speedFactor: 1,
      damageTakenFactor: 1,
      meleeDamageFactor: 1.2,
      sovereign: { armourHits: 4, shieldHits: 3 },
    },
    vfx: 'crystal-sovereign',
    sfx: { cast: 'crystal-grow', release: 'sovereign-form', impact: 'sovereign-hit' },
    look: { palette: CRYSTAL, aura: 'quiet', impact: shards(30, 3.2, 0.5) },
  },
  charge: chargeFor('crystalSovereign'),
};
