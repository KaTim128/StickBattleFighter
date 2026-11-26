import type { Graphics } from 'pixi.js';
import {
  BULL_BURST_S,
  type Bull,
  COLLAPSE_S,
  type DrawnFigure,
  type InkSlash,
  type InkWorld,
  type Masterpiece,
  type Serpent,
  type Vortex,
} from '../abilities/ink-world';
import { smoothPath } from '../rendering/ink-parts';
import { ISO_T } from '../rendering/projection';

type Point = { x: number; y: number };
type Project = (x: number, y: number, z?: number) => Point;
/** Where a serpent's prey stands, how high its feet are off the floor (a jump), and how far it leans (-1..1, the way it faces). */
/** Where the serpent coiled round a prey is drawn: just behind and just in front of the prey's own figure in the depth sort. */
export interface InkLayers {
  readonly back: Graphics;
  readonly front: Graphics;
}

export interface Prey {
  readonly x: number;
  readonly y: number;
  readonly lift?: number;
  readonly lean?: number;
  /** The target's depth key (its feet y): the coils behind it sort just under it and the coils in front just over it. */
  readonly depth?: number;
}

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
function serpent(
  f: Graphics,
  g: Graphics,
  P: Project,
  s: Serpent,
  t: number,
  preyAt: Prey | null,
  layers: InkLayers | null,
): void {
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
    const q = trail[Math.min(i + 1, trail.length - 1)]!;
    const r = trail[Math.max(i - 1, 0)]!;
    const u = i / (m - 1);
    // A travelling S-wave: sideways to the body's own direction at each point, small at the head and growing toward the tail, so it
    // really slithers (the head weaves, the tail whips) instead of sliding straight.
    const dx = r.x - q.x || Math.cos(s.heading);
    const dy = r.y - q.y || Math.sin(s.heading);
    const dl = Math.hypot(dx, dy) || 1;
    const wave = Math.sin(t * 8 - i * 0.75) * (0.07 + 0.2 * u);
    pts.push(
      P(
        p.x - (dy / dl) * wave,
        p.y + (dx / dl) * wave,
        z + Math.sin(t * 5 + i) * 0.05 + Math.sin(t * 8 - i * 0.75) * 0.03,
      ),
    );
    widths.push(0.34 * (1 - u * 0.8) ** 0.9 + 0.025);
  }
  // Which graphics each piece of the body goes to: normally one; round a prey the coils behind it and the coils in front of it are
  // drawn on either side of the target's own figure, so the snake visibly passes behind it and in front of it.
  const sides: boolean[] | null = s.phase === 'wrap' && preyAt && layers ? [] : null;
  if (s.phase === 'wrap' && preyAt) {
    // Winding round the prey: the body that chased it slides off its path and spirals up the target's own shape (wider at the hips and
    // the shoulders, narrower at the waist), several loops from the shoulder to the ankles, the head ending up at the shoulder. It
    // squeezes in pulses and unwinds before it is released.
    const hold = s.spec.restrainS;
    const wind = ease(clamp01(s.phaseS / 0.6));
    const unwind = ease(clamp01((s.phaseS - (hold - 0.5)) / 0.5));
    const lift = preyAt.lift ?? 0;
    const free = pts.slice();
    const N = 56;
    pts.length = 0;
    widths.length = 0;
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1); // 0 at the head (the shoulder), 1 at the tail (the ankles)
      const z = lift + 1.3 - u * 1.2;
      const body = 0.31 + 0.08 * Math.sin(u * Math.PI * 2 - 0.4) + 0.03 * Math.sin(u * 19); // the torso's own outline, and the coil's slack
      const squeeze = 1 + 0.05 * Math.sin(t * 7 - u * 9);
      // The angle round the body: the head begins on the camera's side; every half turn the body passes behind, then in front again.
      const a = Math.PI / 4 + u * Math.PI * 7.4 + Math.sin(t * 1.3) * 0.12;
      const sway = (preyAt.lean ?? 0) * 0.16 * (1 - u);
      const ox = Math.cos(a) * body * squeeze + sway;
      const oy = Math.sin(a) * body * squeeze;
      const wound = P(preyAt.x + ox, preyAt.y + oy, z);
      const from = free[Math.min(free.length - 1, Math.round(u * (free.length - 1)))]!;
      const w = clamp01(wind * 1.6 - u * 0.6) * (1 - unwind);
      pts.push({ x: from.x + (wound.x - from.x) * w, y: from.y + (wound.y - from.y) * w });
      widths.push(0.28 * (1 - u * 0.35) * (1 - w) + 0.16 * (1 - u * 0.5) * w + 0.02);
      // In front of the body when this stretch is on the camera's side of it (the camera looks along (-1, -1)); not yet wound = in front.
      sides?.push(w < 0.5 || Math.cos(a) + Math.sin(a) > 0);
    }
    // Ink flung off the strike, then a few drops where it squeezes.
    splatter(g, P(preyAt.x, preyAt.y, lift + 0.9), 0.5, clamp01(s.phaseS / 0.5), s.x * 3, s.phaseS < 0.5 ? 14 : 4);
  }
  const body = (target: Graphics, bp: readonly Point[], bw: readonly number[]): void => {
    if (bp.length < 2) return;
    ribbon(
      target,
      bp,
      bw.map((w) => w + 0.04),
      PALE,
      0.28 * fade,
    );
    ribbon(target, bp, bw, BLACK, fade);
    ribbon(
      target,
      bp.map((p) => ({ x: p.x - 0.015, y: p.y - 0.03 })),
      bw.map((w) => w * 0.25),
      INK_LIT,
      0.8 * fade,
    );
    // Texture: an alternating diamond pattern of lighter wash down the back, a pale belly edge on the lower side, banded scale lines,
    // and dry-brush speckle, so it reads as a scaled snake rather than a plain ribbon.
    for (let i = 1; i < bp.length - 1; i++) {
      const p = bp[i]!;
      const q = bp[i - 1]!;
      const l = Math.hypot(p.x - q.x, p.y - q.y) || 1;
      const nx = -(p.y - q.y) / l;
      const ny = (p.x - q.x) / l;
      const w = bw[i]! * 0.5;
      if (i % 2 === 0) {
        target
          .poly([
            p.x + (q.x - p.x) * 0.9,
            p.y + (q.y - p.y) * 0.9,
            p.x + nx * w * 0.55,
            p.y + ny * w * 0.55,
            p.x - (q.x - p.x) * 0.9,
            p.y - (q.y - p.y) * 0.9,
            p.x - nx * w * 0.55,
            p.y - ny * w * 0.55,
          ])
          .fill({ color: INK_LIT, alpha: 0.55 * fade });
      }
      target
        .moveTo(p.x + nx * w * 0.95, p.y + ny * w * 0.95)
        .lineTo(p.x - nx * w * 0.95, p.y - ny * w * 0.95)
        .stroke({ width: 0.007, color: PALE, alpha: 0.22 * fade });
      target.circle(p.x + nx * w * 0.8, p.y + ny * w * 0.8 + 0.01, w * 0.14).fill({ color: PALE, alpha: 0.35 * fade });
    }
  };
  if (sides && layers) {
    // Split the body into runs of the same side; each run shares its end point with the next so the coil stays unbroken.
    let start = 0;
    for (let i = 1; i <= pts.length; i++) {
      if (i < pts.length && sides[i] === sides[start]) continue;
      const end = Math.min(pts.length, i + 1);
      body(sides[start] ? layers.front : layers.back, pts.slice(start, end), widths.slice(start, end));
      start = i;
    }
  } else body(g, pts, widths);
  // The head: a wedge with two whiskers, horns and a white eye; the jaw opens as it strikes.
  const hg = layers && sides ? layers.front : g;
  const head = pts[0]!;
  const next = pts[Math.min(2, pts.length - 1)]!;
  const ang = Math.atan2(head.y - next.y, head.x - next.x);
  const hx = Math.cos(ang);
  const hy = Math.sin(ang);
  const nx = -hy;
  const ny = hx;
  const gape = s.phase === 'hunt' ? 0.5 + 0.5 * Math.sin(t * 6) * 0.3 : 0.9;
  const pt = (a: number, b: number): number[] => [head.x + hx * a + nx * b, head.y + hy * a + ny * b];
  hg.poly([
    ...pt(-0.12, -0.17),
    ...pt(0.22, -0.09 - 0.03 * gape),
    ...pt(0.34, -0.02),
    ...pt(0.22, 0.02),
    ...pt(-0.1, 0.17),
  ]).fill({ color: BLACK, alpha: fade });
  hg.poly([...pt(0.02, 0.06), ...pt(0.3, 0.03 + 0.12 * gape), ...pt(0.2, 0.12 + 0.12 * gape), ...pt(-0.06, 0.15)]).fill(
    {
      color: INK,
      alpha: fade,
    },
  );
  hg.poly([...pt(-0.02, -0.14), ...pt(-0.2, -0.3), ...pt(0.04, -0.17)]).fill({ color: BLACK, alpha: fade });
  hg.circle(head.x + hx * 0.12 + nx * -0.07, head.y + hy * 0.12 + ny * -0.07, 0.03).fill({ color: PALE, alpha: fade });
  // The brow ridge over the eye, a forked tongue flicking out, and fangs when the jaw opens.
  hg.moveTo(...(pt(0.0, -0.1) as [number, number]))
    .lineTo(...(pt(0.2, -0.13) as [number, number]))
    .stroke({ width: 0.02, color: INK_LIT, alpha: fade, cap: 'round' });
  const flick = (Math.sin(t * 11) + 1) / 2;
  const t0 = pt(0.34, -0.01);
  const t1 = pt(0.34 + 0.16 + 0.14 * flick, -0.01);
  hg.moveTo(t0[0]!, t0[1]!).lineTo(t1[0]!, t1[1]!).stroke({ width: 0.012, color: 0xb01c24, alpha: fade, cap: 'round' });
  for (const k of [-1, 1]) {
    const f1 = pt(0.34 + 0.16 + 0.14 * flick, -0.01);
    const f2 = pt(0.34 + 0.24 + 0.14 * flick, -0.01 + k * 0.05);
    hg.moveTo(f1[0]!, f1[1]!)
      .lineTo(f2[0]!, f2[1]!)
      .stroke({ width: 0.01, color: 0xb01c24, alpha: fade, cap: 'round' });
  }
  if (gape > 0.6) {
    for (const o of [0.12, 0.2]) {
      const fa = pt(o, 0.05);
      const fb = pt(o + 0.01, 0.1 + 0.05 * gape);
      hg.moveTo(fa[0]!, fa[1]!).lineTo(fb[0]!, fb[1]!).stroke({ width: 0.012, color: PALE, alpha: fade, cap: 'round' });
    }
  }
  for (const k of [-1, 1]) {
    const wp = [0, 1, 2, 3].map((i) => ({
      x: head.x + hx * (0.2 - i * 0.12) + nx * k * (0.06 + i * 0.07) + Math.sin(t * 6 + i) * 0.02,
      y: head.y + hy * (0.2 - i * 0.12) + ny * k * (0.06 + i * 0.07) + Math.cos(t * 6 + i) * 0.02,
    }));
    ribbon(hg, wp, [0.022, 0.018, 0.012, 0.004], BLACK, fade);
  }
}

