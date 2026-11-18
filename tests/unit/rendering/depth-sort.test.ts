import { describe, expect, it } from 'vitest';
import { isLongPiece, personOrder } from '../../../src/rendering/depth-sort';

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
