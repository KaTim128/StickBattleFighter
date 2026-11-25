import type { Graphics } from 'pixi.js';
import {
  COLLAPSE_S,
  DRAGON_HEIGHT_M,
  type Dragon,
  type InkWorld,
  type Masterpiece,
  type Serpent,
  type Vortex,
} from '../abilities/ink-world';
import { smoothPath } from '../rendering/ink-parts';
import { ISO_T } from '../rendering/projection';

type Point = { x: number; y: number };
type Project = (x: number, y: number, z?: number) => Point;

/**
 * Inkmaster's living ink, drawn from the ink world's state every frame: the serpent being brushed into existence and then hunting, the
 * dragon with its wings, legs, whiskers and its warned breath, the swirling cyclone and its collapse, and The Masterpiece: the dimmed
 * arena, the hanging scroll and the monster drawn on it stroke by stroke. Everything is a layered ink stroke (black body, pale rim
 * light, wet highlights) so it reads on any floor.
 */
const BLACK = 0x050507;
const INK = 0x15151b;
const INK_LIT = 0x34343f;
const PALE = 0xf2eee3;
const PAPER = 0xe9dfc6;
const PAPER_SHADE = 0xc9bd9c;
const WOOD = 0x4a2c18;
/** The scroll is a modest hanging picture, not a wall: about a metre wide and two high. */
const SCROLL_W_M = 1.05;
const SCROLL_H_M = 1.9;

/** A tapered ribbon through projected points `pts` with `widths` (screen metres). */
function ribbon(g: Graphics, rawPts: readonly Point[], rawWidths: readonly number[], colour: number, alpha = 1): void {
  if (rawPts.length < 2) return;
  const { pts, widths } = smoothPath(rawPts, rawWidths);
  const left: Point[] = [];
  const right: Point[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(pts.length - 1, i + 1)]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    const w = (widths[Math.min(i, widths.length - 1)] ?? 0.05) / 2;
    left.push({ x: pts[i]!.x - (dy / l) * w, y: pts[i]!.y + (dx / l) * w });
    right.push({ x: pts[i]!.x + (dy / l) * w, y: pts[i]!.y - (dx / l) * w });
  }
  g.poly([...left, ...right.reverse()].flatMap((p) => [p.x, p.y])).fill({ color: colour, alpha });
}

const ease = (k: number): number => k * k * (3 - 2 * k);
const clamp01 = (k: number): number => Math.max(0, Math.min(1, k));

/** A spray of tiny ink drops flung from `at` (deterministic from `seed` and the clock, so it needs no state). */
function splatter(g: Graphics, at: Point, radius: number, k: number, seed: number, count = 12): void {
  for (let i = 0; i < count; i++) {
    const a = ((i * 2.399 + seed) % (Math.PI * 2)) + 0.3;
    const d = radius * (0.35 + ((i * 0.37 + seed * 0.13) % 1)) * ease(k);
    const r = 0.02 + ((i * 0.53) % 1) * 0.035;
    g.circle(at.x + Math.cos(a) * d, at.y + Math.sin(a) * d * ISO_T * 1.4, r * (1 - k * 0.5)).fill({
      color: BLACK,
      alpha: 1 - k * 0.8,
    });
  }
}

