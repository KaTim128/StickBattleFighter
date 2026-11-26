import type { AbilityKit } from '../../abilities/ability-def';
import { chargeFor } from '../../abilities/ultimate-charge';

/**
 * Magix's kit: the master illusionist. Misdirection and chaos rather than raw strength: vanish and strike from nowhere, a rabbit that blows
 * up in confetti, a spinning barrage of exactly 52 cards, Fatal Stitch (a knife on tied scarves that slings him in for a flying kick), a hat full of surprises (one outcome is the old Wand of Misfortune's curse) and one
 * ultimate, Mirror Act, where he becomes the opponent. His own stats are middling; every trick has a counter. Values are PROVISIONAL (OQ-05).
 */
const MAGIC = { deep: 0x1a0f2e, hot: 0x6a2fb0, bright: 0xd9a6ff, core: 0xfff4c2 } as const;
const showy = (ringM: number, extra: { shake?: number } = {}) => ({
  flashM: ringM * 0.5,
  sparks: 14,
  motes: 40,
  ringM,
  smoke: 6,
  groundFire: false,
  smokeColour: 0x3a2a55,
  ...extra,
});

export const MAGIX_KIT: AbilityKit = {
  comboIcon: 'magix-combo',
  heavyIcon: 'wand-flourish',
  // A1: Disappearing Act. A puff of smoke and he is gone: quicker, hard to follow, until the moment he strikes.
  a1: {
    id: 'disappearingAct',
    name: 'Disappearing Act',
    label: 'VANISH',
    description:
      'A puff of smoke and sparkles and he vanishes for up to 4 seconds, 35% faster. Opponents cannot easily track him: they only catch a faint shimmer when he is very close. The moment he lands any attack, the invisibility and the speed end together and he reappears in a burst of smoke.',
    icon: 'disappearing-act',
    slot: 'a1',
    staminaCost: 22,
    cooldownS: 14,
    castS: 0.2,
    recoveryS: 0.25,
    aimRangeM: 0,
    moveFactor: 0.6,
    interruptible: false,
    payload: { damage: 0, knockbackMps: 0, heavy: false, strength: 0 },
    delivery: {
      type: 'buff',
      durationS: 4,
      speedFactor: 1.35,
      damageTakenFactor: 1,
      invisible: true,
      endsOnHit: true,
    },
    vfx: 'magix-vanish',
    sfx: { cast: 'magic-poof', release: 'magic-poof', impact: 'magic-reappear' },
    look: { palette: MAGIC, impact: showy(2), hitFlash: 0xd9a6ff },
  },
  // A2: A Rabbit. He opens his hands, a white rabbit hops out and runs at the nearest opponent, then bursts into confetti.
  a2: {
    id: 'aRabbit',
    name: 'A Rabbit',
    label: 'RABBIT',
    description:
      'Opens his hands and a white rabbit hops out and runs at the nearest opponent. A second after it reaches them it bursts into confetti, hurting and knocking back everyone close. Hitting the rabbit sets it off early, so keep your distance from it and keep your guard up.',
    icon: 'rabbit',
    slot: 'a2',
    staminaCost: 24,
    cooldownS: 13,
    castS: 0.35,
    recoveryS: 0.4,
    aimRangeM: 12,
    moveFactor: 0.3,
    interruptible: true,
    payload: { damage: 0, knockbackMps: 0, heavy: false, strength: 0 },
    delivery: {
      type: 'summon',
      character: 'rabbit',
      count: 1,
      lifeS: 9,
      maxAlive: 1,
      rabbit: { fuseS: 1, armRangeM: 1.3, radiusM: 2.4, damage: 62, knockbackMps: 9, hopSpeedMps: 6.5 },
    },
    vfx: 'magix-rabbit',
    sfx: { cast: 'magic-poof', release: 'rabbit-hop', impact: 'confetti-pop' },
    look: { palette: MAGIC, impact: showy(2.4, { shake: 0.3 }), hitFlash: 0xffd1ec },
  },
  // A3: Card Barrage. Exactly 52 spinning cards fan out toward the opponent, each light, some with extra knockback.
  a3: {
    id: 'cardBarrage',
    name: 'Card Barrage',
    label: 'CARDS',
    description:
      'Fans out a whole deck, exactly 52 cards, one after another toward the opponent. Each card spins on a magic trail and only stings a little, but some of them knock back harder. It stops the moment he is interrupted, and the cards never stun.',
    icon: 'card-barrage',
    slot: 'a3',
    staminaCost: 30,
    cooldownS: 17,
    castS: 0.3,
    recoveryS: 0.4,
    aimRangeM: 12,
    moveFactor: 0.25,
    interruptible: true,
    payload: { damage: 6, knockbackMps: 0.8, heavy: false, strength: 40, impact: 'knuckle-light', noFlinch: true },
    delivery: {
      type: 'cards',
      count: 52,
      durationS: 2.6,
      speedMps: 15,
      spreadRad: 0.5,
      radiusM: 0.28,
      rangeM: 11,
      knockbackChance: 0.2,
      knockbackMps: 3.2,
    },
    vfx: 'magix-cards',
    sfx: { cast: 'card-shuffle', release: 'card-throw', impact: 'card-hit' },
    look: { palette: MAGIC, impact: showy(0.7), hitFlash: 0xffffff },
  },
  // A4: Fatal Stitch (the Reaper Hook redesigned for Magix, owner, 26/11/2026, replacing the Wand of Misfortune, whose curse is now an outcome of the Lucky Hat). A knife on a long line of
  // tied scarves shoots out of his sleeve, bites into the ground past the opponent, and the taut line slings him in for a flying kick.
  a4: {
    id: 'magixReaperHook',
    name: 'Fatal Stitch',
    label: 'STITCH',
    description:
      'Raises his arm and swings it outward: a knife on a long line of knotted scarves shoots out of his sleeve, the scarves unravelling as it flies, and hooks into the ground past the opponent. The line snaps taut and he is slung forward at great speed along it, letting go at the last moment to drive a flying kick into their chest that sends them backwards. Then the scarves gather back into his sleeve.',
    icon: 'scarf-hook',
    slot: 'a4',
    staminaCost: 28,
    cooldownS: 16,
    castS: 0.4,
    recoveryS: 0.5,
    aimRangeM: 10,
    moveFactor: 0,
    interruptible: true,
    payload: { damage: 44, knockbackMps: 8.5, heavy: true, strength: 600, impact: 'knuckle-heavy', falloff: { fullWithinM: 1.2, minFactor: 0.6 } },
    delivery: { type: 'leap', maxRangeM: 10, airS: 0.3, peakM: 0.45, radiusM: 1.5, aimSpeedMps: 5, anchor: { throwRangeM: 11, embedS: 0.16, pastM: 1.6 } },
    vfx: 'scarf-hook',
    sfx: { cast: 'sleeve-rustle', release: 'scarf-whip', impact: 'scarf-kick' },
    look: { palette: MAGIC, scarfChain: true, airBody: 'none', impact: showy(1.8, { shake: 0.4 }), hitFlash: 0xffe08a },
  },
  // A5 (fifth): Lucky Hat. A hand into the hat: a random stat boost, a thrown sword or a bomb.
  a5: {
    id: 'luckyHat',
    name: 'Lucky Hat',
    label: 'HAT',
    description:
      'Reaches into his top hat and pulls out something at random: either 25% more of one of his stats for 10 seconds (movement speed, attack damage, defence, attack range or maximum health, shown above his head), or a sword he throws at the opponent, or a bomb that goes off a moment after it lands, or a glittering bolt of misfortune that, if it hits, seals one random ability of the opponent for 12 seconds. The boost ends by itself and changes nothing for good.',
    icon: 'lucky-hat',
    slot: 'a4',
    staminaCost: 22,
    cooldownS: 15,
    castS: 0.35,
    recoveryS: 0.35,
    aimRangeM: 10,
    moveFactor: 0.3,
    interruptible: true,
    payload: { damage: 0, knockbackMps: 0, heavy: false, strength: 0 },
    delivery: {
      type: 'luckyHat',
      durationS: 10,
      bonus: 0.25,
      sword: { damage: 58, knockbackMps: 6, speedMps: 20 },
      misfortune: { damage: 24, lockS: 12, speedMps: 17, rangeM: 13 },
      bomb: { damage: 70, knockbackMps: 10, radiusM: 2.2, fuseS: 1.1 },
    },
    vfx: 'magix-hat',
    sfx: { cast: 'hat-rummage', release: 'hat-pop', impact: 'hat-reveal' },
    look: { palette: MAGIC, impact: showy(1.8), hitFlash: 0xffe08a },
  },
  // ULT: Mirror Act. Confetti at his feet, a cloud of dust, and he steps out as the opponent.
  ult: {
    id: 'mirrorAct',
    name: 'Mirror Act',
    label: 'ULT',
    description:
      'Throws confetti at the ground, and in the cloud of dust he becomes an exact copy of the opponent for 12 seconds: its look, weapons, moves and normal abilities (not its ultimate), under its own cooldowns, at 90% of its damage. A temporary shield worth 20% of his maximum health soaks hits first and his real health is kept. After 12 seconds, or if he falls, the shield goes and he is Magix again with the health he really has. The opponent is never changed.',
    icon: 'mirror-act',
    slot: 'ult',
    staminaCost: 0,
    cooldownS: 1,
    castS: 0.5,
    recoveryS: 0.5,
    aimRangeM: 0,
    moveFactor: 0,
    interruptible: false,
    payload: { damage: 0, knockbackMps: 0, heavy: false, strength: 0 },
    delivery: { type: 'mirror', dustS: 0.9, durationS: 12, shieldFraction: 0.2, powerFactor: 0.9 },
    vfx: 'magix-mirror',
    sfx: { cast: 'confetti-throw', release: 'mirror-dust', impact: 'mirror-shatter' },
    look: { palette: MAGIC, impact: showy(3, { shake: 0.3 }), hitFlash: 0xffffff },
  },
  charge: chargeFor('mirrorAct'),
};
