import type { Graphics } from 'pixi.js';
import {
  COLLAPSE_S,
  DRAGON_BURST_S,
  DRAGON_HEIGHT_M,
  DRAGON_LUNGE_END_HEIGHT_M,
  DRAGON_TRAIL_M,
  type Dragon,
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
const WHITE_EYE_GLOW = 0xffffff;
/** The dragon's warning lane on the floor: a warm red wash with a bright edge, easy to read against any floor. */
const WARN = 0xff4a2a;
const WARN_DEEP = 0xb01808;
const WARN_EDGE = 0xffb08a;
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

/** The dragon: a horned, whiskered head with a maned neck, trailing a long ribbon of black ink behind it. */
function dragon(f: Graphics, g: Graphics, P: Project, d: Dragon, t: number): void {
  const spec = d.spec;
  const fade = d.phase === 'fade' ? clamp01(1 - d.phaseS / 0.6) : 1;
  const grow = d.phase === 'form' ? ease(clamp01(d.phaseS / spec.formS)) : 1;
  const hover =
    d.phase === 'form'
      ? 0.8 + (DRAGON_HEIGHT_M - 0.8) * grow
      : DRAGON_HEIGHT_M + Math.sin(t * 2.2) * 0.12 * (d.phase === 'fly' ? 1 : 0.3);
  const lunging = d.phase === 'lunge';
  const bursting = d.phase === 'burst';
  const lungeK = lunging ? clamp01(d.phaseS / 0.45) : bursting ? 1 : 0;
  // Jaws open as it rears, then gape wide for the bite.
  const rear = d.phase === 'rear' ? Math.min(1, d.phaseS / 0.35) : lunging || bursting ? 1 : 0;
  const gape =
    d.phase === 'rear' ? 0.45 + 0.4 * rear : lunging ? 1.25 : bursting ? 1.25 * (1 - clamp01(d.phaseS / 0.2)) : 0;
  // Shadow, the warning lane and the streak of ink the lunge leaves on the floor.
  f.ellipse(d.x, d.y, 1.0 * grow, 0.4 * grow).fill({ color: BLACK, alpha: 0.2 * fade });
  if (d.phase === 'rear' || lunging) {
    const a = d.lungeFrom;
    const b = { x: a.x + d.lungeDir.x * d.lungeReachM, y: a.y + d.lungeDir.y * d.lungeReachM };
    if (d.phase === 'rear') {
      const k = clamp01(d.phaseS / spec.windupS);
      // A clear warning: a red lane on the floor, brightening and flashing as the lunge nears.
      const flash = 0.5 + 0.5 * Math.sin(t * (10 + 16 * k));
      f.moveTo(a.x, a.y)
        .lineTo(b.x, b.y)
        .stroke({ width: spec.biteWidthM, color: WARN, alpha: 0.24 + 0.2 * flash });
      f.moveTo(a.x, a.y)
        .lineTo(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k)
        .stroke({ width: spec.biteWidthM * 0.7, color: WARN_DEEP, alpha: 0.3 + 0.3 * k });
      for (const sgn of [-1, 1]) {
        const nx = -d.lungeDir.y * (spec.biteWidthM / 2) * sgn;
        const ny = d.lungeDir.x * (spec.biteWidthM / 2) * sgn;
        f.moveTo(a.x + nx, a.y + ny)
          .lineTo(b.x + nx, b.y + ny)
          .stroke({ width: 0.08, color: WARN_EDGE, alpha: 0.75 + 0.25 * flash });
      }
    } else {
      f.moveTo(a.x, a.y)
        .lineTo(d.x, d.y)
        .stroke({ width: spec.biteWidthM * 0.8, color: BLACK, alpha: 0.35 });
    }
  }
  if (bursting && d.burstAt) {
    // The bite lands: the dragon bursts into a black splash of ink that flings drops outward and then thins away.
    const k = clamp01(d.phaseS / DRAGON_BURST_S);
    const c = d.burstAt;
    for (let i = 0; i < 9; i++) {
      const ang = i * 0.7 + 0.4;
      const dist = (0.5 + (i % 3) * 0.3) * ease(Math.min(1, k * 2.2));
      f.ellipse(
        c.x + Math.cos(ang) * dist,
        c.y + Math.sin(ang) * dist * 0.7,
        0.4 - (i % 3) * 0.08,
        0.28 - (i % 3) * 0.05,
      ).fill({
        color: BLACK,
        alpha: 0.75 * (1 - k),
      });
    }
    f.ellipse(c.x, c.y, 1.0 * ease(Math.min(1, k * 3)), 0.7 * ease(Math.min(1, k * 3))).fill({
      color: BLACK,
      alpha: 0.85 * (1 - k * 0.8),
    });
    splatter(f, c, 2.2, k, c.x * 5, 26);
    const hb = P(c.x, c.y, DRAGON_LUNGE_END_HEIGHT_M);
    for (let i = 0; i < 14; i++) {
      const ang = i * 2.1;
      const dist = (0.4 + (i % 4) * 0.35) * ease(Math.min(1, k * 2));
      g.circle(hb.x + Math.cos(ang) * dist, hb.y + Math.sin(ang) * dist * 0.8 - k * 0.3, 0.06 + (i % 3) * 0.04).fill({
        color: BLACK,
        alpha: 0.9 * (1 - k),
      });
    }
  }
  // The body: an S curve behind the head at flying height, getting thinner toward the tail.
  const dirx = Math.cos(d.heading);
  const diry = Math.sin(d.heading);
  const n = 20;
  const body: Point[] = [];
  const widths: number[] = [];
  // The ink trail follows the path the head has really flown (while it is being drawn, an S behind the head), sampled evenly along its length.
  const path: Point[] = [{ x: d.x, y: d.y }];
  if (d.phase !== 'form') for (const q of d.trail) path.push(q);
  const need = d.phase === 'form' ? 0 : DRAGON_TRAIL_M;
  let have = 0;
  for (let k = 1; k < path.length; k++) have += Math.hypot(path[k]!.x - path[k - 1]!.x, path[k]!.y - path[k - 1]!.y);
  // A trail that is still short (just drawn, or hovering) is extended straight back behind the head.
  const tailFrom = path[path.length - 1]!;
  if (have < need) {
    const behind =
      have > 0.05
        ? Math.atan2(
            tailFrom.y - path[Math.max(0, path.length - 2)]!.y,
            tailFrom.x - path[Math.max(0, path.length - 2)]!.x,
          )
        : d.heading + Math.PI;
    path.push({ x: tailFrom.x + Math.cos(behind) * (need - have), y: tailFrom.y + Math.sin(behind) * (need - have) });
    have = need;
  }
  const total = d.phase === 'form' ? 4.6 : have;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const dist = u * total;
    let p0: Point;
    if (d.phase === 'form') {
      const back = dist;
      p0 = { x: d.x - dirx * back, y: d.y - diry * back };
    } else {
      let run = 0;
      p0 = path[path.length - 1]!;
      for (let k = 1; k < path.length; k++) {
        const seg = Math.hypot(path[k]!.x - path[k - 1]!.x, path[k]!.y - path[k - 1]!.y);
        if (run + seg >= dist) {
          const f2 = seg > 0 ? (dist - run) / seg : 0;
          p0 = {
            x: path[k - 1]!.x + (path[k]!.x - path[k - 1]!.x) * f2,
            y: path[k - 1]!.y + (path[k]!.y - path[k - 1]!.y) * f2,
          };
          break;
        }
        run += seg;
      }
    }
    // A gentle ripple, so the ribbon of ink flows rather than lies stiff.
    const wave = Math.sin(t * 3 - u * 7) * 0.22 * Math.min(1, u * 2.4);
    body.push(
      P(
        p0.x - diry * wave,
        p0.y + dirx * wave,
        hover - u * 0.3 + Math.sin(t * 3 - u * 7 + 1) * 0.1 * u + rear * 0.3 * (1 - u),
      ),
    );
    widths.push((0.34 * (1 - u) ** 0.9 + 0.03) * (0.4 + 0.6 * grow));
  }
  // Being drawn: the brush lays the stroke down from the tail forward, so only the part already painted shows, with the wet brush tip at its end.
  const drawing = d.phase === 'form';
  const k = clamp01(d.phaseS / spec.formS);
  const start = drawing ? Math.floor((n - 1) * (1 - ease(k))) : 0;
  const shown = body.slice(start);
  const shownW = widths.slice(start);
  ribbon(
    g,
    shown,
    shownW.map((w) => w + 0.05),
    PALE,
    0.3 * fade,
  );
  ribbon(g, shown, shownW, BLACK, fade);
  ribbon(
    g,
    shown.map((p) => ({ x: p.x, y: p.y - 0.04 })),
    shownW.map((w) => w * 0.22),
    INK_LIT,
    0.85 * fade,
  );
  // A few drops of ink fall from the trail as the head flies.
  for (let i = 3; i < n - 1; i += 4) {
    const p = body[i]!;
    const ph = (t * 0.8 + i * 0.21) % 1;
    g.ellipse(p.x, p.y + widths[i]! * 0.5 + ph * 0.35, 0.014, 0.02 + ph * 0.01).fill({
      color: BLACK,
      alpha: (1 - ph) * fade,
    });
  }
  if (drawing && shown.length > 0) {
    const tip = shown[0]!;
    g.circle(tip.x, tip.y, 0.07).fill({ color: PALE, alpha: 0.9 });
    g.circle(tip.x, tip.y, 0.17).fill({ color: PALE, alpha: 0.18 });
    splatter(g, tip, 0.35, (t * 1.9) % 1, tip.x * 5, 6);
  }
  const headFade = fade * (drawing ? clamp01((k - 0.8) / 0.2) : 1) * (bursting ? 1 - clamp01(d.phaseS / 0.12) : 1);
  const headZ = d.phase === 'rear' ? hover + rear * 0.55 : hover + (DRAGON_LUNGE_END_HEIGHT_M - hover) * lungeK;
  // The head faces the way it is going; a lunging head is bigger and gapes wide with its fangs bared.
  dragonHead(
    g,
    P(d.x, d.y, headZ),
    dirx >= 0 ? 1 : -1,
    0.3 * (0.4 + 0.6 * grow) * (1.5 + 0.35 * Math.max(rear, lungeK)),
    gape,
    t,
    headFade,
  );
}

