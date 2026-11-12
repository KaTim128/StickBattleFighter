/**
 * Sound effects, synthesised in the browser with the Web Audio API (TD-033).
 * Every sound is ORIGINAL: built at runtime from noise bursts, filtered
 * sweeps and pitch-dropping thumps, in the punchy style the owner wants from
 * the Stickman Kombat 2D reference (spec §2) without using any of its audio.
 * No audio files, nothing to license. A small random pitch and level spread
 * keeps repeated hits from sounding identical.
 *
 * Browsers only allow audio after the first user input, so `unlock()` is
 * called on the first key or pointer press. Without Web Audio (tests, old
 * browsers) everything is a silent no-op.
 */
type Ctx = AudioContext;

interface NoiseSpec {
  dur: number;
  gain: number;
  type: BiquadFilterType;
  freq: number;
  freqEnd?: number;
  q?: number;
  attack?: number;
  delay?: number;
  /** Flame turbulence: the level trembles this many times a second (fire roars, owner 11/11/2026). */
  flutter?: number;
  /** Grit: overdrive the layer (0..1) for a rougher, angrier roar. */
  drive?: number;
}

interface ToneSpec {
  wave: OscillatorType;
  f0: number;
  f1: number;
  dur: number;
  gain: number;
  attack?: number;
  delay?: number;
  /** Grit: overdrive the tone (0..1), e.g. a growling roar under a meteor. */
  drive?: number;
}

type Layer = { noise: NoiseSpec } | { tone: ToneSpec } | { crackle: { dur: number; gain: number; count: number } };

