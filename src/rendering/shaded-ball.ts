import type { Graphics } from 'pixi.js';

/** The tones of a shaded ball: outline, shadow, base, lit side and the rim light on the shadow edge. */
export interface BallTones {
  readonly outline: number;
  readonly shade: number;
  readonly base: number;
  readonly lit: number;
  readonly rim: number;
}

/**
 * A round head (owner, 13/11/2026: "the head should be a round circle with shadings"): a clean
 * circle with no features, cel shaded as a ball lit from (lx, ly): the far side in shadow, a lit
 * cap and a small highlight toward the light, a thin rim light round the shadowed edge.
 */
export function shadedBall(
  g: Graphics,
  x: number,
  y: number,
  r: number,
  outlineW: number,
  t: BallTones,
  lx: number,
  ly: number,
): void {
  g.circle(x, y, r + outlineW).fill(t.outline);
  g.circle(x, y, r).fill(t.shade);
  // The lit body of the ball, shifted toward the light so a crescent of shadow is left behind.
  g.circle(x + lx * r * 0.14, y + ly * r * 0.14, r * 0.86).fill(t.base);
  g.circle(x + lx * r * 0.34, y + ly * r * 0.34, r * 0.5).fill({ color: t.lit, alpha: 0.75 });
  g.circle(x + lx * r * 0.5, y + ly * r * 0.5, r * 0.16).fill({ color: 0xffffff, alpha: 0.55 });
  // Rim light along the shadowed edge.
  const away = Math.atan2(-ly, -lx);
  // Start a fresh path at the arc's first point: arc() otherwise joins on from wherever the pen last
  // was (it drew a stray line down to the feet).
  g.moveTo(x + Math.cos(away - 0.9) * r * 0.9, y + Math.sin(away - 0.9) * r * 0.9)
    .arc(x, y, r * 0.9, away - 0.9, away + 0.9)
    .stroke({ width: r * 0.1, color: t.rim, alpha: 0.45, cap: 'round' });
}
