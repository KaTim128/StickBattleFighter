/**
 * Phase 0 engine-check arena data, 2D top-down: GREYBOX ONLY (TD-021).
 * A walled floor seen from above and a crate that slides, spins and bounces
 * off the walls. Not the office arena (Phase 4); no game content.
 * World units are metres; floor spans (0,0)–(arenaWidthM, arenaHeightM),
 * +x = right, +y = down. Rendering and physics both read these values.
 */
import { GREYBOX_COLOURS } from './greybox-arena';

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
  /** Upright greybox pillars: a collider footprint on the floor, drawn rising "up" the screen. */
  pillars: [
    // Kept clear of the crate's launch path so it still proves wall bounces.
    { x: 5.5, y: 6.8 },
    { x: 11, y: 3 },
    { x: 8, y: 8.6 },
  ],
  pillarFootprintHalf: { x: 0.4, y: 0.3 },
  pillarHeightM: 1.8,
  colours: { ...GREYBOX_COLOURS, crate: 0xe0a14a, crateEdge: 0x8a5a1c },
} as const;
