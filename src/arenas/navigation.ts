import { distanceSqToBox } from '../core/oriented-rect';
import type { ArenaLayout } from '../data/arenas/arena-layout';
import { footprint, PROP_KINDS } from '../data/objects/props';

/**
 * Walkability grid for an arena (Phase 4 reachability checks; basis for AI
 * navigation in Phase 10). A cell is blocked if a fighter of the given radius
 * standing at its centre would overlap a wall or a solid prop.
 */
export interface NavGrid {
  readonly cellM: number;
  readonly cols: number;
  readonly rows: number;
  /** true = walkable */
  readonly free: Uint8Array;
}

export function buildNavGrid(
  arena: ArenaLayout,
  agentRadiusM: number,
  cellM = 0.2,
  /** Treat doors as open (broken) instead of closed. */
  doorsOpen = false,
): NavGrid {
  const cols = Math.ceil(arena.widthM / cellM);
  const rows = Math.ceil(arena.heightM / cellM);
  const free = new Uint8Array(cols * rows);
  const boxes = arena.props
    .filter((p) => PROP_KINDS[p.kind].solid && (p.elevationM ?? 0) === 0)
    .map((p) => {
      const f = footprint(p);
      return { x0: p.x - f.w / 2, x1: p.x + f.w / 2, y0: p.y - f.d / 2, y1: p.y + f.d / 2 };
    })
    .concat(arena.interiorWalls ?? [])
    .concat(doorsOpen ? [] : (arena.doors ?? []));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c + 0.5) * cellM;
      const y = (r + 0.5) * cellM;
      if (x < agentRadiusM || y < agentRadiusM || x > arena.widthM - agentRadiusM || y > arena.heightM - agentRadiusM) {
        continue;
      }
      // Circle-vs-box: distance from the cell centre to the nearest point of each box.
      const hit = boxes.some((b) => distanceSqToBox(b, x, y) < agentRadiusM * agentRadiusM);
      if (!hit) free[r * cols + c] = 1;
    }
  }
  return { cellM, cols, rows, free };
}

export function cellAt(grid: NavGrid, x: number, y: number): number {
  const c = Math.min(grid.cols - 1, Math.max(0, Math.floor(x / grid.cellM)));
  const r = Math.min(grid.rows - 1, Math.max(0, Math.floor(y / grid.cellM)));
  return r * grid.cols + c;
}

export function isWalkable(grid: NavGrid, x: number, y: number): boolean {
  return grid.free[cellAt(grid, x, y)] === 1;
}

/** Label connected walkable regions (4-neighbour). Returns region id per cell (-1 = blocked) and region sizes. */
export function walkableRegions(grid: NavGrid): { region: Int32Array; sizes: number[] } {
  const region = new Int32Array(grid.free.length).fill(-1);
  const sizes: number[] = [];
  const stack: number[] = [];
  for (let start = 0; start < grid.free.length; start++) {
    if (grid.free[start] !== 1 || region[start] !== -1) continue;
    const id = sizes.length;
    let size = 0;
    region[start] = id;
    stack.push(start);
    while (stack.length > 0) {
      const i = stack.pop()!;
      size++;
      const c = i % grid.cols;
      const neighbours = [i - grid.cols, i + grid.cols, c > 0 ? i - 1 : -1, c < grid.cols - 1 ? i + 1 : -1];
      for (const n of neighbours) {
        if (n >= 0 && n < grid.free.length && grid.free[n] === 1 && region[n] === -1) {
          region[n] = id;
          stack.push(n);
        }
      }
    }
    sizes.push(size);
  }
  return { region, sizes };
}
