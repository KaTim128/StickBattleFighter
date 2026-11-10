import {
  BoxGeometry,
  Color,
  DirectionalLight,
  Fog,
  GridHelper,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
} from 'three';

/**
 * Phase 0 engine-check scene: GREYBOX ONLY. Proves the renderer, lighting and
 * physics sync work end to end. It is not the office arena (Phase 4) and holds
 * no game content. Shared dimensions keep the visuals and colliders in step.
 */
export const ENGINE_CHECK = {
  floorHalfSizeM: 10,
  floorThicknessM: 0.2,
  crateHalfSizeM: 0.5,
  crateStart: { x: 0, y: 4, z: 0 },
  background: 0x1b2230,
} as const;

export interface EngineCheckScene {
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  readonly crate: Mesh;
}

export function buildEngineCheckScene(): EngineCheckScene {
  const scene = new Scene();
  scene.background = new Color(ENGINE_CHECK.background);
  scene.fog = new Fog(ENGINE_CHECK.background, 25, 60);

  scene.add(new HemisphereLight(0xdfe8ff, 0x3a3326, 1.2));
  const sun = new DirectionalLight(0xffffff, 2.2);
  sun.position.set(6, 10, 4);
  scene.add(sun);

  const size = ENGINE_CHECK.floorHalfSizeM * 2;
  const floor = new Mesh(
    new PlaneGeometry(size, size),
    new MeshStandardMaterial({ color: 0x59606b, roughness: 0.95 }),
  );
  floor.name = 'greybox-floor';
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const grid = new GridHelper(size, size, 0x8a93a3, 0x6b7280);
  grid.position.y = 0.001; // just above the floor to avoid z-fighting
  scene.add(grid);

  const crateSize = ENGINE_CHECK.crateHalfSizeM * 2;
  const crate = new Mesh(
    new BoxGeometry(crateSize, crateSize, crateSize),
    new MeshStandardMaterial({ color: 0xe0a14a, roughness: 0.6 }),
  );
  crate.name = 'greybox-crate';
  const { x, y, z } = ENGINE_CHECK.crateStart;
  crate.position.set(x, y, z);
  scene.add(crate);

  const camera = new PerspectiveCamera(55, 16 / 9, 0.1, 200);
  camera.position.set(6, 5, 8);
  camera.lookAt(0, 0.5, 0);

  return { scene, camera, crate };
}
