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
      'Every attack and ability that lands builds resonance. At 6, his next sonic ability is 30% stronger, and the resonance is spent.',
    maxStacks: 6,
    durationS: 0,
    speedPerStack: 0,
    mastery: { threshold: 6, damageFactor: 1.3, windowS: 3 },
  },
  // A1 (Q): Sonic Boom. A wide wave of sound that rolls forward through everyone in its path.
  a1: {
    id: 'sonicBoom',
    name: 'Sonic Boom',
    label: 'BOOM',
    description:
      'Releases a powerful forward sonic shockwave. It rolls on through the battlefield, damaging and shoving every opponent in its path.',
    icon: 'sonic-boom',
    slot: 'a1',
    staminaCost: 26,
    cooldownS: 7,
    castS: 0.35,
    recoveryS: 0.4,
    aimRangeM: 9,
    moveFactor: 0.2,
    interruptible: true,
    payload: { damage: 44, knockbackMps: 6, heavy: true, strength: 520, impact: 'knuckle-heavy', sonic: true },
    delivery: { type: 'projectile', speedMps: 13, radiusM: 0.75, maxRangeM: 9, pierce: true },
    vfx: 'sonic-boom',
    sfx: { cast: 'sonic-charge', release: 'boom-launch', impact: 'boom-hit' },
    look: {
      palette: SONIC,
      charge: { gatherRadiusM: 1.0, motesPerS: 60, coreMaxM: 0.3 },
      flight: { trailPerS: 30, sparksPerS: 8, shimmer: true, wave: true },
      impact: { flashM: 0.9, sparks: 16, motes: 14, ringM: 1.6, smoke: 0, groundFire: false, shake: 0.2 },
      hitFlash: 0xbdf4ff,
    },
  },
  // A2 (E): Vibration Punch. One fist shaking with high-frequency energy, a short and brutal blow.
  a2: {
    id: 'vibrationPunch',
    name: 'Vibration Punch',
    label: 'PUNCH',
    description:
      'Concentrates high-frequency vibrations into one fist and drives it into whatever is in front of him, a powerful close-range impact.',
    icon: 'vibration-punch',
    slot: 'a2',
    staminaCost: 28,
    cooldownS: 9,
    castS: 0.45,
    recoveryS: 0.45,
    aimRangeM: 2,
    moveFactor: 0.1,
    interruptible: true,
    payload: { damage: 68, knockbackMps: 10, heavy: true, strength: 800, impact: 'knuckle-heavy', sonic: true },
    delivery: { type: 'strike', reachM: 1.9, radiusM: 0.75 },
    vfx: 'vibration-punch',
    sfx: { cast: 'sonic-charge', release: 'vib-release', impact: 'vib-impact' },
    look: {
      palette: SONIC,
      impact: { flashM: 1.1, sparks: 22, motes: 12, ringM: 1.8, smoke: 0, groundFire: false, shake: 0.4 },
      hitFlash: 0xeafcff,
    },
  },
  // A3 (F): Resonance Barrier. A sonic bubble that ripples where it is struck and shatters in a burst of sound when spent.
  a3: {
    id: 'resonanceBarrier',
    name: 'Resonance Barrier',
    label: 'BARRIER',
    description:
      'Generates a circular sonic barrier around his body that absorbs up to 60 damage over 5 seconds. Sound-wave distortions spread across it wherever it is hit, and it shatters in a burst of sound when it is spent.',
    icon: 'resonance-barrier',
    slot: 'a3',
    staminaCost: 24,
    cooldownS: 15,
    castS: 0.3,
    recoveryS: 0.3,
    aimRangeM: 0,
    moveFactor: 0.5,
    interruptible: true,
    payload: { damage: 0, knockbackMps: 0, heavy: false, strength: 0 },
    delivery: { type: 'barrier', hp: 60, durationS: 5 },
    vfx: 'resonance-barrier',
    sfx: { cast: 'sonic-charge', release: 'sonic-barrier-up', impact: 'sonic-barrier-hit' },
    look: {
      palette: SONIC,
      barrierStyle: 'sonic',
      impact: { flashM: 0.6, sparks: 8, motes: 10, ringM: 1.3, smoke: 0, groundFire: false },
    },
  },
  // A4 (R): Resonance Dash. Sound packed round his body, a short burst forward, leaving rings of distortion behind.
  a4: {
    id: 'resonanceDash',
    name: 'Resonance Dash',
    label: 'DASH',
    description:
      'Compresses sound energy around himself and bursts forward, leaving a trail of widening distortion rings behind him.',
    icon: 'resonance-dash',
    slot: 'a4',
    staminaCost: 24,
    cooldownS: 8,
    castS: 0.2,
    recoveryS: 0.25,
    aimRangeM: 6,
    moveFactor: 0,
    interruptible: true,
    payload: { damage: 0, knockbackMps: 0, heavy: false, strength: 0 },
    delivery: { type: 'dash', distanceM: 5.5, speedMps: 22, hitRadiusM: 0 },
    vfx: 'resonance-dash',
    sfx: { cast: 'sonic-charge', release: 'sonic-dash', impact: 'sonic-dash-end' },
    look: {
      palette: SONIC,
      flight: { trailPerS: 40, sparksPerS: 10, shimmer: true, wave: true },
      impact: { flashM: 0.5, sparks: 10, motes: 8, ringM: 1.0, smoke: 0, groundFire: false },
    },
  },
  // A5 (slot F): Feedback Pulse. A short ring of vibration: it shoves everyone near away and scrambles which way they move for a
  // moment. It never stuns and never cancels an attack.
  a5: {
    id: 'feedbackPulse',
    name: 'Feedback Pulse',
    label: 'PULSE',
    description:
      'Emits a short circular vibration pulse round his body. It pushes nearby opponents away and for a moment makes the direction they move waver. It does little damage and never stuns.',
    icon: 'feedback-pulse',
    slot: 'a3',
    staminaCost: 22,
    cooldownS: 10,
    castS: 0.35,
    recoveryS: 0.35,
    aimRangeM: 0,
    moveFactor: 0.3,
    interruptible: true,
    payload: {
      damage: 16,
      knockbackMps: 8,
      heavy: false,
      strength: 300,
      impact: 'knuckle-light',
      noFlinch: true,
      sonic: true,
      disrupt: { durationS: 1.5 },
    },
    delivery: { type: 'nova', radiusM: 2.8, telegraphS: 0.3 },
    vfx: 'feedback-pulse',
    sfx: { cast: 'sonic-charge', release: 'pulse-emit', impact: 'pulse-hit' },
    look: {
      palette: SONIC,
      telegraph: 'rings',
      impact: { flashM: 0.9, sparks: 10, motes: 10, ringM: 2.8, smoke: 0, groundFire: false, rings: 2 },
      hitFlash: 0xbdf4ff,
    },
  },
  // Ultimate: Shatterwave. A great expanding sonic explosion: ring after ring, and a final bursting impact that hurls everyone away.
  ult: {
    id: 'shatterwave',
    name: 'Shatterwave',
    label: 'SHATTER',
    description:
      'Gathers sound until the air itself trembles, then releases an expanding circular sonic explosion in rings. It damages everyone around him and hurls them away.',
    icon: 'shatterwave',
    slot: 'ult',
    staminaCost: 0,
    cooldownS: 0,
    castS: 0.8,
    recoveryS: 0.8,
    aimRangeM: 0,
    moveFactor: 0,
    interruptible: false,
    payload: {
      damage: 90,
      knockbackMps: 14,
      heavy: true,
      strength: 1000,
      impact: 'knuckle-heavy',
      sonic: true,
      falloff: { fullWithinM: 1.5, minFactor: 0.55 },
    },
    delivery: { type: 'nova', radiusM: 5.5, telegraphS: 1.0 },
    vfx: 'shatterwave',
    sfx: { cast: 'sonic-charge', release: 'shatter-start', impact: 'shatterwave-blast' },
    look: {
      palette: SONIC,
      telegraph: 'rings',
      impact: { flashM: 2.4, sparks: 40, motes: 30, ringM: 5.5, smoke: 0, groundFire: false, shake: 0.6, rings: 4 },
      hitFlash: 0xeafcff,
    },
  },
  charge: chargeFor('shatterwave'),
};
