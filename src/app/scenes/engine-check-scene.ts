import type { Container } from 'pixi.js';
import { addEngineCheckColliders } from '../../arenas/engine-check-colliders';
import type { AssetLoader } from '../../core/asset-loader';
import type { GameScene } from '../../core/scene';
import { PhysicsWorld } from '../../physics/physics-world';
import { buildEngineCheckView, type EngineCheckView } from '../../rendering/engine-check-view';

/** Live state the debug hook and overlay read from the active engine-check scene. */
export interface EngineCheckState {
  crate: { x: number; y: number; speed: number };
  physicsSteps: number;
}

function lerpAngle(a: number, b: number, t: number): number {
  return a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
}

/**
 * Phase 0/1 engine-check scene (GREYBOX): walled floor, pillars and a sliding
 * crate. Owns its physics world and display objects and frees both on unload.
 */
export class EngineCheckScene implements GameScene {
  readonly name = 'engine-check';
  readonly state: EngineCheckState = { crate: { x: 0, y: 0, speed: 0 }, physicsSteps: 0 };
  physics: PhysicsWorld | null = null;
  view: EngineCheckView | null = null;
  private readonly prev = { x: 0, y: 0, angle: 0 };
  private readonly curr = { x: 0, y: 0, angle: 0 };
  private crate: ReturnType<typeof addEngineCheckColliders>['crate'] | null = null;

  constructor(
    private readonly parent: Container,
    private readonly textures: AssetLoader<unknown>,
    /** Optional textures to request; failures are reported, never fatal (greybox fallback). */
    private readonly optionalTextureUrls: readonly string[] = [],
  ) {}

  async load(): Promise<void> {
    this.physics = new PhysicsWorld();
    this.crate = addEngineCheckColliders(this.physics).crate;
    this.view = buildEngineCheckView();
    this.parent.addChild(this.view.world);

    // Nothing here needs a texture yet; this exercises the handled-error path.
    await Promise.all(this.optionalTextureUrls.map((url) => this.textures.load(url)));

    const p = this.crate.translation();
    Object.assign(this.prev, { x: p.x, y: p.y, angle: this.crate.rotation() });
    Object.assign(this.curr, this.prev);
    this.state.crate = { x: p.x, y: p.y, speed: Math.hypot(this.crate.linvel().x, this.crate.linvel().y) };
  }

  update(stepS: number): void {
    if (!this.physics || !this.crate) return;
    Object.assign(this.prev, this.curr);
    this.physics.step(stepS);
    const p = this.crate.translation();
    const v = this.crate.linvel();
    Object.assign(this.curr, { x: p.x, y: p.y, angle: this.crate.rotation() });
    this.state.physicsSteps++;
    this.state.crate = { x: p.x, y: p.y, speed: Math.hypot(v.x, v.y) };
  }

  render(alpha: number): void {
    if (!this.view) return;
    const { prev, curr } = this;
    this.view.crate.position.set(prev.x + (curr.x - prev.x) * alpha, prev.y + (curr.y - prev.y) * alpha);
    this.view.crate.rotation = lerpAngle(prev.angle, curr.angle, alpha);
    this.view.actors.update();
  }

  unload(): void {
    this.view?.destroy();
    this.physics?.dispose();
    this.view = null;
    this.physics = null;
    this.crate = null;
  }
}
