import type { FloorIndex, FurnitureDef, HideSpec, HouseDef, Rect } from './house-types';
import { type HouseWorld, type Point, rectArea } from './world';

/**
 * Hiding places (Phase 2, master plan section B and F): functional objects with their own concealment,
 * noise, view and opening. Pure helpers; the game state decides when a body goes in or out.
 */
export interface HideSpot {
  readonly id: string;
  readonly floor: FloorIndex;
  readonly spec: HideSpec;
  readonly rect: Rect;
}

export function hideSpots(house: HouseDef): HideSpot[] {
  return house.furniture.flatMap((f: FurnitureDef) =>
    f.hide ? [{ id: f.id, floor: f.floor, spec: f.hide, rect: f }] : [],
  );
}

/** How far from a hiding place's inside point the interact key still reaches it, metres. */
export const HIDE_REACH_M = 1.35;

/** The hiding place within reach of a point on a floor (the nearest), or null. */
export function nearestHideSpot(spots: readonly HideSpot[], floor: FloorIndex, p: Point): HideSpot | null {
  let best: { spot: HideSpot; d: number } | null = null;
  for (const s of spots) {
    if (s.floor !== floor) continue;
    // Reachable from beside the object (a sofa is five metres long) or from its inside point.
    const dx = Math.max(s.rect.x0 - p.x, 0, p.x - s.rect.x1);
    const dy = Math.max(s.rect.y0 - p.y, 0, p.y - s.rect.y1);
    const d = Math.min(Math.hypot(s.spec.at.x - p.x, s.spec.at.y - p.y), Math.hypot(dx, dy) + 0.35);
    if (d <= HIDE_REACH_M && (!best || d < best.d)) best = { spot: s, d };
  }
  return best?.spot ?? null;
}

const DIR: Record<HideSpec['opensToward'], Point> = {
  n: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  e: { x: 1, y: 0 },
  w: { x: -1, y: 0 },
};

/** Where a body steps out to: the way the hiding place opens, or the nearest free spot round it. */
export function exitPoint(world: HouseWorld, spot: HideSpot): Point {
  const open = DIR[spot.spec.opensToward];
  const at = spot.spec.at;
  for (const dist of [0.9, 1.2, 1.5, 0.7]) {
    const p = { x: at.x + open.x * dist, y: at.y + open.y * dist };
    if (world.fits(spot.floor, p.x, p.y)) return p;
  }
  for (let r = 0.9; r <= 2.4; r += 0.3)
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2;
      const p = { x: at.x + Math.cos(ang) * r, y: at.y + Math.sin(ang) * r };
      if (world.fits(spot.floor, p.x, p.y)) return p;
    }
  return { x: at.x + open.x * 0.9, y: at.y + open.y * 0.9 };
}

/**
 * How much of an occupant a hunter at `from` can make out, 0..1 (1 = in plain view). Concealment
 * hides most of it; the side the place opens toward is the weak side: from there it is
 * `1 - concealment`, from the sides about a third of that and from behind a tenth. Distance helps
 * the occupant too. The hunter's detection meter fills by this (P2-4).
 */
export function exposure(spot: HideSpot, from: Point): number {
  const at = spot.spec.at;
  const dx = from.x - at.x;
  const dy = from.y - at.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.01) return 1;
  const open = DIR[spot.spec.opensToward];
  const facing = (dx / d) * open.x + (dy / d) * open.y; // 1 = straight in front, -1 = behind
  const side = facing > 0.55 ? 1 : facing > -0.35 ? 0.33 : 0.1;
  const near = d < 1.5 ? 1.6 : d < 4 ? 1 : d < 8 ? 0.6 : 0.3;
  return Math.min(1, (1 - spot.spec.concealment) * side * near * 1.4);
}

/** Total hiding-place area is not used for gameplay; kept for the tests that check no place is a sliver. */
export const spotArea = (s: HideSpot): number => rectArea(s.rect);

/** A hiding place shows a floating HIDE bubble when the player is within this many metres (owner, 18/11/2026). */
export const HIDE_CUE_M = 6;

export interface HideCue {
  readonly spot: HideSpot;
  /** Metres from the player to the place (to its opening or inside point, whichever is nearer). */
  readonly distM: number;
  /** The interact key would hide the player here right now. */
  readonly inReach: boolean;
}

/**
 * The hiding places that should show a floating HIDE bubble: those near the player on their floor, the
 * one the act key would use marked `inReach`. Nothing while the player is already hidden or carrying
 * something (the act key then leaves or throws).
 */
export function hideCues(
  spots: readonly HideSpot[],
  floor: FloorIndex,
  p: Point,
  canHide: boolean,
  maxM = HIDE_CUE_M,
): HideCue[] {
  if (!canHide) return [];
  const reach = nearestHideSpot(spots, floor, p);
  const out: HideCue[] = [];
  for (const s of spots) {
    if (s.floor !== floor) continue;
    const dx = Math.max(s.rect.x0 - p.x, 0, p.x - s.rect.x1);
    const dy = Math.max(s.rect.y0 - p.y, 0, p.y - s.rect.y1);
    const distM = Math.min(Math.hypot(s.spec.at.x - p.x, s.spec.at.y - p.y), Math.hypot(dx, dy) + 0.35);
    if (distM <= maxM) out.push({ spot: s, distM, inReach: reach?.id === s.id });
  }
  return out.sort((a, b) => a.distM - b.distM);
}
