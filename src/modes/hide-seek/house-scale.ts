import type { HouseDef, Rect } from './house-types';

/**
 * Scale a house layout uniformly (plan sizes only: heights, the floor-to-floor rise and the speeds
 * stay in metres). Lets the layout be authored at a convenient size and the rooms made roomier as a
 * design decision (owner, 18/11/2026: a bigger, bungalow-like house) without rewriting every number.
 */
export function scaleHouse(base: HouseDef, k: number): HouseDef {
  const r = <T extends Rect>(v: T): T => ({ ...v, x0: v.x0 * k, y0: v.y0 * k, x1: v.x1 * k, y1: v.y1 * k });
  const pt = <T extends { x: number; y: number }>(p: T): T => ({ ...p, x: p.x * k, y: p.y * k });
  return {
    ...base,
    widthM: base.widthM * k,
    heightM: base.heightM * k,
    rooms: base.rooms.map((v) => ({ ...v, rect: r(v.rect) })),
    walls: base.walls.map(r),
    doors: base.doors.map((d) => ({ ...d, rect: r(d.rect) })),
    stairs: base.stairs.map((s) => ({ ...s, ramp: r(s.ramp) })),
    furniture: base.furniture.map((f) => {
      const scaled = r(f);
      return f.hide ? { ...scaled, hide: { ...f.hide, at: pt(f.hide.at) } } : scaled;
    }),
    throwables: base.throwables.map(pt),
    playerStart: pt(base.playerStart),
    hunterStart: pt(base.hunterStart),
    patrol: base.patrol.map(pt),
  };
}
