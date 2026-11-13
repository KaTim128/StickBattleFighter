/**
 * Path-finding for the fighter AI (owner, 13/11/2026; REQ-AI-5): a grid over the arena floor with
 * each cell marked open or blocked (walls, standing furniture), searched with A* (8 directions, no
 * squeezing diagonally between two blocked cells). Pure: the scene supplies the blocked test and
 * refreshes the grid as furniture moves or breaks.
 */
export interface Point {
  readonly x: number;
  readonly y: number;
}

export class NavGrid {
  readonly cols: number;
  readonly rows: number;
  private readonly open: Uint8Array;

  constructor(
    readonly widthM: number,
    readonly heightM: number,
    readonly cellM: number,
  ) {
    this.cols = Math.max(1, Math.ceil(widthM / cellM));
    this.rows = Math.max(1, Math.ceil(heightM / cellM));
    this.open = new Uint8Array(this.cols * this.rows).fill(1);
  }

  /** Mark every cell open or blocked by testing its centre. */
  rebuild(blocked: (at: Point) => boolean): void {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) this.open[r * this.cols + c] = blocked(this.centre(c, r)) ? 0 : 1;
    }
  }

  isOpen(c: number, r: number): boolean {
    return c >= 0 && r >= 0 && c < this.cols && r < this.rows && this.open[r * this.cols + c] === 1;
  }

  private centre(c: number, r: number): Point {
    return { x: (c + 0.5) * this.cellM, y: (r + 0.5) * this.cellM };
  }

  private cellOf(p: Point): [number, number] {
    const c = Math.min(this.cols - 1, Math.max(0, Math.floor(p.x / this.cellM)));
    const r = Math.min(this.rows - 1, Math.max(0, Math.floor(p.y / this.cellM)));
    return [c, r];
  }

  /** The nearest open cell to a point (a fighter standing against furniture may sit in a blocked one). */
  private nearestOpen(p: Point): [number, number] | null {
    const [c0, r0] = this.cellOf(p);
    for (let ring = 0; ring < 6; ring++) {
      for (let dr = -ring; dr <= ring; dr++) {
        for (let dc = -ring; dc <= ring; dc++) {
          if (Math.max(Math.abs(dc), Math.abs(dr)) !== ring) continue;
          if (this.isOpen(c0 + dc, r0 + dr)) return [c0 + dc, r0 + dr];
        }
      }
    }
    return null;
  }

  /** Is the straight line between two points clear of blocked cells (sampled every half cell)? */
  clearLine(a: Point, b: Point): boolean {
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.ceil(d / (this.cellM * 0.5)));
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const [c, r] = this.cellOf({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      if (!this.isOpen(c, r)) return false;
    }
    return true;
  }

  /**
   * A* from `from` to `to`: the waypoints to walk (cell centres, shortened wherever a straight line
   * is clear), ending at `to`. Null when no route exists.
   */
  path(from: Point, to: Point): Point[] | null {
    const start = this.nearestOpen(from);
    const goal = this.nearestOpen(to);
    if (!start || !goal) return null;
    const n = this.cols * this.rows;
    const g = new Float32Array(n).fill(Number.POSITIVE_INFINITY);
    const came = new Int32Array(n).fill(-1);
    const closed = new Uint8Array(n);
    const idx = (c: number, r: number) => r * this.cols + c;
    const h = (c: number, r: number) => {
      const dx = Math.abs(c - goal[0]);
      const dy = Math.abs(r - goal[1]);
      return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
    };
    const s = idx(start[0], start[1]);
    const target = idx(goal[0], goal[1]);
    g[s] = 0;
    // A simple binary heap of [f, index].
    const heap: [number, number][] = [[h(start[0], start[1]), s]];
    const push = (item: [number, number]) => {
      heap.push(item);
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heap[p]![0] <= heap[i]![0]) break;
        [heap[p], heap[i]] = [heap[i]!, heap[p]!];
        i = p;
      }
    };
    const pop = (): [number, number] => {
      const top = heap[0]!;
      const last = heap.pop()!;
      if (heap.length > 0) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = i * 2 + 1;
          const r = l + 1;
          let m = i;
          if (l < heap.length && heap[l]![0] < heap[m]![0]) m = l;
          if (r < heap.length && heap[r]![0] < heap[m]![0]) m = r;
          if (m === i) break;
          [heap[m], heap[i]] = [heap[i]!, heap[m]!];
          i = m;
        }
      }
      return top;
    };
    while (heap.length > 0) {
      const [, cur] = pop();
      if (closed[cur]) continue;
      closed[cur] = 1;
      if (cur === target) break;
      const cc = cur % this.cols;
      const cr = (cur - cc) / this.cols;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dc === 0 && dr === 0) continue;
          const nc = cc + dc;
          const nr = cr + dr;
          if (!this.isOpen(nc, nr)) continue;
          // No cutting a corner between two blocked cells.
          if (dc !== 0 && dr !== 0 && (!this.isOpen(cc + dc, cr) || !this.isOpen(cc, cr + dr))) continue;
          const ni = idx(nc, nr);
          if (closed[ni]) continue;
          const cost = g[cur]! + (dc !== 0 && dr !== 0 ? Math.SQRT2 : 1);
          if (cost < g[ni]!) {
            g[ni] = cost;
            came[ni] = cur;
            push([cost + h(nc, nr), ni]);
          }
        }
      }
    }
    if (!closed[target]) return null;
    const cells: Point[] = [];
    for (let i = target; i !== -1 && i !== s; i = came[i]!) {
      const c = i % this.cols;
      cells.push(this.centre(c, (i - c) / this.cols));
    }
    cells.reverse();
    cells.push(to);
    // String-pull: skip waypoints while the line from the last kept point stays clear.
    const out: Point[] = [];
    let anchor: Point = from;
    for (let i = 0; i < cells.length; i++) {
      const next = cells[i + 1];
      if (next && this.clearLine(anchor, next)) continue;
      out.push(cells[i]!);
      anchor = cells[i]!;
    }
    return out;
  }
}
