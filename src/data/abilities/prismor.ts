import type { AbilityKit } from '../../abilities/ability-def';
import { chargeFor } from '../../abilities/ultimate-charge';

/**
 * Prismor's kit (owner 21/11/2026): a crystal weapon specialist who grows weapons and a shield straight out of his arms. A
 * separate fighter from Frostweld (crystal, never ice). No passive. Values are PROVISIONAL (OQ-05).
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
  // A1 (Q): Crystal Greatsword. Both hands make one huge blade. Three slow, wide blows ending in an overhead chop that hurls them.
  a1: {
    id: 'crystalGreatsword',
    name: 'Crystal Greatsword',
    label: 'GREATSWORD',
    description:
      'Grows a huge two-handed crystal sword from both hands and swings it three times: a wide sweep, a sweep back, then a heavy overhead slash that hurls opponents away. High damage over a wide area, but slow, he moves slowly while he swings, and a combo that hits nothing leaves him open.',
    icon: 'crystal-greatsword',
    slot: 'a1',
    staminaCost: 34,
    cooldownS: 14,
    castS: 0.6,
    recoveryS: 0.4,
    aimRangeM: 2.6,
    moveFactor: 0.3,
    interruptible: true,
    payload: { damage: 50, knockbackMps: 9, heavy: false, strength: 700, impact: 'knuckle-heavy', wallDamage: 60 },
    delivery: {
      type: 'weapon',
      weapon: 'greatsword',
      hits: [
        { atS: 0.5, shape: 'arc', reachM: 2.6, widthM: 1.1, damageFactor: 0.6, knockbackFactor: 0.5 },
        { atS: 1.2, shape: 'arc', reachM: 2.6, widthM: 1.1, damageFactor: 0.7, knockbackFactor: 0.6 },
        { atS: 2.0, shape: 'arc', reachM: 2.9, widthM: 1.3, damageFactor: 1.4, knockbackFactor: 1.6, heavy: true },
      ],
      missRecoveryS: 0.9,
    },
    vfx: 'crystal-greatsword',
    sfx: { cast: 'crystal-grow', release: 'greatsword-swing', impact: 'greatsword-hit' },
    look: { palette: CRYSTAL, impact: shards(10, 1.8), hitFlash: 0xe9e2ff },
  },
  // A2 (E): Prism Guard. A big angular shield out of the oversized forearm. It answers a melee blow it stops with a bash.
  a2: {
    id: 'prismGuard',
    name: 'Prism Guard',
    label: 'GUARD',
    description:
      'Grows a large angular crystal shield from his oversized forearm for 6 seconds. It takes up to 90 damage from the front; heavy blows wear it down twice as fast, and a melee blow it stops is answered with a shield bash. He moves slowly behind it, it does nothing against attacks from behind, and a grab shatters it.',
    icon: 'prism-guard',
    slot: 'a2',
    staminaCost: 24,
    cooldownS: 16,
    castS: 0.4,
    recoveryS: 0.25,
    aimRangeM: 0,
    moveFactor: 0.3,
    interruptible: true,
    payload: { damage: 0, knockbackMps: 0, heavy: false, strength: 0 },
    delivery: {
      type: 'shield',
      hp: 90,
      durationS: 6,
      heavyFactor: 2,
      moveFactor: 0.5,
      bash: { damage: 20, knockbackMps: 7, reachM: 2.2, cooldownS: 2.5 },
    },
    vfx: 'prism-guard',
    sfx: { cast: 'crystal-grow', release: 'shield-grow', impact: 'shield-hit' },
    look: { palette: CRYSTAL, impact: shards(8, 1.4, 0.15) },
  },
  // A3 (F): Crystal Dual Blades. A blade from each hand: three fast slashes and a spinning cross.
  a3: {
    id: 'crystalDualBlades',
    name: 'Crystal Dual Blades',
    label: 'BLADES',
    description:
      'Grows a short crystal blade from each hand and attacks with four fast slashes, the last a spinning cross slash all round him. Fast and relentless, but each cut is light, the reach is short and the knockback is small.',
    icon: 'crystal-dual-blades',
    slot: 'a3',
    staminaCost: 28,
    cooldownS: 10,
    castS: 0.4,
    recoveryS: 0.25,
    aimRangeM: 1.8,
    moveFactor: 0.5,
    interruptible: true,
    payload: { damage: 24, knockbackMps: 3, heavy: false, strength: 300, impact: 'knuckle-light', noFlinch: false },
    delivery: {
      type: 'weapon',
      weapon: 'dualBlades',
      hits: [
        { atS: 0.3, shape: 'arc', reachM: 1.8, widthM: 1.0, damageFactor: 0.5, knockbackFactor: 0.3 },
        { atS: 0.6, shape: 'arc', reachM: 1.8, widthM: 1.0, damageFactor: 0.5, knockbackFactor: 0.3 },
        { atS: 0.9, shape: 'arc', reachM: 1.8, widthM: 1.0, damageFactor: 0.5, knockbackFactor: 0.3 },
        { atS: 1.3, shape: 'circle', reachM: 2.0, widthM: 0, damageFactor: 1.0, knockbackFactor: 0.8 },
      ],
      missRecoveryS: 0.35,
    },
    vfx: 'crystal-dual-blades',
    sfx: { cast: 'crystal-grow', release: 'blades-flash', impact: 'blades-cut' },
    look: { palette: CRYSTAL, impact: shards(6, 1.2, 0.1), hitFlash: 0xe9e2ff },
  },
  // A4 (R): Crystal Lance. A long lance out of the oversized forearm, past the fist, in one piercing thrust.
  a4: {
    id: 'crystalLance',
    name: 'Crystal Lance',
    label: 'LANCE',
    description:
      'Grows a long crystal lance from his oversized forearm that reaches far beyond his fist, then thrusts it straight ahead. The thrust goes through everyone in line, each opponent after the first taking 35% less. Long reach and precise, but narrow, it covers nothing to the sides, and a missed thrust leaves him open.',
    icon: 'crystal-lance',
    slot: 'a4',
    staminaCost: 30,
    cooldownS: 12,
    castS: 0.5,
    recoveryS: 0.3,
    aimRangeM: 4.2,
    moveFactor: 0.2,
    interruptible: true,
    payload: { damage: 60, knockbackMps: 8, heavy: true, strength: 800, impact: 'knuckle-heavy' },
    delivery: {
      type: 'weapon',
      weapon: 'lance',
      hits: [{ atS: 0.45, shape: 'line', reachM: 4.2, widthM: 0.45, damageFactor: 1, knockbackFactor: 1 }],
      pierceFalloff: 0.65,
      missRecoveryS: 1.0,
    },
    vfx: 'crystal-lance',
    sfx: { cast: 'crystal-grow', release: 'lance-thrust', impact: 'lance-pierce' },
    look: { palette: CRYSTAL, impact: shards(8, 1.4, 0.3), hitFlash: 0xe9e2ff },
  },
  // A5 (slot R): Crystal Warhammer. The slowest and heaviest: a hammerhead round the fist and an overhead smash with a ring of crystal.
  a5: {
    id: 'crystalWarhammer',
    name: 'Crystal Warhammer',
    label: 'WARHAMMER',
    description:
      'Grows a thick crystal handle from his oversized arm with a heavy hammerhead forming round his fist, then smashes it down overhead in a circular crystal shockwave. Enormous impact and knockback, and it wrecks furniture, but it is the slowest ability to start, he moves slowly, and a miss leaves him open for a long time.',
    icon: 'crystal-warhammer',
    slot: 'a4',
    staminaCost: 36,
    cooldownS: 15,
    castS: 0.9,
    recoveryS: 0.4,
    aimRangeM: 2.2,
    moveFactor: 0.15,
    interruptible: true,
    payload: { damage: 85, knockbackMps: 12, heavy: true, strength: 1800, impact: 'knuckle-heavy', wallDamage: 400 },
    delivery: {
      type: 'weapon',
      weapon: 'warhammer',
      hits: [{ atS: 0.7, shape: 'smash', reachM: 1.9, widthM: 1.0, damageFactor: 1, knockbackFactor: 1 }],
      shockwave: { radiusM: 2.8, damageFactor: 0.6, knockbackFactor: 0.7 },
      missRecoveryS: 1.3,
    },
    vfx: 'crystal-warhammer',
    sfx: { cast: 'crystal-grow', release: 'hammer-lift', impact: 'hammer-smash' },
    look: { palette: CRYSTAL, impact: shards(16, 2.8, 0.55), hitFlash: 0xe9e2ff },
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