/** A repeatable pseudo-random number in 0..1. */
function noise(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

type Local = readonly [number, number, number?]; // forward, height, side (metres, in the bull's own frame)

/**
 * The Ink Bull, painted the way a Chinese ink brush would: a big, bulky black body with a high shoulder hump, thick neck, broad
 * lowered head with long curved horns, and four heavy legs. Edges are rough and uneven, the ink is denser in places (dry-brush
 * streaks and washes), and ink splashes and ground dust follow it. Its eyes are small, sharp, curved triangular slits with no
 * pupils. It rises out of a burst of ink on the ground, lowers its head and paws the earth, gallops leaning into its turns, drives its
 * horns in on a hit, and scatters into ink when it is done.
 */
/** How big the Ink Bull is drawn, relative to its first design. */
const BULL_SCALE = 0.84;

function bull(f: Graphics, g: Graphics, P: Project, b: Bull, t: number): void {
  const spec = b.spec;
  const hx = Math.cos(b.heading);
  const hy = Math.sin(b.heading);
  // How much of the bull there is: it wells up out of its pool, and dissolves at the end.
  const rise = b.phase === 'form' ? ease(clamp01(b.phaseS / spec.formS)) : 1;
  const fadeOut =
    b.phase === 'fade' ? clamp01(b.phaseS / 0.6) : b.phase === 'ram' ? ease(clamp01((b.phaseS - 0.15) / 0.4)) : 0;
  const alpha = Math.min(1, 0.15 + rise) * (1 - fadeOut);
  const sink = (1 - rise) * 1.1;
  // A little smaller than first drawn (still heavy and bulky): everything is placed through this scale.
  const S = BULL_SCALE;
  // The gallop's rhythm: the whole body bobs and pitches with each stride, the head and neck dipping a beat behind.
  const running = b.phase === 'charge' || b.phase === 'slow' || b.phase === 'ram';
  const stride = running ? b.gait * 2 : 0;
  const bob = running && b.speed > 0.6 ? Math.sin(stride) * 0.055 : 0;
  const pitch = running && b.speed > 0.6 ? Math.sin(stride + 0.9) * 0.05 : 0;
  const L = (fw0: number, z0: number, side0 = 0): Point => {
    const fw = fw0 * S;
    const z = (z0 + bob + pitch * fw0) * S;
    // Turning bends the whole spine: the shoulders lean into the corner while the haunch swings the other way.
    const lean = b.lean * 0.28 * z - b.lean * 0.12 * fw;
    const side = side0 * S + lean;
    return P(b.x + hx * fw - hy * side, b.y + hy * fw + hx * side, Math.max(0, z - sink));
  };
  const rough = (i: number, k = 0.045): number => (noise(i * 7.31 + b.ageS * 0.0) - 0.5) * k;
  /** A closed, smoothed, slightly ragged blob through local control points. */
  const blob = (ctrl: readonly Local[], seed: number, colour: number, a = alpha, raggedness = 0.02): void => {
    if (a <= 0.01) return;
    const pts = ctrl.map((c, i) => {
      const p = L(c[0] + rough(seed + i, raggedness), c[1] + rough(seed + i + 40, raggedness), c[2] ?? 0);
      return p;
    });
    const { pts: sm } = smoothPath([...pts, pts[0]!, pts[1]!, pts[2]!], new Array(pts.length + 3).fill(0.1), 6);
    g.poly(sm.flatMap((p) => [p.x, p.y])).fill({ color: colour, alpha: a });
  };
  const stroke = (ctrl: readonly Local[], widths: readonly number[], colour: number, a = alpha): void => {
    if (a <= 0.01) return;
    ribbon(
      g,
      ctrl.map((c) => L(c[0], c[1], c[2] ?? 0)),
      widths.map((w) => w * S),
      colour,
      a,
    );
  };
  const phase = b.phase;
  const pawing = phase === 'paw';
  const charging = phase === 'charge' || phase === 'slow' || phase === 'ram';
  const headLow = pawing || charging ? 1 : phase === 'form' ? 0.4 : 0;
  const heave = pawing ? Math.sin(t * 9) * 0.03 : charging ? Math.sin(b.gait * 2) * 0.05 : Math.sin(t * 2) * 0.015;

  // The burst of ink it rises from: an irregular black pool spreading over the ground, with radial streaks and flung drops.
  const burstK = b.phase === 'form' ? ease(clamp01(b.phaseS / (spec.formS * 0.8))) : 1;
  const poolA =
    (b.phase === 'form' ? 0.95 : b.phase === 'paw' ? 0.85 : 0.55 * (1 - fadeOut)) *
    (b.phase === 'fade' ? 1 - fadeOut : 1);
  if (poolA > 0.02) {
    const R = 2.6 * S * burstK;
    const ring: Point[] = [];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const r = R * (0.72 + noise(i * 3.7) * 0.32) * (0.9 + 0.1 * Math.sin(t * 2 + i));
      ring.push(P(b.home.x + Math.cos(a) * r, b.home.y + Math.sin(a) * r, 0.02));
    }
    const round = smoothPath([...ring, ring[0]!, ring[1]!], new Array(ring.length + 2).fill(0.1), 4).pts;
    f.poly(round.flatMap((p) => [p.x, p.y])).fill({ color: BLACK, alpha: poolA * 0.35 });
    g.poly(round.flatMap((p) => [p.x, p.y])).fill({ color: BLACK, alpha: poolA * 0.8 });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + noise(i) * 0.5;
      const r0 = R * 0.5;
      const r1 = R * (1.05 + noise(i * 2.3) * 0.5) * (b.phase === 'form' ? 1 : 0.9);
      ribbon(
        g,
        [
          P(b.home.x + Math.cos(a) * r0, b.home.y + Math.sin(a) * r0, 0.03),
          P(b.home.x + Math.cos(a + 0.1) * (r0 + r1) * 0.5, b.home.y + Math.sin(a + 0.1) * (r0 + r1) * 0.5, 0.03),
          P(b.home.x + Math.cos(a) * r1, b.home.y + Math.sin(a) * r1, 0.03),
        ],
        [0.12, 0.08, 0.01],
        BLACK,
        poolA * 0.85,
      );
    }
    if (b.phase === 'form') splatter(g, P(b.home.x, b.home.y, 0.9), 1.8, burstK, 3.3, 22);
  }
  // Ground dust and ink kicked up behind a galloping bull.
  if (charging && b.speed > 1) {
    for (let i = 0; i < Math.min(10, b.trail.length); i += 1) {
      const p = b.trail[Math.min(b.trail.length - 1, i * 2)]!;
      const k = i / 10;
      const q = P(p.x + (noise(i * 5.1) - 0.5) * 0.7, p.y + (noise(i * 2.9) - 0.5) * 0.7, 0.1 + k * 0.5);
      g.circle(q.x, q.y, 0.1 + k * 0.28).fill({ color: i % 3 === 0 ? BLACK : 0x7a6f62, alpha: 0.35 * (1 - k) * alpha });
    }
  }
  // The shadow.
  const sh = P(b.x, b.y, 0);
  f.ellipse(sh.x, sh.y, 1.1 * S, 0.4 * S).fill({ color: BLACK, alpha: 0.3 * alpha });

  // Legs: a gallop cycle while charging, a scraping front hoof while it paws, still otherwise.
  const hips: ReadonlyArray<{ fw: number; side: number; front: boolean; offs: number }> = [
    { fw: 0.8, side: -0.13, front: true, offs: 0 },
    { fw: -0.8, side: -0.13, front: false, offs: Math.PI * 0.7 },
    { fw: 0.8, side: 0.13, front: true, offs: 0.35 },
    { fw: -0.8, side: 0.13, front: false, offs: Math.PI * 0.7 + 0.35 },
  ];
  const leg = (h: (typeof hips)[number], near: boolean): void => {
    const hipZ = 1.2 + heave; // the leg starts well inside the body, so it is always joined to it
    let foot: [number, number];
    let kneeBend = h.front ? 0.14 : -0.16;
    if (pawing && h.front && near) {
      // One front hoof drags back across the ground, again and again, lifting on the return.
      const s = (t * 3.2) % 1;
      const back = s < 0.5 ? -0.55 * (s / 0.5) : -0.55 * (1 - (s - 0.5) / 0.5);
      foot = [h.fw + 0.35 + back, s < 0.5 ? 0.04 : 0.28 * Math.sin(((s - 0.5) / 0.5) * Math.PI)];
      kneeBend = 0.28;
    } else if (charging && b.speed > 0.6) {
      const ph = b.gait + h.offs;
      // The planted foot slides back steadily, then the leg swings forward quickly and lifts in a smooth arc (not a plain sine).
      const c = (((ph / (Math.PI * 2)) % 1) + 1) % 1;
      const reach = c < 0.6 ? 0.6 - (c / 0.6) * 1.2 : -0.6 + ease((c - 0.6) / 0.4) * 1.2;
      const lift = c < 0.6 ? 0 : Math.sin(((c - 0.6) / 0.4) * Math.PI) * 0.5;
      foot = [h.fw + reach, lift];
    } else foot = [h.fw + (h.front ? 0.05 : -0.05), 0];
    const hip: Local = [h.fw, hipZ, h.side];
    const knee: Local = [(h.fw + foot[0]) / 2 + kneeBend, (hipZ + foot[1]) / 2 - 0.05, h.side];
    const hoof: Local = [foot[0], foot[1], h.side];
    // A thigh/shoulder mass where the leg joins, so no gap can show between the leg and the body.
    const top = L(h.fw, hipZ - 0.15, h.side);
    g.ellipse(top.x, top.y, 0.3 * S, 0.26 * S).fill({ color: near ? BLACK : INK, alpha });
    stroke([hip, knee, hoof], [0.5, 0.3, 0.2], near ? BLACK : INK, alpha * (near ? 1 : 0.85));
    // The hoof: a small cloven wedge.
    const hp = L(foot[0], foot[1], h.side);
    g.poly([
      hp.x - 0.09 * S,
      hp.y + 0.02,
      hp.x + 0.1 * S,
      hp.y + 0.02,
      hp.x + 0.07 * S,
      hp.y - 0.07 * S,
      hp.x - 0.06 * S,
      hp.y - 0.07 * S,
    ]).fill({
      color: BLACK,
      alpha,
    });
  };
  for (const h of hips) if (h.side < 0) leg(h, false);

  // The far horn and the tail sit behind the body.
  const headF = 1.3 + 0.05 * headLow;
  const headZ = 1.55 - 0.7 * headLow + heave;
  const horn = (side: number, a: number): void => {
    // Each horn grows out of a thick root buried inside the skull (so it can never float free of the head), sweeps out and up, then
    // curves forward to a fine point, with a pale ridge of light along its upper edge and growth rings across it.
    const rf = headF + 0.1;
    const rz = headZ + 0.3;
    const pts: Local[] = [
      [rf - 0.08, rz - 0.1, side * 0.06],
      [rf + 0.1, rz + 0.04, side * 0.28],
      [rf + 0.36, rz + 0.06 + 0.04 * headLow, side * 0.5],
      [rf + 0.66, rz + 0.2 + 0.12 * headLow, side * 0.52],
      [rf + 0.9, rz + 0.46 + 0.24 * headLow, side * 0.4],
    ];
    const w = [0.36, 0.32, 0.22, 0.12, 0.02];
    stroke(pts, w, BLACK, a);
    stroke(
      pts.map((p) => [p[0], p[1] + 0.045, p[2]] as Local),
      w.map((x) => x * 0.18),
      PALE,
      a * 0.6,
    );
    for (let i = 1; i < 4; i++) {
      const p = pts[i]!;
      const ring = [L(p[0] - 0.02, p[1] + w[i]! * 0.5, p[2] ?? 0), L(p[0] + 0.02, p[1] - w[i]! * 0.5, p[2] ?? 0)];
      g.moveTo(ring[0]!.x, ring[0]!.y)
        .lineTo(ring[1]!.x, ring[1]!.y)
        .stroke({ width: 0.012, color: INK_LIT, alpha: 0.7 * a });
    }
    // The root boss: a swelling of horn where it meets the head.
    const root = L(rf, rz - 0.02, side * 0.12);
    g.ellipse(root.x, root.y, 0.17 * S, 0.14 * S).fill({ color: BLACK, alpha: a });
    g.ellipse(root.x - 0.02, root.y - 0.03, 0.09 * S, 0.06 * S).fill({ color: INK_LIT, alpha: 0.55 * a });
  };
  horn(-1, alpha * 0.8);
  const tailSwing = Math.sin(t * 3 + b.gait) * 0.22 * (charging ? 1.5 : 1);
  stroke(
    [
      [-1.1, 1.2 + heave],
      [-1.45, 1.1, tailSwing * 0.4],
      [-1.7, 0.7, tailSwing],
      [-1.75, 0.3, tailSwing * 1.3],
    ],
    [0.14, 0.1, 0.07, 0.01],
    BLACK,
  );
  // The tuft at the tail's end: a wet brush flick.
  const tip = L(-1.75, 0.3, tailSwing * 1.3);
  g.poly([tip.x, tip.y, tip.x - 0.08, tip.y + 0.2, tip.x + 0.04, tip.y + 0.26, tip.x + 0.1, tip.y + 0.12]).fill({
    color: BLACK,
    alpha,
  });

  // The body: a deep chest, the high hump over the shoulders, a heavy neck, a tapering haunch.
  blob(
    [
      [-1.25, 1.1 + heave],
      [-0.9, 1.45 + heave],
      [-0.2, 1.5 + heave],
      [0.45, 1.78 + heave],
      [0.95, 1.62 + heave * 0.5],
      [1.3, 1.3 - 0.35 * headLow],
      [1.25, 0.8 - 0.25 * headLow],
      [0.9, 0.62],
      [0.2, 0.62],
      [-0.5, 0.68],
      [-1.1, 0.75],
      [-1.32, 0.95],
    ],
    1,
    BLACK,
    alpha,
    0.06,
  );
  // Uneven density: washes of lighter ink in patches, dry-brush streaks along the flanks, and a pale rim over the hump.
  for (let i = 0; i < 6; i++) {
    const c = L(-0.9 + noise(i * 3.1) * 2.1, 0.8 + noise(i * 1.7) * 0.7);
    g.ellipse(c.x, c.y, 0.2 + noise(i) * 0.2, 0.1 + noise(i * 2) * 0.1).fill({ color: INK_LIT, alpha: 0.28 * alpha });
  }
  for (let i = 0; i < 7; i++) {
    const z = 0.78 + i * 0.13 + heave;
    const f0 = -1.0 + noise(i * 4.3) * 0.5;
    stroke(
      [
        [f0, z],
        [f0 + 0.6, z + 0.05 + noise(i) * 0.05],
        [f0 + 1.3, z - 0.03],
        [f0 + 1.9, z + 0.02],
      ],
      [0.015, 0.035, 0.03, 0.005],
      INK_LIT,
      (0.4 + noise(i * 9) * 0.35) * alpha,
    );
  }
  stroke(
    [
      [-1.0, 1.5 + heave],
      [-0.2, 1.57 + heave],
      [0.45, 1.82 + heave],
      [1.0, 1.65 + heave * 0.5],
    ],
    [0.02, 0.04, 0.04, 0.012],
    PALE,
    0.3 * alpha,
  );
  // Heavy shoulder muscle: a swirling brush stroke over the near shoulder and another over the haunch.
  for (const [cf, cz, r] of [
    [0.5, 1.15, 0.38],
    [-0.8, 1.05, 0.34],
  ] as const) {
    stroke(
      [0, 1, 2, 3, 4, 5].map(
        (i) =>
          [
            cf + Math.cos(i * 1.0 + 0.5) * r * (1 - i * 0.12),
            cz + Math.sin(i * 1.0 + 0.5) * r * (1 - i * 0.12),
            0.3,
          ] as Local,
      ),
      [0.07, 0.065, 0.05, 0.035, 0.02, 0.006],
      INK_LIT,
      0.6 * alpha,
    );
  }

  for (const h of hips) if (h.side > 0) leg(h, true);

  // The head: broad and heavy, the forehead lowered, a short blunt muzzle, the jaw set.
  blob(
    [
      [headF - 0.2, headZ + 0.5],
      [headF + 0.15, headZ + 0.52],
      [headF + 0.5, headZ + 0.3],
      [headF + 0.72, headZ + 0.0],
      [headF + 0.68, headZ - 0.28],
      [headF + 0.3, headZ - 0.36],
      [headF - 0.1, headZ - 0.22],
      [headF - 0.28, headZ + 0.1],
    ],
    60,
    BLACK,
    alpha,
    0.035,
  );
  stroke(
    [
      [headF - 0.1, headZ + 0.48],
      [headF + 0.3, headZ + 0.42],
      [headF + 0.6, headZ + 0.14],
    ],
    [0.02, 0.035, 0.01],
    INK_LIT,
    0.7 * alpha,
  );
  // The heavy brow: a thick ridge across the top of the skull that both horns grow from, so the pair is one joined piece with the head.
  stroke(
    [
      [headF + 0.04, headZ + 0.28, -0.3],
      [headF + 0.1, headZ + 0.34, 0],
      [headF + 0.04, headZ + 0.28, 0.3],
    ],
    [0.2, 0.26, 0.2],
    BLACK,
    alpha,
  );
  // Short ears under the horns, and a coarse mane of jagged brush tufts down the neck and over the hump.
  for (const sd of [-1, 1]) {
    const e = L(headF - 0.12, headZ + 0.36, sd * 0.3);
    g.poly([e.x, e.y, e.x - 0.1 * S, e.y - 0.2 * S, e.x + 0.07 * S, e.y - 0.05 * S]).fill({ color: BLACK, alpha });
  }
  for (let i = 0; i < 9; i++) {
    const u = i / 8;
    const bf = 1.15 - u * 1.05;
    const bz = 1.52 + 0.26 * Math.sin(u * Math.PI * 0.9) + heave * 0.6 - 0.3 * headLow * (1 - u);
    const tuft = L(bf, bz);
    const flick = 0.11 + noise(i * 2.2) * 0.1 + (charging ? 0.07 : 0);
    g.poly([
      tuft.x - 0.05 * S,
      tuft.y + 0.04,
      tuft.x - (0.06 + flick) * S,
      tuft.y - flick * S,
      tuft.x + 0.05 * S,
      tuft.y,
    ]).fill({ color: BLACK, alpha });
  }
  // The nostril and a steaming snort while it readies itself.
  const nose = L(headF + 0.66, headZ - 0.1);
  g.ellipse(nose.x, nose.y, 0.03, 0.02).fill({ color: INK_LIT, alpha });
  if (pawing || phase === 'form') {
    for (let i = 0; i < 4; i++) {
      const k = (t * 1.3 + i * 0.25) % 1;
      const sp = L(headF + 0.7 + k * 0.5, headZ - 0.1 + k * 0.3 + noise(i) * 0.1);
      g.circle(sp.x, sp.y, 0.05 + k * 0.14).fill({ color: 0x3a3a46, alpha: 0.4 * (1 - k) * alpha });
    }
  }
  // The eye: a small, sharp, curved triangular slit with no pupil, slanted down toward the nose so the brow reads as angry. A thin
  // ink brow stroke presses over it.
  const e0 = L(headF + 0.5, headZ + 0.12, 0.02);
  const e1 = L(headF + 0.22, headZ + 0.24, 0.02);
  const e2 = L(headF + 0.28, headZ + 0.08, 0.02);
  const e3 = L(headF + 0.36, headZ + 0.1, 0.02);
  g.poly([e0.x, e0.y, e3.x, e3.y - 0.015, e2.x, e2.y, e1.x, e1.y]).fill({ color: 0xeaf3ff, alpha });
  g.moveTo(e1.x - 0.02, e1.y - 0.04)
    .lineTo(e0.x + 0.03, e0.y + 0.02)
    .stroke({ width: 0.03, color: BLACK, alpha, cap: 'round' });
  horn(1, alpha);

  // Ink flecks thrown off it and, when it is dissolving, a scatter of drops.
  splatter(g, L(0, 1.0), 1.4, (t * 0.6) % 1, b.x * 3.1, charging ? 8 : 4);
  if (fadeOut > 0.02) splatter(g, L(0, 1.0), 2.6, fadeOut, b.x * 5.3 + b.y, 24);
  // The ram: the horns bursting into a great splash of ink where they landed.
  if (b.phase === 'ram' && b.burstAt) {
    const k = clamp01(b.phaseS / BULL_BURST_S);
    const c = P(b.burstAt.x, b.burstAt.y, 0.9);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + noise(i) * 0.4;
      const r1 = (0.5 + noise(i * 3) * 0.9) * ease(k) * 1.8;
      ribbon(
        g,
        [
          { x: c.x + Math.cos(a) * 0.1, y: c.y + Math.sin(a) * 0.1 * ISO_T * 1.4 },
          { x: c.x + Math.cos(a) * r1 * 0.6, y: c.y + Math.sin(a) * r1 * 0.6 * ISO_T * 1.4 },
          { x: c.x + Math.cos(a) * r1, y: c.y + Math.sin(a) * r1 * ISO_T * 1.4 },
        ],
        [0.1, 0.07, 0.012],
        BLACK,
        0.9 * (1 - k),
      );
    }
    splatter(g, c, 2.2, k, 7.7, 26);
  }
}

