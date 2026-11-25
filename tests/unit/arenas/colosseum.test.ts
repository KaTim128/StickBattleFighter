import { describe, expect, it } from 'vitest';
import { COLOSSEUM, COLOSSEUM_RADIUS_M } from '../../../src/data/arenas/colosseum';
import { footprint, PROP_KINDS } from '../../../src/data/objects/props';

const C = COLOSSEUM.widthM / 2;
const box = (p: (typeof COLOSSEUM.props)[number]) => {
  const f = footprint(p);
  return { x0: p.x - f.w / 2, x1: p.x + f.w / 2, y0: p.y - f.d / 2, y1: p.y + f.d / 2 };
};

describe('the Colosseum (owner, 25/11/2026)', () => {
  it('is round, the primary arena, with a closed ring of walls and an open middle', () => {
    expect(COLOSSEUM.round).toEqual({ cx: C, cy: C, radiusM: COLOSSEUM_RADIUS_M });
    const ring = COLOSSEUM.interiorWalls ?? [];
    expect(ring.length).toBeGreaterThanOrEqual(72);
    expect(ring.every((w) => w.hidden === true)).toBe(true);
    const near = (x: number, y: number, r: number) => Math.hypot(x - C, y - C) < r;
    for (const p of COLOSSEUM.props) expect(near(p.x, p.y, 8)).toBe(false); // the centre stays open for fighting
    for (const s of [COLOSSEUM.playerStart, COLOSSEUM.dummyStart])
      for (const p of COLOSSEUM.props) expect(Math.hypot(s.x - p.x, s.y - p.y)).toBeGreaterThan(5);
  });

  it('every prop stands inside the ring on the floor, and no two overlap (nothing clips, floats or intersects)', () => {
    const boxes = COLOSSEUM.props.map((p) => ({ p, b: box(p) }));
    for (const { p, b } of boxes) {
      for (const [x, y] of [
        [b.x0, b.y0],
        [b.x1, b.y0],
        [b.x1, b.y1],
        [b.x0, b.y1],
      ] as const)
        expect(
          Math.hypot(x - C, y - C),
          `${p.kind} at ${p.x.toFixed(1)},${p.y.toFixed(1)} reaches the wall`,
        ).toBeLessThan(COLOSSEUM_RADIUS_M - 0.3);
      expect(p.elevationM ?? 0).toBe(0); // everything rests on the ground, nothing hangs in the air
    }
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!.b;
        const c = boxes[j]!.b;
        const overlap = a.x0 < c.x1 && c.x0 < a.x1 && a.y0 < c.y1 && c.y0 < a.y1;
        expect(overlap, `${boxes[i]!.p.kind} overlaps ${boxes[j]!.p.kind}`).toBe(false);
      }
  });

  it('holds only Roman cargo and ruins, none of them weapons, all with real mass', () => {
    const kinds = new Set(COLOSSEUM.props.map((p) => p.kind));
    for (const k of [
      'roman-column-fallen',
      'column-stub',
      'column-piece',
      'stone-block',
      'crate',
      'amphora',
      'barrel',
    ] as const)
      expect(kinds.has(k)).toBe(true);
    for (const k of kinds) {
      expect(PROP_KINDS[k].massKg).toBeGreaterThan(0);
      expect(PROP_KINDS[k].label.toLowerCase()).not.toMatch(/sword|spear|shield|axe|bow|dagger|weapon/);
    }
  });
});
