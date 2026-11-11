import type { ArenaLayout } from './arena-layout';
import { GREYBOX_COLOURS } from './greybox-arena';

/**
 * Phase 2–3 movement and camera test arena: GREYBOX ONLY. Larger than the
 * screen so the camera can follow; pillars to walk around and slide along.
 */
export const TRAINING_YARD: ArenaLayout = {
  id: 'training-yard',
  music: 'yard-fight',
  name: 'Training yard',
  widthM: 30,
  heightM: 20,
  wallThicknessM: 0.5,
  props: [
    { kind: 'pillar', x: 8, y: 6 },
    { kind: 'pillar', x: 15, y: 4.5 },
    { kind: 'pillar', x: 22, y: 7 },
    { kind: 'pillar', x: 6, y: 14 },
    { kind: 'pillar', x: 13, y: 12.5 },
    { kind: 'pillar', x: 20.5, y: 15 },
    { kind: 'pillar', x: 25, y: 11 },
  ],
  playerStart: { x: 15, y: 10 },
  // Diagonally ahead, off the player's starting row.
  dummyStart: { x: 19, y: 13 },
  look: {
    background: GREYBOX_COLOURS.background,
    floor: GREYBOX_COLOURS.floor,
    floorLines: GREYBOX_COLOURS.grid,
    floorLineSpacingM: 1,
    wall: GREYBOX_COLOURS.wall,
    wallEdge: GREYBOX_COLOURS.wallEdge,
  },
  greybox: true,
};