/** The cyclone: spiralling ink arms, a dark pool at the heart, rising drops; it caves in at the end and bursts. */
function vortex(f: Graphics, g: Graphics, P: Project, v: Vortex, t: number): void {
  const spec = v.spec;
  // Inkmaster's cyclone was black ink; Psion's gravity vortex is the same swirl in deep violet with a pale lilac rim.
  const psy = v.def.vfx === 'gravity-vortex';
  const dark = psy ? 0x1a0b30 : BLACK;
  const rim = psy ? 0xc7a1ff : PALE;
  if (v.collapsed) {
    const k = clamp01(v.collapseS / COLLAPSE_S);
    const r = spec.collapseRadiusM * ease(k);
    f.circle(v.x, v.y, r).fill({ color: dark, alpha: 0.4 * (1 - k) });
    f.circle(v.x, v.y, r).stroke({ width: 0.25 * (1 - k) + 0.03, color: dark, alpha: 0.9 * (1 - k) });
    f.circle(v.x, v.y, r * 0.8).stroke({ width: 0.05, color: rim, alpha: 0.5 * (1 - k) });
    const c = P(v.x, v.y, 0.4);
    splatter(g, c, spec.collapseRadiusM * 0.9, k, v.x * 5, 28);
    return;
  }
  const open = ease(clamp01(v.ageS / 0.35));
  const closing = clamp01((spec.durationS - v.ageS) / 0.5);
  const R = spec.radiusM * open;
  f.circle(v.x, v.y, R).fill({ color: dark, alpha: 0.2 * open });
  f.circle(v.x, v.y, R * 0.45).fill({ color: dark, alpha: 0.45 * open });
  f.circle(v.x, v.y, R).stroke({ width: 0.05, color: rim, alpha: 0.25 * open });
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
    ribbon(f, pts, widths, dark, 0.75 * open);
    ribbon(
      f,
      pts,
      widths.map((w) => w * 0.18),
      rim,
      0.28 * open,
    );
  }
  // A rising column of ink above the centre, with flung drops circling it.
  for (let i = 0; i < 4; i++) {
    const h = 0.4 + i * 0.5;
    const c = P(v.x, v.y, h);
    const w = (R * (0.8 - i * 0.15) + Math.sin(t * 4 + i) * 0.1) * open * closing;
    g.ellipse(c.x, c.y, w, w * ISO_T * 1.3).stroke({ width: 0.12 - i * 0.02, color: dark, alpha: 0.7 * open });
  }
  for (let i = 0; i < 16; i++) {
    const ang = t * 4 + i * 0.7;
    const rad = R * (0.35 + ((i * 0.37) % 0.6));
    const h = 0.2 + ((t * 0.9 + i * 0.13) % 1) * 2;
    const c = P(v.x + Math.cos(ang) * rad, v.y + Math.sin(ang) * rad, h);
    g.circle(c.x, c.y, 0.035 + (i % 3) * 0.015).fill({ color: dark, alpha: 0.85 * open });
  }
}

