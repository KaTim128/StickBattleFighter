import { GREYBOX_COLOURS } from './greybox-arena';

/**
 * Phase 2 movement test arena: GREYBOX ONLY. Larger than the screen so the
 * follow camera has room to move; pillars to walk around and slide along.
 * Not the office arena (Phase 4).
 */
export const TRAINING_YARD = {
  arenaWidthM: 30,
  arenaHeightM: 20,
  wallThicknessM: 0.5,
  pillars: [
    { x: 8, y: 6 },
    { x: 15, y: 4.5 },
    { x: 22, y: 7 },
    { x: 6, y: 14 },
    { x: 13, y: 12.5 },
    { x: 20.5, y: 15 },
    { x: 25, y: 11 },
  ],
  pillarFootprintHalf: { x: 0.45, y: 0.32 },
  pillarHeightM: 2,
  colours: GREYBOX_COLOURS,
  playerStart: { x: 15, y: 10 },
} as const;

/** Where the training dummy stands at the start (diagonally ahead, off the player's starting row). */
export const TRAINING_YARD_DUMMY_START = { x: 19, y: 13 } as const;