/** The serpent: drawn in the air by a brush tip, then a living, hunting snake of ink; it coils round its prey when it catches it. */
function serpent(f: Graphics, g: Graphics, P: Project, s: Serpent, t: number, preyAt: Point | null): void {
  const fade = s.phase === 'fade' ? clamp01(1 - s.phaseS / 0.6) : 1;
  const z = 0.45;
  // Shadow on the floor.
  const sh = [s.x, s.y];
  f.ellipse(sh[0]!, sh[1]!, 0.5, 0.2).fill({ color: BLACK, alpha: 0.25 * fade });
  if (s.phase === 'form') {
    // The stroke is drawn progressively: an S curve through the air from the brush point, with the wet brush tip glowing at its end.
    const k = clamp01(s.phaseS / s.spec.formS);
    const n = 24;
    const pts: Point[] = [];
    const widths: number[] = [];
    const dirx = Math.cos(s.heading);
    const diry = Math.sin(s.heading);
    const count = Math.max(2, Math.round(n * ease(k)));
    for (let i = 0; i < count; i++) {
      const u = i / (n - 1);
      const along = u * 2.8;
      const wob = Math.sin(u * 9) * 0.45 * (0.3 + u);
      pts.push(
        P(s.home.x + dirx * along - diry * wob, s.home.y + diry * along + dirx * wob, 0.6 + Math.sin(u * 6) * 0.25),
      );
      widths.push(0.05 + 0.1 * Math.sin(Math.min(1, u * 1.2) * Math.PI) + 0.02);
    }
    ribbon(
      g,
      pts,
      widths.map((w) => w + 0.03),
      PALE,
      0.35,
    );
    ribbon(g, pts, widths, BLACK);
    const tip = pts[pts.length - 1]!;
    g.circle(tip.x, tip.y, 0.07).fill({ color: PALE, alpha: 0.9 });
    g.circle(tip.x, tip.y, 0.16).fill({ color: PALE, alpha: 0.18 });
    splatter(g, tip, 0.35, (t * 1.7) % 1, tip.x * 7, 6);
    return;
  }
  // The living body: along the recorded path, newest (head) first, tapering to a fine tail that ripples.
  const trail = s.trail;
  const pts: Point[] = [];
  const widths: number[] = [];
  const m = Math.max(2, trail.length);
  for (let i = 0; i < m; i++) {
    const p = trail[Math.min(i, trail.length - 1)]!;
    const u = i / (m - 1);
    const ripple = Math.sin(t * 9 - i * 0.9) * 0.1 * (0.3 + u);
    const nx = -Math.sin(s.heading) * ripple;
    const ny = Math.cos(s.heading) * ripple;
    pts.push(P(p.x + nx, p.y + ny, z + Math.sin(t * 5 + i) * 0.05));
    widths.push(0.34 * (1 - u * 0.8) ** 0.9 + 0.025);
  }
  if (s.phase === 'wrap' && preyAt) {
    // Coiled round the target's legs and body, rising in a spiral.
    pts.length = 0;
    widths.length = 0;
    for (let i = 0; i < 26; i++) {
      const u = i / 25;
      const a = u * Math.PI * 5 + t * 2;
      pts.push(P(preyAt.x + Math.cos(a) * 0.5, preyAt.y + Math.sin(a) * 0.5, 0.1 + u * 1.1));
      widths.push(0.2 * (1 - u * 0.5));
    }
  }
  ribbon(
    g,
    pts,
    widths.map((w) => w + 0.04),
    PALE,
    0.28 * fade,
  );
  ribbon(g, pts, widths, BLACK, fade);
  ribbon(
    g,
    pts.map((p) => ({ x: p.x - 0.015, y: p.y - 0.03 })),
    widths.map((w) => w * 0.25),
    INK_LIT,
    0.8 * fade,
  );
  // Scale marks: short pale chevrons along the body.
  for (let i = 2; i < pts.length - 2; i += 3) {
    const p = pts[i]!;
    g.moveTo(p.x - 0.03, p.y - 0.03)
      .lineTo(p.x, p.y + 0.02)
      .lineTo(p.x + 0.03, p.y - 0.03)
      .stroke({ width: 0.008, color: PALE, alpha: 0.4 * fade });
  }
  // The head: a wedge with two whiskers, horns and a white eye; the jaw opens as it strikes.
  const head = pts[0]!;
  const next = pts[Math.min(2, pts.length - 1)]!;
  const ang = Math.atan2(head.y - next.y, head.x - next.x);
  const hx = Math.cos(ang);
  const hy = Math.sin(ang);
  const nx = -hy;
  const ny = hx;
  const gape = s.phase === 'hunt' ? 0.5 + 0.5 * Math.sin(t * 6) * 0.3 : 0.9;
  const pt = (a: number, b: number): number[] => [head.x + hx * a + nx * b, head.y + hy * a + ny * b];
  g.poly([
    ...pt(-0.12, -0.17),
    ...pt(0.22, -0.09 - 0.03 * gape),
    ...pt(0.34, -0.02),
    ...pt(0.22, 0.02),
    ...pt(-0.1, 0.17),
  ]).fill({ color: BLACK, alpha: fade });
  g.poly([...pt(0.02, 0.06), ...pt(0.3, 0.03 + 0.12 * gape), ...pt(0.2, 0.12 + 0.12 * gape), ...pt(-0.06, 0.15)]).fill({
    color: INK,
    alpha: fade,
  });
  g.poly([...pt(-0.02, -0.14), ...pt(-0.2, -0.3), ...pt(0.04, -0.17)]).fill({ color: BLACK, alpha: fade });
  g.circle(head.x + hx * 0.12 + nx * -0.07, head.y + hy * 0.12 + ny * -0.07, 0.03).fill({ color: PALE, alpha: fade });
  for (const k of [-1, 1]) {
    const wp = [0, 1, 2, 3].map((i) => ({
      x: head.x + hx * (0.2 - i * 0.12) + nx * k * (0.06 + i * 0.07) + Math.sin(t * 6 + i) * 0.02,
      y: head.y + hy * (0.2 - i * 0.12) + ny * k * (0.06 + i * 0.07) + Math.cos(t * 6 + i) * 0.02,
    }));
    ribbon(g, wp, [0.022, 0.018, 0.012, 0.004], BLACK, fade);
  }
}

