/**
 * Pickup, carry and throw tuning (Phase 7, spec §6.3: REQ-PHY-8..10; controls TD-016:
 * one contextual utility button, desktop G or U). Values are a first pass for owner
 * playtesting, like the other combat numbers (OQ-05).
 */
export const THROWING = {
  /** How far from the fighter's feet an object can be grabbed (to its nearest edge), metres. */
  reachM: 0.85,
  /** Objects behind the fighter (more than this far back) are ignored. */
  behindM: 0.25,
  /** Carried overhead at this height, metres. */
  holdHeightM: 1.75,
  /** Hold the button this long while carrying to put the object down instead of throwing it. */
  dropHoldS: 0.6,
  /** Thrown from this height with this upward speed; gravity pulls it down. */
  launchHeightM: 1.7,
  launchUpMps: 3.2,
  gravityMps2: 18,
  /** Lighter objects fly faster. */
  speedFor(massKg: number): number {
    return Math.min(14, Math.max(7, 14 - massKg * 0.4));
  },
  /** Heavier objects hit harder; a mug stings, a chair floors you. */
  damageFor(massKg: number, speedMps: number): number {
    return Math.round(Math.min(150, 30 + massKg * 6) * Math.min(1.2, speedMps / 10));
  },
  knockbackFor(massKg: number): number {
    return Math.min(6.5, 2.5 + massKg * 0.3);
  },
  /** Heavy objects count as heavy blows (knock down). */
  heavyFromKg: 8,
  /** Walking while carrying: heavier is slower. */
  carrySpeedFactor(massKg: number): number {
    return Math.min(1, Math.max(0.6, 1 - massKg / 40));
  },
  /** A flying object hits fighters while it is lower than this and faster than `hitMinSpeedMps`. */
  hitMaxHeightM: 1.9,
  hitMinSpeedMps: 2,
  /** Higher than this, a flying object clears desks, tables and chairs (it still hits walls), metres. */
  overFurnitureM: 0.95,
  /** Glass and ceramic landing faster than this shatter. */
  fragileBreakMps: 4,
  /** How far the throw reaches for the locked target before it just goes the way you face. */
  aimRangeM: 12,
} as const;
