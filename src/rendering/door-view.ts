import { Container, Graphics } from 'pixi.js';
import type { DoorSpec } from '../data/arenas/arena-layout';

export interface DoorPiece {
  x: number;
  y: number;
  angle: number;
  /** Height above the floor while flying, metres. */
  heightM: number;
}

/**
 * A closed wooden door in a wall gap (drawn as short blocks so it depth-sorts
 * with fighters), and its splintered planks once broken. Planks follow the
 * physics debris positions passed to `showBroken`.
 */
export class DoorView {
  readonly parts: { node: Container; footOffset: number }[] = [];
  private readonly intact: Container[] = [];
  private readonly planks: Container[] = [];
  private broken = false;

  constructor(
    private readonly spec: DoorSpec,
    private readonly heightM: number,
  ) {
    const w = spec.x1 - spec.x0;
    const length = spec.y1 - spec.y0;
    const chunks = Math.max(1, Math.round(length / 0.5));
    const d = length / chunks;
    const h = heightM * 0.92;
    for (let i = 0; i < chunks; i++) {
      const g = new Graphics()
        .rect(-w / 2, d / 2 - h, w, h)
        .fill(0x8b5a2b)
        .rect(-w / 2, -d / 2 - h, w, d)
        .fill(0xa8713a)
        .stroke({ width: 0.02, color: 0x3b2412 });
      // panel grooves and a brass handle in the middle chunk
      g.moveTo(-w / 2 + 0.02, d / 2 - h + 0.3)
        .lineTo(w / 2 - 0.02, d / 2 - h + 0.3)
        .stroke({ width: 0.02, color: 0x5e3a1a });
      if (i === Math.floor(chunks / 2)) g.circle(0, d / 2 - h * 0.45, 0.06).fill(0xd4af37);
      const node = new Container();
      node.label = `door-${spec.id}`;
      node.addChild(g);
      node.position.set((spec.x0 + spec.x1) / 2, spec.y0 + d * (i + 0.5));
      this.intact.push(node);
      this.parts.push({ node, footOffset: d / 2 });
    }
  }

  get isBroken(): boolean {
    return this.broken;
  }

  /** Replace the door with planks at the given debris positions (called every frame once broken). */
  showBroken(pieces: readonly DoorPiece[], addPlank: (node: Container) => void): void {
    if (!this.broken) {
      this.broken = true;
      for (const n of this.intact) n.visible = false;
      for (let i = 0; i < pieces.length; i++) {
        const plank = new Container();
        plank.label = `door-plank-${this.spec.id}`;
        const len = 0.45 + (i % 3) * 0.12;
        plank.addChild(
          new Graphics().ellipse(0, 0.05, len * 0.5, 0.07).fill({ color: 0x000000, alpha: 0.25 }),
          new Graphics()
            .rect(-len / 2, -0.06, len, 0.12)
            .fill(i % 2 ? 0xa8713a : 0x8b5a2b)
            .stroke({ width: 0.015, color: 0x3b2412 }),
        );
        this.planks.push(plank);
        addPlank(plank);
      }
    }
    pieces.forEach((p, i) => {
      const plank = this.planks[i];
      if (!plank) return;
      plank.position.set(p.x, p.y);
      const body = plank.children[1];
      if (body) {
        body.rotation = p.angle;
        body.y = -p.heightM;
      }
    });
  }

  destroy(): void {
    this.planks.length = 0;
    this.intact.length = 0;
  }
}
