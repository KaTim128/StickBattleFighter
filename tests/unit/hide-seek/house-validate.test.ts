import { describe, expect, it } from 'vitest';
import { HOUSE, HOUSE_PLAN } from '../../../src/data/arenas/house';
import type { HouseDef } from '../../../src/modes/hide-seek/house-types';
import { validateHouse } from '../../../src/modes/hide-seek/house-validate';

describe('the house passes its own standards (owner, 18/11/2026)', () => {
  it.each([
    ['the authored plan', HOUSE_PLAN],
    ['the real, scaled house', HOUSE],
  ])('%s has no problems', (_name, house) => {
    expect(validateHouse(house, { doorClearM: house === HOUSE ? 1 : 0.75, spacingM: 0.08 })).toEqual([]);
  });
});

describe('the checklist catches the faults it exists for', () => {
  const bad = (change: (h: HouseDef) => Partial<HouseDef>): string[] =>
    validateHouse({ ...HOUSE_PLAN, ...change(HOUSE_PLAN) });

  it('an unlocked outside door', () => {
    const doors = HOUSE_PLAN.doors.map((d) => (d.exterior ? { ...d, locked: false } : d));
    expect(bad(() => ({ doors })).join()).toContain('is not locked');
  });

  it('a start outside the house, and a player far from the front door', () => {
    const out = bad(() => ({ playerStart: { floor: 0, x: 5, y: 25 } })).join();
    expect(out).toContain('player start is not inside the house');
    expect(out).toContain('does not start near the front door');
  });

  it('furniture in a doorway or on top of another piece', () => {
    const door = HOUSE_PLAN.doors.find((d) => d.id === 'd-kitchen-living')!;
    const stray = {
      ...HOUSE_PLAN.furniture.find((f) => f.kind === 'bin' && f.floor === 0)!,
      id: 'stray',
      x0: door.rect.x0,
      x1: door.rect.x1,
      y0: 14.3,
      y1: 14.7,
    };
    const out = bad((h) => ({ furniture: [...h.furniture, stray] })).join();
    expect(out).toContain('stray blocks d-kitchen-living');
  });

  it('a room walled off from the rest of the house', () => {
    const walls = HOUSE_PLAN.walls.concat([{ ...HOUSE_PLAN.walls[0]!, x0: 24.8, x1: 25.2, y0: 9, y1: 21, floor: 0 }]);
    const doors = HOUSE_PLAN.doors.filter((d) => d.id !== 'a-living-hall' && d.id !== 'd-dining-hall');
    expect(bad(() => ({ walls, doors })).join()).toContain('cannot be reached');
  });
});
