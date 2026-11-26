import { describe, expect, it } from 'vitest';
import { gunSwapPose } from '../../../src/animation/ability-poses';
import { BUILT_IN_LIBRARY } from '../../../src/characters/library';
import type { Pose } from '../../../src/animation/skeleton';

const base: Pose = {
  lean: 0,
  head: 0,
  armFront: { root: 1.4, bend: 0.3 },
  armBack: { root: 1.0, bend: 1.4 },
  legFront: { root: 0.3, bend: -0.4 },
  legBack: { root: -0.3, bend: -0.4 },
};

/** Gunsmith's weapon swap and melee (owner, 26/11/2026). */
describe('Gunsmith weapons', () => {
  it('reaches behind the back for the machine gun, and leaves the pose alone before and after', () => {
    expect(gunSwapPose(base, 0, 1)).toBe(base);
    expect(gunSwapPose(base, 1, 1)).toBe(base);
    const mid = gunSwapPose(base, 0.36, 1);
    expect(mid.armFront.root).toBeLessThan(base.armFront.root - 0.5);
    expect(mid.armBack.root).toBeLessThan(base.armBack.root - 0.5);
  });

  it('putting the gun away goes over the shoulder, then down to the holsters', () => {
    expect(gunSwapPose(base, 0.56, -1).armBack.root).toBeLessThan(base.armBack.root - 0.5);
    expect(gunSwapPose(base, 0.18, -1).armFront.root).toBeLessThan(base.armFront.root - 0.3);
  });

  it('the tap combo is two punches and a finishing kick', () => {
    const ms = BUILT_IN_LIBRARY.moveset['gunsmith-moveset'] as unknown as {
      starters: { tap: string };
      moves: { id: string; category: string; damage: number; next?: { tap?: string } }[];
    };
    const byId = new Map(ms.moves.map((m) => [m.id, m]));
    const chain: { id: string; category: string; damage: number; next?: { tap?: string } }[] = [];
    let id: string | undefined = ms.starters.tap;
    while (id) {
      const m: { id: string; category: string; damage: number; next?: { tap?: string } } = byId.get(id)!;
      chain.push(m);
      id = m.next?.tap;
    }
    expect(chain.map((m) => m.category)).toEqual(['punch', 'punch', 'kick']);
    expect(chain[2]!.damage).toBeGreaterThan(chain[0]!.damage + chain[1]!.damage - 1);
  });
});
