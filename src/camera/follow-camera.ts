import { smoothing } from '../animation/animator';

/**
 * Top-down follow camera (REQ-CAM-1/3). Eases towards its target and stays
 * inside the arena; if the arena is smaller than the view on an axis, it
 * centres on that axis instead. Zoom shows `viewShortSideM` metres across the
 * screen's shorter side, so phones and desktops see a similar amount.
 */
export interface CameraBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface CameraView {
  /** World point at the centre of the screen. */
  x: number;
  y: number;
  /** Pixels per metre. */
  scale: number;
}

export function cameraScale(viewWidthPx: number, viewHeightPx: number, viewShortSideM: number): number {
  return Math.min(viewWidthPx, viewHeightPx) / viewShortSideM;
}

/** Clamp a camera centre so the view stays inside the bounds. */
export function clampCamera(
  x: number,
  y: number,
  halfViewW: number,
  halfViewH: number,
  b: CameraBounds,
): { x: number; y: number } {
  const clampAxis = (v: number, half: number, min: number, max: number): number =>
    max - min <= half * 2 ? (min + max) / 2 : Math.min(max - half, Math.max(min + half, v));
  return { x: clampAxis(x, halfViewW, b.minX, b.maxX), y: clampAxis(y, halfViewH, b.minY, b.maxY) };
}

export class FollowCamera {
  x: number;
  y: number;

  constructor(
    start: { x: number; y: number },
    private readonly bounds: CameraBounds,
    private readonly viewShortSideM = 11,
    private readonly followRate = 6,
  ) {
    this.x = start.x;
    this.y = start.y;
  }

  /** Ease towards the target and return the view for a screen of the given size. */
  update(target: { x: number; y: number }, dtS: number, viewWidthPx: number, viewHeightPx: number): CameraView {
    const k = smoothing(this.followRate, dtS);
    this.x += (target.x - this.x) * k;
    this.y += (target.y - this.y) * k;
    const scale = cameraScale(viewWidthPx, viewHeightPx, this.viewShortSideM);
    const c = clampCamera(this.x, this.y, viewWidthPx / scale / 2, viewHeightPx / scale / 2, this.bounds);
    this.x = c.x;
    this.y = c.y;
    return { x: c.x, y: c.y, scale };
  }
}
