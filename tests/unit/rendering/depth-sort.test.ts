import { describe, expect, it } from 'vitest';
import { isLongPiece, longPieceKey, personOrder } from '../../../src/rendering/depth-sort';

describe('depth order of long furniture against a person', () => {
  const bed = { x0: 10, y0: 9, x1: 14, y1: 12 }; // 4 m wide
  it('a person south of the middle of a long piece is in front of it (the bug: it drew them behind)', () => {
    expect(personOrder(bed, { x: 11, y: 12.5 })).toBe('in-front');
  });
  it('a person east of it is in front; north or west of it, behind', () => {
    expect(personOrder(bed, { x: 14.5, y: 10 })).toBe('in-front');
    expect(personOrder(bed, { x: 12, y: 8.5 })).toBe('behind');
    expect(personOrder(bed, { x: 9.5, y: 10.5 })).toBe('behind');
  });
  it('beside a corner (south and west at once) keeps the usual order, and inside the footprint too', () => {
    expect(personOrder(bed, { x: 9, y: 12.5 })).toBeNull();
    expect(personOrder(bed, { x: 12, y: 10 })).toBeNull();
  });
  it('only long pieces need it', () => {
    expect(isLongPiece(bed)).toBe(true);
    expect(isLongPiece({ x0: 0, y0: 0, x1: 0.6, y1: 0.6 })).toBe(false);
  });
});

describe('the key a long piece gets against the people near it (owner, 18/11/2026: a floating table)', () => {
  const NONE_BELOW = Number.POSITIVE_INFINITY;
  const NONE_ABOVE = Number.NEGATIVE_INFINITY;

  it('keeps its own key when it already draws under the person in front of it', () => {
    // A table far back in another room, a person far in front: the table must not jump forward over the walls.
    expect(longPieceKey(17.5, 20.8, NONE_ABOVE)).toBe(17.5);
  });

  it('moves only as far as needed: under a person in front, over a person behind', () => {
    expect(longPieceKey(21, 20.8, NONE_ABOVE)).toBe(20.3);
    expect(longPieceKey(15, NONE_BELOW, 16)).toBe(16.5);
    expect(longPieceKey(18, NONE_BELOW, 16)).toBe(18);
  });

  it('between two people it sits between them', () => {
    expect(longPieceKey(25, 20, 18)).toBe(19);
    expect(longPieceKey(19, 20, 18)).toBe(19);
  });
});
