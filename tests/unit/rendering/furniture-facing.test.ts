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

  it('kitchen chairs face the island they are pulled up to', () => {
    const k = house.widthM / HOUSE_PLAN.widthM;
    const chairs = house.furniture.filter((f) => {
      const c = mid(f);
      return f.kind === 'chair' && f.floor === 0 && c.x > 16.5 * k && c.x < 19 * k && c.y > 10 * k && c.y < 12 * k;
    });
    expect(chairs.length).toBeGreaterThanOrEqual(2);
    // They sit on the island's north side, so they look south at it.
    for (const c of chairs) expect(face(c)).toBe('s');
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

  it('every cabinet, counter and appliance stands with its back to the wall behind it and its front into the room', () => {
    const fronted = new Set([
      'cupboard',
      'wardrobe',
      'shed-cabinet',
      'counter',
      'sink',
      'stove',
      'fridge',
      'nightstand',
      'bookshelf',
      'shelf',
      'tv-console',
      'desk',
      'chest',
    ]);
    let checked = 0;
    for (const f of house.furniture.filter((x) => fronted.has(x.kind))) {
      const side = wallSide(f, walls(f.floor));
      if (!side) continue;
      checked++;
      const opposite = { n: 's', s: 'n', e: 'w', w: 'e' }[side];
      expect(face(f), `${f.kind} ${f.id} against the ${side} wall`).toBe(opposite);
    }
    expect(checked).toBeGreaterThan(15);
  });

  it('the camera sees fronts that face south or east only', () => {
    expect(frontVisible('s')).toBe(true);
    expect(frontVisible('e')).toBe(true);
    expect(frontVisible('n')).toBe(false);
    expect(frontVisible('w')).toBe(false);
  });
});

/** A cupboard's opening is its front: it opens away from the wall its back is against (owner, 18/11/2026). */
describe.each([
  ['the authored plan', HOUSE_PLAN],
  ['the real, roomier house', HOUSE],
])('openings face into the room in %s', (_name, house) => {
  it('every wardrobe, cupboard, chest and shed cabinet against a wall opens away from it', () => {
    const opposite = { n: 's', s: 'n', e: 'w', w: 'e' } as const;
    const offenders: string[] = [];
    for (const f of house.furniture) {
      if (!f.hide || !['wardrobe', 'cupboard', 'chest', 'shed-cabinet'].includes(f.hide.kind)) continue;
      const side = wallSide(
        f,
        house.walls.filter((w) => w.floor === f.floor),
      );
      if (side && f.hide.opensToward !== opposite[side])
        offenders.push(`${f.id} (${f.hide.kind}) has its back to the ${side} but opens ${f.hide.opensToward}`);
    }
    expect(offenders).toEqual([]);
  });
});