/**
 * One dragon wing: an arm of ink (shoulder, elbow, wrist) with a clawed thumb and four long finger bones fanning out; the membrane between
 * the fingers has a scalloped trailing edge that sweeps back to the body, so the whole wing is attached at the back. `flap` (-1..1) beats it.
 */
function wing(g: Graphics, root: Point, tail: Point, side: -1 | 1, flap: number, grow: number, fade: number): void {
  const lift = (0.8 + 0.5 * flap) * grow;
  const sp = side;
  const E = { x: root.x + sp * 0.32, y: root.y - 0.55 * lift };
  const W = { x: E.x + sp * 0.75 * (0.7 + 0.3 * grow), y: E.y - 0.22 * lift + 0.06 };
  const tips: Point[] = [
    { x: W.x + sp * 0.55, y: W.y - 0.35 * lift + 0.1 },
    { x: W.x + sp * 0.85, y: W.y + 0.18 + 0.1 * lift },
    { x: W.x + sp * 0.7, y: W.y + 0.75 * grow + 0.15 * lift },
    { x: W.x + sp * 0.34, y: W.y + 1.1 * grow + 0.1 * lift },
  ];
  const edge = (a: Point, b: Point): Point => ({
    x: (a.x + b.x) / 2 - sp * 0.05,
    y: (a.y + b.y) / 2 + 0.16 * grow,
  });
  // The membrane: arm, the leading edge out to the first fingertip, then scallops tip to tip and back to the body.
  g.moveTo(root.x, root.y);
  g.quadraticCurveTo((root.x + E.x) / 2, E.y + 0.02, E.x, E.y);
  g.quadraticCurveTo((E.x + W.x) / 2, W.y - 0.06, W.x, W.y);
  g.lineTo(tips[0]!.x, tips[0]!.y);
  for (let i = 1; i < tips.length; i++) {
    const c = edge(tips[i - 1]!, tips[i]!);
    g.quadraticCurveTo(c.x, c.y, tips[i]!.x, tips[i]!.y);
  }
  const last = edge(tips[tips.length - 1]!, tail);
  g.quadraticCurveTo(last.x, last.y, tail.x, tail.y);
  g.quadraticCurveTo((tail.x + root.x) / 2 + sp * 0.05, (tail.y + root.y) / 2, root.x, root.y);
  g.fill({ color: INK, alpha: 0.94 * fade });
  // A lighter wash near the arm gives the membrane depth, and veins run from the wrist to each fingertip.
  g.moveTo(root.x, root.y);
  g.quadraticCurveTo((root.x + E.x) / 2, E.y + 0.02, E.x, E.y);
  g.quadraticCurveTo((E.x + W.x) / 2, W.y - 0.06, W.x, W.y);
  g.lineTo(W.x + (tips[2]!.x - W.x) * 0.5, W.y + (tips[2]!.y - W.y) * 0.5);
  g.lineTo(root.x + (tail.x - root.x) * 0.3, root.y + (tail.y - root.y) * 0.3);
  g.fill({ color: INK_LIT, alpha: 0.35 * fade });
  for (const tip of tips) {
    g.moveTo(W.x, W.y).lineTo(tip.x, tip.y).stroke({ width: 0.026, color: BLACK, alpha: fade, cap: 'round' });
    g.moveTo(W.x, W.y)
      .lineTo(tip.x, tip.y)
      .stroke({ width: 0.007, color: PALE, alpha: 0.4 * fade, cap: 'round' });
  }
  // The arm bones, thick at the shoulder, with the thumb claw at the wrist.
  g.moveTo(root.x, root.y)
    .lineTo(E.x, E.y)
    .lineTo(W.x, W.y)
    .stroke({ width: 0.07, color: BLACK, alpha: fade, cap: 'round', join: 'round' });
  g.moveTo(root.x, root.y)
    .lineTo(E.x, E.y)
    .lineTo(W.x, W.y)
    .stroke({ width: 0.012, color: PALE, alpha: 0.45 * fade, cap: 'round', join: 'round' });
  g.poly([W.x - sp * 0.02, W.y - 0.03, W.x + sp * 0.04, W.y - 0.2 * grow, W.x + sp * 0.07, W.y - 0.02]).fill({
    color: PALE,
    alpha: fade,
  });
  g.circle(root.x, root.y, 0.06).fill({ color: BLACK, alpha: fade });
}

