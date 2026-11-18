import { describe, expect, it } from 'vitest';
import { HOUSE, HOUSE_PLAN } from '../../../src/data/arenas/house';
import { facingFor, frontVisible, toward, wallSide } from '../../../src/rendering/furniture-facing';

/** Furniture is not fixed at one rotation (owner, 18/11/2026): it faces what it is used with. */
describe.each([
  ['the authored plan', HOUSE_PLAN],
  ['the real, roomier house', HOUSE],
])('furniture facing in %s', (_name, house) => {
  const walls = (floor: 0 | 1) => house.walls.filter((w) => w.floor === floor);
  const face = (f: (typeof house.furniture)[number]) => facingFor(f, house.furniture, walls(f.floor));
  const mid = (r: { x0: number; x1: number; y0: number; y1: number }) => ({
    x: (r.x0 + r.x1) / 2,
    y: (r.y0 + r.y1) / 2,
  });

  it('the sofa faces the coffee table, sits close to it and is no longer a long bench', () => {
    const sofa = house.furniture.find((f) => f.kind === 'sofa')!;
    const table = house.furniture.find((f) => f.kind === 'coffee-table')!;
    expect(face(sofa)).toBe(toward(sofa, table));
    const scale = house.widthM / HOUSE_PLAN.widthM;
    expect(Math.max(sofa.x1 - sofa.x0, sofa.y1 - sofa.y0)).toBeLessThanOrEqual(3 * scale);
    const a = mid(sofa);
    const b = mid(table);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThanOrEqual(2.2 * scale);
  });

  it('armchairs face the coffee table from either side', () => {
    const table = house.furniture.find((f) => f.kind === 'coffee-table')!;
    const chairs = house.furniture.filter((f) => f.kind === 'armchair');
    expect(chairs).toHaveLength(2);
    expect(new Set(chairs.map(face)).size).toBe(2); // not both at one fixed rotation
    for (const a of chairs) expect(face(a)).toBe(toward(a, table));
  });

  it('dining chairs face the dining table', () => {
    const table = house.furniture.find((f) => f.kind === 'dining-table')!;
    const t = mid(table);
    const near = house.furniture.filter((f) => {
      const c = mid(f);
      return (
        f.kind === 'chair' &&
        f.floor === 0 &&
        Math.hypot(c.x - t.x, c.y - t.y) < 3.2 * (house.widthM / HOUSE_PLAN.widthM)
      );
    });
    expect(near.length).toBeGreaterThanOrEqual(2);
    for (const c of near) expect(face(c)).toBe(toward(c, table));
  });

  it('kitchen chairs face the counter they are pulled up to', () => {
    const chairs = house.furniture.filter(
      (f) =>
        f.kind === 'chair' &&
        f.floor === 0 &&
        mid(f).y > 12 * (house.widthM / HOUSE_PLAN.widthM) &&
        mid(f).x > 20 * (house.widthM / HOUSE_PLAN.widthM),
    );
    expect(chairs.length).toBeGreaterThanOrEqual(2);
    for (const c of chairs) expect(face(c)).toBe('n');
  });

  it('every bed has its head to a wall, and storage stands with its back to one', () => {
    for (const bed of house.furniture.filter((f) => f.kind === 'bed')) {
      const side = wallSide(bed, walls(bed.floor));
      expect(side, bed.id).not.toBeNull();
      expect(face(bed), bed.id).not.toBe(side);
    }
    for (const w of house.furniture.filter((f) => f.kind === 'wardrobe')) {
      const side = wallSide(w, walls(w.floor));
      if (side) expect(face(w)).not.toBe(side);
    }
  });

  it('the camera sees fronts that face south or east only', () => {
    expect(frontVisible('s')).toBe(true);
    expect(frontVisible('e')).toBe(true);
    expect(frontVisible('n')).toBe(false);
    expect(frontVisible('w')).toBe(false);
  });
});
