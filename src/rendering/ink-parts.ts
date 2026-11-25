import type { Graphics } from 'pixi.js';
import type { solveSkeleton } from '../animation/skeleton';

type Skel = ReturnType<typeof solveSkeleton>;
type Point = { x: number; y: number };

/** What the parts need to know about this frame (a subset of the premium model's draw state). */
export interface InkDrawState {
  /** Render clock, seconds. */
  readonly t: number;
  /** Unit line width of the rig (metres). */
  readonly w: number;
  readonly headRadius: number;
  readonly facing: 1 | -1;
}

const BLACK = 0x060608;
const INK = 0x14141a;
const INK_LIT = 0x2e2e38;
const PALE = 0xf2eee3;
const WHITE_EYE = 0xffffff;

/** A tapered ribbon along `pts`, `widths` wide at each point (metres): the stroke of a brush. */
function ribbon(g: Graphics, pts: readonly Point[], widths: readonly number[], colour: number, alpha = 1): void {
  if (pts.length < 2) return;
  const left: Point[] = [];
  const right: Point[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(pts.length - 1, i + 1)]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l;
    const ny = dx / l;
    const w = (widths[i] ?? widths[widths.length - 1] ?? 0.05) / 2;
    left.push({ x: pts[i]!.x + nx * w, y: pts[i]!.y + ny * w });
    right.push({ x: pts[i]!.x - nx * w, y: pts[i]!.y - ny * w });
  }
  const poly = [...left, ...right.reverse()].flatMap((p) => [p.x, p.y]);
  g.poly(poly).fill({ color: colour, alpha });
}

/** Inkmaster's own head dressing: a high topknot with a pale hairpin and two trailing ribbons that stir with his movement. */
export function drawInkmasterHead(g: Graphics, s: Skel, st: InkDrawState): void {
  const r = st.headRadius;
  const h = s.head;
  const sway = Math.sin(st.t * 2.4) * 0.03;
  // The topknot: a small black bun above the crown, with a pale pin through it.
  g.circle(h.x - r * 0.1, h.y - r * 1.12, r * 0.42).fill(BLACK);
  g.circle(h.x - r * 0.18, h.y - r * 1.2, r * 0.16).fill({ color: INK_LIT, alpha: 0.8 });
  g.moveTo(h.x - r * 0.7, h.y - r * 1.15)
    .lineTo(h.x + r * 0.5, h.y - r * 1.05)
    .stroke({ width: 0.012, color: PALE, cap: 'round' });
  // The ribbons: two flowing tails behind his head.
  for (const k of [0, 1]) {
    const base = { x: h.x - r * 0.7, y: h.y - r * 0.9 + k * 0.03 };
    const pts = [0, 1, 2, 3, 4].map((i) => ({
      x: base.x - i * 0.1 - sway * i,
      y: base.y + i * 0.07 + Math.sin(st.t * 3 + i * 0.9 + k) * 0.02 * i,
    }));
    ribbon(g, pts, [0.03, 0.04, 0.034, 0.024, 0.01], BLACK);
  }
  // A white-streaked brow: a calm, slightly raised eyebrow line on the face.
  g.moveTo(h.x + r * 0.25, h.y - r * 0.3)
    .lineTo(h.x + r * 0.75, h.y - r * 0.38)
    .stroke({ width: 0.01, color: PALE, alpha: 0.9, cap: 'round' });
}

/** A clone's head: a smooth, faceless ink oval: only a pale glint where a face would be. */
export function drawCloneHead(g: Graphics, s: Skel, st: InkDrawState): void {
  const r = st.headRadius;
  g.circle(s.head.x, s.head.y, r * 1.02).fill(BLACK);
  g.ellipse(s.head.x - r * 0.3, s.head.y - r * 0.35, r * 0.3, r * 0.2).fill({ color: INK_LIT, alpha: 0.8 });
  // Ink drips off its chin and settles back.
  const p = (st.t * 0.7) % 1;
  g.ellipse(s.head.x + r * 0.2, s.head.y + r * (1 + p * 0.9), 0.012, 0.018 + p * 0.01).fill({
    color: BLACK,
    alpha: 1 - p,
  });
}

