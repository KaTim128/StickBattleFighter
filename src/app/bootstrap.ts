import type { WebGLRenderer } from 'pixi.js';
import { fitRectToView } from '../camera/fit-view';
import { GameLoop } from '../core/game-loop';
import { initPhysics, PhysicsWorld } from '../physics/physics-world';
import { createRenderSurface } from '../rendering/renderer';
import { addEngineCheckColliders } from '../arenas/engine-check-colliders';
import { ENGINE_CHECK } from '../data/arenas/engine-check';
import { buildEngineCheckScene } from '../rendering/engine-check-scene';

/** Read-only hook used by the browser smoke tests (tests/e2e). Exposes no gameplay control. */
export interface EngineDebugInfo {
  ready: boolean;
  physicsSteps: number;
  framesRendered: number;
  crate: { x: number; y: number; speed: number };
  /** Render now and return the RGBA of the pixel at fractional canvas coords (0..1, top-left origin). */
  readPixel(xFrac: number, yFrac: number): [number, number, number, number];
}

declare global {
  interface Window {
    __stickmanDebug?: EngineDebugInfo;
  }
}

/** Shortest-path angle interpolation so a spinning crate never "unwinds". */
function lerpAngle(a: number, b: number, t: number): number {
  const delta = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + delta * t;
}

export async function bootstrap(container: HTMLElement, status: HTMLElement): Promise<void> {
  status.textContent = 'Loading physics…';
  await initPhysics();

  const { arenaWidthM: w, arenaHeightM: h, wallThicknessM: t } = ENGINE_CHECK;
  const physics = new PhysicsWorld();
  const { crate: crateBody } = addEngineCheckColliders(physics);

  const app = await createRenderSurface(container, ENGINE_CHECK.colours.background);
  const { world, crate } = buildEngineCheckScene();
  app.stage.addChild(world);

  const frameArena = (): void => {
    const fit = fitRectToView(w + 2 * t, h + 2 * t, app.screen.width, app.screen.height, 16);
    world.scale.set(fit.scale);
    world.position.set(fit.offsetX + t * fit.scale, fit.offsetY + t * fit.scale);
  };
  frameArena();
  app.renderer.on('resize', frameArena);

  // Previous and current physics poses, interpolated by alpha when drawing (TD-013).
  const prev = { ...crateBody.translation(), angle: crateBody.rotation() };
  const curr = { ...prev };

  const debug: EngineDebugInfo = {
    ready: false,
    physicsSteps: 0,
    framesRendered: 0,
    crate: { x: curr.x, y: curr.y, speed: Math.hypot(ENGINE_CHECK.crateVelocity.x, ENGINE_CHECK.crateVelocity.y) },
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

  const loop = new GameLoop({
    update(stepS) {
      Object.assign(prev, curr);
      physics.step(stepS);
      const p = crateBody.translation();
      const v = crateBody.linvel();
      Object.assign(curr, { x: p.x, y: p.y, angle: crateBody.rotation() });
      debug.physicsSteps++;
      debug.crate = { x: p.x, y: p.y, speed: Math.hypot(v.x, v.y) };
    },
    render(alpha) {
      crate.position.set(prev.x + (curr.x - prev.x) * alpha, prev.y + (curr.y - prev.y) * alpha);
      crate.rotation = lerpAngle(prev.angle, curr.angle, alpha);
      app.render();
      debug.framesRendered++;
    },
  });
  loop.start();

  debug.ready = true;
  status.dataset.state = 'ready';
  status.textContent = 'Stickman Arena · 2D engine check · renderer ✓ physics ✓';
}
