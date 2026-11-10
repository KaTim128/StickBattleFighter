import { Application } from 'pixi.js';

/** Upper bound on device pixel ratio: sharper than this costs mobile GPUs a lot for little gain. */
export const MAX_PIXEL_RATIO = 2;

export function clampPixelRatio(devicePixelRatio: number): number {
  if (!Number.isFinite(devicePixelRatio) || devicePixelRatio <= 0) return 1;
  return Math.min(devicePixelRatio, MAX_PIXEL_RATIO);
}

/**
 * Create the 2D WebGL render surface (PixiJS, TD-021). The game drives
 * rendering from its own fixed-step loop, so Pixi's ticker is not started.
 */
export async function createRenderSurface(container: HTMLElement, background: number): Promise<Application> {
  const app = new Application();
  await app.init({
    preference: 'webgl',
    resizeTo: container,
    background,
    antialias: true,
    autoDensity: true,
    resolution: clampPixelRatio(window.devicePixelRatio),
    autoStart: false,
  });
  container.appendChild(app.canvas);
  return app;
}