/** The beast's long, serpentine tail: an S curve of black ink trailing from the pelvis, swaying, tapering to a brush point. */
export function drawBeastTail(g: Graphics, fire: Graphics, s: Skel, st: InkDrawState): void {
  const base = { x: s.pelvis.x - 0.05, y: s.pelvis.y + 0.04 };
  const n = 14;
  const pts: Point[] = [];
  const widths: number[] = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const reach = u * 2.6;
    const wave = Math.sin(st.t * 2 - u * 5) * 0.2 * u;
    pts.push({ x: base.x - reach, y: base.y + Math.min(0.5, u * 0.85) * 0.45 + wave - Math.sin(u * Math.PI) * 0.18 });
    widths.push(0.2 * (1 - u) ** 0.8 + 0.02);
  }
  ribbon(
    g,
    pts,
    widths.map((w) => w + 0.025),
    BLACK,
  );
  ribbon(g, pts, widths, INK);
  // A pale ridge of ink-wash along the top, and spikes like a dragon's spine.
  ribbon(
    g,
    pts.map((p) => ({ x: p.x, y: p.y - 0.02 })),
    widths.map((w) => w * 0.22),
    INK_LIT,
    0.8,
  );
  for (let i = 1; i < n - 2; i += 2) {
    const p = pts[i]!;
    const w = widths[i]!;
    g.poly([
      p.x + 0.04,
      p.y - w * 0.5,
      p.x - 0.03,
      p.y - w * 0.5 - 0.1 * (1 - i / n) - 0.03,
      p.x - 0.07,
      p.y - w * 0.45,
    ]).fill(BLACK);
  }
  // The tip frays into a few wet strands, like a brush lifting off the paper.
  const tip = pts[n - 1]!;
  for (const k of [-1, 0, 1]) {
    g.moveTo(tip.x, tip.y)
      .lineTo(tip.x - 0.12, tip.y + k * 0.045 + Math.sin(st.t * 3 + k) * 0.01)
      .stroke({ width: 0.012, color: BLACK, cap: 'round' });
  }
  fire.circle(base.x - 0.3, base.y, 0.25).fill({ color: 0x2e2e38, alpha: 0.05 });
}

/** The mane and back spines of the beast: wet black spikes standing up from the shoulders and down the spine. */
export function drawBeastMane(g: Graphics, s: Skel, st: InkDrawState): void {
  const top = s.neck ?? s.chest;
  for (let i = 0; i < 6; i++) {
    const u = i / 5;
    const x = top.x - 0.08 - u * 0.14;
    const y = top.y + u * (s.pelvis.y - top.y) * 0.9;
    const sway = Math.sin(st.t * 3 + i) * 0.015;
    const h = 0.2 * (1 - u * 0.5);
    g.poly([x + 0.03, y, x - 0.07 - h * 0.5 + sway, y - h, x - 0.06, y + 0.09]).fill(BLACK);
    g.poly([x + 0.01, y + 0.01, x - 0.05 - h * 0.35 + sway, y - h * 0.8, x - 0.04, y + 0.06]).fill({
      color: INK_LIT,
      alpha: 0.6,
    });
  }
}

/**
 * The beast's head: a dragon's face of wet black ink. A long snout and a hinged jaw with teeth, a heavy brow, glowing white eyes,
 * two great swept-back horns with a smaller pair below, and the long whisker tendrils of a Chinese dragon. `bite` (0..1) opens the jaw.
 */
