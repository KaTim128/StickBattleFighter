/**
 * 2D camera framing (Rendering specialist). Phase 0 only needs to fit a whole
 * arena into the viewport; following a fighter arrives with movement (Phase 2–3).
 */
export interface ViewFit {
  /** Screen pixels per metre. */
  readonly scale: number;
  /** Screen position (px) of world origin (0, 0). */
  readonly offsetX: number;
  readonly offsetY: number;
}

/**
 * Scale and centre a world rectangle (metres, top-left origin) inside a
 * viewport (pixels), keeping its aspect ratio and leaving `marginPx` all round.
 */
export function fitRectToView(
  worldWidthM: number,
  worldHeightM: number,
  viewWidthPx: number,
  viewHeightPx: number,
  marginPx = 0,
): ViewFit {
  if (!(worldWidthM > 0 && worldHeightM > 0)) throw new RangeError('world size must be positive');
  const usableW = Math.max(1, viewWidthPx - marginPx * 2);
  const usableH = Math.max(1, viewHeightPx - marginPx * 2);
  const scale = Math.min(usableW / worldWidthM, usableH / worldHeightM);
  return {
    scale,
    offsetX: (viewWidthPx - worldWidthM * scale) / 2,
    offsetY: (viewHeightPx - worldHeightM * scale) / 2,
  };
}
