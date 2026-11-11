import { Container, Graphics } from 'pixi.js';
import { fromBoxFrame } from '../core/oriented-rect';
import type { DoorSpec } from '../data/arenas/arena-layout';
import { drawPrism, type PrismLook } from './prism';
import { iso } from './projection';

export interface DoorPiece {
  x: number;
  y: number;
  angle: number;
  /** Height above the floor while flying, metres. */
  heightM: number;
}

const WOOD_FRONT = 0xc0782f;
const WOOD_TOP = 0xe8a050;
const WOOD_EDGE = 0x3b2412;
const FRAME = 0xf4e6bf;
const FRAME_EDGE = 0x6b5a32;
const MAT = 0x8c2f2f;
const ARROW = 0xffd23f;
const HANDLE = 0xffd700;

/**
 * A door in a wall gap, made easy to find (owner, 11/11/2026, REQ-ENV-13): a
 * bright cream frame that stands out from the grey wall, a warm wooden leaf with
 * a light edge and a brass handle, red mats on both sides and a yellow arrow on
 * the floor pointing through. Walking into it swings the leaf open (`showSwing`);
 * once broken, its planks follow the physics debris (`showBroken`).
 * The closed leaf and frame are short blocks so they depth-sort with fighters.
 */
export class DoorView {
  readonly parts: { node: Container; footOffset: number }[] = [];
  /** Mats and arrow: lie on the floor under everything that stands. */
  readonly floor = new Container();
  private readonly intact: Container[] = [];
  private readonly leaf = new Container();
  private readonly leafG = new Graphics();
  private readonly planks: Container[] = [];
  private broken = false;
  private drawnSwing = -1;
  private drawnSide = 0;

  constructor(
    private readonly spec: DoorSpec,
    private readonly heightM: number,
  ) {
    const along = spec.y1 - spec.y0;
    const cx = (spec.x0 + spec.x1) / 2;
    const h = heightM * 0.92;
    this.buildFloor();

    // The shut leaf, in short blocks along the doorway (works for a turned door too).
    const chunks = Math.max(1, Math.round(along / 0.5));
    for (let i = 0; i < chunks; i++) {
      const ya = spec.y0 + (along * i) / chunks;
      const yb = spec.y0 + (along * (i + 1)) / chunks;
      const block = this.block(spec.x0, ya, spec.x1, yb, h, { front: WOOD_FRONT, top: WOOD_TOP, edge: WOOD_EDGE });
      block.node.label = `door-${spec.id}`;
      if (i === Math.floor(chunks / 2)) {
        block.node.addChild(
          new Graphics()
            .circle(0, -h * 0.5, 0.07)
            .fill(HANDLE)
            .stroke({ width: 0.02, color: WOOD_EDGE }),
        );
      }
      this.intact.push(block.node);
      this.parts.push(block);
    }

    // The swinging leaf: hidden while shut (the blocks above draw it then).
    this.leaf.label = `door-leaf-${spec.id}`;
    this.leaf.addChild(this.leafG);
    const hinge = fromBoxFrame(spec, cx, spec.y0);
    const hingeAt = iso(hinge.x, hinge.y);
    this.leaf.position.set(hingeAt.x, hingeAt.y);
    this.leaf.visible = false;
    this.parts.push({ node: this.leaf, footOffset: 0.2 });

    // Door frame: a bright post at each end, a little taller and wider than the wall.
    const postD = 0.16;
    const wide = 0.17;
    for (const [ya, yb] of [
      [spec.y0 - postD, spec.y0],
      [spec.y1, spec.y1 + postD],
    ] as const) {
      const post = this.block(spec.x0 - wide, ya, spec.x1 + wide, yb, heightM + 0.08, {
        front: FRAME,
        top: 0xfff6dc,
        edge: FRAME_EDGE,
        edgeWidth: 0.025,
      });
      post.node.label = `door-frame-${spec.id}`;
      this.parts.push(post);
    }
  }

  /** A block on part of the doorway, given in the door's unturned frame. */
  private block(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    heightM: number,
    look: PrismLook,
  ): { node: Container; footOffset: number } {
    const s = this.spec;
    const centre = fromBoxFrame(s, (x0 + x1) / 2, (y0 + y1) / 2);
    const rel = [
      fromBoxFrame(s, x0, y0),
      fromBoxFrame(s, x1, y0),
      fromBoxFrame(s, x1, y1),
      fromBoxFrame(s, x0, y1),
    ].map((p) => iso(p.x - centre.x, p.y - centre.y));
    const node = new Container();
    node.addChild(drawPrism(new Graphics(), rel, heightM, look));
    const at = iso(centre.x, centre.y);
    node.position.set(at.x, at.y);
    return { node, footOffset: Math.max(...rel.map((p) => p.y)) };
  }

