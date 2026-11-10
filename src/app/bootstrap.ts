import { Quaternion, Vector3 } from 'three';
import { GameLoop } from '../core/game-loop';
import { initPhysics, PhysicsWorld } from '../physics/physics-world';
import { createRenderSurface } from '../rendering/renderer';
import { buildEngineCheckScene, ENGINE_CHECK } from '../rendering/engine-check-scene';

/** Read-only hook used by the browser smoke tests (tests/e2e). Exposes no gameplay control. */
export interface EngineDebugInfo {
  ready: boolean;
  physicsSteps: number;
  framesRendered: number;
  crateHeightM: number;
  /** Render now and return the RGBA of the pixel at fractional canvas coords (0..1, top-left origin). */
  readPixel(xFrac: number, yFrac: number): [number, number, number, number];
}

declare global {
  interface Window {
    __stickmanDebug?: EngineDebugInfo;
  }
}

export async function bootstrap(container: HTMLElement, status: HTMLElement): Promise<void> {
  status.textContent = 'Loading physics…';
  await initPhysics();

  const physics = new PhysicsWorld();
  const { floorHalfSizeM, floorThicknessM, crateHalfSizeM, crateStart } = ENGINE_CHECK;
  // Floor top surface sits at y = 0, matching the rendered plane.
  physics.addStaticBox({
    halfExtents: { x: floorHalfSizeM, y: floorThicknessM / 2, z: floorHalfSizeM },
    position: { x: 0, y: -floorThicknessM / 2, z: 0 },
  });
  const crateBody = physics.addDynamicBox({
    halfExtents: { x: crateHalfSizeM, y: crateHalfSizeM, z: crateHalfSizeM },
    position: crateStart,
  });

  const surface = createRenderSurface(container);
  const { scene, camera, crate } = buildEngineCheckScene();
  surface.fitTo(camera);

  // Previous and current physics poses, interpolated by alpha when drawing (TD-013).
  const prevPos = new Vector3().copy(crateBody.translation());
  const currPos = prevPos.clone();
  const prevRot = new Quaternion().copy(crateBody.rotation());
  const currRot = prevRot.clone();

  const debug: EngineDebugInfo = {
    ready: false,
    physicsSteps: 0,
    framesRendered: 0,
    crateHeightM: currPos.y,
    readPixel(xFrac, yFrac) {
      const { renderer } = surface;
      renderer.render(scene, camera);
      const gl = renderer.getContext();
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
      prevPos.copy(currPos);
      prevRot.copy(currRot);
      physics.step(stepS);
      currPos.copy(crateBody.translation());
      currRot.copy(crateBody.rotation());
      debug.physicsSteps++;
      debug.crateHeightM = currPos.y;
    },
    render(alpha) {
      crate.position.lerpVectors(prevPos, currPos, alpha);
      crate.quaternion.slerpQuaternions(prevRot, currRot, alpha);
      surface.renderer.render(scene, camera);
      debug.framesRendered++;
    },
  });
  loop.start();

  debug.ready = true;
  status.dataset.state = 'ready';
  status.textContent = 'Stickman Arena · Phase 0 engine check · renderer ✓ physics ✓';
}