/** Recipes by sound id (the ids attacks, impact profiles and abilities name). */
const RECIPES: Readonly<Record<string, readonly Layer[]>> = {
  // Bare knuckles, light: a tight slap-crack over a short body thump.
  'punch-light': [
    { tone: { wave: 'sine', f0: 170, f1: 70, dur: 0.07, gain: 0.55 } },
    { noise: { dur: 0.05, gain: 0.55, type: 'bandpass', freq: 2300, q: 1.1 } },
    { noise: { dur: 0.012, gain: 0.3, type: 'highpass', freq: 5000 } },
  ],
  // A second light punch with a drier, higher slap (variety, TD-039 audio profiles).
  'punch-light-b': [
    { tone: { wave: 'sine', f0: 190, f1: 85, dur: 0.06, gain: 0.5 } },
    { noise: { dur: 0.045, gain: 0.5, type: 'bandpass', freq: 2900, q: 1.4 } },
    { noise: { dur: 0.01, gain: 0.25, type: 'highpass', freq: 6000 } },
  ],
  // A light kick: a flat, slapping thump (shin on body).
  'kick-light': [
    { tone: { wave: 'sine', f0: 140, f1: 60, dur: 0.11, gain: 0.6 } },
    { noise: { dur: 0.07, gain: 0.45, type: 'lowpass', freq: 1800, freqEnd: 600 } },
  ],
  // Parry: a bright, ringing deflection.
  parry: [
    { tone: { wave: 'triangle', f0: 1400, f1: 1350, dur: 0.25, gain: 0.18 } },
    { noise: { dur: 0.03, gain: 0.35, type: 'bandpass', freq: 4000, q: 2 } },
  ],
  // Movement: soft footfalls, a jump push-off and a landing thud.
  footstep: [
    { tone: { wave: 'sine', f0: 95, f1: 60, dur: 0.05, gain: 0.12 } },
    { noise: { dur: 0.03, gain: 0.06, type: 'lowpass', freq: 900 } },
  ],
  jump: [{ noise: { dur: 0.14, gain: 0.16, type: 'bandpass', freq: 700, freqEnd: 1600, q: 1, attack: 0.03 } }],
  land: [
    { tone: { wave: 'sine', f0: 110, f1: 55, dur: 0.1, gain: 0.35 } },
    { noise: { dur: 0.06, gain: 0.18, type: 'lowpass', freq: 800 } },
  ],
  // A body slamming into a wall.
  'wall-thud': [
    { tone: { wave: 'sine', f0: 80, f1: 40, dur: 0.22, gain: 0.8 } },
    { noise: { dur: 0.12, gain: 0.45, type: 'lowpass', freq: 700 } },
  ],
  // Bare knuckles, heavy: a deep thud with a crunchy snap on top.
  'punch-heavy': [
    { tone: { wave: 'sine', f0: 125, f1: 38, dur: 0.24, gain: 0.95 } },
    { tone: { wave: 'triangle', f0: 260, f1: 80, dur: 0.1, gain: 0.25 } },
    { noise: { dur: 0.15, gain: 0.7, type: 'lowpass', freq: 1500, freqEnd: 400 } },
    { noise: { dur: 0.035, gain: 0.4, type: 'bandpass', freq: 3200, q: 1.4 } },
  ],
  'kick-heavy': [
    { tone: { wave: 'sine', f0: 105, f1: 36, dur: 0.28, gain: 1 } },
    { noise: { dur: 0.2, gain: 0.6, type: 'lowpass', freq: 1000, freqEnd: 300 } },
    { noise: { dur: 0.05, gain: 0.32, type: 'bandpass', freq: 1900, q: 1.2 } },
  ],
  // Fist on forearms: a dull knock with a hard tick.
  block: [
    { tone: { wave: 'sine', f0: 210, f1: 130, dur: 0.06, gain: 0.35 } },
    { noise: { dur: 0.04, gain: 0.35, type: 'bandpass', freq: 3600, q: 2 } },
  ],
  /*
   * FIRE (owner, 11/11/2026: "firebolt sounds like a wooden plank"; reference whooshes studied
   * for their shape only, no audio used). A fire sound is a ROAR, not a knock: band-limited noise
   * that swells in over 0.1–0.4 s, sits low (150–700 Hz), trembles like a flame (`flutter`), and
   * leaves a crackle and a sizzling tail. Bigger fury = longer swell, deeper boom, more grit.
   */
  'fire-hit': [
    { tone: { wave: 'sine', f0: 130, f1: 50, dur: 0.16, gain: 0.55 } },
    { noise: { dur: 0.4, gain: 0.55, type: 'bandpass', freq: 650, freqEnd: 240, q: 0.7, attack: 0.02, flutter: 24 } },
    { noise: { dur: 0.3, gain: 0.12, type: 'highpass', freq: 3500, attack: 0.05, delay: 0.08 } },
    { crackle: { dur: 0.4, gain: 0.25, count: 9 } },
  ],
  // Inferno's fists and feet: the body hit, wrapped in a quick flame lick.
  'fire-punch-light': [
    { tone: { wave: 'sine', f0: 175, f1: 75, dur: 0.07, gain: 0.5 } },
    { noise: { dur: 0.04, gain: 0.45, type: 'bandpass', freq: 2400, q: 1.1 } },
    { noise: { dur: 0.2, gain: 0.32, type: 'bandpass', freq: 520, freqEnd: 1300, q: 0.8, attack: 0.015, flutter: 26 } },
    { crackle: { dur: 0.18, gain: 0.16, count: 4 } },
  ],
  'fire-punch-light-b': [
    { tone: { wave: 'sine', f0: 195, f1: 85, dur: 0.06, gain: 0.45 } },
    { noise: { dur: 0.04, gain: 0.42, type: 'bandpass', freq: 2900, q: 1.4 } },
    { noise: { dur: 0.22, gain: 0.3, type: 'bandpass', freq: 700, freqEnd: 1600, q: 0.9, attack: 0.02, flutter: 30 } },
    { crackle: { dur: 0.2, gain: 0.16, count: 5 } },
  ],
  'fire-kick-light': [
    { tone: { wave: 'sine', f0: 140, f1: 58, dur: 0.11, gain: 0.55 } },
    { noise: { dur: 0.26, gain: 0.36, type: 'bandpass', freq: 380, freqEnd: 1100, q: 0.7, attack: 0.02, flutter: 22 } },
    { crackle: { dur: 0.22, gain: 0.17, count: 5 } },
  ],
  'fire-punch-heavy': [
    { tone: { wave: 'sine', f0: 120, f1: 36, dur: 0.28, gain: 0.95, drive: 0.3 } },
    { noise: { dur: 0.03, gain: 0.45, type: 'bandpass', freq: 3200, q: 1.4 } },
    {
      noise: {
        dur: 0.55,
        gain: 0.65,
        type: 'bandpass',
        freq: 900,
        freqEnd: 220,
        q: 0.6,
        attack: 0.02,
        flutter: 20,
        drive: 0.4,
      },
    },
    { noise: { dur: 0.45, gain: 0.12, type: 'highpass', freq: 3800, attack: 0.08, delay: 0.1 } },
    { crackle: { dur: 0.5, gain: 0.26, count: 11 } },
  ],
  'fire-kick-heavy': [
    { tone: { wave: 'sine', f0: 100, f1: 32, dur: 0.32, gain: 1, drive: 0.35 } },
    {
      noise: {
        dur: 0.6,
        gain: 0.7,
        type: 'bandpass',
        freq: 800,
        freqEnd: 180,
        q: 0.6,
        attack: 0.025,
        flutter: 18,
        drive: 0.45,
      },
    },
    { noise: { dur: 0.5, gain: 0.12, type: 'highpass', freq: 3600, attack: 0.08, delay: 0.12 } },
    { crackle: { dur: 0.55, gain: 0.28, count: 12 } },
  ],
  // Fireball (owner, 11/11/2026). The charge: air rushing into the palm, a rising magical shimmer
  // over a swelling low hum, crackling as the core heats.
  'fireball-charge': [
    { noise: { dur: 0.42, gain: 0.3, type: 'bandpass', freq: 300, freqEnd: 1900, q: 1.2, attack: 0.3, flutter: 16 } },
    { tone: { wave: 'triangle', f0: 320, f1: 980, dur: 0.42, gain: 0.08, attack: 0.3 } },
    { tone: { wave: 'sine', f0: 55, f1: 95, dur: 0.42, gain: 0.22, attack: 0.25 } },
    { crackle: { dur: 0.4, gain: 0.1, count: 5 } },
  ],
  // The release: a powerful magical whoosh as the ball is hurled, a bright shimmer riding it.
  'fireball-cast': [
    {
      noise: {
        dur: 0.5,
        gain: 0.7,
        type: 'bandpass',
        freq: 900,
        freqEnd: 180,
        q: 0.7,
        attack: 0.02,
        flutter: 22,
        drive: 0.3,
      },
    },
    { noise: { dur: 0.35, gain: 0.18, type: 'highpass', freq: 4200, freqEnd: 2400, attack: 0.01 } },
    { tone: { wave: 'sine', f0: 140, f1: 60, dur: 0.3, gain: 0.35, drive: 0.2 } },
    { tone: { wave: 'triangle', f0: 1200, f1: 600, dur: 0.22, gain: 0.06 } },
    { crackle: { dur: 0.45, gain: 0.18, count: 7 } },
  ],
  // The connection: a deep explosive boom: a sub drop, a blast of roaring air, debris crackle and
  // a sizzling tail.
  'fireball-boom': [
    { tone: { wave: 'sine', f0: 78, f1: 26, dur: 0.6, gain: 1, drive: 0.35 } },
    { tone: { wave: 'triangle', f0: 160, f1: 45, dur: 0.22, gain: 0.45, drive: 0.3 } },
    {
      noise: {
        dur: 0.9,
        gain: 0.85,
        type: 'lowpass',
        freq: 1700,
        freqEnd: 180,
        attack: 0.005,
        flutter: 19,
        drive: 0.45,
      },
    },
    { noise: { dur: 0.08, gain: 0.5, type: 'bandpass', freq: 1800, q: 0.8 } },
    { noise: { dur: 0.7, gain: 0.12, type: 'highpass', freq: 4500, attack: 0.12, delay: 0.18 } },
    { crackle: { dur: 0.9, gain: 0.3, count: 18 } },
  ],
  // Fire Beam (owner, 11/11/2026). The 1 s charge: flames gathering round the body, a long swell
  // of roaring air over a rising hum, crackling hotter as it builds.
  'beam-charge': [
    { noise: { dur: 1, gain: 0.32, type: 'bandpass', freq: 220, freqEnd: 1300, q: 0.9, attack: 0.8, flutter: 14 } },
    { tone: { wave: 'sine', f0: 50, f1: 110, dur: 1, gain: 0.24, attack: 0.7 } },
    { tone: { wave: 'triangle', f0: 260, f1: 760, dur: 1, gain: 0.05, attack: 0.85 } },
    { crackle: { dur: 1, gain: 0.14, count: 12 } },
  ],
  // The beam: a sustained, concentrated roar of flame for its 1.4 s, gritty and fluttering.
  'beam-roar': [
    {
      noise: {
        dur: 1.45,
        gain: 0.7,
        type: 'bandpass',
        freq: 520,
        freqEnd: 420,
        q: 0.6,
        attack: 0.04,
        flutter: 26,
        drive: 0.4,
      },
    },
    { noise: { dur: 1.45, gain: 0.16, type: 'highpass', freq: 3400, attack: 0.05 } },
    { tone: { wave: 'sawtooth', f0: 82, f1: 70, dur: 1.4, gain: 0.12, attack: 0.04, drive: 0.3 } },
    { crackle: { dur: 1.45, gain: 0.22, count: 20 } },
  ],
  // The beam reaching someone: a searing hiss and a punch of heat.
  'beam-sear': [
    { tone: { wave: 'sine', f0: 120, f1: 50, dur: 0.18, gain: 0.55, drive: 0.2 } },
    { noise: { dur: 0.45, gain: 0.35, type: 'highpass', freq: 2600, freqEnd: 5200, attack: 0.01 } },
    { crackle: { dur: 0.5, gain: 0.2, count: 9 } },
  ],
  // ---- Rampage (owner, 12/11/2026): weight, stone and breath; no fire anywhere.
  // A short effortful grunt as he winds up.
  'rampage-grunt': [
    { tone: { wave: 'sawtooth', f0: 120, f1: 85, dur: 0.22, gain: 0.18, attack: 0.03, drive: 0.4 } },
    { noise: { dur: 0.2, gain: 0.22, type: 'bandpass', freq: 500, freqEnd: 320, q: 2, attack: 0.03 } },
  ],
  // The floor cracking under his fists, a split second before the shockwave.
  'ground-crack': [
    { noise: { dur: 0.12, gain: 0.5, type: 'highpass', freq: 1800, attack: 0.002 } },
    { crackle: { dur: 0.25, gain: 0.3, count: 10 } },
  ],
  // ---- Necro (owner, 12/11/2026): wood and bone, and the hollow, whispering hiss of drawn souls.
  // A staff cutting the air: a long, airy whoosh.
  'staff-whoosh': [
    { noise: { dur: 0.22, gain: 0.4, type: 'bandpass', freq: 600, freqEnd: 1600, q: 0.9, attack: 0.05 } },
    { tone: { wave: 'sine', f0: 160, f1: 90, dur: 0.06, gain: 0.3, delay: 0.12 } },
  ],
  // The staff slamming down: a hard wooden crack over a dark, booming pulse.
  'staff-slam': [
    { noise: { dur: 0.05, gain: 0.6, type: 'bandpass', freq: 1800, q: 1.4 } },
    { tone: { wave: 'sine', f0: 90, f1: 30, dur: 0.5, gain: 0.85, drive: 0.3 } },
    { noise: { dur: 0.45, gain: 0.25, type: 'bandpass', freq: 500, freqEnd: 250, q: 2, attack: 0.04, delay: 0.03 } },
  ],
  // Souls being drawn into the staff: a rising, breathy whisper.
  'soul-gather': [
    { noise: { dur: 0.4, gain: 0.32, type: 'bandpass', freq: 500, freqEnd: 1900, q: 3, attack: 0.25, flutter: 9 } },
    { tone: { wave: 'triangle', f0: 220, f1: 330, dur: 0.4, gain: 0.08, attack: 0.2 } },
  ],
  // Soul Drain flying: a hollow wail sliding down.
  'soul-cast': [
    { noise: { dur: 0.35, gain: 0.4, type: 'bandpass', freq: 1400, freqEnd: 600, q: 4, attack: 0.02 } },
    { tone: { wave: 'sine', f0: 520, f1: 260, dur: 0.35, gain: 0.12 } },
  ],
  // Soul Drain landing: a dull hit and a sucking, rising whoosh (the life flowing back).
  'soul-drain-hit': [
    { tone: { wave: 'sine', f0: 140, f1: 55, dur: 0.2, gain: 0.7 } },
    { noise: { dur: 0.45, gain: 0.35, type: 'bandpass', freq: 400, freqEnd: 2200, q: 2.5, attack: 0.2, delay: 0.05 } },
  ],
  // Grave Chains (owner, 12/11/2026): iron links lashing out, a cold metallic rattle on a hollow whoosh.
  'chain-lash': [
    { noise: { dur: 0.3, gain: 0.35, type: 'bandpass', freq: 900, freqEnd: 2400, q: 1.2, attack: 0.02 } },
    { crackle: { dur: 0.35, gain: 0.22, count: 12 } },
    { tone: { wave: 'triangle', f0: 1650, f1: 1500, dur: 0.18, gain: 0.05, delay: 0.04 } },
  ],
  // The chains biting and yanking: a clank, a taut snap and a dragging scrape.
  'chain-catch': [
    { tone: { wave: 'triangle', f0: 980, f1: 760, dur: 0.12, gain: 0.18 } },
    { noise: { dur: 0.05, gain: 0.55, type: 'bandpass', freq: 2600, q: 2 } },
    { noise: { dur: 0.45, gain: 0.28, type: 'bandpass', freq: 700, freqEnd: 300, q: 1.5, attack: 0.05, delay: 0.06 } },
    { crackle: { dur: 0.4, gain: 0.18, count: 8 } },
  ],
  // The ground answering a call from below: a deep, rumbling groan.
  'grave-call': [
    { tone: { wave: 'sawtooth', f0: 55, f1: 42, dur: 0.6, gain: 0.25, attack: 0.2, drive: 0.4 } },
    { noise: { dur: 0.6, gain: 0.3, type: 'lowpass', freq: 400, attack: 0.25 } },
  ],
  'grave-rumble': [{ noise: { dur: 0.6, gain: 0.4, type: 'lowpass', freq: 300, freqEnd: 120, attack: 0.1 } }],
  // Bone spikes and hands bursting up: a sharp crunch, rattling bone and a thud.
  'bone-eruption': [
    { tone: { wave: 'sine', f0: 100, f1: 35, dur: 0.4, gain: 0.9, drive: 0.35 } },
    { noise: { dur: 0.06, gain: 0.6, type: 'bandpass', freq: 2600, q: 1.5 } },
    { crackle: { dur: 0.5, gain: 0.3, count: 18 } },
  ],
  // A skeleton clawing out of the ground: gritty earth and a dry rattle of bones.
  'summon-rise': [
    { noise: { dur: 0.5, gain: 0.35, type: 'lowpass', freq: 700, freqEnd: 250, attack: 0.15 } },
    { crackle: { dur: 0.45, gain: 0.22, count: 12 } },
    { tone: { wave: 'triangle', f0: 380, f1: 300, dur: 0.18, gain: 0.08, delay: 0.25 } },
  ],
  // Death's Dominion: a swelling choir-like hiss of souls (noise, no notes) and a low drone.
  'dominion-rise': [
    { noise: { dur: 0.9, gain: 0.4, type: 'bandpass', freq: 700, freqEnd: 1800, q: 2, attack: 0.6, flutter: 7 } },
    { tone: { wave: 'sawtooth', f0: 50, f1: 70, dur: 0.9, gain: 0.25, attack: 0.5, drive: 0.5 } },
  ],
  // Teleport out: a hollow, inward rush of breath (the body breaking into smoke).
  'teleport-out': [
    { noise: { dur: 0.3, gain: 0.4, type: 'bandpass', freq: 2200, freqEnd: 500, q: 2.5, attack: 0.02 } },
    { tone: { wave: 'sine', f0: 420, f1: 160, dur: 0.25, gain: 0.12 } },
  ],
  // Teleport in: a soft, low thump and a rising whisper as he reforms.
  'teleport-in': [
    { tone: { wave: 'sine', f0: 90, f1: 60, dur: 0.18, gain: 0.5 } },
    { noise: { dur: 0.35, gain: 0.3, type: 'bandpass', freq: 500, freqEnd: 1800, q: 2.5, attack: 0.12 } },
  ],
  // Ground Smash: a deep thud through the floor, rubble rattling down after it.
  'ground-smash': [
    { tone: { wave: 'sine', f0: 70, f1: 28, dur: 0.55, gain: 1, drive: 0.3 } },
    { noise: { dur: 0.5, gain: 0.7, type: 'lowpass', freq: 900, freqEnd: 150, attack: 0.004, drive: 0.3 } },
    { noise: { dur: 0.7, gain: 0.18, type: 'bandpass', freq: 2400, q: 0.8, attack: 0.05, delay: 0.08 } },
    { crackle: { dur: 0.8, gain: 0.3, count: 22 } },
  ],
  // Rampage Charge wind-up: a snort and the ground being pawed.
  'charge-stomp': [
    { noise: { dur: 0.3, gain: 0.45, type: 'bandpass', freq: 900, freqEnd: 500, q: 1.5, attack: 0.02 } },
    { noise: { dur: 0.25, gain: 0.35, type: 'bandpass', freq: 800, freqEnd: 450, q: 1.5, attack: 0.02, delay: 0.45 } },
    { tone: { wave: 'sine', f0: 90, f1: 60, dur: 0.12, gain: 0.4, delay: 0.75 } },
  ],
  // The charge: a stampede of heavy footfalls under a rush of air.
  'charge-rush': [
    { tone: { wave: 'sine', f0: 80, f1: 40, dur: 0.1, gain: 0.7 } },
    { tone: { wave: 'sine', f0: 80, f1: 40, dur: 0.1, gain: 0.7, delay: 0.16 } },
    { tone: { wave: 'sine', f0: 80, f1: 40, dur: 0.1, gain: 0.7, delay: 0.32 } },
    { tone: { wave: 'sine', f0: 80, f1: 40, dur: 0.1, gain: 0.7, delay: 0.48 } },
    { noise: { dur: 0.7, gain: 0.35, type: 'bandpass', freq: 600, freqEnd: 250, q: 0.6, attack: 0.05, flutter: 12 } },
  ],
  // The charge connecting: a crunching body blow.
  'charge-impact': [
    { tone: { wave: 'sine', f0: 110, f1: 35, dur: 0.35, gain: 0.95, drive: 0.4 } },
    { noise: { dur: 0.25, gain: 0.6, type: 'lowpass', freq: 1500, freqEnd: 300, attack: 0.003, drive: 0.3 } },
    { crackle: { dur: 0.3, gain: 0.25, count: 8 } },
  ],
  // A huge fist cutting the air.
  'heavy-whoosh': [
    { noise: { dur: 0.3, gain: 0.5, type: 'bandpass', freq: 380, freqEnd: 1100, q: 0.8, attack: 0.08 } },
  ],
  // Crushing Strike landing: a bone-deep crunch and a ringing thud.
  'crushing-impact': [
    { tone: { wave: 'sine', f0: 95, f1: 32, dur: 0.45, gain: 1, drive: 0.45 } },
    { noise: { dur: 0.08, gain: 0.6, type: 'bandpass', freq: 2200, q: 1.2 } },
    { noise: { dur: 0.35, gain: 0.5, type: 'lowpass', freq: 1100, freqEnd: 200, attack: 0.004 } },
    { tone: { wave: 'triangle', f0: 260, f1: 180, dur: 0.3, gain: 0.12, delay: 0.02 } },
  ],
  // Rampage Mode: a long bellowing roar, rough and rising.
  'rampage-roar': [
    { tone: { wave: 'sawtooth', f0: 85, f1: 140, dur: 0.8, gain: 0.35, attack: 0.15, drive: 0.6 } },
    { tone: { wave: 'sawtooth', f0: 128, f1: 210, dur: 0.8, gain: 0.18, attack: 0.15, drive: 0.5 } },
    {
      noise: {
        dur: 0.85,
        gain: 0.45,
        type: 'bandpass',
        freq: 700,
        freqEnd: 1100,
        q: 1,
        attack: 0.12,
        flutter: 20,
        drive: 0.3,
      },
    },
  ],
  // The rage taking hold: a burst of pressure and steam.
  'rage-burst': [
    { tone: { wave: 'sine', f0: 60, f1: 30, dur: 0.5, gain: 0.9, drive: 0.3 } },
    { noise: { dur: 0.9, gain: 0.35, type: 'highpass', freq: 2500, freqEnd: 1200, attack: 0.02 } },
  ],
  // His punches: heavier, deeper and meatier than a normal fighter's.
  'rampage-punch': [
    { tone: { wave: 'sine', f0: 120, f1: 45, dur: 0.16, gain: 0.85, drive: 0.25 } },
    { noise: { dur: 0.08, gain: 0.55, type: 'bandpass', freq: 1500, q: 1 } },
  ],
  'rampage-heavy-punch': [
    { tone: { wave: 'sine', f0: 105, f1: 32, dur: 0.32, gain: 1, drive: 0.4 } },
    { noise: { dur: 0.14, gain: 0.6, type: 'lowpass', freq: 1700, freqEnd: 400, attack: 0.002 } },
    { crackle: { dur: 0.25, gain: 0.2, count: 6 } },
  ],
  // Heavy feet: a low thump with each step, and a ground-shaking landing.
  'heavy-footstep': [{ tone: { wave: 'sine', f0: 70, f1: 40, dur: 0.09, gain: 0.4 } }],
  'heavy-land': [
    { tone: { wave: 'sine', f0: 75, f1: 30, dur: 0.25, gain: 0.8, drive: 0.2 } },
    { noise: { dur: 0.2, gain: 0.3, type: 'lowpass', freq: 600, attack: 0.003 } },
  ],
  // Flame Detonation (owner, 12/11/2026): the gathered fire bursting outward, a short sharp blast
  // with a deep thump and a rush of flame.
  'detonation-blast': [
    { tone: { wave: 'sine', f0: 95, f1: 28, dur: 0.5, gain: 1, drive: 0.4 } },
    { noise: { dur: 0.06, gain: 0.7, type: 'bandpass', freq: 1600, q: 0.8 } },
    {
      noise: {
        dur: 0.55,
        gain: 0.7,
        type: 'lowpass',
        freq: 2400,
        freqEnd: 250,
        attack: 0.003,
        flutter: 22,
        drive: 0.4,
      },
    },
    { crackle: { dur: 0.6, gain: 0.25, count: 14 } },
  ],
  // Fight intro (owner, 12/11/2026). READY: a deep, swelling riser under the announcer, a low
  // drum hit and a metallic shimmer, building tension.
  'intro-ready': [
    { tone: { wave: 'sine', f0: 48, f1: 62, dur: 1.3, gain: 0.5, attack: 0.5 } },
    { noise: { dur: 1.3, gain: 0.25, type: 'bandpass', freq: 300, freqEnd: 1600, q: 1.2, attack: 1.0 } },
    { tone: { wave: 'sine', f0: 90, f1: 38, dur: 0.5, gain: 0.8, drive: 0.3 } },
    { tone: { wave: 'triangle', f0: 1240, f1: 1200, dur: 0.9, gain: 0.04, attack: 0.3 } },
  ],
  // FIGHT: a huge impact on the word: a sub-bass drop, a cracking slam, a rush of air and a long
  // ringing metallic tail.
  'intro-fight': [
    { tone: { wave: 'sine', f0: 70, f1: 24, dur: 0.9, gain: 1, drive: 0.5 } },
    { noise: { dur: 0.08, gain: 0.9, type: 'bandpass', freq: 2200, q: 0.7 } },
    { noise: { dur: 0.7, gain: 0.7, type: 'lowpass', freq: 3000, freqEnd: 200, attack: 0.002, drive: 0.4 } },
    { noise: { dur: 0.5, gain: 0.3, type: 'highpass', freq: 3500, freqEnd: 1500, attack: 0.01 } },
    { tone: { wave: 'triangle', f0: 523, f1: 510, dur: 1.2, gain: 0.08, delay: 0.02 } },
    { tone: { wave: 'triangle', f0: 784, f1: 770, dur: 1, gain: 0.05, delay: 0.02 } },
  ],
  // ---- Shroud (owner, 12/11/2026): steel and cloth, breath and blood; quiet and close.
  // A blade cutting air: a thin, fast, high whistle.
  'knife-slash': [
    { noise: { dur: 0.13, gain: 0.45, type: 'bandpass', freq: 2400, freqEnd: 5200, q: 2.2, attack: 0.02 } },
    { tone: { wave: 'sine', f0: 3100, f1: 2600, dur: 0.06, gain: 0.03, delay: 0.03 } },
  ],
  'knife-slash-b': [
    { noise: { dur: 0.15, gain: 0.42, type: 'bandpass', freq: 1900, freqEnd: 4400, q: 2.6, attack: 0.025 } },
  ],
  // Steel drawn from a sheath: a short scraping ring.
  'knife-draw': [
    { noise: { dur: 0.22, gain: 0.25, type: 'bandpass', freq: 3800, freqEnd: 6000, q: 6, attack: 0.04 } },
    { tone: { wave: 'triangle', f0: 2650, f1: 2600, dur: 0.25, gain: 0.03, delay: 0.08 } },
  ],
  // A thrown knife spinning away: a rising, fluttering whirr.
  // The blade going in: a wet, dull thud with a short sharp cut on top.
  'knife-stab': [
    { tone: { wave: 'sine', f0: 140, f1: 60, dur: 0.14, gain: 0.7 } },
    { noise: { dur: 0.05, gain: 0.45, type: 'bandpass', freq: 3200, q: 1.6 } },
    { noise: { dur: 0.18, gain: 0.25, type: 'lowpass', freq: 900, freqEnd: 300, attack: 0.01, delay: 0.02 } },
  ],
  'knife-slash-hit': [
    { tone: { wave: 'sine', f0: 160, f1: 70, dur: 0.1, gain: 0.55 } },
    { noise: { dur: 0.09, gain: 0.5, type: 'bandpass', freq: 4200, freqEnd: 2500, q: 1.4 } },
    { noise: { dur: 0.16, gain: 0.2, type: 'lowpass', freq: 700, attack: 0.01, delay: 0.03 } },
  ],
  // Rending Flurry: three quick cuts in a row.
  'knife-flurry': [
    { noise: { dur: 0.09, gain: 0.4, type: 'bandpass', freq: 2600, freqEnd: 5000, q: 2.4 } },
    { noise: { dur: 0.09, gain: 0.4, type: 'bandpass', freq: 2300, freqEnd: 4600, q: 2.4, delay: 0.08 } },
    { noise: { dur: 0.1, gain: 0.45, type: 'bandpass', freq: 2800, freqEnd: 5400, q: 2.4, delay: 0.16 } },
  ],
  // The lunge: a low rush of dark cloth.
  'shade-rush': [
    { noise: { dur: 0.35, gain: 0.5, type: 'bandpass', freq: 300, freqEnd: 1200, q: 0.8, attack: 0.04, flutter: 18 } },
  ],
  // Shadow Escape (owner, 12/11/2026): a sudden swallowed gulp as he sinks into his shadow, and
  // a cold, breathy exhale where he slips out.
  'shadow-sink': [
    { noise: { dur: 0.22, gain: 0.5, type: 'bandpass', freq: 1400, freqEnd: 250, q: 2, attack: 0.01 } },
    { tone: { wave: 'sine', f0: 220, f1: 55, dur: 0.22, gain: 0.3 } },
  ],
  'shadow-rise': [
    { noise: { dur: 0.4, gain: 0.3, type: 'bandpass', freq: 300, freqEnd: 1100, q: 2.5, attack: 0.08 } },
    { tone: { wave: 'sine', f0: 50, f1: 70, dur: 0.25, gain: 0.35 } },
  ],
  // Shadow gathering round him: a breathy, hollow inhale.
  'shade-gather': [{ noise: { dur: 0.3, gain: 0.3, type: 'bandpass', freq: 600, freqEnd: 1500, q: 2.5, attack: 0.2 } }],
  // Hunting Frenzy: a building, ragged heartbeat and breath, then a sharp snap into the frenzy.
  'frenzy-build': [
    { tone: { wave: 'sine', f0: 60, f1: 50, dur: 0.12, gain: 0.7 } },
    { tone: { wave: 'sine', f0: 62, f1: 50, dur: 0.12, gain: 0.8, delay: 0.25 } },
    { tone: { wave: 'sine', f0: 64, f1: 50, dur: 0.12, gain: 0.9, delay: 0.45 } },
    { noise: { dur: 0.6, gain: 0.25, type: 'bandpass', freq: 500, freqEnd: 1300, q: 1.8, attack: 0.4, flutter: 9 } },
  ],
  // Curse of Decay (owner, 12/11/2026): rot gathered with a wet, sucking hiss; flung with a low,
  // sour groan; landing as a soft rotten splatter with a fizz; and, when it wears off, a dry crumble.
  'decay-gather': [
    { noise: { dur: 0.45, gain: 0.3, type: 'bandpass', freq: 500, freqEnd: 1400, q: 3, attack: 0.3, flutter: 11 } },
    { tone: { wave: 'triangle', f0: 70, f1: 95, dur: 0.45, gain: 0.18, attack: 0.3, drive: 0.3 } },
  ],
  'decay-cast': [
    { noise: { dur: 0.3, gain: 0.4, type: 'bandpass', freq: 900, freqEnd: 400, q: 2, attack: 0.02 } },
    { tone: { wave: 'sawtooth', f0: 160, f1: 85, dur: 0.3, gain: 0.14, drive: 0.4 } },
  ],
  'decay-hit': [
    { noise: { dur: 0.12, gain: 0.6, type: 'lowpass', freq: 900, attack: 0.004 } },
    { noise: { dur: 0.6, gain: 0.25, type: 'highpass', freq: 3200, freqEnd: 1800, attack: 0.05, flutter: 14 } },
    { tone: { wave: 'sine', f0: 140, f1: 60, dur: 0.2, gain: 0.35 } },
  ],
  'decay-fade': [
    { crackle: { dur: 0.5, gain: 0.25, count: 18 } },
    { noise: { dur: 0.4, gain: 0.12, type: 'bandpass', freq: 2400, freqEnd: 900, q: 1.5 } },
  ],
  // Hunting Frenzy's activation (owner, 12/11/2026): a light bulb bursting overhead. A brief
  // electric fizz, a sharp glassy pop, then thin shards tinkling down, with the frenzy's own snap
  // underneath. Original synthesis.
  'bulb-burst': [
    { tone: { wave: 'sawtooth', f0: 120, f1: 100, dur: 0.09, gain: 0.08, drive: 0.6 } },
    { noise: { dur: 0.05, gain: 0.9, type: 'highpass', freq: 2600, delay: 0.07 } },
    { tone: { wave: 'sine', f0: 2400, f1: 900, dur: 0.05, gain: 0.25, delay: 0.07 } },
    { noise: { dur: 0.05, gain: 0.35, type: 'bandpass', freq: 6200, q: 6, delay: 0.16 } },
    { noise: { dur: 0.04, gain: 0.3, type: 'bandpass', freq: 7400, q: 7, delay: 0.24 } },
    { noise: { dur: 0.05, gain: 0.25, type: 'bandpass', freq: 5600, q: 6, delay: 0.33 } },
    { noise: { dur: 0.04, gain: 0.18, type: 'bandpass', freq: 8000, q: 8, delay: 0.44 } },
    { tone: { wave: 'sine', f0: 90, f1: 30, dur: 0.4, gain: 0.7, drive: 0.4, delay: 0.08 } },
  ],
  'frenzy-snap': [
    { tone: { wave: 'sine', f0: 90, f1: 30, dur: 0.4, gain: 0.9, drive: 0.4 } },
    { noise: { dur: 0.06, gain: 0.6, type: 'bandpass', freq: 3000, q: 1.2 } },
    { noise: { dur: 0.5, gain: 0.3, type: 'highpass', freq: 2500, freqEnd: 1200, attack: 0.02 } },
  ],
  'fire-charge': [
    { noise: { dur: 0.28, gain: 0.22, type: 'bandpass', freq: 400, freqEnd: 1700, q: 1.5, attack: 0.16 } },
  ],
  'fire-whoosh': [
    { noise: { dur: 0.4, gain: 0.45, type: 'bandpass', freq: 260, freqEnd: 1400, q: 0.7, attack: 0.1, flutter: 24 } },
    { crackle: { dur: 0.35, gain: 0.12, count: 4 } },
  ],
  'fire-rush': [
    {
      noise: {
        dur: 0.55,
        gain: 0.5,
        type: 'bandpass',
        freq: 240,
        freqEnd: 1500,
        q: 0.7,
        attack: 0.08,
        flutter: 26,
        drive: 0.25,
      },
    },
    { noise: { dur: 0.5, gain: 0.12, type: 'highpass', freq: 2800, attack: 0.1 } },
    { crackle: { dur: 0.5, gain: 0.2, count: 10 } },
  ],
  'fire-burst-small': [
    { tone: { wave: 'sine', f0: 110, f1: 42, dur: 0.24, gain: 0.6 } },
    {
      noise: {
        dur: 0.45,
        gain: 0.55,
        type: 'lowpass',
        freq: 1300,
        freqEnd: 260,
        attack: 0.015,
        flutter: 23,
        drive: 0.25,
      },
    },
    { noise: { dur: 0.35, gain: 0.1, type: 'highpass', freq: 4000, attack: 0.08, delay: 0.1 } },
    { crackle: { dur: 0.45, gain: 0.22, count: 9 } },
  ],
  'ground-rumble': [
    { noise: { dur: 0.5, gain: 0.5, type: 'lowpass', freq: 320 } },
    { tone: { wave: 'sine', f0: 58, f1: 40, dur: 0.5, gain: 0.4 } },
  ],
  'fire-warning': [{ tone: { wave: 'sawtooth', f0: 280, f1: 640, dur: 0.42, gain: 0.07, attack: 0.1 } }],
  'fire-eruption': [
    { tone: { wave: 'sine', f0: 85, f1: 28, dur: 0.65, gain: 1 } },
    { noise: { dur: 0.75, gain: 0.8, type: 'lowpass', freq: 1400, freqEnd: 300 } },
    { crackle: { dur: 0.7, gain: 0.3, count: 12 } },
  ],
  // Eruption landing (owner: "doesn't feel that fire, no excitement"): a growling build-up while
  // aiming, a rushing launch, and a double explosion with a long, crackling, sizzling tail.
  'fire-roar': [
    {
      noise: {
        dur: 0.75,
        gain: 0.5,
        type: 'bandpass',
        freq: 260,
        freqEnd: 900,
        q: 0.7,
        attack: 0.45,
        flutter: 16,
        drive: 0.4,
      },
    },
    { tone: { wave: 'sawtooth', f0: 55, f1: 110, dur: 0.7, gain: 0.12, attack: 0.4, drive: 0.6 } },
    { crackle: { dur: 0.7, gain: 0.16, count: 10 } },
  ],
  'leap-whoosh': [
    {
      noise: {
        dur: 0.7,
        gain: 0.55,
        type: 'bandpass',
        freq: 300,
        freqEnd: 1800,
        q: 0.7,
        attack: 0.08,
        flutter: 24,
        drive: 0.3,
      },
    },
    { noise: { dur: 0.6, gain: 0.18, type: 'highpass', freq: 2500, freqEnd: 5000, attack: 0.1 } },
    { crackle: { dur: 0.6, gain: 0.18, count: 10 } },
  ],
  'meteor-impact': [
    { tone: { wave: 'sine', f0: 70, f1: 22, dur: 1.4, gain: 1.3, drive: 0.35 } },
    { noise: { dur: 0.06, gain: 0.7, type: 'bandpass', freq: 3000, q: 1 } },
    { noise: { dur: 1.5, gain: 1, type: 'lowpass', freq: 2000, freqEnd: 160, attack: 0.01, flutter: 17, drive: 0.5 } },
    { tone: { wave: 'sine', f0: 55, f1: 24, dur: 0.9, gain: 0.9, delay: 0.14 } },
    { noise: { dur: 0.9, gain: 0.55, type: 'bandpass', freq: 600, freqEnd: 200, q: 0.6, delay: 0.14, flutter: 14 } },
    { noise: { dur: 1.3, gain: 0.16, type: 'highpass', freq: 4000, attack: 0.15, delay: 0.3 } },
    { crackle: { dur: 1.6, gain: 0.32, count: 30 } },
  ],
  // Punch Clash: a rising rush as the fighters lock up…
  'clash-start': [
    { noise: { dur: 0.45, gain: 0.35, type: 'bandpass', freq: 500, freqEnd: 2600, q: 1.2, attack: 0.3 } },
    { tone: { wave: 'sawtooth', f0: 110, f1: 220, dur: 0.4, gain: 0.08, attack: 0.25 } },
  ],
  // …fists meeting head-on: a bright double crack…
  'clash-collide': [
    { noise: { dur: 0.06, gain: 0.6, type: 'bandpass', freq: 2800, q: 1.5 } },
    { noise: { dur: 0.05, gain: 0.45, type: 'bandpass', freq: 4200, q: 2, delay: 0.025 } },
    { tone: { wave: 'sine', f0: 160, f1: 70, dur: 0.12, gain: 0.5 } },
  ],
  // …and the guard breaking: a huge thump with a cracking tail.
  'clash-break': [
    { tone: { wave: 'sine', f0: 90, f1: 26, dur: 0.7, gain: 1.2 } },
    { noise: { dur: 0.5, gain: 0.8, type: 'lowpass', freq: 1800, freqEnd: 250 } },
    { noise: { dur: 0.05, gain: 0.6, type: 'bandpass', freq: 3500, q: 1.2 } },
    { crackle: { dur: 0.35, gain: 0.2, count: 6 } },
  ],
  // Furniture (owner, 11/11/2026: realistic destruction). Wood: a dry crack and crunch over a thud.
  'hit-wood': [
    { tone: { wave: 'sine', f0: 190, f1: 95, dur: 0.1, gain: 0.45 } },
    { noise: { dur: 0.06, gain: 0.3, type: 'lowpass', freq: 1200 } },
  ],
  'break-wood': [
    { noise: { dur: 0.05, gain: 0.7, type: 'bandpass', freq: 1700, q: 1.5 } },
    { tone: { wave: 'sine', f0: 140, f1: 55, dur: 0.25, gain: 0.6 } },
    { crackle: { dur: 0.35, gain: 0.35, count: 14 } },
    { noise: { dur: 0.3, gain: 0.3, type: 'lowpass', freq: 900, freqEnd: 300, delay: 0.04 } },
  ],
  // Heavy steel (owner, 12/11/2026: filing cabinets sounded like pots and pans; "a realistic
  // metallic impact ... resonance, vibration and weight"). Not a bright ping: the dull, heavy BOOM
  // of a big sheet-steel body. A deep thump of mass, a gritty contact crunch, a low inharmonic
  // resonance (two near partials beat against each other, so the panel visibly hums and shudders),
  // a fluttering sheet-metal shimmer, and the drawers rattling in their runners as it settles.
  'hit-metal': [
    { tone: { wave: 'sine', f0: 78, f1: 42, dur: 0.24, gain: 0.85, drive: 0.25 } },
    { noise: { dur: 0.08, gain: 0.55, type: 'lowpass', freq: 2400, freqEnd: 500, attack: 0.002, drive: 0.3 } },
    { tone: { wave: 'triangle', f0: 182, f1: 176, dur: 0.75, gain: 0.2 } },
    { tone: { wave: 'triangle', f0: 187, f1: 181, dur: 0.7, gain: 0.16 } },
    { tone: { wave: 'sine', f0: 433, f1: 425, dur: 0.5, gain: 0.07 } },
    { tone: { wave: 'sine', f0: 897, f1: 884, dur: 0.28, gain: 0.03 } },
    { noise: { dur: 0.55, gain: 0.08, type: 'bandpass', freq: 1150, q: 6, attack: 0.01, flutter: 17 } },
    { crackle: { dur: 0.3, gain: 0.12, count: 6 } },
  ],
  // A steel cabinet wrecked: a bigger, longer boom, buckling panels, a crunch and drawers clattering out.
  'break-metal': [
    { tone: { wave: 'sine', f0: 70, f1: 30, dur: 0.45, gain: 1, drive: 0.35 } },
    { noise: { dur: 0.16, gain: 0.7, type: 'lowpass', freq: 2600, freqEnd: 350, attack: 0.002, drive: 0.4 } },
    { tone: { wave: 'triangle', f0: 158, f1: 140, dur: 1.1, gain: 0.24 } },
    { tone: { wave: 'triangle', f0: 163, f1: 146, dur: 1, gain: 0.18 } },
    { tone: { wave: 'sine', f0: 377, f1: 350, dur: 0.7, gain: 0.08 } },
    { noise: { dur: 0.9, gain: 0.12, type: 'bandpass', freq: 950, freqEnd: 700, q: 5, attack: 0.02, flutter: 13 } },
    { crackle: { dur: 0.7, gain: 0.3, count: 16 } },
  ],
  // Glass and screens: a bright shatter and a tinkle of falling shards.
  'break-glass': [
    { noise: { dur: 0.18, gain: 0.6, type: 'highpass', freq: 2800 } },
    { crackle: { dur: 0.6, gain: 0.35, count: 18 } },
    { tone: { wave: 'sine', f0: 3200, f1: 2900, dur: 0.12, gain: 0.05, delay: 0.05 } },
  ],
  'hit-plastic': [
    { noise: { dur: 0.04, gain: 0.35, type: 'bandpass', freq: 2200, q: 1.2 } },
    { tone: { wave: 'sine', f0: 300, f1: 180, dur: 0.05, gain: 0.25 } },
  ],
  'break-plastic': [
    { noise: { dur: 0.07, gain: 0.55, type: 'bandpass', freq: 2000, q: 1 } },
    { crackle: { dur: 0.3, gain: 0.25, count: 8 } },
    { tone: { wave: 'sine', f0: 220, f1: 110, dur: 0.12, gain: 0.3 } },
  ],
  // Fabric and plants: a muffled thump and a rip.
  'hit-soft': [{ tone: { wave: 'sine', f0: 130, f1: 80, dur: 0.1, gain: 0.4 } }],
  'break-soft': [
    { tone: { wave: 'sine', f0: 120, f1: 60, dur: 0.18, gain: 0.5 } },
    { noise: { dur: 0.25, gain: 0.35, type: 'bandpass', freq: 900, freqEnd: 1600, q: 1.2 } },
  ],
  // A wall section giving way: a crunching crack, a heavy thump and plaster raining down.
  'break-wall': [
    { noise: { dur: 0.08, gain: 0.7, type: 'bandpass', freq: 1500, q: 1.2 } },
    { tone: { wave: 'sine', f0: 90, f1: 32, dur: 0.45, gain: 0.9 } },
    { noise: { dur: 0.6, gain: 0.45, type: 'lowpass', freq: 1200, freqEnd: 250, delay: 0.03 } },
    { crackle: { dur: 0.7, gain: 0.3, count: 18 } },
  ],
  // A burst fire extinguisher: a sharp pop and a long, fading hiss of foam.
  'foam-burst': [
    { tone: { wave: 'sine', f0: 160, f1: 60, dur: 0.12, gain: 0.5 } },
    { noise: { dur: 1.2, gain: 0.45, type: 'highpass', freq: 2500, freqEnd: 5000, attack: 0.02 } },
    { noise: { dur: 0.9, gain: 0.2, type: 'bandpass', freq: 900, q: 0.6, attack: 0.05 } },
  ],
  // KO: a heavy, final boom.
  ko: [
    { tone: { wave: 'sine', f0: 95, f1: 28, dur: 0.65, gain: 1 } },
    { noise: { dur: 0.45, gain: 0.5, type: 'lowpass', freq: 700, freqEnd: 150 } },
  ],
  // Dissolving into dust: a soft rising shimmer of sand.
  dust: [
    { noise: { dur: 1.3, gain: 0.13, type: 'highpass', freq: 3500, freqEnd: 7000, attack: 0.45 } },
    { tone: { wave: 'sine', f0: 900, f1: 2100, dur: 1.0, gain: 0.025, attack: 0.3, delay: 0.1 } },
  ],
};

