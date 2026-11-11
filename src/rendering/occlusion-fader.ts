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
    // Shrink the fighter's box a little so a prop merely brushing its edge does not fade.
    const boxes = viewers
      .filter((v) => v.node.visible && v.node.alpha > 0.05)
      .map((v) => ({ box: inset(v.node.getBounds(), 0.08), depth: v.depth() }));
    const step = dtS / FADE_S;
    for (const t of this.targets) {
      const node = t.node;
      if (!node.visible || node.destroyed) continue;
      let blocking = false;
      if (boxes.length > 0) {
        const depth = t.depth();
        const b = node.getBounds();
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

function inset(b: Box, k: number): Box {
  const w = (b.maxX - b.minX) * k;
  const h = (b.maxY - b.minY) * k * 0.5;
  return { minX: b.minX + w, minY: b.minY + h, maxX: b.maxX - w, maxY: b.maxY - h };
}

function overlaps(a: Box, b: Box): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}
