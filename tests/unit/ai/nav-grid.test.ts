import { describe, expect, it } from 'vitest';
import { NavGrid } from '../../../src/ai/nav-grid';

/** REQ-AI-5 (owner, 13/11/2026): the AI walks round furniture instead of getting stuck. */
describe('NavGrid path-finding', () => {
  // A 10 x 6 m room with a 4 m wall across the middle (x 5, y 0..4): the way round is below it.
  const wall = (p: { x: number; y: number }) => p.x > 4.5 && p.x < 5.5 && p.y < 4;
  const grid = new NavGrid(10, 6, 0.5);
  grid.rebuild(wall);

  it('goes round a wall in the way, never through it', () => {
    const path = grid.path({ x: 2, y: 1 }, { x: 8, y: 1 })!;
    expect(path).not.toBeNull();
    expect(path.some((p) => p.y > 4)).toBe(true); // via the gap below the wall
    let at = { x: 2, y: 1 };
    for (const p of path) {
      expect(grid.clearLine(at, p)).toBe(true);
      at = p;
    }
    expect(path[path.length - 1]).toEqual({ x: 8, y: 1 });
  });

  it('a clear line is a single straight step', () => {
    expect(grid.path({ x: 1, y: 5 }, { x: 9, y: 5.5 })).toEqual([{ x: 9, y: 5.5 }]);
  });

  it('no route through a sealed wall', () => {
    const sealed = new NavGrid(10, 6, 0.5);
    sealed.rebuild((p) => p.x > 4.5 && p.x < 5.5);
    expect(sealed.path({ x: 2, y: 1 }, { x: 8, y: 1 })).toBeNull();
  });
});
