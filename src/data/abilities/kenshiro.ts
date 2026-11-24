import type { AbilityKit } from '../../abilities/ability-def';
import { chargeFor } from '../../abilities/ultimate-charge';

/**
 * Kenshiro's kit (master plan section 4, fighter 10): a disciplined two-sword duelist and counterattacker. Every ability
 * is a sword ability (`payload.sword`) so Sword Mastery can sharpen the next one. He wins by reading the opponent: the
 * parry window is short and the counter is the biggest single blow he has. Values are PROVISIONAL (OQ-05).
 */
const CRIMSON = { deep: 0x4a0a12, hot: 0xc01f30, bright: 0xff6a72, core: 0xffe9e9 } as const;
const SLASH = { colour: 0xcfd7e2, edge: 0xff5a64 } as const;

export const KENSHIRO_KIT: AbilityKit = {
  comboIcon: 'katana-combo',
  heavyIcon: 'overhead-cut',
  passive: {
    id: 'mastery',
    name: 'Sword Mastery',
    description:
      'Every landed blow builds sword mastery, and a perfect parry builds three. At 8 the next sword ability is enhanced by 30% for all its cuts, and the mastery is spent.',
    maxStacks: 8,
    durationS: 0,
    speedPerStack: 0,
    mastery: { threshold: 8, damageFactor: 1.3, windowS: 2.5 },
  },
  // A1 (Q): Sliding Slice. He drops low and slides along the floor a short way, the sword out level, slicing through
  // whoever is in his path (each enemy once). A target at 15% health or less takes 60% more: the swordmaster's finishing cut.
  a1: {
    id: 'slidingSlice',
    name: 'Sliding Slice',
    label: 'SLICE',
    description:
      'Slides along the floor for a very short distance, slicing through any opponent in his path. An opponent at 15% health or less takes 60% more damage.',
    icon: 'sliding-slice',
    slot: 'a1',
    staminaCost: 22,
    cooldownS: 8,
    castS: 0.12,
    recoveryS: 0.35,
    aimRangeM: 3.2,
    moveFactor: 0,
    interruptible: true,
    payload: {
      damage: 38,
      knockbackMps: 0.4,
      heavy: false,
      strength: 360,
      noFlinch: true,
      impact: 'knuckle-heavy',
      sword: true,
      finisher: { belowHp: 0.15, bonus: 0.6 },
    },
    delivery: { type: 'dash', distanceM: 3.2, speedMps: 17, hitRadiusM: 0.75 },
    vfx: 'sliding-slice',
    sfx: { cast: 'katana-ready', release: 'slide-slice', impact: 'slice-hit' },
    look: {
      palette: CRIMSON,
      impact: { flashM: 0.7, sparks: 22, motes: 10, ringM: 0.9, groundFire: false, smokeColour: 0x3a1015 },
      hitFlash: 0xffe0e0,
      slash: SLASH,
    },
  },
  // A2 (E): Perfect Parry. A defensive stance for 0.6 seconds. The first attack from the front that connects in that
  // window is deflected (the attacker staggers) and he answers with a heavy counter in the same instant.
  a2: {
    id: 'perfectParry',
    name: 'Perfect Parry',
    label: 'PARRY',
    description:
      'Enters a guarded stance for 0.6 seconds. If an attack from the front connects in that window it is deflected, the attacker staggers and he counters at once with a heavy cut. Miss the timing and it is wasted.',
    icon: 'perfect-parry',
    slot: 'a2',
    staminaCost: 18,
    cooldownS: 8,
    castS: 0.08,
    recoveryS: 0.5,
    aimRangeM: 0,
    moveFactor: 0.15,
    interruptible: false,
    payload: { damage: 50, knockbackMps: 7, heavy: true, strength: 700, impact: 'knuckle-heavy', sword: true },
    delivery: { type: 'parry', windowS: 0.6, stunS: 0.9 },
    vfx: 'perfect-parry',
    sfx: { cast: 'katana-ready', release: 'parry-stance', impact: 'parry-counter' },
    look: {
      palette: CRIMSON,
      impact: { flashM: 1, sparks: 28, motes: 10, ringM: 1.2, groundFire: false, smokeColour: 0x3a1015 },
      hitFlash: 0xffffff,
      aura: 'quiet',
    },
  },
  // A3 (F): Blade Tempest. He drives forward through a rapid string of six distinct cuts.
  a3: {
    id: 'bladeTempest',
    name: 'Blade Tempest',
    label: 'TEMPEST',
    description: 'Drives forward through a rapid string of six different cuts, the last one the hardest.',
    icon: 'blade-tempest',
    slot: 'a3',
    staminaCost: 34,
    cooldownS: 11,
    castS: 0.2,
    recoveryS: 0.5,
    aimRangeM: 4.5,
    moveFactor: 0.3,
    interruptible: true,
    payload: {
      damage: 16,
      knockbackMps: 1.2,
      heavy: false,
      strength: 300,
      noFlinch: true,
      impact: 'knuckle-heavy',
      sword: true,
    },
    delivery: {
      type: 'assault',
      approachSpeedMps: 10,
      maxApproachS: 0.45,
      reachM: 1.7,
      radiusM: 0.75,
      stabs: 6,
      stabIntervalS: 0.12,
      finalFactor: 1.8,
      stabSfx: ['katana-cut-1', 'katana-cut-2', 'katana-cut-3'],
    },
    vfx: 'blade-tempest',
    sfx: { cast: 'katana-draw', release: 'katana-cut-2', impact: 'tempest-hit' },
    look: {
      palette: CRIMSON,
      impact: { flashM: 0.7, sparks: 20, motes: 10, ringM: 0.9, groundFire: false, smokeColour: 0x3a1015 },
      hitFlash: 0xffe0e0,
      slash: SLASH,
    },
  },
  // A4 (R): Focus Stance. He settles into a swordmaster's stance: red light gathers along both blades. 6 seconds of 20%
  // sharper cuts, 10% less damage taken, and a Perfect Parry cast meanwhile lasts 50% longer. No crits, no free damage.
  a4: {
    id: 'focusStance',
    name: 'Focus Stance',
    label: 'FOCUS',
    description:
      'Settles into a disciplined stance for 6 seconds: sword attacks 20% stronger, 10% less damage taken, and Perfect Parry lasts 50% longer. A subtle red glow runs along his blades.',
    icon: 'focus-stance',
    slot: 'a4',
    staminaCost: 20,
    cooldownS: 14,
    castS: 0.3,
    recoveryS: 0.25,
    aimRangeM: 0,
    moveFactor: 0.5,
    interruptible: true,
    payload: { damage: 0, knockbackMps: 0, heavy: false, strength: 0 },
    delivery: {
      type: 'buff',
      durationS: 6,
      speedFactor: 1,
      damageTakenFactor: 0.9,
      abilityDamageFactor: 1.2,
      meleeDamageFactor: 1.2,
      parryWindowFactor: 1.5,
    },
    vfx: 'focus-stance',
    sfx: { cast: 'katana-ready', release: 'focus-breath', impact: 'focus-breath' },
    look: {
      palette: CRIMSON,
      impact: { flashM: 0.4, sparks: 4, motes: 14, ringM: 1.1, smoke: 2, groundFire: false, smokeColour: 0x3a1015 },
      aura: 'quiet',
    },
  },
  // A5 (fifth): Iaido. A quick draw: he stays where he stands and cuts once, instantly, along a long thin line. Heavy damage on the first
  // enemy it reaches and no knockback; the opposite of Sliding Slice, which travels and cuts through everything on the way.
  a5: {
    id: 'iaidoDraw',
    name: 'Iaido',
    label: 'IAIDO',
    description:
      'Stands his ground, then draws and cuts in a single instant: one long, thin slash that reaches 4 metres ahead and hits the first opponent in its line for heavy damage, with no knockback.',
    icon: 'iaido-draw',
    slot: 'a1',
    staminaCost: 26,
    cooldownS: 11,
    castS: 0.3,
    recoveryS: 0.35,
    aimRangeM: 4.2,
    moveFactor: 0,
    interruptible: true,
    payload: {
      damage: 56,
      knockbackMps: 0,
      heavy: false,
      strength: 320,
      noFlinch: true,
      impact: 'knuckle-heavy',
      sword: true,
    },
    delivery: { type: 'strike', reachM: 4.2, radiusM: 0.5 },
    vfx: 'iaido-draw',
    sfx: { cast: 'katana-ready', release: 'iaido-draw', impact: 'iaido-hit' },
    look: {
      palette: CRIMSON,
      impact: { flashM: 0.8, sparks: 20, motes: 10, ringM: 0.9, groundFire: false, smokeColour: 0x3a1015 },
      hitFlash: 0xffffff,
      slash: SLASH,
    },
  },
  // ULT (I): Final Judgement. He rushes the nearest enemy and cuts eight times faster than the eye follows, none of it
  // landing yet; he is back where he began before the cuts all land at once. Untouchable until then.
  ult: {
    id: 'finalJudgement',
    name: 'Final Judgement',
    label: 'ULT',
    description:
      'Rushes the nearest enemy and cuts eight times, unseen, then returns to where he began. Half a second later every cut lands at once as one devastating blow. He cannot be hit until it lands.',
    icon: 'final-judgement',
    slot: 'ult',
    staminaCost: 0,
    cooldownS: 1,
    castS: 0.35,
    recoveryS: 0.6,
    aimRangeM: 7,
    moveFactor: 0,
    interruptible: false,
    payload: { damage: 14, knockbackMps: 10, heavy: true, strength: 900, impact: 'knuckle-heavy', sword: true },
    delivery: { type: 'judgement', rangeM: 7, strikes: 8, strikeIntervalS: 0.09, resolveDelayS: 0.5 },
    vfx: 'final-judgement',
    sfx: { cast: 'katana-ready', release: 'judgement-cut', impact: 'judgement-land' },
    look: {
      palette: CRIMSON,
      impact: {
        flashM: 2.2,
        sparks: 40,
        motes: 30,
        ringM: 2.6,
        smoke: 8,
        groundFire: false,
        smokeColour: 0x2a0a10,
        shake: 0.55,
      },
      hitFlash: 0xffffff,
      slash: SLASH,
    },
  },
  charge: chargeFor('finalJudgement'),
};