/** The dragon's whole body: head, whiskered and horned, an S-curved serpentine body with scales and a mane, four clawed legs, two wings. */
function dragon(f: Graphics, g: Graphics, P: Project, d: Dragon, t: number): void {
  const spec = d.spec;
  const fade = d.phase === 'fade' ? clamp01(1 - d.phaseS / 0.6) : 1;
  const grow = d.phase === 'form' ? ease(clamp01(d.phaseS / spec.formS)) : 1;
  const hover = d.phase === 'form' ? 0.8 + (DRAGON_HEIGHT_M - 0.8) * grow : DRAGON_HEIGHT_M + Math.sin(t * 2.2) * 0.12;
  const rear = d.phase === 'rear' ? Math.min(1, d.phaseS / 0.35) : d.phase === 'breathe' ? 1 : 0;
  // Shadow, and the warning line and breath on the floor.
  f.ellipse(d.x, d.y, 1.0 * grow, 0.4 * grow).fill({ color: BLACK, alpha: 0.2 * fade });
  if (d.phase === 'rear' || d.phase === 'breathe') {
    const a = d.breathFrom;
    const b = { x: a.x + d.breathDir.x * d.breathReachM, y: a.y + d.breathDir.y * d.breathReachM };
    if (d.phase === 'rear') {
      const k = clamp01(d.phaseS / spec.windupS);
      // A clear warning: a pale lane on the floor with the black ink filling it from the dragon outward, flashing as the breath nears.
      const flash = 0.5 + 0.5 * Math.sin(t * (10 + 16 * k));
      f.moveTo(a.x, a.y)
        .lineTo(b.x, b.y)
        .stroke({ width: spec.breathWidthM, color: PALE, alpha: 0.1 + 0.16 * flash });
      f.moveTo(a.x, a.y)
        .lineTo(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k)
        .stroke({ width: spec.breathWidthM * 0.7, color: BLACK, alpha: 0.25 + 0.3 * k });
      for (const sgn of [-1, 1]) {
        const nx = -d.breathDir.y * (spec.breathWidthM / 2) * sgn;
        const ny = d.breathDir.x * (spec.breathWidthM / 2) * sgn;
        f.moveTo(a.x + nx, a.y + ny)
          .lineTo(b.x + nx, b.y + ny)
          .stroke({ width: 0.05, color: PALE, alpha: 0.55 + 0.35 * flash });
      }
    } else {
      const k = clamp01(d.phaseS / 0.55);
      const pts: Point[] = [];
      for (let i = 0; i < 10; i++) {
        const u = i / 9;
        const reach = Math.min(1, k * 1.8) * u;
        pts.push({ x: a.x + (b.x - a.x) * reach, y: a.y + (b.y - a.y) * reach });
      }
      f.moveTo(a.x, a.y)
        .lineTo(b.x, b.y)
        .stroke({ width: spec.breathWidthM * 1.2 * (1 - k * 0.3), color: BLACK, alpha: 0.5 * (1 - k) + 0.1 });
      ribbon(
        f,
        pts,
        pts.map((_, i) => spec.breathWidthM * (0.4 + 0.6 * (i / 9)) * (1 - k * 0.4)),
        BLACK,
        0.85 * (1 - k * 0.6),
      );
      splatter(f, b, 1.1, k, d.x * 3, 14);
    }
  }
  // The body: an S curve behind the head at flying height, getting thinner toward the tail.
  const dirx = Math.cos(d.heading);
  const diry = Math.sin(d.heading);
  const n = 20;
  const body: Point[] = [];
  const widths: number[] = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const back = u * 3.6 * grow;
    const wave = Math.sin(t * 3 - u * 7) * 0.55 * Math.min(1, u * 2.4) * (1 - rear * 0.7);
    body.push(
      P(
        d.x - dirx * back - diry * wave,
        d.y - diry * back + dirx * wave,
        hover - u * 0.35 + Math.sin(t * 3 - u * 7 + 1) * 0.15 * u + rear * 0.35 * (1 - u),
      ),
    );
    widths.push((0.5 * (1 - u) ** 0.7 + 0.04) * (0.4 + 0.6 * grow));
  }
  // Wings: each one grows from the back (the shoulder sits on the spine, the trailing edge meets the body further down), so they are part of
  // the dragon. Far wing first, drawn behind the body.
  const flap = Math.sin(t * 6.5);
  const rootI = 3;
  const tailI = 8;
  const rootP = { x: body[rootI]!.x, y: body[rootI]!.y - widths[rootI]! * 0.45 };
  const tailP = { x: body[tailI]!.x, y: body[tailI]!.y - widths[tailI]! * 0.3 };
  wing(g, rootP, tailP, -1, flap, grow, fade);
  ribbon(
    g,
    body,
    widths.map((w) => w + 0.05),
    PALE,
    0.3 * fade,
  );
  ribbon(g, body, widths, BLACK, fade);
  ribbon(
    g,
    body.map((p) => ({ x: p.x, y: p.y - 0.04 })),
    widths.map((w) => w * 0.22),
    INK_LIT,
    0.85 * fade,
  );
  wing(g, rootP, tailP, 1, flap, grow, fade);
  // Belly scales and the mane along the back.
  for (let i = 1; i < n - 2; i++) {
    const p = body[i]!;
    const w = widths[i]!;
    g.moveTo(p.x - w * 0.3, p.y + w * 0.25)
      .lineTo(p.x, p.y + w * 0.4)
      .lineTo(p.x + w * 0.3, p.y + w * 0.25)
      .stroke({ width: 0.008, color: PALE, alpha: 0.35 * fade });
    if (i % 2 === 0)
      g.poly([
        p.x + 0.02,
        p.y - w * 0.5,
        p.x - 0.05,
        p.y - w * 0.5 - 0.14 * (1 - i / n) - 0.04,
        p.x - 0.08,
        p.y - w * 0.45,
      ]).fill({ color: BLACK, alpha: fade });
  }
  // Four clawed legs hang from the body.
  for (const [bi, off] of [
    [5, -1],
    [5, 1],
    [10, -1],
    [10, 1],
  ] as const) {
    const p = body[bi]!;
    const sw = Math.sin(t * 4 + bi + off) * 0.06;
    const fx = p.x + off * 0.16 + sw;
    const fy = p.y + 0.5 * grow;
    g.moveTo(p.x, p.y + 0.05)
      .lineTo(p.x + off * 0.12, p.y + 0.28 * grow)
      .lineTo(fx, fy)
      .stroke({ width: 0.06, color: BLACK, alpha: fade, cap: 'round' });
    for (const c of [-1, 0, 1])
      g.moveTo(fx, fy)
        .lineTo(fx + c * 0.05 + off * 0.03, fy + 0.07)
        .stroke({ width: 0.014, color: PALE, alpha: 0.8 * fade, cap: 'round' });
  }
  // The head, in front: horned, whiskered, with a lion's mane and a jaw that opens for the breath.
  const hp = P(d.x, d.y, hover + rear * 0.55);
  const gape = rear;
  const side = dirx >= 0 ? 1 : -1;
  const hr = 0.3 * (0.4 + 0.6 * grow);
  g.circle(hp.x - side * hr * 0.4, hp.y, hr * 1.25).fill({ color: BLACK, alpha: 0.9 * fade });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 1.2 + 1.9;
    g.poly([
      hp.x - side * hr * 0.2,
      hp.y,
      hp.x - side * (hr * 1.2 + Math.cos(a) * hr * 0.9),
      hp.y + Math.sin(a) * hr * 1.3 - hr * 0.2,
      hp.x - side * hr * 0.3,
      hp.y + hr * 0.4,
    ]).fill({
      color: BLACK,
      alpha: 0.85 * fade,
    });
  }
  g.ellipse(hp.x, hp.y, hr * 1.1, hr * 0.85).fill({ color: BLACK, alpha: fade });
  g.poly([
    hp.x + side * hr * 0.4,
    hp.y - hr * 0.35,
    hp.x + side * hr * 1.9,
    hp.y - hr * 0.2,
    hp.x + side * hr * 1.95,
    hp.y + hr * 0.1,
    hp.x + side * hr * 0.3,
    hp.y + hr * 0.3,
  ]).fill({ color: BLACK, alpha: fade });
  g.poly([
    hp.x + side * hr * 0.3,
    hp.y + hr * 0.25,
    hp.x + side * hr * 1.8,
    hp.y + hr * (0.1 + 0.7 * gape),
    hp.x + side * hr * 1.6,
    hp.y + hr * (0.4 + 0.7 * gape),
    hp.x + side * hr * 0.2,
    hp.y + hr * 0.6,
  ]).fill({
    color: BLACK,
    alpha: fade,
  });
  if (gape > 0.1)
    g.poly([
      hp.x + side * hr * 0.5,
      hp.y + hr * 0.2,
      hp.x + side * hr * 1.7,
      hp.y + hr * 0.12,
      hp.x + side * hr * 1.6,
      hp.y + hr * (0.12 + 0.7 * gape),
      hp.x + side * hr * 0.4,
      hp.y + hr * 0.5,
    ]).fill({
      color: 0x330909,
      alpha: 0.9 * fade,
    });
  for (const k of [-1, 1]) {
    g.moveTo(hp.x - side * hr * 0.2, hp.y - hr * 0.7)
      .quadraticCurveTo(
        hp.x - side * hr * (1 + k * 0.4),
        hp.y - hr * (1.6 + k * 0.2),
        hp.x - side * hr * (2 + k * 0.7),
        hp.y - hr * (1.2 + k * 0.6),
      )
      .stroke({ width: 0.07 * (0.5 + 0.5 * grow), color: BLACK, alpha: fade, cap: 'round' });
    const w = [0, 1, 2, 3, 4].map((i) => ({
      x: hp.x + side * hr * (1.7 - i * 0.55),
      y: hp.y + k * hr * (0.2 + i * 0.25) + Math.sin(t * 5 + i * 0.9 + k) * 0.05,
    }));
    ribbon(g, w, [0.022, 0.018, 0.012, 0.008, 0.003], BLACK, fade);
  }
  g.circle(hp.x + side * hr * 0.55, hp.y - hr * 0.25, hr * 0.17).fill({ color: PALE, alpha: fade });
  g.circle(hp.x + side * hr * 0.55, hp.y - hr * 0.25, hr * 0.4).fill({ color: PALE, alpha: 0.15 * fade });
  for (let i = 0; i < 4; i++) {
    const tx = hp.x + side * hr * (0.9 + i * 0.28);
    g.poly([tx, hp.y + hr * 0.1, tx + 0.015, hp.y + hr * 0.1, tx + 0.008, hp.y + hr * 0.22]).fill({
      color: PALE,
      alpha: fade,
    });
  }
}

