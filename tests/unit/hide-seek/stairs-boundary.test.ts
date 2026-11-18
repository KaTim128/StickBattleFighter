import { describe, expect, it } from 'vitest';
import { HOUSE } from '../../../src/data/arenas/house';
import { HouseWorld } from '../../../src/modes/hide-seek/world';

/** Owner, 20/11/2026: nobody walks through the staircase, out of the house, or into the void round it. */
describe('the staircase and the house boundary hold whichever way a body walks at them', () => {
  const world = new HouseWorld(HOUSE);
  const r = HOUSE.stairs[0]!.ramp;
  const RUN_MPS = 5.6;
  const DT = 1 / 60;
  const starts: { floor: 0 | 1; x: number; y: number }[] = [];
  for (const floor of [0, 1] as const)
    for (let x = r.x0 - 3; x <= r.x1 + 3; x += 0.7)
      for (let y = r.y0 - 3; y <= r.y1 + 3; y += 0.7)
        if (world.fits(floor, x, y) && world.roomAt(floor, x, y)?.outdoors === false) starts.push({ floor, x, y });

  it('no body ever stands outside every room or in the yard, after running at the stairs from any side', () => {
    const offenders = new Set<string>();
    for (const s of starts)
      for (let deg = 0; deg < 360; deg += 20) {
        const p = { floor: s.floor, x: s.x, y: s.y, z: 0, onStairs: null as string | null };
        const dx = Math.cos((deg * Math.PI) / 180) * RUN_MPS * DT;
        const dy = Math.sin((deg * Math.PI) / 180) * RUN_MPS * DT;
        for (let i = 0; i < 240; i++) {
          world.move(p as never, dx, dy);
          world.updateStairs(p as never);
          const room = world.roomAt(p.floor, p.x, p.y);
          if (!room || room.outdoors)
            offenders.add(
              `${s.floor}:${s.x.toFixed(1)},${s.y.toFixed(1)} @${deg} -> ${p.floor}:${p.x.toFixed(2)},${p.y.toFixed(2)}`,
            );
          if (!world.fits(p.floor, p.x, p.y, 0.05) && !world.stairAt(p))
            offenders.add(`inside a solid: ${p.x.toFixed(2)},${p.y.toFixed(2)}`);
        }
      }
    expect([...offenders].slice(0, 10)).toEqual([]);
  });

  it('from the side, a body is stopped by the staircase: it never gets onto the ramp except through its ends', () => {
    const mid = (r.y0 + r.y1) / 2;
    for (const floor of [0, 1] as const)
      for (const [x, dir] of [
        [r.x0 - 0.8, 1],
        [r.x1 + 0.4, -1],
      ] as const) {
        const p = { floor, x, y: mid, z: 0, onStairs: null as string | null };
        for (let i = 0; i < 400; i++) {
          world.move(p as never, dir * RUN_MPS * DT, 0);
          world.updateStairs(p as never);
        }
        expect(p.onStairs, `floor ${floor} from x=${x.toFixed(1)}`).toBeNull();
        expect(world.stairAt(p), `floor ${floor} from x=${x.toFixed(1)}`).toBeNull();
      }
  });
});
