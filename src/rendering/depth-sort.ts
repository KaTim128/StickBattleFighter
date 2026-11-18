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

/**
 * The draw key a long piece needs given its own key and the people around it: under everyone it stands behind, over
 * everyone it stands in front of, otherwise unchanged. It only ever moves the way a person needs it to move: setting
 * it outright put a dining table drawn after a person in another room, in front of every wall between them (owner,
 * 18/11/2026: "a floating table").
 */
export function longPieceKey(natural: number, below: number, above: number): number {
  const hasBelow = below !== Number.POSITIVE_INFINITY;
  const hasAbove = above !== Number.NEGATIVE_INFINITY;
  if (hasBelow && hasAbove && above >= below) return below - 0.5; // conflicting people: the nearer one wins
  let key = natural;
  if (hasBelow && key >= below) key = hasAbove ? (above + below) / 2 : below - 0.5;
  if (hasAbove && key <= above) key = hasBelow ? (above + below) / 2 : above + 0.5;
  return key;
}