/**
 * A Chinese dragon's head in profile, built from a skull with a long, tapering snout, a hinged lower jaw, a heavy brow, two swept-back horns,
 * a spiked mane down the neck, a slanted white eye, teeth and long whiskers. `s` is the way it faces (+1 right, -1 left), `u` its size.
 */
function dragonHead(g: Graphics, hp: Point, s: 1 | -1, u: number, gape: number, t: number, a: number): void {
  const pt = (fwd: number, up: number): Point => ({ x: hp.x + s * fwd * u, y: hp.y - up * u });
  const flat = (pts: readonly (readonly [number, number])[]): number[] =>
    pts.flatMap(([f, v]) => [pt(f, v).x, pt(f, v).y]);
  const jaw = gape * 0.95;
  // The neck joins the trail: a thick wedge behind the skull.
  g.poly(
    flat([
      [-2.0, 0.1],
      [-1.1, 0.42],
      [-0.6, 0.6],
      [-0.5, -0.5],
      [-1.1, -0.34],
      [-2.0, -0.08],
    ]),
  ).fill({ color: BLACK, alpha: a });
  // The mane: spikes standing up and back along the neck.
  for (let i = 0; i < 5; i++) {
    const f0 = -0.4 - i * 0.28;
    g.poly(
      flat([
        [f0, 0.6 - i * 0.02],
        [f0 - 0.55, 1.05 - i * 0.04],
        [f0 - 0.28, 0.5],
      ]),
    ).fill({ color: BLACK, alpha: a });
  }
  // The great horns: thick at the root, curving back and up in a long sweep, with a pale ridge.
  for (const [root, len, w] of [
    [0, 1, 0.26],
    [0.3, 0.7, 0.18],
  ] as const) {
    const pts = [0, 1, 2, 3, 4].map((i) => {
      const k = i / 4;
      const p = pt(root - k * 2.0 * len, 0.8 + Math.sin(k * 2.2) * 0.9 * len - k * k * 0.25);
      return p;
    });
    ribbon(g, pts, [u * w, u * w * 0.8, u * w * 0.55, u * w * 0.3, 0.008], BLACK, a);
    ribbon(
      g,
      pts.map((p) => ({ x: p.x, y: p.y - 0.02 })),
      [u * w * 0.2, u * w * 0.15, u * w * 0.1, u * w * 0.06, 0.003],
      INK_LIT,
      0.8 * a,
    );
  }
  // The head is one smooth silhouette: skull, brow, long snout and nose drawn as a single curved outline, so it reads as one animal's head.
  const at = (f: number, v: number): Point => pt(f, v);
  const upper = (): void => {
    g.moveTo(at(-0.9, 0.1).x, at(-0.9, 0.1).y);
    for (const [cf, cv, f, v] of [
      [-0.95, 0.7, -0.35, 0.86],
      [0.1, 1.0, 0.65, 0.78],
      [0.9, 0.6, 1.4, 0.52],
      [2.0, 0.44, 2.4, 0.3],
      [2.55, 0.15, 2.4, -0.02],
      [1.6, -0.1, 0.6, -0.05],
      [-0.2, -0.05, -0.9, 0.1],
    ] as const)
      g.quadraticCurveTo(at(cf, cv).x, at(cf, cv).y, at(f, v).x, at(f, v).y);
  };
  upper();
  g.fill({ color: BLACK, alpha: a });
  upper();
  g.stroke({ width: 0.012, color: PALE, alpha: 0.3 * a });
  // The lower jaw, hinged under the skull and drawn as one curved shape, drops open for the breath.
  const lowerJaw = (): void => {
    g.moveTo(at(0.1, -0.02).x, at(0.1, -0.02).y);
    for (const [cf, cv, f, v] of [
      [1.1, -0.06 - jaw * 0.4, 2.0, -0.06 - jaw],
      [2.15, -0.2 - jaw, 1.95, -0.36 - jaw],
      [1.2, -0.55 - jaw * 0.7, 0.25, -0.5 - jaw * 0.3],
      [-0.2, -0.4, 0.1, -0.02],
    ] as const)
      g.quadraticCurveTo(at(cf, cv).x, at(cf, cv).y, at(f, v).x, at(f, v).y);
  };
  if (gape > 0.1) {
    g.poly(
      flat([
        [0.5, -0.02],
        [2.2, 0.0],
        [2.0, -0.1 - jaw],
        [0.5, -0.26 - jaw * 0.3],
      ]),
    ).fill({ color: 0x330909, alpha: 0.95 * a });
  }
  lowerJaw();
  g.fill({ color: BLACK, alpha: a });
  lowerJaw();
  g.stroke({ width: 0.01, color: PALE, alpha: 0.28 * a });
  // A lit ridge along the top of the snout, thin and following its curve.
  g.moveTo(at(0.3, 0.84).x, at(0.3, 0.84).y)
    .quadraticCurveTo(at(1.1, 0.62).x, at(1.1, 0.62).y, at(2.2, 0.36).x, at(2.2, 0.36).y)
    .stroke({ width: 0.02, color: INK_LIT, alpha: 0.9 * a, cap: 'round' });
  // Small fangs: upper ones down, lower ones up.
  for (let i = 0; i < 4; i++) {
    const f = 1.05 + i * 0.3;
    g.poly(
      flat([
        [f, 0.0],
        [f + 0.08, 0.0],
        [f + 0.04, -0.17],
      ]),
    ).fill({ color: PALE, alpha: a });
    g.poly(
      flat([
        [f + 0.05, -0.05 - jaw],
        [f + 0.13, -0.05 - jaw],
        [f + 0.09, 0.1 - jaw],
      ]),
    ).fill({ color: PALE, alpha: a });
  }
  g.circle(at(2.1, 0.2).x, at(2.1, 0.2).y, 0.014).fill({ color: INK_LIT, alpha: a });
  // The eye: small, narrow and sharp, white with no pupil, slanting up toward the brow.
  g.poly(
    flat([
      [0.62, 0.5],
      [1.05, 0.6],
      [0.78, 0.45],
    ]),
  ).fill({ color: WHITE_EYE_GLOW, alpha: a });
  g.circle(at(0.85, 0.54).x, at(0.85, 0.54).y, 0.08 * u).fill({ color: WHITE_EYE_GLOW, alpha: 0.14 * a });
  // Two long whiskers streaming back from the snout, drifting on the air.
  for (const k of [0, 1]) {
    const w = [0, 1, 2, 3, 4, 5].map((i) => {
      const p = pt(1.95 - i * 0.55, 0.12 - k * 0.2 - i * 0.1 * (k ? -1 : 1) + Math.sin(t * 5 + i * 0.8 + k) * 0.08);
      return p;
    });
    ribbon(g, w, [0.024, 0.02, 0.015, 0.01, 0.006, 0.002], BLACK, a);
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

/**
 * Ink Slash: one fast calligraphy brush swipe. The stroke is thin where the brush lands, swells to a heavy belly, then tapers and
 * breaks into dry-brush bristle streaks at the tail, with a bright wet leading tip and flicked drops.
 */
function inkSlash(g: Graphics, P: Project, sl: InkSlash): void {
  const k = clamp01(sl.ageS / 0.4);
  const ang = Math.atan2(sl.dirY, sl.dirX);
  const sweep = ease(Math.min(1, k * 3.2));
  const a0 = ang - 1.15;
  const span = 2.3;
  const head = a0 + span * sweep;
  const n = 18;
  const fade = 1 - ease(clamp01((k - 0.35) / 0.65));
  const stroke = (rOff: number, lift: number, wMul: number, from: number): { pts: Point[]; widths: number[] } => {
    const pts: Point[] = [];
    const widths: number[] = [];
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const a = a0 + (head - a0) * u;
      const r = sl.reachM * (0.8 + 0.2 * Math.sin(u * Math.PI)) + rOff;
      pts.push(P(sl.x + Math.cos(a) * r, sl.y + Math.sin(a) * r, 1.0 + lift + 0.12 * Math.sin(u * Math.PI)));
      // thin entry, heavy belly in the first half, long tapering tail towards the head of the swing
      const body = Math.sin(Math.min(1, u * 1.15) * Math.PI) ** 0.8;
      widths.push((0.03 + 0.3 * body) * wMul * (u < from ? 0 : 1));
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
  preyAt: (id: string | null) => Point | null,
): void {
  for (const sl of ink.slashes) inkSlash(g, P, sl);
  for (const fig of ink.figures) drawnFigure(f, g, P, fig, t);
  for (const v of ink.vortices) vortex(f, g, P, v, t);
  for (const m of ink.masterpieces) masterpiece(f, g, P, m, t);
  for (const s of ink.serpents) serpent(f, g, P, s, t, s.phase === 'wrap' ? preyAt(s.targetId) : null);
  for (const d of ink.dragons) dragon(f, g, P, d, t);
}