/** The cyclone: spiralling ink arms, a dark pool at the heart, rising drops; it caves in at the end and bursts. */
function vortex(f: Graphics, g: Graphics, P: Project, v: Vortex, t: number): void {
  const spec = v.spec;
  if (v.collapsed) {
    const k = clamp01(v.collapseS / COLLAPSE_S);
    const r = spec.collapseRadiusM * ease(k);
    f.circle(v.x, v.y, r).fill({ color: BLACK, alpha: 0.4 * (1 - k) });
    f.circle(v.x, v.y, r).stroke({ width: 0.25 * (1 - k) + 0.03, color: BLACK, alpha: 0.9 * (1 - k) });
    f.circle(v.x, v.y, r * 0.8).stroke({ width: 0.05, color: PALE, alpha: 0.5 * (1 - k) });
    const c = P(v.x, v.y, 0.4);
    splatter(g, c, spec.collapseRadiusM * 0.9, k, v.x * 5, 28);
    return;
  }
  const open = ease(clamp01(v.ageS / 0.35));
  const closing = clamp01((spec.durationS - v.ageS) / 0.5);
  const R = spec.radiusM * open;
  f.circle(v.x, v.y, R).fill({ color: BLACK, alpha: 0.2 * open });
  f.circle(v.x, v.y, R * 0.45).fill({ color: BLACK, alpha: 0.45 * open });
  f.circle(v.x, v.y, R).stroke({ width: 0.05, color: PALE, alpha: 0.25 * open });
  // Spiral arms on the floor, spinning faster toward the centre.
  const arms = 4;
  for (let a = 0; a < arms; a++) {
    const pts: Point[] = [];
    const widths: number[] = [];
    for (let i = 0; i < 18; i++) {
      const u = i / 17;
      const ang = (a / arms) * Math.PI * 2 + t * 3.2 + u * 4.2;
      const rad = R * (1 - u * 0.9);
      pts.push({ x: v.x + Math.cos(ang) * rad, y: v.y + Math.sin(ang) * rad });
      widths.push(0.28 * (1 - u * 0.8) + 0.02);
    }
    ribbon(f, pts, widths, BLACK, 0.75 * open);
    ribbon(
      f,
      pts,
      widths.map((w) => w * 0.18),
      PALE,
      0.28 * open,
    );
  }
  // A rising column of ink above the centre, with flung drops circling it.
  for (let i = 0; i < 4; i++) {
    const h = 0.4 + i * 0.5;
    const c = P(v.x, v.y, h);
    const w = (R * (0.8 - i * 0.15) + Math.sin(t * 4 + i) * 0.1) * open * closing;
    g.ellipse(c.x, c.y, w, w * ISO_T * 1.3).stroke({ width: 0.12 - i * 0.02, color: BLACK, alpha: 0.7 * open });
  }
  for (let i = 0; i < 16; i++) {
    const ang = t * 4 + i * 0.7;
    const rad = R * (0.35 + ((i * 0.37) % 0.6));
    const h = 0.2 + ((t * 0.9 + i * 0.13) % 1) * 2;
    const c = P(v.x + Math.cos(ang) * rad, v.y + Math.sin(ang) * rad, h);
    g.circle(c.x, c.y, 0.035 + (i % 3) * 0.015).fill({ color: BLACK, alpha: 0.85 * open });
  }
}

