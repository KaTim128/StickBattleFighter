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
  // The jar smashed on someone: glass cracking, a wet splash, a low thump and a hiss of vapour.
  'hit-vexoris-jar-smash': [
    noise('bandpass', 3200, 1800, 0.07, 0.5, 1.4),
    noise('lowpass', 1500, 400, 0.22, 0.42, 0.8, 0.02),
    tone('sine', 110, 50, 0.2, 0.55),
    noise('bandpass', 1400, 700, 0.5, 0.18, 0.9, 0.1, { attack: 0.05 }),
  ],
  // Aerion's wind: airy whooshes, the beat of wings, a rushing roar for the storm.
  'hit-aerion-wing-smash': [
    noise('bandpass', 2400, 900, 0.16, 0.5, 1),
    tone('sine', 120, 55, 0.22, 0.55),
    noise('lowpass', 1800, 300, 0.4, 0.3, 0.8, 0.04),
  ],
  'wing-flap': [noise('bandpass', 700, 450, 0.2, 0.3, 0.9, 0, { attack: 0.05 }), tone('sine', 90, 70, 0.16, 0.2)],
  'sky-launch': [
    noise('bandpass', 600, 2200, 0.34, 0.42, 0.9, 0, { attack: 0.06 }),
    tone('sine', 120, 220, 0.22, 0.25),
  ],
  'wind-burst': [
    noise('lowpass', 2200, 200, 0.55, 0.62, 0.7),
    tone('sine', 100, 38, 0.4, 0.55),
    noise('bandpass', 3000, 1200, 0.2, 0.35, 1),
  ],
  'blade-whoosh': [noise('bandpass', 2600, 1200, 0.22, 0.35, 1.6, 0, { attack: 0.02 })],
  'blade-cut': [noise('bandpass', 3400, 1800, 0.1, 0.4, 1.8), tone('triangle', 900, 500, 0.08, 0.2)],
  'wind-gather': [
    noise('bandpass', 500, 1400, 0.5, 0.28, 1, 0, { attack: 0.3, flutter: 5 }),
    tone('sine', 80, 120, 0.4, 0.2),
  ],
  'cyclone-spin': [noise('bandpass', 700, 1500, 0.7, 0.34, 1.1, 0, { attack: 0.15, flutter: 9 })],
  'cyclone-fling': [noise('bandpass', 1800, 400, 0.4, 0.5, 0.9), tone('sine', 140, 60, 0.3, 0.45)],
  'tailwind-rush': [noise('bandpass', 800, 2400, 0.45, 0.38, 0.9, 0, { attack: 0.1 })],
  'guard-fold': [noise('lowpass', 1400, 500, 0.2, 0.3, 0.9), tone('sine', 110, 80, 0.16, 0.3)],
  'tempest-volley': [noise('bandpass', 2000, 900, 0.35, 0.4, 1.2, 0, { attack: 0.03 }), tone('sine', 70, 55, 0.3, 0.3)],
  'tempest-dive': [
    noise('lowpass', 2600, 150, 0.8, 0.75, 0.7),
    tone('sine', 80, 30, 0.6, 0.65),
    noise('bandpass', 3200, 1000, 0.3, 0.4, 1, 0.05),
  ],
  // Kenshiro's steel: clean, bright sword sounds, with long silences around them.
  'hit-kenshiro-overhead': [
    noise('bandpass', 3400, 1500, 0.1, 0.5, 1.8),
    tone('sine', 130, 55, 0.2, 0.55),
    tone('triangle', 1400, 900, 0.12, 0.25),
  ],
  'katana-draw': [
    noise('bandpass', 4200, 2600, 0.16, 0.34, 2.2, 0, { attack: 0.02 }),
    tone('triangle', 2400, 3200, 0.1, 0.15),
  ],
  'katana-ready': [tone('triangle', 1800, 1700, 0.08, 0.2), noise('bandpass', 3000, 2800, 0.08, 0.15, 2)],
  'slide-slice': [
    noise('bandpass', 1200, 3800, 0.22, 0.4, 1.2, 0, { attack: 0.02 }),
    noise('lowpass', 900, 300, 0.2, 0.25, 0.9),
  ],
  'slice-hit': [
    noise('bandpass', 3600, 1600, 0.1, 0.5, 1.8),
    tone('triangle', 1700, 650, 0.1, 0.22),
    tone('sine', 100, 50, 0.14, 0.3),
  ],
  'katana-cut-1': [noise('bandpass', 3600, 1800, 0.1, 0.38, 2)],
  'katana-cut-2': [noise('bandpass', 4200, 2200, 0.09, 0.38, 2.2)],
  'katana-cut-3': [noise('bandpass', 3000, 1500, 0.11, 0.38, 1.8)],
  'katana-hit': [
    noise('bandpass', 3800, 1700, 0.08, 0.5, 1.6),
    tone('triangle', 1600, 700, 0.1, 0.22),
    tone('sine', 120, 60, 0.12, 0.35),
  ],
  'parry-counter': [
    noise('bandpass', 4000, 1400, 0.12, 0.55, 1.8),
    tone('triangle', 2200, 900, 0.14, 0.3),
    tone('sine', 100, 45, 0.25, 0.55),
  ],
  'tempest-hit': [noise('bandpass', 3400, 1600, 0.07, 0.42, 1.6), tone('triangle', 1500, 800, 0.08, 0.2)],
  'iaido-hit': [
    noise('bandpass', 4600, 2000, 0.1, 0.5, 2),
    tone('triangle', 2000, 800, 0.1, 0.25),
    tone('sine', 110, 55, 0.14, 0.4),
  ],
  'parry-stance': [tone('triangle', 900, 880, 0.12, 0.22), noise('bandpass', 2600, 2400, 0.12, 0.18, 2)],
  'focus-breath': [noise('lowpass', 700, 400, 0.5, 0.2, 0.9, 0, { attack: 0.25 }), tone('sine', 110, 100, 0.5, 0.15)],
  'iaido-draw': [
    noise('bandpass', 1500, 5200, 0.18, 0.5, 1.4, 0, { attack: 0.01 }),
    tone('triangle', 1200, 3000, 0.1, 0.2),
  ],
  'judgement-cut': [noise('bandpass', 4400, 2000, 0.06, 0.34, 2.2), tone('triangle', 2600, 1600, 0.05, 0.14)],
  'judgement-land': [
    noise('bandpass', 4000, 1200, 0.3, 0.6, 1.4),
    tone('sine', 90, 35, 0.5, 0.65),
    tone('triangle', 1800, 600, 0.3, 0.3),
    noise('lowpass', 1500, 200, 0.5, 0.4, 0.8, 0.05),
  ],
  // Psion's mind: low pulsing hums, glassy compressions, soft thuds of released force.
  'hit-psion-force-wave': [
    tone('sine', 90, 40, 0.4, 0.6),
    noise('lowpass', 1800, 200, 0.5, 0.4, 0.8),
    tone('triangle', 800, 300, 0.25, 0.25),
  ],
  'psi-gather': [
    tone('sine', 140, 260, 0.45, 0.25),
    tone('triangle', 420, 520, 0.4, 0.14),
    noise('bandpass', 1200, 2200, 0.4, 0.12, 2, 0, { attack: 0.25 }),
  ],
  'psi-compress': [tone('sine', 260, 90, 0.45, 0.35), noise('bandpass', 2400, 600, 0.45, 0.2, 1.4, 0, { attack: 0.2 })],
  'psi-crush': [
    tone('sine', 110, 40, 0.35, 0.65),
    noise('lowpass', 2000, 250, 0.4, 0.5, 0.8),
    tone('triangle', 900, 260, 0.2, 0.3),
  ],
  'psi-lift': [tone('sine', 160, 360, 0.5, 0.3), noise('bandpass', 900, 1800, 0.45, 0.14, 1.6, 0, { attack: 0.15 })],
  'prison-lift': [
    tone('sine', 120, 300, 0.7, 0.28),
    tone('triangle', 600, 900, 0.5, 0.12),
    noise('bandpass', 700, 1500, 0.6, 0.12, 1.6, 0, { attack: 0.3 }),
  ],
  'psi-hurl': [noise('bandpass', 1800, 500, 0.3, 0.5, 1), tone('sine', 120, 50, 0.3, 0.55)],
  'psi-rupture': [noise('bandpass', 400, 2600, 0.35, 0.4, 1.4, 0, { attack: 0.05 }), tone('sine', 90, 220, 0.4, 0.5)],
  'psi-rupture-hit': [
    tone('sine', 150, 40, 0.4, 0.7),
    noise('bandpass', 2200, 500, 0.3, 0.55, 1.2),
    tone('triangle', 600, 200, 0.2, 0.3),
  ],
  'psi-drop': [tone('sine', 140, 60, 0.25, 0.4), noise('lowpass', 1200, 300, 0.2, 0.3, 0.9)],
  'barrier-up': [tone('sine', 200, 480, 0.4, 0.3), tone('triangle', 800, 1200, 0.3, 0.14)],
  'barrier-hit': [tone('triangle', 1400, 800, 0.12, 0.25), noise('bandpass', 3000, 1500, 0.1, 0.25, 2)],
  'barrier-break': [
    noise('bandpass', 3400, 1200, 0.3, 0.45, 1.6),
    tone('triangle', 1800, 400, 0.3, 0.3),
    tone('sine', 120, 50, 0.25, 0.4),
  ],
  'repulse-burst': [noise('lowpass', 2200, 200, 0.4, 0.6, 0.8), tone('sine', 100, 38, 0.35, 0.6)],
  'mindstorm-launch': [noise('bandpass', 2000, 800, 0.2, 0.32, 1.4), tone('sine', 150, 90, 0.15, 0.25)],
  'mindstorm-blast': [
    noise('lowpass', 2600, 150, 0.9, 0.8, 0.7),
    tone('sine', 80, 30, 0.7, 0.7),
    tone('triangle', 1200, 300, 0.4, 0.3),
  ],
  // Geargrind's workshop: servo whines, metal clanks, pneumatic hisses, hydraulic thumps.
  'hit-geargrind-smash': [
    tone('sine', 80, 34, 0.45, 0.7),
    noise('bandpass', 1400, 300, 0.35, 0.5, 1.2),
    tone('square', 220, 90, 0.18, 0.22, 0, 3),
    noise('highpass', 5000, 3000, 0.08, 0.3, 1, 0.02),
  ],
  'gear-spool': [tone('sawtooth', 180, 520, 0.4, 0.14), noise('bandpass', 2600, 4200, 0.4, 0.1, 3, 0, { attack: 0.2 })],
  'fist-launch': [
    noise('bandpass', 1800, 700, 0.25, 0.45, 1.1),
    tone('square', 400, 120, 0.12, 0.25, 0, 2),
    tone('sine', 110, 60, 0.2, 0.4),
  ],
  'fist-slam': [
    tone('sine', 100, 40, 0.3, 0.65),
    noise('highpass', 3500, 1800, 0.12, 0.4, 1.4),
    tone('square', 300, 140, 0.1, 0.18, 0, 2),
  ],
  'drone-deploy': [
    tone('triangle', 300, 900, 0.3, 0.2),
    noise('bandpass', 3000, 5000, 0.25, 0.14, 4),
    tone('sine', 90, 140, 0.2, 0.2),
  ],
  'drone-fire': [tone('square', 1500, 600, 0.06, 0.18, 0, 2), noise('highpass', 6000, 3500, 0.04, 0.16)],
  'drone-hit': [noise('bandpass', 4200, 2000, 0.1, 0.3, 2.4), tone('triangle', 900, 300, 0.1, 0.2)],
  'mine-clamp': [
    tone('square', 180, 90, 0.12, 0.26, 0, 3),
    noise('highpass', 4000, 2500, 0.1, 0.3),
    tone('sine', 70, 50, 0.15, 0.3),
  ],
  'mine-burst': [
    tone('sine', 120, 38, 0.5, 0.7),
    noise('lowpass', 2800, 300, 0.45, 0.6, 0.8),
    tone('sawtooth', 900, 120, 0.3, 0.25, 0.02),
    noise('highpass', 5000, 2000, 0.15, 0.35, 1, 0.05),
  ],
  'plating-lock': [
    tone('square', 260, 130, 0.08, 0.3, 0, 3),
    noise('highpass', 4500, 2500, 0.07, 0.34),
    tone('square', 200, 100, 0.08, 0.3, 0.12, 3),
    noise('highpass', 4500, 2500, 0.07, 0.34, 1, 0.12),
    tone('sine', 90, 55, 0.2, 0.45, 0.25),
  ],
  'coil-charge': [
    tone('sawtooth', 120, 900, 0.3, 0.16),
    noise('bandpass', 3000, 7000, 0.3, 0.12, 2, 0, { attack: 0.2 }),
  ],
  'coil-discharge': [
    noise('bandpass', 5000, 1500, 0.3, 0.5, 0.9),
    tone('sawtooth', 1800, 200, 0.25, 0.3, 0, 2),
    tone('sine', 90, 50, 0.2, 0.45),
  ],
  'coil-zap': [noise('highpass', 6500, 3000, 0.14, 0.4, 1.2), tone('square', 2400, 800, 0.1, 0.22, 0, 2)],
  'overdrive-start': [
    tone('sawtooth', 70, 360, 0.7, 0.22),
    noise('bandpass', 800, 3600, 0.7, 0.18, 2, 0, { attack: 0.4 }),
    tone('square', 120, 240, 0.5, 0.1, 0.1, 1),
  ],
  'overdrive-rush': [noise('bandpass', 1500, 500, 0.4, 0.5, 1), tone('sawtooth', 240, 100, 0.35, 0.3, 0, 2)],
  'overdrive-hit-1': [tone('sine', 110, 50, 0.22, 0.6), noise('highpass', 3500, 2000, 0.1, 0.4)],
  'overdrive-hit-2': [
    tone('sine', 130, 55, 0.22, 0.6),
    noise('highpass', 4200, 2400, 0.1, 0.4),
    tone('square', 360, 160, 0.08, 0.2, 0, 2),
  ],
  'overdrive-hit-3': [
    tone('sine', 150, 60, 0.24, 0.65),
    noise('bandpass', 2400, 800, 0.16, 0.45, 1.3),
    tone('triangle', 700, 220, 0.1, 0.22),
  ],
  'overdrive-blast': [
    tone('sine', 70, 26, 0.8, 0.85),
    noise('lowpass', 3200, 180, 0.8, 0.8, 0.7),
    tone('sawtooth', 1100, 100, 0.45, 0.3),
    noise('highpass', 5500, 2200, 0.25, 0.4, 1, 0.04),
  ],
  // Reson's scream: a breath in, three seconds of a roaring, wavering voice with a rough edge, a gritty crackle where it connects.
  'scream-breath': [
    noise('bandpass', 600, 1800, 0.5, 0.25, 1.4, 0, { attack: 0.35 }),
    tone('sine', 140, 300, 0.5, 0.18),
  ],
  'sonic-scream': [
    tone('sawtooth', 420, 560, 3.0, 0.22, 0, 3),
    tone('sawtooth', 840, 1130, 3.0, 0.1, 0, 2),
    tone('square', 210, 280, 3.0, 0.1, 0, 2),
    noise('bandpass', 1900, 2600, 3.0, 0.2, 2.2, 0, { flutter: 14, drive: 2 }),
    tone('sine', 70, 70, 3.0, 0.3),
  ],
  'scream-hit': [
    noise('bandpass', 2400, 1200, 0.2, 0.4, 2, 0, { flutter: 40 }),
    tone('sawtooth', 600, 300, 0.18, 0.2, 0, 3),
  ],
  // Resonance Break: a thin, very high screech, nothing low in it at all.
  'screech-inhale': [
    tone('sine', 1800, 3200, 0.4, 0.1),
    noise('highpass', 5000, 7000, 0.4, 0.08, 1, 0, { attack: 0.3 }),
  ],
  'screech-release': [
    tone('sine', 3400, 5200, 0.9, 0.3),
    tone('sine', 6800, 7600, 0.9, 0.12),
    tone('square', 4100, 4600, 0.8, 0.07, 0, 2),
    noise('highpass', 6000, 9000, 0.8, 0.14, 1, 0, { flutter: 60 }),
  ],
  'screech-hit': [
    tone('sine', 5600, 2400, 0.35, 0.3),
    noise('highpass', 7000, 4000, 0.3, 0.3, 1.2),
    tone('sine', 2800, 1100, 0.3, 0.2, 0.04),
  ],
  // Reson's sound: pure sine tones that swell and fall, deep pressure thumps, rippling tremolo tails.
  'hit-reson-blast': [
    tone('sine', 150, 50, 0.4, 0.6),
    tone('sine', 300, 100, 0.3, 0.3, 0.02),
    noise('bandpass', 900, 250, 0.35, 0.4, 1.8),
  ],
  'sonic-charge': [
    tone('sine', 220, 740, 0.45, 0.2),
    tone('sine', 440, 1480, 0.45, 0.1),
    noise('bandpass', 2000, 3600, 0.4, 0.08, 4, 0, { attack: 0.25 }),
  ],
  'vib-release': [
    tone('square', 90, 90, 0.2, 0.2, 0, 2),
    tone('sine', 240, 60, 0.3, 0.5),
    noise('lowpass', 1800, 300, 0.2, 0.4),
  ],
  'vib-impact': [
    tone('sine', 110, 40, 0.4, 0.7),
    tone('square', 70, 70, 0.3, 0.25, 0, 3),
    noise('bandpass', 600, 200, 0.25, 0.5, 1.6),
  ],
  'sonic-barrier-up': [
    tone('sine', 300, 900, 0.4, 0.3),
    tone('triangle', 900, 1500, 0.3, 0.12),
    noise('bandpass', 2400, 4000, 0.3, 0.08, 4),
  ],
  'sonic-barrier-hit': [
    tone('sine', 1100, 700, 0.2, 0.3),
    tone('sine', 1650, 1050, 0.16, 0.15),
    noise('bandpass', 2600, 1400, 0.12, 0.2, 3),
  ],
  'sonic-shatter': [
    tone('sine', 1400, 200, 0.5, 0.4),
    noise('bandpass', 3800, 900, 0.4, 0.5, 1.4),
    tone('sine', 90, 40, 0.35, 0.5),
    tone('triangle', 2200, 600, 0.3, 0.2, 0.05),
  ],
  'pulse-emit': [
    tone('sine', 160, 90, 0.3, 0.5),
    tone('sine', 320, 180, 0.25, 0.2),
    noise('lowpass', 1400, 300, 0.25, 0.35),
  ],
  'pulse-hit': [tone('sine', 220, 110, 0.18, 0.4), noise('bandpass', 1200, 600, 0.12, 0.3, 2)],
  'shatter-start': [
    tone('sine', 60, 400, 0.8, 0.3),
    tone('sine', 120, 800, 0.8, 0.15),
    noise('bandpass', 400, 4000, 0.8, 0.2, 2, 0, { attack: 0.5 }),
  ],
  'shatterwave-blast': [
    tone('sine', 70, 28, 0.9, 0.85),
    noise('lowpass', 3000, 160, 0.8, 0.8, 0.7),
    tone('sine', 1800, 300, 0.5, 0.3),
    tone('sine', 900, 150, 0.6, 0.3, 0.08),
    noise('bandpass', 4200, 1200, 0.4, 0.4, 1.2, 0.05),
  ],
  // Chronos's time: ticks, soft glassy chimes, reversed swells and delayed echoes.
  'hit-chronos-fist': [
    tone('sine', 140, 55, 0.35, 0.6),
    tone('sine', 1760, 880, 0.3, 0.2, 0.04),
    noise('bandpass', 1200, 400, 0.3, 0.35, 1.8),
  ],
  'time-wind': [
    tone('sine', 880, 440, 0.4, 0.14),
    tone('sine', 1320, 660, 0.35, 0.08),
    noise('bandpass', 3000, 1500, 0.35, 0.06, 5, 0, { attack: 0.2 }),
  ],
  'rewind-mark': [
    tone('sine', 660, 330, 0.3, 0.3),
    tone('triangle', 1320, 660, 0.25, 0.12),
    noise('bandpass', 3000, 1500, 0.2, 0.15, 3),
  ],
  'rewind-snap': [
    tone('sine', 200, 70, 0.3, 0.5),
    tone('sine', 1800, 900, 0.25, 0.15, 0.03),
    noise('bandpass', 1500, 600, 0.15, 0.3, 2),
  ],
  'snare-open': [
    tone('sine', 560, 140, 0.6, 0.3),
    tone('triangle', 1120, 280, 0.5, 0.12),
    noise('lowpass', 1800, 200, 0.5, 0.25),
    tone('square', 1500, 1500, 0.04, 0.1, 0.3),
  ],
  'snare-tick': [tone('square', 1500, 1500, 0.04, 0.12), noise('highpass', 6000, 4000, 0.03, 0.12)],
  'slash-cut': [
    noise('bandpass', 3800, 900, 0.3, 0.45, 1.8),
    tone('sine', 900, 300, 0.3, 0.2),
    tone('triangle', 2400, 600, 0.2, 0.12),
  ],
  'slash-land': [
    noise('bandpass', 2600, 800, 0.15, 0.4, 2),
    tone('sine', 220, 80, 0.25, 0.45),
    tone('sine', 1500, 700, 0.25, 0.15, 0.04),
  ],
  'image-dash': [
    tone('sine', 500, 1500, 0.25, 0.3),
    noise('bandpass', 2800, 900, 0.25, 0.3, 1.2),
    tone('sine', 120, 80, 0.2, 0.3),
  ],
  'image-cut': [noise('bandpass', 4200, 1800, 0.1, 0.35, 2.2), tone('sine', 700, 350, 0.12, 0.25)],
  'age-rush': [
    tone('sine', 90, 400, 0.6, 0.25),
    tone('triangle', 180, 800, 0.6, 0.1),
    noise('bandpass', 500, 2500, 0.6, 0.18, 2, 0, { attack: 0.3 }),
  ],
  'age-creak': [
    tone('sawtooth', 160, 90, 0.4, 0.25, 0, 2),
    noise('bandpass', 900, 400, 0.4, 0.3, 3, 0, { flutter: 12 }),
    tone('sine', 55, 45, 0.5, 0.3),
  ],
  'time-stop-start': [
    tone('sine', 880, 55, 1.0, 0.45),
    tone('sine', 1760, 110, 0.9, 0.2),
    noise('bandpass', 4000, 300, 0.9, 0.3, 1.2),
    tone('square', 1500, 1500, 0.05, 0.2, 0.9),
  ],
  'time-resume': [
    tone('sine', 55, 440, 0.4, 0.3),
    noise('bandpass', 300, 5000, 0.5, 0.45, 1.2, 0, { attack: 0.15 }),
    tone('sine', 70, 28, 0.9, 0.9, 0.35),
    noise('lowpass', 3200, 150, 0.8, 0.8, 0.7, 0.35),
    tone('sine', 2200, 400, 0.6, 0.3, 0.4),
  ],
  // Prismor's crystal: glassy chimes that ring and shatter, heavy glassy thuds, bright high ticks as facets grow.
  'hit-prismor-crush': [
    tone('sine', 90, 36, 0.4, 0.65),
    tone('triangle', 1800, 600, 0.3, 0.2),
    noise('highpass', 5000, 2500, 0.2, 0.35, 1.4),
    noise('bandpass', 900, 250, 0.3, 0.4, 1.6),
  ],
  'crystal-grow': [
    tone('sine', 600, 2400, 0.5, 0.18),
    tone('triangle', 1200, 3600, 0.45, 0.1),
    noise('highpass', 6000, 9000, 0.4, 0.1, 1, 0, { attack: 0.25 }),
  ],
  'sovereign-form': [
    tone('sine', 100, 800, 0.9, 0.3),
    tone('triangle', 300, 2400, 0.8, 0.12),
    noise('bandpass', 500, 5000, 0.8, 0.2, 2, 0, { attack: 0.5 }),
  ],
  'sovereign-hit': [
    tone('sine', 120, 50, 0.3, 0.55),
    tone('triangle', 2000, 700, 0.25, 0.22),
    noise('highpass', 5000, 2500, 0.15, 0.35),
  ],
  'crystal-shatter': [
    noise('highpass', 4000, 9000, 0.5, 0.55, 1),
    tone('triangle', 3200, 600, 0.4, 0.25),
    tone('sine', 1800, 300, 0.45, 0.2, 0.05),
    noise('bandpass', 2500, 800, 0.35, 0.3, 1.5),
  ],
  // Prismor, second set (Crystal Arsenal, Slide, Shard Volley, Crystal Prison, Groundstrike): glass and stone.
  'arsenal-roll': [
    tone('triangle', 2400, 1800, 0.05, 0.22),
    tone('triangle', 3100, 2200, 0.05, 0.2, 0.07),
    tone('triangle', 1900, 1500, 0.05, 0.22, 0.14),
    tone('triangle', 3600, 2600, 0.06, 0.18, 0.21),
    noise('highpass', 7000, 4500, 0.3, 0.14, 1, 0.02),
  ],
  'arsenal-form': [
    tone('sine', 520, 2100, 0.42, 0.24),
    tone('triangle', 1500, 3200, 0.3, 0.12, 0.08),
    noise('bandpass', 3200, 6000, 0.3, 0.2, 3, 0.05),
    tone('sine', 90, 60, 0.3, 0.3, 0.3),
  ],
  'slide-whoosh': [
    noise('bandpass', 900, 300, 0.45, 0.5, 1.1),
    noise('highpass', 4200, 2000, 0.4, 0.16, 1, 0.02, { flutter: 24 }),
    tone('sine', 210, 90, 0.4, 0.28),
  ],
  'slide-hit': [
    tone('sine', 125, 48, 0.2, 0.55),
    noise('highpass', 5200, 2800, 0.16, 0.4),
    tone('triangle', 1900, 800, 0.18, 0.2, 0.02),
  ],
  'volley-fire': [
    tone('triangle', 3000, 2000, 0.05, 0.2),
    tone('triangle', 3400, 2300, 0.05, 0.2, 0.04),
    tone('triangle', 2700, 1900, 0.05, 0.2, 0.08),
    tone('triangle', 3800, 2500, 0.05, 0.18, 0.12),
    noise('bandpass', 4800, 2400, 0.2, 0.3, 2.4),
  ],
  'volley-hit': [tone('triangle', 3300, 2400, 0.06, 0.28), noise('highpass', 7200, 5000, 0.05, 0.3, 1.2)],
  'prison-grow': [
    tone('sine', 62, 150, 0.6, 0.32),
    noise('lowpass', 420, 950, 0.6, 0.36, 0.8, 0, { attack: 0.25 }),
    tone('triangle', 1400, 2600, 0.3, 0.1, 0.25),
  ],
  'prison-lock': [
    tone('square', 170, 72, 0.14, 0.32),
    tone('triangle', 2600, 1400, 0.26, 0.24, 0.03),
    noise('bandpass', 1800, 900, 0.16, 0.4, 2.2),
    tone('sine', 55, 40, 0.3, 0.45, 0.02),
  ],
  'prison-shatter': [
    noise('highpass', 5200, 9500, 0.5, 0.55),
    tone('triangle', 3000, 520, 0.42, 0.26),
    noise('bandpass', 2200, 700, 0.3, 0.3, 1.4, 0.06),
    tone('sine', 2400, 400, 0.4, 0.18, 0.1),
  ],
  'ground-plant': [
    tone('sine', 85, 34, 0.28, 0.6),
    noise('lowpass', 950, 200, 0.3, 0.5, 0.8),
    tone('triangle', 1600, 700, 0.1, 0.14, 0.02),
  ],
  'ground-erupt': [
    noise('lowpass', 3000, 150, 0.7, 0.8, 0.7),
    tone('sine', 64, 30, 0.6, 0.85),
    tone('triangle', 2400, 420, 0.5, 0.28, 0.02),
    noise('highpass', 6200, 2800, 0.4, 0.4, 1, 0.03),
  ],
  'thorns-burst': [
    noise('bandpass', 2600, 900, 0.34, 0.5, 1.2),
    tone('triangle', 2100, 700, 0.3, 0.3),
    tone('sine', 105, 48, 0.3, 0.5),
  ],
  'venom-spray-burst': [
    noise('bandpass', 2200, 1000, 0.3, 0.45, 0.9, 0, { attack: 0.02 }),
    noise('lowpass', 1200, 400, 0.26, 0.25, 1, 0.02),
  ],
  'vapor-dash': [noise('bandpass', 900, 1700, 0.26, 0.4, 0.9, 0, { attack: 0.03 }), tone('sine', 90, 120, 0.2, 0.3)],
  'vapor-hit': [noise('bandpass', 1500, 700, 0.16, 0.3, 1), tone('sine', 110, 70, 0.14, 0.25)],
  'grenade-throw': [noise('bandpass', 900, 600, 0.24, 0.3, 0.9, 0, { attack: 0.05 })],
  'grenade-blast': [
    noise('lowpass', 1800, 120, 0.7, 0.8, 0.7),
    tone('sine', 90, 30, 0.5, 0.7),
    noise('bandpass', 2400, 900, 0.18, 0.4, 1),
  ],
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
  'grenade-pin': [
    tone('triangle', 1800, 1500, 0.05, 0.3),
    noise('bandpass', 3000, 2400, 0.05, 0.25, 2),
    tone('sine', 140, 120, 0.1, 0.25, 0.06),
  ],
  'bloom-build': [
    tone('sine', 55, 48, 0.7, 0.5),
    noise('bandpass', 600, 1200, 0.7, 0.25, 1, 0, { attack: 0.4, flutter: 8 }),
  ],
  'bloom-burst': [
    tone('sine', 70, 38, 0.8, 0.7),
    noise('bandpass', 1600, 500, 0.9, 0.5, 0.7, 0, { attack: 0.02 }),
    noise('lowpass', 900, 200, 0.7, 0.35, 1, 0.05),
  ],

  // ---------------------------------------------------------------- Inkmaster: brush swishes, wet splashes, drums and roars
  'hit-ink-brush-sweep': [
    noise('bandpass', 1500, 600, 0.12, 0.45, 1.6),
    tone('triangle', 260, 170, 0.12, 0.25),
    noise('lowpass', 900, 300, 0.1, 0.2, 0.8, 0.03),
  ],
  'hit-ink-brush-flick': [noise('bandpass', 2100, 900, 0.08, 0.45, 2), tone('sine', 360, 240, 0.09, 0.3)],
  'hit-ink-heavy-stroke': [
    tone('sine', 110, 45, 0.3, 0.7),
    noise('bandpass', 1300, 350, 0.25, 0.45, 1.2),
    noise('lowpass', 700, 200, 0.2, 0.3, 0.9, 0.04),
  ],
  'hit-ink-plunge': [noise('bandpass', 1500, 500, 0.12, 0.5, 2), tone('sine', 140, 60, 0.16, 0.55)],
  'ink-gather': [noise('bandpass', 700, 1500, 0.4, 0.14, 1.8, 0, { attack: 0.25 }), tone('sine', 150, 230, 0.4, 0.14)],
  'ink-slash': [noise('bandpass', 1900, 500, 0.25, 0.5, 1.4), tone('triangle', 340, 120, 0.22, 0.25)],
  'ink-splash': [
    noise('bandpass', 1100, 400, 0.22, 0.45, 1),
    noise('highpass', 3000, undefined, 0.07, 0.2),
    tone('sine', 200, 90, 0.14, 0.25),
  ],
  'ink-serpent': [
    tone('sawtooth', 180, 120, 0.4, 0.1),
    noise('bandpass', 2400, 1600, 0.45, 0.2, 3, 0, { flutter: 14 }),
  ],
  'ink-bite': [
    tone('sine', 150, 60, 0.15, 0.55),
    noise('bandpass', 2600, 900, 0.12, 0.4, 2),
    tone('triangle', 900, 400, 0.1, 0.18, 0.02),
  ],
  // Ink Bull: a wet snort, the hoof scraping the ground, the thunder of the charge and the crash of the horns.
  'bull-snort': [
    noise('bandpass', 500, 220, 0.5, 0.45, 1.1, 0, { attack: 0.1 }),
    tone('sawtooth', 95, 70, 0.45, 0.22),
    noise('highpass', 2800, undefined, 0.18, 0.15, 1, 0.05),
  ],
  'bull-paw': [noise('bandpass', 1200, 500, 0.16, 0.4, 1.6), tone('sine', 120, 70, 0.14, 0.4)],
  'bull-charge': [
    tone('sawtooth', 70, 110, 0.7, 0.3),
    noise('lowpass', 800, 300, 0.8, 0.45, 1, 0, { flutter: 9, attack: 0.15 }),
    tone('sine', 55, 40, 0.6, 0.5),
  ],
  'bull-ram': [
    tone('sine', 90, 30, 0.45, 0.95),
    noise('lowpass', 1800, 200, 0.45, 0.8, 0.9),
    noise('bandpass', 1300, 400, 0.3, 0.5, 1.4, 0.03),
    tone('triangle', 260, 90, 0.2, 0.4),
  ],
  'ink-pool': [
    noise('lowpass', 600, 200, 0.5, 0.4, 1),
    tone('sine', 110, 60, 0.4, 0.4),
    noise('bandpass', 1600, 700, 0.25, 0.15, 2, 0.1),
  ],
  // Ink Spear: the brush stretching and hardening into a spear.
  'ink-spear-form': [
    noise('bandpass', 900, 2600, 0.35, 0.4, 1.4, 0, { attack: 0.05 }),
    tone('triangle', 220, 520, 0.3, 0.25),
  ],
  'ink-cyclone': [
    noise('bandpass', 900, 2200, 0.7, 0.4, 1.2, 0, { flutter: 9, attack: 0.1 }),
    tone('sine', 120, 220, 0.6, 0.2),
  ],
  'ink-collapse': [
    tone('sine', 80, 28, 0.7, 0.8),
    noise('lowpass', 2200, 150, 0.7, 0.7, 0.8),
    noise('bandpass', 1500, 400, 0.4, 0.3, 1.4, 0.05),
  ],
  // ---------------------------------------------------------------- Voltar: lightning. Crackle, a sharp zap, a rising charge, a ripping beam.
  'volt-charge-short': [tone('sawtooth', 300, 1400, 0.14, 0.14), noise('highpass', 4000, undefined, 0.12, 0.18, 1, 0, { flutter: 60 })],
  'volt-charge-long': [
    tone('sawtooth', 120, 1800, 2.9, 0.16),
    tone('sine', 60, 240, 2.9, 0.22),
    noise('bandpass', 2200, 6000, 2.9, 0.14, 3, 0, { attack: 1.2, flutter: 40 }),
  ],
  'volt-dash': [tone('sawtooth', 2400, 300, 0.16, 0.2), noise('bandpass', 3500, 800, 0.14, 0.3, 1.5)],
  'volt-hit': [tone('square', 900, 200, 0.07, 0.22), noise('highpass', 3000, undefined, 0.08, 0.3, 1)],
  'volt-zap': [tone('sawtooth', 3000, 400, 0.2, 0.22), noise('highpass', 2500, undefined, 0.2, 0.3, 1, 0, { flutter: 80 })],
  'volt-contact': [
    tone('square', 1200, 80, 0.3, 0.26),
    noise('highpass', 2000, undefined, 0.3, 0.4, 1, 0, { flutter: 50 }),
    tone('sine', 90, 40, 0.3, 0.4),
  ],
  'volt-finisher': [tone('sine', 140, 50, 0.3, 0.7), tone('square', 1500, 120, 0.2, 0.25), noise('highpass', 2500, undefined, 0.25, 0.4, 1)],
  'volt-beam': [
    tone('sawtooth', 220, 180, 2.0, 0.2),
    noise('highpass', 1800, undefined, 2.0, 0.3, 1, 0, { flutter: 90 }),
    tone('square', 880, 700, 2.0, 0.08),
  ],
  'volt-beam-hit': [tone('square', 700, 150, 0.12, 0.2), noise('highpass', 3000, undefined, 0.12, 0.25, 1)],
  'volt-overdrive': [
    tone('sawtooth', 100, 900, 0.7, 0.22),
    tone('sine', 50, 160, 0.7, 0.4),
    noise('highpass', 2500, undefined, 0.7, 0.3, 1, 0, { flutter: 50 }),
  ],
  'volt-execution': [
    tone('sine', 120, 35, 0.6, 0.9),
    tone('sawtooth', 2600, 200, 0.5, 0.28),
    noise('highpass', 1500, undefined, 0.6, 0.5, 1, 0, { flutter: 30 }),
  ],
  'volt-flash-hit': [tone('square', 1100, 150, 0.09, 0.26), noise('highpass', 3500, undefined, 0.09, 0.3, 1), tone('sine', 120, 50, 0.1, 0.4)],
  'volt-rush': [tone('sawtooth', 1800, 500, 0.3, 0.16), noise('bandpass', 3000, 1200, 0.3, 0.26, 1.4, 0, { flutter: 40 })],
  'volt-evade': [tone('sawtooth', 500, 2600, 0.1, 0.2), noise('highpass', 4000, undefined, 0.1, 0.22, 1)],
  'volt-evade-out': [tone('sawtooth', 2800, 600, 0.12, 0.16), noise('bandpass', 2600, 900, 0.12, 0.2, 1.5)],
  'volt-counter': [tone('square', 1000, 90, 0.18, 0.28), tone('sine', 100, 40, 0.2, 0.5), noise('highpass', 2600, undefined, 0.2, 0.36, 1)],
  'volt-overdrive-pop': [tone('sine', 80, 30, 0.4, 0.6), noise('highpass', 2000, undefined, 0.4, 0.3, 1, 0, { flutter: 40 })],
  'volt-vanish': [tone('sawtooth', 200, 3000, 0.25, 0.22), noise('highpass', 3000, undefined, 0.25, 0.3, 1)],
  'volt-vanish-out': [tone('square', 2500, 150, 0.25, 0.2), noise('highpass', 2500, undefined, 0.25, 0.26, 1, 0, { flutter: 70 })],
  'quake-punch': [tone('sine', 110, 50, 0.1, 0.6), noise('lowpass', 1400, 400, 0.08, 0.5, 0.9)],
  'quake-finisher': [tone('sine', 80, 28, 0.4, 0.95, 0, 0.3), noise('lowpass', 1000, 150, 0.35, 0.7, 0.9), tone('sine', 220, 70, 0.2, 0.4)],
  'gun-draw': [noise('highpass', 3000, undefined, 0.1, 0.25, 1), tone('square', 400, 900, 0.08, 0.12)],
  'gun-shot': [noise('bandpass', 1800, 600, 0.09, 0.6, 1), tone('sine', 140, 50, 0.1, 0.5)],
  'bullet-hit': [tone('sine', 220, 80, 0.08, 0.4), noise('bandpass', 2400, undefined, 0.05, 0.3, 2)],
  'gun-load-heavy': [tone('square', 200, 500, 0.15, 0.18), noise('highpass', 2500, undefined, 0.12, 0.22, 1)],
  'gun-boom': [noise('lowpass', 1200, 200, 0.25, 0.8, 1), tone('sine', 100, 38, 0.3, 0.7)],
  'bullet-explode': [tone('sine', 90, 30, 0.5, 0.9), noise('lowpass', 1500, 150, 0.45, 0.8, 1)],
  'gun-ricochet': [noise('bandpass', 2000, 800, 0.1, 0.5, 1), tone('triangle', 1800, 900, 0.12, 0.2)],
  'bullet-ping': [tone('triangle', 2400, 1700, 0.18, 0.3), noise('highpass', 4000, undefined, 0.04, 0.3, 1)],
  'roll-whoosh': [noise('bandpass', 700, 300, 0.3, 0.3, 1.2), tone('sine', 90, 60, 0.25, 0.2)],
  'gun-shot-light': [noise('bandpass', 2400, 900, 0.06, 0.4, 1), tone('sine', 180, 70, 0.07, 0.3)],
  'bullet-hit-light': [tone('sine', 300, 120, 0.05, 0.25), noise('bandpass', 3000, undefined, 0.04, 0.2, 2)],
  'gun-quickdraw': [noise('highpass', 3500, undefined, 0.22, 0.3, 1, 0, { flutter: 30 }), tone('square', 300, 1200, 0.2, 0.14)],
  'gun-shot-fast': [noise('bandpass', 2000, 500, 0.07, 0.65, 1), tone('sine', 150, 45, 0.08, 0.55)],
  'bullet-execute': [tone('sine', 110, 35, 0.4, 0.95), noise('bandpass', 1800, 300, 0.3, 0.7, 1)],
  'gun-machine-ready': [tone('sawtooth', 120, 300, 0.4, 0.2), noise('highpass', 2000, undefined, 0.3, 0.2, 1)],
  'gun-machine-burst': [noise('bandpass', 1500, 700, 0.08, 0.5, 1), tone('square', 90, 60, 0.07, 0.4)],
  'bullet-hit-heavy': [tone('sine', 180, 60, 0.1, 0.5), noise('bandpass', 2200, undefined, 0.06, 0.4, 2)],
  'hit-gunsmith-blast': [tone('sine', 100, 36, 0.3, 0.8), noise('bandpass', 1800, 300, 0.25, 0.7, 1)],
  'sickle-draw': [noise('highpass', 3000, undefined, 0.15, 0.2, 1), tone('triangle', 900, 1500, 0.12, 0.1)],
  'sickle-slide': [noise('bandpass', 900, 300, 0.3, 0.35, 1.2), tone('sine', 100, 60, 0.3, 0.2)],
  'sickle-rise-hit': [tone('sine', 150, 60, 0.15, 0.6), noise('bandpass', 2600, 800, 0.15, 0.5, 1.5)],
  'sickle-sweep': [noise('bandpass', 1400, 400, 0.22, 0.45, 1.3)],
  'sickle-hit': [tone('sine', 170, 70, 0.1, 0.5), noise('bandpass', 2000, undefined, 0.08, 0.4, 2)],
  'sickle-hook-throw': [noise('bandpass', 1800, 900, 0.15, 0.3, 1), tone('triangle', 1400, 1000, 0.1, 0.1)],
  'sickle-hook-catch': [tone('triangle', 900, 600, 0.14, 0.25), noise('bandpass', 2600, undefined, 0.06, 0.45, 2), noise('bandpass', 700, 300, 0.3, 0.25, 1.5, 0.06)],
  'crawl-scuttle': [noise('bandpass', 600, 300, 0.25, 0.25, 1.2, 0, { flutter: 20 })],
  'crawl-scuttle-fast': [noise('bandpass', 800, 350, 0.3, 0.32, 1.2, 0, { flutter: 40 }), tone('sine', 80, 50, 0.25, 0.2)],
  'gravehook-embed': [tone('sine', 120, 50, 0.2, 0.7), noise('bandpass', 2200, 700, 0.15, 0.5, 2)],
  'gravehook-slam': [tone('sine', 80, 28, 0.5, 0.95), noise('lowpass', 1100, 150, 0.4, 0.8, 1)],
  'reaper-rise': [tone('sawtooth', 70, 160, 0.6, 0.22), noise('bandpass', 500, 200, 0.6, 0.2, 1.5)],
  'reaper-slash': [noise('bandpass', 1800, 500, 0.12, 0.45, 1.3), tone('triangle', 1200, 700, 0.1, 0.12)],
  'reaper-finish': [tone('sine', 110, 36, 0.4, 0.9), noise('bandpass', 2000, 400, 0.3, 0.6, 1.2)],
  // Magix's scarf hook (owner, 26/11/2026): a silky rustle in the sleeve, a long whip as the scarves unravel, and a thump of the kick.
  'sleeve-rustle': [noise('highpass', 3200, undefined, 0.22, 0.14, 1.2, 0, { flutter: 24 }), tone('triangle', 700, 1100, 0.14, 0.08)],
  'scarf-whip': [noise('bandpass', 1500, 3200, 0.3, 0.3, 1, 0, { flutter: 50 }), tone('sine', 300, 700, 0.18, 0.12), noise('highpass', 5000, undefined, 0.1, 0.14, 2, 0.05)],
  'scarf-kick': [tone('sine', 130, 40, 0.28, 0.85), noise('bandpass', 1800, 500, 0.18, 0.55, 1.2), tone('triangle', 1500, 700, 0.1, 0.12)],
  // Kamaw's chain work (owner, 26/11/2026): a whip of chain, a taut snap, a long rattle as it wraps, a rising whirr for the spin, and sharp cuts.
  'hook-whip': [noise('bandpass', 2200, 800, 0.18, 0.4, 1.2), tone('triangle', 1600, 900, 0.14, 0.12), noise('highpass', 4000, undefined, 0.1, 0.16, 2, 0.05, { flutter: 60 })],
  'hook-kick': [tone('sine', 140, 42, 0.3, 0.9), noise('bandpass', 2000, 500, 0.2, 0.6, 1.2)],
  'chain-wrap': [noise('bandpass', 3400, 1800, 0.8, 0.22, 1.5, 0, { flutter: 38 }), tone('sawtooth', 90, 220, 0.8, 0.14)],
  'beyblade-spin': [noise('bandpass', 1200, 2400, 0.4, 0.28, 1.1, 0, { flutter: 26 }), tone('sawtooth', 160, 300, 0.4, 0.1)],
  'beyblade-cut': [noise('bandpass', 3200, 1200, 0.1, 0.5, 2), tone('triangle', 2000, 800, 0.08, 0.25)],
  'crawl-strike': [tone('sine', 160, 60, 0.12, 0.5), noise('bandpass', 2200, 700, 0.1, 0.45, 1.5)],
  'hit-sickle-gravedigger': [tone('sine', 90, 34, 0.35, 0.85), noise('lowpass', 1300, 200, 0.3, 0.7, 1)],
  'hit-voltar-surge-blast': [tone('sine', 150, 50, 0.3, 0.6), tone('square', 1400, 150, 0.25, 0.25), noise('highpass', 2200, undefined, 0.3, 0.4, 1)],
  // ---------------------------------------------------------------- Bohemeth: four heavy fists, iron chain and thunder
  'hit-bohemeth-upper-jab': [tone('sine', 140, 60, 0.12, 0.7), noise('lowpass', 1500, 500, 0.08, 0.5, 0.9)],
  'hit-bohemeth-upper-cross': [tone('sine', 120, 52, 0.14, 0.75), noise('bandpass', 900, 450, 0.09, 0.45, 1)],
  'hit-bohemeth-body-punch': [
    tone('sine', 100, 40, 0.18, 0.85, 0, 0.15),
    noise('lowpass', 900, 300, 0.12, 0.55, 0.8),
    noise('bandpass', 420, undefined, 0.07, 0.3, 1.4, 0.03),
  ],
  'hit-bohemeth-finisher': [
    tone('sine', 80, 30, 0.3, 0.95, 0, 0.3),
    noise('lowpass', 1100, 200, 0.2, 0.6, 0.8),
    noise('bandpass', 300, undefined, 0.15, 0.4, 1.6, 0.05),
    tone('triangle', 1100, 700, 0.1, 0.12, 0.02),
  ],
  'hit-bohemeth-slam': [tone('sine', 70, 28, 0.35, 0.95, 0, 0.35), noise('lowpass', 800, 150, 0.3, 0.6, 0.8)],
  'hit-bohemeth-double-fist': [
    tone('sine', 75, 26, 0.4, 1, 0, 0.35),
    noise('lowpass', 1000, 160, 0.3, 0.7, 0.8),
    noise('highpass', 3000, undefined, 0.05, 0.3, 1, 0.01),
  ],
  'bohemeth-grunt': [tone('sawtooth', 110, 70, 0.25, 0.3, 0, 0.3), noise('bandpass', 500, 300, 0.25, 0.2, 2)],
  'bohemeth-rush': [noise('bandpass', 400, 1500, 0.35, 0.5, 1, 0, { attack: 0.08 }), tone('sine', 90, 160, 0.3, 0.3)],
  'bohemeth-ram': [tone('sine', 110, 36, 0.4, 0.95, 0, 0.3), noise('lowpass', 1400, 200, 0.35, 0.7, 0.9)],
  'uppercut-grab': [noise('bandpass', 700, 1200, 0.2, 0.4, 1.4), tone('triangle', 260, 180, 0.18, 0.25)],
  'uppercut-launch': [
    tone('sine', 150, 520, 0.28, 0.6),
    noise('lowpass', 1800, 300, 0.2, 0.6, 0.9),
    noise('bandpass', 2200, 900, 0.12, 0.3, 1.2, 0.04),
  ],
  'thunder-clap': [
    noise('bandpass', 2200, 800, 0.08, 0.9, 0.9),
    tone('sine', 120, 40, 0.5, 0.9, 0, 0.4),
    noise('lowpass', 1600, 120, 0.7, 0.55, 0.7, 0.02),
  ],
  'thunder-boom': [
    tone('sine', 60, 22, 0.9, 1, 0, 0.45),
    noise('lowpass', 1200, 90, 0.9, 0.7, 0.7),
    noise('bandpass', 700, 200, 0.6, 0.35, 1.2, 0.1),
  ],
  'bohemeth-leap': [
    noise('bandpass', 500, 1100, 0.3, 0.45, 1.2, 0, { attack: 0.1 }),
    tone('triangle', 130, 240, 0.25, 0.3),
  ],
  'bohemeth-quake': [
    tone('sine', 55, 24, 0.8, 1, 0, 0.4),
    noise('lowpass', 900, 100, 0.8, 0.75, 0.8),
    noise('bandpass', 1500, 400, 0.3, 0.3, 1.5, 0.05),
    noise('highpass', 4000, undefined, 0.1, 0.2, 1, 0.02),
  ],
  'chain-unwind': [
    noise('highpass', 3500, 5500, 0.3, 0.3, 1, 0, { flutter: 28 }),
    tone('triangle', 1700, 1300, 0.2, 0.08),
  ],
  'chain-throw': [
    noise('bandpass', 900, 2800, 0.28, 0.4, 1.2, 0, { attack: 0.03 }),
    noise('highpass', 4000, undefined, 0.3, 0.25, 1, 0, { flutter: 36 }),
  ],
  'chain-snap': [
    noise('bandpass', 2600, 1400, 0.06, 0.8, 2),
    tone('triangle', 1400, 900, 0.12, 0.2),
    noise('lowpass', 700, 250, 0.2, 0.4, 1, 0.04),
  ],
  'chain-punch': [
    tone('sine', 85, 30, 0.35, 0.95, 0, 0.3),
    noise('lowpass', 1100, 180, 0.25, 0.65, 0.8),
    noise('bandpass', 2500, 1200, 0.05, 0.4, 2),
  ],
  'fire-ignite': [
    noise('bandpass', 700, 2600, 0.9, 0.55, 1, 0, { flutter: 12, attack: 0.3 }),
    tone('sawtooth', 70, 140, 0.8, 0.25, 0, 0.3),
    noise('highpass', 3500, undefined, 0.5, 0.2, 1, 0.2, { flutter: 40 }),
  ],
  'fire-fists-hit': [
    tone('sine', 120, 50, 0.2, 0.75),
    noise('bandpass', 1800, 700, 0.18, 0.5, 1, 0, { flutter: 20 }),
    noise('highpass', 5000, undefined, 0.08, 0.25, 1, 0, { flutter: 50 }),
  ],
  'masterpiece-draw': [
    noise('bandpass', 1200, 500, 0.5, 0.3, 1.5),
    tone('sine', 140, 100, 0.5, 0.3),
    tone('triangle', 520, 380, 0.4, 0.12, 0.05),
  ],
  'masterpiece-awaken': [
    tone('sine', 70, 28, 1, 0.85),
    noise('lowpass', 2600, 150, 1, 0.75, 0.8),
    tone('sawtooth', 110, 60, 0.9, 0.25, 0.1),
    noise('highpass', 3000, undefined, 0.5, 0.2, 1, 0.1),
  ],
  'monster-roar': [
    tone('sawtooth', 100, 55, 1, 0.38, 0, 0.5),
    noise('bandpass', 500, 220, 1, 0.4, 1, 0, { attack: 0.3 }),
  ],
  'monster-slam': [
    tone('sine', 70, 26, 0.6, 0.9),
    noise('lowpass', 1500, 120, 0.55, 0.7, 0.8),
    noise('bandpass', 400, 150, 0.4, 0.4, 1, 0.03),
  ],
  'bow-draw': [noise('bandpass', 1000, 1800, 0.45, 0.15, 3, 0, { attack: 0.3 }), tone('triangle', 200, 340, 0.4, 0.1)],
  'bow-shot': [
    noise('highpass', 2500, 1200, 0.1, 0.4),
    tone('triangle', 520, 220, 0.12, 0.35),
    noise('bandpass', 1800, 700, 0.18, 0.2, 2, 0.04),
  ],
  'hit-ink-clone-slash': [noise('bandpass', 1600, 700, 0.1, 0.4, 2), tone('triangle', 300, 170, 0.1, 0.25)],
  'hit-ink-clone-overhead': [noise('bandpass', 1300, 450, 0.16, 0.5, 1.6), tone('sine', 130, 55, 0.2, 0.5)],
  'hit-ink-monster-claw': [
    tone('sine', 85, 35, 0.35, 0.75),
    noise('bandpass', 1700, 400, 0.3, 0.5, 1.3),
    noise('lowpass', 800, 200, 0.25, 0.4, 1, 0.04),
  ],
  'hit-ink-monster-bite': [
    tone('sine', 120, 45, 0.25, 0.7),
    noise('bandpass', 2800, 800, 0.18, 0.5, 2),
    tone('triangle', 700, 300, 0.2, 0.25, 0.02),
  ],
  'ink-arrow-hit': [noise('bandpass', 2000, 800, 0.1, 0.35, 2), tone('triangle', 420, 200, 0.1, 0.3)],
  'monster-breath': [
    noise('bandpass', 900, 400, 0.7, 0.5, 0.9, 0, { attack: 0.2 }),
    tone('sawtooth', 80, 60, 0.7, 0.25),
  ],
  'monster-breath-hit': [noise('bandpass', 1100, 500, 0.15, 0.4, 1.4), tone('sine', 130, 70, 0.12, 0.3)],
};
