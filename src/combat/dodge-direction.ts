/**
 * Which way a dodge goes (owner, 13/11/2026: "if the attack is a projectile and the player
 * dodges, the stickman should move to the nearer side that could dodge the attack"). With a
 * projectile flying at the fighter, the dodge is a sidestep at right angles to its path, to the
 * side the fighter is already on (the shorter way out); a fighter dead centre steps to its own
 * left of the shot. With nothing incoming, the dodge stays the back-step away from the facing.
 */
export interface IncomingShot {
  readonly x: number;
  readonly y: number;
  /** Unit direction of flight. */
  readonly dirX: number;
  readonly dirY: number;
  /** Half the width it hits along (its radius). */
  readonly radiusM: number;
}

/** How far ahead of a shot the fighter must be for it to count as incoming. */
export const SHOT_LOOKAHEAD_M = 9;

export function dodgeDirection(
  me: { readonly x: number; readonly y: number; readonly radiusM: number },
  facing: { readonly x: number; readonly y: number },
  shots: readonly IncomingShot[],
): { x: number; y: number; sidestep: boolean } {
  let best: { along: number; lateral: number; shot: IncomingShot } | null = null;
  for (const s of shots) {
    const dx = me.x - s.x;
    const dy = me.y - s.y;
    const along = dx * s.dirX + dy * s.dirY;
    if (along <= 0 || along > SHOT_LOOKAHEAD_M) continue; // behind it, or too far off
    const lateral = dx * -s.dirY + dy * s.dirX; // signed distance from its path
    if (Math.abs(lateral) > s.radiusM + me.radiusM) continue; // it will miss anyway
    if (!best || along < best.along) best = { along, lateral, shot: s };
  }
  if (!best) return { x: -facing.x, y: -facing.y, sidestep: false };
  const side = best.lateral === 0 ? 1 : Math.sign(best.lateral);
  return { x: -best.shot.dirY * side, y: best.shot.dirX * side, sidestep: true };
}
