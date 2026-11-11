import type { WebGLRenderer } from 'pixi.js';
import { FpsMeter } from '../core/fps-meter';
import { GameLoop } from '../core/game-loop';
import { SceneManager } from '../core/scene';
import { GREYBOX_COLOURS } from '../data/arenas/greybox-arena';
import { onDebugImpact, onDebugToggle } from '../input/debug-keys';
import { PlayerIntents } from '../input/intents';
import { attachKeyboard } from '../input/keyboard';
import { attachTouchControls } from '../input/touch-controls';
import { initPhysics } from '../physics/physics-world';
import { DebugOverlay } from '../rendering/debug-overlay';
import { createTextureLoader } from '../rendering/pixi-assets';
import { createRenderSurface } from '../rendering/renderer';
import type { ArenaScene } from './scenes/arena-scene';
import { EngineCheckScene } from './scenes/engine-check-scene';
import { type CameraState, type PlayerState, TrainingYardScene } from './scenes/training-yard-scene';

/** Read-only hook used by the browser tests (tests/e2e). Exposes no gameplay control. */
export interface EngineDebugInfo {
  ready: boolean;
  scene: string | null;
  physicsSteps: number;
  framesRendered: number;
  crate: { x: number; y: number; speed: number } | null;
  player: PlayerState | null;
  camera: CameraState | null;
  dummy: { x: number; y: number; speed: number } | null;
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
  const [app] = await Promise.all([createRenderSurface(container, GREYBOX_COLOURS.background), initPhysics()]);
  const viewport = () => ({ width: app.screen.width, height: app.screen.height });

  const assetFailures: EngineDebugInfo['assetFailures'] = [];
  const textures = createTextureLoader((failure) => {
    assetFailures.push(failure);
    console.warn(`[assets] could not load ${failure.url}: ${failure.message}`);
  });

  const intents = new PlayerIntents();
  attachKeyboard(window, intents);
  attachTouchControls(document.body, intents);

  const overlay = new DebugOverlay(debugPanel);
  const fps = new FpsMeter();
  const scenes = new SceneManager({ onError: (name, error) => console.error(`[scene:${name}]`, error) });

  // Default: the Phase 2 training yard. `?scene=engine-check` opens the Phase 0/1 engine check.
  // `?missingAssetTest` (engine check) requests a texture that does not exist, to prove it cannot crash the game.
  const sceneName = params.get('scene') ?? 'training-yard';
  const optionalTextures = params.has('missingAssetTest') ? ['assets/does-not-exist.png'] : [];
  const scene: ArenaScene =
    sceneName === 'engine-check'
      ? new EngineCheckScene(app.stage, textures, viewport, optionalTextures)
      : new TrainingYardScene(app.stage, intents, viewport);
  if (!(await scenes.switchTo(() => scene))) throw new Error(`${scene.name} scene failed to load`);
  scene.world?.addChild(overlay.colliderLayer);

  if (params.has('debug')) overlay.setVisible(true);
  onDebugToggle(window, () => overlay.toggle());
  onDebugImpact(window, () => {
    if (overlay.enabled && scene instanceof TrainingYardScene) scene.debugImpact();
  });

  const debug: EngineDebugInfo = {
    ready: false,
    scene: scenes.active?.name ?? null,
    physicsSteps: 0,
    framesRendered: 0,
    crate: null,
    player: null,
    camera: null,
    dummy: null,
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

  let physicsSteps = 0;
  let lastFrameMs: number | null = null;
  const loop = new GameLoop({
    update(stepS) {
      scenes.update(stepS);
      physicsSteps++;
    },
    render(alpha) {
      const now = performance.now();
      // Clamp so a long stall does not fling animations or the camera.
      const frameDtS = lastFrameMs === null ? 0 : Math.min(0.1, (now - lastFrameMs) / 1000);
      if (lastFrameMs !== null) fps.addFrame((now - lastFrameMs) / 1000);
      lastFrameMs = now;

      scenes.render(alpha, frameDtS);
      if (overlay.enabled && scene.physics) {
        overlay.draw(scene.physics.debugLines(), {
          FPS: fps.fps.toFixed(0),
          ...scene.debugStats(),
          colliders: scene.physics.colliderCount,
          'asset failures': assetFailures.length,
        });
      }
      app.render();

      debug.framesRendered++;
      debug.physicsSteps = physicsSteps;
      if (scene instanceof EngineCheckScene) debug.crate = scene.state.crate;
      if (scene instanceof TrainingYardScene) {
        debug.player = { ...scene.player };
        debug.camera = scene.cameraState ? { ...scene.cameraState } : null;
        debug.dummy = { ...scene.dummy };
      }
      debug.debugOverlay = { enabled: overlay.enabled, segments: overlay.drawnSegments, fps: fps.fps };
    },
  });
  loop.start();

  debug.ready = true;
  status.dataset.state = 'ready';
  status.textContent =
    assetFailures.length > 0
      ? `Stickman Arena · ${scene.name} · ${assetFailures.length} asset(s) failed to load (greybox shown)`
      : scene.name === 'training-yard'
        ? 'Stickman Arena · training yard (greybox) · move: WASD / arrows · jump: Space'
        : 'Stickman Arena · 2D engine check · renderer ✓ physics ✓';
}
