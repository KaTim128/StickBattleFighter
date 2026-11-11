import type { Container } from 'pixi.js';

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
  /** Its depth key (YSortLayer zIndex = feet y): larger draws in front. */
  depth(): number;
}

export interface Viewer {
  readonly node: Container;
  depth(): number;
}

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export class OcclusionFader {
  private readonly targets: FadeTarget[] = [];
  private readonly shapes = new Map<Container, Box>();
  private frame = 0;
  private readonly exempt = new Set<Container>();

  /** Never fade this node (e.g. an object carried overhead: it belongs to the fighter). */
  setExempt(node: Container, exempt: boolean): void {
    if (exempt) this.exempt.add(node);
    else this.exempt.delete(node);
  }

  add(node: Container): void {
    this.targets.push({ node, depth: () => node.zIndex });
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
      .map((v) => ({ box: inset(placed(v.node, v.node.getLocalBounds()), 0.08), depth: v.depth() }));
    const step = dtS / FADE_S;
    for (const t of this.targets) {
      const node = t.node;
      if (!node.visible || node.destroyed) continue;
      let blocking = false;
      if (boxes.length > 0 && !this.exempt.has(node)) {
        const depth = t.depth();
        let local = this.shapes.get(node);
        if (!local || refresh) {
          const r = node.getLocalBounds();
          local = { minX: r.minX, minY: r.minY, maxX: r.maxX, maxY: r.maxY };
          this.shapes.set(node, local);
        }
        const b = placed(node, local);
        for (const v of boxes) {
          if (depth > v.depth && overlaps(b, v.box)) {
            blocking = true;
            break;
          }
        }
      }
      const goal = blocking ? OCCLUDED_ALPHA : 1;
      const a = node.alpha;
      // Linear fade toward the goal: the whole way takes about FADE_S.
      node.alpha = a < goal ? Math.min(goal, a + step) : Math.max(goal, a - step);
    }
  }
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

function overlaps(a: Box, b: Box): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}
