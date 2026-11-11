import type { WebGLRenderer } from 'pixi.js';
import { FpsMeter } from '../core/fps-meter';
import { GameLoop } from '../core/game-loop';
import { SceneManager } from '../core/scene';
import type { ArenaLayout } from '../data/arenas/arena-layout';
import { GREYBOX_COLOURS } from '../data/arenas/greybox-arena';
import { OFFICE } from '../data/arenas/office';
import { TRAINING_YARD } from '../data/arenas/training-yard';
import { onDebugImpact, onDebugToggle, onToggleDummyAttacks } from '../input/debug-keys';
import { PlayerIntents } from '../input/intents';
import { attachKeyboard, attachMouse } from '../input/keyboard';
import { attachTouchControls } from '../input/touch-controls';
import { CombatText } from '../interface/combat-text';
import { initPhysics } from '../physics/physics-world';
import { DebugOverlay } from '../rendering/debug-overlay';
import { createTextureLoader } from '../rendering/pixi-assets';
import { createRenderSurface } from '../rendering/renderer';
import type { ArenaScene } from './scenes/arena-scene';
import { EngineCheckScene } from './scenes/engine-check-scene';
import {
  type CameraState,
  type DoorState,
  type DummyState,
  FightArenaScene,
  type PlayerState,
} from './scenes/fight-arena-scene';

/** Read-only hook used by the browser tests (tests/e2e). Exposes no gameplay control. */
export interface EngineDebugInfo {
  ready: boolean;
  scene: string | null;
  physicsSteps: number;
  framesRendered: number;
  crate: { x: number; y: number; speed: number } | null;
  player: PlayerState | null;
  camera: CameraState | null;
  dummy: DummyState | null;
  dummyAttacks: boolean;
  doors: DoorState[];
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

/**
 * Developer option `?playerAt=x,y`: start the player at an exact spot (layout review and
 * deterministic browser tests). Invalid values are ignored.
 */
function withPlayerStart(arena: ArenaLayout, at: string | null): ArenaLayout {
  const [x, y] = (at ?? '').split(',').map(Number);
  if (x === undefined || y === undefined || !Number.isFinite(x) || !Number.isFinite(y)) return arena;
  return { ...arena, playerStart: { x, y } };
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
  attachMouse(container, intents);
  attachTouchControls(document.body, intents);

  const overlay = new DebugOverlay(debugPanel);
  const fps = new FpsMeter();
  const scenes = new SceneManager({ onError: (name, error) => console.error(`[scene:${name}]`, error) });

  // Default: the office arena (Phase 4). `?scene=training-yard` opens the movement/camera test yard;
  // `?scene=engine-check` opens the Phase 0/1 engine check. `?overview` shows a whole arena at once.
  // `?missingAssetTest` (engine check) requests a texture that does not exist, to prove it cannot crash the game.
  const sceneName = params.get('scene') ?? 'office';
  const optionalTextures = params.has('missingAssetTest') ? ['assets/does-not-exist.png'] : [];
  const scene: ArenaScene =
    sceneName === 'engine-check'
      ? new EngineCheckScene(app.stage, textures, viewport, optionalTextures)
      : new FightArenaScene(
          withPlayerStart(sceneName === 'training-yard' ? TRAINING_YARD : OFFICE, params.get('playerAt')),
          app.stage,
          intents,
          viewport,
          params.has('overview'),
        );
  if (!(await scenes.switchTo(() => scene))) throw new Error(`${scene.name} scene failed to load`);
  scene.world?.addChild(overlay.colliderLayer);

  if (params.has('debug')) overlay.setVisible(true);
  onDebugToggle(window, () => overlay.toggle());
  const combatText = new CombatText(document.body);
  const controlsHint = 'move WASD · jump Space · J/click: tap attack, hold block · Shift dodge · T dummy attacks';
  onToggleDummyAttacks(window, () => {
    if (!(scene instanceof FightArenaScene)) return;
    scene.dummyAttacks = !scene.dummyAttacks;
    status.textContent = `Stickman Arena · dummy attacks ${scene.dummyAttacks ? 'ON' : 'OFF'} · ${controlsHint}`;
  });
  onDebugImpact(window, () => {
    if (overlay.enabled && scene instanceof FightArenaScene) scene.debugImpact();
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
    dummyAttacks: false,
    doors: [],
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
      if (scene instanceof FightArenaScene) {
        debug.player = scene.player;
        debug.camera = scene.cameraState ? { ...scene.cameraState } : null;
        debug.dummy = scene.dummy;
        debug.dummyAttacks = scene.dummyAttacks;
        combatText.show(scene.drainEvents(), (x, y) => scene.worldToScreen(x, y));
        debug.doors = scene.doorStates;
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
      : scene instanceof FightArenaScene
        ? `Stickman Arena · ${scene.arena.name}${scene.arena.greybox ? ' (greybox)' : ''} · ${controlsHint}`
        : 'Stickman Arena · 2D engine check · renderer ✓ physics ✓';
}
