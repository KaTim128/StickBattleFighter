import type { Rect } from '../modes/hide-seek/house-types';

/**
 * Depth order of a long piece (a bed, a sofa, a counter) against a person (owner, 18/11/2026: the player must
 * never be hidden by furniture they stand in front of). A piece is normally sorted by its nearest corner, which
 * puts a person standing in front of the middle of a long piece BEHIND it. The camera looks from the south-east,
 * so a person south of the piece's south edge, or east of its east edge, is in front of it; north of its north
 * edge, or west of its west edge, behind it; anywhere else the usual order is right.
 */
export function personOrder(piece: Rect, person: { x: number; y: number }): 'in-front' | 'behind' | null {
  const front = person.y >= piece.y1 || person.x >= piece.x1;
  const behind = person.y <= piece.y0 || person.x <= piece.x0;
  if (front && !behind) return 'in-front';
  if (behind && !front) return 'behind';
  return null;
}

/** Pieces shorter than this keep the usual nearest-corner sort (it is exact for something small). */
export const LONG_PIECE_M = 1.6;
export const isLongPiece = (r: Rect): boolean => Math.max(r.x1 - r.x0, r.y1 - r.y0) >= LONG_PIECE_M;
