import type { AbilityKit } from '../../abilities/ability-def';
import { chargeFor } from '../../abilities/ultimate-charge';

/**
 * Reson's kit (master plan section 4, fighter 4): a sonic and vibration specialist. Every damaging ability is `sonic`, so
 * Resonance can sharpen the next one. Values are PROVISIONAL (OQ-05).
 */
const SONIC = { deep: 0x0a3a4a, hot: 0x19c4e0, bright: 0x7ae8ff, core: 0xeafcff } as const;

export const RESON_KIT: AbilityKit = {
  comboIcon: 'sonic-combo',
  heavyIcon: 'gauntlet-blast',
  passive: {
    id: 'resonance',
    name: 'Resonance',
    description:
      'Every attack and ability that lands builds resonance. At 4, his next sonic ability is 35% stronger, and the resonance is spent.',
    maxStacks: 4,
    durationS: 0,
    speedPerStack: 0,
    mastery: { threshold: 4, damageFactor: 1.35, windowS: 3 },
  },
  // A1 (Q): Sonic Boom. He roars for three seconds, rooted, sending rings of sound out toward the enemy. Anyone it connects with is
  // interrupted once; it no longer pins them (owner, 20/11/2026), and he steers it like Fire Beam.
  a1: {
    id: 'sonicBoom',
    name: 'Sonic Boom',
    label: 'SCREAM',
    description:
      'Takes a deep breath and unleashes a powerful voice screech for 3 seconds, sending rings of sound toward the enemy. A wide wave that he steers with the mouse or a swipe while it pours. Opponents it hits are interrupted once but can still move freely. He stays rooted while he screams.',
    icon: 'sonic-boom',
    slot: 'a1',
    staminaCost: 32,
    cooldownS: 10,
    castS: 0.5,
    recoveryS: 0.6, // the scream holds the cast open while it lasts; this is only the tail after it ends
    aimRangeM: 8.5,
    moveFactor: 0,
    interruptible: true,
    breaksOnHit: true,
    payload: {
      damage: 18,
      knockbackMps: 0.8,
      heavy: false,
      strength: 160,
      impact: 'knuckle-light',
      sonic: true,
      falloff: { fullWithinM: 2, minFactor: 0.6 },
    },
    delivery: { type: 'beam', rangeM: 8.5, widthM: 4.5, durationS: 3, tickS: 0.3, turnRadPerS: 3.5, scream: true },
    vfx: 'sonic-boom',
    sfx: { cast: 'scream-breath', release: 'sonic-scream', impact: 'scream-hit' },
    look: {
      palette: SONIC,
      beamStyle: 'scream',
      shout: 'scream',
      impact: { flashM: 0.6, sparks: 8, motes: 8, ringM: 1.2, smoke: 0, groundFire: false },
      hitFlash: 0xbdf4ff,
    },
  },
  // A2 (E): Vibration Punch. One fist shaking with high-frequency energy, a short and brutal blow.
  a2: {
    id: 'vibrationPunch',
    name: 'Vibration Punch',
    label: 'PUNCH',
    description:
      'Concentrates high-frequency vibrations into one fist and drives it into whatever is in front of him, a powerful punch that launches the opponent backwards. Lighter opponents are launched much further than heavier ones.',
    icon: 'vibration-punch',
    slot: 'a2',
    staminaCost: 28,
    cooldownS: 7,
    castS: 0.45,
    recoveryS: 0.45,
    aimRangeM: 2,
    moveFactor: 0.1,
    interruptible: true,
    payload: {
      damage: 117,
      knockbackMps: 15,
      heavy: true,
      strength: 900,
      impact: 'knuckle-heavy',
      sonic: true,
      knockbackByWeight: { refKg: 70, minK: 0.5, maxK: 1.6 },
    },
    delivery: { type: 'strike', reachM: 1.9, radiusM: 0.75 },
    vfx: 'vibration-punch',
    sfx: { cast: 'sonic-charge', release: 'vib-release', impact: 'vib-impact' },
    look: {
      palette: SONIC,
      impact: { flashM: 1.1, sparks: 22, motes: 12, ringM: 1.8, smoke: 0, groundFire: false, shake: 0.4 },
      hitFlash: 0xeafcff,
    },
  },
  // A3 (F): Harmonic Shield. A sonic bubble that soaks 90 damage over 5 seconds and throws 40 % of everything it soaks back at whoever struck
  // it, so attacking him through it hurts. It ripples where it is struck and shatters in a burst of sound when it is spent.
  a3: {
    id: 'harmonicShield',
    name: 'Harmonic Shield',
    label: 'SHIELD',
    description:
      'Generates a circular sonic barrier around his body that absorbs up to 90 damage over 5 seconds and throws 40% of what it absorbs back at whoever struck it. Sound-wave distortions spread across it wherever it is hit, and it shatters in a burst of sound when it is spent.',
    icon: 'resonance-barrier',
    slot: 'a3',
    staminaCost: 24,
    cooldownS: 14,
    castS: 0.3,
    recoveryS: 0.3,
    aimRangeM: 0,
    moveFactor: 0.5,
    interruptible: true,
    payload: { damage: 0, knockbackMps: 0, heavy: false, strength: 0 },
    delivery: { type: 'barrier', hp: 90, durationS: 5, reflect: 0.4 },
    vfx: 'resonance-barrier',
    sfx: { cast: 'sonic-charge', release: 'sonic-barrier-up', impact: 'sonic-barrier-hit' },
    look: {
      palette: SONIC,
      barrierStyle: 'sonic',
      impact: { flashM: 0.6, sparks: 8, motes: 10, ringM: 1.3, smoke: 0, groundFire: false },
    },
  },
  // A4 (R): Resonance Break. A thin, piercing screech sent at the nearest enemy ahead. It mutes them and shatters their defence for 4 s.
  a4: {
    id: 'resonanceBreak',
    name: 'Resonance Break',
    label: 'BREAK',
    description:
      'Lets out a high-pitched screech that flies at the enemy ahead. It mutes them for 4 seconds, so they cannot use abilities, and cuts their defence by 30% for the same time. Blows, blocking and dodging still work.',
    icon: 'resonance-break',
    slot: 'a4',
    staminaCost: 26,
    cooldownS: 14,
    castS: 0.4,
    recoveryS: 0.45,
    aimRangeM: 7,
    moveFactor: 0.1,
    interruptible: true,
    payload: {
      damage: 39,
      knockbackMps: 3,
      heavy: false,
      strength: 220,
      impact: 'knuckle-light',
      sonic: true,
      mute: { durationS: 4 },
      shatter: { durationS: 4, defenceFactor: 0.7 },
    },
    delivery: { type: 'projectile', speedMps: 22, radiusM: 0.55, maxRangeM: 7.5 },
    vfx: 'resonance-break',
    sfx: { cast: 'screech-inhale', release: 'screech-release', impact: 'screech-hit' },
    look: {
      palette: SONIC,
      shout: 'screech',
      flight: { trailPerS: 40, sparksPerS: 12, shimmer: true, wave: true, screech: true },
      impact: { flashM: 1.0, sparks: 26, motes: 14, ringM: 1.8, smoke: 0, groundFire: false, shake: 0.25, rings: 3 },
      hitFlash: 0xeafcff,
    },
  },
  // A5 (slot F): Feedback Pulse. A short ring of vibration: it shoves everyone near away and scrambles which way they move for a
  // moment. It never stuns and never cancels an attack.
  a5: {
    id: 'dissonance',
    name: 'Dissonance',
    label: 'DISSONANCE',
    description:
      'Sends clashing frequencies through everyone within 3.2 metres. They are not pushed or stunned, but for 3.5 seconds the way they move wobbles off course, so they cannot walk a straight line.',
    icon: 'dissonance',
    slot: 'a3',
    staminaCost: 22,
    cooldownS: 10,
    castS: 0.35,
    recoveryS: 0.35,
    aimRangeM: 0,
    moveFactor: 0.3,
    interruptible: true,
    payload: {
      damage: 24,
      knockbackMps: 0,
      heavy: false,
      strength: 200,
      impact: 'knuckle-light',
      noFlinch: true,
      sonic: true,
      disrupt: { durationS: 3.5 },
    },
    delivery: { type: 'nova', radiusM: 3.2, telegraphS: 0.3 },
    vfx: 'dissonance',
    sfx: { cast: 'sonic-charge', release: 'pulse-emit', impact: 'pulse-hit' },
    look: {
      palette: SONIC,
      telegraph: 'rings',
      impact: { flashM: 0.9, sparks: 10, motes: 10, ringM: 2.8, smoke: 0, groundFire: false, rings: 2 },
      hitFlash: 0xbdf4ff,
    },
  },
  // Ultimate: Shatterwave. A straight line of sonic fractures runs away across the floor, each bursting in turn and hurling what it catches.
  ult: {
    id: 'shatterwave',
    name: 'Shatterwave',
    label: 'SHATTER',
    description:
      'Gathers sound until the floor itself trembles, then sends a line of sonic fractures racing away along the ground in front of him. Each fracture bursts in turn, damaging and hurling anyone it catches.',
    icon: 'shatterwave',
    slot: 'ult',
    staminaCost: 0,
    cooldownS: 0,
    castS: 0.8,
    recoveryS: 0.8,
    aimRangeM: 8,
    moveFactor: 0,
    interruptible: false,
    payload: {
      damage: 74,
      knockbackMps: 8,
      heavy: true,
      strength: 1000,
      impact: 'knuckle-heavy',
      sonic: true,
    },
    delivery: {
      type: 'eruptions',
      count: 7,
      radiusM: 1.4,
      warnS: 0.9,
      staggerS: 0.13,
      spreadM: 0,
      line: { startM: 1.4 },
    },
    vfx: 'shatterwave',
    sfx: { cast: 'sonic-charge', release: 'shatter-start', impact: 'shatterwave-blast' },
    look: {
      palette: SONIC,
      telegraph: 'rings',
      impact: { flashM: 1.2, sparks: 16, motes: 12, ringM: 1.6, smoke: 0, groundFire: false, shake: 0.25, rings: 2 },
      hitFlash: 0xeafcff,
    },
  },
  charge: chargeFor('shatterwave'),
};
