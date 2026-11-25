import type { Container } from 'pixi.js';
import { isBehindViewer } from './wall-occlusion';

/**
 * Dynamic wall transparency (owner request 11/11/2026): any wall section,
 * door, pillar or tall prop drawn IN FRONT of a fighter (it depth-sorts after
 * the fighter, REQ-VIS-9) and overlapping the fighter on screen fades to a see-
 * through opacity, so punches, clashes, knockbacks and finishers stay visible.
 * Only the overlapping sections fade; the rest stay solid. Fades are smooth
 * (about 0.2 s) both ways to avoid flicker. Uses the real drawn bounds, so it
 * works for moving furniture too. Presentation only.
 */
export const OCCLUDED_ALPHA = 0.3;
/** Seconds to fade fully in or out. */
export const FADE_S = 0.2;

export interface FadeTarget {
  readonly node: Container;
  /**
   * Where a wall stands, in world metres. A wall that does not lie south or east of the viewer (the camera looks
   * in from the south-east) can never be between the viewer and the camera, so it never fades (owner, 20/11/2026:
   * the back walls stay solid when the player walks up to them).
   */
  readonly rect?: { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };
  /**
   * A piece of furniture (not a wall): its footprint in world metres and its top height. It only fades when it stands in front of the
   * viewer along the camera's line of sight (south-east of them) and the viewer is not standing on it (owner/master spec 7.1: a
   * fighter on or beside a bookshelf never fades it).
   */
  readonly furniture?: {
    readonly rect: { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };
    readonly topM: number;
  };
  /** Its depth key (YSortLayer zIndex = feet y): larger draws in front. */
  depth(): number;
}

export interface Viewer {
  readonly node: Container;
  depth(): number;
  /** Where the viewer stands in the world, metres (lets walls behind it stay solid). */
  readonly at?: { readonly x: number; readonly y: number };
  /** Height of the floor it stands on (on top of a bookshelf, say), metres. */
  readonly floorM?: number;
}

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface FaderOptions {
  /** How see-through a blocking thing becomes (default OCCLUDED_ALPHA). */
  readonly occludedAlpha?: number;
  /** Grow the viewer's box by this many metres on each side, so things fade just before they hide it. */
  readonly grow?: number;
}

export class OcclusionFader {
  constructor(private readonly options: FaderOptions = {}) {}

  private readonly targets: FadeTarget[] = [];
  private readonly shapes = new Map<Container, Box>();
  private frame = 0;
  private readonly exempt = new Set<Container>();
  private readonly own = new Map<Container, number>();
  private forced: ReadonlySet<Container> = new Set();

  /** Never fade this node (e.g. an object carried overhead: it belongs to the fighter). */
  setExempt(node: Container, exempt: boolean): void {
    if (exempt) this.exempt.add(node);
    else this.exempt.delete(node);
  }

  /** `occludedAlpha` overrides how see-through this one gets (tall furniture fades less than a wall). */
  /** These nodes are see-through whatever stands behind them (the front walls of the room the player is in). */
  setForced(nodes: ReadonlySet<Container>): void {
    this.forced = nodes;
  }

  add(node: Container, occludedAlpha?: number, rect?: FadeTarget['rect'], furniture?: FadeTarget['furniture']): void {
    this.targets.push({
      node,
      depth: () => node.zIndex,
      ...(rect ? { rect } : {}),
      ...(furniture ? { furniture } : {}),
    });
    if (occludedAlpha !== undefined) this.own.set(node, occludedAlpha);
  }

  /** How many objects are currently faded (or fading) for visibility. */
  get fadedCount(): number {
    return this.targets.filter((t) => t.node.alpha < 0.999).length;
  }

  /** Is this node (partly) see-through right now? */
  isFaded(node: Container): boolean {
    return node.alpha < 0.999;
  }

