import type { Layer } from '../../audio/sound-board';

/**
 * One contact sound for every melee move and the extra ability sounds (master plan B18). Like every
 * sound in the game they are synthesised at runtime and original: each is its own recipe (its own
 * layers, pitches, noise colours and tails), not a re-pitched copy of another. Grouped by fighter
 * character: Inferno (fists, fire, heat), Titan (heavy, low, grinding), Necro (staff wood and
 * spectral tone), Shroud (steel and blood) and the skeleton warriors (dry bone).
 */
const tone = (
  wave: OscillatorType,
  f0: number,
  f1: number,
  dur: number,
  gain: number,
  delay = 0,
  drive?: number,
): Layer => ({ tone: { wave, f0, f1, dur, gain, delay, ...(drive ? { drive } : {}) } });

const noise = (
  type: BiquadFilterType,
  freq: number,
  freqEnd: number | undefined,
  dur: number,
  gain: number,
  q = 1,
  delay = 0,
  extra: { flutter?: number; drive?: number; attack?: number } = {},
): Layer => ({ noise: { type, freq, ...(freqEnd ? { freqEnd } : {}), dur, gain, q, delay, ...extra } });

export const MOVE_RECIPES: Readonly<Record<string, readonly Layer[]>> = {
  // ---------------------------------------------------------------- Inferno: hot knuckles and shin
  'hit-inferno-jab': [
    tone('sine', 190, 80, 0.06, 0.5),
    noise('bandpass', 2600, undefined, 0.04, 0.45, 1.2),
    noise('highpass', 6000, undefined, 0.02, 0.2, 1, 0, { flutter: 40 }),
  ],
  'hit-inferno-straight': [
    tone('sine', 150, 60, 0.09, 0.62),
    noise('bandpass', 1900, 1200, 0.07, 0.5, 1),
    noise('bandpass', 5200, undefined, 0.05, 0.18, 2, 0.01, { flutter: 30 }),
  ],
  'hit-inferno-hook': [
    tone('triangle', 130, 55, 0.12, 0.6),
    noise('bandpass', 1500, 800, 0.1, 0.5, 0.9),
    noise('highpass', 4200, undefined, 0.08, 0.15, 1, 0.02, { flutter: 24 }),
  ],
  'hit-inferno-roundhouse': [
    tone('sine', 110, 45, 0.16, 0.7),
    noise('lowpass', 2200, 500, 0.14, 0.55),
    noise('bandpass', 3400, undefined, 0.05, 0.3, 1.5, 0.02),
  ],
  'hit-inferno-front-kick': [
    tone('sine', 125, 52, 0.12, 0.62),
    noise('lowpass', 1700, 700, 0.09, 0.5),
    noise('highpass', 5500, undefined, 0.03, 0.2),
  ],
  'hit-inferno-side-kick': [
    tone('square', 100, 48, 0.1, 0.34, 0, 0.2),
    noise('bandpass', 1300, 700, 0.1, 0.5, 1.4),
    noise('highpass', 4800, undefined, 0.04, 0.22, 1, 0.01),
  ],
  'hit-inferno-spinning-kick': [
    tone('sine', 95, 40, 0.2, 0.7),
    noise('bandpass', 900, 2600, 0.12, 0.35, 1.8),
    noise('lowpass', 1500, 400, 0.14, 0.5, 1, 0.05),
  ],
  'hit-inferno-jumping-front-kick': [
    tone('sine', 140, 50, 0.14, 0.66),
    noise('lowpass', 2400, 600, 0.1, 0.52),
    noise('bandpass', 2100, 3600, 0.06, 0.3, 2, 0.01, { flutter: 36 }),
  ],
  'hit-inferno-meteor-kick': [
    tone('sine', 88, 34, 0.28, 0.85, 0, 0.3),
    noise('lowpass', 1400, 300, 0.24, 0.6, 1, 0, { flutter: 18, drive: 0.4 }),
    noise('highpass', 3000, undefined, 0.2, 0.25, 1, 0.03, { flutter: 50 }),
  ],
  'hit-inferno-blazing-axe-kick': [
    tone('sawtooth', 120, 44, 0.2, 0.3, 0, 0.5),
    tone('sine', 80, 36, 0.26, 0.8),
    noise('bandpass', 2000, 700, 0.18, 0.5, 1, 0, { flutter: 28 }),
  ],

  // ---------------------------------------------------------------- Titan: heavy, low, grinding
  'hit-titan-hammer-jab': [
    tone('sine', 120, 50, 0.14, 0.75),
    noise('lowpass', 1200, 400, 0.1, 0.55),
    noise('bandpass', 700, undefined, 0.06, 0.3, 0.8),
  ],
  'hit-titan-haymaker': [
    tone('sine', 90, 38, 0.22, 0.9, 0, 0.2),
    noise('lowpass', 1000, 300, 0.18, 0.6, 1, 0.01),
    noise('bandpass', 400, 200, 0.12, 0.3, 0.7, 0.03),
  ],
  'hit-titan-double-hammer': [
    tone('sine', 100, 42, 0.12, 0.8),
    tone('sine', 80, 34, 0.18, 0.85, 0.09),
    noise('lowpass', 900, 300, 0.1, 0.5),
    noise('lowpass', 800, 250, 0.12, 0.5, 1, 0.09),
  ],
  'hit-titan-body-slam': [
    tone('sine', 70, 30, 0.3, 1, 0, 0.3),
    noise('lowpass', 700, 150, 0.28, 0.7),
    noise('bandpass', 250, undefined, 0.2, 0.35, 0.6, 0.02),
  ],
  'hit-titan-sledgehammer': [
    tone('sine', 60, 26, 0.4, 1, 0, 0.45),
    tone('triangle', 180, 60, 0.12, 0.4),
    noise('lowpass', 800, 120, 0.36, 0.75, 1, 0, { drive: 0.5 }),
    noise('highpass', 2500, undefined, 0.05, 0.3),
  ],

  // ---------------------------------------------------------------- Necro: staff wood and spectral tone
  'hit-necro-staff-sweep': [
    noise('bandpass', 1100, 700, 0.09, 0.5, 2.2),
    tone('triangle', 330, 200, 0.12, 0.3),
    tone('sine', 880, 860, 0.2, 0.05, 0.02),
  ],
  'hit-necro-soul-thrust': [
    noise('bandpass', 1700, 1200, 0.06, 0.45, 2.6),
    tone('sine', 220, 110, 0.1, 0.45),
    tone('triangle', 1250, 1000, 0.25, 0.07, 0.01),
  ],
  'hit-necro-grave-slam': [
    tone('sine', 100, 44, 0.2, 0.75),
    noise('lowpass', 900, 250, 0.16, 0.5),
    tone('triangle', 520, 380, 0.3, 0.1, 0.03),
  ],
  'hit-necro-staff-plunge': [
    noise('bandpass', 1400, 500, 0.12, 0.5, 2),
    tone('sine', 150, 60, 0.16, 0.6),
    tone('triangle', 740, 500, 0.22, 0.08, 0.02),
  ],
  'hit-necro-soul-rend': [
    tone('sine', 110, 40, 0.3, 0.8),
    tone('sawtooth', 300, 120, 0.3, 0.14, 0, 0.3),
    noise('bandpass', 1600, 400, 0.26, 0.4, 1.5, 0.02),
    tone('triangle', 960, 600, 0.4, 0.09, 0.05),
  ],

  // ---------------------------------------------------------------- Shroud: five distinct cuts and a stab, then the heavies
  'hit-shroud-knife-slash': [
    noise('bandpass', 4300, 2600, 0.07, 0.5, 1.5),
    tone('sine', 170, 80, 0.07, 0.4),
    noise('highpass', 7000, undefined, 0.03, 0.18),
  ],
  'hit-shroud-backhand-slash': [
    noise('bandpass', 3200, 1800, 0.09, 0.48, 1.9),
    tone('sine', 140, 70, 0.09, 0.42),
    noise('lowpass', 800, 300, 0.08, 0.2, 1, 0.02),
  ],
  'hit-shroud-rising-cut': [
    noise('bandpass', 1800, 4800, 0.1, 0.5, 2.4),
    tone('triangle', 210, 120, 0.1, 0.36),
    tone('sine', 2600, 2400, 0.12, 0.05, 0.02),
  ],
  'hit-shroud-cross-slash': [
    noise('bandpass', 5200, 2200, 0.11, 0.5, 1.3),
    noise('bandpass', 2400, 1400, 0.08, 0.3, 2, 0.03),
    tone('sine', 160, 64, 0.1, 0.45),
  ],
  'hit-shroud-lunging-stab': [
    tone('sine', 120, 46, 0.2, 0.75),
    noise('bandpass', 3000, undefined, 0.05, 0.5, 1.5),
    noise('lowpass', 800, 250, 0.2, 0.35, 1, 0.01),
    tone('triangle', 1900, 1500, 0.2, 0.06, 0.02),
  ],
  'hit-shroud-knife-plunge': [
    noise('bandpass', 2800, 900, 0.1, 0.5, 2),
    tone('sine', 130, 50, 0.18, 0.7),
    noise('highpass', 5500, undefined, 0.03, 0.22, 1, 0.02),
  ],
  'hit-shroud-gutting-stab': [
    tone('sine', 105, 40, 0.26, 0.8),
    noise('bandpass', 2400, 1000, 0.07, 0.5, 1.8),
    noise('lowpass', 600, 180, 0.3, 0.4, 1, 0.02),
    tone('sawtooth', 240, 110, 0.18, 0.12, 0.03, 0.3),
  ],

  // ---------------------------------------------------------------- Skeleton warriors: dry bone
  'hit-skeleton-bone-slash': [
    noise('bandpass', 2000, 900, 0.07, 0.5, 3),
    tone('square', 420, 250, 0.05, 0.22, 0, 0.1),
    tone('sine', 160, 90, 0.07, 0.3),
  ],
  'hit-skeleton-bone-chop': [
    noise('bandpass', 1500, 700, 0.08, 0.55, 3.4),
    tone('square', 330, 190, 0.07, 0.25, 0, 0.1),
    tone('sine', 120, 62, 0.1, 0.4),
  ],

  // ---------------------------------------------------------------- Ability sounds that used to be shared
  // Inferno: Flame Detonation's own point-blank blast; Blue Inferno's ignition and surge.
  'detonation-boom': [
    tone('sine', 82, 32, 0.4, 0.95, 0, 0.3),
    noise('lowpass', 1500, 250, 0.35, 0.7, 1, 0, { flutter: 14, drive: 0.4 }),
    noise('highpass', 3500, undefined, 0.2, 0.25, 1, 0.04, { flutter: 60 }),
  ],
  'blue-gather': [
    tone('triangle', 200, 520, 0.5, 0.18),
    noise('bandpass', 900, 3200, 0.5, 0.25, 2, 0, { attack: 0.3, flutter: 20 }),
  ],
  'blue-ignite': [
    noise('bandpass', 1200, 4200, 0.35, 0.5, 1.2, 0, { flutter: 42 }),
    tone('sine', 400, 900, 0.3, 0.2),
    tone('sine', 90, 50, 0.3, 0.55),
  ],
  'blue-surge': [
    tone('sine', 70, 40, 0.5, 0.8, 0, 0.2),
    noise('bandpass', 2400, 5200, 0.45, 0.35, 1.4, 0.02, { flutter: 55 }),
    tone('triangle', 800, 1700, 0.4, 0.14, 0.05),
  ],
  // Necro: Soul Tether binds and reels.
  'tether-cast': [
    noise('bandpass', 700, 2200, 0.28, 0.35, 2.2),
    tone('triangle', 330, 520, 0.25, 0.2),
    tone('sine', 660, 700, 0.3, 0.06, 0.05),
  ],
  'tether-bind': [
    tone('sine', 190, 90, 0.18, 0.55),
    noise('bandpass', 1800, 700, 0.14, 0.4, 3),
    tone('triangle', 540, 280, 0.4, 0.12, 0.03),
    tone('sine', 280, 520, 0.35, 0.1, 0.12),
  ],
  // Titan: Grapple Slam's grab and slam, Bastion Anchor's plant and shove, Rampage Mode's shock.
  'grab-whoosh': [noise('bandpass', 600, 1300, 0.22, 0.4, 1, 0, { attack: 0.08 }), tone('sine', 150, 90, 0.2, 0.3)],
  'slam-thud': [
    tone('sine', 66, 28, 0.38, 1, 0, 0.35),
    noise('lowpass', 800, 150, 0.3, 0.7),
    noise('bandpass', 300, undefined, 0.15, 0.3, 0.6, 0.02),
  ],
  'anchor-plant': [
    tone('sine', 60, 38, 0.3, 0.8),
    noise('lowpass', 500, 140, 0.28, 0.5),
    tone('triangle', 130, 90, 0.4, 0.15, 0.05),
  ],
  'anchor-shove': [
    tone('sine', 80, 40, 0.24, 0.8),
    noise('lowpass', 1100, 300, 0.2, 0.55),
    noise('highpass', 2800, undefined, 0.04, 0.22),
  ],
  'rage-shock': [
    tone('sine', 62, 30, 0.45, 0.95, 0, 0.5),
    noise('bandpass', 700, 200, 0.4, 0.55, 0.8, 0, { drive: 0.6 }),
    noise('highpass', 3000, undefined, 0.1, 0.3, 1, 0.02),
  ],
  // Shroud: Stalker Lunge's rush and stabs.
  'lunge-rush': [noise('bandpass', 1500, 4500, 0.24, 0.4, 1.4, 0, { attack: 0.06 }), tone('sine', 220, 120, 0.2, 0.18)],
  'lunge-stab': [
    tone('sine', 150, 55, 0.1, 0.6),
    noise('bandpass', 3600, 2200, 0.05, 0.5, 1.6),
    noise('lowpass', 900, 300, 0.12, 0.3, 1, 0.01),
  ],
  // Death Mark (owner, 20/11/2026): a low whispered chant as he crouches, the red sigil burning onto the prey, a
  // soft breath when the stalk holds and his eyes light, a dry snap when it breaks, and the spent charge's cut.
  'mark-chant': [
    noise('bandpass', 450, 900, 0.3, 0.2, 2, 0, { attack: 0.12, flutter: 14 }),
    tone('sine', 90, 70, 0.3, 0.3),
  ],
  'mark-place': [noise('bandpass', 2200, 800, 0.22, 0.3, 1.2, 0, { attack: 0.02 }), tone('sine', 140, 55, 0.35, 0.4)],
  'mark-ready': [tone('sine', 70, 55, 0.5, 0.45), noise('bandpass', 1200, 500, 0.4, 0.18, 1.4, 0.05, { attack: 0.1 })],
  'mark-break': [noise('bandpass', 1800, 600, 0.12, 0.3, 1.5), tone('triangle', 200, 90, 0.14, 0.2)],
  'mark-spent': [
    noise('bandpass', 3000, 1200, 0.1, 0.45, 1.6),
    tone('sine', 160, 50, 0.22, 0.55),
    noise('lowpass', 800, 250, 0.2, 0.25, 1, 0.02),
  ],
  // ---- Vexoris (TD-114): gas, glass and liquid, all low and breathy: no whistles.
  'venom-hiss': [
    noise('bandpass', 1800, 900, 0.34, 0.4, 0.8, 0, { attack: 0.03 }),
    noise('lowpass', 700, 300, 0.3, 0.2, 1, 0.04),
  ],
  'venom-spray-burst': [
    noise('bandpass', 2200, 1000, 0.3, 0.45, 0.9, 0, { attack: 0.02 }),
    noise('lowpass', 1200, 400, 0.26, 0.25, 1, 0.02),
  ],
  'vapor-dash': [noise('bandpass', 900, 1700, 0.26, 0.4, 0.9, 0, { attack: 0.03 }), tone('sine', 90, 120, 0.2, 0.3)],
  'vapor-hit': [noise('bandpass', 1500, 700, 0.16, 0.3, 1), tone('sine', 110, 70, 0.14, 0.25)],
  'filter-seal': [tone('sine', 70, 60, 0.3, 0.4), noise('bandpass', 600, 400, 0.2, 0.3, 1.4, 0.05)],
  'filter-lock': [tone('sine', 140, 110, 0.18, 0.3), noise('lowpass', 800, 300, 0.12, 0.25)],
  'bloom-vent': [
    noise('bandpass', 500, 1500, 0.8, 0.3, 0.9, 0, { attack: 0.5, flutter: 6 }),
    tone('sine', 50, 45, 0.7, 0.4),
  ],
  'toxin-splat': [noise('lowpass', 1400, 400, 0.14, 0.45, 0.8), tone('sine', 130, 60, 0.12, 0.35)],
  'jar-lift': [noise('bandpass', 700, 500, 0.18, 0.2, 1.2, 0, { attack: 0.06 }), tone('sine', 110, 90, 0.2, 0.2)],
  'jar-throw': [noise('bandpass', 1100, 700, 0.22, 0.32, 0.9, 0, { attack: 0.04 })],
  'jar-shatter': [
    noise('bandpass', 2600, 1400, 0.1, 0.5, 1.2),
    noise('lowpass', 1500, 300, 0.4, 0.35, 0.8, 0.03),
    tone('sine', 120, 55, 0.2, 0.4),
  ],
  'trap-set': [tone('sine', 150, 70, 0.16, 0.45), noise('lowpass', 900, 300, 0.12, 0.3)],
  'trap-vent': [noise('bandpass', 1500, 800, 0.7, 0.35, 0.8, 0, { attack: 0.08 }), tone('sine', 80, 60, 0.5, 0.2)],
  'vapor-puff': [noise('bandpass', 1300, 600, 0.3, 0.38, 0.8, 0, { attack: 0.02 }), tone('sine', 100, 70, 0.18, 0.25)],
  'filter-hum': [tone('sine', 90, 100, 0.5, 0.3), noise('bandpass', 800, 800, 0.4, 0.14, 1.4, 0, { attack: 0.15 })],
  'bloom-build': [
    tone('sine', 55, 48, 0.7, 0.5),
    noise('bandpass', 600, 1200, 0.7, 0.25, 1, 0, { attack: 0.4, flutter: 8 }),
  ],
  'bloom-burst': [
    tone('sine', 70, 38, 0.8, 0.7),
    noise('bandpass', 1600, 500, 0.9, 0.5, 0.7, 0, { attack: 0.02 }),
    noise('lowpass', 900, 200, 0.7, 0.35, 1, 0.05),
  ],
};
