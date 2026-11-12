import type { Graphics } from 'pixi.js';

/**
 * Progressive damage on one breakable wall section (owner, 12/11/2026: "progressive visual damage,
 * cracks and destruction effects to show the wall weakening before breaking"). Drawn over the
 * section's block in its local screen frame (x across the face, y up the wall is negative, metres).
 *
 * - From the first blows, hairline cracks spread out from the impact spot; there are more of them,
 *   and they run longer and branch, as damage builds.
 * - Past about 40%, plaster spalls off: chunks go missing around the impact, leaving rough dark edges.
 * - Past about 75%, the face caves in: a dark cavity with broken brick showing and deep cracks to the
 *   section's edges. The next good hit breaks it.
 * - Fire attacks (Inferno) blacken the plaster with soot and leave cracks glowing ember-orange.
 */
export interface WallDamageLook {
  /** 0..1 how much of the section's durability is gone. */
  readonly damage: number;
  /** 0..1 how scorched it is by fire. */
  readonly scorch: number;
  /** Stable per section, so each section cracks its own way. */
  readonly seed: number;
}

const FACE_HALF_M = 0.23;
const PLASTER_DARK = 0x5e5549;
const CAVITY = 0x2a2420;
const BRICK = 0x8a5a44;
const SOOT = 0x1a1612;
const EMBER = 0xff7a1a;

/** Small deterministic random generator (the same section always cracks the same way). */
function rng(seed: number): () => number {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

const clampX = (x: number) => Math.max(-FACE_HALF_M, Math.min(FACE_HALF_M, x));

export function drawWallDamage(g: Graphics, look: WallDamageLook): Graphics {
  g.clear();
  const { damage, scorch } = look;
  if (damage <= 0.02 && scorch <= 0.02) return g;
  const r = rng(look.seed + 1);
  // The impact spot: around chest height on the face.
  const cx = (r() - 0.5) * 0.12;
  const cy = -1.05 - r() * 0.25;

  // Soot first, under everything: dark smudges spreading from the impact spot.
  if (scorch > 0.02) {
    for (let i = 0; i < 4; i++) {
      const k = 0.5 + i * 0.25;
      g.ellipse(clampX(cx + (r() - 0.5) * 0.08), cy - i * 0.12, FACE_HALF_M * k * 0.9, 0.18 + i * 0.1).fill({
        color: SOOT,
        alpha: Math.min(0.5, scorch * 0.22),
      });
    }
  }

  // Spalls: chunks of plaster gone around the impact (rough polygons with a pale broken rim).
  if (damage > 0.4) {
    const chunks = Math.min(6, 1 + Math.floor((damage - 0.4) * 12));
    for (let i = 0; i < chunks; i++) {
      const a = r() * Math.PI * 2;
      const d = 0.03 + r() * 0.12;
      const ox = clampX(cx + Math.cos(a) * d);
      const oy = cy + Math.sin(a) * d * 1.6;
      const size = 0.035 + r() * 0.04 + damage * 0.03;
      const pts: number[] = [];
      for (let k = 0; k < 6; k++) {
        const t = (k / 6) * Math.PI * 2;
        const rr = size * (0.6 + r() * 0.6);
        pts.push(clampX(ox + Math.cos(t) * rr), oy + Math.sin(t) * rr * 1.2);
      }
      g.poly(pts).fill({ color: PLASTER_DARK, alpha: 0.9 }).stroke({ width: 0.008, color: 0xf4f0ea, alpha: 0.5 });
    }
  }

  // The face caving in: a dark cavity with broken brick showing.
  if (damage > 0.75) {
    const k = (damage - 0.75) / 0.25;
    const w = 0.07 + k * 0.08;
    const h = 0.1 + k * 0.12;
    const pts: number[] = [];
    for (let i = 0; i < 9; i++) {
      const t = (i / 9) * Math.PI * 2;
      const rr = 0.75 + r() * 0.5;
      pts.push(clampX(cx + Math.cos(t) * w * rr), cy + Math.sin(t) * h * rr);
    }
    g.poly(pts).fill(CAVITY).stroke({ width: 0.012, color: PLASTER_DARK });
    for (let i = 0; i < 3; i++) {
      g.rect(clampX(cx - w * 0.6 + i * w * 0.45), cy - h * 0.2 + (i % 2) * 0.05, w * 0.38, 0.035).fill({
        color: BRICK,
        alpha: 0.85,
      });
    }
  }

  // Cracks: more, longer and branching as damage builds; deep ones reach the section's edges.
  const cracks = 2 + Math.floor(damage * 9);
  const reach = 0.12 + damage * 0.75;
  const width = 0.007 + damage * 0.012;
  const lines: number[][] = [];
  for (let i = 0; i < cracks; i++) {
    const angle = (i / cracks) * Math.PI * 2 + (r() - 0.5) * 0.8;
    let x = cx;
    let y = cy;
    const pts = [x, y];
    const steps = 3 + Math.floor(damage * 4);
    for (let k = 0; k < steps; k++) {
      const len = (reach / steps) * (0.6 + r() * 0.8);
      const a = angle + (r() - 0.5) * 0.9;
      x = clampX(x + Math.cos(a) * len * 0.55);
      y = Math.max(-2.15, Math.min(-0.05, y + Math.sin(a) * len * 1.3));
      pts.push(x, y);
      // Branches split off the longer cracks.
      if (damage > 0.3 && r() < damage * 0.45) {
        const b = a + (r() < 0.5 ? 0.9 : -0.9);
        lines.push([x, y, clampX(x + Math.cos(b) * len * 0.35), y + Math.sin(b) * len * 0.7]);
      }
    }
    lines.push(pts);
  }
  for (const pts of lines) {
    g.moveTo(pts[0]!, pts[1]!);
    for (let k = 2; k < pts.length; k += 2) g.lineTo(pts[k]!, pts[k + 1]!);
  }
  g.stroke({ width, color: 0x3c352d, alpha: 0.9, cap: 'round', join: 'round' });
  // Fire: the cracks glow from inside.
  if (scorch > 0.15) {
    for (const pts of lines) {
      g.moveTo(pts[0]!, pts[1]!);
      for (let k = 2; k < pts.length; k += 2) g.lineTo(pts[k]!, pts[k + 1]!);
    }
    g.stroke({ width: width * 0.45, color: EMBER, alpha: Math.min(0.85, scorch * 0.7), cap: 'round', join: 'round' });
  }
  return g;
}