/** One stroke of the monster's drawing: points in scroll units (u right, v up, both about -1..1) and a brush width. */
interface Stroke {
  readonly pts: readonly (readonly [number, number])[];
  readonly w: number;
}

/**
 * The monster as it is drawn on the scroll, in the order the brush draws it: head, great horns, the muscular torso, arms with claws,
 * legs and the long serpentine tail. Facing right.
 */
const MONSTER_STROKES: readonly Stroke[] = [
  {
    pts: [
      [0.28, 0.62],
      [0.42, 0.74],
      [0.62, 0.74],
      [0.78, 0.66],
      [0.72, 0.56],
      [0.52, 0.5],
      [0.34, 0.5],
      [0.28, 0.62],
    ],
    w: 0.07,
  }, // head
  {
    pts: [
      [0.76, 0.6],
      [0.92, 0.55],
      [0.88, 0.46],
      [0.72, 0.5],
    ],
    w: 0.05,
  }, // jaw
  {
    pts: [
      [0.34, 0.74],
      [0.18, 0.86],
      [0.02, 0.84],
      [-0.08, 0.7],
    ],
    w: 0.06,
  }, // horn
  {
    pts: [
      [0.4, 0.76],
      [0.3, 0.96],
      [0.14, 0.98],
    ],
    w: 0.05,
  }, // horn 2
  {
    pts: [
      [0.3, 0.52],
      [0.18, 0.28],
      [0.1, 0.1],
      [0.14, -0.14],
      [0.26, -0.18],
    ],
    w: 0.09,
  }, // chest and belly
  {
    pts: [
      [0.28, 0.58],
      [0.06, 0.52],
      [-0.12, 0.36],
      [-0.2, 0.1],
      [-0.12, -0.12],
    ],
    w: 0.09,
  }, // back
  {
    pts: [
      [0.2, 0.4],
      [0.4, 0.3],
      [0.56, 0.16],
      [0.7, 0.08],
    ],
    w: 0.08,
  }, // reaching arm
  {
    pts: [
      [0.7, 0.08],
      [0.82, 0.12],
      [0.76, 0.02],
      [0.84, 0.0],
      [0.74, -0.06],
    ],
    w: 0.04,
  }, // claws
  {
    pts: [
      [0.02, 0.36],
      [-0.14, 0.24],
      [-0.18, 0.04],
    ],
    w: 0.07,
  }, // far arm
  {
    pts: [
      [0.26, -0.16],
      [0.34, -0.42],
      [0.3, -0.7],
      [0.38, -0.8],
    ],
    w: 0.08,
  }, // front leg
  {
    pts: [
      [-0.1, -0.12],
      [-0.18, -0.4],
      [-0.1, -0.66],
      [-0.2, -0.8],
    ],
    w: 0.08,
  }, // rear leg
  {
    pts: [
      [-0.12, -0.04],
      [-0.4, -0.1],
      [-0.62, 0.0],
      [-0.8, -0.18],
      [-0.92, -0.04],
    ],
    w: 0.07,
  }, // the long tail
];