export function drawBeastHead(g: Graphics, fire: Graphics, s: Skel, st: InkDrawState, bite: number, roar = 0): void {
  const r = st.headRadius;
  const h = s.head;
  const open = Math.max(bite, roar * 0.8);
  // The great horns: thick at the root, sweeping back and up in a graceful curve, with a pale ridge.
  for (const side of [0, 1]) {
    const ox = side === 0 ? 0 : -0.12;
    const root = { x: h.x - r * 0.2 + ox, y: h.y - r * 0.85 };
    const pts = [0, 1, 2, 3, 4, 5].map((i) => {
      const u = i / 5;
      return {
        x: root.x - u * r * 2.6 - side * u * r * 0.4,
        y: root.y - Math.sin(u * 2.4) * r * 1.5 + u * u * r * 0.4,
      };
    });
    ribbon(g, pts, [r * 0.55, r * 0.5, r * 0.4, r * 0.28, r * 0.15, 0.01], BLACK);
    ribbon(
      g,
      pts.map((p) => ({ x: p.x + 0.015, y: p.y - 0.03 })),
      [r * 0.1, r * 0.1, r * 0.08, r * 0.06, r * 0.03, 0.004],
      INK_LIT,
      0.85,
    );
  }
  // The skull and brow: a heavy forehead over the eye.
  g.ellipse(h.x, h.y, r * 1.08, r * 1.0).fill(BLACK);
  g.poly([
    h.x - r * 0.2,
    h.y - r * 0.6,
    h.x + r * 1.0,
    h.y - r * 0.5,
    h.x + r * 0.6,
    h.y - r * 0.12,
    h.x - r * 0.1,
    h.y - r * 0.2,
  ]).fill(INK_LIT);
  // The snout: a long, tapering muzzle and a hinged lower jaw.
  const snoutLen = r * 1.7;
  g.poly([
    h.x + r * 0.2,
    h.y - r * 0.35,
    h.x + snoutLen,
    h.y - r * 0.2,
    h.x + snoutLen + r * 0.15,
    h.y + r * 0.1,
    h.x + r * 0.2,
    h.y + r * 0.35,
  ]).fill(BLACK);
  // The jaw drops open on a bite or a roar; teeth line both rows.
  const jawDrop = r * 0.75 * open;
  g.poly([
    h.x + r * 0.15,
    h.y + r * 0.3,
    h.x + snoutLen * 0.95,
    h.y + r * 0.12 + jawDrop,
    h.x + snoutLen * 0.85,
    h.y + r * 0.42 + jawDrop,
    h.x + r * 0.1,
    h.y + r * 0.7,
  ]).fill(BLACK);
  if (open > 0.05) {
    g.poly([
      h.x + r * 0.35,
      h.y + r * 0.33,
      h.x + snoutLen * 0.9,
      h.y + r * 0.14,
      h.x + snoutLen * 0.8,
      h.y + r * 0.14 + jawDrop * 0.9,
      h.x + r * 0.3,
      h.y + r * 0.55 + jawDrop * 0.2,
    ]).fill(0x2a0b0b);
  }
  for (let i = 0; i < 6; i++) {
    const x = h.x + r * 0.6 + i * r * 0.19;
    g.poly([x, h.y + r * 0.2, x + 0.02, h.y + r * 0.2, x + 0.01, h.y + r * 0.2 + 0.07]).fill(PALE);
    g.poly([
      x,
      h.y + r * 0.35 + jawDrop,
      x + 0.02,
      h.y + r * 0.35 + jawDrop,
      x + 0.01,
      h.y + r * 0.35 + jawDrop - 0.06,
    ]).fill(PALE);
  }
  // Nostril and whiskers: two long tendrils streaming back from the snout like a dragon's, drifting on the air.
  g.circle(h.x + snoutLen * 0.9, h.y - r * 0.12, 0.014).fill(INK_LIT);
  for (const k of [0, 1]) {
    const root = { x: h.x + snoutLen * 0.55, y: h.y + r * 0.05 + k * r * 0.2 };
    const pts = [0, 1, 2, 3, 4].map((i) => ({
      x: root.x - i * r * 0.5,
      y: root.y + (k === 0 ? -1 : 1) * i * 0.08 + Math.sin(st.t * 3 + i * 0.8 + k) * 0.03 * i,
    }));
    ribbon(g, pts, [0.03, 0.026, 0.02, 0.012, 0.004], BLACK);
  }
  // The eyes: glowing white, narrowed and angry, one on the near side and a smaller one beyond.
  const eye = { x: h.x + r * 0.5, y: h.y - r * 0.18 };
  fire.circle(eye.x, eye.y, r * 0.55).fill({ color: WHITE_EYE, alpha: 0.2 });
  g.poly([
    eye.x - r * 0.22,
    eye.y + r * 0.02,
    eye.x + r * 0.34,
    eye.y - r * 0.12,
    eye.x + r * 0.22,
    eye.y + r * 0.12,
  ]).fill(WHITE_EYE);
  g.circle(eye.x + r * 0.1, eye.y, r * 0.05).fill(BLACK);
  const far = { x: h.x + r * 0.95, y: h.y - r * 0.1 };
  g.circle(far.x, far.y, r * 0.09).fill({ color: WHITE_EYE, alpha: 0.9 });
  fire.circle(far.x, far.y, r * 0.22).fill({ color: WHITE_EYE, alpha: 0.18 });
  // The lower pair of horns, small and forward.
  for (const k of [0, 1]) {
    const bx = h.x + r * 0.05 - k * 0.1;
    g.poly([bx, h.y - r * 0.5, bx - r * 0.55, h.y - r * 1.15 - k * 0.05, bx - r * 0.18, h.y - r * 0.38]).fill(INK_LIT);
  }
  // A drip of ink from the jaw while the mouth is open.
  if (open > 0.2) {
    const p = (st.t * 1.4) % 1;
    g.ellipse(h.x + snoutLen * 0.7, h.y + r * 0.5 + jawDrop + p * 0.3, 0.016, 0.024).fill({
      color: BLACK,
      alpha: 1 - p,
    });
  }
}

/** Three heavy claws on a hand, pointing along the forearm: curved, tapering to fine, pale points. */
export function drawBeastClaws(g: Graphics, elbow: Point, hand: Point, scale = 1): void {
  const dx = hand.x - elbow.x;
  const dy = hand.y - elbow.y;
  const l = Math.hypot(dx, dy) || 1;
  const ux = dx / l;
  const uy = dy / l;
  const nx = -uy;
  const ny = ux;
  g.circle(hand.x, hand.y, 0.075 * scale).fill(BLACK);
  for (const k of [-1, 0, 1]) {
    const bx = hand.x + ux * 0.03 + nx * k * 0.055 * scale;
    const by = hand.y + uy * 0.03 + ny * k * 0.055 * scale;
    const tx = bx + ux * 0.2 * scale + nx * k * 0.03 * scale;
    const ty = by + uy * 0.2 * scale + ny * k * 0.03 * scale;
    const mx = bx + ux * 0.1 * scale + nx * k * 0.045 * scale;
    const my = by + uy * 0.1 * scale + ny * k * 0.045 * scale;
    g.poly([
      bx + nx * 0.028,
      by + ny * 0.028,
      mx + nx * 0.015,
      my + ny * 0.015,
      tx,
      ty,
      mx - nx * 0.015,
      my - ny * 0.015,
      bx - nx * 0.028,
      by - ny * 0.028,
    ]).fill(PALE);
    g.poly([bx + nx * 0.028, by + ny * 0.028, tx, ty, bx - nx * 0.028, by - ny * 0.028]).stroke({
      width: 0.006,
      color: BLACK,
    });
  }
}