  /** Red mats either side of the doorway and a yellow arrow pointing through it, turned with the door. */
  private buildFloor(): void {
    const s = this.spec;
    const length = s.y1 - s.y0;
    const matW = 0.85;
    const g = new Graphics();
    // Drawn about the door's centre in its own frame; the container turns it into place.
    for (const side of [-1, 1]) {
      const x = side < 0 ? -0.2 - matW - 0.05 : 0.2 + 0.05;
      g.roundRect(x, -length / 2 + 0.08, matW, length - 0.16, 0.08)
        .fill(MAT)
        .stroke({ width: 0.03, color: 0xd9a441 });
    }
    g.rect(-0.2, -length / 2, 0.4, length).fill({ color: 0xd9a441, alpha: 0.85 }); // threshold
    const ax = -0.2 - matW / 2 - 0.05;
    const r = Math.min(0.32, length * 0.3);
    g.poly([ax - 0.22, -r, ax + 0.18, 0, ax - 0.22, r, ax - 0.08, 0]).fill(ARROW);
    this.floor.label = `door-floor-${s.id}`;
    this.floor.addChild(g);
    this.floor.position.set((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2);
    this.floor.rotation = s.angleRad ?? 0;
  }

  get isBroken(): boolean {
    return this.broken;
  }

  /**
   * Swing the leaf about its hinge (the y0 end): 0 = shut, 1 = open, flat
   * against the wall on `side` (+1 towards +x, the far room for a push from the left).
   */
  showSwing(swing: number, side: number): void {
    if (this.broken) return;
    const open = swing > 0.001;
    for (const n of this.intact) n.visible = !open;
    this.leaf.visible = open;
    if (!open || (Math.abs(swing - this.drawnSwing) < 1e-4 && side === this.drawnSide)) return;
    this.drawnSwing = swing;
    this.drawnSide = side;
    const sp = this.spec;
    const length = sp.y1 - sp.y0;
    const cx = (sp.x0 + sp.x1) / 2;
    const angle = (swing * Math.PI) / 2;
    const h = this.heightM * 0.92;
    const t = 0.07; // leaf thickness
    // The leaf in the door's own frame: from the hinge (cx, y0), turned towards the side it opens to.
    const dir = { x: side * Math.sin(angle), y: Math.cos(angle) };
    const perp = { x: dir.y, y: -dir.x };
    const hinge = fromBoxFrame(sp, cx, sp.y0);
    const local = [
      [cx, sp.y0],
      [cx + dir.x * length, sp.y0 + dir.y * length],
      [cx + dir.x * length + perp.x * t, sp.y0 + dir.y * length + perp.y * t],
      [cx + perp.x * t, sp.y0 + perp.y * t],
    ] as const;
    const corners = local.map(([x, y]) => {
      const p = fromBoxFrame(sp, x, y);
      return iso(p.x - hinge.x, p.y - hinge.y);
    });
    this.leafG.clear();
    drawPrism(this.leafG, corners, h, { front: WOOD_FRONT, top: WOOD_TOP, edge: WOOD_EDGE, edgeWidth: 0.025 });
    const tip = corners[1]!;
    this.leafG.circle(tip.x * 0.82, tip.y * 0.82 - h * 0.5, 0.06).fill(HANDLE);
  }

  /** Replace the door with planks at the given debris positions (called every frame once broken). */
  showBroken(pieces: readonly DoorPiece[], addPlank: (node: Container) => void): void {
    if (!this.broken) {
      this.broken = true;
      for (const n of this.intact) n.visible = false;
      this.leaf.visible = false;
      for (let i = 0; i < pieces.length; i++) {
        const plank = new Container();
        plank.label = `door-plank-${this.spec.id}`;
        const len = 0.45 + (i % 3) * 0.12;
        plank.addChild(
          new Graphics().ellipse(0, 0.05, len * 0.5, 0.07).fill({ color: 0x000000, alpha: 0.25 }),
          new Graphics()
            .rect(-len / 2, -0.06, len, 0.12)
            .fill(i % 2 ? WOOD_TOP : WOOD_FRONT)
            .stroke({ width: 0.015, color: WOOD_EDGE }),
        );
        this.planks.push(plank);
        addPlank(plank);
      }
    }
    pieces.forEach((p, i) => {
      const plank = this.planks[i];
      if (!plank) return;
      const at = iso(p.x, p.y);
      plank.position.set(at.x, at.y);
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
