import { smoothing } from '../animation/animator';
import { DEFAULT_FRAMING, type FramingOptions, frameTargets, type Point } from './framing';

/**
 * Top-down follow camera (REQ-CAM-1..3). Eases towards the framing target:
 * position quickly, zoom more gently, so sudden knockbacks never snap the view.
 * Stays inside the arena; on an axis where the arena is smaller than the view,
 * it centres instead.
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
  /** Metres across the screen's shorter side. */
  shortSideM: number;
  /** Other fighters currently framed. */
  framed: number;
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
  shortSideM: number;

  constructor(
    start: Point,
    private readonly bounds: CameraBounds,
    private readonly framing: FramingOptions = DEFAULT_FRAMING,
    private readonly followRate = 6,
    private readonly zoomRate = 3,
    /** Top camera speed, m/s: big target jumps (knockbacks) glide instead of jolting. */
    private readonly maxSpeedMps = 15,
    /** Top zoom speed, metres of view per second, for the same reason. */
    private readonly maxZoomSpeedMps = 6,
  ) {
    this.x = start.x;
    this.y = start.y;
    this.shortSideM = framing.minShortSideM;
  }

  /** Ease towards framing the player (and nearby others) for a screen of the given size. */
  update(player: Point, others: readonly Point[], dtS: number, viewWidthPx: number, viewHeightPx: number): CameraView {
    const goal = frameTargets(player, others, viewWidthPx, viewHeightPx, this.framing);
    const zoomStep = (goal.shortSideM - this.shortSideM) * smoothing(this.zoomRate, dtS);
    const maxZoomStep = this.maxZoomSpeedMps * dtS;
    this.shortSideM += Math.max(-maxZoomStep, Math.min(maxZoomStep, zoomStep));
    const k = smoothing(this.followRate, dtS);
    let mx = (goal.x - this.x) * k;
    let my = (goal.y - this.y) * k;
    const step = Math.hypot(mx, my);
    const maxStep = this.maxSpeedMps * dtS;
    if (step > maxStep) {
      mx *= maxStep / step;
      my *= maxStep / step;
    }
    this.x += mx;
    this.y += my;

    const scale = cameraScale(viewWidthPx, viewHeightPx, this.shortSideM);
    const c = clampCamera(this.x, this.y, viewWidthPx / scale / 2, viewHeightPx / scale / 2, this.bounds);
    this.x = c.x;
    this.y = c.y;
    return { x: c.x, y: c.y, scale, shortSideM: this.shortSideM, framed: goal.framed };
  }
}