/** The scroll: two wooden rollers, cream paper that unrolls, and the monster painted on it stroke by stroke as the brush works. */
function masterpiece(f: Graphics, g: Graphics, P: Project, m: Masterpiece, t: number): void {
  const awakening = m.awakenS > 0;
  const k = awakening ? 1 : clamp01(m.ageS / m.drawS);
  // The arena dims for the ritual, brightens as the monster tears free.
  const dim = awakening ? clamp01(1 - m.awakenS / 1.2) : ease(clamp01(m.ageS / 0.6));
  f.circle(m.x, m.y, 12).fill({ color: BLACK, alpha: 0.3 * dim });
  f.circle(m.x, m.y, 6).fill({ color: BLACK, alpha: 0.2 * dim });
  const base = P(m.x, m.y, 0);
  const unroll = ease(clamp01(m.ageS / 0.8));
  const W = SCROLL_W_M;
  const H = SCROLL_H_M * (awakening ? 1 : unroll);
  const cx = base.x;
  const bottom = base.y - 0.2;
  const top = bottom - H;
  // The scroll hangs in the air; it tears and falls apart when the monster comes out.
  const tear = awakening ? clamp01(m.awakenS / 0.8) : 0;
  const alpha = awakening ? clamp01(1 - m.awakenS / 1.4) : 1;
  g.ellipse(cx, base.y, 0.7, 0.22).fill({ color: BLACK, alpha: 0.3 * alpha });
  for (const [side, off] of [
    [-1, 0],
    [1, 1],
  ] as const) {
    const sx = tear * side * 0.9;
    const sy = tear * tear * 0.8;
    const half = W / 2;
    const x0 = side < 0 ? cx - half : cx;
    const x1 = side < 0 ? cx : cx + half;
    g.poly([x0 + sx, top + sy, x1 + sx, top + sy + tear * 0.15 * off, x1 + sx, bottom + sy, x0 + sx, bottom + sy]).fill(
      { color: PAPER, alpha },
    );
    g.poly([x0 + sx, top + sy, x1 + sx, top + sy, x1 + sx, top + sy + 0.12, x0 + sx, top + sy + 0.12]).fill({
      color: PAPER_SHADE,
      alpha,
    });
  }
  // Brocade border and the two rollers with their knobs.
  g.rect(cx - W / 2 - 0.02, top, 0.05, H).fill({ color: 0x7a1d1d, alpha: alpha * (1 - tear) });
  g.rect(cx + W / 2 - 0.03, top, 0.05, H).fill({ color: 0x7a1d1d, alpha: alpha * (1 - tear) });
  for (const y of [top, bottom]) {
    g.roundRect(cx - W / 2 - 0.12, y - 0.07, W + 0.24, 0.14, 0.05).fill({ color: WOOD, alpha });
    g.circle(cx - W / 2 - 0.16, y, 0.075).fill({ color: 0xb99347, alpha });
    g.circle(cx + W / 2 + 0.16, y, 0.075).fill({ color: 0xb99347, alpha });
  }
  // The painting: strokes appear one by one in order, each drawn out by the brush.
  const total = MONSTER_STROKES.length;
  const progress = k * (total + 0.25);
  const sx = (u: number) => cx + u * (W * 0.46);
  const sy = (v: number) => (top + bottom) / 2 - v * (SCROLL_H_M * 0.44) * (H / SCROLL_H_M);
  let tipAt: Point | null = null;
  for (let i = 0; i < total; i++) {
    const done = clamp01(progress - i);
    if (done <= 0) continue;
    const st = MONSTER_STROKES[i]!;
    const count = Math.max(2, Math.round(st.pts.length * done));
    const pts: Point[] = [];
    for (let j = 0; j < count; j++) pts.push({ x: sx(st.pts[j]![0]), y: sy(st.pts[j]![1]) });
    // A partly drawn stroke ends mid-segment, following the brush.
    if (done < 1 && count < st.pts.length) {
      const a = st.pts[count - 1]!;
      const b = st.pts[count]!;
      const frac = (progress - i) * st.pts.length - (count - 1);
      pts.push({ x: sx(a[0] + (b[0] - a[0]) * clamp01(frac)), y: sy(a[1] + (b[1] - a[1]) * clamp01(frac)) });
    }
    const wid = pts.map((_, j) => st.w * 1.25 * (0.7 + 0.5 * Math.sin((j / Math.max(1, pts.length - 1)) * Math.PI)));
    ribbon(g, pts, wid, BLACK, alpha);
    if (done < 1) tipAt = pts[pts.length - 1]!;
  }
  // The glowing white eye appears with the head and brightens as the drawing completes.
  if (progress > 0.7) {
    const e = { x: sx(0.62), y: sy(0.67) };
    const glow = clamp01((progress - 0.7) / 3) * (awakening ? 1 : 0.5 + 0.5 * Math.sin(t * 6));
    g.circle(e.x, e.y, 0.05).fill({ color: PALE, alpha: (0.3 + 0.7 * glow) * alpha });
    g.circle(e.x, e.y, 0.14).fill({ color: PALE, alpha: 0.2 * glow * alpha });
  }
  // The brush tip: a wet point of ink that follows the stroke, flinging drops.
  if (tipAt && !awakening) {
    g.circle(tipAt.x, tipAt.y, 0.06).fill({ color: PALE, alpha: 0.85 });
    g.circle(tipAt.x, tipAt.y, 0.18).fill({ color: PALE, alpha: 0.15 });
    splatter(g, tipAt, 0.4, (t * 2.4) % 1, tipAt.x * 9, 7);
  }
  // Black ink particles float up round the canvas, and a spray bursts out of it when the monster tears free.
  for (let i = 0; i < 20; i++) {
    const a = i * 1.7 + t * 0.6;
    const h = ((t * 0.5 + i * 0.173) % 1) * 3.4;
    g.circle(cx + Math.cos(a) * (0.9 + (i % 5) * 0.2), bottom - h, 0.025 + (i % 3) * 0.012).fill({
      color: BLACK,
      alpha: 0.7 * dim,
    });
  }
  if (awakening) {
    const kk = clamp01(m.awakenS / 1.2);
    splatter(g, { x: cx, y: (top + bottom) / 2 }, 2.8, kk, 11, 36);
    g.circle(cx, (top + bottom) / 2, 0.8 + 2.4 * ease(kk)).stroke({
      width: 0.2 * (1 - kk) + 0.02,
      color: BLACK,
      alpha: 0.9 * (1 - kk),
    });
  }
}

/** Draw everything Inkmaster has in the ink world this frame. `preyAt` finds where a serpent's target stands. */
export function drawInk(
  f: Graphics,
  g: Graphics,
  P: Project,
  ink: InkWorld,
  t: number,
  preyAt: (id: string | null) => Point | null,
): void {
  for (const v of ink.vortices) vortex(f, g, P, v, t);
  for (const m of ink.masterpieces) masterpiece(f, g, P, m, t);
  for (const s of ink.serpents) serpent(f, g, P, s, t, s.phase === 'wrap' ? preyAt(s.targetId) : null);
  for (const d of ink.dragons) dragon(f, g, P, d, t);
}