  update(viewers: readonly Viewer[], dtS: number): void {
    // Compare in the parent's space (the world container), not on screen: a target's shape is
    // cached (furniture never changes shape) and moved by its position, so ~200 targets cost
    // little per frame (TD-045 performance). Shapes refresh every so often (door leaves swing).
    this.frame++;
    const refresh = this.frame % 30 === 0;
    // Shrink the fighter's box a little so a prop merely brushing its edge does not fade.
    const boxes = viewers
      .filter((v) => v.node.visible && v.node.alpha > 0.05)
      .map((v) => ({
        box: grown(inset(placed(v.node, v.node.getLocalBounds()), 0.08), this.options.grow ?? 0),
        depth: v.depth(),
        at: v.at,
        floorM: v.floorM ?? 0,
      }));
    const step = dtS / FADE_S;
    for (const t of this.targets) {
      const node = t.node;
      if (!node.visible || node.destroyed) continue;
      let blocking = this.forced.has(node);
      if (!blocking && boxes.length > 0 && !this.exempt.has(node)) {
        const depth = t.depth();
        let local = this.shapes.get(node);
        if (!local || refresh) {
          const r = node.getLocalBounds();
          local = { minX: r.minX, minY: r.minY, maxX: r.maxX, maxY: r.maxY };
          this.shapes.set(node, local);
        }
        const b = placed(node, local);
        for (const v of boxes) {
          // A wall behind the viewer (north or west of it) cannot hide it, whatever its depth key says.
          if (t.rect && v.at && isBehindViewer(t.rect, v.at)) continue;
          if (t.furniture && v.at && !furnitureHides(t.furniture, v.at, v.floorM)) continue;
          if (depth > v.depth && overlaps(b, v.box)) {
            blocking = true;
            break;
          }
        }
      }
      const goal = blocking ? (this.own.get(node) ?? this.options.occludedAlpha ?? OCCLUDED_ALPHA) : 1;
      const a = node.alpha;
      // Linear fade toward the goal: the whole way takes about FADE_S.
      node.alpha = a < goal ? Math.min(goal, a + step) : Math.max(goal, a - step);
    }
  }
}

/**
 * Can this piece of furniture hide a person at `at` standing `floorM` above the floor? Only if it is on the camera's side of them (the
 * camera looks along (+1, +1) in world metres, so the piece must cross the line from the person toward the south-east) and they are not
 * standing on top of it. Beside or behind it, or on it, never.
 */
export function furnitureHides(
  f: NonNullable<FadeTarget['furniture']>,
  at: { readonly x: number; readonly y: number },
  floorM: number,
): boolean {
  if (floorM >= f.topM - 0.15) return false;
  const R = 0.45; // about a body's half width
  const lo = Math.max(f.rect.x0 - R - at.x, f.rect.y0 - R - at.y);
  const hi = Math.min(f.rect.x1 + R - at.x, f.rect.y1 + R - at.y);
  return hi > 0.05 && hi > lo;
}

/** A node's local box moved to where it stands in its parent (scale and pivot included; rotation ignored). */
function placed(node: Container, local: Box): Box {
  const sx = node.scale.x;
  const sy = node.scale.y;
  const ox = node.position.x - node.pivot.x * sx;
  const oy = node.position.y - node.pivot.y * sy;
  const x0 = ox + local.minX * sx;
  const x1 = ox + local.maxX * sx;
  const y0 = oy + local.minY * sy;
  const y1 = oy + local.maxY * sy;
  return { minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minY: Math.min(y0, y1), maxY: Math.max(y0, y1) };
}

function inset(b: Box, k: number): Box {
  const w = (b.maxX - b.minX) * k;
  const h = (b.maxY - b.minY) * k * 0.5;
  return { minX: b.minX + w, minY: b.minY + h, maxX: b.maxX - w, maxY: b.maxY - h };
}

function grown(b: Box, m: number): Box {
  return { minX: b.minX - m, minY: b.minY - m, maxX: b.maxX + m, maxY: b.maxY + m };
}

function overlaps(a: Box, b: Box): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}
