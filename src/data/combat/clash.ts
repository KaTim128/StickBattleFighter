/**
 * Punch Clash tuning (owner request 11/11/2026). Presentation and balance
 * numbers in one place; the rules are in src/combat/clash.ts.
 */
export const CLASH = {
  // ---- Trigger: a sustained exchange of punches and blocks.
  /** Melee contacts (hits or blocks, both ways) counted within this window. */
  triggerWindowS: 5,
  triggerContacts: 6,
  /** Each fighter must have landed or blocked at least this many of them. */
  minEachSide: 2,
  /** The fighters must be this close. */
  triggerRangeM: 1.9,
  /** No new clash for this long after one ends. */
  cooldownS: 8,

  // ---- The clash itself.
  /** Fighters lock up face to face before the mashing starts. */
  introS: 0.4,
  /** Button-mashing time (owner: 3–5 s). */
  mashS: 4,
  /** The final, most intense stretch (owner: 0.75–1 s). */
  finalS: 0.9,
  /** Distance between the fighters during the clash, metres. */
  gapM: 1.05,
  /** Exchanges (punch/block/deflect) per second: from start to end, and in the final stretch. */
  exchangeRateStart: 4,
  exchangeRateEnd: 9,
  exchangeRateFinal: 15,
  /** Scores within this fraction of each other are a stalemate (owner: about 5%). */
  tieFraction: 0.05,

  // ---- Camera: normal distance → closer → tightest in the final stretch.
  cameraStartShortSideM: 10,
  cameraEndShortSideM: 6.5,
  cameraFinalShortSideM: 5,
  /** Hold the cinematic framing this long after the finish before gliding back. */
  outroS: 0.6,

  // ---- Finisher, scaled by the power gap (0 = barely won, 1 = total domination).
  finishDamage: { min: 80, max: 260 },
  finishKnockbackMps: { min: 7, max: 13 },
  /** Hit-stop on the finisher (owner: about 3–6 frames). */
  finishHitstopS: { min: 0.05, max: 0.1 },
  finishShake: { min: 0.55, max: 0.95 },
  finishSparks: { min: 22, max: 48 },
  /** Winner's recoil off the breakthrough, m/s. */
  winnerRecoilMps: 1.4,
  /** Stalemate: both thrown back this fast, and briefly stunned. */
  stalemateKnockbackMps: 6.5,
  stalemateStunS: 0.45,
} as const;

/** Linear blend between a {min, max} range. */
export function scaleBy(range: { readonly min: number; readonly max: number }, t: number): number {
  const k = Math.min(1, Math.max(0, t));
  return range.min + (range.max - range.min) * k;
}
