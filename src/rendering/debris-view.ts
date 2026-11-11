import { Container, Graphics } from 'pixi.js';
import type { DebrisPiece } from '../environment/debris';
import type { YSortLayer } from './y-sort-layer';

/**
 * Broken pieces of furniture (GREYBOX): a small block in the material's
 * colour with a floor shadow, following its physics body and hop height.
 */
export class DebrisView {
  private readonly nodes = new Map<number, Container>();

  constructor(private readonly actors: YSortLayer) {}

  sync(pieces: readonly DebrisPiece[]): void {
    const seen = new Set<number>();
    for (const p of pieces) {
      seen.add(p.id);
      let node = this.nodes.get(p.id);
      if (!node) {
        node = new Container();
        node.label = 'debris';
        node.addChild(
          new Graphics().ellipse(0, 0.04, p.halfW * 1.1, p.halfH * 1.4 + 0.03).fill({ color: 0x000000, alpha: 0.22 }),
          new Graphics()
            .rect(-p.halfW, -p.halfH, p.halfW * 2, p.halfH * 2)
            .fill(p.colour)
            .stroke({ width: 0.015, color: 0x1f242d }),
        );
        this.nodes.set(p.id, node);
        this.actors.add(node, 0);
      }
      const at = p.body.translation();
      node.position.set(at.x, at.y);
      const block = node.children[1];
      if (block) {
        block.rotation = p.body.rotation();
        block.y = -p.heightM;
      }
    }
    // Pieces cleared by the debris cap.
    for (const [id, node] of this.nodes) {
      if (seen.has(id)) continue;
      this.actors.remove(node);
      node.destroy({ children: true });
      this.nodes.delete(id);
    }
  }

  destroy(): void {
    this.nodes.clear();
  }
}