export function hasSound(id: string): boolean {
  return id in RECIPES;
}

/** The effects' level at full volume (the compressor keeps stacked hits from clipping). */
const SFX_LEVEL = 0.55;

export class SoundBoard {
  private ctx: Ctx | null = null;
  private out: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private unlocked = false;
  muted = false;
  /** Sound-effect volume from the settings, 0..1 (applied at once). */
  private volume = 1;
  private seed = 7;
  private readonly curves = new Map<number, Float32Array<ArrayBuffer>>();
  private bus: AudioNode | null = null;

  /** The audio context once unlocked (the music player shares it). */
  get context(): AudioContext | null {
    return this.ctx;
  }

  /** Where music connects: through the same limiter as the effects, at its own level. */
  get musicBus(): AudioNode | null {
    return this.bus;
  }

  /** Call from a user input event (browsers block audio before one). */
  unlock(): void {
    if (this.unlocked) return;
    const Ctor = typeof window === 'undefined' ? undefined : window.AudioContext;
    if (!Ctor) return;
    this.unlocked = true;
    const ctx = new Ctor();
    const comp = ctx.createDynamicsCompressor(); // stacked hits must not clip
    const master = ctx.createGain();
    master.gain.value = SFX_LEVEL * this.volume;
    master.connect(comp).connect(ctx.destination);
    this.bus = comp;
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = this.rand() * 2 - 1;
    this.ctx = ctx;
    this.out = master;
    this.noise = buffer;
    void ctx.resume();
  }

