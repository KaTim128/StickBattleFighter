import { WebGLRenderer, type PerspectiveCamera } from 'three';

/** Upper bound on device pixel ratio: sharper than this costs mobile GPUs a lot for little gain. */
export const MAX_PIXEL_RATIO = 2;

export function clampPixelRatio(devicePixelRatio: number): number {
  if (!Number.isFinite(devicePixelRatio) || devicePixelRatio <= 0) return 1;
  return Math.min(devicePixelRatio, MAX_PIXEL_RATIO);
}

export interface RenderSurface {
  readonly renderer: WebGLRenderer;
  /** Keep renderer size and camera aspect in step with the container. */
  fitTo(camera: PerspectiveCamera): void;
  dispose(): void;
}

export function createRenderSurface(container: HTMLElement): RenderSurface {
  const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(clampPixelRatio(window.devicePixelRatio));
  container.appendChild(renderer.domElement);

  let observedCamera: PerspectiveCamera | null = null;
  const resize = (): void => {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    if (observedCamera) {
      observedCamera.aspect = width / height;
      observedCamera.updateProjectionMatrix();
    }
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);

  return {
    renderer,
    fitTo(camera) {
      observedCamera = camera;
      resize();
    },
    dispose() {
      observer.disconnect();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
