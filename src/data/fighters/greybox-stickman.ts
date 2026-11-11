/**
 * GREYBOX test fighter for Phase 2 movement. Not one of the roster fighters
 * (Inferno, Shadowfang, Ronin, Titan, Phantom arrive in Phases 8–9 with their
 * own stances, gaits and attacks, REQ-ANI-7). Values are placeholders pending
 * the stat baselines (OQ-05).
 */
export const GREYBOX_STICKMAN = {
  id: 'greybox-stickman',
  movement: {
    maxSpeedMps: 5,
    accelMps2: 32,
    decelMps2: 40,
    jumpSpeedMps: 4.2,
    hopGravityMps2: 22,
  },
  body: {
    /** Collision footprint on the floor (a circle around the feet). */
    footRadiusM: 0.32,
    massKg: 70,
  },
  /** Bone lengths in metres for the jointed rig (REQ-ANI-6). */
  bones: {
    spine: 0.5,
    neck: 0.08,
    headRadius: 0.16,
    upperArm: 0.28,
    foreArm: 0.26,
    thigh: 0.4,
    shin: 0.4,
  },
  look: {
    limb: 0xff7a2e,
    limbBack: 0xc4581f,
    outline: 0x1b1b1f,
    limbWidthM: 0.075,
    outlineWidthM: 0.035,
  },
} as const;
