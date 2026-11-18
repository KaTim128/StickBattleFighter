import { Container, type ContainerChild } from 'pixi.js';

/**
 * Top-down depth (REQ-VIS-9): whatever stands lower on the screen is closer to
 * the viewer, so it draws in front. Each object sorts by the y of its "feet"
 * (where it touches the floor), not its centre, so tall objects overlap correctly.
 */
export class YSortLayer {
  readonly container = new Container();
  private readonly footOffsets = new Map<ContainerChild, number>();
  /** Extra depth for a child (negative: drawn behind whatever it would cover); see `setBias`. */
  private readonly bias = new Map<ContainerChild, number>();

  constructor() {
    this.container.label = 'y-sort-layer';
    this.container.sortableChildren = true;
  }

  /** @param footOffsetM distance from the object's origin down to its feet, in world units. */
  add(child: ContainerChild, footOffsetM = 0): void {
    this.footOffsets.set(child, footOffsetM);
    this.container.addChild(child);
  }

  /** A child's own depth key, without any bias. */
  keyOf(child: ContainerChild): number {
    return child.y + (this.footOffsets.get(child) ?? 0);
  }

  /** Moves a child's depth by `by` (0 clears it): a see-through wall is pushed behind the furniture in its room. */
  setBias(child: ContainerChild, by: number): void {
    if (by === 0) this.bias.delete(child);
    else this.bias.set(child, by);
  }

  remove(child: ContainerChild): void {
    this.footOffsets.delete(child);
    this.bias.delete(child);
    this.container.removeChild(child);
  }

  /** Call once per rendered frame after positions are updated. */
  update(): void {
    for (const [child, foot] of this.footOffsets) child.zIndex = child.y + foot + (this.bias.get(child) ?? 0);
  }

  destroy(): void {
    this.footOffsets.clear();
    this.container.destroy({ children: true });
  }
}