/**
 * Ink Slash: one fast calligraphy brush swipe. The stroke is thin where the brush lands, swells to a heavy belly, then tapers and
 * breaks into dry-brush bristle streaks at the tail, with a bright wet leading tip and flicked drops.
 */
function inkSlash(g: Graphics, P: Project, sl: InkSlash): void {
  const k = clamp01(sl.ageS / 0.4);
  const ang = Math.atan2(sl.dirY, sl.dirX);
  const sweep = ease(Math.min(1, k * 3.2));
  // Three cuts: across one way, back the other way, then a wider, heavier finishing sweep.
  const flip = sl.index === 1 ? -1 : 1;
  const a0 = ang - 1.15 * flip - (sl.index === 2 ? 0.1 : 0);
  const span = (sl.index === 2 ? 2.6 : 2.3) * flip;
  const reachMul = sl.index === 2 ? 1.12 : 1;
  const heavy = sl.index === 2 ? 1.3 : 1;
  const head = a0 + span * sweep;
  const n = 18;
  const fade = 1 - ease(clamp01((k - 0.35) / 0.65));
  const stroke = (rOff: number, lift: number, wMul: number, from: number): { pts: Point[]; widths: number[] } => {
    const pts: Point[] = [];
    const widths: number[] = [];
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const a = a0 + (head - a0) * u;
      const r = sl.reachM * reachMul * (0.8 + 0.2 * Math.sin(u * Math.PI)) + rOff;
      pts.push(P(sl.x + Math.cos(a) * r, sl.y + Math.sin(a) * r, 1.0 + lift + 0.12 * Math.sin(u * Math.PI)));
      // thin entry, heavy belly in the first half, long tapering tail towards the head of the swing
      const body = Math.sin(Math.min(1, u * 1.15) * Math.PI) ** 0.8;
      widths.push((0.03 + 0.3 * body) * heavy * wMul * (u < from ? 0 : 1));
    }
    return { pts, widths };
  };
  const main = stroke(0, 0, 1, 0);
  ribbon(
    g,
    main.pts,
    main.widths.map((w) => w + 0.05),
    PALE,
    0.45 * fade,
  );
  ribbon(g, main.pts, main.widths, BLACK, fade);
  // dry-brush bristle streaks trailing off the heavy part of the stroke
  for (let j = 0; j < 4; j++) {
    const s2 = stroke((j - 1.5) * 0.11, 0.02 * j, 0.16, 0.12 + j * 0.05);
    ribbon(g, s2.pts, s2.widths, BLACK, 0.85 * fade);
  }
  const glint = stroke(0.02, 0.05, 0.1, 0.3);
  ribbon(g, glint.pts, glint.widths, PALE, 0.65 * fade);
  // wet bright tip where the brush is now, and the drops flicked off it
  const tip = main.pts[main.pts.length - 1]!;
  if (sweep < 1) g.circle(tip.x, tip.y, 0.09).fill({ color: PALE, alpha: 0.8 });
  splatter(g, tip, 1.0, k, sl.x * 13, 14);
}