  /** Sound-effect volume 0..1 (settings); takes effect immediately, music is separate. */
  setVolume(v: number): void {
    this.volume = Math.min(1, Math.max(0, v));
    if (this.out && this.ctx) this.out.gain.setTargetAtTime(SFX_LEVEL * this.volume, this.ctx.currentTime, 0.02);
  }

  get effectsVolume(): number {
    return this.volume;
  }

  /** Play a sound; `gain` scales its loudness (the Punch Clash builds it up). */
  play(id: string, gain = 1): void {
    const ctx = this.ctx;
    const out = this.out;
    const recipe = RECIPES[id];
    if (!ctx || !out || !recipe || this.muted) return;
    const t = ctx.currentTime + 0.005;
    const pitch = 0.94 + this.rand() * 0.12;
    const level = (0.88 + this.rand() * 0.24) * gain;
    for (const layer of recipe) {
      if ('tone' in layer) this.tone(ctx, out, t, layer.tone, pitch, level);
      else if ('noise' in layer) this.noiseLayer(ctx, out, t, layer.noise, pitch, level);
      else this.crackle(ctx, out, t, layer.crackle, level);
    }
  }

  private envelope(ctx: Ctx, t: number, dur: number, gain: number, attack = 0.002): GainNode {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    return g;
  }

