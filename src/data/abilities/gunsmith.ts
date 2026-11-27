import type { AbilityKit } from '../../abilities/ability-def';
import { chargeFor } from '../../abilities/ultimate-charge';

/**
 * Gunsmith's kit (owner, 26/11/2026): a gunslinger with two pistols. Dual Barrage (a volley from both guns), Explosive Rounds (a bullet that
 * bursts), Ricochet Shot (a bullet that bounces off the arena), Tactical Roll (a rolling dodge that fires as it goes) and Quick Draw
 * (a rapid run of targeted shots ending in a powerful one); the ultimate is a sustained, aimable Machine Gun Rampage. Values are PROVISIONAL (OQ-05).
 */
const BRASS = { deep: 0x3a1d08, hot: 0xd98a1a, bright: 0xffd070, core: 0xfff6d0 } as const;
/** Where each gun's muzzle is, at shoulder height and out along the aimed arm (see `ProjectileDelivery.muzzle`): every bullet starts there. */
const PISTOL_MUZZLE = { heightM: 1.36, reachM: 0.95 } as const;
const SHOTGUN_MUZZLE = { heightM: 1.36, reachM: 1.35 } as const;
const MACHINE_GUN_MUZZLE = { heightM: 1.42, reachM: 1.05 } as const;
const muzzle = (ringM: number, shake: number) => ({
  flashM: ringM * 0.5,
  sparks: 14,
  motes: 10,
  ringM,
  smoke: 3,
  groundFire: false,
  smokeColour: 0x4a4038,
  shake,
});

