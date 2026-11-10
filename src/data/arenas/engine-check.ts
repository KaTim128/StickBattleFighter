/**
 * Phase 0 engine-check arena data, 2D top-down: GREYBOX ONLY (TD-021).
 * A walled floor seen from above and a crate that slides, spins and bounces
 * off the walls. Not the office arena (Phase 4); no game content.
 * World units are metres; floor spans (0,0)–(arenaWidthM, arenaHeightM),
 * +x = right, +y = down. Rendering and physics both read these values.
 */
export const ENGINE_CHECK = {
  arenaWidthM: 16,
  arenaHeightM: 10,
  wallThicknessM: 0.5,
  crateHalfSizeM: 0.5,
  crateStart: { x: 3, y: 3 },
  crateVelocity: { x: 12, y: 8 },
  crateDamping: 0.8,
  crateRestitution: 0.55,
  crateFriction: 0.1,
  colours: {
    background: 0x141922,
    floor: 0x4c5563,
    grid: 0x5f6977,
    wall: 0x2a303b,
    wallEdge: 0x7b8594,
    crate: 0xe0a14a,
    crateEdge: 0x8a5a1c,
    shadow: 0x000000,
  },
} as const;