  private tone(ctx: Ctx, out: AudioNode, t0: number, s: ToneSpec, pitch: number, level: number): void {
    const t = t0 + (s.delay ?? 0);
    const osc = ctx.createOscillator();
    osc.type = s.wave;
    osc.frequency.setValueAtTime(s.f0 * pitch, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, s.f1 * pitch), t + s.dur);
    osc
      .connect(this.shaper(ctx, s.drive))
      .connect(this.envelope(ctx, t, s.dur, s.gain * level, s.attack))
      .connect(out);
    osc.start(t);
    osc.stop(t + s.dur + 0.02);
  }

  private noiseLayer(ctx: Ctx, out: AudioNode, t0: number, s: NoiseSpec, pitch: number, level: number): void {
    if (!this.noise) return;
    const t = t0 + (s.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = s.type;
    filter.Q.value = s.q ?? 0.7;
    filter.frequency.setValueAtTime(s.freq * pitch, t);
    if (s.freqEnd) filter.frequency.exponentialRampToValueAtTime(s.freqEnd * pitch, t + s.dur);
    const env = this.envelope(ctx, t, s.dur, s.gain * level, s.attack);
    src.connect(filter).connect(this.shaper(ctx, s.drive)).connect(env);
    if (s.flutter) {
      // Flame turbulence: a wobbling gain stage (a slightly random rate so no two roars match).
      const trem = ctx.createGain();
      trem.gain.value = 0.7;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = s.flutter * (0.85 + this.rand() * 0.3);
      const depth = ctx.createGain();
      depth.gain.value = 0.3;
      lfo.connect(depth).connect(trem.gain);
      env.connect(trem).connect(out);
      lfo.start(t);
      lfo.stop(t + s.dur + 0.02);
    } else {
      env.connect(out);
    }
    src.start(t, this.rand() * 0.5);
    src.stop(t + s.dur + 0.02);
  }

  /** Overdrive for grit (`drive` 0..1); a pass-through gain when there is none. Curves are cached. */
  private shaper(ctx: Ctx, drive = 0): AudioNode {
    if (drive <= 0) return ctx.createGain();
    const key = Math.round(drive * 20);
    let curve = this.curves.get(key);
    if (!curve) {
      const k = 1 + key * 2.5;
      curve = new Float32Array(1024);
      for (let i = 0; i < curve.length; i++) {
        const x = (i / (curve.length - 1)) * 2 - 1;
        curve[i] = Math.tanh(k * x) / Math.tanh(k);
      }
      this.curves.set(key, curve);
    }
    const ws = ctx.createWaveShaper();
    ws.curve = curve;
    return ws;
  }

  /** Fire crackle: a scatter of tiny high clicks. */
  private crackle(
    ctx: Ctx,
    out: AudioNode,
    t0: number,
    s: { dur: number; gain: number; count: number },
    level: number,
  ): void {
    for (let i = 0; i < s.count; i++) {
      this.noiseLayer(
        ctx,
        out,
        t0,
        {
          dur: 0.012 + this.rand() * 0.015,
          gain: s.gain * (0.5 + this.rand()),
          type: 'highpass',
          freq: 3000 + this.rand() * 4000,
          delay: this.rand() * s.dur,
        },
        1,
        level,
      );
    }
  }

  private rand(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
}
