import type { WebGLRenderer } from 'pixi.js';
import { fitRectToView } from '../camera/fit-view';
import { FpsMeter } from '../core/fps-meter';
import { GameLoop } from '../core/game-loop';
import { SceneManager } from '../core/scene';
import { ENGINE_CHECK } from '../data/arenas/engine-check';
import { onDebugToggle } from '../input/debug-keys';
import { initPhysics } from '../physics/physics-world';
import { DebugOverlay } from '../rendering/debug-overlay';
import { createTextureLoader } from '../rendering/pixi-assets';
import { createRenderSurface } from '../rendering/renderer';
import { EngineCheckScene } from './scenes/engine-check-scene';

/** Read-only hook used by the browser smoke tests (tests/e2e). Exposes no gameplay control. */
export interface EngineDebugInfo {
  ready: boolean;
  scene: string | null;
  physicsSteps: number;
  framesRendered: number;
  crate: { x: number; y: number; speed: number };
  assetFailures: { url: string; message: string }[];
  debugOverlay: { enabled: boolean; segments: number; fps: number };
  /** Render now and return the RGBA of the pixel at fractional canvas coords (0..1, top-left origin). */
  readPixel(xFrac: number, yFrac: number): [number, number, number, number];
}

declare global {
  interface Window {
    __stickmanDebug?: EngineDebugInfo;
  }
}

export interface BootstrapElements {
  container: HTMLElement;
  status: HTMLElement;
  debugPanel: HTMLElement;
}

export async function bootstrap({ container, status, debugPanel }: BootstrapElements): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  status.textContent = 'Loading…';

  // Renderer and physics download in parallel; physics is a separate .wasm (TD-023).
  const [app] = await Promise.all([createRenderSurface(container, ENGINE_CHECK.colours.background), initPhysics()]);

  const assetFailures: EngineDebugInfo['assetFailures'] = [];
  const textures = createTextureLoader((failure) => {
    assetFailures.push(failure);
    console.warn(`[assets] could not load ${failure.url}: ${failure.message}`);
  });

  const overlay = new DebugOverlay(debugPanel);
  const fps = new FpsMeter();
  const scenes = new SceneManager({
    onError: (name, error) => console.error(`[scene:${name}]`, error),
  });

  // `?missingAssetTest` requests a texture that does not exist, to prove a bad asset cannot crash the game.
  const optionalTextures = params.has('missingAssetTest') ? ['assets/does-not-exist.png'] : [];
  const scene = new EngineCheckScene(app.stage, textures, optionalTextures);
  if (!(await scenes.switchTo(() => scene))) throw new Error('engine-check scene failed to load');
  scene.view?.world.addChild(overlay.colliderLayer);

  const { arenaWidthM: w, arenaHeightM: h, wallThicknessM: t } = ENGINE_CHECK;
  const frameArena = (): void => {
    const world = scene.view?.world;
    if (!world) return;
    const fit = fitRectToView(w + 2 * t, h + 2 * t, app.screen.width, app.screen.height, 16);
    world.scale.set(fit.scale);
    world.position.set(fit.offsetX + t * fit.scale, fit.offsetY + t * fit.scale);
  };
  frameArena();
  app.renderer.on('resize', frameArena);

  if (params.has('debug')) overlay.setVisible(true);
  onDebugToggle(window, () => overlay.toggle());

  const debug: EngineDebugInfo = {
    ready: false,
    scene: scenes.active?.name ?? null,
    physicsSteps: 0,
    framesRendered: 0,
    crate: scene.state.crate,
    assetFailures,
    debugOverlay: { enabled: false, segments: 0, fps: 0 },
    readPixel(xFrac, yFrac) {
      app.render();
      const gl = (app.renderer as WebGLRenderer).gl;
      const x = Math.floor(Math.min(1, Math.max(0, xFrac)) * (gl.drawingBufferWidth - 1));
      const y = Math.floor((1 - Math.min(1, Math.max(0, yFrac))) * (gl.drawingBufferHeight - 1));
      const out = new Uint8Array(4);
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, out);
      return [out[0] ?? 0, out[1] ?? 0, out[2] ?? 0, out[3] ?? 0];
    },
  };
  window.__stickmanDebug = debug;

  let lastFrameMs: number | null = null;
  const loop = new GameLoop({
    update(stepS) {
      scenes.update(stepS);
    },
    render(alpha) {
      const now = performance.now();
      if (lastFrameMs !== null) fps.addFrame((now - lastFrameMs) / 1000);
      lastFrameMs = now;

      scenes.render(alpha);
      if (overlay.enabled && scene.physics) {
        overlay.draw(scene.physics.debugLines(), {
          FPS: fps.fps.toFixed(0),
          'physics steps': scene.state.physicsSteps,
          colliders: scene.physics.colliderCount,
          'asset failures': assetFailures.length,
        });
      }
      app.render();

      debug.framesRendered++;
      debug.physicsSteps = scene.state.physicsSteps;
      debug.crate = scene.state.crate;
      debug.debugOverlay = { enabled: overlay.enabled, segments: overlay.drawnSegments, fps: fps.fps };
    },
  });
  loop.start();

  debug.ready = true;
  status.dataset.state = 'ready';
  status.textContent =
    assetFailures.length > 0
      ? `Stickman Arena · 2D engine check · ${assetFailures.length} asset(s) failed to load (greybox shown)`
      : 'Stickman Arena · 2D engine check · renderer ✓ physics ✓';
}
