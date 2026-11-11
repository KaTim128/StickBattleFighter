/**
 * Multi-target framing for the top-down camera (REQ-CAM-2). Pure function:
 * given the player and other fighters, decide where the camera should look
 * and how much of the arena to show.
 */
export interface Point {
  x: number;
  y: number;
}

export interface FramingOptions {
  /** Closest zoom: metres shown across the screen's shorter side. */
  readonly minShortSideM: number;
  /** Widest zoom allowed. */
  readonly maxShortSideM: number;
  /** Fighters further than this from the player are not framed (the player stays the priority). */
  readonly maxFrameDistanceM: number;
  /** Space kept around the framed fighters, metres. */
  readonly paddingM: { readonly x: number; readonly y: number };
  /** The player is always kept at least this far inside the screen edge, metres. */
  readonly playerMarginM: number;
}

export const DEFAULT_FRAMING: FramingOptions = {
  minShortSideM: 11,
  maxShortSideM: 17,
  maxFrameDistanceM: 16,
  paddingM: { x: 2.2, y: 1.8 },
  playerMarginM: 1.6,
};

export interface FrameResult {
  x: number;
  y: number;
  /** Metres shown across the screen's shorter side. */
  shortSideM: number;
  /** How many other fighters are being framed. */
  framed: number;
}

/** Metres visible across the width and height for a given zoom. */
export function visibleSize(shortSideM: number, viewW: number, viewH: number): { w: number; h: number } {
  const scale = Math.min(viewW, viewH) / shortSideM;
  return { w: viewW / scale, h: viewH / scale };
}

export function frameTargets(
  player: Point,
  others: readonly Point[],
  viewW: number,
  viewH: number,
  opts: FramingOptions = DEFAULT_FRAMING,
): FrameResult {
  const framed = others.filter((o) => Math.hypot(o.x - player.x, o.y - player.y) <= opts.maxFrameDistanceM);
  const pts = [player, ...framed];
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y));
  const maxY = Math.max(...pts.map((p) => p.y));

  // Zoom needed so the padded box fits on both axes, expressed as metres across the short side.
  const needW = maxX - minX + opts.paddingM.x * 2;
  const needH = maxY - minY + opts.paddingM.y * 2;
  const short = Math.min(viewW, viewH);
  const needed = Math.max((needW * short) / viewW, (needH * short) / viewH);
  const shortSideM = Math.min(opts.maxShortSideM, Math.max(opts.minShortSideM, needed));

  // Aim at the middle of the group, but never so far that the player leaves the screen.
  const { w, h } = visibleSize(shortSideM, viewW, viewH);
  const keepX = Math.max(0, w / 2 - opts.playerMarginM);
  const keepY = Math.max(0, h / 2 - opts.playerMarginM);
  const x = Math.min(player.x + keepX, Math.max(player.x - keepX, (minX + maxX) / 2));
  const y = Math.min(player.y + keepY, Math.max(player.y - keepY, (minY + maxY) / 2));
  return { x, y, shortSideM, framed: framed.length };
}