/** A stick figure brushed onto the floor in quick strokes: head, body, arms, then legs, with an ink pool spreading beneath it. */
function drawnFigure(f: Graphics, g: Graphics, P: Project, fig: DrawnFigure, t: number): void {
  const total = fig.spec.drawS ?? 0.5;
  const k = clamp01(fig.ageS / total);
  f.ellipse(fig.x, fig.y, 0.95 * ease(k), 0.95 * ease(k) * 0.9).fill({ color: BLACK, alpha: 0.55 });
  const strokes: Point[][] = [
    // head (a loop), body, both arms in one stroke, then the legs
    Array.from({ length: 9 }, (_, i) => ({
      x: Math.cos((i / 8) * Math.PI * 2) * 0.16,
      y: 1.3 + Math.sin((i / 8) * Math.PI * 2) * 0.16,
    })),
    [
      { x: 0, y: 1.12 },
      { x: 0, y: 0.58 },
    ],
    [
      { x: -0.36, y: 0.78 },
      { x: 0, y: 0.96 },
      { x: 0.36, y: 0.78 },
    ],
    [
      { x: -0.2, y: 0 },
      { x: 0, y: 0.58 },
      { x: 0.2, y: 0 },
    ],
  ];
  const progress = k * strokes.length;
  let tip: Point | null = null;
  strokes.forEach((st, i) => {
    const done = clamp01(progress - i);
    if (done <= 0) return;
    const count = Math.max(2, Math.ceil(st.length * done));
    const pts = st.slice(0, count).map((p) => P(fig.x + p.x, fig.y, p.y));
    ribbon(
      g,
      pts,
      pts.map(() => 0.075),
      BLACK,
    );
    ribbon(
      g,
      pts,
      pts.map(() => 0.02),
      PALE,
      0.5,
    );
    if (done < 1) tip = pts[pts.length - 1]!;
  });
  if (tip) {
    const p: Point = tip;
    g.circle(p.x, p.y, 0.06).fill({ color: PALE, alpha: 0.9 });
    splatter(g, p, 0.3, (t * 3) % 1, p.x * 7, 5);
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
  // The artist's brush and the scroll are joined by a thin stream of ink while he works: the drawing really comes from his hand.
  if (tipAt && !awakening) {
    const hand = P(m.cx, m.cy, 1.5);
    const mid = { x: (hand.x + tipAt.x) / 2, y: Math.min(hand.y, tipAt.y) - 0.5 };
    g.moveTo(hand.x, hand.y)
      .quadraticCurveTo(mid.x, mid.y, tipAt.x, tipAt.y)
      .stroke({ width: 0.05, color: BLACK, alpha: 0.85 * dim, cap: 'round' });
    g.moveTo(hand.x, hand.y)
      .quadraticCurveTo(mid.x, mid.y, tipAt.x, tipAt.y)
      .stroke({ width: 0.012, color: PALE, alpha: 0.4 * dim, cap: 'round' });
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
  preyAt: (id: string | null) => Prey | null,
  layers: InkLayers | null = null,
): void {
  for (const sl of ink.slashes) inkSlash(g, P, sl);
  for (const fig of ink.figures) drawnFigure(f, g, P, fig, t);
  for (const v of ink.vortices) vortex(f, g, P, v, t);
  for (const m of ink.masterpieces) masterpiece(f, g, P, m, t);
  for (const s of ink.serpents) {
    const prey = s.phase === 'wrap' ? preyAt(s.targetId) : null;
    serpent(f, g, P, s, t, prey, prey ? layers : null);
    if (prey && layers && prey.depth !== undefined) {
      layers.back.zIndex = prey.depth - 0.02;
      layers.front.zIndex = prey.depth + 0.02;
    }
  }
  for (const b of ink.bulls) bull(f, g, P, b, t);
}