export const GUNSMITH_KIT: AbilityKit = {
  comboIcon: 'pistol-combo',
  heavyIcon: 'quickdraw-blast',
  a1: {
    id: 'dualBarrage',
    name: 'Dual Barrage',
    label: 'BARRAGE',
    description:
      'Rapidly fires both pistols at the opponent, eight shots one after another from alternating hands, each one a separate hit.',
    icon: 'dual-barrage',
    slot: 'a1',
    staminaCost: 26,
    cooldownS: 8,
    castS: 0.2,
    recoveryS: 0.3,
    aimRangeM: 10,
    moveFactor: 0.4,
    interruptible: true,
    payload: { damage: 9, knockbackMps: 0.4, heavy: false, strength: 160, impact: 'knuckle-light', noFlinch: true },
    delivery: { type: 'projectile', speedMps: 34, radiusM: 0.18, maxRangeM: 11, burst: { count: 8, gapS: 0.07, jitterRad: 0.05 }, muzzle: PISTOL_MUZZLE },
    vfx: 'dual-barrage',
    sfx: { cast: 'gun-draw', release: 'gun-shot', impact: 'bullet-hit' },
    look: { palette: BRASS, flight: { trailPerS: 60, sparksPerS: 10, bullet: 0.3, shimmer: false }, impact: muzzle(0.5, 0.1), hitFlash: 0xffe9b0 },
  },
  a2: {
    id: 'explosiveRounds',
    name: 'Shotgun Blast',
    label: 'BLAST',
    description:
      'Drops both pistols, brings out a shotgun in one hand and fires a blast of eight pellets in a spreading cone. Up close the pellets all land and hit very hard; the further the target, the more the cone spreads and the weaker each pellet gets.',
    icon: 'explosive-rounds',
    slot: 'a2',
    staminaCost: 30,
    cooldownS: 11,
    castS: 0.45, // long enough to drop the pistols and bring the shotgun out
    recoveryS: 0.45,
    aimRangeM: 8,
    moveFactor: 0.2,
    interruptible: true,
    // Per pellet: full damage inside 2 m, falling to a fifth at the end of its range (owner, 26/11/2026).
    payload: { damage: 15, knockbackMps: 1.2, heavy: false, strength: 160, impact: 'knuckle-light', noFlinch: true, falloff: { fullWithinM: 2, minFactor: 0.2 } },
    delivery: { type: 'projectile', speedMps: 40, radiusM: 0.16, maxRangeM: 9, fan: { count: 8, spreadRad: 0.36 }, muzzle: SHOTGUN_MUZZLE },
    vfx: 'explosive-rounds',
    sfx: { cast: 'gun-load-heavy', release: 'gun-boom', impact: 'bullet-explode' },
    look: {
      palette: BRASS,
      flight: { trailPerS: 40, sparksPerS: 6, bullet: 0.22, shimmer: false },
      impact: muzzle(0.7, 0.2),
      hitFlash: 0xffd090,
    },
  },
  a3: {
    id: 'ricochetShot',
    name: 'Ricochet Shot',
    label: 'RICOCHET',
    description:
      'Fires a bullet that bounces off walls and furniture, up to twelve times, before it finds the opponent: angle it off the arena to hit someone who is covered.',
    icon: 'ricochet-shot',
    slot: 'a3',
    staminaCost: 24,
    cooldownS: 9,
    castS: 0.25,
    recoveryS: 0.35,
    aimRangeM: 12,
    moveFactor: 0.3,
    interruptible: true,
    payload: { damage: 46, knockbackMps: 1.5, heavy: false, strength: 300, impact: 'knuckle-light' },
    delivery: { type: 'projectile', speedMps: 30, radiusM: 0.2, maxRangeM: 60, bounces: 12, muzzle: PISTOL_MUZZLE },
    vfx: 'ricochet-shot',
    sfx: { cast: 'gun-draw', release: 'gun-ricochet', impact: 'bullet-ping' },
    look: { palette: BRASS, flight: { trailPerS: 120, sparksPerS: 24, bullet: 0.3, shimmer: true }, impact: muzzle(0.6, 0.15), hitFlash: 0xffe9b0 },
  },
  a4: {
    id: 'tacticalRoll',
    name: 'Tactical Counter',
    label: 'COUNTER',
    description:
      'Raises a counter aura around him, side-on to the opponent, for 1.5 seconds. If the opponent attacks inside it, he dodges the blow automatically and returns three pistol shots.',
    icon: 'tactical-roll',
    slot: 'a4',
    staminaCost: 22,
    cooldownS: 10,
    castS: 0.1,
    recoveryS: 1.4,
    aimRangeM: 9,
    moveFactor: 0.15,
    interruptible: false,
    payload: { damage: 16, knockbackMps: 0.8, heavy: false, strength: 160, impact: 'knuckle-light', noFlinch: true },
    delivery: {
      type: 'parry',
      windowS: 1.5,
      stunS: 0,
      answer: { shots: 3, gapS: 0.1, speedMps: 44, radiusM: 0.2, maxRangeM: 11, muzzle: PISTOL_MUZZLE },
    },
    vfx: 'tactical-roll',
    sfx: { cast: 'roll-whoosh', release: 'gun-shot-light', impact: 'bullet-hit-light' },
    look: { palette: BRASS, flight: { trailPerS: 60, sparksPerS: 10, bullet: 0.28, shimmer: false }, impact: muzzle(0.5, 0.1), hitFlash: 0xffe9b0 },
  },
  a5: {
    id: 'quickdrawExecution',
    name: 'Quick Draw',
    label: 'DRAW',
    description:
      'A swift, single-shot execution for mid to close range: he turns side-on, one hand aimed at the opponent and the other pistol down at his side, and delivers an instant, precise shot that hits harder than any one shot of Dual Barrage but for moderate damage overall.',
    icon: 'quickdraw-execution',
    slot: 'a4',
    staminaCost: 22,
    cooldownS: 9,
    castS: 0.15,
    recoveryS: 0.4,
    aimRangeM: 7,
    moveFactor: 0,
    interruptible: true,
    // One precise round, no scatter: harder than a single Dual Barrage shot (9).
    payload: { damage: 32, knockbackMps: 1.6, heavy: false, strength: 220, impact: 'knuckle-light', noFlinch: true },
    delivery: {
      type: 'projectile',
      speedMps: 60,
      radiusM: 0.2,
      maxRangeM: 7.5,
      burst: { count: 1, gapS: 0.1 },
      muzzle: PISTOL_MUZZLE,
    },
    vfx: 'quickdraw-execution',
    sfx: { cast: 'gun-quickdraw', release: 'gun-shot-fast', impact: 'bullet-execute' },
    look: { palette: BRASS, flight: { trailPerS: 100, sparksPerS: 20, bullet: 0.28, shimmer: true }, impact: muzzle(0.8, 0.3), hitFlash: 0xfff0c0 },
  },
  ult: {
    id: 'machineGunRampage',
    name: 'Machine Gun Rampage',
    label: 'ULT',
    description:
      'Pulls out a powerful machine gun and unleashes a sustained barrage of bullets for about three seconds, which he can aim with the mouse or a swipe while he fires and walk slowly through.',
    icon: 'machine-gun-rampage',
    slot: 'ult',
    staminaCost: 0,
    cooldownS: 1,
    castS: 0.6,
    recoveryS: 0.5,
    aimRangeM: 11,
    moveFactor: 0.3,
    interruptible: false,
    payload: { damage: 5, knockbackMps: 0.3, heavy: false, strength: 160, impact: 'knuckle-light', noFlinch: true },
    delivery: {
      type: 'projectile',
      speedMps: 36,
      radiusM: 0.2,
      maxRangeM: 12,
      burst: { count: 44, gapS: 0.065, jitterRad: 0.07, aimable: true },
      muzzle: MACHINE_GUN_MUZZLE,
    },
    vfx: 'machine-gun',
    sfx: { cast: 'gun-machine-ready', release: 'gun-machine-burst', impact: 'bullet-hit-heavy' },
    look: {
      palette: BRASS,
      charge: { gatherRadiusM: 1.0, motesPerS: 50, coreMaxM: 0.15 },
      flight: { trailPerS: 80, sparksPerS: 14, bullet: 0.2, shimmer: false },
      impact: muzzle(0.6, 0.12),
      hitFlash: 0xffe9b0,
    },
  },
  charge: chargeFor('machineGunRampage'),
};
